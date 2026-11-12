/**
 * SLIDE 5: FU LABS — Cinematic 3D Greybox Scene Generator (v2 Expanded)
 * Browser-based procedural low-poly 3D blockout, AI Text-to-3D Scene Architect
 * (powered by free Gemini models), 26-asset 3D library, 15 skeletal animations,
 * interactive 3D viewport raycast & ground-drag placement, and 1920x1080 @ 24fps
 * reference video export for Seedance 2.5.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Download,
  Plus,
  Trash2,
  Camera,
  Users,
  Building2,
  Box,
  Layers,
  Eye,
  SkipBack,
  SkipForward,
  Menu,
  Sliders,
  Check,
  Film,
  Sparkles,
  Wand2,
  Copy,
  Move,
  MousePointer,
  Upload,
  FileJson,
  Compass,
  CloudRain,
  RefreshCw,
} from 'lucide-react';
import {
  GreyboxEnvironmentPreset,
  CharacterActionType,
  CharacterHeldPropType,
  CinematicCameraMode,
  GreyboxPropType,
  WeatherParticleMode,
  ScenePhysicsMode,
  ScenePhysicsConfig,
  GreyboxCharacterConfig,
  GreyboxPropConfig,
  CameraKeyframeConfig,
  EnvironmentSettingsConfig,
  ArticulatedHumanRig,
  ENVIRONMENT_PRESET_META,
  CHARACTER_ACTION_META,
  CHARACTER_HELD_PROP_META,
  PROP_LIBRARY_CATALOG,
  CAMERA_MODE_META,
  SCENE_PHYSICS_PRESET_META,
  getPhysicsPresetConfig,
  createProceduralHumanRig,
  evaluateCharacterPoseAtTime,
  createGreyboxPropMesh,
  evaluatePropAtTime,
  buildTrajectoryHelperGroup,
  buildGreyboxEnvironment,
  evaluateCinematicCameraAtTime,
  focalLengthToVerticalFov,
} from './greyboxEngine';

import { FuLabsCoOpModal } from './FuLabsCoOpModal';
import { UserProfile } from '../../types/social';

interface FuLabsGreyboxSlideProps {
  onOpenMenu?: () => void;
  onGoToSlideFour?: () => void;
  onGoToVx?: () => void;
  onBackToHero?: () => void;
  currentUser?: UserProfile | null;
}

type InspectorTab =
  | 'ai_architect'
  | 'hierarchy'
  | 'characters'
  | 'props'
  | 'camera'
  | 'environment'
  | 'export';

type ViewportToolMode = 'select' | 'drag_start' | 'drag_end';

type FreeGeminiModelId =
  | 'gemini-3'
  | 'gemini-3.1'
  | 'gemini-3.8'
  | 'gemini-4-argon'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-flash-lite-preview'
  | 'gemini-2.5-flash';

const SCENE_DURATION_OPTIONS = [5, 10, 15, 20, 25, 30] as const;

const FREE_GEMINI_MODELS: {
  id: FreeGeminiModelId;
  label: string;
  badge: string;
  description: string;
}[] = [
  {
    id: 'gemini-3',
    label: 'Gemini 3',
    badge: 'FREE • VISION',
    description: 'Fast multimodal spatial reasoning & cinematic 3D layout synthesis',
  },
  {
    id: 'gemini-3.1',
    label: 'Gemini 3.1',
    badge: 'FREE • FLASH LITE',
    description: 'Low-latency 3D scene choreography & rapid iterative modifications',
  },
  {
    id: 'gemini-3.8',
    label: 'Gemini 3.8',
    badge: 'FREE • RECOMMENDED',
    description: 'Standard balanced production-grade 3D greybox spatial planning & physics',
  },
  {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon',
    badge: 'ADVANCED ORCHESTRATION',
    description: 'Deep spatial reasoning, complex cinematic camera blocking & multi-entity dynamics',
  },
];

const AI_SCENE_PROMPT_EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: 'Helicopter & Sports Car Chase',
    prompt:
      'A low-poly helicopter with spinning rotor chasing a speeding sports car and action motorcycle down a modern skyscraper avenue while pedestrians run on the sidewalk, 15s dramatic crane shot.',
  },
  {
    label: 'Rainy Sci-Fi Sword Duel',
    prompt:
      'Two martial artists holding sword blades dueling in a rain-soaked futuristic brutalist plaza surrounded by monolith slabs and streetlamps, 10s 360-degree orbit camera.',
  },
  {
    label: 'Metro Station Stealth Heist',
    prompt:
      'A stealth operative crouching and carrying a briefcase sneaks past two security guards scanning the platform in an underground metro transit station as the train arrives, 10s tracking shot.',
  },
  {
    label: 'Park Film Crew & Stunt Leap',
    prompt:
      'An outdoor park scene with geometric trees and boulders where a stunt actor sprints and leaps over a rock boulder while a director with a handheld camera rig and a cinema tripod crew film the action.',
  },
  {
    label: 'Harbor Boat & Bridge Pursuit',
    prompt:
      'A watercraft boat gliding underneath a spanning bridge arch while a quadcopter drone hovers overhead and an SUV truck drives along the embankment road barrier, wide establishing shot.',
  },
];

interface SceneTemplatePreset {
  id: string;
  label: string;
  description: string;
  duration: number;
  environment: EnvironmentSettingsConfig;
  characters: GreyboxCharacterConfig[];
  props: GreyboxPropConfig[];
  camera: CameraKeyframeConfig;
}

const CURATED_SCENE_TEMPLATES: SceneTemplatePreset[] = [
  {
    id: 'street_walk_encounter',
    label: 'Urban Street Tracking Shot',
    description: 'Two low-poly characters walking along a city street with 35mm dolly tracking',
    duration: 8,
    environment: {
      preset: 'urban_streets',
      buildingDensity: 1.0,
      streetWidth: 10,
      buildingScaleY: 1.0,
      showGrid: true,
      showWireframeEdges: true,
      sunAzimuthDeg: 42,
      sunElevationDeg: 52,
      backgroundHex: '#20242a',
      weatherParticles: 'none',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Actor 01 (Lead)',
        action: 'walking',
        startPos: [-1.2, 0, -6],
        endPos: [-1.2, 0, 5],
        startRotationY: 0,
        endRotationY: 0,
        scale: 1,
        heightMeters: 1.8,
        colorHex: '#d4d8de',
        heldProp: 'briefcase',
        startTime: 0,
        endTime: 8,
      },
      {
        id: 'char-2',
        name: 'Actor 02 (Companion)',
        action: 'walking',
        startPos: [1.1, 0, -6.5],
        endPos: [1.1, 0, 4.5],
        startRotationY: 0,
        endRotationY: 0,
        scale: 1,
        heightMeters: 1.74,
        colorHex: '#9aa1ab',
        heldProp: 'phone_device',
        startTime: 0,
        endTime: 8,
      },
    ],
    props: [
      {
        id: 'prop-car-1',
        name: 'Parked Sedan Block',
        type: 'vehicle_block',
        startPos: [3.2, 0, -2],
        endPos: [3.2, 0, -2],
        dimensions: [1.9, 1.45, 4.2],
        rotationY: 0,
        colorHex: '#7c848e',
        startTime: 0,
        endTime: 8,
      },
      {
        id: 'prop-lamp-1',
        name: 'Streetlamp 01',
        type: 'street_light',
        startPos: [-5.4, 0, 1.5],
        endPos: [-5.4, 0, 1.5],
        dimensions: [1.2, 4.8, 0.4],
        rotationY: 0,
        colorHex: '#8d96a2',
        startTime: 0,
        endTime: 8,
      },
    ],
    camera: {
      mode: 'dolly',
      focalLengthMm: 35,
      startPos: [-4.2, 1.7, -1.5],
      endPos: [-3.4, 1.65, 8.5],
      startTarget: [0, 1.3, -5.0],
      endTarget: [0, 1.3, 4.5],
      cameraHeightOffset: 0,
      movementSpeed: 1,
      orbitRadius: 7,
      orbitStartAngleDeg: -35,
      orbitEndAngleDeg: 45,
      handheldIntensity: 0.4,
      targetCharacterId: 'char-1',
      secondaryCharacterId: 'char-2',
    },
  },
  {
    id: 'helicopter_avenue_pursuit',
    label: 'Skyscraper Helicopter & Car Chase',
    description: 'Low-poly helicopter pursuing a sports car & motorcycle down a high-rise avenue',
    duration: 10,
    environment: {
      preset: 'modern_skyscrapers',
      buildingDensity: 1.15,
      streetWidth: 12,
      buildingScaleY: 1.25,
      showGrid: true,
      showWireframeEdges: true,
      sunAzimuthDeg: 36,
      sunElevationDeg: 48,
      backgroundHex: '#1b1f26',
      weatherParticles: 'none',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Sidewalk Runner',
        action: 'running',
        startPos: [-7.2, 0.2, -10],
        endPos: [-7.2, 0.2, 8],
        startRotationY: 0,
        endRotationY: 0,
        scale: 1,
        heightMeters: 1.8,
        colorHex: '#dde2ea',
        heldProp: 'briefcase',
        startTime: 0,
        endTime: 10,
      },
      {
        id: 'char-2',
        name: 'Spotter (Pointing)',
        action: 'pointing',
        startPos: [7.2, 0.2, 3.5],
        endPos: [7.2, 0.2, 3.5],
        startRotationY: -110,
        endRotationY: -65,
        scale: 1,
        heightMeters: 1.78,
        colorHex: '#a5aeb9',
        heldProp: 'camera_rig',
        startTime: 0,
        endTime: 10,
      },
    ],
    props: [
      {
        id: 'prop-car-lead',
        name: 'Lead Sports Car',
        type: 'vehicle_block',
        startPos: [-2.1, 0, -16],
        endPos: [-2.1, 0, 14],
        dimensions: [1.9, 1.4, 4.3],
        rotationY: 0,
        colorHex: '#c8d0dc',
        startTime: 0,
        endTime: 10,
      },
      {
        id: 'prop-moto-1',
        name: 'Pursuit Motorcycle',
        type: 'motorcycle',
        startPos: [1.8, 0, -19],
        endPos: [1.4, 0, 11],
        dimensions: [0.85, 1.15, 2.2],
        rotationY: 0,
        colorHex: '#9aa3b0',
        startTime: 0,
        endTime: 10,
      },
      {
        id: 'prop-heli-1',
        name: 'Pursuit Helicopter',
        type: 'helicopter',
        startPos: [0, 8.2, -18],
        endPos: [0, 6.8, 10],
        dimensions: [2.8, 2.6, 6.5],
        rotationY: 0,
        colorHex: '#b4bcc8',
        startTime: 0,
        endTime: 10,
      },
    ],
    camera: {
      mode: 'crane',
      focalLengthMm: 28,
      startPos: [6.8, 2.4, 12.5],
      endPos: [-5.5, 7.2, 15.0],
      startTarget: [0, 2.0, -10],
      endTarget: [0, 3.2, 8],
      cameraHeightOffset: 0,
      movementSpeed: 1,
      orbitRadius: 10,
      orbitStartAngleDeg: -30,
      orbitEndAngleDeg: 45,
      handheldIntensity: 0.35,
      targetCharacterId: 'char-1',
      secondaryCharacterId: 'char-2',
    },
  },
  {
    id: 'futuristic_sword_duel',
    label: 'Futuristic Plaza Sword Duel (Rain)',
    description: 'Two martial artists dueling with blades in a rain-swept brutalist arena',
    duration: 8,
    environment: {
      preset: 'futuristic_architecture',
      buildingDensity: 1.0,
      streetWidth: 12,
      buildingScaleY: 1.15,
      showGrid: true,
      showWireframeEdges: true,
      sunAzimuthDeg: 24,
      sunElevationDeg: 58,
      backgroundHex: '#181c22',
      weatherParticles: 'rain',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Duelist Alpha',
        action: 'fighting_stance',
        startPos: [-2.4, 0.25, -4.0],
        endPos: [-0.9, 0.25, -4.0],
        startRotationY: 90,
        endRotationY: 90,
        scale: 1,
        heightMeters: 1.82,
        colorHex: '#e2e6ec',
        heldProp: 'sword_blade',
        startTime: 0,
        endTime: 8,
      },
      {
        id: 'char-2',
        name: 'Duelist Beta',
        action: 'fighting_stance',
        startPos: [2.4, 0.25, -4.0],
        endPos: [0.9, 0.25, -4.0],
        startRotationY: -90,
        endRotationY: -90,
        scale: 1,
        heightMeters: 1.82,
        colorHex: '#8e96a2',
        heldProp: 'sword_blade',
        startTime: 0,
        endTime: 8,
      },
    ],
    props: [
      {
        id: 'prop-monolith-l',
        name: 'Arena Monolith West',
        type: 'monolith',
        startPos: [-6.5, 0.25, -6.5],
        endPos: [-6.5, 0.25, -6.5],
        dimensions: [2.2, 6.0, 1.2],
        rotationY: 20,
        colorHex: '#6c7480',
        startTime: 0,
        endTime: 8,
      },
      {
        id: 'prop-monolith-r',
        name: 'Arena Monolith East',
        type: 'monolith',
        startPos: [6.5, 0.25, -6.5],
        endPos: [6.5, 0.25, -6.5],
        dimensions: [2.2, 6.0, 1.2],
        rotationY: -20,
        colorHex: '#6c7480',
        startTime: 0,
        endTime: 8,
      },
    ],
    camera: {
      mode: 'orbit',
      focalLengthMm: 35,
      startPos: [0, 2.2, 3.5],
      endPos: [6, 2.8, -4.0],
      startTarget: [0, 1.4, -4.0],
      endTarget: [0, 1.4, -4.0],
      cameraHeightOffset: 0.4,
      movementSpeed: 1,
      orbitRadius: 6.5,
      orbitStartAngleDeg: -65,
      orbitEndAngleDeg: 75,
      handheldIntensity: 0.3,
      targetCharacterId: 'char-1',
      secondaryCharacterId: 'char-2',
    },
  },
  {
    id: 'transit_station_arrival',
    label: 'Transit Station Train Arrival',
    description: 'Commuter waiting on platform as low-poly metro train glides into station',
    duration: 8,
    environment: {
      preset: 'public_transit_stations',
      buildingDensity: 1.0,
      streetWidth: 10,
      buildingScaleY: 1.0,
      showGrid: true,
      showWireframeEdges: true,
      sunAzimuthDeg: 28,
      sunElevationDeg: 48,
      backgroundHex: '#1b1f25',
      weatherParticles: 'none',
    },
    characters: [
      {
        id: 'char-1',
        name: 'Commuter 01',
        action: 'looking_around',
        startPos: [-2.0, 1.1, 0.2],
        endPos: [-2.0, 1.1, 0.2],
        startRotationY: 180,
        endRotationY: 180,
        scale: 1,
        heightMeters: 1.8,
        colorHex: '#dce0e6',
        heldProp: 'briefcase',
        startTime: 0,
        endTime: 8,
      },
      {
        id: 'char-2',
        name: 'Walking Passenger',
        action: 'walking',
        startPos: [-9.0, 1.1, 2.2],
        endPos: [3.0, 1.1, 2.2],
        startRotationY: 90,
        endRotationY: 90,
        scale: 1,
        heightMeters: 1.75,
        colorHex: '#949ba5',
        heldProp: 'none',
        startTime: 0,
        endTime: 8,
      },
    ],
    props: [],
    camera: {
      mode: 'crane',
      focalLengthMm: 28,
      startPos: [6.5, 2.2, 5.8],
      endPos: [2.8, 3.6, 4.2],
      startTarget: [-2.0, 2.2, -2.5],
      endTarget: [0, 2.2, -3.5],
      cameraHeightOffset: 0,
      movementSpeed: 1,
      orbitRadius: 8,
      orbitStartAngleDeg: 0,
      orbitEndAngleDeg: 60,
      handheldIntensity: 0.3,
      targetCharacterId: 'char-1',
      secondaryCharacterId: 'char-2',
    },
  },
];

export const FuLabsGreyboxSlide: React.FC<FuLabsGreyboxSlideProps> = ({
  onOpenMenu,
  onGoToSlideFour,
  onGoToVx,
  onBackToHero,
  currentUser,
}) => {
  const defaultTemplate = CURATED_SCENE_TEMPLATES[0];

  // Scene State (Default 10s so it aligns with 5,10,15,20,25,30s options)
  const [sceneTitle, setSceneTitle] = useState<string>(defaultTemplate.label);
  const [duration, setDuration] = useState<number>(10);
  const [physicsConfig, setPhysicsConfig] = useState<ScenePhysicsConfig>(
    getPhysicsPresetConfig('normal')
  );
  const [isScratchMode, setIsScratchMode] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [viewportMode, setViewportMode] = useState<'cinematic' | 'free_orbit'>('cinematic');
  const [viewportTool, setViewportTool] = useState<ViewportToolMode>('select');
  const [showTrajectories, setShowTrajectories] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<InspectorTab>('ai_architect');
  const [isCoOpModalOpen, setIsCoOpModalOpen] = useState<boolean>(false);

  const [envSettings, setEnvSettings] = useState<EnvironmentSettingsConfig>(
    defaultTemplate.environment
  );
  const [characters, setCharacters] = useState<GreyboxCharacterConfig[]>(
    defaultTemplate.characters.map((c) => ({ ...c, endTime: 10 }))
  );
  const [propsList, setPropsList] = useState<GreyboxPropConfig[]>(
    defaultTemplate.props.map((p) => ({ ...p, endTime: 10 }))
  );
  const [cameraConfig, setCameraConfig] = useState<CameraKeyframeConfig>(
    defaultTemplate.camera
  );

  const [selectedCharId, setSelectedCharId] = useState<string>(
    defaultTemplate.characters[0]?.id || ''
  );
  const [selectedPropId, setSelectedPropId] = useState<string>(
    defaultTemplate.props[0]?.id || ''
  );
  const [propCategoryFilter, setPropCategoryFilter] = useState<string>('All');

  // AI Text-to-3D Scene Architect State
  const [aiPrompt, setAiPrompt] = useState<string>(AI_SCENE_PROMPT_EXAMPLES[0].prompt);
  const [aiModel, setAiModel] = useState<FreeGeminiModelId>('gemini-3.8');
  const [aiMode, setAiMode] = useState<'create' | 'modify'>('create');
  const [isGeneratingAiScene, setIsGeneratingAiScene] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDirectorSummary, setAiDirectorSummary] = useState<string>(
    'Select your scene duration (5s–30s) and 3D physics movement mode (Slow, Fast, Epic, Complex), then describe your scene in plain text for Gemini to construct.'
  );
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);
  const [aiSeedancePrompt, setAiSeedancePrompt] = useState<string>('');
  const [copiedSeedance, setCopiedSeedance] = useState<boolean>(false);

  // Recording / Video Export State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedFileSizeMb, setRecordedFileSizeMb] = useState<string>('0.0');
  const [exportStatusText, setExportStatusText] = useState<string>('Ready to record 1080p @ 24fps');

  // File Input ref for JSON import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Three.js Refs
  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cinematicCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);

  // Dynamic Scene Object Maps
  const envGroupRef = useRef<THREE.Group | null>(null);
  const envDynamicUpdaterRef = useRef<((t: number, d: number) => void) | null>(null);
  const charRigsMapRef = useRef<Map<string, ArticulatedHumanRig>>(new Map());
  const propMeshesMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const trajectoryGroupRef = useRef<THREE.Group | null>(null);

  // Raycasting & Ground Drag Refs
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const isDraggingGroundRef = useRef<boolean>(false);

  // Mutable animation loop state refs
  const stateRef = useRef({
    currentTime,
    duration,
    physicsConfig,
    isPlaying,
    isRecording,
    viewportMode,
    viewportTool,
    showTrajectories,
    selectedCharId,
    selectedPropId,
    activeTab,
    envSettings,
    characters,
    propsList,
    cameraConfig,
  });

  useEffect(() => {
    stateRef.current = {
      currentTime,
      duration,
      physicsConfig,
      isPlaying,
      isRecording,
      viewportMode,
      viewportTool,
      showTrajectories,
      selectedCharId,
      selectedPropId,
      activeTab,
      envSettings,
      characters,
      propsList,
      cameraConfig,
    };
  }, [
    currentTime,
    duration,
    physicsConfig,
    isPlaying,
    isRecording,
    viewportMode,
    viewportTool,
    showTrajectories,
    selectedCharId,
    selectedPropId,
    activeTab,
    envSettings,
    characters,
    propsList,
    cameraConfig,
  ]);

  /**
   * Deterministic evaluation of the entire 3D greybox scene at timestamp `t`
   */
  const evaluateSceneAtTimestamp = useCallback((t: number) => {
    const {
      duration: totalDur,
      physicsConfig: physCfg,
      characters: charList,
      propsList: pList,
      cameraConfig: camCfg,
    } = stateRef.current;

    if (envDynamicUpdaterRef.current) {
      envDynamicUpdaterRef.current(t, totalDur);
    }

    const rigsMap = charRigsMapRef.current;
    for (const charCfg of charList) {
      const rig = rigsMap.get(charCfg.id);
      if (rig) {
        evaluateCharacterPoseAtTime(rig, charCfg, t, physCfg);
      }
    }

    const pMap = propMeshesMapRef.current;
    for (const propCfg of pList) {
      const propGroup = pMap.get(propCfg.id);
      if (propGroup) {
        evaluatePropAtTime(propGroup, propCfg, t, physCfg);
      }
    }

    if (cinematicCameraRef.current) {
      evaluateCinematicCameraAtTime(
        cinematicCameraRef.current,
        camCfg,
        rigsMap,
        t,
        totalDur
      );
    }
  }, []);

  /**
   * Initialize Three.js WebGLRenderer, Scene, Lighting, and Cameras
   */
  useEffect(() => {
    const container = viewportContainerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(stateRef.current.envSettings.backgroundHex);
    scene.fog = new THREE.FogExp2(stateRef.current.envSettings.backgroundHex, 0.012);
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xdce2ec, 0x383d45, 0.65);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xf6f8fc, 1.65);
    dirLight.position.set(18, 28, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 95;
    const d = 28;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const cineCam = new THREE.PerspectiveCamera(
      focalLengthToVerticalFov(stateRef.current.cameraConfig.focalLengthMm),
      16 / 9,
      0.1,
      250
    );
    cinematicCameraRef.current = cineCam;

    const orbitCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 300);
    orbitCam.position.set(-12, 8, 14);
    orbitCameraRef.current = orbitCam;

    const controls = new OrbitControls(orbitCam, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.target.set(0, 1.5, 0);
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.enabled = stateRef.current.viewportMode === 'free_orbit';
    orbitControlsRef.current = controls;

    const updateSize = () => {
      if (!viewportContainerRef.current || stateRef.current.isRecording) return;
      const w = Math.max(320, viewportContainerRef.current.clientWidth);
      const h = Math.max(180, viewportContainerRef.current.clientHeight);
      renderer.setSize(w, h, false);
      cineCam.aspect = w / h;
      cineCam.updateProjectionMatrix();
      orbitCam.aspect = w / h;
      orbitCam.updateProjectionMatrix();
    };
    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    let rafId = 0;
    let lastPerfTime = performance.now();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.1, (now - lastPerfTime) / 1000);
      lastPerfTime = now;

      if (stateRef.current.isRecording) return;

      let nextTime = stateRef.current.currentTime;
      if (stateRef.current.isPlaying) {
        nextTime += dt;
        if (nextTime > stateRef.current.duration) {
          nextTime = 0;
        }
        stateRef.current.currentTime = nextTime;
        setCurrentTime(nextTime);
      }

      evaluateSceneAtTimestamp(nextTime);

      if (stateRef.current.viewportMode === 'free_orbit') {
        controls.update();
        renderer.render(scene, orbitCam);
      } else {
        renderer.render(scene, cineCam);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, [evaluateSceneAtTimestamp]);

  /**
   * Rebuild Environment Geometry & Lighting when `envSettings` changes
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (envGroupRef.current) {
      scene.remove(envGroupRef.current);
      envGroupRef.current.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
      });
    }

    const { root, updateDynamicElements } = buildGreyboxEnvironment(envSettings);
    scene.add(root);
    envGroupRef.current = root;
    envDynamicUpdaterRef.current = updateDynamicElements;

    scene.background = new THREE.Color(envSettings.backgroundHex);
    scene.fog = new THREE.FogExp2(envSettings.backgroundHex, 0.011);

    if (dirLightRef.current) {
      const azRad = THREE.MathUtils.degToRad(envSettings.sunAzimuthDeg);
      const elRad = THREE.MathUtils.degToRad(Math.max(10, envSettings.sunElevationDeg));
      const dist = 34;
      dirLightRef.current.position.set(
        Math.cos(elRad) * Math.sin(azRad) * dist,
        Math.sin(elRad) * dist,
        Math.cos(elRad) * Math.cos(azRad) * dist
      );
    }

    evaluateSceneAtTimestamp(stateRef.current.currentTime);
  }, [envSettings, evaluateSceneAtTimestamp]);

  /**
   * Rebuild Character Rigs when character list changes
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const rigsMap = charRigsMapRef.current;
    rigsMap.forEach((rig) => {
      scene.remove(rig.root);
    });
    rigsMap.clear();

    for (const charCfg of characters) {
      const rig = createProceduralHumanRig(charCfg, envSettings.showWireframeEdges);
      scene.add(rig.root);
      rigsMap.set(charCfg.id, rig);
    }

    evaluateSceneAtTimestamp(stateRef.current.currentTime);
  }, [characters, envSettings.showWireframeEdges, evaluateSceneAtTimestamp]);

  /**
   * Rebuild Scene Props when propsList changes
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const pMap = propMeshesMapRef.current;
    pMap.forEach((group) => {
      scene.remove(group);
    });
    pMap.clear();

    for (const propCfg of propsList) {
      const meshGroup = createGreyboxPropMesh(propCfg, envSettings.showWireframeEdges);
      scene.add(meshGroup);
      pMap.set(propCfg.id, meshGroup);
    }

    evaluateSceneAtTimestamp(stateRef.current.currentTime);
  }, [propsList, envSettings.showWireframeEdges, evaluateSceneAtTimestamp]);

  /**
   * Rebuild 3D Motion Trajectory Helpers when characters, props, camera, or selection changes
   */
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (trajectoryGroupRef.current) {
      scene.remove(trajectoryGroupRef.current);
    }

    const activeEntityId =
      activeTab === 'props' ? selectedPropId : selectedCharId;

    const helperGroup = buildTrajectoryHelperGroup(
      characters,
      propsList,
      cameraConfig,
      activeEntityId,
      physicsConfig
    );
    helperGroup.visible = showTrajectories && !isRecording;
    scene.add(helperGroup);
    trajectoryGroupRef.current = helperGroup;
  }, [
    characters,
    propsList,
    cameraConfig,
    selectedCharId,
    selectedPropId,
    activeTab,
    showTrajectories,
    isRecording,
    physicsConfig,
  ]);

  /**
   * Toggle OrbitControls enabled state based on viewportMode and viewportTool
   */
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled =
        viewportMode === 'free_orbit' && viewportTool === 'select';
    }
  }, [viewportMode, viewportTool]);

  /**
   * 3D Viewport Pointer Raycasting:
   * - In 'select' mode: clicking a character or prop selects it and opens its inspector.
   * - In 'drag_start' or 'drag_end' mode: dragging on the ground plane moves the active entity's Start or End X/Z coordinates in real time.
   */
  const getNormalizedPointer = (e: React.PointerEvent<HTMLDivElement>): THREE.Vector2 | null => {
    const renderer = rendererRef.current;
    if (!renderer) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return new THREE.Vector2(x, y);
  };

  const getActiveCamera = (): THREE.PerspectiveCamera | null => {
    return stateRef.current.viewportMode === 'free_orbit'
      ? orbitCameraRef.current
      : cinematicCameraRef.current;
  };

  const applyGroundIntersectionToSelected = (ndc: THREE.Vector2) => {
    const cam = getActiveCamera();
    if (!cam) return;
    raycasterRef.current.setFromCamera(ndc, cam);
    const groundPlaneMath = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    if (raycasterRef.current.ray.intersectPlane(groundPlaneMath, hitPoint)) {
      const rx = Number(Math.max(-35, Math.min(35, hitPoint.x)).toFixed(1));
      const rz = Number(Math.max(-35, Math.min(35, hitPoint.z)).toFixed(1));
      const tool = stateRef.current.viewportTool;

      if (stateRef.current.activeTab === 'props' && stateRef.current.selectedPropId) {
        const pid = stateRef.current.selectedPropId;
        setPropsList((prev) =>
          prev.map((p) => {
            if (p.id !== pid) return p;
            if (tool === 'drag_start') {
              return { ...p, startPos: [rx, p.startPos[1], rz] };
            }
            return { ...p, endPos: [rx, p.endPos[1], rz] };
          })
        );
      } else if (stateRef.current.selectedCharId) {
        const cid = stateRef.current.selectedCharId;
        setCharacters((prev) =>
          prev.map((c) => {
            if (c.id !== cid) return c;
            if (tool === 'drag_start') {
              return { ...c, startPos: [rx, c.startPos[1], rz] };
            }
            return { ...c, endPos: [rx, c.endPos[1], rz] };
          })
        );
      }
    }
  };

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isRecording) return;
    const ndc = getNormalizedPointer(e);
    const cam = getActiveCamera();
    const scene = sceneRef.current;
    if (!ndc || !cam || !scene) return;

    if (viewportTool === 'drag_start' || viewportTool === 'drag_end') {
      isDraggingGroundRef.current = true;
      applyGroundIntersectionToSelected(ndc);
      return;
    }

    // Raycast against characters and props
    raycasterRef.current.setFromCamera(ndc, cam);
    const pickables: THREE.Object3D[] = [];
    charRigsMapRef.current.forEach((rig) => pickables.push(rig.root));
    propMeshesMapRef.current.forEach((mesh) => pickables.push(mesh));

    const hits = raycasterRef.current.intersectObjects(pickables, true);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.entityType) {
        obj = obj.parent;
      }
      if (obj?.userData?.entityType === 'character') {
        setSelectedCharId(obj.userData.entityId);
        setActiveTab('characters');
      } else if (obj?.userData?.entityType === 'prop') {
        setSelectedPropId(obj.userData.entityId);
        setActiveTab('props');
      }
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingGroundRef.current || isRecording) return;
    const ndc = getNormalizedPointer(e);
    if (!ndc) return;
    applyGroundIntersectionToSelected(ndc);
  };

  const handleViewportPointerUp = () => {
    isDraggingGroundRef.current = false;
  };

  /**
   * Change scene duration (5, 10, 15, 20, 25, 30s) and synchronize active actor/prop timelines
   */
  const handleSelectDuration = (sec: number) => {
    setDuration(sec);
    setCharacters((prev) => prev.map((c) => ({ ...c, endTime: sec })));
    setPropsList((prev) => prev.map((p) => ({ ...p, endTime: sec })));
    if (currentTime > sec) {
      setCurrentTime(0);
    }
  };

  /**
   * Switch 3D Physics & Movement Dynamics preset (slow, normal, fast, epic, complex)
   */
  const handleSelectPhysicsMode = (mode: ScenePhysicsMode) => {
    const nextPhys = getPhysicsPresetConfig(mode);
    setPhysicsConfig(nextPhys);
    setCameraConfig((prev) => ({
      ...prev,
      movementSpeed:
        mode === 'slow' ? 0.65 : mode === 'fast' ? 1.35 : mode === 'epic' ? 1.15 : 1.0,
    }));
  };

  /**
   * Clear template to a Blank Scratch Stage so user can decide Duration (5–30s) & Physics first
   */
  const handleStartWithoutTemplate = () => {
    setIsPlaying(false);
    setIsScratchMode(true);
    setSceneTitle('Custom Scratch Stage (Choose Duration & Physics First)');
    setCurrentTime(0);
    setEnvSettings({
      preset: 'urban_streets',
      buildingDensity: 1.0,
      streetWidth: 12,
      buildingScaleY: 1.0,
      showGrid: true,
      showWireframeEdges: true,
      sunAzimuthDeg: 42,
      sunElevationDeg: 52,
      backgroundHex: '#181c22',
      weatherParticles: 'none',
    });
    setCharacters([
      {
        id: 'char-scratch-1',
        name: 'Reference Actor 01',
        action: 'standing',
        startPos: [0, 0, 0],
        endPos: [0, 0, 0],
        startRotationY: 0,
        endRotationY: 0,
        scale: 1,
        heightMeters: 1.8,
        colorHex: '#dce0e6',
        heldProp: 'none',
        startTime: 0,
        endTime: duration,
      },
    ]);
    setPropsList([]);
    setSelectedCharId('char-scratch-1');
    setSelectedPropId('');
    setAiMode('create');
    setActiveTab('ai_architect');
    setRecordedVideoUrl(null);
  };

  /**
   * Load a curated scene template
   */
  const applySceneTemplate = (tpl: SceneTemplatePreset) => {
    setIsPlaying(false);
    setIsScratchMode(false);
    setSceneTitle(tpl.label);
    const snapDuration = SCENE_DURATION_OPTIONS.includes(tpl.duration as any)
      ? tpl.duration
      : 10;
    setDuration(snapDuration);
    setCurrentTime(0);
    setEnvSettings({ ...tpl.environment });
    setCharacters(tpl.characters.map((c) => ({ ...c, endTime: snapDuration })));
    setPropsList(tpl.props.map((p) => ({ ...p, endTime: snapDuration })));
    setCameraConfig({ ...tpl.camera });
    setSelectedCharId(tpl.characters[0]?.id || '');
    setSelectedPropId(tpl.props[0]?.id || '');
    setRecordedVideoUrl(null);
    setTimeout(() => setIsPlaying(true), 60);
  };

  /**
   * Load and Co-Direct a Community 3D Scene from the Co-Op Matrix
   */
  const handleLoadCommunityScene = (sceneData: any, newDuration: number, newPhysicsMode: string) => {
    setIsPlaying(false);
    if (sceneData.sceneTitle) setSceneTitle(sceneData.sceneTitle);
    const snapDur = SCENE_DURATION_OPTIONS.includes(newDuration as any) ? newDuration : 10;
    setDuration(snapDur);
    if (newPhysicsMode) {
      handleSelectPhysicsMode(newPhysicsMode as any);
    }
    if (sceneData.environment) {
      setEnvSettings(sceneData.environment);
    }
    if (Array.isArray(sceneData.characters)) {
      setCharacters(sceneData.characters.map((c: any) => ({ ...c, endTime: snapDur })));
      setSelectedCharId(sceneData.characters[0]?.id || '');
    }
    if (Array.isArray(sceneData.props)) {
      setPropsList(sceneData.props.map((p: any) => ({ ...p, endTime: snapDur })));
      setSelectedPropId(sceneData.props[0]?.id || '');
    }
    if (sceneData.camera) {
      setCameraConfig(sceneData.camera);
    }
    if (sceneData.seedancePrompt) {
      setAiSeedancePrompt(sceneData.seedancePrompt);
    }
    setCurrentTime(0);
    setViewportMode('cinematic');
    setRecordedVideoUrl(null);
    setTimeout(() => setIsPlaying(true), 80);
  };

  /**
   * Call Backend AI Text-to-3D Scene Architect (`POST /api/prompt/fulabs-3d-scene`)
   */
  const handleGenerateAi3DScene = async (overridePrompt?: string) => {
    const promptToUse = (overridePrompt ?? aiPrompt).trim();
    if (!promptToUse || isGeneratingAiScene) return;

    setIsGeneratingAiScene(true);
    setAiError(null);

    try {
      const response = await fetch('/api/prompt/fulabs-3d-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          model: aiModel,
          mode: aiMode,
          duration,
          physicsMode: physicsConfig.mode,
          currentScene:
            aiMode === 'modify'
              ? {
                  duration,
                  physics: physicsConfig,
                  environment: envSettings,
                  characters,
                  props: propsList,
                  camera: cameraConfig,
                }
              : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to generate 3D greybox scene.');
      }

      setIsPlaying(false);
      setIsScratchMode(false);
      setSceneTitle(data.sceneTitle || 'AI Generated 3D Greybox Scene');
      setAiDirectorSummary(data.directorSummary || '');
      setAiEngineUsed(data.engineUsed || aiModel);
      setAiSeedancePrompt(data.seedancePrompt || '');

      if (typeof data.duration === 'number') {
        setDuration(data.duration);
      }
      if (data.physics && data.physics.mode) {
        setPhysicsConfig({
          mode: data.physics.mode,
          timeScale: Number(data.physics.timeScale) || physicsConfig.timeScale,
          gravityScale: Number(data.physics.gravityScale) || physicsConfig.gravityScale,
          pathCurvature: Number(data.physics.pathCurvature ?? physicsConfig.pathCurvature),
          secondaryMotion: Number(data.physics.secondaryMotion ?? physicsConfig.secondaryMotion),
        });
      }
      if (data.environment) {
        setEnvSettings(data.environment);
      }
      if (Array.isArray(data.characters) && data.characters.length > 0) {
        setCharacters(data.characters);
        setSelectedCharId(data.characters[0].id);
      }
      if (Array.isArray(data.props)) {
        setPropsList(data.props);
        setSelectedPropId(data.props[0]?.id || '');
      }
      if (data.camera) {
        setCameraConfig(data.camera);
      }

      setCurrentTime(0);
      setViewportMode('cinematic');
      setRecordedVideoUrl(null);
      setTimeout(() => setIsPlaying(true), 80);
    } catch (err: any) {
      setAiError(err?.message || 'Unable to generate 3D scene from prompt.');
    } finally {
      setIsGeneratingAiScene(false);
    }
  };

  /**
   * Add a new procedural character
   */
  const handleAddCharacter = () => {
    const idx = characters.length + 1;
    const newId = `char-${Date.now().toString().slice(-4)}`;
    const newChar: GreyboxCharacterConfig = {
      id: newId,
      name: `Actor 0${idx}`,
      action: 'walking',
      startPos: [(idx % 2 === 0 ? 1.5 : -1.5), 0, -4],
      endPos: [(idx % 2 === 0 ? 1.5 : -1.5), 0, 4],
      startRotationY: 0,
      endRotationY: 0,
      scale: 1,
      heightMeters: 1.8,
      colorHex: '#cfd4dc',
      heldProp: 'none',
      startTime: 0,
      endTime: duration,
    };
    setCharacters((prev) => [...prev, newChar]);
    setSelectedCharId(newId);
    setActiveTab('characters');
  };

  const handleDuplicateCharacter = (char: GreyboxCharacterConfig) => {
    const newId = `char-${Date.now().toString().slice(-4)}`;
    const clone: GreyboxCharacterConfig = {
      ...char,
      id: newId,
      name: `${char.name} (Copy)`,
      startPos: [Number((char.startPos[0] + 1.4).toFixed(1)), char.startPos[1], char.startPos[2]],
      endPos: [Number((char.endPos[0] + 1.4).toFixed(1)), char.endPos[1], char.endPos[2]],
    };
    setCharacters((prev) => [...prev, clone]);
    setSelectedCharId(newId);
  };

  const handleAutoFaceCharacterTrajectory = (id: string) => {
    setCharacters((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const dx = c.endPos[0] - c.startPos[0];
        const dz = c.endPos[2] - c.startPos[2];
        if (Math.hypot(dx, dz) < 0.05) return c;
        const yawDeg = Math.round(THREE.MathUtils.radToDeg(Math.atan2(dx, dz)));
        return { ...c, startRotationY: yawDeg, endRotationY: yawDeg };
      })
    );
  };

  const handleRemoveCharacter = (id: string) => {
    if (characters.length <= 1) return;
    const filtered = characters.filter((c) => c.id !== id);
    setCharacters(filtered);
    if (selectedCharId === id) {
      setSelectedCharId(filtered[0]?.id || '');
    }
  };

  const updateSelectedCharacter = (patch: Partial<GreyboxCharacterConfig>) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === selectedCharId ? { ...c, ...patch } : c))
    );
  };

  /**
   * Add a 3D asset from the 26-item Procedural Library
   */
  const handleAddProp = (type: GreyboxPropType) => {
    const catalogItem = PROP_LIBRARY_CATALOG.find((item) => item.type === type);
    const dims: [number, number, number] = catalogItem
      ? ([...catalogItem.defaultDims] as [number, number, number])
      : [1.5, 1.5, 1.5];
    const label = catalogItem ? catalogItem.label : type.toUpperCase();
    const defaultY = type === 'helicopter' ? 6.5 : type === 'drone_quad' ? 3.2 : 0;

    const newId = `prop-${Date.now().toString().slice(-4)}`;
    const newProp: GreyboxPropConfig = {
      id: newId,
      name: `${label} ${propsList.length + 1}`,
      type,
      startPos: [2.2, defaultY, -1.5],
      endPos:
        type === 'helicopter' || type === 'drone_quad'
          ? [2.2, defaultY, 4.5]
          : [2.2, defaultY, -1.5],
      dimensions: dims,
      rotationY: 0,
      colorHex: '#8a929e',
      startTime: 0,
      endTime: duration,
    };
    setPropsList((prev) => [...prev, newProp]);
    setSelectedPropId(newId);
    setActiveTab('props');
  };

  const updateProp = (id: string, patch: Partial<GreyboxPropConfig>) => {
    setPropsList((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removeProp = (id: string) => {
    const next = propsList.filter((p) => p.id !== id);
    setPropsList(next);
    if (selectedPropId === id) {
      setSelectedPropId(next[0]?.id || '');
    }
  };

  /**
   * Export & Import Scene JSON
   */
  const handleExportSceneJson = () => {
    const payload = {
      version: 'fulabs-greybox-v2',
      sceneTitle,
      duration,
      environment: envSettings,
      characters,
      props: propsList,
      camera: cameraConfig,
      seedancePrompt: aiSeedancePrompt,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fulabs-scene-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSceneJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed.environment && Array.isArray(parsed.characters)) {
          setSceneTitle(parsed.sceneTitle || 'Imported 3D Greybox Scene');
          setDuration(Number(parsed.duration) || 8);
          setEnvSettings(parsed.environment);
          setCharacters(parsed.characters);
          setPropsList(Array.isArray(parsed.props) ? parsed.props : []);
          if (parsed.camera) setCameraConfig(parsed.camera);
          if (parsed.seedancePrompt) setAiSeedancePrompt(parsed.seedancePrompt);
          setCurrentTime(0);
        }
      } catch {
        // Ignore invalid JSON file
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /**
   * Deterministic 1920x1080 @ 24fps WebM Video Export
   * Hides editor trajectory helpers so output is 100% pure 3D greybox geometry.
   */
  const handleExport1080pVideo = async () => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const cineCam = cinematicCameraRef.current;
    if (!renderer || !scene || !cineCam || isRecording) return;

    setIsPlaying(false);
    setIsRecording(true);
    setRecordingProgress(0);
    setRecordedVideoUrl(null);
    setExportStatusText('Initializing 1920×1080 @ 24fps WebGL frame capture...');

    if (trajectoryGroupRef.current) {
      trajectoryGroupRef.current.visible = false;
    }

    const prevWidth = renderer.domElement.width;
    const prevHeight = renderer.domElement.height;
    const prevPixelRatio = renderer.getPixelRatio();

    renderer.setPixelRatio(1);
    renderer.setSize(1920, 1080, false);
    cineCam.aspect = 1920 / 1080;
    cineCam.updateProjectionMatrix();

    const fps = 24;
    const stream = renderer.domElement.captureStream(fps);
    const mimeCandidates = [
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    const selectedMime =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMime,
      videoBitsPerSecond: 12_000_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const recordingFinished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const totalFrames = Math.max(24, Math.round(duration * fps));
    const frameIntervalMs = 1000 / fps;

    recorder.start(100);

    for (let frameIdx = 0; frameIdx <= totalFrames; frameIdx++) {
      const simTime = Math.min(duration, (frameIdx / totalFrames) * duration);
      stateRef.current.currentTime = simTime;
      setCurrentTime(simTime);

      evaluateSceneAtTimestamp(simTime);
      renderer.render(scene, cineCam);

      const pct = Math.round((frameIdx / totalFrames) * 100);
      setRecordingProgress(pct);
      setExportStatusText(
        `Rendering frame ${frameIdx}/${totalFrames} (${pct}%) — 1920×1080 @ 24fps`
      );

      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }

    recorder.stop();
    await recordingFinished;

    const blob = new Blob(chunks, { type: selectedMime });
    const url = URL.createObjectURL(blob);
    const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);

    setRecordedVideoUrl(url);
    setRecordedFileSizeMb(sizeMb);
    setExportStatusText(`Complete • 1920×1080 • 24 FPS • ${duration}s (${sizeMb} MB)`);

    if (viewportContainerRef.current) {
      const w = Math.max(320, viewportContainerRef.current.clientWidth);
      const h = Math.max(180, viewportContainerRef.current.clientHeight);
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setSize(w, h, false);
      cineCam.aspect = w / h;
      cineCam.updateProjectionMatrix();
    } else {
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setSize(prevWidth, prevHeight, false);
    }

    if (trajectoryGroupRef.current) {
      trajectoryGroupRef.current.visible = stateRef.current.showTrajectories;
    }

    setIsRecording(false);
    setActiveTab('export');
  };

  const selectedChar =
    characters.find((c) => c.id === selectedCharId) || characters[0];
  const selectedProp =
    propsList.find((p) => p.id === selectedPropId) || propsList[0];

  const filteredCatalog =
    propCategoryFilter === 'All'
      ? PROP_LIBRARY_CATALOG
      : PROP_LIBRARY_CATALOG.filter((item) => item.category === propCategoryFilter);

  return (
    <div className="relative w-full h-full bg-[#0d0f12] text-[#e4e7ec] flex flex-col overflow-hidden select-none font-sans">
      {/* Hidden JSON file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImportSceneJson}
      />

      {/* TOP STUDIO HEADER BAR */}
      <header className="h-[calc(3rem+env(safe-area-inset-top))] pt-[max(0rem,env(safe-area-inset-top))] shrink-0 border-b border-white/10 bg-[#12151a] px-3 flex items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              className="h-8 px-2.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 text-white/90 transition"
              title="Open Slide Navigation"
            >
              <Menu className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Slides</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-white text-black font-mono text-[10px] font-bold tracking-widest uppercase">
              SLIDE 05 • FU LABS
            </span>
            <h1 className="text-xs sm:text-sm font-semibold tracking-tight text-white truncate">
              {sceneTitle}
            </h1>
            <span className="hidden xl:inline-block text-[11px] font-mono text-white/45 border-l border-white/10 pl-2">
              AI TEXT-TO-3D GREYBOX • SEEDANCE 2.5 STRUCTURAL REFERENCE
            </span>
          </div>
        </div>

        {/* Center Quick Scene Preset Selector + Scratch Mode */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleStartWithoutTemplate}
            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition ${
              isScratchMode
                ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
            }`}
            title="Start without a template: decide Duration (5–30s) and Physics first, then generate from prompt"
          >
            + Blank Stage (No Template)
          </button>
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/35 mx-0.5">
            |
          </span>
          {CURATED_SCENE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applySceneTemplate(tpl)}
              className="px-2 py-1 rounded text-[11px] font-mono bg-white/5 hover:bg-white/15 border border-white/10 text-white/85 transition truncate max-w-[145px]"
              title={tpl.description}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleExportSceneJson}
            className="h-8 px-2.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-mono text-white/75 flex items-center gap-1 transition"
            title="Download 3D Scene JSON"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Save JSON</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-2.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-mono text-white/75 flex items-center gap-1 transition"
            title="Load 3D Scene JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Load</span>
          </button>

          {onGoToSlideFour && (
            <button
              type="button"
              onClick={onGoToSlideFour}
              className="h-8 px-2.5 rounded border border-white/15 bg-white/5 hover:bg-white/10 text-[11px] font-mono text-white/80 transition hidden sm:flex items-center gap-1"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Slide 04 Studio</span>
            </button>
          )}

          {onGoToVx && (
            <button
              type="button"
              onClick={onGoToVx}
              className="h-8 px-2.5 rounded border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20 text-[11px] font-mono text-amber-300 transition hidden md:flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Slide 06 VX</span>
            </button>
          )}

          <button
            type="button"
            disabled={isRecording}
            onClick={handleExport1080pVideo}
            className={`h-8 px-3 rounded text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 transition ${
              isRecording
                ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200 cursor-wait'
                : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>
              {isRecording ? `Recording ${recordingProgress}%` : 'Export 1080p Reference'}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: LEFT VIEWPORT + TIMELINE | RIGHT INSPECTOR DOCK */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: QUICK AI BAR + 3D VIEWPORT + TIMELINE */}
        <div className="flex-1 min-h-0 flex flex-col bg-[#0b0d10] relative">
          {/* QUICK AI TEXT-TO-3D PROMPT BAR ABOVE VIEWPORT (DECIDE DURATION & PHYSICS FIRST) */}
          <div className="border-b border-white/10 bg-[#11151c] px-3 py-2 flex flex-wrap items-center gap-2 z-10">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-300 shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI 3D</span>
            </div>

            {/* 1. Decide Duration First (5, 10, 15, 20, 25, 30s) */}
            <div className="flex items-center gap-1 bg-black/50 border border-white/15 rounded px-1.5 py-0.5">
              <span className="text-[10px] font-mono text-white/50 uppercase">Dur:</span>
              {SCENE_DURATION_OPTIONS.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSelectDuration(sec)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    duration === sec
                      ? 'bg-emerald-400 text-black font-bold'
                      : 'text-white/70 hover:text-white'
                  }`}
                  title={`Set 3D scene duration to ${sec} seconds before generating`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* 2. Decide 3D Physics Movement Mode (Slow, Normal, Fast, Epic, Complex) */}
            <select
              value={physicsConfig.mode}
              onChange={(e) => handleSelectPhysicsMode(e.target.value as ScenePhysicsMode)}
              className="h-7 px-2 rounded bg-black/50 border border-white/15 text-[11px] font-mono text-emerald-300 focus:outline-none focus:border-white/40"
              title="Manage 3D Physics & Movement Dynamics (Slow, Normal, Fast, Epic, Complex)"
            >
              {SCENE_PHYSICS_PRESET_META.map((p) => (
                <option key={p.id} value={p.id}>
                  Physics: {p.label}
                </option>
              ))}
            </select>

            {/* 3. Free Gemini Model Selector */}
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value as FreeGeminiModelId)}
              className="h-7 px-2 rounded bg-black/50 border border-white/15 text-[11px] font-mono text-white/90 focus:outline-none focus:border-white/40"
              title="Select Free Gemini Model"
            >
              {FREE_GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} • {m.badge}
                </option>
              ))}
            </select>

            <select
              value={aiMode}
              onChange={(e) => setAiMode(e.target.value as 'create' | 'modify')}
              className="h-7 px-2 rounded bg-black/50 border border-white/15 text-[11px] font-mono text-white/90 focus:outline-none focus:border-white/40"
              title="Create new 3D scene or modify current scene"
            >
              <option value="create">Create New</option>
              <option value="modify">Modify Scene</option>
            </select>

            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateAi3DScene();
                }
              }}
              placeholder="Describe 3D scene (e.g. Helicopter chasing sports car down skyscraper avenue)..."
              className="flex-1 min-w-[180px] h-7 px-2.5 rounded bg-black/50 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/40"
            />

            <button
              type="button"
              disabled={isGeneratingAiScene || !aiPrompt.trim()}
              onClick={() => handleGenerateAi3DScene()}
              className={`h-7 px-3 rounded text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 transition ${
                isGeneratingAiScene
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 cursor-wait'
                  : 'bg-emerald-400 text-black hover:bg-emerald-300'
              }`}
            >
              <Wand2 className="w-3 h-3" />
              <span>
                {isGeneratingAiScene
                  ? `Building ${duration}s...`
                  : aiMode === 'modify'
                  ? 'AI Modify'
                  : `Generate ${duration}s Scene`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsCoOpModalOpen(true)}
              className="h-7 px-2.5 rounded bg-cyan-400/15 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-300 font-mono text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title="Open Co-Op 3D Scene Matrix & Community Stages"
            >
              <Users className="w-3.5 h-3.5" />
              <span>CO-OP STAGES</span>
            </button>
          </div>

          {/* 3D VIEWPORT STAGE */}
          <div className="flex-1 min-h-0 relative flex items-center justify-center p-2 sm:p-3 overflow-hidden">
            <div className="relative w-full h-full max-w-full max-h-full aspect-video bg-[#181b20] rounded border border-white/15 overflow-hidden shadow-2xl">
              {/* Three.js Canvas Mount */}
              <div
                ref={viewportContainerRef}
                onPointerDown={handleViewportPointerDown}
                onPointerMove={handleViewportPointerMove}
                onPointerUp={handleViewportPointerUp}
                className={`w-full h-full ${
                  viewportTool === 'select' ? 'cursor-pointer' : 'cursor-crosshair'
                }`}
              />

              {/* Viewport HUD Overlay (Only on UI container — NEVER recorded into canvas stream) */}
              <div className="pointer-events-none absolute inset-x-3 top-2.5 flex items-start justify-between gap-2">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/15 rounded px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setViewportMode('cinematic')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition ${
                      viewportMode === 'cinematic'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Cinematic Cam ({cameraConfig.focalLengthMm}mm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportMode('free_orbit')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition ${
                      viewportMode === 'free_orbit'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Free Orbit Inspect
                  </button>

                  <span className="text-white/20">|</span>

                  {/* Interactive 3D Viewport Placement Tools */}
                  <button
                    type="button"
                    onClick={() => setViewportTool('select')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase flex items-center gap-1 transition ${
                      viewportTool === 'select'
                        ? 'bg-emerald-400/25 border border-emerald-400/50 text-emerald-200 font-semibold'
                        : 'text-white/65 hover:text-white'
                    }`}
                    title="Click any 3D actor or prop in the viewport to select it"
                  >
                    <MousePointer className="w-2.5 h-2.5" />
                    <span>Select</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportTool('drag_start')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase flex items-center gap-1 transition ${
                      viewportTool === 'drag_start'
                        ? 'bg-emerald-400/25 border border-emerald-400/50 text-emerald-200 font-semibold'
                        : 'text-white/65 hover:text-white'
                    }`}
                    title="Click & drag on the ground plane to move the selected object's Start Position"
                  >
                    <Move className="w-2.5 h-2.5" />
                    <span>Drag Start</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewportTool('drag_end')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase flex items-center gap-1 transition ${
                      viewportTool === 'drag_end'
                        ? 'bg-emerald-400/25 border border-emerald-400/50 text-emerald-200 font-semibold'
                        : 'text-white/65 hover:text-white'
                    }`}
                    title="Click & drag on the ground plane to move the selected object's End Position"
                  >
                    <Compass className="w-2.5 h-2.5" />
                    <span>Drag End</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTrajectories((v) => !v)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition ${
                      showTrajectories
                        ? 'bg-white/15 text-white'
                        : 'text-white/45 hover:text-white/80'
                    }`}
                    title="Toggle 3D motion path lines (automatically hidden during video export)"
                  >
                    Paths
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/15 rounded px-2.5 py-1 text-[10px] font-mono text-white/80">
                  <span>1920×1080</span>
                  <span className="text-white/30">•</span>
                  <span className="text-emerald-300 uppercase">
                    PHYSICS: {physicsConfig.mode} ({physicsConfig.timeScale.toFixed(2)}×)
                  </span>
                  <span className="text-white/30">•</span>
                  <span className="uppercase">{cameraConfig.mode.replace(/_/g, ' ')}</span>
                  <span className="text-white/30">•</span>
                  <span>
                    {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Recording Banner Overlay */}
              {isRecording && (
                <div className="pointer-events-none absolute inset-x-4 bottom-3 bg-black/85 border border-white/25 rounded p-2.5 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span>{exportStatusText}</span>
                  </div>
                  <span className="font-bold text-white">{recordingProgress}%</span>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM ANIMATION TIMELINE SCRUBBER */}
          <div className="h-24 shrink-0 border-t border-white/10 bg-[#12151a] px-4 py-2 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    evaluateSceneAtTimestamp(0);
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-white/80"
                  title="Jump to Start (0.0s)"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="px-3 py-1.5 rounded bg-white text-black hover:bg-white/90 text-xs font-mono font-semibold flex items-center gap-1.5"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>PAUSE</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>PLAY</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTime(duration);
                    evaluateSceneAtTimestamp(duration);
                  }}
                  className="p-1.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-white/80"
                  title="Jump to End"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Duration Options: 5, 10, 15, 20, 25, 30s */}
              <div className="flex items-center gap-1 text-xs font-mono">
                <span className="text-white/50 text-[10px] mr-0.5">DURATION:</span>
                {SCENE_DURATION_OPTIONS.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSelectDuration(sec)}
                    className={`px-2 py-0.5 rounded border text-[11px] transition ${
                      duration === sec
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Quick Physics Movement Selector on Timeline */}
              <div className="hidden md:flex items-center gap-1 text-xs font-mono">
                <span className="text-white/50 text-[10px] mr-0.5">PHYSICS:</span>
                {SCENE_PHYSICS_PRESET_META.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPhysicsMode(p.id)}
                    className={`px-2 py-0.5 rounded border text-[10px] uppercase transition ${
                      physicsConfig.mode === p.id
                        ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                        : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                    }`}
                    title={p.description}
                  >
                    {p.id}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-white/75">
                FRAME{' '}
                <span className="text-white font-semibold">
                  {Math.round(currentTime * 24)}
                </span>{' '}
                / {Math.round(duration * 24)}
              </div>
            </div>

            {/* Scrubber Slider */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-white/60 w-10">
                {currentTime.toFixed(1)}s
              </span>
              <input
                type="range"
                min={0}
                max={duration}
                step={0.04}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setIsPlaying(false);
                  setCurrentTime(val);
                  evaluateSceneAtTimestamp(val);
                }}
                className="flex-1 accent-white h-1.5 bg-white/15 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-white/60 w-10 text-right">
                {duration.toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCKED INSPECTOR WORKSPACE */}
        <aside className="w-full lg:w-[430px] xl:w-[460px] shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#12151a] flex flex-col h-[46vh] lg:h-full">
          {/* Inspector Navigation Tabs */}
          <div className="grid grid-cols-7 border-b border-white/10 bg-[#0e1115] text-[10px] font-mono uppercase tracking-wider">
            {(
              [
                { id: 'ai_architect', label: 'AI 3D', icon: Sparkles },
                { id: 'characters', label: 'Actors', icon: Users },
                { id: 'props', label: 'Library', icon: Box },
                { id: 'camera', label: 'Camera', icon: Camera },
                { id: 'environment', label: 'World', icon: Building2 },
                { id: 'hierarchy', label: 'Scene', icon: Layers },
                { id: 'export', label: 'Export', icon: Download },
              ] as { id: InspectorTab; label: string; icon: React.ComponentType<any> }[]
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 flex flex-col items-center justify-center gap-1 border-b-2 transition ${
                    active
                      ? 'border-white text-white bg-white/5 font-semibold'
                      : 'border-transparent text-white/50 hover:text-white/80'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Inspector Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
            {/* TAB 0: AI TEXT-TO-3D SCENE ARCHITECT (DURATION -> PHYSICS -> GEMINI) */}
            {activeTab === 'ai_architect' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent border border-emerald-400/25 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-300 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Text-to-3D Scene & Physics Architect</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleStartWithoutTemplate}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white border border-white/15 transition"
                      title="Clear template and start from a blank stage"
                    >
                      Reset to Blank Stage
                    </button>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Before generating a 3D scene without a template, choose your{' '}
                    <span className="text-white font-semibold">Duration (5s–30s)</span> and{' '}
                    <span className="text-white font-semibold">
                      3D Physics Movement (Slow, Fast, Epic, Complex)
                    </span>{' '}
                    below, then describe your scene.
                  </p>
                </div>

                {/* STEP 1: CHOOSE SCENE DURATION FIRST (5, 10, 15, 20, 25, 30s) */}
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                      Step 1 • Decide Scene Duration First
                    </label>
                    <span className="text-[11px] font-mono font-bold text-white">
                      {duration} Seconds ({duration * 24} Frames @ 24fps)
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {SCENE_DURATION_OPTIONS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleSelectDuration(sec)}
                        className={`py-2 rounded font-mono text-xs border transition ${
                          duration === sec
                            ? 'bg-emerald-400 text-black border-emerald-300 font-bold shadow'
                            : 'bg-black/40 text-white/75 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* STEP 2: MANAGE 3D SCENE PHYSICS MOVEMENTS (SLOW, NORMAL, FAST, EPIC, COMPLEX) */}
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                      Step 2 • 3D Physics & Movement Dynamics
                    </label>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300">
                      {physicsConfig.mode.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {SCENE_PHYSICS_PRESET_META.map((p) => {
                      const active = physicsConfig.mode === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleSelectPhysicsMode(p.id)}
                          className={`text-left p-2 rounded border transition flex items-start justify-between gap-2 ${
                            active
                              ? 'bg-emerald-400/15 border-emerald-400 text-white'
                              : 'bg-black/40 border-white/10 text-white/75 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs flex items-center gap-1.5">
                              <span>{p.label}</span>
                            </div>
                            <div className="text-[10px] text-white/55 mt-0.5 leading-snug">
                              {p.description}
                            </div>
                          </div>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-white/10 text-white/85 font-mono text-[9px]">
                            {p.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Fine-Grained Physics Parameter Sliders */}
                  <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-white/60 mb-0.5">
                        <span>Velocity / Cadence</span>
                        <span className="text-white">{physicsConfig.timeScale.toFixed(2)}×</span>
                      </div>
                      <input
                        type="range"
                        min={0.25}
                        max={2.4}
                        step={0.05}
                        value={physicsConfig.timeScale}
                        onChange={(e) =>
                          setPhysicsConfig((prev) => ({
                            ...prev,
                            timeScale: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-white/60 mb-0.5">
                        <span>Gravity / Leap Arc</span>
                        <span className="text-white">{physicsConfig.gravityScale.toFixed(2)}×</span>
                      </div>
                      <input
                        type="range"
                        min={0.4}
                        max={2.2}
                        step={0.05}
                        value={physicsConfig.gravityScale}
                        onChange={(e) =>
                          setPhysicsConfig((prev) => ({
                            ...prev,
                            gravityScale: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-white/60 mb-0.5">
                        <span>S-Curve Complexity</span>
                        <span className="text-white">{physicsConfig.pathCurvature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.4}
                        step={0.05}
                        value={physicsConfig.pathCurvature}
                        onChange={(e) =>
                          setPhysicsConfig((prev) => ({
                            ...prev,
                            pathCurvature: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-white/60 mb-0.5">
                        <span>Banking & Inertia</span>
                        <span className="text-white">{physicsConfig.secondaryMotion.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={2.0}
                        step={0.05}
                        value={physicsConfig.secondaryMotion}
                        onChange={(e) =>
                          setPhysicsConfig((prev) => ({
                            ...prev,
                            secondaryMotion: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: FREE GEMINI MODEL & SCENE DESCRIPTION */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-semibold">
                    Step 3 • Select Free Gemini Model
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {FREE_GEMINI_MODELS.map((m) => {
                      const selected = aiModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAiModel(m.id)}
                          className={`text-left p-2 rounded border transition flex items-start justify-between gap-2 ${
                            selected
                              ? 'bg-white/15 border-white text-white'
                              : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-xs">{m.label}</div>
                            <div className="text-[10px] text-white/50 mt-0.5">
                              {m.description}
                            </div>
                          </div>
                          <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-300 font-mono text-[9px]">
                            {m.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Generation Mode: Create vs Modify */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAiMode('create')}
                    className={`py-2 px-2.5 rounded border text-[11px] font-mono uppercase transition ${
                      aiMode === 'create'
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    Create New 3D Scene
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiMode('modify')}
                    className={`py-2 px-2.5 rounded border text-[11px] font-mono uppercase transition ${
                      aiMode === 'modify'
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    Modify Current Scene
                  </button>
                </div>

                {/* Natural Language Scene Description */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/55">
                    {aiMode === 'modify'
                      ? `Describe Modifications (${duration}s • ${physicsConfig.mode.toUpperCase()} Physics)`
                      : `Describe 3D Scene (${duration}s • ${physicsConfig.mode.toUpperCase()} Physics)`}
                  </label>
                  <textarea
                    rows={3}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="e.g. A helicopter chasing a sports car and motorcycle down a skyscraper avenue while two pedestrians run along the sidewalk..."
                    className="w-full p-2.5 rounded bg-black/50 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/45 leading-relaxed"
                  />
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAiScene || !aiPrompt.trim()}
                  onClick={() => handleGenerateAi3DScene()}
                  className={`w-full py-2.5 rounded font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition ${
                    isGeneratingAiScene
                      ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 cursor-wait'
                      : 'bg-emerald-400 text-black hover:bg-emerald-300'
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {isGeneratingAiScene
                      ? `Synthesizing ${duration}s ${physicsConfig.mode.toUpperCase()} 3D Scene...`
                      : aiMode === 'modify'
                      ? `Apply AI Modifications (${duration}s • ${physicsConfig.mode.toUpperCase()})`
                      : `Generate ${duration}s ${physicsConfig.mode.toUpperCase()} 3D Scene`}
                  </span>
                </button>

                {aiError && (
                  <div className="p-2.5 rounded bg-red-500/15 border border-red-400/40 text-red-200 text-[11px]">
                    {aiError}
                  </div>
                )}

                {/* Quick Example Prompts */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-mono uppercase tracking-wider text-white/50">
                    One-Click Cinematic 3D Prompt Presets
                  </span>
                  <div className="space-y-1">
                    {AI_SCENE_PROMPT_EXAMPLES.map((ex) => (
                      <button
                        key={ex.label}
                        type="button"
                        onClick={() => {
                          setAiPrompt(ex.prompt);
                          handleGenerateAi3DScene(ex.prompt);
                        }}
                        className="w-full text-left p-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition"
                      >
                        <div className="text-[11px] font-semibold text-white">
                          {ex.label}
                        </div>
                        <div className="text-[10px] text-white/55 line-clamp-2 mt-0.5">
                          {ex.prompt}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Director Output & Companion Seedance 2.5 Prompt */}
                <div className="p-3 rounded bg-black/45 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/55">
                      AI Spatial Director Summary
                    </span>
                    {aiEngineUsed && (
                      <span className="text-[10px] font-mono text-emerald-300">
                        {aiEngineUsed}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed">
                    {aiDirectorSummary}
                  </p>

                  {aiSeedancePrompt && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                          Companion Seedance 2.5 Video Prompt
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(aiSeedancePrompt);
                            setCopiedSeedance(true);
                            setTimeout(() => setCopiedSeedance(false), 1800);
                          }}
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white flex items-center gap-1"
                        >
                          {copiedSeedance ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Prompt</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-white/75 bg-black/50 p-2 rounded border border-white/10 leading-relaxed select-text">
                        {aiSeedancePrompt}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: SCENE HIERARCHY & TEMPLATES */}
            {activeTab === 'hierarchy' && (
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 mb-2">
                    Active Scene Graph ({1 + characters.length + propsList.length + 1} Nodes)
                  </div>
                  <div className="space-y-1.5">
                    <div
                      onClick={() => setActiveTab('environment')}
                      className="p-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-white/70" />
                        <span>Environment: {envSettings.preset.replace(/_/g, ' ')}</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/45">WORLD</span>
                    </div>

                    <div
                      onClick={() => setActiveTab('camera')}
                      className="p-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Camera className="w-3.5 h-3.5 text-white/70" />
                        <span>
                          Camera ({cameraConfig.mode.replace(/_/g, ' ')} •{' '}
                          {cameraConfig.focalLengthMm}mm)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-white/45">1080P</span>
                    </div>

                    {characters.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCharId(c.id);
                          setActiveTab('characters');
                        }}
                        className={`p-2 rounded border flex items-center justify-between cursor-pointer transition ${
                          selectedCharId === c.id
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-white/70" />
                          <span>{c.name}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40 text-white/70">
                          {c.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}

                    {propsList.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPropId(p.id);
                          setActiveTab('props');
                        }}
                        className={`p-2 rounded border flex items-center justify-between cursor-pointer transition ${
                          selectedPropId === p.id
                            ? 'bg-white/15 border-white/40 text-white'
                            : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Box className="w-3.5 h-3.5 text-white/70" />
                          <span>{p.name}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase text-white/45">
                          {p.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/50 mb-2">
                    Quick Cinematic Blockout Templates
                  </div>
                  <div className="space-y-2">
                    {CURATED_SCENE_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applySceneTemplate(tpl)}
                        className="w-full text-left p-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition space-y-1"
                      >
                        <div className="font-semibold text-white flex items-center justify-between">
                          <span>{tpl.label}</span>
                          <span className="text-[10px] font-mono text-white/50">
                            {tpl.duration}s
                          </span>
                        </div>
                        <p className="text-[11px] text-white/55 leading-relaxed">
                          {tpl.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PURE RECTANGULAR BLOCK CHARACTERS */}
            {activeTab === 'characters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                    Pure Rectangular Block Actors ({characters.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCharacter}
                    className="px-2.5 py-1 rounded bg-white text-black hover:bg-white/90 text-[11px] font-mono font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Block Actor</span>
                  </button>
                </div>

                {/* Actor Selector Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {characters.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCharId(c.id)}
                      className={`px-2.5 py-1 rounded text-xs font-mono border transition ${
                        c.id === selectedChar?.id
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {selectedChar && (
                  <div className="space-y-3 p-3 rounded bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={selectedChar.name}
                        onChange={(e) =>
                          updateSelectedCharacter({ name: e.target.value })
                        }
                        className="flex-1 bg-black/40 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleDuplicateCharacter(selectedChar)}
                        className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white/80 border border-white/15"
                        title="Duplicate Actor"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      {characters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCharacter(selectedChar.id)}
                          className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
                          title="Delete Actor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Block Action / Motion Cycle Selector */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Block Motion Action (15 Deterministic Cycles)
                      </label>
                      <select
                        value={selectedChar.action}
                        onChange={(e) =>
                          updateSelectedCharacter({
                            action: e.target.value as CharacterActionType,
                          })
                        }
                        className="w-full bg-black/50 border border-white/15 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {CHARACTER_ACTION_META.map((act) => (
                          <option key={act.id} value={act.id}>
                            [{act.category}] {act.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Position X / Y / Z */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono uppercase text-white/50">
                          Start Position [X, Y, Z] (Meters)
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setViewportTool((t) =>
                              t === 'drag_start' ? 'select' : 'drag_start'
                            )
                          }
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            viewportTool === 'drag_start'
                              ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                              : 'bg-white/5 text-white/70 border-white/15'
                          }`}
                        >
                          {viewportTool === 'drag_start'
                            ? 'Dragging in Viewport...'
                            : 'Drag on Ground'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                          <div key={axis} className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1">
                            <span className="text-[10px] font-mono text-white/40 mr-1.5">
                              {axis}
                            </span>
                            <input
                              type="number"
                              step={0.5}
                              value={selectedChar.startPos[idx]}
                              onChange={(e) => {
                                const next: [number, number, number] = [
                                  selectedChar.startPos[0],
                                  selectedChar.startPos[1],
                                  selectedChar.startPos[2],
                                ];
                                next[idx] = parseFloat(e.target.value) || 0;
                                updateSelectedCharacter({ startPos: next });
                              }}
                              className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* End Position X / Y / Z */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono uppercase text-white/50">
                          End Position [X, Y, Z] (Meters)
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setViewportTool((t) =>
                              t === 'drag_end' ? 'select' : 'drag_end'
                            )
                          }
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            viewportTool === 'drag_end'
                              ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                              : 'bg-white/5 text-white/70 border-white/15'
                          }`}
                        >
                          {viewportTool === 'drag_end'
                            ? 'Dragging in Viewport...'
                            : 'Drag on Ground'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                          <div key={axis} className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1">
                            <span className="text-[10px] font-mono text-white/40 mr-1.5">
                              {axis}
                            </span>
                            <input
                              type="number"
                              step={0.5}
                              value={selectedChar.endPos[idx]}
                              onChange={(e) => {
                                const next: [number, number, number] = [
                                  selectedChar.endPos[0],
                                  selectedChar.endPos[1],
                                  selectedChar.endPos[2],
                                ];
                                next[idx] = parseFloat(e.target.value) || 0;
                                updateSelectedCharacter({ endPos: next });
                              }}
                              className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Orientation & Proportions */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                          Start Yaw ({selectedChar.startRotationY}°)
                        </label>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={5}
                          value={selectedChar.startRotationY}
                          onChange={(e) =>
                            updateSelectedCharacter({
                              startRotationY: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                          End Yaw ({selectedChar.endRotationY}°)
                        </label>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={5}
                          value={selectedChar.endRotationY}
                          onChange={(e) =>
                            updateSelectedCharacter({
                              endRotationY: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-white"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAutoFaceCharacterTrajectory(selectedChar.id)}
                      className="w-full py-1.5 rounded bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono text-white/85 flex items-center justify-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Auto-Orient Actor Along Motion Path</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                          Height ({selectedChar.heightMeters.toFixed(2)}m)
                        </label>
                        <input
                          type="range"
                          min={1.4}
                          max={2.2}
                          step={0.02}
                          value={selectedChar.heightMeters}
                          onChange={(e) =>
                            updateSelectedCharacter({
                              heightMeters: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                          Greybox Tone
                        </label>
                        <div className="flex items-center gap-1.5">
                          {['#e2e6ec', '#c4cad3', '#9aa1ab', '#6e7580'].map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() =>
                                updateSelectedCharacter({ colorHex: hex })
                              }
                              className={`w-6 h-6 rounded border ${
                                selectedChar.colorHex === hex
                                  ? 'border-white scale-110'
                                  : 'border-white/20'
                              }`}
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: 26-ITEM 3D GREYBOX ASSET LIBRARY & PROP INSPECTOR */}
            {activeTab === 'props' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-white/55">
                      3D Asset Library ({PROP_LIBRARY_CATALOG.length} Procedural Models)
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1 mb-2.5">
                    {(
                      [
                        'All',
                        'Vehicles & Transit',
                        'Urban & Infrastructure',
                        'Architecture & Interior',
                        'Nature & Cinematics',
                      ] as const
                    ).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPropCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                          propCategoryFilter === cat
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-white/5 text-white/65 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Spawn Grid */}
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {filteredCatalog.map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => handleAddProp(item.type)}
                        className="p-2 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-left transition flex items-center justify-between gap-1.5"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-white truncate">
                            {item.label}
                          </div>
                          <div className="text-[9px] font-mono text-white/45 truncate">
                            {item.category}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Scene Props Inspector */}
                <div className="border-t border-white/10 pt-3 space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/50">
                    Placed 3D Objects in Scene ({propsList.length})
                  </div>

                  {propsList.length === 0 ? (
                    <div className="p-4 rounded bg-white/5 border border-white/10 text-center text-white/45">
                      Click any model in the 3D Asset Library above to place it into the scene.
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {propsList.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPropId(p.id)}
                            className={`px-2 py-1 rounded text-[11px] font-mono border transition ${
                              selectedProp?.id === p.id
                                ? 'bg-white text-black border-white font-bold'
                                : 'bg-white/5 text-white/75 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>

                      {selectedProp && (
                        <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={selectedProp.name}
                              onChange={(e) =>
                                updateProp(selectedProp.id, { name: e.target.value })
                              }
                              className="flex-1 bg-black/40 border border-white/15 rounded px-2 py-1 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => removeProp(selectedProp.id)}
                              className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30"
                              title="Remove Prop"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Start Position */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-white/45 uppercase">
                                Start Pos [X, Y, Z]
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewportTool((t) =>
                                    t === 'drag_start' ? 'select' : 'drag_start'
                                  )
                                }
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  viewportTool === 'drag_start'
                                    ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                                    : 'bg-white/5 text-white/70 border-white/15'
                                }`}
                              >
                                {viewportTool === 'drag_start'
                                  ? 'Dragging...'
                                  : 'Drag Start'}
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                <div
                                  key={axis}
                                  className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1"
                                >
                                  <span className="text-[10px] font-mono text-white/40 mr-1">
                                    {axis}
                                  </span>
                                  <input
                                    type="number"
                                    step={0.5}
                                    value={selectedProp.startPos[idx]}
                                    onChange={(e) => {
                                      const nextPos: [number, number, number] = [
                                        selectedProp.startPos[0],
                                        selectedProp.startPos[1],
                                        selectedProp.startPos[2],
                                      ];
                                      nextPos[idx] = parseFloat(e.target.value) || 0;
                                      updateProp(selectedProp.id, {
                                        startPos: nextPos,
                                      });
                                    }}
                                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* End Position (for moving vehicles, helicopters, drones, boats) */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-mono text-white/45 uppercase">
                                End Pos [X, Y, Z] (Keyframed Motion)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setViewportTool((t) =>
                                    t === 'drag_end' ? 'select' : 'drag_end'
                                  )
                                }
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  viewportTool === 'drag_end'
                                    ? 'bg-emerald-400 text-black border-emerald-300 font-bold'
                                    : 'bg-white/5 text-white/70 border-white/15'
                                }`}
                              >
                                {viewportTool === 'drag_end'
                                  ? 'Dragging...'
                                  : 'Drag End'}
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                <div
                                  key={axis}
                                  className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1"
                                >
                                  <span className="text-[10px] font-mono text-white/40 mr-1">
                                    {axis}
                                  </span>
                                  <input
                                    type="number"
                                    step={0.5}
                                    value={selectedProp.endPos[idx]}
                                    onChange={(e) => {
                                      const nextPos: [number, number, number] = [
                                        selectedProp.endPos[0],
                                        selectedProp.endPos[1],
                                        selectedProp.endPos[2],
                                      ];
                                      nextPos[idx] = parseFloat(e.target.value) || 0;
                                      updateProp(selectedProp.id, {
                                        endPos: nextPos,
                                      });
                                    }}
                                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Dimensions W / H / D */}
                          <div>
                            <span className="block text-[10px] font-mono text-white/45 uppercase mb-1">
                              Dimensions [W, H, D] (Meters)
                            </span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {(['W', 'H', 'D'] as const).map((dim, idx) => (
                                <div
                                  key={dim}
                                  className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1"
                                >
                                  <span className="text-[10px] font-mono text-white/40 mr-1">
                                    {dim}
                                  </span>
                                  <input
                                    type="number"
                                    step={0.2}
                                    min={0.2}
                                    value={selectedProp.dimensions[idx]}
                                    onChange={(e) => {
                                      const nextDim: [number, number, number] = [
                                        selectedProp.dimensions[0],
                                        selectedProp.dimensions[1],
                                        selectedProp.dimensions[2],
                                      ];
                                      nextDim[idx] = Math.max(
                                        0.2,
                                        parseFloat(e.target.value) || 1
                                      );
                                      updateProp(selectedProp.id, {
                                        dimensions: nextDim,
                                      });
                                    }}
                                    className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono text-white/45 uppercase mb-1">
                              Rotation Y ({selectedProp.rotationY}°)
                            </label>
                            <input
                              type="range"
                              min={-180}
                              max={180}
                              step={5}
                              value={selectedProp.rotationY}
                              onChange={(e) =>
                                updateProp(selectedProp.id, {
                                  rotationY: parseFloat(e.target.value),
                                })
                              }
                              className="w-full accent-white"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: CINEMATIC CAMERA SYSTEM */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1.5">
                    Cinematic Camera Rig Mode
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {CAMERA_MODE_META.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setViewportMode('cinematic');
                          setCameraConfig((prev) => ({ ...prev, mode: m.id }));
                        }}
                        className={`text-left p-2 rounded border transition ${
                          cameraConfig.mode === m.id
                            ? 'bg-white/15 border-white text-white'
                            : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold flex items-center justify-between">
                          <span>{m.label}</span>
                          {cameraConfig.mode === m.id && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                        <div className="text-[11px] text-white/50 mt-0.5">
                          {m.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lens Focal Length Presets */}
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-white/50">
                      Focal Length (35mm Full-Frame)
                    </span>
                    <span className="font-mono text-xs font-bold text-white">
                      {cameraConfig.focalLengthMm}mm (
                      {focalLengthToVerticalFov(cameraConfig.focalLengthMm).toFixed(0)}° vFOV)
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[18, 24, 35, 50, 85, 105].map((fl) => (
                      <button
                        key={fl}
                        type="button"
                        onClick={() =>
                          setCameraConfig((prev) => ({
                            ...prev,
                            focalLengthMm: fl,
                          }))
                        }
                        className={`py-1 rounded font-mono text-[11px] border ${
                          cameraConfig.focalLengthMm === fl
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-black/40 text-white/75 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {fl}mm
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={14}
                    max={135}
                    step={1}
                    value={cameraConfig.focalLengthMm}
                    onChange={(e) =>
                      setCameraConfig((prev) => ({
                        ...prev,
                        focalLengthMm: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-white"
                  />
                </div>

                {/* Camera Target Character Binding */}
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Primary Subject
                      </label>
                      <select
                        value={cameraConfig.targetCharacterId}
                        onChange={(e) =>
                          setCameraConfig((prev) => ({
                            ...prev,
                            targetCharacterId: e.target.value,
                          }))
                        }
                        className="w-full bg-black/50 border border-white/15 rounded px-2 py-1 text-xs text-white"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Secondary (OTS Target)
                      </label>
                      <select
                        value={cameraConfig.secondaryCharacterId}
                        onChange={(e) =>
                          setCameraConfig((prev) => ({
                            ...prev,
                            secondaryCharacterId: e.target.value,
                          }))
                        }
                        className="w-full bg-black/50 border border-white/15 rounded px-2 py-1 text-xs text-white"
                      >
                        {characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Camera Start & End Keyframe Coordinates */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                      Camera Start Keyframe [X, Y, Z]
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                        <div key={axis} className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1">
                          <span className="text-[10px] font-mono text-white/40 mr-1">
                            {axis}
                          </span>
                          <input
                            type="number"
                            step={0.5}
                            value={cameraConfig.startPos[idx]}
                            onChange={(e) => {
                              const next: [number, number, number] = [
                                cameraConfig.startPos[0],
                                cameraConfig.startPos[1],
                                cameraConfig.startPos[2],
                              ];
                              next[idx] = parseFloat(e.target.value) || 0;
                              setCameraConfig((prev) => ({
                                ...prev,
                                startPos: next,
                              }));
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                      Camera End Keyframe [X, Y, Z]
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                        <div key={axis} className="flex items-center bg-black/40 border border-white/10 rounded px-2 py-1">
                          <span className="text-[10px] font-mono text-white/40 mr-1">
                            {axis}
                          </span>
                          <input
                            type="number"
                            step={0.5}
                            value={cameraConfig.endPos[idx]}
                            onChange={(e) => {
                              const next: [number, number, number] = [
                                cameraConfig.endPos[0],
                                cameraConfig.endPos[1],
                                cameraConfig.endPos[2],
                              ];
                              next[idx] = parseFloat(e.target.value) || 0;
                              setCameraConfig((prev) => ({
                                ...prev,
                                endPos: next,
                              }));
                            }}
                            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Height Offset ({cameraConfig.cameraHeightOffset.toFixed(1)}m)
                      </label>
                      <input
                        type="range"
                        min={-2}
                        max={6}
                        step={0.2}
                        value={cameraConfig.cameraHeightOffset}
                        onChange={(e) =>
                          setCameraConfig((prev) => ({
                            ...prev,
                            cameraHeightOffset: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Speed ({cameraConfig.movementSpeed.toFixed(1)}×)
                      </label>
                      <input
                        type="range"
                        min={0.2}
                        max={2.0}
                        step={0.1}
                        value={cameraConfig.movementSpeed}
                        onChange={(e) =>
                          setCameraConfig((prev) => ({
                            ...prev,
                            movementSpeed: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: ARCHITECTURAL ENVIRONMENT & WEATHER */}
            {activeTab === 'environment' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1.5">
                    Procedural Architectural Blockout Preset
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {ENVIRONMENT_PRESET_META.map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() =>
                          setEnvSettings((prev) => ({ ...prev, preset: env.id }))
                        }
                        className={`text-left p-2 rounded border transition ${
                          envSettings.preset === env.id
                            ? 'bg-white/15 border-white text-white'
                            : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{env.label}</span>
                          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/40 text-white/55">
                            {env.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-white/50 mt-0.5">
                          {env.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weather Particles & Spatial Parameters */}
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                      Atmospheric Weather Volume (Deterministic)
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'none', label: 'Clear' },
                          { id: 'rain', label: 'Rain' },
                          { id: 'snow', label: 'Snow' },
                          { id: 'dust', label: 'Dust' },
                        ] as { id: WeatherParticleMode; label: string }[]
                      ).map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() =>
                            setEnvSettings((prev) => ({
                              ...prev,
                              weatherParticles: w.id,
                            }))
                          }
                          className={`py-1.5 rounded font-mono text-[11px] border ${
                            (envSettings.weatherParticles || 'none') === w.id
                              ? 'bg-white text-black border-white font-bold'
                              : 'bg-black/40 text-white/70 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                      Corridor / Street Width ({envSettings.streetWidth}m)
                    </label>
                    <input
                      type="range"
                      min={6}
                      max={22}
                      step={1}
                      value={envSettings.streetWidth}
                      onChange={(e) =>
                        setEnvSettings((prev) => ({
                          ...prev,
                          streetWidth: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                      Vertical Massing Scale ({envSettings.buildingScaleY.toFixed(2)}×)
                    </label>
                    <input
                      type="range"
                      min={0.5}
                      max={2.0}
                      step={0.05}
                      value={envSettings.buildingScaleY}
                      onChange={(e) =>
                        setEnvSettings((prev) => ({
                          ...prev,
                          buildingScaleY: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Sun Azimuth ({envSettings.sunAzimuthDeg}°)
                      </label>
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={5}
                        value={envSettings.sunAzimuthDeg}
                        onChange={(e) =>
                          setEnvSettings((prev) => ({
                            ...prev,
                            sunAzimuthDeg: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-white/50 mb-1">
                        Sun Elevation ({envSettings.sunElevationDeg}°)
                      </label>
                      <input
                        type="range"
                        min={12}
                        max={85}
                        step={2}
                        value={envSettings.sunElevationDeg}
                        onChange={(e) =>
                          setEnvSettings((prev) => ({
                            ...prev,
                            sunElevationDeg: parseFloat(e.target.value),
                          }))
                        }
                        className="w-full accent-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={envSettings.showGrid}
                        onChange={(e) =>
                          setEnvSettings((prev) => ({
                            ...prev,
                            showGrid: e.target.checked,
                          }))
                        }
                        className="accent-white"
                      />
                      <span className="text-xs text-white/80">1m Spatial Grid</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={envSettings.showWireframeEdges}
                        onChange={(e) =>
                          setEnvSettings((prev) => ({
                            ...prev,
                            showWireframeEdges: e.target.checked,
                          }))
                        }
                        className="accent-white"
                      />
                      <span className="text-xs text-white/80">Structural Edges</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: VIDEO EXPORT (1080P @ 24FPS WEBM FOR SEEDANCE 2.5) */}
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-3 rounded bg-white/5 border border-white/10 space-y-2">
                  <div className="text-xs font-semibold text-white">
                    Seedance 2.5 Structural Reference Video Export
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    Captures the pure 3D WebGL greybox scene at full-frame{' '}
                    <span className="text-white font-mono">1920×1080 @ 24fps</span> with
                    zero UI overlays or trajectory lines, ready to upload as a spatial and camera motion reference in Seedance 2.5.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
                    <div className="p-2 rounded bg-black/40 border border-white/10">
                      <div className="text-white/40 text-[10px]">RESOLUTION</div>
                      <div className="text-white font-semibold">1920 × 1080 (16:9)</div>
                    </div>
                    <div className="p-2 rounded bg-black/40 border border-white/10">
                      <div className="text-white/40 text-[10px]">FRAME RATE</div>
                      <div className="text-white font-semibold">24 FPS ({duration}s)</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isRecording}
                    onClick={handleExport1080pVideo}
                    className={`w-full mt-2 py-2.5 rounded font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition ${
                      isRecording
                        ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200 cursor-wait'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>
                      {isRecording
                        ? `Capturing 1080p (${recordingProgress}%)`
                        : 'Render & Record 1080p WebM'}
                    </span>
                  </button>
                </div>

                {recordedVideoUrl && (
                  <div className="p-3 rounded bg-emerald-500/10 border border-emerald-400/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-semibold text-emerald-300">
                        Reference Video Ready ({recordedFileSizeMb} MB)
                      </span>
                      <span className="text-[10px] font-mono text-white/60">
                        WebM • 1080p24
                      </span>
                    </div>

                    <video
                      src={recordedVideoUrl}
                      controls
                      loop
                      className="w-full aspect-video rounded border border-white/20 bg-black"
                    />

                    <a
                      href={recordedVideoUrl}
                      download={`fulabs-greybox-reference-${duration}s-1080p24.webm`}
                      className="w-full py-2 rounded bg-emerald-400 text-black hover:bg-emerald-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download WebM Reference Video</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Co-Op 3D Scene Matrix Modal */}
      <FuLabsCoOpModal
        isOpen={isCoOpModalOpen}
        onClose={() => setIsCoOpModalOpen(false)}
        currentUser={currentUser || null}
        currentSceneTitle={sceneTitle}
        currentDuration={duration}
        currentPhysicsMode={physicsConfig.mode}
        currentSeedancePrompt={aiSeedancePrompt}
        currentSceneConfig={{
          sceneTitle,
          duration,
          physics: physicsConfig,
          environment: envSettings,
          characters,
          props: propsList,
          camera: cameraConfig,
        }}
        onLoadCommunityScene={handleLoadCommunityScene}
      />
    </div>
  );
};

export default FuLabsGreyboxSlide;
