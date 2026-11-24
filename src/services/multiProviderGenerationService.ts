/**
 * VAIURE — Unified Multi-Provider AI Video Generation Client Service
 * Communicates with:
 * - /api/providers
 * - /api/generations/*
 * - /api/admin/providers/*
 * - Firestore `generationJobs` real-time onSnapshot listener + Firebase Storage mirror
 */

import {
  collection,
  db,
  doc,
  getDownloadURL,
  handleFirestoreError,
  limit,
  onSnapshot,
  OperationType,
  query,
  setDoc,
  storage,
  storageRef,
  uploadBytesResumable,
  where,
} from '../lib/firebase';
import { getAuthHeaders, getFirebaseIdToken } from './authTokenHelper';
import {
  BackendConnectionTestStep,
  BackendProcessStep,
  ConnectionSituationStatus,
  ConnectionTestMode,
  ConnectionTestStreamEvent,
  ConnectionTestTarget,
  GenerationResolution,
  MultiProviderAnalyticsSummary,
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderConnectionSummary,
  ProviderId,
  ProviderModelDefinition,
  UnifiedGenerationInput,
  UnifiedGenerationJob,
} from '../types/multiProvider';

export type {
  BackendConnectionTestStep,
  ConnectionSituationStatus,
  ConnectionTestMode,
  ConnectionTestStreamEvent,
  ConnectionTestTarget,
  ProviderConnectionSummary,
};

async function apiFetchJson<T>(
  url: string,
  options: RequestInit = {},
  authRequired = true
): Promise<T> {
  const buildHeaders = async (forceRefresh = false): Promise<Record<string, string>> => {
    if (!authRequired) {
      return options.body ? { 'Content-Type': 'application/json' } : {};
    }
    const base = await getAuthHeaders(Boolean(options.body));
    if (forceRefresh) {
      const freshToken = await getFirebaseIdToken(true);
      if (freshToken) {
        base['Authorization'] = `Bearer ${freshToken}`;
      }
    }
    return base;
  };

  let headers = await buildHeaders(false);
  let res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (authRequired && res.status === 401) {
    const freshToken = await getFirebaseIdToken(true);
    if (freshToken) {
      headers = { ...headers, Authorization: `Bearer ${freshToken}` };
      res = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {}),
        },
      });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) {
    const err: any = new Error(data?.error || `Request failed with HTTP ${res.status}`);
    err.status = res.status;
    err.code = data?.code;
    err.details = data;
    throw err;
  }
  return data as T;
}

export function computeLocalMuapiPricePreview(
  model: ProviderModelDefinition | undefined,
  resolution: GenerationResolution,
  duration: number,
  draft: boolean
): {
  effectiveResolution: GenerationResolution;
  providerCostUsd: number;
  appMarkupUsd: number;
  finalPriceUsd: number;
} | null {
  if (!model || model.pricingCurrency !== 'USD' || !model.usdPricingMatrix) {
    return null;
  }
  const effectiveResolution: GenerationResolution = draft && model.supportsDraftMode ? '480p' : resolution;
  const bucket =
    model.usdPricingMatrix[effectiveResolution] ||
    model.usdPricingMatrix[effectiveResolution.toLowerCase()] ||
    model.usdPricingMatrix[effectiveResolution.toUpperCase()];
  if (!bucket || typeof bucket[duration] !== 'number') {
    return null;
  }
  const roundCent = (n: number) => Math.round((Number(Number(n).toFixed(6)) + 1e-9) * 100) / 100;
  const base = roundCent(bucket[duration]);
  const pct = Math.max(0, Number(model.appMarkupPercent || 0));
  const flat = Math.max(0, Number(model.appMarkupFlatUsd || 0));
  const markup = roundCent((base * pct) / 100 + flat);
  const total = roundCent(base + markup);
  return {
    effectiveResolution,
    providerCostUsd: base,
    appMarkupUsd: markup,
    finalPriceUsd: total,
  };
}

