/**
 * VAIURE Labs — Collaborative Rooms & SharedWorks Canvas Data Contracts
 * Slide 4: Multiplayer Real-Time AI Video Creation Laboratory
 */

export type ParticipantRole = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
export type RoomVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';
export type ProjectType = 'CINEMATIC' | 'COMMERCIAL' | 'EXPERIMENTAL' | 'FASHION' | 'NARRATIVE';

export interface RoomParticipant {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  photoURL: string;
  role: ParticipantRole;
  status: 'ONLINE' | 'IDLE' | 'OFFLINE';
  color: string;
  joinedAt: string;
  lastActiveAt: string;
}

export interface CollaborativeRoom {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatar: string;
  visibility: RoomVisibility;
  projectType: ProjectType;
  maxParticipants: number;
  password?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  activeCollaboratorsCount: number;
  tags: string[];
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  lastActivityText?: string;
}

export type CanvasItemType =
  | 'PROMPT_CARD'
  | 'NOTE'
  | 'REFERENCE_IMAGE'
  | 'VIDEO_PREVIEW'
  | 'SCENE_GROUP'
  | 'STORYBOARD';

export interface CanvasItem {
  id: string;
  roomId: string;
  type: CanvasItemType;
  title: string;
  content: string; // prompt string or note text
  mediaUrl?: string;
  thumbnailUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  tags?: string[];
  activeEditorId?: string | null;
  activeEditorName?: string | null;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string;
  updatedAt: string;
  // Specific metadata
  aspectRatio?: string;
  durationSeconds?: number;
  resolution?: string;
  modelId?: string;
  weight?: number;
  sceneOrder?: number;
  connectedToIds?: string[];
}

export interface LiveCursor {
  id: string; // participant id
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
  activeCardId?: string | null;
  currentAction?: string;
}

export interface RoomActivity {
  id: string;
  roomId: string;
  actorId: string;
  actorName: string;
  actorAvatar: string;
  action: string;
  targetTitle?: string;
  timestamp: string;
}

export interface AIGenerationSettings {
  prompt: string;
  negativePrompt: string;
  modelId: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1';
  durationSeconds: number;
  resolution: '480p' | '720p' | '1080p';
  generateAudio: boolean;
  referenceImages: { id: string; url: string; weight: number }[];
}
