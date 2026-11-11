import React, { useState, useEffect } from 'react';
import { ForumThread, ForumReply } from '../../types/forum';
import { UserProfile } from '../../types/social';
import {
  Heart,
  MessageCircle,
  Repeat,
  Share2,
  MoreHorizontal,
  Trash2,
  Check,
  Send,
  Loader2,
  Shield,
  Sparkles,
} from 'lucide-react';
import {
  toggleLikeForumThread,
  toggleRepostForumThread,
  subscribeToThreadReplies,
  createThreadReply,
  deleteForumThread,
} from '../../services/forumService';

interface ForumThreadCardProps {
  thread: ForumThread;
  currentUser: UserProfile;
  onOpenAuthModal?: () => void;
  onOpenProfile?: (userId: string) => void;
}

export const ForumThreadCard: React.FC<ForumThreadCardProps> = ({
  thread,
  currentUser,
  onOpenAuthModal,
  onOpenProfile,
}) => {
  const [isLiked, setIsLiked] = useState(Boolean(thread.isLiked));
  const [likesCount, setLikesCount] = useState(thread.likesCount);
  const [isReposted, setIsReposted] = useState(Boolean(thread.isReposted));
  const [repostsCount, setRepostsCount] = useState(thread.repostsCount);

  const [isRepliesOpen, setIsRepliesOpen] = useState(false);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyInput, setReplyInput] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync state with thread prop
  useEffect(() => {
    setIsLiked(Boolean(thread.isLiked));
    setLikesCount(thread.likesCount);
    setIsReposted(Boolean(thread.isReposted));
    setRepostsCount(thread.repostsCount);
  }, [thread.isLiked, thread.likesCount, thread.isReposted, thread.repostsCount]);

  // Subscribe to replies when opened
  useEffect(() => {
    if (!isRepliesOpen) return;
    const unsub = subscribeToThreadReplies(thread.id, (liveReplies) => {
      setReplies(liveReplies);
    });
    return () => unsub();
  }, [isRepliesOpen, thread.id]);

  const handleLike = async () => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    const willLike = !isLiked;
    setIsLiked(willLike);
    setLikesCount((prev) => (willLike ? prev + 1 : Math.max(0, prev - 1)));

    const result = await toggleLikeForumThread(thread.id, currentUser.id);
    setIsLiked(result.isLiked);
    setLikesCount(result.count);
  };

  const handleRepost = async () => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    const willRepost = !isReposted;
    setIsReposted(willRepost);
    setRepostsCount((prev) => (willRepost ? prev + 1 : Math.max(0, prev - 1)));

    const result = await toggleRepostForumThread(thread.id, currentUser.id);
    setIsReposted(result.isReposted);
    setRepostsCount(result.count);
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    setIsSubmittingReply(true);
    try {
      await createThreadReply(thread.id, currentUser, replyInput.trim());
      setReplyInput('');
    } catch (err) {
      console.warn('Reply error:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleShare = () => {
    const shareText = `"${thread.content.slice(0, 80)}..." — by @${thread.authorUsername} on VAIURE 唯昱尔`;
    navigator.clipboard.writeText(`${window.location.origin}/#forum-${thread.id}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (confirm('Delete this dispatch from the archive?')) {
      await deleteForumThread(thread.id);
    }
  };

  const isAuthor = currentUser.id === thread.authorId;

  const formatTime = (isoString: string) => {
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <article className="border-b border-white/10 hover:bg-white/[0.015] transition-colors p-4 sm:p-5 select-text">
      {/* Thread Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            onClick={() => onOpenProfile?.(thread.authorId)}
            className="w-10 h-10 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white/70 cursor-pointer"
          >
            {thread.authorAvatar ? (
              <img
                src={thread.authorAvatar}
                alt={thread.authorDisplayName}
                className="w-full h-full object-cover filter grayscale"
              />
            ) : (
              <span>{thread.authorUsername.slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                onClick={() => onOpenProfile?.(thread.authorId)}
                className="text-sm font-semibold text-white tracking-tight hover:underline cursor-pointer"
              >
                {thread.authorDisplayName}
              </span>
              <span className="text-xs text-white/40 font-mono">
                @{thread.authorUsername}
              </span>
              <span className="text-[10px] text-white/30 font-mono">·</span>
              <span className="text-[10px] text-white/40 font-mono">
                {formatTime(thread.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.2 rounded uppercase">
                #{thread.topic}
              </span>
              {thread.authorVerified && (
                <span className="text-[9px] font-mono text-white/40 flex items-center gap-0.5">
                  <Shield className="w-2.5 h-2.5 text-white/60" />
                  VERIFIED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-1">
          {isAuthor && (
            <button
              onClick={handleDelete}
              title="Delete thread"
              className="text-white/30 hover:text-red-400 p-1.5 transition-colors rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Thought Content */}
      <div className="mt-3 pl-12">
        <p className="text-sm sm:text-base font-sans text-neutral-200 font-light leading-relaxed whitespace-pre-wrap break-words">
          {thread.content}
        </p>

        {/* Attached Media Grid */}
        {thread.mediaUrls && thread.mediaUrls.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {thread.mediaUrls.map((url, i) => (
              <div
                key={i}
                className="rounded-xl overflow-hidden border border-white/15 bg-black aspect-[4/3]"
              >
                <img src={url} alt="Attached" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Chained Thoughts (Connected Thread) */}
        {thread.chainedThoughts && thread.chainedThoughts.length > 0 && (
          <div className="mt-4 space-y-4 relative pl-4 border-l border-white/20">
            {thread.chainedThoughts.map((chained, idx) => (
              <div key={chained.id || idx} className="space-y-1 relative">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  THREAD PART {idx + 2}
                </span>
                <p className="text-sm font-sans text-neutral-300 font-light leading-relaxed whitespace-pre-wrap">
                  {chained.content}
                </p>
                {chained.mediaUrls && chained.mediaUrls.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {chained.mediaUrls.map((u, ui) => (
                      <div key={ui} className="rounded-lg overflow-hidden border border-white/10 aspect-video">
                        <img src={u} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center gap-6 mt-4 pt-2 text-white/50 text-xs font-mono">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${
              isLiked ? 'text-rose-500' : 'hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500' : ''}`} />
            <span>{likesCount}</span>
          </button>

          {/* Reply */}
          <button
            onClick={() => setIsRepliesOpen(!isRepliesOpen)}
            className={`flex items-center gap-1.5 transition-colors ${
              isRepliesOpen ? 'text-white' : 'hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{thread.repliesCount + (replies.length > thread.repliesCount ? replies.length - thread.repliesCount : 0)}</span>
          </button>

          {/* Repost */}
          <button
            onClick={handleRepost}
            className={`flex items-center gap-1.5 transition-colors ${
              isReposted ? 'text-emerald-400' : 'hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span>{repostsCount}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isCopied ? 'COPIED' : 'SHARE'}</span>
          </button>
        </div>

        {/* Replies Section Drawer */}
        {isRepliesOpen && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-4">
            {/* Inline Quick Reply Input */}
            <form onSubmit={handleReplySubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                placeholder={`Reply to @${thread.authorUsername}...`}
                className="flex-1 bg-white/5 border border-white/15 rounded-full px-4 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-white transition-colors font-sans"
              />
              <button
                type="submit"
                disabled={!replyInput.trim() || isSubmittingReply}
                className="px-4 py-2 rounded-full bg-white text-black text-xs font-semibold uppercase disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
              >
                {isSubmittingReply ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                <span className="hidden sm:inline">Reply</span>
              </button>
            </form>

            {/* List of Replies */}
            <div className="space-y-3 pt-2">
              {replies.length === 0 ? (
                <div className="text-center py-4 text-xs font-mono text-white/30 uppercase tracking-widest">
                  NO REPLIES YET. BE THE FIRST TO RESPOND.
                </div>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.02]">
                    <div className="w-7 h-7 rounded-full overflow-hidden border border-white/15 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-[9px] text-white/70">
                      {reply.authorAvatar ? (
                        <img src={reply.authorAvatar} alt="" className="w-full h-full object-cover filter grayscale" />
                      ) : (
                        <span>{reply.authorUsername.slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-white">
                          {reply.authorDisplayName}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          @{reply.authorUsername}
                        </span>
                        <span className="text-[9px] text-white/30 font-mono">·</span>
                        <span className="text-[9px] text-white/40 font-mono">
                          {formatTime(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-neutral-300 font-light mt-0.5 leading-relaxed">
                        {reply.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
