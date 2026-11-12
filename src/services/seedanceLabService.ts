/**
 * VAIURE — SEEDANCE LAB SERVICE
 * Professional AI Video Production Workspace
 * Exclusively communicates with the PosBot Developer API v1 via secure server-side routes:
 * - /api/ai/health
 * - /api/ai/models
 * - /api/ai/balance
 * - /api/ai/generate
 * - /api/ai/status/:jobCode (or /api/ai/jobs/:jobCode)
 * - /api/ai/history
 * - /api/ai/upload-media
 */

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
    maxPromptLength: 8000,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'High-fidelity 15s cinematic motion, fluid cloth dynamics, and atmospheric lighting. Multi-image capable.',
  },
  seedance_25_30s: {
    id: 'seedance_25_30s',
    name: 'Seedance 2.5 720p (30s)',
    label: 'Seedance 2.5 — 30 Seconds',
    durationSeconds: 30,
    isR2V: false,
    rateIdr: 4500,
    costGenerate: 7,
    maxPromptLength: 8000,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Extended 30s continuous storytelling, sustained camera arcs, and temporal consistency. Multi-image capable.',
  },
  seedance_25_15s_r2v: {
    id: 'seedance_25_15s_r2v',
    name: 'Seedance 2.5 R2V (15s)',
    label: 'Seedance 2.5 — 15 Seconds (Reference-to-Video)',
    durationSeconds: 15,
    isR2V: true,
    rateIdr: 4000,
    costGenerate: 4,
    maxPromptLength: 8000,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Reference-to-Video transfer with multi-image character identity, outfit, and environment preservation.',
  },
  seedance_25_30s_r2v: {
    id: 'seedance_25_30s_r2v',
    name: 'Seedance 2.5 R2V (30s)',
    label: 'Seedance 2.5 — 30 Seconds (Reference-to-Video)',
    durationSeconds: 30,
    isR2V: true,
    rateIdr: 4500,
    costGenerate: 7,
    maxPromptLength: 8000,
    nativeResolution: '720P',
    supportedAspectRatios: ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    description: 'Full 30-second extended Reference-to-Video sequence with strict character lock across complex camera motions.',
  },
};

export interface SeedanceGenerateParams {
  model: SeedanceModelKey;
  prompt: string;
  aspect_ratio: string;
  reference_image_urls?: string[];
  sound_enabled?: boolean;
  resolution?: string;
  video_format?: string;
  quantity?: number;
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

export interface PosBotHistoryItem {
  id: string;
  job_code: string;
  model: string;
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
  balance_generate: number;
  balance_idr_equivalent: number;
  unit_value_idr: number;
  source?: string;
}

export interface SeedanceHealthStatus {
  ok: boolean;
  service?: string;
  version?: string;
  baseUrl?: string;
  serverKeyConfigured?: boolean;
  serverKeyStatus?: string;
  upstreamTunnelOffline?: boolean;
  time?: string;
}

class SeedanceLabService {
  /**
   * Fetches real account balance from server /api/ai/balance
   */
  async getBalance(): Promise<SeedanceAccountBalance> {
    const res = await fetch('/api/ai/balance');
    if (!res.ok) {
      throw new Error(`Failed to query balance: HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      balance_generate: data.balance_generate ?? 0,
      balance_idr_equivalent: data.balance_idr_equivalent ?? 0,
      unit_value_idr: data.unit_value_idr ?? 400,
      source: data.source,
    };
  }

  /**
   * Fetches backend health from /api/ai/health
   */
  async getHealth(): Promise<SeedanceHealthStatus> {
    const res = await fetch('/api/ai/health');
    if (!res.ok) {
      return { ok: false, service: 'Offline', upstreamTunnelOffline: true };
    }
    return await res.json();
  }

  /**
   * Uploads base64 or file data to server /api/ai/upload-media to receive a public HTTPS URL
   */
  async uploadMedia(dataUrl: string, fileName?: string): Promise<string> {
    const res = await fetch('/api/ai/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, fileName }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !data.url) {
      throw new Error(data.error || 'Failed to host reference image.');
    }
    return data.url;
  }

  /**
   * Submits generation to /api/ai/generate
   */
  async submitGeneration(params: SeedanceGenerateParams): Promise<{
    jobCode: string;
    costGenerate: number;
    remainingBalance?: number;
    immediateResultUrl?: string;
  }> {
    const payload: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt.trim(),
      aspect_ratio: params.aspect_ratio === 'Smart' ? '16:9' : params.aspect_ratio,
    };

    if (params.reference_image_urls && params.reference_image_urls.length > 0) {
      payload.reference_image_urls = params.reference_image_urls;
      payload.image_urls = params.reference_image_urls;
      payload.image_url = params.reference_image_urls[0];
    }

    const res = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.ok || !data.job_code) {
      throw new Error(data.error || 'Generation request was rejected by server.');
    }

    return {
      jobCode: data.job_code,
      costGenerate: data.cost_generate ?? 4,
      remainingBalance: data.remaining_balance_generate,
      immediateResultUrl: data.result_url || data.outputUrl,
    };
  }

  /**
   * Polls job status from /api/ai/status/:jobCode (or /api/ai/jobs/:jobCode)
   */
  async pollJobStatus(jobCode: string): Promise<{
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    resultUrl?: string | null;
    error?: string | null;
  }> {
    const res = await fetch(`/api/ai/status/${encodeURIComponent(jobCode)}`);
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
      };
    }

    if (rawStatus === 'failed') {
      return {
        status: 'failed',
        progress: 0,
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
   * Fetches generation history from /api/ai/history
   */
  async getHistory(): Promise<PosBotHistoryItem[]> {
    const res = await fetch('/api/ai/history');
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    const allItems: PosBotHistoryItem[] = Array.isArray(data.items) ? data.items : [];
    // Prioritize Seedance 2.5 generations or include all for comprehensive view
    return allItems;
  }

  /**
   * Deletes a generation history entry
   */
  async deleteHistoryEntry(idOrJobCode: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(idOrJobCode)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const seedanceLabService = new SeedanceLabService();
