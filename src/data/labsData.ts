/**
 * VAIURE Labs — Studio Engine Data
 * Strictly specialized for: seedance 2.5 ref-video
 * Specs: Resolution (480p, 720p, 1080p) | Duration (4-30s) | Frame rate (24fps)
 * Reference images up to 30 | Prompt support 50,000 words
 */

import {
  ModelOption,
  GenerationItem,
  AspectRatioOption,
  ReferenceImageItem,
} from '../types/labs';

import {
  HERO_IMAGE,
  FEATURED_STORY_IMAGE,
  COUTURE_IMAGE,
  FILM_STILL_IMAGE,
  ARTIST_PORTRAIT_IMAGE,
  RUNWAY_IMAGE,
  VEIL_IMAGE,
} from './ivntriData';

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { id: '16:9', label: '16:9 Cinema', ratio: '16:9', width: 1920, height: 1080 },
  { id: '9:16', label: '9:16 Story', ratio: '9:16', width: 1080, height: 1920 },
  { id: '2.39:1', label: '2.39:1 Scope', ratio: '2.39:1', width: 1920, height: 803 },
  { id: '1:1', label: '1:1 Square', ratio: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5 Portrait', ratio: '4:5', width: 1080, height: 1350 },
];

export const RESOLUTION_OPTIONS = ['480p', '720p', '1080p'] as const;

// The single and only available model in Labs Studio
export const LABS_MODELS: ModelOption[] = [
  {
    id: 'seedance-2.5-ref-video',
    displayName: 'seedance 2.5 ref-video',
    provider: 'Seedance Engine',
    category: ['video'],
    badge: 'REF-VIDEO',
    tagline: 'Multi-Reference Video Synthesis Engine',
    description:
      'Dedicated cinema video generation engine with 30-image multi-reference cross-attention, 50,000-word prompt support, 480p/720p/1080p resolution, 4-30s duration at 24fps.',
    speedRating: '24fps Real-time',
    costCredits: 4,
    capabilities: {
      supportsNegativePrompt: true,
      supportsReferenceImage: true,
      maxReferenceImages: 30,
      maxPromptWords: 50000,
      supportsSeed: true,
      minDuration: 4,
      maxDuration: 30,
      frameRate: '24fps',
      supportedResolutions: ['480p', '720p', '1080p'],
      supportedRatios: ['16:9', '9:16', '2.39:1', '1:1', '4:5'],
      defaultRatio: '16:9',
      defaultResolution: '1080p',
      defaultDuration: 8,
    },
    futureApiIdentifier: 'seedance/2.5-ref-video',
  },
];

// Reference images pool (for quick addition up to 30 images)
export const SAMPLE_REFERENCE_POOL: Omit<ReferenceImageItem, 'id'>[] = [
  { url: HERO_IMAGE, name: 'Obsidian Silk Organza', weight: 0.85, role: 'style' },
  { url: COUTURE_IMAGE, name: 'Geometric Origami Pleats', weight: 0.9, role: 'subject' },
  { url: FILM_STILL_IMAGE, name: 'Monolithic Mist Atmosphere', weight: 0.75, role: 'lighting' },
  { url: VEIL_IMAGE, name: 'Platinum Micrometric Veil', weight: 0.8, role: 'style' },
  { url: RUNWAY_IMAGE, name: 'Avant-Garde Catwalk Cadence', weight: 0.7, role: 'composition' },
  { url: ARTIST_PORTRAIT_IMAGE, name: 'Chiaroscuro Facial Shadow', weight: 0.85, role: 'lighting' },
  { url: FEATURED_STORY_IMAGE, name: 'Raw Basalt & Limestone Textures', weight: 0.65, role: 'palette' },
];

export const createSampleReferenceBatch = (count: number = 6): ReferenceImageItem[] => {
  const result: ReferenceImageItem[] = [];
  const roles: ReferenceImageItem['role'][] = [
    'style',
    'subject',
    'lighting',
    'palette',
    'pose',
    'composition',
  ];
  for (let i = 0; i < Math.min(count, 30); i++) {
    const base = SAMPLE_REFERENCE_POOL[i % SAMPLE_REFERENCE_POOL.length];
    result.push({
      id: `ref-${Date.now()}-${i + 1}`,
      url: base.url,
      name: `${base.name} #${i + 1}`,
      weight: base.weight,
      role: roles[i % roles.length],
    });
  }
  return result;
};

// Initial library with seedance 2.5 ref-video projects (never empty)
export const INITIAL_GENERATION_ITEMS: GenerationItem[] = [
  {
    id: 'gen-seedance-001',
    createdAt: Date.now() - 1000 * 60 * 10,
    mode: 'video',
    modelId: 'seedance-2.5-ref-video',
    modelDisplayName: 'seedance 2.5 ref-video',
    provider: 'Seedance Engine',
    prompt:
      'Cavernous brutalist gallery carved from volcanic basalt. Single aperture daylight beam slicing across polished stone floor. Model in sculptural layered obsidian silk mikado cape raising arm in velvet slow-motion. 24fps film cadence, 1080p master.',
    negativePrompt: 'oversaturated, blurry, bad anatomy, deformed fingers, low resolution, jitter',
    aspectRatio: '16:9',
    resolution: '1080p',
    durationSeconds: 8,
    frameRate: '24fps',
    mediaUrl: FILM_STILL_IMAGE,
    thumbnailUrl: FILM_STILL_IMAGE,
    isVideo: true,
    seed: 9283719,
    renderTimeSec: 14.2,
    isStarred: true,
    referenceImagesCount: 12,
    wordCount: 42,
  },
  {
    id: 'gen-seedance-002',
    createdAt: Date.now() - 1000 * 60 * 30,
    mode: 'video',
    modelId: 'seedance-2.5-ref-video',
    modelDisplayName: 'seedance 2.5 ref-video',
    provider: 'Seedance Engine',
    prompt:
      'Fluid kinetic fabric floating in zero-gravity chamber, amber rim illumination delineating microscopic weave structure. 24fps slow drift.',
    aspectRatio: '2.39:1',
    resolution: '1080p',
    durationSeconds: 12,
    frameRate: '24fps',
    mediaUrl: HERO_IMAGE,
    thumbnailUrl: HERO_IMAGE,
    isVideo: true,
    seed: 4892011,
    renderTimeSec: 18.4,
    isStarred: true,
    referenceImagesCount: 8,
    wordCount: 26,
  },
  {
    id: 'gen-seedance-003',
    createdAt: Date.now() - 1000 * 60 * 60,
    mode: 'video',
    modelId: 'seedance-2.5-ref-video',
    modelDisplayName: 'seedance 2.5 ref-video',
    provider: 'Seedance Engine',
    prompt:
      'Avant-garde architectural runway presentation under twilight sky, models draped in kinetic fluid polymers, minimal monolithic pillars, 24fps film grain.',
    aspectRatio: '16:9',
    resolution: '720p',
    durationSeconds: 16,
    frameRate: '24fps',
    mediaUrl: RUNWAY_IMAGE,
    thumbnailUrl: RUNWAY_IMAGE,
    isVideo: true,
    seed: 7729104,
    renderTimeSec: 22.1,
    isStarred: false,
    referenceImagesCount: 6,
    wordCount: 27,
  },
];
