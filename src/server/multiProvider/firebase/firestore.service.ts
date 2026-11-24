/**
 * Generation Jobs Store & Firestore Real-Time Mirror Service
 * - Persists authoritative generation records atomically to uploads/generation_jobs_db.json
 * - Persists API usage & cost monitoring logs to uploads/api_usage_logs.json
 * - Mirrors generationJobs/{jobId} to Firestore REST API when a valid user Bearer token is active in memory
 *   (and client real-time listeners also sync/subscribe directly via Firestore SDK).
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ApiUsageLogEntry,
  BackendProcessStep,
  MultiProviderAnalyticsSummary,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import { generationRealtimeBus } from '../services/realtimeEvents.service';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const JOBS_DB_FILE = path.join(UPLOADS_DIR, 'generation_jobs_db.json');
const USAGE_LOGS_FILE = path.join(UPLOADS_DIR, 'api_usage_logs.json');

interface FirebaseConfigFile {
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

function readFirebaseConfig(): FirebaseConfigFile {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (parsed?.projectId) return parsed;
    }
  } catch {
    // ignore
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || 'cedar-totality-28f9p',
    firestoreDatabaseId: '(default)',
  };
}

const FIREBASE_CFG = readFirebaseConfig();

/**
 * Ephemeral in-memory Bearer token cache (NEVER persisted to disk)
 * Allows background worker to sync completed job & storage paths to Firestore/Storage
 * even after user closes browser during normal ~1h token lifetime.
 */
const ephemeralUserTokens = new Map<string, { token: string; expiresAt: number }>();

export function cacheEphemeralUserToken(userId: string, token?: string | null): void {
  if (!userId || !token) return;
  ephemeralUserTokens.set(userId, {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000,
  });
}

export function getEphemeralUserToken(userId: string): string | null {
  const entry = ephemeralUserTokens.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ephemeralUserTokens.delete(userId);
    return null;
  }
  return entry.token;
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

class GenerationJobsStore {
  private jobs = new Map<string, UnifiedGenerationJob>();
  private usageLogs: ApiUsageLogEntry[] = [];

  constructor() {
    this.load();
  }

  private ensureDir(): void {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }

