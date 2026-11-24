/**
 * VAIURE — LIVESTREAMING & MULTIPLAYER LIVE ROOMS REST API (/api/streams/*, /api/rooms/*)
 * All sessions & rooms strictly come from persisted real user records (zero fake/demo sessions).
 */

import { Router, Request, Response } from 'express';
import { optionalFirebaseAuth, requireFirebaseAuth } from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import { seedanceCommunityStore } from './seedanceCommunityStore';
import { broadcastToStream, broadcastToRoom, sendToUserInRoom, sendToUserInStream } from './realtimeHub';
import { LiveCallRoomVisibility, LivestreamVisibility } from '../types/seedancePlatform';

export const seedanceRealtimeRouter = Router();

// ============================================================================
// 1. LIVESTREAMING ROUTES (/api/streams/*)
// ============================================================================

seedanceRealtimeRouter.get('/streams', optionalFirebaseAuth, (req: Request, res: Response) => {
  const viewerUid = req.verifiedUser?.uid;
  const groupId = typeof req.query.groupId === 'string' && req.query.groupId.trim()
    ? req.query.groupId.trim()
    : undefined;

  if (groupId) {
    const group = seedanceCommunityStore.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ ok: false, error: 'Group not found.' });
    }
    if (!seedanceCommunityStore.canReadGroupContent(group, viewerUid, req.verifiedUser?.isAdmin)) {
      return res.status(403).json({
        ok: false,
        error: 'Private group livestreams are restricted to approved members.',
      });
    }
  }

  const streams = seedancePlatformStore.getLivestreams(viewerUid, false, groupId);
  res.json({ ok: true, streams });
});

seedanceRealtimeRouter.post('/streams', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const record = seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });

  const { title, description = '', visibility = 'PUBLIC', accessCode, groupId, postToGroup = true } = req.body as {
    title?: string;
    description?: string;
    visibility?: LivestreamVisibility;
    accessCode?: string;
    groupId?: string;
    postToGroup?: boolean;
  };

  if (!title || !title.trim()) {
    return res.status(400).json({ ok: false, error: 'Livestream title is required.' });
  }

  let groupMeta:
    | { groupId: string; groupName: string; groupVisibility: 'PUBLIC' | 'PRIVATE'; allowedUserIds: string[] }
    | undefined;

  if (groupId && groupId.trim()) {
    const group = seedanceCommunityStore.getGroupById(groupId.trim());
    if (!group || group.status !== 'ACTIVE') {
      return res.status(404).json({ ok: false, error: 'Target community group not found or inactive.' });
    }
    if (!seedanceCommunityStore.isActiveMember(group.id, user.uid)) {
      return res.status(403).json({
        ok: false,
        error: 'Only active group members can launch a group livestream.',
      });
    }
    if (!seedanceCommunityStore.hasGroupPermission(group, user.uid, group.settings.whoCanStartLivestream)) {
      return res.status(403).json({
        ok: false,
        error: 'Your group role does not permit starting livestreams in this group.',
      });
    }
    const memberIds = seedanceCommunityStore.getActiveMemberIds(group.id);
    groupMeta = {
      groupId: group.id,
      groupName: group.name,
      groupVisibility: group.visibility,
      allowedUserIds: group.visibility === 'PRIVATE' ? memberIds : [],
    };
  }

  const effectiveVisibility: LivestreamVisibility =
    groupMeta?.groupVisibility === 'PRIVATE'
      ? 'PRIVATE'
      : visibility === 'PRIVATE'
      ? 'PRIVATE'
      : 'PUBLIC';

  if (effectiveVisibility === 'PRIVATE' && !groupMeta && (!accessCode || !accessCode.trim())) {
    return res.status(400).json({
      ok: false,
      error: 'Private livestreams require an access code for authorized viewers.',
    });
  }

  const stream = seedancePlatformStore.createLivestream({
    hostUserId: user.uid,
    hostUsername: record.username,
    hostDisplayName: record.displayName,
    hostAvatar: user.picture || '',
    title,
    description,
    visibility: effectiveVisibility,
    accessCode: groupMeta?.groupVisibility === 'PRIVATE' ? undefined : accessCode,
    allowedUserIds: groupMeta?.allowedUserIds,
    groupId: groupMeta?.groupId,
    groupName: groupMeta?.groupName,
    groupVisibility: groupMeta?.groupVisibility,
  });

  if (groupMeta) {
    if (postToGroup) {
      try {
        seedanceCommunityStore.createPost({
          groupId: groupMeta.groupId,
          author: {
            uid: user.uid,
            username: record.username,
            displayName: record.displayName,
            avatar: user.picture || '',
          },
          postType: 'LIVESTREAM',
          title: `Live Broadcast: ${stream.title}`,
          body: description.trim() || `@${record.username} is live streaming now in ${groupMeta.groupName}.`,
          livestreamId: stream.id,
        });
      } catch {
        // Group posting rules may restrict member post creation while still allowing stream launch
      }
    }

    const members = seedanceCommunityStore.getActiveMemberIds(groupMeta.groupId);
    for (const memberId of members) {
      seedanceCommunityStore.pushNotification({
        recipientId: memberId,
        actorId: user.uid,
        actorUsername: record.username,
        actorDisplayName: record.displayName,
        type: 'GROUP_LIVESTREAM',
        title: `Live in ${groupMeta.groupName}`,
        body: `@${record.username} started a livestream: "${stream.title}"`,
        deepLink: { section: 'livestream', groupId: groupMeta.groupId, livestreamId: stream.id },
      });
    }
  }

  res.status(201).json({ ok: true, stream });
});

