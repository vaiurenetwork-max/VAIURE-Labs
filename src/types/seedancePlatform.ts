/**
 * VAIURE Labs — Seedance 2.5 Exclusive Community Platform
 * Type definitions for Membership Tiers, Credit Wallet, Top-Up Store,
 * Seedance 2.5 Video Generation Engine, Financial Analytics, and Community Showcase.
 */

export type MembershipTier = 'FREE' | 'STARTER' | 'CREATOR' | 'PRO' | 'STUDIO';

export interface MembershipPlan {
  id: string;
  tier: MembershipTier;
  name: string;
  priceIdr: number;
  priceIDR?: number;
  monthlyCredits: number;
  maxResolution: '480p' | '720p' | '1080p';
  allowReferenceImages: boolean;
  allowCharacterConsistency: boolean;
  queuePriority: 'STANDARD' | 'PRIORITY' | 'HIGHEST';
  multiSceneWorkspace: boolean;
  commercialUseEligible: boolean;
  teamSeats: number;
  description: string;
  tagline?: string;
  features: string[];
  badge?: string;
  isPopular?: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  userEmail: string;
  planTier: MembershipTier;
  tier?: MembershipTier;
  planName?: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  priceIdr: number;
  monthlyCredits: number;
  remainingMonthlyCredits: number;
  monthlyCreditsRemaining?: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  renewalDate: string;
  lastPaymentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditWalletBalance {
  userId: string;
  totalAvailable: number;
  totalCredits?: number;
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
  name: 'MINI' | 'CREATOR' | 'ADVANCED' | 'PRODUCTION' | string;
  credits: number;
  priceIdr: number;
  priceIDR?: number;
  validityDays: number; // default 90 days
  description: string;
  badge?: string;
  isPopular?: boolean;
}

export type LedgerTransactionType =
  | 'SUBSCRIPTION_GRANT'
  | 'TOP_UP_PURCHASE'
  | 'GENERATION_DEDUCT'
  | 'GENERATION_REFUND'
  | 'ADMIN_ADJUSTMENT'
  | 'EXPIRATION';

export interface CreditLedgerTransaction {
  id: string;
  userId: string;
  type: LedgerTransactionType;
  amount: number; // positive for addition, negative for deduction
  balanceAfter: number;
  monthlyDeducted?: number;
  purchasedDeducted?: number;
  description: string;
  referenceId?: string;
  jobId?: string;
  paymentMethod?: string;
  createdAt: string;
}

export type SeedanceResolution = '480p' | '720p' | '1080p';
export type Resolution = SeedanceResolution;
export type SeedanceDuration = 5 | 10 | 15 | 30;
export type DurationSeconds = SeedanceDuration;

export interface SeedanceGenerationSchedule {
  resolution: SeedanceResolution;
  durationSeconds: SeedanceDuration;
  creditCost: number;
  apiCostUsd: number;
}

export interface SeedanceGenerationJob {
  id: string;
  userId: string;
  userEmail?: string;
  projectId?: string;
  shotId?: string;
  mode: 'text-to-video' | 'image-to-video' | 'ref-video';
  prompt: string;
  negativePrompt?: string;
  duration: SeedanceDuration;
  durationSeconds?: DurationSeconds;
  resolution: SeedanceResolution;
  aspectRatio: '16:9' | '9:16' | '1:1' | '2.39:1';
  firstFrameImageUrl?: string;
  referenceImages: string[];
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
  membershipDistribution: Record<MembershipTier, number>;
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

export interface SeedanceCostCalculation {
  resolution: SeedanceResolution;
  duration: SeedanceDuration;
  referenceImagesCount: number;
  baseCreditCost: number;
  referenceSurchargeCredits: number;
  totalCreditDeduction: number;
  retailPriceEquivalentIdr: number;
  estimatedApiCostUsd: number;
  estimatedApiCostIdr: number;
  estimatedGrossMarginPercent: number;
  isMarginWarning: boolean;
}
