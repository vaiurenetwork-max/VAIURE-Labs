/**
 * FU LABS — Cinematic 3D Greybox Scene Engine (v2 Expanded)
 * - 15 Deterministic Human Skeletal Actions + 7 Held Hand Props
 * - 26 Procedural Low-Poly 3D Asset Library Models (Vehicles, Aircraft, Infrastructure, Interiors, Nature)
 * - 10 Architectural Environment Generators + Deterministic Weather Volumes
 * - 3D Motion Trajectory & Camera Frustum Path Helpers
 */

import * as THREE from 'three';

export type GreyboxEnvironmentPreset =
  | 'urban_streets'
  | 'modern_skyscrapers'
  | 'residential_buildings'
  | 'shopping_districts'
  | 'parks'
  | 'pedestrian_walkways'
  | 'indoor_environments'
  | 'elevators'
  | 'public_transit_stations'
  | 'futuristic_architecture';

export type CharacterActionType =
  | 'walking'
  | 'running'
  | 'standing'
  | 'turning'
  | 'looking_around'
  | 'sitting'
  | 'raising_arms'
  | 'pointing'
  | 'interacting'
  | 'crouching_stealth'
  | 'jumping'
  | 'fighting_stance'
  | 'waving'
  | 'carrying_object'
  | 'falling_back';

export type CharacterHeldPropType =
  | 'none'
  | 'briefcase'
  | 'sword_blade'
  | 'camera_rig'
  | 'shield_plate'
  | 'torch_light'
  | 'phone_device';

export type CinematicCameraMode =
  | 'dolly'
  | 'tracking'
  | 'crane'
  | 'orbit'
  | 'wide_establishing'
  | 'third_person'
  | 'first_person_pov'
  | 'over_the_shoulder'
  | 'handheld_sim';

export type GreyboxPropType =
  | 'cube'
  | 'pillar'
  | 'vehicle_block'
  | 'suv_truck'
  | 'motorcycle'
  | 'helicopter'
  | 'drone_quad'
  | 'boat_vessel'
  | 'street_light'
  | 'traffic_light'
  | 'bus_stop'
  | 'road_barrier'
  | 'bridge_arch'
  | 'staircase_flight'
  | 'building_tower'
  | 'arch_portal'
  | 'table'
  | 'chair_seat'
  | 'bench'
  | 'bed_frame'
  | 'desk_workstation'
  | 'tree_lowpoly'
  | 'rock_boulder'
  | 'camera_tripod'
  | 'crate'
  | 'monolith';

export type WeatherParticleMode = 'none' | 'rain' | 'snow' | 'dust';

export type ScenePhysicsMode = 'slow' | 'normal' | 'fast' | 'epic' | 'complex';

export interface ScenePhysicsConfig {
  mode: ScenePhysicsMode;
  timeScale: number; // Cadence & animation cycle speed multiplier (0.25x - 2.5x)
  gravityScale: number; // Vertical leap, bounce & suspension amplitude (0.4x - 2.2x)
  pathCurvature: number; // Lateral S-curve weaving / multi-vector trajectory (0.0 - 1.5)
  secondaryMotion: number; // Inertial banking, torso lean & vehicle pitch/roll (0.0 - 2.0)
}

export const SCENE_PHYSICS_PRESET_META: {
  id: ScenePhysicsMode;
  label: string;
  badge: string;
  description: string;
  defaults: ScenePhysicsConfig;
}[] = [
  {
    id: 'slow',
    label: 'Slow Motion',
    badge: '0.45× DELIBERATE',
    description: 'Time-dilated heavy momentum, smooth low-cadence stride, floaty suspension, and gliding rails',
    defaults: {
      mode: 'slow',
      timeScale: 0.45,
      gravityScale: 0.65,
      pathCurvature: 0.0,
      secondaryMotion: 0.45,
    },
  },
  {
    id: 'normal',
    label: 'Natural 1.0×',
    badge: '1.0× BALANCED',
    description: 'Standard 9.8 m/s² gravity, natural human gait frequency, and linear inertial damping',
    defaults: {
      mode: 'normal',
      timeScale: 1.0,
      gravityScale: 1.0,
      pathCurvature: 0.0,
      secondaryMotion: 0.75,
    },
  },
  {
    id: 'fast',
    label: 'Fast Kinetic',
    badge: '1.75× HIGH-VELOCITY',
    description: 'High-cadence sprint/locomotion, aggressive forward lean, rapid vehicle propulsion & banking',
    defaults: {
      mode: 'fast',
      timeScale: 1.75,
      gravityScale: 1.25,
      pathCurvature: 0.15,
      secondaryMotion: 1.25,
    },
  },
  {
    id: 'epic',
    label: 'Epic Blockbuster',
    badge: 'SPEED-RAMP ARC',
    description: 'Dramatic speed-ramp (fast launch into heroic slow-mo mid-shot apex), amplified leaps & crane sweep',
    defaults: {
      mode: 'epic',
      timeScale: 1.3,
      gravityScale: 1.75,
      pathCurvature: 0.35,
      secondaryMotion: 1.5,
    },
  },
  {
    id: 'complex',
    label: 'Complex Multi-Vector',
    badge: 'S-CURVE + BANKING',
    description: 'Sinusoidal S-curve weaving paths, centrifugal body/vehicle banking on turns, and multi-harmonic motion',
    defaults: {
      mode: 'complex',
      timeScale: 1.35,
      gravityScale: 1.35,
      pathCurvature: 0.85,
      secondaryMotion: 1.65,
    },
  },
];

export function getPhysicsPresetConfig(mode: ScenePhysicsMode): ScenePhysicsConfig {
  const found = SCENE_PHYSICS_PRESET_META.find((p) => p.id === mode);
  return found ? { ...found.defaults } : { ...SCENE_PHYSICS_PRESET_META[1].defaults };
}

/**
 * Evaluate non-linear temporal progress `u` (0..1) according to the active 3D Physics Mode
 */
export function evaluatePhysicsProgressU(
  rawU: number,
  physics?: ScenePhysicsConfig,
  isLinearLocomotion = true
): number {
  const u = Math.max(0, Math.min(1, rawU));
  const mode = physics?.mode || 'normal';

  switch (mode) {
    case 'slow': {
      // Heavy, deliberate cubic ease-in-out
      return u * u * (3 - 2 * u);
    }
    case 'fast': {
      // Snappy kinetic launch with high sustained velocity
      return Math.pow(u, 0.78);
    }
    case 'epic': {
      // Blockbuster speed-ramp: rapid launch (0..0.35) -> slow-motion heroic apex (0.35..0.65) -> rapid finish (0.65..1.0)
      const ramp = u + 0.16 * Math.sin(u * Math.PI * 2);
      return Math.max(0, Math.min(1, ramp));
    }
    case 'complex': {
      // Multi-stage surge with subtle harmonic modulation
      const harmonic = u + 0.07 * Math.sin(u * Math.PI * 3);
      return Math.max(0, Math.min(1, harmonic));
    }
    case 'normal':
    default:
      return isLinearLocomotion ? u : u * u * (3 - 2 * u);
  }
}

/**
 * Compute 3D world position + tangent yaw + lateral bank along a trajectory with Physics S-Curve curvature
 */
export function computePhysicsTrajectorySample(
  startPos: [number, number, number],
  endPos: [number, number, number],
  u: number,
  physics?: ScenePhysicsConfig,
  entityPhaseOffset = 0
): {
  pos: [number, number, number];
  tangentYawRad: number | null;
  bankRollRad: number;
} {
  const dx = endPos[0] - startPos[0];
  const dy = endPos[1] - startPos[1];
  const dz = endPos[2] - startPos[2];
  const distXZ = Math.hypot(dx, dz);

  let x = THREE.MathUtils.lerp(startPos[0], endPos[0], u);
  let y = THREE.MathUtils.lerp(startPos[1], endPos[1], u);
  let z = THREE.MathUtils.lerp(startPos[2], endPos[2], u);

  let tangentYawRad: number | null = null;
  let bankRollRad = 0;

  const curvature = physics?.pathCurvature ?? 0;
  const secondary = physics?.secondaryMotion ?? 0.75;

  if (distXZ > 0.15) {
    const dirX = dx / distXZ;
    const dirZ = dz / distXZ;
    // Perpendicular horizontal normal (-dirZ, dirX)
    const perpX = -dirZ;
    const perpZ = dirX;

    if (curvature > 0.02) {
      const waveFreq = physics?.mode === 'complex' ? Math.PI * 2 : Math.PI;
      const waveAmp = Math.min(2.6, distXZ * 0.22 * curvature);
      const lateralOffset = Math.sin(u * waveFreq + entityPhaseOffset) * waveAmp;
      const lateralDeriv =
        Math.cos(u * waveFreq + entityPhaseOffset) * waveFreq * (waveAmp / Math.max(1, distXZ));

      x += perpX * lateralOffset;
      z += perpZ * lateralOffset;

      const baseYaw = Math.atan2(dx, dz);
      tangentYawRad = baseYaw + Math.atan(lateralDeriv * 0.65);
      bankRollRad = -lateralDeriv * 0.22 * secondary;
    } else {
      tangentYawRad = Math.atan2(dx, dz);
    }

    // Epic mode adds subtle vertical heroic arc on aerial or leaping paths
    if (physics?.mode === 'epic' && Math.abs(dy) > 0.5) {
      y += Math.sin(u * Math.PI) * 0.45 * (physics.gravityScale || 1);
    }
  }

  return {
    pos: [x, y, z],
    tangentYawRad,
    bankRollRad,
  };
}

export interface GreyboxCharacterConfig {
  id: string;
  name: string;
  action: CharacterActionType;
  startPos: [number, number, number];
  endPos: [number, number, number];
  startRotationY: number; // degrees
  endRotationY: number; // degrees
  scale: number;
  heightMeters: number; // default 1.8m
  colorHex: string;
  heldProp?: CharacterHeldPropType;
  startTime: number;
  endTime: number;
}

