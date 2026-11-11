import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Heart, Trash2 } from 'lucide-react';
import { ShortVideo, ShortComment } from '../../types/shorts';
import { UserProfile } from '../../types/social';
import { useLanguage } from '../../services/i18n';
import {
  subscribeToShortComments,
  addFirestoreShortComment,
} from '../../services/shortsService';

interface ShortsCommentsDrawerProps {
  short: ShortVideo | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile?: (username: string) => void;
  onOpenAuthModal?: () => void;
}

export const ShortsCommentsDrawer: React.FC<ShortsCommentsDrawerProps> = ({
  short,
  currentUser,
  isOpen,
  onClose,
  onOpenProfile,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const [comments, setComments] = useState<ShortComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    if (!short?.id || !isOpen) {
      setComments([]);
      return;
    }

    const unsubscribe = subscribeToShortComments(short.id, (loaded) => {
      setComments(loaded);
    });

    return () => unsubscribe();
  }, [short?.id, isOpen]);

  // Accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !short) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newComment: ShortComment = {
      id: commentId,
      shortId: short.id,
      authorId: currentUser.id,
      authorName: currentUser.displayName || currentUser.username || 'Creator',
      authorUsername: currentUser.username || 'creator',
      authorAvatar: currentUser.avatar || '',
      content: trimmed,
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    try {
      await addFirestoreShortComment(
        newComment,
        short.commentsCount || 0,
        short.authorId,
        short.title
      );
      setCommentText('');
    } catch (err) {
      console.error('Add comment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile swipe-down to dismiss handler on drag bar
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
      aria-label={t('shortsComments')}
      className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Container: Bottom Sheet on Mobile (<sm) & Right Drawer on Desktop (sm+) */}
      <div
        className="w-full sm:max-w-md bg-[#0C0C12] border-t sm:border-t-0 sm:border-l border-white/10 max-h-[82vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-none flex flex-col text-white shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Pill */}
        <div
          onTouchStart={handleTouchStartDrag}
          onTouchEnd={handleTouchEndDrag}
          className="sm:hidden w-full py-2 flex items-center justify-center cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-white">
              {t('shortsComments')}
            </h3>
            <span className="text-[11px] font-mono text-white/50">
              ({comments.length})
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="touch-press touch-target-min w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {comments.length === 0 ? (
            <div className="h-44 sm:h-full flex flex-col items-center justify-center text-center p-6 text-white/40">
              <p className="text-xs font-mono mb-1">{t('shortsNoComments')}</p>
              <p className="text-[11px] text-white/30">
                Share your perspective, critiques, or observations on neural cinema.
              </p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 group">
                {/* Avatar */}
                <button
                  onClick={() => onOpenProfile?.(c.authorUsername)}
                  aria-label={`View ${c.authorName}'s profile`}
                  className="touch-press touch-target-min w-8 h-8 rounded-full overflow-hidden border border-white/15 bg-neutral-900 shrink-0 cursor-pointer flex items-center justify-center"
                >
                  {c.authorAvatar ? (
                    <img
                      src={c.authorAvatar}
                      alt=""
                      className="w-full h-full object-cover filter grayscale"
                    />
                  ) : (
                    <span className="text-[10px] font-mono text-white/60">
                      {c.authorUsername.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0 select-text">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <button
                      onClick={() => onOpenProfile?.(c.authorUsername)}
                      className="text-xs font-semibold text-white/90 hover:text-white truncate cursor-pointer"
                    >
                      {c.authorName}
                    </button>
                    <span className="text-[10px] font-mono text-white/40">
                      @{c.authorUsername}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form
          onSubmit={handleAddComment}
          className="p-3 border-t border-white/10 bg-black/50 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              currentUser.id ? t('shortsAddComment') : 'Sign in to add a comment...'
            }
            disabled={isSubmitting}
            maxLength={500}
            className="flex-1 px-3.5 py-2.5 bg-white/[0.06] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white placeholder-white/30"
          />
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            aria-label="Send comment"
            className="touch-press touch-target-min p-2.5 rounded-xl bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
