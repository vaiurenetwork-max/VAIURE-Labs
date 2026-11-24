/**
 * VAIURE Labs — Seedance 2.5 Community Platform Client Service
 * Communicates with /api/labs/* using verified Firebase Bearer tokens.
 * Never spoofs user identity headers or simulates paid checkouts without backend verification.
 */

import { getAuthHeaders } from './authTokenHelper';
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
  GenerationCostConfig,
} from '../types/seedancePlatform';

export class PlatformRequestError extends Error {
  status: number;
  code?: string;
  paymentProviderConfigured?: boolean;
  constructor(message: string, status: number, code?: string, paymentProviderConfigured?: boolean) {
    super(message);
    this.status = status;
    this.code = code;
    this.paymentProviderConfigured = paymentProviderConfigured;
  }
}

async function parseResponse<T = any>(res: Response, fallbackMsg: string): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new PlatformRequestError(
      data.error || fallbackMsg,
      res.status,
      data.code,
      data.paymentProviderConfigured
    );
  }
  return data as T;
}

export async function fetchMembershipPlans(): Promise<{
  plans: MembershipPlan[];
  paymentProviderConfigured: boolean;
  paymentProvider: string | null;
}> {
  const res = await fetch('/api/labs/membership/plans');
  return parseResponse(res, 'Failed to fetch membership plans.');
}

export async function fetchGenerationCostConfig(): Promise<GenerationCostConfig> {
  const res = await fetch('/api/labs/cost-config');
  const data = await parseResponse<{ ok: true; costConfig: GenerationCostConfig }>(
    res,
    'Failed to fetch generation cost config.'
  );
  return data.costConfig;
}

export async function fetchUserMembershipStatus(): Promise<{
  subscription: UserSubscription;
  wallet: CreditWalletBalance;
  tier: MembershipTier;
  renewalDate: string;
  expiresAt: string;
  autoRenew: boolean;
  remainingMonthlyCredits: number;
  paymentProviderConfigured: boolean;
  paymentProvider: string | null;
}> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/membership/status', { headers });
  return parseResponse(res, 'Failed to fetch membership status.');
}

export async function subscribeToMembership(
  tier: MembershipTier,
  returnUrl?: string
): Promise<{
  activated: boolean;
  requiresCheckout?: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  subscription?: UserSubscription;
  wallet?: CreditWalletBalance;
  message: string;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/membership/subscribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tier, returnUrl: returnUrl || window.location.origin }),
  });
  return parseResponse(res, 'Failed to update membership plan.');
}

export async function toggleMembershipAutoRenew(autoRenew: boolean): Promise<{
  subscription: UserSubscription;
  message: string;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/membership/auto-renew', {
    method: 'POST',
    headers,
    body: JSON.stringify({ autoRenew }),
  });
  return parseResponse(res, 'Failed to update auto-renewal preference.');
}

export async function cancelMembershipSubscription(): Promise<{
  subscription: UserSubscription;
  message: string;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/membership/cancel', {
    method: 'POST',
    headers,
  });
  return parseResponse(res, 'Failed to cancel subscription.');
}

export async function fetchCreditPackages(): Promise<{
  packages: CreditPackage[];
  paymentProviderConfigured: boolean;
  paymentProvider: string | null;
}> {
  const res = await fetch('/api/labs/store/packages');
  return parseResponse(res, 'Failed to fetch credit packages.');
}

export async function initiateCreditPackageCheckout(
  packageId: string,
  returnUrl?: string
): Promise<{
  sessionId: string;
  checkoutUrl: string;
  package: CreditPackage;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/store/checkout', {
    method: 'POST',
    headers,
    body: JSON.stringify({ packageId, returnUrl: returnUrl || window.location.origin }),
  });
  return parseResponse(res, 'Checkout initiation failed.');
}

export async function verifyStripeCheckoutSession(sessionId: string): Promise<{
  subscription?: UserSubscription;
  wallet: CreditWalletBalance;
  transaction?: CreditLedgerTransaction;
  message: string;
}> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/payments/verify', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId }),
  });
  return parseResponse(res, 'Payment verification failed.');
}

export async function fetchCreditBalance(): Promise<CreditWalletBalance> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/wallet/balance', { headers });
  const data = await parseResponse<{ ok: true; wallet: CreditWalletBalance }>(
    res,
    'Failed to fetch wallet balance.'
  );
  return data.wallet;
}

export async function fetchCreditTransactions(): Promise<CreditLedgerTransaction[]> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/wallet/transactions', { headers });
  const data = await parseResponse<{ ok: true; transactions: CreditLedgerTransaction[] }>(
    res,
    'Failed to fetch transactions.'
  );
  return data.transactions;
}

export async function estimateSeedanceCost(params: {
  model?: string;
  resolution?: SeedanceResolution;
  duration?: SeedanceDuration | number;
  referenceImagesCount?: number;
  physicsPriority?: boolean;
  quantity?: number;
}): Promise<SeedanceCostCalculation> {
  const res = await fetch('/api/labs/wallet/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: params.model || 'seedance_25_15s',
      resolution: params.resolution || '720p',
      duration: params.duration || 15,
      referenceImagesCount: params.referenceImagesCount || 0,
      physicsPriority: params.physicsPriority !== false,
      quantity: params.quantity || 1,
    }),
  });
  const data = await parseResponse<{ ok: true; cost: SeedanceCostCalculation }>(
    res,
    'Cost estimation failed.'
  );
  return data.cost;
}