export interface GreyboxPropConfig {
  id: string;
  name: string;
  type: GreyboxPropType;
  startPos: [number, number, number];
  endPos: [number, number, number];
  dimensions: [number, number, number];
  rotationY: number; // degrees
  colorHex: string;
  startTime: number;
  endTime: number;
}

export interface CameraKeyframeConfig {
  mode: CinematicCameraMode;
  focalLengthMm: number; // 14mm - 135mm full-frame equivalent
  startPos: [number, number, number];
  endPos: [number, number, number];
  startTarget: [number, number, number];
  endTarget: [number, number, number];
  cameraHeightOffset: number;
  movementSpeed: number;
  orbitRadius: number;
  orbitStartAngleDeg: number;
  orbitEndAngleDeg: number;
  handheldIntensity: number;
  targetCharacterId: string;
  secondaryCharacterId: string;
}

export interface EnvironmentSettingsConfig {
  preset: GreyboxEnvironmentPreset;
  buildingDensity: number;
  streetWidth: number;
  buildingScaleY: number;
  showGrid: boolean;
  showWireframeEdges: boolean;
  sunAzimuthDeg: number;
  sunElevationDeg: number;
  backgroundHex: string;
  weatherParticles?: WeatherParticleMode;
}

export interface ArticulatedHumanRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
}

export const ENVIRONMENT_PRESET_META: {
  id: GreyboxEnvironmentPreset;
  label: string;
  category: string;
  description: string;
}[] = [
  {
    id: 'urban_streets',
    label: 'Urban Streets',
    category: 'Exterior',
    description: 'City roadway, sidewalks, crosswalks, streetlamps, and flanking city blocks',
  },
  {
    id: 'modern_skyscrapers',
    label: 'Modern Skyscrapers',
    category: 'Exterior',
    description: 'High-rise stepped towers, podium plazas, structural columns, and skybridges',
  },
  {
    id: 'residential_buildings',
    label: 'Residential Buildings',
    category: 'Exterior',
    description: 'Low-rise housing volumes, pitched & flat roofs, courtyard walls, and stoops',
  },
  {
    id: 'shopping_districts',
    label: 'Shopping Districts',
    category: 'Exterior',
    description: 'Pedestrian promenade, storefront bays, cantilevered awnings, and kiosks',
  },
  {
    id: 'parks',
    label: 'Parks & Plaza',
    category: 'Exterior',
    description: 'Geometric low-poly trees, pathways, benches, stepped amphitheater, and pavilion',
  },
  {
    id: 'pedestrian_walkways',
    label: 'Pedestrian Walkways',
    category: 'Infrastructure',
    description: 'Elevated walkways, bridge overpasses, stairways, and support columns',
  },
  {
    id: 'indoor_environments',
    label: 'Indoor Environment',
    category: 'Interior',
    description: 'Cutaway architectural room with doorway portal, window apertures, table, and chairs',
  },
  {
    id: 'elevators',
    label: 'Elevator & Lobby',
    category: 'Interior',
    description: 'Vertical elevator shaft, animated cab & sliding doors, and atrium columns',
  },
  {
    id: 'public_transit_stations',
    label: 'Transit Station',
    category: 'Infrastructure',
    description: 'Metro platform, canopy columns, track bed, and animated low-poly train car',
  },
  {
    id: 'futuristic_architecture',
    label: 'Futuristic Architecture',
    category: 'Sci-Fi',
    description: 'Monolithic brutalist megastructures, angled buttresses, and elevated sky-rings',
  },
];

export const CHARACTER_ACTION_META: {
  id: CharacterActionType;
  label: string;
  category: string;
}[] = [
  { id: 'walking', label: 'Walking', category: 'Locomotion' },
  { id: 'running', label: 'Running / Sprint', category: 'Locomotion' },
  { id: 'crouching_stealth', label: 'Crouch / Stealth Walk', category: 'Locomotion' },
  { id: 'jumping', label: 'Jumping / Leap', category: 'Action' },
  { id: 'fighting_stance', label: 'Combat / Martial Guard', category: 'Action' },
  { id: 'falling_back', label: 'Stagger / Fall Back', category: 'Action' },
  { id: 'standing', label: 'Standing Idle', category: 'Posture' },
  { id: 'sitting', label: 'Sitting', category: 'Posture' },
  { id: 'turning', label: 'Turning in Place', category: 'Posture' },
  { id: 'looking_around', label: 'Looking Around / Scanning', category: 'Gesture' },
  { id: 'pointing', label: 'Pointing Forward', category: 'Gesture' },
  { id: 'waving', label: 'Waving Hand', category: 'Gesture' },
  { id: 'raising_arms', label: 'Raising Both Arms', category: 'Gesture' },
  { id: 'carrying_object', label: 'Carrying Object', category: 'Interaction' },
  { id: 'interacting', label: 'Interacting / Console', category: 'Interaction' },
];

export const CHARACTER_HELD_PROP_META: {
  id: CharacterHeldPropType;
  label: string;
}[] = [
  { id: 'none', label: 'Empty Hands' },
  { id: 'briefcase', label: 'Briefcase / Case' },
  { id: 'sword_blade', label: 'Action Sword / Blade' },
  { id: 'camera_rig', label: 'Handheld Camera Rig' },
  { id: 'shield_plate', label: 'Tactical Shield' },
  { id: 'torch_light', label: 'Torch / Flashlight' },
  { id: 'phone_device', label: 'Phone / Scanner' },
];

export const PROP_LIBRARY_CATALOG: {
  type: GreyboxPropType;
  label: string;
  category: 'Vehicles & Transit' | 'Urban & Infrastructure' | 'Architecture & Interior' | 'Nature & Cinematics';
  defaultDims: [number, number, number];
}[] = [
  // Vehicles & Transit
  { type: 'vehicle_block', label: 'Sedan / Sports Car', category: 'Vehicles & Transit', defaultDims: [1.9, 1.45, 4.2] },
  { type: 'suv_truck', label: 'Heavy SUV / Van', category: 'Vehicles & Transit', defaultDims: [2.2, 1.85, 4.8] },
  { type: 'motorcycle', label: 'Action Motorcycle', category: 'Vehicles & Transit', defaultDims: [0.85, 1.15, 2.2] },
  { type: 'helicopter', label: 'Helicopter (Spinning Rotor)', category: 'Vehicles & Transit', defaultDims: [2.8, 2.6, 6.5] },
  { type: 'drone_quad', label: 'Quadcopter Drone', category: 'Vehicles & Transit', defaultDims: [1.1, 0.45, 1.1] },
  { type: 'boat_vessel', label: 'Watercraft / Boat Hull', category: 'Vehicles & Transit', defaultDims: [2.4, 1.4, 5.6] },

  // Urban & Infrastructure
  { type: 'street_light', label: 'Streetlamp Pole', category: 'Urban & Infrastructure', defaultDims: [1.2, 4.8, 0.4] },
  { type: 'traffic_light', label: 'Traffic Signal Mast', category: 'Urban & Infrastructure', defaultDims: [1.8, 4.6, 0.6] },
  { type: 'bus_stop', label: 'Transit Shelter Booth', category: 'Urban & Infrastructure', defaultDims: [3.4, 2.6, 1.6] },
  { type: 'road_barrier', label: 'Jersey Road Barrier', category: 'Urban & Infrastructure', defaultDims: [2.4, 1.0, 0.7] },
  { type: 'bridge_arch', label: 'Spanning Bridge Arch', category: 'Urban & Infrastructure', defaultDims: [8.0, 4.2, 3.2] },
  { type: 'staircase_flight', label: 'Stepped Staircase', category: 'Urban & Infrastructure', defaultDims: [3.2, 2.8, 4.5] },

  // Architecture & Interior
  { type: 'building_tower', label: 'Building Block Tower', category: 'Architecture & Interior', defaultDims: [6.0, 12.0, 6.0] },
  { type: 'arch_portal', label: 'Monumental Arch Portal', category: 'Architecture & Interior', defaultDims: [4.8, 4.8, 1.2] },
  { type: 'pillar', label: 'Structural Column', category: 'Architecture & Interior', defaultDims: [0.9, 4.2, 0.9] },
  { type: 'table', label: 'Conference / Dining Table', category: 'Architecture & Interior', defaultDims: [2.4, 0.85, 1.2] },
  { type: 'chair_seat', label: 'Chair Seat', category: 'Architecture & Interior', defaultDims: [0.65, 0.95, 0.65] },
  { type: 'bench', label: 'Park / Station Bench', category: 'Architecture & Interior', defaultDims: [2.0, 0.85, 0.7] },
  { type: 'bed_frame', label: 'Interior Bed Block', category: 'Architecture & Interior', defaultDims: [1.8, 0.9, 2.2] },
  { type: 'desk_workstation', label: 'Dual-Monitor Desk', category: 'Architecture & Interior', defaultDims: [1.8, 1.15, 0.9] },

  // Nature & Cinematics
  { type: 'tree_lowpoly', label: 'Low-Poly Geometric Tree', category: 'Nature & Cinematics', defaultDims: [2.4, 4.5, 2.4] },
  { type: 'rock_boulder', label: 'Faceted Boulder Cluster', category: 'Nature & Cinematics', defaultDims: [2.2, 1.5, 2.0] },
  { type: 'camera_tripod', label: 'Cinema Camera on Tripod', category: 'Nature & Cinematics', defaultDims: [0.9, 1.65, 0.9] },
  { type: 'crate', label: 'Cargo Crate Box', category: 'Nature & Cinematics', defaultDims: [1.1, 1.1, 1.1] },
  { type: 'cube', label: 'Primitive Block Cube', category: 'Nature & Cinematics', defaultDims: [1.5, 1.5, 1.5] },
  { type: 'monolith', label: 'Brutalist Monolith Slab', category: 'Nature & Cinematics', defaultDims: [2.2, 6.0, 1.2] },
];