export const multiProviderGenerationService = {
  getProviders: async (): Promise<ProviderConfigPublic[]> => {
    const res = await apiFetchJson<{ ok: true; providers: ProviderConfigPublic[] }>(
      '/api/providers',
      {},
      false
    );
    return res.providers || [];
  },

  estimateCost: async (payload: {
    provider: ProviderId;
    modelId: string;
    resolution: GenerationResolution;
    duration: number;
    draft?: boolean;
    referenceImagesCount?: number;
    physicsPriority?: boolean;
  }): Promise<PriceEstimateBreakdown> => {
    const res = await apiFetchJson<{ ok: true; estimate: PriceEstimateBreakdown }>(
      '/api/generations/estimate',
      {
        method: 'POST',
        body: JSON.stringify({
          provider: payload.provider,
          model_id: payload.modelId,
          resolution: payload.resolution,
          duration: payload.duration,
          draft: Boolean(payload.draft),
          reference_images_count: payload.referenceImagesCount || 0,
          physics_priority: payload.physicsPriority !== false,
        }),
      },
      false
    );
    return res.estimate;
  },

  submitGeneration: async (
    input: UnifiedGenerationInput
  ): Promise<{
    job: UnifiedGenerationJob;
    deduplicated?: boolean;
    remainingBalance?: number;
  }> => {
    const res = await apiFetchJson<{
      ok: true;
      job: UnifiedGenerationJob;
      deduplicated?: boolean;
      remainingBalance?: number;
    }>('/api/generations/submit', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    void syncUnifiedJobToFirestore(res.job).catch(() => undefined);
    return res;
  },

  finalizeDraft: async (
    draftJobId: string,
    options?: {
      resolution?: GenerationResolution;
      high_bitrate?: boolean;
      idempotency_key?: string;
    }
  ): Promise<{
    job: UnifiedGenerationJob;
    parentDraftJob: UnifiedGenerationJob;
    deduplicated?: boolean;
    remainingBalance?: number;
  }> => {
    const res = await apiFetchJson<{
      ok: true;
      job: UnifiedGenerationJob;
      parentDraftJob: UnifiedGenerationJob;
      deduplicated?: boolean;
      remainingBalance?: number;
    }>(`/api/generations/${encodeURIComponent(draftJobId)}/finalize`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
    void syncUnifiedJobToFirestore(res.job).catch(() => undefined);
    return res;
  },

  getJobStatus: async (jobId: string): Promise<UnifiedGenerationJob> => {
    const res = await apiFetchJson<{ ok: true; job: UnifiedGenerationJob }>(
      `/api/generations/${encodeURIComponent(jobId)}/status`
    );
    if (res.job) {
      void syncUnifiedJobToFirestore(res.job).catch(() => undefined);
    }
    return res.job;
  },

  getUnifiedHistory: async (): Promise<UnifiedGenerationJob[]> => {
    const res = await apiFetchJson<{ ok: true; jobs: UnifiedGenerationJob[] }>(
      '/api/generations/history'
    );
    return res.jobs || [];
  },

  deleteJob: async (jobId: string): Promise<UnifiedGenerationJob[]> => {
    const res = await apiFetchJson<{ ok: true; jobs: UnifiedGenerationJob[] }>(
      `/api/generations/${encodeURIComponent(jobId)}`,
      { method: 'DELETE' }
    );
    return res.jobs || [];
  },

  /**
   * Real-time Server-Sent Events subscription using fetch + Authorization Bearer header
   * (never exposes tokens in URL query strings).
   */
  subscribeToJobRealtimeStream: (
    jobId: string,
    callbacks: {
      onConnected?: () => void;
      onInit?: (payload: { job?: UnifiedGenerationJob; traces?: BackendProcessStep[] }) => void;
      onJobUpdate?: (job: UnifiedGenerationJob) => void;
      onTraceStep?: (trace: BackendProcessStep, job?: UnifiedGenerationJob) => void;
      onError?: (err: Error) => void;
    }
  ): (() => void) => {
    const controller = new AbortController();
    let closed = false;

    const connect = async () => {
      try {
        const headers = await getAuthHeaders(false);
        const res = await fetch(`/api/generations/${encodeURIComponent(jobId)}/events`, {
          method: 'GET',
          headers: {
            ...headers,
            Accept: 'text/event-stream',
          },
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE stream failed with HTTP ${res.status}`);
        }

        callbacks.onConnected?.();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const rawChunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');

            const dataLines = rawChunk
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .filter(Boolean);

            if (dataLines.length === 0) continue;
            try {
              const parsed = JSON.parse(dataLines.join('\n')) as {
                type: string;
                job?: UnifiedGenerationJob;
                traces?: BackendProcessStep[];
                trace?: BackendProcessStep;
              };
              if (parsed.type === 'init') {
                callbacks.onInit?.({ job: parsed.job, traces: parsed.traces });
              } else if (parsed.type === 'job_update' && parsed.job) {
                callbacks.onJobUpdate?.(parsed.job);
              } else if (parsed.type === 'trace_step' && parsed.trace) {
                callbacks.onTraceStep?.(parsed.trace, parsed.job);
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
      } catch (err: any) {
        if (!closed && err?.name !== 'AbortError') {
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    void connect();

    return () => {
      closed = true;
      controller.abort();
    };
  },

  /**
   * Real-time Backend Connection Diagnostics & Dry-Run Pipeline Simulator via SSE (POST + Bearer header)
   */
  streamBackendConnectionTest: (
    params: {
      target: ConnectionTestTarget;
      mode: ConnectionTestMode;
      resolution?: GenerationResolution;
      duration?: number;
      draft?: boolean;
    },
    callbacks: {
      onConnected?: () => void;
      onStart?: (payload: {
        runId: string;
        target: ConnectionTestTarget;
        mode: ConnectionTestMode;
        timestamp: string;
      }) => void;
      onStep?: (step: BackendConnectionTestStep) => void;
      onProviderSummary?: (summary: ProviderConnectionSummary) => void;
      onComplete?: (payload: {
        runId: string;
        timestamp: string;
        summaries: ProviderConnectionSummary[];
        totalSteps: number;
        passedSteps: number;
      }) => void;
      onError?: (err: Error) => void;
    }
  ): (() => void) => {
    const controller = new AbortController();
    let closed = false;

    const run = async () => {
      try {
        let headers = await getAuthHeaders(true);
        let res = await fetch('/api/providers/connection-test/stream', {
          method: 'POST',
          headers: {
            ...headers,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(params),
          signal: controller.signal,
        });

        if (res.status === 401) {
          const freshToken = await getFirebaseIdToken(true);
          if (freshToken) {
            headers = { ...headers, Authorization: `Bearer ${freshToken}` };
            res = await fetch('/api/providers/connection-test/stream', {
              method: 'POST',
              headers: {
                ...headers,
                Accept: 'text/event-stream',
              },
              body: JSON.stringify(params),
              signal: controller.signal,
            });
          }
        }

        if (!res.ok || !res.body) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(
            (errJson as any)?.error || `Connection test stream failed with HTTP ${res.status}`
          );
        }

        callbacks.onConnected?.();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const rawChunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');

            const dataLines = rawChunk
              .split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trim())
              .filter(Boolean);

            if (dataLines.length === 0) continue;
            try {
              const parsed = JSON.parse(dataLines.join('\n')) as ConnectionTestStreamEvent & {
                error?: string;
              };
              if (parsed.type === 'start') {
                callbacks.onStart?.({
                  runId: parsed.runId,
                  target: parsed.target,
                  mode: parsed.mode,
                  timestamp: parsed.timestamp,
                });
              } else if (parsed.type === 'step' && parsed.step) {
                callbacks.onStep?.(parsed.step);
              } else if (parsed.type === 'provider_summary' && parsed.summary) {
                callbacks.onProviderSummary?.(parsed.summary);
              } else if (parsed.type === 'complete') {
                callbacks.onComplete?.({
                  runId: parsed.runId,
                  timestamp: parsed.timestamp,
                  summaries: parsed.summaries || [],
                  totalSteps: parsed.totalSteps || 0,
                  passedSteps: parsed.passedSteps || 0,
                });
              } else if ((parsed as any).type === 'error') {
                callbacks.onError?.(
                  new Error(parsed.error || 'Connection test stream reported an error.')
                );
              }
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }
      } catch (err: any) {
        if (!closed && err?.name !== 'AbortError') {
          callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    void run();

    return () => {
      closed = true;
      controller.abort();
    };
  },

  // Admin Provider Management APIs
  adminListProviders: async (): Promise<ProviderConfigPublic[]> => {
    const res = await apiFetchJson<{ ok: true; providers: ProviderConfigPublic[] }>(
      '/api/admin/providers'
    );
    return res.providers || [];
  },

  adminUpdateProvider: async (
    providerId: string,
    updates: {
      displayName?: string;
      clientName?: string;
      enabled?: boolean;
      sandboxMode?: boolean;
      baseUrl?: string;
      autoFallbackEnabled?: boolean;
      pollIntervalMs?: number;
      creditsPerUsd?: number;
      enforceWalletOnUsdProviders?: boolean;
      apiKey?: string;
      sandboxApiKey?: string;
    }
  ): Promise<ProviderConfigPublic> => {
    const res = await apiFetchJson<{ ok: true; provider: ProviderConfigPublic }>(
      `/api/admin/providers/${encodeURIComponent(providerId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );
    return res.provider;
  },

  adminUpsertModel: async (
    providerId: string,
    model: Partial<ProviderModelDefinition> & { modelId: string }
  ): Promise<{ provider: ProviderConfigPublic; model: ProviderModelDefinition }> => {
    const res = await apiFetchJson<{
      ok: true;
      provider: ProviderConfigPublic;
      model: ProviderModelDefinition;
    }>(`/api/admin/providers/${encodeURIComponent(providerId)}/models`, {
      method: 'POST',
      body: JSON.stringify(model),
    });
    return { provider: res.provider, model: res.model };
  },

  adminGetAnalytics: async (): Promise<{
    analytics: MultiProviderAnalyticsSummary;
    recentJobs: UnifiedGenerationJob[];
  }> => {
    const res = await apiFetchJson<{
      ok: true;
      analytics: MultiProviderAnalyticsSummary;
      recentJobs: UnifiedGenerationJob[];
    }>('/api/admin/providers/analytics');
    return { analytics: res.analytics, recentJobs: res.recentJobs || [] };
  },
};

export async function syncUnifiedJobToFirestore(job: UnifiedGenerationJob): Promise<void> {
  if (!job?.job_id || !job?.user_id) return;
  try {
    await setDoc(
      doc(db, 'generationJobs', job.job_id),
      {
        id: job.job_id,
        job_id: job.job_id,
        userId: job.user_id,
        user_id: job.user_id,
        provider: job.provider,
        model_id: job.model_id,
        model_name: job.model_name,
        request_id: job.request_id || '',
        parent_draft_job_id: job.parent_draft_job_id || '',
        prompt: (job.prompt || '').slice(0, 5000),
        image_url: job.image_url || '',
        last_image: job.last_image || '',
        resolution: job.resolution,
        duration: job.duration,
        generate_audio: Boolean(job.generate_audio),
        camera_fixed: Boolean(job.camera_fixed),
        high_bitrate: Boolean(job.high_bitrate),
        draft: Boolean(job.draft),
        draft_request_id: job.draft_request_id || '',
        estimated_cost: job.estimated_cost,
        currency: job.currency,
        reservedCredits: job.credits_deducted || 0,
        status: job.status,
        progress: job.progress || 0,
        provider_output_url: job.provider_output_url || '',
        firebase_storage_path: job.firebase_storage_path || '',
        playback_url: job.playback_url || '',
        videoUrl: job.playback_url || job.provider_output_url || '',
        error: job.error || '',
        created_at: job.created_at,
        createdAt: job.created_at,
        updatedAt: job.updated_at || new Date().toISOString(),
        completed_at: job.completed_at || '',
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `generationJobs/${job.job_id}`);
  }
}

/**
 * Mirrors local backend video into client Firebase Storage if not yet in Firebase Storage
 */
export async function mirrorCompletedVideoToFirebaseStorage(
  job: UnifiedGenerationJob
): Promise<string | null> {
  if (!job.playback_url || !job.user_id || !job.job_id) return null;
  if (job.playback_url.includes('firebasestorage.googleapis.com')) {
    return job.playback_url;
  }
  try {
    const res = await fetch(job.playback_url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.size || blob.size > 100 * 1024 * 1024) return null;
    const path = `generated-videos/${job.user_id}/${job.job_id}/video.mp4`;
    const ref = storageRef(storage, path);
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref, blob, { contentType: 'video/mp4' });
      task.on('state_changed', undefined, reject, () => resolve());
    });
    const downloadUrl = await getDownloadURL(ref);
    await syncUnifiedJobToFirestore({
      ...job,
      firebase_storage_path: path,
      playback_url: downloadUrl,
    });
    return downloadUrl;
  } catch {
    return null;
  }
}

export function subscribeToUserGenerationJobs(
  userId: string,
  onJobs: (jobs: UnifiedGenerationJob[]) => void
): () => void {
  if (!userId) return () => {};
  const q = query(
    collection(db, 'generationJobs'),
    where('userId', '==', userId),
    limit(150)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: UnifiedGenerationJob[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, any>;
        const createdAt = String(d.created_at || d.createdAt || new Date().toISOString());
        items.push({
          job_id: String(d.job_id || d.id || docSnap.id),
          user_id: String(d.user_id || d.userId || userId),
          provider: String(d.provider || 'bytedance'),
          model_id: String(d.model_id || d.model || 'seedance_25_15s'),
          model_name: String(d.model_name || d.model_id || 'Seedance 2.5'),
          request_id: d.request_id || null,
          parent_draft_job_id: d.parent_draft_job_id || null,
          prompt: String(d.prompt || ''),
          image_url: d.image_url || null,
          last_image: d.last_image || null,
          resolution: (d.resolution || '720p') as GenerationResolution,
          duration: Number(d.duration || 5),
          generate_audio: d.generate_audio !== false,
          camera_fixed: Boolean(d.camera_fixed),
          high_bitrate: Boolean(d.high_bitrate),
          draft: Boolean(d.draft),
          draft_request_id: d.draft_request_id || null,
          estimated_cost: Number(d.estimated_cost || 0),
          currency: d.currency === 'USD' ? 'USD' : 'CREDITS',
          status: (String(d.status || 'pending').toLowerCase() as UnifiedGenerationJob['status']),
          progress: Number(d.progress || 0),
          provider_output_url: d.provider_output_url || null,
          firebase_storage_path: d.firebase_storage_path || null,
          playback_url: d.playback_url || d.videoUrl || null,
          error: d.error || null,
          webhook_enabled: typeof d.webhook_enabled === 'boolean' ? d.webhook_enabled : undefined,
          has_nsfw_contents: Array.isArray(d.has_nsfw_contents) ? d.has_nsfw_contents : undefined,
          backend_traces: Array.isArray(d.backend_traces) ? d.backend_traces : undefined,
          created_at: createdAt,
          updated_at: String(d.updatedAt || createdAt),
          completed_at: d.completed_at || null,
        });
      });
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      onJobs(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'generationJobs');
    }
  );
}
