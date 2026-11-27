/**
 * VAIURE — HYBRID STUDIO Types
 * Full AI Film Production & Creative Direction Workspace powered by Seedance 2.5
 */

import { GenerationResolution, ProviderId } from './multiProvider';

export type HybridWorkspaceMode = 'director' | 'production' | 'video-transform';

export type HybridNavCategory =
  | 'production'
  | 'create'
  | 'director-tools'
  | 'media'
  | 'advanced';

export type HybridFrameRate = '24fps' | '30fps';

export type HybridAspectRatio = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';

export type HybridGenerationMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video'
  | 'reference-based'
  | 'first-last-frame';

export type HybridShotSize =
  | 'Extreme Wide'
  | 'Wide'
  | 'Medium'
  | 'Close-Up'
  | 'Extreme Close-Up'
  | 'Over-the-Shoulder'
  | 'POV';

export type HybridCameraMovement =
  | 'Static'
  | 'Pan & Tilt'
  | 'Dolly'
  | 'Tracking'
  | 'Crane'
  | 'Handheld'
  | 'Steadicam'
  | 'Orbit';

export type HybridTransitionType =
  | 'CUT'
  | 'DISSOLVE'
  | 'FADE_FROM_BLACK'
  | 'FADE_TO_BLACK';

export type HybridShotStatus =
  | 'PLANNING'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type HybridAssetCategory =
  | 'Reference Image'
  | 'Reference Video'
  | 'Character Image'
  | 'Character Video'
  | 'Environment Reference'
  | 'Cinematic Reference'
  | 'Existing Footage'
  | 'Audio File'
  | 'Generated Result';

export interface HybridAsset {
  id: string;
  name: string;
  category: HybridAssetCategory;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO';
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number;
  fileSizeBytes?: number;
  mimeType?: string;
  folder?: string;
  sourceAssetId?: string;
  transformVersionId?: string;
  tags: string[];
  source: 'upload' | 'generated' | 'library';
  sceneId?: string;
  shotId?: string;
  createdAt: string;
}

export type HybridTransformCategory =
  | 'environment'
  | 'character'
  | 'elements'
  | 'atmosphere'
  | 'style';

export type HybridTransformDeliveryMethod =
  | 'reference_video'
  | 'reference_video_and_plates'
  | 'segment_keyframes';

export interface HybridVideoTransformDraft {
  sourceAssetId: string;
  useFullVideo: boolean;
  segmentStart: number;
  segmentEnd: number;
  extractedStartFrameAssetId?: string;
  extractedEndFrameAssetId?: string;

  // Categories A-E
  environmentPreset: string;
  environmentPrompt: string;
  environmentRefAssetId?: string;

  subjectTargetDescription: string;
  characterAppearancePrompt: string;
  characterClothingPrompt: string;
  characterStyleNotes: string;
  characterRefAssetId?: string;

  elementsAddPrompt: string;
  elementsRefAssetId?: string;

  atmosphereLighting: string;
  atmosphereWeather: string;
  atmosphereTimeOfDay: string;
  atmosphereMood: string;
  atmosphereRefAssetId?: string;

  visualStyleDirection: string;
  styleRefAssetId?: string;

  // Central Video Director Prompt System
  mainPrompt: string;
  elementsToChange: string;
  elementsToAdd: string;
  elementsToPreserve: string;
  cameraDirection: HybridCameraMovement | string;
  motionDirection: string;
  lightingDirection: string;

  // Additional multimodal reference plates (max 30 supported on Seedance 2.5 R2V)
  extraReferenceAssetIds: string[];

  // Execution configuration
  providerId: ProviderId;
  modelId: string;
  aspectRatio: HybridAspectRatio;
  resolution: GenerationResolution;
  duration: number;
  physicsPriority: boolean;
  generateAudio: boolean;
  cameraFixed: boolean;
  highBitrate: boolean;
  draft: boolean;
  contentRating: 'standard' | '18+';
}

export interface HybridVideoTransformVersion {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: string;
  sourceAssetId: string;
  parentTransformId?: string;
  segmentStart: number;
  segmentEnd: number;
  useFullVideo: boolean;
  providerId: ProviderId;
  modelId: string;
  modelName: string;
  resolution: GenerationResolution;
  duration: number;
  aspectRatio: HybridAspectRatio;
  prompt: string;
  elementsToChange: string;
  elementsToAdd: string;
  elementsToPreserve: string;
  referenceAssetIds: string[];
  deliveryMethod: HybridTransformDeliveryMethod;
  status: HybridShotStatus;
  progress: number;
  jobId?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  creditCost?: number;
  currency?: 'CREDITS' | 'USD';
}

export interface HybridCharacterProfile {
  id: string;
  name: string;
  role: string;
  appearancePrompt: string;
  wardrobeNotes: string;
  referenceImageAssetIds: string[];
  referenceVideoAssetId?: string;
  locked: boolean;
}

