/**
 * Provider A — ByteDance Official Adapter
 * Preserves existing BytePlus ModelArk API v3 client, endpoints, auth, params, pricing, and workflow untouched.
 */

import {
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderModelDefinition,
  UnifiedGenerationInput,
} from '../../../types/multiProvider';
import { byteDanceClient, redactSecret } from '../../bytedanceClient';
import { MODEL_BY_KEY, validateGeneratePayload } from '../../bytedanceSchema';
import {
  calculateDynamicGenerationCost,
  DEFAULT_USD_TO_IDR,
  seedancePlatformStore,
} from '../../seedancePlatformStore';
import { roundUsd } from '../config/pricing.config';
import { providerConfigStore } from '../config/provider.config';
import {
  ProviderPollResponse,
  ProviderSubmissionResponse,
  VideoProviderAdapter,
} from './provider.types';

export class ByteDanceProviderAdapter implements VideoProviderAdapter {
  readonly providerId = 'bytedance' as const;

  getCapabilities(): ProviderConfigPublic {
    const cfg = providerConfigStore.getInternalProvider('bytedance');
    if (!cfg) {
      throw new Error('ByteDance provider configuration missing.');
    }
    return providerConfigStore.toPublicConfig(cfg);
  }

  calculateEstimatedPrice(
    model: ProviderModelDefinition,
    input: {
      resolution: UnifiedGenerationInput['resolution'];
      duration: number;
      draft?: boolean;
      referenceImagesCount?: number;
      physicsPriority?: boolean;
    }
  ): PriceEstimateBreakdown {
    const costConfig = seedancePlatformStore.getCostConfig();
    const resKey =
      input.resolution === '480p' || input.resolution === '1080p' ? input.resolution : '720p';
    const calc = calculateDynamicGenerationCost(costConfig, {
      modelKey: model.modelId,
      resolution: resKey,
      duration: input.duration,
      referenceImagesCount: input.referenceImagesCount || 0,
      physicsPriority: input.physicsPriority !== false,
      quantity: 1,
    });

    const retailUsd = roundUsd(calc.retailPriceEquivalentIdr / DEFAULT_USD_TO_IDR);

    return {
      provider: 'bytedance',
      modelId: model.modelId,
      effectiveResolution: resKey,
      duration: calc.duration,
      draft: false,
      currency: 'CREDITS',
      providerCostUsd: roundUsd(calc.estimatedApiCostUsd),
      appMarkupUsd: roundUsd(Math.max(0, retailUsd - calc.estimatedApiCostUsd)),
      finalPriceUsd: retailUsd,
      creditsRequired: calc.totalCreditDeduction,
      displayLabel: `${calc.totalCreditDeduction} Credits (Rp ${calc.retailPriceEquivalentIdr.toLocaleString('id-ID')})`,
      billingMode: 'CREDITS',
    };
  }

