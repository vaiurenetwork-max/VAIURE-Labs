/**
 * VAIURE — SEEDANCE LAB PERSISTENT PLATFORM STORE
 * Atomic file-backed relational/document state persisted to uploads/seedance_platform_db.json.
 * Stores configurable plans, dynamic generation cost configs, user records, subscriptions,
 * credit wallets, immutable credit ledger, idempotency records, personal AI agent memory &
 * threads, real DB-backed livestreams, real DB-backed multiplayer call rooms, and admin audit logs.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CanonicalTierId,
  MembershipTier,
  MembershipPlan,
  UserSubscription,
  SubscriptionHistoryEntry,
  CreditWalletBalance,
  CreditPackage,
  CreditLedgerTransaction,
  LedgerTransactionType,
  GenerationCostConfig,
  SeedanceCostCalculation,
  SeedanceResolution,
  SeedanceDuration,
  SeedanceGenerationJob,
  AgentMemoryItem,
  CreativeMemoryCategory,
  AgentConversation,
  AgentChatMessage,
  LivestreamSession,
  LivestreamVisibility,
  LivestreamChatMessage,
  LiveCallRoom,
  LiveCallRoomVisibility,
  LiveCallParticipant,
  PlatformUserRecord,
  PlatformAdminAuditEntry,
  PlatformFinancialAnalytics,
  BytePlusApiStock,
} from '../types/seedancePlatform';
import { registerAccountStatusChecker } from './firebaseAuthMiddleware';
import { bruteForceGuard, constantTimeCompare } from './securityMiddleware';

export const DEFAULT_USD_TO_IDR = 16200;
export const RETAIL_PRICE_PER_CREDIT_IDR = 600;

export function normalizeTierId(tier: string | undefined | null): CanonicalTierId {
  const upper = String(tier || 'FREE').trim().toUpperCase();
  if (upper === 'STARTER') return 'BASIC';
  if (upper === 'CREATOR') return 'PRO';
  if (upper === 'STUDIO') return 'ENTERPRISE';
  if (
    upper === 'FREE' ||
    upper === 'BASIC' ||
    upper === 'PRO' ||
    upper === 'PREMIUM' ||
    upper === 'ENTERPRISE'
  ) {
    return upper;
  }
  return 'FREE';
}

export const DEFAULT_CONFIGURABLE_PLANS: MembershipPlan[] = [
  {
    id: 'plan-free',
    tier: 'FREE',
    name: 'Free',
    priceIdr: 0,
    priceUsd: 0,
    billingInterval: 'monthly',
    monthlyCredits: 20,
    maxResolution: '480p',
    maxDurationSeconds: 15,
    maxReferenceImages: 2,
    allowReferenceImages: true,
    allowCharacterConsistency: false,
    queuePriority: 'STANDARD',
    multiSceneWorkspace: false,
    commercialUseEligible: false,
    concurrentJobs: 1,
    maxStreamViewers: 10,
    maxRoomParticipants: 2,
    teamSeats: 1,
    isActive: true,
    description: 'Entry workspace tier with welcome generation credits and standard queue access.',
    features: [
      '20 Monthly generation credits',
      '480p standard synthesis up to 15s',
      'Up to 2 reference image plates',
      'Personal AI creative assistant access',
      'Live room hosting (up to 2 seats)',
    ],
  },
  {
    id: 'plan-basic',
    tier: 'BASIC',
    name: 'Basic',
    priceIdr: 79000,
    priceUsd: 5,
    billingInterval: 'monthly',
    monthlyCredits: 140,
    maxResolution: '720p',
    maxDurationSeconds: 15,
    maxReferenceImages: 6,
    allowReferenceImages: true,
    allowCharacterConsistency: false,
    queuePriority: 'STANDARD',
    multiSceneWorkspace: false,
    commercialUseEligible: false,
    concurrentJobs: 2,
    maxStreamViewers: 30,
    maxRoomParticipants: 4,
    teamSeats: 1,
    isActive: true,
    description: 'Independent creator plan with 720p synthesis and multi-plate reference support.',
    features: [
      '140 Monthly generation credits',
      '480p & 720p synthesis up to 15s',
      'Up to 6 reference plates per generation',
      'Personal AI creative memory persistence',
      'Multiplayer Live Rooms (up to 4 participants)',
    ],
  },
  {
    id: 'plan-pro',
    tier: 'PRO',
    name: 'Pro',
    priceIdr: 199000,
    priceUsd: 12,
    billingInterval: 'monthly',
    monthlyCredits: 420,
    maxResolution: '720p',
    maxDurationSeconds: 30,
    maxReferenceImages: 15,
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'PRIORITY',
    multiSceneWorkspace: true,
    commercialUseEligible: true,
    concurrentJobs: 3,
    maxStreamViewers: 100,
    maxRoomParticipants: 8,
    teamSeats: 2,
    badge: 'POPULAR',
    isPopular: true,
    isActive: true,
    description: 'Continuous 30s Seedance 2.5 narratives with character continuity and priority queue.',
    features: [
      '420 Monthly generation credits',
      '720p HD synthesis up to 30 seconds',
      'Up to 15 reference plates + character lock',
      'Commercial release license included',
      'Public & private livestreams + 8-seat rooms',
    ],
  },
  {
    id: 'plan-premium',
    tier: 'PREMIUM',
    name: 'Premium',
    priceIdr: 449000,
    priceUsd: 28,
    billingInterval: 'monthly',
    monthlyCredits: 1050,
    maxResolution: '1080p',
    maxDurationSeconds: 30,
    maxReferenceImages: 30,
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'PRIORITY',
    multiSceneWorkspace: true,
    commercialUseEligible: true,
    concurrentJobs: 5,
    maxStreamViewers: 500,
    maxRoomParticipants: 16,
    teamSeats: 4,
    badge: '1080P CINEMA',
    isActive: true,
    description: 'Full 1080p cinema mastering with full 30-plate reference conditioning and VaiByte canvas sync.',
    features: [
      '1,050 Monthly generation credits',
      'Full 1080p Cinema resolution up to 30s',
      'Full 30 reference image capacity',
      'Complex physics & temporal continuity priority',
      '500 livestream viewer capacity & 16-seat rooms',
    ],
  },
  {
    id: 'plan-enterprise',
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    priceIdr: 999000,
    priceUsd: 62,
    billingInterval: 'monthly',
    monthlyCredits: 2600,
    maxResolution: '1080p',
    maxDurationSeconds: 30,
    maxReferenceImages: 30,
    allowReferenceImages: true,
    allowCharacterConsistency: true,
    queuePriority: 'HIGHEST',
    multiSceneWorkspace: true,
    commercialUseEligible: true,
    concurrentJobs: 10,
    maxStreamViewers: 2500,
    maxRoomParticipants: 32,
    teamSeats: 12,
    badge: 'STUDIO',
    isActive: true,
    description: 'Dedicated multi-seat studio capacity with highest burst priority and enterprise governance.',
    features: [
      '2,600 Monthly generation credits',
      'Highest queue priority & 10 concurrent jobs',
      'Full 1080p 30s + 30 reference plates',
      '12 team creator seats & private broadcast suites',
      'Custom SLA & full audit governance',
    ],
  },
];

export const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg-mini',
    name: 'Starter Pack',
    credits: 50,
    priceIdr: 29000,
    priceUsd: 2,
    validityDays: 90,
    isActive: true,
    description: 'Quick top-up for short generation tests.',
  },
  {
    id: 'pkg-creator',
    name: 'Creator Pack',
    credits: 150,
    priceIdr: 79000,
    priceUsd: 5,
    validityDays: 90,
    isPopular: true,
    isActive: true,
    badge: 'POPULAR',
    description: 'Balanced credit reserve for multi-scene video synthesis.',
  },
  {
    id: 'pkg-advanced',
    name: 'Director Pack',
    credits: 400,
    priceIdr: 199000,
    priceUsd: 12,
    validityDays: 90,
    isActive: true,
    description: 'Extended credit pool for 30s R2V and 1080p renders.',
  },
  {
    id: 'pkg-production',
    name: 'Studio Reserve',
    credits: 1000,
    priceIdr: 479000,
    priceUsd: 29,
    validityDays: 90,
    badge: 'BEST VALUE',
    isActive: true,
    description: 'Heavy production reserve with 90-day rollover.',
  },
];

export const DEFAULT_GENERATION_COST_CONFIG: GenerationCostConfig = {
  id: 'default-cost-config',
  baseByResolutionDuration: {
    '480p-5': 10,
    '480p-10': 18,
    '480p-15': 25,
    '480p-20': 35,
    '480p-30': 50,
    '720p-5': 20,
    '720p-10': 38,
    '720p-15': 55,
    '720p-20': 75,
    '720p-30': 110,
    '1080p-5': 45,
    '1080p-10': 85,
    '1080p-15': 125,
    '1080p-20': 170,
    '1080p-30': 250,
  },
  resolutionMultipliers: {
    '480p': 1,
    '720p': 1.5,
    '1080p': 2.5,
  },
  qualityMultipliers: {
    standard: 1,
    cinematic_complex_physics: 1.15,
  },
  referenceImageSurchargePerExtraPlate: 2,
  imageGenerationCosts: {
    seedream_50_2k: 4,
    seedream_50_4k: 8,
    seedream_45: 4,
    image_edit: 5,
  },
  modelRules: {
    seedance_25_15s: {
      modelKey: 'seedance_25_15s',
      name: 'Seedance 2.5 (15s)',
      category: 'Video',
      baseCredits: 25,
      perSecondCredits: 2,
      enabled: true,
    },
    seedance_25_30s: {
      modelKey: 'seedance_25_30s',
      name: 'Seedance 2.5 (30s)',
      category: 'Video',
      baseCredits: 50,
      perSecondCredits: 2,
      enabled: true,
    },
    seedance_25_15s_r2v: {
      modelKey: 'seedance_25_15s_r2v',
      name: 'Seedance 2.5 R2V (15s)',
      category: 'Motion / R2V',
      baseCredits: 30,
      perSecondCredits: 2,
      enabled: true,
    },
    seedance_25_30s_r2v: {
      modelKey: 'seedance_25_30s_r2v',
      name: 'Seedance 2.5 R2V (30s)',
      category: 'Motion / R2V',
      baseCredits: 58,
      perSecondCredits: 2,
      enabled: true,
    },
    seedance_20_15s: {
      modelKey: 'seedance_20_15s',
      name: 'Seedance 2.0 (15s)',
      category: 'Video',
      baseCredits: 20,
      perSecondCredits: 1.5,
      enabled: true,
    },
    seedance_15_pro: {
      modelKey: 'seedance_15_pro',
      name: 'Seedance 1.5 Pro',
      category: 'Video',
      baseCredits: 18,
      perSecondCredits: 1.5,
      enabled: true,
    },
    seedream_50_2k: {
      modelKey: 'seedream_50_2k',
      name: 'Seedream 5.0 (2K)',
      category: 'Image',
      baseCredits: 4,
      perSecondCredits: 0,
      enabled: true,
    },
    seedream_50_4k: {
      modelKey: 'seedream_50_4k',
      name: 'Seedream 5.0 (4K)',
      category: 'Image',
      baseCredits: 8,
      perSecondCredits: 0,
      enabled: true,
    },
    seedream_45: {
      modelKey: 'seedream_45',
      name: 'Seedream 4.5',
      category: 'Image',
      baseCredits: 4,
      perSecondCredits: 0,
      enabled: true,
    },
  },
  autoRefundOnFailure: true,
  unitValueIdr: RETAIL_PRICE_PER_CREDIT_IDR,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

const UPSTREAM_API_COST_PER_SEC_USD: Record<SeedanceResolution, number> = {
  '480p': 0.007,
  '720p': 0.018,
  '1080p': 0.045,
};

export function calculateDynamicGenerationCost(
  config: GenerationCostConfig,
  params: {
    modelKey?: string;
    resolution?: SeedanceResolution | string;
    duration?: number;
    referenceImagesCount?: number;
    physicsPriority?: boolean;
    quantity?: number;
  },
  usdToIdrRate = DEFAULT_USD_TO_IDR
): SeedanceCostCalculation {
  const modelKey = (params.modelKey || 'seedance_25_15s').trim();
  const isImageModel =
    modelKey.startsWith('seedream') ||
    config.modelRules[modelKey]?.category === 'Image' ||
    config.modelRules[modelKey]?.category === 'Image Edit';

  const rawRes = String(params.resolution || '720p').toLowerCase();
  const resolution: SeedanceResolution =
    rawRes === '480p' || rawRes === '1080p' ? rawRes : '720p';

  const rawDur = Number(params.duration || (modelKey.includes('30s') ? 30 : 15));
  const duration: SeedanceDuration =
    rawDur <= 5 ? 5 : rawDur <= 10 ? 10 : rawDur <= 15 ? 15 : rawDur <= 20 ? 20 : 30;

  const refImagesCount = Math.max(0, Math.min(30, Number(params.referenceImagesCount || 0)));
  const physicsPriority = params.physicsPriority !== false;
  const quantity = Math.max(1, Math.min(4, Number(params.quantity || 1)));

  let baseCreditCost = 0;
  if (isImageModel) {
    baseCreditCost =
      config.imageGenerationCosts[modelKey] ??
      config.modelRules[modelKey]?.baseCredits ??
      4;
  } else {
    const key = `${resolution}-${duration}`;
    if (config.baseByResolutionDuration[key] !== undefined) {
      baseCreditCost = Number(config.baseByResolutionDuration[key]);
    } else {
      const rule = config.modelRules[modelKey];
      const multiplier = config.resolutionMultipliers[resolution] || 1;
      baseCreditCost = rule
        ? Math.round((rule.baseCredits + rule.perSecondCredits * duration) * (multiplier / 1.5))
        : Math.round(duration * 4 * multiplier);
    }
    if (modelKey.includes('r2v')) {
      baseCreditCost = Math.round(baseCreditCost * 1.1);
    }
  }

  const qualityMult = !isImageModel && physicsPriority
    ? config.qualityMultipliers.cinematic_complex_physics || 1
    : config.qualityMultipliers.standard || 1;
  const qualitySurchargeCredits = Math.max(
    0,
    Math.round(baseCreditCost * qualityMult) - baseCreditCost
  );

  const referenceSurchargeCredits =
    refImagesCount > 1
      ? (refImagesCount - 1) * Math.max(0, config.referenceImageSurchargePerExtraPlate)
      : 0;

  const perUnitCredits = Math.max(1, baseCreditCost + qualitySurchargeCredits + referenceSurchargeCredits);
  const totalCreditDeduction = perUnitCredits * quantity;

  const retailPriceEquivalentIdr = totalCreditDeduction * (config.unitValueIdr || RETAIL_PRICE_PER_CREDIT_IDR);
  const unitApiCostSec = UPSTREAM_API_COST_PER_SEC_USD[resolution] || 0.018;
  const estimatedApiCostUsd = isImageModel ? 0.03 * quantity : unitApiCostSec * duration * quantity;
  const estimatedApiCostIdr = estimatedApiCostUsd * usdToIdrRate;
  const grossProfitIdr = retailPriceEquivalentIdr - estimatedApiCostIdr;
  const estimatedGrossMarginPercent =
    retailPriceEquivalentIdr > 0 ? (grossProfitIdr / retailPriceEquivalentIdr) * 100 : 0;

  return {
    modelKey,
    resolution,
    duration,
    referenceImagesCount: refImagesCount,
    physicsPriority,
    quantity,
    baseCreditCost,
    qualitySurchargeCredits,
    referenceSurchargeCredits,
    perUnitCredits,
    totalCreditDeduction,
    retailPriceEquivalentIdr,
    estimatedApiCostUsd: Number(estimatedApiCostUsd.toFixed(4)),
    estimatedApiCostIdr: Math.round(estimatedApiCostIdr),
    estimatedGrossMarginPercent: Number(estimatedGrossMarginPercent.toFixed(1)),
    isMarginWarning: estimatedGrossMarginPercent < 25,
  };
}

interface StoredLivestreamRecord extends LivestreamSession {
  accessCodeHash?: string;
}

interface IdempotencyRecord {
  key: string;
  userId: string;
  jobCode: string;
  creditsDeducted: number;
  createdAt: string;
}

interface PersistedPlatformDB {
  plans: MembershipPlan[];
  packages: CreditPackage[];
  costConfig: GenerationCostConfig;
  users: Record<string, PlatformUserRecord>;
  subscriptions: Record<string, UserSubscription>;
  wallets: Record<string, CreditWalletBalance>;
  transactions: CreditLedgerTransaction[];
  idempotency: Record<string, IdempotencyRecord>;
  refundedJobIds: string[];
  jobs: Record<string, SeedanceGenerationJob>;
  agentMemoryEnabled: Record<string, boolean>;
  agentMemories: Record<string, AgentMemoryItem[]>;
  agentConversations: Record<string, AgentConversation[]>;
  livestreams: Record<string, StoredLivestreamRecord>;
  livestreamChats: Record<string, LivestreamChatMessage[]>;
  liveRooms: Record<string, LiveCallRoom>;
  auditLogs: PlatformAdminAuditEntry[];
  apiStock: BytePlusApiStock;
}

const DB_DIR = path.resolve(process.cwd(), 'uploads');
const DB_FILE = path.join(DB_DIR, 'seedance_platform_db.json');

function defaultDbState(): PersistedPlatformDB {
  return {
    plans: [...DEFAULT_CONFIGURABLE_PLANS],
    packages: [...DEFAULT_CREDIT_PACKAGES],
    costConfig: { ...DEFAULT_GENERATION_COST_CONFIG },
    users: {},
    subscriptions: {},
    wallets: {},
    transactions: [],
    idempotency: {},
    refundedJobIds: [],
    jobs: {},
    agentMemoryEnabled: {},
    agentMemories: {},
    agentConversations: {},
    livestreams: {},
    livestreamChats: {},
    liveRooms: {},
    auditLogs: [],
    apiStock: {
      id: 'stock-seedance-main',
      packageName: 'BytePlus ModelArk Account Pool',
      totalTokensPurchased: 0,
      tokensConsumed: 0,
      tokensRemaining: 0,
      expenditureUsd: 0,
      purchaseDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      lowStockThresholdPercent: 20,
      isLowStockWarning: false,
      updatedAt: new Date().toISOString(),
    },
  };
}

class SeedancePlatformStore {
  private db: PersistedPlatformDB;

  constructor() {
    this.db = this.loadFromDisk();
  }

  private loadFromDisk(): PersistedPlatformDB {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        const fresh = defaultDbState();
        this.saveStateSync(fresh);
        return fresh;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedPlatformDB>;
      const base = defaultDbState();
      return {
        ...base,
        ...parsed,
        plans:
          Array.isArray(parsed.plans) && parsed.plans.length > 0
            ? parsed.plans.map((p) => ({
                ...p,
                tier: normalizeTierId(p.tier),
                isActive: p.isActive !== false,
                priceUsd: typeof p.priceUsd === 'number' ? p.priceUsd : Math.round((p.priceIdr || 0) / DEFAULT_USD_TO_IDR),
                billingInterval: p.billingInterval || 'monthly',
                maxDurationSeconds: p.maxDurationSeconds || (p.tier === 'FREE' || p.tier === 'BASIC' ? 15 : 30),
                maxReferenceImages: p.maxReferenceImages ?? (p.tier === 'FREE' ? 2 : p.tier === 'BASIC' ? 6 : p.tier === 'PRO' ? 15 : 30),
                concurrentJobs: p.concurrentJobs ?? 2,
                maxStreamViewers: p.maxStreamViewers ?? 50,
                maxRoomParticipants: p.maxRoomParticipants ?? 8,
              }))
            : base.plans,
        packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 ? parsed.packages : base.packages,
        costConfig: parsed.costConfig ? { ...base.costConfig, ...parsed.costConfig } : base.costConfig,
        users: parsed.users || {},
        subscriptions: parsed.subscriptions || {},
        wallets: parsed.wallets || {},
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        idempotency: parsed.idempotency || {},
        refundedJobIds: Array.isArray(parsed.refundedJobIds) ? parsed.refundedJobIds : [],
        jobs: parsed.jobs || {},
        agentMemoryEnabled: parsed.agentMemoryEnabled || {},
        agentMemories: parsed.agentMemories || {},
        agentConversations: parsed.agentConversations || {},
        livestreams: parsed.livestreams || {},
        livestreamChats: parsed.livestreamChats || {},
        liveRooms: parsed.liveRooms || {},
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        apiStock: parsed.apiStock || base.apiStock,
      };
    } catch {
      return defaultDbState();
    }
  }

  private saveStateSync(target: PersistedPlatformDB = this.db): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmp = `${DB_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(target, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('SeedancePlatformStore persistence warning:', err);
    }
  }

  persist(): void {
    this.saveStateSync(this.db);
  }

  // ============================================================================
  // USER DIRECTORY & AUTH SYNCHRONIZATION
  // ============================================================================

  upsertUserRecord(params: {
    uid: string;
    email?: string;
    displayName?: string;
    username?: string;
    isAdmin?: boolean;
  }): PlatformUserRecord {
    const now = new Date().toISOString();
    const existing = this.db.users[params.uid];
    const wallet = this.getOrCreateWallet(params.uid, params.email);
    const sub = this.getUserSubscription(params.uid, params.email);

    const record: PlatformUserRecord = {
      uid: params.uid,
      email: params.email || existing?.email || '',
      username:
        params.username ||
        existing?.username ||
        (params.email ? params.email.split('@')[0] : `user_${params.uid.slice(0, 6)}`),
      displayName:
        params.displayName ||
        existing?.displayName ||
        (params.email ? params.email.split('@')[0] : 'Creator'),
      role: params.isAdmin
        ? 'ADMIN'
        : existing?.role || 'CREATOR',
      status: existing?.status || 'ACTIVE',
      tier: sub.planTier,
      totalCredits: wallet.totalAvailable,
      usedCredits: wallet.usedCredits,
      lastSeenAt: now,
      createdAt: existing?.createdAt || now,
    };

    this.db.users[params.uid] = record;
    this.persist();
    return record;
  }

  getAllUsers(): PlatformUserRecord[] {
    return Object.keys(this.db.users)
      .map((uid) => {
        const u = this.db.users[uid];
        const wallet = this.db.wallets[uid];
        const sub = this.db.subscriptions[uid];
        return {
          ...u,
          tier: sub?.planTier || u.tier || 'FREE',
          totalCredits: wallet?.totalAvailable ?? u.totalCredits ?? 0,
          usedCredits: wallet?.usedCredits ?? u.usedCredits ?? 0,
        };
      })
      .sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  }

  getUserRecord(uid: string): PlatformUserRecord | undefined {
    return this.db.users[uid];
  }

  findUserByIdentifier(identifier: string): PlatformUserRecord | undefined {
    const q = identifier.trim().toLowerCase().replace(/^@/, '');
    if (!q) return undefined;
    return Object.values(this.db.users).find(
      (u) =>
        u.uid.toLowerCase() === q ||
        u.email.toLowerCase() === q ||
        u.username.toLowerCase() === q
    );
  }

  updateUserStatusAndRole(
    targetUid: string,
    updates: { status?: 'ACTIVE' | 'SUSPENDED'; role?: 'USER' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN' },
    actor: { uid: string; email: string },
    reason: string
  ): PlatformUserRecord {
    const existing =
      this.db.users[targetUid] ||
      this.upsertUserRecord({ uid: targetUid });

    if (updates.status) existing.status = updates.status;
    if (updates.role) existing.role = updates.role;
    this.db.users[targetUid] = existing;
    this.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'USER_GOVERNANCE_UPDATE',
      targetType: 'user',
      targetId: targetUid,
      reason,
      metadata: updates,
    });
    this.persist();
    return existing;
  }

  // ============================================================================
  // SUBSCRIPTION PLANS & COST CONFIGURATION
  // ============================================================================

  getPlans(includeInactive = false): MembershipPlan[] {
    const list = this.db.plans.map((p) => ({ ...p }));
    return includeInactive ? list : list.filter((p) => p.isActive !== false);
  }

  updatePlan(
    planIdOrTier: string,
    updates: Partial<MembershipPlan>,
    actor: { uid: string; email: string }
  ): MembershipPlan {
    const normTier = normalizeTierId(planIdOrTier);
    const idx = this.db.plans.findIndex(
      (p) => p.id === planIdOrTier || p.tier === normTier
    );
    if (idx === -1) {
      throw new Error(`Subscription plan "${planIdOrTier}" not found.`);
    }

    const current = this.db.plans[idx];
    const merged: MembershipPlan = {
      ...current,
      ...updates,
      id: current.id,
      tier: current.tier,
      priceIdr:
        typeof updates.priceIdr === 'number'
          ? Math.max(0, Math.round(updates.priceIdr))
          : current.priceIdr,
      priceUsd:
        typeof updates.priceUsd === 'number'
          ? Math.max(0, Number(updates.priceUsd))
          : current.priceUsd,
      monthlyCredits:
        typeof updates.monthlyCredits === 'number'
          ? Math.max(0, Math.round(updates.monthlyCredits))
          : current.monthlyCredits,
      maxReferenceImages:
        typeof updates.maxReferenceImages === 'number'
          ? Math.max(0, Math.min(30, Math.round(updates.maxReferenceImages)))
          : current.maxReferenceImages,
      concurrentJobs:
        typeof updates.concurrentJobs === 'number'
          ? Math.max(1, Math.round(updates.concurrentJobs))
          : current.concurrentJobs,
      features: Array.isArray(updates.features) ? updates.features : current.features,
      updatedAt: new Date().toISOString(),
    };

    this.db.plans[idx] = merged;
    this.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'UPDATE_SUBSCRIPTION_PLAN',
      targetType: 'plan',
      targetId: merged.id,
      reason: `Updated ${merged.tier} (${merged.name}) configuration`,
      metadata: {
        priceIdr: merged.priceIdr,
        priceUsd: merged.priceUsd,
        monthlyCredits: merged.monthlyCredits,
        maxResolution: merged.maxResolution,
      },
    });
    this.persist();
    return merged;
  }

  replacePlans(updatedPlans: MembershipPlan[]): void {
    this.db.plans = updatedPlans;
    this.persist();
  }

  getPackages(): CreditPackage[] {
    return this.db.packages;
  }

  updatePackages(updatedPackages: CreditPackage[], actor?: { uid: string; email: string }): void {
    this.db.packages = updatedPackages;
    if (actor) {
      this.addAuditLog({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'UPDATE_CREDIT_PACKAGES',
        targetType: 'packages',
        targetId: 'store-packages',
        reason: 'Updated credit packages catalog',
      });
    }
    this.persist();
  }

  getCostConfig(): GenerationCostConfig {
    return this.db.costConfig;
  }

  updateCostConfig(
    updates: Partial<GenerationCostConfig>,
    actor: { uid: string; email: string }
  ): GenerationCostConfig {
    const current = this.db.costConfig;
    const next: GenerationCostConfig = {
      ...current,
      ...updates,
      baseByResolutionDuration: {
        ...current.baseByResolutionDuration,
        ...(updates.baseByResolutionDuration || {}),
      },
      resolutionMultipliers: {
        ...current.resolutionMultipliers,
        ...(updates.resolutionMultipliers || {}),
      },
      qualityMultipliers: {
        ...current.qualityMultipliers,
        ...(updates.qualityMultipliers || {}),
      },
      imageGenerationCosts: {
        ...current.imageGenerationCosts,
        ...(updates.imageGenerationCosts || {}),
      },
      modelRules: {
        ...current.modelRules,
        ...(updates.modelRules || {}),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email || actor.uid,
    };
    this.db.costConfig = next;
    this.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'UPDATE_GENERATION_COST_CONFIG',
      targetType: 'costConfig',
      targetId: next.id,
      reason: 'Updated dynamic generation cost schedule and multipliers',
    });
    this.persist();
    return next;
  }

  // ============================================================================
  // WALLETS & SUBSCRIPTIONS (REAL PER-USER STATE)
  // ============================================================================

  getOrCreateWallet(userId: string, userEmail = ''): CreditWalletBalance {
    let wallet = this.db.wallets[userId];
    if (!wallet) {
      const freePlan = this.db.plans.find((p) => p.tier === 'FREE') || DEFAULT_CONFIGURABLE_PLANS[0];
      const welcomeCredits = freePlan.monthlyCredits;
      const now = new Date().toISOString();
      wallet = {
        userId,
        totalAvailable: welcomeCredits,
        usedCredits: 0,
        monthlySubscriptionCredits: welcomeCredits,
        purchasedTopUpCredits: 0,
        status: 'ACTIVE',
        updatedAt: now,
      };
      this.db.wallets[userId] = wallet;

      this.recordTransaction({
        id: `tx-welcome-${userId}-${Date.now()}`,
        userId,
        userEmail,
        type: 'SUBSCRIPTION_GRANT',
        amount: welcomeCredits,
        balanceAfter: welcomeCredits,
        description: `${freePlan.name} tier welcome credit allocation (+${welcomeCredits} credits)`,
        createdAt: now,
      });
      this.persist();
    }
    if (typeof wallet.usedCredits !== 'number') {
      wallet.usedCredits = 0;
    }
    return wallet;
  }

  getUserSubscription(userId: string, userEmail = ''): UserSubscription {
    let sub = this.db.subscriptions[userId];
    if (!sub) {
      const freePlan = this.db.plans.find((p) => p.tier === 'FREE') || DEFAULT_CONFIGURABLE_PLANS[0];
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      sub = {
        id: `sub-${userId}`,
        userId,
        userEmail,
        planId: freePlan.id,
        planTier: 'FREE',
        tier: 'FREE',
        planName: freePlan.name,
        status: 'ACTIVE',
        billingStatus: 'FREE',
        priceIdr: freePlan.priceIdr,
        priceUsd: freePlan.priceUsd,
        monthlyCredits: freePlan.monthlyCredits,
        remainingMonthlyCredits: freePlan.monthlyCredits,
        currentPeriodStart: now.toISOString(),
        currentPeriodEnd: periodEnd.toISOString(),
        expiresAt: periodEnd.toISOString(),
        autoRenew: true,
        cancelAtPeriodEnd: false,
        renewalDate: periodEnd.toISOString(),
        limits: {
          maxResolution: freePlan.maxResolution,
          maxDurationSeconds: freePlan.maxDurationSeconds,
          maxReferenceImages: freePlan.maxReferenceImages,
          allowReferenceImages: freePlan.allowReferenceImages,
          allowCharacterConsistency: freePlan.allowCharacterConsistency,
          concurrentJobs: freePlan.concurrentJobs,
          maxStreamViewers: freePlan.maxStreamViewers,
          maxRoomParticipants: freePlan.maxRoomParticipants,
          commercialUseEligible: freePlan.commercialUseEligible,
          multiSceneWorkspace: freePlan.multiSceneWorkspace,
          teamSeats: freePlan.teamSeats,
        },
        history: [
          {
            id: `subhist-${Date.now()}`,
            planId: freePlan.id,
            planTier: 'FREE',
            planName: freePlan.name,
            action: 'ACTIVATED',
            status: 'ACTIVE',
            billingStatus: 'FREE',
            priceIdr: 0,
            creditsAllocated: freePlan.monthlyCredits,
            note: 'Initial Free tier workspace provisioning',
            createdAt: now.toISOString(),
          },
        ],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      this.db.subscriptions[userId] = sub;
      this.persist();
    }

    // Sync remainingMonthlyCredits with wallet & check expiration
    const wallet = this.getOrCreateWallet(userId, userEmail);
    sub.remainingMonthlyCredits = wallet.monthlySubscriptionCredits;
    if (
      sub.status === 'ACTIVE' &&
      sub.expiresAt &&
      new Date(sub.expiresAt).getTime() < Date.now()
    ) {
      if (sub.planTier === 'FREE') {
        const nextEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        sub.currentPeriodEnd = nextEnd;
        sub.expiresAt = nextEnd;
        sub.renewalDate = nextEnd;
      } else {
        sub.status = 'EXPIRED';
      }
      this.db.subscriptions[userId] = sub;
      this.persist();
    }

    return sub;
  }

  activateSubscriptionTier(params: {
    userId: string;
    userEmail: string;
    tier: MembershipTier;
    billingStatus: 'FREE' | 'PAID' | 'ADMIN_GRANTED';
    paymentProvider?: string;
    paymentRef?: string;
    autoRenew?: boolean;
    note?: string;
    actor?: { uid: string; email: string };
  }): { subscription: UserSubscription; wallet: CreditWalletBalance } {
    const targetTier = normalizeTierId(params.tier);
    const plan =
      this.db.plans.find((p) => p.tier === targetTier) ||
      this.db.plans[0];

    const existingSub = this.getUserSubscription(params.userId, params.userEmail);
    const wallet = this.getOrCreateWallet(params.userId, params.userEmail);
    if (params.paymentRef) {
      const priorTx = this.db.transactions.find(
        (t) =>
          t.type === 'SUBSCRIPTION_GRANT' &&
          t.userId === params.userId &&
          t.referenceId === params.paymentRef
      );
      if (priorTx) {
        return { subscription: existingSub, wallet };
      }
    }
    const now = new Date();
    const intervalDays = plan.billingInterval === 'yearly' ? 365 : 30;
    const periodEnd = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    const tierOrder: Record<CanonicalTierId, number> = {
      FREE: 0,
      BASIC: 1,
      PRO: 2,
      PREMIUM: 3,
      ENTERPRISE: 4,
    };
    const prevRank = tierOrder[existingSub.planTier] ?? 0;
    const nextRank = tierOrder[targetTier] ?? 0;
    const action: SubscriptionHistoryEntry['action'] =
      params.actor
        ? 'ADMIN_ASSIGNED'
        : nextRank > prevRank
        ? 'UPGRADED'
        : nextRank < prevRank
        ? 'DOWNGRADED'
        : 'RENEWED';

    // Allocate monthly credits only if upgrading/renewing/admin-assigned; avoid double-granting when toggling free->free same day
    const isSameFreeRepeat =
      existingSub.planTier === 'FREE' &&
      targetTier === 'FREE' &&
      existingSub.history.length > 0 &&
      !params.actor;

    let creditsAdded = 0;
    if (!isSameFreeRepeat) {
      wallet.monthlySubscriptionCredits = plan.monthlyCredits;
      wallet.subscriptionCreditExpiry = periodEnd.toISOString();
      wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
      wallet.updatedAt = now.toISOString();
      creditsAdded = plan.monthlyCredits;

      this.recordTransaction({
        id: `tx-sub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        userId: params.userId,
        userEmail: params.userEmail,
        type: 'SUBSCRIPTION_GRANT',
        amount: plan.monthlyCredits,
        balanceAfter: wallet.totalAvailable,
        referenceId: params.paymentRef,
        description: `${plan.name} (${plan.tier}) monthly credit allowance (+${plan.monthlyCredits} credits)`,
        createdAt: now.toISOString(),
      });
    }

    const historyEntry: SubscriptionHistoryEntry = {
      id: `subhist-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      planId: plan.id,
      planTier: plan.tier,
      planName: plan.name,
      action,
      status: 'ACTIVE',
      billingStatus: params.billingStatus,
      priceIdr: plan.priceIdr,
      creditsAllocated: creditsAdded,
      note: params.note,
      createdAt: now.toISOString(),
    };

    const updatedSub: UserSubscription = {
      ...existingSub,
      id: existingSub.id || `sub-${params.userId}`,
      userId: params.userId,
      userEmail: params.userEmail || existingSub.userEmail,
      planId: plan.id,
      planTier: plan.tier,
      tier: plan.tier,
      planName: plan.name,
      status: 'ACTIVE',
      billingStatus: params.billingStatus,
      priceIdr: plan.priceIdr,
      priceUsd: plan.priceUsd,
      monthlyCredits: plan.monthlyCredits,
      remainingMonthlyCredits: wallet.monthlySubscriptionCredits,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      expiresAt: periodEnd.toISOString(),
      autoRenew: params.autoRenew ?? true,
      cancelAtPeriodEnd: false,
      renewalDate: periodEnd.toISOString(),
      paymentProvider: params.paymentProvider,
      lastPaymentId: params.paymentRef,
      limits: {
        maxResolution: plan.maxResolution,
        maxDurationSeconds: plan.maxDurationSeconds,
        maxReferenceImages: plan.maxReferenceImages,
        allowReferenceImages: plan.allowReferenceImages,
        allowCharacterConsistency: plan.allowCharacterConsistency,
        concurrentJobs: plan.concurrentJobs,
        maxStreamViewers: plan.maxStreamViewers,
        maxRoomParticipants: plan.maxRoomParticipants,
        commercialUseEligible: plan.commercialUseEligible,
        multiSceneWorkspace: plan.multiSceneWorkspace,
        teamSeats: plan.teamSeats,
      },
      history: [historyEntry, ...(existingSub.history || [])].slice(0, 50),
      updatedAt: now.toISOString(),
    };

    this.db.subscriptions[params.userId] = updatedSub;
    if (this.db.users[params.userId]) {
      this.db.users[params.userId].tier = plan.tier;
      this.db.users[params.userId].totalCredits = wallet.totalAvailable;
    }

    if (params.actor) {
      this.addAuditLog({
        actorUid: params.actor.uid,
        actorEmail: params.actor.email,
        action: 'ASSIGN_USER_SUBSCRIPTION',
        targetType: 'subscription',
        targetId: params.userId,
        reason: params.note || `Assigned ${plan.tier} tier`,
        metadata: { tier: plan.tier, creditsAdded },
      });
    }

    this.persist();
    return { subscription: updatedSub, wallet };
  }

  toggleAutoRenew(userId: string, autoRenew: boolean): UserSubscription {
    const sub = this.getUserSubscription(userId);
    sub.autoRenew = autoRenew;
    sub.cancelAtPeriodEnd = !autoRenew;
    sub.updatedAt = new Date().toISOString();
    this.db.subscriptions[userId] = sub;
    this.persist();
    return sub;
  }

  cancelSubscription(userId: string): UserSubscription {
    const sub = this.getUserSubscription(userId);
    const now = new Date().toISOString();
    sub.autoRenew = false;
    sub.cancelAtPeriodEnd = true;
    sub.status = 'CANCELLED';
    sub.billingStatus = 'CANCELLED';
    sub.updatedAt = now;
    sub.history = [
      {
        id: `subhist-${Date.now()}`,
        planId: sub.planId,
        planTier: sub.planTier,
        planName: sub.planName,
        action: 'CANCELLED' as const,
        status: 'CANCELLED' as const,
        billingStatus: 'CANCELLED' as const,
        priceIdr: sub.priceIdr,
        creditsAllocated: 0,
        note: 'Automatic renewal disabled; remaining credits preserved until period expiry.',
        createdAt: now,
      },
      ...(sub.history || []),
    ].slice(0, 50);
    this.db.subscriptions[userId] = sub;
    this.persist();
    return sub;
  }

  // ============================================================================
  // CREDIT WALLET ATOMIC OPERATIONS (NO NEGATIVE BALANCES, IDEMPOTENT REFUNDS)
  // ============================================================================

  recordTransaction(tx: CreditLedgerTransaction): void {
    this.db.transactions.unshift(tx);
    if (this.db.transactions.length > 2000) {
      this.db.transactions = this.db.transactions.slice(0, 2000);
    }
  }

  getTransactions(userId?: string): CreditLedgerTransaction[] {
    if (!userId) return this.db.transactions;
    return this.db.transactions.filter((tx) => tx.userId === userId);
  }

  getIdempotencyRecord(userId: string, key?: string): IdempotencyRecord | undefined {
    if (!key) return undefined;
    return this.db.idempotency[`${userId}:${key}`];
  }

  saveIdempotencyRecord(record: IdempotencyRecord): void {
    this.db.idempotency[`${record.userId}:${record.key}`] = record;
    this.persist();
  }

  deductCreditsAtomic(params: {
    userId: string;
    userEmail?: string;
    amount: number;
    description: string;
    jobId?: string;
    referenceId?: string;
    txType?: LedgerTransactionType;
    idempotencyKey?: string;
  }): {
    success: boolean;
    error?: string;
    wallet?: CreditWalletBalance;
    tx?: CreditLedgerTransaction;
    alreadyProcessed?: boolean;
  } {
    const amount = Math.max(0, Math.round(params.amount));
    if (params.idempotencyKey) {
      const existing = this.getIdempotencyRecord(params.userId, params.idempotencyKey);
      if (existing) {
        return {
          success: true,
          alreadyProcessed: true,
          wallet: this.getOrCreateWallet(params.userId, params.userEmail),
        };
      }
    }

    const wallet = this.getOrCreateWallet(params.userId, params.userEmail);
    if (wallet.status === 'FROZEN') {
      return {
        success: false,
        error: 'Wallet is temporarily frozen by administrator.',
        wallet,
      };
    }

    if (amount <= 0) {
      return { success: true, wallet };
    }

    if (wallet.totalAvailable < amount) {
      return {
        success: false,
        error: `Insufficient credits. Required: ${amount} credits, available: ${wallet.totalAvailable} credits.`,
        wallet,
      };
    }

    let remainingToDeduct = amount;
    let monthlyDeducted = 0;
    let purchasedDeducted = 0;

    if (wallet.monthlySubscriptionCredits >= remainingToDeduct) {
      wallet.monthlySubscriptionCredits -= remainingToDeduct;
      monthlyDeducted = remainingToDeduct;
      remainingToDeduct = 0;
    } else {
      monthlyDeducted = wallet.monthlySubscriptionCredits;
      remainingToDeduct -= wallet.monthlySubscriptionCredits;
      wallet.monthlySubscriptionCredits = 0;
      purchasedDeducted = Math.min(wallet.purchasedTopUpCredits, remainingToDeduct);
      wallet.purchasedTopUpCredits = Math.max(0, wallet.purchasedTopUpCredits - remainingToDeduct);
    }

    wallet.totalAvailable = Math.max(
      0,
      wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits
    );
    wallet.usedCredits = (wallet.usedCredits || 0) + amount;
    wallet.updatedAt = new Date().toISOString();
    this.db.wallets[params.userId] = wallet;

    if (this.db.subscriptions[params.userId]) {
      this.db.subscriptions[params.userId].remainingMonthlyCredits =
        wallet.monthlySubscriptionCredits;
    }
    if (this.db.users[params.userId]) {
      this.db.users[params.userId].totalCredits = wallet.totalAvailable;
      this.db.users[params.userId].usedCredits = wallet.usedCredits;
    }

    const tx: CreditLedgerTransaction = {
      id: `tx-${params.txType === 'VIRTUAL_GIFT_SEND' ? 'gift' : 'gen'}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: params.userId,
      userEmail: params.userEmail,
      type: params.txType || 'GENERATION_DEDUCT',
      amount: -amount,
      balanceAfter: wallet.totalAvailable,
      monthlyDeducted,
      purchasedDeducted,
      description: params.description,
      referenceId: params.referenceId,
      jobId: params.jobId,
      idempotencyKey: params.idempotencyKey,
      createdAt: wallet.updatedAt,
    };
    this.recordTransaction(tx);

    this.db.apiStock.tokensConsumed += amount * 800;
    this.db.apiStock.tokensRemaining = Math.max(
      0,
      this.db.apiStock.totalTokensPurchased - this.db.apiStock.tokensConsumed
    );
    this.db.apiStock.updatedAt = wallet.updatedAt;

    this.persist();
    return { success: true, wallet, tx };
  }

  refundCreditsIdempotent(params: {
    userId: string;
    amount: number;
    reason: string;
    jobId?: string;
  }): { refunded: boolean; wallet: CreditWalletBalance; tx?: CreditLedgerTransaction } {
    const wallet = this.getOrCreateWallet(params.userId);
    if (!this.db.costConfig.autoRefundOnFailure) {
      return { refunded: false, wallet };
    }
    if (params.jobId && this.db.refundedJobIds.includes(params.jobId)) {
      return { refunded: false, wallet };
    }

    const amount = Math.max(0, Math.round(params.amount));
    if (amount <= 0) {
      return { refunded: false, wallet };
    }

    wallet.purchasedTopUpCredits += amount;
    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.usedCredits = Math.max(0, (wallet.usedCredits || 0) - amount);
    wallet.updatedAt = new Date().toISOString();
    this.db.wallets[params.userId] = wallet;

    if (params.jobId) {
      this.db.refundedJobIds.push(params.jobId);
      const job = this.db.jobs[params.jobId];
      if (job) {
        job.status = 'REFUNDED';
        job.refunded = true;
        job.errorMessage = params.reason;
      }
    }

    if (this.db.users[params.userId]) {
      this.db.users[params.userId].totalCredits = wallet.totalAvailable;
      this.db.users[params.userId].usedCredits = wallet.usedCredits;
    }

    const tx: CreditLedgerTransaction = {
      id: `tx-refund-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: params.userId,
      type: 'GENERATION_REFUND',
      amount,
      balanceAfter: wallet.totalAvailable,
      description: `Automatic failure refund: ${params.reason} (+${amount} credits)`,
      jobId: params.jobId,
      createdAt: wallet.updatedAt,
    };
    this.recordTransaction(tx);
    this.persist();
    return { refunded: true, wallet, tx };
  }

  addTopUpCreditsVerified(params: {
    userId: string;
    userEmail?: string;
    packageId: string;
    paymentMethod: string;
    paymentRef: string;
  }): { wallet: CreditWalletBalance; transaction: CreditLedgerTransaction } {
    const pkg = this.db.packages.find((p) => p.id === params.packageId && p.isActive !== false);
    if (!pkg) {
      throw new Error('Selected credit package is invalid or unavailable.');
    }
    const wallet = this.getOrCreateWallet(params.userId, params.userEmail);
    if (wallet.status === 'FROZEN') {
      throw new Error('Wallet is temporarily frozen.');
    }
    if (params.paymentRef) {
      const duplicate = this.db.transactions.find(
        (t) => t.type === 'TOP_UP_PURCHASE' && t.referenceId === params.paymentRef
      );
      if (duplicate) {
        return { wallet, transaction: duplicate };
      }
    }

    wallet.purchasedTopUpCredits += pkg.credits;
    wallet.purchasedCreditExpiry = new Date(
      Date.now() + pkg.validityDays * 24 * 60 * 60 * 1000
    ).toISOString();
    wallet.totalAvailable = wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits;
    wallet.updatedAt = new Date().toISOString();
    this.db.wallets[params.userId] = wallet;

    if (this.db.users[params.userId]) {
      this.db.users[params.userId].totalCredits = wallet.totalAvailable;
    }

    const tx: CreditLedgerTransaction = {
      id: `tx-topup-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: params.userId,
      userEmail: params.userEmail,
      type: 'TOP_UP_PURCHASE',
      amount: pkg.credits,
      balanceAfter: wallet.totalAvailable,
      referenceId: params.paymentRef,
      paymentMethod: params.paymentMethod,
      description: `Verified purchase: ${pkg.name} (+${pkg.credits} Credits)`,
      createdAt: wallet.updatedAt,
    };
    this.recordTransaction(tx);
    this.persist();
    return { wallet, transaction: tx };
  }

  adminAdjustCredits(params: {
    targetUserId: string;
    creditAdjustment: number;
    reason: string;
    actor: { uid: string; email: string };
  }): { wallet: CreditWalletBalance; transaction: CreditLedgerTransaction } {
    const wallet = this.getOrCreateWallet(params.targetUserId);
    const delta = Math.round(Number(params.creditAdjustment));
    if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 10_000_000) {
      throw new Error('Invalid credit adjustment amount.');
    }

    if (delta >= 0) {
      wallet.purchasedTopUpCredits += delta;
    } else {
      let rem = Math.abs(delta);
      const fromPurchased = Math.min(wallet.purchasedTopUpCredits, rem);
      wallet.purchasedTopUpCredits -= fromPurchased;
      rem -= fromPurchased;
      if (rem > 0) {
        wallet.monthlySubscriptionCredits = Math.max(0, wallet.monthlySubscriptionCredits - rem);
      }
    }

    wallet.totalAvailable = Math.max(
      0,
      wallet.monthlySubscriptionCredits + wallet.purchasedTopUpCredits
    );
    wallet.updatedAt = new Date().toISOString();
    this.db.wallets[params.targetUserId] = wallet;

    if (this.db.users[params.targetUserId]) {
      this.db.users[params.targetUserId].totalCredits = wallet.totalAvailable;
    }

    const tx: CreditLedgerTransaction = {
      id: `tx-admin-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      userId: params.targetUserId,
      type: 'ADMIN_ADJUSTMENT',
      amount: delta,
      balanceAfter: wallet.totalAvailable,
      description: `Admin adjustment by ${params.actor.email}: ${params.reason}`,
      createdAt: wallet.updatedAt,
    };
    this.recordTransaction(tx);

    this.addAuditLog({
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      action: 'ADMIN_CREDIT_ADJUSTMENT',
      targetType: 'wallet',
      targetId: params.targetUserId,
      reason: params.reason,
      metadata: { delta, balanceAfter: wallet.totalAvailable },
    });

    this.persist();
    return { wallet, transaction: tx };
  }

  // ============================================================================
  // JOBS
  // ============================================================================

  createJob(job: SeedanceGenerationJob): SeedanceGenerationJob {
    this.db.jobs[job.id] = job;
    this.persist();
    return job;
  }

  getJob(jobId: string): SeedanceGenerationJob | undefined {
    return this.db.jobs[jobId];
  }

  updateJob(
    jobId: string,
    updates: Partial<SeedanceGenerationJob>
  ): SeedanceGenerationJob | undefined {
    const existing = this.db.jobs[jobId];
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.db.jobs[jobId] = updated;
    this.persist();
    return updated;
  }

  getUserJobs(userId: string): SeedanceGenerationJob[] {
    return Object.values(this.db.jobs)
      .filter((j) => j.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // ============================================================================
  // PERSONAL AI AGENT & ISOLATED CREATIVE MEMORY (PER USER)
  // ============================================================================

  isAgentMemoryEnabled(userId: string): boolean {
    return this.db.agentMemoryEnabled[userId] !== false;
  }

  setAgentMemoryEnabled(userId: string, enabled: boolean): boolean {
    this.db.agentMemoryEnabled[userId] = Boolean(enabled);
    this.persist();
    return this.db.agentMemoryEnabled[userId];
  }

  getUserAgentMemories(userId: string): AgentMemoryItem[] {
    return (this.db.agentMemories[userId] || []).map((m) => ({ ...m }));
  }

  addUserAgentMemory(
    userId: string,
    params: {
      category: CreativeMemoryCategory;
      title: string;
      content: string;
      referenceImageUrls?: string[];
      enabled?: boolean;
    }
  ): AgentMemoryItem {
    const now = new Date().toISOString();
    const item: AgentMemoryItem = {
      id: `mem-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId,
      category: params.category,
      title: params.title.trim().slice(0, 120),
      content: params.content.trim().slice(0, 4000),
      referenceImageUrls: Array.isArray(params.referenceImageUrls)
        ? params.referenceImageUrls.slice(0, 10)
        : [],
      enabled: params.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    const list = this.db.agentMemories[userId] || [];
    this.db.agentMemories[userId] = [item, ...list].slice(0, 200);
    this.persist();
    return item;
  }

  updateUserAgentMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Pick<AgentMemoryItem, 'category' | 'title' | 'content' | 'enabled' | 'referenceImageUrls'>>
  ): AgentMemoryItem | null {
    const list = this.db.agentMemories[userId] || [];
    const idx = list.findIndex((m) => m.id === memoryId && m.userId === userId);
    if (idx === -1) return null;
    const updated: AgentMemoryItem = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    this.db.agentMemories[userId] = list;
    this.persist();
    return updated;
  }

  deleteUserAgentMemory(userId: string, memoryId: string): boolean {
    const list = this.db.agentMemories[userId] || [];
    const filtered = list.filter((m) => m.id !== memoryId);
    if (filtered.length === list.length) return false;
    this.db.agentMemories[userId] = filtered;
    this.persist();
    return true;
  }

  getUserConversations(userId: string): AgentConversation[] {
    return (this.db.agentConversations[userId] || [])
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  createConversation(userId: string, title = 'New Seedance Session'): AgentConversation {
    const now = new Date().toISOString();
    const conv: AgentConversation = {
      id: `conv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId,
      title: title.trim().slice(0, 100) || 'New Seedance Session',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    const list = this.db.agentConversations[userId] || [];
    this.db.agentConversations[userId] = [conv, ...list].slice(0, 50);
    this.persist();
    return conv;
  }

  appendConversationMessages(
    userId: string,
    conversationId: string,
    newMessages: AgentChatMessage[],
    titleIfDefault?: string
  ): AgentConversation {
    const list = this.db.agentConversations[userId] || [];
    let conv = list.find((c) => c.id === conversationId && c.userId === userId);
    if (!conv) {
      conv = this.createConversation(userId, titleIfDefault || 'Seedance Agent Thread');
    }
    if (
      titleIfDefault &&
      (conv.title === 'New Seedance Session' || conv.messages.length === 0)
    ) {
      conv.title = titleIfDefault.trim().slice(0, 64);
    }
    conv.messages = [...conv.messages, ...newMessages].slice(-100);
    conv.updatedAt = new Date().toISOString();
    this.db.agentConversations[userId] = [
      conv,
      ...(this.db.agentConversations[userId] || []).filter((c) => c.id !== conv!.id),
    ];
    this.persist();
    return conv;
  }

  deleteConversation(userId: string, conversationId: string): boolean {
    const list = this.db.agentConversations[userId] || [];
    const filtered = list.filter((c) => c.id !== conversationId);
    if (filtered.length === list.length) return false;
    this.db.agentConversations[userId] = filtered;
    this.persist();
    return true;
  }

  // ============================================================================
  // LIVESTREAMS (STRICTLY REAL DB SESSIONS ONLY — ZERO FAKE DATA)
  // ============================================================================

  createLivestream(params: {
    hostUserId: string;
    hostUsername: string;
    hostDisplayName: string;
    hostAvatar?: string;
    title: string;
    description: string;
    visibility: LivestreamVisibility;
    accessCode?: string;
    allowedUserIds?: string[];
    groupId?: string;
    groupName?: string;
    groupVisibility?: 'PUBLIC' | 'PRIVATE';
  }): LivestreamSession {
    const now = new Date().toISOString();
    const id = `stream-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const accessCodeHash = params.accessCode?.trim()
      ? crypto.createHash('sha256').update(params.accessCode.trim()).digest('hex')
      : undefined;

    const effectiveVisibility: LivestreamVisibility =
      params.groupVisibility === 'PRIVATE'
        ? 'PRIVATE'
        : params.visibility === 'PRIVATE'
        ? 'PRIVATE'
        : 'PUBLIC';

    const record: StoredLivestreamRecord = {
      id,
      hostUserId: params.hostUserId,
      hostUsername: params.hostUsername,
      hostDisplayName: params.hostDisplayName,
      hostAvatar: params.hostAvatar || '',
      title: params.title.trim().slice(0, 120),
      description: params.description.trim().slice(0, 500),
      visibility: effectiveVisibility,
      hasAccessCode: Boolean(accessCodeHash),
      accessCodeHash,
      allowedUserIds: Array.from(new Set([params.hostUserId, ...(params.allowedUserIds || [])])),
      bannedUserIds: [],
      mutedUserIds: [],
      status: 'LIVE',
      viewerCount: 0,
      activeViewerIds: [],
      viewers: [],
      hasPublisherStream: false,
      groupId: params.groupId,
      groupName: params.groupName,
      groupVisibility: params.groupVisibility,
      startedAt: now,
      updatedAt: now,
    };

    this.db.livestreams[id] = record;
    this.db.livestreamChats[id] = [];
    this.persist();
    return this.sanitizeLivestream(record);
  }

  private sanitizeLivestream(record: StoredLivestreamRecord): LivestreamSession {
    const { accessCodeHash: _omitted, ...clean } = record;
    return {
      ...clean,
      hasAccessCode: Boolean(record.accessCodeHash),
    };
  }

  syncGroupLivestreamsPrivacy(
    groupId: string,
    groupVisibility: 'PUBLIC' | 'PRIVATE',
    activeMemberIds: string[]
  ): void {
    let changed = false;
    for (const stream of Object.values(this.db.livestreams)) {
      if (stream.groupId === groupId) {
        stream.groupVisibility = groupVisibility;
        if (groupVisibility === 'PRIVATE') {
          stream.visibility = 'PRIVATE';
          stream.allowedUserIds = Array.from(new Set([stream.hostUserId, ...activeMemberIds]));
        } else if (!stream.accessCodeHash) {
          stream.visibility = 'PUBLIC';
        }
        stream.updatedAt = new Date().toISOString();
        changed = true;
      }
    }
    if (changed) {
      this.persist();
    }
  }

  getLivestreams(viewerUid?: string, includeEnded = false, groupId?: string): LivestreamSession[] {
    return Object.values(this.db.livestreams)
      .filter((s) => (includeEnded ? true : s.status === 'LIVE'))
      .filter((s) => (groupId ? s.groupId === groupId : true))
      .filter((s) => {
        if (s.visibility === 'PUBLIC' && s.groupVisibility !== 'PRIVATE') return true;
        if (!viewerUid) return false;
        return (
          s.hostUserId === viewerUid ||
          s.allowedUserIds.includes(viewerUid) ||
          s.activeViewerIds.includes(viewerUid)
        );
      })
      .map((s) => this.sanitizeLivestream(s))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getAllLivestreamsAdmin(): LivestreamSession[] {
    return Object.values(this.db.livestreams)
      .map((s) => this.sanitizeLivestream(s))
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  getLivestreamRaw(streamId: string): StoredLivestreamRecord | undefined {
    return this.db.livestreams[streamId];
  }

  authorizeStreamAccess(
    streamId: string,
    user: { uid: string; username: string; displayName: string },
    accessCode?: string
  ): { ok: boolean; error?: string; stream?: LivestreamSession } {
    const s = this.db.livestreams[streamId];
    if (!s || s.status !== 'LIVE') {
      return { ok: false, error: 'Livestream is not active or does not exist.' };
    }
    if (s.bannedUserIds.includes(user.uid)) {
      return { ok: false, error: 'You have been removed from this livestream by the host.' };
    }
    if (s.visibility === 'PRIVATE' && s.hostUserId !== user.uid && !s.allowedUserIds.includes(user.uid)) {
      if (!s.accessCodeHash) {
        return { ok: false, error: 'This private livestream requires host authorization.' };
      }
      const lockKey = `stream_code:${user.uid}:${streamId}`;
      const lock = bruteForceGuard.checkLocked(lockKey);
      if (lock.locked) {
        return { ok: false, error: `Too many invalid access code attempts. Try again in ${lock.retryAfterSec}s.` };
      }
      const suppliedHash = accessCode?.trim()
        ? crypto.createHash('sha256').update(accessCode.trim()).digest('hex')
        : '';
      if (!suppliedHash || !constantTimeCompare(suppliedHash, s.accessCodeHash)) {
        const fail = bruteForceGuard.recordFailure(lockKey, 5, 15 * 60_000);
        return {
          ok: false,
          error: fail.locked
            ? `Too many failed attempts. Locked for ${fail.retryAfterSec}s.`
            : 'Invalid access code for private livestream.',
        };
      }
      bruteForceGuard.reset(lockKey);
      s.allowedUserIds.push(user.uid);
    }

    if (user.uid !== s.hostUserId && !s.activeViewerIds.includes(user.uid)) {
      s.activeViewerIds.push(user.uid);
      const viewers = s.viewers || [];
      viewers.push({
        userId: user.uid,
        username: user.username,
        displayName: user.displayName,
        joinedAt: new Date().toISOString(),
        isMuted: s.mutedUserIds.includes(user.uid),
      });
      s.viewers = viewers;
      s.viewerCount = s.activeViewerIds.length;
    }
    s.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true, stream: this.sanitizeLivestream(s) };
  }

  updateStreamPresence(
    streamId: string,
    user: { uid: string; username: string; displayName: string },
    action: 'join' | 'leave'
  ): LivestreamSession | undefined {
    const s = this.db.livestreams[streamId];
    if (!s) return undefined;

    if (action === 'join' && user.uid !== s.hostUserId) {
      if (!s.activeViewerIds.includes(user.uid)) {
        s.activeViewerIds.push(user.uid);
        s.viewers = [
          ...(s.viewers || []).filter((v) => v.userId !== user.uid),
          {
            userId: user.uid,
            username: user.username,
            displayName: user.displayName,
            joinedAt: new Date().toISOString(),
            isMuted: s.mutedUserIds.includes(user.uid),
          },
        ];
      }
    } else if (action === 'leave') {
      s.activeViewerIds = s.activeViewerIds.filter((id) => id !== user.uid);
      s.viewers = (s.viewers || []).filter((v) => v.userId !== user.uid);
    }

    s.viewerCount = s.activeViewerIds.length;
    s.updatedAt = new Date().toISOString();
    this.persist();
    return this.sanitizeLivestream(s);
  }

  setStreamPublisherActive(streamId: string, active: boolean): void {
    const s = this.db.livestreams[streamId];
    if (!s) return;
    s.hasPublisherStream = active;
    s.updatedAt = new Date().toISOString();
    this.persist();
  }

  endLivestream(streamId: string): LivestreamSession | undefined {
    const s = this.db.livestreams[streamId];
    if (!s) return undefined;
    s.status = 'ENDED';
    s.hasPublisherStream = false;
    s.activeViewerIds = [];
    s.viewers = [];
    s.viewerCount = 0;
    s.endedAt = new Date().toISOString();
    s.updatedAt = s.endedAt;
    this.persist();
    return this.sanitizeLivestream(s);
  }

  moderateStreamViewer(
    streamId: string,
    targetUserId: string,
    action: 'mute' | 'unmute' | 'ban'
  ): LivestreamSession | undefined {
    const s = this.db.livestreams[streamId];
    if (!s) return undefined;
    if (action === 'mute') {
      if (!s.mutedUserIds.includes(targetUserId)) s.mutedUserIds.push(targetUserId);
      s.viewers = (s.viewers || []).map((v) =>
        v.userId === targetUserId ? { ...v, isMuted: true } : v
      );
    } else if (action === 'unmute') {
      s.mutedUserIds = s.mutedUserIds.filter((id) => id !== targetUserId);
      s.viewers = (s.viewers || []).map((v) =>
        v.userId === targetUserId ? { ...v, isMuted: false } : v
      );
    } else if (action === 'ban') {
      if (!s.bannedUserIds.includes(targetUserId)) s.bannedUserIds.push(targetUserId);
      s.activeViewerIds = s.activeViewerIds.filter((id) => id !== targetUserId);
      s.viewers = (s.viewers || []).filter((v) => v.userId !== targetUserId);
      s.viewerCount = s.activeViewerIds.length;
    }
    s.updatedAt = new Date().toISOString();
    this.persist();
    return this.sanitizeLivestream(s);
  }

  getStreamMessages(streamId: string): LivestreamChatMessage[] {
    return this.db.livestreamChats[streamId] || [];
  }

  addStreamMessage(
    streamId: string,
    msg: Omit<LivestreamChatMessage, 'id' | 'createdAt' | 'streamId'>
  ): LivestreamChatMessage {
    const entry: LivestreamChatMessage = {
      ...msg,
      id: `smsg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      streamId,
      createdAt: new Date().toISOString(),
    };
    const list = this.db.livestreamChats[streamId] || [];
    list.push(entry);
    this.db.livestreamChats[streamId] = list.slice(-200);
    this.persist();
    return entry;
  }

  // ============================================================================
  // MULTIPLAYER CALL LIVE ROOMS (STRICTLY REAL DB ROOMS — ZERO DEMO ROOMS)
  // ============================================================================

  createLiveRoom(params: {
    creatorUserId: string;
    creatorUsername: string;
    creatorDisplayName: string;
    creatorAvatar?: string;
    name: string;
    description: string;
    visibility: LiveCallRoomVisibility;
    maxParticipants?: number;
  }): LiveCallRoom {
    const now = new Date().toISOString();
    const id = `callroom-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    const room: LiveCallRoom = {
      id,
      name: params.name.trim().slice(0, 100),
      description: params.description.trim().slice(0, 400),
      visibility: params.visibility,
      creatorUserId: params.creatorUserId,
      creatorUsername: params.creatorUsername,
      creatorDisplayName: params.creatorDisplayName,
      inviteCode,
      invitedUserIds: [params.creatorUserId],
      bannedUserIds: [],
      maxParticipants: Math.max(2, Math.min(32, Number(params.maxParticipants || 8))),
      locked: false,
      status: 'ACTIVE',
      participants: [
        {
          userId: params.creatorUserId,
          username: params.creatorUsername,
          displayName: params.creatorDisplayName,
          avatar: params.creatorAvatar || '',
          role: 'CREATOR',
          audioEnabled: true,
          videoEnabled: true,
          mutedByHost: false,
          joinedAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    this.db.liveRooms[id] = room;
    this.persist();
    return room;
  }

  getLiveRooms(viewerUid?: string): LiveCallRoom[] {
    return Object.values(this.db.liveRooms)
      .filter((r) => r.status === 'ACTIVE')
      .filter((r) => {
        if (r.visibility === 'PUBLIC') return true;
        if (!viewerUid) return false;
        return (
          r.creatorUserId === viewerUid ||
          r.invitedUserIds.includes(viewerUid) ||
          r.participants.some((p) => p.userId === viewerUid)
        );
      })
      .map((r) => {
        // Only expose inviteCode to creator or admin callers via specific method; mask in general list unless creator
        if (r.creatorUserId === viewerUid) return r;
        const { inviteCode: _hidden, ...rest } = r;
        return rest as LiveCallRoom;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getAllRoomsAdmin(): LiveCallRoom[] {
    return Object.values(this.db.liveRooms).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getLiveRoomById(roomId: string): LiveCallRoom | undefined {
    return this.db.liveRooms[roomId];
  }

  joinLiveRoom(params: {
    roomId?: string;
    inviteCode?: string;
    user: { uid: string; username: string; displayName: string; avatar?: string };
  }): { ok: boolean; error?: string; room?: LiveCallRoom } {
    const lockKey = `room_code:${params.user.uid}:${params.roomId || 'invite'}`;
    if (params.inviteCode) {
      const lock = bruteForceGuard.checkLocked(lockKey);
      if (lock.locked) {
        return { ok: false, error: `Too many invalid invite code attempts. Retry in ${lock.retryAfterSec}s.` };
      }
    }

    let room: LiveCallRoom | undefined;
    if (params.roomId) {
      room = this.db.liveRooms[params.roomId];
    } else if (params.inviteCode) {
      const normalized = params.inviteCode.trim().toUpperCase();
      room = Object.values(this.db.liveRooms).find(
        (r) => r.status === 'ACTIVE' && r.inviteCode && constantTimeCompare(r.inviteCode, normalized)
      );
      if (!room) {
        bruteForceGuard.recordFailure(lockKey, 8, 15 * 60_000);
      }
    }

    if (!room || room.status !== 'ACTIVE') {
      return { ok: false, error: 'Live room does not exist or has been closed.' };
    }
    if (room.bannedUserIds.includes(params.user.uid)) {
      return { ok: false, error: 'You were removed from this room by the host.' };
    }

    const alreadyIn = room.participants.some((p) => p.userId === params.user.uid);
    if (!alreadyIn) {
      if (room.locked && params.user.uid !== room.creatorUserId) {
        return { ok: false, error: 'This room is currently locked by the creator.' };
      }
      const codeMatch = Boolean(
        params.inviteCode &&
        room.inviteCode &&
        constantTimeCompare(room.inviteCode, params.inviteCode.trim().toUpperCase())
      );

      if (
        room.visibility !== 'PUBLIC' &&
        params.user.uid !== room.creatorUserId &&
        !room.invitedUserIds.includes(params.user.uid) &&
        !codeMatch
      ) {
        if (params.inviteCode) bruteForceGuard.recordFailure(lockKey, 8, 15 * 60_000);
        return { ok: false, error: 'This room requires an invitation or invite code.' };
      }
      if (codeMatch) bruteForceGuard.reset(lockKey);

      if (room.participants.length >= room.maxParticipants) {
        return { ok: false, error: `Room has reached capacity (${room.maxParticipants} participants).` };
      }

      if (codeMatch && !room.invitedUserIds.includes(params.user.uid)) {
        room.invitedUserIds.push(params.user.uid);
      }

      const participant: LiveCallParticipant = {
        userId: params.user.uid,
        username: params.user.username,
        displayName: params.user.displayName,
        avatar: params.user.avatar || '',
        role: params.user.uid === room.creatorUserId ? 'CREATOR' : 'PARTICIPANT',
        audioEnabled: true,
        videoEnabled: true,
        mutedByHost: false,
        joinedAt: new Date().toISOString(),
      };
      room.participants.push(participant);
    }

    room.updatedAt = new Date().toISOString();
    this.persist();
    return { ok: true, room };
  }

  leaveLiveRoom(roomId: string, userId: string): LiveCallRoom | undefined {
    const room = this.db.liveRooms[roomId];
    if (!room) return undefined;
    room.participants = room.participants.filter((p) => p.userId !== userId);
    room.updatedAt = new Date().toISOString();
    this.persist();
    return room;
  }

  updateParticipantMediaState(
    roomId: string,
    userId: string,
    state: { audioEnabled?: boolean; videoEnabled?: boolean }
  ): LiveCallRoom | undefined {
    const room = this.db.liveRooms[roomId];
    if (!room) return undefined;
    room.participants = room.participants.map((p) => {
      if (p.userId !== userId) return p;
      return {
        ...p,
        audioEnabled:
          typeof state.audioEnabled === 'boolean'
            ? p.mutedByHost
              ? false
              : state.audioEnabled
            : p.audioEnabled,
        videoEnabled:
          typeof state.videoEnabled === 'boolean' ? state.videoEnabled : p.videoEnabled,
      };
    });
    room.updatedAt = new Date().toISOString();
    this.persist();
    return room;
  }

  inviteToRoom(roomId: string, targetUidOrEmail: string): LiveCallRoom | undefined {
    const room = this.db.liveRooms[roomId];
    if (!room) return undefined;
    const matchedUser = Object.values(this.db.users).find(
      (u) =>
        u.uid === targetUidOrEmail ||
        u.email.toLowerCase() === targetUidOrEmail.toLowerCase() ||
        u.username.toLowerCase() === targetUidOrEmail.replace(/^@/, '').toLowerCase()
    );
    const idToAdd = matchedUser ? matchedUser.uid : targetUidOrEmail;
    if (!room.invitedUserIds.includes(idToAdd)) {
      room.invitedUserIds.push(idToAdd);
    }
    room.updatedAt = new Date().toISOString();
    this.persist();
    return room;
  }

  moderateRoom(
    roomId: string,
    action: 'mute_participant' | 'unmute_participant' | 'remove_participant' | 'lock' | 'unlock' | 'close',
    targetUserId?: string
  ): LiveCallRoom | undefined {
    const room = this.db.liveRooms[roomId];
    if (!room) return undefined;
    const now = new Date().toISOString();

    if (action === 'mute_participant' && targetUserId) {
      room.participants = room.participants.map((p) =>
        p.userId === targetUserId ? { ...p, audioEnabled: false, mutedByHost: true } : p
      );
    } else if (action === 'unmute_participant' && targetUserId) {
      room.participants = room.participants.map((p) =>
        p.userId === targetUserId ? { ...p, mutedByHost: false } : p
      );
    } else if (action === 'remove_participant' && targetUserId) {
      if (!room.bannedUserIds.includes(targetUserId)) {
        room.bannedUserIds.push(targetUserId);
      }
      room.participants = room.participants.filter((p) => p.userId !== targetUserId);
    } else if (action === 'lock') {
      room.locked = true;
    } else if (action === 'unlock') {
      room.locked = false;
    } else if (action === 'close') {
      room.status = 'CLOSED';
      room.participants = [];
      room.closedAt = now;
    }

    room.updatedAt = now;
    this.persist();
    return room;
  }

  // ============================================================================
  // ADMIN AUDIT & REAL PLATFORM ANALYTICS
  // ============================================================================

  addAuditLog(entry: Omit<PlatformAdminAuditEntry, 'id' | 'createdAt'>): PlatformAdminAuditEntry {
    const log: PlatformAdminAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      createdAt: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(log);
    this.db.auditLogs = this.db.auditLogs.slice(0, 1000);
    return log;
  }

  getAuditLogs(limit = 100): PlatformAdminAuditEntry[] {
    return this.db.auditLogs.slice(0, limit);
  }

  getApiStock(): BytePlusApiStock {
    const total = this.db.apiStock.totalTokensPurchased || 0;
    const pct = total > 0 ? (this.db.apiStock.tokensRemaining / total) * 100 : 100;
    this.db.apiStock.isLowStockWarning = total > 0 && pct <= this.db.apiStock.lowStockThresholdPercent;
    return this.db.apiStock;
  }

  recordApiStockPurchase(
    rawTokens: number,
    rawExpenditureUsd: number,
    packageName: string,
    actor?: { uid: string; email: string }
  ): BytePlusApiStock {
    const tokens = Math.round(Number(rawTokens));
    const expenditureUsd = Number(rawExpenditureUsd);
    if (!Number.isSafeInteger(tokens) || tokens <= 0 || !Number.isFinite(expenditureUsd) || expenditureUsd < 0) {
      throw new Error('Invalid stock token amount or expenditure.');
    }
    this.db.apiStock.packageName = String(packageName || 'API Token Batch').slice(0, 120);
    this.db.apiStock.totalTokensPurchased += tokens;
    this.db.apiStock.tokensRemaining += tokens;
    this.db.apiStock.expenditureUsd += expenditureUsd;
    this.db.apiStock.purchaseDate = new Date().toISOString();
    this.db.apiStock.updatedAt = new Date().toISOString();
    if (actor) {
      this.addAuditLog({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'RECORD_API_STOCK',
        targetType: 'apiStock',
        targetId: this.db.apiStock.id,
        reason: `Added ${tokens} tokens ($${expenditureUsd})`,
      });
    }
    this.persist();
    return this.getApiStock();
  }

  getFinancialAnalytics(usdToIdrRate = DEFAULT_USD_TO_IDR): PlatformFinancialAnalytics {
    const totalUsers = Object.keys(this.db.users).length || Object.keys(this.db.wallets).length;
    const subs = Object.values(this.db.subscriptions);
    const activeSubscribers = subs.filter(
      (s) => s.status === 'ACTIVE' && s.planTier !== 'FREE'
    ).length;

    const distribution: Record<string, number> = {
      FREE: 0,
      BASIC: 0,
      PRO: 0,
      PREMIUM: 0,
      ENTERPRISE: 0,
    };

    let mrrIdr = 0;
    for (const sub of subs) {
      const t = normalizeTierId(sub.planTier);
      distribution[t] = (distribution[t] || 0) + 1;
      if (sub.status === 'ACTIVE' && sub.billingStatus === 'PAID') {
        mrrIdr += sub.priceIdr;
      }
    }

    let topUpRevenueIdr = 0;
    let totalCreditsConsumed = 0;
    let totalCreditsRefunded = 0;
    for (const tx of this.db.transactions) {
      if (tx.type === 'TOP_UP_PURCHASE') {
        topUpRevenueIdr += tx.amount * RETAIL_PRICE_PER_CREDIT_IDR;
      } else if (tx.type === 'GENERATION_DEDUCT') {
        totalCreditsConsumed += Math.abs(tx.amount);
      } else if (tx.type === 'GENERATION_REFUND') {
        totalCreditsRefunded += tx.amount;
      }
    }

    const jobs = Object.values(this.db.jobs);
    const completedJobs = jobs.filter((j) => j.status === 'COMPLETED').length;
    const failedJobs = jobs.filter((j) => j.status === 'FAILED' || j.status === 'REFUNDED').length;

    let outstandingCredits = 0;
    for (const w of Object.values(this.db.wallets)) {
      outstandingCredits += w.totalAvailable;
    }

    const activeLivestreamsCount = Object.values(this.db.livestreams).filter(
      (s) => s.status === 'LIVE'
    ).length;
    const activeRoomsCount = Object.values(this.db.liveRooms).filter(
      (r) => r.status === 'ACTIVE'
    ).length;

    const totalApiExpenditureUsd = this.db.apiStock.expenditureUsd;
    const totalApiExpenditureIdr = totalApiExpenditureUsd * usdToIdrRate;
    const grossRevenueIdr = mrrIdr + topUpRevenueIdr;
    const estimatedGrossProfitIdr = grossRevenueIdr - totalApiExpenditureIdr;
    const grossMarginPercent =
      grossRevenueIdr > 0 ? (estimatedGrossProfitIdr / grossRevenueIdr) * 100 : 0;

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
      totalGeneratedVideos: completedJobs,
      totalCreditsConsumed,
      totalCreditsRefunded,
      averageGenerationCostCredits:
        jobs.length > 0 ? Math.round(totalCreditsConsumed / jobs.length) : 0,
      failedGenerationsCount: failedJobs,
      failedGenerationRefundsIdr: totalCreditsRefunded * RETAIL_PRICE_PER_CREDIT_IDR,
      totalRefundedCredits: totalCreditsRefunded,
      totalOutstandingCreditLiabilities: outstandingCredits,
      outstandingLiabilitiesIdr: outstandingCredits * RETAIL_PRICE_PER_CREDIT_IDR,
      apiStockRemainingTokens: this.db.apiStock.tokensRemaining,
      isStockWarning: this.getApiStock().isLowStockWarning,
      usdToIdrExchangeRate: usdToIdrRate,
      activeLivestreamsCount,
      activeRoomsCount,
      paymentProviderConfigured: Boolean(
        process.env.STRIPE_SECRET_KEY?.trim() || process.env.MIDTRANS_SERVER_KEY?.trim()
      ),
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY?.trim() &&
          !process.env.GEMINI_API_KEY.startsWith('MY_')
      ),
      bytedanceConfigured: Boolean(
        (process.env.BYTEDANCE_API_KEY || process.env.ARK_API_KEY || '').trim() &&
          !(process.env.BYTEDANCE_API_KEY || '').startsWith('YOUR_')
      ),
      updatedAt: new Date().toISOString(),
    };
  }
}

export const seedancePlatformStore = new SeedancePlatformStore();

registerAccountStatusChecker((uid: string) => {
  const rec = seedancePlatformStore.getUserRecord(uid);
  if (!rec) return null;
  return {
    suspended: rec.status === 'SUSPENDED',
    role: rec.role,
  };
});