export const CAMERA_MODE_META: {
  id: CinematicCameraMode;
  label: string;
  description: string;
}[] = [
  {
    id: 'dolly',
    label: 'Dolly Camera',
    description: 'Smooth linear rail travel from Start Keyframe to End Keyframe',
  },
  {
    id: 'tracking',
    label: 'Tracking Shot',
    description: 'Lateral / parallel tracking alongside the active subject',
  },
  {
    id: 'crane',
    label: 'Crane Shot',
    description: 'Sweeping vertical jib elevation and camera tilt reveal',
  },
  {
    id: 'orbit',
    label: 'Orbit Shot',
    description: 'Deterministic circular camera arc around target focal point',
  },
  {
    id: 'wide_establishing',
    label: 'Wide Establishing',
    description: 'High architectural master shot with subtle cinematic push-in',
  },
  {
    id: 'third_person',
    label: 'Third-Person Follow',
    description: 'Follows behind and slightly above the primary character',
  },
  {
    id: 'first_person_pov',
    label: 'First-Person POV',
    description: 'Mounted directly at the primary character eye level and head gaze',
  },
  {
    id: 'over_the_shoulder',
    label: 'Over-The-Shoulder',
    description: 'Framed over Character 1 shoulder looking toward Character 2 / target',
  },
  {
    id: 'handheld_sim',
    label: 'Handheld Simulation',
    description: 'Deterministic operator breathing and organic shoulder-rig sway',
  },
];

export function focalLengthToVerticalFov(focalLengthMm: number): number {
  const sensorHeightMm = 20.25;
  const clampedFocal = Math.max(10, Math.min(200, focalLengthMm));
  const fovRad = 2 * Math.atan(sensorHeightMm / (2 * clampedFocal));
  return THREE.MathUtils.radToDeg(fovRad);
}

export function createGreyboxMaterial(
  colorHex: string,
  roughness = 0.82,
  metalness = 0.06
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    roughness,
    metalness,
    flatShading: true,
  });
}

export function attachEdgeLines(
  mesh: THREE.Mesh,
  enabled: boolean,
  edgeColor = 0x22262c
): void {
  if (!enabled) return;
  const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 22);
  const edgesMat = new THREE.LineBasicMaterial({
    color: edgeColor,
    transparent: true,
    opacity: 0.38,
  });
  const line = new THREE.LineSegments(edgesGeo, edgesMat);
  mesh.add(line);
}

/**
 * Create a low-poly held hand prop mesh attached to the character's right hand
 */
function createHeldHandPropMesh(
  propType: CharacterHeldPropType,
  showEdges: boolean
): THREE.Group | null {
  if (!propType || propType === 'none') return null;
  const group = new THREE.Group();
  const matMain = createGreyboxMaterial('#cfd5de', 0.65, 0.12);
  const matDark = createGreyboxMaterial('#4b515a', 0.85, 0.1);

  switch (propType) {
    case 'briefcase': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.32, 0.42), matDark);
      body.position.set(0, -0.18, 0.04);
      attachEdgeLines(body, showEdges);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.14), matMain);
      handle.position.set(0, -0.01, 0.04);
      group.add(body, handle);
      break;
    }
    case 'sword_blade': {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), matDark);
      hilt.rotation.x = Math.PI / 2;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), matDark);
      guard.position.set(0, 0, 0.1);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.78), matMain);
      blade.position.set(0, 0, 0.5);
      attachEdgeLines(blade, showEdges);
      group.add(hilt, guard, blade);
      break;
    }
    case 'camera_rig': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.26), matDark);
      body.position.set(0, 0.04, 0.12);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.14, 8), matMain);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 0.04, 0.3);
      attachEdgeLines(body, showEdges);
      group.add(body, lens);
      break;
    }
    case 'shield_plate': {
      const shield = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.65, 0.45), matMain);
      shield.position.set(-0.08, 0, 0.1);
      attachEdgeLines(shield, showEdges);
      group.add(shield);
      break;
    }
    case 'torch_light': {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.38, 8), matDark);
      stick.position.set(0, 0.12, 0.08);
      stick.rotation.x = Math.PI / 4;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), matMain);
      head.position.set(0, 0.26, 0.22);
      group.add(stick, head);
      break;
    }
    case 'phone_device': {
      const phone = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.15), matMain);
      phone.position.set(0, -0.02, 0.08);
      group.add(phone);
      break;
    }
  }
  return group;
}

/**
 * Build a pure rectangular block character (no 3D sculpted humanoid limbs, head, or accessories)
 */
export function createProceduralHumanRig(
  config: GreyboxCharacterConfig,
  showEdges = true
): ArticulatedHumanRig {
  const root = new THREE.Group();
  root.name = `character_${config.id}`;
  root.userData = { entityType: 'character', entityId: config.id };

  const baseMat = createGreyboxMaterial(config.colorHex, 0.78, 0.06);

  // Pelvis / Center-of-Mass Pivot Group (centered at half-height y = 0.9m of the 1.8m rectangular block)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.9, 0);
  root.add(pelvis);

  // Torso / Block Pivot Group
  const torso = new THREE.Group();
  torso.position.set(0, 0, 0);
  pelvis.add(torso);

  // Pure Rectangular Block Geometry (0.50m width × 1.80m height × 0.34m depth)
  const blockMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.34), baseMat);
  blockMesh.position.set(0, 0, 0);
  blockMesh.castShadow = true;
  blockMesh.receiveShadow = true;
  attachEdgeLines(blockMesh, showEdges);
  torso.add(blockMesh);

  // Empty transform nodes preserved for camera POV / rig interface compatibility (zero geometry)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.75, 0);
  torso.add(headGroup);

  const leftShoulder = new THREE.Group();
  const leftElbow = new THREE.Group();
  leftShoulder.add(leftElbow);
  torso.add(leftShoulder);

  const rightShoulder = new THREE.Group();
  const rightElbow = new THREE.Group();
  rightShoulder.add(rightElbow);
  torso.add(rightShoulder);

  const leftHip = new THREE.Group();
  const leftKnee = new THREE.Group();
  leftHip.add(leftKnee);
  pelvis.add(leftHip);

  const rightHip = new THREE.Group();
  const rightKnee = new THREE.Group();
  rightHip.add(rightKnee);
  pelvis.add(rightHip);

  const heightScale = (config.heightMeters || 1.8) / 1.8;
  const finalScale = (config.scale || 1) * heightScale;
  root.scale.setScalar(finalScale);

  // Tag all child objects for raycasting selection
  root.traverse((obj) => {
    obj.userData = { entityType: 'character', entityId: config.id };
  });

  return {
    root,
    pelvis,
    torso,
    headGroup,
    leftShoulder,
    leftElbow,
    rightShoulder,
    rightElbow,
    leftHip,
    leftKnee,
    rightHip,
    rightKnee,
  };
}

/**
 * Deterministically evaluate pure rectangular block character world transform and motion dynamics at time `t`
 */
export function evaluateCharacterPoseAtTime(
  rig: ArticulatedHumanRig,
  config: GreyboxCharacterConfig,
  t: number,
  physics?: ScenePhysicsConfig
): void {
  const duration = Math.max(0.001, config.endTime - config.startTime);
  const rawProgress = (t - config.startTime) / duration;
  const u = Math.max(0, Math.min(1, rawProgress));
  const isLocomotion =
    config.action === 'walking' ||
    config.action === 'running' ||
    config.action === 'crouching_stealth' ||
    config.action === 'carrying_object';

  const interp = evaluatePhysicsProgressU(u, physics, isLocomotion);
  const sample = computePhysicsTrajectorySample(config.startPos, config.endPos, interp, physics);

  rig.root.position.set(sample.pos[0], sample.pos[1], sample.pos[2]);

  const dx = config.endPos[0] - config.startPos[0];
  const dz = config.endPos[2] - config.startPos[2];
  const distSq = dx * dx + dz * dz;

  let yawRad = THREE.MathUtils.degToRad(
    THREE.MathUtils.lerp(config.startRotationY, config.endRotationY, interp)
  );
  if (isLocomotion && distSq > 0.04 && sample.tangentYawRad !== null) {
    yawRad = sample.tangentYawRad;
  }
  rig.root.rotation.set(0, yawRad, sample.bankRollRad);

  // Reset block transform
  rig.pelvis.position.set(0, 0.9, 0);
  rig.pelvis.rotation.set(0, 0, 0);
  rig.torso.position.set(0, 0, 0);
  rig.torso.rotation.set(0, 0, 0);
  rig.torso.scale.set(1, 1, 1);
  rig.headGroup.rotation.set(0, 0, 0);

  const timeScale = physics?.timeScale ?? 1.0;
  const gravityScale = physics?.gravityScale ?? 1.0;
  const secondary = physics?.secondaryMotion ?? 0.75;
  const activeTime = Math.max(0, Math.min(duration, t - config.startTime)) * timeScale;

  switch (config.action) {
    case 'walking': {
      const freq = 2.1 * Math.PI;
      const phase = activeTime * freq;
      const swing = Math.sin(phase);

      rig.pelvis.position.y = 0.9 + Math.abs(Math.cos(phase)) * 0.025 * gravityScale;
      rig.torso.rotation.x = 0.03 * secondary;
      rig.torso.rotation.z = swing * 0.02 * secondary;
      break;
    }

    case 'running': {
      const freq = 3.8 * Math.PI;
      const phase = activeTime * freq;
      const swing = Math.sin(phase);

      rig.pelvis.position.y = 0.9 + Math.abs(Math.cos(phase)) * 0.065 * gravityScale;
      rig.torso.rotation.x = 0.12 * Math.max(0.8, secondary * 0.95);
      rig.torso.rotation.z = swing * 0.04 * secondary;
      break;
    }

    case 'crouching_stealth': {
      const freq = 1.8 * Math.PI;
      const phase = activeTime * freq;
      rig.torso.scale.set(1, 0.68, 1);
      rig.pelvis.position.y = 0.9 * 0.68 + Math.abs(Math.cos(phase)) * 0.018;
      rig.torso.rotation.x = 0.08;
      break;
    }

    case 'jumping': {
      const jumpCycle = (activeTime * 0.9) % 1.0;
      const airArc = Math.max(0, Math.sin(jumpCycle * Math.PI));
      rig.pelvis.position.y = 0.9 + airArc * 0.68 * gravityScale;
      rig.torso.rotation.x = 0.08 - airArc * 0.14;
      break;
    }

    case 'fighting_stance': {
      const jab = Math.max(0, Math.sin(activeTime * 4.5));
      const weave = Math.sin(activeTime * 2.2);
      rig.pelvis.position.y = 0.9 + Math.abs(weave) * 0.025;
      rig.torso.rotation.y = -0.15 + jab * 0.25;
      rig.torso.rotation.x = 0.08;
      break;
    }

    case 'waving':
    case 'raising_arms':
    case 'pointing':
    case 'interacting': {
      const cycle = Math.sin(activeTime * 2.4);
      rig.torso.rotation.y = cycle * 0.08;
      break;
    }

    case 'carrying_object': {
      const freq = 1.9 * Math.PI;
      const phase = activeTime * freq;
      rig.pelvis.position.y = 0.9 + Math.abs(Math.cos(phase)) * 0.022;
      rig.torso.rotation.x = -0.04;
      break;
    }

    case 'falling_back': {
      const fallProgress = Math.min(1, activeTime / Math.max(1.2, duration * 0.65));
      const smoothFall = fallProgress * fallProgress * (3 - 2 * fallProgress);
      const tiltAngle = -smoothFall * (Math.PI * 0.48);
      rig.pelvis.position.y = THREE.MathUtils.lerp(0.9, 0.18, smoothFall);
      rig.pelvis.position.z = -smoothFall * 0.72;
      rig.pelvis.rotation.x = tiltAngle;
      break;
    }

    case 'standing': {
      rig.pelvis.position.set(0, 0.9, 0);
      break;
    }

    case 'turning': {
      const stepPhase = activeTime * Math.PI * 2.5;
      rig.pelvis.position.y = 0.9 + Math.abs(Math.sin(stepPhase)) * 0.015;
      rig.headGroup.rotation.y = Math.sin(u * Math.PI) * 0.35;
      break;
    }

    case 'looking_around': {
      const scanYaw = Math.sin(activeTime * 1.6) * 0.55;
      const scanPitch = Math.sin(activeTime * 0.9) * 0.14;
      rig.headGroup.rotation.y = scanYaw;
      rig.headGroup.rotation.x = scanPitch;
      rig.torso.rotation.y = scanYaw * 0.65;
      break;
    }

    case 'sitting': {
      rig.torso.scale.set(1, 0.62, 1);
      rig.pelvis.position.y = 0.9 * 0.62;
      rig.headGroup.rotation.y = Math.sin(activeTime * 1.1) * 0.15;
      break;
    }
  }
}

