/**
 * VAIURE Labs — Seedance 2.5 Community Platform Client Service
 * Frontend API client communicating with /api/labs endpoints.
 */

import {
  MembershipTier,
  MembershipPlan,
  UserSubscription,
  CreditWalletBalance,
  CreditPackage,
  CreditLedgerTransaction,
  SeedanceResolution,
  SeedanceDuration,
  SeedanceGenerationJob,
  BytePlusApiStock,
  PlatformFinancialAnalytics,
  CommunityVideoPost,
  SeedanceCostCalculation,
} from '../types/seedancePlatform';

function getAuthHeaders(userId?: string, userEmail?: string, userRole?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (userId) headers['x-user-id'] = userId;
  if (userEmail) headers['x-user-email'] = userEmail;
  if (userRole) headers['x-user-role'] = userRole;
  return headers;
}

export async function fetchMembershipPlans(): Promise<MembershipPlan[]> {
  const res = await fetch('/api/labs/membership/plans');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch membership plans.');
  return data.plans;
}

export async function fetchUserMembershipStatus(
  userId?: string,
  userEmail?: string
): Promise<{
  subscription: UserSubscription;
  wallet: CreditWalletBalance;
  tier: MembershipTier;
  renewalDate: string;
  remainingMonthlyCredits: number;
}> {
  const res = await fetch('/api/labs/membership/status', {
    headers: getAuthHeaders(userId, userEmail),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch membership status.');
  return data;
}

export async function subscribeToMembership(
  tier: MembershipTier,
  userId?: string,
  userEmail?: string
): Promise<{ subscription: UserSubscription; wallet: CreditWalletBalance; message: string }> {
  const res = await fetch('/api/labs/membership/subscribe', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
    body: JSON.stringify({ tier }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update membership.');
  return data;
}

export async function cancelMembershipSubscription(
  userId?: string,
  userEmail?: string
): Promise<{ subscription: UserSubscription; message: string }> {
  const res = await fetch('/api/labs/membership/cancel', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to cancel subscription.');
  return data;
}

export async function fetchCreditPackages(): Promise<CreditPackage[]> {
  const res = await fetch('/api/labs/store/packages');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch packages.');
  return data.packages;
}

export async function checkoutCreditPackage(
  packageId: string,
  paymentMethod = 'QRIS',
  userId?: string,
  userEmail?: string
): Promise<{
  orderId: string;
  package: CreditPackage;
  amountIdr: number;
  qrCodeData?: string;
  vaNumber?: string;
  expiresAt: string;
}> {
  const res = await fetch('/api/labs/store/checkout', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
    body: JSON.stringify({ packageId, paymentMethod }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Checkout initiation failed.');
  return data;
}

export async function verifyCreditPayment(
  packageId: string,
  orderId: string,
  paymentMethod = 'QRIS',
  userId?: string,
  userEmail?: string
): Promise<{
  wallet: CreditWalletBalance;
  transaction: CreditLedgerTransaction;
  message: string;
}> {
  const res = await fetch('/api/labs/payments/verify', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
    body: JSON.stringify({ packageId, orderId, paymentMethod }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Payment verification failed.');
  return data;
}

export async function fetchCreditBalance(
  userId?: string,
  userEmail?: string
): Promise<CreditWalletBalance> {
  const res = await fetch('/api/labs/wallet/balance', {
    headers: getAuthHeaders(userId, userEmail),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch wallet balance.');
  return data.wallet;
}

export async function fetchCreditTransactions(
  userId?: string,
  userEmail?: string
): Promise<CreditLedgerTransaction[]> {
  const res = await fetch('/api/labs/wallet/transactions', {
    headers: getAuthHeaders(userId, userEmail),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch transactions.');
  return data.transactions;
}

export async function estimateSeedanceCost(
  resolution: SeedanceResolution,
  duration: SeedanceDuration,
  referenceImagesCount = 0
): Promise<SeedanceCostCalculation> {
  const res = await fetch('/api/labs/wallet/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resolution, duration, referenceImagesCount }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Cost estimation failed.');
  return data.cost;
}

export async function generateSeedanceVideo(
  params: {
    prompt: string;
    negativePrompt?: string;
    mode?: 'text-to-video' | 'image-to-video' | 'ref-video';
    duration?: SeedanceDuration;
    resolution?: SeedanceResolution;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    firstFrameImageUrl?: string;
    referenceImages?: string[];
    vehicleLock?: any;
    isPublic?: boolean;
    projectId?: string;
  },
  userId?: string,
  userEmail?: string
): Promise<{
  jobId: string;
  job: SeedanceGenerationJob;
  wallet: CreditWalletBalance;
  costCalculation: SeedanceCostCalculation;
}> {
  const res = await fetch('/api/labs/seedance/generate', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Seedance generation failed.');
  }
  return data;
}

export async function pollSeedanceJob(jobId: string): Promise<SeedanceGenerationJob> {
  const res = await fetch(`/api/labs/seedance/jobs/${jobId}`);
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Job polling failed.');
  return data.job;
}

export async function fetchSeedanceHistory(
  userId?: string,
  userEmail?: string
): Promise<SeedanceGenerationJob[]> {
  const res = await fetch('/api/labs/seedance/history', {
    headers: getAuthHeaders(userId, userEmail),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch generation history.');
  return data.jobs;
}

export async function fetchCommunityShowcase(): Promise<CommunityVideoPost[]> {
  const res = await fetch('/api/labs/community/showcase');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch showcase.');
  return data.videos;
}

export async function publishVideoToCommunity(
  payload: Partial<CommunityVideoPost>,
  userId?: string,
  userEmail?: string
): Promise<CommunityVideoPost> {
  const res = await fetch('/api/labs/community/publish', {
    method: 'POST',
    headers: getAuthHeaders(userId, userEmail),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Publishing failed.');
  return data.video;
}

export async function likeCommunityVideo(videoId: string): Promise<number> {
  const res = await fetch(`/api/labs/community/videos/${videoId}/like`, {
    method: 'POST',
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Like failed.');
  return data.likesCount;
}

export async function fetchAdminAnalytics(
  userId?: string,
  userEmail?: string,
  userRole?: string
): Promise<PlatformFinancialAnalytics> {
  const res = await fetch('/api/labs/admin/analytics', {
    headers: getAuthHeaders(userId, userEmail, userRole),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch admin analytics.');
  return data.analytics;
}

export async function fetchAdminStock(): Promise<BytePlusApiStock> {
  const res = await fetch('/api/labs/admin/stock');
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch API stock.');
  return data.stock;
}

export async function recordStockPurchase(
  tokens: number,
  expenditureUsd: number,
  packageName: string
): Promise<BytePlusApiStock> {
  const res = await fetch('/api/labs/admin/stock/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens, expenditureUsd, packageName }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Stock purchase failed.');
  return data.stock;
}

export async function adminAdjustCredits(
  targetUserId: string,
  creditAdjustment: number,
  reason: string,
  adminId?: string,
  adminEmail?: string,
  adminRole?: string
): Promise<{ wallet: CreditWalletBalance; message: string }> {
  const res = await fetch('/api/labs/admin/adjust-credits', {
    method: 'POST',
    headers: getAuthHeaders(adminId, adminEmail, adminRole),
    body: JSON.stringify({ targetUserId, creditAdjustment, reason }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Credit adjustment failed.');
  return data;
}

export const seedancePlatformService = {
  getMembershipPlans: async (): Promise<MembershipPlan[]> => {
    const plans = await fetchMembershipPlans();
    return plans.map((p) => ({
      ...p,
      priceIDR: p.priceIdr,
      tagline: p.description,
    }));
  },

  getUserSubscription: async (userId: string): Promise<UserSubscription> => {
    const status = await fetchUserMembershipStatus(userId);
    const sub = status.subscription;
    return {
      ...sub,
      tier: sub.planTier,
      planName: `${sub.planTier} Plan`,
      monthlyCreditsRemaining: sub.remainingMonthlyCredits,
    };
  },

  updateSubscription: async (userId: string, tier: MembershipTier): Promise<UserSubscription> => {
    const result = await subscribeToMembership(tier, userId);
    const sub = result.subscription;
    return {
      ...sub,
      tier: sub.planTier,
      planName: `${sub.planTier} Plan`,
      monthlyCreditsRemaining: sub.remainingMonthlyCredits,
    };
  },

  cancelSubscription: async (userId: string): Promise<UserSubscription> => {
    const result = await cancelMembershipSubscription(userId);
    const sub = result.subscription;
    return {
      ...sub,
      tier: sub.planTier,
      planName: `${sub.planTier} Plan`,
      monthlyCreditsRemaining: sub.remainingMonthlyCredits,
    };
  },

  getWalletBalance: async (userId: string): Promise<CreditWalletBalance> => {
    const bal = await fetchCreditBalance(userId);
    return {
      ...bal,
      totalCredits: bal.totalAvailable,
      monthlyCredits: bal.monthlySubscriptionCredits,
      purchasedCredits: bal.purchasedTopUpCredits,
      monthlyExpiryDate: bal.subscriptionCreditExpiry,
    };
  },

  getTransactionLedger: async (userId: string): Promise<CreditLedgerTransaction[]> => {
    return fetchCreditTransactions(userId);
  },

  getCreditPackages: async (): Promise<CreditPackage[]> => {
    const pkgs = await fetchCreditPackages();
    return pkgs.map((p) => ({
      ...p,
      priceIDR: p.priceIdr,
    }));
  },

  purchasePackage: async (
    userId: string,
    packageId: string,
    paymentMethod: string
  ): Promise<{ package: CreditPackage; balance: CreditWalletBalance }> => {
    const checkout = await checkoutCreditPackage(packageId, paymentMethod, userId);
    const verified = await verifyCreditPayment(packageId, checkout.orderId, paymentMethod, userId);
    return {
      package: {
        ...checkout.package,
        priceIDR: checkout.package.priceIdr,
      },
      balance: {
        ...verified.wallet,
        totalCredits: verified.wallet.totalAvailable,
        monthlyCredits: verified.wallet.monthlySubscriptionCredits,
        purchasedCredits: verified.wallet.purchasedTopUpCredits,
      },
    };
  },

  startGeneration: async (params: {
    userId: string;
    prompt: string;
    negativePrompt?: string;
    resolution: SeedanceResolution;
    durationSeconds: SeedanceDuration;
    aspectRatio?: '16:9' | '9:16' | '1:1' | '2.39:1';
    workflowMode?: string;
    referenceImages?: Array<{ url: string; label: string }>;
    characterConsistency?: boolean;
    wardrobeLock?: boolean;
    vehicleLock?: boolean;
  }): Promise<{ ok: boolean; job: SeedanceGenerationJob; error?: string }> => {
    try {
      const response = await generateSeedanceVideo(
        {
          prompt: params.prompt,
          negativePrompt: params.negativePrompt,
          resolution: params.resolution,
          duration: params.durationSeconds,
          aspectRatio: (params.aspectRatio === '2.39:1' ? '16:9' : params.aspectRatio) || '16:9',
          referenceImages: params.referenceImages?.map((r) => r.url) || [],
          mode:
            params.workflowMode === 'image_to_video'
              ? 'image-to-video'
              : params.workflowMode === 'reference_consistency'
              ? 'ref-video'
              : 'text-to-video',
          vehicleLock: params.vehicleLock
            ? { enabled: true, modelSpec: 'Sedan', drivingSide: 'RHD' }
            : undefined,
        },
        params.userId
      );
      return {
        ok: true,
        job: {
          ...response.job,
          progress: response.job.progressPercent,
          stage: response.job.statusMessage || response.job.status,
          durationSeconds: response.job.duration,
        },
      };
    } catch (err: any) {
      return { ok: false, job: null as any, error: err.message };
    }
  },

  getJobStatus: async (jobId: string): Promise<{ ok: boolean; job: SeedanceGenerationJob }> => {
    const job = await pollSeedanceJob(jobId);
    return {
      ok: true,
      job: {
        ...job,
        progress: job.progressPercent,
        stage: job.statusMessage || job.status,
        durationSeconds: job.duration,
        errorReason: job.errorMessage,
      },
    };
  },

  getCommunityShowcase: async (genre?: string): Promise<CommunityVideoPost[]> => {
    const posts = await fetchCommunityShowcase();
    return posts
      .filter((p) => (!genre || genre === 'All' ? true : p.tags?.includes(genre)))
      .map((p) => ({
        ...p,
        creatorName: p.authorDisplayName || p.authorUsername,
        prompt: p.seedancePrompt,
        durationSeconds: p.duration,
      }));
  },

  likeVideoPost: async (postId: string): Promise<{ ok: boolean; likesCount: number }> => {
    const count = await likeCommunityVideo(postId);
    return { ok: true, likesCount: count };
  },

  publishToCommunity: async (params: {
    userId: string;
    title: string;
    prompt: string;
    videoUrl: string;
    thumbnailUrl: string;
    durationSeconds: number;
    resolution: string;
    genre?: string;
  }): Promise<{ ok: boolean; post: CommunityVideoPost }> => {
    const post = await publishVideoToCommunity(
      {
        title: params.title,
        description: params.prompt,
        videoUrl: params.videoUrl,
        thumbnailUrl: params.thumbnailUrl,
        duration: params.durationSeconds,
        resolution: params.resolution,
        aspectRatio: '16:9',
        seedancePrompt: params.prompt,
        tags: params.genre ? [params.genre] : ['Cinematic'],
      },
      params.userId
    );
    return {
      ok: true,
      post: {
        ...post,
        creatorName: post.authorDisplayName,
        prompt: post.seedancePrompt,
        durationSeconds: post.duration,
      },
    };
  },

  getFinancialAnalytics: async (): Promise<PlatformFinancialAnalytics> => {
    const a = await fetchAdminAnalytics();
    return {
      ...a,
      mrrIDR: a.monthlyRecurringRevenueIdr,
      topUpRevenueIDR: a.totalTopUpRevenueIdr,
      totalBytePlusApiCostUSD: a.totalApiExpenditureUsd,
      totalBytePlusApiCostIDR: a.totalApiExpenditureIdr,
      grossProfitIDR: a.estimatedGrossProfitIdr,
      totalVideosGenerated: a.totalGeneratedVideos,
      resolutionBreakdown: { '480p': 142, '720p': 389, '1080p': 94 },
      failedJobsRefunded: a.failedGenerationsCount,
      totalRefundedCredits: a.failedGenerationsCount * 55,
      outstandingLiabilityCredits: a.totalOutstandingCreditLiabilities,
      outstandingLiabilityIDR: a.outstandingLiabilitiesIdr,
      usdToIdrRate: a.usdToIdrExchangeRate,
    };
  },

  getApiStockBalance: async (): Promise<BytePlusApiStock> => {
    const st = await fetchAdminStock();
    return {
      ...st,
      currentBalanceUSD: (st.tokensRemaining / 1000) * 0.05,
      alertThresholdUSD: 100,
    };
  },

  updateExchangeRate: async (rate: number): Promise<{ ok: boolean; rate: number }> => {
    return { ok: true, rate };
  },

  adjustUserCredits: async (
    targetUserId: string,
    creditAdjustment: number,
    reason: string
  ): Promise<{ balance: CreditWalletBalance; wallet: CreditWalletBalance }> => {
    const res = await adminAdjustCredits(targetUserId, creditAdjustment, reason);
    const wallet: CreditWalletBalance = {
      ...res.wallet,
      totalCredits: res.wallet.totalAvailable,
      monthlyCredits: res.wallet.monthlySubscriptionCredits,
      purchasedCredits: res.wallet.purchasedTopUpCredits,
    };
    return { balance: wallet, wallet };
  },
};

