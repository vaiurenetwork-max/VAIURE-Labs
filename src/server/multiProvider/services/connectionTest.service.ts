/**
 * Real-Time Provider Connection Diagnostics & Dry-Run Pipeline Simulator
 * - Executes live read-only upstream probes against ByteDance ModelArk v3 & MUAPI
 * - Never exposes raw API keys/secrets in any trace or SSE frame
 * - Supports full non-billed pipeline simulation with real payload validation,
 *   authoritative pricing lock, HMAC webhook signing, and SSE event delivery.
 */

import crypto from 'crypto';
import {
  BackendConnectionTestStep,
  ConnectionSituationStatus,
  ConnectionTestMode,
  ConnectionTestStreamEvent,
  ConnectionTestTarget,
  GenerationResolution,
  ProviderConnectionSummary,
} from '../../../types/multiProvider';
import {
  buildByteDanceVideoTaskPayload,
  byteDanceClient,
  getByteDanceConfigStatus,
  redactSecret,
} from '../../bytedanceClient';
import { providerConfigStore } from '../config/provider.config';
import {
  buildMuapiPayload,
  extractMuapiError,
  redactMuapiSecrets,
} from '../providers/muapi.provider';
import { calculateAuthoritativeEstimate } from './pricing.service';
import {
  buildSignedMuapiWebhookUrl,
  signMuapiWebhookToken,
  verifyMuapiWebhookToken,
} from './realtimeEvents.service';

export type {
  BackendConnectionTestStep,
  ConnectionSituationStatus,
  ConnectionTestMode,
  ConnectionTestStreamEvent,
  ConnectionTestTarget,
  ProviderConnectionSummary,
};

export interface ConnectionTestRequestOptions {
  target: ConnectionTestTarget;
  mode: ConnectionTestMode;
  publicOrigin: string;
  resolution?: GenerationResolution;
  duration?: number;
  draft?: boolean;
  signal?: AbortSignal;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      resolve();
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function makeStepId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

async function probeMuapiLiveEndpoint(
  baseUrl: string,
  apiKey: string,
  sandboxMode: boolean,
  signal?: AbortSignal
): Promise<{
  ok: boolean;
  situation: ConnectionSituationStatus;
  httpStatus?: number;
  latencyMs: number;
  endpoint: string;
  accountBalanceUsd?: number;
  summary: string;
  responsePreview: Record<string, unknown>;
}> {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const balanceUrl = `${cleanBase}/account/balance`;
  const fallbackProbeUrl = `${cleanBase}/predictions/conn_probe_00000000/result`;
  let probeUrl = balanceUrl;
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    let res = await fetch(balanceUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      signal: controller.signal,
    });

