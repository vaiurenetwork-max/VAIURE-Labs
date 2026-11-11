/**
 * VAIURE Studio — Types & Data Contracts
 * Professional AI Filmmaking Studio
 */

export type AspectRatio = '16:9' | '9:16' | '1:1';
export type Resolution = '1080p' | '4K';
export type FrameRate = '24fps' | '30fps';

export type ShotSize =
  | 'EXTREME_WIDE'
  | 'WIDE'
  | 'MEDIUM'
  | 'MEDIUM_CLOSE_UP'
  | 'CLOSE_UP'
  | 'EXTREME_CLOSE_UP';

export type CameraMovement =
  | 'STATIC'
  | 'PAN'
  | 'TILT'
  | 'DOLLY_IN'
  | 'DOLLY_OUT'
  | 'TRACKING'
  | 'CRANE'
  | 'HANDHELD'
  | 'ORBIT';

export type ShotStatus = 'DRAFT' | 'READY' | 'GENERATING' | 'COMPLETED' | 'OUTDATED' | 'FAILED';

export interface ShotVersion {
  id: string;
  versionNumber: number;
  thumbnailUrl: string;
  videoUrl?: string;
  prompt: string;
  model: string;
  duration: number;
  createdAt: string;
  notes?: string;
}

export interface StoryboardShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  title: string;
  description: string;
  duration: number; // in seconds
  shotSize: ShotSize;
  cameraMovement: CameraMovement;
  cameraAngle: string;
  lens: string;
  composition: string;
  lighting: string;
  timeOfDay: string;
  characterIds: string[];
  locationId?: string;
  blockingNotes?: string;
  continuityNotes?: string;
  dialogue?: string;
  audioNotes?: string;
  prompt: string;
  negativePrompt?: string;
  isManualPromptEdited: boolean;
  status: ShotStatus;
  thumbnailUrl: string;
  videoUrl?: string;
  currentVersionNumber: number;
  versions: ShotVersion[];
  precedingShotId?: string;
  followingShotId?: string;
}

export interface CharacterVersion {
  versionId: string;
  timestamp: string;
  bio: string;
  referenceImages: string[];
  wardrobe: string;
}

export interface StudioCharacter {
  id: string;
  name: string;
  role: string;
  bio: string;
  appearance: string;
  wardrobe: string;
  distinguishingFeatures: string;
  referenceImages: string[];
  referenceVideo?: string;
  voiceStyle?: string;
  assignedShotIds: string[];
  versionHistory: CharacterVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioLocation {
  id: string;
  name: string;
  type: 'INTERIOR' | 'EXTERIOR';
  timeOfDay: string;
  lighting: string;
  description: string;
  referenceImages: string[];
  environmentalNotes?: string;
  assignedShotIds: string[];
  createdAt: string;
}

export interface StudioScene {
  id: string;
  sceneNumber: number;
  title: string;
  description: string;
  locationId?: string;
  mood: string;
  shotIds: string[];
}

export type TimelineTrackType = 'VIDEO' | 'AUDIO';

export interface TimelineClip {
  id: string;
  shotId?: string;
  trackId: string;
  trackType: TimelineTrackType;
  title: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  startTime: number; // in seconds on timeline
  duration: number; // visible duration in seconds
  inPoint: number; // source media start offset in seconds
  outPoint: number; // source media end offset in seconds
  volume: number; // 0 to 1
  isMuted?: boolean;
  transitionIn?: 'CUT' | 'DISSOLVE' | 'FADE_FROM_BLACK';
  transitionOut?: 'CUT' | 'DISSOLVE' | 'FADE_TO_BLACK';
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TimelineTrackType;
  order: number;
  isMuted: boolean;
  isLocked: boolean;
  volume: number;
}

export type StudioAssetType = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'REFERENCE' | 'EXPORT';

export interface StudioAsset {
  id: string;
  projectId: string;
  shotId?: string;
  type: StudioAssetType;
  title: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  prompt?: string;
  model?: string;
  resolution?: string;
  fileSizeBytes?: number;
  version: number;
  createdAt: string;
}

export type NodeCategory =
  | 'CHARACTER'
  | 'LOCATION'
  | 'CONCEPT'
  | 'SCRIPT'
  | 'SCENE'
  | 'STORYBOARD'
  | 'IMAGE_GEN'
  | 'VIDEO_GEN'
  | 'AUDIO_GEN'
  | 'REFERENCE'
  | 'SEQUENCE'
  | 'EXPORT';

export type NodePortType =
  | 'character'
  | 'location'
  | 'script'
  | 'scene'
  | 'shot'
  | 'image'
  | 'video'
  | 'audio'
  | 'sequence';

export interface NodePort {
  id: string;
  name: string;
  type: NodePortType;
  isOutput: boolean;
}

export interface NodeOutputVersion {
  versionId: string;
  timestamp: string;
  outputMediaUrl?: string;
  thumbnailUrl?: string;
  prompt?: string;
  model?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  type: NodeCategory;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: 'IDLE' | 'READY' | 'RUNNING' | 'COMPLETED' | 'OUTDATED' | 'FAILED';
  inputPorts: NodePort[];
  outputPorts: NodePort[];
  config: Record<string, any>;
  currentOutputId?: string;
  outputMediaUrl?: string;
  thumbnailUrl?: string;
  outputVersions: NodeOutputVersion[];
  error?: string;
}

export interface WorkflowConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export interface CanvasSnapshot {
  id: string;
  name: string;
  timestamp: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  viewport: { x: number; y: number; zoom: number };
}

export interface GenerationJob {
  id: string;
  projectId: string;
  shotId?: string;
  nodeId?: string;
  modelId: string;
  modelName: string;
  prompt: string;
  negativePrompt?: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startedAt: number;
  completedAt?: number;
  resultUrl?: string;
  resultThumbnailUrl?: string;
  error?: string;
  estimatedCostCredits: number;
}

export interface AssistantProposal {
  id: string;
  type: 'SHOT_PROMPT' | 'CAMERA_DIRECTION' | 'SCRIPT_SCENE' | 'CONTINUITY_FIX';
  targetId: string; // e.g. shotId
  summary: string;
  currentValue: string;
  proposedValue: string;
  status: 'PENDING' | 'APPLIED' | 'REJECTED';
}

export interface AIAssistantMessage {
  id: string;
  sender: 'USER' | 'ASSISTANT';
  text: string;
  timestamp: string;
  proposal?: AssistantProposal;
}

export interface StudioProject {
  id: string;
  name: string;
  description: string;
  genre: 'Short Film' | 'Music Video' | 'Commercial' | 'Cinematic Scene' | 'Experimental Film';
  aspectRatio: AspectRatio;
  resolution: Resolution;
  frameRate: FrameRate;
  saveStatus: 'Saved' | 'Saving' | 'Unsaved Changes' | 'Save Failed';
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
  scenes: StudioScene[];
  shots: StoryboardShot[];
  characters: StudioCharacter[];
  locations: StudioLocation[];
  timelineTracks: TimelineTrack[];
  timelineClips: TimelineClip[];
  assets: StudioAsset[];
  canvasNodes: WorkflowNode[];
  canvasConnections: WorkflowConnection[];
  canvasSnapshots: CanvasSnapshot[];
  generationQueue: GenerationJob[];
  activeShotId?: string;
  activeCharacterId?: string;
  activeLocationId?: string;
}
