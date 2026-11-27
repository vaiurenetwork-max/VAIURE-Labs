import {
  GenerationResolution,
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
  UnifiedGenerationJob,
} from '../../types/multiProvider';

export type CanvasExperienceMode = 'simple' | 'advanced';
export type CanvasCenterStage = 'stage' | 'workflow' | 'painter';
export type CanvasCreationMode =
  | 'text_to_video'
  | 'image_to_video'
  | 'reference_to_video'
  | 'video_extension';

export type CanvasAssetKind = 'image' | 'video' | 'canvas_frame';

export interface CanvasAssetItem {
  id: string;
  kind: CanvasAssetKind;
  name: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  source: 'uploaded' | 'generated' | 'canvas' | 'ai_plate';
  duration?: number;
  resolution?: string;
}

export interface CanvasTimelineClip {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  resolution: string;
  provider: string;
  modelName: string;
  status: UnifiedGenerationJob['status'] | 'completed' | 'processing' | 'failed';
  createdAt: string;
  isDraft?: boolean;
  jobId?: string;
}

export interface CanvasLeftSectionsState {
  creation: boolean;
  assets: boolean;
  advancedTools: boolean;
}

export interface CanvasRightSectionsState {
  basic: boolean;
  prompt: boolean;
  advanced: boolean;
}

export interface CanvasLayoutPreferences {
  experienceMode: CanvasExperienceMode;
  centerStage: CanvasCenterStage;
  leftMinimized: boolean;
  rightMinimized: boolean;
  compactToolbar: boolean;
  showTimeline: boolean;
  leftWidth: number;
  rightWidth: number;
  leftSections: CanvasLeftSectionsState;
  rightSections: CanvasRightSectionsState;
}

export const DEFAULT_CANVAS_LAYOUT_PREFS: CanvasLayoutPreferences = {
  experienceMode: 'simple',
  centerStage: 'stage',
  leftMinimized: false,
  rightMinimized: false,
  compactToolbar: false,
  showTimeline: true,
  leftWidth: 272,
  rightWidth: 332,
  leftSections: {
    creation: true,
    assets: true,
    advancedTools: false,
  },
  rightSections: {
    basic: true,
    prompt: true,
    advanced: false,
  },
};

const LAYOUT_PREFS_STORAGE_KEY = 'vaiure_canvas_layout_prefs_v2';

