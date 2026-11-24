export type CanvasToolId =
  | 'select'
  | 'pan'
  | 'brush'
  | 'eraser'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'eyedropper';

export type CanvasBlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light';

export type CanvasAspectPreset = '16:9' | '9:16' | '1:1' | '21:9';

export interface CanvasLayerFilter {
  brightness: number; // 100 default (50..160)
  contrast: number;   // 100 default (50..160)
  saturate: number;   // 100 default (0..180)
  grayscale: boolean;
}

export interface CanvasLayerMeta {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blendMode: CanvasBlendMode;
  offsetX: number;
  offsetY: number;
  scale: number; // 0.1..4
  filters: CanvasLayerFilter;
}

export interface CanvasHistorySnapshot {
  width: number;
  height: number;
  backgroundColor: string;
  activeLayerId: string;
  layers: Array<CanvasLayerMeta & { dataUrl: string }>;
}

export const CANVAS_ASPECT_DIMENSIONS: Record<
  CanvasAspectPreset,
  { width: number; height: number; label: string }
> = {
  '16:9': { width: 1920, height: 1080, label: '16:9 Cinema' },
  '9:16': { width: 1080, height: 1920, label: '9:16 Vertical' },
  '1:1': { width: 1080, height: 1080, label: '1:1 Square' },
  '21:9': { width: 2560, height: 1080, label: '21:9 Anamorphic' },
};

export const CANVAS_BG_SWATCHES = [
  { id: 'obsidian', label: 'Obsidian', value: '#090a0f' },
  { id: 'black', label: 'Pure Black', value: '#000000' },
  { id: 'slate', label: 'Studio Slate', value: '#171b24' },
  { id: 'paper', label: 'Warm Paper', value: '#f2f1ec' },
  { id: 'transparent', label: 'Transparent', value: 'transparent' },
] as const;

export const CANVAS_COLOR_SWATCHES = [
  '#ffffff',
  '#ecece9',
  '#9ca3af',
  '#111318',
  '#e11d48',
  '#f59e0b',
  '#10b981',
  '#38bdf8',
  '#8b5cf6',
] as const;

export const DEFAULT_LAYER_FILTERS: CanvasLayerFilter = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  grayscale: false,
};

// ============================================================================
// VaiByte Node Workflow ("Connecting Dots") Types & Cinema Knowledge Catalogs
// ============================================================================

export type WorkflowPortType = 'media' | 'prompt' | 'director' | 'camera' | 'scene';

export type WorkflowNodeKind =
  | 'image_input'
  | 'video_input'
  | 'media_analyzer'
  | 'scene_director'
  | 'camera_film_rig'
  | 'seedance_knowledge'
  | 'seedance_render'
  | 'next_scene_continuity';

export interface WorkflowPortSpec {
  id: string;
  label: string;
  type: WorkflowPortType;
}

export interface WorkflowEdge {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  portType: WorkflowPortType;
}

export interface SceneDirectorProfile {
  id: string;
  name: string;
  discipline: string;
  contrastRatio: string;
  pacingSignature: string;
  lightingDoctrine: string;
  promptDirective: string;
}

