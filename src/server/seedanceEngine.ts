/**
 * VAIURE Labs — Seedance 2.5 Engine & Dynamic Pricing Adapter
 * Wraps the persistent seedancePlatformStore so all /api/labs/* and /api/ai/*
 * routes share one unified persistent wallet, subscription, dynamic cost matrix,
 * idempotency cache, and automatic failure-refund ledger.
 */

import {
  seedancePlatformStore,
  calculateDynamicGenerationCost,
  DEFAULT_CONFIGURABLE_PLANS,
  DEFAULT_CREDIT_PACKAGES,
  DEFAULT_GENERATION_COST_CONFIG,
  DEFAULT_USD_TO_IDR,
  RETAIL_PRICE_PER_CREDIT_IDR,
  normalizeTierId,
} from './seedancePlatformStore';
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

export {
  DEFAULT_USD_TO_IDR,
  RETAIL_PRICE_PER_CREDIT_IDR,
  DEFAULT_CONFIGURABLE_PLANS as DEFAULT_MEMBERSHIP_PLANS,
  DEFAULT_CREDIT_PACKAGES,
  DEFAULT_GENERATION_COST_CONFIG,
  normalizeTierId,
  calculateDynamicGenerationCost,
};

export function calculateSeedanceCost(
  resolution: SeedanceResolution,
  duration: SeedanceDuration | number,
  refImagesCount = 0,
  usdToIdrRate = DEFAULT_USD_TO_IDR,
  modelKey = 'seedance_25_15s',
  physicsPriority = true,
  quantity = 1
): SeedanceCostCalculation {
  const config = seedancePlatformStore.getCostConfig();
  return calculateDynamicGenerationCost(
    config,
    {
      modelKey,
      resolution,
      duration,
      referenceImagesCount: refImagesCount,
      physicsPriority,
      quantity,
    },
    usdToIdrRate
  );
}

class SeedancePlatformStateAdapter {
  private communityVideos: CommunityVideoPost[] = [];

  getPlans(includeInactive = false): MembershipPlan[] {
    return seedancePlatformStore.getPlans(includeInactive);
  }

  updatePlans(updatedPlans: MembershipPlan[]): void {
    seedancePlatformStore.replacePlans(updatedPlans);
  }

  getCostConfig(): GenerationCostConfig {
    return seedancePlatformStore.getCostConfig();
  }

  getPackages(): CreditPackage[] {
    return seedancePlatformStore.getPackages();
  }

  updatePackages(updatedPackages: CreditPackage[]): void {
    seedancePlatformStore.updatePackages(updatedPackages);
  }

  getOrCreateWallet(userId: string, userEmail = ''): CreditWalletBalance {
    return seedancePlatformStore.getOrCreateWallet(userId, userEmail);
  }

  getUserSubscription(userId: string, userEmail = ''): UserSubscription {
    return seedancePlatformStore.getUserSubscription(userId, userEmail);
  }

  updateUserSubscription(
    userId: string,
    tier: MembershipTier,
    userEmail = '',
    billingStatus: 'FREE' | 'PAID' | 'ADMIN_GRANTED' = 'FREE'
  ): { subscription: UserSubscription; wallet: CreditWalletBalance } {
    return seedancePlatformStore.activateSubscriptionTier({
      userId,
      userEmail,
      tier,
      billingStatus,
    });
  }

  cancelSubscription(userId: string): UserSubscription {
    return seedancePlatformStore.cancelSubscription(userId);
  }

  addTopUpCredits(
    userId: string,
    packageId: string,
    paymentMethod = 'STRIPE',
    paymentRef = ''
  ): { wallet: CreditWalletBalance; transaction: CreditLedgerTransaction } {
    return seedancePlatformStore.addTopUpCreditsVerified({
      userId,
      packageId,
      paymentMethod,
      paymentRef: paymentRef || `verified-${Date.now()}`,
    });
  }

  getTransactions(userId?: string): CreditLedgerTransaction[] {
    return seedancePlatformStore.getTransactions(userId);
  }

  deductCredits(
    userId: string,
    amount: number,
    description: string,
    jobId?: string,
    idempotencyKey?: string,
    userEmail?: string
  ) {
    return seedancePlatformStore.deductCreditsAtomic({
      userId,
      userEmail,
      amount,
      description,
      jobId,
      idempotencyKey,
    });
  }

  refundCredits(
    userId: string,
    amount: number,
    reason: string,
    jobId?: string
  ) {
    return seedancePlatformStore.refundCreditsIdempotent({
      userId,
      amount,
      reason,
      jobId,
    });
  }

  createJob(job: SeedanceGenerationJob): SeedanceGenerationJob {
    return seedancePlatformStore.createJob(job);
  }

  getJob(jobId: string): SeedanceGenerationJob | undefined {
    return seedancePlatformStore.getJob(jobId);
  }

  updateJob(
    jobId: string,
    updates: Partial<SeedanceGenerationJob>
  ): SeedanceGenerationJob | undefined {
    return seedancePlatformStore.updateJob(jobId, updates);
  }

  getUserJobs(userId: string): SeedanceGenerationJob[] {
    return seedancePlatformStore.getUserJobs(userId);
  }

  getCommunityVideos(): CommunityVideoPost[] {
    return this.communityVideos.filter((v) => v.isPublic);
  }

  publishToCommunity(video: CommunityVideoPost): CommunityVideoPost {
    this.communityVideos.unshift(video);
    return video;
  }

  likeCommunityVideo(videoId: string): number {
    const vid = this.communityVideos.find((v) => v.id === videoId);
    if (vid) {
      vid.likesCount += 1;
      return vid.likesCount;
    }
    return 0;
  }

  getApiStock(): BytePlusApiStock {
    return seedancePlatformStore.getApiStock();
  }

  recordApiStockPurchase(
    tokens: number,
    expenditureUsd: number,
    packageName: string
  ): BytePlusApiStock {
    return seedancePlatformStore.recordApiStockPurchase(tokens, expenditureUsd, packageName);
  }

  getFinancialAnalytics(usdToIdrRate = DEFAULT_USD_TO_IDR): PlatformFinancialAnalytics {
    return seedancePlatformStore.getFinancialAnalytics(usdToIdrRate);
  }
}

export const seedancePlatformState = new SeedancePlatformStateAdapter();
