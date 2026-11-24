/**
 * Unified Multi-Provider Video Generation Orchestration Service
 * Handles submission, draft finalization, server-side billing validation,
 * idempotency/duplicate-submission prevention, and unified history aggregation.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  BackendProcessStep,
  UnifiedGenerationInput,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import { readHistoryStore, upsertHistoryEntry } from '../../bytedanceRoutes';
import { seedancePlatformStore } from '../../seedancePlatformStore';
import { validatePublicHttpUrl, sanitizeErrorMessage } from '../../securityMiddleware';
import {
  normalizeResolutionCase,
  validateCapabilitySelection,
} from '../config/model.capabilities';
import {
  cacheEphemeralUserToken,
  generationJobsStore,
} from '../firebase/firestore.service';
import { scheduleBackgroundJobPoll } from '../workers/generation.worker';
import { processCompletedJobMedia } from '../workers/media.receiver';
import { prepareFinalizeDraftInput } from './draft.service';
import { calculateAuthoritativeEstimate } from './pricing.service';
import { providerService } from './provider.service';
import {
  buildSignedMuapiWebhookUrl,
  createProcessStep,
} from './realtimeEvents.service';

const inFlightSubmissionFingerprints = new Set<string>();

export class GenerationOrchestrationError extends Error {
  status: number;
  code?: string;
  extra?: Record<string, unknown>;
  constructor(
    message: string,
    status = 400,
    code?: string,
    extra?: Record<string, unknown>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

function saveDataUrlIfNeeded(rawVal: string | undefined, publicOrigin: string): string | undefined {
  if (!rawVal || !rawVal.trim()) return undefined;
  const trimmed = rawVal.trim();
  const cleanOrigin = publicOrigin.replace(/\/+$/, '');

  // Normalize relative /uploads/... or localhost /uploads/... paths onto the live public HTTPS origin
  if (trimmed.startsWith('/uploads/')) {
    return `${cleanOrigin}${trimmed}`;
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/uploads\//i.test(trimmed)) {
    const parsed = new URL(trimmed);
    return `${cleanOrigin}${parsed.pathname}${parsed.search}`;
  }

  if (!trimmed.startsWith('data:')) {
    return trimmed;
  }
  const matches = trimmed.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/i);
  if (!matches) {
    throw new GenerationOrchestrationError(
      'Uploaded image data URL must be a valid PNG, JPEG, WEBP, or GIF image.',
      400
    );
  }
  const ext = matches[2].toLowerCase() === 'jpeg' ? '.jpg' : `.${matches[2].toLowerCase()}`;
  const buffer = Buffer.from(matches[3], 'base64');
  if (buffer.length > 25 * 1024 * 1024) {
    throw new GenerationOrchestrationError('Uploaded image exceeds 25 MB limit.', 413);
  }
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const fileName = `mp_in_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
  return `${cleanOrigin}/uploads/${fileName}`;
}

export async function submitUnifiedGeneration(params: {
  user: { uid: string; email: string; name?: string; isAdmin: boolean };
  bearerToken?: string | null;
  publicOrigin: string;
  rawInput: UnifiedGenerationInput;
}): Promise<{
  job: UnifiedGenerationJob;
  deduplicated?: boolean;
  remainingBalance?: number;
}> {
  const { user, bearerToken, publicOrigin, rawInput } = params;
  const traceSteps: BackendProcessStep[] = [];

  if (bearerToken) {
    cacheEphemeralUserToken(user.uid, bearerToken);
  }

  seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });

  // 1. Idempotency check BEFORE any work
  const idempotencyKey =
    typeof rawInput.idempotency_key === 'string' && rawInput.idempotency_key.trim()
      ? rawInput.idempotency_key.trim().slice(0, 128)
      : undefined;

  if (idempotencyKey) {
    const existingIdem = generationJobsStore.findByIdempotencyKey(user.uid, idempotencyKey);
    if (existingIdem) {
      const wallet = seedancePlatformStore.getOrCreateWallet(user.uid, user.email);
      return {
        job: existingIdem,
        deduplicated: true,
        remainingBalance: wallet.totalAvailable,
      };
    }
  }

  // 2. Resolve provider & model without silent downgrades
  const providerId = rawInput.provider || 'muapi';
  const modelId = rawInput.model_id;
  let resolved: ReturnType<typeof providerService.resolveProviderAndModel>;
  try {
    resolved = providerService.resolveProviderAndModel(providerId, modelId);
  } catch (err: any) {
    traceSteps.push(
      createProcessStep({
        stage: 'ERROR',
        method: 'POST',
        endpoint: '/api/generations/submit',
        statusCode: 400,
        statusLabel: 'RESOLVE_ERROR',
        summary: err?.message || 'Provider or model unavailable.',
      })
    );
    throw new GenerationOrchestrationError(
      err?.message || 'Provider/model unavailable.',
      400,
      undefined,
      { traces: traceSteps }
    );
  }

  const { provider, model, adapter } = resolved;

  const isDraft = Boolean(rawInput.draft && model.supportsDraftMode);
  const requestedResolution = isDraft
    ? '480p'
    : normalizeResolutionCase(rawInput.resolution);
  const requestedDuration = Number(rawInput.duration);

  const capCheck = validateCapabilitySelection(model, requestedResolution, requestedDuration);
  if (!capCheck.valid) {
    traceSteps.push(
      createProcessStep({
        stage: 'ERROR',
        method: 'POST',
        endpoint: '/api/generations/submit',
        statusCode: 400,
        statusLabel: 'CAPABILITY_REJECTED',
        summary: capCheck.error || 'Selected resolution or duration is not supported.',
      })
    );
    throw new GenerationOrchestrationError(
      capCheck.error || 'Selected resolution or duration is not supported.',
      400,
      'UNSUPPORTED_CAPABILITY',
      { traces: traceSteps }
    );
  }

  const prompt = typeof rawInput.prompt === 'string' ? rawInput.prompt.trim() : '';
  if (!prompt) {
    throw new GenerationOrchestrationError('Prompt is required.', 400);
  }

  // Normalize image URLs (supporting uploaded data URLs and /uploads/* paths hosted cleanly on public origin)
  const imageUrl = saveDataUrlIfNeeded(rawInput.image_url, publicOrigin);
  const lastImage = saveDataUrlIfNeeded(rawInput.last_image, publicOrigin);
  const refUrls = Array.isArray(rawInput.reference_image_urls)
    ? rawInput.reference_image_urls
        .map((u) => saveDataUrlIfNeeded(u, publicOrigin))
        .filter((u): u is string => Boolean(u))
    : [];

  if (model.requiresStartImage && !imageUrl) {
    traceSteps.push(
      createProcessStep({
        stage: 'ERROR',
        method: 'POST',
        endpoint: '/api/generations/submit',
        statusCode: 400,
        statusLabel: 'MISSING_IMAGE_URL',
        summary: `Start image_url missing for ${model.displayName}`,
      })
    );
    throw new GenerationOrchestrationError(
      `Start Image URL (image_url) is required for "${model.displayName}".`,
      400,
      undefined,
      { traces: traceSteps }
    );
  }

  if (imageUrl && !validatePublicHttpUrl(imageUrl).valid) {
    traceSteps.push(
      createProcessStep({
        stage: 'ERROR',
        method: 'POST',
        endpoint: '/api/generations/submit',
        statusCode: 400,
        statusLabel: 'URL_BLOCKED',
        summary: 'Start image_url failed SSRF / public HTTP(S) check.',
      })
    );
    throw new GenerationOrchestrationError(
      'Start image_url must be a valid public HTTP/HTTPS URL.',
      400,
      undefined,
      { traces: traceSteps }
    );
  }
  if (lastImage && !validatePublicHttpUrl(lastImage).valid) {
    throw new GenerationOrchestrationError('Last image URL must be a valid public HTTP/HTTPS URL.', 400);
  }

  traceSteps.push(
    createProcessStep({
      stage: 'VALIDATE',
      method: 'POST',
      endpoint: '/api/generations/submit',
      statusCode: 200,
      statusLabel: 'VALIDATED',
      summary: `Validated ${provider.displayName} · ${model.displayName} (${requestedResolution} · ${requestedDuration}s${isDraft ? ' · DRAFT' : ''})`,
      requestPreview: {
        provider: providerId,
        model_id: model.modelId,
        resolution: requestedResolution,
        duration: requestedDuration,
        draft: isDraft,
        has_start_image: Boolean(imageUrl),
        has_last_image: Boolean(lastImage),
      },
    })
  );

  // 3. Server-side authoritative pricing calculation
  const estimate = calculateAuthoritativeEstimate({
    provider: providerId,
    modelId: model.modelId,
    resolution: requestedResolution,
    duration: requestedDuration,
    draft: isDraft,
    referenceImagesCount: refUrls.length || (imageUrl ? 1 : 0),
    physicsPriority: rawInput.physics_priority !== false,
  });

  traceSteps.push(
    createProcessStep({
      stage: 'PRICING',
      method: 'INTERNAL',
      endpoint: '/api/generations/estimate',
      statusCode: 200,
      statusLabel: 'PRICED',
      summary: `Authoritative cost lock: ${estimate.displayLabel} (${estimate.creditsRequired} CR)`,
      responsePreview: {
        effectiveResolution: estimate.effectiveResolution,
        duration: estimate.duration,
        providerCostUsd: estimate.providerCostUsd,
        appMarkupUsd: estimate.appMarkupUsd,
        finalPriceUsd: estimate.finalPriceUsd,
        creditsRequired: estimate.creditsRequired,
        currency: estimate.currency,
      },
    })
  );

  if (!provider.configured) {
    traceSteps.push(
      createProcessStep({
        stage: 'ERROR',
        method: 'POST',
        endpoint: model.submitEndpoint || `${provider.baseUrl}/seedance-2.5-spicy-image-to-video`,
        statusCode: 503,
        statusLabel: 'KEY_UNCONFIGURED',
        summary: `${provider.displayName} credentials missing (set MUAPIAPP_API_KEY / MUAPI_API_KEY in env or Admin Vault).`,
      })
    );
    throw new GenerationOrchestrationError(
      `${provider.displayName} API credentials are not configured on the backend.`,
      503,
      'PROVIDER_UNCONFIGURED',
      { traces: traceSteps }
    );
  }

  // 4. Duplicate in-flight submission protection
  const fingerprint = crypto
    .createHash('sha256')
    .update(
      `${user.uid}:${providerId}:${modelId}:${prompt}:${imageUrl || ''}:${lastImage || ''}:${requestedResolution}:${requestedDuration}:${isDraft}:${rawInput.draft_request_id || ''}`
    )
    .digest('hex');

  if (inFlightSubmissionFingerprints.has(fingerprint)) {
    throw new GenerationOrchestrationError(
      'An identical generation request is already submitting. Please wait a moment.',
      429
    );
  }
  inFlightSubmissionFingerprints.add(fingerprint);

  try {
    // 5. Server-side billing validation & atomic deduction BEFORE provider API call
    const shouldDeductWallet =
      providerId === 'bytedance' || provider.enforceWalletOnUsdProviders;
    const creditsToDeduct = shouldDeductWallet ? estimate.creditsRequired : 0;

    const jobId = `gen_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
    let walletAfterDeduction: number | undefined;

    if (creditsToDeduct > 0) {
      const deductRes = seedancePlatformStore.deductCreditsAtomic({
        userId: user.uid,
        userEmail: user.email,
        amount: creditsToDeduct,
        description: `${provider.displayName} · ${model.displayName} (${requestedResolution} · ${requestedDuration}s${isDraft ? ' · DRAFT' : ''})`,
        jobId,
        idempotencyKey,
      });
      if (!deductRes.success) {
        traceSteps.push(
          createProcessStep({
            stage: 'ERROR',
            method: 'INTERNAL',
            endpoint: 'wallet/deductCreditsAtomic',
            statusCode: 402,
            statusLabel: 'INSUFFICIENT_CREDITS',
            summary: deductRes.error || 'Insufficient credits.',
          })
        );
        throw new GenerationOrchestrationError(
          deductRes.error || 'Insufficient credits.',
          402,
          'INSUFFICIENT_CREDITS',
          {
            requiredCredits: creditsToDeduct,
            availableCredits: deductRes.wallet?.totalAvailable || 0,
            estimatedCostUsd: estimate.finalPriceUsd,
            traces: traceSteps,
          }
        );
      }
      walletAfterDeduction = deductRes.wallet?.totalAvailable;
    }

    const cleanInput: UnifiedGenerationInput = {
      ...rawInput,
      provider: providerId,
      model_id: model.modelId,
      prompt,
      image_url: imageUrl,
      last_image: lastImage,
      reference_image_urls: refUrls.length > 0 ? refUrls : imageUrl ? [imageUrl] : [],
      resolution: requestedResolution,
      duration: requestedDuration,
      generate_audio: rawInput.generate_audio !== false,
      camera_fixed: Boolean(rawInput.camera_fixed),
      high_bitrate: Boolean(rawInput.high_bitrate),
      draft: isDraft,
      draft_request_id:
        typeof rawInput.draft_request_id === 'string' && rawInput.draft_request_id.trim()
          ? rawInput.draft_request_id.trim()
          : undefined,
    };

    // Resolve parent_draft_job_id if finalizing via manual draft_request_id
    let parentDraftJobId = cleanInput.parent_draft_job_id || null;
    if (!parentDraftJobId && cleanInput.draft_request_id) {
      const matchedDraft = generationJobsStore.findByDraftRequestId(
        user.uid,
        cleanInput.draft_request_id
      );
      if (matchedDraft) {
        parentDraftJobId = matchedDraft.job_id;
      }
    }

    // 6. Build signed public HTTPS webhook for real-time MUAPI callback + call provider adapter
    const webhookUrl =
      providerId === 'muapi' ? buildSignedMuapiWebhookUrl(publicOrigin, jobId) : undefined;

    const submitStartMs = Date.now();
    const submission = await adapter.submitGeneration(model, cleanInput, {
      publicOrigin,
      webhookUrl,
    });
    const submitLatencyMs = submission.latencyMs ?? (Date.now() - submitStartMs);

    traceSteps.push(
      createProcessStep({
        stage: 'PROVIDER_SUBMIT',
        method: 'POST',
        endpoint:
          submission.endpointCalled ||
          model.submitEndpoint ||
          `${provider.baseUrl}/seedance-2.5-spicy-image-to-video`,
        statusCode: submission.httpStatus,
        latencyMs: submitLatencyMs,
        statusLabel: submission.ok ? 'ACCEPTED' : 'REJECTED',
        summary: submission.ok
          ? `Provider accepted submission · request_id=${submission.requestId}${webhookUrl ? ' (Webhook active)' : ''}`
          : submission.error || `${provider.displayName} submission rejected.`,
        requestPreview:
          submission.rawPayloadSanitized || submission.requestHeadersMasked
            ? {
                headers: submission.requestHeadersMasked,
                body: submission.rawPayloadSanitized,
              }
            : undefined,
        responsePreview:
          submission.responseBodySanitized ||
          (submission.error ? { error: submission.error } : undefined),
      })
    );

    generationJobsStore.addUsageLog({
      provider: providerId,
      model_id: model.modelId,
      job_id: jobId,
      user_id: user.uid,
      action: cleanInput.draft_request_id ? 'FINALIZE_DRAFT' : 'SUBMIT',
      success: submission.ok,
      httpStatus: submission.httpStatus,
      latencyMs: submitLatencyMs,
      estimatedCostUsd: estimate.finalPriceUsd,
      error: submission.error,
    });

    if (!submission.ok || !submission.requestId) {
      // Idempotent automatic refund if submission failed
      let refundedBalance = walletAfterDeduction;
      if (creditsToDeduct > 0) {
        const refRes = seedancePlatformStore.refundCreditsIdempotent({
          userId: user.uid,
          amount: creditsToDeduct,
          reason: submission.error || `${provider.displayName} submission rejected`,
          jobId,
        });
        refundedBalance = refRes.wallet.totalAvailable;
        traceSteps.push(
          createProcessStep({
            stage: 'ERROR',
            method: 'INTERNAL',
            endpoint: 'wallet/refundCreditsIdempotent',
            statusCode: 200,
            statusLabel: 'REFUNDED',
            summary: `Automatically refunded ${creditsToDeduct} CR after upstream rejection.`,
          })
        );
      }

      throw new GenerationOrchestrationError(
        submission.error || `${provider.displayName} submission rejected.`,
        submission.httpStatus >= 400 ? submission.httpStatus : 502,
        'PROVIDER_SUBMISSION_FAILED',
        { remainingBalance: refundedBalance, traces: traceSteps }
      );
    }

    const nowIso = new Date().toISOString();
    const initialJob: UnifiedGenerationJob = {
      job_id: jobId,
      user_id: user.uid,
      user_email: user.email,
      provider: providerId,
      model_id: model.modelId,
      model_name: model.displayName,
      request_id: submission.requestId,
      parent_draft_job_id: parentDraftJobId,
      prompt,
      image_url: imageUrl || null,
      last_image: lastImage || null,
      reference_image_urls: cleanInput.reference_image_urls,
      aspect_ratio: cleanInput.aspect_ratio || '16:9',
      resolution: requestedResolution,
      duration: requestedDuration,
      generate_audio: Boolean(cleanInput.generate_audio),
      camera_fixed: Boolean(cleanInput.camera_fixed),
      high_bitrate: Boolean(cleanInput.high_bitrate),
      draft: isDraft,
      draft_request_id: cleanInput.draft_request_id || null,
      estimated_cost:
        estimate.currency === 'USD' ? estimate.finalPriceUsd : estimate.creditsRequired,
      provider_cost_usd: estimate.providerCostUsd,
      markup_usd: estimate.appMarkupUsd,
      credits_deducted: creditsToDeduct,
      currency: estimate.currency,
      status: submission.status === 'completed' && submission.outputUrl ? 'processing' : submission.status,
      progress: submission.status === 'completed' ? 90 : 15,
      provider_output_url: submission.outputUrl || null,
      firebase_storage_path: null,
      playback_url: null,
      error: null,
      retry_count: 0,
      idempotency_key: idempotencyKey || null,
      refunded: false,
      webhook_enabled: Boolean(webhookUrl),
      backend_traces: traceSteps,
      created_at: nowIso,
      updated_at: nowIso,
      completed_at: null,
    };

    generationJobsStore.upsertJob(initialJob);

    seedancePlatformStore.createJob({
      id: jobId,
      userId: user.uid,
      userEmail: user.email,
      model: model.modelId,
      mode: cleanInput.image_url ? 'image-to-video' : 'text-to-video',
      prompt,
      duration: (requestedDuration <= 5
        ? 5
        : requestedDuration <= 10
        ? 10
        : requestedDuration <= 15
        ? 15
        : requestedDuration <= 20
        ? 20
        : 30),
      resolution:
        requestedResolution === '480p' || requestedResolution === '1080p'
          ? requestedResolution
          : '720p',
      aspectRatio: cleanInput.aspect_ratio || '16:9',
      referenceImages: cleanInput.reference_image_urls || [],
      physicsPriority: rawInput.physics_priority !== false,
      status: 'RUNNING',
      progressPercent: 15,
      estimatedCredits: creditsToDeduct,
      actualCreditsDeducted: creditsToDeduct,
      idempotencyKey,
      isPublic: false,
      createdAt: nowIso,
    });

    if (providerId === 'bytedance') {
      upsertHistoryEntry({
        id: `job-${jobId}`,
        job_code: submission.requestId,
        userId: user.uid,
        model: model.modelId,
        model_name: model.displayName,
        category: model.category,
        prompt,
        parameters: {
          aspect_ratio: cleanInput.aspect_ratio || '16:9',
          resolution: requestedResolution,
          duration: requestedDuration,
          sound_enabled: cleanInput.generate_audio,
          camera_fixed: cleanInput.camera_fixed,
          reference_image_urls: cleanInput.reference_image_urls,
        },
        status: 'processing',
        cost_generate: creditsToDeduct,
        remaining_balance_generate: walletAfterDeduction,
        result_url: null,
        error_message: null,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }

    // 7. Either finalize immediately if provider returned output synchronously, or enqueue fast real-time 3s background polling (+ webhook push)
    let finalJob = initialJob;
    if (submission.status === 'completed' && submission.outputUrl) {
      finalJob = await processCompletedJobMedia(initialJob, submission.outputUrl);
    } else {
      scheduleBackgroundJobPoll(jobId, Math.max(2000, provider.pollIntervalMs || 3000));
    }

    return {
      job: finalJob,
      remainingBalance: walletAfterDeduction,
    };
  } finally {
    inFlightSubmissionFingerprints.delete(fingerprint);
  }
}

export async function finalizeDraftGeneration(params: {
  draftJobId: string;
  user: { uid: string; email: string; name?: string; isAdmin: boolean };
  bearerToken?: string | null;
  publicOrigin: string;
  resolution?: UnifiedGenerationInput['resolution'];
  highBitrate?: boolean;
  idempotencyKey?: string;
}): Promise<{
  job: UnifiedGenerationJob;
  parentDraftJob: UnifiedGenerationJob;
  deduplicated?: boolean;
  remainingBalance?: number;
}> {
  let prepared: ReturnType<typeof prepareFinalizeDraftInput>;
  try {
    prepared = prepareFinalizeDraftInput({
      draftJobId: params.draftJobId,
      userId: params.user.uid,
      isAdmin: params.user.isAdmin,
      overrideResolution: params.resolution,
      overrideHighBitrate: params.highBitrate,
      overrideIdempotencyKey: params.idempotencyKey,
    });
  } catch (err: any) {
    throw new GenerationOrchestrationError(
      sanitizeErrorMessage(err, 'Unable to finalize draft generation.'),
      400
    );
  }

  const submitted = await submitUnifiedGeneration({
    user: params.user,
    bearerToken: params.bearerToken,
    publicOrigin: params.publicOrigin,
    rawInput: prepared.input,
  });

  return {
    ...submitted,
    parentDraftJob: prepared.parentDraftJob,
  };
}

export function listUnifiedHistoryForUser(userId: string): UnifiedGenerationJob[] {
  const unified = generationJobsStore.listUserJobs(userId);
  const seenRequestIds = new Set(unified.map((j) => j.request_id).filter(Boolean));
  const seenJobIds = new Set(unified.map((j) => j.job_id));

  // Merge any legacy ByteDance history entries created through /api/ai/generate directly
  const legacyEntries = readHistoryStore().filter((entry) => entry.userId === userId);
  for (const legacy of legacyEntries) {
    if (seenJobIds.has(legacy.job_code) || seenRequestIds.has(legacy.job_code)) {
      continue;
    }
    const rawSt = String(legacy.status || '').toLowerCase();
    const status: UnifiedGenerationJob['status'] =
      rawSt === 'completed' || rawSt === 'succeeded'
        ? 'completed'
        : rawSt === 'failed' || rawSt === 'cancelled'
        ? 'failed'
        : rawSt === 'queued'
        ? 'pending'
        : 'processing';
    unified.push({
      job_id: legacy.job_code,
      user_id: userId,
      provider: 'bytedance',
      model_id: legacy.model,
      model_name: legacy.model_name || legacy.model,
      request_id: legacy.job_code,
      parent_draft_job_id: null,
      prompt: legacy.prompt || '',
      image_url:
        typeof legacy.parameters?.image_url === 'string' ? legacy.parameters.image_url : null,
      last_image:
        typeof legacy.parameters?.end_image_url === 'string'
          ? legacy.parameters.end_image_url
          : null,
      reference_image_urls: Array.isArray(legacy.parameters?.reference_image_urls)
        ? (legacy.parameters.reference_image_urls as string[])
        : [],
      aspect_ratio:
        typeof legacy.parameters?.aspect_ratio === 'string'
          ? legacy.parameters.aspect_ratio
          : '16:9',
      resolution: normalizeResolutionCase(legacy.parameters?.resolution || '720p'),
      duration: Number(legacy.parameters?.duration || 15),
      generate_audio: legacy.parameters?.sound_enabled !== false,
      camera_fixed: Boolean(legacy.parameters?.camera_fixed),
      high_bitrate: false,
      draft: false,
      draft_request_id: null,
      estimated_cost: legacy.cost_generate || 0,
      currency: 'CREDITS',
      status,
      progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 40,
      provider_output_url: legacy.result_url || null,
      firebase_storage_path: null,
      playback_url: legacy.result_url || null,
      error: legacy.error_message || null,
      created_at: legacy.created_at,
      updated_at: legacy.updated_at,
      completed_at: status === 'completed' ? legacy.updated_at : null,
    });
  }

  return unified.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
