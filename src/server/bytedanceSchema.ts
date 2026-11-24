/**
 * ByteDance BytePlus ModelArk API v3 — Model Catalog Schema & Strict Validation Rules
 * Official Endpoints:
 * - Video Generation (Seedance): POST /api/v3/contents/generations/tasks
 * - Task Polling: GET /api/v3/contents/generations/tasks/{id}
 * - Task Cancel/Delete: DELETE /api/v3/contents/generations/tasks/{id}
 * - Image Generation (Seedream): POST /api/v3/images/generations
 */

export type ByteDanceModelCategory = 'Video' | 'Motion / R2V' | 'Image' | 'Image Edit';

export interface ByteDanceModelDefinition {
  key: string;
  upstreamModelId: string;
  envOverrideKey?: string;
  name: string;
  category: ByteDanceModelCategory;
  costUnits: number;
  costIdr: number;
  maxPromptLength: number;
  maxPromptWords?: number;
  minPromptLength: number;
  maxImages: number;
  defaultDurationSeconds?: number;
  supportedDurations?: number[];
  defaultResolution?: '480p' | '720p' | '1080p';
  aspectRatios: string[];
  isR2V?: boolean;
  isSeedance25?: boolean;
  requiredFields: Array<'prompt' | 'image_url' | 'reference_image_urls'>;
  notes: string;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export const DOCUMENTED_BYTEDANCE_MODELS: ByteDanceModelDefinition[] = [
  {
    key: 'seedance_25_15s',
    upstreamModelId: 'seedance-2-5-260628',
    envOverrideKey: 'BYTEDANCE_SEEDANCE_15S_MODEL',
    name: 'Seedance 2.5 720p (15s)',
    category: 'Video',
    costUnits: 4,
    costIdr: 4000,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    minPromptLength: 1,
    maxImages: 30,
    defaultDurationSeconds: 15,
    supportedDurations: [5, 10, 15],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    isSeedance25: true,
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedance 2.5 official ModelArk 15s cinematic video synthesis (up to 30 refs & 30,000-word scripts).',
  },
  {
    key: 'seedance_25_30s',
    upstreamModelId: 'seedance-2-5-260628',
    envOverrideKey: 'BYTEDANCE_SEEDANCE_30S_MODEL',
    name: 'Seedance 2.5 720p (30s)',
    category: 'Video',
    costUnits: 7,
    costIdr: 4500,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    minPromptLength: 1,
    maxImages: 30,
    defaultDurationSeconds: 30,
    supportedDurations: [15, 20, 30],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    isSeedance25: true,
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedance 2.5 extended 30s multi-shot continuous temporal sequence (up to 30 refs & 30,000 words).',
  },
  {
    key: 'seedance_25_15s_r2v',
    upstreamModelId: 'seedance-2-5-260628',
    envOverrideKey: 'BYTEDANCE_SEEDANCE_R2V_MODEL',
    name: 'Seedance 2.5 R2V (15s)',
    category: 'Motion / R2V',
    costUnits: 4,
    costIdr: 4000,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    minPromptLength: 1,
    maxImages: 30,
    defaultDurationSeconds: 15,
    supportedDurations: [5, 10, 15],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    isR2V: true,
    isSeedance25: true,
    requiredFields: ['prompt', 'reference_image_urls'],
    notes: 'ByteDance Seedance 2.5 Omni Reference-to-Video with up to 30 identity/style plates.',
  },
  {
    key: 'seedance_25_30s_r2v',
    upstreamModelId: 'seedance-2-5-260628',
    envOverrideKey: 'BYTEDANCE_SEEDANCE_R2V_MODEL',
    name: 'Seedance 2.5 R2V (30s)',
    category: 'Motion / R2V',
    costUnits: 7,
    costIdr: 4500,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    minPromptLength: 1,
    maxImages: 30,
    defaultDurationSeconds: 30,
    supportedDurations: [15, 20, 30],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    isR2V: true,
    isSeedance25: true,
    requiredFields: ['prompt', 'reference_image_urls'],
    notes: 'ByteDance Seedance 2.5 30s extended Reference-to-Video with up to 30 identity & lighting plates.',
  },
  {
    key: 'seedance_20_15s',
    upstreamModelId: 'seedance-2-0-260128',
    name: 'Seedance 2.0 (15s)',
    category: 'Video',
    costUnits: 3,
    costIdr: 3000,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    minPromptLength: 1,
    maxImages: 30,
    defaultDurationSeconds: 15,
    supportedDurations: [5, 10, 15],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedance 2.0 general video synthesis.',
  },
  {
    key: 'seedance_15_pro',
    upstreamModelId: 'seedance-1-5-pro-251215',
    name: 'Seedance 1.5 Pro',
    category: 'Video',
    costUnits: 3,
    costIdr: 3000,
    maxPromptLength: 8000,
    minPromptLength: 1,
    maxImages: 4,
    defaultDurationSeconds: 10,
    supportedDurations: [5, 10],
    defaultResolution: '720p',
    aspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedance 1.5 Pro audio-visual synchronized video generation.',
  },
  {
    key: 'seedream_50_2k',
    upstreamModelId: 'seedream-5-0-260128',
    envOverrideKey: 'BYTEDANCE_SEEDREAM_MODEL',
    name: 'Seedream 5.0 (2K)',
    category: 'Image',
    costUnits: 1,
    costIdr: 400,
    maxPromptLength: 4000,
    minPromptLength: 1,
    maxImages: 6,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedream 5.0 2K editorial image generation via ModelArk Images API.',
  },
  {
    key: 'seedream_50_4k',
    upstreamModelId: 'seedream-5-0-260128',
    envOverrideKey: 'BYTEDANCE_SEEDREAM_MODEL',
    name: 'Seedream 5.0 (4K)',
    category: 'Image',
    costUnits: 2,
    costIdr: 800,
    maxPromptLength: 4000,
    minPromptLength: 1,
    maxImages: 6,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4', '21:9'],
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedream 5.0 4K ultra-high-detail editorial image generation.',
  },
  {
    key: 'seedream_45',
    upstreamModelId: 'seedream-4-5-251128',
    name: 'Seedream 4.5',
    category: 'Image',
    costUnits: 1,
    costIdr: 400,
    maxPromptLength: 4000,
    minPromptLength: 1,
    maxImages: 4,
    aspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    requiredFields: ['prompt'],
    notes: 'ByteDance Seedream 4.5 studio still frame synthesis.',
  },
];

export const MODEL_BY_KEY: Record<string, ByteDanceModelDefinition> = Object.fromEntries(
  DOCUMENTED_BYTEDANCE_MODELS.map((m) => [m.key, m])
);

export const MODEL_ALIASES: Record<string, string> = {
  'seedance-2.5-ref-video': 'seedance_25_15s_r2v',
  'seedance-2.5': 'seedance_25_15s',
  'seedance-2-5-260628': 'seedance_25_15s',
  'dreamina-seedance-2-5': 'seedance_25_15s',
  'seedance-2-0-260128': 'seedance_20_15s',
  'seedance-1-5-pro-251215': 'seedance_15_pro',
  seedance_20_15s_r2v: 'seedance_25_15s_r2v',
  seedance_20_mini: 'seedance_20_15s',
  seedance_20_mini_r2v: 'seedance_25_15s_r2v',
  seedream_50_lite: 'seedream_50_2k',
  seedream_50_pro: 'seedream_50_4k',
  seedream_5_fast_2k: 'seedream_50_2k',
  seedream_5_pro_2k: 'seedream_50_2k',
  'seedream-5-0-260128': 'seedream_50_2k',
};

/**
 * Resolves the upstream ByteDance ModelArk model ID (or endpoint ID `ep-...`)
 * using optional environment overrides before falling back to the catalog ID.
 */
export function resolveUpstreamByteDanceModel(modelKey: string): string {
  const canonicalKey = MODEL_ALIASES[modelKey] || modelKey;
  const def = MODEL_BY_KEY[canonicalKey];

  if (def?.envOverrideKey && process.env[def.envOverrideKey]?.trim()) {
    return process.env[def.envOverrideKey]!.trim();
  }

  if (def?.category === 'Image' || def?.category === 'Image Edit') {
    const globalImageOverride = (process.env.BYTEDANCE_SEEDREAM_MODEL || '').trim();
    if (globalImageOverride) return globalImageOverride;
    return def.upstreamModelId;
  }

  if (def) {
    const globalSeedanceOverride = (
      process.env.BYTEDANCE_SEEDANCE_MODEL ||
      process.env.ARK_SEEDANCE_MODEL ||
      process.env.ARK_ENDPOINT_ID ||
      ''
    ).trim();
    if (globalSeedanceOverride && def.isSeedance25) {
      return globalSeedanceOverride;
    }
    return def.upstreamModelId;
  }

  // If caller passed an explicit ByteDance ModelArk model ID or endpoint ID (e.g. ep-..., seedance-..., seedream-...)
  return modelKey;
}

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
      reason: `Private or loopback host "${host}" is not allowed. ByteDance ModelArk servers require a publicly reachable URL.`,
    };
  }

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
        reason: `Private IPv4 address "${host}" is not allowed. ByteDance ModelArk servers require a publicly accessible URL.`,
      };
    }
  }

  if (host.startsWith('fe80:') || host.startsWith('fc00:') || host.startsWith('fd00:')) {
    return {
      valid: false,
      reason: `Private IPv6 address "${host}" is not allowed.`,
    };
  }

  return { valid: true };
}