/**
 * Create any of the 26 Procedural Greybox Asset Library Models
 */
export function createGreyboxPropMesh(
  prop: GreyboxPropConfig,
  showEdges = true
): THREE.Group {
  const group = new THREE.Group();
  group.name = `prop_${prop.id}`;
  group.userData = { entityType: 'prop', entityId: prop.id, propType: prop.type };

  const [w, h, d] = prop.dimensions;
  const mat = createGreyboxMaterial(prop.colorHex, 0.8, 0.05);
  const subMat = createGreyboxMaterial('#636972', 0.88, 0.08);
  const accentMat = createGreyboxMaterial('#d4dae2', 0.65, 0.1);

  switch (prop.type) {
    case 'vehicle_block':
    case 'suv_truck': {
      const isSuv = prop.type === 'suv_truck';
      const chassis = new THREE.Mesh(
        new THREE.BoxGeometry(w, h * (isSuv ? 0.55 : 0.48), d),
        mat
      );
      chassis.position.y = h * 0.38;
      chassis.castShadow = true;
      chassis.receiveShadow = true;
      attachEdgeLines(chassis, showEdges);
      group.add(chassis);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.88, h * 0.42, d * (isSuv ? 0.72 : 0.52)),
        subMat
      );
      cabin.position.set(0, h * 0.8, isSuv ? -d * 0.08 : -d * 0.06);
      cabin.castShadow = true;
      attachEdgeLines(cabin, showEdges);
      group.add(cabin);

      const wheelGeo = new THREE.CylinderGeometry(h * 0.22, h * 0.22, w * 0.14, 10);
      wheelGeo.rotateZ(Math.PI / 2);
      const wheelOffsets: [number, number][] = [
        [-w * 0.48, d * 0.3],
        [w * 0.48, d * 0.3],
        [-w * 0.48, -d * 0.3],
        [w * 0.48, -d * 0.3],
      ];
      for (const [wx, wz] of wheelOffsets) {
        const wheel = new THREE.Mesh(wheelGeo, subMat);
        wheel.position.set(wx, h * 0.22, wz);
        wheel.castShadow = true;
        group.add(wheel);
      }
      break;
    }

    case 'motorcycle': {
      const wheelGeo = new THREE.CylinderGeometry(h * 0.3, h * 0.3, w * 0.22, 10);
      wheelGeo.rotateZ(Math.PI / 2);
      const frontWheel = new THREE.Mesh(wheelGeo, subMat);
      frontWheel.position.set(0, h * 0.3, d * 0.36);
      const rearWheel = frontWheel.clone();
      rearWheel.position.z = -d * 0.36;
      const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.45, d * 0.65), mat);
      body.position.set(0, h * 0.58, 0);
      attachEdgeLines(body, showEdges);
      const handlebars = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, 0.08, 0.08), accentMat);
      handlebars.position.set(0, h * 0.92, d * 0.24);
      group.add(frontWheel, rearWheel, body, handlebars);
      break;
    }

    case 'helicopter': {
      const fuselage = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, h * 0.52, d * 0.52), mat);
      fuselage.position.set(0, h * 0.48, d * 0.1);
      attachEdgeLines(fuselage, showEdges);
      const tailBoom = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, h * 0.18, d * 0.5), subMat);
      tailBoom.position.set(0, h * 0.54, -d * 0.35);
      attachEdgeLines(tailBoom, showEdges);

      // Skids
      const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, d * 0.48), subMat);
      skidL.position.set(-w * 0.28, 0.06, d * 0.1);
      const skidR = skidL.clone();
      skidR.position.x = w * 0.28;

      // Main Rotor (tagged as 'rotor_spin' so evaluatePropAtTime rotates it)
      const rotorGroup = new THREE.Group();
      rotorGroup.name = 'rotor_spin';
      rotorGroup.position.set(0, h * 0.82, d * 0.1);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(d * 0.95, 0.04, 0.22), accentMat);
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, d * 0.95), accentMat);
      rotorGroup.add(blade1, blade2);

      group.add(fuselage, tailBoom, skidL, skidR, rotorGroup);
      break;
    }

    case 'drone_quad': {
      const core = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.55, d * 0.55), mat);
      core.position.y = h * 0.5;
      attachEdgeLines(core, showEdges);
      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(w * 1.1, 0.06, 0.08), subMat);
      arm1.position.y = h * 0.55;
      arm1.rotation.y = Math.PI / 4;
      const arm2 = arm1.clone();
      arm2.rotation.y = -Math.PI / 4;
      group.add(core, arm1, arm2);
      break;
    }

    case 'boat_vessel': {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, d), mat);
      hull.position.y = h * 0.25;
      attachEdgeLines(hull, showEdges);
      const deckhouse = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.48, d * 0.42), accentMat);
      deckhouse.position.set(0, h * 0.72, -d * 0.08);
      attachEdgeLines(deckhouse, showEdges);
      group.add(hull, deckhouse);
      break;
    }

    case 'street_light':
    case 'traffic_light': {
      const isTraffic = prop.type === 'traffic_light';
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, h, 8), subMat);
      pole.position.y = h * 0.5;
      const arm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), subMat);
      arm.position.set(w * 0.45, h * 0.92, 0);
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(isTraffic ? 0.35 : 0.45, isTraffic ? 0.75 : 0.14, 0.25),
        accentMat
      );
      head.position.set(w * 0.85, h * (isTraffic ? 0.84 : 0.9), 0);
      attachEdgeLines(head, showEdges);
      group.add(pole, arm, head);
      break;
    }

    case 'bus_stop': {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), mat);
      roof.position.y = h - 0.08;
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, h - 0.16, 0.12), subMat);
      backWall.position.set(0, (h - 0.16) * 0.5, -d * 0.44);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.65, 0.12, d * 0.35), accentMat);
      seat.position.set(0, 0.48, -d * 0.22);
      attachEdgeLines(roof, showEdges);
      attachEdgeLines(backWall, showEdges);
      group.add(roof, backWall, seat);
      break;
    }

    case 'road_barrier': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, d), mat);
      base.position.y = h * 0.225;
      const upper = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.55, d * 0.48), accentMat);
      upper.position.y = h * 0.725;
      attachEdgeLines(base, showEdges);
      attachEdgeLines(upper, showEdges);
      group.add(base, upper);
      break;
    }

    case 'bridge_arch':
    case 'arch_portal': {
      const pillarW = w * 0.18;
      const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarW, h, d), mat);
      leftPillar.position.set(-w * 0.41, h * 0.5, 0);
      const rightPillar = leftPillar.clone();
      rightPillar.position.x = w * 0.41;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, h * 0.22, d * 1.06), accentMat);
      lintel.position.set(0, h - h * 0.11, 0);
      attachEdgeLines(leftPillar, showEdges);
      attachEdgeLines(rightPillar, showEdges);
      attachEdgeLines(lintel, showEdges);
      group.add(leftPillar, rightPillar, lintel);
      break;
    }

    case 'staircase_flight': {
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const stepH = ((i + 1) / steps) * h;
        const stepD = d / steps;
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(w, stepH, stepD), mat);
        stepMesh.position.set(0, stepH * 0.5, -d * 0.5 + (i + 0.5) * stepD);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        attachEdgeLines(stepMesh, showEdges);
        group.add(stepMesh);
      }
      break;
    }

    case 'building_tower': {
      const podium = new THREE.Mesh(new THREE.BoxGeometry(w * 1.12, h * 0.2, d * 1.12), subMat);
      podium.position.y = h * 0.1;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.8, d), mat);
      tower.position.y = h * 0.6;
      const crown = new THREE.Mesh(new THREE.BoxGeometry(w * 0.68, h * 0.14, d * 0.68), accentMat);
      crown.position.y = h * 1.07;
      attachEdgeLines(podium, showEdges);
      attachEdgeLines(tower, showEdges);
      attachEdgeLines(crown, showEdges);
      group.add(podium, tower, crown);
      break;
    }

    case 'tree_lowpoly': {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.08, w * 0.12, h * 0.45, 8),
        subMat
      );
      trunk.position.y = h * 0.225;
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(w * 0.48, 0), mat);
      canopy.position.y = h * 0.68;
      canopy.castShadow = true;
      attachEdgeLines(canopy, showEdges);
      group.add(trunk, canopy);
      break;
    }

    case 'rock_boulder': {
      const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.48, 0), mat);
      mainRock.position.set(0, h * 0.42, 0);
      mainRock.scale.set(1, h / Math.max(0.5, w), d / Math.max(0.5, w));
      const sideRock = new THREE.Mesh(new THREE.DodecahedronGeometry(w * 0.28, 0), subMat);
      sideRock.position.set(w * 0.35, h * 0.25, d * 0.2);
      attachEdgeLines(mainRock, showEdges);
      attachEdgeLines(sideRock, showEdges);
      group.add(mainRock, sideRock);
      break;
    }

    case 'camera_tripod': {
      const legGeo = new THREE.CylinderGeometry(0.025, 0.025, h * 0.85, 6);
      for (const angle of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
        const leg = new THREE.Mesh(legGeo, subMat);
        leg.position.set(Math.sin(angle) * 0.22, h * 0.4, Math.cos(angle) * 0.22);
        leg.rotation.z = -Math.sin(angle) * 0.22;
        leg.rotation.x = Math.cos(angle) * 0.22;
        group.add(leg);
      }
      const camBox = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.42), accentMat);
      camBox.position.set(0, h * 0.86, 0);
      attachEdgeLines(camBox, showEdges);
      group.add(camBox);
      break;
    }

    case 'chair_seat': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat);
      seat.position.y = h * 0.48;
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, 0.08), mat);
      back.position.set(0, h * 0.74, -d * 0.45);
      const base = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.48, d * 0.85), subMat);
      base.position.y = h * 0.24;
      attachEdgeLines(seat, showEdges);
      attachEdgeLines(back, showEdges);
      group.add(seat, back, base);
      break;
    }

    case 'bed_frame': {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.42, d), subMat);
      frame.position.y = h * 0.21;
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, h * 0.22, d * 0.92), accentMat);
      mattress.position.set(0, h * 0.52, d * 0.02);
      const headboard = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), mat);
      headboard.position.set(0, h * 0.5, -d * 0.46);
      attachEdgeLines(mattress, showEdges);
      attachEdgeLines(headboard, showEdges);
      group.add(frame, mattress, headboard);
      break;
    }

    case 'desk_workstation': {
      const deskTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), mat);
      deskTop.position.y = 0.76;
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.76, d * 0.9), subMat);
      legL.position.set(-w * 0.44, 0.38, 0);
      const legR = legL.clone();
      legR.position.x = w * 0.44;
      const monL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.36, 0.05), accentMat);
      monL.position.set(-w * 0.2, 1.02, -d * 0.25);
      const monR = monL.clone();
      monR.position.x = w * 0.2;
      attachEdgeLines(deskTop, showEdges);
      attachEdgeLines(monL, showEdges);
      attachEdgeLines(monR, showEdges);
      group.add(deskTop, legL, legR, monL, monR);
      break;
    }

    case 'bench': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.15, d), mat);
      seat.position.y = h * 0.5;
      attachEdgeLines(seat, showEdges);
      group.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.5, d * 0.16), mat);
      back.position.set(0, h * 0.8, -d * 0.42);
      attachEdgeLines(back, showEdges);
      group.add(back);

      const legL = new THREE.Mesh(new THREE.BoxGeometry(w * 0.1, h * 0.5, d * 0.85), subMat);
      legL.position.set(-w * 0.4, h * 0.25, 0);
      const legR = legL.clone();
      legR.position.x = w * 0.4;
      group.add(legL, legR);
      break;
    }

    case 'table': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.1, d), mat);
      top.position.y = h - h * 0.05;
      attachEdgeLines(top, showEdges);
      group.add(top);

      const legGeo = new THREE.BoxGeometry(0.08, h * 0.9, 0.08);
      const offsets: [number, number][] = [
        [-w * 0.42, -d * 0.42],
        [w * 0.42, -d * 0.42],
        [-w * 0.42, d * 0.42],
        [w * 0.42, d * 0.42],
      ];
      for (const [lx, lz] of offsets) {
        const leg = new THREE.Mesh(legGeo, subMat);
        leg.position.set(lx, h * 0.45, lz);
        group.add(leg);
      }
      break;
    }

    case 'pillar': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w * 1.25, 0.25, d * 1.25), subMat);
      base.position.y = 0.125;
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.45, w * 0.5, Math.max(0.2, h - 0.5), 10),
        mat
      );
      shaft.position.y = h * 0.5;
      attachEdgeLines(shaft, showEdges);
      const cap = base.clone();
      cap.position.y = h - 0.125;
      group.add(base, shaft, cap);
      break;
    }

    default: {
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      box.position.y = h * 0.5;
      box.castShadow = true;
      box.receiveShadow = true;
      attachEdgeLines(box, showEdges);
      group.add(box);
      break;
    }
  }

  group.traverse((obj) => {
    obj.userData = { entityType: 'prop', entityId: prop.id, propType: prop.type };
  });

  return group;
}

