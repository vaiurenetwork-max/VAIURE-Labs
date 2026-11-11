/**
 * VAIURE Studio — Video & Image Generation Provider Adapter Architecture
 * Connects the original Total VAIURE Studio UI/UX to the real backend endpoints:
 * - /api/ai/generate & /api/ai/jobs/:jobCode (PosBot Developer API v1)
 * - /api/prompt/generate-image (Gemini Keyframe & Look-Dev Engine)
 * - /api/midjourney/* & /api/generate (Official Discord v9 /imagine Bridge)
 */

import { AspectRatio } from '../types/studio';

export type StudioGenerationMode =
  | 'image-gen'
  | 'image-to-video'
  | 'text-to-video'
  | 'ref-video'
  | 'midjourney-discord';

export interface VideoModelProvider {
  id: string;
  posbotModelKey?: string;
  name: string;
  provider: string;
  description: string;
  supportedModes: StudioGenerationMode[];
  supportedDurations: number[]; // in seconds (0 for still image models)
  supportedAspectRatios: AspectRatio[];
  supportedResolutions: ('1080p' | '4K')[];
  maxResolution: '1080p' | '4K';
  creditCostPerSec: number;
  flatGenerateCost?: number; // PosBot Generate unit cost (1 Gen = Rp 400)
  maxPromptLength?: number;
  maxReferenceImages?: number;
  requiresSwapImage?: boolean;
  requiresVideoUrl?: boolean;
  supportsEndFrameImage?: boolean;
  isBackendConfigured: boolean;
  unconfiguredReason?: string;
  submitJob: (params: VideoGenerationRequest) => Promise<GenerationSubmissionResult>;
}

export interface VideoGenerationRequest {
  projectId: string;
  shotId?: string;
  nodeId?: string;
  modelId: string;
  mode?: StudioGenerationMode;
  prompt: string;
  negativePrompt?: string;
  duration: number;
  aspectRatio: AspectRatio;
  resolution?: '1080p' | '4K';
  seed?: number;
  firstFrameImageUrl?: string;
  endFrameImageUrl?: string;
  swapImageUrl?: string;
  sourceVideoUrl?: string;
  characterReferenceUrls?: string[];
  locationReferenceUrls?: string[];
  motionIntensity?: number;
}

export interface GenerationSubmissionResult {
  jobId: string;
  jobCode?: string;
  status: 'QUEUED' | 'RUNNING' | 'FAILED';
  error?: string;
  estimatedTimeSec: number;
}

async function submitToPosBotBackend(
  posbotModelKey: string,
  params: VideoGenerationRequest
): Promise<GenerationSubmissionResult> {
  const payload: Record<string, unknown> = {
    model: posbotModelKey,
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
  };

  if (params.firstFrameImageUrl) {
    payload.image_url = params.firstFrameImageUrl;
  }
  if (params.endFrameImageUrl) {
    payload.end_image_url = params.endFrameImageUrl;
  }
  if (params.swapImageUrl) {
    payload.swap_image = params.swapImageUrl;
  }
  if (params.sourceVideoUrl) {
    payload.video_url = params.sourceVideoUrl;
  }

  const refUrls = [
    ...(params.characterReferenceUrls || []),
    ...(params.locationReferenceUrls || []),
  ].filter((u) => Boolean(u && u.trim()));

  if (refUrls.length > 0) {
    payload.reference_image_urls = refUrls;
    payload.image_urls = refUrls;
  }

  const res = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();

  if (!res.ok || !data.ok || !data.job_code) {
    return {
      jobId: `job-failed-${Date.now()}`,
      status: 'FAILED',
      error: data.error || 'PosBot generation submission failed.',
      estimatedTimeSec: 0,
    };
  }

  return {
    jobId: `job-${data.job_code}`,
    jobCode: data.job_code,
    status: 'RUNNING',
    estimatedTimeSec: Math.max(15, (params.duration || 5) * 3),
  };
}

