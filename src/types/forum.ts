/**
 * IVNTRI Forum & Creator Thought Discourse Types
 * Represents micro-posts, atelier thoughts, prompt engineering, critique, and chained threads.
 */

export type ForumTopic =
  | 'General Discourse'
  | 'Prompt Engineering'
  | 'Aesthetic Critique'
  | 'Cinema Direction'
  | 'Synthetic Runway'
  | 'Workflow & Tech'
  | 'Tools & Models';

export type ReplyPermission = 'EVERYONE' | 'FOLLOWERS' | 'MENTIONS';

export type ImageProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface OptimizedImageItem {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  format: string;
  size: number;
  originalSize?: number;
  compressionRatio?: number;
  status: 'completed' | 'failed';
  storagePath?: string;
  thumbnailStoragePath?: string;
  processedAt?: string;
}

export interface ChainedThought {
  id: string;
  content: string;
  mediaUrls?: string[];
}

export interface ForumReply {
  id: string;
  threadId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorRole?: string;
  authorVerified?: boolean;
  content: string;
  likesCount: number;
  likedBy?: string[];
  createdAt: string;
}

export interface QuotedThread {
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
}

export interface ForumThread {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorRole?: string;
  authorVerified?: boolean;
  topic: ForumTopic;
  content: string;
  mediaUrls?: string[];
  imageProcessingStatus?: ImageProcessingStatus;
  optimizedImages?: OptimizedImageItem[];
  chainedThoughts?: ChainedThought[];
  quotedThread?: QuotedThread;
  replyPermission: ReplyPermission;
  likesCount: number;
  likedBy: string[];
  repliesCount: number;
  repostsCount: number;
  repostedBy?: string[];
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isReposted?: boolean;
}
