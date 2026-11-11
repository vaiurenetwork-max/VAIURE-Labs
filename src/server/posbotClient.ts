/**
 * PosBot Developer API v1 — Server-Side Client
 * Handles authenticated upstream requests, fallback base URL routing,
 * correlation IDs, timeouts, and strict secret redaction.
 */

import crypto from 'crypto';
import {
  DOCUMENTED_POSBOT_MODELS,
  MODEL_BY_KEY,
  PosBotModelDefinition,
} from './posbotSchema';

const DEFAULT_BASE_URL = 'https://api.posbot.web.id/api/v1';
const FALLBACK_BASE_URL = 'https://api.posbot.web.id/posbot_motion/api/v1';

export interface PosBotConfigStatus {
  configured: boolean;
  baseUrl: string;
  keyHint: string;
}

export interface PosBotUpstreamResponse<T = unknown> {
  ok: boolean;
  status: number;
  requestId: string;
  data?: T;
  error?: string;
  upstreamBaseUrl?: string;
  upstreamTunnelOffline?: boolean;
}

/**
 * Redacts the configured API key from any string to guarantee zero secret leakage.
 */
export function redactSecret(input: string, apiKey?: string): string {
  if (!input) return input;
  let output = input;
  const envKey = apiKey || process.env.POSBOT_API_KEY || '';
  if (envKey && envKey.length >= 4 && envKey !== 'YOUR_NEW_ROTATED_API_KEY') {
    output = output.split(envKey).join('[REDACTED_POSBOT_KEY]');
  }
  // Also redact any posbot_live_... or pb_live_... token patterns
  output = output.replace(/(?:posbot_live|pb_live)_[a-zA-Z0-9_-]+/g, '[REDACTED_POSBOT_KEY]');
  return output;
}

