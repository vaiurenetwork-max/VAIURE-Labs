/**
 * VAIURE Labs — Prompt Sequence Compiler & Deterministic Validation Engine
 * Converts structured slash prompts, temporal sequences, and global directives
 * into a single unified chronological video prompt and validated BytePlus Seedance 2.5 payload.
 */

import {
  SlashSegment,
  TemporalSequence,
  TimelineValidationResult,
  Seedance25Payload,
  GenerationParameters,
} from '../types/labs';

/**
 * Serialize array of SlashSegment items to canonical slash syntax string
 * e.g. subject/young woman/environment/futuristic apartment/time_of_day/sunrise/
 */
export function serializeSlashPrompt(segments: SlashSegment[]): string {
  if (!segments || segments.length === 0) return '';
  const sorted = [...segments].sort((a, b) => a.order - b.order);
  return sorted
    .filter((s) => s.category.trim() && s.value.trim())
    .map((s) => `${s.category.trim().toLowerCase()}/${s.value.trim()}/`)
    .join('');
}

/**
 * Parse a slash string back into structured SlashSegment array
 */
export function parseSlashPrompt(text: string): SlashSegment[] {
  if (!text || !text.includes('/')) return [];
  const parts = text.split('/').map((p) => p.trim()).filter(Boolean);
  const segments: SlashSegment[] = [];

  for (let i = 0; i < parts.length - 1; i += 2) {
    const category = parts[i];
    const value = parts[i + 1];
    if (category && value) {
      segments.push({
        id: `seg-${i / 2 + 1}-${Date.now()}`,
        category,
        value,
        order: i / 2 + 1,
      });
    }
  }

  return segments;
}

/**
 * Fallback local heuristic conversion from natural language to slash segments
 * when offline or without calling Gemini API
 */
export function localConvertNaturalToSlash(promptText: string): SlashSegment[] {
  const text = promptText.trim();
  if (!text) return [];

  const segments: SlashSegment[] = [];
  let order = 1;

  // Extract core concepts using heuristic regexes
  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean);

  // Subject heuristic
  const firstSentence = sentences[0] || text;
  segments.push({
    id: `seg-${order}`,
    category: 'subject',
    value: firstSentence.replace(/^A |^An |^The /i, '').slice(0, 100),
    order: order++,
  });

  // Action / event heuristics
  if (sentences.length > 1) {
    segments.push({
      id: `seg-${order}`,
      category: 'action',
      value: sentences[1].slice(0, 120),
      order: order++,
    });
  }

  // Camera / cinematography
  if (text.toLowerCase().includes('camera') || text.toLowerCase().includes('shot')) {
    const match = text.match(/(?:camera|shot|close-up|wide shot|tracking|pan|tilt)[^,.]+/i);
    if (match) {
      segments.push({
        id: `seg-${order}`,
        category: 'camera',
        value: match[0].trim(),
        order: order++,
      });
    }
  } else {
    segments.push({
      id: `seg-${order}`,
      category: 'camera',
      value: 'Cinematic 24fps fluid tracking shot',
      order: order++,
    });
  }

  // Lighting
  if (text.toLowerCase().includes('light') || text.toLowerCase().includes('shadow')) {
    const match = text.match(/(?:light|sunlight|shadow|chiaroscuro|glow)[^,.]+/i);
    if (match) {
      segments.push({
        id: `seg-${order}`,
        category: 'lighting',
        value: match[0].trim(),
        order: order++,
      });
    }
  } else {
    segments.push({
      id: `seg-${order}`,
      category: 'lighting',
      value: 'Soft cinematic key light with natural reflections',
      order: order++,
    });
  }

  // Visual Style
  segments.push({
    id: `seg-${order}`,
    category: 'visual_style',
    value: 'Grounded cinematic realism, high fidelity',
    order: order++,
  });

  return segments;
}

/**
 * Validates temporal sequences against video duration rules
 */
