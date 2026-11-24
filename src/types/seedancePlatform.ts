/**
 * VAIURE Labs — Seedance 2.5 Community AI Platform
 * Core Type Definitions for:
 * - Configurable Subscription Tiers (Free, Basic, Pro, Premium, Enterprise)
 * - Generation Credit Wallet, Dynamic Cost Matrix & Immutable Ledger
 * - Personal AI Creative Agent & Isolated Creative Memory
 * - Live Streaming & WebRTC Multiplayer Call Rooms
 * - Platform Administration & Audit Logs
 */

export type MembershipTier =
  | 'FREE'
  | 'BASIC'
  | 'PRO'
  | 'PREMIUM'
  | 'ENTERPRISE'
  // Legacy tier aliases kept for backward data normalization only
  | 'STARTER'
  | 'CREATOR'
  | 'STUDIO';

export type CanonicalTierId = 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM' | 'ENTERPRISE';

export interface PlanLimits {
  maxResolution: '480p' | '720p' | '1080p';
  maxDurationSeconds: 10 | 15 | 20 | 30;
  maxReferenceImages: number;
  allowReferenceImages: boolean;
  allowCharacterConsistency: boolean;
  concurrentJobs: number;
  maxStreamViewers: number;
  maxRoomParticipants: number;
  commercialUseEligible: boolean;
  multiSceneWorkspace: boolean;
  teamSeats: number;
}

export interface MembershipPlan {
  id: string;
  tier: CanonicalTierId;
  name: string;
  priceIdr: number;
  priceUsd: number;
  priceIDR?: number;
  billingInterval: 'monthly' | 'yearly';
  monthlyCredits: number;
  maxResolution: '480p' | '720p' | '1080p';
  maxDurationSeconds: 10 | 15 | 20 | 30;
  maxReferenceImages: number;
  allowReferenceImages: boolean;
  allowCharacterConsistency: boolean;
  queuePriority: 'STANDARD' | 'PRIORITY' | 'HIGHEST';
  multiSceneWorkspace: boolean;
  commercialUseEligible: boolean;
  concurrentJobs: number;
  maxStreamViewers: number;
  maxRoomParticipants: number;
  teamSeats: number;
  description: string;
  tagline?: string;
  features: string[];
  badge?: string;
  isPopular?: boolean;
  isActive: boolean;
  updatedAt?: string;
}

