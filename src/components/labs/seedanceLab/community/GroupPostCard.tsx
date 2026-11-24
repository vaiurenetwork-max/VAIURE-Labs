/**
 * VAIURE — COMMUNITY GROUP POST & WORKFLOW CARD
 * Renders IMAGE, VIDEO, WORKFLOW, TEXT, and LIVESTREAM posts inside Group & Community Feeds.
 * Supports Reactions, Save/Bookmark, Share, Nested Comments, Moderation Controls,
 * 1-Click Seedance Workflow Import, Report Submission, and Virtual Gifting.
 */

import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit3,
  Film,
  Flag,
  Gift,
  Heart,
  Layers,
  Lock,
  MessageSquare,
  Pin,
  PinOff,
  Radio,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  GroupPost,
  GroupPostComment,
  GroupPostReactionType,
  SeedanceWorkflowAttachment,
} from '../../../../types/seedancePlatform';
import { seedanceCommunityService } from '../../../../services/seedanceCommunityService';

interface GroupPostCardProps {
  post: GroupPost;
  currentUserId?: string;
  canModerate?: boolean;
  isAuthenticated: boolean;
  allowVirtualGifts?: boolean;
  onRequireAuth?: () => void;
  onPostUpdated: (post: GroupPost) => void;
  onPostDeleted: (postId: string) => void;
  onImportWorkflow?: (workflow: SeedanceWorkflowAttachment, sourcePost: GroupPost) => void;
  onOpenGroup?: (groupId: string) => void;
  onOpenUserProfile?: (userId: string) => void;
  onOpenLivestream?: (livestreamId: string, groupId: string) => void;
  onOpenGiftModal?: (recipient: {
    userId: string;
    username: string;
    displayName: string;
    groupId: string;
    postId: string;
  }) => void;
  onNotice?: (msg: string) => void;
}

const REACTIONS: Array<{ id: GroupPostReactionType; label: string }> = [
  { id: 'LIKE', label: 'Like' },
  { id: 'INSPIRE', label: 'Inspire' },
  { id: 'CINEMA', label: 'Cinema' },
  { id: 'RESPECT', label: 'Respect' },
];

