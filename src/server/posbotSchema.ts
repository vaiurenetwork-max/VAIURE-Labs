/**
 * PosBot Developer API v1 — Model Catalog Schema & Strict Validation Rules
 * Reference: DEVELOPER_API_DOCS.md (Public v1 API Specification)
 *
 * Notice:
 * - Documented values (`documentedCostGenerate`, `documentedCostIdr`, parameter rules)
 *   serve as static reference metadata when `/models` does not return field-level rules.
 * - Live pricing and availability always prioritize the runtime response from `GET /models`.
 */

export type PosBotCategory =
  | 'Image'
  | 'Image Edit'
  | 'Video'
  | 'LipSync'
  | 'Motion / R2V'
  | 'Voice / TTS'
  | 'Music';

export type PosBotStudioSectionId =
  | 'dashboard'
  | 'video-studio'
  | 'image-studio'
  | 'character-reference'
  | 'motion-control'
  | 'lipsync-studio'
  | 'voice-studio'
  | 'music-studio'
  | 'history'
  | 'balance'
  | 'system-status';

export interface PosBotModelDefinition {
  key: string;
  name: string;
  category: PosBotCategory;
  studioSection: PosBotStudioSectionId;
  documentedCostGenerate: number;
  documentedCostIdr: number;
  maxPromptLength: number;
  minPromptLength: number;
  requiredFields: Array<'prompt' | 'image_url' | 'swap_image' | 'video_url' | 'audio_url' | 'reference_image_urls'>;
  optionalFields: Array<
    | 'prompt'
    | 'aspect_ratio'
    | 'image_url'
    | 'image_urls'
    | 'reference_image_urls'
    | 'end_image_url'
    | 'video_url'
    | 'audio_url'
    | 'swap_image'
    | 'voice'
    | 'lyrics'
    | 'instrumental'
  >;
  maxImages?: number;
  aspectRatios?: string[];
  voiceOptions?: string[];
  notes: string;
  isSeedance25?: boolean;
  seedanceDurationSeconds?: 15 | 30;
  isR2V?: boolean;
}

export const GOOGLE_TTS_VOICES = [
  'Kore',
  'Puck',
  'Charon',
  'Fenrir',
  'Aoede',
  'Leda',
  'Orus',
  'Zephyr',
];