export interface SubscriptionHistoryEntry {
  id: string;
  planId: string;
  planTier: CanonicalTierId;
  planName: string;
  action: 'ACTIVATED' | 'UPGRADED' | 'DOWNGRADED' | 'RENEWED' | 'CANCELLED' | 'ADMIN_ASSIGNED' | 'EXPIRED';
  status: string;
  billingStatus: string;
  priceIdr: number;
  creditsAllocated: number;
  note?: string;
  createdAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  planTier: CanonicalTierId;
  tier?: CanonicalTierId;
  planName: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  billingStatus: 'FREE' | 'PAID' | 'PENDING_PAYMENT' | 'CANCELLED' | 'ADMIN_GRANTED';
  priceIdr: number;
  priceUsd: number;
  monthlyCredits: number;
  remainingMonthlyCredits: number;
  monthlyCreditsRemaining?: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  expiresAt: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  renewalDate: string;
  paymentProvider?: string;
  lastPaymentId?: string;
  limits?: PlanLimits;
  history: SubscriptionHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface CreditWalletBalance {
  userId: string;
  totalAvailable: number;
  totalCredits?: number;
  usedCredits: number;
  monthlySubscriptionCredits: number;
  monthlyCredits?: number;
  purchasedTopUpCredits: number;
  purchasedCredits?: number;
  subscriptionCreditExpiry?: string;
  monthlyExpiryDate?: string;
  purchasedCreditExpiry?: string;
  status: 'ACTIVE' | 'FROZEN';
  updatedAt: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceIdr: number;
  priceUsd: number;
  priceIDR?: number;
  validityDays: number;
  description: string;
  badge?: string;
  isPopular?: boolean;
  isActive?: boolean;
}

export type LedgerTransactionType =
  | 'SUBSCRIPTION_GRANT'
  | 'TOP_UP_PURCHASE'
  | 'GENERATION_DEDUCT'
  | 'GENERATION_REFUND'
  | 'VIRTUAL_GIFT_SEND'
  | 'VIRTUAL_GIFT_RECEIVE'
  | 'ADMIN_ADJUSTMENT'
  | 'EXPIRATION';

export interface CreditLedgerTransaction {
  id: string;
  userId: string;
  userEmail?: string;
  type: LedgerTransactionType;
  amount: number;
  balanceAfter: number;
  monthlyDeducted?: number;
  purchasedDeducted?: number;
  description: string;
  referenceId?: string;
  idempotencyKey?: string;
  jobId?: string;
  paymentMethod?: string;
  createdAt: string;
}

export type SeedanceResolution = '480p' | '720p' | '1080p';
export type Resolution = SeedanceResolution;
export type SeedanceDuration = 5 | 10 | 15 | 20 | 30;
export type DurationSeconds = SeedanceDuration;

export interface GenerationCostModelRule {
  modelKey: string;
  name: string;
  category: 'Video' | 'Motion / R2V' | 'Image' | 'Image Edit';
  baseCredits: number;
  perSecondCredits: number;
  enabled: boolean;
}

export interface GenerationCostConfig {
  id: string;
  baseByResolutionDuration: Record<string, number>;
  resolutionMultipliers: Record<'480p' | '720p' | '1080p', number>;
  qualityMultipliers: {
    standard: number;
    cinematic_complex_physics: number;
  };
  referenceImageSurchargePerExtraPlate: number;
  imageGenerationCosts: Record<string, number>;
  modelRules: Record<string, GenerationCostModelRule>;
  autoRefundOnFailure: boolean;
  unitValueIdr: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SeedanceCostCalculation {
  modelKey?: string;
  resolution: SeedanceResolution;
  duration: SeedanceDuration;
  referenceImagesCount: number;
  physicsPriority: boolean;
  quantity: number;
  baseCreditCost: number;
  qualitySurchargeCredits: number;
  referenceSurchargeCredits: number;
  perUnitCredits: number;
  totalCreditDeduction: number;
  retailPriceEquivalentIdr: number;
  estimatedApiCostUsd: number;
  estimatedApiCostIdr: number;
  estimatedGrossMarginPercent: number;
  isMarginWarning: boolean;
}

export interface SeedanceGenerationJob {
  id: string;
  userId: string;
  userEmail?: string;
  projectId?: string;
  shotId?: string;
  model?: string;
  mode: 'text-to-video' | 'image-to-video' | 'ref-video' | 'image';
  prompt: string;
  negativePrompt?: string;
  duration: SeedanceDuration;
  durationSeconds?: DurationSeconds;
  resolution: SeedanceResolution;
  aspectRatio: string;
  firstFrameImageUrl?: string;
  referenceImages: string[];
  physicsPriority?: boolean;
  contentRating?: 'standard' | '18+';
  vehicleLock?: {
    enabled: boolean;
    modelSpec: string;
    drivingSide: 'RHD' | 'LHD';
  };
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  progressPercent: number;
  progress?: number;
  stage?: string;
  statusMessage?: string;
  estimatedCredits: number;
  actualCreditsDeducted: number;
  refunded?: boolean;
  idempotencyKey?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  apiJobId?: string;
  errorMessage?: string;
  errorReason?: string;
  isPublic: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface BytePlusApiStock {
  id: string;
  packageName: string;
  totalTokensPurchased: number;
  tokensConsumed: number;
  tokensRemaining: number;
  expenditureUsd: number;
  currentBalanceUSD?: number;
  alertThresholdUSD?: number;
  purchaseDate: string;
  expirationDate: string;
  lowStockThresholdPercent: number;
  isLowStockWarning: boolean;
  updatedAt: string;
}

export interface PlatformFinancialAnalytics {
  totalRegisteredUsers: number;
  activeSubscribers: number;
  membershipDistribution: Record<string, number>;
  monthlyRecurringRevenueIdr: number;
  mrrIDR?: number;
  totalTopUpRevenueIdr: number;
  topUpRevenueIDR?: number;
  totalApiExpenditureUsd: number;
  totalBytePlusApiCostUSD?: number;
  totalApiExpenditureIdr: number;
  totalBytePlusApiCostIDR?: number;
  estimatedGrossProfitIdr: number;
  grossProfitIDR?: number;
  grossMarginPercent: number;
  totalGeneratedVideos: number;
  totalVideosGenerated?: number;
  totalCreditsConsumed?: number;
  totalCreditsRefunded?: number;
  resolutionBreakdown?: Record<string, number>;
  averageGenerationCostCredits: number;
  failedGenerationsCount: number;
  failedJobsRefunded?: number;
  failedGenerationRefundsIdr: number;
  totalRefundedCredits?: number;
  totalOutstandingCreditLiabilities: number;
  outstandingLiabilityCredits?: number;
  outstandingLiabilitiesIdr: number;
  outstandingLiabilityIDR?: number;
  apiStockRemainingTokens: number;
  isStockWarning: boolean;
  usdToIdrExchangeRate: number;
  usdToIdrRate?: number;
  activeLivestreamsCount?: number;
  activeRoomsCount?: number;
  paymentProviderConfigured?: boolean;
  geminiConfigured?: boolean;
  bytedanceConfigured?: boolean;
  updatedAt: string;
}

export interface CommunityVideoPost {
  id: string;
  userId: string;
  authorUsername: string;
  authorDisplayName: string;
  creatorName?: string;
  authorAvatar: string;
  authorTier: MembershipTier;
  title: string;
  description: string;
  prompt?: string;
  genre?: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  durationSeconds?: number;
  resolution: string;
  aspectRatio: string;
  seedancePrompt: string;
  tags: string[];
  likesCount: number;
  viewsCount: number;
  isFeatured?: boolean;
  isPublic: boolean;
  createdAt: string;
}

// ============================================================================
// PERSONAL AI AGENT & CREATIVE MEMORY
// ============================================================================

export type CreativeMemoryCategory =
  | 'character'
  | 'style'
  | 'storyline'
  | 'instruction'
  | 'prompt_history';

export interface AgentMemoryItem {
  id: string;
  userId: string;
  category: CreativeMemoryCategory;
  title: string;
  content: string;
  referenceImageUrls: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AgentActionMode =
  | 'chat'
  | 'improve_prompt'
  | 'generate_prompt'
  | 'continue_storyline'
  | 'analyze_reference';

export interface AgentWorkspaceContext {
  currentPrompt?: string;
  selectedModel?: string;
  aspectRatio?: string;
  resolution?: string;
  duration?: number;
  physicsPriority?: boolean;
  contentRating?: 'standard' | '18+';
  referenceImagesCount?: number;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actionMode?: AgentActionMode;
  suggestedPrompt?: string;
  suggestedDuration?: number;
  continuityWarnings?: string[];
  createdAt: string;
}

export interface AgentConversation {
  id: string;
  userId: string;
  title: string;
  messages: AgentChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// LIVESTREAMING
// ============================================================================

export type LivestreamVisibility = 'PUBLIC' | 'PRIVATE';

export interface LivestreamChatMessage {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  displayName: string;
  text: string;
  isHost: boolean;
  createdAt: string;
}

export interface LivestreamViewerInfo {
  userId: string;
  username: string;
  displayName: string;
  joinedAt: string;
  isMuted: boolean;
}

export interface LivestreamSession {
  id: string;
  hostUserId: string;
  hostUsername: string;
  hostDisplayName: string;
  hostAvatar: string;
  title: string;
  description: string;
  visibility: LivestreamVisibility;
  hasAccessCode?: boolean;
  allowedUserIds: string[];
  bannedUserIds: string[];
  mutedUserIds: string[];
  status: 'LIVE' | 'ENDED';
  viewerCount: number;
  activeViewerIds: string[];
  viewers?: LivestreamViewerInfo[];
  hasPublisherStream: boolean;
  groupId?: string;
  groupName?: string;
  groupVisibility?: GroupVisibility;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
}

// ============================================================================
// MULTIPLAYER CALL — LIVE ROOMS
// ============================================================================

export type LiveCallRoomVisibility = 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY';

export interface LiveCallParticipant {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: 'CREATOR' | 'PARTICIPANT';
  audioEnabled: boolean;
  videoEnabled: boolean;
  mutedByHost: boolean;
  joinedAt: string;
}

export interface LiveCallRoom {
  id: string;
  name: string;
  description: string;
  visibility: LiveCallRoomVisibility;
  creatorUserId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  inviteCode?: string;
  invitedUserIds: string[];
  bannedUserIds: string[];
  maxParticipants: number;
  locked: boolean;
  status: 'ACTIVE' | 'CLOSED';
  participants: LiveCallParticipant[];
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

// ============================================================================
// ADMIN DIRECTORY & AUDIT RECORDS
// ============================================================================

export interface PlatformUserRecord {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  role: 'USER' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  tier: CanonicalTierId;
  totalCredits: number;
  usedCredits: number;
  lastSeenAt: string;
  createdAt: string;
}

export interface PlatformAdminAuditEntry {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// COMMUNITY & GROUPS ECOSYSTEM
// ============================================================================

export type GroupVisibility = 'PUBLIC' | 'PRIVATE';
export type GroupJoinMode = 'OPEN' | 'APPROVAL_REQUIRED' | 'INVITE_ONLY';
export type GroupRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
export type GroupStatus = 'ACTIVE' | 'ARCHIVED' | 'SUSPENDED';
export type GroupPermissionLevel = 'EVERYONE' | 'MODERATORS_AND_ABOVE' | 'ADMINS_AND_ABOVE';

export interface GroupSettings {
  joinMode: GroupJoinMode;
  discoverableInSearch: boolean;
  whoCanPost: GroupPermissionLevel;
  whoCanInvite: GroupPermissionLevel;
  whoCanComment: 'EVERYONE' | 'MEMBERS_ONLY';
  whoCanStartLivestream: GroupPermissionLevel;
  requirePostApproval: boolean;
  allowWorkflowSharing: boolean;
  allowVirtualGifts: boolean;
  blockedKeywords: string[];
}

export interface CommunityGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  interests: string[];
  coverImageUrl: string;
  iconImageUrl: string;
  rulesText: string;
  visibility: GroupVisibility;
  status: GroupStatus;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  memberCount: number;
  postCount: number;
  engagementScore: number;
  settings: GroupSettings;
  suspendedReason?: string;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  viewerMembership?: {
    role: GroupRole;
    status: 'ACTIVE' | 'BANNED';
    joinedAt: string;
  } | null;
  viewerPendingRequest?: GroupJoinRequest | null;
}

export interface GroupMember {
  groupId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  role: GroupRole;
  status: 'ACTIVE' | 'BANNED';
  banReason?: string;
  joinedAt: string;
  updatedAt: string;
}

export interface GroupJoinRequest {
  id: string;
  groupId: string;
  groupName?: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  message: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupVisibility: GroupVisibility;
  groupCategory: string;
  groupCoverImageUrl?: string;
  inviterId: string;
  inviterUsername: string;
  inviterDisplayName: string;
  inviteeId: string;
  inviteeUsername?: string;
  inviteeEmail?: string;
  message?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
}

export type GroupPostType = 'IMAGE' | 'VIDEO' | 'WORKFLOW' | 'TEXT' | 'LIVESTREAM';
export type GroupPostStatus = 'PUBLISHED' | 'PENDING_APPROVAL' | 'REMOVED';
export type GroupPostReactionType = 'LIKE' | 'INSPIRE' | 'CINEMA' | 'RESPECT';

export interface SeedanceWorkflowSceneStep {
  step: number;
  title: string;
  cameraMovement?: string;
  prompt: string;
  durationSeconds?: number;
}

export interface SeedanceWorkflowAttachment {
  title: string;
  description: string;
  modelKey: string;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  resolution: '480p' | '720p' | '1080p';
  duration: number;
  physicsPriority: boolean;
  contentRating: 'standard' | '18+';
  referenceImages: string[];
  referenceVideos?: string[];
  sceneSequences: SeedanceWorkflowSceneStep[];
  attachments: Array<{ name: string; url: string; kind: string }>;
  resultVideoUrl?: string;
  resultThumbnailUrl?: string;
}

export interface GroupPost {
  id: string;
  groupId: string;
  groupName: string;
  groupVisibility: GroupVisibility;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorGroupRole: GroupRole;
  postType: GroupPostType;
  status: GroupPostStatus;
  title: string;
  body: string;
  tags: string[];
  mentions: string[];
  images: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  workflow?: SeedanceWorkflowAttachment;
  livestreamId?: string;
  isPinned: boolean;
  commentsDisabled: boolean;
  reactions: Record<string, GroupPostReactionType>;
  reactionCounts: Record<GroupPostReactionType, number>;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  importCount: number;
  giftTotalCredits: number;
  viewerReaction?: GroupPostReactionType | null;
  viewerSaved?: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupPostComment {
  id: string;
  groupId: string;
  postId: string;
  parentCommentId?: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatar: string;
  authorGroupRole: GroupRole;
  content: string;
  mentions: string[];
  likedBy: string[];
  likesCount: number;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupAnnouncement {
  id: string;
  groupId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  title: string;
  content: string;
  isPinned: boolean;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type GroupEventType =
  | 'MEETING'
  | 'CREATIVE_CHALLENGE'
  | 'LIVESTREAM_EVENT'
  | 'COMPETITION';

export interface GroupEvent {
  id: string;
  groupId: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  title: string;
  description: string;
  eventType: GroupEventType;
  startsAt: string;
  endsAt?: string;
  locationOrLink?: string;
  attendeeIds: string[];
  attendeeCount: number;
  viewerAttending?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupModerationLog {
  id: string;
  groupId: string;
  actorId: string;
  actorUsername: string;
  action: string;
  targetType: 'MEMBER' | 'POST' | 'COMMENT' | 'ANNOUNCEMENT' | 'EVENT' | 'SETTINGS' | 'GROUP';
  targetId: string;
  reason?: string;
  createdAt: string;
}

export type VirtualGiftCategory =
  | 'BASIC'
  | 'PREMIUM'
  | 'SPECIAL_ANIMATED'
  | 'EXCLUSIVE_EVENT';

export interface VirtualGiftItem {
  id: string;
  name: string;
  description: string;
  category: VirtualGiftCategory;
  creditPrice: number;
  iconKey: 'SPARK' | 'FLAME' | 'PRISM' | 'CROWN' | 'REEL' | 'ORB';
  animationStyle: 'PULSE' | 'RADIANT' | 'CINEMA_BURST' | 'SUPERNOVA';
  enabled: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface VirtualGiftTransaction {
  id: string;
  giftId: string;
  giftName: string;
  giftCategory: VirtualGiftCategory;
  iconKey: VirtualGiftItem['iconKey'];
  animationStyle: VirtualGiftItem['animationStyle'];
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  groupId?: string;
  groupName?: string;
  postId?: string;
  livestreamId?: string;
  creditCost: number;
  note?: string;
  idempotencyKey: string;
  createdAt: string;
}

export type CommunityNotificationType =
  | 'GROUP_INVITATION'
  | 'JOIN_APPROVED'
  | 'JOIN_REJECTED'
  | 'GROUP_ANNOUNCEMENT'
  | 'POST_COMMENT'
  | 'COMMENT_REPLY'
  | 'MENTION'
  | 'POST_REACTION'
  | 'MODERATION_ACTION'
  | 'GROUP_LIVESTREAM'
  | 'VIRTUAL_GIFT_RECEIVED'
  | 'ROLE_UPDATED'
  | 'CURATION_APPROVED'
  | 'CURATION_REJECTED'
  | 'CURATION_REVISION'
  | 'CURATION_COMMENT';

export interface CommunityNotification {
  id: string;
  recipientId: string;
  actorId?: string;
  actorUsername?: string;
  actorDisplayName?: string;
  type: CommunityNotificationType;
  title: string;
  body: string;
  isRead: boolean;
  deepLink: {
    section: 'group' | 'post' | 'invitations' | 'livestream' | 'gifts' | 'profile' | 'curated';
    groupId?: string;
    postId?: string;
    livestreamId?: string;
    userId?: string;
    creationId?: string;
    publishedId?: string;
  };
  createdAt: string;
}

export type CommunityReportTargetType =
  | 'POST'
  | 'COMMENT'
  | 'GROUP'
  | 'USER'
  | 'LIVESTREAM';

export type CommunityReportStatus = 'OPEN' | 'REVIEWED' | 'ACTION_TAKEN' | 'DISMISSED';

export interface CommunityReport {
  id: string;
  reporterId: string;
  reporterUsername: string;
  targetType: CommunityReportTargetType;
  targetId: string;
  groupId?: string;
  groupName?: string;
  targetSummary: string;
  reason: string;
  status: CommunityReportStatus;
  resolutionNote?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityCategory {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  sortOrder: number;
}

export interface CommunityPlatformPolicies {
  id: string;
  requireEmailVerificationToCreateGroup: boolean;
  maxGroupsPerUser: number;
  allowPrivateGroups: boolean;
  allowVirtualGifts: boolean;
  globalBlockedKeywords: string[];
  communityGuidelinesText: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CommunityUserProfile {
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  interests: string[];
  followerIds: string[];
  followingIds: string[];
  privacy: {
    showJoinedGroups: boolean;
    showReceivedGifts: boolean;
    showPosts: boolean;
  };
  restrictedFromCommunity?: boolean;
  restrictionReason?: string;
  createdAt: string;
  updatedAt: string;
}
