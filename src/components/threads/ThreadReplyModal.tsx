import React, { useState, useEffect } from 'react';
import { ForumThread, ForumReply } from '../../types/forum';
import { UserProfile } from '../../types/social';
import {
  subscribeToThreadReplies,
  createThreadReply,
} from '../../services/forumService';
import { useLanguage } from '../../services/i18n';
import { X, Send, Heart, Loader2, Sparkles, MessageCircle } from 'lucide-react';

interface ThreadReplyModalProps {
  thread: ForumThread | null;
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (username?: string) => void;
  onOpenAuthModal?: () => void;
}

export const ThreadReplyModal: React.FC<ThreadReplyModalProps> = ({
  thread,
  currentUser,
  isOpen,
  onClose,
  onOpenProfile,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !thread) {
      setReplies([]);
      return;
    }

    const unsub = subscribeToThreadReplies(thread.id, (liveReplies) => {
      setReplies(liveReplies);
    });

    return () => unsub();
  }, [isOpen, thread?.id]);

  if (!isOpen || !thread) return null;

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createThreadReply(thread.id, currentUser, replyText.trim());
      setReplyText('');
    } catch (err: any) {
      setError(err?.message || 'Could not post reply. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md select-text">
      <div className="relative w-full max-w-[580px] max-h-[90vh] bg-[#0c0c10] border border-neutral-800 rounded-2xl flex flex-col text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-serif uppercase tracking-widest text-white/50">
              {t('threadDiscussion')}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Main Parent Thread */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                onClick={() => onOpenProfile(thread.authorUsername)}
                className="w-10 h-10 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer flex-shrink-0"
              >
                {thread.authorAvatar ? (
                  <img src={thread.authorAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs font-mono">
                    {thread.authorUsername.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              {/* Vertical connector line */}
              <div className="w-0.5 bg-neutral-800 flex-1 my-2" />
            </div>

            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center justify-between">
                <span
                  onClick={() => onOpenProfile(thread.authorUsername)}
                  className="text-sm font-semibold text-white hover:underline cursor-pointer"
                >
                  {thread.authorUsername}
                </span>
                <span className="text-xs text-neutral-500 font-sans">
                  {new Date(thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-neutral-200 font-sans font-light mt-1 whitespace-pre-wrap leading-relaxed">
                {thread.content}
              </p>

              {thread.mediaUrls && thread.mediaUrls.length > 0 && (
                <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                  {thread.mediaUrls.map((url, i) => {
                    const opt = thread.optimizedImages?.[i];
                    return (
                      <img
                        key={i}
                        src={opt?.thumbnailUrl || url}
                        alt="Thread visual"
                        loading="lazy"
                        decoding="async"
                        className="w-32 aspect-[3/4] object-cover rounded-xl border border-neutral-800 bg-neutral-900"
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Existing Replies List */}
          {replies.length > 0 && (
            <div className="space-y-4 pl-4 border-l border-neutral-800 ml-5 my-2">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-3">
                  <div
                    onClick={() => onOpenProfile(reply.authorUsername)}
                    className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 cursor-pointer flex-shrink-0"
                  >
                    {reply.authorAvatar ? (
                      <img src={reply.authorAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[10px] font-mono">
                        {reply.authorUsername.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => onOpenProfile(reply.authorUsername)}
                        className="text-xs font-semibold text-white hover:underline cursor-pointer"
                      >
                        {reply.authorUsername}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-sans">
                        {new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-300 font-light mt-0.5 leading-relaxed">
                      {reply.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {replies.length === 0 && (
            <div className="text-center py-4 text-xs text-neutral-500 font-mono">
              {t('noRepliesYet')}
            </div>
          )}
        </div>

        {/* Reply Input Bar */}
        <form onSubmit={handleSubmitReply} className="p-4 border-t border-neutral-800 bg-neutral-950/80">
          {error && (
            <div className="mb-2 text-xs font-mono text-red-400">
              {error}
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex-shrink-0 flex items-center justify-center text-xs font-mono">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'VA'}</span>
              )}
            </div>

            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`${t('replyTo')} @${thread.authorUsername}...`}
              maxLength={500}
              disabled={isSubmitting}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-0 font-sans"
            />

            <button
              type="submit"
              disabled={!replyText.trim() || isSubmitting}
              className="px-4 py-1.5 bg-white text-black font-semibold text-xs rounded-full hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>{t('post')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