export const SCENE_DIRECTORS: SceneDirectorProfile[] = [
  {
    id: 'noir-auteur',
    name: 'Chiaroscuro Noir Auteur',
    discipline: 'Shadow Architecture · Moral Tension',
    contrastRatio: '12:1 High Contrast',
    pacingSignature: 'Measured slow push-ins, lingering shadows, practical tungsten pools',
    lightingDoctrine: 'Hard single-source key light with deep obsidian negative fill & Venetian shadow rakes.',
    promptDirective:
      'Chiaroscuro architectural framing, 12:1 lighting contrast ratio, razor-sharp rim separation, wet specular cobblestones, restrained emotional blocking.',
  },
  {
    id: 'scifi-architect',
    name: 'Anamorphic Sci-Fi Architect',
    discipline: 'Monumental Scale · Atmospheric Monoliths',
    contrastRatio: '6:1 Volumetric',
    pacingSignature: 'Monumental deliberate glides holding human figure against colossal brutalist scale',
    lightingDoctrine: 'Diffused overcast skylight sliced by amber/slate atmospheric hazes and subtle horizontal anamorphic flares.',
    promptDirective:
      'Monumental 2.39:1 anamorphic visual scale, brutalist monolithic stone and brushed titanium geometry, volumetric dust haze, stoic rhythmic pacing.',
  },
  {
    id: 'kinetic-action',
    name: 'Kinetic Action Choreographer',
    discipline: 'Physical Momentum · Impact Sequencing',
    contrastRatio: '8:1 Edge Rim',
    pacingSignature: 'Continuous unbroken action whip-pans and low-angle lateral pursuit tracking',
    lightingDoctrine: 'Crisp high-shutter-definition highlights, airborne spark/debris tangibility, cold steel reflections.',
    promptDirective:
      'Visceral kinetic choreography, continuous 180-degree shutter action flow, colliding debris and cloth wind drag, physical impact weight transfer.',
  },
  {
    id: 'verite-doc',
    name: 'Handheld Verite Documentarian',
    discipline: 'Tactile Presence · Intimate Immediacy',
    contrastRatio: '3:1 Naturalist',
    pacingSignature: 'Reactive breathing shoulder-rig movements with organic rack-focus discoveries',
    lightingDoctrine: 'Available ambient window light, unfiltered practical fixtures, zero artificial beauty fill.',
    promptDirective:
      'Observational handheld shoulder-rig immediacy, authentic skin texture and natural pupil catchlights, subtle micro-camera breathing, unvarnished realism.',
  },
  {
    id: 'fashion-editorial',
    name: 'Avant-Garde Fashion Director',
    discipline: 'Sculptural Garment Flow · High-Craft Texture',
    contrastRatio: '5:1 Sculpted Softbox',
    pacingSignature: 'Poised velvet slow-motion garment arcs paired with hypnotic orbital camera paths',
    lightingDoctrine: 'Large diffused parabolic octa key with chrome rim kicker accentuating fabric weave and bone structure.',
    promptDirective:
      'Editorial couture staging, sculpted cheekbone highlights, tactile aerodynamic silk and heavyweight wool drape dynamics, serene spatial dominance.',
  },
  {
    id: 'long-take-virtuoso',
    name: 'Continuous Long-Take Virtuoso',
    discipline: 'Unbroken Oner Choreography · Spatial Continuity',
    contrastRatio: '4:1 Natural Depth',
    pacingSignature: 'Zero-cut choreographed Steadicam passage linking foreground intimacy to wide reveal',
    lightingDoctrine: 'Motivated multi-room practical color shifts transitioning seamlessly in one unbroken take.',
    promptDirective:
      'Unbroken single-take Steadicam choreography smoothly transitioning through spatial thresholds, meticulous depth-of-field rack focus cues, zero continuity drift.',
  },
  {
    id: 'psychological-thriller',
    name: 'Psychological Tension Stylist',
    discipline: 'Symmetrical Dread · Subtextual Framing',
    contrastRatio: '7:1 Cold Surgical',
    pacingSignature: 'Imperceptible deadpan creeping dolly-in with precision symmetrical vanishing points',
    lightingDoctrine: 'Top-down fluorescent/overcast surgical illumination casting hollow eye shadows and muted slate tones.',
    promptDirective:
      'Deadpan central-axis architectural symmetry, imperceptibly creeping dolly push-in building psychological pressure, micro-tremor expression restraint.',
  },
];

export interface CameraMovementSpec {
  id: string;
  label: string;
  category: 'Translation' | 'Rotation' | 'Optics' | 'Aerial / Dynamic' | 'Locked';
  speedDefault: string;
  cameraFixed: boolean;
  seedanceKeyword: string;
  description: string;
}

