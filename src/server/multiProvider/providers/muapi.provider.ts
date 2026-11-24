/**
 * Provider B — MUAPI Seedance 2.5 Spicy Adapter (and future MUAPI endpoints)
 * Client: vaiurenetwoek
 * Model ID: muapi/seedance-2.5-spicy-image-to-video
 * Submit: POST https://api.muapi.ai/api/v1/seedance-2.5-spicy-image-to-video
 * Poll:   GET  https://api.muapi.ai/api/v1/predictions/{request_id}/result
 * Header: x-api-key: MUAPIAPP_API_KEY
 *
 * Strictly submits ONLY the supported MUAPI parameters and never exposes API keys.
 */

import {
  GenerationResolution,
  NormalizedJobStatus,
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderModelDefinition,
  UnifiedGenerationInput,
} from '../../../types/multiProvider';
import { validatePublicHttpUrl } from '../../securityMiddleware';
import {
  formatUsd,
  lookupUsdMatrixCost,
  MUAPI_SEEDANCE_25_SPICY_MODEL_ID,
  MUAPI_SPICY_USD_PRICING_MATRIX,
  roundUsd,
} from '../config/pricing.config';
import { providerConfigStore } from '../config/provider.config';
import {
  ProviderPollResponse,
  ProviderSubmissionResponse,
  VideoProviderAdapter,
} from './provider.types';

export type MuapiWireResolution = '480p' | '720p' | '1080p' | '4k';

export interface MuapiSpicySubmitPayload {
  prompt: string;
  image_url: string;
  last_image?: string;
  resolution: MuapiWireResolution;
  duration: number;
  generate_audio: boolean;
  camera_fixed: boolean;
  high_bitrate: boolean;
  draft: boolean;
  draft_request_id?: string;
}

export function redactMuapiSecrets(message: string, knownKey?: string): string {
  let out = String(message || '');
  const envKeys = [process.env.MUAPIAPP_API_KEY, process.env.MUAPI_API_KEY, knownKey];
  for (const raw of envKeys) {
    const secret = (raw || '').trim();
    if (secret.length >= 6) {
      out = out.split(secret).join('[REDACTED_MUAPI_KEY]');
    }
  }
  out = out.replace(/x-api-key[:=]\s*[a-zA-Z0-9._-]+/gi, 'x-api-key:[REDACTED]');
  out = out.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
  return out;
}

function maskKeyForTrace(key: string): string {
  const k = key.trim();
  if (k.length <= 4) return '****';
  return `****${k.slice(-4)}`;
}

/**
 * Strictly constructs the MUAPI request payload with ONLY supported fields:
 * prompt, image_url, last_image, resolution, duration, generate_audio,
 * camera_fixed, high_bitrate, draft, draft_request_id
 */
export function buildMuapiPayload(input: UnifiedGenerationInput): {
  valid: boolean;
  payload?: MuapiSpicySubmitPayload;
  error?: string;
} {
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  if (!prompt) {
    return { valid: false, error: 'Prompt is required for Seedance 2.5 Spicy.' };
  }

  const imageUrl = typeof input.image_url === 'string' ? input.image_url.trim() : '';
  if (!imageUrl) {
    return {
      valid: false,
      error: 'Start image URL (image_url) is required for MUAPI Seedance 2.5 Spicy Image-to-Video.',
    };
  }
  const imageCheck = validatePublicHttpUrl(imageUrl);
  if (!imageCheck.valid) {
    return {
      valid: false,
      error: `Invalid start image_url: ${imageCheck.reason || 'Must be a publicly reachable HTTP/HTTPS URL.'}`,
    };
  }

  const isDraft = Boolean(input.draft);
  // MUAPI wire spec requires lowercase "480p" | "720p" | "1080p" | "4k"
  const effectiveWireResolution: MuapiWireResolution = isDraft
    ? '480p'
    : input.resolution === '4K' || String(input.resolution).toLowerCase() === '4k'
    ? '4k'
    : input.resolution === '1080p'
    ? '1080p'
    : input.resolution === '480p'
    ? '480p'
    : '720p';

  const duration = Number(input.duration);
  if (!Number.isFinite(duration) || duration <= 0) {
    return { valid: false, error: 'Duration must be a valid positive number of seconds.' };
  }

  const payload: MuapiSpicySubmitPayload = {
    prompt,
    image_url: imageUrl,
    resolution: effectiveWireResolution,
    duration,
    generate_audio: input.generate_audio !== false,
    camera_fixed: Boolean(input.camera_fixed),
    high_bitrate: Boolean(input.high_bitrate),
    draft: isDraft,
  };

  if (typeof input.last_image === 'string' && input.last_image.trim()) {
    const lastCheck = validatePublicHttpUrl(input.last_image.trim());
    if (!lastCheck.valid) {
      return {
        valid: false,
        error: `Invalid last_image URL: ${lastCheck.reason || 'Must be a publicly reachable HTTP/HTTPS URL.'}`,
      };
    }
    payload.last_image = input.last_image.trim();
  }

  if (typeof input.draft_request_id === 'string' && input.draft_request_id.trim()) {
    const cleanDraftReqId = input.draft_request_id.trim();
    if (!/^[a-zA-Z0-9_.:-]+$/.test(cleanDraftReqId) || cleanDraftReqId.length > 160) {
      return { valid: false, error: 'Invalid draft_request_id format.' };
    }
    payload.draft_request_id = cleanDraftReqId;
  }

  return { valid: true, payload };
}

