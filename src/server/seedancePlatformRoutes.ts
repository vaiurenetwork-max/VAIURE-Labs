/**
 * VAIURE Labs — Seedance 2.5 Platform Express API Routes (/api/labs/*)
 * Enforces verified Firebase ID token auth on all private/financial mutations,
 * never fakes paid payment completions, calculates dynamic costs server-side,
 * prevents duplicate deductions via idempotency keys, and auto-refunds failures.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  seedancePlatformState,
  calculateSeedanceCost,
  normalizeTierId,
} from './seedanceEngine';
import { seedancePlatformStore } from './seedancePlatformStore';
import {
  optionalFirebaseAuth,
  requireFirebaseAuth,
} from './firebaseAuthMiddleware';
import {
  MembershipTier,
  SeedanceResolution,
  SeedanceDuration,
  SeedanceGenerationJob,
  CommunityVideoPost,
} from '../types/seedancePlatform';
import { byteDanceClient, getByteDanceConfigStatus } from './bytedanceClient';
import { seedanceCuratedStore } from './seedanceCuratedStore';
import {
  aiLimiter,
  financialLimiter,
  resolveSafePublicOrigin,
  sanitizeErrorMessage,
  validatePublicHttpUrl,
  validateReturnUrl,
} from './securityMiddleware';

export const seedancePlatformRouter = Router();

function getStripeSecretKey(): string {
  const k = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!k || k.startsWith('YOUR_') || k.startsWith('sk_test_placeholder')) return '';
  return k;
}

function getMidtransServerKey(): string {
  const k = (process.env.MIDTRANS_SERVER_KEY || '').trim();
  if (!k || k.startsWith('YOUR_')) return '';
  return k;
}

function isRealPaymentConfigured(): { configured: boolean; provider: string | null } {
  if (getStripeSecretKey()) return { configured: true, provider: 'stripe' };
  if (getMidtransServerKey()) return { configured: true, provider: 'midtrans' };
  return { configured: false, provider: null };
}

function syncVerifiedUser(req: Request) {
  const user = req.verifiedUser!;
  return seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });
}

// ============================================================================
// 1. MEMBERSHIP & SUBSCRIPTION SYSTEM
// ============================================================================

seedancePlatformRouter.get('/membership/plans', (_req: Request, res: Response) => {
  const plans = seedancePlatformStore.getPlans(false);
  const paymentConfig = isRealPaymentConfigured();
  res.json({
    ok: true,
    plans,
    paymentProviderConfigured: paymentConfig.configured,
    paymentProvider: paymentConfig.provider,
  });
});

seedancePlatformRouter.get('/cost-config', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    costConfig: seedancePlatformStore.getCostConfig(),
  });
});

seedancePlatformRouter.get('/membership/status', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  syncVerifiedUser(req);
  const subscription = seedancePlatformStore.getUserSubscription(user.uid, user.email);
  const wallet = seedancePlatformStore.getOrCreateWallet(user.uid, user.email);
  const paymentConfig = isRealPaymentConfigured();

  res.json({
    ok: true,
    subscription,
    wallet,
    tier: subscription.planTier,
    renewalDate: subscription.renewalDate,
    expiresAt: subscription.expiresAt,
    autoRenew: subscription.autoRenew,
    remainingMonthlyCredits: subscription.remainingMonthlyCredits,
    paymentProviderConfigured: paymentConfig.configured,
    paymentProvider: paymentConfig.provider,
  });
});

seedancePlatformRouter.post('/membership/subscribe', requireFirebaseAuth, financialLimiter, async (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    syncVerifiedUser(req);
    const { tier, returnUrl } = req.body as { tier?: MembershipTier; returnUrl?: string };

    if (!tier) {
      return res.status(400).json({ ok: false, error: 'Subscription tier is required.' });
    }

    const normTier = normalizeTierId(tier);
    const plans = seedancePlatformStore.getPlans(false);
    const plan = plans.find((p) => p.tier === normTier);
    if (!plan) {
      return res.status(404).json({ ok: false, error: `Subscription plan "${tier}" not found or inactive.` });
    }

    // Free tier or zero-cost plan activates immediately in database without external payment
    if (normTier === 'FREE' || plan.priceIdr <= 0) {
      const result = seedancePlatformStore.activateSubscriptionTier({
        userId: user.uid,
        userEmail: user.email,
        tier: normTier,
        billingStatus: 'FREE',
        paymentProvider: 'PLATFORM_FREE',
        note: `User switched to ${plan.name} tier`,
      });
      return res.json({
        ok: true,
        activated: true,
        subscription: result.subscription,
        wallet: result.wallet,
        message: `${plan.name} tier is now active.`,
      });
    }

    // Paid tiers require verified real payment gateway credentials
    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return res.status(503).json({
        ok: false,
        paymentProviderConfigured: false,
        code: 'PAYMENT_PROVIDER_UNCONFIGURED',
        error:
          'Paid subscription checkout is not configured on the server (missing STRIPE_SECRET_KEY or MIDTRANS_SERVER_KEY). Upgrade via real payment checkout once provider credentials are added, or request an administrator tier assignment.',
      });
    }

    // Real Stripe Checkout Session creation (strict Open Redirect & Host Header guard)
    const validatedReturn = validateReturnUrl(returnUrl || req.headers.origin, req, '/');
    let origin = resolveSafePublicOrigin(req);
    try {
      origin = new URL(validatedReturn).origin;
    } catch {
      origin = resolveSafePublicOrigin(req);
    }
    const bodyParams = new URLSearchParams();
    bodyParams.set('mode', 'payment');
    bodyParams.set('success_url', `${origin}?stripe_session_id={CHECKOUT_SESSION_ID}&tier=${normTier}`);
    bodyParams.set('cancel_url', `${origin}?checkout=cancelled`);
    bodyParams.set('customer_email', user.email || '');
    bodyParams.set('client_reference_id', `${user.uid}:${normTier}`);
    bodyParams.set('line_items[0][price_data][currency]', 'idr');
    bodyParams.set('line_items[0][price_data][product_data][name]', `VAIURE Seedance Lab — ${plan.name} Plan`);
    bodyParams.set('line_items[0][price_data][unit_amount]', String(Math.round(plan.priceIdr * 100)));
    bodyParams.set('line_items[0][quantity]', '1');
    bodyParams.set('metadata[userId]', user.uid);
    bodyParams.set('metadata[tier]', normTier);
    bodyParams.set('metadata[kind]', 'subscription');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });
    const stripeData = (await stripeRes.json()) as any;
    if (!stripeRes.ok || !stripeData?.url) {
      return res.status(502).json({
        ok: false,
        error: stripeData?.error?.message || 'Failed to initiate Stripe checkout session.',
      });
    }

    return res.json({
      ok: true,
      activated: false,
      requiresCheckout: true,
      checkoutUrl: stripeData.url,
      sessionId: stripeData.id,
      message: 'Redirecting to verified Stripe checkout.',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Subscription checkout failed.') });
  }
});

seedancePlatformRouter.post('/membership/auto-renew', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { autoRenew } = req.body as { autoRenew?: boolean };
  if (typeof autoRenew !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'autoRenew boolean is required.' });
  }
  const subscription = seedancePlatformStore.toggleAutoRenew(user.uid, autoRenew);
  res.json({
    ok: true,
    subscription,
    message: autoRenew
      ? 'Automatic subscription renewal enabled.'
      : 'Automatic renewal disabled. Benefits stay active until period end.',
  });
});

seedancePlatformRouter.post('/membership/cancel', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const subscription = seedancePlatformStore.cancelSubscription(user.uid);
  res.json({
    ok: true,
    subscription,
    message:
      'Subscription renewal cancelled. Remaining credits remain usable until period expiry.',
  });
});

// ============================================================================
// 2. CREDIT WALLET & DYNAMIC COST ESTIMATION
// ============================================================================

seedancePlatformRouter.get('/wallet/balance', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  syncVerifiedUser(req);
  const wallet = seedancePlatformStore.getOrCreateWallet(user.uid, user.email);
  res.json({ ok: true, wallet });
});

seedancePlatformRouter.get('/wallet/transactions', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const transactions = seedancePlatformStore.getTransactions(user.uid);
  res.json({ ok: true, transactions });
});

seedancePlatformRouter.post('/wallet/estimate', (req: Request, res: Response) => {
  try {
    const {
      model = 'seedance_25_15s',
      resolution = '720p',
      duration = 15,
      referenceImagesCount = 0,
      physicsPriority = true,
      quantity = 1,
    } = req.body as {
      model?: string;
      resolution?: SeedanceResolution;
      duration?: SeedanceDuration | number;
      referenceImagesCount?: number;
      physicsPriority?: boolean;
      quantity?: number;
    };

    const cost = calculateSeedanceCost(
      resolution,
      duration,
      referenceImagesCount,
      undefined,
      model,
      physicsPriority,
      quantity
    );
    res.json({ ok: true, cost });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Cost estimation failed.') });
  }
});

// ============================================================================
// 3. CREDIT TOP-UP STORE & VERIFIED PAYMENTS
// ============================================================================

seedancePlatformRouter.get('/store/packages', (_req: Request, res: Response) => {
  const packages = seedancePlatformStore.getPackages();
  const paymentConfig = isRealPaymentConfigured();
  res.json({
    ok: true,
    packages,
    paymentProviderConfigured: paymentConfig.configured,
    paymentProvider: paymentConfig.provider,
  });
});

seedancePlatformRouter.post('/store/checkout', requireFirebaseAuth, financialLimiter, async (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { packageId, returnUrl } = req.body as { packageId?: string; returnUrl?: string };

    const pkg = seedancePlatformStore.getPackages().find((p) => p.id === packageId);
    if (!pkg) {
      return res.status(404).json({ ok: false, error: 'Credit package not found.' });
    }

    const stripeKey = getStripeSecretKey();
    if (!stripeKey) {
      return res.status(503).json({
        ok: false,
        paymentProviderConfigured: false,
        code: 'PAYMENT_PROVIDER_UNCONFIGURED',
        error:
          'Credit purchase checkout is unavailable because STRIPE_SECRET_KEY or MIDTRANS_SERVER_KEY is not configured on the server.',
      });
    }

    const validatedReturn = validateReturnUrl(returnUrl || req.headers.origin, req, '/');
    let origin = resolveSafePublicOrigin(req);
    try {
      origin = new URL(validatedReturn).origin;
    } catch {
      origin = resolveSafePublicOrigin(req);
    }
    const bodyParams = new URLSearchParams();
    bodyParams.set('mode', 'payment');
    bodyParams.set('success_url', `${origin}?stripe_session_id={CHECKOUT_SESSION_ID}&pkg=${pkg.id}`);
    bodyParams.set('cancel_url', `${origin}?checkout=cancelled`);
    bodyParams.set('customer_email', user.email || '');
    bodyParams.set('line_items[0][price_data][currency]', 'idr');
    bodyParams.set('line_items[0][price_data][product_data][name]', `VAIURE Credits — ${pkg.name} (+${pkg.credits})`);
    bodyParams.set('line_items[0][price_data][unit_amount]', String(Math.round(pkg.priceIdr * 100)));
    bodyParams.set('line_items[0][quantity]', '1');
    bodyParams.set('metadata[userId]', user.uid);
    bodyParams.set('metadata[packageId]', pkg.id);
    bodyParams.set('metadata[kind]', 'topup');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });
    const stripeData = (await stripeRes.json()) as any;
    if (!stripeRes.ok || !stripeData?.url) {
      return res.status(502).json({
        ok: false,
        error: stripeData?.error?.message || 'Failed to initiate Stripe checkout.',
      });
    }

    res.json({
      ok: true,
      sessionId: stripeData.id,
      checkoutUrl: stripeData.url,
      package: pkg,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Store checkout failed.') });
  }
});

seedancePlatformRouter.post('/payments/verify', requireFirebaseAuth, financialLimiter, async (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { sessionId } = req.body as { sessionId?: string };
    const stripeKey = getStripeSecretKey();

    if (!stripeKey) {
      return res.status(503).json({
        ok: false,
        paymentProviderConfigured: false,
        error: 'Payment verification requires STRIPE_SECRET_KEY configured on server.',
      });
    }
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Stripe sessionId is required for verification.' });
    }

    const sessionRes = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const session = (await sessionRes.json()) as any;
    if (!sessionRes.ok || session.payment_status !== 'paid') {
      return res.status(402).json({
        ok: false,
        error: 'Payment session is not settled or could not be verified with Stripe.',
      });
    }
    if (session.metadata?.userId !== user.uid) {
      return res.status(403).json({ ok: false, error: 'Payment session belongs to a different account.' });
    }

    if (session.metadata?.kind === 'subscription' && session.metadata?.tier) {
      const activated = seedancePlatformStore.activateSubscriptionTier({
        userId: user.uid,
        userEmail: user.email,
        tier: session.metadata.tier,
        billingStatus: 'PAID',
        paymentProvider: 'stripe',
        paymentRef: session.id,
      });
      return res.json({
        ok: true,
        ...activated,
        message: `Verified Stripe payment. Activated ${activated.subscription.planName} tier.`,
      });
    }

    if (session.metadata?.kind === 'topup' && session.metadata?.packageId) {
      const credited = seedancePlatformStore.addTopUpCreditsVerified({
        userId: user.uid,
        userEmail: user.email,
        packageId: session.metadata.packageId,
        paymentMethod: 'STRIPE',
        paymentRef: session.id,
      });
      return res.json({
        ok: true,
        ...credited,
        message: `Verified Stripe payment. Credited ${credited.transaction.amount} credits.`,
      });
    }

    return res.status(400).json({ ok: false, error: 'Unrecognized payment session metadata.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Payment verification failed.') });
  }
});

// ============================================================================
// 4. SEEDANCE 2.5 VIDEO GENERATION ENGINE (ATOMIC DEDUCTION & AUTO-REFUND)
// ============================================================================

function isAllowedMediaReference(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('/uploads/') && !trimmed.includes('..')) return true;
  if (/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,/i.test(trimmed)) return true;
  return validatePublicHttpUrl(trimmed).valid;
}

seedancePlatformRouter.post('/seedance/generate', requireFirebaseAuth, aiLimiter, async (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    syncVerifiedUser(req);

    const {
      prompt,
      negativePrompt = '',
      mode = 'text-to-video',
      duration = 15,
      resolution = '720p',
      aspectRatio = '16:9',
      firstFrameImageUrl,
      referenceImages = [],
      physicsPriority = true,
      quantity = 1,
      vehicleLock,
      isPublic = false,
      projectId = 'project-default',
      idempotencyKey,
    } = req.body as {
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
    };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: 'Prompt is required for Seedance video generation.' });
    }
    if (prompt.length > 250000) {
      return res.status(400).json({ ok: false, error: 'Prompt exceeds maximum allowed length.' });
    }
    if (firstFrameImageUrl && !isAllowedMediaReference(firstFrameImageUrl)) {
      return res.status(400).json({ ok: false, error: 'Invalid or disallowed firstFrameImageUrl.' });
    }
    if (!Array.isArray(referenceImages) || referenceImages.length > 30 || referenceImages.some((r) => !isAllowedMediaReference(r))) {
      return res.status(400).json({ ok: false, error: 'Invalid or disallowed reference image URL.' });
    }

    const reqIdemKey =
      idempotencyKey ||
      (req.headers['x-idempotency-key'] as string | undefined);

    if (reqIdemKey) {
      const existing = seedancePlatformStore.getIdempotencyRecord(user.uid, reqIdemKey);
      if (existing) {
        const existingJob = seedancePlatformStore.getJob(existing.jobCode);
        const wallet = seedancePlatformStore.getOrCreateWallet(user.uid, user.email);
        if (existingJob) {
          return res.json({
            ok: true,
            deduplicated: true,
            jobId: existing.jobCode,
            job: existingJob,
            wallet,
            message: 'Idempotent retry returned existing generation job.',
          });
        }
      }
    }

    // 1. Plan capability checks
    const subscription = seedancePlatformStore.getUserSubscription(user.uid, user.email);
    const plan = seedancePlatformStore.getPlans(true).find((p) => p.tier === subscription.planTier);
    const normRes = String(resolution).toLowerCase() as SeedanceResolution;

    if (plan) {
      if (normRes === '1080p' && plan.maxResolution !== '1080p') {
        return res.status(403).json({
          ok: false,
          error: `1080p Cinema resolution requires Premium or Enterprise tier. Current tier: ${plan.name}.`,
        });
      }
      if (normRes === '720p' && plan.maxResolution === '480p') {
        return res.status(403).json({
          ok: false,
          error: `720p HD resolution requires Basic or higher tier. Current tier: ${plan.name}.`,
        });
      }
      if (referenceImages.length > plan.maxReferenceImages) {
        return res.status(403).json({
          ok: false,
          error: `${plan.name} tier supports up to ${plan.maxReferenceImages} reference images (received ${referenceImages.length}).`,
        });
      }
    }

    const modelKey =
      mode === 'ref-video' || referenceImages.length > 0
        ? duration >= 30
          ? 'seedance_25_30s_r2v'
          : 'seedance_25_15s_r2v'
        : duration >= 30
        ? 'seedance_25_30s'
        : 'seedance_25_15s';

    // 2. Dynamic credit calculation
    const costCalc = calculateSeedanceCost(
      normRes,
      duration,
      referenceImages.length,
      undefined,
      modelKey,
      physicsPriority,
      quantity
    );
    const requiredCredits = costCalc.totalCreditDeduction;

    // 3. Verify upstream ByteDance key before deducting
    const bdConfig = getByteDanceConfigStatus();
    if (!bdConfig.configured) {
      return res.status(503).json({
        ok: false,
        error:
          'ByteDance ModelArk API key is not configured. Set BYTEDANCE_API_KEY or ARK_API_KEY in server environment secrets.',
      });
    }

    // 4. Atomic credit deduction BEFORE upstream submission
    const pendingTaskRef = `pending-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const deductResult = seedancePlatformStore.deductCreditsAtomic({
      userId: user.uid,
      userEmail: user.email,
      amount: requiredCredits,
      description: `Seedance 2.5 (${normRes} · ${duration}s · ${mode})`,
      jobId: pendingTaskRef,
      idempotencyKey: reqIdemKey,
    });

    if (!deductResult.success) {
      return res.status(402).json({
        ok: false,
        error: deductResult.error,
        requiredCredits,
        availableCredits: deductResult.wallet?.totalAvailable || 0,
      });
    }

    // 5. Submit upstream ByteDance task
    const upstream = await byteDanceClient.submitGenerate({
      model: modelKey,
      prompt: negativePrompt ? `${prompt} --no ${negativePrompt}` : prompt,
      aspect_ratio: aspectRatio,
      resolution: normRes,
      duration,
      image_url: firstFrameImageUrl || referenceImages[0],
      reference_image_urls: referenceImages,
    });

    if (!upstream.ok || !upstream.data) {
      const refunded = seedancePlatformStore.refundCreditsIdempotent({
        userId: user.uid,
        amount: requiredCredits,
        reason: upstream.error || 'ByteDance ModelArk submission rejected',
        jobId: pendingTaskRef,
      });
      return res.status(upstream.status || 502).json({
        ok: false,
        error: upstream.error || 'ByteDance ModelArk generation failed. Credits refunded.',
        wallet: refunded.wallet,
      });
    }

    const jobId = upstream.data.job_code;
    const newJob: SeedanceGenerationJob = {
      id: jobId,
      userId: user.uid,
      userEmail: user.email,
      projectId,
      model: modelKey,
      mode,
      prompt,
      negativePrompt,
      duration,
      resolution: normRes,
      aspectRatio,
      firstFrameImageUrl,
      referenceImages,
      physicsPriority,
      vehicleLock,
      status: 'RUNNING',
      progressPercent: 15,
      statusMessage: `Dispatched to ByteDance ModelArk (${upstream.data.upstream_model}) · Task ${jobId}`,
      estimatedCredits: requiredCredits,
      actualCreditsDeducted: requiredCredits,
      idempotencyKey: reqIdemKey,
      isPublic,
      createdAt: new Date().toISOString(),
    };

    seedancePlatformStore.createJob(newJob);
    if (reqIdemKey) {
      seedancePlatformStore.saveIdempotencyRecord({
        key: reqIdemKey,
        userId: user.uid,
        jobCode: jobId,
        creditsDeducted: requiredCredits,
        createdAt: new Date().toISOString(),
      });
    }

    pollByteDanceSeedanceJob(jobId, user.uid, requiredCredits);

    res.json({
      ok: true,
      jobId,
      job: newJob,
      wallet: deductResult.wallet,
      costCalculation: costCalc,
      message: 'ByteDance Seedance generation task initiated.',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Video generation request failed.') });
  }
});

seedancePlatformRouter.get('/seedance/jobs/:jobId', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const job = seedancePlatformStore.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ ok: false, error: 'Generation job not found.' });
  }
  if (job.userId !== user.uid && !user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Access denied to this job.' });
  }
  res.json({ ok: true, job });
});

seedancePlatformRouter.get('/seedance/history', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const jobs = seedancePlatformStore.getUserJobs(user.uid);
  res.json({ ok: true, jobs });
});

// ============================================================================
// 5. COMMUNITY SHOWCASE
// ============================================================================

seedancePlatformRouter.get('/community/showcase', (_req: Request, res: Response) => {
  const videos = seedancePlatformState.getCommunityVideos();
  res.json({ ok: true, videos });
});

seedancePlatformRouter.post('/community/publish', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const {
      title,
      description = '',
      videoUrl,
      thumbnailUrl,
      duration = 15,
      resolution = '1080p',
      aspectRatio = '16:9',
      seedancePrompt = '',
      tags = ['Seedance2.5'],
    } = req.body as Partial<CommunityVideoPost>;

    if (!title || !videoUrl) {
      return res.status(400).json({ ok: false, error: 'Title and videoUrl are required to publish.' });
    }
    const isSafeAsset = (u: string) => (u.startsWith('/uploads/') && !u.includes('..')) || validatePublicHttpUrl(u).valid;
    if (!isSafeAsset(videoUrl) || (thumbnailUrl && !isSafeAsset(thumbnailUrl))) {
      return res.status(400).json({ ok: false, error: 'Invalid media URL supplied for publishing.' });
    }

    const sub = seedancePlatformStore.getUserSubscription(user.uid, user.email);
    const newPost: CommunityVideoPost = {
      id: `film-${Date.now()}`,
      userId: user.uid,
      authorUsername: user.email.split('@')[0] || 'creator',
      authorDisplayName: user.name || user.email.split('@')[0].toUpperCase() || 'Creator',
      authorAvatar: user.picture || '',
      authorTier: sub.planTier,
      title: String(title).trim().slice(0, 140),
      description: String(description || '').trim().slice(0, 2000),
      videoUrl,
      thumbnailUrl: thumbnailUrl || '',
      duration,
      resolution,
      aspectRatio,
      seedancePrompt: String(seedancePrompt || '').slice(0, 10000),
      tags: Array.isArray(tags) ? tags.map(String).slice(0, 12) : ['Seedance2.5'],
      likesCount: 0,
      viewsCount: 1,
      isFeatured: false,
      isPublic: true,
      createdAt: new Date().toISOString(),
    };

    seedancePlatformState.publishToCommunity(newPost);
    res.json({ ok: true, video: newPost, message: 'Film published to VAIURE showcase.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to publish film.') });
  }
});

seedancePlatformRouter.post('/community/videos/:id/like', requireFirebaseAuth, (req: Request, res: Response) => {
  const likesCount = seedancePlatformState.likeCommunityVideo(req.params.id);
  res.json({ ok: true, likesCount });
});

// ============================================================================
// 6. LEGACY-COMPATIBLE ADMIN ENDPOINTS (NOW PROTECTED BY VERIFIED TOKEN)
// ============================================================================

seedancePlatformRouter.get('/admin/analytics', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Administrator clearance required.' });
  }
  const analytics = seedancePlatformStore.getFinancialAnalytics();
  res.json({ ok: true, analytics });
});

seedancePlatformRouter.get('/admin/stock', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Administrator clearance required.' });
  }
  res.json({ ok: true, stock: seedancePlatformStore.getApiStock() });
});

seedancePlatformRouter.post('/admin/stock/purchase', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Administrator clearance required.' });
  }
  const { tokens, expenditureUsd, packageName } = req.body;
  if (!tokens || !expenditureUsd) {
    return res.status(400).json({ ok: false, error: 'tokens and expenditureUsd are required.' });
  }
  const updatedStock = seedancePlatformStore.recordApiStockPurchase(
    Number(tokens),
    Number(expenditureUsd),
    packageName || 'BytePlus Seedance Top-Up',
    { uid: user.uid, email: user.email }
  );
  res.json({ ok: true, stock: updatedStock, message: 'API Stock purchase recorded.' });
});

seedancePlatformRouter.post('/admin/adjust-credits', requireFirebaseAuth, (req: Request, res: Response) => {
  const adminUser = req.verifiedUser!;
  if (!adminUser.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Administrator clearance required.' });
  }
  const { targetUserId, creditAdjustment, reason } = req.body;
  if (!targetUserId || typeof creditAdjustment !== 'number' || !reason) {
    return res.status(400).json({ ok: false, error: 'targetUserId, creditAdjustment, and reason are required.' });
  }
  const result = seedancePlatformStore.adminAdjustCredits({
    targetUserId,
    creditAdjustment,
    reason,
    actor: { uid: adminUser.uid, email: adminUser.email },
  });
  res.json({
    ok: true,
    wallet: result.wallet,
    message: `Adjusted credits by ${creditAdjustment} for ${targetUserId}.`,
  });
});

// ============================================================================
// HELPER: Real ByteDance ModelArk Task Polling with Idempotent Auto-Refund
// ============================================================================

function pollByteDanceSeedanceJob(
  taskId: string,
  userId: string,
  reservedCredits: number
) {
  let attempts = 0;
  const maxAttempts = 60;

  const timer = setInterval(async () => {
    attempts++;
    try {
      const statusRes = await byteDanceClient.getTaskStatus(taskId);
      if (statusRes.ok && statusRes.data) {
        if (statusRes.data.status === 'completed' && statusRes.data.result_url) {
          clearInterval(timer);
          seedancePlatformStore.updateJob(taskId, {
            status: 'COMPLETED',
            progressPercent: 100,
            statusMessage: 'ByteDance Seedance video synthesis completed.',
            videoUrl: statusRes.data.result_url,
            thumbnailUrl: statusRes.data.last_frame_url || undefined,
            completedAt: new Date().toISOString(),
          });
          const jobRecord = seedancePlatformStore.getJob(taskId);
          seedanceCuratedStore.ingestCompletedGeneration({
            ownerId: userId,
            sourceJobId: taskId,
            generationGroupId: `sd-${taskId}`,
            sourcePipeline: 'seedance_video',
            projectId: jobRecord?.projectId,
            mediaType: 'VIDEO',
            outputUrls: [statusRes.data.result_url],
            thumbnailUrl: statusRes.data.last_frame_url || undefined,
            aiModel: jobRecord?.model || 'Seedance 2.5',
            modelCategory: 'Video',
            aspectRatio: jobRecord?.aspectRatio || '16:9',
            resolution: (jobRecord?.resolution || '720p').toUpperCase(),
            durationSeconds: jobRecord?.duration || 15,
            prompt: jobRecord?.prompt || '',
            negativePrompt: jobRecord?.negativePrompt,
            parameters: {
              mode: jobRecord?.mode,
              physicsPriority: jobRecord?.physicsPriority,
              duration: jobRecord?.duration,
              resolution: jobRecord?.resolution,
              aspectRatio: jobRecord?.aspectRatio,
            },
            referenceImageCount: jobRecord?.referenceImages?.length || 0,
            generatedAt: new Date().toISOString(),
          });
          return;
        }

        if (statusRes.data.status === 'failed' || statusRes.data.status === 'cancelled') {
          clearInterval(timer);
          seedancePlatformStore.refundCreditsIdempotent({
            userId,
            amount: reservedCredits,
            reason:
              statusRes.data.error_message ||
              `ByteDance task ${taskId} ${statusRes.data.status}`,
            jobId: taskId,
          });
          seedancePlatformStore.updateJob(taskId, {
            status: 'REFUNDED',
            progressPercent: 0,
            statusMessage:
              statusRes.data.error_message ||
              `Task ${statusRes.data.status}; ${reservedCredits} credits refunded.`,
          });
          return;
        }

        seedancePlatformStore.updateJob(taskId, {
          progressPercent: statusRes.data.progress || Math.min(90, 15 + attempts * 3),
          statusMessage: `ByteDance ModelArk rendering (${statusRes.data.status})...`,
        });
      }
    } catch {
      // Transient poll error; continue until maxAttempts
    }

    if (attempts >= maxAttempts) {
      clearInterval(timer);
    }
  }, 5000);
}

// Keep unused import referenced cleanly
void optionalFirebaseAuth;