/**
 * Evaluate prop keyframed movement, vehicle suspension/banking physics, and spinning rotors at time `t`
 */
export function evaluatePropAtTime(
  group: THREE.Group,
  prop: GreyboxPropConfig,
  t: number,
  physics?: ScenePhysicsConfig
): void {
  const duration = Math.max(0.001, prop.endTime - prop.startTime);
  const rawU = Math.max(0, Math.min(1, (t - prop.startTime) / duration));
  const interp = evaluatePhysicsProgressU(rawU, physics, false);

  const sample = computePhysicsTrajectorySample(prop.startPos, prop.endPos, interp, physics, 0.6);
  const timeScale = physics?.timeScale ?? 1.0;
  const secondary = physics?.secondaryMotion ?? 0.75;

  let yPos = sample.pos[1];
  const isGroundVehicle =
    prop.type === 'vehicle_block' || prop.type === 'suv_truck' || prop.type === 'motorcycle';
  const isAircraft = prop.type === 'helicopter' || prop.type === 'drone_quad';

  const distMoved = Math.hypot(
    prop.endPos[0] - prop.startPos[0],
    prop.endPos[2] - prop.startPos[2]
  );

  // Add subtle suspension vibration on moving vehicles or hover bob on aircraft
  if (isGroundVehicle && distMoved > 0.2) {
    yPos += Math.abs(Math.sin(t * 14 * timeScale)) * 0.025 * secondary;
  } else if (isAircraft) {
    yPos += Math.sin(t * 2.6 * timeScale) * 0.14 * (physics?.gravityScale ?? 1.0);
  }

  group.position.set(sample.pos[0], yPos, sample.pos[2]);

  let yawRad = THREE.MathUtils.degToRad(prop.rotationY);
  if ((isGroundVehicle || isAircraft || prop.type === 'boat_vessel') && distMoved > 0.25 && sample.tangentYawRad !== null) {
    yawRad = sample.tangentYawRad;
  }

  let pitchRad = 0;
  if (isAircraft && distMoved > 0.5) {
    // Aircraft pitches nose-down slightly during forward flight
    pitchRad = 0.08 * secondary * Math.sin(rawU * Math.PI);
  } else if (isGroundVehicle && distMoved > 0.5 && (physics?.mode === 'fast' || physics?.mode === 'epic')) {
    // Acceleration squat / braking dive
    pitchRad = -0.035 * secondary * Math.cos(rawU * Math.PI);
  }

  group.rotation.set(pitchRad, yawRad, sample.bankRollRad * (prop.type === 'motorcycle' ? 1.65 : 1.0));

  // Spin helicopter rotor deterministically scaled by physics timeScale
  const rotor = group.getObjectByName('rotor_spin');
  if (rotor) {
    rotor.rotation.y = t * 18.0 * Math.max(0.4, timeScale);
  }
}

/**
 * Build 3D Motion Trajectory Lines & Camera Rail Helper (Visible in Editor, Hidden during Video Export)
 */
