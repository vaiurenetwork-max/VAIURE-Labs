/**
 * Provider Polling Service
 * Handles single-poll verification, failure detection, automatic idempotent credit refunds,
 * and delegates verified completed videos to the media receiver worker.
 * Never submits a duplicate generation on polling failure.
 */

import { UnifiedGenerationJob } from '../../../types/multiProvider';
import { seedancePlatformStore } from '../../seedancePlatformStore';
import { generationJobsStore } from '../firebase/firestore.service';
import { providerConfigStore } from '../config/provider.config';
import {
  extractMuapiError,
  extractMuapiOutputs,
  normalizeMuapiStatus,
  redactMuapiSecrets,
} from '../providers/muapi.provider';
import { providerService } from './provider.service';
import { createProcessStep } from './realtimeEvents.service';
import { cancelBackgroundJobPoll } from '../workers/generation.worker';
import { processCompletedJobMedia } from '../workers/media.receiver';

const inFlightPolls = new Map<string, Promise<UnifiedGenerationJob>>();

export async function pollGenerationJobOnce(jobId: string): Promise<UnifiedGenerationJob | null> {
  const existing = generationJobsStore.getJob(jobId);
  if (!existing) return null;

  if (existing.status === 'completed' || existing.status === 'failed') {
    return existing;
  }

  if (!existing.request_id) {
    return existing;
  }

  const activePromise = inFlightPolls.get(jobId);
  if (activePromise) {
    return activePromise;
  }

  const work = (async (): Promise<UnifiedGenerationJob> => {
    const startMs = Date.now();
    try {
      const adapter = providerService.getAdapter(existing.provider);
      const foundModel = providerConfigStore.findModel(existing.provider, existing.model_id)?.model;

      const pollRes = await adapter.getGenerationStatus(existing.request_id!, foundModel);
      const latencyMs = pollRes.latencyMs ?? (Date.now() - startMs);

      generationJobsStore.appendJobTrace(
        existing.job_id,
        createProcessStep({
          stage: 'POLL',
          method: 'GET',
          endpoint:
            pollRes.endpointCalled ||
            foundModel?.resultEndpointTemplate?.replace('{request_id}', existing.request_id!) ||
            `https://api.muapi.ai/api/v1/predictions/${existing.request_id}/result`,
          statusCode: pollRes.httpStatus,
          latencyMs,
          statusLabel: pollRes.status.toUpperCase(),
          summary:
            pollRes.status === 'completed'
              ? `Poll verified completion with output media (${latencyMs}ms)`
              : pollRes.status === 'failed'
              ? pollRes.error || 'Provider returned failed status during poll'
              : `Provider status: ${pollRes.status} (${pollRes.progress || 30}%)`,
          responsePreview:
            pollRes.responseBodySanitized ||
            (pollRes.error ? { error: pollRes.error } : undefined),
        })
      );

      generationJobsStore.addUsageLog({
        provider: existing.provider,
        model_id: existing.model_id,
        job_id: existing.job_id,
        user_id: existing.user_id,
        action: 'POLL',
        success: pollRes.ok && pollRes.status !== 'failed',
        httpStatus: pollRes.httpStatus,
        latencyMs,
        error: pollRes.error,
      });

      const latest = generationJobsStore.getJob(existing.job_id) || existing;

      // Only complete when output URL exists and is verified
      if (pollRes.status === 'completed' && pollRes.outputUrl) {
        if (pollRes.hasNsfwContents) {
          generationJobsStore.updateJob(existing.job_id, {
            has_nsfw_contents: pollRes.hasNsfwContents,
          });
        }
        return await processCompletedJobMedia(
          generationJobsStore.getJob(existing.job_id) || latest,
          pollRes.outputUrl
        );
      }

      if (pollRes.status === 'failed') {
        let refunded = Boolean(latest.refunded);
        if (!refunded && latest.credits_deducted && latest.credits_deducted > 0) {
          seedancePlatformStore.refundCreditsIdempotent({
            userId: latest.user_id,
            amount: latest.credits_deducted,
            reason: pollRes.error || `${latest.provider} job ${latest.job_id} failed`,
            jobId: latest.job_id,
          });
          refunded = true;
        }
        seedancePlatformStore.updateJob(latest.job_id, {
          status: refunded ? 'REFUNDED' : 'FAILED',
          errorMessage: pollRes.error || 'Generation failed on provider.',
        });

        return (
          generationJobsStore.updateJob(latest.job_id, {
            status: 'failed',
            progress: 0,
            has_nsfw_contents: pollRes.hasNsfwContents,
            error: pollRes.error || 'Video generation failed on provider.',
            refunded,
          }) || latest
        );
      }

      // Transient polling error or still processing
      const nextRetry = pollRes.ok ? 0 : (latest.retry_count || 0) + 1;
      return (
        generationJobsStore.updateJob(latest.job_id, {
          status: pollRes.status === 'pending' ? 'pending' : 'processing',
          progress: Math.max(latest.progress || 10, pollRes.progress || 30),
          has_nsfw_contents: pollRes.hasNsfwContents ?? latest.has_nsfw_contents,
          retry_count: nextRetry,
        }) || latest
      );
    } finally {
      inFlightPolls.delete(jobId);
    }
  })();

  inFlightPolls.set(jobId, work);
  return work;
}

/**
 * Real-time Webhook Push Callback Processor for MUAPI (?webhook=...)
 * Immediately processes completion/failure push events and cancels polling timers.
 */
