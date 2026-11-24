/**
 * Default Provider & Model Capabilities Registry
 * Preserves ByteDance Official Seedance 2.5 models intact and defines MUAPI Seedance 2.5 Spicy.
 */

import {
  GenerationResolution,
  ProviderModelDefinition,
} from '../../../types/multiProvider';
import {
  BYTEDANCE_SUPPORTED_DURATIONS,
  BYTEDANCE_SUPPORTED_RESOLUTIONS,
  MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
  MUAPI_SPICY_USD_PRICING_MATRIX,
  MUAPI_SUPPORTED_DURATIONS,
  MUAPI_SUPPORTED_RESOLUTIONS,
} from './pricing.config';

export const DEFAULT_BYTEDANCE_MODELS: ProviderModelDefinition[] = [
  {
    providerId: 'bytedance',
    modelId: 'seedance_25_15s',
    displayName: 'Seedance 2.5 720p (15s)',
    submitEndpoint: '/api/v3/contents/generations/tasks',
    resultEndpointTemplate: '/api/v3/contents/generations/tasks/{request_id}',
    enabled: true,
    category: 'Video',
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    requiresStartImage: false,
    supportsLastImage: true,
    supportsReferencePlates: true,
    maxReferenceImages: 30,
    supportsDraftMode: false,
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsHighBitrate: false,
    resolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    durations: [5, 10, 15],
    enabledResolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    enabledDurations: [5, 10, 15],
    pricingCurrency: 'CREDITS',
    appMarkupPercent: 0,
    appMarkupFlatUsd: 0,
    safetyCheckerLockedOn: true,
    safetyNotice: 'Governed by ByteDance BytePlus ModelArk safety policy.',
    notes: 'Existing ByteDance ModelArk Seedance 2.5 official 15s integration.',
  },
  {
    providerId: 'bytedance',
    modelId: 'seedance_25_30s',
    displayName: 'Seedance 2.5 720p (30s)',
    submitEndpoint: '/api/v3/contents/generations/tasks',
    resultEndpointTemplate: '/api/v3/contents/generations/tasks/{request_id}',
    enabled: true,
    category: 'Video',
    supportsImageToVideo: true,
    supportsTextToVideo: true,
    requiresStartImage: false,
    supportsLastImage: true,
    supportsReferencePlates: true,
    maxReferenceImages: 30,
    supportsDraftMode: false,
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsHighBitrate: false,
    resolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    durations: [15, 20, 30],
    enabledResolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    enabledDurations: [15, 20, 30],
    pricingCurrency: 'CREDITS',
    appMarkupPercent: 0,
    appMarkupFlatUsd: 0,
    safetyCheckerLockedOn: true,
    safetyNotice: 'Governed by ByteDance BytePlus ModelArk safety policy.',
    notes: 'Existing ByteDance ModelArk Seedance 2.5 extended 30s integration.',
  },
  {
    providerId: 'bytedance',
    modelId: 'seedance_25_15s_r2v',
    displayName: 'Seedance 2.5 R2V (15s)',
    submitEndpoint: '/api/v3/contents/generations/tasks',
    resultEndpointTemplate: '/api/v3/contents/generations/tasks/{request_id}',
    enabled: true,
    category: 'Motion / R2V',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    requiresStartImage: false,
    supportsLastImage: true,
    supportsReferencePlates: true,
    maxReferenceImages: 30,
    supportsDraftMode: false,
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsHighBitrate: false,
    resolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    durations: [5, 10, 15],
    enabledResolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    enabledDurations: [5, 10, 15],
    pricingCurrency: 'CREDITS',
    appMarkupPercent: 0,
    appMarkupFlatUsd: 0,
    safetyCheckerLockedOn: true,
    safetyNotice: 'Governed by ByteDance BytePlus ModelArk safety policy.',
    notes: 'Omni Reference-to-Video locking up to 30 plates.',
  },
  {
    providerId: 'bytedance',
    modelId: 'seedance_25_30s_r2v',
    displayName: 'Seedance 2.5 R2V (30s)',
    submitEndpoint: '/api/v3/contents/generations/tasks',
    resultEndpointTemplate: '/api/v3/contents/generations/tasks/{request_id}',
    enabled: true,
    category: 'Motion / R2V',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    requiresStartImage: false,
    supportsLastImage: true,
    supportsReferencePlates: true,
    maxReferenceImages: 30,
    supportsDraftMode: false,
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsHighBitrate: false,
    resolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    durations: [15, 20, 30],
    enabledResolutions: [...BYTEDANCE_SUPPORTED_RESOLUTIONS],
    enabledDurations: [15, 20, 30],
    pricingCurrency: 'CREDITS',
    appMarkupPercent: 0,
    appMarkupFlatUsd: 0,
    safetyCheckerLockedOn: true,
    safetyNotice: 'Governed by ByteDance BytePlus ModelArk safety policy.',
    notes: 'Extended 30s Reference-to-Video locking up to 30 plates.',
  },
];

