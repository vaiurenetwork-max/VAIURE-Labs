/**
 * VAIURE — Unified Multi-Provider AI Video Generation Types
 * Supports Provider A (ByteDance Official ModelArk) and Provider B (MUAPI Seedance 2.5 Spicy),
 * plus admin-extensible MUAPI / custom provider models.
 */

export type ProviderId = 'bytedance' | 'muapi' | (string & {});

export type GenerationResolution = '480p' | '720p' | '1080p' | '4K';

export type GenerationDuration = 5 | 10 | 15 | 20 | 30;

export type NormalizedJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type BillingCurrency = 'USD' | 'CREDITS';

export type BackendProcessStage =
  | 'VALIDATE'
  | 'PRICING'
  | 'PROVIDER_SUBMIT'
  | 'POLL'
  | 'WEBHOOK'
  | 'MEDIA_ARCHIVE'
  | 'FIREBASE_SYNC'
  | 'ERROR';

export interface BackendProcessStep {
  id: string;
  timestamp: string;
  stage: BackendProcessStage;
  method?: 'GET' | 'POST' | 'PUT' | 'INTERNAL';
  endpoint?: string;
  statusCode?: number;
  latencyMs?: number;
  statusLabel: string;
  summary: string;
  requestPreview?: Record<string, unknown>;
  responsePreview?: Record<string, unknown>;
}

export interface ProviderModelDefinition {
  providerId: ProviderId;
  modelId: string;
  displayName: string;
  clientName?: string;
  submitEndpoint?: string;
  resultEndpointTemplate?: string;
  enabled: boolean;
  category: 'Video' | 'Motion / R2V' | 'Image-to-Video';
  supportsImageToVideo: boolean;
  supportsTextToVideo: boolean;
  requiresStartImage: boolean;
  supportsLastImage: boolean;
  supportsReferencePlates: boolean;
  maxReferenceImages: number;
  supportsDraftMode: boolean;
  supportsAudio: boolean;
  supportsCameraFixed: boolean;
  supportsHighBitrate: boolean;
  resolutions: GenerationResolution[];
  durations: GenerationDuration[];
  enabledResolutions: GenerationResolution[];
  enabledDurations: GenerationDuration[];
  pricingCurrency: BillingCurrency;
  /** resolution -> duration(seconds) -> base provider USD price */
  usdPricingMatrix?: Record<string, Record<number, number>>;
  appMarkupPercent: number;
  appMarkupFlatUsd: number;
  safetyCheckerLockedOn: boolean;
  safetyNotice: string;
  notes?: string;
}

export interface ProviderConfigPublic {
  providerId: ProviderId;
  displayName: string;
  clientName?: string;
  enabled: boolean;
  configured: boolean;
  keyMask?: string;
  sandboxMode?: boolean;
  sandboxConfigured?: boolean;
  sandboxKeyMask?: string;
  baseUrl: string;
  autoFallbackEnabled: boolean;
  pollIntervalMs: number;
  maxPollTimeoutMs: number;
  creditsPerUsd: number;
  enforceWalletOnUsdProviders: boolean;
  safetyCheckerLockedOn: boolean;
  safetyNotice: string;
  models: ProviderModelDefinition[];
  updatedAt: string;
}

export interface PriceEstimateRequest {
  provider: ProviderId;
  modelId: string;
  resolution: GenerationResolution;
  duration: number;
  draft?: boolean;
  referenceImagesCount?: number;
  physicsPriority?: boolean;
  quantity?: number;
  generateAudio?: boolean;
  highBitrate?: boolean;
}

export interface PriceEstimateBreakdown {
  provider: ProviderId;
  modelId: string;
  effectiveResolution: GenerationResolution;
  duration: number;
  draft: boolean;
  currency: BillingCurrency;
  providerCostUsd: number;
  appMarkupUsd: number;
  finalPriceUsd: number;
  creditsRequired: number;
  displayLabel: string;
  billingMode: 'USD' | 'CREDITS';
}

export interface UnifiedGenerationInput {
  provider: ProviderId;
  model_id: string;
  prompt: string;
  image_url?: string;
  last_image?: string;
  reference_image_urls?: string[];
  aspect_ratio?: string;
  resolution: GenerationResolution;
  duration: number;
  generate_audio?: boolean;
  camera_fixed?: boolean;
  high_bitrate?: boolean;
  draft?: boolean;
  draft_request_id?: string;
  parent_draft_job_id?: string;
  physics_priority?: boolean;
  content_rating?: '18+' | 'standard';
  idempotency_key?: string;
}

