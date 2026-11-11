/**
 * VAIURE Labs — Seedance 2.5 Engine & Fintech Pricing Logic
 * Server-side centralized wallet management, credit deduction, atomic refunding,
 * BytePlus Seedance 2.5 adapter, and financial analytics calculator.
 */

import crypto from 'crypto';
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

// Default USD to IDR rate
export const DEFAULT_USD_TO_IDR = 16200;
// Retail price reference: 1 credit = Rp 600
export const RETAIL_PRICE_PER_CREDIT_IDR = 600;

export const DEFAULT_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'plan-free',
    tier: 'FREE',
    name: 'Free',
    priceIdr: 0,
    monthlyCredits: 20, // 20 welcome credits one-time
    maxResolution: '480p',
    allowReferenceImages: false,
    allowCharacterConsistency: false,
    queuePriority: 'STANDARD',
    multiSceneWorkspace: false,
    commercialUseEligible: false,
    teamSeats: 1,
    description: 'Explore the VAIURE AI film ecosystem with welcome preview credits.',
    features: [
      '20 Welcome credits (one-time)',
      'Basic Seedance prompt builder',
      'Community showcase access',
      'Standard generation queue',
      'Watermarked preview exports',
    ],
  },
  {
    id: 'plan-starter',
    tier: 'STARTER',
    name: 'Starter',
    priceIdr: 49000,
    monthlyCredits: 100,
    maxResolution: '480p',
    allowReferenceImages: false,
    allowCharacterConsistency: false,
    queuePriority: 'STANDARD',
    multiSceneWorkspace: false,
    commercialUseEligible: false,
    teamSeats: 1,
    description: 'Essential indie toolkit for creators starting their AI film journey.',
    features: [
      '100 Monthly generation credits',
      'Official Seedance 2.5 access',
      '480p generation @ 24fps',
      'Standard render queue',
      'Personal project library',
      'Top-up credit store access',
    ],
  },
  {
    id: 'plan-creator',
    tier: 'CREATOR',
    name: 'Creator',
    priceIdr: 149000,
    monthlyCredits: 350,
    maxResolution: '720p',
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'PRIORITY',
    multiSceneWorkspace: false,
    commercialUseEligible: false,
    teamSeats: 1,
    isPopular: true,
    badge: 'RECOMMENDED',
    description: 'High-definition cinematic workflows with multi-reference character locks.',
    features: [
      '350 Monthly generation credits',
      '480p & 720p HD options',
      'Reference-image generation (up to 9 plates)',
      'Character consistency & wardrobe lock',
      'Priority generation queue',
      'Advanced prompt architect & timeline',
      'Full project history & analytics',
    ],
  },
  {
    id: 'plan-pro',
    tier: 'PRO',
    name: 'Pro Filmmaker',
    priceIdr: 349000,
    monthlyCredits: 900,
    maxResolution: '1080p',
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'PRIORITY',
    multiSceneWorkspace: true,
    commercialUseEligible: true,
    teamSeats: 1,
    badge: 'STUDIO GRADE',
    description: 'Full 1080p cinema mastery with commercial exports and multi-scene sequences.',
    features: [
      '900 Monthly generation credits',
      'Full 1080p Cinema resolution',
      'All Creator features included',
      'High-priority generation queue',
      'Advanced multi-scene project workspace',
      'Vehicle LHD/RHD continuity lock',
      'Extended cloud storage',
      'Commercial-use export license',
    ],
  },
  {
    id: 'plan-studio',
    tier: 'STUDIO',
    name: 'Studio',
    priceIdr: 799000,
    monthlyCredits: 2200,
    maxResolution: '1080p',
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'HIGHEST',
    multiSceneWorkspace: true,
    commercialUseEligible: true,
    teamSeats: 5,
    badge: 'TEAM & AGENCY',
    description: 'Complete multi-user production house for agencies, film crews, and studios.',
    features: [
      '2,200 Monthly generation credits',
      'Team workspace (up to 5 creator seats)',
      'Shared project library & co-direction',
      'Highest queue priority (Instant burst)',
      'Advanced generation & seed locks',
      'Discounted bulk credit additions',
      'Dedicated concierge support',
    ],
  },
];

