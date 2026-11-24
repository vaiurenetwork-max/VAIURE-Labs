/**
 * Multi-Provider AI Video Generation Express Routes
 * - /api/providers (public capabilities & pricing metadata, zero secrets)
 * - /api/generations/estimate (authoritative pricing calculator)
 * - /api/generations/submit (authenticated, idempotent, multi-provider submit)
 * - /api/generations/:jobId/finalize (authenticated 2-stage Finalize Draft -> 1080p)
 * - /api/generations/:jobId/status (authenticated live job status & poll trigger)
 * - /api/generations/history (authenticated unified ByteDance + MUAPI history)
 * - /api/generations/:jobId (DELETE owner/admin cleanup)
 * - /api/generated-media/:userId/:jobId/:fileName (protected video streaming fallback)
 * - /api/admin/providers/* (Admin Governance: keys, endpoints, models, pricing, markup, monitoring)
 */

import fs from 'fs';
import { Router, Request, Response, NextFunction } from 'express';
import {
  optionalFirebaseAuth,
  requireAdmin,
  requireFirebaseAuth,
  extractBearerToken,
} from '../../firebaseAuthMiddleware';
import { seedancePlatformStore } from '../../seedancePlatformStore';
import {
  aiLimiter,
  isSafeIdentifier,
  resolveSafePublicOrigin,
  sanitizeErrorMessage,
} from '../../securityMiddleware';
import {
  GenerationResolution,
  ProviderModelDefinition,
  UnifiedGenerationInput,
} from '../../../types/multiProvider';
import { providerConfigStore } from '../config/provider.config';
import { normalizeResolutionCase } from '../config/model.capabilities';
import {
  cacheEphemeralUserToken,
  generationJobsStore,
} from '../firebase/firestore.service';
import {
  getGeneratedMediaStorageStats,
  resolveLocalGeneratedMediaFile,
  verifyGeneratedMediaToken,
} from '../firebase/storage.service';
import { calculateAuthoritativeEstimate } from '../services/pricing.service';
import { providerService } from '../services/provider.service';
import {
  handleMuapiWebhookCallback,
  pollGenerationJobOnce,
} from '../services/polling.service';
import {
  generationRealtimeBus,
  verifyMuapiWebhookToken,
} from '../services/realtimeEvents.service';
import {
  finalizeDraftGeneration,
  GenerationOrchestrationError,
  listUnifiedHistoryForUser,
  submitUnifiedGeneration,
} from '../services/generation.service';
import { cancelBackgroundJobPoll } from '../workers/generation.worker';
import {
  ConnectionTestMode,
  ConnectionTestTarget,
  runRealtimeBackendConnectionTest,
} from '../services/connectionTest.service';

