/**
 * VAIURE — SEEDANCE LAB COMMUNITY & GROUPS ECOSYSTEM HUB
 * Complete social platform inside Seedance Lab:
 * - Discover Groups (Search by name/category/interests, Recommended/Popular/Recent)
 * - My Groups
 * - Group Invitations
 * - Following (Followed Creators & Cross-Group Posts)
 * - Community Feed (All / Workflows / Videos / Images / Bookmarked Saved Posts)
 * - Notifications (Deep-linked to Group, Post, Invitations, Livestream, Gifts, Profile)
 * - Create Group (with real cover/icon upload)
 * - Creator Profiles (with Privacy Toggles & Gift Recognition Summary)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Bell,
  Bookmark,
  Check,
  Compass,
  FolderHeart,
  Gift,
  Globe,
  Layers,
  Lock,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CommunityCategory,
  CommunityGroup,
  CommunityNotification,
  CommunityUserProfile,
  GroupInvitation,
  GroupJoinMode,
  GroupPost,
  GroupPostType,
  GroupVisibility,
  LivestreamSession,
  SeedanceWorkflowAttachment,
  VirtualGiftTransaction,
} from '../../../../types/seedancePlatform';
import {
  seedanceCommunityService,
  uploadCommunityMediaFile,
} from '../../../../services/seedanceCommunityService';
import { GroupDetailView } from './GroupDetailView';
import { GroupPostCard } from './GroupPostCard';
import { GiftAnimationOverlay, VirtualGiftModal } from './VirtualGiftModal';

export type CommunityMenuSection =
  | 'discover'
  | 'my_groups'
  | 'invitations'
  | 'following'
  | 'feed'
  | 'notifications'
  | 'create'
  | 'gifts';

interface SeedanceCommunityViewProps {
  currentUserId?: string;
  currentCredits: number;
  isAuthenticated: boolean;
  isPlatformAdmin?: boolean;
  onRequireAuth?: () => void;
  onOpenCredits?: () => void;
  onRefreshBalance?: () => void;
  onImportWorkflowToGenerator: (workflow: SeedanceWorkflowAttachment, sourcePost: GroupPost) => void;
  onLaunchGroupStream: (group: CommunityGroup, streamIdToJoin?: string) => void;
}

export const SeedanceCommunityView: React.FC<SeedanceCommunityViewProps> = ({
  currentUserId,
  currentCredits,
  isAuthenticated,
  isPlatformAdmin = false,
  onRequireAuth,
  onOpenCredits,
  onRefreshBalance,
  onImportWorkflowToGenerator,
  onLaunchGroupStream,
}) => {
  const [section, setSection] = useState<CommunityMenuSection>('discover');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [myGroups, setMyGroups] = useState<CommunityGroup[]>([]);
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [feedPosts, setFeedPosts] = useState<GroupPost[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<CommunityUserProfile[]>([]);
  const [followingPosts, setFollowingPosts] = useState<GroupPost[]>([]);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [giftHistory, setGiftHistory] = useState<{
    sent: VirtualGiftTransaction[];
    received: VirtualGiftTransaction[];
  }>({ sent: [], received: [] });

  // Discovery Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [interestFilter, setInterestFilter] = useState('');
  const [sortMode, setSortMode] = useState<'recommended' | 'popular' | 'recent'>('recommended');

  // Feed Filters
  const [feedPostType, setFeedPostType] = useState<'ALL' | GroupPostType>('ALL');
  const [feedSavedOnly, setFeedSavedOnly] = useState(false);

  // Create Group Form
  const [cgName, setCgName] = useState('');
  const [cgDesc, setCgDesc] = useState('');
  const [cgCategory, setCgCategory] = useState('AI Filmmaking');
  const [cgInterests, setCgInterests] = useState('');
  const [cgVisibility, setCgVisibility] = useState<GroupVisibility>('PUBLIC');
  const [cgJoinMode, setCgJoinMode] = useState<GroupJoinMode>('OPEN');
  const [cgCoverUrl, setCgCoverUrl] = useState('');
  const [cgIconUrl, setCgIconUrl] = useState('');
  const [cgRules, setCgRules] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // User Profile Drawer State
  const [profileData, setProfileData] = useState<{
    profile: CommunityUserProfile;
    joinedGroups: CommunityGroup[];
    posts: GroupPost[];
    workflows: GroupPost[];
    livestreams: LivestreamSession[];
    receivedGiftsCount: number;
    receivedGiftsCredits: number;
    receivedGiftsRecent: VirtualGiftTransaction[];
    isFollowing: boolean;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editingMyProfile, setEditingMyProfile] = useState(false);
  const [profBioDraft, setProfBioDraft] = useState('');
  const [profInterestsDraft, setProfInterestsDraft] = useState('');
  const [profPrivacyDraft, setProfPrivacyDraft] = useState({
    showJoinedGroups: true,
    showReceivedGifts: true,
    showPosts: true,
  });

  // Gift Modal & Celebration Toast
  const [giftTarget, setGiftTarget] = useState<{
    userId: string;
    username: string;
    displayName: string;
    groupId?: string;
    postId?: string;
  } | null>(null);
  const [celebrationTx, setCelebrationTx] = useState<VirtualGiftTransaction | null>(null);

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const coverUploadRef = useRef<HTMLInputElement>(null);
  const iconUploadRef = useRef<HTMLInputElement>(null);

  const loadMetaAndDiscovery = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, discRes] = await Promise.all([
        seedanceCommunityService.getMeta(),
        seedanceCommunityService.discoverGroups({
          search: searchQuery,
          category: categoryFilter,
          interest: interestFilter,
          sort: sortMode,
        }),
      ]);
      setCategories(metaRes.categories || []);
      setGroups(discRes.groups || []);
      if (metaRes.categories?.length && !cgCategory) {
        setCgCategory(metaRes.categories[0].name);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Unable to load community directory.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, interestFilter, sortMode, cgCategory]);

  const loadAuthenticatedSocial = useCallback(async () => {
    if (!isAuthenticated) {
      setMyGroups([]);
      setInvitations([]);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      const [myRes, invRes, notifRes] = await Promise.all([
        seedanceCommunityService.discoverGroups({ sort: 'my_groups' }),
        seedanceCommunityService.getInvitations(),
        seedanceCommunityService.getNotifications(),
      ]);
      setMyGroups(myRes.groups || []);
      setInvitations(invRes.invitations || []);
      setNotifications(notifRes.notifications || []);
      setUnreadCount(notifRes.unreadCount || 0);
    } catch {
      // non-fatal background sync
    }
  }, [isAuthenticated]);

  const loadSectionData = useCallback(async () => {
    if (section === 'feed') {
      try {
        const res = await seedanceCommunityService.getCommunityFeed({
          postType: feedPostType,
          savedOnly: feedSavedOnly,
        });
        setFeedPosts(res.posts || []);
      } catch (err: any) {
        setNotice(err?.message || 'Unable to load community feed.');
      }
    } else if (section === 'following' && isAuthenticated) {
      try {
        const res = await seedanceCommunityService.getFollowingFeed();
        setFollowingProfiles(res.followingProfiles || []);
        setFollowingPosts(res.posts || []);
      } catch (err: any) {
        setNotice(err?.message || 'Unable to load following feed.');
      }
    } else if (section === 'gifts' && isAuthenticated) {
      try {
        const res = await seedanceCommunityService.getGiftHistory();
        setGiftHistory({ sent: res.sent || [], received: res.received || [] });
      } catch (err: any) {
        setNotice(err?.message || 'Unable to load gift ledger.');
      }
    }
  }, [section, feedPostType, feedSavedOnly, isAuthenticated]);

  useEffect(() => {
    loadMetaAndDiscovery();
  }, [loadMetaAndDiscovery]);

  useEffect(() => {
    loadAuthenticatedSocial();
  }, [loadAuthenticatedSocial]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const openCreatorProfile = async (uid: string) => {
    setSelectedProfileUid(uid);
    setProfileLoading(true);
    setEditingMyProfile(false);
    try {
      const res = await seedanceCommunityService.getUserProfileView(uid);
      setProfileData(res);
      setProfBioDraft(res.profile.bio || '');
      setProfInterestsDraft((res.profile.interests || []).join(', '));
      setProfPrivacyDraft(res.profile.privacy);
    } catch (err: any) {
      setNotice(err?.message || 'Unable to load creator profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUploadGroupImage = async (file: File, target: 'cover' | 'icon') => {
    setUploadingCover(true);
    try {
      const res = await uploadCommunityMediaFile(file);
      if (target === 'cover') setCgCoverUrl(res.url);
      else setCgIconUrl(res.url);
    } catch (err: any) {
      setNotice(err?.message || 'Upload failed.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setCreatingGroup(true);
    setNotice(null);
    try {
      const res = await seedanceCommunityService.createGroup({
        name: cgName.trim(),
        description: cgDesc.trim(),
        category: cgCategory,
        interests: cgInterests
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        coverImageUrl: cgCoverUrl.trim() || undefined,
        iconImageUrl: cgIconUrl.trim() || undefined,
        rulesText: cgRules.trim() || undefined,
        visibility: cgVisibility,
        joinMode: cgJoinMode,
      });
      setCgName('');
      setCgDesc('');
      setCgInterests('');
      setCgCoverUrl('');
      setCgIconUrl('');
      setCgRules('');
      setNotice(`Created ${res.group.visibility} group "${res.group.name}".`);
      await Promise.all([loadMetaAndDiscovery(), loadAuthenticatedSocial()]);
      setSelectedGroupId(res.group.id);
    } catch (err: any) {
      setNotice(err?.message || 'Failed to create group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleNotificationClick = async (n: CommunityNotification) => {
    if (!n.isRead) {
      try {
        const res = await seedanceCommunityService.markNotificationsRead(n.id);
        setUnreadCount(res.unreadCount);
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x))
        );
      } catch {
        // ignore
      }
    }

    if (n.deepLink.section === 'invitations') {
      setSelectedGroupId(null);
      setSection('invitations');
    } else if (n.deepLink.section === 'gifts') {
      setSelectedGroupId(null);
      setSection('gifts');
    } else if (n.deepLink.section === 'profile' && n.deepLink.userId) {
      openCreatorProfile(n.deepLink.userId);
    } else if (n.deepLink.groupId) {
      setSelectedGroupId(n.deepLink.groupId);
    }
  };

  const pendingInvitationsCount = invitations.filter(
    (i) => i.inviteeId === currentUserId && i.status === 'PENDING'
  ).length;

  const renderGroupCard = (g: CommunityGroup) => {
    const isMem = g.viewerMembership?.status === 'ACTIVE';
    return (
      <div
        key={g.id}
        className="rounded-2xl border border-white/[0.12] bg-white/[0.03] hover:border-white/25 transition-all overflow-hidden flex flex-col justify-between"
      >
        <div>
          {g.coverImageUrl ? (
            <div className="h-32 w-full bg-black border-b border-white/[0.08] overflow-hidden">
              <img src={g.coverImageUrl} alt={g.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-20 w-full bg-gradient-to-r from-white/[0.06] to-white/[0.02] border-b border-white/[0.08] flex items-center px-5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                {g.category}
              </span>
            </div>
          )}

          <div className="p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase text-white/60">
              <span className="inline-flex items-center gap-1 text-white font-semibold">
                {g.visibility === 'PRIVATE' ? (
                  <Lock className="w-3 h-3" />
                ) : (
                  <Globe className="w-3 h-3" />
                )}
                {g.visibility}
              </span>
              <span className="tabular-nums">
                {g.memberCount} Members · {g.postCount} Posts
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {g.iconImageUrl && (
                <img
                  src={g.iconImageUrl}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover border border-white/20 shrink-0"
                />
              )}
              <h3 className="text-base font-serif font-medium text-white truncate">{g.name}</h3>
            </div>

            <p className="text-xs text-white/65 line-clamp-2 min-h-[2rem]">
              {g.description || 'Seedance collaborative studio group.'}
            </p>

            <div className="text-[11px] font-mono text-white/45 truncate">
              Owner: @{g.ownerUsername} · {g.settings.joinMode.replace('_', ' ')}
            </div>

            {g.interests.length > 0 && (
              <div className="text-[10px] font-mono text-white/55 truncate">
                {g.interests.slice(0, 4).join(' · ')}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedGroupId(g.id)}
            className="flex-1 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
          >
            {isMem ? 'Open Group' : g.visibility === 'PRIVATE' ? 'Inspect & Request' : 'Enter Group'}
          </button>
          {!isMem && !g.viewerPendingRequest && g.visibility === 'PUBLIC' && g.settings.joinMode === 'OPEN' && (
            <button
              type="button"
              onClick={async () => {
                if (!isAuthenticated) {
                  onRequireAuth?.();
                  return;
                }
                await seedanceCommunityService.joinOrRequestGroup(g.id);
                loadMetaAndDiscovery();
                loadAuthenticatedSocial();
              }}
              className="px-3.5 py-2 rounded-xl border border-white/20 text-xs font-mono uppercase hover:bg-white/[0.08] cursor-pointer"
            >
              Join
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <GiftAnimationOverlay giftTx={celebrationTx} onDismiss={() => setCelebrationTx(null)} />

      <div className="max-w-[1620px] mx-auto space-y-6 pb-20">
        {/* Community Main Header & Sub-Navigation */}
        {!selectedGroupId && (
          <section className="rounded-2xl border border-white/[0.12] bg-white/[0.035] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-white" />
                  <h1 className="text-lg font-mono font-semibold uppercase tracking-tight">
                    Seedance Lab Community & Groups
                  </h1>
                </div>
                <p className="text-xs text-white/60">
                  Discover creative groups, exchange Seedance workflows, host group livestreams, follow directors, and send virtual gifts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAuthenticated && currentUserId && (
                  <button
                    type="button"
                    onClick={() => openCreatorProfile(currentUserId)}
                    className="px-3.5 py-2 rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.09] text-xs font-mono text-white cursor-pointer"
                  >
                    My Creator Profile
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    loadMetaAndDiscovery();
                    loadAuthenticatedSocial();
                    loadSectionData();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-white/20 bg-white/[0.04] hover:bg-white/[0.09] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Required Community Menu Items */}
            <nav className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/[0.1] text-xs font-mono">
              {[
                { id: 'discover', label: 'Discover Groups', icon: <Compass className="w-3.5 h-3.5" /> },
                {
                  id: 'my_groups',
                  label: `My Groups (${myGroups.length})`,
                  icon: <FolderHeart className="w-3.5 h-3.5" />,
                },
                {
                  id: 'invitations',
                  label: `Group Invitations${pendingInvitationsCount > 0 ? ` (${pendingInvitationsCount})` : ''}`,
                  icon: <Mail className="w-3.5 h-3.5" />,
                },
                { id: 'following', label: 'Following', icon: <UserCheck className="w-3.5 h-3.5" /> },
                { id: 'feed', label: 'Community Feed', icon: <Layers className="w-3.5 h-3.5" /> },
                {
                  id: 'notifications',
                  label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`,
                  icon: <Bell className="w-3.5 h-3.5" />,
                },
                { id: 'gifts', label: 'Gift Ledger', icon: <Gift className="w-3.5 h-3.5" /> },
                { id: 'create', label: 'Create Group', icon: <Plus className="w-3.5 h-3.5" /> },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedGroupId(null);
                    setSection(item.id as CommunityMenuSection);
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                    section === item.id
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/70 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </section>
        )}

        {notice && !selectedGroupId && (
          <div className="p-3.5 rounded-xl border border-white/20 bg-white/[0.05] flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SELECTED GROUP DETAIL WORKSPACE */}
        {selectedGroupId ? (
          <GroupDetailView
            groupId={selectedGroupId}
            currentUserId={currentUserId}
            isAuthenticated={isAuthenticated}
            isPlatformAdmin={isPlatformAdmin}
            categories={categories}
            onBack={() => {
              setSelectedGroupId(null);
              loadMetaAndDiscovery();
              loadAuthenticatedSocial();
            }}
            onRequireAuth={onRequireAuth}
            onGroupDeleted={() => {
              setSelectedGroupId(null);
              loadMetaAndDiscovery();
              loadAuthenticatedSocial();
            }}
            onImportWorkflow={onImportWorkflowToGenerator}
            onOpenUserProfile={openCreatorProfile}
            onOpenGiftModal={(r) => setGiftTarget(r)}
            onLaunchGroupStream={onLaunchGroupStream}
          />
        ) : (
          <>
            {/* SECTION 1: DISCOVER GROUPS */}
            {section === 'discover' && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs font-mono">
                  <div className="md:col-span-5 relative">
                    <Search className="w-4 h-4 text-white/40 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search groups by name or description..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/[0.14] bg-black text-white"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="md:col-span-3 p-2.5 rounded-xl border border-white/[0.14] bg-black text-white"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={interestFilter}
                    onChange={(e) => setInterestFilter(e.target.value)}
                    placeholder="Filter by interest tag..."
                    className="md:col-span-2 px-3 py-2.5 rounded-xl border border-white/[0.14] bg-black text-white"
                  />
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                    className="md:col-span-2 p-2.5 rounded-xl border border-white/[0.14] bg-black text-white"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="popular">Popular</option>
                    <option value="recent">Recently Active</option>
                  </select>
                </div>

                {groups.length === 0 ? (
                  <div className="p-12 rounded-2xl border border-white/[0.1] bg-white/[0.025] text-center space-y-3">
                    <Compass className="w-8 h-8 text-white/30 mx-auto" />
                    <h2 className="text-base font-medium text-white">No Community Groups Yet</h2>
                    <p className="text-xs text-white/55 max-w-md mx-auto">
                      Only real creator-owned groups stored in the database appear here. Create the first Seedance studio group to begin collaborating.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isAuthenticated) {
                          onRequireAuth?.();
                          return;
                        }
                        setSection('create');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
                    >
                      Create First Group
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map(renderGroupCard)}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: MY GROUPS */}
            {section === 'my_groups' && (
              <div className="space-y-4">
                {!isAuthenticated ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center space-y-3">
                    <p className="text-xs font-mono text-white/60">Sign in to view your groups.</p>
                    <button
                      type="button"
                      onClick={onRequireAuth}
                      className="px-5 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                ) : myGroups.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center space-y-3">
                    <p className="text-xs font-mono text-white/60">
                      You have not joined any groups yet.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSection('discover')}
                      className="px-5 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
                    >
                      Discover Groups
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myGroups.map(renderGroupCard)}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 3: GROUP INVITATIONS */}
            {section === 'invitations' && (
              <div className="space-y-4">
                {!isAuthenticated ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center space-y-3">
                    <p className="text-xs font-mono text-white/60">Sign in to manage invitations.</p>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                    No group invitations received or sent yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((inv) => {
                      const isInvitee = inv.inviteeId === currentUserId;
                      return (
                        <div
                          key={inv.id}
                          className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-wrap items-center justify-between gap-4 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-white/55">
                              <span>{inv.groupVisibility}</span>
                              <span>·</span>
                              <span>{inv.groupCategory}</span>
                              <span>·</span>
                              <span className="text-white font-semibold">{inv.status}</span>
                            </div>
                            <div className="text-sm font-semibold text-white">{inv.groupName}</div>
                            <div className="text-white/65">
                              {isInvitee
                                ? `Invited by @${inv.inviterUsername}`
                                : `You invited @${inv.inviteeUsername || inv.inviteeId}`}
                              {inv.message ? ` — "${inv.message}"` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            {isInvitee && inv.status === 'PENDING' ? (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await seedanceCommunityService.respondToInvitation(inv.id, true);
                                    await Promise.all([loadAuthenticatedSocial(), loadMetaAndDiscovery()]);
                                    setSelectedGroupId(inv.groupId);
                                  }}
                                  className="px-4 py-2 rounded-lg bg-white text-black font-semibold text-[11px] uppercase cursor-pointer"
                                >
                                  Accept & Join
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await seedanceCommunityService.respondToInvitation(inv.id, false);
                                    loadAuthenticatedSocial();
                                  }}
                                  className="px-3.5 py-2 rounded-lg border border-white/20 text-[11px] uppercase cursor-pointer"
                                >
                                  Decline
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setSelectedGroupId(inv.groupId)}
                                className="px-3.5 py-2 rounded-lg border border-white/20 text-[11px] uppercase cursor-pointer"
                              >
                                View Group
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: FOLLOWING */}
            {section === 'following' && (
              <div className="space-y-5">
                {!isAuthenticated ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center space-y-3">
                    <p className="text-xs font-mono text-white/60">
                      Sign in to follow creators and view their published Seedance work.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                      <div className="text-xs font-mono uppercase text-white/60">
                        Followed Creators ({followingProfiles.length})
                      </div>
                      {followingProfiles.length === 0 ? (
                        <p className="text-xs text-white/50">
                          Click any creator name on posts or member directories to follow them.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {followingProfiles.map((fp) => (
                            <button
                              key={fp.userId}
                              type="button"
                              onClick={() => openCreatorProfile(fp.userId)}
                              className="px-3 py-1.5 rounded-lg border border-white/15 bg-black/60 hover:border-white/35 text-xs font-mono cursor-pointer"
                            >
                              {fp.displayName} (@{fp.username})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {followingPosts.length === 0 ? (
                      <div className="p-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                        No recent visible posts from followed creators yet.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {followingPosts.map((p) => (
                          <GroupPostCard
                            key={p.id}
                            post={p}
                            currentUserId={currentUserId}
                            isAuthenticated={isAuthenticated}
                            onRequireAuth={onRequireAuth}
                            onPostUpdated={(upd) =>
                              setFollowingPosts((prev) =>
                                prev.map((x) => (x.id === upd.id ? upd : x))
                              )
                            }
                            onPostDeleted={(pid) =>
                              setFollowingPosts((prev) => prev.filter((x) => x.id !== pid))
                            }
                            onImportWorkflow={onImportWorkflowToGenerator}
                            onOpenGroup={(gid) => setSelectedGroupId(gid)}
                            onOpenUserProfile={openCreatorProfile}
                            onOpenGiftModal={(r) => setGiftTarget(r)}
                            onNotice={setNotice}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* SECTION 5: COMMUNITY FEED */}
            {section === 'feed' && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex flex-wrap gap-1.5">
                    {(['ALL', 'WORKFLOW', 'VIDEO', 'IMAGE', 'TEXT', 'LIVESTREAM'] as const).map(
                      (pt) => (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => setFeedPostType(pt)}
                          className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                            feedPostType === pt
                              ? 'bg-white text-black border-white font-semibold'
                              : 'bg-white/[0.03] text-white/65 border-white/[0.1]'
                          }`}
                        >
                          {pt}
                        </button>
                      )
                    )}
                  </div>

                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setFeedSavedOnly(!feedSavedOnly)}
                      className={`px-3.5 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                        feedSavedOnly
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-white/[0.03] text-white/75 border-white/15'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Bookmarked Workflows & Posts</span>
                    </button>
                  )}
                </div>

                {feedPosts.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                    No community feed posts match your filter yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedPosts.map((p) => (
                      <GroupPostCard
                        key={p.id}
                        post={p}
                        currentUserId={currentUserId}
                        isAuthenticated={isAuthenticated}
                        onRequireAuth={onRequireAuth}
                        onPostUpdated={(upd) =>
                          setFeedPosts((prev) => prev.map((x) => (x.id === upd.id ? upd : x)))
                        }
                        onPostDeleted={(pid) =>
                          setFeedPosts((prev) => prev.filter((x) => x.id !== pid))
                        }
                        onImportWorkflow={onImportWorkflowToGenerator}
                        onOpenGroup={(gid) => setSelectedGroupId(gid)}
                        onOpenUserProfile={openCreatorProfile}
                        onOpenGiftModal={(r) => setGiftTarget(r)}
                        onNotice={setNotice}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: NOTIFICATIONS */}
            {section === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-white/60">
                    Activity Notifications ({unreadCount} unread)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await seedanceCommunityService.markNotificationsRead();
                        setUnreadCount(res.unreadCount);
                        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono uppercase cursor-pointer hover:bg-white/[0.08]"
                    >
                      Mark All Read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                    No community notifications yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                          n.isRead
                            ? 'border-white/[0.08] bg-white/[0.02] text-white/70'
                            : 'border-white/30 bg-white/[0.06] text-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-semibold flex items-center gap-2">
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-white inline-block" />
                            )}
                            <span>{n.title}</span>
                          </div>
                          <p className="text-xs opacity-80">{n.body}</p>
                        </div>
                        <span className="text-[10px] font-mono opacity-50 shrink-0">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 7: VIRTUAL GIFT LEDGER */}
            {section === 'gifts' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                  <h3 className="font-mono uppercase font-semibold">
                    Virtual Gifts Received ({giftHistory.received.length})
                  </h3>
                  {giftHistory.received.length === 0 ? (
                    <p className="text-white/45 font-mono">No virtual gifts received yet.</p>
                  ) : (
                    giftHistory.received.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-white/[0.08] bg-black/50 flex justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {t.giftName} from @{t.senderUsername}
                          </div>
                          {t.note && <p className="text-white/65 italic">“{t.note}”</p>}
                          <div className="text-[10px] font-mono text-white/45">
                            {new Date(t.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className="font-mono font-bold tabular-nums">{t.creditCost} CR</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                  <h3 className="font-mono uppercase font-semibold">
                    Virtual Gifts Sent ({giftHistory.sent.length})
                  </h3>
                  {giftHistory.sent.length === 0 ? (
                    <p className="text-white/45 font-mono">No virtual gifts sent yet.</p>
                  ) : (
                    giftHistory.sent.map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-white/[0.08] bg-black/50 flex justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-white">
                            {t.giftName} to @{t.recipientUsername}
                          </div>
                          {t.note && <p className="text-white/65 italic">“{t.note}”</p>}
                          <div className="text-[10px] font-mono text-white/45">
                            {new Date(t.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span className="font-mono font-bold tabular-nums">-{t.creditCost} CR</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* SECTION 8: CREATE GROUP */}
            {section === 'create' && (
              <form
                onSubmit={handleCreateGroup}
                className="max-w-2xl rounded-2xl border border-white/[0.14] bg-white/[0.03] p-6 space-y-4 text-xs"
              >
                <div className="space-y-1">
                  <h2 className="text-base font-mono uppercase font-semibold">
                    Create Community Group
                  </h2>
                  <p className="text-white/55">
                    Launch a public creator collective or a private studio group protected by strict server-side membership gates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={cgName}
                    onChange={(e) => setCgName(e.target.value)}
                    placeholder="Group Name"
                    className="p-2.5 rounded-lg border border-white/15 bg-black text-white text-sm"
                  />
                  <select
                    value={cgCategory}
                    onChange={(e) => setCgCategory(e.target.value)}
                    className="p-2.5 rounded-lg border border-white/15 bg-black text-white"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={3}
                  value={cgDesc}
                  onChange={(e) => setCgDesc(e.target.value)}
                  placeholder="Group purpose, workflow focus, and creative mission..."
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />

                <input
                  type="text"
                  value={cgInterests}
                  onChange={(e) => setCgInterests(e.target.value)}
                  placeholder="Interest tags (comma separated, e.g. seedance 2.5, r2v, noir, architecture)"
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />

                {/* Real Image Uploads for Cover & Icon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] text-white/60">Cover Image</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cgCoverUrl}
                        onChange={(e) => setCgCoverUrl(e.target.value)}
                        placeholder="/uploads/... or image URL"
                        className="flex-1 p-2 rounded-lg border border-white/15 bg-black text-white"
                      />
                      <input
                        ref={coverUploadRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadGroupImage(f, 'cover');
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => coverUploadRef.current?.click()}
                        className="px-2.5 py-2 rounded-lg border border-white/20 hover:bg-white/[0.08] font-mono cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-[11px] text-white/60">Group Icon</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cgIconUrl}
                        onChange={(e) => setCgIconUrl(e.target.value)}
                        placeholder="/uploads/... or icon URL"
                        className="flex-1 p-2 rounded-lg border border-white/15 bg-black text-white"
                      />
                      <input
                        ref={iconUploadRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadGroupImage(f, 'icon');
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingCover}
                        onClick={() => iconUploadRef.current?.click()}
                        className="px-2.5 py-2 rounded-lg border border-white/20 hover:bg-white/[0.08] font-mono cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Visibility & Join Mode */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1">Visibility</label>
                    <select
                      value={cgVisibility}
                      onChange={(e) => {
                        const vis = e.target.value as GroupVisibility;
                        setCgVisibility(vis);
                        if (vis === 'PRIVATE' && cgJoinMode === 'OPEN') {
                          setCgJoinMode('APPROVAL_REQUIRED');
                        }
                      }}
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                    >
                      <option value="PUBLIC">PUBLIC (Open Discovery)</option>
                      <option value="PRIVATE">PRIVATE (Members Only)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/60 mb-1">Join Mode</label>
                    <select
                      value={cgJoinMode}
                      onChange={(e) => setCgJoinMode(e.target.value as GroupJoinMode)}
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                    >
                      {cgVisibility === 'PUBLIC' && <option value="OPEN">OPEN (Instant Join)</option>}
                      <option value="APPROVAL_REQUIRED">APPROVAL REQUIRED</option>
                      <option value="INVITE_ONLY">INVITE ONLY</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={cgRules}
                  onChange={(e) => setCgRules(e.target.value)}
                  placeholder="Group rules (optional)"
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />

                <button
                  type="submit"
                  disabled={creatingGroup || uploadingCover}
                  className="px-6 py-3 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
                >
                  {creatingGroup ? 'Creating Group...' : 'Launch Group'}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* CREATOR PROFILE DRAWER MODAL */}
      {selectedProfileUid && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#08080a] p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-white/[0.1] pb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-white/60">
                Seedance Creator Profile
              </span>
              <button
                type="button"
                onClick={() => setSelectedProfileUid(null)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileLoading || !profileData ? (
              <div className="py-10 text-center text-xs font-mono text-white/50">
                Loading creator profile...
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-serif font-medium">
                      {profileData.profile.displayName}
                    </h2>
                    <div className="text-xs font-mono text-white/55 tabular-nums">
                      @{profileData.profile.username} · {profileData.profile.followerIds.length}{' '}
                      Followers · {profileData.profile.followingIds.length} Following
                    </div>
                    {profileData.profile.bio && (
                      <p className="text-xs text-white/80 max-w-xl pt-1">{profileData.profile.bio}</p>
                    )}
                    {profileData.profile.interests.length > 0 && (
                      <div className="text-[11px] font-mono text-white/55 pt-1">
                        Interests: {profileData.profile.interests.join(' · ')}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    {currentUserId === profileData.profile.userId ? (
                      <button
                        type="button"
                        onClick={() => setEditingMyProfile(!editingMyProfile)}
                        className="px-3.5 py-2 rounded-xl border border-white/20 text-xs uppercase cursor-pointer"
                      >
                        {editingMyProfile ? 'Close Editor' : 'Edit Profile & Privacy'}
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!isAuthenticated) {
                              onRequireAuth?.();
                              return;
                            }
                            await seedanceCommunityService.toggleFollowCreator(
                              profileData.profile.userId
                            );
                            openCreatorProfile(profileData.profile.userId);
                            loadSectionData();
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase cursor-pointer flex items-center gap-1.5 ${
                            profileData.isFollowing
                              ? 'border border-white/25 text-white'
                              : 'bg-white text-black'
                          }`}
                        >
                          {profileData.isFollowing ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Following
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" /> Follow
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setGiftTarget({
                              userId: profileData.profile.userId,
                              username: profileData.profile.username,
                              displayName: profileData.profile.displayName,
                            })
                          }
                          className="px-3.5 py-2 rounded-xl border border-white/25 bg-white/[0.06] text-xs uppercase cursor-pointer flex items-center gap-1.5"
                        >
                          <Gift className="w-3.5 h-3.5" /> Gift
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Self Profile Editor & Privacy Toggles */}
                {editingMyProfile && currentUserId === profileData.profile.userId && (
                  <div className="p-4 rounded-xl border border-white/20 bg-black/60 space-y-3 text-xs">
                    <textarea
                      rows={2}
                      value={profBioDraft}
                      onChange={(e) => setProfBioDraft(e.target.value)}
                      placeholder="Creator bio..."
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                    />
                    <input
                      type="text"
                      value={profInterestsDraft}
                      onChange={(e) => setProfInterestsDraft(e.target.value)}
                      placeholder="Creative interests (comma separated)"
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                    />
                    <div className="flex flex-wrap gap-4 font-mono">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profPrivacyDraft.showJoinedGroups}
                          onChange={(e) =>
                            setProfPrivacyDraft({
                              ...profPrivacyDraft,
                              showJoinedGroups: e.target.checked,
                            })
                          }
                        />
                        <span>Show Joined Groups</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profPrivacyDraft.showPosts}
                          onChange={(e) =>
                            setProfPrivacyDraft({
                              ...profPrivacyDraft,
                              showPosts: e.target.checked,
                            })
                          }
                        />
                        <span>Show Published Posts</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profPrivacyDraft.showReceivedGifts}
                          onChange={(e) =>
                            setProfPrivacyDraft({
                              ...profPrivacyDraft,
                              showReceivedGifts: e.target.checked,
                            })
                          }
                        />
                        <span>Show Received Gifts</span>
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await seedanceCommunityService.updateMyProfile({
                          bio: profBioDraft,
                          interests: profInterestsDraft
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                          privacy: profPrivacyDraft,
                        });
                        setEditingMyProfile(false);
                        openCreatorProfile(profileData.profile.userId);
                      }}
                      className="px-4 py-2 rounded-lg bg-white text-black font-mono font-semibold uppercase cursor-pointer"
                    >
                      Save Profile
                    </button>
                  </div>
                )}

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="text-white/45 text-[10px]">JOINED GROUPS</div>
                    <div className="text-base font-bold">{profileData.joinedGroups.length}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="text-white/45 text-[10px]">PUBLISHED POSTS</div>
                    <div className="text-base font-bold">{profileData.posts.length}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="text-white/45 text-[10px]">WORKFLOWS</div>
                    <div className="text-base font-bold">{profileData.workflows.length}</div>
                  </div>
                  <div className="p-3 rounded-xl border border-white/10 bg-white/[0.03]">
                    <div className="text-white/45 text-[10px]">GIFTS RECEIVED</div>
                    <div className="text-base font-bold">
                      {profileData.receivedGiftsCount} ({profileData.receivedGiftsCredits} CR)
                    </div>
                  </div>
                </div>

                {profileData.joinedGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-mono uppercase text-white/55">Groups</div>
                    <div className="flex flex-wrap gap-2">
                      {profileData.joinedGroups.map((jg) => (
                        <button
                          key={jg.id}
                          type="button"
                          onClick={() => {
                            setSelectedProfileUid(null);
                            setSelectedGroupId(jg.id);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-white/15 bg-black/50 hover:border-white/35 text-xs font-mono cursor-pointer"
                        >
                          {jg.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIRTUAL GIFT MODAL */}
      {giftTarget && (
        <VirtualGiftModal
          isOpen={Boolean(giftTarget)}
          onClose={() => setGiftTarget(null)}
          recipientId={giftTarget.userId}
          recipientUsername={giftTarget.username}
          recipientDisplayName={giftTarget.displayName}
          groupId={giftTarget.groupId}
          postId={giftTarget.postId}
          currentCredits={currentCredits}
          isAuthenticated={isAuthenticated}
          onRequireAuth={onRequireAuth}
          onOpenCredits={onOpenCredits}
          onGiftSent={(tx) => {
            setCelebrationTx(tx);
            onRefreshBalance?.();
            loadSectionData();
          }}
        />
      )}
    </div>
  );
};