export const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg-mini',
    name: 'MINI',
    credits: 50,
    priceIdr: 29000,
    validityDays: 90,
    description: 'Quick top-up for 1–2 high-definition test sequences.',
  },
  {
    id: 'pkg-creator',
    name: 'CREATOR',
    credits: 150,
    priceIdr: 79000,
    validityDays: 90,
    isPopular: true,
    badge: 'POPULAR',
    description: 'Ideal package for completing an episodic short film.',
  },
  {
    id: 'pkg-advanced',
    name: 'ADVANCED',
    credits: 400,
    priceIdr: 199000,
    validityDays: 90,
    description: 'Substantial credit reservoir for multi-shot narrative projects.',
  },
  {
    id: 'pkg-production',
    name: 'PRODUCTION',
    credits: 1000,
    priceIdr: 479000,
    validityDays: 90,
    badge: 'BEST VALUE',
    description: 'Heavy production allocation for commercial & cinematic campaigns.',
  },
];

// Proposed Generation Schedule (Credit deductions)
export const SEEDANCE_SCHEDULE_MAP: Record<string, number> = {
  '480p-5': 25,
  '480p-10': 50,
  '480p-15': 75,
  '480p-30': 150,
  '720p-5': 55,
  '720p-10': 110,
  '720p-15': 165,
  '720p-30': 330,
  '1080p-5': 135,
  '1080p-10': 270,
  '1080p-15': 405,
  '1080p-30': 810,
};

// Upstream BytePlus Estimated Cost in USD per second
const UPSTREAM_API_COST_PER_SEC_USD: Record<SeedanceResolution, number> = {
  '480p': 0.007,
  '720p': 0.018,
  '1080p': 0.045,
};

export function calculateSeedanceCost(
  resolution: SeedanceResolution,
  duration: SeedanceDuration,
  refImagesCount = 0,
  usdToIdrRate = DEFAULT_USD_TO_IDR
): SeedanceCostCalculation {
  const scheduleKey = `${resolution}-${duration}`;
  const baseCreditCost = SEEDANCE_SCHEDULE_MAP[scheduleKey] || 75;
  // Extra reference image surcharge (if more than 1 image, 5 credits per extra plate)
  const referenceSurchargeCredits = refImagesCount > 1 ? (refImagesCount - 1) * 5 : 0;
  const totalCreditDeduction = baseCreditCost + referenceSurchargeCredits;

  const retailPriceEquivalentIdr = totalCreditDeduction * RETAIL_PRICE_PER_CREDIT_IDR;
  const unitApiCostSec = UPSTREAM_API_COST_PER_SEC_USD[resolution] || 0.02;
  const estimatedApiCostUsd = unitApiCostSec * duration;
  const estimatedApiCostIdr = estimatedApiCostUsd * usdToIdrRate;

  const grossProfitIdr = retailPriceEquivalentIdr - estimatedApiCostIdr;
  const estimatedGrossMarginPercent =
    retailPriceEquivalentIdr > 0 ? (grossProfitIdr / retailPriceEquivalentIdr) * 100 : 0;

  const isMarginWarning = estimatedGrossMarginPercent < 25; // Warning if gross margin falls below 25%

  return {
    resolution,
    duration,
    referenceImagesCount: refImagesCount,
    baseCreditCost,
    referenceSurchargeCredits,
    totalCreditDeduction,
    retailPriceEquivalentIdr,
    estimatedApiCostUsd: Number(estimatedApiCostUsd.toFixed(4)),
    estimatedApiCostIdr: Math.round(estimatedApiCostIdr),
    estimatedGrossMarginPercent: Number(estimatedGrossMarginPercent.toFixed(1)),
    isMarginWarning,
  };
}

/**
 * State store for Seedance Community Platform
 */
