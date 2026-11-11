import React, { useState, useEffect, useRef } from 'react';
import { SocialPost, PostComment, UserProfile } from '../../types/social';
import { X, Heart, CornerDownRight, Trash2, Send } from 'lucide-react';
import { AdministratorBadge } from '../admin/AdministratorBadge';
import { VideoPlayer } from '../media/VideoPlayer';

interface CommentsDrawerProps {
  post: SocialPost | null;
  currentUser: UserProfile;
  comments: PostComment[];
  isOpen: boolean;
  onClose: () => void;
  onAddComment: (postId: string, content: string, parentId?: string | null) => void;
  onLikeComment: (postId: string, commentId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onOpenProfile: (username: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  post,
  currentUser,
  comments,
  isOpen,
  onClose,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  onOpenProfile,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const dragStartY = useRef<number | null>(null);

  // Keyboard navigation: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onAddComment(post.id, inputText.trim(), replyingTo ? replyingTo.id : null);
    setInputText('');
    setReplyingTo(null);
  };

  const handleStartReply = (c: PostComment) => {
    setReplyingTo(c);
    setInputText(`@${c.authorUsername} `);
  };

  const handleTouchStartDrag = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchEndDrag = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const diff = e.changedTouches[0].clientY - dragStartY.current;
    if (diff > 60) {
      onClose();
    }
    dragStartY.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Comments for ${post.title}`}
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/80 backdrop-blur-md select-text"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#09090b] border-t sm:border-t-0 sm:border-l border-white/15 max-h-[85vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none flex flex-col text-white shadow-2xl overflow-hidden pb-safe animate-in slide-in-from-bottom sm:slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div
          onTouchStart={handleTouchStartDrag}
          onTouchEnd={handleTouchEndDrag}
          className="sm:hidden w-full py-2 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
              COMMENTS ({post.commentsCount})
            </span>
            <h3 className="text-base font-serif uppercase tracking-tight text-white line-clamp-1">
              {post.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Comments"
            className="touch-press touch-target-min w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 p-1 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Media Preview Header (Desktop or when space permits) */}
        {post.media?.[0] && (
          <div className="hidden sm:block border-b border-white/10 bg-black shrink-0">
            {post.media[0].type === 'video' ? (
              <VideoPlayer
                src={post.media[0].url}
                poster={post.media[0].poster}
                title={post.title}
                creator={post.authorUsername}
                category={post.category}
                aspectRatio="16:9"
                autoPlay={false}
                className="w-full"
              />
            ) : (
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-900">
                <img
                  src={post.media[0].url}
                  alt={post.title}
                  className="w-full h-full object-cover filter grayscale contrast-[1.1]"
                />
              </div>
            )}
          </div>
        )}

        {/* Comments Feed List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 min-h-0">
          {comments.length === 0 ? (
            <div className="py-16 sm:py-24 text-center text-white/40 font-mono text-xs tracking-widest uppercase">
              NO COMMENTS YET
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="space-y-2.5 border-b border-white/5 pb-3.5">
                {/* Main Comment */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => onOpenProfile(comment.authorUsername)}
                      aria-label={`View ${comment.authorUsername}'s profile`}
                      className="touch-press touch-target-min w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0 flex items-center justify-center bg-neutral-900 cursor-pointer"
                    >
                      {comment.authorAvatar ? (
                        <img
                          src={comment.authorAvatar}
                          alt=""
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <span className="text-[10px] font-mono text-white/70">
                          {comment.authorUsername ? comment.authorUsername.slice(0, 2).toUpperCase() : 'VA'}
                        </span>
                      )}
                    </button>

                    <div className="space-y-1 flex-1 min-w-0 select-text">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenProfile(comment.authorUsername)}
                          className="text-xs font-serif uppercase tracking-wider text-white hover:underline cursor-pointer truncate"
                        >
                          {comment.authorDisplayName || comment.authorUsername}
                        </button>
                        <span className="text-[10px] font-mono text-white/40 truncate">
                          @{comment.authorUsername}
                        </span>
                        {comment.isEditorComment && <AdministratorBadge role="EDITOR" size="xs" />}
                      </div>

                      <p className="text-xs text-white/90 font-light leading-relaxed break-words">
                        {comment.content}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-white/40">
                        <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleStartReply(comment)}
                          className="touch-press touch-target-min py-1 text-white/60 hover:text-white transition-colors cursor-pointer font-medium"
                        >
                          REPLY
                        </button>
                        {currentUser.id === comment.authorId && (
                          <button
                            onClick={() => onDeleteComment(post.id, comment.id)}
                            className="touch-press touch-target-min py-1 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          >
                            DELETE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Comment Like Button */}
                  <button
                    onClick={() => onLikeComment(post.id, comment.id)}
                    aria-label={`Like comment (${comment.likesCount})`}
                    className="touch-press touch-target-min p-2 text-white/40 hover:text-white flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${comment.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                    {comment.likesCount > 0 && (
                      <span className="text-[9px] font-mono mt-0.5">{comment.likesCount}</span>
                    )}
                  </button>
                </div>

                {/* Nested Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-3 pl-3 border-l border-white/10 pt-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            onClick={() => onOpenProfile(reply.authorUsername)}
                            aria-label={`View ${reply.authorUsername}'s profile`}
                            className="touch-press touch-target-min w-6 h-6 rounded-full overflow-hidden border border-white/20 shrink-0 flex items-center justify-center bg-neutral-900 cursor-pointer"
                          >
                            {reply.authorAvatar ? (
                              <img
                                src={reply.authorAvatar}
                                alt=""
                                className="w-full h-full object-cover filter grayscale"
                              />
                            ) : (
                              <span className="text-[9px] font-mono text-white/70">
                                {reply.authorUsername ? reply.authorUsername.slice(0, 2).toUpperCase() : 'VA'}
                              </span>
                            )}
                          </button>

                          <div className="space-y-0.5 flex-1 min-w-0 select-text">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-serif uppercase tracking-wider text-white truncate">
                                {reply.authorDisplayName || reply.authorUsername}
                              </span>
                              <span className="text-[9px] font-mono text-white/40 truncate">
                                @{reply.authorUsername}
                              </span>
                            </div>
                            <p className="text-xs text-white/80 font-light leading-relaxed break-words">
                              {reply.content}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => onLikeComment(post.id, reply.id)}
                          aria-label={`Like reply (${reply.likesCount})`}
                          className="touch-press touch-target-min p-1.5 text-white/40 hover:text-white flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Heart
                            className={`w-3 h-3 ${reply.isLiked ? 'fill-red-500 text-red-500' : ''}`}
                          />
                          {reply.likesCount > 0 && (
                            <span className="text-[9px] font-mono mt-0.5">{reply.likesCount}</span>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-neutral-950 shrink-0">
          {replyingTo && (
            <div className="flex items-center justify-between text-[11px] font-mono text-white/50 mb-2 px-1">
              <span>REPLYING TO @{replyingTo.authorUsername}</span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setInputText('');
                }}
                className="touch-press touch-target-min text-white hover:underline text-[10px] py-1"
              >
                CANCEL
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Add observation, critique, or mention (@)..."
              className="w-full bg-neutral-900 border border-white/15 px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors rounded-sm"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Send comment"
              className="touch-press touch-target-min px-4 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors font-mono text-xs font-semibold uppercase disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 shrink-0 rounded-sm"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