export const CAMERA_MOVEMENTS: CameraMovementSpec[] = [
  {
    id: 'dolly-push-in',
    label: 'Dolly Push-In (Physical Forward)',
    category: 'Translation',
    speedDefault: 'Slow Measured',
    cameraFixed: false,
    seedanceKeyword: 'smooth physical dolly push-in advancing steadily toward subject with evolving parallax',
    description: 'Moves camera body physically toward subject, shifting true 3D background parallax.',
  },
  {
    id: 'dolly-pull-out',
    label: 'Dolly Pull-Out Reveal',
    category: 'Translation',
    speedDefault: 'Smooth Constant',
    cameraFixed: false,
    seedanceKeyword: 'controlled physical dolly pull-back smoothly expanding environmental context',
    description: 'Retreats physically away from subject to reveal surrounding architecture or isolation.',
  },
  {
    id: 'truck-lateral',
    label: 'Lateral Truck Tracking',
    category: 'Translation',
    speedDefault: 'Matched Pace',
    cameraFixed: false,
    seedanceKeyword: 'smooth lateral dolly tracking parallel to moving subject at eye level',
    description: 'Glides sideways horizontally in lockstep with moving talent or vehicles.',
  },
  {
    id: 'orbit-arc-180',
    label: '180° Orbital Arc Shot',
    category: 'Rotation',
    speedDefault: 'Velvet Continuous',
    cameraFixed: false,
    seedanceKeyword: 'continuous 180-degree orbital arc sweeping smoothly around locked hero subject',
    description: 'Revolves circularly around center subject, rotating background light direction.',
  },
  {
    id: 'orbit-arc-360',
    label: '360° Full Vortex Orbit',
    category: 'Rotation',
    speedDefault: 'Dynamic',
    cameraFixed: false,
    seedanceKeyword: 'unbroken 360-degree heroic orbit revolving cleanly around central subject',
    description: 'Complete revolution circling talent while preserving center-axis lock.',
  },
  {
    id: 'steadicam-follow',
    label: 'Steadicam Lead / Follow Oner',
    category: 'Translation',
    speedDefault: 'Fluid Walk',
    cameraFixed: false,
    seedanceKeyword: 'floating unbroken Steadicam long-take leading ahead of subject through corridor',
    description: 'Weightless stabilized floating track weaving gracefully across doorways & crowds.',
  },
  {
    id: 'crane-boom-up',
    label: 'Technocrane Rising Boom',
    category: 'Aerial / Dynamic',
    speedDefault: 'Gradual Sweeping',
    cameraFixed: false,
    seedanceKeyword: 'monumental Technocrane pedestal boom rising upward and tilting slightly down',
    description: 'Elevates smoothly from eye level into a dramatic high-angle master vista.',
  },
  {
    id: 'crane-descend',
    label: 'Crane Boom Descent',
    category: 'Aerial / Dynamic',
    speedDefault: 'Smooth',
    cameraFixed: false,
    seedanceKeyword: 'high-altitude crane descending cleanly down into intimate eye-level medium frame',
    description: 'Drops from wide establishing height to land directly with the protagonist.',
  },
  {
    id: 'fpv-proximity',
    label: 'FPV Cinema Proximity Dive',
    category: 'Aerial / Dynamic',
    speedDefault: 'High Velocity',
    cameraFixed: false,
    seedanceKeyword: 'stabilized agile FPV cinema drone diving swiftly through narrow architectural clearance with banked turn',
    description: 'Agile banked aerodynamic flight hugging close to terrain, silhouettes, or structures.',
  },
  {
    id: 'whip-pan',
    label: 'Whip Pan Transition Beat',
    category: 'Rotation',
    speedDefault: 'Rapid',
    cameraFixed: false,
    seedanceKeyword: 'crisp horizontal whip pan rotating rapidly toward secondary focal subject with directional motion blur',
    description: 'Fast rotational pan bridging two distinct narrative beats or reaction moments.',
  },
  {
    id: 'slow-tilt-up',
    label: 'Slow Tilt-Up Reveal',
    category: 'Rotation',
    speedDefault: 'Slow',
    cameraFixed: false,
    seedanceKeyword: 'measured upward camera tilt ascending from boots and ground reflections up to heroic face reveal',
    description: 'Vertical tripod/head pivot emphasizing stature, costume texture, and monumentality.',
  },
  {
    id: 'handheld-verite',
    label: 'Handheld Shoulder Verite',
    category: 'Translation',
    speedDefault: 'Organic Reactive',
    cameraFixed: false,
    seedanceKeyword: 'organic shoulder-mounted handheld camera tracking subtly with natural human operator breathing cadence',
    description: 'Grounded documentary presence with tactile human micro-motion and urgency.',
  },
  {
    id: 'dolly-zoom-vertigo',
    label: 'Contrazoom (Dolly-Zoom)',
    category: 'Optics',
    speedDefault: 'Measured',
    cameraFixed: false,
    seedanceKeyword: 'classic Vertigo contrazoom pushing camera forward while widening focal length, background compressing dramatically',
    description: 'Distorts spatial depth tension around a locked stationary foreground expression.',
  },
  {
    id: 'rack-focus-optical',
    label: 'Shallow Optical Rack Focus',
    category: 'Optics',
    speedDefault: 'Crisp Pull',
    cameraFixed: true,
    seedanceKeyword: 'fixed lens body executing shallow T1.4 rack focus shift from foreground silhouette texture to deep background subject',
    description: 'Directs audience attention cleanly across Z-depth planes without moving camera rig.',
  },
  {
    id: 'dutch-angle-creep',
    label: 'Dutch Cant + Creeping Push',
    category: 'Optics',
    speedDefault: 'Imperceptible',
    cameraFixed: false,
    seedanceKeyword: 'subtle 12-degree Dutch tilt cant combined with slow unnerving creeping push-in',
    description: 'Off-kilter horizon angle communicating psychological instability or suspense.',
  },
  {
    id: 'fixed-tripod-lock',
    label: 'Locked Tripod (camera_fixed: true)',
    category: 'Locked',
    speedDefault: 'Zero Drift',
    cameraFixed: true,
    seedanceKeyword: 'rock-solid locked-off tripod master frame with zero camera shake while wind, actors, and particles animate richly inside frame',
    description: 'Enables official ModelArk camera_fixed=true so only in-scene physics & talent animate.',
  },
];