class SeedancePlatformState {
  private plans: MembershipPlan[] = [...DEFAULT_MEMBERSHIP_PLANS];
  private packages: CreditPackage[] = [...DEFAULT_CREDIT_PACKAGES];
  private subscriptions: Map<string, UserSubscription> = new Map();
  private wallets: Map<string, CreditWalletBalance> = new Map();
  private transactions: CreditLedgerTransaction[] = [];
  private jobs: Map<string, SeedanceGenerationJob> = new Map();
  private communityVideos: CommunityVideoPost[] = [];
  private apiStock: BytePlusApiStock = {
    id: 'stock-seedance-main',
    packageName: 'BytePlus Seedance Enterprise Tier-1',
    totalTokensPurchased: 50000000,
    tokensConsumed: 12450000,
    tokensRemaining: 37550000,
    expenditureUsd: 2500,
    purchaseDate: '2026-10-01T00:00:00Z',
    expirationDate: '2027-10-01T00:00:00Z',
    lowStockThresholdPercent: 20,
    isLowStockWarning: false,
    updatedAt: new Date().toISOString(),
  };

  constructor() {
    this.seedInitialCommunityShowcase();
  }

  private seedInitialCommunityShowcase() {
    this.communityVideos = [
      {
        id: 'film-1',
        userId: 'creator-rachvan',
        authorUsername: 'rachvan',
        authorDisplayName: 'Rachvan Al-Thani',
        authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        authorTier: 'PRO',
        title: 'NOIR ARCHITECTURE: VOLCANIC BASALT',
        description: 'Shot exclusively with Seedance 2.5 1080p @ 24fps. Obsidian silk mikado gown under chiaroscuro single-aperture skylight.',
        videoUrl: '/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
        duration: 15,
        resolution: '1080p',
        aspectRatio: '16:9',
        seedancePrompt: 'Brutalist volcanic cathedral, protagonist in obsidian silk mikado cape, continuous tracking crane push, 24fps film cadence',
        tags: ['Cinema', 'Brutalist', 'Fashion', 'Seedance2.5'],
        likesCount: 142,
        viewsCount: 3890,
        isFeatured: true,
        isPublic: true,
        createdAt: '2026-11-01T12:00:00Z',
      },
      {
        id: 'film-2',
        userId: 'creator-sora',
        authorUsername: 'elena_v',
        authorDisplayName: 'Elena Voss',
        authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
        authorTier: 'STUDIO',
        title: 'KINETIC CHRONICLES: TOKYO DRIFT 2049',
        description: 'Multi-reference vehicle continuity lock (RHD Japanese sports coupe) weaving through reflective rainy neon boulevards.',
        videoUrl: '/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
        duration: 30,
        resolution: '1080p',
        aspectRatio: '16:9',
        seedancePrompt: 'Midnight Tokyo neon rain, midnight blue RHD aerodynamic sports car, wet asphalt reflections, dynamic tracking orbit',
        tags: ['Cyberpunk', 'Vehicles', 'Night', '4K'],
        likesCount: 98,
        viewsCount: 2410,
        isFeatured: true,
        isPublic: true,
        createdAt: '2026-11-04T15:30:00Z',
      },
      {
        id: 'film-3',
        userId: 'creator-atelier',
        authorUsername: 'atelier_m',
        authorDisplayName: 'Atelier Maison',
        authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
        authorTier: 'CREATOR',
        title: 'DESERT MIRAGE: SILENT MONOLITH',
        description: '720p HD look-dev study with 6 reference plates testing cloth simulation against desert thermal turbulence.',
        videoUrl: '/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4',
        thumbnailUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80',
        duration: 15,
        resolution: '720p',
        aspectRatio: '16:9',
        seedancePrompt: 'Dune landscape with monolithic matte grey architectural tower, billowing ecru linen fabric, warm golden hour sun',
        tags: ['Editorial', 'Desert', 'LookDev'],
        likesCount: 64,
        viewsCount: 1720,
        isFeatured: false,
        isPublic: true,
        createdAt: '2026-11-06T09:15:00Z',
      },
    ];
  }

  // Plans & Packages
  getPlans(): MembershipPlan[] {
    return this.plans;
  }

  updatePlans(updatedPlans: MembershipPlan[]): void {
    this.plans = updatedPlans;
  }

  getPackages(): CreditPackage[] {
    return this.packages;
  }

  updatePackages(updatedPackages: CreditPackage[]): void {
    this.packages = updatedPackages;
  }

