/**
 * VX — Visual Reconstruction Engine Type Definitions
 * VAIURE Labs · Visual Reverse-Engineering & Midjourney V8.2 Synthesis
 */

export interface VxImageFile {
  id: string;
  dataUrl: string; // base64
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'image/jpg';
  filename: string;
  fileSize: number; // bytes
  width: number;
  height: number;
  aspectRatio: string; // e.g. "16:9", "1:1", "4:5", "9:16", "3:2", "2:3", "21:9"
  isPrimary?: boolean;
}

export type VxModelId =
  | 'gemini-3'
  | 'gemini-3.1'
  | 'gemini-3.8'
  | 'gemini-4-argon'
  | 'gemini-3.8-flash';

export interface VxModelOption {
  id: VxModelId;
  label: string;
  badge: string;
  description: string;
  apiModelTarget: string;
  requiresPaidKey?: boolean;
  tier: 'flagship' | 'production' | 'fast';
}

export const VX_SUPPORTED_MODELS: VxModelOption[] = [
  {
    id: 'gemini-3',
    label: 'Gemini 3',
    badge: 'GENERAL VISION',
    description: 'High-speed multimodal baseline perception, optical parsing, and spatial decomposition.',
    apiModelTarget: 'gemini-flash-latest',
    requiresPaidKey: false,
    tier: 'fast',
  },
  {
    id: 'gemini-3.1',
    label: 'Gemini 3.1',
    badge: 'FLASH LITE',
    description: 'Ultra-low latency multimodal decomposition, rapid token synthesis, and responsive reverse-engineering.',
    apiModelTarget: 'gemini-3.1-flash-lite',
    requiresPaidKey: false,
    tier: 'fast',
  },
  {
    id: 'gemini-3.8',
    label: 'Gemini 3.8',
    badge: 'RECOMMENDED · ZERO-LATENCY',
    description: 'Standard production engine: balanced visual perception, 8-category decomposition, and verified reliability.',
    apiModelTarget: 'gemini-3.8-flash',
    requiresPaidKey: false,
    tier: 'production',
  },
  {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon',
    badge: 'FLAGSHIP ORCHESTRATION',
    description: 'Deep multimodal spatial reasoning, granular micro-texture extraction, and advanced prompt synthesis.',
    apiModelTarget: 'gemini-4-argon',
    requiresPaidKey: true,
    tier: 'flagship',
  },
];

export type VxReconstructionMode =
  | 'mode_a_exact'
  | 'mode_b_photographic'
  | 'mode_c_editorial';

export interface VxMidjourneyParams {
  aspectRatio: string; // e.g. "16:9"
  stylize: number; // 0 - 1000, default 250
  chaos: number; // 0 - 100, default 0
  quality: number; // 1 or 2, default 1
  raw: boolean; // default true
  version: string; // default "8.2"
  weird?: number; // 0 - 3000
}

export interface VxAdvancedConfig {
  analysisDepth: 'standard' | 'deep' | 'maximum';
  promptDetail: 'balanced' | 'detailed' | 'extreme';
  realismPreference: number; // 1-100
  lightingPreservation: number; // 1-100
  compositionPreservation: number; // 1-100
  backgroundDetailPreservation: number; // 1-100
  subjectDetailPreservation: number; // 1-100
  cameraAccuracyPriority: number; // 1-100
  textureAccuracyPriority: number; // 1-100
  customInstructions: string;
}

export interface VxColorSwatch {
  hex: string;
  name: string;
  percentage?: number;
}

export interface VxVisualAnalysis {
  subject: {
    mainSubject: string;
    secondarySubjects: string[];
    visibleCount: string;
    positioning: string;
    bodyProportions: string;
    poseAndGesture: string;
    facialExpression: string;
    eyeDirection: string;
    clothingAndAccessories: string;
    physicalRelationships: string;
  };
  environment: {
    classification: 'interior' | 'exterior' | 'hybrid' | 'abstract' | string;
    architecturalStructure: string;
    backgroundComposition: string;
    environmentalObjects: string[];
    furniturePositioning: string;
    spatialDepth: string;
    layerSeparation: string; // foreground, midground, background
    atmosphere: string;
    microDetails: string[];
  };
  lighting: {
    primaryLightSource: string;
    secondaryLightSources: string[];
    direction: string;
    intensity: string;
    temperature: string;
    shadowDirection: string;
    shadowSoftness: string;
    specularHighlights: string;
    ambientIllumination: string;
    sourceType: 'natural' | 'artificial' | 'mixed' | string;
  };
  camera: {
    perspective: string;
    approximateHeight: string;
    distanceToSubject: string;
    shotType: string;
    lensCharacteristics: string;
    focalLengthEstimation: string;
    depthOfField: string;
    focusPosition: string;
    backgroundCompression: string;
    motionBlur: string;
    perspectiveDistortion: string;
  };
  color: {
    dominantPalette: VxColorSwatch[];
    secondaryPalette: VxColorSwatch[];
    colorTemperature: string;
    contrastDistribution: string;
    saturation: string;
    highlightCharacteristics: string;
    shadowColor: string;
    filmColorGrading: string;
    tonalResponse: string;
  };
  materials: {
    skinTexture: string;
    hairCharacteristics: string;
    fabricStructure: string;
    surfaceRoughness: string;
    reflectiveMaterials: string;
    glassTransparency: string;
    metallicReflections: string;
    woodGrain: string;
    environmentalTextures: string;
    microDetails: string;
  };
  composition: {
    ruleOfThirds: string;
    subjectAlignment: string;
    negativeSpace: string;
    leadingLines: string;
    symmetryOrAsymmetry: string;
    visualHierarchy: string;
    objectProportions: string;
    relativeDistances: string;
    croppingBoundaries: string;
    balance: string;
  };
  artDirection: {
    photographicGenre: string;
    visualIdentity: string;
    editorialCharacteristics: string;
    cinematicReferences: string;
    realismLevel: string;
    productionQuality: string;
    artisticTreatment: string;
  };
}

export interface VxConfidenceReport {
  subjectAccuracy: number; // 0-100
  compositionAccuracy: number; // 0-100
  lightingAccuracy: number; // 0-100
  environmentAccuracy: number; // 0-100
  colorAccuracy: number; // 0-100
  textureAccuracy: number; // 0-100
  cameraAccuracy: number; // 0-100
  overallScore: number; // 0-100
  validationNotes: string[];
  missingDetails: string[];
  unsupportedElementsCheck: string;
}

export interface VxReconstructionResult {
  prompt: string;
  parameters: VxMidjourneyParams;
  parametersString: string;
  fullMidjourneyCommand: string;
  confidence: VxConfidenceReport;
  analysis: VxVisualAnalysis;
  structuredJson: {
    engine: 'VX';
    target: 'Midjourney V8.2';
    analysis: VxVisualAnalysis;
    reconstruction: {
      prompt: string;
      parameters: VxMidjourneyParams;
      confidence: VxConfidenceReport;
    };
  };
  modelUsed: string;
  mode: VxReconstructionMode;
  analysisTimestamp: string;
}
