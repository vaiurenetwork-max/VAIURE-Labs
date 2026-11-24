/**
 * VAIURE — SEEDANCE LAB CURATED GALLERY & PUBLIC DISCOVERY EXPRESS ROUTES (/api/curated/*)
 * Enforces strict separation between Private Creations, Curation Review, and Public Curates.
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CURATED_CATEGORIES,
  seedanceCuratedStore,
} from './seedanceCuratedStore';
import {
  optionalFirebaseAuth,
  requireFirebaseAuth,
} from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import {
  assertPublicRemoteUrl,
  sanitizeErrorMessage,
} from './securityMiddleware';
import {
  CuratedMediaType,
  PublicGallerySort,
} from '../types/seedanceCurated';

export const seedanceCuratedRouter = Router();

function syncVerifiedCuratedUser(req: Request) {
  const user = req.verifiedUser;
  if (!user) return;
  seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });
}

// ============================================================================
// 1. META & CURATOR CAPABILITY CHECK
// ============================================================================

seedanceCuratedRouter.get('/meta', optionalFirebaseAuth, (req: Request, res: Response) => {
  const isCurator = seedanceCuratedStore.isCuratorOrAdmin(req.verifiedUser || null);
  res.json({
    ok: true,
    categories: CURATED_CATEGORIES,
    viewerIsCurator: isCurator,
  });
});

// ============================================================================
// 2. PRIVATE CREATION AUTO-INGESTION HOOK & MY PRIVATE CURATES
// ============================================================================

seedanceCuratedRouter.post('/ingest', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    syncVerifiedCuratedUser(req);
    const {
      sourceJobId,
      generationGroupId,
      sourcePipeline = 'other',
      projectId,
      projectName,
      title,
      mediaType,
      outputUrls,
      thumbnailUrl,
      aiModel,
      modelCategory,
      aspectRatio,
      resolution,
      durationSeconds,
      prompt = '',
      negativePrompt,
      parameters,
      referenceImageCount,
    } = req.body || {};

    if (!sourceJobId || !Array.isArray(outputUrls) || outputUrls.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'sourceJobId and non-empty outputUrls array are required.',
      });
    }

    const created = seedanceCuratedStore.ingestCompletedGeneration({
      ownerId: user.uid,
      ownerName: user.name || user.email.split('@')[0] || 'Creator',
      ownerAvatar: user.picture,
      sourceJobId: String(sourceJobId),
      generationGroupId: generationGroupId ? String(generationGroupId) : undefined,
      sourcePipeline,
      projectId,
      projectName,
      title,
      mediaType,
      outputUrls,
      thumbnailUrl,
      aiModel: aiModel || 'Seedance 2.5',
      modelCategory,
      aspectRatio,
      resolution,
      durationSeconds: durationSeconds ? Number(durationSeconds) : undefined,
      prompt: String(prompt || ''),
      negativePrompt,
      parameters,
      referenceImageCount,
    });

    res.json({
      ok: true,
      creations: seedanceCuratedStore
        .listPrivateCreations(user.uid, undefined, user.name)
        .filter((c) => created.some((cr) => cr.id === c.id)),
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message || 'Ingestion failed.' });
  }
});

seedanceCuratedRouter.get('/private', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    syncVerifiedCuratedUser(req);
    const mediaType = (String(req.query.mediaType || 'ALL').toUpperCase() as 'ALL' | CuratedMediaType);
    const collectionId = req.query.collectionId ? String(req.query.collectionId) : undefined;
    const projectId = req.query.projectId ? String(req.query.projectId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const search = req.query.search ? String(req.query.search) : undefined;

    const creations = seedanceCuratedStore.listPrivateCreations(
      user.uid,
      { mediaType, collectionId, projectId, status, search },
      user.name || user.email.split('@')[0]
    );
    const collections = seedanceCuratedStore.listCollections(user.uid);
    const submissions = seedanceCuratedStore.listOwnerSubmissions(user.uid);

    res.json({
      ok: true,
      creations,
      collections,
      submissions,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to load private curates.' });
  }
});

seedanceCuratedRouter.patch('/private/:creationId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const updated = seedanceCuratedStore.updatePrivateCreation(
      req.params.creationId,
      user.uid,
      req.body || {}
    );
    res.json({ ok: true, creation: updated });
  } catch (err: any) {
    const status = err?.message?.includes('Only the owner') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message || 'Update failed.' });
  }
});

seedanceCuratedRouter.delete('/private/:creationId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    seedanceCuratedStore.deletePrivateCreation(req.params.creationId, user.uid);
    res.json({ ok: true, message: 'Creation permanently deleted from private library.' });
  } catch (err: any) {
    const status = err?.message?.includes('Only the creator') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message || 'Delete failed.' });
  }
});

// ============================================================================
// 3. PERSONAL COLLECTIONS CRUD
// ============================================================================

seedanceCuratedRouter.get('/collections', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  res.json({ ok: true, collections: seedanceCuratedStore.listCollections(user.uid) });
});

seedanceCuratedRouter.post('/collections', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { name, description } = req.body || {};
    const collection = seedanceCuratedStore.createCollection(user.uid, String(name || ''), description);
    res.json({ ok: true, collection });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.patch('/collections/:collectionId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { name, description } = req.body || {};
    const collection = seedanceCuratedStore.renameCollection(
      req.params.collectionId,
      user.uid,
      String(name || ''),
      description
    );
    res.json({ ok: true, collection });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.delete('/collections/:collectionId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    seedanceCuratedStore.deleteCollection(req.params.collectionId, user.uid);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.post('/collections/:collectionId/items', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { creationId, inCollection = true } = req.body || {};
    if (!creationId) {
      return res.status(400).json({ ok: false, error: 'creationId is required.' });
    }
    const collection = seedanceCuratedStore.assignCreationToCollection(
      req.params.collectionId,
      String(creationId),
      user.uid,
      Boolean(inCollection)
    );
    res.json({ ok: true, collection });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// 4. SUGGEST FOR PUBLIC CURATION & SUBMISSION TRACKING (OWNER)
// ============================================================================

seedanceCuratedRouter.get('/submissions', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  res.json({
    ok: true,
    submissions: seedanceCuratedStore.listOwnerSubmissions(user.uid),
  });
});

seedanceCuratedRouter.post('/submissions', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    syncVerifiedCuratedUser(req);
    const {
      creationId,
      proposedTitle,
      proposedDescription,
      category,
      tags = [],
      creativeCredits,
      projectName,
      showCreatorProfile = true,
      showAiModel = true,
      showPromptAndParams = false,
    } = req.body || {};

    if (!creationId) {
      return res.status(400).json({ ok: false, error: 'creationId is required.' });
    }

    const submission = seedanceCuratedStore.submitForCuration({
      creationId: String(creationId),
      ownerId: user.uid,
      ownerName: user.name || user.email.split('@')[0] || 'Creator',
      ownerAvatar: user.picture,
      proposedTitle: String(proposedTitle || ''),
      proposedDescription: String(proposedDescription || ''),
      category: String(category || ''),
      tags: Array.isArray(tags) ? tags : [],
      creativeCredits: creativeCredits ? String(creativeCredits) : undefined,
      projectName: projectName ? String(projectName) : undefined,
      showCreatorProfile: Boolean(showCreatorProfile),
      showAiModel: Boolean(showAiModel),
      showPromptAndParams: Boolean(showPromptAndParams),
    });

    res.json({
      ok: true,
      submission,
      message: 'Creation submitted for curator review. It remains private until approved.',
    });
  } catch (err: any) {
    const status = err?.message?.includes('Only the creator') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message || 'Submission failed.' });
  }
});

seedanceCuratedRouter.post('/submissions/:submissionId/withdraw', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const result = seedanceCuratedStore.withdrawSubmission(req.params.submissionId, user.uid);
    res.json({
      ok: true,
      ...result,
      message: 'Submission withdrawn. Creation stays safe in My Private Curates.',
    });
  } catch (err: any) {
    const status = err?.message?.includes('Only the creator') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// 5. CURATOR REVIEW DASHBOARD (SEPARATE FROM COMMUNITY GROUP ADMIN)
// ============================================================================

seedanceCuratedRouter.get('/curator/submissions', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!seedanceCuratedStore.isCuratorOrAdmin(user)) {
    return res.status(403).json({
      ok: false,
      error: 'Curator authorization required to review public curation submissions.',
    });
  }
  const status = req.query.status ? String(req.query.status) : undefined;
  const data = seedanceCuratedStore.listSubmissionsForCurator(user.uid, status);
  res.json({ ok: true, ...data });
});

seedanceCuratedRouter.post('/curator/submissions/:submissionId/review', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!seedanceCuratedStore.isCuratorOrAdmin(user)) {
    return res.status(403).json({
      ok: false,
      error: 'Curator authorization required.',
    });
  }

  try {
    const {
      decision,
      internalNotes,
      creatorFeedback,
      curatorBadge,
      policyChecklist,
    } = req.body || {};

    if (!['START_REVIEW', 'APPROVE', 'REJECT', 'REQUEST_REVISION'].includes(String(decision))) {
      return res.status(400).json({ ok: false, error: 'Valid decision is required.' });
    }

    const result = seedanceCuratedStore.reviewSubmission({
      submissionId: req.params.submissionId,
      reviewerId: user.uid,
      reviewerName: user.name || user.email.split('@')[0] || 'Curator',
      reviewerEmail: user.email,
      decision,
      internalNotes,
      creatorFeedback,
      curatorBadge,
      policyChecklist,
    });

    res.json({
      ok: true,
      ...result,
      message:
        decision === 'APPROVE'
          ? 'Creation approved and published to Public Curated Gallery.'
          : decision === 'REJECT'
          ? 'Submission rejected. Private creation remains intact for creator.'
          : decision === 'REQUEST_REVISION'
          ? 'Revision instructions sent to creator.'
          : 'Submission marked Under Review.',
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message || 'Review action failed.' });
  }
});

seedanceCuratedRouter.post('/curator/published/:publishedId/moderate', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!seedanceCuratedStore.isCuratorOrAdmin(user)) {
    return res.status(403).json({ ok: false, error: 'Curator authorization required.' });
  }
  try {
    const { action, reason = '', reportId } = req.body || {};
    if (action !== 'REMOVE_PUBLIC' && action !== 'DISMISS_REPORTS') {
      return res.status(400).json({ ok: false, error: 'Invalid moderation action.' });
    }
    seedanceCuratedStore.moderatePublishedCreation({
      publishedId: req.params.publishedId,
      curatorUid: user.uid,
      curatorName: user.name || user.email.split('@')[0] || 'Curator',
      curatorEmail: user.email,
      action,
      reason: String(reason || 'Moderation review'),
      reportId: reportId ? String(reportId) : undefined,
    });
    res.json({ ok: true, message: 'Published creation moderation updated.' });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.get('/admin/curators', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Platform administrator clearance required.' });
  }
  res.json({ ok: true, curatorUserIds: seedanceCuratedStore.listCurators() });
});

seedanceCuratedRouter.post('/admin/curators', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  if (!user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Platform administrator clearance required.' });
  }
  try {
    const { userId, enabled } = req.body || {};
    const curatorUserIds = seedanceCuratedStore.setCuratorAccess(String(userId || ''), Boolean(enabled), {
      uid: user.uid,
      email: user.email,
    });
    res.json({ ok: true, curatorUserIds });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// 6. PUBLIC CURATED GALLERY DISCOVERY & CREATION DETAIL
// ============================================================================

seedanceCuratedRouter.get('/public', optionalFirebaseAuth, (req: Request, res: Response) => {
  const viewerUid = req.verifiedUser?.uid;
  const mediaType = String(req.query.mediaType || 'ALL').toUpperCase() as 'ALL' | CuratedMediaType;
  const category = req.query.category ? String(req.query.category) : 'ALL';
  const search = req.query.search ? String(req.query.search) : '';
  const sort = (req.query.sort ? String(req.query.sort) : 'latest') as PublicGallerySort;
  const favoritesOnly = req.query.favoritesOnly === 'true';
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 24);

  const data = seedanceCuratedStore.listPublicCreations({
    viewerUid,
    mediaType,
    category,
    search,
    sort,
    favoritesOnly,
    page,
    limit,
  });

  res.json({
    ok: true,
    categories: CURATED_CATEGORIES,
    ...data,
  });
});

seedanceCuratedRouter.get('/public/:publishedId', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const viewerUid = req.verifiedUser?.uid;
    const ipHash = crypto
      .createHash('sha256')
      .update(String(req.ip || 'unknown'))
      .digest('hex')
      .slice(0, 12);
    const trackView = req.query.trackView !== 'false';
    const detail = seedanceCuratedStore.getPublicCreationDetail(
      req.params.publishedId,
      viewerUid,
      ipHash,
      trackView
    );
    res.json({ ok: true, ...detail });
  } catch (err: any) {
    res.status(404).json({ ok: false, error: err?.message || 'Published creation not found.' });
  }
});

seedanceCuratedRouter.patch('/public/:publishedId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const creation = seedanceCuratedStore.updatePublishedByCreator(
      req.params.publishedId,
      user.uid,
      req.body || {}
    );
    res.json({ ok: true, creation });
  } catch (err: any) {
    const status = err?.message?.includes('Only the creator') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message });
  }
});

// Engagement actions
seedanceCuratedRouter.post('/public/:publishedId/appreciate', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const result = seedanceCuratedStore.toggleAppreciation(req.params.publishedId, user.uid);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.post('/public/:publishedId/favorite', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const result = seedanceCuratedStore.toggleFavorite(req.params.publishedId, user.uid);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.post('/public/:publishedId/share', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const result = seedanceCuratedStore.recordShare(req.params.publishedId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.post('/public/:publishedId/comments', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { content } = req.body || {};
    const result = seedanceCuratedStore.addComment({
      publishedId: req.params.publishedId,
      authorId: user.uid,
      authorName: user.name || user.email.split('@')[0] || 'Creator',
      authorAvatar: user.picture,
      content: String(content || ''),
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.delete('/public/:publishedId/comments/:commentId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const isCurator = seedanceCuratedStore.isCuratorOrAdmin(user);
    const result = seedanceCuratedStore.deleteComment(
      req.params.publishedId,
      req.params.commentId,
      user.uid,
      isCurator
    );
    res.json({ ok: true, ...result });
  } catch (err: any) {
    const status = err?.message?.includes('Permission denied') ? 403 : 400;
    res.status(status).json({ ok: false, error: err?.message });
  }
});

seedanceCuratedRouter.post('/public/:publishedId/report', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const { reason, details } = req.body || {};
    const report = seedanceCuratedStore.reportPublicCreation({
      publishedId: req.params.publishedId,
      reporterId: user.uid,
      reporterName: user.name || user.email.split('@')[0] || 'User',
      reason: String(reason || ''),
      details: details ? String(details) : undefined,
    });
    res.json({ ok: true, report, message: 'Report submitted to curation moderation.' });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// 7. PROTECTED MEDIA DELIVERY ENDPOINT (NO PUBLIC PRIVATE-ASSET ACCESS)
// ============================================================================

seedanceCuratedRouter.get('/assets/:assetId/stream', optionalFirebaseAuth, async (req: Request, res: Response) => {
  const token = req.query.token ? String(req.query.token) : undefined;
  const requester = req.verifiedUser;
  const requesterIsCurator = seedanceCuratedStore.isCuratorOrAdmin(requester || null);

  const authCheck = seedanceCuratedStore.authorizeAssetAccess({
    assetId: req.params.assetId,
    token,
    requesterUid: requester?.uid,
    requesterIsCurator,
  });

  if (!authCheck.allowed || !authCheck.asset) {
    return res.status(requester || token ? 403 : 401).json({
      ok: false,
      error: authCheck.reason || 'Access denied.',
    });
  }

  const asset = authCheck.asset;
  const isDownload = req.query.download === '1';

  // Local isolated private file streaming with HTTP 206 range support
  if (authCheck.filePath && fs.existsSync(authCheck.filePath)) {
    const stat = fs.statSync(authCheck.filePath);
    const fileSize = stat.size;
    const ext = path.extname(authCheck.filePath).toLowerCase() || (asset.mediaType === 'IMAGE' ? '.png' : '.mp4');
    const contentType = asset.mimeType || 'application/octet-stream';
    const cacheHeader = authCheck.isPublicAsset
      ? 'public, max-age=3600'
      : 'private, no-store, no-cache, must-revalidate';

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');

    if (isDownload) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="vaiure_${asset.id}${ext}"`
      );
    }

    const range = req.headers.range;
    if (range && contentType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= fileSize || end >= fileSize) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': cacheHeader,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': 'sandbox',
      });
      fs.createReadStream(authCheck.filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheHeader,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': 'sandbox',
    });
    fs.createReadStream(authCheck.filePath).pipe(res);
    return;
  }

  // External CDN asset proxy with DNS-pinned SSRF guard
  if (authCheck.externalUrl) {
    try {
      const safeRemoteUrl = await assertPublicRemoteUrl(authCheck.externalUrl);
      const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
      const upstream = await fetch(safeRemoteUrl.toString(), {
        headers: rangeHeader ? { Range: rangeHeader } : undefined,
        redirect: 'error',
      });
      if (!upstream.ok && upstream.status !== 206) {
        return res.status(upstream.status).json({
          ok: false,
          error: `Upstream media unavailable (${upstream.status}).`,
        });
      }
      const contentType = (upstream.headers.get('content-type') || asset.mimeType || 'application/octet-stream').toLowerCase();
      if (contentType.includes('svg') || contentType.includes('html') || contentType.includes('xml') || contentType.includes('javascript')) {
        return res.status(403).json({
          ok: false,
          error: 'Unsafe upstream media content type blocked.',
        });
      }
      res.status(upstream.status);
      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', 'sandbox');
      res.setHeader(
        'Cache-Control',
        authCheck.isPublicAsset ? 'public, max-age=3600' : 'private, no-store'
      );
      const contentLength = upstream.headers.get('content-length');
      if (contentLength) res.setHeader('Content-Length', contentLength);
      const contentRange = upstream.headers.get('content-range');
      if (contentRange) res.setHeader('Content-Range', contentRange);
      const acceptRanges = upstream.headers.get('accept-ranges');
      if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
      if (isDownload) {
        const ext = asset.mediaType === 'IMAGE' ? '.png' : '.mp4';
        res.setHeader('Content-Disposition', `attachment; filename="vaiure_${asset.id}${ext}"`);
      }

      const arrayBuf = await upstream.arrayBuffer();
      return res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      return res.status(502).json({
        ok: false,
        error: sanitizeErrorMessage(err, 'Failed to stream external media.'),
      });
    }
  }

  return res.status(404).json({ ok: false, error: 'Asset stream unavailable.' });
});
