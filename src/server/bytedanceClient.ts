/**
 * ByteDance BytePlus ModelArk API v3 — Server-Side Client
 * Handles authenticated upstream requests to ByteDance ModelArk endpoints:
 * - POST   /contents/generations/tasks      (Seedance Video Generation)
 * - GET    /contents/generations/tasks/{id} (Task Status & Result Polling)
 * - DELETE /contents/generations/tasks/{id} (Cancel / Delete Task)
 * - POST   /images/generations              (Seedream Image Generation)
 * - GET    /contents/generations/tasks?page_size=1 (Connectivity & Auth Probe)
 */

import crypto from 'crypto';
import {
  ByteDanceModelDefinition,
  DOCUMENTED_BYTEDANCE_MODELS,
  MODEL_BY_KEY,
  resolveUpstreamByteDanceModel,
  SEEDANCE_25_PUBLISHED_KNOWLEDGE,
} from './bytedanceSchema';

export const DEFAULT_BYTEDANCE_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';

export interface ByteDanceConfigStatus {
  configured: boolean;
  baseUrl: string;
  keyHint: string;
  activeSeedanceModel: string;
}

export interface ByteDanceUpstreamResponse<T = unknown> {
  ok: boolean;
  status: number;
  requestId: string;
  data?: T;
  error?: string;
  upstreamBaseUrl?: string;
}

function getConfiguredApiKeyRaw(): string {
  return (
    process.env.BYTEDANCE_API_KEY ||
    process.env.ARK_API_KEY ||
    process.env.BYTEPLUS_API_KEY ||
    ''
  ).trim();
}

function isPlaceholderKey(rawKey: string): boolean {
  if (!rawKey) return true;
  const upper = rawKey.toUpperCase();
  return (
    upper.startsWith('YOUR_') ||
    upper.startsWith('MY_') ||
    upper.startsWith('REPLACE_') ||
    upper === 'CHANGEME'
  );
}

/**
 * Redacts the configured ByteDance / Ark API key from any string to prevent secret leakage.
 */
export function redactSecret(input: string, apiKey?: string): string {
  if (!input) return input;
  let output = input;
  const envKey = apiKey || getConfiguredApiKeyRaw();
  if (envKey && envKey.length >= 4 && !isPlaceholderKey(envKey)) {
    output = output.split(envKey).join('[REDACTED_BYTEDANCE_KEY]');
  }
  output = output.replace(/(?:ark|sk|bp)[-_][a-zA-Z0-9_-]{12,}/g, '[REDACTED_BYTEDANCE_KEY]');
  return output;
}

export function getByteDanceConfigStatus(): ByteDanceConfigStatus {
  const rawKey = getConfiguredApiKeyRaw();
  const configured = !isPlaceholderKey(rawKey);
  const baseUrl = (
    process.env.BYTEDANCE_BASE_URL ||
    process.env.ARK_BASE_URL ||
    DEFAULT_BYTEDANCE_BASE_URL
  )
    .trim()
    .replace(/\/+$/, '');

  const activeSeedanceModel = resolveUpstreamByteDanceModel('seedance_25_15s');

  return {
    configured,
    baseUrl,
    keyHint: configured
      ? 'Configured on Server (Hidden)'
      : 'Missing Server Secret (BYTEDANCE_API_KEY / ARK_API_KEY)',
    activeSeedanceModel,
  };
}

function getApiKeyOrThrow(): string {
  const rawKey = getConfiguredApiKeyRaw();
  if (isPlaceholderKey(rawKey)) {
    throw new Error(
      'ByteDance ModelArk API key is not configured. Set BYTEDANCE_API_KEY or ARK_API_KEY in server environment secrets.'
    );
  }
  return rawKey;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export interface ByteDanceContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url';
  text?: string;
  image_url?: { url: string };
  video_url?: { url: string };
  audio_url?: { url: string };
  role?: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
}

export interface ByteDanceVideoTaskRequestBody {
  model: string;
  content: ByteDanceContentItem[];
  ratio?: string;
  duration?: number;
  resolution?: string;
  generate_audio?: boolean;
  camera_fixed?: boolean;
  seed?: number;
  watermark?: boolean;
}

