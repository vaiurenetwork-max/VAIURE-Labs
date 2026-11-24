/**
 * Independent Provider Pricing Configuration
 * - Provider B (MUAPI Seedance 2.5 Spicy): Exact 16-cell USD pricing matrix
 * - Provider A (ByteDance Official): Preserves existing BytePlus ModelArk credit & IDR schedule
 */

import { GenerationDuration, GenerationResolution } from '../../../types/multiProvider';

export const MUAPI_SEEDANCE_25_SPICY_MODEL_ID = 'muapi/seedance-2.5-spicy-image-to-video';

/**
 * Exact 16-combination USD provider cost matrix for muapi/seedance-2.5-spicy-image-to-video:
 * 480p: 5s $0.94, 10s $1.87, 20s $3.74, 30s $5.61
 * 720p: 5s $1.87, 10s $3.74, 20s $7.48, 30s $11.22
 * 1080p: 5s $4.67, 10s $9.35, 20s $18.70, 30s $28.05
 * 4K: 5s $9.35, 10s $18.70, 20s $37.40, 30s $56.10
 */
export const MUAPI_SPICY_USD_PRICING_MATRIX: Record<
  GenerationResolution,
  Record<number, number>
> = {
  '480p': {
    5: 0.94,
    10: 1.87,
    20: 3.74,
    30: 5.61,
  },
  '720p': {
    5: 1.87,
    10: 3.74,
    20: 7.48,
    30: 11.22,
  },
  '1080p': {
    5: 4.67,
    10: 9.35,
    20: 18.70,
    30: 28.05,
  },
  '4K': {
    5: 9.35,
    10: 18.70,
    20: 37.40,
    30: 56.10,
  },
};

export function roundUsd(value: number): number {
  const normalized = Number(Number(value).toFixed(6));
  return Math.round((normalized + 1e-9) * 100) / 100;
}

export function formatUsd(value: number): string {
  return `$${roundUsd(value).toFixed(2)} USD`;
}

export function lookupUsdMatrixCost(
  matrix: Record<string, Record<number, number>> | undefined,
  resolution: GenerationResolution,
  duration: number
): number | null {
  if (!matrix) return null;
  const resBucket = matrix[resolution] || matrix[resolution.toLowerCase()] || matrix[resolution.toUpperCase()];
  if (!resBucket) return null;
  const val = resBucket[duration];
  if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
    return roundUsd(val);
  }
  return null;
}

export const MUAPI_SUPPORTED_RESOLUTIONS: GenerationResolution[] = ['480p', '720p', '1080p', '4K'];
export const MUAPI_SUPPORTED_DURATIONS: GenerationDuration[] = [5, 10, 20, 30];

export const BYTEDANCE_SUPPORTED_RESOLUTIONS: GenerationResolution[] = ['480p', '720p', '1080p'];
export const BYTEDANCE_SUPPORTED_DURATIONS: GenerationDuration[] = [5, 10, 15, 20, 30];