  // Wallet Management
  getOrCreateWallet(userId: string): CreditWalletBalance {
    let wallet = this.wallets.get(userId);
    if (!wallet) {
      wallet = {
        userId,
        totalAvailable: 20, // Free 20 welcome credits
        monthlySubscriptionCredits: 20,
        purchasedTopUpCredits: 0,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      };
      this.wallets.set(userId, wallet);
      // Record initial welcome ledger entry
      this.recordTransaction({
        id: `tx-welcome-${userId}`,
        userId,
        type: 'SUBSCRIPTION_GRANT',
        amount: 20,
        balanceAfter: 20,
        description: 'Welcome creator registration bonus (20 Free Credits)',
        createdAt: new Date().toISOString(),
      });
    }
    return wallet;
  }

  // Subscription Management
  getUserSubscription(userId: string): UserSubscription {
    let sub = this.subscriptions.get(userId);
    if (!sub) {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      sub = {
        id: `sub-${userId}`,
        userId,
        userEmail: '',
        planTier: 'FREE',
        status: 'ACTIVE',
        priceIdr: 0,
        monthlyCredits: 20,
        remainingMonthlyCredits: 20,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        cancelAtPeriodEnd: false,
        renewalDate: periodEnd.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.subscriptions.set(userId, sub);
    }
    return sub;
  }

  updateUserSubscription(
    userId: string,
    tier: MembershipTier,
    userEmail = ''
  ): { subscription: UserSubscription; wallet: CreditWalletBalance } {
    const plan = this.plans.find((p) => p.tier === tier) || this.plans[0];
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const sub: UserSubscription = {
      id: `sub-${userId}-${Date.now()}`,
      userId,
      userEmail,
      planTier: tier,
      status: 'ACTIVE',
      priceIdr: plan.priceIdr,
      monthlyCredits: plan.monthlyCredits,
      remainingMonthlyCredits: plan.monthlyCredits,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
      renewalDate: periodEnd.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.subscriptions.set(userId, sub);

    // Credit allocation to wallet
    const wallet = this.getOrCreateWallet(userId);
    wallet.monthlySubscriptionCredits = plan.monthlyCredits;
    wallet.subscriptionCreditExpiry = periodEnd.toISOString();
    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.updatedAt = now.toISOString();

    this.recordTransaction({
      id: `tx-sub-${Date.now()}`,
      userId,
      type: 'SUBSCRIPTION_GRANT',
      amount: plan.monthlyCredits,
      balanceAfter: wallet.totalAvailable,
      description: `Monthly credit grant for ${plan.name} Tier (${plan.monthlyCredits} Credits)`,
      createdAt: now.toISOString(),
    });

    return { subscription: sub, wallet };
  }

  cancelSubscription(userId: string): UserSubscription {
    const sub = this.getUserSubscription(userId);
    sub.cancelAtPeriodEnd = true;
    sub.status = 'CANCELLED';
    sub.updatedAt = new Date().toISOString();
    this.subscriptions.set(userId, sub);
    return sub;
  }

  // Top-Up Credit Purchase
  addTopUpCredits(
    userId: string,
    packageId: string,
    paymentMethod = 'QRIS'
  ): { wallet: CreditWalletBalance; transaction: CreditLedgerTransaction } {
    const pkg = this.packages.find((p) => p.id === packageId) || this.packages[0];
    const wallet = this.getOrCreateWallet(userId);

    wallet.purchasedTopUpCredits += pkg.credits;
    // Purchased credits have a 90-day validity period
    const expiry = new Date(Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000).toISOString();
    wallet.purchasedCreditExpiry = expiry;
    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.updatedAt = new Date().toISOString();

    const tx: CreditLedgerTransaction = {
      id: `tx-topup-${Date.now()}`,
      userId,
      type: 'TOP_UP_PURCHASE',
      amount: pkg.credits,
      balanceAfter: wallet.totalAvailable,
      description: `Purchased ${pkg.name} Credit Package (+${pkg.credits} Credits @ Rp ${pkg.priceIdr.toLocaleString('id-ID')})`,
      paymentMethod,
      createdAt: new Date().toISOString(),
    };
    this.recordTransaction(tx);

    return { wallet, transaction: tx };
  }

  // Ledger Transactions
  private recordTransaction(tx: CreditLedgerTransaction) {
    this.transactions.unshift(tx);
    if (this.transactions.length > 500) {
      this.transactions.pop();
    }
  }

  getTransactions(userId?: string): CreditLedgerTransaction[] {
    if (!userId) return this.transactions;
    return this.transactions.filter((tx) => tx.userId === userId);
  }

  // Atomic Credit Deduction with priority: (1) Monthly subscription credits, (2) Purchased top-up credits
  deductCredits(
    userId: string,
    amount: number,
    description: string,
    jobId?: string
  ): { success: boolean; error?: string; wallet?: CreditWalletBalance; tx?: CreditLedgerTransaction } {
    const wallet = this.getOrCreateWallet(userId);

    if (wallet.totalAvailable < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount} credits, available: ${wallet.totalAvailable} credits.`,
      };
    }

    let remainingToDeduct = amount;
    let monthlyDeducted = 0;
    let purchasedDeducted = 0;

    // 1. Consume from monthly subscription credits first
    if (wallet.monthlySubscriptionCredits >= remainingToDeduct) {
      wallet.monthlySubscriptionCredits -= remainingToDeduct;
      monthlyDeducted = remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      monthlyDeducted = wallet.monthlySubscriptionCredits;
      remainingToDeduct -= wallet.monthlySubscriptionCredits;
      wallet.monthlySubscriptionCredits = 0;

      // 2. Consume remainder from purchased top-up credits
      wallet.purchasedTopUpCredits = Math.max(0, wallet.purchasedTopUpCredits - remainingToDeduct);
      purchasedDeducted = remainingToDeduct;
      remainingToDeduct = 0;
    }

    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.updatedAt = new Date().toISOString();

    const tx: CreditLedgerTransaction = {
      id: `tx-gen-${Date.now()}`,
      userId,
      type: 'GENERATION_DEDUCT',
      amount: -amount,
      balanceAfter: wallet.totalAvailable,
      monthlyDeducted,
      purchasedDeducted,
      description,
      jobId,
      createdAt: new Date().toISOString(),
    };
    this.recordTransaction(tx);

    // Track API token consumption
    this.apiStock.tokensConsumed += amount * 800;
    this.apiStock.tokensRemaining = Math.max(0, this.apiStock.totalTokensPurchased - this.apiStock.tokensConsumed);
    this.apiStock.updatedAt = new Date().toISOString();

    return { success: true, wallet, tx };
  }

  // Automatic Refund Engine for failed API requests
  refundCredits(
    userId: string,
    amount: number,
    reason: string,
    jobId?: string
  ): { wallet: CreditWalletBalance; tx: CreditLedgerTransaction } {
    const wallet = this.getOrCreateWallet(userId);
    wallet.purchasedTopUpCredits += amount;
    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.updatedAt = new Date().toISOString();

    const tx: CreditLedgerTransaction = {
      id: `tx-refund-${Date.now()}`,
      userId,
      type: 'GENERATION_REFUND',
      amount: amount,
      balanceAfter: wallet.totalAvailable,
      description: `Automatic refund: ${reason} (+${amount} Credits)`,
      jobId,
      createdAt: new Date().toISOString(),
    };
    this.recordTransaction(tx);

    return { wallet, tx };
  }

  // Generation Jobs
  createJob(job: SeedanceGenerationJob): SeedanceGenerationJob {
    this.jobs.set(job.id, job);
    return job;
  }

  getJob(jobId: string): SeedanceGenerationJob | undefined {
    return this.jobs.get(jobId);
  }

  updateJob(jobId: string, updates: Partial<SeedanceGenerationJob>): SeedanceGenerationJob | undefined {
    const existing = this.jobs.get(jobId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.jobs.set(jobId, updated);
    return updated;
  }

  getUserJobs(userId: string): SeedanceGenerationJob[] {
    return Array.from(this.jobs.values())
      .filter((j) => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Community Showcase
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

  // API Stock Management
  getApiStock(): BytePlusApiStock {
    const percentRemaining = (this.apiStock.tokensRemaining / this.apiStock.totalTokensPurchased) * 100;
    this.apiStock.isLowStockWarning = percentRemaining <= this.apiStock.lowStockThresholdPercent;
    return this.apiStock;
  }

  recordApiStockPurchase(tokens: number, expenditureUsd: number, packageName: string): BytePlusApiStock {
    this.apiStock.packageName = packageName;
    this.apiStock.totalTokensPurchased += tokens;
    this.apiStock.tokensRemaining += tokens;
    this.apiStock.expenditureUsd += expenditureUsd;
    this.apiStock.purchaseDate = new Date().toISOString();
    this.apiStock.updatedAt = new Date().toISOString();
    return this.getApiStock();
  }

  // Financial Analytics
  getFinancialAnalytics(usdToIdrRate = DEFAULT_USD_TO_IDR): PlatformFinancialAnalytics {
    const totalUsers = Math.max(1, this.wallets.size);
    const activeSubscribers = Array.from(this.subscriptions.values()).filter((s) => s.status === 'ACTIVE' && s.planTier !== 'FREE').length;

    const distribution: Record<MembershipTier, number> = {
      FREE: 0,
      STARTER: 0,
      CREATOR: 0,
      PRO: 0,
      STUDIO: 0,
    };
    let mrrIdr = 0;
    this.subscriptions.forEach((sub) => {
      distribution[sub.planTier] = (distribution[sub.planTier] || 0) + 1;
      if (sub.status === 'ACTIVE') {
        mrrIdr += sub.priceIdr;
      }
    });

    let topUpRevenueIdr = 0;
    let failedRefundsIdr = 0;
    this.transactions.forEach((tx) => {
      if (tx.type === 'TOP_UP_PURCHASE') {
        topUpRevenueIdr += tx.amount * RETAIL_PRICE_PER_CREDIT_IDR;
      } else if (tx.type === 'GENERATION_REFUND') {
        failedRefundsIdr += tx.amount * RETAIL_PRICE_PER_CREDIT_IDR;
      }
    });

    const totalJobs = Array.from(this.jobs.values());
    const totalGeneratedVideos = totalJobs.filter((j) => j.status === 'COMPLETED').length;
    const failedGenerationsCount = totalJobs.filter((j) => j.status === 'FAILED' || j.status === 'REFUNDED').length;

    let totalDeductedCredits = 0;
    totalJobs.forEach((j) => {
      totalDeductedCredits += j.actualCreditsDeducted;
    });
    const avgCostCredits = totalJobs.length > 0 ? Math.round(totalDeductedCredits / totalJobs.length) : 55;

    // Liabilities: all currently unspent credits in active wallets
    let totalOutstandingCreditLiabilities = 0;
    this.wallets.forEach((w) => {
      totalOutstandingCreditLiabilities += w.totalAvailable;
    });
    const outstandingLiabilitiesIdr = totalOutstandingCreditLiabilities * RETAIL_PRICE_PER_CREDIT_IDR;

    const totalApiExpenditureUsd = this.apiStock.expenditureUsd;
    const totalApiExpenditureIdr = totalApiExpenditureUsd * usdToIdrRate;

    const grossRevenueIdr = mrrIdr + topUpRevenueIdr;
    const estimatedGrossProfitIdr = grossRevenueIdr - totalApiExpenditureIdr;
    const grossMarginPercent = grossRevenueIdr > 0 ? (estimatedGrossProfitIdr / grossRevenueIdr) * 100 : 0;

    return {
      totalRegisteredUsers: totalUsers,
      activeSubscribers,
      membershipDistribution: distribution,
      monthlyRecurringRevenueIdr: mrrIdr,
      totalTopUpRevenueIdr: topUpRevenueIdr,
      totalApiExpenditureUsd,
      totalApiExpenditureIdr,
      estimatedGrossProfitIdr: Math.round(estimatedGrossProfitIdr),
      grossMarginPercent: Number(grossMarginPercent.toFixed(1)),
      totalGeneratedVideos,
      averageGenerationCostCredits: avgCostCredits,
      failedGenerationsCount,
      failedGenerationRefundsIdr: failedRefundsIdr,
      totalOutstandingCreditLiabilities,
      outstandingLiabilitiesIdr,
      apiStockRemainingTokens: this.apiStock.tokensRemaining,
      isStockWarning: this.apiStock.isLowStockWarning,
      usdToIdrExchangeRate: usdToIdrRate,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const seedancePlatformState = new SeedancePlatformState();
