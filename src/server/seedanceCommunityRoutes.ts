/**
 * VAIURE — SEEDANCE LAB COMMUNITY & GROUPS REST API (/api/community/*)
 * Enforces Firebase auth, private group 403 gating, RBAC, atomic credit gift ledger,
 * Seedance workflow import tracking, notifications, and file uploads.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { optionalFirebaseAuth, requireFirebaseAuth } from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import { seedanceCommunityStore } from './seedanceCommunityStore';
import { broadcastToStream } from './realtimeHub';
import {
  financialLimiter,
  resolveSafeSubpath,
  sanitizeErrorMessage,
  uploadLimiter,
  validateMagicBytes,
} from './securityMiddleware';
import {
  CommunityReportTargetType,
  GroupEventType,
  GroupPostReactionType,
  GroupPostStatus,
  GroupPostType,
  GroupRole,
} from '../types/seedancePlatform';

export const seedanceCommunityRouter = Router();

const COMMUNITY_UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'community');
if (!fs.existsSync(COMMUNITY_UPLOADS_DIR)) {
  fs.mkdirSync(COMMUNITY_UPLOADS_DIR, { recursive: true });
}

function syncActor(req: Request) {
  const user = req.verifiedUser!;
  const record = seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });
  seedanceCommunityStore.ensureProfile({
    uid: user.uid,
    username: record.username,
    displayName: record.displayName,
    avatar: user.picture || '',
  });
  return { user, record };
}

function mapErrStatus(err: any): number {
  const msg = String(err?.message || '').toLowerCase();
  if (msg.includes('not found') || msg.includes('does not exist')) return 404;
  if (
    msg.includes('private') ||
    msg.includes('permission') ||
    msg.includes('denied') ||
    msg.includes('banned') ||
    msg.includes('restricted') ||
    msg.includes('invite-only') ||
    msg.includes('required') && msg.includes('moderator') ||
    msg.includes('only the group owner')
  ) {
    return 403;
  }
  return 400;
}

// ============================================================================
// 1. METADATA & REAL ASSET UPLOAD
// ============================================================================

seedanceCommunityRouter.get('/meta', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    categories: seedanceCommunityStore.getCategories(false),
    policies: seedanceCommunityStore.getPolicies(),
    giftCatalog: seedanceCommunityStore.getGiftCatalog(false),
  });
});

seedanceCommunityRouter.post('/upload', requireFirebaseAuth, uploadLimiter, (req: Request, res: Response) => {
  try {
    const { dataUrl, filename } = req.body as { dataUrl?: string; filename?: string };
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
      return res.status(400).json({ ok: false, error: 'Valid base64 dataUrl payload is required.' });
    }

    const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif)|video\/(?:mp4|webm|quicktime));base64,(.+)$/i.exec(
      dataUrl
    );
    if (!match) {
      return res.status(400).json({
        ok: false,
        error: 'Unsupported media format. Allowed: JPG, PNG, WEBP, GIF, MP4, WEBM, MOV.',
      });
    }

    const mime = match[1].toLowerCase();
    const buf = Buffer.from(match[2], 'base64');
    if (buf.length > 25 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'Media upload exceeds 25 MB limit.' });
    }

    const magicCheck = validateMagicBytes(buf, mime, ['image', 'video']);
    if (!magicCheck.valid || !magicCheck.ext || !magicCheck.detectedMime) {
      return res.status(400).json({
        ok: false,
        error: magicCheck.reason || 'Uploaded binary signature does not match an allowed media format.',
      });
    }

    const baseClean = (filename || 'asset').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'asset';
    const outName = `comm-${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${baseClean}${magicCheck.ext}`;
    const targetPath = resolveSafeSubpath(COMMUNITY_UPLOADS_DIR, outName);
    if (!targetPath) {
      return res.status(400).json({ ok: false, error: 'Invalid upload destination path.' });
    }

    fs.writeFileSync(targetPath, buf);
    res.status(201).json({
      ok: true,
      url: `/uploads/community/${outName}`,
      mimeType: magicCheck.detectedMime,
      sizeBytes: buf.length,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Upload failed.') });
  }
});

// ============================================================================
// 2. DISCOVERY & GROUPS CRUD
// ============================================================================

seedanceCommunityRouter.get('/groups', optionalFirebaseAuth, (req: Request, res: Response) => {
  const sortRaw = String(req.query.sort || 'recommended');
  const sort = (['recommended', 'recent', 'popular', 'my_groups'].includes(sortRaw)
    ? sortRaw
    : 'recommended') as 'recommended' | 'recent' | 'popular' | 'my_groups';

  const groups = seedanceCommunityStore.discoverGroups({
    viewerUid: req.verifiedUser?.uid,
    isPlatformAdmin: req.verifiedUser?.isAdmin,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    category: typeof req.query.category === 'string' ? req.query.category : undefined,
    interest: typeof req.query.interest === 'string' ? req.query.interest : undefined,
    sort,
  });

  res.json({ ok: true, groups });
});

seedanceCommunityRouter.post('/groups', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const {
      name,
      description = '',
      category = 'AI Filmmaking',
      interests = [],
      coverImageUrl = '',
      iconImageUrl = '',
      rulesText = '',
      visibility = 'PUBLIC',
      joinMode,
      settings,
    } = req.body || {};

    const group = seedanceCommunityStore.createGroup({
      creator: {
        uid: user.uid,
        username: record.username,
        displayName: record.displayName,
        avatar: user.picture || '',
        emailVerified: user.emailVerified,
      },
      name: String(name || ''),
      description: String(description || ''),
      category: String(category || 'AI Filmmaking'),
      interests: Array.isArray(interests) ? interests.map(String) : [],
      coverImageUrl: String(coverImageUrl || ''),
      iconImageUrl: String(iconImageUrl || ''),
      rulesText: String(rulesText || ''),
      visibility: visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC',
      joinMode,
      settings,
    });

    res.status(201).json({ ok: true, group });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.get('/groups/:groupId', optionalFirebaseAuth, (req: Request, res: Response) => {
  const group = seedanceCommunityStore.getGroupById(req.params.groupId);
  if (!group) {
    return res.status(404).json({ ok: false, error: 'Group not found.' });
  }

  const viewerUid = req.verifiedUser?.uid;
  const canReadContent = seedanceCommunityStore.canReadGroupContent(
    group,
    viewerUid,
    req.verifiedUser?.isAdmin
  );

  // Use list decoration logic for preview metadata while hiding rules & settings if private non-member
  const previewGroup = seedanceCommunityStore.discoverGroups({
    viewerUid,
    isPlatformAdmin: req.verifiedUser?.isAdmin,
  }).find((g) => g.id === group.id) || {
    ...group,
    rulesText: canReadContent ? group.rulesText : '',
  };

  res.json({
    ok: true,
    group: canReadContent ? previewGroup : { ...previewGroup, rulesText: '' },
    canReadContent,
  });
});

seedanceCommunityRouter.patch('/groups/:groupId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const updated = seedanceCommunityStore.updateGroupSettings({
      groupId: req.params.groupId,
      actorUid: user.uid,
      actorUsername: record.username,
      isPlatformAdmin: user.isAdmin,
      updates: req.body || {},
    });
    res.json({ ok: true, group: updated });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.delete('/groups/:groupId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    seedanceCommunityStore.deleteGroup({
      groupId: req.params.groupId,
      actorUid: user.uid,
      isPlatformAdmin: user.isAdmin,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

// ============================================================================
// 3. MEMBERSHIP, JOIN REQUESTS, INVITATIONS & GROUP RBAC
// ============================================================================

seedanceCommunityRouter.post('/groups/:groupId/join', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const result = seedanceCommunityStore.joinOrRequestGroup({
      groupId: req.params.groupId,
      user: {
        uid: user.uid,
        username: record.username,
        displayName: record.displayName,
        avatar: user.picture || '',
      },
      message: typeof req.body?.message === 'string' ? req.body.message : undefined,
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/groups/:groupId/leave', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    const group = seedanceCommunityStore.leaveGroup(req.params.groupId, user.uid);
    res.json({ ok: true, group });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.get('/groups/:groupId/members', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const members = seedanceCommunityStore.getGroupMembers(
      req.params.groupId,
      req.verifiedUser?.uid,
      req.verifiedUser?.isAdmin
    );
    res.json({ ok: true, members });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.get('/groups/:groupId/requests', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    const requests = seedanceCommunityStore.getGroupJoinRequests(
      req.params.groupId,
      user.uid,
      user.isAdmin
    );
    res.json({ ok: true, requests });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post(
  '/groups/:groupId/requests/:requestId/review',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user, record } = syncActor(req);
      const approve = Boolean(req.body?.approve);
      const request = seedanceCommunityStore.reviewJoinRequest({
        groupId: req.params.groupId,
        requestId: req.params.requestId,
        actorUid: user.uid,
        actorUsername: record.username,
        approve,
        isPlatformAdmin: user.isAdmin,
      });
      res.json({ ok: true, request });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

seedanceCommunityRouter.post(
  '/groups/:groupId/members/:targetUserId/manage',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user, record } = syncActor(req);
      const { action, newRole, reason } = req.body as {
        action?: 'SET_ROLE' | 'KICK' | 'BAN' | 'UNBAN' | 'TRANSFER_OWNERSHIP';
        newRole?: GroupRole;
        reason?: string;
      };
      if (!action) {
        return res.status(400).json({ ok: false, error: 'action is required.' });
      }
      const result = seedanceCommunityStore.manageGroupMember({
        groupId: req.params.groupId,
        actorUid: user.uid,
        actorUsername: record.username,
        targetUserId: req.params.targetUserId,
        action,
        newRole,
        reason,
        isPlatformAdmin: user.isAdmin,
      });
      res.json({ ok: true, ...result });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

seedanceCommunityRouter.get(
  '/groups/:groupId/moderation-logs',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user } = syncActor(req);
      const logs = seedanceCommunityStore.getGroupModerationLogs(
        req.params.groupId,
        user.uid,
        user.isAdmin
      );
      res.json({ ok: true, logs });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

seedanceCommunityRouter.get('/invitations', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const invitations = seedanceCommunityStore.getUserInvitations(user.uid);
  res.json({ ok: true, invitations });
});

seedanceCommunityRouter.post('/groups/:groupId/invite', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const { targetIdentifier, message } = req.body as {
      targetIdentifier?: string;
      message?: string;
    };
    if (!targetIdentifier || !targetIdentifier.trim()) {
      return res.status(400).json({ ok: false, error: 'Target username, email, or UID is required.' });
    }
    const invitation = seedanceCommunityStore.sendInvitation({
      groupId: req.params.groupId,
      inviter: {
        uid: user.uid,
        username: record.username,
        displayName: record.displayName,
      },
      targetIdentifier,
      message,
    });
    res.status(201).json({ ok: true, invitation });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post(
  '/invitations/:invitationId/respond',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user, record } = syncActor(req);
      const accept = Boolean(req.body?.accept);
      const invitation = seedanceCommunityStore.respondToInvitation({
        invitationId: req.params.invitationId,
        userId: user.uid,
        username: record.username,
        displayName: record.displayName,
        avatar: user.picture || '',
        accept,
      });
      res.json({ ok: true, invitation });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

// ============================================================================
// 4. COMMUNITY FEED, GROUP POSTS, SEEDANCE WORKFLOWS & COMMENTS
// ============================================================================

seedanceCommunityRouter.get('/feed', optionalFirebaseAuth, (req: Request, res: Response) => {
  const postType = typeof req.query.postType === 'string' && req.query.postType !== 'ALL'
    ? (req.query.postType as GroupPostType)
    : undefined;
  const savedOnly = req.query.savedOnly === 'true';

  const posts = seedanceCommunityStore.getCommunityFeed({
    viewerUid: req.verifiedUser?.uid,
    isPlatformAdmin: req.verifiedUser?.isAdmin,
    postType,
    savedOnly,
  });
  res.json({ ok: true, posts });
});

seedanceCommunityRouter.get('/groups/:groupId/posts', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const postType = typeof req.query.postType === 'string' && req.query.postType !== 'ALL'
      ? (req.query.postType as GroupPostType)
      : undefined;
    const statusFilter = typeof req.query.status === 'string'
      ? (req.query.status as GroupPostStatus)
      : 'PUBLISHED';

    const posts = seedanceCommunityStore.getGroupPosts({
      groupId: req.params.groupId,
      viewerUid: req.verifiedUser?.uid,
      isPlatformAdmin: req.verifiedUser?.isAdmin,
      postType,
      statusFilter,
    });
    res.json({ ok: true, posts });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/groups/:groupId/posts', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const {
      postType = 'TEXT',
      title = '',
      body = '',
      tags = [],
      images = [],
      videoUrl,
      thumbnailUrl,
      workflow,
      livestreamId,
    } = req.body || {};

    const post = seedanceCommunityStore.createPost({
      groupId: req.params.groupId,
      author: {
        uid: user.uid,
        username: record.username,
        displayName: record.displayName,
        avatar: user.picture || '',
      },
      postType: postType as GroupPostType,
      title: String(title || ''),
      body: String(body || ''),
      tags: Array.isArray(tags) ? tags.map(String) : [],
      images: Array.isArray(images) ? images.map(String) : [],
      videoUrl: typeof videoUrl === 'string' ? videoUrl : undefined,
      thumbnailUrl: typeof thumbnailUrl === 'string' ? thumbnailUrl : undefined,
      workflow,
      livestreamId,
    });
    res.status(201).json({ ok: true, post });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.patch('/posts/:postId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const post = seedanceCommunityStore.updatePost({
      postId: req.params.postId,
      actorUid: user.uid,
      actorUsername: record.username,
      isPlatformAdmin: user.isAdmin,
      updates: req.body || {},
    });
    res.json({ ok: true, post });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.delete('/posts/:postId', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    seedanceCommunityStore.deletePost({
      postId: req.params.postId,
      actorUid: user.uid,
      actorUsername: record.username,
      isPlatformAdmin: user.isAdmin,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/posts/:postId/react', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const reaction = (req.body?.reaction || 'LIKE') as GroupPostReactionType;
    const post = seedanceCommunityStore.reactToPost({
      postId: req.params.postId,
      user: { uid: user.uid, username: record.username, displayName: record.displayName },
      reaction,
    });
    res.json({ ok: true, post });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/posts/:postId/save', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    const result = seedanceCommunityStore.toggleSavePost(req.params.postId, user.uid);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/posts/:postId/share', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const sharesCount = seedanceCommunityStore.recordPostShare(req.params.postId);
    res.json({ ok: true, sharesCount });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/posts/:postId/import-workflow', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    const workflow = seedanceCommunityStore.recordWorkflowImport(
      req.params.postId,
      user.uid,
      user.isAdmin
    );
    res.json({ ok: true, workflow });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.get('/posts/:postId/comments', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const comments = seedanceCommunityStore.getComments(
      req.params.postId,
      req.verifiedUser?.uid,
      req.verifiedUser?.isAdmin
    );
    res.json({ ok: true, comments });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/posts/:postId/comments', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const { content, parentCommentId } = req.body as { content?: string; parentCommentId?: string };
    const comment = seedanceCommunityStore.addComment({
      postId: req.params.postId,
      author: {
        uid: user.uid,
        username: record.username,
        displayName: record.displayName,
        avatar: user.picture || '',
      },
      content: String(content || ''),
      parentCommentId,
    });
    res.status(201).json({ ok: true, comment });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.delete(
  '/posts/:postId/comments/:commentId',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user } = syncActor(req);
      seedanceCommunityStore.deleteComment({
        postId: req.params.postId,
        commentId: req.params.commentId,
        actorUid: user.uid,
        isPlatformAdmin: user.isAdmin,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

// ============================================================================
// 5. GROUP ANNOUNCEMENTS & EVENTS
// ============================================================================

seedanceCommunityRouter.get('/groups/:groupId/announcements', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const announcements = seedanceCommunityStore.getAnnouncements(
      req.params.groupId,
      req.verifiedUser?.uid,
      req.verifiedUser?.isAdmin
    );
    res.json({ ok: true, announcements });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/groups/:groupId/announcements', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const { title, content, isPinned, scheduledAt } = req.body || {};
    const announcement = seedanceCommunityStore.createAnnouncement({
      groupId: req.params.groupId,
      actor: { uid: user.uid, username: record.username, displayName: record.displayName },
      title: String(title || ''),
      content: String(content || ''),
      isPinned,
      scheduledAt,
      isPlatformAdmin: user.isAdmin,
    });
    res.status(201).json({ ok: true, announcement });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.delete(
  '/groups/:groupId/announcements/:annId',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user } = syncActor(req);
      seedanceCommunityStore.deleteAnnouncement({
        groupId: req.params.groupId,
        announcementId: req.params.annId,
        actorUid: user.uid,
        isPlatformAdmin: user.isAdmin,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

seedanceCommunityRouter.get('/groups/:groupId/events', optionalFirebaseAuth, (req: Request, res: Response) => {
  try {
    const events = seedanceCommunityStore.getEvents(
      req.params.groupId,
      req.verifiedUser?.uid,
      req.verifiedUser?.isAdmin
    );
    res.json({ ok: true, events });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post('/groups/:groupId/events', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const { title, description, eventType = 'MEETING', startsAt, endsAt, locationOrLink } = req.body || {};
    const event = seedanceCommunityStore.createEvent({
      groupId: req.params.groupId,
      creator: { uid: user.uid, username: record.username, displayName: record.displayName },
      title: String(title || ''),
      description: String(description || ''),
      eventType: eventType as GroupEventType,
      startsAt: String(startsAt || new Date().toISOString()),
      endsAt,
      locationOrLink,
      isPlatformAdmin: user.isAdmin,
    });
    res.status(201).json({ ok: true, event });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.post(
  '/groups/:groupId/events/:eventId/rsvp',
  requireFirebaseAuth,
  (req: Request, res: Response) => {
    try {
      const { user } = syncActor(req);
      const event = seedanceCommunityStore.toggleEventRsvp(
        req.params.groupId,
        req.params.eventId,
        user.uid
      );
      res.json({ ok: true, event });
    } catch (err: any) {
      res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
    }
  }
);

// ============================================================================
// 6. VIRTUAL GIFTS (ATOMIC CREDIT DEDUCTION + REALTIME STREAM BROADCAST)
// ============================================================================

seedanceCommunityRouter.get('/gifts/catalog', (_req: Request, res: Response) => {
  res.json({ ok: true, catalog: seedanceCommunityStore.getGiftCatalog(false) });
});

seedanceCommunityRouter.post('/gifts/send', requireFirebaseAuth, financialLimiter, (req: Request, res: Response) => {
  try {
    const { user, record } = syncActor(req);
    const { giftId, recipientId, groupId, postId, livestreamId, note, idempotencyKey } = req.body || {};

    if (!giftId || !recipientId) {
      return res.status(400).json({ ok: false, error: 'giftId and recipientId are required.' });
    }

    const result = seedanceCommunityStore.sendVirtualGift({
      sender: {
        uid: user.uid,
        email: user.email,
        username: record.username,
        displayName: record.displayName,
      },
      giftId: String(giftId),
      recipientId: String(recipientId),
      groupId: groupId ? String(groupId) : undefined,
      postId: postId ? String(postId) : undefined,
      livestreamId: livestreamId ? String(livestreamId) : undefined,
      note: typeof note === 'string' ? note : undefined,
      idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
    });

    // If sent inside an active livestream, broadcast animation event + highlight chat message live
    if (livestreamId && !result.deduplicated) {
      const tx = result.transaction;
      broadcastToStream(String(livestreamId), {
        type: 'stream:gift',
        streamId: String(livestreamId),
        transaction: tx,
      });
      const giftChatText = `Sent Virtual Gift: ${tx.giftName} (${tx.creditCost} CR)${
        tx.note ? ` — "${tx.note}"` : ''
      }`;
      const chatMsg = seedancePlatformStore.addStreamMessage(String(livestreamId), {
        userId: user.uid,
        username: record.username,
        displayName: record.displayName,
        text: giftChatText,
        isHost: false,
      });
      if (chatMsg) {
        broadcastToStream(String(livestreamId), {
          type: 'stream:chat',
          streamId: String(livestreamId),
          message: chatMsg,
        });
      }
    }

    res.status(201).json({ ok: true, ...result });
  } catch (err: any) {
    res.status(mapErrStatus(err)).json({ ok: false, error: err?.message });
  }
});

seedanceCommunityRouter.get('/gifts/history', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const history = seedanceCommunityStore.getUserGiftHistory(user.uid);
  res.json({ ok: true, ...history });
});

// ============================================================================
// 7. NOTIFICATIONS, REPORTS, CREATOR PROFILES & FOLLOWING
// ============================================================================

seedanceCommunityRouter.get('/notifications', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const data = seedanceCommunityStore.getUserNotifications(user.uid);
  res.json({ ok: true, ...data });
});

seedanceCommunityRouter.post('/notifications/read', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const unreadCount = seedanceCommunityStore.markNotificationsRead(
    user.uid,
    typeof req.body?.notificationId === 'string' ? req.body.notificationId : undefined
  );
  res.json({ ok: true, unreadCount });
});

seedanceCommunityRouter.post('/reports', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user, record } = syncActor(req);
  const { targetType, targetId, groupId, targetSummary, reason } = req.body || {};
  if (!targetType || !targetId || !reason?.trim()) {
    return res.status(400).json({ ok: false, error: 'targetType, targetId, and reason are required.' });
  }
  const report = seedanceCommunityStore.submitReport({
    reporterId: user.uid,
    reporterUsername: record.username,
    targetType: targetType as CommunityReportTargetType,
    targetId: String(targetId),
    groupId: groupId ? String(groupId) : undefined,
    targetSummary: targetSummary ? String(targetSummary) : undefined,
    reason: String(reason),
  });
  res.status(201).json({ ok: true, report });
});

seedanceCommunityRouter.get('/following-feed', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const data = seedanceCommunityStore.getFollowingFeedSummary(user.uid);
  res.json({ ok: true, ...data });
});

seedanceCommunityRouter.get('/profiles/:userId', optionalFirebaseAuth, (req: Request, res: Response) => {
  const data = seedanceCommunityStore.getPublicUserProfileView(
    req.params.userId,
    req.verifiedUser?.uid,
    req.verifiedUser?.isAdmin
  );
  res.json({ ok: true, ...data });
});

seedanceCommunityRouter.patch('/profiles/me', requireFirebaseAuth, (req: Request, res: Response) => {
  const { user } = syncActor(req);
  const profile = seedanceCommunityStore.updateUserProfile(user.uid, req.body || {});
  res.json({ ok: true, profile });
});

seedanceCommunityRouter.post('/profiles/:userId/follow', requireFirebaseAuth, (req: Request, res: Response) => {
  try {
    const { user } = syncActor(req);
    const result = seedanceCommunityStore.toggleFollowCreator(user.uid, req.params.userId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Follow action failed.') });
  }
});