export const DOCUMENTED_POSBOT_MODELS: PosBotModelDefinition[] = [
  // ============================================================================
  // 1. IMAGE GENERATION (13 Models)
  // ============================================================================
  {
    key: 'krea2_2k',
    name: 'Krea 2 (2K)',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: '2K High-Detail Image Generation; optional single reference image.',
  },
  {
    key: 'nano_banana_pro_2k',
    name: 'Nano Banana Pro 2K',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Supports up to 4 reference images.',
  },
  {
    key: 'nano_banana_pro_4k',
    name: 'Nano Banana Pro 4K',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: '4K resolution; supports up to 4 reference images.',
  },
  {
    key: 'nano_banana_2_2k',
    name: 'Nano Banana 2 (2K)',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Supports up to 4 reference images.',
  },
  {
    key: 'nano_banana_2_4k',
    name: 'Nano Banana 2 (4K)',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: '4K resolution; supports up to 4 reference images.',
  },
  {
    key: 'gpt_image_2_high',
    name: 'GPT Image 2 High',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 5,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Supports up to 5 reference images.',
  },
  {
    key: 'flux_2_pro',
    name: 'Flux 2 Pro',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 6,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Photorealistic Flux 2 Pro; supports up to 6 reference images.',
  },
  {
    key: 'seedream_50_2k',
    name: 'Seedream 5.0 (2K)',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Supports up to 4 reference images.',
  },
  {
    key: 'seedream_50_4k',
    name: 'Seedream 5.0 (4K)',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: '4K resolution; supports up to 4 reference images.',
  },
  {
    key: 'seedream_45',
    name: 'Seedream 4.5',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 3,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Supports up to 3 reference images.',
  },
  {
    key: 'seedream_5_fast_2k',
    name: 'Seedream 5 Fast 2K',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Fast 2K synthesis; optional single reference image.',
  },
  {
    key: 'seedream_5_pro_2k',
    name: 'Seedream 5 Pro 2K',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 3000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 10,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Up to 10 reference images; 3,000-char prompt limit.',
  },
  {
    key: 'gpt_image_25',
    name: 'GPT Image 2.5',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 20000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 16,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Up to 16 reference images; 20,000-char prompt limit.',
  },
  {
    key: 'gpt_image_25_sunburst',
    name: 'GPT Image 2.5 Sunburst',
    category: 'Image',
    studioSection: 'image-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 20000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'reference_image_urls', 'image_urls'],
    maxImages: 16,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Sunburst lighting profile; up to 16 reference images; 20,000-char prompt limit.',
  },

  // ============================================================================
  // 2. IMAGE EDIT & ENHANCE (2 Models)
  // ============================================================================
  {
    key: 'face_swap',
    name: 'Face Swap',
    category: 'Image Edit',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'swap_image'],
    optionalFields: ['prompt'],
    notes: 'Requires target image (image_url) + source face image (swap_image).',
  },
  {
    key: 'upscale_4k',
    name: 'Upscale 4K',
    category: 'Image Edit',
    studioSection: 'image-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 0,
    requiredFields: ['image_url'],
    optionalFields: ['prompt'],
    notes: 'Upscales source image_url to 4K resolution.',
  },

  // ============================================================================
  // 3. VIDEO GENERATION (T2V & I2V) (22 Models)
  // ============================================================================
  {
    key: 'kling_25_turbo_5s',
    name: 'Kling 2.5 Turbo 5s',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '5s fast video synthesis; Text-to-Video or Image-to-Video.',
  },
  {
    key: 'kling_25_turbo_10s',
    name: 'Kling 2.5 Turbo 10s',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '10s fast video synthesis; Text-to-Video or Image-to-Video.',
  },
  {
    key: 'kling_26_5s',
    name: 'Kling 2.6 (5s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '5s Kling 2.6 video; Text-to-Video or Image-to-Video.',
  },
  {
    key: 'kling_26_10s',
    name: 'Kling 2.6 (10s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '10s Kling 2.6 video; Text-to-Video or Image-to-Video.',
  },
  {
    key: 'kling_30_5s',
    name: 'Kling 3.0 (5s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'end_image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '5s Kling 3.0; supports start image_url + end_image_url keyframe interpolation.',
  },
  {
    key: 'kling_30_10s',
    name: 'Kling 3.0 (10s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 5,
    documentedCostIdr: 2000,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'end_image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '10s Kling 3.0; supports start image_url + end_image_url keyframe interpolation.',
  },
  {
    key: 'kling_30_15s',
    name: 'Kling 3.0 (15s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 6,
    documentedCostIdr: 2400,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'end_image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '15s Kling 3.0; supports start image_url + end_image_url keyframe interpolation.',
  },
  {
    key: 'grok_imagine_15_video_720p',
    name: 'Grok Imagine 1.5 Video 720p',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: '720p Grok Imagine 1.5; Text-to-Video or Image-to-Video.',
  },
  {
    key: 'omni_flash_t2v',
    name: 'Omni Flash T2V',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Omni Flash pure Text-to-Video synthesis.',
  },
  {
    key: 'omni_flash_i2v',
    name: 'Omni Flash I2V',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt', 'image_url'],
    optionalFields: ['aspect_ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Omni Flash Image-to-Video (requires image_url).',
  },
  {
    key: 'seedance_20_15s',
    name: 'Seedance 2.0 (15s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 8000,
    minPromptLength: 3,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'image_urls', 'reference_image_urls'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: '15s Seedance 2.0; up to 9 reference images; 8,000-char prompt limit.',
  },
  {
    key: 'seedance_25_15s',
    name: 'Seedance 2.5 (15s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 8000,
    minPromptLength: 3,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'image_urls', 'reference_image_urls'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Flagship Seedance 2.5 (15s); multi-shot storyboard & up to 9 reference images.',
    isSeedance25: true,
    seedanceDurationSeconds: 15,
  },
  {
    key: 'seedance_25_30s',
    name: 'Seedance 2.5 (30s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 7,
    documentedCostIdr: 2800,
    maxPromptLength: 8000,
    minPromptLength: 3,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'image_urls', 'reference_image_urls'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Flagship Seedance 2.5 (30s); extended multi-shot narrative & up to 9 reference images.',
    isSeedance25: true,
    seedanceDurationSeconds: 30,
  },
  {
    key: 'seedance_20_mini',
    name: 'Seedance 2.0 Mini',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 8000,
    minPromptLength: 3,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Fast Seedance 2.0 Mini; Text-to-Video or single Image-to-Video.',
  },
  {
    key: 'wan_30_hd',
    name: 'Wan 3.0 HD',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 10000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Wan 3.0 HD; 10,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'wan_30_720p',
    name: 'Wan 3.0 720p',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 10000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Wan 3.0 720p; 10,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'minimax_h3',
    name: 'MiniMax H3',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 5000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'MiniMax H3 HD; 5,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'minimax_h3_720p',
    name: 'MiniMax H3 720p',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 5000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'MiniMax H3 720p; 5,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'grok_imagine_2_15s',
    name: 'Grok Imagine 2 (15s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 5000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Grok Imagine 2 (15s); 5,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'grok_imagine_2_30s',
    name: 'Grok Imagine 2 (30s)',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 7,
    documentedCostIdr: 2800,
    maxPromptLength: 5000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Grok Imagine 2 (30s); 5,000-char prompt limit; T2V or I2V.',
  },
  {
    key: 'betagrok_15s',
    name: 'BetaGrok 15s',
    category: 'Video',
    studioSection: 'video-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['aspect_ratio', 'image_url', 'image_urls', 'reference_image_urls'],
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'BetaGrok 15s; supports up to 4 reference images.',
  },

  // ============================================================================
  // 4. LIPSYNC (2 Models)
  // ============================================================================
  {
    key: 'minimax_lipsync',
    name: 'MiniMax LipSync',
    category: 'LipSync',
    studioSection: 'lipsync-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['video_url', 'audio_url'],
    optionalFields: ['prompt'],
    notes: 'Synchronizes facial lip movements in video_url to audio_url.',
  },
  {
    key: 'ltx_lipsync',
    name: 'LTX LipSync',
    category: 'LipSync',
    studioSection: 'lipsync-studio',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['video_url', 'audio_url'],
    optionalFields: ['prompt'],
    notes: 'High-accuracy LTX vocal & facial lip synchronization.',
  },

  // ============================================================================
  // 5. MOTION CONTROL, R2V & VIDEO TOOLS (16 Models)
  // ============================================================================
  {
    key: 'motion_control_std',
    name: 'Kling 2.6 Motion Control Std',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: 'Transfers motion from reference video_url onto character image_url.',
  },
  {
    key: 'motion_control_pro',
    name: 'Kling 2.6 Motion Control Pro',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: 'Pro-grade Kling 2.6 motion transfer from video_url onto image_url.',
  },
  {
    key: 'kling_30_std',
    name: 'Kling 3.0 Motion Control Std',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: 'Kling 3.0 Standard motion transfer (image_url + video_url).',
  },
  {
    key: 'kling_30_pro',
    name: 'Kling 3.0 Motion Control Pro',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 5,
    documentedCostIdr: 2000,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: 'Kling 3.0 Pro motion transfer (image_url + video_url).',
  },
  {
    key: 'betamotion_1080p',
    name: 'BetaMotion 1080p Std',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: '1080p Standard motion transfer (image_url + video_url).',
  },
  {
    key: 'betamotion_1080p_pro',
    name: 'BetaMotion 1080p Pro',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 5,
    documentedCostIdr: 2000,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: '1080p Pro motion transfer (image_url + video_url).',
  },
  {
    key: 'betamotion_1080p_max',
    name: 'BetaMotion 1080p Max',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 7,
    documentedCostIdr: 2800,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['image_url', 'video_url'],
    optionalFields: ['prompt'],
    notes: '1080p Max high-fidelity motion transfer (image_url + video_url).',
  },
  {
    key: 'seedance_20_15s_r2v',
    name: 'Seedance 2.0 (15s) R2V',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 8000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'reference_image_urls'],
    optionalFields: ['aspect_ratio', 'image_urls', 'image_url'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Reference-to-Video (15s); up to 9 reference images.',
    isR2V: true,
  },
  {
    key: 'seedance_25_15s_r2v',
    name: 'Seedance 2.5 (15s) R2V',
    category: 'Motion / R2V',
    studioSection: 'video-studio',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 8000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'reference_image_urls'],
    optionalFields: ['aspect_ratio', 'image_urls', 'image_url'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Flagship Seedance 2.5 R2V (15s); multi-reference identity & vehicle lock (up to 9 images).',
    isSeedance25: true,
    seedanceDurationSeconds: 15,
    isR2V: true,
  },
  {
    key: 'seedance_25_30s_r2v',
    name: 'Seedance 2.5 (30s) R2V',
    category: 'Motion / R2V',
    studioSection: 'video-studio',
    documentedCostGenerate: 7,
    documentedCostIdr: 2800,
    maxPromptLength: 8000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'reference_image_urls'],
    optionalFields: ['aspect_ratio', 'image_urls', 'image_url'],
    maxImages: 9,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    notes: 'Flagship Seedance 2.5 R2V (30s); extended multi-reference identity & vehicle lock (up to 9 images).',
    isSeedance25: true,
    seedanceDurationSeconds: 30,
    isR2V: true,
  },
  {
    key: 'seedance_20_mini_r2v',
    name: 'Seedance 2.0 Mini R2V',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 8000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'reference_image_urls'],
    optionalFields: ['aspect_ratio', 'image_urls', 'image_url'],
    maxImages: 6,
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Fast Reference-to-Video; up to 6 reference images.',
    isR2V: true,
  },
  {
    key: 'wan_30_r2v',
    name: 'Wan 3.0 R2V',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 10000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'image_url'],
    optionalFields: ['aspect_ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Wan 3.0 Reference-to-Video; 10,000-char prompt limit.',
    isR2V: true,
  },
  {
    key: 'minimax_h3_r2v',
    name: 'MiniMax H3 R2V',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 5000,
    minPromptLength: 1,
    requiredFields: ['prompt', 'image_url'],
    optionalFields: ['aspect_ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'MiniMax H3 Reference-to-Video; 5,000-char prompt limit.',
    isR2V: true,
  },
  {
    key: 'kling_30_r2v',
    name: 'Kling 3.0 R2V',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 4,
    documentedCostIdr: 1600,
    maxPromptLength: 2500,
    minPromptLength: 1,
    requiredFields: ['prompt', 'image_url'],
    optionalFields: ['aspect_ratio'],
    aspectRatios: ['16:9', '9:16', '1:1'],
    notes: 'Kling 3.0 Reference-to-Video.',
    isR2V: true,
  },
  {
    key: 'upscale_2k_60fps',
    name: 'Upscale 2K 60FPS',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 3,
    documentedCostIdr: 1200,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['video_url'],
    optionalFields: ['prompt'],
    notes: 'Upscales video_url to 2K resolution at smooth 60fps.',
  },
  {
    key: 'watermark_remover',
    name: 'Video Watermark Remover',
    category: 'Motion / R2V',
    studioSection: 'motion-control',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2500,
    minPromptLength: 0,
    requiredFields: ['video_url'],
    optionalFields: ['prompt'],
    notes: 'Removes overlay watermarks from source video_url.',
  },

  // ============================================================================
  // 6. VOICE / TTS (1 Model)
  // ============================================================================
  {
    key: 'google_tts',
    name: 'Google TTS',
    category: 'Voice / TTS',
    studioSection: 'voice-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['voice'],
    voiceOptions: GOOGLE_TTS_VOICES,
    notes: 'Natural text-to-speech synthesis; default voice Kore.',
  },

  // ============================================================================
  // 7. MUSIC GENERATION (8 Models)
  // ============================================================================
  {
    key: 'suno_v6',
    name: 'Suno V6',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Flagship Suno V6 full-song synthesis with lyrics & instrumental support.',
  },
  {
    key: 'suno_v6_wild',
    name: 'Suno V6 Wild',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'High-dynamic experimental Suno V6 Wild arrangement.',
  },
  {
    key: 'suno_v6_mini',
    name: 'Suno V6 Mini',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Fast & economical Suno V6 Mini track synthesis.',
  },
  {
    key: 'lyria_35',
    name: 'Lyria 3.5',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Lyria 3.5 cinematic & studio music generation.',
  },
  {
    key: 'minimax_music_3',
    name: 'MiniMax Music 3.0',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'MiniMax Music 3.0 vocal & instrumental track generation.',
  },
  {
    key: 'mureka_95',
    name: 'Mureka 9.5',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Mureka 9.5 studio composition.',
  },
  {
    key: 'sonauto_3',
    name: 'Sonauto 3.0',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 2,
    documentedCostIdr: 800,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Sonauto 3.0 music synthesis.',
  },
  {
    key: 'acestep_15',
    name: 'AceStep 1.5',
    category: 'Music',
    studioSection: 'music-studio',
    documentedCostGenerate: 1,
    documentedCostIdr: 400,
    maxPromptLength: 2000,
    minPromptLength: 1,
    requiredFields: ['prompt'],
    optionalFields: ['lyrics', 'instrumental'],
    notes: 'Fast AceStep 1.5 beat & song generation.',
  },
];