export function validateTimeline(
  sequences: TemporalSequence[],
  totalDuration: number
): TimelineValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let hasGaps = false;
  let hasOverlaps = false;

  if (totalDuration <= 0) {
    errors.push('Total video duration must be greater than 0 seconds.');
  }

  if (totalDuration > 30) {
    errors.push('Total duration cannot exceed 30 seconds for Seedance 2.5.');
  }

  if (!sequences || sequences.length === 0) {
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      hasGaps: false,
      hasOverlaps: false,
    };
  }

  // Sort sequences by start timestamp
  const sorted = [...sequences].sort((a, b) => a.startSeconds - b.startSeconds);

  for (let i = 0; i < sorted.length; i++) {
    const seq = sorted[i];
    const seqNum = i + 1;

    // Check bounds
    if (isNaN(seq.startSeconds) || isNaN(seq.endSeconds)) {
      errors.push(`Scene ${seqNum}: Timestamps must be valid numbers.`);
      continue;
    }

    if (seq.startSeconds < 0) {
      errors.push(`Scene ${seqNum}: Start time cannot be negative.`);
    }

    if (seq.endSeconds <= seq.startSeconds) {
      errors.push(
        `Scene ${seqNum}: End time (${seq.endSeconds}s) must be greater than start time (${seq.startSeconds}s).`
      );
    }

    if (seq.endSeconds > totalDuration) {
      errors.push(
        `Scene ${seqNum}: End time (${seq.endSeconds}s) exceeds total video duration (${totalDuration}s).`
      );
    }

    // Check overlap with previous sequence
    if (i > 0) {
      const prev = sorted[i - 1];
      if (seq.startSeconds < prev.endSeconds) {
        hasOverlaps = true;
        warnings.push(
          `Overlap detected: Scene ${i} ends at ${prev.endSeconds}s while Scene ${seqNum} begins at ${seq.startSeconds}s.`
        );
      } else if (seq.startSeconds > prev.endSeconds) {
        hasGaps = true;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasGaps,
    hasOverlaps,
  };
}

/**
 * Format decimal timestamp into standard "00.0s" format
 */
export function formatTimestamp(seconds: number): string {
  const rounded = Math.round(seconds * 10) / 10;
  const whole = Math.floor(rounded);
  const frac = Math.round((rounded - whole) * 10);
  return `${String(whole).padStart(2, '0')}.${frac}s`;
}

/**
 * Deterministic Compilation: combines natural prompt, slash segments,
 * and chronological temporal sequences into the final Seedance 2.5 prompt
 */
export function compileDeterministicPrompt(
  params: GenerationParameters
): string {
  const {
    prompt,
    slashSegments,
    sequences,
    durationSeconds = 8,
    frameRate = '24fps',
  } = params;

  const parts: string[] = [];

  // 1. Overall visual direction
  const baseDirective = prompt.trim() || serializeSlashPrompt(slashSegments || []);
  if (baseDirective) {
    parts.push(`Overall visual direction:\n${baseDirective}`);
  }

  // 2. Chronological sequence breakdown
  if (sequences && sequences.length > 0) {
    const sorted = [...sequences].sort((a, b) => a.startSeconds - b.startSeconds);
    const sceneLines = sorted.map((s, idx) => {
      const startFmt = formatTimestamp(s.startSeconds);
      const endFmt = formatTimestamp(s.endSeconds);
      const details: string[] = [];

      if (s.description?.trim()) details.push(s.description.trim());
      if (s.camera?.trim()) details.push(`Camera: ${s.camera.trim()}`);
      if (s.lighting?.trim()) details.push(`Lighting: ${s.lighting.trim()}`);
      if (s.transition?.trim()) details.push(`Transition: ${s.transition.trim()}`);
      if (s.audio?.trim()) details.push(`Audio: ${s.audio.trim()}`);

      const body = details.join('. ');
      return `[${startFmt}-${endFmt}]\nScene ${idx + 1}: ${body || 'Scene continuation.'}`;
    });

    parts.push(`Chronological sequence (${durationSeconds}s total @ ${frameRate}):\n${sceneLines.join('\n\n')}`);
  }

  // 3. Continuity guidelines
  parts.push(
    `Continuity directives:\nMaintain strict character identity, textile textures, spatial architecture, lighting direction, and fluid motion coherence between consecutive sequence segments.`
  );

  return parts.join('\n\n');
}

/**
 * Generate validated BytePlus Seedance 2.5 JSON Payload
 */
export function generateSeedance25Payload(
  params: GenerationParameters,
  validation: TimelineValidationResult
): Seedance25Payload {
  const sortedSeq = [...(params.sequences || [])].sort((a, b) => a.startSeconds - b.startSeconds);

  const payload: Seedance25Payload = {
    schema_version: '1.0',
    project: 'vaiure-labs',
    provider: 'byteplus',
    model: 'seedance-2.5',
    input: {
      original_prompt: params.prompt || '',
      slash_prompt: serializeSlashPrompt(params.slashSegments || []),
      compiled_prompt: params.compiledPrompt || compileDeterministicPrompt(params),
      duration_seconds: params.durationSeconds || 8,
      aspect_ratio: params.aspectRatio || '16:9',
      resolution: params.resolution || '1080p',
      frame_rate: '24fps',
      generate_audio: params.generateAudio !== false,
      reference_images_count: params.referenceImages?.length || 0,
      sequences: sortedSeq.map((s, idx) => ({
        id: s.id || `scene-${idx + 1}`,
        order: idx + 1,
        start_seconds: s.startSeconds,
        end_seconds: s.endSeconds,
        duration_seconds: Math.round((s.endSeconds - s.startSeconds) * 10) / 10,
        description: s.description || '',
        camera: s.camera || null,
        lighting: s.lighting || null,
        audio: s.audio || null,
        transition: s.transition || null,
      })),
    },
    metadata: {
      prompt_engine: 'gemini',
      api_submission_ready: validation.isValid,
      validation_status: validation.isValid
        ? validation.warnings.length > 0
          ? 'warning'
          : 'valid'
        : 'error',
      generated_at: new Date().toISOString(),
      target_api: 'BytePlus Seedance 2.5 Video Generation API',
    },
  };

  return payload;
}

/**
 * Automatically splits total duration into N contiguous chronological scene sequences
 */
export function autoSplitSequences(
  count: number,
  totalDuration: number,
  basePrompt: string = ''
): TemporalSequence[] {
  const n = Math.max(1, Math.min(count, 6));
  const segmentDuration = Math.round((totalDuration / n) * 10) / 10;
  const sequences: TemporalSequence[] = [];

  const defaultCameraPresets = [
    'Slow cinematic tracking push-in',
    'Medium close-up orbiting slowly',
    'Low-angle upward tilt reveal',
    'Wide architectural drone drift',
  ];

  const defaultLightingPresets = [
    'Diffused directional daylight',
    'Chiaroscuro rim light with deep shadows',
    'Volumetric golden hour beam',
    'Specular edge sheen and reflections',
  ];

  for (let i = 0; i < n; i++) {
    const start = Math.round(i * segmentDuration * 10) / 10;
    const end = i === n - 1 ? totalDuration : Math.round((i + 1) * segmentDuration * 10) / 10;
    sequences.push({
      id: `seq-${Date.now()}-${i + 1}`,
      order: i + 1,
      startSeconds: start,
      endSeconds: end,
      description:
        i === 0
          ? basePrompt ? `Establishing scene: ${basePrompt.slice(0, 100)}` : 'Establishing scene with primary subject'
          : `Scene ${i + 1} continuation and dynamic motion development`,
      camera: defaultCameraPresets[i % defaultCameraPresets.length],
      lighting: defaultLightingPresets[i % defaultLightingPresets.length],
      transition: i === n - 1 ? 'Slow fade out' : 'Seamless cut on movement',
      audio: 'Ambient spatial cinematic soundscape',
    });
  }

  return sequences;
}