export function buildTrajectoryHelperGroup(
  characters: GreyboxCharacterConfig[],
  propsList: GreyboxPropConfig[],
  cameraConfig: CameraKeyframeConfig,
  selectedEntityId: string,
  physics?: ScenePhysicsConfig
): THREE.Group {
  const helperRoot = new THREE.Group();
  helperRoot.name = 'trajectory_helpers';

  const sampleCurvePoints = (
    startPos: [number, number, number],
    endPos: [number, number, number],
    yLift: number,
    phaseOffset = 0
  ): THREE.Vector3[] => {
    const pts: THREE.Vector3[] = [];
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const s = computePhysicsTrajectorySample(startPos, endPos, u, physics, phaseOffset);
      pts.push(new THREE.Vector3(s.pos[0], s.pos[1] + yLift, s.pos[2]));
    }
    return pts;
  };

  // 1. Character Trajectory Paths (Start -> End with Physics Curvature)
  for (const c of characters) {
    const isSelected = c.id === selectedEntityId;
    const startVec = new THREE.Vector3(c.startPos[0], c.startPos[1] + 0.05, c.startPos[2]);
    const endVec = new THREE.Vector3(c.endPos[0], c.endPos[1] + 0.05, c.endPos[2]);

    if (startVec.distanceToSquared(endVec) > 0.04) {
      const curvePts = sampleCurvePoints(c.startPos, c.endPos, 0.05, 0);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      const lineMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0xffffff : 0x8899aa,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.45,
      });
      helperRoot.add(new THREE.Line(lineGeo, lineMat));

      const endMarker = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.4, 8),
        new THREE.MeshBasicMaterial({ color: isSelected ? 0xffffff : 0x8899aa })
      );
      endMarker.position.copy(endVec);
      endMarker.position.y += 0.2;
      helperRoot.add(endMarker);
    }

    if (isSelected) {
      const ringGeo = new THREE.RingGeometry(0.45, 0.54, 20);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const selRing = new THREE.Mesh(ringGeo, ringMat);
      selRing.position.copy(startVec);
      helperRoot.add(selRing);
    }
  }

  // 2. Prop Trajectory Paths
  for (const p of propsList) {
    const startVec = new THREE.Vector3(p.startPos[0], p.startPos[1] + 0.06, p.startPos[2]);
    const endVec = new THREE.Vector3(p.endPos[0], p.endPos[1] + 0.06, p.endPos[2]);
    if (startVec.distanceToSquared(endVec) > 0.04) {
      const curvePts = sampleCurvePoints(p.startPos, p.endPos, 0.06, 0.6);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePts);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x99aabb,
        transparent: true,
        opacity: 0.45,
      });
      helperRoot.add(new THREE.Line(lineGeo, lineMat));
    }
  }

  // 3. Camera Dolly/Crane Trajectory Rail
  const camStart = new THREE.Vector3(...cameraConfig.startPos);
  const camEnd = new THREE.Vector3(...cameraConfig.endPos);
  if (camStart.distanceToSquared(camEnd) > 0.04) {
    const camLineGeo = new THREE.BufferGeometry().setFromPoints([camStart, camEnd]);
    const camLineMat = new THREE.LineBasicMaterial({
      color: 0xd0d8e4,
      transparent: true,
      opacity: 0.55,
    });
    helperRoot.add(new THREE.Line(camLineGeo, camLineMat));
  }

  return helperRoot;
}

/**
 * Build the selected Procedural Greybox Environment Preset + Weather Volume
 */
