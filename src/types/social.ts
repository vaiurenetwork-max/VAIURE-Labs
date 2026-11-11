export type PostType = 'image' | 'video' | 'carousel' | 'short_film' | 'artwork' | 'fashion_editorial';

export type AiAttribution = 'AI Generated' | 'AI Assisted' | 'Hybrid';

export interface PostMedia {
  url: string;
  aspectRatio: string;
  type: 'image' | 'video';
  caption?: string;
  poster?: string;
  duration?: number;
  size?: number;
  mimeType?: string;
  filename?: string;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorVerified?: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
  parentId?: string | null;
  replies?: PostComment[];
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  authorRole: string;
  authorVerified?: boolean;
  title: string;
  caption: string;
  category: 'EDITORIAL' | 'COUTURE' | 'CINEMA' | 'DIGITAL FASHION' | 'ARTWORK' | 'EXPERIMENTAL';
  postType: PostType;
  media: PostMedia[];
  tags: string[];
  aiTools: string[];
  aiAttribution: AiAttribution;
  collaborators?: string[];
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isReposted?: boolean;
  originalPost?: {
    id: string;
    authorName: string;
    authorUsername: string;
    authorAvatar: string;
    title: string;
    createdAt: string;
  };
  repostedBy?: {
    username: string;
    name: string;
    comment?: string;
  };
}

export interface UserCollection {
  id: string;
  userId: string;
  title: string;
  description: string;
  isPrivate: boolean;
  coverImage?: string;
  postIds: string[];
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar: string;
  bannerImage?: string;
  role: string;
  bio: string;
  location: string;
  website: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing?: boolean;
  isVerified?: boolean;
  verified?: boolean;
  specialBadge?: string;
  aiSpecialties: string[];
  collections: UserCollection[];
  onlineStatus?: boolean;
  lastActiveAt?: string;
  lastUsernameChangeAt?: string;
}

export type NotificationType =
  | 'follow'
  | 'like'
  | 'comment'
  | 'reply'
  | 'mention'
  | 'repost'
  | 'save'
  | 'message'
  | 'collab_request';

export interface SocialNotification {
  id: string;
  type: NotificationType;
  actorId: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string;
  targetPostId?: string;
  targetPostTitle?: string;
  message?: string;
  createdAt: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  createdAt: string;
  imageUrl?: string;
  sharedPostId?: string;
  sharedPostTitle?: string;
  isCollabRequest?: boolean;
  collabDetails?: {
    projectTitle: string;
    budget: string;
    timeline: string;
    scope: string;
  };
  readAt?: string | null;
  status?: 'sending' | 'sent' | 'read' | 'error';
  attachmentUrl?: string;
  attachmentType?: string;
}

export interface Conversation {
  id: string;
  participant: UserProfile;
  lastMessage: ChatMessage;
  unreadCount: number;
}