export function normalizeMuapiStatus(rawStatus: unknown): NormalizedJobStatus {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'completed' || s === 'succeeded' || s === 'success' || s === 'done') {
    return 'completed';
  }
  if (s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled' || s === 'rejected') {
    return 'failed';
  }
  if (s === 'processing' || s === 'in_progress' || s === 'running' || s === 'starting') {
    return 'processing';
  }
  return 'pending';
}

export function extractMuapiOutputs(raw: any): string[] {
  const candidates =
    raw?.outputs ??
    raw?.output ??
    raw?.data?.outputs ??
    raw?.data?.output ??
    raw?.result?.outputs ??
    [];
  const list = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof item.url === 'string') {
        return item.url.trim();
      }
      return '';
    })
    .filter((u) => Boolean(u && /^https?:\/\//i.test(u)));
}

export function extractMuapiError(raw: any): string | undefined {
  const err =
    raw?.error ??
    raw?.data?.error ??
    raw?.detail ??
    raw?.message;
  if (!err) return undefined;
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && typeof err.message === 'string') return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export class MuapiProviderAdapter implements VideoProviderAdapter {
  readonly providerId = 'muapi' as const;

  getCapabilities(): ProviderConfigPublic {
    const cfg = providerConfigStore.getInternalProvider('muapi');
    if (!cfg) {
      throw new Error('MUAPI provider configuration missing.');
    }
    return providerConfigStore.toPublicConfig(cfg);
  }

  calculateEstimatedPrice(
    model: ProviderModelDefinition,
    input: {
      resolution: UnifiedGenerationInput['resolution'];
      duration: number;
      draft?: boolean;
    }
  ): PriceEstimateBreakdown {
    const effectiveResolution: GenerationResolution = input.draft ? '480p' : input.resolution;
    const matrix =
      model.usdPricingMatrix ||
      (model.modelId === MUAPI_SEEDANCE_25_SPICY_MODEL_ID
        ? MUAPI_SPICY_USD_PRICING_MATRIX
        : undefined);

    const baseCost = lookupUsdMatrixCost(matrix, effectiveResolution, input.duration);
    if (baseCost === null) {
      throw new Error(
        `No pricing rule configured for "${model.displayName}" at ${effectiveResolution} / ${input.duration}s.`
      );
    }

    const markupPct = Math.max(0, Number(model.appMarkupPercent || 0));
    const markupFlat = Math.max(0, Number(model.appMarkupFlatUsd || 0));
    const appMarkupUsd = roundUsd((baseCost * markupPct) / 100 + markupFlat);
    const finalPriceUsd = roundUsd(baseCost + appMarkupUsd);

    const providerCfg = providerConfigStore.getInternalProvider('muapi');
    const creditsPerUsd = Math.max(1, Number(providerCfg?.creditsPerUsd || 27));
    const creditsRequired = Math.max(1, Math.ceil(finalPriceUsd * creditsPerUsd));

    return {
      provider: 'muapi',
      modelId: model.modelId,
      effectiveResolution,
      duration: input.duration,
      draft: Boolean(input.draft),
      currency: 'USD',
      providerCostUsd: baseCost,
      appMarkupUsd,
      finalPriceUsd,
      creditsRequired,
      displayLabel: formatUsd(finalPriceUsd),
      billingMode: 'USD',
    };
  }

  async submitGeneration(
    model: ProviderModelDefinition,
    input: UnifiedGenerationInput,
    options?: { publicOrigin?: string; webhookUrl?: string }
  ): Promise<ProviderSubmissionResponse> {
    const apiKey = providerConfigStore.getProviderApiKey('muapi');
    const providerCfg = providerConfigStore.getInternalProvider('muapi');
    const baseUrl = (providerCfg?.baseUrl || 'https://api.muapi.ai/api/v1').replace(/\/+$/, '');
    const rawSubmitEndpoint =
      model.submitEndpoint?.trim() || `${baseUrl}/seedance-2.5-spicy-image-to-video`;
    const submitEndpoint = options?.webhookUrl
      ? `${rawSubmitEndpoint}${rawSubmitEndpoint.includes('?') ? '&' : '?'}webhook=${encodeURIComponent(
          options.webhookUrl
        )}`
      : rawSubmitEndpoint;
    const maskedEndpointForTrace = options?.webhookUrl
      ? `${rawSubmitEndpoint}?webhook=${encodeURIComponent(options.webhookUrl.split('?')[0])}`
      : rawSubmitEndpoint;

    if (!apiKey) {
      return {
        ok: false,
        httpStatus: 503,
        status: 'failed',
        endpointCalled: maskedEndpointForTrace,
        error:
          'MUAPI API key is not configured on the server (MUAPIAPP_API_KEY / MUAPI_API_KEY). Configure it in server environment secrets or the Admin Provider Console.',
      };
    }

    const built = buildMuapiPayload(input);
    if (!built.valid || !built.payload) {
      return {
        ok: false,
        httpStatus: 400,
        status: 'failed',
        endpointCalled: maskedEndpointForTrace,
        error: built.error || 'Invalid MUAPI generation payload.',
      };
    }

    const requestHeadersMasked = {
      'Content-Type': 'application/json',
      'x-api-key': maskKeyForTrace(apiKey),
    };
    const startMs = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(submitEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(built.payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startMs;
      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { message: rawText };
      }

      if (!response.ok) {
        const errMsg =
          extractMuapiError(data) ||
          `MUAPI returned HTTP ${response.status} on submission.`;
        return {
          ok: false,
          httpStatus: response.status,
          status: 'failed',
          endpointCalled: maskedEndpointForTrace,
          latencyMs,
          requestHeadersMasked,
          rawPayloadSanitized: { ...built.payload },
          responseBodySanitized: data && typeof data === 'object' ? data : { message: rawText },
          error: redactMuapiSecrets(errMsg, apiKey),
          retryable: response.status >= 500 || response.status === 429,
        };
      }

      const requestId = String(
        data?.request_id ||
          data?.id ||
          data?.data?.request_id ||
          data?.data?.id ||
          ''
      ).trim();

      if (!requestId) {
        return {
          ok: false,
          httpStatus: 502,
          status: 'failed',
          endpointCalled: maskedEndpointForTrace,
          latencyMs,
          requestHeadersMasked,
          rawPayloadSanitized: { ...built.payload },
          responseBodySanitized: data && typeof data === 'object' ? data : undefined,
          error: 'MUAPI response did not include a request_id for polling.',
        };
      }

      const outputs = extractMuapiOutputs(data);
      const outputUrl = outputs[0];
      let status = normalizeMuapiStatus(data?.status ?? data?.data?.status ?? 'pending');

      // Only mark completed when an actual verified output URL is present
      if (status === 'completed' && !outputUrl) {
        status = 'processing';
      }

      return {
        ok: true,
        httpStatus: response.status,
        requestId,
        status,
        outputUrl,
        endpointCalled: maskedEndpointForTrace,
        latencyMs,
        requestHeadersMasked,
        rawPayloadSanitized: {
          ...built.payload,
        },
        responseBodySanitized: {
          request_id: requestId,
          status: data?.status ?? status,
          outputs: outputs.length > 0 ? outputs : undefined,
          urls: data?.urls,
        },
      };
    } catch (err: any) {
      const isAbort = err?.name === 'AbortError';
      return {
        ok: false,
        httpStatus: isAbort ? 504 : 502,
        status: 'failed',
        endpointCalled: maskedEndpointForTrace,
        latencyMs: Date.now() - startMs,
        requestHeadersMasked,
        rawPayloadSanitized: { ...built.payload },
        error: redactMuapiSecrets(
          isAbort
            ? 'MUAPI submission timed out after 30s.'
            : err?.message || 'Network failure contacting MUAPI.',
          apiKey
        ),
        retryable: true,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async getGenerationStatus(
    requestId: string,
    model?: ProviderModelDefinition
  ): Promise<ProviderPollResponse> {
    const apiKey = providerConfigStore.getProviderApiKey('muapi');
    if (!apiKey) {
      return {
        ok: false,
        httpStatus: 503,
        requestId,
        status: 'failed',
        progress: 0,
        outputs: [],
        error: 'MUAPI API key is not configured on the server.',
      };
    }

    const cleanId = String(requestId || '').trim();
    if (!cleanId || !/^[a-zA-Z0-9_.:-]+$/.test(cleanId)) {
      return {
        ok: false,
        httpStatus: 400,
        requestId: cleanId,
        status: 'failed',
        progress: 0,
        outputs: [],
        error: 'Invalid MUAPI request_id.',
      };
    }

    const providerCfg = providerConfigStore.getInternalProvider('muapi');
    const baseUrl = (providerCfg?.baseUrl || 'https://api.muapi.ai/api/v1').replace(/\/+$/, '');
    const template =
      model?.resultEndpointTemplate?.trim() ||
      `${baseUrl}/predictions/{request_id}/result`;
    const pollUrl = template.replace('{request_id}', encodeURIComponent(cleanId));

    const startMs = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    try {
      const response = await fetch(pollUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startMs;
      const rawText = await response.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { message: rawText };
      }

      if (!response.ok) {
        const errMsg =
          extractMuapiError(data) ||
          `MUAPI polling returned HTTP ${response.status}.`;
        return {
          ok: false,
          httpStatus: response.status,
          requestId: cleanId,
          status: response.status === 404 || response.status === 400 ? 'failed' : 'processing',
          progress: 25,
          outputs: [],
          endpointCalled: pollUrl,
          latencyMs,
          responseBodySanitized: data && typeof data === 'object' ? data : { message: rawText },
          error: redactMuapiSecrets(errMsg, apiKey),
          retryable: response.status >= 500 || response.status === 429,
        };
      }

      const rawStatus = data?.status ?? data?.data?.status;
      const normalized = normalizeMuapiStatus(rawStatus);
      const outputs = extractMuapiOutputs(data);
      const outputUrl = outputs[0];
      const errMsg = extractMuapiError(data);
      const hasNsfwContents: boolean[] | undefined = Array.isArray(data?.has_nsfw_contents)
        ? data.has_nsfw_contents.map(Boolean)
        : undefined;

      const responseBodySanitized = {
        id: data?.id || cleanId,
        status: rawStatus || normalized,
        outputs,
        has_nsfw_contents: hasNsfwContents,
        urls: data?.urls,
        error: errMsg,
      };

      if (normalized === 'completed') {
        if (!outputUrl && hasNsfwContents?.some(Boolean)) {
          return {
            ok: true,
            httpStatus: response.status,
            requestId: cleanId,
            status: 'failed',
            progress: 0,
            outputs: [],
            hasNsfwContents,
            endpointCalled: pollUrl,
            latencyMs,
            responseBodySanitized,
            error: 'Generation blocked by MUAPI safety/NSFW filter.',
          };
        }
        if (!outputUrl) {
          return {
            ok: true,
            httpStatus: response.status,
            requestId: cleanId,
            status: 'processing',
            progress: 85,
            outputs: [],
            hasNsfwContents,
            endpointCalled: pollUrl,
            latencyMs,
            responseBodySanitized,
            error: 'Provider reported completed without outputs[0] yet; continuing verification.',
            retryable: true,
          };
        }
        return {
          ok: true,
          httpStatus: response.status,
          requestId: cleanId,
          status: 'completed',
          progress: 100,
          outputs,
          outputUrl,
          hasNsfwContents,
          endpointCalled: pollUrl,
          latencyMs,
          responseBodySanitized,
        };
      }

      if (normalized === 'failed') {
        return {
          ok: true,
          httpStatus: response.status,
          requestId: cleanId,
          status: 'failed',
          progress: 0,
          outputs: [],
          hasNsfwContents,
          endpointCalled: pollUrl,
          latencyMs,
          responseBodySanitized,
          error: redactMuapiSecrets(errMsg || 'MUAPI video generation failed.', apiKey),
        };
      }

      return {
        ok: true,
        httpStatus: response.status,
        requestId: cleanId,
        status: normalized,
        progress: normalized === 'processing' ? 50 : 15,
        outputs: [],
        endpointCalled: pollUrl,
        latencyMs,
        responseBodySanitized,
      };
    } catch (err: any) {
      return {
        ok: false,
        httpStatus: err?.name === 'AbortError' ? 504 : 502,
        requestId: cleanId,
        status: 'processing',
        progress: 35,
        outputs: [],
        endpointCalled: pollUrl,
        latencyMs: Date.now() - startMs,
        error: redactMuapiSecrets(err?.message || 'Polling network error.', apiKey),
        retryable: true,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async retrieveGenerationResult(
    requestId: string,
    model?: ProviderModelDefinition
  ): Promise<ProviderPollResponse> {
    return this.getGenerationStatus(requestId, model);
  }
}

export const muapiProviderAdapter = new MuapiProviderAdapter();
