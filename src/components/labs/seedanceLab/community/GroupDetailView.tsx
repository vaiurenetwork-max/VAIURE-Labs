/**
 * VAIURE — SEEDANCE COMMUNITY GROUP WORKSPACE VIEW
 * Full real group management: Feed + Seedance Workflow Publisher, Announcements & Events,
 * Group Livestreams, Members & RBAC Moderation Logs, and 6-Category Group Settings.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Film,
  Image as ImageIcon,
  Layers,
  Lock,
  Megaphone,
  Plus,
  Radio,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  Users,
  Video,
  Globe,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  CommunityCategory,
  CommunityGroup,
  GroupAnnouncement,
  GroupEvent,
  GroupEventType,
  GroupJoinMode,
  GroupJoinRequest,
  GroupMember,
  GroupModerationLog,
  GroupPermissionLevel,
  GroupPost,
  GroupPostStatus,
  GroupPostType,
  GroupRole,
  GroupVisibility,
  LivestreamSession,
  SeedanceWorkflowAttachment,
  SeedanceWorkflowSceneStep,
} from '../../../../types/seedancePlatform';
import { seedanceLabService, SeedanceHistoryItem } from '../../../../services/seedanceLabService';
import {
  seedanceCommunityService,
  uploadCommunityMediaFile,
} from '../../../../services/seedanceCommunityService';
import { livestreamService } from '../../../../services/seedanceWorkspaceService';
import { GroupPostCard } from './GroupPostCard';

interface GroupDetailViewProps {
  groupId: string;
  currentUserId?: string;
  isAuthenticated: boolean;
  isPlatformAdmin?: boolean;
  categories: CommunityCategory[];
  onBack: () => void;
  onRequireAuth?: () => void;
  onGroupDeleted?: () => void;
  onImportWorkflow: (workflow: SeedanceWorkflowAttachment, sourcePost: GroupPost) => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenGiftModal: (recipient: {
    userId: string;
    username: string;
    displayName: string;
    groupId: string;
    postId: string;
  }) => void;
  onLaunchGroupStream: (group: CommunityGroup, streamIdToJoin?: string) => void;
}

type GroupTab = 'feed' | 'events' | 'streams' | 'members' | 'settings';

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  groupId,
  currentUserId,
  isAuthenticated,
  isPlatformAdmin = false,
  categories,
  onBack,
  onRequireAuth,
  onGroupDeleted,
  onImportWorkflow,
  onOpenUserProfile,
  onOpenGiftModal,
  onLaunchGroupStream,
}) => {
  const [group, setGroup] = useState<CommunityGroup | null>(null);
  const [canReadContent, setCanReadContent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<GroupTab>('feed');
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [postFilter, setPostFilter] = useState<'ALL' | GroupPostType | 'PENDING_APPROVAL'>('ALL');

  const [announcements, setAnnouncements] = useState<GroupAnnouncement[]>([]);
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [groupStreams, setGroupStreams] = useState<LivestreamSession[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<GroupJoinRequest[]>([]);
  const [modLogs, setModLogs] = useState<GroupModerationLog[]>([]);

  // Join Request / Invite modals
  const [joinMsg, setJoinMsg] = useState('');
  const [joining, setJoining] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  // Confirm Dialog State (zero window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    body: string;
    actionLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Composer State
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState<GroupPostType>('TEXT');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTagsText, setPostTagsText] = useState('');
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [recentGenHistory, setRecentGenHistory] = useState<SeedanceHistoryItem[]>([]);

  // Workflow Attachment Composer State
  const [wfTitle, setWfTitle] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfModelKey, setWfModelKey] = useState('seedance_25_15s_r2v');
  const [wfPrompt, setWfPrompt] = useState('');
  const [wfAspect, setWfAspect] = useState('16:9');
  const [wfResolution, setWfResolution] = useState<'480p' | '720p' | '1080p'>('720p');
  const [wfDuration, setWfDuration] = useState(15);
  const [wfPhysics, setWfPhysics] = useState(true);
  const [wfRating, setWfRating] = useState<'standard' | '18+'>('standard');
  const [wfScenes, setWfScenes] = useState<SeedanceWorkflowSceneStep[]>([]);

  // Announcement & Event Composer
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [evType, setEvType] = useState<GroupEventType>('MEETING');
  const [evStartsAt, setEvStartsAt] = useState('');
  const [evLocation, setEvLocation] = useState('');

  // Settings Form State
  const [settingsDraft, setSettingsDraft] = useState<{
    name: string;
    description: string;
    category: string;
    interestsText: string;
    coverImageUrl: string;
    iconImageUrl: string;
    rulesText: string;
    visibility: GroupVisibility;
    joinMode: GroupJoinMode;
    discoverableInSearch: boolean;
    whoCanPost: GroupPermissionLevel;
    whoCanInvite: GroupPermissionLevel;
    whoCanComment: 'EVERYONE' | 'MEMBERS_ONLY';
    whoCanStartLivestream: GroupPermissionLevel;
    requirePostApproval: boolean;
    allowWorkflowSharing: boolean;
    allowVirtualGifts: boolean;
    blockedKeywordsText: string;
  } | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  const imgUploadRef = useRef<HTMLInputElement>(null);
  const vidUploadRef = useRef<HTMLInputElement>(null);

  const isMember = group?.viewerMembership?.status === 'ACTIVE';
  const myRole = group?.viewerMembership?.role;
  const isStaff =
    isPlatformAdmin || myRole === 'OWNER' || myRole === 'ADMIN' || myRole === 'MODERATOR';
  const isGroupAdmin = isPlatformAdmin || myRole === 'OWNER' || myRole === 'ADMIN';
  const isOwner = isPlatformAdmin || myRole === 'OWNER';

  const loadGroupAll = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await seedanceCommunityService.getGroupDetail(groupId);
      setGroup(detail.group);
      setCanReadContent(detail.canReadContent);

      const g = detail.group;
      setSettingsDraft({
        name: g.name,
        description: g.description,
        category: g.category,
        interestsText: g.interests.join(', '),
        coverImageUrl: g.coverImageUrl,
        iconImageUrl: g.iconImageUrl,
        rulesText: g.rulesText,
        visibility: g.visibility,
        joinMode: g.settings.joinMode,
        discoverableInSearch: g.settings.discoverableInSearch,
        whoCanPost: g.settings.whoCanPost,
        whoCanInvite: g.settings.whoCanInvite,
        whoCanComment: g.settings.whoCanComment,
        whoCanStartLivestream: g.settings.whoCanStartLivestream,
        requirePostApproval: g.settings.requirePostApproval,
        allowWorkflowSharing: g.settings.allowWorkflowSharing,
        allowVirtualGifts: g.settings.allowVirtualGifts,
        blockedKeywordsText: (g.settings.blockedKeywords || []).join(', '),
      });

      if (detail.canReadContent) {
        const statusParam: GroupPostStatus | undefined =
          postFilter === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'PUBLISHED';
        const typeParam: GroupPostType | 'ALL' =
          postFilter === 'PENDING_APPROVAL' ? 'ALL' : postFilter;

        const [postsRes, annRes, evRes, streamRes, memRes] = await Promise.all([
          seedanceCommunityService.getGroupPosts(groupId, {
            postType: typeParam,
            status: statusParam,
          }),
          seedanceCommunityService.getAnnouncements(groupId),
          seedanceCommunityService.getEvents(groupId),
          livestreamService.listStreams(groupId),
          seedanceCommunityService.getGroupMembers(groupId),
        ]);
        setPosts(postsRes.posts || []);
        setAnnouncements(annRes.announcements || []);
        setEvents(evRes.events || []);
        setGroupStreams(streamRes.streams || []);
        setMembers(memRes.members || []);

        const gStaff =
          isPlatformAdmin ||
          g.viewerMembership?.role === 'OWNER' ||
          g.viewerMembership?.role === 'ADMIN' ||
          g.viewerMembership?.role === 'MODERATOR';
        if (gStaff && isAuthenticated) {
          const [reqRes, logRes] = await Promise.all([
            seedanceCommunityService.getGroupJoinRequests(groupId).catch(() => ({ requests: [] })),
            seedanceCommunityService.getGroupModerationLogs(groupId).catch(() => ({ logs: [] })),
          ]);
          setJoinRequests(reqRes.requests || []);
          setModLogs(logRes.logs || []);
        }
      } else {
        setPosts([]);
        setAnnouncements([]);
        setEvents([]);
        setGroupStreams([]);
        setMembers([]);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Unable to load group workspace.');
    } finally {
      setLoading(false);
    }
  }, [groupId, postFilter, isPlatformAdmin, isAuthenticated]);

  useEffect(() => {
    loadGroupAll();
  }, [loadGroupAll]);

  useEffect(() => {
    if (composerOpen && postType === 'WORKFLOW' && isAuthenticated && recentGenHistory.length === 0) {
      seedanceLabService
        .getHistory()
        .then((items) => setRecentGenHistory(items.slice(0, 8)))
        .catch(() => {});
    }
  }, [composerOpen, postType, isAuthenticated, recentGenHistory.length]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setJoining(true);
    setNotice(null);
    try {
      const res = await seedanceCommunityService.joinOrRequestGroup(groupId, joinMsg);
      setNotice(
        res.joined
          ? `Joined "${res.group.name}".`
          : 'Join request submitted for group moderator approval.'
      );
      setJoinMsg('');
      loadGroupAll();
    } catch (err: any) {
      setNotice(err?.message || 'Unable to join group.');
    } finally {
      setJoining(false);
    }
  };

  const handleUploadAsset = async (file: File, target: 'image' | 'video' | 'cover' | 'icon') => {
    setUploadingAsset(true);
    try {
      const res = await uploadCommunityMediaFile(file);
      if (target === 'image') {
        setPostImages((prev) => [...prev, res.url].slice(0, 12));
      } else if (target === 'video') {
        setPostVideoUrl(res.url);
      } else if (target === 'cover' && settingsDraft) {
        setSettingsDraft({ ...settingsDraft, coverImageUrl: res.url });
      } else if (target === 'icon' && settingsDraft) {
        setSettingsDraft({ ...settingsDraft, iconImageUrl: res.url });
      }
    } catch (err: any) {
      setNotice(err?.message || 'Upload failed.');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    try {
      const workflow: SeedanceWorkflowAttachment | undefined =
        postType === 'WORKFLOW'
          ? {
              title: wfTitle.trim() || postTitle.trim() || 'Seedance Workflow',
              description: wfDesc.trim(),
              modelKey: wfModelKey,
              prompt: wfPrompt.trim(),
              aspectRatio: wfAspect,
              resolution: wfResolution,
              duration: wfDuration,
              physicsPriority: wfPhysics,
              contentRating: wfRating,
              referenceImages: postImages,
              sceneSequences: wfScenes,
              attachments: [],
              resultVideoUrl: postVideoUrl || undefined,
            }
          : undefined;

      const res = await seedanceCommunityService.createPost(groupId, {
        postType,
        title: postTitle.trim(),
        body: postBody.trim(),
        tags: postTagsText
          .split(',')
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean),
        images: postImages,
        videoUrl: postVideoUrl.trim() || undefined,
        workflow,
      });

      setComposerOpen(false);
      setPostTitle('');
      setPostBody('');
      setPostTagsText('');
      setPostImages([]);
      setPostVideoUrl('');
      setWfTitle('');
      setWfDesc('');
      setWfPrompt('');
      setWfScenes([]);
      setNotice(
        res.post.status === 'PENDING_APPROVAL'
          ? 'Post submitted to moderator approval queue.'
          : 'Post published to group.'
      );
      loadGroupAll();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to publish post.');
    }
  };

  const handlePopulateFromJob = (job: SeedanceHistoryItem) => {
    setWfTitle(job.model_name ? `${job.model_name} (${job.job_code})` : `Seedance ${job.job_code}`);
    setWfPrompt(job.prompt || '');
    setWfModelKey(job.model || 'seedance_25_15s');
    if (job.parameters?.aspect_ratio) setWfAspect(String(job.parameters.aspect_ratio));
    if (job.result_url) setPostVideoUrl(job.result_url);
    if (Array.isArray(job.parameters?.reference_image_urls)) {
      setPostImages(
        job.parameters.reference_image_urls
          .filter((u): u is string => typeof u === 'string')
          .slice(0, 12)
      );
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteIdentifier.trim()) return;
    try {
      const res = await seedanceCommunityService.sendInvitation(
        groupId,
        inviteIdentifier.trim(),
        inviteMsg.trim() || undefined
      );
      setInviteModalOpen(false);
      setInviteIdentifier('');
      setInviteMsg('');
      setNotice(`Invitation sent to @${res.invitation.inviteeUsername || inviteIdentifier}.`);
    } catch (err: any) {
      setNotice(err?.message || 'Unable to send invitation.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsDraft || !group) return;
    setSavingSettings(true);
    try {
      await seedanceCommunityService.updateGroupSettings(group.id, {
        name: settingsDraft.name,
        description: settingsDraft.description,
        category: settingsDraft.category,
        interests: settingsDraft.interestsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        coverImageUrl: settingsDraft.coverImageUrl,
        iconImageUrl: settingsDraft.iconImageUrl,
        rulesText: settingsDraft.rulesText,
        visibility: settingsDraft.visibility,
        settings: {
          joinMode: settingsDraft.joinMode,
          discoverableInSearch: settingsDraft.discoverableInSearch,
          whoCanPost: settingsDraft.whoCanPost,
          whoCanInvite: settingsDraft.whoCanInvite,
          whoCanComment: settingsDraft.whoCanComment,
          whoCanStartLivestream: settingsDraft.whoCanStartLivestream,
          requirePostApproval: settingsDraft.requirePostApproval,
          allowWorkflowSharing: settingsDraft.allowWorkflowSharing,
          allowVirtualGifts: settingsDraft.allowVirtualGifts,
          blockedKeywords: settingsDraft.blockedKeywordsText
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        },
      });
      setNotice('Group settings updated and enforced immediately.');
      loadGroupAll();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to save group settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading && !group) {
    return (
      <div className="p-10 text-center text-xs font-mono text-white/50">
        Loading group workspace...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="text-xs font-mono text-white/60">Group not found or unavailable.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
        >
          Back to Community
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-20">
      {/* Top Bar Back */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.09] text-xs font-mono text-white/80 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Groups</span>
        </button>

        <button
          type="button"
          onClick={loadGroupAll}
          className="px-3 py-1.5 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.09] text-xs font-mono text-white/80 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl border border-white/25 bg-white/[0.06] flex items-center justify-between gap-3 text-xs font-mono">
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

      {/* Group Hero Banner */}
      <section className="rounded-2xl border border-white/[0.15] bg-white/[0.03] overflow-hidden">
        {group.coverImageUrl && (
          <div className="h-44 sm:h-56 w-full bg-black border-b border-white/[0.1] overflow-hidden">
            <img
              src={group.coverImageUrl}
              alt={group.name}
              className="w-full h-full object-cover opacity-85"
            />
          </div>
        )}

        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl border border-white/20 bg-black flex items-center justify-center shrink-0 overflow-hidden font-serif text-lg uppercase">
              {group.iconImageUrl ? (
                <img
                  src={group.iconImageUrl}
                  alt={group.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                group.name.slice(0, 2)
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/65">
                <span className="inline-flex items-center gap-1 text-white font-semibold">
                  {group.visibility === 'PRIVATE' ? (
                    <Lock className="w-3 h-3" />
                  ) : (
                    <Globe className="w-3 h-3" />
                  )}
                  {group.visibility}
                </span>
                <span>·</span>
                <span>{group.category}</span>
                <span>·</span>
                <span>{group.settings.joinMode.replace('_', ' ')}</span>
                {group.status !== 'ACTIVE' && (
                  <>
                    <span>·</span>
                    <span className="text-white font-bold">{group.status}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-serif font-medium text-white truncate">
                {group.name}
              </h1>

              {group.description && (
                <p className="text-xs sm:text-sm text-white/70 max-w-3xl font-sans">
                  {group.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-white/50 pt-1 tabular-nums">
                <span>
                  Owner:{' '}
                  <button
                    type="button"
                    onClick={() => onOpenUserProfile(group.ownerId)}
                    className="text-white/80 hover:text-white underline cursor-pointer"
                  >
                    @{group.ownerUsername}
                  </button>
                </span>
                <span>·</span>
                <span>{group.memberCount} Members</span>
                <span>·</span>
                <span>{group.postCount} Posts</span>
                {group.interests.length > 0 && (
                  <>
                    <span>·</span>
                    <span>{group.interests.join(' / ')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Group Membership Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isMember ? (
              <>
                {group.viewerMembership && (
                  <span className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/[0.05] text-[11px] font-mono uppercase">
                    Role: {group.viewerMembership.role}
                  </span>
                )}
                {isStaff || group.settings.whoCanInvite === 'EVERYONE' ? (
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite</span>
                  </button>
                ) : null}
                {(isStaff || group.settings.whoCanStartLivestream === 'EVERYONE') && (
                  <button
                    type="button"
                    onClick={() => onLaunchGroupStream(group)}
                    className="px-3.5 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Go Live</span>
                  </button>
                )}
                {myRole !== 'OWNER' && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        title: `Leave "${group.name}"?`,
                        body:
                          group.visibility === 'PRIVATE'
                            ? 'Leaving a private group revokes immediate access to private posts, workflows, and group livestreams.'
                            : 'You can rejoin later according to group join settings.',
                        actionLabel: 'Leave Group',
                        onConfirm: async () => {
                          await seedanceCommunityService.leaveGroup(group.id);
                          setConfirmModal(null);
                          loadGroupAll();
                        },
                      })
                    }
                    className="px-3 py-2 rounded-xl border border-white/15 hover:bg-white/[0.08] text-xs font-mono text-white/70 cursor-pointer"
                  >
                    Leave
                  </button>
                )}
              </>
            ) : group.viewerPendingRequest ? (
              <span className="px-4 py-2 rounded-xl border border-white/25 bg-white/[0.05] text-xs font-mono uppercase text-white/80">
                Join Request Pending
              </span>
            ) : (
              <button
                type="button"
                disabled={joining}
                onClick={handleJoin}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 cursor-pointer"
              >
                {group.visibility === 'PRIVATE' || group.settings.joinMode === 'APPROVAL_REQUIRED'
                  ? 'Request to Join'
                  : 'Join Group'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Strict Private Group Isolation Gate */}
      {!canReadContent ? (
        <section className="p-10 rounded-2xl border border-white/20 bg-white/[0.03] text-center space-y-4 max-w-xl mx-auto">
          <Lock className="w-9 h-9 text-white/50 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-base font-medium text-white">Private Group Access Restricted</h2>
            <p className="text-xs text-white/60">
              All posts, Seedance workflows, members, announcements, events, and livestreams in "{group.name}"
              are protected and visible only to approved members.
            </p>
          </div>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
            >
              Sign In to Request Access
            </button>
          ) : group.viewerPendingRequest ? (
            <div className="text-xs font-mono text-white/75">
              Your join request is awaiting group moderator approval.
            </div>
          ) : group.settings.joinMode === 'INVITE_ONLY' ? (
            <div className="text-xs font-mono text-white/60">
              This private group is invite-only. Check your Group Invitations tab if invited.
            </div>
          ) : (
            <div className="space-y-3 max-w-sm mx-auto text-left">
              <textarea
                rows={2}
                value={joinMsg}
                onChange={(e) => setJoinMsg(e.target.value)}
                placeholder="Optional note to group admins..."
                className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white text-xs"
              />
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-2.5 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
              >
                {joining ? 'Submitting Request...' : 'Submit Membership Request'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <>
          {/* Group Workspace Sub-Navigation */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-white/[0.1] pb-2 text-xs font-mono">
            {[
              { id: 'feed', label: `Feed (${posts.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
              {
                id: 'events',
                label: `Announcements & Events (${announcements.length + events.length})`,
                icon: <Megaphone className="w-3.5 h-3.5" />,
              },
              {
                id: 'streams',
                label: `Livestreams (${groupStreams.length})`,
                icon: <Radio className="w-3.5 h-3.5" />,
              },
              {
                id: 'members',
                label: `Members (${members.length})`,
                icon: <Users className="w-3.5 h-3.5" />,
              },
              ...(isGroupAdmin
                ? [
                    {
                      id: 'settings',
                      label: 'Group Settings',
                      icon: <Settings className="w-3.5 h-3.5" />,
                    },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as GroupTab)}
                className={`px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: GROUP FEED & WORKFLOW PUBLISHER */}
          {activeTab === 'feed' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-5">
                {/* Publish Button + Type Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
                    {(
                      [
                        'ALL',
                        'WORKFLOW',
                        'VIDEO',
                        'IMAGE',
                        'TEXT',
                        'LIVESTREAM',
                        ...(isStaff ? ['PENDING_APPROVAL'] : []),
                      ] as const
                    ).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setPostFilter(f)}
                        className={`px-2.5 py-1 rounded-lg border cursor-pointer ${
                          postFilter === f
                            ? 'bg-white text-black border-white font-semibold'
                            : 'bg-white/[0.03] text-white/65 border-white/[0.1] hover:text-white'
                        }`}
                      >
                        {f === 'PENDING_APPROVAL' ? 'Approval Queue' : f}
                      </button>
                    ))}
                  </div>

                  {isMember && (
                    <button
                      type="button"
                      onClick={() => setComposerOpen(!composerOpen)}
                      className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{composerOpen ? 'Close Composer' : 'Create Post / Workflow'}</span>
                    </button>
                  )}
                </div>

                {/* Rich Post / Workflow Composer */}
                {composerOpen && (
                  <form
                    onSubmit={handleCreatePost}
                    className="p-5 rounded-2xl border border-white/20 bg-white/[0.04] space-y-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      {(
                        [
                          { id: 'TEXT', label: 'Text Update' },
                          { id: 'IMAGE', label: 'Images' },
                          { id: 'VIDEO', label: 'Video Clip' },
                          ...(group.settings.allowWorkflowSharing
                            ? [{ id: 'WORKFLOW', label: 'Seedance Workflow' }]
                            : []),
                        ] as Array<{ id: GroupPostType; label: string }>
                      ).map((pt) => (
                        <button
                          key={pt.id}
                          type="button"
                          onClick={() => setPostType(pt.id)}
                          className={`px-3 py-1.5 rounded-lg border cursor-pointer ${
                            postType === pt.id
                              ? 'bg-white text-black border-white font-semibold'
                              : 'bg-black/60 text-white/70 border-white/15'
                          }`}
                        >
                          {pt.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Headline / Title"
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.15] bg-black text-white text-sm"
                    />
                    <textarea
                      value={postBody}
                      onChange={(e) => setPostBody(e.target.value)}
                      rows={3}
                      placeholder="Write notes, breakdown, or @mention collaborators..."
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.15] bg-black text-white"
                    />

                    {/* Seedance Workflow Specific Inputs */}
                    {postType === 'WORKFLOW' && (
                      <div className="p-4 rounded-xl border border-white/20 bg-black/60 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-mono uppercase text-[11px] font-semibold text-white">
                            Seedance 2.5 Workflow Configuration
                          </span>
                          {recentGenHistory.length > 0 && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const job = recentGenHistory.find((j) => j.id === e.target.value);
                                if (job) handlePopulateFromJob(job);
                              }}
                              className="px-2 py-1 rounded border border-white/20 bg-black text-white font-mono text-[11px]"
                            >
                              <option value="" disabled>
                                Load from my recent Seedance render...
                              </option>
                              {recentGenHistory.map((j) => (
                                <option key={j.id} value={j.id}>
                                  {j.job_code} · {j.prompt?.slice(0, 38)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            required
                            value={wfTitle}
                            onChange={(e) => setWfTitle(e.target.value)}
                            placeholder="Workflow Title"
                            className="px-3 py-2 rounded-lg border border-white/15 bg-black text-white"
                          />
                          <select
                            value={wfModelKey}
                            onChange={(e) => setWfModelKey(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                          >
                            <option value="seedance_25_15s">Seedance 2.5 15s</option>
                            <option value="seedance_25_30s">Seedance 2.5 30s</option>
                            <option value="seedance_25_15s_r2v">Seedance 2.5 15s R2V</option>
                            <option value="seedance_25_30s_r2v">Seedance 2.5 30s R2V</option>
                          </select>
                        </div>

                        <textarea
                          required
                          rows={3}
                          value={wfPrompt}
                          onChange={(e) => setWfPrompt(e.target.value)}
                          placeholder="Full Seedance master prompt..."
                          className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white font-mono"
                        />

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                          <select
                            value={wfAspect}
                            onChange={(e) => setWfAspect(e.target.value)}
                            className="p-2 rounded border border-white/15 bg-black text-white"
                          >
                            <option value="16:9">16:9</option>
                            <option value="9:16">9:16</option>
                            <option value="1:1">1:1</option>
                            <option value="21:9">21:9</option>
                          </select>
                          <select
                            value={wfResolution}
                            onChange={(e) => setWfResolution(e.target.value as any)}
                            className="p-2 rounded border border-white/15 bg-black text-white"
                          >
                            <option value="480p">480p</option>
                            <option value="720p">720p</option>
                            <option value="1080p">1080p</option>
                          </select>
                          <input
                            type="number"
                            min={4}
                            max={60}
                            value={wfDuration}
                            onChange={(e) => setWfDuration(Number(e.target.value) || 15)}
                            className="p-2 rounded border border-white/15 bg-black text-white"
                            placeholder="Duration (s)"
                          />
                          <select
                            value={wfRating}
                            onChange={(e) => setWfRating(e.target.value as any)}
                            className="p-2 rounded border border-white/15 bg-black text-white"
                          >
                            <option value="standard">Standard</option>
                            <option value="18+">18+ Priority</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 font-mono text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={wfPhysics}
                              onChange={(e) => setWfPhysics(e.target.checked)}
                            />
                            <span>Complex Physics Priority</span>
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setWfScenes((prev) => [
                                ...prev,
                                {
                                  step: prev.length + 1,
                                  title: `Scene ${prev.length + 1}`,
                                  cameraMovement: 'Slow dolly-in',
                                  prompt: '',
                                },
                              ])
                            }
                            className="px-2.5 py-1 rounded border border-white/20 text-[11px] font-mono cursor-pointer"
                          >
                            + Add Scene Step
                          </button>
                        </div>

                        {wfScenes.map((sc, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] space-y-2"
                          >
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={sc.title}
                                onChange={(e) => {
                                  const next = [...wfScenes];
                                  next[idx] = { ...sc, title: e.target.value };
                                  setWfScenes(next);
                                }}
                                placeholder="Step title"
                                className="flex-1 p-1.5 rounded border border-white/15 bg-black text-white"
                              />
                              <input
                                type="text"
                                value={sc.cameraMovement || ''}
                                onChange={(e) => {
                                  const next = [...wfScenes];
                                  next[idx] = { ...sc, cameraMovement: e.target.value };
                                  setWfScenes(next);
                                }}
                                placeholder="Camera movement"
                                className="flex-1 p-1.5 rounded border border-white/15 bg-black text-white"
                              />
                            </div>
                            <input
                              type="text"
                              value={sc.prompt}
                              onChange={(e) => {
                                const next = [...wfScenes];
                                next[idx] = { ...sc, prompt: e.target.value };
                                setWfScenes(next);
                              }}
                              placeholder="Scene prompt directive"
                              className="w-full p-1.5 rounded border border-white/15 bg-black text-white font-mono"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Media Attachments (Images / Video) */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={imgUploadRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadAsset(f, 'image');
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingAsset}
                        onClick={() => imgUploadRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-white/20 bg-black hover:bg-white/[0.06] font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Upload Image ({postImages.length})</span>
                      </button>

                      <input
                        ref={vidUploadRef}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadAsset(f, 'video');
                          e.target.value = '';
                        }}
                      />
                      <button
                        type="button"
                        disabled={uploadingAsset}
                        onClick={() => vidUploadRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg border border-white/20 bg-black hover:bg-white/[0.06] font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Film className="w-3.5 h-3.5" />
                        <span>{postVideoUrl ? 'Video Attached' : 'Upload Video'}</span>
                      </button>

                      <input
                        type="text"
                        value={postTagsText}
                        onChange={(e) => setPostTagsText(e.target.value)}
                        placeholder="Tags (comma-separated, e.g. tracking, r2v)"
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-lg border border-white/15 bg-black text-white font-mono"
                      />
                    </div>

                    {postImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {postImages.map((u, idx) => (
                          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/20">
                            <img src={u} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() =>
                                setPostImages((prev) => prev.filter((_, i) => i !== idx))
                              }
                              className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/80 text-white cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setComposerOpen(false)}
                        className="px-4 py-2 rounded-lg border border-white/15 font-mono text-white/70 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={uploadingAsset}
                        className="px-5 py-2 rounded-lg bg-white text-black font-mono font-semibold uppercase cursor-pointer"
                      >
                        {uploadingAsset ? 'Uploading...' : 'Publish to Group'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Posts Stream */}
                {posts.length === 0 ? (
                  <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center space-y-2">
                    <Layers className="w-7 h-7 text-white/30 mx-auto" />
                    <div className="text-sm font-medium text-white/80">
                      No posts in this view yet
                    </div>
                    <p className="text-xs text-white/50">
                      {isMember
                        ? 'Share a Seedance workflow, video render, or studio discussion with the group.'
                        : 'Join this group to participate and contribute workflows.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <GroupPostCard
                        key={post.id}
                        post={post}
                        currentUserId={currentUserId}
                        canModerate={isStaff}
                        isAuthenticated={isAuthenticated}
                        allowVirtualGifts={group.settings.allowVirtualGifts}
                        onRequireAuth={onRequireAuth}
                        onPostUpdated={(updated) =>
                          setPosts((prev) =>
                            prev.map((p) => (p.id === updated.id ? updated : p))
                          )
                        }
                        onPostDeleted={(pid) =>
                          setPosts((prev) => prev.filter((p) => p.id !== pid))
                        }
                        onImportWorkflow={onImportWorkflow}
                        onOpenUserProfile={onOpenUserProfile}
                        onOpenLivestream={(streamId) => onLaunchGroupStream(group, streamId)}
                        onOpenGiftModal={onOpenGiftModal}
                        onNotice={setNotice}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Group Rules & Quick Announcements */}
              <aside className="lg:col-span-4 space-y-4">
                <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Group Guidelines & Rules
                  </div>
                  <p className="text-xs text-white/75 whitespace-pre-wrap leading-relaxed">
                    {group.rulesText || 'Be constructive, credit workflow creators, and honor group privacy.'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono uppercase text-white/60">
                    <span>Pinned Announcements</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('events')}
                      className="text-white/80 hover:text-white underline cursor-pointer"
                    >
                      All
                    </button>
                  </div>
                  {announcements.length === 0 ? (
                    <p className="text-xs text-white/45 font-mono">No announcements yet.</p>
                  ) : (
                    announcements.slice(0, 3).map((a) => (
                      <div key={a.id} className="p-3 rounded-xl border border-white/[0.08] bg-black/50 space-y-1">
                        <div className="text-xs font-semibold text-white">{a.title}</div>
                        <p className="text-[11px] text-white/65 line-clamp-3">{a.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </aside>
            </div>
          )}

          {/* TAB 2: ANNOUNCEMENTS & EVENTS */}
          {activeTab === 'events' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Announcements */}
              <div className="space-y-4">
                <h2 className="text-sm font-mono uppercase tracking-wider font-semibold flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Announcements ({announcements.length})
                </h2>

                {isStaff && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!annTitle.trim() || !annContent.trim()) return;
                      await seedanceCommunityService.createAnnouncement(group.id, {
                        title: annTitle.trim(),
                        content: annContent.trim(),
                        isPinned: true,
                      });
                      setAnnTitle('');
                      setAnnContent('');
                      loadGroupAll();
                    }}
                    className="p-4 rounded-xl border border-white/[0.14] bg-white/[0.03] space-y-2.5 text-xs"
                  >
                    <input
                      type="text"
                      required
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      placeholder="Announcement headline..."
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white"
                    />
                    <textarea
                      required
                      rows={2}
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      placeholder="Announcement details for group members..."
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-white text-black font-mono text-[11px] font-semibold uppercase cursor-pointer"
                    >
                      Post & Notify Members
                    </button>
                  </form>
                )}

                {announcements.length === 0 ? (
                  <div className="p-6 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-mono text-white/45">
                    No announcements posted yet.
                  </div>
                ) : (
                  announcements.map((a) => (
                    <div
                      key={a.id}
                      className="p-4 rounded-xl border border-white/[0.12] bg-white/[0.03] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-white">{a.title}</div>
                          <div className="text-[10px] font-mono text-white/45">
                            By @{a.authorUsername} · {new Date(a.createdAt).toLocaleString()}
                          </div>
                        </div>
                        {isStaff && (
                          <button
                            type="button"
                            onClick={async () => {
                              await seedanceCommunityService.deleteAnnouncement(group.id, a.id);
                              loadGroupAll();
                            }}
                            className="p-1 text-white/50 hover:text-white cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-white/80 whitespace-pre-wrap">{a.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Group Events */}
              <div className="space-y-4">
                <h2 className="text-sm font-mono uppercase tracking-wider font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Group Events & Challenges ({events.length})
                </h2>

                {isStaff && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!evTitle.trim()) return;
                      await seedanceCommunityService.createEvent(group.id, {
                        title: evTitle.trim(),
                        description: evDesc.trim(),
                        eventType: evType,
                        startsAt: evStartsAt || new Date().toISOString(),
                        locationOrLink: evLocation.trim() || undefined,
                      });
                      setEvTitle('');
                      setEvDesc('');
                      setEvLocation('');
                      loadGroupAll();
                    }}
                    className="p-4 rounded-xl border border-white/[0.14] bg-white/[0.03] space-y-2.5 text-xs"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        value={evTitle}
                        onChange={(e) => setEvTitle(e.target.value)}
                        placeholder="Event / Challenge Title"
                        className="p-2 rounded-lg border border-white/15 bg-black text-white"
                      />
                      <select
                        value={evType}
                        onChange={(e) => setEvType(e.target.value as GroupEventType)}
                        className="p-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                      >
                        <option value="MEETING">Group Meeting</option>
                        <option value="CREATIVE_CHALLENGE">Creative Challenge</option>
                        <option value="LIVESTREAM_EVENT">Livestream Event</option>
                        <option value="COMPETITION">Competition</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="datetime-local"
                        value={evStartsAt}
                        onChange={(e) => setEvStartsAt(e.target.value)}
                        className="p-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                      />
                      <input
                        type="text"
                        value={evLocation}
                        onChange={(e) => setEvLocation(e.target.value)}
                        placeholder="Session link / notes (optional)"
                        className="p-2 rounded-lg border border-white/15 bg-black text-white"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={evDesc}
                      onChange={(e) => setEvDesc(e.target.value)}
                      placeholder="Brief & participation criteria..."
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-white text-black font-mono text-[11px] font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Schedule Group Event</span>
                    </button>
                  </form>
                )}

                {events.length === 0 ? (
                  <div className="p-6 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs font-mono text-white/45">
                    No scheduled events yet.
                  </div>
                ) : (
                  events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-white/[0.12] bg-white/[0.03] space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-white/55">
                            {ev.eventType.replace('_', ' ')} ·{' '}
                            {new Date(ev.startsAt).toLocaleString()}
                          </div>
                          <div className="text-sm font-semibold text-white">{ev.title}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await seedanceCommunityService.toggleEventRsvp(group.id, ev.id);
                            loadGroupAll();
                          }}
                          className={`px-3 py-1 rounded-lg font-mono text-[11px] font-semibold uppercase cursor-pointer ${
                            ev.viewerAttending
                              ? 'bg-white text-black'
                              : 'border border-white/25 text-white hover:bg-white/[0.08]'
                          }`}
                        >
                          {ev.viewerAttending
                            ? `Going (${ev.attendeeCount})`
                            : `RSVP (${ev.attendeeCount})`}
                        </button>
                      </div>
                      {ev.description && <p className="text-xs text-white/75">{ev.description}</p>}
                      {ev.locationOrLink && (
                        <div className="text-[11px] font-mono text-white/55">
                          Location / Link: {ev.locationOrLink}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: GROUP LIVESTREAMS */}
          {activeTab === 'streams' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-mono uppercase font-semibold">
                    Live Group Broadcasts ({groupStreams.length})
                  </h2>
                  <p className="text-xs text-white/55">
                    {group.visibility === 'PRIVATE'
                      ? 'Private group enforcement active: streams in this group are locked to approved members.'
                      : 'Active WebRTC sessions launched inside this group.'}
                  </p>
                </div>
                {isMember && (isStaff || group.settings.whoCanStartLivestream === 'EVERYONE') && (
                  <button
                    type="button"
                    onClick={() => onLaunchGroupStream(group)}
                    className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Start Group Livestream</span>
                  </button>
                )}
              </div>

              {groupStreams.length === 0 ? (
                <div className="p-10 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                  No active livestreams inside "{group.name}" right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupStreams.map((s) => (
                    <div
                      key={s.id}
                      className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-white text-black font-bold">
                          LIVE · {s.viewerCount} VIEWERS
                        </span>
                        <span className="text-white/60 uppercase">{s.visibility}</span>
                      </div>
                      <div className="text-sm font-semibold text-white">{s.title}</div>
                      <div className="text-[11px] font-mono text-white/50">
                        Host: @{s.hostUsername}
                      </div>
                      <button
                        type="button"
                        onClick={() => onLaunchGroupStream(group, s.id)}
                        className="w-full py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase cursor-pointer"
                      >
                        Watch Group Stream
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: MEMBERS, REQUESTS & MODERATION LOGS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {isStaff && joinRequests.length > 0 && (
                <div className="p-5 rounded-2xl border border-white/20 bg-white/[0.04] space-y-3">
                  <h3 className="text-xs font-mono uppercase font-semibold text-white">
                    Pending Join Requests ({joinRequests.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {joinRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl border border-white/15 bg-black/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white truncate">
                            {req.displayName} <span className="font-mono text-white/50">@{req.username}</span>
                          </div>
                          {req.message && (
                            <p className="text-white/65 line-clamp-2 mt-0.5">{req.message}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 font-mono">
                          <button
                            type="button"
                            onClick={async () => {
                              await seedanceCommunityService.reviewJoinRequest(group.id, req.id, true);
                              loadGroupAll();
                            }}
                            className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await seedanceCommunityService.reviewJoinRequest(group.id, req.id, false);
                              loadGroupAll();
                            }}
                            className="px-2.5 py-1 rounded border border-white/20 text-[10px] uppercase cursor-pointer"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-white/60">
                  Group Directory ({members.length})
                </h3>
                <div className="space-y-2.5">
                  {members.map((m) => (
                    <div
                      key={m.userId}
                      className="p-4 rounded-xl border border-white/[0.1] bg-white/[0.03] flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => onOpenUserProfile(m.userId)}
                        className="text-left cursor-pointer hover:underline"
                      >
                        <div className="font-semibold text-white">
                          {m.displayName}{' '}
                          <span className="font-mono text-white/50">@{m.username}</span>
                        </div>
                        <div className="text-[10px] font-mono text-white/45 uppercase">
                          Role: {m.role} · Status: {m.status} · Joined{' '}
                          {new Date(m.joinedAt).toLocaleDateString()}
                        </div>
                      </button>

                      {isStaff && m.userId !== group.ownerId && m.userId !== currentUserId && (
                        <div className="flex flex-wrap items-center gap-2 font-mono">
                          {m.status === 'BANNED' ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await seedanceCommunityService.manageGroupMember(group.id, m.userId, {
                                  action: 'UNBAN',
                                });
                                loadGroupAll();
                              }}
                              className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-semibold uppercase cursor-pointer"
                            >
                              Unban
                            </button>
                          ) : (
                            <>
                              {isGroupAdmin && (
                                <select
                                  value={m.role}
                                  onChange={async (e) => {
                                    try {
                                      await seedanceCommunityService.manageGroupMember(
                                        group.id,
                                        m.userId,
                                        { action: 'SET_ROLE', newRole: e.target.value as GroupRole }
                                      );
                                      loadGroupAll();
                                    } catch (err: any) {
                                      setNotice(err?.message || 'Role update failed.');
                                    }
                                  }}
                                  className="p-1.5 rounded border border-white/20 bg-black text-white text-[11px]"
                                >
                                  <option value="MEMBER">MEMBER</option>
                                  <option value="MODERATOR">MODERATOR</option>
                                  {isOwner && <option value="ADMIN">ADMIN</option>}
                                </select>
                              )}

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      title: `Transfer Ownership to @${m.username}?`,
                                      body: `You will become a Group Admin and @${m.username} will become the sole Group Owner.`,
                                      actionLabel: 'Transfer Ownership',
                                      onConfirm: async () => {
                                        await seedanceCommunityService.manageGroupMember(
                                          group.id,
                                          m.userId,
                                          { action: 'TRANSFER_OWNERSHIP' }
                                        );
                                        setConfirmModal(null);
                                        loadGroupAll();
                                      },
                                    })
                                  }
                                  className="px-2.5 py-1 rounded border border-white/20 text-[10px] uppercase cursor-pointer hover:bg-white/[0.08]"
                                >
                                  Make Owner
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    title: `Remove @${m.username} from group?`,
                                    body: 'They will lose immediate access to group content.',
                                    actionLabel: 'Kick Member',
                                    onConfirm: async () => {
                                      await seedanceCommunityService.manageGroupMember(
                                        group.id,
                                        m.userId,
                                        { action: 'KICK' }
                                      );
                                      setConfirmModal(null);
                                      loadGroupAll();
                                    },
                                  })
                                }
                                className="px-2.5 py-1 rounded border border-white/20 text-[10px] uppercase cursor-pointer hover:bg-white/[0.08]"
                              >
                                Kick
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmModal({
                                    title: `Ban @${m.username} from "${group.name}"?`,
                                    body: 'Banned users cannot rejoin or request access unless unbanned.',
                                    actionLabel: 'Ban User',
                                    onConfirm: async () => {
                                      await seedanceCommunityService.manageGroupMember(
                                        group.id,
                                        m.userId,
                                        { action: 'BAN', reason: 'Removed by group moderation' }
                                      );
                                      setConfirmModal(null);
                                      loadGroupAll();
                                    },
                                  })
                                }
                                className="px-2.5 py-1 rounded bg-white text-black text-[10px] font-semibold uppercase cursor-pointer"
                              >
                                Ban
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {isStaff && modLogs.length > 0 && (
                <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-2.5">
                  <div className="text-xs font-mono uppercase font-semibold text-white flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Group Moderation Activity Logs
                  </div>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto text-[11px] font-mono">
                    {modLogs.map((l) => (
                      <div
                        key={l.id}
                        className="p-2.5 rounded-lg border border-white/[0.07] bg-black/50 flex flex-wrap justify-between gap-2"
                      >
                        <div>
                          <span className="text-white font-semibold">{l.action}</span> by @
                          {l.actorUsername}
                          {l.reason ? ` — ${l.reason}` : ''}
                        </div>
                        <span className="text-white/45">
                          {new Date(l.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: GROUP SETTINGS (6 CATEGORIES) */}
          {activeTab === 'settings' && isGroupAdmin && settingsDraft && (
            <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl text-xs">
              {/* 1. General Settings */}
              <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.03] space-y-3">
                <h3 className="font-mono uppercase tracking-wider font-semibold text-white">
                  1. General Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={settingsDraft.name}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, name: e.target.value })}
                    placeholder="Group Name"
                    className="p-2.5 rounded-lg border border-white/15 bg-black text-white"
                  />
                  <select
                    value={settingsDraft.category}
                    onChange={(e) =>
                      setSettingsDraft({ ...settingsDraft, category: e.target.value })
                    }
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
                  rows={2}
                  value={settingsDraft.description}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, description: e.target.value })
                  }
                  placeholder="Group description..."
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />
                <input
                  type="text"
                  value={settingsDraft.interestsText}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, interestsText: e.target.value })
                  }
                  placeholder="Interest tags (comma separated)"
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />
                <textarea
                  rows={3}
                  value={settingsDraft.rulesText}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, rulesText: e.target.value })
                  }
                  placeholder="Group rules and creator conduct..."
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
                />
              </div>

              {/* 2. Privacy Settings */}
              <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.03] space-y-3">
                <h3 className="font-mono uppercase tracking-wider font-semibold text-white">
                  2. Privacy & Visibility Cascade
                </h3>
                <div className="grid grid-cols-2 gap-3 font-mono">
                  {(['PUBLIC', 'PRIVATE'] as GroupVisibility[]).map((vis) => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => setSettingsDraft({ ...settingsDraft, visibility: vis })}
                      className={`p-3 rounded-xl border text-left cursor-pointer ${
                        settingsDraft.visibility === vis
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-black/60 text-white/75 border-white/15'
                      }`}
                    >
                      <div className="uppercase">{vis} GROUP</div>
                      <div className="text-[10px] opacity-75 font-sans mt-0.5">
                        {vis === 'PUBLIC'
                          ? 'Content and workflows visible in community discovery.'
                          : 'All existing & future posts, workflows, and streams restricted to members.'}
                      </div>
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-mono">
                  <input
                    type="checkbox"
                    checked={settingsDraft.discoverableInSearch}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        discoverableInSearch: e.target.checked,
                      })
                    }
                  />
                  <span>Appear in Group Search Results (content stays hidden if Private)</span>
                </label>
              </div>

              {/* 3. Member Settings */}
              <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.03] space-y-3">
                <h3 className="font-mono uppercase tracking-wider font-semibold text-white">
                  3. Member & Access Control Settings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-white/55 mb-1">
                      Join Mode
                    </label>
                    <select
                      value={settingsDraft.joinMode}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          joinMode: e.target.value as GroupJoinMode,
                        })
                      }
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white font-mono"
                    >
                      <option value="OPEN">Open Join (Public only)</option>
                      <option value="APPROVAL_REQUIRED">Approval Required</option>
                      <option value="INVITE_ONLY">Invite Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-white/55 mb-1">
                      Who Can Invite Users
                    </label>
                    <select
                      value={settingsDraft.whoCanInvite}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whoCanInvite: e.target.value as GroupPermissionLevel,
                        })
                      }
                      className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white font-mono"
                    >
                      <option value="EVERYONE">All Members</option>
                      <option value="MODERATORS_AND_ABOVE">Moderators & Admins</option>
                      <option value="ADMINS_AND_ABOVE">Admins Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Content Settings */}
              <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.03] space-y-3">
                <h3 className="font-mono uppercase tracking-wider font-semibold text-white">
                  4. Content & Livestream Permissions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-white/55 mb-1">
                      Who Can Post
                    </label>
                    <select
                      value={settingsDraft.whoCanPost}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whoCanPost: e.target.value as GroupPermissionLevel,
                        })
                      }
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                    >
                      <option value="EVERYONE">All Members</option>
                      <option value="MODERATORS_AND_ABOVE">Moderators+</option>
                      <option value="ADMINS_AND_ABOVE">Admins Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-white/55 mb-1">
                      Who Can Comment
                    </label>
                    <select
                      value={settingsDraft.whoCanComment}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whoCanComment: e.target.value as any,
                        })
                      }
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                    >
                      <option value="MEMBERS_ONLY">Group Members</option>
                      <option value="EVERYONE">Anyone Viewing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-white/55 mb-1">
                      Start Livestream
                    </label>
                    <select
                      value={settingsDraft.whoCanStartLivestream}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          whoCanStartLivestream: e.target.value as GroupPermissionLevel,
                        })
                      }
                      className="w-full p-2 rounded-lg border border-white/15 bg-black text-white font-mono"
                    >
                      <option value="EVERYONE">All Members</option>
                      <option value="MODERATORS_AND_ABOVE">Moderators+</option>
                      <option value="ADMINS_AND_ABOVE">Admins Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1 font-mono">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsDraft.requirePostApproval}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          requirePostApproval: e.target.checked,
                        })
                      }
                    />
                    <span>Require Moderator Post Approval</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsDraft.allowWorkflowSharing}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          allowWorkflowSharing: e.target.checked,
                        })
                      }
                    />
                    <span>Enable Seedance Workflow Sharing</span>
                  </label>
                </div>
              </div>

              {/* 5 & 6. Moderation & Virtual Gifts */}
              <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.03] space-y-3">
                <h3 className="font-mono uppercase tracking-wider font-semibold text-white">
                  5 & 6. Moderation Keywords & Virtual Gifting
                </h3>
                <input
                  type="text"
                  value={settingsDraft.blockedKeywordsText}
                  onChange={(e) =>
                    setSettingsDraft({ ...settingsDraft, blockedKeywordsText: e.target.value })
                  }
                  placeholder="Blocked keywords (comma separated)"
                  className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white font-mono"
                />
                <label className="flex items-center gap-2 cursor-pointer font-mono">
                  <input
                    type="checkbox"
                    checked={settingsDraft.allowVirtualGifts}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        allowVirtualGifts: e.target.checked,
                      })
                    }
                  />
                  <span>Allow Virtual Gifting to Creators in this Group</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 rounded-xl bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider cursor-pointer"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Group Settings'}
                </button>

                {isOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModal({
                        title: `Permanently Delete "${group.name}"?`,
                        body: 'All group posts, workflows, comments, events, and memberships will be erased irreversibly.',
                        actionLabel: 'Delete Group Forever',
                        onConfirm: async () => {
                          await seedanceCommunityService.deleteGroup(group.id);
                          setConfirmModal(null);
                          onGroupDeleted?.();
                        },
                      })
                    }
                    className="px-4 py-2.5 rounded-xl border border-white/25 text-xs font-mono uppercase text-white/75 hover:text-white cursor-pointer"
                  >
                    Delete Group
                  </button>
                )}
              </div>
            </form>
          )}
        </>
      )}

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSendInvite}
            className="w-full max-w-md rounded-2xl border border-white/20 bg-[#08080a] p-5 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-mono uppercase font-semibold text-sm">Invite Creator to Group</h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={inviteIdentifier}
              onChange={(e) => setInviteIdentifier(e.target.value)}
              placeholder="Username (@handle), Email, or User UID"
              className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white font-mono"
            />
            <textarea
              rows={2}
              value={inviteMsg}
              onChange={(e) => setInviteMsg(e.target.value)}
              placeholder="Personal invitation message (optional)"
              className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-white/15 font-mono text-white/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-white text-black font-mono font-semibold uppercase cursor-pointer"
              >
                Send Invitation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Modal (Replaces window.confirm cleanly) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#08080a] p-5 space-y-4">
            <h4 className="text-sm font-mono uppercase font-semibold">{confirmModal.title}</h4>
            <p className="text-xs text-white/65">{confirmModal.body}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase cursor-pointer"
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