export function createMultiProviderRouter(): Router {
  const router = Router();

  // 1. GET /api/providers — Lists enabled providers, models, capabilities, & USD pricing matrix (NO secrets)
  router.get('/providers', (_req: Request, res: Response) => {
    const providers = providerService.listProviders(false);
    res.json({
      ok: true,
      providers,
    });
  });

  // 1b. POST /api/providers/connection-test/stream — Real-time SSE live API connection probe & dry-run pipeline simulator
  router.post(
    '/providers/connection-test/stream',
    requireFirebaseAuth,
    aiLimiter,
    async (req: Request, res: Response) => {
      const body = (req.body || {}) as Record<string, unknown>;
      const rawTarget = String(body.target || 'all').trim().toLowerCase();
      const target: ConnectionTestTarget =
        rawTarget === 'bytedance' || rawTarget === 'muapi' ? rawTarget : 'all';

      const rawMode = String(body.mode || 'live_probe').trim().toLowerCase();
      const mode: ConnectionTestMode =
        rawMode === 'simulate_pipeline' ? 'simulate_pipeline' : 'live_probe';

      const resolution = body.resolution
        ? normalizeResolutionCase(String(body.resolution))
        : '720p';
      const parsedDuration = Number(body.duration || 5);
      const duration = [5, 10, 20, 30].includes(parsedDuration) ? parsedDuration : 5;
      const draft = Boolean(body.draft);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      const controller = new AbortController();
      req.on('close', () => {
        controller.abort();
      });

      const sendFrame = (payload: unknown) => {
        if (controller.signal.aborted || res.writableEnded) return;
        try {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {
          controller.abort();
        }
      };

      try {
        await runRealtimeBackendConnectionTest(
          {
            target,
            mode,
            publicOrigin: resolveSafePublicOrigin(req),
            resolution,
            duration,
            draft,
            signal: controller.signal,
          },
          sendFrame
        );
      } catch (err: any) {
        sendFrame({
          type: 'error',
          error: sanitizeErrorMessage(err, 'Backend connection test stream failed.'),
        });
      } finally {
        if (!res.writableEnded) {
          res.end();
        }
      }
    }
  );

  // 2. POST /api/generations/estimate — Instant authoritative server-side price breakdown
  router.post('/generations/estimate', (req: Request, res: Response) => {
    try {
      const body = req.body || {};
      const estimate = calculateAuthoritativeEstimate({
        provider: String(body.provider || 'muapi'),
        modelId: String(body.model_id || body.modelId || 'muapi/seedance-2.5-spicy-image-to-video'),
        resolution: normalizeResolutionCase(body.resolution || '720p'),
        duration: Number(body.duration || 5),
        draft: Boolean(body.draft),
        referenceImagesCount: Number(body.reference_images_count || body.referenceImagesCount || 0),
        physicsPriority: body.physics_priority !== false,
      });
      res.json({ ok: true, estimate });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Invalid pricing calculation parameters.'),
      });
    }
  });

  // 3. POST /api/generations/submit — Unified multi-provider generation submit
  router.post('/generations/submit', requireFirebaseAuth, aiLimiter, async (req: Request, res: Response) => {
    try {
      const user = req.verifiedUser!;
      const body = (req.body || {}) as Partial<UnifiedGenerationInput> & Record<string, unknown>;
      const input: UnifiedGenerationInput = {
        provider: String(body.provider || 'muapi'),
        model_id: String(body.model_id || body.modelId || 'muapi/seedance-2.5-spicy-image-to-video'),
        prompt: String(body.prompt || ''),
        image_url: typeof body.image_url === 'string' ? body.image_url : undefined,
        last_image:
          typeof body.last_image === 'string'
            ? body.last_image
            : typeof body.end_image_url === 'string'
            ? body.end_image_url
            : undefined,
        reference_image_urls: Array.isArray(body.reference_image_urls)
          ? (body.reference_image_urls as string[])
          : undefined,
        aspect_ratio: typeof body.aspect_ratio === 'string' ? body.aspect_ratio : '16:9',
        resolution: normalizeResolutionCase(body.resolution || '720p'),
        duration: Number(body.duration || 5),
        generate_audio: body.generate_audio !== false && body.sound_enabled !== false,
        camera_fixed: Boolean(body.camera_fixed),
        high_bitrate: Boolean(body.high_bitrate),
        draft: Boolean(body.draft),
        draft_request_id:
          typeof body.draft_request_id === 'string' ? body.draft_request_id : undefined,
        parent_draft_job_id:
          typeof body.parent_draft_job_id === 'string' ? body.parent_draft_job_id : undefined,
        physics_priority: body.physics_priority !== false,
        content_rating: body.content_rating === '18+' ? '18+' : 'standard',
        idempotency_key:
          (typeof body.idempotency_key === 'string' && body.idempotency_key) ||
          (typeof body.idempotencyKey === 'string' && body.idempotencyKey) ||
          (typeof req.headers['x-idempotency-key'] === 'string' && req.headers['x-idempotency-key']) ||
          undefined,
      };

      const result = await submitUnifiedGeneration({
        user,
        bearerToken: extractBearerToken(req),
        publicOrigin: resolveSafePublicOrigin(req),
        rawInput: input,
      });

      return res.status(200).json({
        ok: true,
        ...result,
      });
    } catch (err: any) {
      if (err instanceof GenerationOrchestrationError) {
        return res.status(err.status).json({
          ok: false,
          code: err.code,
          error: err.message,
          ...(err.extra || {}),
        });
      }
      return res.status(500).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Video generation submission failed.'),
      });
    }
  });

  // 4. POST /api/generations/:jobId/finalize — Stage B Finalize Draft -> 1080p
  router.post('/generations/:jobId/finalize', requireFirebaseAuth, aiLimiter, async (req: Request, res: Response) => {
    try {
      const user = req.verifiedUser!;
      const jobId = String(req.params.jobId || '').trim();
      if (!isSafeIdentifier(jobId)) {
        return res.status(400).json({ ok: false, error: 'Invalid draft job identifier.' });
      }

      const body = req.body || {};
      const result = await finalizeDraftGeneration({
        draftJobId: jobId,
        user,
        bearerToken: extractBearerToken(req),
        publicOrigin: resolveSafePublicOrigin(req),
        resolution: body.resolution ? normalizeResolutionCase(body.resolution) : '1080p',
        highBitrate: typeof body.high_bitrate === 'boolean' ? body.high_bitrate : undefined,
        idempotencyKey:
          typeof body.idempotency_key === 'string'
            ? body.idempotency_key
            : typeof body.idempotencyKey === 'string'
            ? body.idempotencyKey
            : undefined,
      });

      return res.status(200).json({
        ok: true,
        ...result,
      });
    } catch (err: any) {
      if (err instanceof GenerationOrchestrationError) {
        return res.status(err.status).json({
          ok: false,
          code: err.code,
          error: err.message,
          ...(err.extra || {}),
        });
      }
      return res.status(400).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Failed to finalize draft job.'),
      });
    }
  });

  // 4b. POST /api/webhooks/muapi/:jobId — HMAC-signed real-time push callback from MUAPI (?webhook=...)
  router.post('/webhooks/muapi/:jobId', async (req: Request, res: Response) => {
    const jobId = String(req.params.jobId || '').trim();
    const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
    if (!isSafeIdentifier(jobId) || !verifyMuapiWebhookToken(jobId, token)) {
      return res.status(403).json({
        ok: false,
        error: 'Invalid or missing MUAPI webhook HMAC signature.',
      });
    }

    try {
      const result = await handleMuapiWebhookCallback(jobId, req.body);
      return res.status(result.status).json({
        ok: result.ok,
        message: result.message,
        job_id: result.job?.job_id,
        status: result.job?.status,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Failed to process MUAPI webhook callback.'),
      });
    }
  });

  // 5. GET /api/generations/history — Unified generation history (ByteDance + MUAPI)
  router.get('/generations/history', optionalFirebaseAuth, (req: Request, res: Response) => {
    const user = req.verifiedUser;
    if (!user) {
      return res.status(200).json({ ok: true, jobs: [] });
    }
    const token = extractBearerToken(req);
    if (token) cacheEphemeralUserToken(user.uid, token);
    const jobs = listUnifiedHistoryForUser(user.uid);
    return res.json({ ok: true, jobs });
  });

  // 5b. GET /api/generations/events — Real-time Server-Sent Events stream across all jobs for authenticated creator
  router.get('/generations/events', requireFirebaseAuth, (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    const token = extractBearerToken(req);
    if (token) cacheEphemeralUserToken(user.uid, token);

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (payload: unknown) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // ignore closed socket writes
      }
    };

    writeEvent({
      type: 'connected',
      userId: user.uid,
      timestamp: new Date().toISOString(),
    });

    const unsubscribe = generationRealtimeBus.subscribeUser(user.uid, (evt) => {
      writeEvent(evt);
    });

    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        // ignore
      }
    }, 15_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  // 6. GET /api/generations/:jobId/status — Owner/Admin job status + live poll
  router.get('/generations/:jobId/status', requireFirebaseAuth, async (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    const jobId = String(req.params.jobId || '').trim();
    if (!isSafeIdentifier(jobId)) {
      return res.status(400).json({ ok: false, error: 'Invalid job identifier.' });
    }

    const token = extractBearerToken(req);
    if (token) cacheEphemeralUserToken(user.uid, token);

    const job = generationJobsStore.getJob(jobId);
    if (!job) {
      return res.status(404).json({ ok: false, error: 'Generation job not found.' });
    }
    if (job.user_id !== user.uid && !user.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Access denied to this generation job.' });
    }

    const refreshed =
      job.status === 'pending' || job.status === 'processing'
        ? await pollGenerationJobOnce(jobId)
        : job;

    return res.json({
      ok: true,
      job: refreshed || job,
    });
  });

  // 6b. GET /api/generations/:jobId/events — Real-time Server-Sent Events stream of backend HTTP calls & status updates for a job
  router.get('/generations/:jobId/events', requireFirebaseAuth, (req: Request, res: Response) => {
    const user = req.verifiedUser!;
    const jobId = String(req.params.jobId || '').trim();
    if (!isSafeIdentifier(jobId)) {
      return res.status(400).json({ ok: false, error: 'Invalid job identifier.' });
    }

    const token = extractBearerToken(req);
    if (token) cacheEphemeralUserToken(user.uid, token);

    const job = generationJobsStore.getJob(jobId);
    if (!job) {
      return res.status(404).json({ ok: false, error: 'Generation job not found.' });
    }
    if (job.user_id !== user.uid && !user.isAdmin) {
      return res.status(403).json({ ok: false, error: 'Access denied to this generation job.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (payload: unknown) => {
      try {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {
        // ignore closed socket writes
      }
    };

    writeEvent({
      type: 'init',
      jobId: job.job_id,
      userId: job.user_id,
      timestamp: new Date().toISOString(),
      job,
      traces: job.backend_traces || [],
    });

    const unsubscribe = generationRealtimeBus.subscribeJob(jobId, (evt) => {
      writeEvent(evt);
    });

    const keepAlive = setInterval(() => {
      try {
        res.write(`: ping ${Date.now()}\n\n`);
      } catch {
        // ignore
      }
    }, 15_000);

    req.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  // 7. DELETE /api/generations/:jobId — Owner/Admin deletion
  router.delete('/generations/:jobId', requireFirebaseAuth, (req: Request, res: Response) => {
    try {
      const user = req.verifiedUser!;
      const jobId = String(req.params.jobId || '').trim();
      if (!isSafeIdentifier(jobId)) {
        return res.status(400).json({ ok: false, error: 'Invalid job identifier.' });
      }
      cancelBackgroundJobPoll(jobId);
      const deleted = generationJobsStore.deleteJob(jobId, user.uid, user.isAdmin);
      if (!deleted) {
        return res.status(404).json({ ok: false, error: 'Generation job not found.' });
      }
      return res.json({ ok: true, jobs: listUnifiedHistoryForUser(user.uid) });
    } catch (err: any) {
      return res.status(403).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Unable to delete generation job.'),
      });
    }
  });

  // 8. GET /api/generated-media/:userId/:jobId/:fileName — Protected video/thumbnail delivery with HTTP Range
  router.get(
    '/generated-media/:userId/:jobId/:fileName',
    optionalFirebaseAuth,
    (req: Request, res: Response, next: NextFunction) => {
      const { userId, jobId, fileName } = req.params;
      if (!isSafeIdentifier(userId) || !isSafeIdentifier(jobId) || !isSafeIdentifier(fileName)) {
        return res.status(403).json({ error: 'Access denied.' });
      }

      const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
      const validSig = sig ? verifyGeneratedMediaToken(sig, userId, jobId, fileName) : false;
      const verifiedUser = req.verifiedUser;
      const validOwner =
        Boolean(verifiedUser) && (verifiedUser!.uid === userId || verifiedUser!.isAdmin);

      if (!validSig && !validOwner) {
        return res.status(403).json({ error: 'Authentication or valid signed token required.' });
      }

      const isImage = /\.(jpe?g|png|webp)$/i.test(fileName);
      const isVideo = /\.(mp4|webm|mov)$/i.test(fileName);
      if (!isImage && !isVideo) {
        return res.status(403).json({ error: 'Unsupported media file type.' });
      }

      const filePath = resolveLocalGeneratedMediaFile(
        isImage ? 'image' : 'video',
        userId,
        jobId,
        fileName
      );
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Generated media file not found.' });
      }

      try {
        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const contentType = isImage
          ? fileName.endsWith('.png')
            ? 'image/png'
            : 'image/jpeg'
          : 'video/mp4';

        const baseHeaders: Record<string, string | number> = {
          'Content-Type': contentType,
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Cache-Control': 'private, max-age=86400',
          'Accept-Ranges': 'bytes',
        };

        const range = req.headers.range;
        if (range && isVideo) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          if (
            Number.isNaN(start) ||
            Number.isNaN(end) ||
            start < 0 ||
            end < start ||
            start >= fileSize ||
            end >= fileSize
          ) {
            return res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          }
          const chunkSize = end - start + 1;
          const stream = fs.createReadStream(filePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.status(500).end();
          });
          res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': chunkSize,
          });
          stream.pipe(res);
          return;
        }

        const stream = fs.createReadStream(filePath);
        stream.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        res.writeHead(200, {
          ...baseHeaders,
          'Content-Length': fileSize,
        });
        stream.pipe(res);
      } catch (err) {
        next(err);
      }
    }
  );

  // ============================================================================
  // ADMIN GOVERNANCE ROUTES (/api/admin/providers/*)
  // ============================================================================

  router.get('/admin/providers', requireFirebaseAuth, requireAdmin, (_req: Request, res: Response) => {
    res.json({
      ok: true,
      providers: providerService.listProviders(true),
    });
  });

  router.get('/admin/providers/analytics', requireFirebaseAuth, requireAdmin, (_req: Request, res: Response) => {
    const storageStats = getGeneratedMediaStorageStats();
    const analytics = generationJobsStore.getAnalyticsSummary(storageStats);
    res.json({
      ok: true,
      analytics,
      recentJobs: generationJobsStore.listAllJobsAdmin(100),
    });
  });

  router.put('/admin/providers/:providerId', requireFirebaseAuth, requireAdmin, (req: Request, res: Response) => {
    try {
      const admin = req.verifiedUser!;
      const providerId = String(req.params.providerId || '').trim().toLowerCase();
      if (!isSafeIdentifier(providerId)) {
        return res.status(400).json({ ok: false, error: 'Invalid provider identifier.' });
      }

      const body = req.body || {};
      const updated = providerConfigStore.upsertProvider(providerId, {
        ...(typeof body.displayName === 'string' ? { displayName: body.displayName.trim() } : {}),
        ...(typeof body.clientName === 'string' ? { clientName: body.clientName.trim() } : {}),
        ...(typeof body.enabled === 'boolean' ? { enabled: body.enabled } : {}),
        ...(typeof body.sandboxMode === 'boolean' ? { sandboxMode: body.sandboxMode } : {}),
        ...(typeof body.baseUrl === 'string' ? { baseUrl: body.baseUrl.trim() } : {}),
        ...(typeof body.autoFallbackEnabled === 'boolean'
          ? { autoFallbackEnabled: body.autoFallbackEnabled }
          : {}),
        ...(typeof body.pollIntervalMs === 'number'
          ? { pollIntervalMs: Math.max(2000, Math.min(30000, Math.round(body.pollIntervalMs))) }
          : {}),
        ...(typeof body.creditsPerUsd === 'number'
          ? { creditsPerUsd: Math.max(1, Math.min(1000, Number(body.creditsPerUsd))) }
          : {}),
        ...(typeof body.enforceWalletOnUsdProviders === 'boolean'
          ? { enforceWalletOnUsdProviders: body.enforceWalletOnUsdProviders }
          : {}),
      });

      // Optionally update encrypted backend credential if admin submitted a new apiKey
      if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
        providerConfigStore.setProviderApiKey(providerId, body.apiKey.trim());
      }
      if (typeof body.sandboxApiKey === 'string' && body.sandboxApiKey.trim()) {
        providerConfigStore.setProviderSandboxApiKey(providerId, body.sandboxApiKey.trim());
      }

      const refreshed = providerConfigStore.toPublicConfig(
        providerConfigStore.getInternalProvider(providerId)!
      );

      seedancePlatformStore.addAuditLog({
        actorUid: admin.uid,
        actorEmail: admin.email,
        action: 'ADMIN_UPDATE_PROVIDER',
        targetType: 'videoProvider',
        targetId: providerId,
        reason: `Updated provider configuration for ${providerId}`,
      });
      seedancePlatformStore.persist();

      res.json({ ok: true, provider: refreshed || updated });
    } catch (err: any) {
      res.status(400).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Failed to update provider settings.'),
      });
    }
  });

  router.post(
    '/admin/providers/:providerId/models',
    requireFirebaseAuth,
    requireAdmin,
    (req: Request, res: Response) => {
      try {
        const admin = req.verifiedUser!;
        const providerId = String(req.params.providerId || '').trim().toLowerCase();
        if (!isSafeIdentifier(providerId)) {
          return res.status(400).json({ ok: false, error: 'Invalid provider identifier.' });
        }

        const body = req.body || {};
        const modelId = String(body.modelId || '').trim();
        const displayName = String(body.displayName || modelId).trim();
        if (!modelId || modelId.length > 160) {
          return res.status(400).json({ ok: false, error: 'Valid modelId is required.' });
        }

        const existingModel = providerConfigStore.findModel(providerId, modelId)?.model;
        const resolutions: GenerationResolution[] = Array.isArray(body.resolutions)
          ? (body.resolutions.map(normalizeResolutionCase) as GenerationResolution[])
          : existingModel?.resolutions || ['480p', '720p', '1080p', '4K'];
        const enabledResolutions: GenerationResolution[] = Array.isArray(body.enabledResolutions)
          ? (body.enabledResolutions.map(normalizeResolutionCase) as GenerationResolution[])
          : existingModel?.enabledResolutions || resolutions;

        const durations = Array.isArray(body.durations)
          ? body.durations.map((d: any) => Number(d)).filter((n: number) => Number.isFinite(n))
          : existingModel?.durations || [5, 10, 20, 30];
        const enabledDurations = Array.isArray(body.enabledDurations)
          ? body.enabledDurations.map((d: any) => Number(d)).filter((n: number) => Number.isFinite(n))
          : existingModel?.enabledDurations || durations;

        const cleanModel: ProviderModelDefinition = {
          providerId,
          modelId,
          displayName,
          clientName:
            typeof body.clientName === 'string'
              ? body.clientName.trim()
              : existingModel?.clientName || 'vaiurenetwoek',
          submitEndpoint:
            typeof body.submitEndpoint === 'string'
              ? body.submitEndpoint.trim()
              : existingModel?.submitEndpoint,
          resultEndpointTemplate:
            typeof body.resultEndpointTemplate === 'string'
              ? body.resultEndpointTemplate.trim()
              : existingModel?.resultEndpointTemplate,
          enabled: typeof body.enabled === 'boolean' ? body.enabled : existingModel?.enabled ?? true,
          category: body.category || existingModel?.category || 'Image-to-Video',
          supportsImageToVideo:
            typeof body.supportsImageToVideo === 'boolean'
              ? body.supportsImageToVideo
              : existingModel?.supportsImageToVideo ?? true,
          supportsTextToVideo:
            typeof body.supportsTextToVideo === 'boolean'
              ? body.supportsTextToVideo
              : existingModel?.supportsTextToVideo ?? false,
          requiresStartImage:
            typeof body.requiresStartImage === 'boolean'
              ? body.requiresStartImage
              : existingModel?.requiresStartImage ?? true,
          supportsLastImage:
            typeof body.supportsLastImage === 'boolean'
              ? body.supportsLastImage
              : existingModel?.supportsLastImage ?? true,
          supportsReferencePlates:
            typeof body.supportsReferencePlates === 'boolean'
              ? body.supportsReferencePlates
              : existingModel?.supportsReferencePlates ?? false,
          maxReferenceImages:
            typeof body.maxReferenceImages === 'number'
              ? body.maxReferenceImages
              : existingModel?.maxReferenceImages ?? 2,
          supportsDraftMode:
            typeof body.supportsDraftMode === 'boolean'
              ? body.supportsDraftMode
              : existingModel?.supportsDraftMode ?? true,
          supportsAudio:
            typeof body.supportsAudio === 'boolean'
              ? body.supportsAudio
              : existingModel?.supportsAudio ?? true,
          supportsCameraFixed:
            typeof body.supportsCameraFixed === 'boolean'
              ? body.supportsCameraFixed
              : existingModel?.supportsCameraFixed ?? true,
          supportsHighBitrate:
            typeof body.supportsHighBitrate === 'boolean'
              ? body.supportsHighBitrate
              : existingModel?.supportsHighBitrate ?? true,
          resolutions,
          durations: durations as any,
          enabledResolutions,
          enabledDurations: enabledDurations as any,
          pricingCurrency: body.pricingCurrency || existingModel?.pricingCurrency || 'USD',
          usdPricingMatrix: body.usdPricingMatrix || existingModel?.usdPricingMatrix,
          appMarkupPercent:
            typeof body.appMarkupPercent === 'number'
              ? Math.max(0, body.appMarkupPercent)
              : existingModel?.appMarkupPercent ?? 0,
          appMarkupFlatUsd:
            typeof body.appMarkupFlatUsd === 'number'
              ? Math.max(0, body.appMarkupFlatUsd)
              : existingModel?.appMarkupFlatUsd ?? 0,
          safetyCheckerLockedOn: true,
          safetyNotice:
            typeof body.safetyNotice === 'string'
              ? body.safetyNotice
              : existingModel?.safetyNotice ||
                'Safety checker is locked ON and enforced by provider policy.',
          notes: typeof body.notes === 'string' ? body.notes : existingModel?.notes,
        };

        const updatedProvider = providerConfigStore.upsertModel(providerId, cleanModel);

        seedancePlatformStore.addAuditLog({
          actorUid: admin.uid,
          actorEmail: admin.email,
          action: 'ADMIN_UPSERT_PROVIDER_MODEL',
          targetType: 'videoModel',
          targetId: `${providerId}:${modelId}`,
          reason: `Updated model configuration & pricing for ${displayName}`,
        });
        seedancePlatformStore.persist();

        res.json({ ok: true, provider: updatedProvider, model: cleanModel });
      } catch (err: any) {
        res.status(400).json({
          ok: false,
          error: sanitizeErrorMessage(err, 'Failed to save provider model configuration.'),
        });
      }
    }
  );

  return router;
}