export function buildGreyboxEnvironment(settings: EnvironmentSettingsConfig): {
  root: THREE.Group;
  updateDynamicElements: (t: number, totalDuration: number) => void;
} {
  const root = new THREE.Group();
  root.name = `env_${settings.preset}`;

  const groundMat = createGreyboxMaterial('#3b4046', 0.92, 0.02);
  const roadMat = createGreyboxMaterial('#282c31', 0.9, 0.04);
  const sidewalkMat = createGreyboxMaterial('#6e747c', 0.85, 0.04);
  const bldgLightMat = createGreyboxMaterial('#b8bec6', 0.8, 0.06);
  const bldgMidMat = createGreyboxMaterial('#8c939c', 0.84, 0.06);
  const bldgDarkMat = createGreyboxMaterial('#5c626b', 0.86, 0.08);
  const accentSlabMat = createGreyboxMaterial('#d6dbe2', 0.72, 0.08);

  const showEdges = settings.showWireframeEdges;
  const scaleY = settings.buildingScaleY || 1.0;
  const streetW = settings.streetWidth || 10;

  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.02;
  groundPlane.receiveShadow = true;
  groundPlane.name = 'ground_plane';
  root.add(groundPlane);

  if (settings.showGrid) {
    const grid = new THREE.GridHelper(120, 120, 0x7c8591, 0x494f57);
    grid.position.y = 0.005;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.42;
    root.add(grid);
  }

  const addBlock = (
    w: number,
    h: number,
    d: number,
    x: number,
    yBottom: number,
    z: number,
    mat: THREE.MeshStandardMaterial = bldgLightMat
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, yBottom + h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    attachEdgeLines(mesh, showEdges);
    root.add(mesh);
    return mesh;
  };

  let elevatorCabGroup: THREE.Group | null = null;
  let elevatorDoorL: THREE.Mesh | null = null;
  let elevatorDoorR: THREE.Mesh | null = null;
  let transitTrainGroup: THREE.Group | null = null;
  let weatherPoints: THREE.Points | null = null;
  const weatherMode = settings.weatherParticles || 'none';

  if (weatherMode !== 'none') {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Deterministic Halton-like distribution
      const rx = (((i * 73) % 100) / 100 - 0.5) * 36;
      const ry = ((i * 41) % 100) / 100 * 16;
      const rz = (((i * 59) % 100) / 100 - 0.5) * 36;
      positions[i * 3] = rx;
      positions[i * 3 + 1] = ry;
      positions[i * 3 + 2] = rz;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: weatherMode === 'dust' ? 0xc8c2b4 : 0xdbe2ec,
      size: weatherMode === 'rain' ? 0.12 : 0.18,
      transparent: true,
      opacity: 0.55,
    });
    weatherPoints = new THREE.Points(pGeo, pMat);
    root.add(weatherPoints);
  }

  switch (settings.preset) {
    case 'urban_streets': {
      addBlock(streetW, 0.04, 120, 0, 0, 0, roadMat);
      const swWidth = 4.5;
      const leftSwX = -(streetW / 2 + swWidth / 2);
      const rightSwX = streetW / 2 + swWidth / 2;
      addBlock(swWidth, 0.18, 120, leftSwX, 0, 0, sidewalkMat);
      addBlock(swWidth, 0.18, 120, rightSwX, 0, 0, sidewalkMat);

      const stripeCount = Math.floor(streetW / 1.2);
      for (let i = 0; i < stripeCount; i++) {
        const sx = -streetW / 2 + 0.8 + i * 1.2;
        addBlock(0.6, 0.06, 2.8, sx, 0.01, 0, accentSlabMat);
      }

      const zPositions = [-36, -22, -8, 8, 22, 36];
      zPositions.forEach((zPos, idx) => {
        const hLeft = (9 + ((idx * 5) % 14)) * scaleY;
        const hRight = (11 + ((idx * 7) % 16)) * scaleY;
        const bldgX = streetW / 2 + swWidth + 5.5;

        addBlock(10, hLeft, 11, -bldgX, 0, zPos, idx % 2 === 0 ? bldgLightMat : bldgMidMat);
        addBlock(10.4, 0.6, 11.4, -bldgX, hLeft, zPos, bldgDarkMat);
        addBlock(1.2, 3.2, 3.2, -(bldgX - 4.8), 0.18, zPos, bldgDarkMat);

        addBlock(10, hRight, 11, bldgX, 0, zPos, idx % 2 === 1 ? bldgLightMat : bldgMidMat);
        addBlock(3.5, 2.2, 3.5, bldgX, hRight, zPos, bldgDarkMat);

        const poleGeo = new THREE.CylinderGeometry(0.08, 0.1, 4.5, 8);
        const poleL = new THREE.Mesh(poleGeo, bldgDarkMat);
        poleL.position.set(-(streetW / 2 + 0.6), 2.25, zPos + 5);
        poleL.castShadow = true;
        const poleR = poleL.clone();
        poleR.position.x = streetW / 2 + 0.6;
        root.add(poleL, poleR);
      });
      break;
    }

    case 'modern_skyscrapers': {
      addBlock(streetW + 4, 0.04, 140, 0, 0, 0, roadMat);
      addBlock(6, 0.2, 140, -(streetW / 2 + 5), 0, 0, sidewalkMat);
      addBlock(6, 0.2, 140, streetW / 2 + 5, 0, 0, sidewalkMat);

      const towers = [
        { x: -(streetW / 2 + 15), z: -28, w: 14, d: 14, h: 38 * scaleY },
        { x: -(streetW / 2 + 16), z: 0, w: 16, d: 16, h: 52 * scaleY },
        { x: -(streetW / 2 + 15), z: 28, w: 14, d: 14, h: 42 * scaleY },
        { x: streetW / 2 + 15, z: -28, w: 15, d: 15, h: 46 * scaleY },
        { x: streetW / 2 + 16, z: 0, w: 16, d: 16, h: 58 * scaleY },
        { x: streetW / 2 + 15, z: 28, w: 14, d: 14, h: 36 * scaleY },
      ];

      towers.forEach((t, i) => {
        addBlock(t.w * 1.18, 5, t.d * 1.18, t.x, 0, t.z, bldgDarkMat);
        addBlock(t.w, t.h, t.d, t.x, 5, t.z, i % 2 === 0 ? bldgLightMat : bldgMidMat);
        addBlock(t.w * 0.72, t.h * 0.25, t.d * 0.72, t.x, 5 + t.h, t.z, accentSlabMat);
      });

      addBlock(streetW + 22, 2.8, 4.5, 0, 18 * scaleY, -14, bldgMidMat);
      break;
    }

    case 'residential_buildings': {
      addBlock(streetW * 0.8, 0.04, 100, 0, 0, 0, roadMat);
      addBlock(3.2, 0.15, 100, -(streetW * 0.4 + 1.6), 0, 0, sidewalkMat);
      addBlock(3.2, 0.15, 100, streetW * 0.4 + 1.6, 0, 0, sidewalkMat);

      const houseZ = [-28, -14, 0, 14, 28];
      houseZ.forEach((z, idx) => {
        for (const side of [-1, 1] as const) {
          const hx = side * (streetW * 0.4 + 9.5);
          const h = (5.5 + (idx % 2) * 2.2) * scaleY;
          addBlock(7.5, h, 8.5, hx, 0, z, idx % 2 === 0 ? bldgLightMat : accentSlabMat);
          const roofGeo = new THREE.ConeGeometry(6.2, 2.6, 4);
          roofGeo.rotateY(Math.PI / 4);
          const roof = new THREE.Mesh(roofGeo, bldgDarkMat);
          roof.position.set(hx, h + 1.3, z);
          roof.castShadow = true;
          attachEdgeLines(roof, showEdges);
          root.add(roof);

          addBlock(2.2, 0.45, 1.6, hx - side * 4.2, 0, z, sidewalkMat);
          addBlock(0.25, 0.9, 10, hx - side * 5.8, 0, z, bldgMidMat);
        }
      });
      break;
    }

    case 'shopping_districts': {
      addBlock(streetW + 6, 0.08, 100, 0, 0, 0, sidewalkMat);

      for (const z of [-18, -6, 6, 18]) {
        addBlock(2.6, 0.55, 4.5, 0, 0.08, z, bldgDarkMat);
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.22, 2.2, 8),
          bldgDarkMat
        );
        trunk.position.set(0, 1.6, z);
        const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 1), bldgLightMat);
        crown.position.set(0, 3.3, z);
        crown.castShadow = true;
        attachEdgeLines(crown, showEdges);
        root.add(trunk, crown);
      }

      for (const z of [-24, -12, 0, 12, 24]) {
        for (const side of [-1, 1] as const) {
          const bx = side * (streetW / 2 + 8);
          const bh = (8.5 + (Math.abs(z) % 5)) * scaleY;
          addBlock(9, bh, 10.5, bx, 0, z, bldgLightMat);
          addBlock(2.6, 0.35, 9.6, bx - side * 5.2, 3.4, z, bldgDarkMat);
          addBlock(1.4, 2.8, 0.3, bx - side * 5.0, 5.6, z + 3, accentSlabMat);
        }
      }
      break;
    }

    case 'parks': {
      addBlock(8, 0.06, 90, 0, 0, 0, sidewalkMat);
      addBlock(90, 0.06, 8, 0, 0, 0, sidewalkMat);
      addBlock(18, 0.14, 18, 0, 0, 0, accentSlabMat);

      addBlock(7, 0.45, 7, 0, 0.14, -14, bldgMidMat);
      const colOffsets: [number, number][] = [
        [-2.8, -16.8],
        [2.8, -16.8],
        [-2.8, -11.2],
        [2.8, -11.2],
      ];
      for (const [cx, cz] of colOffsets) {
        addBlock(0.45, 3.8 * scaleY, 0.45, cx, 0.59, cz, bldgLightMat);
      }
      addBlock(8.2, 0.6, 8.2, 0, 0.59 + 3.8 * scaleY, -14, bldgDarkMat);

      const treeCoords: [number, number, number][] = [
        [-10, -8, 1.1],
        [-14, -18, 1.35],
        [-12, 10, 1.0],
        [-18, 20, 1.4],
        [10, -8, 1.15],
        [14, -18, 1.25],
        [12, 10, 1.05],
        [18, 20, 1.3],
        [-8, 22, 1.2],
        [8, 22, 1.2],
      ];
      for (const [tx, tz, s] of treeCoords) {
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18 * s, 0.26 * s, 2.4 * s, 8),
          bldgDarkMat
        );
        trunk.position.set(tx, 1.2 * s, tz);
        trunk.castShadow = true;
        const canopy = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.7 * s, 0),
          bldgLightMat
        );
        canopy.position.set(tx, 3.4 * s, tz);
        canopy.castShadow = true;
        attachEdgeLines(canopy, showEdges);
        root.add(trunk, canopy);
      }
      break;
    }

    case 'pedestrian_walkways': {
      addBlock(14, 0.05, 100, 0, 0, 0, roadMat);
      const deckY = 4.4 * scaleY;
      addBlock(28, 0.4, 5.2, 0, deckY, 0, accentSlabMat);
      addBlock(28, 1.05, 0.25, 0, deckY + 0.4, -2.45, bldgMidMat);
      addBlock(28, 1.05, 0.25, 0, deckY + 0.4, 2.45, bldgMidMat);

      for (const px of [-10, -4, 4, 10]) {
        addBlock(1.1, deckY, 1.1, px, 0, -2.0, bldgDarkMat);
        addBlock(1.1, deckY, 1.1, px, 0, 2.0, bldgDarkMat);
      }

      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const sh = ((i + 1) / steps) * deckY;
        addBlock(3.6, sh, 0.8, -12, 0, 3.2 + (steps - i) * 0.8, sidewalkMat);
        addBlock(3.6, sh, 0.8, 12, 0, -3.2 - (steps - i) * 0.8, sidewalkMat);
      }
      break;
    }

    case 'indoor_environments': {
      const roomW = 16;
      const roomD = 14;
      const roomH = 5.2 * scaleY;

      addBlock(roomW, 0.2, roomD, 0, 0, 0, sidewalkMat);
      addBlock(5.8, roomH, 0.35, -5.1, 0.2, -roomD / 2, bldgLightMat);
      addBlock(5.8, roomH, 0.35, 5.1, 0.2, -roomD / 2, bldgLightMat);
      addBlock(4.4, roomH - 2.6, 0.35, 0, 2.8, -roomD / 2, bldgLightMat);

      addBlock(0.35, roomH, 3.5, -roomW / 2, 0.2, -5.25, bldgMidMat);
      addBlock(0.35, roomH, 3.0, -roomW / 2, 0.2, 0, bldgMidMat);
      addBlock(0.35, roomH, 3.5, -roomW / 2, 0.2, 5.25, bldgMidMat);
      addBlock(0.35, 1.1, roomD, -roomW / 2, 0.2, 0, bldgMidMat);
      addBlock(0.35, roomH - 2.8, roomD, -roomW / 2, 3.0, 0, bldgMidMat);

      for (const bz of [-4.5, 0, 4.5]) {
        addBlock(roomW, 0.35, 0.45, 0, roomH - 0.15, bz, bldgDarkMat);
      }

      const table = createGreyboxPropMesh(
        {
          id: 'indoor_table',
          name: 'Room Table',
          type: 'table',
          startPos: [0, 0.2, -1],
          endPos: [0, 0.2, -1],
          dimensions: [3.2, 0.82, 1.4],
          rotationY: 0,
          colorHex: '#d0d5dd',
          startTime: 0,
          endTime: 10,
        },
        showEdges
      );
      table.position.set(0, 0.2, -1);
      root.add(table);

      addBlock(4.2, 0.9, 0.65, 4.8, 0.2, -5.8, bldgDarkMat);
      break;
    }

    case 'elevators': {
      addBlock(22, 0.2, 22, 0, 0, 0, sidewalkMat);
      for (const cx of [-6, 6]) {
        for (const cz of [-2, 5]) {
          addBlock(0.9, 12 * scaleY, 0.9, cx, 0.2, cz, bldgMidMat);
        }
      }

      const shaftH = 14 * scaleY;
      addBlock(3.8, shaftH, 0.35, -3.6, 0.2, -5, bldgLightMat);
      addBlock(3.8, shaftH, 0.35, 3.6, 0.2, -5, bldgLightMat);
      addBlock(3.6, shaftH, 3.2, 0, 0.2, -6.8, bldgDarkMat);

      elevatorCabGroup = new THREE.Group();
      elevatorCabGroup.position.set(0, 0.2, -5.2);
      root.add(elevatorCabGroup);

      const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 2.4), accentSlabMat);
      cabFloor.position.y = 0.09;
      const cabCeiling = cabFloor.clone();
      cabCeiling.position.y = 2.75;
      const cabBack = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.75, 0.14), bldgMidMat);
      cabBack.position.set(0, 1.38, -1.15);
      attachEdgeLines(cabFloor, showEdges);
      attachEdgeLines(cabBack, showEdges);
      elevatorCabGroup.add(cabFloor, cabCeiling, cabBack);

      elevatorDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.6, 0.12), accentSlabMat);
      elevatorDoorL.position.set(-0.68, 1.5, -4.0);
      attachEdgeLines(elevatorDoorL, showEdges);

      elevatorDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.6, 0.12), accentSlabMat);
      elevatorDoorR.position.set(0.68, 1.5, -4.0);
      attachEdgeLines(elevatorDoorR, showEdges);
      root.add(elevatorDoorL, elevatorDoorR);
      break;
    }

    case 'public_transit_stations': {
      addBlock(70, 1.1, 10, 0, 0, 2, sidewalkMat);
      addBlock(70, 0.04, 0.45, 0, 1.1, -2.6, accentSlabMat);

      addBlock(90, 0.15, 5.2, 0, 0, -5.6, roadMat);
      addBlock(90, 0.12, 0.14, 0, 0.15, -4.8, bldgLightMat);
      addBlock(90, 0.12, 0.14, 0, 0.15, -6.4, bldgLightMat);

      const canopyH = 5.4 * scaleY;
      for (const px of [-20, -10, 0, 10, 20]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.32, canopyH, 10),
          bldgDarkMat
        );
        col.position.set(px, 1.1 + canopyH / 2, 2.5);
        col.castShadow = true;
        root.add(col);
      }
      addBlock(52, 0.45, 11.5, 0, 1.1 + canopyH, 1.5, bldgMidMat);

      transitTrainGroup = new THREE.Group();
      transitTrainGroup.position.set(-18, 0.3, -5.6);
      root.add(transitTrainGroup);

      for (const carIdx of [-1, 0, 1]) {
        const carX = carIdx * 11.6;
        const carBody = new THREE.Mesh(
          new THREE.BoxGeometry(11.0, 3.1, 2.9),
          carIdx === 0 ? accentSlabMat : bldgLightMat
        );
        carBody.position.set(carX, 1.65, 0);
        carBody.castShadow = true;
        attachEdgeLines(carBody, showEdges);
        transitTrainGroup.add(carBody);
      }
      break;
    }

    case 'futuristic_architecture': {
      addBlock(50, 0.25, 80, 0, 0, 0, sidewalkMat);
      addBlock(26, 0.5, 26, 0, 0.25, -18, bldgMidMat);

      const monoH = 34 * scaleY;
      for (const side of [-1, 1] as const) {
        const buttress = new THREE.Mesh(
          new THREE.BoxGeometry(8, monoH, 14),
          bldgLightMat
        );
        buttress.position.set(side * 11, monoH / 2, -20);
        buttress.rotation.z = side * 0.08;
        buttress.castShadow = true;
        buttress.receiveShadow = true;
        attachEdgeLines(buttress, showEdges);
        root.add(buttress);
      }

      const ringGeo = new THREE.TorusGeometry(9.5, 1.1, 8, 24);
      ringGeo.rotateX(Math.PI / 2);
      const skyRing = new THREE.Mesh(ringGeo, accentSlabMat);
      skyRing.position.set(0, 18 * scaleY, -20);
      skyRing.castShadow = true;
      attachEdgeLines(skyRing, showEdges);
      root.add(skyRing);

      for (const z of [-6, 4, 14, 24]) {
        for (const side of [-1, 1] as const) {
          addBlock(2.2, 9.5 * scaleY, 2.2, side * 10.5, 0.25, z, bldgDarkMat);
        }
      }
      break;
    }
  }

  const updateDynamicElements = (t: number, totalDuration: number) => {
    const u = Math.max(0, Math.min(1, t / Math.max(0.1, totalDuration)));
    if (elevatorCabGroup && elevatorDoorL && elevatorDoorR) {
      const doorProgress = Math.min(1, u / 0.35);
      const doorSlide = doorProgress * 1.1;
      elevatorDoorL.position.x = -0.68 - doorSlide;
      elevatorDoorR.position.x = 0.68 + doorSlide;

      const ascendProgress = Math.max(0, (u - 0.35) / 0.65);
      const smoothAscend = ascendProgress * ascendProgress * (3 - 2 * ascendProgress);
      elevatorCabGroup.position.y = 0.2 + smoothAscend * 6.5 * scaleY;
    }

    if (transitTrainGroup) {
      const easeOut = 1 - Math.pow(1 - u, 2.4);
      transitTrainGroup.position.x = THREE.MathUtils.lerp(-22, 6, easeOut);
    }

    if (weatherPoints) {
      const speed = weatherMode === 'rain' ? 6.5 : weatherMode === 'snow' ? 1.8 : 0.6;
      weatherPoints.position.y = -((t * speed) % 6.0);
    }
  };

  return { root, updateDynamicElements };
}