export function getPosBotConfigStatus(): PosBotConfigStatus {
  const rawKey = (process.env.POSBOT_API_KEY || '').trim();
  const isPlaceholder =
    !rawKey ||
    rawKey === 'YOUR_NEW_ROTATED_API_KEY' ||
    rawKey === 'MY_POSBOT_API_KEY' ||
    rawKey === 'REPLACE_WITH_NEW_API_KEY';

  const baseUrl = (process.env.POSBOT_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');

  return {
    configured: !isPlaceholder,
    baseUrl,
    keyHint: !isPlaceholder ? 'Configured on Server (Hidden)' : 'Missing Server Variable (POSBOT_API_KEY)',
  };
}

function getApiKeyOrThrow(): string {
  const rawKey = (process.env.POSBOT_API_KEY || '').trim();
  if (
    !rawKey ||
    rawKey === 'YOUR_NEW_ROTATED_API_KEY' ||
    rawKey === 'MY_POSBOT_API_KEY' ||
    rawKey === 'REPLACE_WITH_NEW_API_KEY'
  ) {
    throw new Error(
      'POSBOT_API_KEY is not configured on the server. Set POSBOT_API_KEY in server environment secrets.'
    );
  }
  return rawKey;
}

function getCandidateBaseUrls(): string[] {
  const configured = (process.env.POSBOT_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
  if (configured === FALLBACK_BASE_URL) {
    return [FALLBACK_BASE_URL, DEFAULT_BASE_URL];
  }
  return [configured, FALLBACK_BASE_URL];
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

function isGatewayOrTunnelError(status: number, rawBody: string): boolean {
  if (status === 502 || status === 503 || status === 504 || (status >= 520 && status <= 530)) {
    return true;
  }
  if (/Cloudflare Tunnel error|Error\s*1033|cf-error-details/i.test(rawBody)) {
    return true;
  }
  return false;
}

export class PosBotClient {
  /**
   * 1. GET /health (Public endpoint — does not require API key, also reports server config readiness)
   */
  async checkHealth(): Promise<
    PosBotUpstreamResponse<{
      ok: boolean;
      service?: string;
      version?: string;
      time?: string;
      serverKeyConfigured: boolean;
      serverKeyStatus: string;
      baseUrl: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getPosBotConfigStatus();
    const candidates = getCandidateBaseUrls();
    let sawTunnelError = false;

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(
          `${base}/health`,
          {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'X-Request-Id': requestId,
            },
          },
          8000
        );

        const text = await res.text();
        if (isGatewayOrTunnelError(res.status, text)) {
          sawTunnelError = true;
        }

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: redactSecret(text) };
        }

        if (res.ok) {
          return {
            ok: true,
            status: res.status,
            requestId,
            upstreamBaseUrl: base,
            data: {
              ok: Boolean(parsed.ok ?? true),
              service: typeof parsed.service === 'string' ? parsed.service : 'PosBot Public Developer API',
              version: typeof parsed.version === 'string' ? parsed.version : 'v1',
              time: typeof parsed.time === 'string' ? parsed.time : new Date().toISOString(),
              serverKeyConfigured: config.configured,
              serverKeyStatus: config.keyHint,
              baseUrl: base,
            },
          };
        }
      } catch {
        sawTunnelError = true;
      }
    }

    return {
      ok: false,
      status: 503,
      requestId,
      upstreamTunnelOffline: sawTunnelError,
      error: 'Unable to reach PosBot upstream /health endpoint.',
      data: {
        ok: false,
        serverKeyConfigured: config.configured,
        serverKeyStatus: config.keyHint,
        baseUrl: config.baseUrl,
      },
    };
  }

  /**
   * 2. GET /models (Authenticated when key is configured; returns live catalog merged with documented parameter constraints)
   */
  async getModels(): Promise<
    PosBotUpstreamResponse<{
      source: 'live' | 'documented_reference';
      total_models: number;
      serverKeyConfigured: boolean;
      liveError?: string;
      models: Array<
        PosBotModelDefinition & {
          cost_generate: number;
          cost_idr: number;
          available: boolean;
          pricingSource: 'live_api' | 'documented_reference';
        }
      >;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getPosBotConfigStatus();

    if (!config.configured) {
      return {
        ok: true,
        status: 200,
        requestId,
        data: {
          source: 'documented_reference',
          total_models: DOCUMENTED_POSBOT_MODELS.length,
          serverKeyConfigured: false,
          liveError:
            'POSBOT_API_KEY is not configured on the server. Showing documented reference catalog (DEVELOPER_API_DOCS.md).',
          models: DOCUMENTED_POSBOT_MODELS.map((m) => ({
            ...m,
            cost_generate: m.documentedCostGenerate,
            cost_idr: m.documentedCostIdr,
            available: true,
            pricingSource: 'documented_reference' as const,
          })),
        },
      };
    }

    const apiKey = getApiKeyOrThrow();
    const candidates = getCandidateBaseUrls();
    let lastError = 'Upstream /models request failed.';

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(
          `${base}/models`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
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

        if (res.ok && parsed && Array.isArray(parsed.models)) {
          const liveList = parsed.models as Array<Record<string, unknown>>;
          const seenKeys = new Set<string>();
          const mergedModels: Array<
            PosBotModelDefinition & {
              cost_generate: number;
              cost_idr: number;
              available: boolean;
              pricingSource: 'live_api' | 'documented_reference';
            }
          > = [];

          for (const liveItem of liveList) {
            const key = typeof liveItem.key === 'string' ? liveItem.key : '';
            if (!key) continue;
            seenKeys.add(key);

            const docDef = MODEL_BY_KEY[key];
            const liveCostGen =
              typeof liveItem.cost_generate === 'number'
                ? liveItem.cost_generate
                : docDef?.documentedCostGenerate ?? 1;
            const liveCostIdr =
              typeof liveItem.cost_idr === 'number'
                ? liveItem.cost_idr
                : docDef?.documentedCostIdr ?? liveCostGen * 400;

            if (docDef) {
              mergedModels.push({
                ...docDef,
                name: typeof liveItem.name === 'string' ? liveItem.name : docDef.name,
                cost_generate: liveCostGen,
                cost_idr: liveCostIdr,
                available: liveItem.available !== false,
                pricingSource: 'live_api',
              });
            } else {
              mergedModels.push({
                key,
                name: typeof liveItem.name === 'string' ? liveItem.name : key,
                category: 'Video',
                studioSection: 'video-studio',
                documentedCostGenerate: liveCostGen,
                documentedCostIdr: liveCostIdr,
                maxPromptLength: 2500,
                minPromptLength: 1,
                requiredFields: ['prompt'],
                optionalFields: ['aspect_ratio', 'image_url'],
                notes: 'Live model discovered from /models endpoint.',
                cost_generate: liveCostGen,
                cost_idr: liveCostIdr,
                available: liveItem.available !== false,
                pricingSource: 'live_api',
              });
            }
          }

          for (const docModel of DOCUMENTED_POSBOT_MODELS) {
            if (!seenKeys.has(docModel.key)) {
              mergedModels.push({
                ...docModel,
                cost_generate: docModel.documentedCostGenerate,
                cost_idr: docModel.documentedCostIdr,
                available: true,
                pricingSource: 'documented_reference',
              });
            }
          }

          return {
            ok: true,
            status: 200,
            requestId,
            upstreamBaseUrl: base,
            data: {
              source: 'live',
              total_models: mergedModels.length,
              serverKeyConfigured: true,
              models: mergedModels,
            },
          };
        }

        lastError = redactSecret(
          typeof parsed.error === 'string' ? parsed.error : `HTTP ${res.status}`,
          apiKey
        );
        if (res.status === 401 || res.status === 403) {
          break;
        }
      } catch (err: unknown) {
        lastError = redactSecret(err instanceof Error ? err.message : 'Network error', apiKey);
      }
    }

    return {
      ok: true,
      status: 200,
      requestId,
      data: {
        source: 'documented_reference',
        total_models: DOCUMENTED_POSBOT_MODELS.length,
        serverKeyConfigured: true,
        liveError: `Live /models unavailable (${lastError}). Showing documented reference catalog.`,
        models: DOCUMENTED_POSBOT_MODELS.map((m) => ({
          ...m,
          cost_generate: m.documentedCostGenerate,
          cost_idr: m.documentedCostIdr,
          available: true,
          pricingSource: 'documented_reference' as const,
        })),
      },
    };
  }

  /**
   * 3. GET /balance (Authenticated — never fabricates a balance inside PosBotClient)
   */
  async getBalance(): Promise<
    PosBotUpstreamResponse<{
      ok: boolean;
      user_id?: number | string;
      balance_generate: number;
      balance_idr_equivalent: number;
      unit_value_idr: number;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getPosBotConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error:
          'POSBOT_API_KEY is not configured on the server. Add POSBOT_API_KEY in server environment variables to fetch live account balance.',
      };
    }

    const apiKey = getApiKeyOrThrow();
    const candidates = getCandidateBaseUrls();
    let lastError = 'Failed to fetch balance from PosBot API.';
    let lastStatus = 502;
    let sawTunnelError = false;

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(
          `${base}/balance`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
              Accept: 'application/json',
              'X-Request-Id': requestId,
            },
          },
          8000
        );

        lastStatus = res.status;
        const text = await res.text();
        if (isGatewayOrTunnelError(res.status, text)) {
          sawTunnelError = true;
        }

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = {};
        }

        const balGen =
          typeof parsed.balance_generate === 'number'
            ? parsed.balance_generate
            : typeof parsed.balance === 'number'
            ? parsed.balance
            : undefined;

        if (res.ok && parsed.ok !== false && typeof balGen === 'number') {
          return {
            ok: true,
            status: 200,
            requestId,
            upstreamBaseUrl: base,
            data: {
              ok: true,
              user_id: parsed.user_id as number | string | undefined,
              balance_generate: balGen,
              balance_idr_equivalent:
                typeof parsed.balance_idr_equivalent === 'number'
                  ? parsed.balance_idr_equivalent
                  : balGen * 400,
              unit_value_idr:
                typeof parsed.unit_value_idr === 'number' ? parsed.unit_value_idr : 400,
            },
          };
        }

        lastError = redactSecret(
          typeof parsed.error === 'string'
            ? parsed.error
            : `Upstream returned HTTP ${res.status}`,
          apiKey
        );

        if (res.status === 401 || res.status === 403) {
          break;
        }
      } catch (err: unknown) {
        sawTunnelError = true;
        lastError = redactSecret(err instanceof Error ? err.message : 'Network error', apiKey);
      }
    }

    return {
      ok: false,
      status: lastStatus,
      requestId,
      upstreamTunnelOffline: sawTunnelError,
      error: lastError,
    };
  }

  /**
   * 4. POST /generate (Authenticated — only tries fallback base URL on gateway/tunnel error where primary never reached origin)
   */
  async submitGenerate(
    payload: Record<string, unknown>
  ): Promise<
    PosBotUpstreamResponse<{
      ok: boolean;
      job_code: string;
      status: string;
      model: string;
      cost_generate?: number;
      remaining_balance_generate?: number;
      check_status_url?: string;
      result_url?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getPosBotConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error:
          'POSBOT_API_KEY is not configured on the server. Configure POSBOT_API_KEY in server environment secrets before submitting paid generation jobs.',
      };
    }

    const apiKey = getApiKeyOrThrow();
    const candidates = getCandidateBaseUrls();
    let lastStatus = 502;
    let lastError = 'PosBot /generate failed.';
    let sawTunnelError = false;

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(
          `${base}/generate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'X-Request-Id': requestId,
            },
            body: JSON.stringify(payload),
          },
          20000
        );

        lastStatus = res.status;
        const text = await res.text();
        const isTunnelErr = isGatewayOrTunnelError(res.status, text);
        if (isTunnelErr) {
          sawTunnelError = true;
        }

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

        const jobCodeCandidate =
          typeof parsed.job_code === 'string'
            ? parsed.job_code
            : typeof nestedData.job_code === 'string'
            ? nestedData.job_code
            : typeof parsed.job_id === 'string'
            ? parsed.job_id
            : undefined;

        const directResultUrl =
          typeof parsed.result_url === 'string'
            ? parsed.result_url
            : typeof nestedData.result_url === 'string'
            ? nestedData.result_url
            : undefined;

        if (res.ok && parsed.ok !== false && parsed.success !== false && (jobCodeCandidate || directResultUrl)) {
          const resolvedJobCode = jobCodeCandidate || `JOB-${Date.now()}`;
          return {
            ok: true,
            status: res.status,
            requestId,
            upstreamBaseUrl: base,
            data: {
              ok: true,
              job_code: resolvedJobCode,
              status:
                typeof parsed.status === 'string'
                  ? parsed.status
                  : directResultUrl
                  ? 'completed'
                  : 'processing',
              model: typeof parsed.model === 'string' ? parsed.model : String(payload.model || ''),
              cost_generate:
                typeof parsed.cost_generate === 'number' ? parsed.cost_generate : undefined,
              remaining_balance_generate:
                typeof parsed.remaining_balance_generate === 'number'
                  ? parsed.remaining_balance_generate
                  : undefined,
              check_status_url:
                typeof parsed.check_status_url === 'string' ? parsed.check_status_url : undefined,
              result_url: directResultUrl,
            },
          };
        }

        const rawErr =
          typeof parsed.error === 'string'
            ? parsed.error
            : typeof parsed.message === 'string'
            ? parsed.message
            : typeof parsed.detail === 'string'
            ? parsed.detail
            : `PosBot /generate failed with HTTP ${res.status}`;

        lastError = redactSecret(rawErr, apiKey);

        // Only try secondary base URL if primary failed with a gateway/tunnel error (502/503/504/520-530)
        if (!isTunnelErr) {
          break;
        }
      } catch (err: unknown) {
        sawTunnelError = true;
        const errMsg = redactSecret(
          err instanceof Error ? err.message : 'Network error during /generate submission',
          apiKey
        );
        lastStatus = 504;
        lastError = `Request to PosBot /generate timed out or failed (${errMsg}).`;
      }
    }

    return {
      ok: false,
      status: lastStatus,
      requestId,
      upstreamTunnelOffline: sawTunnelError,
      error: lastError,
    };
  }

  /**
   * 5. GET /status/<job_code> (Authenticated — safe to poll every 5–10 seconds)
   */
  async getJobStatus(
    jobCode: string
  ): Promise<
    PosBotUpstreamResponse<{
      ok: boolean;
      job_code: string;
      model?: string;
      status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | string;
      cost_generate?: number;
      result_url?: string | null;
      error_message?: string | null;
      created_at?: string;
      updated_at?: string;
    }>
  > {
    const requestId = crypto.randomUUID();
    const config = getPosBotConfigStatus();

    if (!config.configured) {
      return {
        ok: false,
        status: 503,
        requestId,
        error: 'POSBOT_API_KEY is not configured on the server.',
      };
    }

    const apiKey = getApiKeyOrThrow();
    const candidates = getCandidateBaseUrls();
    let lastError = 'Failed to fetch job status.';
    let lastStatus = 502;
    let sawTunnelError = false;

    for (const base of candidates) {
      try {
        const res = await fetchWithTimeout(
          `${base}/status/${encodeURIComponent(jobCode)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'X-API-Key': apiKey,
              Accept: 'application/json',
              'X-Request-Id': requestId,
            },
          },
          10000
        );

        lastStatus = res.status;
        const text = await res.text();
        if (isGatewayOrTunnelError(res.status, text)) {
          sawTunnelError = true;
        }

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = {};
        }

        if (res.ok && parsed.ok !== false && parsed.success !== false) {
          return {
            ok: true,
            status: 200,
            requestId,
            upstreamBaseUrl: base,
            data: {
              ok: true,
              job_code: typeof parsed.job_code === 'string' ? parsed.job_code : jobCode,
              model: typeof parsed.model === 'string' ? parsed.model : undefined,
              status: typeof parsed.status === 'string' ? parsed.status : 'processing',
              cost_generate:
                typeof parsed.cost_generate === 'number' ? parsed.cost_generate : undefined,
              result_url:
                typeof parsed.result_url === 'string' ? parsed.result_url : null,
              error_message:
                typeof parsed.error_message === 'string'
                  ? redactSecret(parsed.error_message, apiKey)
                  : null,
              created_at:
                typeof parsed.created_at === 'string' ? parsed.created_at : undefined,
              updated_at:
                typeof parsed.updated_at === 'string' ? parsed.updated_at : undefined,
            },
          };
        }

        lastError = redactSecret(
          typeof parsed.error === 'string'
            ? parsed.error
            : `HTTP ${res.status} when polling job ${jobCode}`,
          apiKey
        );

        if (res.status === 401 || res.status === 403 || res.status === 404) {
          break;
        }
      } catch (err: unknown) {
        sawTunnelError = true;
        lastError = redactSecret(err instanceof Error ? err.message : 'Network error', apiKey);
      }
    }

    return {
      ok: false,
      status: lastStatus,
      requestId,
      upstreamTunnelOffline: sawTunnelError,
      error: lastError,
    };
  }
}

export const posBotClient = new PosBotClient();