export interface HybridEnvironmentProfile {
  id: string;
  name: string;
  timeOfDay: string;
  lightingNotes: string;
  atmospherePrompt: string;
  referenceImageAssetId?: string;
  referenceVideoAssetId?: string;
  locked: boolean;
}

export interface HybridShotVersion {
  id: string;
  versionNumber: number;
  createdAt: string;
  providerId: ProviderId;
  modelId: string;
  prompt: string;
  resolution: GenerationResolution;
  duration: number;
  outputUrl: string;
  thumbnailUrl?: string;
  jobId?: string;
  costLabel?: string;
}

export interface HybridShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  title: string;
  description: string;

  // Creative & Shot Direction
  mainPrompt: string;
  actionDescription: string;
  subjectMovement: string;
  cameraMovement: HybridCameraMovement;
  shotSize: HybridShotSize;
  visualStyle: string;
  lightingDirection: string;
  motionDirection: string;

  // Per-Shot Reference Bindings (asset IDs)
  referenceImageAssetId?: string;
  endFrameAssetId?: string;
  referenceVideoAssetId?: string;
  characterIds: string[];
  environmentId?: string;
  extraReferenceAssetIds: string[];

  // Independent Generation Configuration
  generationMode: HybridGenerationMode;
  providerId: ProviderId;
  modelId: string;
  aspectRatio: HybridAspectRatio;
  resolution: GenerationResolution;
  duration: number;
  quantity: number;
  cameraFixed: boolean;
  physicsPriority: boolean;
  generateAudio: boolean;
  highBitrate: boolean;
  draft: boolean;
  seed?: number;
  contentRating: 'standard' | '18+';

  // Execution State & Output Takes
  status: HybridShotStatus;
  progress: number;
  activeJobId?: string;
  outputUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  versions: HybridShotVersion[];
  activeVersionId?: string;
}

export interface HybridScene {
  id: string;
  sceneNumber: number;
  name: string;
  description: string;
  referenceImageAssetId?: string;
  referenceVideoAssetId?: string;
  characterId?: string;
  environmentId?: string;
  cameraDirection: HybridCameraMovement;
  motionDirection: string;
  generationPrompt: string;
  duration: number;
  status: HybridShotStatus;
  shots: HybridShot[];
}

export interface HybridTimelineTrack {
  id: string;
  name: string;
  type: 'VIDEO' | 'REFERENCE' | 'AUDIO';
  isMuted: boolean;
  isLocked: boolean;
  volume: number;
}

export interface HybridTimelineClip {
  id: string;
  trackId: string;
  trackType: 'VIDEO' | 'REFERENCE' | 'AUDIO';
  sceneId?: string;
  shotId?: string;
  assetId?: string;
  title: string;
  mediaType: 'VIDEO' | 'IMAGE' | 'AUDIO';
  mediaUrl: string;
  thumbnailUrl?: string;
  startTime: number;
  duration: number;
  inPoint: number;
  outPoint: number;
  transitionIn: HybridTransitionType;
  transitionDuration: number;
  volume: number;
}

export interface HybridGenerationRecord {
  id: string;
  jobId: string;
  projectId: string;
  sceneId: string;
  shotId: string;
  provider: ProviderId;
  modelId: string;
  modelName: string;
  mode: HybridGenerationMode;
  prompt: string;
  referenceAssetIds: string[];
  parameters: {
    aspectRatio: HybridAspectRatio;
    resolution: GenerationResolution;
    duration: number;
    cameraFixed: boolean;
    physicsPriority: boolean;
    generateAudio: boolean;
    highBitrate: boolean;
    draft: boolean;
    seed?: number;
  };
  status: HybridShotStatus;
  progress: number;
  outputUrl?: string;
  creditCost: number;
  currency: 'CREDITS' | 'USD';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HybridProjectVersion {
  id: string;
  label: string;
  savedAt: string;
  summary: string;
  sceneCount: number;
  shotCount: number;
  clipCount: number;
  snapshot: {
    name: string;
    description: string;
    resolution: GenerationResolution;
    frameRate: HybridFrameRate;
    aspectRatio: HybridAspectRatio;
    scenes: HybridScene[];
    characters: HybridCharacterProfile[];
    environments: HybridEnvironmentProfile[];
    timelineTracks: HybridTimelineTrack[];
    timelineClips: HybridTimelineClip[];
  };
}

export interface HybridProductionProject {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  resolution: GenerationResolution;
  frameRate: HybridFrameRate;
  aspectRatio: HybridAspectRatio;
  scenes: HybridScene[];
  characters: HybridCharacterProfile[];
  environments: HybridEnvironmentProfile[];
  assets: HybridAsset[];
  assetFolders?: string[];
  videoTransforms?: HybridVideoTransformVersion[];
  timelineTracks: HybridTimelineTrack[];
  timelineClips: HybridTimelineClip[];
  generations: HybridGenerationRecord[];
  versions: HybridProjectVersion[];
  createdAt: string;
  updatedAt: string;
}
