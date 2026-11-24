/**
 * Background Media Receiver Worker
 * Triggered when a generation job transitions to completed with a verified provider output URL.
 * Downloads video securely, stores durably in Firebase Storage + protected local vault,
 * and registers private creation in Curated Private Vault (never public).
 */

import { UnifiedGenerationJob } from '../../../types/multiProvider';
import { seedanceCuratedStore } from '../../seedanceCuratedStore';
import { seedancePlatformStore } from '../../seedancePlatformStore';
import { generationJobsStore } from '../firebase/firestore.service';
import { archiveCompletedVideoOutput } from '../services/media.service';
import { createProcessStep } from '../services/realtimeEvents.service';

export async function processCompletedJobMedia(
  job: UnifiedGenerationJob,
  providerOutputUrl: string
): Promise<UnifiedGenerationJob> {
  const startMs = Date.now();
  const archive = await archiveCompletedVideoOutput({
    jobId: job.job_id,
    userId: job.user_id,
    providerOutputUrl,
  });

  const nowIso = new Date().toISOString();
  const playbackUrl = archive.ok && archive.playbackUrl ? archive.playbackUrl : providerOutputUrl;
  const firebaseStoragePath = archive.ok ? archive.firebaseStoragePath || null : null;
  const archiveLatency = Date.now() - startMs;

  generationJobsStore.appendJobTrace(
    job.job_id,
    createProcessStep({
      stage: 'MEDIA_ARCHIVE',
      method: 'INTERNAL',
      endpoint: firebaseStoragePath || playbackUrl,
      statusCode: archive.ok ? 200 : 206,
      latencyMs: archiveLatency,
      statusLabel: archive.ok ? 'ARCHIVED' : 'DIRECT_CDN',
      summary: archive.ok
        ? 'Downloaded provider MP4 and archived durably to protected storage.'
        : `Direct verified provider playback URL active (${archive.error || 'archive fallback'}).`,
      responsePreview: {
        playback_url: playbackUrl,
        firebase_storage_path: firebaseStoragePath,
        uploadedToFirebaseStorage: Boolean(archive.uploadedToFirebaseStorage),
      },
    })
  );

  const updated =
    generationJobsStore.updateJob(job.job_id, {
      status: 'completed',
      progress: 100,
      provider_output_url: providerOutputUrl,
      firebase_storage_path: firebaseStoragePath,
      local_media_path: archive.localPath || null,
      playback_url: playbackUrl,
      completed_at: job.completed_at || nowIso,
      error: null,
    }) || {
      ...job,
      status: 'completed' as const,
      progress: 100,
      provider_output_url: providerOutputUrl,
      firebase_storage_path: firebaseStoragePath,
      playback_url: playbackUrl,
      completed_at: job.completed_at || nowIso,
      updated_at: nowIso,
      error: null,
    };

  generationJobsStore.addUsageLog({
    provider: job.provider,
    model_id: job.model_id,
    job_id: job.job_id,
    user_id: job.user_id,
    action: 'MEDIA_ARCHIVE',
    success: archive.ok,
    latencyMs: archiveLatency,
    error: archive.ok ? undefined : archive.error,
  });

  // Sync completion to Seedance Platform Job Store
  seedancePlatformStore.updateJob(job.job_id, {
    status: 'COMPLETED',
    progressPercent: 100,
    videoUrl: playbackUrl,
    completedAt: updated.completed_at || nowIso,
  });

  // Strictly Private auto-capture into creator's Private Curated Vault (NEVER auto-published)
  try {
    const userRec = seedancePlatformStore.getUserRecord(job.user_id);
    seedanceCuratedStore.ingestCompletedGeneration({
      ownerId: job.user_id,
      ownerName: userRec?.displayName || userRec?.username || 'Creator',
      sourceJobId: job.job_id,
      generationGroupId: `${job.provider}-${job.job_id}`,
      sourcePipeline: job.provider === 'muapi' ? 'seedance_video' : 'seedance_video',
      mediaType: 'VIDEO',
      outputUrls: [playbackUrl],
      aiModel: `${job.model_name} (${job.provider.toUpperCase()})`,
      modelCategory: job.draft ? 'Draft Preview' : 'Video',
      aspectRatio: job.aspect_ratio || '16:9',
      resolution: job.resolution.toUpperCase(),
      durationSeconds: job.duration,
      prompt: job.prompt,
      parameters: {
        provider: job.provider,
        model_id: job.model_id,
        resolution: job.resolution,
        duration: job.duration,
        draft: job.draft,
        draft_request_id: job.draft_request_id,
        parent_draft_job_id: job.parent_draft_job_id,
        generate_audio: job.generate_audio,
        camera_fixed: job.camera_fixed,
        high_bitrate: job.high_bitrate,
      },
      referenceImageCount: job.image_url ? (job.last_image ? 2 : 1) : 0,
      generatedAt: job.created_at,
    });
  } catch {
    // Non-fatal curated private vault capture
  }

  return updated;
}