/**
 * Validates a job/task identifier to prevent path traversal or injection.
 */
export function validateJobCode(jobCode: unknown): { valid: boolean; sanitized?: string; error?: string } {
  if (typeof jobCode !== 'string' || !jobCode.trim()) {
    return { valid: false, error: 'Missing task or job identifier.' };
  }
  const trimmed = jobCode.trim();
  if (trimmed.length > 160 || !/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid task ID format. Only alphanumeric characters, hyphens, underscores, colons, and dots are allowed.',
    };
  }
  return { valid: true, sanitized: trimmed };
}

export interface ValidatedGenerateResult {
  valid: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  sanitizedPayload?: Record<string, unknown>;
  modelDef?: ByteDanceModelDefinition;
}

/**
 * Validates incoming generation request payload against ByteDance ModelArk rules.
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
  const maxPromptLen = modelDef ? modelDef.maxPromptLength : 240000;
  const maxPromptWords = modelDef?.maxPromptWords ?? 30000;
  const minPromptLen = modelDef ? modelDef.minPromptLength : 1;

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const wordCount = countWords(prompt);

  if ((modelDef?.requiredFields.includes('prompt') ?? true) && !prompt) {
    fieldErrors.prompt = `Prompt is required for model "${modelDef?.name || modelKey}".`;
  } else if (prompt && prompt.length < minPromptLen) {
    fieldErrors.prompt = `Prompt must be at least ${minPromptLen} characters.`;
  } else if (wordCount > maxPromptWords) {
    fieldErrors.prompt = `Prompt word count (${wordCount.toLocaleString()}) exceeds maximum limit of ${maxPromptWords.toLocaleString()} words.`;
  } else if (prompt.length > maxPromptLen) {
    fieldErrors.prompt = `Prompt length (${prompt.length.toLocaleString()}) exceeds maximum limit of ${maxPromptLen.toLocaleString()} characters.`;
  }

  // Single media URLs
  const singleUrlFields = ['image_url', 'end_image_url', 'video_url', 'audio_url'] as const;
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

  // Multi-image arrays
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
  const maxAllowedImages = modelDef?.maxImages ?? 30;
  if (dedupedRefs.length > 0) {
    if (dedupedRefs.length > maxAllowedImages) {
      fieldErrors.reference_image_urls = `Model "${modelDef?.name || modelKey}" supports at most ${maxAllowedImages} reference images (received ${dedupedRefs.length}).`;
    }
    for (let i = 0; i < dedupedRefs.length; i++) {
      const check = isPublicHttpUrl(dedupedRefs[i]);
      if (!check.valid) {
        fieldErrors.reference_image_urls = `Reference image #${i + 1}: ${check.reason}`;
        break;
      }
    }
  }

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

  const rawRating = typeof body.content_rating === 'string' ? body.content_rating.trim() : '';
  const contentRating: '18+' | 'standard' =
    rawRating === '18+' || body.mature_content === true ? '18+' : 'standard';

  const rawPhysics =
    typeof body.physics_priority === 'boolean'
      ? body.physics_priority
      : typeof body.results_priority === 'string'
      ? body.results_priority === 'cinematic_complex_physics'
      : true;

  const sanitizedPayload: Record<string, unknown> = {
    model: modelKey,
    prompt,
    content_rating: contentRating,
    physics_priority: rawPhysics,
    results_priority: rawPhysics ? 'cinematic_complex_physics' : 'standard',
  };

  if (typeof body.aspect_ratio === 'string' && body.aspect_ratio.trim()) {
    sanitizedPayload.aspect_ratio = body.aspect_ratio.trim();
  }

  if (typeof body.resolution === 'string' && body.resolution.trim()) {
    sanitizedPayload.resolution = body.resolution.trim().toLowerCase();
  } else if (modelDef?.defaultResolution) {
    sanitizedPayload.resolution = modelDef.defaultResolution;
  }

  if (typeof body.duration === 'number' && Number.isFinite(body.duration)) {
    sanitizedPayload.duration = Math.max(4, Math.min(30, Math.round(body.duration)));
  } else if (modelDef?.defaultDurationSeconds) {
    sanitizedPayload.duration = modelDef.defaultDurationSeconds;
  }

  if (typeof body.sound_enabled === 'boolean') {
    sanitizedPayload.sound_enabled = body.sound_enabled;
  }

  if (typeof body.camera_fixed === 'boolean') {
    sanitizedPayload.camera_fixed = body.camera_fixed;
  }

  if (typeof body.seed === 'number' && Number.isFinite(body.seed)) {
    sanitizedPayload.seed = Math.max(-1, Math.min(2147483647, Math.round(body.seed)));
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

  return {
    valid: true,
    sanitizedPayload,
    modelDef,
  };
}

export const SEEDANCE_25_PUBLISHED_KNOWLEDGE = {
  modelFamily: 'ByteDance / BytePlus Dreamina Seedance 2.5',
  architecture: 'Dual-Branch Diffusion Transformer (Decoupled Spatial Asset Synthesis & Temporal Motion Physics)',
  officialEndpoints: {
    baseUrlDefault: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    createVideoTask: 'POST /api/v3/contents/generations/tasks',
    pollVideoTask: 'GET /api/v3/contents/generations/tasks/{id}',
    cancelVideoTask: 'DELETE /api/v3/contents/generations/tasks/{id}',
    createImageTask: 'POST /api/v3/images/generations',
  },
  promptFormula: '[References (@Image1..N / @Video1)] -> [Subject & Action] -> [Environment & Lighting] -> [Camera Movement & Speed] -> [Film Stock & Style] -> [Audio & Constraints]',
  referenceTaggingRules: [
    'Assign explicit handle tags (@Image1, @Image2, @Video1, @Audio1) in the text prompt paired with exact element roles.',
    'Specify what each asset locks: e.g. "Reference @Image1 for facial geometry, eye color, and charcoal wool coat weave; lock @Image2 for architectural basalt corridor and top-down key light."',
    'For Next-Scene zero-mistake continuity, bind the extracted final frame of Scene N as role: "first_frame" AND include it as @Image1 so pose, light Kelvin, and velocity match seamlessly.',
    'Set role: "last_frame" alongside "first_frame" for controlled keyframe-to-keyframe interpolation.',
    'Supply a driving clip with role: "reference_video" (@Video1) to transfer exact camera trajectory, pacing, and blocking.',
  ],
  cameraMovementRules: [
    'Specify ONE primary camera displacement + speed modifier + framing target per shot beat; avoid contradictory simultaneous moves (e.g., never combine push-in and pull-out in the same beat).',
    'Differentiate physical camera displacement (Dolly Push-In, Truck Lateral, Crane Boom, Steadicam Orbit) from optical focal-length zoom (Snap Zoom, Slow Optical Push).',
    'Use camera_fixed: true when only subjects/weather should move inside a locked tripod frame; leave camera_fixed: false for any crane, dolly, handheld, or FPV trajectory.',
    'Anchor multi-second 15s–30s sequences with explicit timestamped beats ([00.0s-05.0s], [05.0s-10.0s], [10.0s-15.0s]) so temporal motion never stalls into frozen frames.',
  ],
  physicsAndContinuityRules: [
    'Use active dynamic physical verbs ("silk coat whips in crosswind vortex, raindrops shatter on wet asphalt") instead of static labels.',
    'Describe secondary inertial follow-through: garment drag, hair strand lag, footstep weight compression, subsurface light scattering, and 180-degree optical shutter blur at 24fps.',
    'Maintain single-direction lighting azimuth and color temperature across cut boundaries for seamless multi-scene chaining.',
  ],
  supportedSpecs: {
    maxReferenceImages: 30,
    maxPromptWords: 30000,
    supportedRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'],
    supportedDurations: [5, 10, 15, 20, 30],
    supportedResolutions: ['480p', '720p', '1080p'],
    parameters: ['ratio', 'duration', 'resolution', 'generate_audio', 'camera_fixed', 'watermark', 'seed'],
  },
} as const;

