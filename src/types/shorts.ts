export type ShortCategory =
  | 'AI Cinema'
  | 'AI Fashion'
  | 'Visual Art'
  | 'Behind the Scenes'
  | 'Experimental';

export interface ShortComment {
  id: string;
  shortId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface ShortVideo {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  category: ShortCategory;
  tags: string[];
  soundTitle?: string;
  soundAuthor?: string;
  duration?: number;
  aspectRatio?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  createdAt: string;
  updatedAt?: string;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowingAuthor?: boolean;
}