export const DEFAULT_MUAPI_MODELS: ProviderModelDefinition[] = [
  {
    providerId: 'muapi',
    modelId: MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
    displayName: 'Seedance 2.5 Spicy',
    clientName: 'vaiurenetwoek',
    submitEndpoint: 'https://api.muapi.ai/api/v1/seedance-2.5-spicy-image-to-video',
    resultEndpointTemplate: 'https://api.muapi.ai/api/v1/predictions/{request_id}/result',
    enabled: true,
    category: 'Image-to-Video',
    supportsImageToVideo: true,
    supportsTextToVideo: false,
    requiresStartImage: true,
    supportsLastImage: true,
    supportsReferencePlates: false,
    maxReferenceImages: 2,
    supportsDraftMode: true,
    supportsAudio: true,
    supportsCameraFixed: true,
    supportsHighBitrate: true,
    resolutions: [...MUAPI_SUPPORTED_RESOLUTIONS],
    durations: [...MUAPI_SUPPORTED_DURATIONS],
    enabledResolutions: [...MUAPI_SUPPORTED_RESOLUTIONS],
    enabledDurations: [...MUAPI_SUPPORTED_DURATIONS],
    pricingCurrency: 'USD',
    usdPricingMatrix: JSON.parse(JSON.stringify(MUAPI_SPICY_USD_PRICING_MATRIX)),
    appMarkupPercent: 0,
    appMarkupFlatUsd: 0,
    safetyCheckerLockedOn: true,
    safetyNotice:
      'MUAPI safety checker is locked ON and enforced server-side per account/API configuration. Safety checks cannot be bypassed.',
    notes:
      'MUAPI Seedance 2.5 Spicy Image-to-Video (480p/720p/1080p/4K · 5s/10s/20s/30s · Draft & Finalize 1080p workflow).',
  },
];

export function normalizeResolutionCase(raw: unknown): GenerationResolution {
  const s = String(raw || '').trim();
  if (s === '4K' || s.toLowerCase() === '4k') return '4K';
  if (s.toLowerCase() === '1080p') return '1080p';
  if (s.toLowerCase() === '720p') return '720p';
  if (s.toLowerCase() === '480p') return '480p';
  return '720p';
}

export function validateCapabilitySelection(
  model: ProviderModelDefinition,
  resolution: GenerationResolution,
  duration: number
): { valid: boolean; error?: string } {
  if (!model.enabled) {
    return { valid: false, error: `Model "${model.displayName}" is currently disabled by administrator.` };
  }
  if (!model.enabledResolutions.includes(resolution)) {
    return {
      valid: false,
      error: `Resolution "${resolution}" is not enabled for "${model.displayName}". Allowed: ${model.enabledResolutions.join(', ')}.`,
    };
  }
  if (!model.enabledDurations.includes(duration as any)) {
    return {
      valid: false,
      error: `Duration ${duration}s is not enabled for "${model.displayName}". Allowed: ${model.enabledDurations.map((d) => `${d}s`).join(', ')}.`,
    };
  }
  return { valid: true };
}