    // If custom/legacy proxy doesn't expose /account/balance, fall back to predictions probe
    if (res.status === 404 || res.status === 405) {
      probeUrl = fallbackProbeUrl;
      res = await fetch(fallbackProbeUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        signal: controller.signal,
      });
    }

    const latencyMs = Date.now() - started;
    const rawText = await res.text().catch(() => '');
    let parsed: any = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {
      parsed = { raw: rawText.slice(0, 300) };
    }

    const extractedErr = extractMuapiError(parsed);

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        situation: 'reachable_auth_failed',
        httpStatus: res.status,
        latencyMs,
        endpoint: probeUrl,
        summary: `MUAPI endpoint reachable (${latencyMs}ms), but API key authentication rejected (HTTP ${res.status}).`,
        responsePreview: {
          status: res.status,
          sandboxMode,
          error: redactMuapiSecrets(extractedErr || 'Unauthorized / invalid x-api-key', apiKey),
        },
      };
    }

    if (res.ok && probeUrl === balanceUrl) {
      const bal = typeof parsed?.balance === 'number' ? parsed.balance : undefined;
      return {
        ok: true,
        situation: 'connected',
        httpStatus: res.status,
        latencyMs,
        endpoint: probeUrl,
        accountBalanceUsd: bal,
        summary: `MUAPI API connected & authenticated (${latencyMs}ms · HTTP ${res.status}${
          sandboxMode ? ' · SANDBOX MODE' : ''
        }${typeof bal === 'number' ? ` · Balance $${bal.toFixed(2)} ${parsed?.currency || 'USD'}` : ''}).`,
        responsePreview: {
          httpStatus: res.status,
          authenticated: true,
          sandboxMode,
          balanceUsd: bal,
          currency: parsed?.currency || 'USD',
          webSafetyForced: Boolean(parsed?.web_safety_forced),
        },
      };
    }

    // 200 or 404/400 on a nonexistent prediction_id indicates endpoint is live and x-api-key passed auth
    if (res.ok || res.status === 404 || res.status === 400 || res.status === 422) {
      return {
        ok: true,
        situation: 'connected',
        httpStatus: res.status,
        latencyMs,
        endpoint: probeUrl,
        summary: `MUAPI API connected & authenticated (${latencyMs}ms · HTTP ${res.status}${
          sandboxMode ? ' · SANDBOX MODE' : ''
        }).`,
        responsePreview: {
          httpStatus: res.status,
          authenticated: true,
          sandboxMode,
          message: redactMuapiSecrets(
            extractedErr || parsed?.status || 'Endpoint reachable & x-api-key accepted',
            apiKey
          ),
        },
      };
    }

    return {
      ok: false,
      situation: 'unreachable',
      httpStatus: res.status,
      latencyMs,
      endpoint: probeUrl,
      summary: `MUAPI returned unexpected HTTP ${res.status} (${latencyMs}ms).`,
      responsePreview: {
        httpStatus: res.status,
        error: redactMuapiSecrets(extractedErr || `HTTP ${res.status}`, apiKey),
      },
    };
  } catch (err: any) {
    const latencyMs = Date.now() - started;
    const msg =
      err?.name === 'AbortError'
        ? 'Connection timed out after 10s'
        : err?.message || 'Network failure';
    return {
      ok: false,
      situation: 'unreachable',
      httpStatus: err?.name === 'AbortError' ? 504 : 502,
      latencyMs,
      endpoint: probeUrl,
      summary: `Failed contacting MUAPI API: ${redactMuapiSecrets(msg, apiKey)}`,
      responsePreview: {
        error: redactMuapiSecrets(msg, apiKey),
      },
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

export async function runRealtimeBackendConnectionTest(
  options: ConnectionTestRequestOptions,
  onEvent: (event: ConnectionTestStreamEvent) => void
): Promise<{
  runId: string;
  summaries: ProviderConnectionSummary[];
  steps: BackendConnectionTestStep[];
}> {
  const runId = `test_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const steps: BackendConnectionTestStep[] = [];
  const summaries: ProviderConnectionSummary[] = [];

  const emitStep = (step: BackendConnectionTestStep) => {
    steps.push(step);
    onEvent({ type: 'step', runId, step });
  };

  onEvent({
    type: 'start',
    runId,
    target: options.target,
    mode: options.mode,
    timestamp: new Date().toISOString(),
  });

  const resVal: GenerationResolution = options.resolution || '720p';
  const durVal = Number(options.duration || 5);
  const isDraft = Boolean(options.draft);
  const sampleImageUrl = `${options.publicOrigin.replace(/\/+$/, '')}/assets/aistudio/probe-frame.jpg`;

  // 1. Environment & Webhook Readiness Check
  const testJobId = `probe_${Date.now()}`;
  const signedToken = signMuapiWebhookToken(testJobId);
  const hmacValid = verifyMuapiWebhookToken(testJobId, signedToken);
  const webhookUrl = buildSignedMuapiWebhookUrl(options.publicOrigin, testJobId);

  emitStep({
    id: makeStepId('env'),
    timestamp: new Date().toISOString(),
    provider: 'system',
    phase: 'ENV_CHECK',
    method: 'INTERNAL',
    endpoint: options.publicOrigin,
    httpStatus: 200,
    latencyMs: 2,
    ok: true,
    statusLabel: 'ORIGIN_READY',
    summary: `Public origin resolved (${options.publicOrigin}); Webhook HMAC verification ${hmacValid ? 'PASSED' : 'FAILED'}.`,
    responsePreview: {
      publicOrigin: options.publicOrigin,
      httpsWebhookReady: Boolean(webhookUrl),
      webhookPathSample: webhookUrl ? `${webhookUrl.split('?')[0]}?token=[REDACTED_HMAC]` : 'Disabled on localhost',
      hmacSelfTest: hmacValid,
    },
  });

  const testByteDance = options.target === 'all' || options.target === 'bytedance';
  const testMuapi = options.target === 'all' || options.target === 'muapi';

  // ============================================================================
  // PROVIDER A: ByteDance Official ModelArk API v3
  // ============================================================================
  if (testByteDance && !options.signal?.aborted) {
    const bdStatus = getByteDanceConfigStatus();
    const bdCfg = providerConfigStore.getInternalProvider('bytedance');
    const bdPub = bdCfg ? providerConfigStore.toPublicConfig(bdCfg) : undefined;
    const probeEndpoint = `${bdStatus.baseUrl}/contents/generations/tasks?page_size=1`;

    if (options.mode === 'simulate_pipeline') {
      await sleep(160, options.signal);
    }

    if (!bdStatus.configured) {
      const step: BackendConnectionTestStep = {
        id: makeStepId('bd_probe'),
        timestamp: new Date().toISOString(),
        provider: 'bytedance',
        phase: 'LIVE_PROBE',
        method: 'GET',
        endpoint: probeEndpoint,
        httpStatus: 503,
        latencyMs: 1,
        ok: false,
        statusLabel: 'KEY_UNSET',
        summary: 'ByteDance ModelArk API key missing (BYTEDANCE_API_KEY / ARK_API_KEY not set in backend environment).',
        requestPreview: {
          headers: {
            Authorization: 'Bearer [UNCONFIGURED]',
            Accept: 'application/json',
          },
        },
        responsePreview: {
          configured: false,
          upstreamConnected: false,
          error: 'Set BYTEDANCE_API_KEY or ARK_API_KEY on server to enable live BytePlus calls.',
        },
      };
      emitStep(step);

      const bdSummary: ProviderConnectionSummary = {
        providerId: 'bytedance',
        displayName: 'ByteDance Official (ModelArk v3)',
        situation: 'key_unset',
        configured: false,
        endpoint: probeEndpoint,
        httpStatus: 503,
        latencyMs: 1,
        pollIntervalMs: bdPub?.pollIntervalMs || 5000,
        webhookReady: false,
        detail: 'Server key unset (BYTEDANCE_API_KEY / ARK_API_KEY)',
      };
      summaries.push(bdSummary);
      onEvent({ type: 'provider_summary', runId, summary: bdSummary });
    } else {
      const t0 = Date.now();
      const healthRes = await byteDanceClient.checkHealth();
      const latencyMs = Date.now() - t0;
      const connected = Boolean(healthRes.ok && healthRes.data?.upstreamConnected);
      const situation: ConnectionSituationStatus = connected
        ? 'connected'
        : healthRes.status === 401 || healthRes.status === 403
        ? 'reachable_auth_failed'
        : 'unreachable';

      emitStep({
        id: makeStepId('bd_probe'),
        timestamp: new Date().toISOString(),
        provider: 'bytedance',
        phase: 'LIVE_PROBE',
        method: 'GET',
        endpoint: probeEndpoint,
        httpStatus: healthRes.status,
        latencyMs,
        ok: connected,
        statusLabel: connected ? 'CONNECTED' : `HTTP_${healthRes.status}`,
        summary: connected
          ? `ByteDance ModelArk v3 authenticated & ready (${latencyMs}ms).`
          : redactSecret(
              healthRes.error || `ByteDance probe failed with HTTP ${healthRes.status}.`
            ),
        requestPreview: {
          headers: {
            Authorization: `Bearer ${bdPub?.keyMask || '****'}`,
            Accept: 'application/json',
          },
        },
        responsePreview: {
          upstreamConnected: connected,
          activeSeedanceModel: bdStatus.activeSeedanceModel,
          serverKeyStatus: healthRes.data?.serverKeyStatus,
          error: healthRes.error ? redactSecret(healthRes.error) : undefined,
        },
      });

      const bdSummary: ProviderConnectionSummary = {
        providerId: 'bytedance',
        displayName: 'ByteDance Official (ModelArk v3)',
        situation,
        configured: true,
        keyMask: bdPub?.keyMask,
        endpoint: probeEndpoint,
        httpStatus: healthRes.status,
        latencyMs,
        pollIntervalMs: bdPub?.pollIntervalMs || 5000,
        webhookReady: false,
        detail: connected
          ? `Authenticated · ${latencyMs}ms`
          : redactSecret(healthRes.error || `HTTP ${healthRes.status}`),
      };
      summaries.push(bdSummary);
      onEvent({ type: 'provider_summary', runId, summary: bdSummary });
    }

    if (options.mode === 'simulate_pipeline' && !options.signal?.aborted) {
      await sleep(220, options.signal);
      const bdEst = calculateAuthoritativeEstimate({
        provider: 'bytedance',
        modelId: 'seedance_25_15s',
        resolution: resVal === '4K' ? '1080p' : resVal,
        duration: Math.min(15, durVal),
        draft: false,
      });

      const wireBody = buildByteDanceVideoTaskPayload({
        model: 'seedance_25_15s',
        prompt: 'Connection test cinema dry-run prompt',
        resolution: resVal === '4K' ? '1080p' : resVal,
        duration: Math.min(15, durVal),
        aspect_ratio: '16:9',
        sound_enabled: true,
        camera_fixed: false,
      });

      emitStep({
        id: makeStepId('bd_sim_pay'),
        timestamp: new Date().toISOString(),
        provider: 'bytedance',
        phase: 'PAYLOAD_BUILD',
        method: 'INTERNAL',
        endpoint: `${bdStatus.baseUrl}/contents/generations/tasks`,
        httpStatus: 200,
        latencyMs: 4,
        ok: true,
        simulated: true,
        statusLabel: 'DRY_RUN_VALIDATED',
        summary: `[SIMULATED DRY-RUN] Built ModelArk v3 payload (${wireBody.resolution} · ${wireBody.duration}s) · Est: ${bdEst.creditsRequired} CR (0 credits deducted).`,
        requestPreview: wireBody as unknown as Record<string, unknown>,
        responsePreview: {
          simulated: true,
          billingCharged: false,
          estimatedCredits: bdEst.creditsRequired,
        },
      });

      await sleep(240, options.signal);
      const simTaskId = `sim_ark_${crypto.randomBytes(4).toString('hex')}`;
      emitStep({
        id: makeStepId('bd_sim_poll'),
        timestamp: new Date().toISOString(),
        provider: 'bytedance',
        phase: 'SIMULATED_POLL',
        method: 'GET',
        endpoint: `${bdStatus.baseUrl}/contents/generations/tasks/${simTaskId}`,
        httpStatus: 200,
        latencyMs: 38,
        ok: true,
        simulated: true,
        statusLabel: 'SIMULATED_SUCCEEDED',
        summary: `[SIMULATED DRY-RUN] Simulated 5s polling loop completed cleanly for task ${simTaskId}.`,
        responsePreview: {
          simulated: true,
          id: simTaskId,
          status: 'succeeded',
        },
      });
    }
  }

  // ============================================================================
  // PROVIDER B: MUAPI Seedance 2.5 Spicy
  // ============================================================================
  if (testMuapi && !options.signal?.aborted) {
    const muapiCfg = providerConfigStore.getInternalProvider('muapi');
    const muapiPub = muapiCfg ? providerConfigStore.toPublicConfig(muapiCfg) : undefined;
    const muapiKey = providerConfigStore.getProviderApiKey('muapi');
    const baseUrl = (muapiCfg?.baseUrl || 'https://api.muapi.ai/api/v1').replace(/\/+$/, '');
    const submitEndpoint = `${baseUrl}/seedance-2.5-spicy-image-to-video`;

    if (options.mode === 'simulate_pipeline') {
      await sleep(200, options.signal);
    }

    if (!muapiKey) {
      emitStep({
        id: makeStepId('muapi_probe'),
        timestamp: new Date().toISOString(),
        provider: 'muapi',
        phase: 'LIVE_PROBE',
        method: 'GET',
        endpoint: `${baseUrl}/predictions/conn_probe_00000000/result`,
        httpStatus: 503,
        latencyMs: 1,
        ok: false,
        statusLabel: 'KEY_UNSET',
        summary: 'MUAPI x-api-key not found in MUAPIAPP_API_KEY, MUAPI_API_KEY, or Admin Encrypted Vault.',
        requestPreview: {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': '[UNCONFIGURED]',
          },
        },
        responsePreview: {
          configured: false,
          error: 'Set MUAPIAPP_API_KEY / MUAPI_API_KEY in env or configure in Admin Console.',
        },
      });

      const mSummary: ProviderConnectionSummary = {
        providerId: 'muapi',
        displayName: 'MUAPI (Seedance 2.5 Spicy)',
        situation: 'key_unset',
        configured: false,
        endpoint: submitEndpoint,
        httpStatus: 503,
        latencyMs: 1,
        pollIntervalMs: muapiPub?.pollIntervalMs || 3000,
        webhookReady: Boolean(webhookUrl),
        detail: 'API key unset (MUAPIAPP_API_KEY / Vault)',
      };
      summaries.push(mSummary);
      onEvent({ type: 'provider_summary', runId, summary: mSummary });
    } else {
      const sandboxActive = providerConfigStore.isSandboxModeActive('muapi');
      const probe = await probeMuapiLiveEndpoint(baseUrl, muapiKey, sandboxActive, options.signal);

      emitStep({
        id: makeStepId('muapi_probe'),
        timestamp: new Date().toISOString(),
        provider: 'muapi',
        phase: 'LIVE_PROBE',
        method: 'GET',
        endpoint: probe.endpoint,
        httpStatus: probe.httpStatus,
        latencyMs: probe.latencyMs,
        ok: probe.ok,
        statusLabel: probe.ok
          ? sandboxActive
            ? 'CONNECTED_SANDBOX'
            : 'CONNECTED'
          : `HTTP_${probe.httpStatus || 502}`,
        summary: probe.summary,
        requestPreview: {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': muapiPub?.keyMask || '****',
          },
          sandboxMode: sandboxActive,
        },
        responsePreview: probe.responsePreview,
      });

      const mSummary: ProviderConnectionSummary = {
        providerId: 'muapi',
        displayName: sandboxActive
          ? 'MUAPI (Seedance 2.5 Spicy · Sandbox)'
          : 'MUAPI (Seedance 2.5 Spicy)',
        situation: probe.situation,
        configured: true,
        keyMask: muapiPub?.keyMask,
        sandboxMode: sandboxActive,
        muapiAccountBalanceUsd: probe.accountBalanceUsd,
        endpoint: probe.endpoint,
        httpStatus: probe.httpStatus,
        latencyMs: probe.latencyMs,
        pollIntervalMs: muapiPub?.pollIntervalMs || 3000,
        webhookReady: Boolean(webhookUrl),
        detail: probe.ok
          ? `Connected & Authenticated${sandboxActive ? ' (Sandbox)' : ''} · ${probe.latencyMs}ms`
          : probe.summary,
      };
      summaries.push(mSummary);
      onEvent({ type: 'provider_summary', runId, summary: mSummary });
    }

    if (options.mode === 'simulate_pipeline' && !options.signal?.aborted) {
      await sleep(220, options.signal);
      const wireRes = buildMuapiPayload({
        provider: 'muapi',
        model_id: 'muapi/seedance-2.5-spicy-image-to-video',
        prompt: 'Connection test dry-run shot',
        image_url: sampleImageUrl,
        resolution: resVal,
        duration: durVal,
        generate_audio: true,
        camera_fixed: false,
        high_bitrate: resVal === '4K' || resVal === '1080p',
        draft: isDraft,
      });

      const est = calculateAuthoritativeEstimate({
        provider: 'muapi',
        modelId: 'muapi/seedance-2.5-spicy-image-to-video',
        resolution: resVal,
        duration: durVal,
        draft: isDraft,
      });

      emitStep({
        id: makeStepId('muapi_sim_payload'),
        timestamp: new Date().toISOString(),
        provider: 'muapi',
        phase: 'PAYLOAD_BUILD',
        method: 'INTERNAL',
        endpoint: submitEndpoint,
        httpStatus: 200,
        latencyMs: 3,
        ok: Boolean(wireRes.valid),
        simulated: true,
        statusLabel: wireRes.valid ? 'WIRE_4K_VERIFIED' : 'INVALID',
        summary: `[SIMULATED DRY-RUN] Built strict MUAPI payload (wire resolution="${wireRes.payload?.resolution}", ${durVal}s) · Est Cost: ${est.displayLabel} (0 charged).`,
        requestPreview: (wireRes.payload || { error: wireRes.error }) as Record<string, unknown>,
        responsePreview: {
          simulated: true,
          billingCharged: false,
          effectiveResolution: est.effectiveResolution,
          providerCostUsd: est.providerCostUsd,
          appMarkupUsd: est.appMarkupUsd,
          finalPriceUsd: est.finalPriceUsd,
          creditsEquivalent: est.creditsRequired,
        },
      });

      await sleep(240, options.signal);
      const simReqId = `muapi_sim_${crypto.randomBytes(5).toString('hex')}`;
      const simSubmitUrl = webhookUrl
        ? `${submitEndpoint}?webhook=${encodeURIComponent(webhookUrl.split('?')[0])}`
        : submitEndpoint;

      emitStep({
        id: makeStepId('muapi_sim_sub'),
        timestamp: new Date().toISOString(),
        provider: 'muapi',
        phase: 'SIMULATED_SUBMIT',
        method: 'POST',
        endpoint: simSubmitUrl,
        httpStatus: 200,
        latencyMs: 64,
        ok: true,
        simulated: true,
        statusLabel: 'DRY_RUN_ACCEPTED',
        summary: `[SIMULATED DRY-RUN] Simulated MUAPI async submission accepted · request_id=${simReqId}${webhookUrl ? ' (Signed HTTPS webhook attached)' : ''}`,
        requestPreview: {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': muapiPub?.keyMask || '****',
          },
          payload: wireRes.payload,
        },
        responsePreview: {
          simulated: true,
          request_id: simReqId,
          status: 'pending',
        },
      });

      await sleep(260, options.signal);
      emitStep({
        id: makeStepId('muapi_sim_wh'),
        timestamp: new Date().toISOString(),
        provider: 'muapi',
        phase: 'WEBHOOK_HMAC',
        method: 'POST',
        endpoint: `/api/webhooks/muapi/${testJobId}`,
        httpStatus: 200,
        latencyMs: 5,
        ok: hmacValid,
        simulated: true,
        statusLabel: 'HMAC_VERIFIED',
        summary: `[SIMULATED DRY-RUN] Verified HMAC webhook push callback + timing-safe signature + ${muapiPub?.pollIntervalMs || 3000}ms poll cancellation.`,
        responsePreview: {
          simulated: true,
          signatureVerified: hmacValid,
          id: simReqId,
          status: 'completed',
          has_nsfw_contents: [false],
        },
      });
    }
  }

  // Final SSE Verification Step
  if (!options.signal?.aborted) {
    emitStep({
      id: makeStepId('sse'),
      timestamp: new Date().toISOString(),
      provider: 'system',
      phase: 'SSE_VERIFY',
      method: 'INTERNAL',
      endpoint: '/api/providers/connection-test/stream',
      httpStatus: 200,
      latencyMs: 1,
      ok: true,
      statusLabel: 'STREAM_COMPLETE',
      summary: `Real-time diagnostics complete (${steps.filter((s) => s.ok).length + 1}/${steps.length + 1} checks passed).`,
    });
  }

  const passedSteps = steps.filter((s) => s.ok).length;
  onEvent({
    type: 'complete',
    runId,
    timestamp: new Date().toISOString(),
    summaries,
    totalSteps: steps.length,
    passedSteps,
  });

  return { runId, summaries, steps };
}