  async submitGeneration(
    model: ProviderModelDefinition,
    input: UnifiedGenerationInput
  ): Promise<ProviderSubmissionResponse> {
    const candidatePayload: Record<string, unknown> = {
      model: model.modelId,
      prompt: input.prompt,
      aspect_ratio: input.aspect_ratio || '16:9',
      resolution: input.resolution === '4K' ? '1080p' : input.resolution,
      duration: input.duration,
      sound_enabled: input.generate_audio !== false,
      camera_fixed: Boolean(input.camera_fixed),
      physics_priority: input.physics_priority !== false,
      content_rating: input.content_rating === '18+' ? '18+' : 'standard',
    };

    if (input.image_url) {
      candidatePayload.image_url = input.image_url;
    }
    if (input.last_image) {
      candidatePayload.end_image_url = input.last_image;
    }
    if (Array.isArray(input.reference_image_urls) && input.reference_image_urls.length > 0) {
      candidatePayload.reference_image_urls = input.reference_image_urls;
    }

    const validation = validateGeneratePayload(candidatePayload);
    if (!validation.valid || !validation.sanitizedPayload) {
      return {
        ok: false,
        httpStatus: 400,
        status: 'failed',
        error: validation.error || 'Invalid ByteDance generation parameters.',
      };
    }

    const startMs = Date.now();
    const baseUrl =
      providerConfigStore.getInternalProvider('bytedance')?.baseUrl ||
      'https://ark.ap-southeast.bytepluses.com/api/v3';
    const submitEndpoint = `${baseUrl.replace(/\/+$/, '')}/contents/generations/tasks`;
    const upstream = await byteDanceClient.submitGenerate(validation.sanitizedPayload);
    const latencyMs = Date.now() - startMs;
    if (!upstream.ok || !upstream.data) {
      return {
        ok: false,
        httpStatus: upstream.status || 502,
        status: 'failed',
        endpointCalled: submitEndpoint,
        latencyMs,
        rawPayloadSanitized: {
          model: MODEL_BY_KEY[model.modelId]?.upstreamModelId || model.modelId,
          duration: input.duration,
          resolution: candidatePayload.resolution,
        },
        error: redactSecret(upstream.error || 'ByteDance ModelArk submission failed.'),
        retryable: upstream.status >= 500 || upstream.status === 429,
      };
    }

    const rawStatus = String(upstream.data.status || 'queued').toLowerCase();
    const hasOutput = Boolean(upstream.data.result_url);
    const status =
      rawStatus === 'completed' && hasOutput
        ? 'completed'
        : rawStatus === 'failed' || rawStatus === 'cancelled'
        ? 'failed'
        : 'processing';

    return {
      ok: true,
      httpStatus: upstream.status || 200,
      requestId: upstream.data.job_code,
      status,
      outputUrl: upstream.data.result_url || undefined,
      endpointCalled: submitEndpoint,
      latencyMs,
      rawPayloadSanitized: {
        model: MODEL_BY_KEY[model.modelId]?.upstreamModelId || model.modelId,
        duration: input.duration,
        resolution: candidatePayload.resolution,
      },
      responseBodySanitized: {
        job_code: upstream.data.job_code,
        status: upstream.data.status,
        result_url: upstream.data.result_url || undefined,
      },
    };
  }

  async getGenerationStatus(requestId: string): Promise<ProviderPollResponse> {
    const startMs = Date.now();
    const baseUrl =
      providerConfigStore.getInternalProvider('bytedance')?.baseUrl ||
      'https://ark.ap-southeast.bytepluses.com/api/v3';
    const pollEndpoint = `${baseUrl.replace(/\/+$/, '')}/contents/generations/tasks/${encodeURIComponent(requestId)}`;
    const upstream = await byteDanceClient.getTaskStatus(requestId);
    const latencyMs = Date.now() - startMs;
    if (!upstream.ok || !upstream.data) {
      return {
        ok: false,
        httpStatus: upstream.status || 502,
        requestId,
        status: 'processing',
        progress: 25,
        outputs: [],
        endpointCalled: pollEndpoint,
        latencyMs,
        error: redactSecret(upstream.error || 'Failed to poll ByteDance task status.'),
        retryable: upstream.status >= 500 || upstream.status === 429,
      };
    }

    const st = String(upstream.data.status || '').toLowerCase();
    const outputs = upstream.data.result_url ? [upstream.data.result_url] : [];
    const outputUrl = outputs[0];
    const responseBodySanitized = {
      status: upstream.data.status,
      progress: upstream.data.progress,
      result_url: upstream.data.result_url || undefined,
      error_message: upstream.data.error_message || undefined,
    };

    if ((st === 'completed' || st === 'succeeded') && outputUrl) {
      return {
        ok: true,
        httpStatus: upstream.status,
        requestId,
        status: 'completed',
        progress: 100,
        outputs,
        outputUrl,
        endpointCalled: pollEndpoint,
        latencyMs,
        responseBodySanitized,
      };
    }

    if (st === 'failed' || st === 'cancelled' || st === 'error') {
      return {
        ok: true,
        httpStatus: upstream.status,
        requestId,
        status: 'failed',
        progress: 0,
        outputs: [],
        endpointCalled: pollEndpoint,
        latencyMs,
        responseBodySanitized,
        error: redactSecret(upstream.data.error_message || `ByteDance task ${st}.`),
      };
    }

    return {
      ok: true,
      httpStatus: upstream.status,
      requestId,
      status: st === 'queued' ? 'pending' : 'processing',
      progress: upstream.data.progress || 45,
      outputs: [],
      endpointCalled: pollEndpoint,
      latencyMs,
      responseBodySanitized,
    };
  }

  async retrieveGenerationResult(requestId: string): Promise<ProviderPollResponse> {
    return this.getGenerationStatus(requestId);
  }
}

export const byteDanceProviderAdapter = new ByteDanceProviderAdapter();