export function loadCanvasLayoutPreferences(): CanvasLayoutPreferences {
  if (typeof window === 'undefined') return DEFAULT_CANVAS_LAYOUT_PREFS;
  try {
    const raw = window.localStorage.getItem(LAYOUT_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_CANVAS_LAYOUT_PREFS;
    const parsed = JSON.parse(raw) as Partial<CanvasLayoutPreferences>;
    return {
      experienceMode: parsed.experienceMode === 'advanced' ? 'advanced' : 'simple',
      centerStage:
        parsed.centerStage === 'workflow' || parsed.centerStage === 'painter'
          ? parsed.centerStage
          : 'stage',
      leftMinimized: Boolean(parsed.leftMinimized),
      rightMinimized: Boolean(parsed.rightMinimized),
      compactToolbar: Boolean(parsed.compactToolbar),
      showTimeline: parsed.showTimeline !== false,
      leftWidth:
        typeof parsed.leftWidth === 'number'
          ? Math.max(230, Math.min(360, parsed.leftWidth))
          : DEFAULT_CANVAS_LAYOUT_PREFS.leftWidth,
      rightWidth:
        typeof parsed.rightWidth === 'number'
          ? Math.max(280, Math.min(440, parsed.rightWidth))
          : DEFAULT_CANVAS_LAYOUT_PREFS.rightWidth,
      leftSections: {
        creation: parsed.leftSections?.creation !== false,
        assets: parsed.leftSections?.assets !== false,
        advancedTools: Boolean(parsed.leftSections?.advancedTools),
      },
      rightSections: {
        basic: parsed.rightSections?.basic !== false,
        prompt: parsed.rightSections?.prompt !== false,
        advanced: Boolean(parsed.rightSections?.advanced),
      },
    };
  } catch {
    return DEFAULT_CANVAS_LAYOUT_PREFS;
  }
}

export function saveCanvasLayoutPreferences(prefs: CanvasLayoutPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAYOUT_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

export interface CanvasGenerationConfig {
  providerId: ProviderId;
  modelId: string;
  creationMode: CanvasCreationMode;
  prompt: string;
  sceneDescription: string;
  visualStyleId: string;
  aspectRatio: string;
  resolution: GenerationResolution;
  duration: number;
  quantity: number;
  cameraMovementId: string;
  filmStockId: string;
  cameraFixed: boolean;
  physicsPriority: boolean;
  generateAudio: boolean;
  highBitrate: boolean;
  draft: boolean;
  draftRequestId: string;
  seedInput: string;
  contentRating: 'standard' | '18+';
  startImageUrl: string;
  endImageUrl: string;
  referenceImageUrls: string[];
  extensionVideoUrl: string;
}

export interface ActiveModelCapabilities {
  provider?: ProviderConfigPublic;
  model?: ProviderModelDefinition;
  isMuapi: boolean;
  supportsTextToVideo: boolean;
  supportsImageToVideo: boolean;
  supportsReferencePlates: boolean;
  supportsVideoExtension: boolean;
  supportsAspectRatio: boolean;
  supportsQuantity: boolean;
  supportsSeed: boolean;
  supportsNegativePrompt: boolean;
  supportsLastImage: boolean;
  supportsDraftMode: boolean;
  supportsAudio: boolean;
  supportsCameraFixed: boolean;
  supportsHighBitrate: boolean;
  supportsPhysicsPriority: boolean;
  supportsContentRating: boolean;
  requiresStartImage: boolean;
  maxReferenceImages: number;
  resolutions: GenerationResolution[];
  durations: number[];
}

export function deriveModelCapabilities(
  providers: ProviderConfigPublic[],
  providerId: ProviderId,
  modelId: string
): ActiveModelCapabilities {
  const provider = providers.find((p) => p.providerId === providerId) || providers[0];
  const model =
    provider?.models.find((m) => m.modelId === modelId) ||
    provider?.models.find((m) => m.enabled) ||
    provider?.models[0];

  const resolvedProviderId = provider?.providerId || providerId;
  const isMuapi = resolvedProviderId === 'muapi';

  const resolutions: GenerationResolution[] =
    model?.enabledResolutions && model.enabledResolutions.length > 0
      ? model.enabledResolutions
      : isMuapi
      ? ['480p', '720p', '1080p', '4K']
      : ['480p', '720p', '1080p'];

  const durations: number[] =
    model?.enabledDurations && model.enabledDurations.length > 0
      ? model.enabledDurations
      : isMuapi
      ? [5, 10, 20, 30]
      : model?.modelId.includes('30s')
      ? [15, 20, 30]
      : [5, 10, 15];

  return {
    provider,
    model,
    isMuapi,
    supportsTextToVideo: Boolean(model?.supportsTextToVideo ?? !isMuapi),
    supportsImageToVideo: Boolean(model?.supportsImageToVideo ?? true),
    supportsReferencePlates: Boolean(model?.supportsReferencePlates ?? !isMuapi),
    supportsVideoExtension: !isMuapi,
    supportsAspectRatio: !isMuapi,
    supportsQuantity: !isMuapi,
    supportsSeed: !isMuapi,
    // Neither ByteDance ModelArk v3 nor MUAPI Seedance 2.5 Spicy accepts negative_prompt
    supportsNegativePrompt: false,
    supportsLastImage: Boolean(model?.supportsLastImage ?? true),
    supportsDraftMode: Boolean(model?.supportsDraftMode ?? isMuapi),
    supportsAudio: Boolean(model?.supportsAudio ?? true),
    supportsCameraFixed: Boolean(model?.supportsCameraFixed ?? true),
    supportsHighBitrate: Boolean(model?.supportsHighBitrate ?? isMuapi),
    supportsPhysicsPriority: !isMuapi,
    supportsContentRating: !isMuapi,
    requiresStartImage: Boolean(model?.requiresStartImage ?? isMuapi),
    maxReferenceImages: model?.maxReferenceImages ?? (isMuapi ? 2 : 30),
    resolutions,
    durations,
  };
}

export interface CanvasEstimateState {
  loading: boolean;
  estimate: PriceEstimateBreakdown | null;
  error?: string | null;
}