/**
 * Builds an official BytePlus ModelArk v3 /contents/generations/tasks JSON request body.
 */
export function buildByteDanceVideoTaskPayload(
  sanitizedPayload: Record<string, unknown>,
  modelDef?: ByteDanceModelDefinition
): ByteDanceVideoTaskRequestBody {
  const modelKey = String(sanitizedPayload.model || 'seedance_25_15s');
  const upstreamModel = resolveUpstreamByteDanceModel(modelKey);
  const rawPrompt = typeof sanitizedPayload.prompt === 'string' ? sanitizedPayload.prompt.trim() : '';
  const physicsPriority = sanitizedPayload.physics_priority !== false;
  const contentRating = sanitizedPayload.content_rating === '18+' ? '18+' : 'standard';

  const directiveParts: string[] = [];
  if (physicsPriority && !rawPrompt.includes('COMPLEX PHYSICS')) {
    directiveParts.push(
      '[RESULTS PRIORITY — BEST CINEMATIC COMPLEX PHYSICS]: Prioritize physically grounded multi-body dynamics, realistic cloth/hair aerodynamic drape, fluid vorticity, gravitational weight, collision momentum, micro-surface PBR specular response, and true 24fps optical motion blur.'
    );
  }
  if (contentRating === '18+' && !rawPrompt.includes('MATURE CINEMA RATING')) {
    directiveParts.push(
      '[MATURE CINEMA MODE 18+]: Uncompromising adult dramatic cinema tone, intense gritty realism, chiaroscuro theatrical lighting, dramatic tension.'
    );
  }

  const prompt =
    rawPrompt && directiveParts.length > 0
      ? `${rawPrompt}\n\n${directiveParts.join(' ')}`
      : rawPrompt;

  const content: ByteDanceContentItem[] = [];
  if (prompt) {
    content.push({
      type: 'text',
      text: prompt,
    });
  }

  const refUrls = Array.isArray(sanitizedPayload.reference_image_urls)
    ? sanitizedPayload.reference_image_urls.filter((u): u is string => typeof u === 'string' && Boolean(u))
    : [];
  const firstFrameUrl =
    typeof sanitizedPayload.image_url === 'string' ? sanitizedPayload.image_url : undefined;
  const endFrameUrl =
    typeof sanitizedPayload.end_image_url === 'string' ? sanitizedPayload.end_image_url : undefined;

  const isR2V = Boolean(modelDef?.isR2V || modelKey.includes('r2v') || refUrls.length > 1);

  if (isR2V) {
    const plates = refUrls.length > 0 ? refUrls : firstFrameUrl ? [firstFrameUrl] : [];
    for (const url of plates) {
      content.push({
        type: 'image_url',
        image_url: { url },
        role: 'reference_image',
      });
    }
  } else {
    if (firstFrameUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: firstFrameUrl },
        role: 'first_frame',
      });
    }
    if (endFrameUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: endFrameUrl },
        role: 'last_frame',
      });
    }
  }

  if (typeof sanitizedPayload.video_url === 'string' && sanitizedPayload.video_url) {
    content.push({
      type: 'video_url',
      video_url: { url: sanitizedPayload.video_url },
      role: 'reference_video',
    });
  }

  if (typeof sanitizedPayload.audio_url === 'string' && sanitizedPayload.audio_url) {
    content.push({
      type: 'audio_url',
      audio_url: { url: sanitizedPayload.audio_url },
      role: 'reference_audio',
    });
  }

  const rawRatio =
    typeof sanitizedPayload.aspect_ratio === 'string' && sanitizedPayload.aspect_ratio.trim()
      ? sanitizedPayload.aspect_ratio.trim()
      : '16:9';

  const ratio =
    !isR2V && firstFrameUrl && !sanitizedPayload.aspect_ratio ? 'adaptive' : rawRatio;

  const duration =
    typeof sanitizedPayload.duration === 'number'
      ? sanitizedPayload.duration
      : modelDef?.defaultDurationSeconds || 15;

  const resolution =
    typeof sanitizedPayload.resolution === 'string'
      ? sanitizedPayload.resolution.toLowerCase()
      : modelDef?.defaultResolution || '720p';

  const requestBody: ByteDanceVideoTaskRequestBody = {
    model: upstreamModel,
    content,
    ratio,
    duration,
    resolution,
    watermark: false,
  };

  if (typeof sanitizedPayload.sound_enabled === 'boolean') {
    requestBody.generate_audio = sanitizedPayload.sound_enabled;
  }

  if (typeof sanitizedPayload.camera_fixed === 'boolean') {
    requestBody.camera_fixed = sanitizedPayload.camera_fixed;
  }

  if (typeof sanitizedPayload.seed === 'number' && Number.isFinite(sanitizedPayload.seed)) {
    requestBody.seed = sanitizedPayload.seed;
  }

  return requestBody;
}