export async function handleMuapiWebhookCallback(
  jobId: string,
  rawBody: unknown
): Promise<{
  ok: boolean;
  status: number;
  message: string;
  job?: UnifiedGenerationJob;
}> {
  const existing = generationJobsStore.getJob(jobId);
  if (!existing) {
    return { ok: false, status: 404, message: 'Generation job not found.' };
  }

  const raw = rawBody && typeof rawBody === 'object' ? (rawBody as any) : {};
  const rawStatus = raw.status ?? raw.data?.status;
  const normalized = normalizeMuapiStatus(rawStatus);
  const outputs = extractMuapiOutputs(raw);
  const outputUrl = outputs[0];
  const errMsg = extractMuapiError(raw);
  const hasNsfwContents: boolean[] | undefined = Array.isArray(raw.has_nsfw_contents)
    ? raw.has_nsfw_contents.map(Boolean)
    : undefined;

  generationJobsStore.appendJobTrace(
    jobId,
    createProcessStep({
      stage: 'WEBHOOK',
      method: 'POST',
      endpoint: `/api/webhooks/muapi/${jobId}`,
      statusCode: 200,
      statusLabel: normalized.toUpperCase(),
      summary:
        normalized === 'completed'
          ? `Webhook push received with completed output (${outputs.length} url)`
          : normalized === 'failed'
          ? `Webhook push received failed status: ${errMsg || rawStatus}`
          : `Webhook push status update: ${normalized}`,
      responsePreview: {
        id: raw.id || raw.request_id || existing.request_id,
        status: rawStatus || normalized,
        outputs,
        has_nsfw_contents: hasNsfwContents,
        error: errMsg,
      },
    })
  );

  generationJobsStore.addUsageLog({
    provider: existing.provider,
    model_id: existing.model_id,
    job_id: existing.job_id,
    user_id: existing.user_id,
    action: 'WEBHOOK',
    success: normalized !== 'failed',
    httpStatus: 200,
    error: errMsg,
  });

  const latest = generationJobsStore.getJob(jobId) || existing;
  if (latest.status === 'completed' || latest.status === 'failed') {
    return {
      ok: true,
      status: 200,
      message: 'Job already in terminal state; webhook recorded.',
      job: latest,
    };
  }

  if (normalized === 'completed') {
    if (!outputUrl && hasNsfwContents?.some(Boolean)) {
      cancelBackgroundJobPoll(jobId);
      let refunded = Boolean(latest.refunded);
      if (!refunded && latest.credits_deducted && latest.credits_deducted > 0) {
        seedancePlatformStore.refundCreditsIdempotent({
          userId: latest.user_id,
          amount: latest.credits_deducted,
          reason: 'Generation blocked by MUAPI safety/NSFW filter.',
          jobId: latest.job_id,
        });
        refunded = true;
      }
      seedancePlatformStore.updateJob(latest.job_id, {
        status: refunded ? 'REFUNDED' : 'FAILED',
        errorMessage: 'Generation blocked by MUAPI safety/NSFW filter.',
      });
      const failedJob =
        generationJobsStore.updateJob(jobId, {
          status: 'failed',
          progress: 0,
          has_nsfw_contents: hasNsfwContents,
          error: 'Generation blocked by MUAPI safety/NSFW filter.',
          refunded,
        }) || latest;
      return { ok: true, status: 200, message: 'Safety block recorded.', job: failedJob };
    }

    if (outputUrl) {
      cancelBackgroundJobPoll(jobId);
      if (hasNsfwContents) {
        generationJobsStore.updateJob(jobId, { has_nsfw_contents: hasNsfwContents });
      }
      const completed = await processCompletedJobMedia(
        generationJobsStore.getJob(jobId) || latest,
        outputUrl
      );
      return { ok: true, status: 200, message: 'Completed via webhook push.', job: completed };
    }

    const updatedPartial =
      generationJobsStore.updateJob(jobId, {
        status: 'processing',
        progress: 85,
        has_nsfw_contents: hasNsfwContents ?? latest.has_nsfw_contents,
      }) || latest;
    return {
      ok: true,
      status: 200,
      message: 'Webhook completed without outputs[0]; awaiting verification poll.',
      job: updatedPartial,
    };
  }

  if (normalized === 'failed') {
    cancelBackgroundJobPoll(jobId);
    const cleanError = redactMuapiSecrets(errMsg || 'Video generation failed on MUAPI.');
    let refunded = Boolean(latest.refunded);
    if (!refunded && latest.credits_deducted && latest.credits_deducted > 0) {
      seedancePlatformStore.refundCreditsIdempotent({
        userId: latest.user_id,
        amount: latest.credits_deducted,
        reason: cleanError,
        jobId: latest.job_id,
      });
      refunded = true;
    }
    seedancePlatformStore.updateJob(latest.job_id, {
      status: refunded ? 'REFUNDED' : 'FAILED',
      errorMessage: cleanError,
    });
    const failedJob =
      generationJobsStore.updateJob(jobId, {
        status: 'failed',
        progress: 0,
        has_nsfw_contents: hasNsfwContents,
        error: cleanError,
        refunded,
      }) || latest;
    return { ok: true, status: 200, message: 'Failure processed via webhook.', job: failedJob };
  }

  const updated =
    generationJobsStore.updateJob(jobId, {
      status: normalized,
      progress: normalized === 'processing' ? Math.max(latest.progress || 15, 50) : latest.progress || 15,
      has_nsfw_contents: hasNsfwContents ?? latest.has_nsfw_contents,
    }) || latest;

  return { ok: true, status: 200, message: 'Progress updated via webhook.', job: updated };
}