/**
 * Deterministically evaluate the Cinematic Camera at timeline timestamp `t`
 */
export function evaluateCinematicCameraAtTime(
  camera: THREE.PerspectiveCamera,
  camConfig: CameraKeyframeConfig,
  characters: Map<string, ArticulatedHumanRig>,
  t: number,
  totalDuration: number
): void {
  const duration = Math.max(0.01, totalDuration);
  const u = Math.max(0, Math.min(1, (t * camConfig.movementSpeed) / duration));
  const smoothU = u * u * (3 - 2 * u);

  const targetFov = focalLengthToVerticalFov(camConfig.focalLengthMm);
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  const primaryRig = characters.get(camConfig.targetCharacterId) || characters.values().next().value;
  const secondaryRig = characters.get(camConfig.secondaryCharacterId);

  const charPos = new THREE.Vector3(0, 0, 0);
  let charYaw = 0;
  if (primaryRig) {
    charPos.copy(primaryRig.root.position);
    charYaw = primaryRig.root.rotation.y;
  }

  const camPos = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();

  switch (camConfig.mode) {
    case 'dolly': {
      camPos.set(
        THREE.MathUtils.lerp(camConfig.startPos[0], camConfig.endPos[0], smoothU),
        THREE.MathUtils.lerp(camConfig.startPos[1], camConfig.endPos[1], smoothU) +
          camConfig.cameraHeightOffset,
        THREE.MathUtils.lerp(camConfig.startPos[2], camConfig.endPos[2], smoothU)
      );
      lookTarget.set(
        THREE.MathUtils.lerp(camConfig.startTarget[0], camConfig.endTarget[0], smoothU),
        THREE.MathUtils.lerp(camConfig.startTarget[1], camConfig.endTarget[1], smoothU),
        THREE.MathUtils.lerp(camConfig.startTarget[2], camConfig.endTarget[2], smoothU)
      );
      break;
    }

    case 'tracking': {
      const sideOffset = new THREE.Vector3(3.2, 1.55 + camConfig.cameraHeightOffset, 1.8);
      sideOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
      camPos.copy(charPos).add(sideOffset);
      lookTarget.copy(charPos).add(new THREE.Vector3(0, 1.35, 0));
      break;
    }

    case 'crane': {
      const startY = camConfig.startPos[1] + 0.6;
      const endY = camConfig.endPos[1] + 5.5 + camConfig.cameraHeightOffset;
      camPos.set(
        THREE.MathUtils.lerp(camConfig.startPos[0], camConfig.endPos[0], smoothU),
        THREE.MathUtils.lerp(startY, endY, smoothU),
        THREE.MathUtils.lerp(camConfig.startPos[2], camConfig.endPos[2], smoothU)
      );
      lookTarget.copy(charPos).add(new THREE.Vector3(0, 1.4, 0));
      break;
    }

    case 'orbit': {
      const angleDeg = THREE.MathUtils.lerp(
        camConfig.orbitStartAngleDeg,
        camConfig.orbitEndAngleDeg,
        u
      );
      const angleRad = THREE.MathUtils.degToRad(angleDeg);
      const radius = Math.max(1.5, camConfig.orbitRadius);
      const center = primaryRig
        ? charPos.clone().add(new THREE.Vector3(0, 1.3, 0))
        : new THREE.Vector3(
            camConfig.startTarget[0],
            camConfig.startTarget[1],
            camConfig.startTarget[2]
          );

      camPos.set(
        center.x + Math.sin(angleRad) * radius,
        center.y + 0.8 + camConfig.cameraHeightOffset,
        center.z + Math.cos(angleRad) * radius
      );
      lookTarget.copy(center);
      break;
    }

    case 'wide_establishing': {
      camPos.set(
        THREE.MathUtils.lerp(-14, -9, smoothU),
        7.5 + camConfig.cameraHeightOffset,
        THREE.MathUtils.lerp(20, 14, smoothU)
      );
      lookTarget.set(0, 2.2, -2);
      break;
    }

    case 'third_person': {
      const behindOffset = new THREE.Vector3(0, 2.1 + camConfig.cameraHeightOffset, -3.6);
      behindOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
      camPos.copy(charPos).add(behindOffset);

      const forwardLook = new THREE.Vector3(0, 1.5, 4.0);
      forwardLook.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
      lookTarget.copy(charPos).add(forwardLook);
      break;
    }

    case 'first_person_pov': {
      const eyeOffset = new THREE.Vector3(0, 1.68 + camConfig.cameraHeightOffset, 0.22);
      eyeOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
      camPos.copy(charPos).add(eyeOffset);

      const headYaw = primaryRig ? primaryRig.headGroup.rotation.y : 0;
      const headPitch = primaryRig ? primaryRig.headGroup.rotation.x : 0;
      const gazeDir = new THREE.Vector3(0, -Math.sin(headPitch) * 3, 8.0);
      gazeDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw + headYaw);
      lookTarget.copy(camPos).add(gazeDir);
      break;
    }

    case 'over_the_shoulder': {
      const otsOffset = new THREE.Vector3(-0.48, 1.62 + camConfig.cameraHeightOffset, -1.15);
      otsOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
      camPos.copy(charPos).add(otsOffset);

      if (secondaryRig && secondaryRig !== primaryRig) {
        lookTarget.copy(secondaryRig.root.position).add(new THREE.Vector3(0, 1.45, 0));
      } else {
        const forwardTarget = new THREE.Vector3(0.15, 1.45, 5.0);
        forwardTarget.applyAxisAngle(new THREE.Vector3(0, 1, 0), charYaw);
        lookTarget.copy(charPos).add(forwardTarget);
      }
      break;
    }

    case 'handheld_sim': {
      const basePos = new THREE.Vector3(
        THREE.MathUtils.lerp(camConfig.startPos[0], camConfig.endPos[0], smoothU),
        THREE.MathUtils.lerp(camConfig.startPos[1], camConfig.endPos[1], smoothU) +
          camConfig.cameraHeightOffset,
        THREE.MathUtils.lerp(camConfig.startPos[2], camConfig.endPos[2], smoothU)
      );
      const amp = Math.max(0.02, camConfig.handheldIntensity) * 0.14;
      const swayX = Math.sin(t * 2.3) * amp + Math.cos(t * 5.1) * (amp * 0.35);
      const swayY = Math.cos(t * 3.1) * (amp * 0.85) + Math.sin(t * 6.4) * (amp * 0.25);
      camPos.copy(basePos).add(new THREE.Vector3(swayX, swayY, 0));

      if (primaryRig) {
        lookTarget
          .copy(charPos)
          .add(new THREE.Vector3(swayX * 0.6, 1.42 + swayY * 0.6, 0));
      } else {
        lookTarget.set(
          THREE.MathUtils.lerp(camConfig.startTarget[0], camConfig.endTarget[0], smoothU),
          THREE.MathUtils.lerp(camConfig.startTarget[1], camConfig.endTarget[1], smoothU),
          THREE.MathUtils.lerp(camConfig.startTarget[2], camConfig.endTarget[2], smoothU)
        );
      }
      break;
    }
  }

  camera.position.copy(camPos);
  camera.lookAt(lookTarget);

  if (camConfig.mode === 'handheld_sim') {
    camera.rotation.z +=
      Math.sin(t * 1.9) * 0.012 * Math.max(0.2, camConfig.handheldIntensity);
  }
}