export const VIDEO_PROVIDERS: Record<string, VideoModelProvider> = {
  // ============================================================================
  // MIDJOURNEY DISCORD BRIDGE
  // ============================================================================
  'midjourney-v6-discord': {
    id: 'midjourney-v6-discord',
    name: 'Midjourney v6.1 (/imagine Bridge)',
    provider: 'Discord v9 Interactions Bridge',
    description:
      'Direct Discord API /imagine slash command automation (App 936929561302675456) with 5s channel polling and CDN extraction.',
    supportedModes: ['midjourney-discord'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 4,
    flatGenerateCost: 4,
    maxPromptLength: 4000,
    isBackendConfigured: true,
    submitJob: async () => ({
      jobId: `job-mj-${Date.now()}`,
      status: 'RUNNING',
      estimatedTimeSec: 35,
    }),
  },

  // ============================================================================
  // GEMINI / IMAGEN DIRECT KEYFRAME SYNTHESIS (/api/prompt/generate-image)
  // ============================================================================
  'gemini-3.1-flash-lite-image': {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Keyframe',
    provider: 'Google DeepMind (/api/prompt)',
    description:
      'Rapid architectural and storyboard keyframe synthesis with anamorphic framing and character reference conditioning.',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 3,
    flatGenerateCost: 3,
    maxPromptLength: 4000,
    isBackendConfigured: true,
    submitJob: async () => ({
      jobId: `job-img-${Date.now()}`,
      status: 'RUNNING',
      estimatedTimeSec: 4,
    }),
  },
  'gemini-nano-banana-2.1': {
    id: 'gemini-nano-banana-2.1',
    name: 'Gemini Nano Banana 2.1 Pro',
    provider: 'Google DeepMind (/api/prompt)',
    description:
      'High-resolution 4K editorial still & concept plate synthesis for look-dev and first-frame conditioning.',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 4,
    flatGenerateCost: 4,
    maxPromptLength: 4000,
    isBackendConfigured: true,
    submitJob: async () => ({
      jobId: `job-nb-${Date.now()}`,
      status: 'RUNNING',
      estimatedTimeSec: 4,
    }),
  },

  // ============================================================================
  // POSBOT v1 IMAGE GENERATION & IMAGE EDITING MODELS (/api/ai/generate)
  // ============================================================================
  flux_2_pro: {
    id: 'flux_2_pro',
    posbotModelKey: 'flux_2_pro',
    name: 'Flux 2 Pro (PosBot v1)',
    provider: 'PosBot Image Engine',
    description: 'Photorealistic Flux 2 Pro synthesis; supports up to 6 reference images (1 Gen / Rp 400).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 1,
    maxPromptLength: 2000,
    maxReferenceImages: 6,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('flux_2_pro', params),
  },
  gpt_image_25: {
    id: 'gpt_image_25',
    posbotModelKey: 'gpt_image_25',
    name: 'GPT Image 2.5 (PosBot v1)',
    provider: 'PosBot Image Engine',
    description: 'Up to 16 reference images & 20,000-char prompt limit for complex scene composition (2 Gen / Rp 800).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 2,
    flatGenerateCost: 2,
    maxPromptLength: 20000,
    maxReferenceImages: 16,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('gpt_image_25', params),
  },
  gpt_image_25_sunburst: {
    id: 'gpt_image_25_sunburst',
    posbotModelKey: 'gpt_image_25_sunburst',
    name: 'GPT Image 2.5 Sunburst',
    provider: 'PosBot Image Engine',
    description: 'Sunburst optical lighting profile; up to 16 reference images & 20,000-char prompt limit (2 Gen).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 2,
    flatGenerateCost: 2,
    maxPromptLength: 20000,
    maxReferenceImages: 16,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('gpt_image_25_sunburst', params),
  },
  nano_banana_pro_4k: {
    id: 'nano_banana_pro_4k',
    posbotModelKey: 'nano_banana_pro_4k',
    name: 'Nano Banana Pro 4K (PosBot v1)',
    provider: 'PosBot Image Engine',
    description: 'True 4K resolution keyframe synthesis with up to 4 reference images (4 Gen / Rp 1.600).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 4,
    flatGenerateCost: 4,
    maxPromptLength: 2000,
    maxReferenceImages: 4,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('nano_banana_pro_4k', params),
  },
  seedream_50_4k: {
    id: 'seedream_50_4k',
    posbotModelKey: 'seedream_50_4k',
    name: 'Seedream 5.0 4K',
    provider: 'PosBot Image Engine',
    description: '4K ByteDance Seedream 5.0 image synthesis; supports up to 4 reference images (2 Gen).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 2,
    flatGenerateCost: 2,
    maxPromptLength: 2000,
    maxReferenceImages: 4,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('seedream_50_4k', params),
  },
  seedream_5_pro_2k: {
    id: 'seedream_5_pro_2k',
    posbotModelKey: 'seedream_5_pro_2k',
    name: 'Seedream 5 Pro 2K',
    provider: 'PosBot Image Engine',
    description: 'Supports up to 10 reference images and 3,000-character prompts (2 Gen).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 2,
    flatGenerateCost: 2,
    maxPromptLength: 3000,
    maxReferenceImages: 10,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('seedream_5_pro_2k', params),
  },
  krea2_2k: {
    id: 'krea2_2k',
    posbotModelKey: 'krea2_2k',
    name: 'Krea 2 (2K)',
    provider: 'PosBot Image Engine',
    description: 'High-detail 2K optical texture synthesis (1 Gen / Rp 400).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 1,
    maxPromptLength: 2000,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('krea2_2k', params),
  },
  face_swap: {
    id: 'face_swap',
    posbotModelKey: 'face_swap',
    name: 'Face Swap (Image Edit)',
    provider: 'PosBot Image Enhance',
    description: 'Swaps source face (swap_image) onto target base image (image_url) (1 Gen / Rp 400).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 1,
    maxPromptLength: 2500,
    requiresSwapImage: true,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('face_swap', params),
  },
  upscale_4k: {
    id: 'upscale_4k',
    posbotModelKey: 'upscale_4k',
    name: 'Upscale 4K (Image Enhance)',
    provider: 'PosBot Image Enhance',
    description: 'Upscales source image_url to crisp 4K resolution (1 Gen / Rp 400).',
    supportedModes: ['image-gen'],
    supportedDurations: [0],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 1,
    maxPromptLength: 2000,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('upscale_4k', params),
  },

  // ============================================================================
  // SEEDANCE 2.5 & POSBOT v1 VIDEO GENERATION MODELS (/api/ai/generate)
  // ============================================================================
  'seedance-2.5-ref-video': {
    id: 'seedance-2.5-ref-video',
    posbotModelKey: 'seedance_25_15s_r2v',
    name: 'Seedance 2.5 Ref-Video (15s)',
    provider: 'PosBot Seedance 2.5 Engine',
    description:
      'Flagship Seedance 2.5 multi-reference character, wardrobe, and vehicle LHD/RHD continuity @ 24fps (up to 9 refs, 8,000 chars).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [15, 30],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 8000,
    maxReferenceImages: 9,
    isBackendConfigured: true,
    submitJob: (params) =>
      submitToPosBotBackend(
        params.duration >= 30
          ? params.mode === 'ref-video'
            ? 'seedance_25_30s_r2v'
            : 'seedance_25_30s'
          : params.mode === 'ref-video'
          ? 'seedance_25_15s_r2v'
          : 'seedance_25_15s',
        params
      ),
  },
  seedance_25_15s: {
    id: 'seedance_25_15s',
    posbotModelKey: 'seedance_25_15s',
    name: 'Seedance 2.5 (15s T2V/I2V)',
    provider: 'PosBot Seedance 2.5 Engine',
    description: '15s multi-shot Seedance 2.5 video synthesis; up to 9 reference images & 8,000-char prompt (4 Gen).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [15],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 8000,
    maxReferenceImages: 9,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('seedance_25_15s', params),
  },
  seedance_25_30s: {
    id: 'seedance_25_30s',
    posbotModelKey: 'seedance_25_30s',
    name: 'Seedance 2.5 (30s Extended)',
    provider: 'PosBot Seedance 2.5 Engine',
    description: '30s extended multi-shot narrative sequence; up to 9 reference images & 8,000-char prompt (7 Gen).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [30],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 7,
    maxPromptLength: 8000,
    maxReferenceImages: 9,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('seedance_25_30s', params),
  },
  seedance_25_30s_r2v: {
    id: 'seedance_25_30s_r2v',
    posbotModelKey: 'seedance_25_30s_r2v',
    name: 'Seedance 2.5 (30s R2V)',
    provider: 'PosBot Seedance 2.5 Engine',
    description: '30s Reference-to-Video multi-character & vehicle continuity lock (up to 9 images, 7 Gen).',
    supportedModes: ['ref-video', 'image-to-video'],
    supportedDurations: [30],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 7,
    maxPromptLength: 8000,
    maxReferenceImages: 9,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('seedance_25_30s_r2v', params),
  },
  kling_30_5s: {
    id: 'kling_30_5s',
    posbotModelKey: 'kling_30_5s',
    name: 'Kling 3.0 (5s / 10s / 15s)',
    provider: 'PosBot Kling 3.0 Engine',
    description:
      'Kling 3.0 cinematic video synthesis with optional start image_url and end_image_url keyframe interpolation (4–6 Gen).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [5, 10, 15],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 2500,
    supportsEndFrameImage: true,
    isBackendConfigured: true,
    submitJob: (params) => {
      const key =
        params.duration >= 15
          ? 'kling_30_15s'
          : params.duration >= 10
          ? 'kling_30_10s'
          : 'kling_30_5s';
      return submitToPosBotBackend(key, params);
    },
  },
  wan_30_hd: {
    id: 'wan_30_hd',
    posbotModelKey: 'wan_30_hd',
    name: 'Wan 3.0 HD (10,000 Chars)',
    provider: 'PosBot Wan 3.0 Engine',
    description: 'High-definition Wan 3.0 T2V, I2V & R2V synthesis supporting 10,000-character screenplays (4 Gen).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [5, 10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 10000,
    isBackendConfigured: true,
    submitJob: (params) =>
      submitToPosBotBackend(params.mode === 'ref-video' ? 'wan_30_r2v' : 'wan_30_hd', params),
  },
  minimax_h3: {
    id: 'minimax_h3',
    posbotModelKey: 'minimax_h3',
    name: 'MiniMax H3 HD',
    provider: 'PosBot MiniMax Engine',
    description: 'MiniMax H3 HD expressive character & camera synthesis; 5,000-character prompt limit (4 Gen).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [6, 10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 5000,
    isBackendConfigured: true,
    submitJob: (params) =>
      submitToPosBotBackend(params.mode === 'ref-video' ? 'minimax_h3_r2v' : 'minimax_h3', params),
  },
  grok_imagine_2_15s: {
    id: 'grok_imagine_2_15s',
    posbotModelKey: 'grok_imagine_2_15s',
    name: 'Grok Imagine 2 (15s / 30s)',
    provider: 'PosBot Grok Video Engine',
    description: 'Grok Imagine 2 long-form 15s and 30s video generation; 5,000-char prompt limit (4–7 Gen).',
    supportedModes: ['text-to-video', 'image-to-video'],
    supportedDurations: [15, 30],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 4,
    maxPromptLength: 5000,
    isBackendConfigured: true,
    submitJob: (params) =>
      submitToPosBotBackend(
        params.duration >= 30 ? 'grok_imagine_2_30s' : 'grok_imagine_2_15s',
        params
      ),
  },
  'veo-3.1-generate-preview': {
    id: 'veo-3.1-generate-preview',
    posbotModelKey: 'omni_flash_t2v',
    name: 'Omni Flash / Veo 3.1 Cinema',
    provider: 'PosBot Omni Flash Engine',
    description: 'High-definition cinematic T2V and I2V synthesis with physical camera optics (3 Gen / Rp 1.200).',
    supportedModes: ['text-to-video', 'image-to-video', 'ref-video'],
    supportedDurations: [5, 8],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 3,
    maxPromptLength: 2500,
    isBackendConfigured: true,
    submitJob: (params) =>
      submitToPosBotBackend(
        params.firstFrameImageUrl ? 'omni_flash_i2v' : 'omni_flash_t2v',
        params
      ),
  },
  kling_30_pro: {
    id: 'kling_30_pro',
    posbotModelKey: 'kling_30_pro',
    name: 'Kling 3.0 Motion Control Pro',
    provider: 'PosBot Motion Transfer',
    description: 'Transfers choreography from reference video_url onto character image_url (5 Gen / Rp 2.000).',
    supportedModes: ['image-to-video', 'ref-video'],
    supportedDurations: [5, 10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 5,
    maxPromptLength: 2500,
    requiresVideoUrl: true,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('kling_30_pro', params),
  },
  betamotion_1080p_max: {
    id: 'betamotion_1080p_max',
    posbotModelKey: 'betamotion_1080p_max',
    name: 'BetaMotion 1080p Max',
    provider: 'PosBot Motion Transfer',
    description: 'High-fidelity 1080p motion transfer from reference video_url onto character image_url (7 Gen).',
    supportedModes: ['image-to-video', 'ref-video'],
    supportedDurations: [10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 7,
    maxPromptLength: 2500,
    requiresVideoUrl: true,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('betamotion_1080p_max', params),
  },
  upscale_2k_60fps: {
    id: 'upscale_2k_60fps',
    posbotModelKey: 'upscale_2k_60fps',
    name: 'Upscale Video 2K 60FPS',
    provider: 'PosBot Video Enhance',
    description: 'Upscales source video_url to 2K resolution at smooth 60fps (3 Gen / Rp 1.200).',
    supportedModes: ['ref-video', 'image-to-video'],
    supportedDurations: [10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p', '4K'],
    maxResolution: '4K',
    creditCostPerSec: 1,
    flatGenerateCost: 3,
    maxPromptLength: 2500,
    requiresVideoUrl: true,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('upscale_2k_60fps', params),
  },
  watermark_remover: {
    id: 'watermark_remover',
    posbotModelKey: 'watermark_remover',
    name: 'Video Watermark Remover',
    provider: 'PosBot Video Enhance',
    description: 'Cleanly removes overlay watermarks from source video_url (2 Gen / Rp 800).',
    supportedModes: ['ref-video', 'image-to-video'],
    supportedDurations: [10],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['1080p'],
    maxResolution: '1080p',
    creditCostPerSec: 1,
    flatGenerateCost: 2,
    maxPromptLength: 2500,
    requiresVideoUrl: true,
    isBackendConfigured: true,
    submitJob: (params) => submitToPosBotBackend('watermark_remover', params),
  },
};

export const getAvailableModels = (mode?: StudioGenerationMode): VideoModelProvider[] => {
  const all = Object.values(VIDEO_PROVIDERS);
  if (!mode) return all;
  return all.filter((m) => m.supportedModes.includes(mode));
};

export const getModelById = (id: string): VideoModelProvider => {
  if (VIDEO_PROVIDERS[id]) return VIDEO_PROVIDERS[id];
  if (id === 'luma-ray-2') return VIDEO_PROVIDERS.wan_30_hd;
  if (id === 'kling-1.5-pro') return VIDEO_PROVIDERS.kling_30_5s;
  return VIDEO_PROVIDERS['seedance-2.5-ref-video'];
};

export const estimateJobCost = (modelId: string, durationSec: number): number => {
  const model = getModelById(modelId);
  if (typeof model.flatGenerateCost === 'number') {
    if (model.id === 'seedance-2.5-ref-video' && durationSec >= 30) return 7;
    if (model.id === 'grok_imagine_2_15s' && durationSec >= 30) return 7;
    if (model.id === 'kling_30_5s') {
      if (durationSec >= 15) return 6;
      if (durationSec >= 10) return 5;
      return 4;
    }
    return model.flatGenerateCost;
  }
  if (model.supportedModes.includes('image-gen') && durationSec === 0) {
    return model.creditCostPerSec;
  }
  return model.creditCostPerSec * Math.max(1, durationSec);
};
