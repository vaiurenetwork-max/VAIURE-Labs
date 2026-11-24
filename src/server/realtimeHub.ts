/**
 * VAIURE — REAL-TIME WEBSOCKET SIGNALING & COLLABORATION HUB
 * Handles bidirectional WebRTC signaling (SDP offers/answers, ICE candidates),
 * live stream viewer presence & chat, and multiplayer live room call coordination
 * over persistent WebSocket connections at ws(s)://host/ws.
 */

import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyFirebaseIdToken, VerifiedRequestUser } from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import { seedanceCommunityStore } from './seedanceCommunityStore';
import { isTrustedOrigin, sanitizeErrorMessage } from './securityMiddleware';

interface ConnectedClient {
  socket: WebSocket;
  user: VerifiedRequestUser;
  username: string;
  displayName: string;
  streamId?: string;
  roomId?: string;
  isBroadcaster?: boolean;
  lastHeartbeat: number;
  msgTimestamps: number[];
}

const clients = new Set<ConnectedClient>();

function safeSend(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

export function broadcastToStream(
  streamId: string,
  payload: unknown,
  excludeUserId?: string
): void {
  for (const client of clients) {
    if (client.streamId === streamId && client.user.uid !== excludeUserId) {
      safeSend(client.socket, payload);
    }
  }
}

export function broadcastToRoom(
  roomId: string,
  payload: unknown,
  excludeUserId?: string
): void {
  for (const client of clients) {
    if (client.roomId === roomId && client.user.uid !== excludeUserId) {
      safeSend(client.socket, payload);
    }
  }
}

export function sendToUserInStream(
  streamId: string,
  targetUserId: string,
  payload: unknown
): void {
  for (const client of clients) {
    if (client.streamId === streamId && client.user.uid === targetUserId) {
      safeSend(client.socket, payload);
    }
  }
}

export function sendToUserInRoom(
  roomId: string,
  targetUserId: string,
  payload: unknown
): void {
  for (const client of clients) {
    if (client.roomId === roomId && client.user.uid === targetUserId) {
      safeSend(client.socket, payload);
    }
  }
}

export function sendToUserGlobal(targetUserId: string, payload: unknown): void {
  for (const client of clients) {
    if (client.user.uid === targetUserId) {
      safeSend(client.socket, payload);
    }
  }
}

function detachClientFromStream(client: ConnectedClient): void {
  if (!client.streamId) return;
  const streamId = client.streamId;
  const wasBroadcaster = Boolean(client.isBroadcaster);
  client.streamId = undefined;
  client.isBroadcaster = false;

  if (wasBroadcaster) {
    seedancePlatformStore.setStreamPublisherActive(streamId, false);
    broadcastToStream(streamId, {
      type: 'stream:publisher-state',
      streamId,
      hasPublisherStream: false,
    });
  } else {
    const updated = seedancePlatformStore.updateStreamPresence(
      streamId,
      {
        uid: client.user.uid,
        username: client.username,
        displayName: client.displayName,
      },
      'leave'
    );
    if (updated) {
      broadcastToStream(streamId, {
        type: 'stream:presence',
        streamId,
        viewerCount: updated.viewerCount,
        viewers: updated.viewers || [],
      });
    }
  }
}

function detachClientFromRoom(client: ConnectedClient): void {
  if (!client.roomId) return;
  const roomId = client.roomId;
  client.roomId = undefined;

  const updated = seedancePlatformStore.leaveLiveRoom(roomId, client.user.uid);
  if (updated) {
    broadcastToRoom(roomId, {
      type: 'room:peer-left',
      roomId,
      userId: client.user.uid,
      participants: updated.participants,
    });
  }
}

export function attachRealtimeWebSocketServer(httpServer: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 256 * 1024, // 256 KB max frame payload
  });

  httpServer.on('upgrade', (req, socket, head) => {
    const reqUrl = req.url || '';
    if (!reqUrl.startsWith('/ws')) {
      socket.destroy();
      return;
    }

    const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
    if (!isTrustedOrigin(req.headers.origin as string | undefined, host)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  // Periodic heartbeat cleanup
  const heartbeatTimer = setInterval(() => {
    const cutoff = Date.now() - 90_000;
    for (const c of clients) {
      if (c.lastHeartbeat < cutoff || c.socket.readyState !== WebSocket.OPEN) {
        detachClientFromStream(c);
        detachClientFromRoom(c);
        clients.delete(c);
        try {
          c.socket.terminate();
        } catch {
          // ignore
        }
      }
    }
  }, 30_000);
  heartbeatTimer.unref();

  wss.on('close', () => clearInterval(heartbeatTimer));

  wss.on('connection', (socket) => {
    let connectedClient: ConnectedClient | null = null;
    const authTimeout = setTimeout(() => {
      if (!connectedClient && socket.readyState === WebSocket.OPEN) {
        safeSend(socket, { type: 'auth:error', error: 'Authentication timeout exceeded.' });
        socket.close(4001, 'Authentication timeout');
      }
    }, 10_000);
    authTimeout.unref();

    socket.on('message', async (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        safeSend(socket, { type: 'error', error: 'Invalid WebSocket JSON payload.' });
        return;
      }

      if (msg.type === 'ping') {
        if (connectedClient) connectedClient.lastHeartbeat = Date.now();
        safeSend(socket, { type: 'pong', time: Date.now() });
        return;
      }

      // 1. Authenticate WebSocket session with Firebase ID Token
      if (msg.type === 'auth') {
        try {
          const verified = await verifyFirebaseIdToken(String(msg.token || ''));
          const record = seedancePlatformStore.upsertUserRecord({
            uid: verified.uid,
            email: verified.email,
            displayName: verified.name || msg.displayName,
            username: msg.username,
            isAdmin: verified.isAdmin,
          });
          if (record.status === 'SUSPENDED') {
            safeSend(socket, { type: 'auth:error', error: 'Account is suspended.' });
            socket.close(4003, 'Account suspended');
            return;
          }
          clearTimeout(authTimeout);
          connectedClient = {
            socket,
            user: verified,
            username: record.username,
            displayName: record.displayName,
            lastHeartbeat: Date.now(),
            msgTimestamps: [],
          };
          clients.add(connectedClient);
          safeSend(socket, {
            type: 'auth:ok',
            uid: verified.uid,
            username: record.username,
            displayName: record.displayName,
          });
        } catch {
          safeSend(socket, {
            type: 'auth:error',
            error: 'WebSocket authentication failed.',
          });
        }
        return;
      }

      if (!connectedClient) {
        safeSend(socket, { type: 'error', error: 'Authenticate via { type: "auth", token } first.' });
        return;
      }

      // Per-socket sliding-window rate limit (max 60 messages per 10 seconds)
      const now = Date.now();
      connectedClient.msgTimestamps = connectedClient.msgTimestamps.filter((t) => t > now - 10_000);
      if (connectedClient.msgTimestamps.length >= 60) {
        safeSend(socket, { type: 'error', error: 'WebSocket rate limit exceeded. Slow down.' });
        return;
      }
      connectedClient.msgTimestamps.push(now);
      connectedClient.lastHeartbeat = now;

      // ========================================================================
      // 2. LIVESTREAMING SIGNALING & CHAT
      // ========================================================================
      if (msg.type === 'stream:join') {
        const streamId = String(msg.streamId || '');
        const rawStream = seedancePlatformStore.getLivestreamRaw(streamId);
        if (rawStream?.groupId && rawStream.groupVisibility === 'PRIVATE') {
          const group = seedanceCommunityStore.getGroupById(rawStream.groupId);
          if (!group || !seedanceCommunityStore.canReadGroupContent(group, connectedClient.user.uid, connectedClient.user.isAdmin)) {
            safeSend(socket, {
              type: 'stream:error',
              streamId,
              error: 'Private group membership is required to join this livestream.',
            });
            return;
          }
        }
        const authRes = seedancePlatformStore.authorizeStreamAccess(
          streamId,
          {
            uid: connectedClient.user.uid,
            username: connectedClient.username,
            displayName: connectedClient.displayName,
          },
          msg.accessCode
        );
        if (!authRes.ok || !authRes.stream) {
          safeSend(socket, { type: 'stream:error', streamId, error: authRes.error });
          return;
        }

        detachClientFromStream(connectedClient);
        connectedClient.streamId = streamId;
        connectedClient.isBroadcaster =
          Boolean(msg.asBroadcaster) && authRes.stream.hostUserId === connectedClient.user.uid;

        if (connectedClient.isBroadcaster) {
          seedancePlatformStore.setStreamPublisherActive(streamId, true);
        }

        const latestRaw = seedancePlatformStore.getLivestreamRaw(streamId);
        safeSend(socket, {
          type: 'stream:joined',
          stream: authRes.stream,
          messages: seedancePlatformStore.getStreamMessages(streamId),
        });

        broadcastToStream(streamId, {
          type: 'stream:presence',
          streamId,
          viewerCount: latestRaw?.viewerCount || 0,
          viewers: latestRaw?.viewers || [],
          hasPublisherStream: latestRaw?.hasPublisherStream || false,
        });

        // If viewer joined and broadcaster is connected, notify broadcaster to initiate WebRTC offer
        if (!connectedClient.isBroadcaster) {
          sendToUserInStream(streamId, authRes.stream.hostUserId, {
            type: 'stream:viewer-ready',
            streamId,
            viewerUserId: connectedClient.user.uid,
            viewerName: connectedClient.displayName,
          });
        } else {
          // If broadcaster re-connected, prompt all connected viewers to request offers
          broadcastToStream(
            streamId,
            {
              type: 'stream:publisher-state',
              streamId,
              hasPublisherStream: true,
            },
            connectedClient.user.uid
          );
          for (const viewerClient of clients) {
            if (
              viewerClient.streamId === streamId &&
              viewerClient.user.uid !== connectedClient.user.uid
            ) {
              safeSend(connectedClient.socket, {
                type: 'stream:viewer-ready',
                streamId,
                viewerUserId: viewerClient.user.uid,
                viewerName: viewerClient.displayName,
              });
            }
          }
        }
        return;
      }

      if (msg.type === 'stream:leave') {
        detachClientFromStream(connectedClient);
        return;
      }

      if (msg.type === 'stream:publisher-state' && connectedClient.streamId) {
        const stream = seedancePlatformStore.getLivestreamRaw(connectedClient.streamId);
        if (stream && stream.hostUserId === connectedClient.user.uid) {
          const active = Boolean(msg.hasPublisherStream);
          seedancePlatformStore.setStreamPublisherActive(stream.id, active);
          broadcastToStream(stream.id, {
            type: 'stream:publisher-state',
            streamId: stream.id,
            hasPublisherStream: active,
          });
        }
        return;
      }

      if (
        (msg.type === 'stream:webrtc-offer' ||
          msg.type === 'stream:webrtc-answer' ||
          msg.type === 'stream:webrtc-ice') &&
        connectedClient.streamId
      ) {
        const targetUserId = String(msg.targetUserId || '');
        if (targetUserId) {
          sendToUserInStream(connectedClient.streamId, targetUserId, {
            type: msg.type,
            streamId: connectedClient.streamId,
            fromUserId: connectedClient.user.uid,
            sdp: msg.sdp,
            candidate: msg.candidate,
          });
        }
        return;
      }

      if (msg.type === 'stream:chat' && connectedClient.streamId) {
        const stream = seedancePlatformStore.getLivestreamRaw(connectedClient.streamId);
        if (!stream || stream.status !== 'LIVE') return;
        if (stream.bannedUserIds.includes(connectedClient.user.uid)) {
          safeSend(socket, { type: 'stream:error', error: 'Removed from livestream.' });
          return;
        }
        if (stream.mutedUserIds.includes(connectedClient.user.uid)) {
          safeSend(socket, {
            type: 'stream:error',
            error: 'You have been muted in chat by the host.',
          });
          return;
        }
        const text = String(msg.text || '').trim().slice(0, 500);
        if (!text) return;
        const chatMsg = seedancePlatformStore.addStreamMessage(stream.id, {
          userId: connectedClient.user.uid,
          username: connectedClient.username,
          displayName: connectedClient.displayName,
          text,
          isHost: stream.hostUserId === connectedClient.user.uid,
        });
        broadcastToStream(stream.id, {
          type: 'stream:chat',
          streamId: stream.id,
          message: chatMsg,
        });
        return;
      }

      // ========================================================================
      // 3. MULTIPLAYER CALL LIVE ROOMS (WEBRTC MESH SIGNALING)
      // ========================================================================
      if (msg.type === 'room:join') {
        const roomId = String(msg.roomId || '');
        const joinRes = seedancePlatformStore.joinLiveRoom({
          roomId,
          inviteCode: msg.inviteCode,
          user: {
            uid: connectedClient.user.uid,
            username: connectedClient.username,
            displayName: connectedClient.displayName,
          },
        });
        if (!joinRes.ok || !joinRes.room) {
          safeSend(socket, { type: 'room:error', roomId, error: joinRes.error });
          return;
        }

        detachClientFromRoom(connectedClient);
        connectedClient.roomId = roomId;

        safeSend(socket, {
          type: 'room:joined',
          room: joinRes.room,
        });

        broadcastToRoom(
          roomId,
          {
            type: 'room:peer-joined',
            roomId,
            userId: connectedClient.user.uid,
            displayName: connectedClient.displayName,
            participants: joinRes.room.participants,
          },
          connectedClient.user.uid
        );
        return;
      }

      if (msg.type === 'room:leave') {
        detachClientFromRoom(connectedClient);
        return;
      }

      if (msg.type === 'room:media-state' && connectedClient.roomId) {
        const updated = seedancePlatformStore.updateParticipantMediaState(
          connectedClient.roomId,
          connectedClient.user.uid,
          {
            audioEnabled: msg.audioEnabled,
            videoEnabled: msg.videoEnabled,
          }
        );
        if (updated) {
          broadcastToRoom(connectedClient.roomId, {
            type: 'room:participants-sync',
            roomId: connectedClient.roomId,
            participants: updated.participants,
          });
        }
        return;
      }

      if (
        (msg.type === 'room:webrtc-offer' ||
          msg.type === 'room:webrtc-answer' ||
          msg.type === 'room:webrtc-ice') &&
        connectedClient.roomId
      ) {
        const targetUserId = String(msg.targetUserId || '');
        if (targetUserId) {
          sendToUserInRoom(connectedClient.roomId, targetUserId, {
            type: msg.type,
            roomId: connectedClient.roomId,
            fromUserId: connectedClient.user.uid,
            sdp: msg.sdp,
            candidate: msg.candidate,
          });
        }
      }
    });

    socket.on('close', () => {
      clearTimeout(authTimeout);
      if (connectedClient) {
        detachClientFromStream(connectedClient);
        detachClientFromRoom(connectedClient);
        clients.delete(connectedClient);
      }
    });
  });

  return wss;
}
