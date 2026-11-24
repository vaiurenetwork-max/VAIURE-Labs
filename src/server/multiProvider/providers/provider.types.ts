/**
 * Standardized Provider Adapter Interface
 * Every AI video provider (ByteDance, MUAPI, future providers) implements this contract
 * without leaking provider-specific request payloads into the unified frontend or core orchestration.
 */

import {
  NormalizedJobStatus,
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
  UnifiedGenerationInput,
} from '../../../types/multiProvider';

export interface ProviderSubmissionResponse {
  ok: boolean;
  httpStatus: number;
  requestId?: string;
  status: NormalizedJobStatus;
  outputUrl?: string;
  endpointCalled?: string;
  latencyMs?: number;
  requestHeadersMasked?: Record<string, string>;
  rawPayloadSanitized?: Record<string, unknown>;
  responseBodySanitized?: Record<string, unknown>;
  error?: string;
  retryable?: boolean;
}

export interface ProviderPollResponse {
  ok: boolean;
  httpStatus: number;
  requestId: string;
  status: NormalizedJobStatus;
  progress: number;
  outputs: string[];
  outputUrl?: string;
  hasNsfwContents?: boolean[];
  endpointCalled?: string;
  latencyMs?: number;
  responseBodySanitized?: Record<string, unknown>;
  error?: string;
  retryable?: boolean;
}

export interface VideoProviderAdapter {
  readonly providerId: ProviderId;

  getCapabilities(): ProviderConfigPublic;

  calculateEstimatedPrice(
    model: ProviderModelDefinition,
    input: {
      resolution: UnifiedGenerationInput['resolution'];
      duration: number;
      draft?: boolean;
      referenceImagesCount?: number;
      physicsPriority?: boolean;
    }
  ): PriceEstimateBreakdown;

  submitGeneration(
    model: ProviderModelDefinition,
    input: UnifiedGenerationInput,
    options?: { publicOrigin?: string; webhookUrl?: string }
  ): Promise<ProviderSubmissionResponse>;

  getGenerationStatus(
    requestId: string,
    model?: ProviderModelDefinition
  ): Promise<ProviderPollResponse>;

  retrieveGenerationResult(
    requestId: string,
    model?: ProviderModelDefinition
  ): Promise<ProviderPollResponse>;
}