function extractByteDanceErrorMessage(
  parsed: Record<string, unknown>,
  fallbackStatus: number,
  apiKey?: string
): string {
  const errObj =
    parsed.error && typeof parsed.error === 'object'
      ? (parsed.error as Record<string, unknown>)
      : null;
  const raw =
    (errObj && typeof errObj.message === 'string' && errObj.message) ||
    (typeof parsed.message === 'string' && parsed.message) ||
    (typeof parsed.error === 'string' && parsed.error) ||
    `ByteDance ModelArk API returned HTTP ${fallbackStatus}`;
  return redactSecret(raw, apiKey);
}

export class ByteDanceClient {
  /**
   * 1. Connectivity & Auth Probe against ByteDance BytePlus ModelArk API v3
   */
  async checkHealth(): Promise<
    ByteDanceUpstreamResponse<{
      ok: boolean;
      upstreamConnected: boolean;
      service: string;
      version: string;
      time: string;
      serverKeyConfigured: boolean;
      serverKeyStatus: string;
      baseUrl: string;
      activeSeedanceModel: string;
      upstreamError?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getByteDanceConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error: 'BYTEDANCE_API_KEY / ARK_API_KEY is not configured on the server.',
        data: {
          ok: false,
          upstreamConnected: false,
          service: 'ByteDance BytePlus ModelArk API v3',
          version: 'v3',
          time: new Date().toISOString(),
          serverKeyConfigured: false,
          serverKeyStatus: config.keyHint,
          baseUrl: config.baseUrl,
          activeSeedanceModel: config.activeSeedanceModel,
        },
      };
    }

    const apiKey = getApiKeyOrThrow();
    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl}/contents/generations/tasks?page_size=1`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'X-Request-Id': requestId,
          },
        },
        10000
      );

      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }

      if (res.ok) {
        return {
          ok: true,
          status: 200,
          requestId,
          upstreamBaseUrl: config.baseUrl,
          data: {
            ok: true,
            upstreamConnected: true,
            service: 'ByteDance BytePlus ModelArk API v3',
            version: 'v3',
            time: new Date().toISOString(),
            serverKeyConfigured: true,
            serverKeyStatus: 'Authenticated with BytePlus ModelArk',
            baseUrl: config.baseUrl,
            activeSeedanceModel: config.activeSeedanceModel,
          },
        };
      }

      const upstreamError = extractByteDanceErrorMessage(parsed, res.status, apiKey);
      return {
        ok: false,
        status: res.status,
        requestId,
        error: upstreamError,
        data: {
          ok: false,
          upstreamConnected: false,
          service: 'ByteDance BytePlus ModelArk API v3',
          version: 'v3',
          time: new Date().toISOString(),
          serverKeyConfigured: true,
          serverKeyStatus: `Upstream Auth/Endpoint Error (HTTP ${res.status})`,
          baseUrl: config.baseUrl,
          activeSeedanceModel: config.activeSeedanceModel,
          upstreamError,
        },
      };
    } catch (err: unknown) {
      const errMsg = redactSecret(
        err instanceof Error ? err.message : 'Network error connecting to ByteDance ModelArk',
        apiKey
      );
      return {
        ok: false,
        status: 503,
        requestId,
        error: errMsg,
        data: {
          ok: false,
          upstreamConnected: false,
          service: 'ByteDance BytePlus ModelArk API v3',
          version: 'v3',
          time: new Date().toISOString(),
          serverKeyConfigured: true,
          serverKeyStatus: 'Upstream Connection Error',
          baseUrl: config.baseUrl,
          activeSeedanceModel: config.activeSeedanceModel,
          upstreamError: errMsg,
        },
      };
    }
  }

  /**
   * 2. Model Catalog (returns Seedance & Seedream models mapped to real ModelArk IDs)
   */
  async getModels(): Promise<
    ByteDanceUpstreamResponse<{
      source: 'bytedance_modelark';
      total_models: number;
      serverKeyConfigured: boolean;
      baseUrl: string;
      publishedKnowledge: typeof SEEDANCE_25_PUBLISHED_KNOWLEDGE;
      models: Array<
        ByteDanceModelDefinition & {
          resolvedUpstreamModelId: string;
          cost_generate: number;
          cost_idr: number;
          available: boolean;
        }
      >;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getByteDanceConfigStatus();

    const models = DOCUMENTED_BYTEDANCE_MODELS.map((m) => ({
      ...m,
      resolvedUpstreamModelId: resolveUpstreamByteDanceModel(m.key),
      cost_generate: m.costUnits,
      cost_idr: m.costIdr,
      available: config.configured,
    }));

    return {
      ok: true,
      status: 200,
      requestId,
      upstreamBaseUrl: config.baseUrl,
      data: {
        source: 'bytedance_modelark',
        total_models: models.length,
        serverKeyConfigured: config.configured,
        baseUrl: config.baseUrl,
        publishedKnowledge: SEEDANCE_25_PUBLISHED_KNOWLEDGE,
        models,
      },
    };
  }

  /**
   * 3. Submit Generation (Video via /contents/generations/tasks or Image via /images/generations)
   */
  async submitGenerate(sanitizedPayload: Record<string, unknown>): Promise<
    ByteDanceUpstreamResponse<{
      ok: boolean;
      job_code: string;
      task_id: string;
      status: string;
      model: string;
      upstream_model: string;
      cost_generate: number;
      result_url?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getByteDanceConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error:
          'ByteDance ModelArk API key is not configured on the server. Set BYTEDANCE_API_KEY or ARK_API_KEY in server environment secrets.',
      };
    }

    const apiKey = getApiKeyOrThrow();
    const modelKey = String(sanitizedPayload.model || 'seedance_25_15s');
    const modelDef = MODEL_BY_KEY[modelKey];
    const upstreamModel = resolveUpstreamByteDanceModel(modelKey);
    const isImageModel =
      modelDef?.category === 'Image' ||
      modelDef?.category === 'Image Edit' ||
      modelKey.startsWith('seedream');

    if (isImageModel) {
      return this.submitImageGeneration(requestId, config.baseUrl, apiKey, modelKey, upstreamModel, modelDef, sanitizedPayload);
    }

    const videoBody = buildByteDanceVideoTaskPayload(sanitizedPayload, modelDef);

    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl}/contents/generations/tasks`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify(videoBody),
        },
        25000
      );

      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }

      const nestedData =
        parsed.data && typeof parsed.data === 'object'
          ? (parsed.data as Record<string, unknown>)
          : {};

      const taskId =
        typeof parsed.id === 'string'
          ? parsed.id
          : typeof nestedData.id === 'string'
          ? nestedData.id
          : typeof parsed.task_id === 'string'
          ? parsed.task_id
          : undefined;

      if (res.ok && taskId) {
        const rawStatus = String(parsed.status || 'queued').toLowerCase();
        const normalizedStatus =
          rawStatus === 'succeeded'
            ? 'completed'
            : rawStatus === 'running'
            ? 'processing'
            : rawStatus === 'failed' || rawStatus === 'cancelled'
            ? 'failed'
            : 'queued';

        const contentObj =
          parsed.content && typeof parsed.content === 'object'
            ? (parsed.content as Record<string, unknown>)
            : null;
        const resultUrl =
          contentObj && typeof contentObj.video_url === 'string' ? contentObj.video_url : undefined;

        return {
          ok: true,
          status: res.status,
          requestId,
          upstreamBaseUrl: config.baseUrl,
          data: {
            ok: true,
            job_code: taskId,
            task_id: taskId,
            status: normalizedStatus,
            model: modelKey,
            upstream_model: videoBody.model,
            cost_generate: modelDef?.costUnits ?? 4,
            result_url: resultUrl,
          },
        };
      }

      return {
        ok: false,
        status: res.status || 502,
        requestId,
        upstreamBaseUrl: config.baseUrl,
        error: extractByteDanceErrorMessage(parsed, res.status, apiKey),
      };
    } catch (err: unknown) {
      const msg = redactSecret(
        err instanceof Error ? err.message : 'Network error calling ByteDance ModelArk /contents/generations/tasks',
        apiKey
      );
      return {
        ok: false,
        status: 504,
        requestId,
        upstreamBaseUrl: config.baseUrl,
        error: `ByteDance ModelArk request failed: ${msg}`,
      };
    }
  }

  private async submitImageGeneration(
    requestId: string,
    baseUrl: string,
    apiKey: string,
    modelKey: string,
    upstreamModel: string,
    modelDef: ByteDanceModelDefinition | undefined,
    sanitizedPayload: Record<string, unknown>
  ): Promise<
    ByteDanceUpstreamResponse<{
      ok: boolean;
      job_code: string;
      task_id: string;
      status: string;
      model: string;
      upstream_model: string;
      cost_generate: number;
      result_url?: string;
    }>
  > {
    const size = modelKey.includes('4k') ? '4K' : '2K';
    const imageBody: Record<string, unknown> = {
      model: upstreamModel,
      prompt: String(sanitizedPayload.prompt || ''),
      size,
      response_format: 'url',
      watermark: false,
    };

    if (Array.isArray(sanitizedPayload.reference_image_urls) && sanitizedPayload.reference_image_urls.length > 0) {
      imageBody.image = sanitizedPayload.reference_image_urls;
    } else if (typeof sanitizedPayload.image_url === 'string') {
      imageBody.image = sanitizedPayload.image_url;
    }

    try {
      const res = await fetchWithTimeout(
        `${baseUrl}/images/generations`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify(imageBody),
        },
        30000
      );

      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }

      const dataArr = Array.isArray(parsed.data) ? (parsed.data as Array<Record<string, unknown>>) : [];
      const firstUrl = dataArr[0] && typeof dataArr[0].url === 'string' ? dataArr[0].url : undefined;

      if (res.ok && firstUrl) {
        const jobCode = `bd-img-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        return {
          ok: true,
          status: 200,
          requestId,
          upstreamBaseUrl: baseUrl,
          data: {
            ok: true,
            job_code: jobCode,
            task_id: jobCode,
            status: 'completed',
            model: modelKey,
            upstream_model: upstreamModel,
            cost_generate: modelDef?.costUnits ?? 1,
            result_url: firstUrl,
          },
        };
      }

      return {
        ok: false,
        status: res.status || 502,
        requestId,
        upstreamBaseUrl: baseUrl,
        error: extractByteDanceErrorMessage(parsed, res.status, apiKey),
      };
    } catch (err: unknown) {
      const msg = redactSecret(
        err instanceof Error ? err.message : 'Network error calling ByteDance ModelArk /images/generations',
        apiKey
      );
      return {
        ok: false,
        status: 504,
        requestId,
        upstreamBaseUrl: baseUrl,
        error: `ByteDance ModelArk image request failed: ${msg}`,
      };
    }
  }

  /**
   * 4. GET /contents/generations/tasks/{id} (Real-time task status & video URL retrieval)
   */
  async getTaskStatus(taskId: string): Promise<
    ByteDanceUpstreamResponse<{
      ok: boolean;
      job_code: string;
      task_id: string;
      model?: string;
      status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | string;
      progress: number;
      result_url?: string | null;
      last_frame_url?: string | null;
      error_message?: string | null;
      usage?: Record<string, unknown>;
      created_at?: string;
      updated_at?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getByteDanceConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error: 'BYTEDANCE_API_KEY / ARK_API_KEY is not configured on the server.',
      };
    }

    const apiKey = getApiKeyOrThrow();

    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'X-Request-Id': requestId,
          },
        },
        15000
      );

      const text = await res.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = {};
      }

      if (res.ok) {
        const rawStatus = String(parsed.status || 'queued').toLowerCase();
        const contentObj =
          parsed.content && typeof parsed.content === 'object'
            ? (parsed.content as Record<string, unknown>)
            : null;
        const videoUrl =
          contentObj && typeof contentObj.video_url === 'string' ? contentObj.video_url : null;
        const lastFrameUrl =
          contentObj && typeof contentObj.last_frame_url === 'string'
            ? contentObj.last_frame_url
            : null;

        let normalizedStatus: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' =
          'processing';
        let progress = 45;

        if (rawStatus === 'succeeded' || Boolean(videoUrl)) {
          normalizedStatus = 'completed';
          progress = 100;
        } else if (rawStatus === 'queued') {
          normalizedStatus = 'queued';
          progress = 15;
        } else if (rawStatus === 'running') {
          normalizedStatus = 'processing';
          progress = 60;
        } else if (rawStatus === 'cancelled') {
          normalizedStatus = 'cancelled';
          progress = 0;
        } else if (rawStatus === 'failed' || rawStatus === 'expired') {
          normalizedStatus = 'failed';
          progress = 0;
        }

        const errObj =
          parsed.error && typeof parsed.error === 'object'
            ? (parsed.error as Record<string, unknown>)
            : null;
        const errorMessage =
          errObj && typeof errObj.message === 'string'
            ? redactSecret(errObj.message, apiKey)
            : normalizedStatus === 'failed'
            ? 'ByteDance ModelArk video task failed.'
            : null;

        const createdAt =
          typeof parsed.created_at === 'number'
            ? new Date(parsed.created_at * 1000).toISOString()
            : typeof parsed.created_at === 'string'
            ? parsed.created_at
            : undefined;
        const updatedAt =
          typeof parsed.updated_at === 'number'
            ? new Date(parsed.updated_at * 1000).toISOString()
            : typeof parsed.updated_at === 'string'
            ? parsed.updated_at
            : undefined;

        return {
          ok: true,
          status: 200,
          requestId,
          upstreamBaseUrl: config.baseUrl,
          data: {
            ok: true,
            job_code: typeof parsed.id === 'string' ? parsed.id : taskId,
            task_id: typeof parsed.id === 'string' ? parsed.id : taskId,
            model: typeof parsed.model === 'string' ? parsed.model : undefined,
            status: normalizedStatus,
            progress,
            result_url: videoUrl,
            last_frame_url: lastFrameUrl,
            error_message: errorMessage,
            usage:
              parsed.usage && typeof parsed.usage === 'object'
                ? (parsed.usage as Record<string, unknown>)
                : undefined,
            created_at: createdAt,
            updated_at: updatedAt,
          },
        };
      }

      return {
        ok: false,
        status: res.status || 502,
        requestId,
        upstreamBaseUrl: config.baseUrl,
        error: extractByteDanceErrorMessage(parsed, res.status, apiKey),
      };
    } catch (err: unknown) {
      const msg = redactSecret(
        err instanceof Error ? err.message : 'Network error polling ByteDance task status',
        apiKey
      );
      return {
        ok: false,
        status: 504,
        requestId,
        upstreamBaseUrl: config.baseUrl,
        error: msg,
      };
    }
  }

  /**
   * 5. DELETE /contents/generations/tasks/{id}
   */
  async deleteTask(taskId: string): Promise<ByteDanceUpstreamResponse<{ ok: boolean; deleted: boolean }>> {
    const requestId = crypto.randomUUID();
    const config = getByteDanceConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error: 'BYTEDANCE_API_KEY / ARK_API_KEY is not configured.',
      };
    }

    const apiKey = getApiKeyOrThrow();
    try {
      const res = await fetchWithTimeout(
        `${config.baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'X-Request-Id': requestId,
          },
        },
        10000
      );

      return {
        ok: res.ok,
        status: res.status,
        requestId,
        upstreamBaseUrl: config.baseUrl,
        data: { ok: res.ok, deleted: res.ok },
      };
    } catch (err: unknown) {
      return {
        ok: false,
        status: 502,
        requestId,
        error: redactSecret(err instanceof Error ? err.message : 'Failed to cancel ByteDance task', apiKey),
      };
    }
  }
}

export const byteDanceClient = new ByteDanceClient();
