/**
 * Background Generation Polling Worker
 * - Runs completely server-side independent of open browser tabs.
 * - Initial polling delay: 5 seconds (configurable per provider), with exponential backoff on transient failures.
 * - Configurable max timeout per provider.
 * - Resumes active non-terminal jobs automatically on server startup.
 */

import { providerConfigStore } from '../config/provider.config';
import { generationJobsStore } from '../firebase/firestore.service';
import { pollGenerationJobOnce } from '../services/polling.service';
import { seedancePlatformStore } from '../../seedancePlatformStore';

const scheduledTimers = new Map<string, NodeJS.Timeout>();
let workerInitialized = false;

export function scheduleBackgroundJobPoll(jobId: string, delayMs?: number): void {
  if (scheduledTimers.has(jobId)) {
    return;
  }

  const job = generationJobsStore.getJob(jobId);
  if (!job || job.status === 'completed' || job.status === 'failed') {
    return;
  }

  const providerCfg = providerConfigStore.getInternalProvider(job.provider);
  const baseIntervalMs = Math.max(2000, Number(providerCfg?.pollIntervalMs || 3000));
  const maxTimeoutMs = Math.max(60_000, Number(providerCfg?.maxPollTimeoutMs || 20 * 60 * 1000));
  const waitMs = typeof delayMs === 'number' ? delayMs : baseIntervalMs;

  const timer = setTimeout(async () => {
    scheduledTimers.delete(jobId);
    try {
      const current = generationJobsStore.getJob(jobId);
      if (!current || current.status === 'completed' || current.status === 'failed') {
        return;
      }

      const ageMs = Date.now() - new Date(current.created_at).getTime();
      if (ageMs > maxTimeoutMs) {
        let refunded = Boolean(current.refunded);
        if (!refunded && current.credits_deducted && current.credits_deducted > 0) {
          seedancePlatformStore.refundCreditsIdempotent({
            userId: current.user_id,
            amount: current.credits_deducted,
            reason: `Polling timed out after ${Math.round(maxTimeoutMs / 60000)} minutes`,
            jobId: current.job_id,
          });
          refunded = true;
        }
        generationJobsStore.updateJob(jobId, {
          status: 'failed',
          progress: 0,
          error: `Generation polling timed out after ${Math.round(maxTimeoutMs / 60000)} minutes without completion.`,
          refunded,
        });
        return;
      }

      const updated = await pollGenerationJobOnce(jobId);
      if (!updated || updated.status === 'completed' || updated.status === 'failed') {
        return;
      }

      // Exponential backoff when transient polling errors occur, bounded at 45s
      const retries = updated.retry_count || 0;
      const nextDelay =
        retries > 0
          ? Math.min(45_000, baseIntervalMs * Math.pow(2, Math.min(retries, 4)))
          : baseIntervalMs;

      scheduleBackgroundJobPoll(jobId, nextDelay);
    } catch {
      scheduleBackgroundJobPoll(jobId, Math.min(45_000, baseIntervalMs * 2));
    }
  }, waitMs);

  // Do not hold Node test processes open unnecessarily if event loop wants to exit
  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  scheduledTimers.set(jobId, timer);
}

export function cancelBackgroundJobPoll(jobId: string): void {
  const t = scheduledTimers.get(jobId);
  if (t) {
    clearTimeout(t);
    scheduledTimers.delete(jobId);
  }
}

export function startGenerationBackgroundWorker(): number {
  if (workerInitialized) {
    return scheduledTimers.size;
  }
  workerInitialized = true;

  const activeJobs = generationJobsStore.listActiveJobs();
  for (const job of activeJobs) {
    scheduleBackgroundJobPoll(job.job_id, 5000);
  }
  return activeJobs.length;
}
