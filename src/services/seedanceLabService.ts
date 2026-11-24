/**
 * VAIURE — SEEDANCE LAB SERVICE
 * Professional AI Video Production Workspace
 * Communicates exclusively with ByteDance BytePlus ModelArk API v3 via secure server-side routes,
 * sending verified Firebase Bearer tokens for user-scoped balance, generation, polling & history.
 */

import { getAuthHeaders } from './authTokenHelper';
import { CanonicalTierId } from '../types/seedancePlatform';

export type SeedanceModelKey =
  | 'seedance_25_15s'
  | 'seedance_25_30s'
  | 'seedance_25_15s_r2v'
  | 'seedance_25_30s_r2v';

export interface SeedanceModelInfo {
  id: SeedanceModelKey;
  name: string;
  label: string;
  durationSeconds: 15 | 30;
  isR2V: boolean;
  rateIdr: number;
  costGenerate: number;
  maxPromptLength: number;
  maxPromptWords: number;
  maxReferenceImages: number;
  nativeResolution: string;
  supportedAspectRatios: string[];
  description: string;
}

export const SEEDANCE_MODELS: Record<SeedanceModelKey, SeedanceModelInfo> = {
  seedance_25_15s: {
    id: 'seedance_25_15s',
    name: 'Seedance 2.5 720p (15s)',
    label: 'Seedance 2.5 — 15 Seconds',
    durationSeconds: 15,
    isR2V: false,
    rateIdr: 4000,
    costGenerate: 4,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    maxReferenceImages: 30,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'High-fidelity 15s cinematic motion, fluid cloth dynamics, and complex physics priority. Up to 30 reference images.',
  },
  seedance_25_30s: {
    id: 'seedance_25_30s',
    name: 'Seedance 2.5 720p (30s)',
    label: 'Seedance 2.5 — 30 Seconds',
    durationSeconds: 30,
    isR2V: false,
    rateIdr: 4500,
    costGenerate: 7,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    maxReferenceImages: 30,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Extended 30s continuous storytelling, sustained camera arcs, and complex physics consistency. Up to 30 reference images.',
  },
  seedance_25_15s_r2v: {
    id: 'seedance_25_15s_r2v',
    name: 'Seedance 2.5 R2V (15s)',
    label: 'Seedance 2.5 — 15 Seconds (Reference-to-Video)',
    durationSeconds: 15,
    isR2V: true,
    rateIdr: 4000,
    costGenerate: 4,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    maxReferenceImages: 30,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Reference-to-Video transfer locking up to 30 identity, wardrobe, lighting, and environment plates.',
  },
  seedance_25_30s_r2v: {
    id: 'seedance_25_30s_r2v',
    name: 'Seedance 2.5 R2V (30s)',
    label: 'Seedance 2.5 — 30 Seconds (Reference-to-Video)',
    durationSeconds: 30,
    isR2V: true,
    rateIdr: 4500,
    costGenerate: 7,
    maxPromptLength: 240000,
    maxPromptWords: 30000,
    maxReferenceImages: 30,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Full 30-second extended Reference-to-Video sequence locking up to 30 plates across complex physics trajectories.',
  },
};

export interface SeedanceGenerateParams {
  model: SeedanceModelKey | string;
  prompt: string;
  aspect_ratio: string;
  reference_image_urls?: string[];
  image_url?: string;
  end_image_url?: string;
  video_url?: string;
  audio_url?: string;
  sound_enabled?: boolean;
  camera_fixed?: boolean;
  seed?: number;
  duration?: number;
  resolution?: string;
  video_format?: string;
  quantity?: number;
  content_rating?: '18+' | 'standard';
  physics_priority?: boolean;
  idempotencyKey?: string;
}

export interface ByteDanceCatalogModelItem {
  key: string;
  upstreamModelId: string;
  resolvedUpstreamModelId: string;
  name: string;
  category: string;
  costUnits: number;
  cost_generate: number;
  costIdr: number;
  cost_idr: number;
  maxPromptLength: number;
  maxPromptWords?: number;
  maxImages: number;
  defaultDurationSeconds?: number;
  supportedDurations?: number[];
  defaultResolution?: '480p' | '720p' | '1080p';
  aspectRatios: string[];
  isR2V?: boolean;
  isSeedance25?: boolean;
  available: boolean;
  notes: string;
}

