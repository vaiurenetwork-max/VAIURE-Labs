/**
 * VAIURE — Real-Time Generation Event Hub & Signed Webhook Authenticator
 * - Broadcasts live job state updates and individual backend HTTP process steps
 *   via Server-Sent Events (SSE) to active creator dashboards in real time.
 * - Signs & verifies per-job HMAC-SHA256 tokens for MUAPI real-time webhooks (?webhook=...).
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import {
  BackendProcessStage,
  BackendProcessStep,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import { BACKUP_ROOT_DIR } from '../../backupService';
import fs from 'fs';
import path from 'path';

export interface GenerationRealtimeEvent {
  type: 'job_update' | 'trace_step';
  userId: string;
  jobId: string;
  timestamp: string;
  job?: UnifiedGenerationJob;
  trace?: BackendProcessStep;
}

const WEBHOOK_SECRET_FILE = path.join(BACKUP_ROOT_DIR, '.muapi_webhook_hmac_key');

function getWebhookHmacSecret(): Buffer {
  const fromEnv = (
    process.env.MUAPI_WEBHOOK_SECRET ||
    process.env.PROVIDER_VAULT_SECRET ||
    process.env.CURATED_ASSET_SECRET ||
    ''
  ).trim();
  if (fromEnv && fromEnv.length >= 24) {
    return crypto.createHash('sha256').update(fromEnv).digest();
  }
  try {
    if (!fs.existsSync(BACKUP_ROOT_DIR)) {
      fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(WEBHOOK_SECRET_FILE)) {
      const hex = fs.readFileSync(WEBHOOK_SECRET_FILE, 'utf8').trim();
      if (hex.length >= 64) {
        return Buffer.from(hex.slice(0, 64), 'hex');
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(WEBHOOK_SECRET_FILE, generated.toString('hex'), {
      encoding: 'utf8',
      mode: 0o600,
    });
    return generated;
  } catch {
    return crypto.createHash('sha256').update(process.cwd() + ':vaiure-muapi-webhook').digest();
  }
}

export function signMuapiWebhookToken(jobId: string): string {
  const secret = getWebhookHmacSecret();
  return crypto.createHmac('sha256', secret).update(`muapi:webhook:${jobId}`).digest('hex');
}

export function verifyMuapiWebhookToken(jobId: string, token: string): boolean {
  if (!jobId || !token || typeof token !== 'string') return false;
  const expected = signMuapiWebhookToken(jobId);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(token.trim(), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function buildSignedMuapiWebhookUrl(publicOrigin: string, jobId: string): string | undefined {
  if (!publicOrigin) return undefined;
  try {
    const parsed = new URL(publicOrigin);
    const host = parsed.hostname.toLowerCase();
    // Only attach remote ?webhook= when reachable over public HTTPS/HTTP (never localhost)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      parsed.protocol !== 'https:'
    ) {
      return undefined;
    }
    const token = signMuapiWebhookToken(jobId);
    return `${parsed.origin}/api/webhooks/muapi/${encodeURIComponent(jobId)}?token=${token}`;
  } catch {
    return undefined;
  }
}

export function createProcessStep(params: {
  stage: BackendProcessStage;
  method?: 'GET' | 'POST' | 'PUT' | 'INTERNAL';
  endpoint?: string;
  statusCode?: number;
  latencyMs?: number;
  statusLabel: string;
  summary: string;
  requestPreview?: Record<string, unknown>;
  responsePreview?: Record<string, unknown>;
}): BackendProcessStep {
  return {
    id: `step_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    stage: params.stage,
    method: params.method || 'INTERNAL',
    endpoint: params.endpoint,
    statusCode: params.statusCode,
    latencyMs: params.latencyMs,
    statusLabel: params.statusLabel,
    summary: params.summary,
    requestPreview: params.requestPreview,
    responsePreview: params.responsePreview,
  };
}

class GenerationRealtimeBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(500);
  }

  emitJobUpdate(job: UnifiedGenerationJob): void {
    const evt: GenerationRealtimeEvent = {
      type: 'job_update',
      userId: job.user_id,
      jobId: job.job_id,
      timestamp: new Date().toISOString(),
      job,
    };
    this.emitter.emit(`user:${job.user_id}`, evt);
    this.emitter.emit(`job:${job.job_id}`, evt);
  }

  emitTraceStep(userId: string, jobId: string, trace: BackendProcessStep, job?: UnifiedGenerationJob): void {
    const evt: GenerationRealtimeEvent = {
      type: 'trace_step',
      userId,
      jobId,
      timestamp: trace.timestamp,
      trace,
      job,
    };
    this.emitter.emit(`user:${userId}`, evt);
    this.emitter.emit(`job:${jobId}`, evt);
  }

  subscribeUser(userId: string, listener: (evt: GenerationRealtimeEvent) => void): () => void {
    const channel = `user:${userId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }

  subscribeJob(jobId: string, listener: (evt: GenerationRealtimeEvent) => void): () => void {
    const channel = `job:${jobId}`;
    this.emitter.on(channel, listener);
    return () => this.emitter.off(channel, listener);
  }
}

export const generationRealtimeBus = new GenerationRealtimeBus();