export const FILM_STOCK_LENSES = [
  {
    id: 'arri-65-anamorphic',
    label: 'ARRI Alexa 65 · Panavision Primo 35mm Anamorphic (24fps)',
    spec: 'ARRI Alexa 65 digital medium format, Panavision Primo 35mm Anamorphic T1.9, subtle oval bokeh, 180-degree shutter',
  },
  {
    id: 'imax-65mm',
    label: 'IMAX 65mm 15-Perf · Hasselblad 50mm Prime',
    spec: 'IMAX 65mm 15-perf celluloid texture, razor-sharp edge-to-edge micro-contrast, natural organic halation',
  },
  {
    id: 'kodak-500t-5219',
    label: 'Kodak Vision3 500T 5219 · Cooke S4/i 40mm',
    spec: 'Kodak Vision3 500T 35mm celluloid film, Cooke S4/i 40mm gentle skin warmth, rich silver-halide shadow rolloff',
  },
  {
    id: 'kodak-250d-daylight',
    label: 'Kodak Vision3 250D · Leica Summilux-C 29mm',
    spec: 'Kodak Vision3 250D crisp daylight negative, Leica Summilux-C 29mm natural specular highlight integrity',
  },
  {
    id: 'red-v-raptor-atlas',
    label: 'RED V-Raptor 8K VV · Atlas Orion Anamorphic',
    spec: 'RED V-Raptor 8K VistaVision sensor, Atlas Orion Anamorphic 50mm, cyan horizontal streak accents, crisp modern grain',
  },
  {
    id: '16mm-bolex-doc',
    label: 'Super 16mm Kodak 7219 · Zeiss Super Speed 18mm',
    spec: 'Super 16mm organic celluloid grain structure, Zeiss Super Speed T1.3 wide verite field of view',
  },
] as const;

