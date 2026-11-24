/**
 * VAIURE — SEEDANCE LAB WORKSPACE & REALTIME CLIENT SERVICE
 * Covers:
 * 1. Personal AI Creative Agent & Isolated Memory (/api/agent/*)
 * 2. Real DB-backed Livestreams (/api/streams/*)
 * 3. Real DB-backed Multiplayer Call Live Rooms (/api/rooms/*)
 * 4. Admin Platform Governance Controls (/api/admin/platform/*)
 * 5. Persistent WebSocket /ws client for WebRTC signaling, live chat, & presence
 */

import { getAuthHeaders, getFirebaseIdToken } from './authTokenHelper';
import {
  AgentActionMode,
  AgentConversation,
  AgentMemoryItem,
  AgentWorkspaceContext,
  BytePlusApiStock,
  CreativeMemoryCategory,
  CreditLedgerTransaction,
  CreditPackage,
  GenerationCostConfig,
  LiveCallRoom,
  LiveCallRoomVisibility,
  LivestreamChatMessage,
  LivestreamSession,
  LivestreamVisibility,
  MembershipPlan,
  MembershipTier,
  PlatformAdminAuditEntry,
  PlatformFinancialAnalytics,
  PlatformUserRecord,
} from '../types/seedancePlatform';

async function apiJson<T>(url: string, options: RequestInit = {}, authRequired = true): Promise<T> {
  const headers = authRequired
    ? await getAuthHeaders(Boolean(options.body))
    : options.body
    ? { 'Content-Type': 'application/json' }
    : {};

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed with HTTP ${res.status}`);
  }
  return data as T;
}

// ============================================================================
// 1. PERSONAL AI AGENT & CREATIVE MEMORY
// ============================================================================

export const agentWorkspaceService = {
  getMemory: () =>
    apiJson<{ ok: true; memoryEnabled: boolean; items: AgentMemoryItem[] }>('/api/agent/memory'),

  setMemoryEnabled: (memoryEnabled: boolean) =>
    apiJson<{ ok: true; memoryEnabled: boolean }>('/api/agent/settings', {
      method: 'PATCH',
      body: JSON.stringify({ memoryEnabled }),
    }),

  addMemory: (payload: {
    category: CreativeMemoryCategory;
    title: string;
    content: string;
    referenceImageUrls?: string[];
    enabled?: boolean;
  }) =>
    apiJson<{ ok: true; item: AgentMemoryItem }>('/api/agent/memory', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMemory: (
    id: string,
    payload: Partial<Pick<AgentMemoryItem, 'category' | 'title' | 'content' | 'enabled' | 'referenceImageUrls'>>
  ) =>
    apiJson<{ ok: true; item: AgentMemoryItem }>(`/api/agent/memory/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteMemory: (id: string) =>
    apiJson<{ ok: true }>(`/api/agent/memory/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  getConversations: () =>
    apiJson<{ ok: true; conversations: AgentConversation[] }>('/api/agent/conversations'),

  createConversation: (title?: string) =>
    apiJson<{ ok: true; conversation: AgentConversation }>('/api/agent/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),

  deleteConversation: (id: string) =>
    apiJson<{ ok: true }>(`/api/agent/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  chat: (payload: {
    conversationId?: string;
    message: string;
    actionMode?: AgentActionMode;
    workspaceContext?: AgentWorkspaceContext;
    referenceImageDataUrl?: string;
  }) =>
    apiJson<{
      ok: true;
      conversationId: string;
      conversation: AgentConversation;
      reply: string;
      suggestedPrompt?: string;
      suggestedDuration?: number;
      continuityWarnings?: string[];
      memoryCountUsed: number;
      modelUsed: string;
    }>('/api/agent/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

// ============================================================================
// 2. LIVESTREAMING API (/api/streams/*)
// ============================================================================

export const livestreamService = {
  listStreams: (groupId?: string) =>
    apiJson<{ ok: true; streams: LivestreamSession[] }>(
      `/api/streams${groupId ? `?groupId=${encodeURIComponent(groupId)}` : ''}`
    ),

  startStream: (payload: {
    title: string;
    description?: string;
    visibility: LivestreamVisibility;
    accessCode?: string;
    groupId?: string;
    postToGroup?: boolean;
  }) =>
    apiJson<{ ok: true; stream: LivestreamSession }>('/api/streams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  joinStream: (streamId: string, accessCode?: string) =>
    apiJson<{ ok: true; stream: LivestreamSession; messages: LivestreamChatMessage[] }>(
      `/api/streams/${encodeURIComponent(streamId)}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ accessCode }),
      }
    ),

  endStream: (streamId: string) =>
    apiJson<{ ok: true; stream: LivestreamSession }>(
      `/api/streams/${encodeURIComponent(streamId)}/end`,
      { method: 'POST' }
    ),

  moderateViewer: (streamId: string, targetUserId: string, action: 'mute' | 'unmute' | 'ban') =>
    apiJson<{ ok: true; stream: LivestreamSession }>(
      `/api/streams/${encodeURIComponent(streamId)}/moderate`,
      {
        method: 'POST',
        body: JSON.stringify({ targetUserId, action }),
      }
    ),
};

// ============================================================================
// 3. MULTIPLAYER CALL — LIVE ROOMS API (/api/rooms/*)
// ============================================================================

export const liveRoomsService = {
  listRooms: () =>
    apiJson<{ ok: true; rooms: LiveCallRoom[] }>('/api/rooms'),

  createRoom: (payload: {
    name: string;
    description?: string;
    visibility: LiveCallRoomVisibility;
    maxParticipants?: number;
  }) =>
    apiJson<{ ok: true; room: LiveCallRoom }>('/api/rooms', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  joinRoom: (payload: { roomId?: string; inviteCode?: string }) =>
    apiJson<{ ok: true; room: LiveCallRoom }>('/api/rooms/join', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  inviteUser: (roomId: string, target: string) =>
    apiJson<{ ok: true; room: LiveCallRoom }>(`/api/rooms/${encodeURIComponent(roomId)}/invite`, {
      method: 'POST',
      body: JSON.stringify({ target }),
    }),

  moderateRoom: (
    roomId: string,
    action: 'mute_participant' | 'unmute_participant' | 'remove_participant' | 'lock' | 'unlock' | 'close',
    targetUserId?: string
  ) =>
    apiJson<{ ok: true; room: LiveCallRoom }>(
      `/api/rooms/${encodeURIComponent(roomId)}/moderate`,
      {
        method: 'POST',
        body: JSON.stringify({ action, targetUserId }),
      }
    ),
};

// ============================================================================
// 4. PLATFORM ADMINISTRATION GOVERNANCE (/api/admin/platform/*)
// ============================================================================

export const platformAdminService = {
  getOverview: () =>
    apiJson<{ ok: true; analytics: PlatformFinancialAnalytics; stock: BytePlusApiStock }>(
      '/api/admin/platform/overview'
    ),

  getPlans: () =>
    apiJson<{ ok: true; plans: MembershipPlan[] }>('/api/admin/platform/plans'),

  updatePlan: (planIdOrTier: string, updates: Partial<MembershipPlan>) =>
    apiJson<{ ok: true; plan: MembershipPlan }>(
      `/api/admin/platform/plans/${encodeURIComponent(planIdOrTier)}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    ),

  getCostConfig: () =>
    apiJson<{ ok: true; costConfig: GenerationCostConfig }>('/api/admin/platform/cost-config'),

  updateCostConfig: (updates: Partial<GenerationCostConfig>) =>
    apiJson<{ ok: true; costConfig: GenerationCostConfig }>('/api/admin/platform/cost-config', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getPackages: () =>
    apiJson<{ ok: true; packages: CreditPackage[] }>('/api/admin/platform/packages'),

  updatePackages: (packages: CreditPackage[]) =>
    apiJson<{ ok: true; packages: CreditPackage[] }>('/api/admin/platform/packages', {
      method: 'PUT',
      body: JSON.stringify({ packages }),
    }),

  getUsers: () =>
    apiJson<{
      ok: true;
      users: Array<
        PlatformUserRecord & {
          subscription: any;
          wallet: any;
        }
      >;
    }>('/api/admin/platform/users'),

  assignUserPlan: (uid: string, tier: MembershipTier, note?: string) =>
    apiJson<{ ok: true; subscription: any; wallet: any }>(
      `/api/admin/platform/users/${encodeURIComponent(uid)}/assign-plan`,
      {
        method: 'POST',
        body: JSON.stringify({ tier, note }),
      }
    ),

  adjustUserCredits: (uid: string, creditAdjustment: number, reason: string) =>
    apiJson<{ ok: true; wallet: any; transaction: any }>(
      `/api/admin/platform/users/${encodeURIComponent(uid)}/adjust-credits`,
      {
        method: 'POST',
        body: JSON.stringify({ creditAdjustment, reason }),
      }
    ),

  updateUserStatus: (
    uid: string,
    payload: { status?: 'ACTIVE' | 'SUSPENDED'; role?: PlatformUserRecord['role']; reason: string }
  ) =>
    apiJson<{ ok: true; user: PlatformUserRecord }>(
      `/api/admin/platform/users/${encodeURIComponent(uid)}/status`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getTransactions: (userId?: string) =>
    apiJson<{ ok: true; transactions: CreditLedgerTransaction[] }>(
      `/api/admin/platform/transactions${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`
    ),

  getAuditLogs: () =>
    apiJson<{ ok: true; logs: PlatformAdminAuditEntry[] }>('/api/admin/platform/audit-logs'),

  getStreams: () =>
    apiJson<{ ok: true; streams: LivestreamSession[] }>('/api/admin/platform/streams'),

  forceEndStream: (streamId: string, reason?: string) =>
    apiJson<{ ok: true; stream: LivestreamSession }>(
      `/api/admin/platform/streams/${encodeURIComponent(streamId)}/end`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    ),

  getRooms: () =>
    apiJson<{ ok: true; rooms: LiveCallRoom[] }>('/api/admin/platform/rooms'),

  forceCloseRoom: (roomId: string, reason?: string) =>
    apiJson<{ ok: true; room: LiveCallRoom }>(
      `/api/admin/platform/rooms/${encodeURIComponent(roomId)}/close`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    ),
};

// ============================================================================
// 5. PERSISTENT WEBSOCKET SIGNALING CLIENT (/ws)
// ============================================================================

export type RealtimeSocketHandler = (event: any) => void;

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class SeedanceRealtimeSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<RealtimeSocketHandler>();
  private pingTimer: number | null = null;
  private isAuthenticated = false;
  private connectingPromise: Promise<boolean> | null = null;

  subscribe(handler: RealtimeSocketHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  private emit(event: any) {
    this.listeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        // isolate subscriber errors
      }
    });
  }

  async connect(userMeta?: { username?: string; displayName?: string }): Promise<boolean> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.isAuthenticated) {
      return true;
    }
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = (async () => {
      const token = await getFirebaseIdToken();
      if (!token) {
        this.connectingPromise = null;
        return false;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      return new Promise<boolean>((resolve) => {
        const ws = new WebSocket(wsUrl);
        this.ws = ws;
        this.isAuthenticated = false;

        const timeout = window.setTimeout(() => {
          resolve(false);
          this.connectingPromise = null;
        }, 8000);

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'auth',
              token,
              username: userMeta?.username,
              displayName: userMeta?.displayName,
            })
          );
          if (this.pingTimer) window.clearInterval(this.pingTimer);
          this.pingTimer = window.setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25_000);
        };

        ws.onmessage = (evt) => {
          try {
            const parsed = JSON.parse(evt.data);
            if (parsed.type === 'auth:ok') {
              this.isAuthenticated = true;
              window.clearTimeout(timeout);
              this.connectingPromise = null;
              resolve(true);
            } else if (parsed.type === 'auth:error') {
              this.isAuthenticated = false;
              window.clearTimeout(timeout);
              this.connectingPromise = null;
              resolve(false);
            }
            this.emit(parsed);
          } catch {
            // ignore non-json frames
          }
        };

        ws.onerror = () => {
          window.clearTimeout(timeout);
          this.isAuthenticated = false;
          this.connectingPromise = null;
          resolve(false);
        };

        ws.onclose = () => {
          this.isAuthenticated = false;
          if (this.pingTimer) {
            window.clearInterval(this.pingTimer);
            this.pingTimer = null;
          }
          this.emit({ type: 'ws:closed' });
        };
      });
    })();

    return this.connectingPromise;
  }

  send(payload: Record<string, unknown>): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isAuthenticated) {
      return false;
    }
    this.ws.send(JSON.stringify(payload));
    return true;
  }

  disconnect(): void {
    if (this.pingTimer) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.isAuthenticated = false;
    this.connectingPromise = null;
  }
}