seedanceRealtimeRouter.post('/streams/:id/join', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const record = seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });

  const raw = seedancePlatformStore.getLivestreamRaw(req.params.id);
  if (raw?.groupId && raw.groupVisibility === 'PRIVATE') {
    const group = seedanceCommunityStore.getGroupById(raw.groupId);
    if (!group || !seedanceCommunityStore.canReadGroupContent(group, user.uid, user.isAdmin)) {
      return res.status(403).json({
        ok: false,
        error: 'Private group membership is required to join this group livestream.',
      });
    }
  }

  const { accessCode } = req.body as { accessCode?: string };
  const result = seedancePlatformStore.authorizeStreamAccess(
    req.params.id,
    {
      uid: user.uid,
      username: record.username,
      displayName: record.displayName,
    },
    accessCode
  );

  if (!result.ok || !result.stream) {
    return res.status(403).json({ ok: false, error: result.error });
  }

  const messages = seedancePlatformStore.getStreamMessages(req.params.id);
  res.json({ ok: true, stream: result.stream, messages });
});

seedanceRealtimeRouter.get('/streams/:id/messages', optionalFirebaseAuth, (req: Request, res: Response) => {
  const raw = seedancePlatformStore.getLivestreamRaw(req.params.id);
  if (!raw) {
    return res.status(404).json({ ok: false, error: 'Livestream not found.' });
  }
  if (raw.groupId && raw.groupVisibility === 'PRIVATE') {
    const group = seedanceCommunityStore.getGroupById(raw.groupId);
    if (!group || !seedanceCommunityStore.canReadGroupContent(group, req.verifiedUser?.uid, req.verifiedUser?.isAdmin)) {
      return res.status(403).json({ ok: false, error: 'Access denied to private group livestream chat.' });
    }
  }
  if (
    raw.visibility === 'PRIVATE' &&
    req.verifiedUser?.uid !== raw.hostUserId &&
    !raw.allowedUserIds.includes(req.verifiedUser?.uid || '') &&
    !req.verifiedUser?.isAdmin
  ) {
    return res.status(403).json({ ok: false, error: 'Access denied to private livestream chat.' });
  }
  res.json({ ok: true, messages: seedancePlatformStore.getStreamMessages(req.params.id) });
});

seedanceRealtimeRouter.post('/streams/:id/end', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const raw = seedancePlatformStore.getLivestreamRaw(req.params.id);
  if (!raw) {
    return res.status(404).json({ ok: false, error: 'Livestream not found.' });
  }
  if (raw.hostUserId !== user.uid && !user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Only the host or administrator can end this livestream.' });
  }

  const ended = seedancePlatformStore.endLivestream(req.params.id);
  broadcastToStream(req.params.id, {
    type: 'stream:ended',
    streamId: req.params.id,
    endedBy: user.uid,
  });
  res.json({ ok: true, stream: ended });
});

seedanceRealtimeRouter.post('/streams/:id/moderate', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const raw = seedancePlatformStore.getLivestreamRaw(req.params.id);
  if (!raw) {
    return res.status(404).json({ ok: false, error: 'Livestream not found.' });
  }
  if (raw.hostUserId !== user.uid && !user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Host or administrator clearance required.' });
  }

  const { targetUserId, action } = req.body as {
    targetUserId?: string;
    action?: 'mute' | 'unmute' | 'ban';
  };
  if (!targetUserId || !action || !['mute', 'unmute', 'ban'].includes(action)) {
    return res.status(400).json({ ok: false, error: 'targetUserId and valid moderation action required.' });
  }
  if (targetUserId === raw.hostUserId) {
    return res.status(400).json({ ok: false, error: 'Cannot moderate stream host.' });
  }

  const updated = seedancePlatformStore.moderateStreamViewer(req.params.id, targetUserId, action);
  if (action === 'ban') {
    sendToUserInStream(req.params.id, targetUserId, {
      type: 'stream:kicked',
      streamId: req.params.id,
      reason: 'Removed by host.',
    });
  } else {
    sendToUserInStream(req.params.id, targetUserId, {
      type: 'stream:muted',
      streamId: req.params.id,
      muted: action === 'mute',
    });
  }
  broadcastToStream(req.params.id, {
    type: 'stream:presence',
    streamId: req.params.id,
    viewerCount: updated?.viewerCount || 0,
    viewers: updated?.viewers || [],
  });
  res.json({ ok: true, stream: updated });
});

