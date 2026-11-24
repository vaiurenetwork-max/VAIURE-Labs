/**
 * VAIURE — SEEDANCE LAB COMMUNITY & GROUPS CLIENT SERVICE
 * Typed client wrapper for /api/community/* and /api/admin/platform/community/*.
 */

import { getAuthHeaders } from './authTokenHelper';
import {
  CommunityCategory,
  CommunityGroup,
  CommunityNotification,
  CommunityPlatformPolicies,
  CommunityReport,
  CommunityReportStatus,
  CommunityReportTargetType,
  CommunityUserProfile,
  GroupAnnouncement,
  GroupEvent,
  GroupEventType,
  GroupInvitation,
  GroupJoinMode,
  GroupJoinRequest,
  GroupMember,
  GroupModerationLog,
  GroupPost,
  GroupPostComment,
  GroupPostReactionType,
  GroupPostStatus,
  GroupPostType,
  GroupRole,
  GroupSettings,
  GroupStatus,
  GroupVisibility,
  LivestreamSession,
  SeedanceWorkflowAttachment,
  VirtualGiftItem,
  VirtualGiftTransaction,
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

export async function uploadCommunityMediaFile(file: File): Promise<{
  ok: true;
  url: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsDataURL(file);
  });

  return apiJson<{ ok: true; url: string; mimeType: string; sizeBytes: number }>(
    '/api/community/upload',
    {
      method: 'POST',
      body: JSON.stringify({ dataUrl, filename: file.name }),
    }
  );
}