export interface UnifiedGenerationJob {
  job_id: string;
  user_id: string;
  user_email?: string;
  provider: ProviderId;
  model_id: string;
  model_name: string;
  request_id: string | null;
  parent_draft_job_id: string | null;
  prompt: string;
  image_url: string | null;
  last_image: string | null;
  reference_image_urls?: string[];
  aspect_ratio?: string;
  resolution: GenerationResolution;
  duration: number;
  generate_audio: boolean;
  camera_fixed: boolean;
  high_bitrate: boolean;
  draft: boolean;
  draft_request_id: string | null;
  estimated_cost: number;
  provider_cost_usd?: number;
  markup_usd?: number;
  credits_deducted?: number;
  currency: BillingCurrency;
  status: NormalizedJobStatus;
  progress: number;
  provider_output_url: string | null;
  firebase_storage_path: string | null;
  firebase_thumbnail_path?: string | null;
  local_media_path?: string | null;
  playback_url: string | null;
  thumbnail_url?: string | null;
  error: string | null;
  retry_count?: number;
  idempotency_key?: string | null;
  refunded?: boolean;
  webhook_enabled?: boolean;
  has_nsfw_contents?: boolean[];
  backend_traces?: BackendProcessStep[];
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ApiUsageLogEntry {
  id: string;
  timestamp: string;
  provider: ProviderId;
  model_id: string;
  job_id: string;
  user_id: string;
  action: 'SUBMIT' | 'POLL' | 'WEBHOOK' | 'MEDIA_ARCHIVE' | 'FINALIZE_DRAFT' | 'ADMIN_UPDATE';
  success: boolean;
  httpStatus?: number;
  latencyMs?: number;
  estimatedCostUsd?: number;
  error?: string;
}

export interface MultiProviderAnalyticsSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  activeJobs: number;
  draftJobs: number;
  finalizedJobs: number;
  totalEstimatedRevenueUsd: number;
  totalProviderCostUsd: number;
  totalMarkupUsd: number;
  totalStoredBytes: number;
  storedFilesCount: number;
  byProvider: Record<
    string,
    {
      total: number;
      completed: number;
      failed: number;
      active: number;
      totalCostUsd: number;
    }
  >;
  recentLogs: ApiUsageLogEntry[];
}

export type ConnectionTestTarget = 'all' | 'bytedance' | 'muapi';
export type ConnectionTestMode = 'live_probe' | 'simulate_pipeline';
export type ConnectionSituationStatus =
  | 'connected'
  | 'reachable_auth_failed'
  | 'key_unset'
  | 'unreachable'
  | 'simulated_ok'
  | 'error';

export interface BackendConnectionTestStep {
  id: string;
  timestamp: string;
  provider: ProviderId | 'system';
  phase:
    | 'ENV_CHECK'
    | 'LIVE_PROBE'
    | 'PAYLOAD_BUILD'
    | 'PRICING_LOCK'
    | 'WEBHOOK_HMAC'
    | 'SIMULATED_SUBMIT'
    | 'SIMULATED_POLL'
    | 'SSE_VERIFY';
  method: 'GET' | 'POST' | 'INTERNAL';
  endpoint: string;
  httpStatus?: number;
  latencyMs: number;
  ok: boolean;
  simulated?: boolean;
  statusLabel: string;
  summary: string;
  requestPreview?: Record<string, unknown>;
  responsePreview?: Record<string, unknown>;
}

export interface ProviderConnectionSummary {
  providerId: 'bytedance' | 'muapi';
  displayName: string;
  situation: ConnectionSituationStatus;
  configured: boolean;
  keyMask?: string;
  sandboxMode?: boolean;
  muapiAccountBalanceUsd?: number;
  endpoint: string;
  httpStatus?: number;
  latencyMs?: number;
  pollIntervalMs: number;
  webhookReady: boolean;
  detail: string;
}

export type ConnectionTestStreamEvent =
  | {
      type: 'start';
      runId: string;
      target: ConnectionTestTarget;
      mode: ConnectionTestMode;
      timestamp: string;
    }
  | {
      type: 'step';
      runId: string;
      step: BackendConnectionTestStep;
    }
  | {
      type: 'provider_summary';
      runId: string;
      summary: ProviderConnectionSummary;
    }
  | {
      type: 'complete';
      runId: string;
      timestamp: string;
      summaries: ProviderConnectionSummary[];
      totalSteps: number;
      passedSteps: number;
    };