export interface WorkflowNodeData {
  // Common
  title?: string;
  // image_input
  imageUrls?: string[];
  imageRole?: 'reference_image' | 'first_frame' | 'last_frame';
  // video_input
  videoUrl?: string;
  videoFrames?: string[];
  videoExtractedLastFrameUrl?: string;
  videoRole?: 'reference_video' | 'motion_source';
  // media_analyzer
  analyzerNotes?: string;
  analyzedPrompt?: string;
  analyzedNegative?: string;
  detectedSubjects?: string;
  environmentAndLighting?: string;
  cameraMotionAnalysis?: string;
  physicsDynamics?: string;
  continuityAnchors?: string[];
  analyzerEngine?: string;
  // scene_director
  directorId?: string;
  contrastRatio?: string;
  directorNotes?: string;
  directorTreatment?: string;
  directorBeatSheet?: string[];
  // camera_film_rig
  cameraMovementId?: string;
  filmStockId?: string;
  focalLengthMm?: number;
  cameraSpeed?: string;
  cameraFixed?: boolean;
  // seedance_knowledge
  selectedKnowledgeIds?: string[];
  customKnowledgeSnippet?: string;
  // seedance_render
  modelKey?: string;
  customPrompt?: string;
  aspectRatio?: string;
  durationSeconds?: number;
  resolution?: '480P' | '720P' | '1080P';
  soundEnabled?: boolean;
  physicsPriority?: boolean;
  contentRating?: '18+' | 'standard';
  jobCode?: string;
  renderStatus?: 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';
  renderProgress?: number;
  resultVideoUrl?: string;
  resultLastFrameUrl?: string;
  renderError?: string;
  upstreamModelUsed?: string;
  // next_scene_continuity
  nextActionIntent?: string;
  capturedLastFrameUrl?: string;
  nextScenePrompt?: string;
  continuityChecklist?: string[];
  continuityEngine?: string;
}

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  x: number;
  y: number;
  data: WorkflowNodeData;
}