export const MODEL_BY_KEY: Record<string, PosBotModelDefinition> = Object.fromEntries(
  DOCUMENTED_POSBOT_MODELS.map((m) => [m.key, m])
);

export const MODEL_ALIASES: Record<string, string> = {
  'seedance-2.5-ref-video': 'seedance_25_15s',
  'veo-3.1-generate-preview': 'omni_flash_t2v',
  'luma-ray-2': 'wan_30_hd',
  'kling-1.5-pro': 'kling_30_5s',
  seedream_50_lite: 'seedream_50_2k',
  seedream_50_pro: 'seedream_50_4k',
  kling_25_turbo: 'kling_25_turbo_10s',
  kling_26_pro_1080p: 'kling_26_10s',
  kling_26_i2v: 'kling_26_10s',
  kling_30_turbo: 'kling_30_15s',
  kling_30_omni_r2v: 'kling_30_r2v',
  wan_remix_720p: 'wan_30_720p',
  omni_flash_sfv: 'omni_flash_i2v',
  omni_flash_r2v: 'omni_flash_i2v',
  suno: 'suno_v6',
  suno6: 'suno_v6',
  suno_wild: 'suno_v6_wild',
  suno_mini: 'suno_v6_mini',
  lyria: 'lyria_35',
  minimax_music: 'minimax_music_3',
  mureka: 'mureka_95',
  sonauto: 'sonauto_3',
  acestep: 'acestep_15',
};