export const seedanceCommunityService = {
  getMeta: () =>
    apiJson<{
      ok: true;
      categories: CommunityCategory[];
      policies: CommunityPlatformPolicies;
      giftCatalog: VirtualGiftItem[];
    }>('/api/community/meta', {}, false),

  // Discovery & Group CRUD
  discoverGroups: (params?: {
    search?: string;
    category?: string;
    interest?: string;
    sort?: 'recommended' | 'recent' | 'popular' | 'my_groups';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.category && params.category !== 'all') q.set('category', params.category);
    if (params?.interest) q.set('interest', params.interest);
    if (params?.sort) q.set('sort', params.sort);
    const qs = q.toString();
    return apiJson<{ ok: true; groups: CommunityGroup[] }>(
      `/api/community/groups${qs ? `?${qs}` : ''}`
    );
  },

  createGroup: (payload: {
    name: string;
    description: string;
    category: string;
    interests?: string[];
    coverImageUrl?: string;
    iconImageUrl?: string;
    rulesText?: string;
    visibility: GroupVisibility;
    joinMode?: GroupJoinMode;
    settings?: Partial<GroupSettings>;
  }) =>
    apiJson<{ ok: true; group: CommunityGroup }>('/api/community/groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getGroupDetail: (groupId: string) =>
    apiJson<{ ok: true; group: CommunityGroup; canReadContent: boolean }>(
      `/api/community/groups/${encodeURIComponent(groupId)}`
    ),

  updateGroupSettings: (
    groupId: string,
    updates: {
      name?: string;
      description?: string;
      category?: string;
      interests?: string[];
      coverImageUrl?: string;
      iconImageUrl?: string;
      rulesText?: string;
      visibility?: GroupVisibility;
      status?: GroupStatus;
      settings?: Partial<GroupSettings>;
    }
  ) =>
    apiJson<{ ok: true; group: CommunityGroup }>(
      `/api/community/groups/${encodeURIComponent(groupId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    ),

  deleteGroup: (groupId: string) =>
    apiJson<{ ok: true }>(`/api/community/groups/${encodeURIComponent(groupId)}`, {
      method: 'DELETE',
    }),

  // Membership, Requests, Invitations & RBAC
  joinOrRequestGroup: (groupId: string, message?: string) =>
    apiJson<{ ok: true; joined: boolean; requested: boolean; group: CommunityGroup }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/join`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      }
    ),

  leaveGroup: (groupId: string) =>
    apiJson<{ ok: true; group: CommunityGroup }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/leave`,
      { method: 'POST' }
    ),

  getGroupMembers: (groupId: string) =>
    apiJson<{ ok: true; members: GroupMember[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/members`
    ),

  getGroupJoinRequests: (groupId: string) =>
    apiJson<{ ok: true; requests: GroupJoinRequest[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/requests`
    ),

  reviewJoinRequest: (groupId: string, requestId: string, approve: boolean) =>
    apiJson<{ ok: true; request: GroupJoinRequest }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/requests/${encodeURIComponent(requestId)}/review`,
      {
        method: 'POST',
        body: JSON.stringify({ approve }),
      }
    ),

  manageGroupMember: (
    groupId: string,
    targetUserId: string,
    payload: {
      action: 'SET_ROLE' | 'KICK' | 'BAN' | 'UNBAN' | 'TRANSFER_OWNERSHIP';
      newRole?: GroupRole;
      reason?: string;
    }
  ) =>
    apiJson<{ ok: true; group: CommunityGroup; member?: GroupMember }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(targetUserId)}/manage`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  getGroupModerationLogs: (groupId: string) =>
    apiJson<{ ok: true; logs: GroupModerationLog[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/moderation-logs`
    ),

  getInvitations: () =>
    apiJson<{ ok: true; invitations: GroupInvitation[] }>('/api/community/invitations'),

  sendInvitation: (groupId: string, targetIdentifier: string, message?: string) =>
    apiJson<{ ok: true; invitation: GroupInvitation }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/invite`,
      {
        method: 'POST',
        body: JSON.stringify({ targetIdentifier, message }),
      }
    ),

  respondToInvitation: (invitationId: string, accept: boolean) =>
    apiJson<{ ok: true; invitation: GroupInvitation }>(
      `/api/community/invitations/${encodeURIComponent(invitationId)}/respond`,
      {
        method: 'POST',
        body: JSON.stringify({ accept }),
      }
    ),

  // Feed, Posts, Workflows & Comments
  getCommunityFeed: (params?: { postType?: GroupPostType | 'ALL'; savedOnly?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.postType && params.postType !== 'ALL') q.set('postType', params.postType);
    if (params?.savedOnly) q.set('savedOnly', 'true');
    const qs = q.toString();
    return apiJson<{ ok: true; posts: GroupPost[] }>(`/api/community/feed${qs ? `?${qs}` : ''}`);
  },

  getGroupPosts: (
    groupId: string,
    params?: { postType?: GroupPostType | 'ALL'; status?: GroupPostStatus }
  ) => {
    const q = new URLSearchParams();
    if (params?.postType && params.postType !== 'ALL') q.set('postType', params.postType);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return apiJson<{ ok: true; posts: GroupPost[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/posts${qs ? `?${qs}` : ''}`
    );
  },

  createPost: (
    groupId: string,
    payload: {
      postType: GroupPostType;
      title: string;
      body: string;
      tags?: string[];
      images?: string[];
      videoUrl?: string;
      thumbnailUrl?: string;
      workflow?: SeedanceWorkflowAttachment;
    }
  ) =>
    apiJson<{ ok: true; post: GroupPost }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/posts`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updatePost: (
    postId: string,
    updates: {
      title?: string;
      body?: string;
      tags?: string[];
      isPinned?: boolean;
      commentsDisabled?: boolean;
      status?: GroupPostStatus;
    }
  ) =>
    apiJson<{ ok: true; post: GroupPost }>(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  deletePost: (postId: string) =>
    apiJson<{ ok: true }>(`/api/community/posts/${encodeURIComponent(postId)}`, {
      method: 'DELETE',
    }),

  reactToPost: (postId: string, reaction: GroupPostReactionType) =>
    apiJson<{ ok: true; post: GroupPost }>(
      `/api/community/posts/${encodeURIComponent(postId)}/react`,
      {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      }
    ),

  toggleSavePost: (postId: string) =>
    apiJson<{ ok: true; saved: boolean; savesCount: number }>(
      `/api/community/posts/${encodeURIComponent(postId)}/save`,
      { method: 'POST' }
    ),

  sharePost: (postId: string) =>
    apiJson<{ ok: true; sharesCount: number }>(
      `/api/community/posts/${encodeURIComponent(postId)}/share`,
      { method: 'POST' },
      false
    ),

  importWorkflow: (postId: string) =>
    apiJson<{ ok: true; workflow: SeedanceWorkflowAttachment }>(
      `/api/community/posts/${encodeURIComponent(postId)}/import-workflow`,
      { method: 'POST' }
    ),

  getComments: (postId: string) =>
    apiJson<{ ok: true; comments: GroupPostComment[] }>(
      `/api/community/posts/${encodeURIComponent(postId)}/comments`
    ),

  addComment: (postId: string, content: string, parentCommentId?: string) =>
    apiJson<{ ok: true; comment: GroupPostComment }>(
      `/api/community/posts/${encodeURIComponent(postId)}/comments`,
      {
        method: 'POST',
        body: JSON.stringify({ content, parentCommentId }),
      }
    ),

  deleteComment: (postId: string, commentId: string) =>
    apiJson<{ ok: true }>(
      `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
      { method: 'DELETE' }
    ),

  // Announcements & Events
  getAnnouncements: (groupId: string) =>
    apiJson<{ ok: true; announcements: GroupAnnouncement[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/announcements`
    ),

  createAnnouncement: (
    groupId: string,
    payload: { title: string; content: string; isPinned?: boolean; scheduledAt?: string }
  ) =>
    apiJson<{ ok: true; announcement: GroupAnnouncement }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/announcements`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  deleteAnnouncement: (groupId: string, announcementId: string) =>
    apiJson<{ ok: true }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/announcements/${encodeURIComponent(announcementId)}`,
      { method: 'DELETE' }
    ),

  getEvents: (groupId: string) =>
    apiJson<{ ok: true; events: GroupEvent[] }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/events`
    ),

  createEvent: (
    groupId: string,
    payload: {
      title: string;
      description: string;
      eventType: GroupEventType;
      startsAt: string;
      endsAt?: string;
      locationOrLink?: string;
    }
  ) =>
    apiJson<{ ok: true; event: GroupEvent }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/events`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  toggleEventRsvp: (groupId: string, eventId: string) =>
    apiJson<{ ok: true; event: GroupEvent }>(
      `/api/community/groups/${encodeURIComponent(groupId)}/events/${encodeURIComponent(eventId)}/rsvp`,
      { method: 'POST' }
    ),

  // Virtual Gifts
  getGiftCatalog: () =>
    apiJson<{ ok: true; catalog: VirtualGiftItem[] }>('/api/community/gifts/catalog', {}, false),

  sendVirtualGift: (payload: {
    giftId: string;
    recipientId: string;
    groupId?: string;
    postId?: string;
    livestreamId?: string;
    note?: string;
    idempotencyKey?: string;
  }) =>
    apiJson<{
      ok: true;
      transaction: VirtualGiftTransaction;
      wallet: any;
      deduplicated?: boolean;
    }>('/api/community/gifts/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getGiftHistory: () =>
    apiJson<{
      ok: true;
      sent: VirtualGiftTransaction[];
      received: VirtualGiftTransaction[];
    }>('/api/community/gifts/history'),

  // Notifications, Reports & Creator Profiles
  getNotifications: () =>
    apiJson<{ ok: true; notifications: CommunityNotification[]; unreadCount: number }>(
      '/api/community/notifications'
    ),

  markNotificationsRead: (notificationId?: string) =>
    apiJson<{ ok: true; unreadCount: number }>('/api/community/notifications/read', {
      method: 'POST',
      body: JSON.stringify({ notificationId }),
    }),

  submitReport: (payload: {
    targetType: CommunityReportTargetType;
    targetId: string;
    groupId?: string;
    targetSummary?: string;
    reason: string;
  }) =>
    apiJson<{ ok: true; report: CommunityReport }>('/api/community/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getFollowingFeed: () =>
    apiJson<{ ok: true; followingProfiles: CommunityUserProfile[]; posts: GroupPost[] }>(
      '/api/community/following-feed'
    ),

  getUserProfileView: (userId: string) =>
    apiJson<{
      ok: true;
      profile: CommunityUserProfile;
      joinedGroups: CommunityGroup[];
      posts: GroupPost[];
      workflows: GroupPost[];
      livestreams: LivestreamSession[];
      receivedGiftsCount: number;
      receivedGiftsCredits: number;
      receivedGiftsRecent: VirtualGiftTransaction[];
      isFollowing: boolean;
    }>(`/api/community/profiles/${encodeURIComponent(userId)}`),

  updateMyProfile: (updates: {
    displayName?: string;
    bio?: string;
    interests?: string[];
    avatar?: string;
    privacy?: Partial<CommunityUserProfile['privacy']>;
  }) =>
    apiJson<{ ok: true; profile: CommunityUserProfile }>('/api/community/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),

  toggleFollowCreator: (userId: string) =>
    apiJson<{ ok: true; following: boolean; followersCount: number }>(
      `/api/community/profiles/${encodeURIComponent(userId)}/follow`,
      { method: 'POST' }
    ),

  // Platform Admin Community Governance
  adminListGroups: () =>
    apiJson<{ ok: true; groups: CommunityGroup[] }>('/api/admin/platform/community/groups'),

  adminSetGroupStatus: (groupId: string, status: GroupStatus, reason: string) =>
    apiJson<{ ok: true; group: CommunityGroup }>(
      `/api/admin/platform/community/groups/${encodeURIComponent(groupId)}/status`,
      {
        method: 'POST',
        body: JSON.stringify({ status, reason }),
      }
    ),

  adminDeleteGroup: (groupId: string) =>
    apiJson<{ ok: true }>(
      `/api/admin/platform/community/groups/${encodeURIComponent(groupId)}`,
      { method: 'DELETE' }
    ),

  adminListReports: () =>
    apiJson<{ ok: true; reports: CommunityReport[] }>('/api/admin/platform/community/reports'),

  adminResolveReport: (
    reportId: string,
    payload: {
      status: CommunityReportStatus;
      resolutionNote: string;
      removeTargetContent?: boolean;
    }
  ) =>
    apiJson<{ ok: true; report: CommunityReport }>(
      `/api/admin/platform/community/reports/${encodeURIComponent(reportId)}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  adminGetGifts: () =>
    apiJson<{ ok: true; gifts: VirtualGiftItem[] }>('/api/admin/platform/community/gifts'),

  adminUpsertGift: (gift: Partial<VirtualGiftItem> & { id?: string }) =>
    apiJson<{ ok: true; gifts: VirtualGiftItem[] }>('/api/admin/platform/community/gifts', {
      method: 'POST',
      body: JSON.stringify(gift),
    }),

  adminGetGiftTransactions: () =>
    apiJson<{ ok: true; transactions: VirtualGiftTransaction[] }>(
      '/api/admin/platform/community/gift-transactions'
    ),

  adminGetCategories: () =>
    apiJson<{ ok: true; categories: CommunityCategory[] }>(
      '/api/admin/platform/community/categories'
    ),

  adminUpdateCategories: (categories: CommunityCategory[]) =>
    apiJson<{ ok: true; categories: CommunityCategory[] }>(
      '/api/admin/platform/community/categories',
      {
        method: 'PUT',
        body: JSON.stringify({ categories }),
      }
    ),

  adminGetPolicies: () =>
    apiJson<{ ok: true; policies: CommunityPlatformPolicies }>(
      '/api/admin/platform/community/policies'
    ),

  adminUpdatePolicies: (policies: Partial<CommunityPlatformPolicies>) =>
    apiJson<{ ok: true; policies: CommunityPlatformPolicies }>(
      '/api/admin/platform/community/policies',
      {
        method: 'PUT',
        body: JSON.stringify(policies),
      }
    ),

  adminRestrictUser: (uid: string, restricted: boolean, reason: string) =>
    apiJson<{ ok: true; profile: CommunityUserProfile }>(
      `/api/admin/platform/community/users/${encodeURIComponent(uid)}/restrict`,
      {
        method: 'POST',
        body: JSON.stringify({ restricted, reason }),
      }
    ),
};
