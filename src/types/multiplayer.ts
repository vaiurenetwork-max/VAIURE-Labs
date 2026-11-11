/**
 * VAIURE Multiplayer & Real-Time Collaboration Types
 * Live Studio Presence, Ambient Spatial Reactions, Shared 3D Stages & Prompt Matrix
 */

export type AtelierSlideId = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LiveCreatorPresence {
  uid: string;
  username: string;
  displayName: string;
  avatar: string;
  currentSlide: AtelierSlideId;
  currentSlideName: string;
  status: 'ONLINE' | 'CREATING' | 'IDLE';
  lastHeartbeat: string;
  color: string;
  role?: string;
  isCurrentUser?: boolean;
}

export type AmbientPulseType =
  | 'vision'
  | 'architect'
  | 'cinematic'
  | 'sculptural'
  | 'harmony'
  | 'vaiure';

export interface AmbientReaction {
  id: string;
  actorId: string;
  actorName: string;
  reaction: AmbientPulseType;
  label: string;
  color: string;
  slideIndex: AtelierSlideId;
  x?: number; // Normalized 0-100 or client coords
  y?: number;
  createdAt: string;
}

export interface Shared3DScene {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  duration: number; // 5, 10, 15, 20, 25, 30s
  physicsMode: 'slow' | 'normal' | 'fast' | 'epic' | 'complex';
  summary: string;
  seedancePrompt: string;
  environmentPreset: string;
  charactersCount: number;
  propsCount: number;
  sceneData: string; // JSON serialized scene config
  likesCount: number;
  remixCount: number;
  createdAt: string;
}

export interface SharedVxPrompt {
  id: string;
  prompt: string;
  fullMidjourneyCommand: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  modelId: string;
  modelLabel: string;
  mode: string;
  confidenceScore: number;
  aspectRatio: string;
  stylize: number;
  subjectTitle?: string;
  lightingStyle?: string;
  cameraStyle?: string;
  likesCount: number;
  remixCount: number;
  createdAt: string;
}

export interface MultiplayerActivityEvent {
  id: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  action: string;
  targetTitle?: string;
  slideIndex: AtelierSlideId;
  slideName: string;
  timestamp: string;
}