/**
 * Validates that a media URL is a publicly reachable HTTP/HTTPS URL and NOT
 * pointing to localhost, loopback, link-local, or RFC1918 private networks.
 */
export function isPublicHttpUrl(rawUrl: string): { valid: boolean; reason?: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, reason: 'URL cannot be empty.' };
  }

  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Invalid URL format. Must be a valid http:// or https:// URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Unsupported protocol "${parsed.protocol}". URL must start with http:// or https://.`,
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return {
      valid: false,
      reason: `Private or loopback host "${host}" is not allowed. PosBot servers require a publicly accessible URL.`,
    };
  }

  // Check IPv4 private ranges: 10.x.x.x, 127.x.x.x, 169.254.x.x, 192.168.x.x, 172.16.x.x - 172.31.x.x
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, aStr, bStr] = ipv4Match;
    const a = Number(aStr);
    const b = Number(bStr);

    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 192 && b === 168) ||
      (a === 172 && b >= 16 && b <= 31)
    ) {
      return {
        valid: false,
        reason: `Private IPv4 address "${host}" is not allowed. PosBot servers require a publicly accessible internet URL.`,
      };
    }
  }

  // Check IPv6 link-local / unique-local
  if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) {
    return {
      valid: false,
      reason: `Private IPv6 address "${host}" is not allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a job_code to prevent path traversal or injection.
 */
export function validateJobCode(jobCode: unknown): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof jobCode !== 'string' || !jobCode.trim()) {
    return { valid: false, error: 'Missing job_code parameter.' };
  }
  const trimmed = jobCode.trim();
  if (trimmed.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid job_code format. Only alphanumeric characters, hyphens, and underscores are allowed.',
    };
  }
  return { valid: true, sanitized: trimmed };
}

export interface ValidatedGenerateResult {
  valid: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  sanitizedPayload?: Record<string, unknown>;
  modelDef?: PosBotModelDefinition;
}

/**
 * Validates a generation request payload against the documented PosBot model rules.
 */
export function validateGeneratePayload(rawBody: unknown): ValidatedGenerateResult {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      valid: false,
      error: 'Request body must be a JSON object.',
    };
  }

  const body = rawBody as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  const rawModelKey = typeof body.model === 'string' ? body.model.trim() : '';
  if (!rawModelKey) {
    return {
      valid: false,
      error: 'Parameter "model" is required.',
      fieldErrors: { model: 'Model key is required.' },
    };
  }

  const modelKey = MODEL_ALIASES[rawModelKey] || rawModelKey;
  const modelDef = MODEL_BY_KEY[modelKey];
  const maxPromptLen = modelDef ? modelDef.maxPromptLength : 2500;
  const minPromptLen = modelDef ? modelDef.minPromptLength : 0;

  // Normalize prompt
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';

  if (modelDef?.requiredFields.includes('prompt') && !prompt) {
    fieldErrors.prompt = `Prompt is required for model "${modelDef.name}".`;
  } else if (prompt && prompt.length < minPromptLen) {
    fieldErrors.prompt = `Prompt must be at least ${minPromptLen} characters for "${modelDef?.name || modelKey}".`;
  } else if (prompt.length > maxPromptLen) {
    fieldErrors.prompt = `Prompt length (${prompt.length}) exceeds maximum limit of ${maxPromptLen} characters for "${modelDef?.name || modelKey}".`;
  }

  // Normalize single URL fields
  const singleUrlFields = ['image_url', 'end_image_url', 'swap_image', 'video_url', 'audio_url'] as const;
  const normalizedUrls: Partial<Record<(typeof singleUrlFields)[number], string>> = {};

  for (const field of singleUrlFields) {
    const rawVal = body[field];
    if (typeof rawVal === 'string' && rawVal.trim()) {
      const check = isPublicHttpUrl(rawVal.trim());
      if (!check.valid) {
        fieldErrors[field] = check.reason || `Invalid URL in ${field}`;
      } else {
        normalizedUrls[field] = rawVal.trim();
      }
    }
  }

  // Normalize multi-image arrays (reference_image_urls, image_urls, images)
  const rawRefList: string[] = [];
  const arrayCandidates = [body.reference_image_urls, body.image_urls, body.images];
  for (const candidate of arrayCandidates) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        if (typeof item === 'string' && item.trim()) {
          rawRefList.push(item.trim());
        }
      }
      break;
    }
  }

  const dedupedRefs = Array.from(new Set(rawRefList));
  if (dedupedRefs.length > 0) {
    if (modelDef?.maxImages && dedupedRefs.length > modelDef.maxImages) {
      fieldErrors.reference_image_urls = `Model "${modelDef.name}" supports at most ${modelDef.maxImages} reference images (received ${dedupedRefs.length}).`;
    }
    for (let i = 0; i < dedupedRefs.length; i++) {
      const check = isPublicHttpUrl(dedupedRefs[i]);
      if (!check.valid) {
        fieldErrors.reference_image_urls = `Reference image #${i + 1}: ${check.reason}`;
        break;
      }
    }
  }

  // Check required media fields
  if (modelDef) {
    for (const reqField of modelDef.requiredFields) {
      if (reqField === 'prompt') continue;
      if (reqField === 'reference_image_urls') {
        const hasAnyImage = dedupedRefs.length > 0 || Boolean(normalizedUrls.image_url);
        if (!hasAnyImage) {
          fieldErrors.reference_image_urls = `At least 1 reference image URL is required for "${modelDef.name}".`;
        }
      } else if (!normalizedUrls[reqField]) {
        fieldErrors[reqField] = `Parameter "${reqField}" is required for "${modelDef.name}".`;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    const firstMsg = Object.values(fieldErrors)[0];
    return {
      valid: false,
      error: firstMsg,
      fieldErrors,
      modelDef,
    };
  }

  // Assemble clean upstream payload
  const sanitizedPayload: Record<string, unknown> = {
    model: modelKey,
  };

  if (prompt) {
    sanitizedPayload.prompt = prompt;
  }

  if (typeof body.aspect_ratio === 'string' && body.aspect_ratio.trim()) {
    sanitizedPayload.aspect_ratio = body.aspect_ratio.trim();
  }

  for (const field of singleUrlFields) {
    if (normalizedUrls[field]) {
      sanitizedPayload[field] = normalizedUrls[field];
    }
  }

  if (dedupedRefs.length > 0) {
    sanitizedPayload.reference_image_urls = dedupedRefs;
    sanitizedPayload.image_urls = dedupedRefs;
    if (!sanitizedPayload.image_url) {
      sanitizedPayload.image_url = dedupedRefs[0];
    }
  }

  if (typeof body.voice === 'string' && body.voice.trim()) {
    sanitizedPayload.voice = body.voice.trim();
  }

  if (typeof body.lyrics === 'string' && body.lyrics.trim()) {
    if (body.lyrics.trim().length > 5000) {
      return {
        valid: false,
        error: 'Lyrics cannot exceed 5,000 characters.',
        fieldErrors: { lyrics: 'Lyrics cannot exceed 5,000 characters.' },
      };
    }
    sanitizedPayload.lyrics = body.lyrics.trim();
  }

  if (typeof body.instrumental === 'boolean') {
    sanitizedPayload.instrumental = body.instrumental;
  }

  return {
    valid: true,
    sanitizedPayload,
    modelDef,
  };
}
