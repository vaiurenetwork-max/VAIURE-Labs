/**
 * VAIURE — SEEDANCE LAB PLATFORM ADMINISTRATION ROUTES (/api/admin/platform/*)
 * Strictly enforces verified Firebase ID token + Admin privileges.
 * Manages:
 * - Configurable Subscription Tiers (Free, Basic, Pro, Premium, Enterprise)
 * - Dynamic Generation Cost Schedule & Rules
 * - Credit Top-Up Packages & BytePlus API Stock
 * - Real Registered Users, Subscriptions, Roles, & Credit Adjustments
 * - Livestream & Live Room Moderation
 * - Real Platform Statistics & Immutable Audit Logs
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireFirebaseAuth } from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import { seedanceCommunityStore } from './seedanceCommunityStore';
import { broadcastToStream, broadcastToRoom } from './realtimeHub';
import {
  listBackups,
  createBackupSnapshot,
  verifyBackupSnapshot,
  restoreBackupSnapshot,
} from './backupService';
import { isSafeIdentifier, sanitizeErrorMessage } from './securityMiddleware';
import {
  CommunityReportStatus,
  GroupStatus,
  MembershipPlan,
  MembershipTier,
} from '../types/seedancePlatform';

export const seedanceAdminRouter = Router();

function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = req.verifiedUser;
  if (!user) {
    res.status(401).json({ ok: false, error: 'Authentication required.' });
    return;
  }

  const record = seedancePlatformStore.getUserRecord(user.uid);
  const hasAdminRole =
    user.isAdmin ||
    record?.role === 'ADMIN' ||
    record?.role === 'SUPER_ADMIN';

  if (!hasAdminRole) {
    res.status(403).json({
      ok: false,
      error: 'Administrator authorization required for platform governance controls.',
    });
    return;
  }

  next();
}

seedanceAdminRouter.use(requireFirebaseAuth, requirePlatformAdmin);

// 1. Overview & Real Calculated Stats
seedanceAdminRouter.get('/overview', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    analytics: seedancePlatformStore.getFinancialAnalytics(),
    stock: seedancePlatformStore.getApiStock(),
  });
});

// 2. Configurable Subscription Plans (Free, Basic, Pro, Premium, Enterprise)
seedanceAdminRouter.get('/plans', (_req: Request, res: Response) => {
  res.json({ ok: true, plans: seedancePlatformStore.getPlans(true) });
});

seedanceAdminRouter.put('/plans/:planIdOrTier', (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const updated = seedancePlatformStore.updatePlan(
      req.params.planIdOrTier,
      req.body as Partial<MembershipPlan>,
      { uid: user.uid, email: user.email }
    );
    res.json({ ok: true, plan: updated });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to update plan.') });
  }
});

// 3. Dynamic Generation Cost Schedule & Model Rules
seedanceAdminRouter.get('/cost-config', (_req: Request, res: Response) => {
  res.json({ ok: true, costConfig: seedancePlatformStore.getCostConfig() });
});

seedanceAdminRouter.put('/cost-config', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const updated = seedancePlatformStore.updateCostConfig(req.body || {}, {
    uid: user.uid,
    email: user.email,
  });
  res.json({ ok: true, costConfig: updated });
});

// 4. Credit Packages Config
seedanceAdminRouter.get('/packages', (_req: Request, res: Response) => {
  res.json({ ok: true, packages: seedancePlatformStore.getPackages() });
});

seedanceAdminRouter.put('/packages', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { packages } = req.body;
  if (!Array.isArray(packages)) {
    return res.status(400).json({ ok: false, error: 'packages array is required.' });
  }
  seedancePlatformStore.updatePackages(packages, { uid: user.uid, email: user.email });
  res.json({ ok: true, packages: seedancePlatformStore.getPackages() });
});

// 5. Users, Subscriptions & Credits Management
seedanceAdminRouter.get('/users', (_req: Request, res: Response) => {
  const users = seedancePlatformStore.getAllUsers().map((u) => ({
    ...u,
    subscription: seedancePlatformStore.getUserSubscription(u.uid, u.email),
    wallet: seedancePlatformStore.getOrCreateWallet(u.uid, u.email),
  }));
  res.json({ ok: true, users });
});

seedanceAdminRouter.post('/users/:uid/assign-plan', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const { tier, note } = req.body as { tier?: MembershipTier; note?: string };
  if (!tier) {
    return res.status(400).json({ ok: false, error: 'tier is required.' });
  }
  const targetUser = seedancePlatformStore.getUserRecord(req.params.uid);
  const result = seedancePlatformStore.activateSubscriptionTier({
    userId: req.params.uid,
    userEmail: targetUser?.email || '',
    tier,
    billingStatus: 'ADMIN_GRANTED',
    paymentProvider: 'ADMIN_DIRECT',
    note: note || `Assigned ${tier} tier by admin ${admin.email}`,
    actor: { uid: admin.uid, email: admin.email },
  });
  res.json({ ok: true, ...result });
});

seedanceAdminRouter.post('/users/:uid/adjust-credits', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const { creditAdjustment, reason } = req.body as {
    creditAdjustment?: number;
    reason?: string;
  };
  if (typeof creditAdjustment !== 'number' || !Number.isFinite(creditAdjustment) || !reason?.trim()) {
    return res.status(400).json({
      ok: false,
      error: 'Numeric creditAdjustment and non-empty audit reason are required.',
    });
  }

  const result = seedancePlatformStore.adminAdjustCredits({
    targetUserId: req.params.uid,
    creditAdjustment,
    reason: reason.trim(),
    actor: { uid: admin.uid, email: admin.email },
  });
  res.json({ ok: true, ...result });
});

seedanceAdminRouter.post('/users/:uid/status', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const { status, role, reason } = req.body as {
    status?: 'ACTIVE' | 'SUSPENDED';
    role?: 'USER' | 'CREATOR' | 'ADMIN' | 'SUPER_ADMIN';
    reason?: string;
  };
  if (!reason || !reason.trim()) {
    return res.status(400).json({ ok: false, error: 'Audit reason is required.' });
  }
  const updated = seedancePlatformStore.updateUserStatusAndRole(
    req.params.uid,
    { status, role },
    { uid: admin.uid, email: admin.email },
    reason.trim()
  );
  res.json({ ok: true, user: updated });
});

// 6. Real Credit Transactions & Audit Logs
seedanceAdminRouter.get('/transactions', (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
  res.json({ ok: true, transactions: seedancePlatformStore.getTransactions(userId) });
});

seedanceAdminRouter.get('/audit-logs', (_req: Request, res: Response) => {
  res.json({ ok: true, logs: seedancePlatformStore.getAuditLogs(150) });
});

// 7. Livestream & Live Room Moderation
seedanceAdminRouter.get('/streams', (_req: Request, res: Response) => {
  res.json({ ok: true, streams: seedancePlatformStore.getAllLivestreamsAdmin() });
});

seedanceAdminRouter.post('/streams/:id/end', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const ended = seedancePlatformStore.endLivestream(req.params.id);
  if (!ended) {
    return res.status(404).json({ ok: false, error: 'Stream not found.' });
  }
  seedancePlatformStore.addAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'ADMIN_END_LIVESTREAM',
    targetType: 'livestream',
    targetId: req.params.id,
    reason: String(req.body?.reason || 'Force-ended by administrator'),
  });
  seedancePlatformStore.persist();
  broadcastToStream(req.params.id, { type: 'stream:ended', streamId: req.params.id, endedBy: admin.uid });
  res.json({ ok: true, stream: ended });
});

seedanceAdminRouter.get('/rooms', (_req: Request, res: Response) => {
  res.json({ ok: true, rooms: seedancePlatformStore.getAllRoomsAdmin() });
});

seedanceAdminRouter.post('/rooms/:id/close', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const closed = seedancePlatformStore.moderateRoom(req.params.id, 'close');
  if (!closed) {
    return res.status(404).json({ ok: false, error: 'Room not found.' });
  }
  seedancePlatformStore.addAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'ADMIN_CLOSE_ROOM',
    targetType: 'liveRoom',
    targetId: req.params.id,
    reason: String(req.body?.reason || 'Force-closed by administrator'),
  });
  seedancePlatformStore.persist();
  broadcastToRoom(req.params.id, { type: 'room:closed', roomId: req.params.id });
  res.json({ ok: true, room: closed });
});

// 8. Platform-Level Community & Groups Governance
seedanceAdminRouter.get('/community/groups', (_req: Request, res: Response) => {
  res.json({ ok: true, groups: seedanceCommunityStore.getAllGroupsAdmin() });
});

seedanceAdminRouter.post('/community/groups/:groupId/status', (req: Request, res: Response) => {
  try {
    const admin = req.verifiedUser!;
    const { status, reason } = req.body as { status?: GroupStatus; reason?: string };
    if (!status || !['ACTIVE', 'ARCHIVED', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'Valid group status required.' });
    }
    const group = seedanceCommunityStore.adminSetGroupStatus({
      groupId: req.params.groupId,
      status,
      reason: reason || `Admin status update: ${status}`,
      actor: { uid: admin.uid, email: admin.email },
    });
    res.json({ ok: true, group });
  } catch (err: any) {
    res.status(404).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to update group status.') });
  }
});

seedanceAdminRouter.delete('/community/groups/:groupId', (req: Request, res: Response) => {
  try {
    const admin = req.verifiedUser!;
    seedanceCommunityStore.deleteGroup({
      groupId: req.params.groupId,
      actorUid: admin.uid,
      isPlatformAdmin: true,
    });
    seedancePlatformStore.addAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'PLATFORM_DELETE_GROUP',
      targetType: 'communityGroup',
      targetId: req.params.groupId,
      reason: 'Deleted permanently by platform administrator',
    });
    seedancePlatformStore.persist();
    res.json({ ok: true });
  } catch (err: any) {
    res.status(404).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to delete group.') });
  }
});

seedanceAdminRouter.get('/community/reports', (_req: Request, res: Response) => {
  res.json({ ok: true, reports: seedanceCommunityStore.getAllReportsAdmin() });
});

seedanceAdminRouter.post('/community/reports/:reportId/resolve', (req: Request, res: Response) => {
  try {
    const admin = req.verifiedUser!;
    const { status, resolutionNote = '', removeTargetContent = false } = req.body as {
      status?: CommunityReportStatus;
      resolutionNote?: string;
      removeTargetContent?: boolean;
    };
    const report = seedanceCommunityStore.adminResolveReport({
      reportId: req.params.reportId,
      status: status || 'REVIEWED',
      resolutionNote,
      removeTargetContent,
      actor: { uid: admin.uid, email: admin.email },
    });
    res.json({ ok: true, report });
  } catch (err: any) {
    res.status(404).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to resolve report.') });
  }
});

seedanceAdminRouter.get('/community/gifts', (_req: Request, res: Response) => {
  res.json({ ok: true, gifts: seedanceCommunityStore.getGiftCatalog(true) });
});

seedanceAdminRouter.post('/community/gifts', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const gifts = seedanceCommunityStore.adminUpsertGift({
    gift: req.body || {},
    actor: { uid: admin.uid, email: admin.email },
  });
  res.json({ ok: true, gifts });
});

seedanceAdminRouter.get('/community/gift-transactions', (_req: Request, res: Response) => {
  res.json({ ok: true, transactions: seedanceCommunityStore.getAllGiftTransactionsAdmin() });
});

seedanceAdminRouter.get('/community/categories', (_req: Request, res: Response) => {
  res.json({ ok: true, categories: seedanceCommunityStore.getCategories(true) });
});

seedanceAdminRouter.put('/community/categories', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    return res.status(400).json({ ok: false, error: 'categories array is required.' });
  }
  const updated = seedanceCommunityStore.adminUpdateCategories(categories, {
    uid: admin.uid,
    email: admin.email,
  });
  res.json({ ok: true, categories: updated });
});

seedanceAdminRouter.get('/community/policies', (_req: Request, res: Response) => {
  res.json({ ok: true, policies: seedanceCommunityStore.getPolicies() });
});

seedanceAdminRouter.put('/community/policies', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const policies = seedanceCommunityStore.adminUpdatePolicies(req.body || {}, {
    uid: admin.uid,
    email: admin.email,
  });
  res.json({ ok: true, policies });
});

seedanceAdminRouter.post('/community/users/:uid/restrict', (req: Request, res: Response) => {
  const admin = req.verifiedUser!;
  const { restricted, reason = '' } = req.body as { restricted?: boolean; reason?: string };
  const profile = seedanceCommunityStore.adminSetUserCommunityRestriction({
    targetUid: req.params.uid,
    restricted: Boolean(restricted),
    reason: reason || (restricted ? 'Restricted by platform moderation' : 'Restriction lifted'),
    actor: { uid: admin.uid, email: admin.email },
  });
  res.json({ ok: true, profile });
});

// 9. Snapshot Backups, Checksum Verification & Point-in-Time Recovery
seedanceAdminRouter.get('/backups', (_req: Request, res: Response) => {
  res.json({ ok: true, backups: listBackups() });
});

seedanceAdminRouter.post('/backups/create', (req: Request, res: Response) => {
  try {
    const admin = req.verifiedUser!;
    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim()
      ? req.body.reason.trim().slice(0, 120)
      : 'MANUAL_ADMIN_SNAPSHOT';
    const manifest = createBackupSnapshot(reason, admin.uid);
    seedancePlatformStore.addAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'ADMIN_CREATE_BACKUP',
      targetType: 'backupSnapshot',
      targetId: manifest.id,
      reason,
    });
    seedancePlatformStore.persist();
    res.status(201).json({ ok: true, snapshot: manifest });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to create backup snapshot.') });
  }
});

seedanceAdminRouter.post('/backups/:backupId/verify', (req: Request, res: Response) => {
  if (!isSafeIdentifier(req.params.backupId)) {
    return res.status(400).json({ ok: false, error: 'Invalid backup identifier.' });
  }
  const verification = verifyBackupSnapshot(req.params.backupId);
  res.json({ ok: true, verification });
});

seedanceAdminRouter.post('/backups/:backupId/restore', (req: Request, res: Response) => {
  try {
    const admin = req.verifiedUser!;
    if (!isSafeIdentifier(req.params.backupId)) {
      return res.status(400).json({ ok: false, error: 'Invalid backup identifier.' });
    }
    const result = restoreBackupSnapshot(req.params.backupId, admin.uid);
    seedancePlatformStore.addAuditLog({
      actorUid: admin.uid,
      actorEmail: admin.email,
      action: 'ADMIN_RESTORE_BACKUP',
      targetType: 'backupSnapshot',
      targetId: req.params.backupId,
      reason: String(req.body?.reason || `Restored verified snapshot ${req.params.backupId}`),
    });
    seedancePlatformStore.persist();
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Backup restore failed.') });
  }
});