export interface WorkflowGraphSnapshot {
  version: 2;
  app: 'VaiByte Canvas Studio';
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const NODE_PORT_DEFINITIONS: Record<
  WorkflowNodeKind,
  {
    label: string;
    subtitle: string;
    inputs: WorkflowPortSpec[];
    outputs: WorkflowPortSpec[];
  }
> = {
  image_input: {
    label: 'Image Plate (@Image)',
    subtitle: 'Up to 30 identity, wardrobe or first/last frame plates',
    inputs: [],
    outputs: [{ id: 'media_out', label: 'Image Plates', type: 'media' }],
  },
  video_input: {
    label: 'Video Clip (@Video)',
    subtitle: 'Analyze motion or extract exact final frame',
    inputs: [],
    outputs: [{ id: 'media_out', label: 'Video & Frames', type: 'media' }],
  },
  media_analyzer: {
    label: 'Vision Prompt Reader',
    subtitle: 'Reads Image & Video -> Seedance 2.5 Prompt',
    inputs: [
      { id: 'media_in', label: 'Image / Video', type: 'media' },
      { id: 'director_in', label: 'Director (Opt)', type: 'director' },
      { id: 'camera_in', label: 'Camera (Opt)', type: 'camera' },
    ],
    outputs: [
      { id: 'prompt_out', label: 'Analyzed Prompt', type: 'prompt' },
      { id: 'media_pass', label: 'Ref Plates', type: 'media' },
    ],
  },
  scene_director: {
    label: 'Scene Director',
    subtitle: 'Auteur staging, lighting contrast & beat sheet',
    inputs: [{ id: 'prompt_in', label: 'Story / Prompt', type: 'prompt' }],
    outputs: [{ id: 'director_out', label: 'Director Cue', type: 'director' }],
  },
  camera_film_rig: {
    label: 'Film & Camera Rig',
    subtitle: 'Seedance camera trajectory, lens, film stock & fixed lock',
    inputs: [],
    outputs: [{ id: 'camera_out', label: 'Camera Spec', type: 'camera' }],
  },
  seedance_knowledge: {
    label: 'Seedance 2.5 Codex',
    subtitle: 'Official ByteDance prompt architecture & physics rules',
    inputs: [],
    outputs: [{ id: 'prompt_out', label: 'Codex Rules', type: 'prompt' }],
  },
  seedance_render: {
    label: 'Seedance 2.5 ModelArk',
    subtitle: 'Synced ByteDance backend API render & live player',
    inputs: [
      { id: 'media_in', label: 'Images / Video', type: 'media' },
      { id: 'prompt_in', label: 'Prompt / Scene', type: 'prompt' },
      { id: 'director_in', label: 'Director', type: 'director' },
      { id: 'camera_in', label: 'Camera Rig', type: 'camera' },
    ],
    outputs: [
      { id: 'scene_out', label: 'Finished Scene', type: 'scene' },
      { id: 'media_out', label: 'Last Frame Media', type: 'media' },
    ],
  },
  next_scene_continuity: {
    label: 'Next Scene Continuity',
    subtitle: 'Zero-mistake Scene N+1 continuation & frame-0 lock',
    inputs: [
      { id: 'scene_in', label: 'Previous Scene', type: 'scene' },
      { id: 'media_in', label: 'Last Frame / Media', type: 'media' },
      { id: 'director_in', label: 'Director', type: 'director' },
      { id: 'camera_in', label: 'Next Camera', type: 'camera' },
    ],
    outputs: [
      { id: 'prompt_out', label: 'Next Scene Prompt', type: 'prompt' },
      { id: 'media_out', label: 'Locked First Frame', type: 'media' },
    ],
  },
};

export const PORT_TYPE_COLORS: Record<WorkflowPortType, string> = {
  media: '#f59e0b',
  prompt: '#ecece9',
  director: '#a855f7',
  camera: '#38bdf8',
  scene: '#10b981',
};

export interface SeedanceKnowledgePattern {
  id: string;
  title: string;
  category: 'Architecture' | 'References' | 'Camera' | 'Physics' | 'API Payload';
  summary: string;
  snippet: string;
}

export const SEEDANCE_KNOWLEDGE_PATTERNS: SeedanceKnowledgePattern[] = [
  {
    id: 'dual-branch-formula',
    title: 'Dual-Branch Official Formula',
    category: 'Architecture',
    summary:
      'ByteDance Dual-Branch Diffusion Transformer decouples spatial synthesis from temporal motion. Author shots strictly in order: [References] -> [Subject & Action] -> [Environment] -> [Camera] -> [Style] -> [Audio].',
    snippet:
      '[References: Lock @Image1 identity & garment weave] -> [Action: Dynamic physical motion] -> [Environment: Sculpted key light & atmospheric depth] -> [Camera: Single smooth trajectory @ 24fps 180-deg shutter].',
  },
  {
    id: 'ref-handle-lock',
    title: 'Quad-Modal @Image / @Video Handle Lock',
    category: 'References',
    summary:
      'Explicitly map uploaded plates by index (@Image1, @Image2, @Video1) stating exact attributes to inherit (face structure, cloth texture, lighting palette, camera curve).',
    snippet:
      'Lock @Image1 facial geometry, eye direction, and tailored coat weave; inherit environmental lighting azimuth from @Image2; follow camera velocity from @Video1.',
  },
  {
    id: 'single-vector-camera',
    title: 'Single-Vector Camera Discipline',
    category: 'Camera',
    summary:
      'Never stack conflicting camera instructions (e.g. push-in + pull-out simultaneously). Declare [Shot Size] + [One Movement] + [Speed] + [Subject Lock].',
    snippet:
      'Single uninterrupted camera trajectory: slow physical dolly push-in from medium-wide to close-up keeping eyes centered with natural foreground parallax.',
  },
  {
    id: 'zero-drift-timestamps',
    title: 'Multi-Shot Timestamp Anchors (15s–30s)',
    category: 'Physics',
    summary:
      'For 15s and 30s Seedance 2.5 runs, subdivide beats with explicit bracketed timecodes so temporal physics never freezes mid-generation.',
    snippet:
      '[00.0s-05.0s] Opening wide spatial lock -> [05.0s-10.0s] Physical crossing & cloth wind drag -> [10.0s-15.0s] Resolving hero portrait beat.',
  },
  {
    id: 'active-physics-verbs',
    title: 'Active Complex Physics Verbs',
    category: 'Physics',
    summary:
      'Feed the temporal solver active force verbs: aerodynamic fabric flutter, liquid vorticity, gravity compression, hair strand lag, and wet PBR specular highlights.',
    snippet:
      'Complex physics fidelity: heavyweight wool coat billows in crosswind eddies, raindrops shatter on wet asphalt with specular neon bounce, subtle dust particles drift in light shafts.',
  },
  {
    id: 'zero-mistake-handover',
    title: 'Zero-Mistake Scene N+1 First-Frame Lock',
    category: 'API Payload',
    summary:
      'Extract exact final frame of Scene N and bind role: "first_frame" alongside @Image1 + inherited camera momentum to eliminate frame-0 jump cuts.',
    snippet:
      '@Image1 bound as exact first_frame continuation anchor: preserve exact posture, light Kelvin, shadow angle, and camera momentum with zero jump-cut.',
  },
];

