/**
 * VAIURE — SEEDANCE LAB PUBLIC CREATION DETAIL MODAL & PLAYER
 * Fullscreen-ready viewer for Public Curated creations:
 * - Image viewer & HTML5 video player
 * - Real Views, Appreciations, Favorites, Share, Follow Creator, Comments
 * - Strict prompt/model disclosure enforcement
 * - Owner post-publish management (Edit metadata, toggle comments, toggle disclosure, unpublish, analytics)
 * - In-app reporting (zero fake counts)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Heart,
  Bookmark,
  Share2,
  MessageSquare,
  Eye,
  Trash2,
  Flag,
  UserPlus,
  UserCheck,
  Edit3,
  BarChart3,
  EyeOff,
  Check,
  Maximize2,
  AlertCircle,
} from 'lucide-react';
import {
  CreationAnalytics,
  CreationComment,
  CuratedCategoryOption,
  PublishedCreation,
} from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';
import { seedanceCommunityService } from '../../../../services/seedanceCommunityService';

interface CreationDetailModalProps {
  publishedId: string;
  currentUserId?: string;
  isCurator?: boolean;
  isAuthenticated: boolean;
  categories: CuratedCategoryOption[];
  onRequireAuth: () => void;
  onClose: () => void;
  onUpdated: () => void;
}

export const CreationDetailModal: React.FC<CreationDetailModalProps> = ({
  publishedId,
  currentUserId,
  isCurator = false,
  isAuthenticated,
  categories,
  onRequireAuth,
  onClose,
  onUpdated,
}) => {
  const [creation, setCreation] = useState<PublishedCreation | null>(null);
  const [comments, setComments] = useState<CreationComment[]>([]);
  const [analytics, setAnalytics] = useState<CreationAnalytics | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [showManage, setShowManage] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(false);

  // Manage fields
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCredits, setEditCredits] = useState('');
  const [editCommentsEnabled, setEditCommentsEnabled] = useState(true);
  const [editShowProfile, setEditShowProfile] = useState(true);
  const [editShowModel, setEditShowModel] = useState(true);
  const [editShowPrompt, setEditShowPrompt] = useState(false);
  const [savingManage, setSavingManage] = useState(false);

  // Report fields
  const [reportReason, setReportReason] = useState('Policy / Safety Concern');
  const [reportDetails, setReportDetails] = useState('');

  const showTempToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  };

  const loadDetail = useCallback(
    async (trackView = true) => {
      setLoading(true);
      setError(null);
      try {
        const res = await seedanceCuratedService.getPublicCreationDetail(
          publishedId,
          trackView
        );
        setCreation(res.creation);
        setComments(res.comments);
        setAnalytics(res.analytics);
        setEditTitle(res.creation.title);
        setEditDesc(res.creation.description);
        setEditCategory(res.creation.category);
        setEditTags(res.creation.tags.join(', '));
        setEditCredits(res.creation.creativeCredits || '');
        setEditCommentsEnabled(res.creation.commentsEnabled);
        setEditShowProfile(res.creation.showCreatorProfile);
        setEditShowModel(res.creation.showAiModel);
        setEditShowPrompt(res.creation.showPromptAndParams);
      } catch (err: any) {
        setError(err?.message || 'Unable to load curated creation.');
      } finally {
        setLoading(false);
      }
    },
    [publishedId]
  );

  useEffect(() => {
    loadDetail(true);
  }, [loadDetail]);

  const isOwner = Boolean(currentUserId && creation && creation.ownerId === currentUserId);

  const handleAppreciate = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!creation) return;
    try {
      const res = await seedanceCuratedService.toggleAppreciation(creation.id);
      setCreation({
        ...creation,
        viewerHasAppreciated: res.appreciated,
        appreciationsCount: res.appreciationsCount,
      });
      onUpdated();
    } catch (err: any) {
      showTempToast(err?.message || 'Action failed');
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!creation) return;
    try {
      const res = await seedanceCuratedService.toggleFavorite(creation.id);
      setCreation({
        ...creation,
        viewerHasFavorited: res.favorited,
        favoritesCount: res.favoritesCount,
      });
      onUpdated();
    } catch (err: any) {
      showTempToast(err?.message || 'Action failed');
    }
  };

  const handleFollowCreator = async () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!creation || !creation.showCreatorProfile || isOwner) return;
    try {
      const res = await seedanceCommunityService.toggleFollowCreator(creation.ownerId);
      setCreation({ ...creation, viewerIsFollowingCreator: res.following });
    } catch (err: any) {
      showTempToast(err?.message || 'Unable to follow creator');
    }
  };

  const handleShare = async () => {
    if (!creation) return;
    try {
      const url = `${window.location.origin}${window.location.pathname}#curated=${creation.id}`;
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      const res = await seedanceCuratedService.recordShare(creation.id);
      setCreation({ ...creation, sharesCount: res.sharesCount });
      showTempToast('Curated link copied to clipboard.');
    } catch {
      showTempToast('Share recorded.');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!creation || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await seedanceCuratedService.addComment(creation.id, commentText.trim());
      setComments((prev) => [...prev, res.comment]);
      setCreation({ ...creation, commentsCount: res.commentsCount });
      setCommentText('');
      onUpdated();
    } catch (err: any) {
      showTempToast(err?.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!creation) return;
    try {
      const res = await seedanceCuratedService.deleteComment(creation.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCreation({ ...creation, commentsCount: res.commentsCount });
      onUpdated();
    } catch (err: any) {
      showTempToast(err?.message || 'Delete failed');
    }
  };

  const handleSaveManage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creation) return;
    setSavingManage(true);
    try {
      const updated = await seedanceCuratedService.updatePublishedByCreator(creation.id, {
        title: editTitle.trim(),
        description: editDesc.trim(),
        category: editCategory,
        tags: editTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        creativeCredits: editCredits.trim(),
        commentsEnabled: editCommentsEnabled,
        showCreatorProfile: editShowProfile,
        showAiModel: editShowModel,
        showPromptAndParams: editShowPrompt,
      });
      setCreation(updated);
      setShowManage(false);
      showTempToast('Public details updated.');
      onUpdated();
    } catch (err: any) {
      showTempToast(err?.message || 'Failed to update settings');
    } finally {
      setSavingManage(false);
    }
  };

  const handleUnpublish = async () => {
    if (!creation) return;
    setSavingManage(true);
    try {
      await seedanceCuratedService.updatePublishedByCreator(creation.id, {
        action: 'unpublish',
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      showTempToast(err?.message || 'Failed to unpublish');
    } finally {
      setSavingManage(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    if (!creation) return;
    try {
      await seedanceCuratedService.reportPublicCreation(
        creation.id,
        reportReason,
        reportDetails
      );
      setShowReport(false);
      setReportDetails('');
      showTempToast('Report submitted to curation moderators.');
    } catch (err: any) {
      showTempToast(err?.message || 'Failed to submit report');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-6xl h-[92vh] rounded-2xl border border-white/[0.15] bg-[#070709] text-white flex flex-col overflow-hidden shadow-[0_32px_96px_rgba(0,0,0,0.95)]">
        {/* Top bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/[0.1] flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/50 truncate">
              <span>PUBLIC CURATES</span>
              {creation && (
                <>
                  <span>·</span>
                  <span>{creation.category}</span>
                  <span>·</span>
                  <span className="tabular-nums">
                    {new Date(creation.publishedAt).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-white truncate">
              {creation ? creation.title : 'Loading Creation...'}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast && (
              <span className="text-xs font-mono text-white bg-white/[0.08] border border-white/[0.15] px-3 py-1 rounded-lg">
                {toast}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono text-white/50">
            Loading curated piece...
          </div>
        ) : error || !creation ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="w-7 h-7 text-white/40" />
            <div className="text-sm text-white/80">{error || 'Creation unavailable.'}</div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left Media Viewport */}
            <div className="lg:col-span-7 bg-black flex flex-col items-center justify-center relative border-b lg:border-b-0 lg:border-r border-white/[0.1] p-4 min-h-[280px] overflow-hidden">
              {creation.mediaType === 'VIDEO' ? (
                <video
                  src={creation.mediaStreamUrl}
                  controls
                  playsInline
                  autoPlay
                  loop
                  className="max-h-full max-w-full rounded-xl border border-white/[0.1] bg-neutral-950"
                />
              ) : (
                <div className="relative flex items-center justify-center max-h-full max-w-full group">
                  <img
                    src={creation.mediaStreamUrl}
                    alt={creation.title}
                    onClick={() => setFullscreenImage(true)}
                    className="max-h-[68vh] lg:max-h-[76vh] max-w-full object-contain rounded-xl border border-white/[0.1] cursor-zoom-in"
                  />
                  <button
                    type="button"
                    onClick={() => setFullscreenImage(true)}
                    className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/75 border border-white/[0.2] text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Subtle corner specs strip (Zero pills) */}
              <div className="mt-3 text-[11px] font-mono text-white/50 tabular-nums flex items-center gap-2 flex-wrap justify-center">
                <span>{creation.mediaType}</span>
                <span>·</span>
                <span>{creation.resolution}</span>
                <span>·</span>
                <span>{creation.aspectRatio}</span>
                {creation.durationSeconds ? (
                  <>
                    <span>·</span>
                    <span>{creation.durationSeconds}s</span>
                  </>
                ) : null}
                {creation.showAiModel && creation.aiModel ? (
                  <>
                    <span>·</span>
                    <span className="text-white/75">{creation.aiModel}</span>
                  </>
                ) : null}
              </div>
            </div>

            {/* Right Metadata, Actions, Disclosure & Comments */}
            <div className="lg:col-span-5 flex flex-col min-h-0 overflow-y-auto no-scrollbar p-5 space-y-5">
              {/* Creator Attribution & Follow */}
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                  {creation.showCreatorProfile && creation.creatorAvatar ? (
                    <img
                      src={creation.creatorAvatar}
                      alt={creation.creatorDisplayName}
                      className="w-10 h-10 rounded-full object-cover border border-white/[0.2]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-white/[0.2] bg-white/[0.06] flex items-center justify-center text-xs font-mono text-white">
                      {(creation.creatorDisplayName || 'C').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {creation.showCreatorProfile
                        ? creation.creatorDisplayName
                        : 'Anonymous Creator'}
                    </div>
                    {creation.creativeCredits && (
                      <div className="text-[11px] font-mono text-white/50 truncate">
                        Credits: {creation.creativeCredits}
                      </div>
                    )}
                  </div>
                </div>

                {creation.showCreatorProfile && !isOwner && (
                  <button
                    type="button"
                    onClick={handleFollowCreator}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer shrink-0 transition-all ${
                      creation.viewerIsFollowingCreator
                        ? 'border border-white/[0.2] bg-white/[0.06] text-white'
                        : 'bg-white text-black hover:bg-white/90'
                    }`}
                  >
                    {creation.viewerIsFollowingCreator ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Engagement Actions */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <button
                  type="button"
                  onClick={handleAppreciate}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-mono tabular-nums flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    creation.viewerHasAppreciated
                      ? 'bg-white text-black border-white font-semibold'
                      : 'border-white/[0.12] bg-white/[0.03] text-white hover:bg-white/[0.07]'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${creation.viewerHasAppreciated ? 'fill-black' : ''}`}
                  />
                  <span>{creation.appreciationsCount}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFavorite}
                  className={`py-2.5 px-2 rounded-xl border text-xs font-mono tabular-nums flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    creation.viewerHasFavorited
                      ? 'bg-white text-black border-white font-semibold'
                      : 'border-white/[0.12] bg-white/[0.03] text-white hover:bg-white/[0.07]'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${creation.viewerHasFavorited ? 'fill-black' : ''}`}
                  />
                  <span>{creation.favoritesCount}</span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="py-2.5 px-2 rounded-xl border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] text-white text-xs font-mono tabular-nums flex flex-col items-center gap-1 cursor-pointer transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{creation.sharesCount}</span>
                </button>

                <div className="py-2.5 px-2 rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/70 text-xs font-mono tabular-nums flex flex-col items-center gap-1">
                  <Eye className="w-4 h-4 text-white/60" />
                  <span>{creation.viewsCount}</span>
                </div>
              </div>

              {/* Description & Tags */}
              <div className="space-y-3">
                <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
                  {creation.description}
                </p>

                {creation.projectName && (
                  <div className="text-xs font-mono text-white/55">
                    Project: <span className="text-white/85">{creation.projectName}</span>
                  </div>
                )}

                {creation.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-[11px] font-mono text-white/55">
                    {creation.tags.map((tag) => (
                      <span key={tag} className="text-white/70">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Disclosed Prompt & Technical Specs (ONLY if creator enabled disclosure) */}
              {creation.showPromptAndParams && creation.disclosedPrompt && (
                <div className="p-3.5 rounded-xl border border-white/[0.12] bg-white/[0.03] space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Creator-Disclosed Prompt
                  </div>
                  <p className="text-xs text-white/85 font-sans leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto no-scrollbar">
                    {creation.disclosedPrompt}
                  </p>
                </div>
              )}

              {/* Owner Controls & Reporting Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.08]">
                {isOwner ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManage(!showManage);
                        setShowAnalytics(false);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Manage Public Listing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAnalytics(!showAnalytics);
                        setShowManage(false);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Analytics</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowReport(!showReport)}
                    className="text-xs font-mono text-white/45 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Report Content</span>
                  </button>
                )}
              </div>

              {/* Owner Analytics Panel */}
              {isOwner && showAnalytics && analytics && (
                <div className="p-4 rounded-xl border border-white/[0.15] bg-white/[0.04] space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Creation Performance Analytics
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-white/45">Total Views</div>
                      <div className="text-base font-semibold text-white">{analytics.totalViews}</div>
                    </div>
                    <div>
                      <div className="text-white/45">Unique Viewers</div>
                      <div className="text-base font-semibold text-white">
                        {analytics.uniqueViewerHashes?.length || creation.uniqueViewsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/45">Appreciations</div>
                      <div className="text-base font-semibold text-white">
                        {analytics.appreciations}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/45">Favorites</div>
                      <div className="text-base font-semibold text-white">{analytics.favorites}</div>
                    </div>
                    <div>
                      <div className="text-white/45">Comments</div>
                      <div className="text-base font-semibold text-white">{analytics.comments}</div>
                    </div>
                    <div>
                      <div className="text-white/45">Shares</div>
                      <div className="text-base font-semibold text-white">{analytics.shares}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Manage Form */}
              {isOwner && showManage && (
                <form
                  onSubmit={handleSaveManage}
                  className="p-4 rounded-xl border border-white/[0.15] bg-white/[0.04] space-y-3"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Edit Public Metadata & Privacy
                  </div>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Title"
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                  />
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    placeholder="Description"
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags (comma separated)"
                      className="px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={editCredits}
                    onChange={(e) => setEditCredits(e.target.value)}
                    placeholder="Creative credits"
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                  />

                  <div className="space-y-1.5 text-xs text-white/80 pt-1">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Enable Public Comments</span>
                      <input
                        type="checkbox"
                        checked={editCommentsEnabled}
                        onChange={(e) => setEditCommentsEnabled(e.target.checked)}
                        className="accent-white"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Show Creator Profile</span>
                      <input
                        type="checkbox"
                        checked={editShowProfile}
                        onChange={(e) => setEditShowProfile(e.target.checked)}
                        className="accent-white"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Show AI Model</span>
                      <input
                        type="checkbox"
                        checked={editShowModel}
                        onChange={(e) => setEditShowModel(e.target.checked)}
                        className="accent-white"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span>Share Prompt Publicly</span>
                      <input
                        type="checkbox"
                        checked={editShowPrompt}
                        onChange={(e) => setEditShowPrompt(e.target.checked)}
                        className="accent-white"
                      />
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2">
                    {!confirmUnpublish ? (
                      <button
                        type="button"
                        onClick={() => setConfirmUnpublish(true)}
                        className="px-3 py-1.5 rounded-lg border border-white/25 text-xs text-white/75 hover:bg-white/[0.08] flex items-center gap-1 cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Remove from Public</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUnpublish}
                        className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold text-xs cursor-pointer"
                      >
                        Confirm Unpublish
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={savingManage}
                      className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{savingManage ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* Report Form */}
              {showReport && (
                <form
                  onSubmit={handleSubmitReport}
                  className="p-4 rounded-xl border border-white/[0.15] bg-white/[0.04] space-y-3"
                >
                  <div className="text-xs font-mono uppercase tracking-wider text-white/60">
                    Report Published Creation
                  </div>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white"
                  >
                    <option value="Policy / Safety Concern">Policy / Safety Concern</option>
                    <option value="Copyright / Unauthorized Content">
                      Copyright / Unauthorized Content
                    </option>
                    <option value="Misleading AI Metadata">Misleading AI Metadata</option>
                    <option value="Spam or Abuse">Spam or Abuse</option>
                  </select>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    rows={2}
                    placeholder="Additional context for curation reviewers..."
                    className="w-full px-3 py-2 rounded-lg bg-black border border-white/[0.15] text-xs text-white resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReport(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold cursor-pointer"
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              )}

              {/* Comments Section */}
              <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                <div className="flex items-center justify-between text-xs font-mono text-white/60">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    COMMENTS ({creation.commentsCount})
                  </span>
                  {!creation.commentsEnabled && <span>Disabled by creator</span>}
                </div>

                {creation.commentsEnabled && (
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={
                        isAuthenticated ? 'Add constructive critique...' : 'Sign in to comment'
                      }
                      maxLength={1500}
                      className="flex-1 px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/40"
                    />
                    <button
                      type="submit"
                      disabled={postingComment || !commentText.trim()}
                      className="px-3.5 py-2 rounded-xl bg-white text-black text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      Post
                    </button>
                  </form>
                )}

                <div className="space-y-2.5">
                  {comments.length === 0 ? (
                    <div className="text-xs text-white/40 py-2">
                      No comments yet.
                    </div>
                  ) : (
                    comments.map((c) => {
                      const canDelete =
                        Boolean(currentUserId) &&
                        (c.authorId === currentUserId || isOwner || isCurator);
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-white/[0.08] bg-white/[0.02] space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-white">{c.authorName}</span>
                            <div className="flex items-center gap-2 text-white/40 font-mono">
                              <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-white/45 hover:text-white cursor-pointer"
                                  title="Delete comment"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-white/80 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox for Images */}
      {fullscreenImage && creation && creation.mediaType === 'IMAGE' && (
        <div
          onClick={() => setFullscreenImage(false)}
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={creation.mediaStreamUrl}
            alt={creation.title}
            className="max-w-full max-h-full object-contain"
          />
          <button
            type="button"
            onClick={() => setFullscreenImage(false)}
            className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
