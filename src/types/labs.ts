/**
 * VAIURE Labs — Types & Architectural Data Contracts
 * Slide 4: AI Video Studio
 * Specialized for BytePlus Seedance 2.5 ref-video
 * Advanced Prompt Engineering & Temporal Sequence Studio
 */

export type GenerationMode = 'video';

export type AspectRatioId = '16:9' | '9:16' | '1:1' | '4:5' | '2.39:1';

export interface AspectRatioOption {
  id: AspectRatioId;
  label: string;
  ratio: string;
  width: number;
  height: number;
}

export type VideoResolution = '480p' | '720p' | '1080p';

export type ReferenceRole =
  | 'style'
  | 'subject'
  | 'lighting'
  | 'palette'
  | 'pose'
  | 'composition';

export interface ReferenceImageItem {
  id: string;
  url: string;
  name?: string;
  weight: number; // 0.1 to 1.0
  role: ReferenceRole;
  sizeBytes?: number;
}

export interface ModelCapability {
  supportsNegativePrompt: boolean;
  supportsReferenceImage: boolean;
  maxReferenceImages: number; // Up to 30 reference images
  maxPromptWords: number; // 50,000 words
  supportsSeed: boolean;
  supportedRatios: AspectRatioId[];
  supportedResolutions: VideoResolution[];
  minDuration: number; // 4s
  maxDuration: number; // 30s
  frameRate: '24fps';
  defaultRatio: AspectRatioId;
  defaultResolution: VideoResolution;
  defaultDuration: number;
}

export interface ModelOption {
  id: string;
  displayName: string;
  provider: string;
  category: GenerationMode[];
  badge?: string;
  tagline: string;
  description: string;
  speedRating: string;
  costCredits: number;
  capabilities: ModelCapability;
  futureApiIdentifier: string;
}

// -------------------------------------------------------------
// ADVANCED PROMPT & TEMPORAL SEQUENCE DATA CONTRACTS
// -------------------------------------------------------------

export type PromptMode = 'natural' | 'slash';

export interface SlashSegment {
  id: string;
  category: string;
  value: string;
  order: number;
}

export interface TemporalSequence {
  id: string;
  order: number;
  startSeconds: number;
  endSeconds: number;
  description: string;
  camera?: string;
  lighting?: string;
  atmosphere?: string;
  audio?: string;
  transition?: string;
  negativeConstraints?: string;
}

export interface TimelineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  hasGaps: boolean;
  hasOverlaps: boolean;
}

export interface GenerationParameters {
  mode: GenerationMode;
  modelId: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: AspectRatioId;
  resolution: VideoResolution;
  durationSeconds: number; // 4 to 30
  frameRate: '24fps';
  referenceImages: ReferenceImageItem[];
  seed: number;
  isRandomSeed: boolean;

  // Advanced Prompt & Sequence State
  promptMode?: PromptMode;
  slashSegments?: SlashSegment[];
  isSlashDirty?: boolean;
  sequences?: TemporalSequence[];
  compiledPrompt?: string;
  generateAudio?: boolean;
}

export interface GenerationItem {
  id: string;
  createdAt: number;
  mode: GenerationMode;
  modelId: string;
  modelDisplayName: string;
  provider: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: AspectRatioId;
  resolution: VideoResolution | string;
  durationSeconds: number;
  frameRate: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  isVideo: boolean;
  seed: number;
  renderTimeSec: number;
  isStarred?: boolean;
  publishedToFeed?: boolean;
  referenceImagesCount?: number;
  wordCount?: number;

  // Sequence payload metadata
  sequencesCount?: number;
  compiledPrompt?: string;
  slashPromptText?: string;
}

// BytePlus Seedance 2.5 Structured JSON Schema
export interface Seedance25Payload {
  schema_version: '1.0';
  project: 'vaiure-labs';
  provider: 'byteplus';
  model: 'seedance-2.5';
  input: {
    original_prompt: string;
    slash_prompt: string;
    compiled_prompt: string;
    duration_seconds: number;
    aspect_ratio: AspectRatioId;
    resolution: VideoResolution;
    frame_rate: '24fps';
    generate_audio: boolean;
    reference_images_count: number;
    sequences: {
      id: string;
      order: number;
      start_seconds: number;
      end_seconds: number;
      duration_seconds: number;
      description: string;
      camera: string | null;
      lighting: string | null;
      audio: string | null;
      transition: string | null;
    }[];
  };
  metadata: {
    prompt_engine: 'gemini';
    api_submission_ready: boolean;
    validation_status: 'valid' | 'warning' | 'error';
    generated_at: string;
    target_api: 'BytePlus Seedance 2.5 Video Generation API';
  };
}
