/**
 * ByteDance BytePlus ModelArk API v3 — Express Server Routes (/api/ai/*)
 * Integrated with unified Seedance Platform Store:
 * - Verifies authenticated Firebase user on balance, generation, status, and history
 * - Calculates dynamic credit costs per model/resolution/duration/quality/refs
 * - Enforces plan limits, atomic pre-deduction (no negative balance), idempotency keys
 * - Automatically refunds credits once if submission fails or upstream task fails/cancels
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  byteDanceClient,
  redactSecret,
  getByteDanceConfigStatus,
} from './bytedanceClient';
import {
  validateGeneratePayload,
  validateJobCode,
  isPublicHttpUrl,
  MODEL_BY_KEY,
  MODEL_ALIASES,
} from './bytedanceSchema';
import {
  seedancePlatformStore,
  calculateDynamicGenerationCost,
} from './seedancePlatformStore';
import {
  optionalFirebaseAuth,
  requireFirebaseAuth,
} from './firebaseAuthMiddleware';
import {
  aiLimiter,
  uploadLimiter,
  isSafeIdentifier,
  resolveSafePublicOrigin,
  validateMagicBytes,
  validatePublicHttpUrl,
  sanitizeErrorMessage,
} from './securityMiddleware';
import { seedanceCuratedStore } from './seedanceCuratedStore';

export interface ByteDanceHistoryEntry {
  id: string;
  job_code: string;
  userId?: string;
  model: string;
  upstream_model?: string;
  model_name: string;
  category: string;
  prompt: string;
  parameters: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | string;
  cost_generate: number;
  remaining_balance_generate?: number;
  result_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const HISTORY_FILE = path.join(UPLOADS_DIR, 'bytedance_history.json');
const FALLBACK_PUBLIC_ORIGIN =
  'https://ais-dev-mwimdbvagpgdqljyqxrbuw-513296942322.asia-northeast1.run.app';

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function readHistoryStore(): ByteDanceHistoryEntry[] {
  try {
    ensureUploadsDir();
    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeHistoryStore(entries: ByteDanceHistoryEntry[]): void {
  try {
    ensureUploadsDir();
    const bounded = entries.slice(0, 500);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(bounded, null, 2), 'utf-8');
  } catch {
    // Non-fatal persistence error
  }
}

export function upsertHistoryEntry(entry: ByteDanceHistoryEntry): ByteDanceHistoryEntry[] {
  const existing = readHistoryStore();
  const idx = existing.findIndex(
    (item) => item.job_code === entry.job_code || item.id === entry.id
  );
  if (idx >= 0) {
    existing[idx] = {
      ...existing[idx],
      ...entry,
      updated_at: new Date().toISOString(),
    };
  } else {
    existing.unshift(entry);
  }
  writeHistoryStore(existing);
  return existing;
}

function saveDataUrlToPublicUpload(dataUrl: string, publicOrigin: string): string | null {
  try {
    const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (!matches) return null;
    const mimeType = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 25 * 1024 * 1024) return null;

    const magic = validateMagicBytes(buffer, mimeType, ['image', 'video', 'audio']);
    if (!magic.valid || !magic.ext) {
      return null;
    }

    const fileName = `bytedance_in_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${magic.ext}`;
    ensureUploadsDir();
    fs.writeFileSync(path.join(UPLOADS_DIR, fileName), buffer);
    return `${publicOrigin}/uploads/${fileName}`;
  } catch {
    return null;
  }
}

function normalizeSingleMediaUrl(rawVal: unknown, publicOrigin: string): string | undefined {
  if (typeof rawVal !== 'string' || !rawVal.trim()) return undefined;
  const trimmed = rawVal.trim();

  if (trimmed.startsWith('data:')) {
    return saveDataUrlToPublicUpload(trimmed, publicOrigin) || undefined;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes('..')) {
    return `${publicOrigin}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return `${publicOrigin}${parsed.pathname}${parsed.search}`;
    }
    const urlCheck = validatePublicHttpUrl(trimmed);
    if (!urlCheck.valid) return undefined;
  } catch {
    return undefined;
  }

  return trimmed;
}

function normalizeIncomingGenerateBody(
  rawBody: unknown,
  req: Request
): Record<string, unknown> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {};
  }
  const body = { ...(rawBody as Record<string, unknown>) };
  const publicOrigin = resolveSafePublicOrigin(req);

  const singleUrlFields = ['image_url', 'end_image_url', 'video_url', 'audio_url'] as const;
  for (const field of singleUrlFields) {
    if (body[field]) {
      const normalized = normalizeSingleMediaUrl(body[field], publicOrigin);
      if (normalized) {
        body[field] = normalized;
      } else {
        delete body[field];
      }
    }
  }

  const arrayFields = ['reference_image_urls', 'image_urls', 'images'] as const;
  let normalizedArray: string[] = [];
  for (const arrField of arrayFields) {
    const candidate = body[arrField];
    if (Array.isArray(candidate)) {
      normalizedArray = candidate
        .map((item) => normalizeSingleMediaUrl(item, publicOrigin))
        .filter((u): u is string => Boolean(u));
      break;
    }
  }

  const rawModelKey = typeof body.model === 'string' ? body.model.trim() : '';
  const resolvedModelKey = MODEL_ALIASES[rawModelKey] || rawModelKey;
  const modelDef = MODEL_BY_KEY[resolvedModelKey];

  const maxImagesCap = modelDef?.maxImages ?? 30;
  if (normalizedArray.length > 0) {
    normalizedArray = Array.from(new Set(normalizedArray)).slice(0, maxImagesCap);
    body.reference_image_urls = normalizedArray;
    body.image_urls = normalizedArray;
    if (!body.image_url) {
      body.image_url = normalizedArray[0];
    }
  } else if (typeof body.image_url === 'string' && body.image_url) {
    body.reference_image_urls = [body.image_url];
  }

  if (
    (resolvedModelKey === 'seedance_25_15s_r2v' || resolvedModelKey === 'seedance_25_30s_r2v') &&
    !body.image_url &&
    normalizedArray.length === 0
  ) {
    body.model = resolvedModelKey.replace(/_r2v$/, '');
  }

  return body;
}

const inFlightSubmissions = new Set<string>();

export function createByteDanceRouter(): Router {
  const router = Router();

  // 1. GET /api/ai/health
  router.get('/health', async (_req: Request, res: Response) => {
    const result = await byteDanceClient.checkHealth();
    res.setHeader('X-Request-Id', result.requestId);
    return res.status(200).json({
      ok: result.ok,
      requestId: result.requestId,
      ...(result.data || {}),
      error: result.error,
    });
  });

  // 2. GET /api/ai/models
  router.get('/models', async (_req: Request, res: Response) => {
    const result = await byteDanceClient.getModels();
    res.setHeader('X-Request-Id', result.requestId);
    res.status(result.status).json({
      ok: result.ok,
      requestId: result.requestId,
      ...(result.data || {}),
    });
  });

  // 3. GET /api/ai/balance (Authenticated User Credit Wallet & Cost Config)
  router.get('/balance', optionalFirebaseAuth, async (req: Request, res: Response) => {
    const requestId = crypto.randomUUID();
    const verified = req.verifiedUser;
    const stock = seedancePlatformStore.getApiStock();
    const config = getByteDanceConfigStatus();
    const costConfig = seedancePlatformStore.getCostConfig();

    res.setHeader('X-Request-Id', requestId);

    if (!verified) {
      return res.status(200).json({
        ok: true,
        authenticated: false,
        requestId,
        balance_generate: 0,
        used_credits: 0,
        monthly_credits: 0,
        purchased_credits: 0,
        balance_idr_equivalent: 0,
        unit_value_idr: costConfig.unitValueIdr,
        serverKeyConfigured: config.configured,
        baseUrl: config.baseUrl,
        source: 'bytedance_modelark_ledger',
      });
    }

    seedancePlatformStore.upsertUserRecord({
      uid: verified.uid,
      email: verified.email,
      displayName: verified.name,
      isAdmin: verified.isAdmin,
    });
    const wallet = seedancePlatformStore.getOrCreateWallet(verified.uid, verified.email);
    const subscription = seedancePlatformStore.getUserSubscription(verified.uid, verified.email);

    return res.status(200).json({
      ok: true,
      authenticated: true,
      requestId,
      userId: verified.uid,
      tier: subscription.planTier,
      planName: subscription.planName,
      balance_generate: wallet.totalAvailable,
      used_credits: wallet.usedCredits,
      monthly_credits: wallet.monthlySubscriptionCredits,
      purchased_credits: wallet.purchasedTopUpCredits,
      balance_idr_equivalent: wallet.totalAvailable * costConfig.unitValueIdr,
      unit_value_idr: costConfig.unitValueIdr,
      ...(verified.isAdmin ? { api_stock_tokens_remaining: stock.tokensRemaining } : {}),
      serverKeyConfigured: config.configured,
      baseUrl: config.baseUrl,
      source: 'bytedance_modelark_ledger',
    });
  });

  // 4. POST /api/ai/generate (Authenticated, Plan-checked, Dynamic Cost, Atomic Deduct & Auto-Refund)
  router.post('/generate', requireFirebaseAuth, aiLimiter, async (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    seedancePlatformStore.upsertUserRecord({
      uid: user.uid,
      email: user.email,
      displayName: user.name,
      isAdmin: user.isAdmin,
    });

    const normalizedBody = normalizeIncomingGenerateBody(req.body, req);
    const validation = validateGeneratePayload(normalizedBody);

    if (!validation.valid || !validation.sanitizedPayload) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: validation.error || 'Invalid generation parameters.',
        fieldErrors: validation.fieldErrors || {},
      });
    }

    const payload = validation.sanitizedPayload;
    const modelKey = String(payload.model);
    const modelDef = MODEL_BY_KEY[modelKey];
    const idempotencyKey =
      (typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()) ||
      (typeof req.headers['x-idempotency-key'] === 'string' && req.headers['x-idempotency-key'].trim()) ||
      undefined;

    if (idempotencyKey) {
      const existingIdem = seedancePlatformStore.getIdempotencyRecord(user.uid, idempotencyKey);
      if (existingIdem) {
        const wallet = seedancePlatformStore.getOrCreateWallet(user.uid, user.email);
        const hist = readHistoryStore().find((h) => h.job_code === existingIdem.jobCode);
        return res.status(200).json({
          ok: true,
          success: true,
          deduplicated: true,
          job_code: existingIdem.jobCode,
          jobCode: existingIdem.jobCode,
          cost_generate: existingIdem.creditsDeducted,
          remaining_balance_generate: wallet.totalAvailable,
          historyEntry: hist,
        });
      }
    }

    // Plan capability check
    const sub = seedancePlatformStore.getUserSubscription(user.uid, user.email);
    const plan = seedancePlatformStore.getPlans(true).find((p) => p.tier === sub.planTier);
    const refCount = Array.isArray(payload.reference_image_urls)
      ? payload.reference_image_urls.length
      : 0;
    const resolutionStr = String(payload.resolution || '720p').toLowerCase();
    const durationNum = Number(payload.duration || modelDef?.defaultDurationSeconds || 15);
    const quantityNum = Math.max(1, Math.min(4, Number(req.body?.quantity || 1)));
    const physicsPriority = payload.physics_priority !== false;

    if (plan) {
      if (resolutionStr === '1080p' && plan.maxResolution !== '1080p') {
        return res.status(403).json({
          ok: false,
          success: false,
          error: `1080p resolution requires Premium or Enterprise tier (Current: ${plan.name}).`,
        });
      }
      if (resolutionStr === '720p' && plan.maxResolution === '480p') {
        return res.status(403).json({
          ok: false,
          success: false,
          error: `720p resolution requires Basic or higher tier (Current: ${plan.name}).`,
        });
      }
      if (refCount > plan.maxReferenceImages) {
        return res.status(403).json({
          ok: false,
          success: false,
          error: `${plan.name} tier allows up to ${plan.maxReferenceImages} reference images (received ${refCount}).`,
        });
      }
    }

    // Dynamic server-side credit calculation
    const costConfig = seedancePlatformStore.getCostConfig();
    const costCalc = calculateDynamicGenerationCost(costConfig, {
      modelKey,
      resolution: resolutionStr,
      duration: durationNum,
      referenceImagesCount: refCount,
      physicsPriority,
      quantity: quantityNum,
    });
    const requiredCredits = costCalc.totalCreditDeduction;

    const fingerprint = crypto
      .createHash('sha256')
      .update(`${user.uid}:${JSON.stringify(payload)}`)
      .digest('hex');

    if (inFlightSubmissions.has(fingerprint)) {
      return res.status(429).json({
        ok: false,
        success: false,
        error: 'An identical generation request is currently in flight. Please wait a moment.',
      });
    }
    inFlightSubmissions.add(fingerprint);

    try {
      // Check ByteDance API config BEFORE touching credits
      const bdConfig = getByteDanceConfigStatus();
      if (!bdConfig.configured) {
        return res.status(503).json({
          ok: false,
          success: false,
          error:
            'ByteDance ModelArk API key is not configured on the server (BYTEDANCE_API_KEY / ARK_API_KEY).',
        });
      }

      // Atomic deduction BEFORE submitting upstream (prevents negative balances & free-riding)
      const pendingId = `pre-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const deductResult = seedancePlatformStore.deductCreditsAtomic({
        userId: user.uid,
        userEmail: user.email,
        amount: requiredCredits,
        description: `ByteDance ${modelDef?.name || modelKey} (${resolutionStr} · ${durationNum}s)`,
        jobId: pendingId,
        idempotencyKey,
      });

      if (!deductResult.success) {
        return res.status(402).json({
          ok: false,
          success: false,
          error: deductResult.error || 'Insufficient credits.',
          requiredCredits,
          availableCredits: deductResult.wallet?.totalAvailable || 0,
        });
      }

      const upstream = await byteDanceClient.submitGenerate(payload);
      res.setHeader('X-Request-Id', upstream.requestId);

      if (!upstream.ok || !upstream.data) {
        const refunded = seedancePlatformStore.refundCreditsIdempotent({
          userId: user.uid,
          amount: requiredCredits,
          reason: upstream.error || 'ByteDance submission rejected',
          jobId: pendingId,
        });
        return res.status(upstream.status || 502).json({
          ok: false,
          success: false,
          requestId: upstream.requestId,
          remaining_balance_generate: refunded.wallet.totalAvailable,
          error: redactSecret(
            upstream.error || 'ByteDance ModelArk generation submission failed. Credits refunded.'
          ),
        });
      }

      const nowIso = new Date().toISOString();
      const jobCode = upstream.data.job_code;

      seedancePlatformStore.createJob({
        id: jobCode,
        userId: user.uid,
        userEmail: user.email,
        model: modelKey,
        mode: refCount > 0 ? 'ref-video' : modelDef?.category === 'Image' ? 'image' : 'text-to-video',
        prompt: typeof payload.prompt === 'string' ? payload.prompt : '',
        duration: (durationNum <= 5 ? 5 : durationNum <= 10 ? 10 : durationNum <= 15 ? 15 : durationNum <= 20 ? 20 : 30),
        resolution: resolutionStr === '480p' || resolutionStr === '1080p' ? resolutionStr : '720p',
        aspectRatio: String(payload.aspect_ratio || '16:9'),
        referenceImages: Array.isArray(payload.reference_image_urls)
          ? (payload.reference_image_urls as string[])
          : [],
        physicsPriority,
        status: upstream.data.status === 'completed' ? 'COMPLETED' : 'RUNNING',
        progressPercent: upstream.data.status === 'completed' ? 100 : 15,
        estimatedCredits: requiredCredits,
        actualCreditsDeducted: requiredCredits,
        idempotencyKey,
        videoUrl: upstream.data.result_url || undefined,
        isPublic: false,
        createdAt: nowIso,
      });

      if (idempotencyKey) {
        seedancePlatformStore.saveIdempotencyRecord({
          key: idempotencyKey,
          userId: user.uid,
          jobCode,
          creditsDeducted: requiredCredits,
          createdAt: nowIso,
        });
      }

      const historyRecord: ByteDanceHistoryEntry = {
        id: `job-${jobCode}`,
        job_code: jobCode,
        userId: user.uid,
        model: modelKey,
        upstream_model: upstream.data.upstream_model,
        model_name: modelDef?.name || modelKey,
        category: modelDef?.category || 'Video',
        prompt: typeof payload.prompt === 'string' ? payload.prompt : '',
        parameters: payload,
        status: upstream.data.status || 'queued',
        cost_generate: requiredCredits,
        remaining_balance_generate: deductResult.wallet?.totalAvailable,
        result_url: upstream.data.result_url || null,
        error_message: null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      upsertHistoryEntry(historyRecord);

      if (upstream.data.status === 'completed' && upstream.data.result_url) {
        const extraUrls = Array.isArray((upstream.data as any).output_urls)
          ? ((upstream.data as any).output_urls as string[])
          : [upstream.data.result_url];
        const isImg = String(modelDef?.category || '').toLowerCase() === 'image';
        seedanceCuratedStore.ingestCompletedGeneration({
          ownerId: user.uid,
          ownerName: user.name,
          ownerAvatar: user.picture,
          sourceJobId: jobCode,
          generationGroupId: `bd-${jobCode}`,
          sourcePipeline: isImg ? 'bytedance_image' : 'seedance_video',
          mediaType: isImg ? 'IMAGE' : 'VIDEO',
          outputUrls: extraUrls,
          thumbnailUrl: (upstream.data as { last_frame_url?: string }).last_frame_url || undefined,
          aiModel: modelDef?.name || modelKey,
          modelCategory: modelDef?.category || (isImg ? 'Image' : 'Video'),
          aspectRatio: String(payload.aspect_ratio || '16:9'),
          resolution: resolutionStr.toUpperCase(),
          durationSeconds: isImg ? undefined : durationNum,
          prompt: typeof payload.prompt === 'string' ? payload.prompt : '',
          parameters: payload,
          referenceImageCount: refCount,
          generatedAt: nowIso,
        });
      }

      return res.status(200).json({
        ok: true,
        success: true,
        requestId: upstream.requestId,
        ...upstream.data,
        cost_generate: requiredCredits,
        costCalculation: costCalc,
        jobCode,
        remaining_balance_generate: deductResult.wallet?.totalAvailable,
        outputUrl: upstream.data.result_url || undefined,
        historyEntry: historyRecord,
      });
    } finally {
      inFlightSubmissions.delete(fingerprint);
    }
  });

  // 5. GET /api/ai/jobs/:jobCode and /api/ai/status/:jobCode
  router.get(['/jobs/:jobCode', '/status/:jobCode'], requireFirebaseAuth, async (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    const check = validateJobCode(req.params.jobCode);
    if (!check.valid || !check.sanitized) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: check.error || 'Invalid task ID.',
      });
    }

    const taskId = check.sanitized;
    const store = readHistoryStore();
    const existing = store.find((item) => item.job_code === taskId);

    if (existing && existing.userId && existing.userId !== user.uid && !user.isAdmin) {
      return res.status(403).json({
        ok: false,
        success: false,
        error: 'Access denied to this generation job.',
      });
    }

    if (existing && existing.status === 'completed' && existing.result_url) {
      return res.status(200).json({
        ok: true,
        success: true,
        job_code: existing.job_code,
        jobCode: existing.job_code,
        model: existing.model,
        status: 'completed',
        progress: 100,
        cost_generate: existing.cost_generate,
        result_url: existing.result_url,
        outputUrl: existing.result_url,
        created_at: existing.created_at,
        updated_at: existing.updated_at,
      });
    }

    const upstream = await byteDanceClient.getTaskStatus(taskId);
    res.setHeader('X-Request-Id', upstream.requestId);

    if (upstream.ok && upstream.data) {
      if (existing) {
        if (
          (upstream.data.status === 'failed' || upstream.data.status === 'cancelled') &&
          existing.status !== 'failed' &&
          existing.status !== 'cancelled' &&
          existing.cost_generate > 0
        ) {
          seedancePlatformStore.refundCreditsIdempotent({
            userId: existing.userId || user.uid,
            amount: existing.cost_generate,
            reason:
              upstream.data.error_message ||
              `ByteDance task ${taskId} ${upstream.data.status}`,
            jobId: taskId,
          });
        }

        if (upstream.data.status === 'completed') {
          seedancePlatformStore.updateJob(taskId, {
            status: 'COMPLETED',
            progressPercent: 100,
            videoUrl: upstream.data.result_url || undefined,
            completedAt: new Date().toISOString(),
          });

          if (upstream.data.result_url) {
            const extraUrls = Array.isArray((upstream.data as any).output_urls)
              ? ((upstream.data as any).output_urls as string[])
              : [upstream.data.result_url];
            const modelDefExist = MODEL_BY_KEY[existing.model];
            const isImg =
              String(existing.category || modelDefExist?.category || '').toLowerCase() ===
              'image';
            seedanceCuratedStore.ingestCompletedGeneration({
              ownerId: existing.userId || user.uid,
              ownerName: user.name,
              ownerAvatar: user.picture,
              sourceJobId: taskId,
              generationGroupId: `bd-${taskId}`,
              sourcePipeline: isImg ? 'bytedance_image' : 'seedance_video',
              mediaType: isImg ? 'IMAGE' : 'VIDEO',
              outputUrls: extraUrls,
              thumbnailUrl: upstream.data.last_frame_url || undefined,
              aiModel: existing.model_name || existing.model,
              modelCategory: existing.category || (isImg ? 'Image' : 'Video'),
              aspectRatio: String(existing.parameters?.aspect_ratio || '16:9'),
              resolution: String(existing.parameters?.resolution || '720p').toUpperCase(),
              durationSeconds: isImg
                ? undefined
                : Number(existing.parameters?.duration || 15),
              prompt: existing.prompt || '',
              parameters: existing.parameters || {},
              referenceImageCount: Array.isArray(existing.parameters?.reference_image_urls)
                ? existing.parameters.reference_image_urls.length
                : 0,
              generatedAt: existing.created_at,
            });
          }
        }

        upsertHistoryEntry({
          ...existing,
          status: upstream.data.status,
          result_url: upstream.data.result_url ?? existing.result_url,
          error_message: upstream.data.error_message ?? existing.error_message,
          updated_at: upstream.data.updated_at || new Date().toISOString(),
        });
      }

      return res.status(200).json({
        ok: true,
        success: true,
        requestId: upstream.requestId,
        ...upstream.data,
        jobCode: upstream.data.job_code,
        outputUrl: upstream.data.result_url || undefined,
      });
    }

    return res.status(upstream.status || 502).json({
      ok: false,
      success: false,
      requestId: upstream.requestId,
      error: redactSecret(upstream.error || 'Failed to check ByteDance task status.'),
    });
  });

  // 6. GET /api/ai/history (Scoped strictly to verified authenticated user)
  router.get('/history', optionalFirebaseAuth, (req: Request, res: Response) => {
    const user = req.verifiedUser;
    if (!user) {
      return res.status(200).json({ ok: true, items: [] });
    }
    const items = readHistoryStore().filter(
      (item) => item.userId === user.uid || (user.isAdmin && !item.userId)
    );
    return res.status(200).json({ ok: true, items });
  });

  // 7. DELETE /api/ai/history/:id
  router.delete('/history/:id', requireFirebaseAuth, async (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    const targetId = String(req.params.id || '').trim();
    if (!isSafeIdentifier(targetId)) {
      return res.status(400).json({ ok: false, error: 'Invalid job identifier.' });
    }
    const items = readHistoryStore();
    const match = items.find((item) => item.id === targetId || item.job_code === targetId);

    if (match && match.userId && match.userId !== user.uid && !user.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Cannot delete another user’s job.' });
    }

    if (match && (match.status === 'queued' || match.status === 'processing')) {
      await byteDanceClient.deleteTask(match.job_code).catch(() => undefined);
    }

    const filtered = items.filter(
      (item) => item.id !== targetId && item.job_code !== targetId
    );
    writeHistoryStore(filtered);
    return res.status(200).json({
      ok: true,
      items: filtered.filter((item) => item.userId === user.uid),
    });
  });

  // 8. POST /api/ai/upload-media
  router.post('/upload-media', requireFirebaseAuth, uploadLimiter, (req: Request, res: Response) => {
    try {
      const { dataUrl } = req.body || {};
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
        return res.status(400).json({
          ok: false,
          error: 'Expected a valid base64 dataUrl starting with "data:".',
        });
      }

      const matches = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({
          ok: false,
          error: 'Malformed base64 data URL.',
        });
      }

      const mimeType = matches[1].toLowerCase();
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 25 * 1024 * 1024) {
        return res.status(413).json({
          ok: false,
          error: 'Media file exceeds maximum allowed upload size of 25 MB.',
        });
      }

      const magic = validateMagicBytes(buffer, mimeType, ['image', 'video', 'audio']);
      if (!magic.valid || !magic.ext) {
        return res.status(400).json({
          ok: false,
          error: magic.reason || 'Unsupported or invalid binary media signature.',
        });
      }

      const safeName = `bytedance_${Date.now()}_${crypto.randomBytes(6).toString('hex')}${magic.ext}`;
      ensureUploadsDir();
      const targetPath = path.join(UPLOADS_DIR, safeName);
      fs.writeFileSync(targetPath, buffer);

      const baseOrigin = resolveSafePublicOrigin(req);
      const publicUrl = `${baseOrigin}/uploads/${safeName}`;
      const urlCheck = isPublicHttpUrl(publicUrl);

      return res.status(200).json({
        ok: true,
        url: publicUrl,
        isPubliclyReachable: urlCheck.valid,
      });
    } catch (err: unknown) {
      return res.status(500).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Failed to store uploaded media.'),
      });
    }
  });

  return router;
}