export async function generateSeedanceVideo(params: {
  prompt: string;
  negativePrompt?: string;
  mode?: 'text-to-video' | 'image-to-video' | 'ref-video';
  duration?: SeedanceDuration;
  resolution?: SeedanceResolution;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  firstFrameImageUrl?: string;
  referenceImages?: string[];
  physicsPriority?: boolean;
  quantity?: number;
  vehicleLock?: any;
  isPublic?: boolean;
  projectId?: string;
  idempotencyKey?: string;
}): Promise<{
  jobId: string;
  job: SeedanceGenerationJob;
  wallet: CreditWalletBalance;
  costCalculation: SeedanceCostCalculation;
}> {
  const headers = await getAuthHeaders(true);
  if (params.idempotencyKey) {
    headers['X-Idempotency-Key'] = params.idempotencyKey;
  }
  const res = await fetch('/api/labs/seedance/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  return parseResponse(res, 'Seedance generation failed.');
}

export async function pollSeedanceJob(jobId: string): Promise<SeedanceGenerationJob> {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`/api/labs/seedance/jobs/${encodeURIComponent(jobId)}`, { headers });
  const data = await parseResponse<{ ok: true; job: SeedanceGenerationJob }>(
    res,
    'Job polling failed.'
  );
  return data.job;
}

export async function fetchSeedanceHistory(): Promise<SeedanceGenerationJob[]> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/seedance/history', { headers });
  const data = await parseResponse<{ ok: true; jobs: SeedanceGenerationJob[] }>(
    res,
    'Failed to fetch generation history.'
  );
  return data.jobs;
}

export async function fetchCommunityShowcase(): Promise<CommunityVideoPost[]> {
  const res = await fetch('/api/labs/community/showcase');
  const data = await parseResponse<{ ok: true; videos: CommunityVideoPost[] }>(
    res,
    'Failed to fetch showcase.'
  );
  return data.videos;
}

export async function publishVideoToCommunity(
  payload: Partial<CommunityVideoPost>
): Promise<CommunityVideoPost> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/community/publish', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<{ ok: true; video: CommunityVideoPost }>(
    res,
    'Publishing failed.'
  );
  return data.video;
}

export async function likeCommunityVideo(videoId: string): Promise<number> {
  const headers = await getAuthHeaders(false);
  const res = await fetch(`/api/labs/community/videos/${encodeURIComponent(videoId)}/like`, {
    method: 'POST',
    headers,
  });
  const data = await parseResponse<{ ok: true; likesCount: number }>(res, 'Like failed.');
  return data.likesCount;
}

export async function fetchAdminAnalytics(): Promise<PlatformFinancialAnalytics> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/admin/analytics', { headers });
  const data = await parseResponse<{ ok: true; analytics: PlatformFinancialAnalytics }>(
    res,
    'Failed to fetch admin analytics.'
  );
  return data.analytics;
}

export async function fetchAdminStock(): Promise<BytePlusApiStock> {
  const headers = await getAuthHeaders(false);
  const res = await fetch('/api/labs/admin/stock', { headers });
  const data = await parseResponse<{ ok: true; stock: BytePlusApiStock }>(
    res,
    'Failed to fetch API stock.'
  );
  return data.stock;
}

export async function recordStockPurchase(
  tokens: number,
  expenditureUsd: number,
  packageName: string
): Promise<BytePlusApiStock> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/admin/stock/purchase', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tokens, expenditureUsd, packageName }),
  });
  const data = await parseResponse<{ ok: true; stock: BytePlusApiStock }>(
    res,
    'Stock purchase failed.'
  );
  return data.stock;
}

export async function adminAdjustCredits(
  targetUserId: string,
  creditAdjustment: number,
  reason: string
): Promise<{ wallet: CreditWalletBalance; message: string }> {
  const headers = await getAuthHeaders(true);
  const res = await fetch('/api/labs/admin/adjust-credits', {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetUserId, creditAdjustment, reason }),
  });
  return parseResponse(res, 'Credit adjustment failed.');
}

export const seedancePlatformService = {
  getMembershipPlans: async (): Promise<MembershipPlan[]> => {
    const res = await fetchMembershipPlans();
    return res.plans;
  },
  getUserSubscription: async (): Promise<UserSubscription> => {
    const status = await fetchUserMembershipStatus();
    return status.subscription;
  },
  updateSubscription: subscribeToMembership,
  toggleAutoRenew: toggleMembershipAutoRenew,
  cancelSubscription: cancelMembershipSubscription,
  getWalletBalance: fetchCreditBalance,
  getTransactionLedger: fetchCreditTransactions,
  getCreditPackages: async (): Promise<CreditPackage[]> => {
    const res = await fetchCreditPackages();
    return res.packages;
  },
  initiateCheckout: initiateCreditPackageCheckout,
  verifyStripeSession: verifyStripeCheckoutSession,
  getCostConfig: fetchGenerationCostConfig,
  estimateCost: estimateSeedanceCost,
  startGeneration: generateSeedanceVideo,
  getJobStatus: pollSeedanceJob,
  getHistory: fetchSeedanceHistory,
  getCommunityShowcase: fetchCommunityShowcase,
  likeVideoPost: likeCommunityVideo,
  publishToCommunity: publishVideoToCommunity,
  getFinancialAnalytics: fetchAdminAnalytics,
  getApiStockBalance: fetchAdminStock,
  recordStockPurchase,
  adjustUserCredits: adminAdjustCredits,
};