  private load(): void {
    try {
      this.ensureDir();
      if (fs.existsSync(JOBS_DB_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(JOBS_DB_FILE, 'utf8'));
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item?.job_id) {
              this.jobs.set(item.job_id, item);
            }
          }
        }
      }
      if (fs.existsSync(USAGE_LOGS_FILE)) {
        const parsedLogs = JSON.parse(fs.readFileSync(USAGE_LOGS_FILE, 'utf8'));
        if (Array.isArray(parsedLogs)) {
          this.usageLogs = parsedLogs.slice(0, 1000);
        }
      }
    } catch {
      // start fresh on corrupt file
    }
  }

  private persistJobs(): void {
    try {
      this.ensureDir();
      const ordered = Array.from(this.jobs.values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2000);
      const tmp = `${JOBS_DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(ordered, null, 2), 'utf8');
      fs.renameSync(tmp, JOBS_DB_FILE);
    } catch {
      // ignore disk failure
    }
  }

  private persistLogs(): void {
    try {
      this.ensureDir();
      const tmp = `${USAGE_LOGS_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.usageLogs.slice(0, 1000), null, 2), 'utf8');
      fs.renameSync(tmp, USAGE_LOGS_FILE);
    } catch {
      // ignore disk failure
    }
  }

  upsertJob(job: UnifiedGenerationJob): UnifiedGenerationJob {
    const clean: UnifiedGenerationJob = {
      ...job,
      backend_traces: Array.isArray(job.backend_traces) ? job.backend_traces.slice(-60) : [],
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(clean.job_id, clean);
    this.persistJobs();
    generationRealtimeBus.emitJobUpdate(clean);
    // Fire-and-forget Firestore REST mirror if user token is cached
    void this.syncJobToFirestoreRest(clean).catch(() => undefined);
    return clean;
  }

  updateJob(jobId: string, patch: Partial<UnifiedGenerationJob>): UnifiedGenerationJob | null {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const updated: UnifiedGenerationJob = {
      ...existing,
      ...patch,
      backend_traces: Array.isArray(patch.backend_traces)
        ? patch.backend_traces.slice(-60)
        : existing.backend_traces || [],
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    this.persistJobs();
    generationRealtimeBus.emitJobUpdate(updated);
    void this.syncJobToFirestoreRest(updated).catch(() => undefined);
    return updated;
  }

  appendJobTrace(jobId: string, step: BackendProcessStep): UnifiedGenerationJob | null {
    const existing = this.jobs.get(jobId);
    if (!existing) return null;
    const nextTraces = [...(existing.backend_traces || []), step].slice(-60);
    const updated: UnifiedGenerationJob = {
      ...existing,
      backend_traces: nextTraces,
      updated_at: new Date().toISOString(),
    };
    this.jobs.set(jobId, updated);
    this.persistJobs();
    generationRealtimeBus.emitTraceStep(updated.user_id, jobId, step, updated);
    return updated;
  }

  getJob(jobId: string): UnifiedGenerationJob | null {
    return this.jobs.get(jobId) || null;
  }

  findByIdempotencyKey(userId: string, idempotencyKey: string): UnifiedGenerationJob | null {
    if (!idempotencyKey) return null;
    for (const job of this.jobs.values()) {
      if (job.user_id === userId && job.idempotency_key === idempotencyKey) {
        return job;
      }
    }
    return null;
  }

  findByDraftRequestId(userId: string, draftRequestId: string): UnifiedGenerationJob | null {
    if (!draftRequestId) return null;
    for (const job of this.jobs.values()) {
      if (job.user_id === userId && job.request_id === draftRequestId) {
        return job;
      }
    }
    return null;
  }

  listUserJobs(userId: string): UnifiedGenerationJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  listActiveJobs(): UnifiedGenerationJob[] {
    return Array.from(this.jobs.values()).filter(
      (j) => j.status === 'pending' || j.status === 'processing'
    );
  }

  listAllJobsAdmin(limitCount = 200): UnifiedGenerationJob[] {
    return Array.from(this.jobs.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limitCount);
  }

  deleteJob(jobId: string, userId: string, isAdmin = false): boolean {
    const existing = this.jobs.get(jobId);
    if (!existing) return false;
    if (existing.user_id !== userId && !isAdmin) {
      throw new Error('Access denied: cannot delete another user’s generation job.');
    }
    this.jobs.delete(jobId);
    this.persistJobs();
    void this.deleteJobFromFirestoreRest(jobId, existing.user_id).catch(() => undefined);
    return true;
  }

  addUsageLog(entry: Omit<ApiUsageLogEntry, 'id' | 'timestamp'>): ApiUsageLogEntry {
    const full: ApiUsageLogEntry = {
      id: `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.usageLogs.unshift(full);
    if (this.usageLogs.length > 1000) {
      this.usageLogs = this.usageLogs.slice(0, 1000);
    }
    this.persistLogs();
    return full;
  }

  getUsageLogs(limitCount = 100): ApiUsageLogEntry[] {
    return this.usageLogs.slice(0, limitCount);
  }

  getAnalyticsSummary(storageStats: { totalBytes: number; fileCount: number }): MultiProviderAnalyticsSummary {
    const all = Array.from(this.jobs.values());
    const byProvider: MultiProviderAnalyticsSummary['byProvider'] = {};
    let completedJobs = 0;
    let failedJobs = 0;
    let activeJobs = 0;
    let draftJobs = 0;
    let finalizedJobs = 0;
    let totalEstimatedRevenueUsd = 0;
    let totalProviderCostUsd = 0;
    let totalMarkupUsd = 0;

    for (const j of all) {
      if (!byProvider[j.provider]) {
        byProvider[j.provider] = { total: 0, completed: 0, failed: 0, active: 0, totalCostUsd: 0 };
      }
      byProvider[j.provider].total++;
      if (j.status === 'completed') {
        completedJobs++;
        byProvider[j.provider].completed++;
      } else if (j.status === 'failed') {
        failedJobs++;
        byProvider[j.provider].failed++;
      } else {
        activeJobs++;
        byProvider[j.provider].active++;
      }
      if (j.draft) draftJobs++;
      if (j.parent_draft_job_id || j.draft_request_id) finalizedJobs++;

      if (j.status !== 'failed' && !j.refunded) {
        const rev = j.currency === 'USD' ? Number(j.estimated_cost || 0) : 0;
        const prov = Number(j.provider_cost_usd || rev || 0);
        const markup = Number(j.markup_usd || 0);
        totalEstimatedRevenueUsd += rev;
        totalProviderCostUsd += prov;
        totalMarkupUsd += markup;
        byProvider[j.provider].totalCostUsd =
          Math.round((byProvider[j.provider].totalCostUsd + rev) * 100) / 100;
      }
    }

    return {
      totalJobs: all.length,
      completedJobs,
      failedJobs,
      activeJobs,
      draftJobs,
      finalizedJobs,
      totalEstimatedRevenueUsd: Math.round(totalEstimatedRevenueUsd * 100) / 100,
      totalProviderCostUsd: Math.round(totalProviderCostUsd * 100) / 100,
      totalMarkupUsd: Math.round(totalMarkupUsd * 100) / 100,
      totalStoredBytes: storageStats.totalBytes,
      storedFilesCount: storageStats.fileCount,
      byProvider,
      recentLogs: this.usageLogs.slice(0, 60),
    };
  }

  async syncJobToFirestoreRest(job: UnifiedGenerationJob): Promise<boolean> {
    const token = getEphemeralUserToken(job.user_id);
    if (!token) return false;
    const dbId = FIREBASE_CFG.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_CFG.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents/generationJobs/${encodeURIComponent(
      job.job_id
    )}`;

    const docPayload = {
      fields: {
        id: toFirestoreValue(job.job_id),
        job_id: toFirestoreValue(job.job_id),
        userId: toFirestoreValue(job.user_id),
        user_id: toFirestoreValue(job.user_id),
        provider: toFirestoreValue(job.provider),
        model_id: toFirestoreValue(job.model_id),
        model_name: toFirestoreValue(job.model_name),
        request_id: toFirestoreValue(job.request_id || ''),
        parent_draft_job_id: toFirestoreValue(job.parent_draft_job_id || ''),
        prompt: toFirestoreValue(job.prompt.slice(0, 5000)),
        image_url: toFirestoreValue(job.image_url || ''),
        last_image: toFirestoreValue(job.last_image || ''),
        resolution: toFirestoreValue(job.resolution),
        duration: toFirestoreValue(job.duration),
        generate_audio: toFirestoreValue(job.generate_audio),
        camera_fixed: toFirestoreValue(job.camera_fixed),
        high_bitrate: toFirestoreValue(job.high_bitrate),
        draft: toFirestoreValue(job.draft),
        draft_request_id: toFirestoreValue(job.draft_request_id || ''),
        estimated_cost: toFirestoreValue(job.estimated_cost),
        currency: toFirestoreValue(job.currency),
        reservedCredits: toFirestoreValue(job.credits_deducted || 0),
        status: toFirestoreValue(job.status),
        progress: toFirestoreValue(job.progress),
        provider_output_url: toFirestoreValue(job.provider_output_url || ''),
        firebase_storage_path: toFirestoreValue(job.firebase_storage_path || ''),
        playback_url: toFirestoreValue(job.playback_url || ''),
        videoUrl: toFirestoreValue(job.playback_url || job.provider_output_url || ''),
        error: toFirestoreValue(job.error || ''),
        created_at: toFirestoreValue(job.created_at),
        createdAt: toFirestoreValue(job.created_at),
        updatedAt: toFirestoreValue(job.updated_at),
        completed_at: toFirestoreValue(job.completed_at || ''),
      },
    };

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(docPayload),
    });
    return res.ok;
  }

  private async deleteJobFromFirestoreRest(jobId: string, userId: string): Promise<void> {
    const token = getEphemeralUserToken(userId);
    if (!token) return;
    const dbId = FIREBASE_CFG.firestoreDatabaseId || '(default)';
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      FIREBASE_CFG.projectId
    )}/databases/${encodeURIComponent(dbId)}/documents/generationJobs/${encodeURIComponent(
      jobId
    )}`;
    await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

export const generationJobsStore = new GenerationJobsStore();
