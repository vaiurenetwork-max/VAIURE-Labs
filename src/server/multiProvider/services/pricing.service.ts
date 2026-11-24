/**
 * Server-Side Pricing Service
 * - Keeps ByteDance and MUAPI pricing strictly isolated.
 * - Never silently downgrades resolution or duration.
 * - Separates provider cost from configurable application markup.
 */

import {
  PriceEstimateBreakdown,
  PriceEstimateRequest,
} from '../../../types/multiProvider';
import {
  normalizeResolutionCase,
  validateCapabilitySelection,
} from '../config/model.capabilities';
import { providerConfigStore } from '../config/provider.config';
import { providerService } from './provider.service';

export function calculateAuthoritativeEstimate(
  req: PriceEstimateRequest
): PriceEstimateBreakdown {
  const found = providerConfigStore.findModel(req.provider, req.modelId);
  if (!found) {
    throw new Error(`Unknown model "${req.modelId}" for provider "${req.provider}".`);
  }

  const { model } = found;
  const effectiveResolution = req.draft && model.supportsDraftMode
    ? '480p'
    : normalizeResolutionCase(req.resolution);

  const check = validateCapabilitySelection(model, effectiveResolution, Number(req.duration));
  if (!check.valid) {
    throw new Error(check.error || 'Unsupported resolution or duration.');
  }

  const adapter = providerService.getAdapter(req.provider);
  return adapter.calculateEstimatedPrice(model, {
    resolution: effectiveResolution,
    duration: Number(req.duration),
    draft: Boolean(req.draft),
    referenceImagesCount: req.referenceImagesCount,
    physicsPriority: req.physicsPriority,
  });
}
