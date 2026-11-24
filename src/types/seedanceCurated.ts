/**
 * VAIURE — SEEDANCE LAB CURATED GALLERY & PUBLIC DISCOVERY SYSTEM TYPES
 * Strict separation between:
 * 1. My Private Curates (auto-ingested private user creations)
 * 2. Curation Submission & Moderator Review Pipeline
 * 3. Public Curated Gallery (approved & published creations only)
 */

export type CuratedMediaType = 'IMAGE' | 'VIDEO';

export type CreationVisibility = 'private' | 'public';

export type PublicationStatus =
  | 'not_submitted'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'published'
  | 'rejected'
  | 'withdrawn'
  | 'revision_requested';

export interface CreationAsset {
  id: string;
  creationId: string;
  ownerId: string;
  mediaType: CuratedMediaType;
  storageKind: 'private_file' | 'external_private';
  localFileName?: string;
  externalUrl?: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  createdAt: string;
}

export interface UserCreation {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  sourceJobId: string;
  generationGroupId: string;
  variantIndex: number;
  sourcePipeline:
    | 'seedance_video'
    | 'bytedance_image'
    | 'prompt_studio'
    | 'midjourney'
    | 'canvas_studio'
    | 'video_workspace'
    | 'other';
  projectId?: string;
  projectName?: string;
  title: string;
  description: string;
  mediaType: CuratedMediaType;
  primaryAssetId: string;
  thumbnailAssetId?: string;
  aiModel: string;
  modelCategory: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  prompt: string;
  negativePrompt?: string;
  parameters: Record<string, unknown>;
  referenceImageCount: number;
  visibility: CreationVisibility;
  publicationStatus: PublicationStatus;
  activeSubmissionId?: string;
  publishedCreationId?: string;
  latestReviewNotes?: string;
  collectionIds: string[];
  tags: string[];
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
  // Transient authenticated delivery URLs (attached per-request)
  mediaStreamUrl?: string;
  thumbnailStreamUrl?: string;
  downloadUrl?: string;
}

export interface CreationCollection {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  coverAssetId?: string;
  coverStreamUrl?: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  creationId: string;
  ownerId: string;
  addedAt: string;
}

export type CurationSubmissionStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'REVISION_REQUESTED';

export interface CurationPolicyChecklist {
  originalOrAuthorized: boolean;
  safetyCompliant: boolean;
  qualityApproved: boolean;
  metadataAppropriate: boolean;
}

export interface CurationSubmission {
  id: string;
  creationId: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  mediaType: CuratedMediaType;
  primaryAssetId: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  aiModel: string;
  proposedTitle: string;
  proposedDescription: string;
  category: string;
  tags: string[];
  creativeCredits: string;
  projectName?: string;
  showCreatorProfile: boolean;
  showAiModel: boolean;
  showPromptAndParams: boolean;
  status: CurationSubmissionStatus;
  latestReviewNotes?: string;
  revisionInstructions?: string;
  rejectionReason?: string;
  policyChecklist?: CurationPolicyChecklist;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  updatedAt: string;
  // Scoped preview URL for owner or active curator
  mediaStreamUrl?: string;
  privatePrompt?: string;
  privateParameters?: Record<string, unknown>;
}

export type CurationReviewDecision =
  | 'START_REVIEW'
  | 'APPROVE'
  | 'REJECT'
  | 'REQUEST_REVISION'
  | 'WITHDRAW'
  | 'UNPUBLISH'
  | 'MODERATE_REMOVE';

export interface CurationReview {
  id: string;
  submissionId: string;
  creationId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  decision: CurationReviewDecision;
  internalNotes: string;
  creatorFeedback: string;
  policyChecklist: CurationPolicyChecklist;
  createdAt: string;
}

export type PublishedCreationStatus = 'PUBLISHED' | 'UNPUBLISHED' | 'REMOVED';

export interface PublishedCreation {
  id: string;
  creationId: string;
  submissionId: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  mediaType: CuratedMediaType;
  assetId: string;
  thumbnailAssetId?: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds?: number;
  creativeCredits?: string;
  projectName?: string;
  showCreatorProfile: boolean;
  creatorDisplayName?: string;
  creatorUsername?: string;
  creatorAvatar?: string;
  showAiModel: boolean;
  aiModel?: string;
  showPromptAndParams: boolean;
  disclosedPrompt?: string;
  disclosedParameters?: Record<string, unknown>;
  status: PublishedCreationStatus;
  commentsEnabled: boolean;
  curatorBadge?: string;
  viewsCount: number;
  uniqueViewsCount: number;
  appreciationsCount: number;
  favoritesCount: number;
  commentsCount: number;
  sharesCount: number;
  trendingScore: number;
  reportCount: number;
  publishedAt: string;
  updatedAt: string;
  // Public delivery URL (only valid while status === 'PUBLISHED')
  mediaStreamUrl?: string;
  thumbnailStreamUrl?: string;
  // Viewer-specific state attached on read
  viewerHasAppreciated?: boolean;
  viewerHasFavorited?: boolean;
  viewerIsFollowingCreator?: boolean;
}

export interface CreationReaction {
  id: string;
  publishedCreationId: string;
  userId: string;
  reactionType: 'APPRECIATE';
  createdAt: string;
}

export interface CreationComment {
  id: string;
  publishedCreationId: string;
  creationId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorFavorite {
  id: string;
  userId: string;
  publishedCreationId: string;
  createdAt: string;
}

export interface CreationTag {
  id: string;
  slug: string;
  label: string;
  usageCount: number;
  updatedAt: string;
}

export interface CreationAnalytics {
  publishedCreationId: string;
  totalViews: number;
  uniqueViewerHashes: string[];
  appreciations: number;
  favorites: number;
  comments: number;
  shares: number;
  lastViewedAt?: string;
}

export interface PublicCreationReport {
  id: string;
  publishedCreationId: string;
  creationId: string;
  publishedTitle: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  details: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface CuratedCategoryOption {
  id: string;
  name: string;
  description: string;
}

export type PublicGallerySort =
  | 'latest'
  | 'recently_curated'
  | 'popular'
  | 'most_viewed'
  | 'most_appreciated'
  | 'trending';