// ============================================================================
// 2. MULTIPLAYER CALL — LIVE ROOMS (/api/rooms/*)
// ============================================================================

seedanceRealtimeRouter.get('/rooms', optionalFirebaseAuth, (req: Request, res: Response) => {
  const rooms = seedancePlatformStore.getLiveRooms(req.verifiedUser?.uid);
  res.json({ ok: true, rooms });
});

seedanceRealtimeRouter.post('/rooms', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const record = seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });

  const { name, description = '', visibility = 'PUBLIC', maxParticipants = 8 } = req.body as {
    name?: string;
    description?: string;
    visibility?: LiveCallRoomVisibility;
    maxParticipants?: number;
  };

  if (!name || !name.trim()) {
    return res.status(400).json({ ok: false, error: 'Room name is required.' });
  }

  const normalizedVis: LiveCallRoomVisibility =
    visibility === 'PRIVATE' || visibility === 'INVITE_ONLY' ? visibility : 'PUBLIC';

  const room = seedancePlatformStore.createLiveRoom({
    creatorUserId: user.uid,
    creatorUsername: record.username,
    creatorDisplayName: record.displayName,
    creatorAvatar: user.picture || '',
    name,
    description,
    visibility: normalizedVis,
    maxParticipants,
  });

  res.status(201).json({ ok: true, room });
});

seedanceRealtimeRouter.post('/rooms/join', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const record = seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });
  const { roomId, inviteCode } = req.body as { roomId?: string; inviteCode?: string };
  if (!roomId && !inviteCode) {
    return res.status(400).json({ ok: false, error: 'roomId or inviteCode is required.' });
  }

  const result = seedancePlatformStore.joinLiveRoom({
    roomId,
    inviteCode,
    user: {
      uid: user.uid,
      username: record.username,
      displayName: record.displayName,
      avatar: user.picture || '',
    },
  });

  if (!result.ok || !result.room) {
    return res.status(403).json({ ok: false, error: result.error });
  }
  res.json({ ok: true, room: result.room });
});

seedanceRealtimeRouter.post('/rooms/:id/invite', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const room = seedancePlatformStore.getLiveRoomById(req.params.id);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found.' });
  }
  if (room.creatorUserId !== user.uid && !user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Only the room creator can invite participants.' });
  }
  const { target } = req.body as { target?: string };
  if (!target || !target.trim()) {
    return res.status(400).json({ ok: false, error: 'Target username, email, or uid required.' });
  }

  const updated = seedancePlatformStore.inviteToRoom(req.params.id, target.trim());
  res.json({ ok: true, room: updated });
});

seedanceRealtimeRouter.post('/rooms/:id/moderate', requireFirebaseAuth, (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const room = seedancePlatformStore.getLiveRoomById(req.params.id);
  if (!room) {
    return res.status(404).json({ ok: false, error: 'Room not found.' });
  }
  if (room.creatorUserId !== user.uid && !user.isAdmin) {
    return res.status(403).json({ ok: false, error: 'Only the room creator or administrator can moderate.' });
  }

  const { action, targetUserId } = req.body as {
    action?: 'mute_participant' | 'unmute_participant' | 'remove_participant' | 'lock' | 'unlock' | 'close';
    targetUserId?: string;
  };
  if (
    !action ||
    !['mute_participant', 'unmute_participant', 'remove_participant', 'lock', 'unlock', 'close'].includes(action)
  ) {
    return res.status(400).json({ ok: false, error: 'Valid moderation action required.' });
  }

  const updated = seedancePlatformStore.moderateRoom(req.params.id, action, targetUserId);
  if (action === 'close') {
    broadcastToRoom(req.params.id, { type: 'room:closed', roomId: req.params.id });
  } else if (action === 'remove_participant' && targetUserId) {
    sendToUserInRoom(req.params.id, targetUserId, { type: 'room:removed', roomId: req.params.id });
    broadcastToRoom(req.params.id, {
      type: 'room:participants-sync',
      roomId: req.params.id,
      participants: updated?.participants || [],
    });
  } else if (action === 'mute_participant' && targetUserId) {
    sendToUserInRoom(req.params.id, targetUserId, {
      type: 'room:muted-by-host',
      roomId: req.params.id,
      muted: true,
    });
    broadcastToRoom(req.params.id, {
      type: 'room:participants-sync',
      roomId: req.params.id,
      participants: updated?.participants || [],
    });
  } else if (updated) {
    broadcastToRoom(req.params.id, {
      type: 'room:participants-sync',
      roomId: req.params.id,
      participants: updated.participants,
      locked: updated.locked,
    });
  }

  res.json({ ok: true, room: updated });
});