export interface ByteDanceModelsCatalogResponse {
  ok: boolean;
  source: string;
  total_models: number;
  serverKeyConfigured: boolean;
  baseUrl: string;
  models: ByteDanceCatalogModelItem[];
  publishedKnowledge?: {
    modelFamily: string;
    architecture: string;
    officialEndpoints: Record<string, string>;
    promptFormula: string;
    referenceTaggingRules: string[];
    cameraMovementRules: string[];
    physicsAndContinuityRules: string[];
    supportedSpecs: Record<string, unknown>;
  };
}

export interface MediaPromptAnalysisResult {
  ok: boolean;
  analyzedPrompt: string;
  negativePrompt: string;
  detectedSubjects: string;
  environmentAndLighting: string;
  cameraMotionAnalysis: string;
  physicsDynamics: string;
  recommendedCameraFixed: boolean;
  continuityAnchors: string[];
  engineUsed?: string;
}

export interface NextSceneContinuityResult {
  ok: boolean;
  nextScenePrompt: string;
  continuityChecklist: string[];
  recommendedDuration: number;
  recommendedCameraFixed: boolean;
  engineUsed?: string;
}

export interface SceneDirectorBreakdownResult {
  ok: boolean;
  directorTreatment: string;
  beatSheet: string[];
  engineUsed?: string;
}

export interface SeedanceGenerationJob {
  jobCode: string;
  model: SeedanceModelKey;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  duration: number;
  status: 'ready' | 'preparing' | 'submitting' | 'processing' | 'completed' | 'failed';
  progress: number;
  resultUrl?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  costGenerate?: number;
  remainingBalance?: number;
}

