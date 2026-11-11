/**
 * VX — Visual Reconstruction Engine Frontend Service
 * Handles image data URL processing, aspect ratio calculation,
 * and communication with the Gemini backend reverse-engineering endpoints.
 */

import {
  VxImageFile,
  VxModelId,
  VxModelOption,
  VxReconstructionMode,
  VxMidjourneyParams,
  VxAdvancedConfig,
  VxReconstructionResult,
  VxVisualAnalysis,
} from '../types/vx';

/**
 * Calculate greatest common divisor for aspect ratio reduction
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Detect closest standard photography/cinematography aspect ratio string
 */
export function calculateAspectRatioString(width: number, height: number): string {
  if (!width || !height) return '16:9';
  const ratio = width / height;

  // Common Midjourney aspect ratios
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.06) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.06) return '9:16';
  if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5';
  if (Math.abs(ratio - 5 / 4) < 0.05) return '5:4';
  if (Math.abs(ratio - 3 / 2) < 0.05) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.05) return '2:3';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4';
  if (Math.abs(ratio - 21 / 9) < 0.08) return '21:9';

  const divisor = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);
  if (w <= 30 && h <= 30) {
    return `${w}:${h}`;
  }

  // Rounded decimal ratio representation
  return `${width}:${height}`;
}

/**
 * Reads a File or Blob into a base64 DataURL and loads an HTMLImageElement to detect exact dimensions
 */
export async function processImageUpload(file: File): Promise<VxImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const aspectRatio = calculateAspectRatioString(width, height);

        let mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/jpg' = 'image/jpeg';
        if (file.type.includes('png')) mimeType = 'image/png';
        else if (file.type.includes('webp')) mimeType = 'image/webp';
        else if (file.type.includes('jpeg') || file.type.includes('jpg')) mimeType = 'image/jpeg';

        resolve({
          id: `vx-img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          dataUrl,
          mimeType,
          filename: file.name,
          fileSize: file.size,
          width,
          height,
          aspectRatio,
          isPrimary: true,
        });
      };
      img.onerror = () => reject(new Error('Failed to decode image dimensions.'));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a remote image URL to base64 DataURL (via fetch and canvas/blob)
 */
export async function convertRemoteUrlToVxImage(url: string, filename = 'sample.jpg'): Promise<VxImageFile> {
  const response = await fetch(url);
  const blob = await response.blob();
  const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
  return processImageUpload(file);
}

/**
 * Fetch available Gemini models registry
 */
export async function fetchVxModels(): Promise<VxModelOption[]> {
  try {
    const res = await fetch('/api/vx/models');
    if (!res.ok) throw new Error('Failed to fetch models');
    const data = await res.json();
    return data.models || [];
  } catch (err) {
    console.warn('Falling back to local model definitions:', err);
    return [];
  }
}

/**
 * Analyze and reconstruct image into Midjourney V8.2 prompt & structured visual analysis
 */
export async function analyzeAndReconstructImage(params: {
  image: string; // Base64 data URL
  references?: string[];
  modelId?: VxModelId;
  mode?: VxReconstructionMode;
  midjourneyParams?: Partial<VxMidjourneyParams>;
  advancedConfig?: Partial<VxAdvancedConfig>;
}): Promise<VxReconstructionResult> {
  const res = await fetch('/api/vx/analyze-and-reconstruct', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error ${res.status}: Failed to reconstruct visual.`);
  }

  return res.json();
}

/**
 * Refine existing prompt with user-supplied directives
 */
export async function refineVxPrompt(params: {
  currentPrompt: string;
  refinementInstruction: string;
  analysis?: VxVisualAnalysis;
  parameters?: Partial<VxMidjourneyParams>;
  modelId?: VxModelId;
}): Promise<{
  refinedPrompt: string;
  refinementSummary: string;
  fullMidjourneyCommand: string;
  parameters: VxMidjourneyParams;
  parametersString: string;
}> {
  const res = await fetch('/api/vx/refine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP error ${res.status}: Failed to refine prompt.`);
  }

  return res.json();
}
