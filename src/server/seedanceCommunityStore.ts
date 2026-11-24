/**
 * VAIURE — SEEDANCE LAB COMMUNITY & GROUPS PERSISTENT STORE
 * Persists atomically to uploads/seedance_community_db.json.
 * Strictly zero fake users, zero fake groups, zero fake posts, zero fake livestreams,
 * and zero fake gift transactions. Only admin-configurable categories, policies, and gift catalog defaults.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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
  SeedanceWorkflowAttachment,
  VirtualGiftCategory,
  VirtualGiftItem,
  VirtualGiftTransaction,
} from '../types/seedancePlatform';
import { seedancePlatformStore } from './seedancePlatformStore';
import { isSafeIdentifier, validatePublicHttpUrl } from './securityMiddleware';

function sanitizeCommunityMediaUrl(rawUrl?: string): string {
  const val = (rawUrl || '').trim().slice(0, 500);
  if (!val) return '';
  if (val.startsWith('/uploads/') && !val.includes('..') && !val.toLowerCase().endsWith('.svg')) {
    return val;
  }
  const check = validatePublicHttpUrl(val);
  return check.valid && check.url ? check.url.toString() : '';
}
import { sendToUserGlobal } from './realtimeHub';

export const DEFAULT_COMMUNITY_CATEGORIES: CommunityCategory[] = [
  {
    id: 'cat-filmmaking',
    name: 'AI Filmmaking',
    description: 'Narrative shorts, directorial studies, and Seedance 2.5 cinema.',
    enabled: true,
    sortOrder: 1,
  },
  {
    id: 'cat-workflows',
    name: 'Workflows & Prompts',
    description: 'Reusable Seedance 2.5 multi-scene workflows, prompts, and reference rigs.',
    enabled: true,
    sortOrder: 2,
  },
  {
    id: 'cat-characters',
    name: 'Character Consistency',
    description: 'Multi-plate character locking, costume continuity, and cast bible design.',
    enabled: true,
    sortOrder: 3,
  },
  {
    id: 'cat-worldbuilding',
    name: 'Worldbuilding & 3D',
    description: 'Architectural environments, spatial set design, and scene pre-visualization.',
    enabled: true,
    sortOrder: 4,
  },
  {
    id: 'cat-camera',
    name: 'Camera & Physics',
    description: 'Complex fluid, cloth, collision, and lens choreography experiments.',
    enabled: true,
    sortOrder: 5,
  },
  {
    id: 'cat-critique',
    name: 'Critique & Live Sessions',
    description: 'Creator workshops, live breakdowns, and collaborative feedback groups.',
    enabled: true,
    sortOrder: 6,
  },
];

export const DEFAULT_VIRTUAL_GIFTS: VirtualGiftItem[] = [
  {
    id: 'gift-spark',
    name: 'Silver Spark',
    description: 'Clean studio appreciation spark for posts and live moments.',
    category: 'BASIC',
    creditPrice: 1,
    iconKey: 'SPARK',
    animationStyle: 'PULSE',
    enabled: true,
    sortOrder: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gift-reel',
    name: '35mm Reel',
    description: 'Classic cinema reel tribute for standout Seedance direction.',
    category: 'BASIC',
    creditPrice: 5,
    iconKey: 'REEL',
    animationStyle: 'PULSE',
    enabled: true,
    sortOrder: 2,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gift-prism',
    name: 'Monolith Prism',
    description: 'Refractive prism salute for exemplary visual craft.',
    category: 'PREMIUM',
    creditPrice: 15,
    iconKey: 'PRISM',
    animationStyle: 'RADIANT',
    enabled: true,
    sortOrder: 3,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gift-flame',
    name: 'Obsidian Flame',
    description: 'Animated burst recognizing breakthrough physics or motion workflows.',
    category: 'SPECIAL_ANIMATED',
    creditPrice: 35,
    iconKey: 'FLAME',
    animationStyle: 'CINEMA_BURST',
    enabled: true,
    sortOrder: 4,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gift-orb',
    name: 'Seedance Orb',
    description: 'Animated orbital pulse for live studio sessions and premieres.',
    category: 'SPECIAL_ANIMATED',
    creditPrice: 75,
    iconKey: 'ORB',
    animationStyle: 'CINEMA_BURST',
    enabled: true,
    sortOrder: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gift-crown',
    name: 'Auteur Crown',
    description: 'Exclusive event honor reserved for premiering directors and challenges.',
    category: 'EXCLUSIVE_EVENT',
    creditPrice: 150,
    iconKey: 'CROWN',
    animationStyle: 'SUPERNOVA',
    enabled: true,
    sortOrder: 6,
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_COMMUNITY_POLICIES: CommunityPlatformPolicies = {
  id: 'default-community-policies',
  requireEmailVerificationToCreateGroup: false,
  maxGroupsPerUser: 25,
  allowPrivateGroups: true,
  allowVirtualGifts: true,
  globalBlockedKeywords: [],
  communityGuidelinesText:
    'Respect fellow Seedance creators, honor private group confidentiality, attribute remixed workflows clearly, and keep live critique constructive.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
};

export function defaultGroupSettings(): GroupSettings {
  return {
    joinMode: 'OPEN',
    discoverableInSearch: true,
    whoCanPost: 'EVERYONE',
    whoCanInvite: 'EVERYONE',
    whoCanComment: 'MEMBERS_ONLY',
    whoCanStartLivestream: 'MODERATORS_AND_ABOVE',
    requirePostApproval: false,
    allowWorkflowSharing: true,
    allowVirtualGifts: true,
    blockedKeywords: [],
  };
}

interface PersistedCommunityDB {
  groups: Record<string, CommunityGroup>;
  memberships: Record<string, Record<string, GroupMember>>; // groupId -> userId -> GroupMember
  joinRequests: Record<string, GroupJoinRequest[]>; // groupId -> GroupJoinRequest[]
  invitations: Record<string, GroupInvitation>; // invitationId -> GroupInvitation
  posts: Record<string, GroupPost>; // postId -> GroupPost
  comments: Record<string, GroupPostComment[]>; // postId -> comments
  savedPostIds: Record<string, string[]>; // userId -> postId[]
  announcements: Record<string, GroupAnnouncement[]>; // groupId -> GroupAnnouncement[]
  events: Record<string, GroupEvent[]>; // groupId -> GroupEvent[]
  moderationLogs: Record<string, GroupModerationLog[]>; // groupId -> GroupModerationLog[]
  giftCatalog: VirtualGiftItem[];
  giftTransactions: VirtualGiftTransaction[];
  notifications: CommunityNotification[];
  reports: CommunityReport[];
  categories: CommunityCategory[];
  policies: CommunityPlatformPolicies;
  profiles: Record<string, CommunityUserProfile>; // userId -> CommunityUserProfile
}

const DB_DIR = path.resolve(process.cwd(), 'uploads');
const COMMUNITY_DB_FILE = path.join(DB_DIR, 'seedance_community_db.json');

function defaultCommunityDb(): PersistedCommunityDB {
  return {
    groups: {},
    memberships: {},
    joinRequests: {},
    invitations: {},
    posts: {},
    comments: {},
    savedPostIds: {},
    announcements: {},
    events: {},
    moderationLogs: {},
    giftCatalog: DEFAULT_VIRTUAL_GIFTS.map((g) => ({ ...g })),
    giftTransactions: [],
    notifications: [],
    reports: [],
    categories: DEFAULT_COMMUNITY_CATEGORIES.map((c) => ({ ...c })),
    policies: { ...DEFAULT_COMMUNITY_POLICIES },
    profiles: {},
  };
}

const ROLE_RANK: Record<GroupRole, number> = {
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_.-]{2,40})/g) || [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase()))).slice(0, 20);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

class SeedanceCommunityStore {
  private db: PersistedCommunityDB;

  constructor() {
    this.db = this.loadFromDisk();
  }

  private loadFromDisk(): PersistedCommunityDB {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(COMMUNITY_DB_FILE)) {
        const fresh = defaultCommunityDb();
        this.saveSync(fresh);
        return fresh;
      }
      const raw = fs.readFileSync(COMMUNITY_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedCommunityDB>;
      const base = defaultCommunityDb();
      return {
        ...base,
        ...parsed,
        groups: parsed.groups || {},
        memberships: parsed.memberships || {},
        joinRequests: parsed.joinRequests || {},
        invitations: parsed.invitations || {},
        posts: parsed.posts || {},
        comments: parsed.comments || {},
        savedPostIds: parsed.savedPostIds || {},
        announcements: parsed.announcements || {},
        events: parsed.events || {},
        moderationLogs: parsed.moderationLogs || {},
        giftCatalog:
          Array.isArray(parsed.giftCatalog) && parsed.giftCatalog.length > 0
            ? parsed.giftCatalog
            : base.giftCatalog,
        giftTransactions: Array.isArray(parsed.giftTransactions) ? parsed.giftTransactions : [],
        notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        categories:
          Array.isArray(parsed.categories) && parsed.categories.length > 0
            ? parsed.categories
            : base.categories,
        policies: parsed.policies ? { ...base.policies, ...parsed.policies } : base.policies,
        profiles: parsed.profiles || {},
      };
    } catch {
      return defaultCommunityDb();
    }
  }

  private saveSync(target: PersistedCommunityDB = this.db): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmp = `${COMMUNITY_DB_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(target, null, 2), 'utf-8');
      fs.renameSync(tmp, COMMUNITY_DB_FILE);
    } catch (err) {
      console.error('SeedanceCommunityStore persistence warning:', err);
    }
  }

  persist(): void {
    this.saveSync(this.db);
  }

  // ============================================================================
  // USER PROFILES & FOLLOWING
  // ============================================================================

  ensureProfile(user: {
    uid: string;
    username: string;
    displayName: string;
    avatar?: string;
  }): CommunityUserProfile {
    const existing = this.db.profiles[user.uid];
    const now = new Date().toISOString();
    if (!existing) {
      const created: CommunityUserProfile = {
        userId: user.uid,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar || '',
        bio: '',
        interests: [],
        followerIds: [],
        followingIds: [],
        privacy: {
          showJoinedGroups: true,
          showReceivedGifts: true,
          showPosts: true,
        },
        createdAt: now,
        updatedAt: now,
      };
      this.db.profiles[user.uid] = created;
      this.persist();
      return created;
    }
    let changed = false;
    if (user.displayName && existing.displayName !== user.displayName) {
      existing.displayName = user.displayName;
      changed = true;
    }
    if (user.username && existing.username !== user.username) {
      existing.username = user.username;
      changed = true;
    }
    if (user.avatar && !existing.avatar) {
      existing.avatar = user.avatar;
      changed = true;
    }
    if (changed) {
      existing.updatedAt = now;
      this.persist();
    }
    return existing;
  }

  updateUserProfile(
    userId: string,
    updates: {
      displayName?: string;
      bio?: string;
      interests?: string[];
      avatar?: string;
      privacy?: Partial<CommunityUserProfile['privacy']>;
    }
  ): CommunityUserProfile {
    const record = seedancePlatformStore.getUserRecord(userId);
    const profile = this.ensureProfile({
      uid: userId,
      username: record?.username || `user_${userId.slice(0, 6)}`,
      displayName: record?.displayName || 'Creator',
    });

    if (typeof updates.displayName === 'string' && updates.displayName.trim()) {
      profile.displayName = updates.displayName.trim().slice(0, 100);
    }
    if (typeof updates.bio === 'string') {
      profile.bio = updates.bio.trim().slice(0, 600);
    }
    if (Array.isArray(updates.interests)) {
      profile.interests = updates.interests
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 16);
    }
    if (typeof updates.avatar === 'string') {
      profile.avatar = updates.avatar.trim().slice(0, 500);
    }
    if (updates.privacy) {
      profile.privacy = {
        ...profile.privacy,
        ...updates.privacy,
      };
    }
    profile.updatedAt = new Date().toISOString();
    this.db.profiles[userId] = profile;
    this.persist();
    return profile;
  }

  toggleFollowCreator(
    followerUid: string,
    targetUid: string
  ): { following: boolean; followersCount: number } {
    if (followerUid === targetUid) {
      throw new Error('You cannot follow your own profile.');
    }
    const targetRecord = seedancePlatformStore.getUserRecord(targetUid);
    const followerRecord = seedancePlatformStore.getUserRecord(followerUid);
    const targetProfile = this.ensureProfile({
      uid: targetUid,
      username: targetRecord?.username || targetUid.slice(0, 8),
      displayName: targetRecord?.displayName || 'Creator',
    });
    const followerProfile = this.ensureProfile({
      uid: followerUid,
      username: followerRecord?.username || followerUid.slice(0, 8),
      displayName: followerRecord?.displayName || 'Creator',
    });

    const isFollowing = followerProfile.followingIds.includes(targetUid);
    if (isFollowing) {
      followerProfile.followingIds = followerProfile.followingIds.filter((id) => id !== targetUid);
      targetProfile.followerIds = targetProfile.followerIds.filter((id) => id !== followerUid);
    } else {
      followerProfile.followingIds.push(targetUid);
      if (!targetProfile.followerIds.includes(followerUid)) {
        targetProfile.followerIds.push(followerUid);
      }
    }
    const now = new Date().toISOString();
    followerProfile.updatedAt = now;
    targetProfile.updatedAt = now;
    this.persist();

    return {
      following: !isFollowing,
      followersCount: targetProfile.followerIds.length,
    };
  }

  getFollowingFeedSummary(viewerUid: string): {
    followingProfiles: CommunityUserProfile[];
    posts: GroupPost[];
  } {
    const profile = this.db.profiles[viewerUid];
    const followingIds = profile?.followingIds || [];
    const followingProfiles = followingIds
      .map((id) => this.db.profiles[id])
      .filter((p): p is CommunityUserProfile => Boolean(p));

    const posts = Object.values(this.db.posts)
      .filter((p) => p.status === 'PUBLISHED' && followingIds.includes(p.authorId))
      .filter((p) => {
        const g = this.db.groups[p.groupId];
        if (!g || g.status !== 'ACTIVE') return false;
        if (g.visibility === 'PUBLIC') return true;
        return this.isActiveMember(g.id, viewerUid);
      })
      .map((p) => this.decoratePostForViewer(p, viewerUid))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { followingProfiles, posts };
  }

  getPublicUserProfileView(
    targetUserId: string,
    viewerUid?: string,
    isPlatformAdmin = false
  ): {
    profile: CommunityUserProfile;
    joinedGroups: CommunityGroup[];
    posts: GroupPost[];
    workflows: GroupPost[];
    livestreams: any[];
    receivedGiftsCount: number;
    receivedGiftsCredits: number;
    receivedGiftsRecent: VirtualGiftTransaction[];
    isFollowing: boolean;
  } {
    const userRec = seedancePlatformStore.getUserRecord(targetUserId);
    const profile =
      this.db.profiles[targetUserId] ||
      this.ensureProfile({
        uid: targetUserId,
        username: userRec?.username || targetUserId.slice(0, 8),
        displayName: userRec?.displayName || 'Creator',
      });

    const isSelfOrAdmin = viewerUid === targetUserId || isPlatformAdmin;

    const showGroups = isSelfOrAdmin || profile.privacy.showJoinedGroups;
    const joinedGroups = showGroups
      ? Object.values(this.db.groups)
          .filter((g) => g.status === 'ACTIVE' && this.isActiveMember(g.id, targetUserId))
          .filter((g) => {
            if (g.visibility === 'PUBLIC') return true;
            if (isSelfOrAdmin) return true;
            return viewerUid ? this.isActiveMember(g.id, viewerUid) : false;
          })
          .map((g) => this.decorateGroupForViewer(g, viewerUid))
      : [];

    const showPosts = isSelfOrAdmin || profile.privacy.showPosts;
    const visiblePosts = showPosts
      ? Object.values(this.db.posts)
          .filter((p) => p.authorId === targetUserId && p.status === 'PUBLISHED')
          .filter((p) => {
            const g = this.db.groups[p.groupId];
            if (!g || g.status !== 'ACTIVE') return false;
            if (g.visibility === 'PUBLIC') return true;
            if (isPlatformAdmin) return true;
            return viewerUid ? this.isActiveMember(g.id, viewerUid) : false;
          })
          .map((p) => this.decoratePostForViewer(p, viewerUid))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : [];

    const workflows = visiblePosts.filter((p) => p.postType === 'WORKFLOW');

    const livestreams = seedancePlatformStore
      .getLivestreams(viewerUid, true)
      .filter((s) => s.hostUserId === targetUserId);

    const showGifts = isSelfOrAdmin || profile.privacy.showReceivedGifts;
    const received = showGifts
      ? this.db.giftTransactions.filter((t) => t.recipientId === targetUserId)
      : [];

    const viewerProfile = viewerUid ? this.db.profiles[viewerUid] : undefined;

    return {
      profile,
      joinedGroups,
      posts: visiblePosts,
      workflows,
      livestreams,
      receivedGiftsCount: received.length,
      receivedGiftsCredits: received.reduce((acc, g) => acc + g.creditCost, 0),
      receivedGiftsRecent: received.slice(0, 20),
      isFollowing: Boolean(viewerProfile?.followingIds.includes(targetUserId)),
    };
  }

  // ============================================================================
  // HELPERS: GROUP MEMBERSHIP, PERMISSIONS & MODERATION LOGGING
  // ============================================================================

  getMembership(groupId: string, userId?: string): GroupMember | undefined {
    if (!userId) return undefined;
    return this.db.memberships[groupId]?.[userId];
  }

  isActiveMember(groupId: string, userId?: string): boolean {
    const m = this.getMembership(groupId, userId);
    return Boolean(m && m.status === 'ACTIVE');
  }

  getActiveMemberIds(groupId: string): string[] {
    const map = this.db.memberships[groupId] || {};
    return Object.values(map)
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => m.userId);
  }

  hasGroupPermission(
    group: CommunityGroup,
    userId: string,
    requiredLevel: 'EVERYONE' | 'MODERATORS_AND_ABOVE' | 'ADMINS_AND_ABOVE' | 'OWNER'
  ): boolean {
    const member = this.getMembership(group.id, userId);
    if (!member || member.status !== 'ACTIVE') return false;
    if (requiredLevel === 'EVERYONE') return true;
    if (requiredLevel === 'MODERATORS_AND_ABOVE') {
      return ROLE_RANK[member.role] >= ROLE_RANK.MODERATOR;
    }
    if (requiredLevel === 'ADMINS_AND_ABOVE') {
      return ROLE_RANK[member.role] >= ROLE_RANK.ADMIN;
    }
    return member.role === 'OWNER';
  }

  canReadGroupContent(
    group: CommunityGroup,
    viewerUid?: string,
    isPlatformAdmin = false
  ): boolean {
    if (isPlatformAdmin) return true;
    if (group.status === 'SUSPENDED') {
      return Boolean(viewerUid && group.ownerId === viewerUid);
    }
    if (group.visibility === 'PUBLIC') return true;
    if (!viewerUid) return false;
    return this.isActiveMember(group.id, viewerUid);
  }

  private assertNotCommunityRestricted(userId: string): void {
    const profile = this.db.profiles[userId];
    if (profile?.restrictedFromCommunity) {
      throw new Error(
        `Your account is currently restricted from community participation${
          profile.restrictionReason ? `: ${profile.restrictionReason}` : '.'
        }`
      );
    }
  }

  private assertKeywordsClean(group: CommunityGroup, texts: Array<string | undefined>): void {
    const combined = texts
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const keywords = [
      ...(this.db.policies.globalBlockedKeywords || []),
      ...(group.settings.blockedKeywords || []),
    ]
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    for (const kw of keywords) {
      if (combined.includes(kw)) {
        throw new Error(
          `Content contains a restricted keyword ("${kw}") blocked by group or community policy.`
        );
      }
    }
  }

  private logGroupModeration(params: {
    groupId: string;
    actorId: string;
    actorUsername: string;
    action: string;
    targetType: GroupModerationLog['targetType'];
    targetId: string;
    reason?: string;
  }): void {
    const entry: GroupModerationLog = {
      id: `gmod-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      ...params,
      createdAt: new Date().toISOString(),
    };
    const list = this.db.moderationLogs[params.groupId] || [];
    list.unshift(entry);
    this.db.moderationLogs[params.groupId] = list.slice(0, 500);
  }

  pushNotification(params: {
    recipientId: string;
    actorId?: string;
    actorUsername?: string;
    actorDisplayName?: string;
    type: CommunityNotification['type'];
    title: string;
    body: string;
    deepLink: CommunityNotification['deepLink'];
  }): CommunityNotification | null {
    if (params.actorId && params.actorId === params.recipientId) {
      return null;
    }
    const notif: CommunityNotification = {
      id: `cnot-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      ...params,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.unshift(notif);
    this.db.notifications = this.db.notifications.slice(0, 5000);
    this.persist();

    // Real-time push if user is connected on /ws
    sendToUserGlobal(params.recipientId, {
      type: 'user:notification',
      notification: notif,
    });
    return notif;
  }

  private decorateGroupForViewer(group: CommunityGroup, viewerUid?: string): CommunityGroup {
    const member = viewerUid ? this.getMembership(group.id, viewerUid) : undefined;
    const pendingReq = viewerUid
      ? (this.db.joinRequests[group.id] || []).find(
          (r) => r.userId === viewerUid && r.status === 'PENDING'
        ) || null
      : null;

    return {
      ...group,
      viewerMembership: member
        ? {
            role: member.role,
            status: member.status,
            joinedAt: member.joinedAt,
          }
        : null,
      viewerPendingRequest: pendingReq,
    };
  }

  private decoratePostForViewer(post: GroupPost, viewerUid?: string): GroupPost {
    const savedList = viewerUid ? this.db.savedPostIds[viewerUid] || [] : [];
    return {
      ...post,
      viewerReaction: viewerUid ? post.reactions[viewerUid] || null : null,
      viewerSaved: savedList.includes(post.id),
    };
  }

  // ============================================================================
  // CATEGORIES, DISCOVERY & GROUP CRUD
  // ============================================================================

  getCategories(includeDisabled = false): CommunityCategory[] {
    return this.db.categories
      .filter((c) => (includeDisabled ? true : c.enabled))
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  getPolicies(): CommunityPlatformPolicies {
    return { ...this.db.policies };
  }

  discoverGroups(params: {
    viewerUid?: string;
    isPlatformAdmin?: boolean;
    search?: string;
    category?: string;
    interest?: string;
    sort?: 'recommended' | 'recent' | 'popular' | 'my_groups';
  }): CommunityGroup[] {
    const q = (params.search || '').trim().toLowerCase();
    const cat = (params.category || '').trim().toLowerCase();
    const interest = (params.interest || '').trim().toLowerCase();
    const viewerUid = params.viewerUid;

    let list = Object.values(this.db.groups).filter((g) => {
      if (g.status === 'SUSPENDED') {
        return Boolean(params.isPlatformAdmin || (viewerUid && g.ownerId === viewerUid));
      }
      if (g.status === 'ARCHIVED') {
        return Boolean(params.isPlatformAdmin || (viewerUid && this.isActiveMember(g.id, viewerUid)));
      }
      const isMember = Boolean(viewerUid && this.isActiveMember(g.id, viewerUid));
      if (params.sort === 'my_groups') {
        return isMember;
      }
      if (g.visibility === 'PRIVATE') {
        // Private groups appear in discovery if discoverableInSearch or user is a member; internal content stays gated.
        return isMember || g.settings.discoverableInSearch || Boolean(params.isPlatformAdmin);
      }
      return true;
    });

    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.interests.some((i) => i.toLowerCase().includes(q))
      );
    }

    if (cat && cat !== 'all') {
      list = list.filter((g) => g.category.toLowerCase() === cat);
    }

    if (interest) {
      list = list.filter((g) =>
        g.interests.some((i) => i.toLowerCase().includes(interest))
      );
    }

    const viewerInterests = viewerUid
      ? (this.db.profiles[viewerUid]?.interests || []).map((x) => x.toLowerCase())
      : [];

    if (params.sort === 'popular') {
      list.sort(
        (a, b) =>
          b.engagementScore + b.memberCount * 3 - (a.engagementScore + a.memberCount * 3)
      );
    } else if (params.sort === 'recent') {
      list.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );
    } else if (params.sort === 'recommended') {
      list.sort((a, b) => {
        const aMatch = a.interests.filter((i) => viewerInterests.includes(i.toLowerCase())).length;
        const bMatch = b.interests.filter((i) => viewerInterests.includes(i.toLowerCase())).length;
        const aScore = aMatch * 25 + a.engagementScore + a.memberCount * 2;
        const bScore = bMatch * 25 + b.engagementScore + b.memberCount * 2;
        return bScore - aScore;
      });
    } else {
      list.sort(
        (a, b) =>
          new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
      );
    }

    return list.map((g) => this.decorateGroupForViewer(g, viewerUid));
  }

  createGroup(params: {
    creator: { uid: string; username: string; displayName: string; avatar?: string; emailVerified?: boolean };
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
  }): CommunityGroup {
    this.assertNotCommunityRestricted(params.creator.uid);
    if (this.db.policies.requireEmailVerificationToCreateGroup && !params.creator.emailVerified) {
      throw new Error('Verified email is required to create a community group.');
    }

    const ownedCount = Object.values(this.db.groups).filter(
      (g) => g.ownerId === params.creator.uid && g.status !== 'ARCHIVED'
    ).length;
    if (ownedCount >= this.db.policies.maxGroupsPerUser) {
      throw new Error(
        `Maximum active groups limit reached (${this.db.policies.maxGroupsPerUser} per creator).`
      );
    }

    const visibility: GroupVisibility =
      params.visibility === 'PRIVATE' && this.db.policies.allowPrivateGroups
        ? 'PRIVATE'
        : 'PUBLIC';

    const name = params.name.trim().slice(0, 100);
    if (name.length < 2) {
      throw new Error('Group name must be at least 2 characters.');
    }

    const now = new Date().toISOString();
    const id = `grp-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const baseSettings = defaultGroupSettings();
    const mergedSettings: GroupSettings = {
      ...baseSettings,
      ...(params.settings || {}),
      joinMode:
        params.joinMode ||
        params.settings?.joinMode ||
        (visibility === 'PRIVATE' ? 'APPROVAL_REQUIRED' : 'OPEN'),
      blockedKeywords: Array.isArray(params.settings?.blockedKeywords)
        ? params.settings!.blockedKeywords.slice(0, 50)
        : [],
    };

    const group: CommunityGroup = {
      id,
      name,
      slug: `${slugify(name) || 'group'}-${id.slice(-4)}`,
      description: params.description.trim().slice(0, 1000),
      category: params.category.trim().slice(0, 80) || 'AI Filmmaking',
      interests: Array.isArray(params.interests)
        ? params.interests.map((x) => x.trim()).filter(Boolean).slice(0, 12)
        : [],
      coverImageUrl: sanitizeCommunityMediaUrl(params.coverImageUrl),
      iconImageUrl: sanitizeCommunityMediaUrl(params.iconImageUrl),
      rulesText: (params.rulesText || '').trim().slice(0, 4000),
      visibility,
      status: 'ACTIVE',
      ownerId: params.creator.uid,
      ownerUsername: params.creator.username,
      ownerDisplayName: params.creator.displayName,
      memberCount: 1,
      postCount: 0,
      engagementScore: 1,
      settings: mergedSettings,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
    };

    this.db.groups[id] = group;
    this.db.memberships[id] = {
      [params.creator.uid]: {
        groupId: id,
        userId: params.creator.uid,
        username: params.creator.username,
        displayName: params.creator.displayName,
        avatar: params.creator.avatar || '',
        role: 'OWNER',
        status: 'ACTIVE',
        joinedAt: now,
        updatedAt: now,
      },
    };
    this.db.joinRequests[id] = [];
    this.db.announcements[id] = [];
    this.db.events[id] = [];
    this.db.moderationLogs[id] = [];

    this.logGroupModeration({
      groupId: id,
      actorId: params.creator.uid,
      actorUsername: params.creator.username,
      action: 'GROUP_CREATED',
      targetType: 'GROUP',
      targetId: id,
      reason: `Created ${visibility} group "${name}"`,
    });

    this.ensureProfile(params.creator);
    this.persist();
    return this.decorateGroupForViewer(group, params.creator.uid);
  }

  getGroupById(groupId: string): CommunityGroup | undefined {
    return this.db.groups[groupId];
  }

  updateGroupSettings(params: {
    groupId: string;
    actorUid: string;
    actorUsername: string;
    isPlatformAdmin?: boolean;
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
    };
  }): CommunityGroup {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');

    const canAdmin =
      params.isPlatformAdmin ||
      this.hasGroupPermission(group, params.actorUid, 'ADMINS_AND_ABOVE');
    if (!canAdmin) {
      throw new Error('Group owner or administrator privileges required to modify settings.');
    }

    const prevVisibility = group.visibility;
    const now = new Date().toISOString();

    if (typeof params.updates.name === 'string' && params.updates.name.trim().length >= 2) {
      group.name = params.updates.name.trim().slice(0, 100);
    }
    if (typeof params.updates.description === 'string') {
      group.description = params.updates.description.trim().slice(0, 1000);
    }
    if (typeof params.updates.category === 'string' && params.updates.category.trim()) {
      group.category = params.updates.category.trim().slice(0, 80);
    }
    if (Array.isArray(params.updates.interests)) {
      group.interests = params.updates.interests.map((x) => x.trim()).filter(Boolean).slice(0, 12);
    }
    if (typeof params.updates.coverImageUrl === 'string') {
      group.coverImageUrl = sanitizeCommunityMediaUrl(params.updates.coverImageUrl);
    }
    if (typeof params.updates.iconImageUrl === 'string') {
      group.iconImageUrl = sanitizeCommunityMediaUrl(params.updates.iconImageUrl);
    }
    if (typeof params.updates.rulesText === 'string') {
      group.rulesText = params.updates.rulesText.trim().slice(0, 4000);
    }

    if (
      params.updates.visibility &&
      (params.updates.visibility === 'PUBLIC' || params.updates.visibility === 'PRIVATE')
    ) {
      if (params.updates.visibility === 'PRIVATE' && !this.db.policies.allowPrivateGroups) {
        throw new Error('Private groups are currently disabled by platform policy.');
      }
      group.visibility = params.updates.visibility;
    }

    if (params.updates.status && (params.updates.status === 'ACTIVE' || params.updates.status === 'ARCHIVED')) {
      const isOwnerOrPlat =
        params.isPlatformAdmin || this.hasGroupPermission(group, params.actorUid, 'OWNER');
      if (!isOwnerOrPlat) {
        throw new Error('Only the Group Owner can archive or reopen the group.');
      }
      group.status = params.updates.status;
    }

    if (params.updates.settings) {
      group.settings = {
        ...group.settings,
        ...params.updates.settings,
        blockedKeywords: Array.isArray(params.updates.settings.blockedKeywords)
          ? params.updates.settings.blockedKeywords.map((k) => k.trim()).filter(Boolean).slice(0, 50)
          : group.settings.blockedKeywords,
      };
    }

    // Dynamic Public <-> Private Cascade Enforcement
    if (group.visibility !== prevVisibility) {
      for (const post of Object.values(this.db.posts)) {
        if (post.groupId === group.id) {
          post.groupVisibility = group.visibility;
        }
      }
      const activeMemberIds = this.getActiveMemberIds(group.id);
      seedancePlatformStore.syncGroupLivestreamsPrivacy(
        group.id,
        group.visibility,
        activeMemberIds
      );
      if (group.visibility === 'PRIVATE' && group.settings.joinMode === 'OPEN') {
        group.settings.joinMode = 'APPROVAL_REQUIRED';
      }
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: `VISIBILITY_CHANGED_${prevVisibility}_TO_${group.visibility}`,
        targetType: 'SETTINGS',
        targetId: group.id,
        reason: `Group visibility switched from ${prevVisibility} to ${group.visibility}. Existing posts and livestreams updated immediately.`,
      });
    } else {
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'GROUP_SETTINGS_UPDATED',
        targetType: 'SETTINGS',
        targetId: group.id,
      });
    }

    group.updatedAt = now;
    this.persist();
    return this.decorateGroupForViewer(group, params.actorUid);
  }

  deleteGroup(params: {
    groupId: string;
    actorUid: string;
    isPlatformAdmin?: boolean;
  }): void {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    const isOwner = group.ownerId === params.actorUid;
    if (!isOwner && !params.isPlatformAdmin) {
      throw new Error('Only the Group Owner or a platform administrator can delete this group.');
    }

    // Clean up posts, comments, memberships, requests, invitations, announcements, events
    for (const [postId, post] of Object.entries(this.db.posts)) {
      if (post.groupId === params.groupId) {
        delete this.db.posts[postId];
        delete this.db.comments[postId];
      }
    }
    for (const [invId, inv] of Object.entries(this.db.invitations)) {
      if (inv.groupId === params.groupId) {
        delete this.db.invitations[invId];
      }
    }
    delete this.db.memberships[params.groupId];
    delete this.db.joinRequests[params.groupId];
    delete this.db.announcements[params.groupId];
    delete this.db.events[params.groupId];
    delete this.db.moderationLogs[params.groupId];
    delete this.db.groups[params.groupId];
    this.persist();
  }

  // ============================================================================
  // JOINING, LEAVE, REQUESTS & INVITATIONS
  // ============================================================================

  joinOrRequestGroup(params: {
    groupId: string;
    user: { uid: string; username: string; displayName: string; avatar?: string };
    message?: string;
  }): { joined: boolean; requested: boolean; group: CommunityGroup } {
    this.assertNotCommunityRestricted(params.user.uid);
    const group = this.db.groups[params.groupId];
    if (!group || group.status !== 'ACTIVE') {
      throw new Error('Group does not exist or is no longer active.');
    }

    const existingMember = this.getMembership(group.id, params.user.uid);
    if (existingMember?.status === 'BANNED') {
      throw new Error(
        `You are banned from this group${
          existingMember.banReason ? `: ${existingMember.banReason}` : '.'
        }`
      );
    }
    if (existingMember?.status === 'ACTIVE') {
      return {
        joined: true,
        requested: false,
        group: this.decorateGroupForViewer(group, params.user.uid),
      };
    }

    if (group.settings.joinMode === 'INVITE_ONLY') {
      const pendingInvite = Object.values(this.db.invitations).find(
        (i) =>
          i.groupId === group.id &&
          i.inviteeId === params.user.uid &&
          i.status === 'PENDING'
      );
      if (!pendingInvite) {
        throw new Error('This group is invite-only. You need an invitation from a member or admin.');
      }
      this.respondToInvitation({
        invitationId: pendingInvite.id,
        userId: params.user.uid,
        username: params.user.username,
        displayName: params.user.displayName,
        avatar: params.user.avatar,
        accept: true,
      });
      return {
        joined: true,
        requested: false,
        group: this.decorateGroupForViewer(group, params.user.uid),
      };
    }

    const needsApproval =
      group.visibility === 'PRIVATE' || group.settings.joinMode === 'APPROVAL_REQUIRED';

    const now = new Date().toISOString();

    if (needsApproval) {
      const list = this.db.joinRequests[group.id] || [];
      const existingReq = list.find(
        (r) => r.userId === params.user.uid && r.status === 'PENDING'
      );
      if (!existingReq) {
        const req: GroupJoinRequest = {
          id: `greq-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
          groupId: group.id,
          groupName: group.name,
          userId: params.user.uid,
          username: params.user.username,
          displayName: params.user.displayName,
          avatar: params.user.avatar || '',
          message: (params.message || '').trim().slice(0, 500),
          status: 'PENDING',
          createdAt: now,
          updatedAt: now,
        };
        list.unshift(req);
        this.db.joinRequests[group.id] = list;
        this.persist();

        // Notify group staff
        const staffMembers = Object.values(this.db.memberships[group.id] || {}).filter(
          (m) => m.status === 'ACTIVE' && ROLE_RANK[m.role] >= ROLE_RANK.MODERATOR
        );
        for (const s of staffMembers.slice(0, 5)) {
          this.pushNotification({
            recipientId: s.userId,
            actorId: params.user.uid,
            actorUsername: params.user.username,
            actorDisplayName: params.user.displayName,
            type: 'JOIN_APPROVED', // informational staff alert
            title: `Join request for ${group.name}`,
            body: `@${params.user.username} requested to join "${group.name}".`,
            deepLink: { section: 'group', groupId: group.id },
          });
        }
      }
      return {
        joined: false,
        requested: true,
        group: this.decorateGroupForViewer(group, params.user.uid),
      };
    }

    // Immediate open join for public OPEN groups
    if (!this.db.memberships[group.id]) this.db.memberships[group.id] = {};
    this.db.memberships[group.id][params.user.uid] = {
      groupId: group.id,
      userId: params.user.uid,
      username: params.user.username,
      displayName: params.user.displayName,
      avatar: params.user.avatar || '',
      role: 'MEMBER',
      status: 'ACTIVE',
      joinedAt: now,
      updatedAt: now,
    };
    group.memberCount = this.getActiveMemberIds(group.id).length;
    group.lastActivityAt = now;
    this.ensureProfile(params.user);
    this.persist();

    return {
      joined: true,
      requested: false,
      group: this.decorateGroupForViewer(group, params.user.uid),
    };
  }

  leaveGroup(groupId: string, userId: string): CommunityGroup {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    const member = this.getMembership(groupId, userId);
    if (!member || member.status !== 'ACTIVE') {
      throw new Error('You are not an active member of this group.');
    }
    if (member.role === 'OWNER') {
      throw new Error(
        'As Group Owner, transfer ownership to another member before leaving or delete the group.'
      );
    }

    delete this.db.memberships[groupId][userId];
    group.memberCount = this.getActiveMemberIds(groupId).length;
    group.updatedAt = new Date().toISOString();
    this.persist();
    return this.decorateGroupForViewer(group, userId);
  }

  getGroupMembers(
    groupId: string,
    viewerUid?: string,
    isPlatformAdmin = false
  ): GroupMember[] {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    if (!this.canReadGroupContent(group, viewerUid, isPlatformAdmin)) {
      throw new Error('Private group members list is visible only to approved members.');
    }
    const isStaff =
      isPlatformAdmin ||
      (viewerUid ? this.hasGroupPermission(group, viewerUid, 'MODERATORS_AND_ABOVE') : false);

    return Object.values(this.db.memberships[groupId] || {})
      .filter((m) => (isStaff ? true : m.status === 'ACTIVE'))
      .sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role]);
  }

  getGroupJoinRequests(
    groupId: string,
    actorUid: string,
    isPlatformAdmin = false
  ): GroupJoinRequest[] {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !isPlatformAdmin &&
      !this.hasGroupPermission(group, actorUid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Group moderator or admin access required to view join requests.');
    }
    return (this.db.joinRequests[groupId] || []).filter((r) => r.status === 'PENDING');
  }

  reviewJoinRequest(params: {
    groupId: string;
    requestId: string;
    actorUid: string;
    actorUsername: string;
    approve: boolean;
    isPlatformAdmin?: boolean;
  }): GroupJoinRequest {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !params.isPlatformAdmin &&
      !this.hasGroupPermission(group, params.actorUid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Moderator or Admin permissions required to review join requests.');
    }
    const reqList = this.db.joinRequests[group.id] || [];
    const req = reqList.find((r) => r.id === params.requestId);
    if (!req) throw new Error('Join request not found.');

    const now = new Date().toISOString();
    req.status = params.approve ? 'APPROVED' : 'REJECTED';
    req.reviewedBy = params.actorUid;
    req.updatedAt = now;

    if (params.approve) {
      if (!this.db.memberships[group.id]) this.db.memberships[group.id] = {};
      this.db.memberships[group.id][req.userId] = {
        groupId: group.id,
        userId: req.userId,
        username: req.username,
        displayName: req.displayName,
        avatar: req.avatar,
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: now,
        updatedAt: now,
      };
      group.memberCount = this.getActiveMemberIds(group.id).length;
      group.lastActivityAt = now;

      if (group.visibility === 'PRIVATE') {
        seedancePlatformStore.syncGroupLivestreamsPrivacy(
          group.id,
          'PRIVATE',
          this.getActiveMemberIds(group.id)
        );
      }
    }

    this.logGroupModeration({
      groupId: group.id,
      actorId: params.actorUid,
      actorUsername: params.actorUsername,
      action: params.approve ? 'JOIN_REQUEST_APPROVED' : 'JOIN_REQUEST_REJECTED',
      targetType: 'MEMBER',
      targetId: req.userId,
      reason: `@${req.username}`,
    });

    this.pushNotification({
      recipientId: req.userId,
      actorId: params.actorUid,
      actorUsername: params.actorUsername,
      type: params.approve ? 'JOIN_APPROVED' : 'JOIN_REJECTED',
      title: params.approve
        ? `Approved to join ${group.name}`
        : `Join request declined for ${group.name}`,
      body: params.approve
        ? `Your membership request for "${group.name}" was approved.`
        : `Your membership request for "${group.name}" was declined.`,
      deepLink: { section: 'group', groupId: group.id },
    });

    this.persist();
    return req;
  }

  sendInvitation(params: {
    groupId: string;
    inviter: { uid: string; username: string; displayName: string };
    targetIdentifier: string;
    message?: string;
  }): GroupInvitation {
    const group = this.db.groups[params.groupId];
    if (!group || group.status !== 'ACTIVE') throw new Error('Group not found.');
    if (!this.hasGroupPermission(group, params.inviter.uid, group.settings.whoCanInvite)) {
      throw new Error('You do not have permission to invite users to this group.');
    }

    const targetUser = seedancePlatformStore.findUserByIdentifier(params.targetIdentifier);
    if (!targetUser) {
      throw new Error(
        `No registered Seedance user found matching "${params.targetIdentifier}".`
      );
    }

    const existingMem = this.getMembership(group.id, targetUser.uid);
    if (existingMem?.status === 'ACTIVE') {
      throw new Error(`@${targetUser.username} is already a member of this group.`);
    }
    if (existingMem?.status === 'BANNED') {
      throw new Error(`@${targetUser.username} is banned from this group.`);
    }

    const duplicatePending = Object.values(this.db.invitations).find(
      (i) => i.groupId === group.id && i.inviteeId === targetUser.uid && i.status === 'PENDING'
    );
    if (duplicatePending) return duplicatePending;

    const now = new Date().toISOString();
    const inv: GroupInvitation = {
      id: `ginv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      groupId: group.id,
      groupName: group.name,
      groupVisibility: group.visibility,
      groupCategory: group.category,
      groupCoverImageUrl: group.coverImageUrl,
      inviterId: params.inviter.uid,
      inviterUsername: params.inviter.username,
      inviterDisplayName: params.inviter.displayName,
      inviteeId: targetUser.uid,
      inviteeUsername: targetUser.username,
      inviteeEmail: targetUser.email,
      message: (params.message || '').trim().slice(0, 300),
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    this.db.invitations[inv.id] = inv;

    this.pushNotification({
      recipientId: targetUser.uid,
      actorId: params.inviter.uid,
      actorUsername: params.inviter.username,
      actorDisplayName: params.inviter.displayName,
      type: 'GROUP_INVITATION',
      title: `Invited to join ${group.name}`,
      body: `@${params.inviter.username} invited you to join "${group.name}" (${group.visibility}).`,
      deepLink: { section: 'invitations', groupId: group.id },
    });

    this.persist();
    return inv;
  }

  getUserInvitations(userId: string): GroupInvitation[] {
    return Object.values(this.db.invitations)
      .filter((i) => i.inviteeId === userId || i.inviterId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  respondToInvitation(params: {
    invitationId: string;
    userId: string;
    username: string;
    displayName: string;
    avatar?: string;
    accept: boolean;
  }): GroupInvitation {
    const inv = this.db.invitations[params.invitationId];
    if (!inv) throw new Error('Invitation not found.');
    if (inv.inviteeId !== params.userId) {
      throw new Error('Only the invited user can accept or decline this invitation.');
    }
    if (inv.status !== 'PENDING') return inv;

    const now = new Date().toISOString();
    inv.status = params.accept ? 'ACCEPTED' : 'DECLINED';
    inv.updatedAt = now;

    if (params.accept) {
      const group = this.db.groups[inv.groupId];
      if (!group || group.status !== 'ACTIVE') {
        throw new Error('Group is no longer active.');
      }
      if (!this.db.memberships[group.id]) this.db.memberships[group.id] = {};
      this.db.memberships[group.id][params.userId] = {
        groupId: group.id,
        userId: params.userId,
        username: params.username,
        displayName: params.displayName,
        avatar: params.avatar || '',
        role: 'MEMBER',
        status: 'ACTIVE',
        joinedAt: now,
        updatedAt: now,
      };
      group.memberCount = this.getActiveMemberIds(group.id).length;
      group.lastActivityAt = now;
      if (group.visibility === 'PRIVATE') {
        seedancePlatformStore.syncGroupLivestreamsPrivacy(
          group.id,
          'PRIVATE',
          this.getActiveMemberIds(group.id)
        );
      }
    }

    this.persist();
    return inv;
  }

  // ============================================================================
  // MEMBER ROLES, KICK/BAN/UNBAN & OWNERSHIP TRANSFER
  // ============================================================================

  manageGroupMember(params: {
    groupId: string;
    actorUid: string;
    actorUsername: string;
    targetUserId: string;
    action: 'SET_ROLE' | 'KICK' | 'BAN' | 'UNBAN' | 'TRANSFER_OWNERSHIP';
    newRole?: GroupRole;
    reason?: string;
    isPlatformAdmin?: boolean;
  }): { group: CommunityGroup; member?: GroupMember } {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');

    const actorMember = this.getMembership(group.id, params.actorUid);
    const isPlatAdmin = Boolean(params.isPlatformAdmin);
    if (!isPlatAdmin && (!actorMember || actorMember.status !== 'ACTIVE')) {
      throw new Error('Active group administrative membership required.');
    }

    const targetMember = this.getMembership(group.id, params.targetUserId);
    if (!targetMember) throw new Error('Target member not found in this group.');

    const now = new Date().toISOString();

    if (params.action === 'TRANSFER_OWNERSHIP') {
      if (!isPlatAdmin && actorMember?.role !== 'OWNER') {
        throw new Error('Only the current Group Owner can transfer ownership.');
      }
      if (targetMember.status !== 'ACTIVE') {
        throw new Error('Cannot transfer ownership to a banned user.');
      }
      if (group.ownerId === params.targetUserId) {
        throw new Error('This user is already the Group Owner.');
      }
      const prevOwnerId = group.ownerId;
      if (this.db.memberships[group.id][prevOwnerId]) {
        this.db.memberships[group.id][prevOwnerId].role = 'ADMIN';
        this.db.memberships[group.id][prevOwnerId].updatedAt = now;
      }
      targetMember.role = 'OWNER';
      targetMember.updatedAt = now;
      group.ownerId = targetMember.userId;
      group.ownerUsername = targetMember.username;
      group.ownerDisplayName = targetMember.displayName;
      group.updatedAt = now;

      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'OWNERSHIP_TRANSFERRED',
        targetType: 'MEMBER',
        targetId: targetMember.userId,
        reason: `Transferred ownership to @${targetMember.username}`,
      });
      this.pushNotification({
        recipientId: targetMember.userId,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        type: 'ROLE_UPDATED',
        title: `Ownership transferred in ${group.name}`,
        body: `You are now the Owner of "${group.name}".`,
        deepLink: { section: 'group', groupId: group.id },
      });
      this.persist();
      return { group: this.decorateGroupForViewer(group, params.actorUid), member: targetMember };
    }

    if (targetMember.role === 'OWNER' && !isPlatAdmin) {
      throw new Error('The Group Owner cannot be demoted, kicked, or banned.');
    }

    const actorRank = isPlatAdmin ? 99 : ROLE_RANK[actorMember!.role];
    const targetRank = ROLE_RANK[targetMember.role];

    if (actorRank <= targetRank) {
      throw new Error('You cannot modify a member with an equal or higher group role.');
    }

    if (params.action === 'SET_ROLE') {
      if (!params.newRole || params.newRole === 'OWNER') {
        throw new Error('Select ADMIN, MODERATOR, or MEMBER role.');
      }
      if (params.newRole === 'ADMIN' && actorRank < ROLE_RANK.OWNER) {
        throw new Error('Only the Group Owner can promote or demote Group Admins.');
      }
      if (actorRank < ROLE_RANK.ADMIN) {
        throw new Error('Group Admin or Owner clearance required to manage roles.');
      }
      targetMember.role = params.newRole;
      targetMember.updatedAt = now;
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: `ROLE_SET_${params.newRole}`,
        targetType: 'MEMBER',
        targetId: targetMember.userId,
        reason: params.reason || `Updated @${targetMember.username} to ${params.newRole}`,
      });
      this.pushNotification({
        recipientId: targetMember.userId,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        type: 'ROLE_UPDATED',
        title: `Role updated in ${group.name}`,
        body: `Your role in "${group.name}" is now ${params.newRole}.`,
        deepLink: { section: 'group', groupId: group.id },
      });
    } else if (params.action === 'KICK') {
      if (actorRank < ROLE_RANK.MODERATOR) {
        throw new Error('Moderator or higher permissions required to remove members.');
      }
      delete this.db.memberships[group.id][params.targetUserId];
      group.memberCount = this.getActiveMemberIds(group.id).length;
      if (group.visibility === 'PRIVATE') {
        seedancePlatformStore.syncGroupLivestreamsPrivacy(
          group.id,
          'PRIVATE',
          this.getActiveMemberIds(group.id)
        );
      }
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'MEMBER_KICKED',
        targetType: 'MEMBER',
        targetId: params.targetUserId,
        reason: params.reason || `Removed @${targetMember.username}`,
      });
      this.pushNotification({
        recipientId: params.targetUserId,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        type: 'MODERATION_ACTION',
        title: `Removed from ${group.name}`,
        body: `You were removed from "${group.name}".`,
        deepLink: { section: 'group', groupId: group.id },
      });
      this.persist();
      return { group: this.decorateGroupForViewer(group, params.actorUid) };
    } else if (params.action === 'BAN') {
      if (actorRank < ROLE_RANK.MODERATOR) {
        throw new Error('Moderator or higher permissions required to ban members.');
      }
      targetMember.status = 'BANNED';
      targetMember.banReason = (params.reason || '').trim().slice(0, 300);
      targetMember.role = 'MEMBER';
      targetMember.updatedAt = now;
      group.memberCount = this.getActiveMemberIds(group.id).length;
      if (group.visibility === 'PRIVATE') {
        seedancePlatformStore.syncGroupLivestreamsPrivacy(
          group.id,
          'PRIVATE',
          this.getActiveMemberIds(group.id)
        );
      }
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'MEMBER_BANNED',
        targetType: 'MEMBER',
        targetId: params.targetUserId,
        reason: params.reason || `Banned @${targetMember.username}`,
      });
      this.pushNotification({
        recipientId: params.targetUserId,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        type: 'MODERATION_ACTION',
        title: `Banned from ${group.name}`,
        body: `You have been banned from "${group.name}"${
          targetMember.banReason ? `: ${targetMember.banReason}` : '.'
        }`,
        deepLink: { section: 'group', groupId: group.id },
      });
    } else if (params.action === 'UNBAN') {
      if (actorRank < ROLE_RANK.MODERATOR) {
        throw new Error('Moderator or higher permissions required to unban members.');
      }
      delete this.db.memberships[group.id][params.targetUserId];
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'MEMBER_UNBANNED',
        targetType: 'MEMBER',
        targetId: params.targetUserId,
        reason: params.reason || `Unbanned @${targetMember.username}`,
      });
      this.persist();
      return { group: this.decorateGroupForViewer(group, params.actorUid) };
    }

    group.updatedAt = now;
    this.persist();
    return { group: this.decorateGroupForViewer(group, params.actorUid), member: targetMember };
  }

  // ============================================================================
  // GROUP POSTS, SEEDANCE WORKFLOWS, REACTIONS, SAVES & COMMENTS
  // ============================================================================

  createPost(params: {
    groupId: string;
    author: { uid: string; username: string; displayName: string; avatar?: string };
    postType: GroupPostType;
    title: string;
    body: string;
    tags?: string[];
    images?: string[];
    videoUrl?: string;
    thumbnailUrl?: string;
    workflow?: SeedanceWorkflowAttachment;
    livestreamId?: string;
  }): GroupPost {
    this.assertNotCommunityRestricted(params.author.uid);
    const group = this.db.groups[params.groupId];
    if (!group || group.status !== 'ACTIVE') throw new Error('Group not found or inactive.');

    const member = this.getMembership(group.id, params.author.uid);
    if (!member || member.status !== 'ACTIVE') {
      throw new Error('Only active group members can publish posts in this group.');
    }
    if (!this.hasGroupPermission(group, params.author.uid, group.settings.whoCanPost)) {
      throw new Error('Your group role does not permit creating posts in this group.');
    }
    if (params.postType === 'WORKFLOW' && !group.settings.allowWorkflowSharing) {
      throw new Error('Workflow sharing is currently disabled in this group settings.');
    }

    this.assertKeywordsClean(group, [
      params.title,
      params.body,
      params.workflow?.title,
      params.workflow?.prompt,
      params.workflow?.description,
    ]);

    const title = params.title.trim().slice(0, 200);
    const body = params.body.trim().slice(0, 10000);
    if (!title && !body && !(params.images?.length) && !params.videoUrl && !params.workflow) {
      throw new Error('Post content is required.');
    }

    const isStaff = ROLE_RANK[member.role] >= ROLE_RANK.MODERATOR;
    const status: GroupPostStatus =
      group.settings.requirePostApproval && !isStaff ? 'PENDING_APPROVAL' : 'PUBLISHED';

    const mentions = extractMentions(`${title} ${body}`);
    const now = new Date().toISOString();
    const id = `gpost-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const post: GroupPost = {
      id,
      groupId: group.id,
      groupName: group.name,
      groupVisibility: group.visibility,
      authorId: params.author.uid,
      authorUsername: params.author.username,
      authorDisplayName: params.author.displayName,
      authorAvatar: params.author.avatar || '',
      authorGroupRole: member.role,
      postType: params.postType,
      status,
      title: title || (params.workflow?.title || 'Studio Dispatch'),
      body,
      tags: Array.isArray(params.tags)
        ? params.tags.map((t) => t.trim()).filter(Boolean).slice(0, 12)
        : [],
      mentions,
      images: Array.isArray(params.images)
        ? params.images.filter((u) => typeof u === 'string' && u.trim()).slice(0, 12)
        : [],
      videoUrl: params.videoUrl?.trim() || undefined,
      thumbnailUrl: params.thumbnailUrl?.trim() || undefined,
      workflow: params.workflow,
      livestreamId: params.livestreamId,
      isPinned: false,
      commentsDisabled: false,
      reactions: {},
      reactionCounts: { LIKE: 0, INSPIRE: 0, CINEMA: 0, RESPECT: 0 },
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
      importCount: 0,
      giftTotalCredits: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.db.posts[id] = post;
    this.db.comments[id] = [];

    if (status === 'PUBLISHED') {
      group.postCount += 1;
      group.engagementScore += 2;
    }
    group.lastActivityAt = now;
    group.updatedAt = now;

    // Emit mention notifications (respecting private group membership)
    for (const username of mentions) {
      const mentioned = seedancePlatformStore.findUserByIdentifier(username);
      if (mentioned && (group.visibility === 'PUBLIC' || this.isActiveMember(group.id, mentioned.uid))) {
        this.pushNotification({
          recipientId: mentioned.uid,
          actorId: params.author.uid,
          actorUsername: params.author.username,
          actorDisplayName: params.author.displayName,
          type: 'MENTION',
          title: `Mentioned by @${params.author.username}`,
          body: `You were mentioned in "${group.name}": ${post.title}`,
          deepLink: { section: 'post', groupId: group.id, postId: post.id },
        });
      }
    }

    this.persist();
    return this.decoratePostForViewer(post, params.author.uid);
  }

  getGroupPosts(params: {
    groupId: string;
    viewerUid?: string;
    isPlatformAdmin?: boolean;
    postType?: GroupPostType;
    statusFilter?: GroupPostStatus;
  }): GroupPost[] {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    if (!this.canReadGroupContent(group, params.viewerUid, params.isPlatformAdmin)) {
      throw new Error('Private group content is restricted to approved members.');
    }

    const isStaff =
      Boolean(params.isPlatformAdmin) ||
      Boolean(params.viewerUid && this.hasGroupPermission(group, params.viewerUid, 'MODERATORS_AND_ABOVE'));

    return Object.values(this.db.posts)
      .filter((p) => p.groupId === group.id)
      .filter((p) => {
        if (params.statusFilter === 'PENDING_APPROVAL') {
          return (
            p.status === 'PENDING_APPROVAL' &&
            (isStaff || p.authorId === params.viewerUid)
          );
        }
        return p.status === 'PUBLISHED';
      })
      .filter((p) => (params.postType ? p.postType === params.postType : true))
      .map((p) => this.decoratePostForViewer(p, params.viewerUid))
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }

  getCommunityFeed(params: {
    viewerUid?: string;
    isPlatformAdmin?: boolean;
    postType?: GroupPostType;
    savedOnly?: boolean;
  }): GroupPost[] {
    const savedSet = new Set(
      params.viewerUid ? this.db.savedPostIds[params.viewerUid] || [] : []
    );

    return Object.values(this.db.posts)
      .filter((p) => p.status === 'PUBLISHED')
      .filter((p) => (params.postType ? p.postType === params.postType : true))
      .filter((p) => (params.savedOnly ? savedSet.has(p.id) : true))
      .filter((p) => {
        const g = this.db.groups[p.groupId];
        if (!g || g.status !== 'ACTIVE') return false;
        if (g.visibility === 'PUBLIC') return true;
        if (params.isPlatformAdmin) return true;
        return Boolean(params.viewerUid && this.isActiveMember(g.id, params.viewerUid));
      })
      .map((p) => this.decoratePostForViewer(p, params.viewerUid))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updatePost(params: {
    postId: string;
    actorUid: string;
    actorUsername: string;
    isPlatformAdmin?: boolean;
    updates: {
      title?: string;
      body?: string;
      tags?: string[];
      isPinned?: boolean;
      commentsDisabled?: boolean;
      status?: GroupPostStatus;
    };
  }): GroupPost {
    const post = this.db.posts[params.postId];
    if (!post) throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group) throw new Error('Parent group not found.');

    const isAuthor = post.authorId === params.actorUid;
    const isStaff =
      Boolean(params.isPlatformAdmin) ||
      this.hasGroupPermission(group, params.actorUid, 'MODERATORS_AND_ABOVE');

    if (!isAuthor && !isStaff) {
      throw new Error('Permission denied to modify this post.');
    }

    const now = new Date().toISOString();

    if (typeof params.updates.title === 'string' || typeof params.updates.body === 'string') {
      this.assertKeywordsClean(group, [params.updates.title, params.updates.body]);
      if (typeof params.updates.title === 'string') {
        post.title = params.updates.title.trim().slice(0, 200);
      }
      if (typeof params.updates.body === 'string') {
        post.body = params.updates.body.trim().slice(0, 10000);
        post.mentions = extractMentions(`${post.title} ${post.body}`);
      }
      post.editedAt = now;
    }

    if (Array.isArray(params.updates.tags)) {
      post.tags = params.updates.tags.map((t) => t.trim()).filter(Boolean).slice(0, 12);
    }

    if (typeof params.updates.isPinned === 'boolean') {
      if (!isStaff) throw new Error('Only moderators or admins can pin posts.');
      post.isPinned = params.updates.isPinned;
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: params.updates.isPinned ? 'POST_PINNED' : 'POST_UNPINNED',
        targetType: 'POST',
        targetId: post.id,
      });
    }

    if (typeof params.updates.commentsDisabled === 'boolean') {
      if (!isStaff && !isAuthor) throw new Error('Permission denied to toggle comments.');
      post.commentsDisabled = params.updates.commentsDisabled;
    }

    if (params.updates.status && params.updates.status !== post.status) {
      if (!isStaff) throw new Error('Only group moderators or admins can approve or remove posts.');
      const prevStatus = post.status;
      post.status = params.updates.status;
      if (prevStatus === 'PENDING_APPROVAL' && post.status === 'PUBLISHED') {
        group.postCount += 1;
        this.pushNotification({
          recipientId: post.authorId,
          actorId: params.actorUid,
          actorUsername: params.actorUsername,
          type: 'MODERATION_ACTION',
          title: `Post published in ${group.name}`,
          body: `Your post "${post.title}" has been approved by a moderator.`,
          deepLink: { section: 'post', groupId: group.id, postId: post.id },
        });
      }
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: `POST_STATUS_${post.status}`,
        targetType: 'POST',
        targetId: post.id,
      });
    }

    post.updatedAt = now;
    this.persist();
    return this.decoratePostForViewer(post, params.actorUid);
  }

  deletePost(params: {
    postId: string;
    actorUid: string;
    actorUsername: string;
    isPlatformAdmin?: boolean;
  }): void {
    const post = this.db.posts[params.postId];
    if (!post) throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group) throw new Error('Group not found.');

    const isAuthor = post.authorId === params.actorUid;
    const isStaff =
      Boolean(params.isPlatformAdmin) ||
      this.hasGroupPermission(group, params.actorUid, 'MODERATORS_AND_ABOVE');
    if (!isAuthor && !isStaff) {
      throw new Error('Only the author or group moderators can delete this post.');
    }

    if (post.status === 'PUBLISHED') {
      group.postCount = Math.max(0, group.postCount - 1);
    }
    if (!isAuthor && isStaff) {
      this.logGroupModeration({
        groupId: group.id,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        action: 'POST_DELETED',
        targetType: 'POST',
        targetId: post.id,
        reason: post.title,
      });
      this.pushNotification({
        recipientId: post.authorId,
        actorId: params.actorUid,
        actorUsername: params.actorUsername,
        type: 'MODERATION_ACTION',
        title: `Post removed in ${group.name}`,
        body: `Your post "${post.title}" was removed by group moderation.`,
        deepLink: { section: 'group', groupId: group.id },
      });
    }

    delete this.db.posts[params.postId];
    delete this.db.comments[params.postId];
    this.persist();
  }

  reactToPost(params: {
    postId: string;
    user: { uid: string; username: string; displayName: string };
    reaction: GroupPostReactionType;
  }): GroupPost {
    const post = this.db.posts[params.postId];
    if (!post || post.status !== 'PUBLISHED') throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group || !this.canReadGroupContent(group, params.user.uid)) {
      throw new Error('You do not have access to this group post.');
    }

    const prev = post.reactions[params.user.uid];
    if (prev === params.reaction) {
      delete post.reactions[params.user.uid];
    } else {
      post.reactions[params.user.uid] = params.reaction;
      group.engagementScore += 1;
      if (!prev) {
        this.pushNotification({
          recipientId: post.authorId,
          actorId: params.user.uid,
          actorUsername: params.user.username,
          actorDisplayName: params.user.displayName,
          type: 'POST_REACTION',
          title: `New reaction on your post`,
          body: `@${params.user.username} reacted (${params.reaction}) to "${post.title}".`,
          deepLink: { section: 'post', groupId: group.id, postId: post.id },
        });
      }
    }

    const counts: Record<GroupPostReactionType, number> = {
      LIKE: 0,
      INSPIRE: 0,
      CINEMA: 0,
      RESPECT: 0,
    };
    for (const r of Object.values(post.reactions)) {
      counts[r] = (counts[r] || 0) + 1;
    }
    post.reactionCounts = counts;
    post.updatedAt = new Date().toISOString();
    this.persist();
    return this.decoratePostForViewer(post, params.user.uid);
  }

  toggleSavePost(postId: string, userId: string): { saved: boolean; savesCount: number } {
    const post = this.db.posts[postId];
    if (!post || post.status !== 'PUBLISHED') throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group || !this.canReadGroupContent(group, userId)) {
      throw new Error('Access denied to this post.');
    }

    const list = this.db.savedPostIds[userId] || [];
    const exists = list.includes(postId);
    if (exists) {
      this.db.savedPostIds[userId] = list.filter((id) => id !== postId);
      post.savesCount = Math.max(0, post.savesCount - 1);
    } else {
      this.db.savedPostIds[userId] = [postId, ...list];
      post.savesCount += 1;
    }
    this.persist();
    return { saved: !exists, savesCount: post.savesCount };
  }

  recordPostShare(postId: string): number {
    const post = this.db.posts[postId];
    if (!post) throw new Error('Post not found.');
    post.sharesCount += 1;
    this.persist();
    return post.sharesCount;
  }

  recordWorkflowImport(
    postId: string,
    viewerUid: string,
    isPlatformAdmin = false
  ): SeedanceWorkflowAttachment {
    const post = this.db.posts[postId];
    if (!post || !post.workflow) throw new Error('Workflow attachment not found on this post.');
    const group = this.db.groups[post.groupId];
    if (!group || !this.canReadGroupContent(group, viewerUid, isPlatformAdmin)) {
      throw new Error('Access denied to private group workflow.');
    }
    post.importCount += 1;
    group.engagementScore += 2;
    this.persist();
    return post.workflow;
  }

  getComments(
    postId: string,
    viewerUid?: string,
    isPlatformAdmin = false
  ): GroupPostComment[] {
    const post = this.db.posts[postId];
    if (!post) throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group || !this.canReadGroupContent(group, viewerUid, isPlatformAdmin)) {
      throw new Error('Private group comments are restricted to group members.');
    }
    return (this.db.comments[postId] || []).slice().sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  addComment(params: {
    postId: string;
    author: { uid: string; username: string; displayName: string; avatar?: string };
    content: string;
    parentCommentId?: string;
  }): GroupPostComment {
    this.assertNotCommunityRestricted(params.author.uid);
    const post = this.db.posts[params.postId];
    if (!post || post.status !== 'PUBLISHED') throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group || group.status !== 'ACTIVE') throw new Error('Group not found.');

    if (post.commentsDisabled) {
      throw new Error('Comments are disabled for this post.');
    }
    if (!this.canReadGroupContent(group, params.author.uid)) {
      throw new Error('Private group membership required to comment.');
    }
    if (group.settings.whoCanComment === 'MEMBERS_ONLY' && !this.isActiveMember(group.id, params.author.uid)) {
      throw new Error('Only group members can comment in this group.');
    }

    this.assertKeywordsClean(group, [params.content]);
    const text = params.content.trim().slice(0, 2000);
    if (!text) throw new Error('Comment content cannot be empty.');

    const member = this.getMembership(group.id, params.author.uid);
    const now = new Date().toISOString();
    const mentions = extractMentions(text);

    const comment: GroupPostComment = {
      id: `gcmt-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      groupId: group.id,
      postId: post.id,
      parentCommentId: params.parentCommentId || undefined,
      authorId: params.author.uid,
      authorUsername: params.author.username,
      authorDisplayName: params.author.displayName,
      authorAvatar: params.author.avatar || '',
      authorGroupRole: member?.role || 'MEMBER',
      content: text,
      mentions,
      likedBy: [],
      likesCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const list = this.db.comments[post.id] || [];
    list.push(comment);
    this.db.comments[post.id] = list;
    post.commentsCount = list.length;
    post.updatedAt = now;
    group.engagementScore += 1;
    group.lastActivityAt = now;

    // Notify post author or parent comment author
    if (params.parentCommentId) {
      const parent = list.find((c) => c.id === params.parentCommentId);
      if (parent) {
        this.pushNotification({
          recipientId: parent.authorId,
          actorId: params.author.uid,
          actorUsername: params.author.username,
          actorDisplayName: params.author.displayName,
          type: 'COMMENT_REPLY',
          title: `Reply from @${params.author.username}`,
          body: `@${params.author.username} replied to your comment on "${post.title}".`,
          deepLink: { section: 'post', groupId: group.id, postId: post.id },
        });
      }
    }
    this.pushNotification({
      recipientId: post.authorId,
      actorId: params.author.uid,
      actorUsername: params.author.username,
      actorDisplayName: params.author.displayName,
      type: 'POST_COMMENT',
      title: `New comment on "${post.title}"`,
      body: `@${params.author.username}: ${text.slice(0, 100)}`,
      deepLink: { section: 'post', groupId: group.id, postId: post.id },
    });

    for (const uname of mentions) {
      const target = seedancePlatformStore.findUserByIdentifier(uname);
      if (target && (group.visibility === 'PUBLIC' || this.isActiveMember(group.id, target.uid))) {
        this.pushNotification({
          recipientId: target.uid,
          actorId: params.author.uid,
          actorUsername: params.author.username,
          actorDisplayName: params.author.displayName,
          type: 'MENTION',
          title: `Mentioned in comment`,
          body: `@${params.author.username} mentioned you in "${group.name}".`,
          deepLink: { section: 'post', groupId: group.id, postId: post.id },
        });
      }
    }

    this.persist();
    return comment;
  }

  deleteComment(params: {
    postId: string;
    commentId: string;
    actorUid: string;
    isPlatformAdmin?: boolean;
  }): void {
    const post = this.db.posts[params.postId];
    if (!post) throw new Error('Post not found.');
    const group = this.db.groups[post.groupId];
    if (!group) throw new Error('Group not found.');

    const list = this.db.comments[params.postId] || [];
    const target = list.find((c) => c.id === params.commentId);
    if (!target) throw new Error('Comment not found.');

    const canDelete =
      target.authorId === params.actorUid ||
      Boolean(params.isPlatformAdmin) ||
      this.hasGroupPermission(group, params.actorUid, 'MODERATORS_AND_ABOVE');
    if (!canDelete) throw new Error('Permission denied to delete this comment.');

    const remaining = list.filter(
      (c) => c.id !== params.commentId && c.parentCommentId !== params.commentId
    );
    this.db.comments[params.postId] = remaining;
    post.commentsCount = remaining.length;
    this.persist();
  }

  // ============================================================================
  // GROUP ANNOUNCEMENTS & EVENTS
  // ============================================================================

  getAnnouncements(
    groupId: string,
    viewerUid?: string,
    isPlatformAdmin = false
  ): GroupAnnouncement[] {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    if (!this.canReadGroupContent(group, viewerUid, isPlatformAdmin)) {
      throw new Error('Private group announcements are restricted to members.');
    }
    return (this.db.announcements[groupId] || []).slice().sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  createAnnouncement(params: {
    groupId: string;
    actor: { uid: string; username: string; displayName: string };
    title: string;
    content: string;
    isPinned?: boolean;
    scheduledAt?: string;
    isPlatformAdmin?: boolean;
  }): GroupAnnouncement {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !params.isPlatformAdmin &&
      !this.hasGroupPermission(group, params.actor.uid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Group moderator or admin access required to post announcements.');
    }
    const now = new Date().toISOString();
    const ann: GroupAnnouncement = {
      id: `gann-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      groupId: group.id,
      authorId: params.actor.uid,
      authorUsername: params.actor.username,
      authorDisplayName: params.actor.displayName,
      title: params.title.trim().slice(0, 200),
      content: params.content.trim().slice(0, 4000),
      isPinned: params.isPinned !== false,
      scheduledAt: params.scheduledAt || undefined,
      createdAt: now,
      updatedAt: now,
    };
    if (!this.db.announcements[group.id]) this.db.announcements[group.id] = [];
    this.db.announcements[group.id].unshift(ann);
    group.lastActivityAt = now;

    // Notify active group members
    for (const memberId of this.getActiveMemberIds(group.id)) {
      this.pushNotification({
        recipientId: memberId,
        actorId: params.actor.uid,
        actorUsername: params.actor.username,
        actorDisplayName: params.actor.displayName,
        type: 'GROUP_ANNOUNCEMENT',
        title: `Announcement in ${group.name}`,
        body: ann.title,
        deepLink: { section: 'group', groupId: group.id },
      });
    }

    this.persist();
    return ann;
  }

  deleteAnnouncement(params: {
    groupId: string;
    announcementId: string;
    actorUid: string;
    isPlatformAdmin?: boolean;
  }): void {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !params.isPlatformAdmin &&
      !this.hasGroupPermission(group, params.actorUid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Moderator or admin clearance required.');
    }
    this.db.announcements[group.id] = (this.db.announcements[group.id] || []).filter(
      (a) => a.id !== params.announcementId
    );
    this.persist();
  }

  getEvents(groupId: string, viewerUid?: string, isPlatformAdmin = false): GroupEvent[] {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    if (!this.canReadGroupContent(group, viewerUid, isPlatformAdmin)) {
      throw new Error('Private group events are restricted to members.');
    }
    return (this.db.events[groupId] || [])
      .map((ev) => ({
        ...ev,
        viewerAttending: viewerUid ? ev.attendeeIds.includes(viewerUid) : false,
      }))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  createEvent(params: {
    groupId: string;
    creator: { uid: string; username: string; displayName: string };
    title: string;
    description: string;
    eventType: GroupEventType;
    startsAt: string;
    endsAt?: string;
    locationOrLink?: string;
    isPlatformAdmin?: boolean;
  }): GroupEvent {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !params.isPlatformAdmin &&
      !this.hasGroupPermission(group, params.creator.uid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Moderator or admin permissions required to schedule group events.');
    }
    const now = new Date().toISOString();
    const ev: GroupEvent = {
      id: `gev-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      groupId: group.id,
      creatorId: params.creator.uid,
      creatorUsername: params.creator.username,
      creatorDisplayName: params.creator.displayName,
      title: params.title.trim().slice(0, 200),
      description: params.description.trim().slice(0, 2000),
      eventType: params.eventType,
      startsAt: params.startsAt || now,
      endsAt: params.endsAt || undefined,
      locationOrLink: params.locationOrLink?.trim().slice(0, 300),
      attendeeIds: [params.creator.uid],
      attendeeCount: 1,
      viewerAttending: true,
      createdAt: now,
      updatedAt: now,
    };
    if (!this.db.events[group.id]) this.db.events[group.id] = [];
    this.db.events[group.id].push(ev);
    group.lastActivityAt = now;
    this.persist();
    return ev;
  }

  toggleEventRsvp(groupId: string, eventId: string, userId: string): GroupEvent {
    const group = this.db.groups[groupId];
    if (!group || !this.canReadGroupContent(group, userId)) {
      throw new Error('Access denied to group event.');
    }
    const ev = (this.db.events[groupId] || []).find((e) => e.id === eventId);
    if (!ev) throw new Error('Event not found.');

    const attending = ev.attendeeIds.includes(userId);
    if (attending) {
      ev.attendeeIds = ev.attendeeIds.filter((id) => id !== userId);
    } else {
      ev.attendeeIds.push(userId);
    }
    ev.attendeeCount = ev.attendeeIds.length;
    ev.updatedAt = new Date().toISOString();
    this.persist();
    return { ...ev, viewerAttending: !attending };
  }

  getGroupModerationLogs(
    groupId: string,
    actorUid: string,
    isPlatformAdmin = false
  ): GroupModerationLog[] {
    const group = this.db.groups[groupId];
    if (!group) throw new Error('Group not found.');
    if (
      !isPlatformAdmin &&
      !this.hasGroupPermission(group, actorUid, 'MODERATORS_AND_ABOVE')
    ) {
      throw new Error('Group moderator or admin clearance required to view moderation logs.');
    }
    return this.db.moderationLogs[groupId] || [];
  }

  // ============================================================================
  // VIRTUAL GIFTS (ATOMIC CREDIT DEDUCTION + IDEMPOTENCY + ZERO FAKE PAYOUTS)
  // ============================================================================

  getGiftCatalog(includeDisabled = false): VirtualGiftItem[] {
    return this.db.giftCatalog
      .filter((g) => (includeDisabled ? true : g.enabled))
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  sendVirtualGift(params: {
    sender: { uid: string; email: string; username: string; displayName: string };
    giftId: string;
    recipientId: string;
    groupId?: string;
    postId?: string;
    livestreamId?: string;
    note?: string;
    idempotencyKey?: string;
  }): {
    transaction: VirtualGiftTransaction;
    wallet: any;
    deduplicated?: boolean;
  } {
    this.assertNotCommunityRestricted(params.sender.uid);
    if (!this.db.policies.allowVirtualGifts) {
      throw new Error('Virtual gifting is currently disabled by platform policy.');
    }

    if (!isSafeIdentifier(params.recipientId)) {
      throw new Error('Invalid virtual gift recipient.');
    }
    if (params.sender.uid === params.recipientId) {
      throw new Error('You cannot send a virtual gift to your own account.');
    }

    if (params.idempotencyKey) {
      const existingTx = this.db.giftTransactions.find(
        (t) => t.senderId === params.sender.uid && t.idempotencyKey === params.idempotencyKey
      );
      if (existingTx) {
        return {
          transaction: existingTx,
          wallet: seedancePlatformStore.getOrCreateWallet(params.sender.uid, params.sender.email),
          deduplicated: true,
        };
      }
    }

    const gift = this.db.giftCatalog.find((g) => g.id === params.giftId && g.enabled);
    if (!gift || !Number.isSafeInteger(gift.creditPrice) || gift.creditPrice <= 0) {
      throw new Error('Selected virtual gift is unavailable or disabled.');
    }

    let groupName: string | undefined;
    if (params.groupId) {
      const group = this.db.groups[params.groupId];
      if (!group || group.status !== 'ACTIVE') throw new Error('Group not found.');
      if (!this.canReadGroupContent(group, params.sender.uid)) {
        throw new Error('You do not have access to send gifts inside this private group.');
      }
      if (!group.settings.allowVirtualGifts) {
        throw new Error('Virtual gifts are disabled in this group by its administrator.');
      }
      groupName = group.name;
    }

    const recipientRec = seedancePlatformStore.getUserRecord(params.recipientId);
    const recipientProfile = this.db.profiles[params.recipientId];
    if (!recipientRec && !recipientProfile) {
      throw new Error('Virtual gift recipient account not found.');
    }
    const recipientUsername =
      recipientRec?.username || recipientProfile?.username || params.recipientId.slice(0, 8);
    const recipientDisplayName =
      recipientRec?.displayName || recipientProfile?.displayName || 'Creator';

    const idemKey =
      params.idempotencyKey ||
      `gift-${params.sender.uid}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const deductRes = seedancePlatformStore.deductCreditsAtomic({
      userId: params.sender.uid,
      userEmail: params.sender.email,
      amount: gift.creditPrice,
      description: `Virtual Gift "${gift.name}" to @${recipientUsername} (${gift.creditPrice} CR)`,
      txType: 'VIRTUAL_GIFT_SEND',
      referenceId: params.recipientId,
      idempotencyKey: idemKey,
    });

    if (!deductRes.success) {
      throw new Error(deductRes.error || 'Insufficient credits to send virtual gift.');
    }

    const now = new Date().toISOString();
    const tx: VirtualGiftTransaction = {
      id: `vgt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      giftId: gift.id,
      giftName: gift.name,
      giftCategory: gift.category,
      iconKey: gift.iconKey,
      animationStyle: gift.animationStyle,
      senderId: params.sender.uid,
      senderUsername: params.sender.username,
      senderDisplayName: params.sender.displayName,
      recipientId: params.recipientId,
      recipientUsername,
      recipientDisplayName,
      groupId: params.groupId,
      groupName,
      postId: params.postId,
      livestreamId: params.livestreamId,
      creditCost: gift.creditPrice,
      note: (params.note || '').trim().slice(0, 200) || undefined,
      idempotencyKey: idemKey,
      createdAt: now,
    };

    this.db.giftTransactions.unshift(tx);
    this.db.giftTransactions = this.db.giftTransactions.slice(0, 5000);

    if (params.postId && this.db.posts[params.postId]) {
      this.db.posts[params.postId].giftTotalCredits += gift.creditPrice;
    }

    this.pushNotification({
      recipientId: params.recipientId,
      actorId: params.sender.uid,
      actorUsername: params.sender.username,
      actorDisplayName: params.sender.displayName,
      type: 'VIRTUAL_GIFT_RECEIVED',
      title: `Received ${gift.name} (${gift.creditPrice} CR)`,
      body: `@${params.sender.username} sent you ${gift.name}${
        groupName ? ` in ${groupName}` : params.livestreamId ? ' during your livestream' : ''
      }.`,
      deepLink: params.livestreamId
        ? { section: 'livestream', livestreamId: params.livestreamId, groupId: params.groupId }
        : params.postId && params.groupId
        ? { section: 'post', groupId: params.groupId, postId: params.postId }
        : { section: 'gifts' },
    });

    this.persist();
    return { transaction: tx, wallet: deductRes.wallet };
  }

  getUserGiftHistory(userId: string): {
    sent: VirtualGiftTransaction[];
    received: VirtualGiftTransaction[];
  } {
    const sent = this.db.giftTransactions.filter((t) => t.senderId === userId);
    const received = this.db.giftTransactions.filter((t) => t.recipientId === userId);
    return { sent, received };
  }

  // ============================================================================
  // NOTIFICATIONS & REPORTS
  // ============================================================================

  getUserNotifications(userId: string, limit = 60): {
    notifications: CommunityNotification[];
    unreadCount: number;
  } {
    const mine = this.db.notifications.filter((n) => n.recipientId === userId);
    const unreadCount = mine.filter((n) => !n.isRead).length;
    return {
      notifications: mine.slice(0, limit),
      unreadCount,
    };
  }

  markNotificationsRead(userId: string, notificationId?: string): number {
    let unread = 0;
    for (const n of this.db.notifications) {
      if (n.recipientId !== userId) continue;
      if (!notificationId || n.id === notificationId) {
        n.isRead = true;
      }
      if (!n.isRead) unread++;
    }
    this.persist();
    return unread;
  }

  submitReport(params: {
    reporterId: string;
    reporterUsername: string;
    targetType: CommunityReportTargetType;
    targetId: string;
    groupId?: string;
    targetSummary?: string;
    reason: string;
  }): CommunityReport {
    const group = params.groupId ? this.db.groups[params.groupId] : undefined;
    const report: CommunityReport = {
      id: `crep-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      reporterId: params.reporterId,
      reporterUsername: params.reporterUsername,
      targetType: params.targetType,
      targetId: params.targetId,
      groupId: params.groupId,
      groupName: group?.name,
      targetSummary: (params.targetSummary || params.targetId).slice(0, 200),
      reason: params.reason.trim().slice(0, 500),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.db.reports.unshift(report);
    this.db.reports = this.db.reports.slice(0, 2000);
    this.persist();
    return report;
  }

  // ============================================================================
  // PLATFORM-LEVEL ADMIN GOVERNANCE (SEPARATE FROM GROUP ADMINS)
  // ============================================================================

  getAllGroupsAdmin(): CommunityGroup[] {
    return Object.values(this.db.groups).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  adminSetGroupStatus(params: {
    groupId: string;
    status: GroupStatus;
    reason: string;
    actor: { uid: string; email: string };
  }): CommunityGroup {
    const group = this.db.groups[params.groupId];
    if (!group) throw new Error('Group not found.');
    group.status = params.status;
    group.suspendedReason = params.status === 'SUSPENDED' ? params.reason.trim() : undefined;
    group.updatedAt = new Date().toISOString();

    seedancePlatformStore.addAuditLog({
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      action: `PLATFORM_GROUP_${params.status}`,
      targetType: 'communityGroup',
      targetId: group.id,
      reason: params.reason,
    });
    seedancePlatformStore.persist();
    this.persist();
    return group;
  }

  getAllReportsAdmin(): CommunityReport[] {
    return this.db.reports;
  }

  adminResolveReport(params: {
    reportId: string;
    status: CommunityReportStatus;
    resolutionNote: string;
    removeTargetContent?: boolean;
    actor: { uid: string; email: string };
  }): CommunityReport {
    const rep = this.db.reports.find((r) => r.id === params.reportId);
    if (!rep) throw new Error('Report not found.');
    rep.status = params.status;
    rep.resolutionNote = params.resolutionNote.trim().slice(0, 500);
    rep.reviewedBy = params.actor.email;
    rep.updatedAt = new Date().toISOString();

    if (params.removeTargetContent) {
      if (rep.targetType === 'POST' && this.db.posts[rep.targetId]) {
        this.db.posts[rep.targetId].status = 'REMOVED';
      } else if (rep.targetType === 'GROUP' && this.db.groups[rep.targetId]) {
        this.db.groups[rep.targetId].status = 'SUSPENDED';
        this.db.groups[rep.targetId].suspendedReason = rep.resolutionNote;
      } else if (rep.targetType === 'USER') {
        const prof = this.db.profiles[rep.targetId];
        if (prof) {
          prof.restrictedFromCommunity = true;
          prof.restrictionReason = rep.resolutionNote;
        }
      }
    }

    seedancePlatformStore.addAuditLog({
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      action: 'PLATFORM_RESOLVE_COMMUNITY_REPORT',
      targetType: rep.targetType,
      targetId: rep.targetId,
      reason: rep.resolutionNote || rep.status,
    });
    seedancePlatformStore.persist();
    this.persist();
    return rep;
  }

  adminUpsertGift(params: {
    gift: Partial<VirtualGiftItem> & { id?: string };
    actor: { uid: string; email: string };
  }): VirtualGiftItem[] {
    const now = new Date().toISOString();
    const existingIdx = params.gift.id
      ? this.db.giftCatalog.findIndex((g) => g.id === params.gift.id)
      : -1;

    if (existingIdx >= 0) {
      const current = this.db.giftCatalog[existingIdx];
      this.db.giftCatalog[existingIdx] = {
        ...current,
        ...params.gift,
        creditPrice:
          typeof params.gift.creditPrice === 'number'
            ? Math.max(1, Math.round(params.gift.creditPrice))
            : current.creditPrice,
        updatedAt: now,
      };
    } else {
      const created: VirtualGiftItem = {
        id:
          params.gift.id ||
          `gift-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        name: (params.gift.name || 'Custom Gift').trim().slice(0, 80),
        description: (params.gift.description || '').trim().slice(0, 200),
        category: (params.gift.category as VirtualGiftCategory) || 'BASIC',
        creditPrice: Math.max(1, Math.round(Number(params.gift.creditPrice || 5))),
        iconKey: params.gift.iconKey || 'SPARK',
        animationStyle: params.gift.animationStyle || 'PULSE',
        enabled: params.gift.enabled !== false,
        sortOrder: this.db.giftCatalog.length + 1,
        updatedAt: now,
      };
      this.db.giftCatalog.push(created);
    }

    seedancePlatformStore.addAuditLog({
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      action: 'PLATFORM_UPDATE_GIFT_CATALOG',
      targetType: 'giftCatalog',
      targetId: params.gift.id || 'new',
      reason: `Updated virtual gift catalog (${params.gift.name || params.gift.id})`,
    });
    seedancePlatformStore.persist();
    this.persist();
    return this.getGiftCatalog(true);
  }

  adminUpdateCategories(
    categories: CommunityCategory[],
    actor: { uid: string; email: string }
  ): CommunityCategory[] {
    this.db.categories = categories.map((c, idx) => ({
      id: c.id || `cat-${Date.now()}-${idx}`,
      name: c.name.trim().slice(0, 80),
      description: (c.description || '').trim().slice(0, 200),
      enabled: c.enabled !== false,
      sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : idx + 1,
    }));
    seedancePlatformStore.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'PLATFORM_UPDATE_CATEGORIES',
      targetType: 'communityCategories',
      targetId: 'all',
      reason: `Updated ${this.db.categories.length} community categories`,
    });
    seedancePlatformStore.persist();
    this.persist();
    return this.getCategories(true);
  }

  adminUpdatePolicies(
    updates: Partial<CommunityPlatformPolicies>,
    actor: { uid: string; email: string }
  ): CommunityPlatformPolicies {
    this.db.policies = {
      ...this.db.policies,
      ...updates,
      globalBlockedKeywords: Array.isArray(updates.globalBlockedKeywords)
        ? updates.globalBlockedKeywords.map((k) => k.trim()).filter(Boolean)
        : this.db.policies.globalBlockedKeywords,
      updatedAt: new Date().toISOString(),
      updatedBy: actor.email,
    };
    seedancePlatformStore.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'PLATFORM_UPDATE_COMMUNITY_POLICIES',
      targetType: 'communityPolicies',
      targetId: this.db.policies.id,
      reason: 'Updated global community policies',
    });
    seedancePlatformStore.persist();
    this.persist();
    return this.getPolicies();
  }

  adminSetUserCommunityRestriction(params: {
    targetUid: string;
    restricted: boolean;
    reason: string;
    actor: { uid: string; email: string };
  }): CommunityUserProfile {
    const rec = seedancePlatformStore.getUserRecord(params.targetUid);
    const prof = this.ensureProfile({
      uid: params.targetUid,
      username: rec?.username || params.targetUid.slice(0, 8),
      displayName: rec?.displayName || 'Creator',
    });
    prof.restrictedFromCommunity = params.restricted;
    prof.restrictionReason = params.restricted ? params.reason.trim() : undefined;
    prof.updatedAt = new Date().toISOString();

    seedancePlatformStore.addAuditLog({
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      action: params.restricted
        ? 'PLATFORM_RESTRICT_COMMUNITY_USER'
        : 'PLATFORM_UNRESTRICT_COMMUNITY_USER',
      targetType: 'user',
      targetId: params.targetUid,
      reason: params.reason,
    });
    seedancePlatformStore.persist();
    this.persist();
    return prof;
  }

  getAllGiftTransactionsAdmin(): VirtualGiftTransaction[] {
    return this.db.giftTransactions;
  }
}

export const seedanceCommunityStore = new SeedanceCommunityStore();