export interface SeedanceHistoryItem {
  id: string;
  job_code: string;
  model: string;
  upstream_model?: string;
  model_name: string;
  category: string;
  prompt: string;
  parameters: Record<string, unknown>;
  status: 'queued' | 'processing' | 'completed' | 'failed' | string;
  cost_generate: number;
  remaining_balance_generate?: number;
  result_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeedanceAccountBalance {
  authenticated?: boolean;
  userId?: string;
  tier?: CanonicalTierId;
  planName?: string;
  balance_generate: number;
  used_credits?: number;
  monthly_credits?: number;
  purchased_credits?: number;
  balance_idr_equivalent: number;
  unit_value_idr: number;
  api_stock_tokens_remaining?: number;
  serverKeyConfigured?: boolean;
  baseUrl?: string;
  source?: string;
}

export interface SeedanceHealthStatus {
  ok: boolean;
  upstreamConnected?: boolean;
  service?: string;
  version?: string;
  baseUrl?: string;
  serverKeyConfigured?: boolean;
  serverKeyStatus?: string;
  activeSeedanceModel?: string;
  upstreamError?: string;
  time?: string;
}

export class SeedanceApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

class SeedanceLabService {
  /**
   * Fetches real user-scoped account balance from server /api/ai/balance
   */
  async getBalance(): Promise<SeedanceAccountBalance> {
    const headers = await getAuthHeaders(false);
    const res = await fetch('/api/ai/balance', { headers });
    if (!res.ok) {
      throw new Error(`Failed to query balance: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      authenticated: Boolean(data.authenticated),
      userId: data.userId,
      tier: data.tier,
      planName: data.planName,
      balance_generate: data.balance_generate ?? 0,
      used_credits: data.used_credits ?? 0,
      monthly_credits: data.monthly_credits ?? 0,
      purchased_credits: data.purchased_credits ?? 0,
      balance_idr_equivalent: data.balance_idr_equivalent ?? 0,
      unit_value_idr: data.unit_value_idr ?? 600,
      api_stock_tokens_remaining: data.api_stock_tokens_remaining,
      serverKeyConfigured: data.serverKeyConfigured,
      baseUrl: data.baseUrl,
      source: data.source,
    };
  }

  /**
   * Fetches backend health from /api/ai/health
   */
  async getHealth(): Promise<SeedanceHealthStatus> {
    const res = await fetch('/api/ai/health');
    if (!res.ok) {
      return { ok: false, upstreamConnected: false, service: 'ByteDance ModelArk Offline' };
    }
    return await res.json();
  }

  /**
   * Uploads base64 or file data to server /api/ai/upload-media (authenticated)
   */
  async uploadMedia(dataUrl: string, fileName?: string): Promise<string> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/ai/upload-media', {
      method: 'POST',
      headers,
      body: JSON.stringify({ dataUrl, fileName }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !data.url) {
      throw new SeedanceApiError(
        data.error || 'Failed to host reference image.',
        res.status,
        data.code
      );
    }
    return data.url;
  }

  /**
   * Syncs live model catalog & published ByteDance Seedance 2.5 knowledge from /api/ai/models
   */
  async getModelsCatalog(): Promise<ByteDanceModelsCatalogResponse | null> {
    try {
      const res = await fetch('/api/ai/models');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Submits generation to /api/ai/generate with Firebase auth & idempotency protection
   */
  async submitGeneration(params: SeedanceGenerateParams): Promise<{
    jobCode: string;
    costGenerate: number;
    remainingBalance?: number;
    immediateResultUrl?: string;
    upstreamModel?: string;
    deduplicated?: boolean;
  }> {
    const payload: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt.trim(),
      aspect_ratio: params.aspect_ratio === 'Smart' ? '16:9' : params.aspect_ratio,
      content_rating: params.content_rating === '18+' ? '18+' : 'standard',
      physics_priority: params.physics_priority !== false,
      results_priority: params.physics_priority !== false ? 'cinematic_complex_physics' : 'balanced',
      quantity: params.quantity || 1,
    };

    if (params.idempotencyKey) {
      payload.idempotencyKey = params.idempotencyKey;
    }
    if (typeof params.sound_enabled === 'boolean') {
      payload.sound_enabled = params.sound_enabled;
    }
    if (typeof params.camera_fixed === 'boolean') {
      payload.camera_fixed = params.camera_fixed;
    }
    if (typeof params.seed === 'number' && Number.isFinite(params.seed)) {
      payload.seed = params.seed;
    }
    if (typeof params.duration === 'number' && Number.isFinite(params.duration)) {
      payload.duration = params.duration;
    }
    if (params.resolution) {
      payload.resolution = params.resolution;
    }
    if (params.image_url) {
      payload.image_url = params.image_url;
    }
    if (params.end_image_url) {
      payload.end_image_url = params.end_image_url;
    }
    if (params.video_url) {
      payload.video_url = params.video_url;
    }
    if (params.audio_url) {
      payload.audio_url = params.audio_url;
    }

    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      const sliced = params.reference_image_urls.slice(0, 30);
      payload.reference_image_urls = sliced;
      payload.image_urls = sliced;
      if (!payload.image_url) {
        payload.image_url = sliced[0];
      }
    }

    const headers = await getAuthHeaders(true);
    if (params.idempotencyKey) {
      headers['X-Idempotency-Key'] = params.idempotencyKey;
    }

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.ok || !data.job_code) {
      throw new SeedanceApiError(
        data.error || 'Generation request was rejected by server.',
        res.status,
        data.code
      );
    }

    return {
      jobCode: data.job_code,
      costGenerate: data.cost_generate ?? 4,
      remainingBalance: data.remaining_balance_generate,
      immediateResultUrl: data.result_url || data.outputUrl,
      upstreamModel: data.upstream_model,
      deduplicated: Boolean(data.deduplicated),
    };
  }

  /**
   * Analyzes connected image(s) and/or video frames via /api/prompt/analyze-media
   */
  async analyzeMediaPrompt(params: {
    images?: string[];
    videos?: string[];
    videoFrames?: string[];
    userNotes?: string;
    directorStyle?: string;
    cameraMovement?: string;
    durationSeconds?: number;
    physicsPriority?: boolean;
    contentRating?: '18+' | 'standard';
  }): Promise<MediaPromptAnalysisResult> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/prompt/analyze-media', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to analyze media prompt.');
    }
    return data;
  }

  /**
   * Synthesizes a flawless zero-mistake Next Scene prompt locked to the preceding scene's final frame
   */
  async continueNextScene(params: {
    previousPrompt?: string;
    lastFrameUrl?: string;
    additionalRefUrls?: string[];
    nextActionIntent?: string;
    directorStyle?: string;
    cameraMovement?: string;
    filmStock?: string;
    durationSeconds?: number;
    physicsPriority?: boolean;
    contentRating?: '18+' | 'standard';
  }): Promise<NextSceneContinuityResult> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/prompt/continue-scene', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to generate next scene continuity prompt.');
    }
    return data;
  }

  /**
   * Generates a Scene Director treatment and timestamped beat sheet
   */
  async runSceneDirector(params: {
    directorName: string;
    directorManifesto?: string;
    sceneConcept?: string;
    cameraMovement?: string;
    filmStock?: string;
    contrastRatio?: string;
    durationSeconds?: number;
  }): Promise<SceneDirectorBreakdownResult> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/prompt/director-breakdown', {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Failed to generate director treatment.');
    }
    return data;
  }

  /**
   * Optimizes a scene prompt for best cinematic fidelity and complex physics simulation
   */
  async optimizePromptPhysics(params: {
    prompt: string;
    durationSeconds: number;
    aspectRatio: string;
    physicsPriority: boolean;
    contentRating: '18+' | 'standard';
  }): Promise<{ optimizedPrompt: string; source?: string }> {
    const headers = await getAuthHeaders(true);
    const res = await fetch('/api/prompt/optimize', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        compiledPrompt: params.prompt,
        durationSeconds: params.durationSeconds,
        frameRate: '24fps',
        aspectRatio: params.aspectRatio,
        physicsPriority: params.physicsPriority,
        contentRating: params.contentRating,
      }),
    });
    if (!res.ok) {
      throw new Error('Failed to optimize prompt physics.');
    }
    const data = await res.json();
    return {
      optimizedPrompt: data.optimizedPrompt || params.prompt,
      source: data.source,
    };
  }

  /**
   * Polls job status from /api/ai/status/:jobCode (authenticated)
   */
  async pollJobStatus(jobCode: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    resultUrl?: string | null;
    lastFrameUrl?: string | null;
    usage?: Record<string, unknown>;
    refunded?: boolean;
    error?: string | null;
  }> {
    const headers = await getAuthHeaders(false);
    const res = await fetch(`/api/ai/status/${encodeURIComponent(jobCode)}`, { headers });
    if (!res.ok) {
      throw new Error(`Status polling failed with HTTP ${res.status}`);
    }
    const data = await res.json();
    const rawStatus = String(data.status || '').toLowerCase();

    if (rawStatus === 'completed' || Boolean(data.result_url || data.outputUrl)) {
      return {
        status: 'completed',
        progress: 100,
        resultUrl: data.result_url || data.outputUrl,
        lastFrameUrl: data.last_frame_url || null,
        usage: data.usage,
      };
    }

    if (rawStatus === 'failed' || rawStatus === 'cancelled') {
      return {
        status: 'failed',
        progress: 0,
        refunded: Boolean(data.refunded),
        error: data.error_message || data.error || 'Video generation failed upstream.',
      };
    }

    return {
      status: 'processing',
      progress: Math.min(95, Math.max(10, Number(data.progress) || 35)),
      resultUrl: null,
    };
  }

  /**
   * Fetches user-scoped generation history from /api/ai/history
   */
  async getHistory(): Promise<SeedanceHistoryItem[]> {
    const headers = await getAuthHeaders(false);
    const res = await fetch('/api/ai/history', { headers });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const allItems: SeedanceHistoryItem[] = Array.isArray(data.items) ? data.items : [];
    return allItems;
  }

  /**
   * Deletes a generation history entry (user-scoped, authenticated)
   */
  async deleteHistoryEntry(idOrJobCode: string): Promise<boolean> {
    try {
      const headers = await getAuthHeaders(false);
      const res = await fetch(`/api/ai/history/${encodeURIComponent(idOrJobCode)}`, {
        method: 'DELETE',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const seedanceLabService = new SeedanceLabService();