export const GroupPostCard: React.FC<GroupPostCardProps> = ({
  post,
  currentUserId,
  canModerate = false,
  isAuthenticated,
  allowVirtualGifts = true,
  onRequireAuth,
  onPostUpdated,
  onPostDeleted,
  onImportWorkflow,
  onOpenGroup,
  onOpenUserProfile,
  onOpenLivestream,
  onOpenGiftModal,
  onNotice,
}) => {
  const isAuthor = currentUserId === post.authorId;

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<GroupPostComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<GroupPostComment | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [importing, setImporting] = useState(false);

  const totalReactions =
    (post.reactionCounts?.LIKE || 0) +
    (post.reactionCounts?.INSPIRE || 0) +
    (post.reactionCounts?.CINEMA || 0) +
    (post.reactionCounts?.RESPECT || 0);

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const res = await seedanceCommunityService.getComments(post.id);
      setComments(res.comments || []);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to load comments.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) {
      loadComments();
    }
  };

  const handleReact = async (reaction: GroupPostReactionType) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    try {
      const res = await seedanceCommunityService.reactToPost(post.id, reaction);
      onPostUpdated(res.post);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to record reaction.');
    }
  };

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    try {
      const res = await seedanceCommunityService.toggleSavePost(post.id);
      onPostUpdated({
        ...post,
        viewerSaved: res.saved,
        savesCount: res.savesCount,
      });
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to bookmark post.');
    }
  };

  const handleShare = async () => {
    try {
      const res = await seedanceCommunityService.sharePost(post.id);
      onPostUpdated({ ...post, sharesCount: res.sharesCount });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(
          `${window.location.origin}/#community-group-${post.groupId}-post-${post.id}`
        );
      }
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 1800);
    } catch {
      // ignore clipboard errors cleanly
    }
  };

  const handleImportWorkflow = async () => {
    if (!post.workflow) return;
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setImporting(true);
    try {
      const res = await seedanceCommunityService.importWorkflow(post.id);
      onPostUpdated({ ...post, importCount: post.importCount + 1 });
      onImportWorkflow?.(res.workflow, post);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to import workflow.');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await seedanceCommunityService.updatePost(post.id, {
        title: editTitle,
        body: editBody,
      });
      onPostUpdated(res.post);
      setEditing(false);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to save post edits.');
    }
  };

  const handleTogglePin = async () => {
    try {
      const res = await seedanceCommunityService.updatePost(post.id, {
        isPinned: !post.isPinned,
      });
      onPostUpdated(res.post);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to pin post.');
    }
  };

  const handleApprovePending = async () => {
    try {
      const res = await seedanceCommunityService.updatePost(post.id, {
        status: 'PUBLISHED',
      });
      onPostUpdated(res.post);
      onNotice?.(`Post "${post.title}" approved and published.`);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to approve post.');
    }
  };

  const handleDeletePost = async () => {
    try {
      await seedanceCommunityService.deletePost(post.id);
      setConfirmDeleteOpen(false);
      onPostDeleted(post.id);
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to delete post.');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await seedanceCommunityService.addComment(
        post.id,
        commentText.trim(),
        replyTo?.id
      );
      setComments((prev) => [...prev, res.comment]);
      onPostUpdated({ ...post, commentsCount: post.commentsCount + 1 });
      setCommentText('');
      setReplyTo(null);
    } catch (err: any) {
      onNotice?.(err?.message || 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await seedanceCommunityService.deleteComment(post.id, commentId);
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId)
      );
      onPostUpdated({ ...post, commentsCount: Math.max(0, post.commentsCount - 1) });
    } catch (err: any) {
      onNotice?.(err?.message || 'Failed to delete comment.');
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!reportReason.trim()) return;
    try {
      await seedanceCommunityService.submitReport({
        targetType: 'POST',
        targetId: post.id,
        groupId: post.groupId,
        targetSummary: post.title,
        reason: reportReason.trim(),
      });
      setReportModalOpen(false);
      setReportReason('');
      onNotice?.('Report submitted for moderation review.');
    } catch (err: any) {
      onNotice?.(err?.message || 'Unable to submit report.');
    }
  };

  const rootComments = comments.filter((c) => !c.parentCommentId);
  const repliesByParent = comments.reduce<Record<string, GroupPostComment[]>>((acc, c) => {
    if (c.parentCommentId) {
      acc[c.parentCommentId] = acc[c.parentCommentId] || [];
      acc[c.parentCommentId].push(c);
    }
    return acc;
  }, {});

  return (
    <article className="rounded-2xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-md p-5 space-y-4 text-white">
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onOpenUserProfile?.(post.authorId)}
            className="w-9 h-9 rounded-full border border-white/20 bg-white/[0.06] flex items-center justify-center text-xs font-mono uppercase font-semibold shrink-0 cursor-pointer overflow-hidden"
          >
            {post.authorAvatar ? (
              <img
                src={post.authorAvatar}
                alt={post.authorDisplayName}
                className="w-full h-full object-cover"
              />
            ) : (
              post.authorDisplayName.slice(0, 2).toUpperCase()
            )}
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => onOpenUserProfile?.(post.authorId)}
                className="font-semibold text-white hover:underline cursor-pointer truncate"
              >
                {post.authorDisplayName}
              </button>
              <span className="font-mono text-white/45 text-[11px]">
                @{post.authorUsername}
              </span>
              <span className="text-white/30">·</span>
              <span className="font-mono text-[10px] uppercase text-white/60">
                {post.authorGroupRole}
              </span>
              {onOpenGroup && (
                <>
                  <span className="text-white/30">·</span>
                  <button
                    type="button"
                    onClick={() => onOpenGroup(post.groupId)}
                    className="font-mono text-[11px] text-white/75 hover:text-white underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {post.groupVisibility === 'PRIVATE' && <Lock className="w-2.5 h-2.5" />}
                    {post.groupName}
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-white/45 mt-0.5">
              <span>{post.postType}</span>
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleString()}</span>
              {post.editedAt && <span>(Edited)</span>}
              {post.isPinned && (
                <>
                  <span>·</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <Pin className="w-2.5 h-2.5" /> PINNED
                  </span>
                </>
              )}
              {post.status === 'PENDING_APPROVAL' && (
                <>
                  <span>·</span>
                  <span className="text-white font-semibold">PENDING APPROVAL</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Post Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {post.status === 'PENDING_APPROVAL' && canModerate && (
            <button
              type="button"
              onClick={handleApprovePending}
              className="px-2.5 py-1 rounded-lg bg-white text-black font-mono text-[10px] font-semibold uppercase cursor-pointer"
            >
              Approve & Publish
            </button>
          )}
          {canModerate && (
            <button
              type="button"
              onClick={handleTogglePin}
              title={post.isPinned ? 'Unpin Post' : 'Pin Post'}
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 cursor-pointer"
            >
              {post.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}
          {isAuthor && (
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              title="Edit Post"
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {(isAuthor || canModerate) && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              title="Delete Post"
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {!isAuthor && (
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              title="Report Post"
              className="p-1.5 rounded-lg border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] text-white/70 cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body or Inline Editor */}
      {editing ? (
        <div className="space-y-3 p-3.5 rounded-xl border border-white/15 bg-black/50">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-white/15 bg-black text-white text-sm"
            placeholder="Post Title"
          />
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-white/15 bg-black text-white text-xs"
            placeholder="Post Body"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-white/15 text-xs font-mono text-white/70 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {post.title && <h3 className="text-base font-medium text-white">{post.title}</h3>}
          {post.body && (
            <p className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-sans">
              {post.body}
            </p>
          )}
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-white/50 pt-0.5">
              {post.tags.map((t) => (
                <span key={t}>#{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Images Gallery */}
      {post.images.length > 0 && (
        <div
          className={`grid gap-2 ${
            post.images.length === 1
              ? 'grid-cols-1'
              : post.images.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}
        >
          {post.images.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setLightboxUrl(url)}
              className="rounded-xl overflow-hidden border border-white/[0.1] bg-black aspect-video group cursor-pointer"
            >
              <img
                src={url}
                alt={`${post.title} asset ${idx + 1}`}
                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Video Player */}
      {post.videoUrl && (
        <div className="rounded-xl overflow-hidden border border-white/[0.12] bg-black">
          <video
            src={post.videoUrl}
            poster={post.thumbnailUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[420px] object-contain bg-black"
          />
        </div>
      )}

      {/* Livestream Link Banner */}
      {post.postType === 'LIVESTREAM' && post.livestreamId && (
        <div className="p-4 rounded-xl border border-white/20 bg-white/[0.04] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="font-mono uppercase text-white font-semibold">
              Group Livestream Session · ID {post.livestreamId}
            </span>
          </div>
          {onOpenLivestream && (
            <button
              type="button"
              onClick={() => onOpenLivestream(post.livestreamId!, post.groupId)}
              className="px-3.5 py-1.5 rounded-lg bg-white text-black font-mono text-[11px] font-semibold uppercase cursor-pointer"
            >
              Join Group Livestream
            </button>
          )}
        </div>
      )}

      {/* Seedance Structured Workflow Block */}
      {post.workflow && (
        <div className="rounded-xl border border-white/20 bg-black/60 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/60">
                <Layers className="w-3.5 h-3.5" />
                <span>Seedance Workflow Specification</span>
                <span>·</span>
                <span className="tabular-nums">{post.importCount} Imports</span>
              </div>
              <h4 className="text-sm font-semibold text-white">{post.workflow.title}</h4>
              {post.workflow.description && (
                <p className="text-xs text-white/65">{post.workflow.description}</p>
              )}
            </div>

            {onImportWorkflow && (
              <button
                type="button"
                onClick={handleImportWorkflow}
                disabled={importing}
                className="px-4 py-2 rounded-lg bg-white text-black font-mono text-[11px] font-semibold uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>{importing ? 'Loading...' : 'Import Workflow'}</span>
              </button>
            )}
          </div>

          {/* Workflow Technical Parameters */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-white/70 border-y border-white/[0.08] py-2 tabular-nums">
            <span>Model: {post.workflow.modelKey}</span>
            <span>·</span>
            <span>Aspect: {post.workflow.aspectRatio}</span>
            <span>·</span>
            <span>Res: {post.workflow.resolution.toUpperCase()}</span>
            <span>·</span>
            <span>{post.workflow.duration}s</span>
            <span>·</span>
            <span>Physics: {post.workflow.physicsPriority ? 'Priority' : 'Standard'}</span>
            <span>·</span>
            <span>Rating: {post.workflow.contentRating}</span>
          </div>

          <div className="p-3 rounded-lg border border-white/[0.08] bg-white/[0.025] space-y-1">
            <div className="text-[10px] font-mono uppercase text-white/45">Master Prompt</div>
            <p className="text-xs font-mono text-white/85 whitespace-pre-wrap line-clamp-4">
              {post.workflow.prompt}
            </p>
          </div>

          {post.workflow.sceneSequences && post.workflow.sceneSequences.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-white/45">
                Scene Continuity Sequences ({post.workflow.sceneSequences.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {post.workflow.sceneSequences.map((sc) => (
                  <div
                    key={sc.step}
                    className="p-2.5 rounded-lg border border-white/[0.08] bg-black/50 text-[11px] space-y-0.5"
                  >
                    <div className="font-mono text-white font-semibold">
                      Step {sc.step}: {sc.title}
                      {sc.cameraMovement ? ` · ${sc.cameraMovement}` : ''}
                    </div>
                    <p className="text-white/60 line-clamp-2">{sc.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {post.workflow.referenceImages && post.workflow.referenceImages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.workflow.referenceImages.slice(0, 8).map((img, i) => (
                <button
                  key={`${img}-${i}`}
                  type="button"
                  onClick={() => setLightboxUrl(img)}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-white/15 bg-black cursor-pointer"
                >
                  <img src={img} alt={`Ref ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Bar */}
      <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-1.5">
          {REACTIONS.map((r) => {
            const active = post.viewerReaction === r.id;
            const count = post.reactionCounts?.[r.id] || 0;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleReact(r.id)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1 transition-all cursor-pointer tabular-nums ${
                  active
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-white/[0.03] text-white/70 border-white/[0.1] hover:text-white'
                }`}
              >
                {r.id === 'LIKE' && <Heart className="w-3 h-3" />}
                {r.id === 'INSPIRE' && <Sparkles className="w-3 h-3" />}
                {r.id === 'CINEMA' && <Film className="w-3 h-3" />}
                <span>{r.label}</span>
                {count > 0 && <span>({count})</span>}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleToggleComments}
            className="px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/70 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer tabular-nums"
          >
            <MessageSquare className="w-3 h-3" />
            <span>Comments ({post.commentsCount})</span>
            {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {allowVirtualGifts && !isAuthor && onOpenGiftModal && (
            <button
              type="button"
              onClick={() =>
                onOpenGiftModal({
                  userId: post.authorId,
                  username: post.authorUsername,
                  displayName: post.authorDisplayName,
                  groupId: post.groupId,
                  postId: post.id,
                })
              }
              className="px-2.5 py-1 rounded-lg border border-white/25 bg-white/[0.06] hover:bg-white hover:text-black text-white text-[11px] flex items-center gap-1 cursor-pointer tabular-nums transition-all"
            >
              <Gift className="w-3 h-3" />
              <span>Gift{post.giftTotalCredits > 0 ? ` (${post.giftTotalCredits} CR)` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleSave}
            className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1 cursor-pointer tabular-nums ${
              post.viewerSaved
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-white/[0.03] text-white/70 border-white/[0.1] hover:text-white'
            }`}
          >
            <Bookmark className="w-3 h-3" />
            <span>{post.viewerSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/70 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer tabular-nums"
          >
            {copiedShare ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
            <span>{copiedShare ? 'Copied' : `Share (${post.sharesCount})`}</span>
          </button>
        </div>
      </div>

      {/* Comments Thread */}
      {showComments && (
        <div className="pt-3 border-t border-white/[0.08] space-y-3">
          {totalReactions > 0 && (
            <div className="text-[10px] font-mono text-white/45 tabular-nums">
              {totalReactions} total reactions
            </div>
          )}

          {loadingComments ? (
            <div className="text-xs font-mono text-white/45 py-2">Loading comments...</div>
          ) : rootComments.length === 0 ? (
            <div className="text-xs font-mono text-white/45 py-2">
              No comments yet. Start the discussion.
            </div>
          ) : (
            <div className="space-y-2.5">
              {rootComments.map((c) => {
                const replies = repliesByParent[c.id] || [];
                const canDel = c.authorId === currentUserId || canModerate;
                return (
                  <div key={c.id} className="space-y-2">
                    <div className="p-3 rounded-xl border border-white/[0.08] bg-black/50 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-white/50">
                        <div>
                          <button
                            type="button"
                            onClick={() => onOpenUserProfile?.(c.authorId)}
                            className="text-white font-semibold hover:underline cursor-pointer"
                          >
                            {c.authorDisplayName}
                          </button>{' '}
                          <span>@{c.authorUsername}</span> · <span>{c.authorGroupRole}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>{new Date(c.createdAt).toLocaleString()}</span>
                          {!post.commentsDisabled && (
                            <button
                              type="button"
                              onClick={() => setReplyTo(c)}
                              className="text-white/70 hover:text-white underline cursor-pointer"
                            >
                              Reply
                            </button>
                          )}
                          {canDel && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-white/50 hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-white/85 whitespace-pre-wrap">{c.content}</p>
                    </div>

                    {replies.length > 0 && (
                      <div className="pl-5 space-y-1.5 border-l border-white/10">
                        {replies.map((r) => {
                          const canDelR = r.authorId === currentUserId || canModerate;
                          return (
                            <div
                              key={r.id}
                              className="p-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                                <span>
                                  <strong className="text-white">{r.authorDisplayName}</strong> @
                                  {r.authorUsername}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                                  {canDelR && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteComment(r.id)}
                                      className="text-white/50 hover:text-white cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-white/80 whitespace-pre-wrap">{r.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {post.commentsDisabled ? (
            <div className="text-[11px] font-mono text-white/45">
              Comments have been disabled for this post.
            </div>
          ) : (
            <form onSubmit={handleSubmitComment} className="space-y-1.5">
              {replyTo && (
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60 bg-white/[0.04] px-2.5 py-1 rounded">
                  <span>Replying to @{replyTo.authorUsername}</span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="text-white/50 hover:text-white cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment... Use @username to mention creators"
                  className="flex-1 px-3 py-2 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35 text-xs focus:outline-none focus:border-white"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-3.5 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Custom Delete Post Confirmation Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#08080a] p-5 space-y-4">
            <h4 className="text-sm font-mono uppercase font-semibold">Confirm Post Deletion</h4>
            <p className="text-xs text-white/65">
              Permanently remove "{post.title}" and all attached comments? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePost}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase cursor-pointer"
              >
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitReport}
            className="w-full max-w-sm rounded-2xl border border-white/20 bg-[#08080a] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-mono uppercase font-semibold">Report Content</h4>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              required
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain why this post violates community guidelines..."
              className="w-full p-2.5 rounded-lg border border-white/15 bg-black text-white text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="px-3.5 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Image Preview */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={lightboxUrl}
            alt="Full resolution preview"
            className="max-w-full max-h-[88vh] rounded-xl border border-white/20 object-contain"
          />
        </div>
      )}
    </article>
  );
};
