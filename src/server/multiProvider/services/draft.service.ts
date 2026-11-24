/**
 * Draft Mode & 2-Stage Finalization Service
 * Stage A: Submit preview draft (draft: true, resolution: "480p", stores request_id)
 * Stage B: Finalize draft (draft: false, draft_request_id: <original request_id>, resolution: "1080p",
 *          preserving original prompt, reference images, and duration, linking parent_draft_job_id)
 */

import {
  UnifiedGenerationInput,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import { generationJobsStore } from '../firebase/firestore.service';

export function prepareFinalizeDraftInput(params: {
  draftJobId: string;
  userId: string;
  isAdmin: boolean;
  overrideResolution?: UnifiedGenerationInput['resolution'];
  overrideHighBitrate?: boolean;
  overrideIdempotencyKey?: string;
}): { input: UnifiedGenerationInput; parentDraftJob: UnifiedGenerationJob } {
  const parent = generationJobsStore.getJob(params.draftJobId);
  if (!parent) {
    throw new Error(`Draft job "${params.draftJobId}" not found.`);
  }
  if (parent.user_id !== params.userId && !params.isAdmin) {
    throw new Error('Access denied: you do not own this draft job.');
  }
  if (parent.provider !== 'muapi') {
    throw new Error('Draft finalization is only supported for MUAPI Seedance 2.5 Spicy draft jobs.');
  }
  if (!parent.draft) {
    throw new Error('Selected job is already a finalized generation, not a draft.');
  }
  if (!parent.request_id) {
    throw new Error('Draft job is missing upstream request_id required for finalization.');
  }
  if (parent.status !== 'completed') {
    throw new Error('Draft job must complete rendering before finalization.');
  }
  if (!parent.image_url) {
    throw new Error('Draft job is missing original image_url required for finalization.');
  }

  const input: UnifiedGenerationInput = {
    provider: parent.provider,
    model_id: parent.model_id,
    prompt: parent.prompt,
    image_url: parent.image_url,
    last_image: parent.last_image || undefined,
    resolution: params.overrideResolution || '1080p',
    duration: parent.duration,
    generate_audio: parent.generate_audio,
    camera_fixed: parent.camera_fixed,
    high_bitrate:
      typeof params.overrideHighBitrate === 'boolean'
        ? params.overrideHighBitrate
        : parent.high_bitrate,
    draft: false,
    draft_request_id: parent.request_id,
    parent_draft_job_id: parent.job_id,
    idempotency_key: params.overrideIdempotencyKey,
  };

  return { input, parentDraftJob: parent };
}
