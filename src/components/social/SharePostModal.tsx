import React, { useState, useEffect } from 'react';
import { SocialPost, Conversation } from '../../types/social';
import { X, Copy, Check, Send } from 'lucide-react';

interface SharePostModalProps {
  post: SocialPost | null;
  conversations: Conversation[];
  isOpen: boolean;
  onClose: () => void;
  onSendToConversation: (convId: string, post: SocialPost) => void;
}

export const SharePostModal: React.FC<SharePostModalProps> = ({
  post,
  conversations,
  isOpen,
  onClose,
  onSendToConversation,
}) => {
  const [copied, setCopied] = useState(false);
  const [sentConvId, setSentConvId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const postUrl = `${window.location.origin}#dossier-${post.id}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendDM = (convId: string) => {
    onSendToConversation(convId, post);
    setSentConvId(convId);
    setTimeout(() => {
      setSentConvId(null);
      onClose();
    }, 1200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Work"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 select-text"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#09090b] border-t sm:border border-white/15 p-5 sm:p-6 text-white shadow-2xl space-y-5 rounded-t-2xl sm:rounded-none pb-safe animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-full flex justify-center pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
              SHARE WORK
            </span>
            <h3 className="text-base font-serif uppercase tracking-tight text-white line-clamp-1">
              {post.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="touch-press touch-target-min w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Copy Link Input */}
        <div>
          <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase mb-1.5">
            LINK
          </label>
          <div className="flex border border-white/20 bg-neutral-900 focus-within:border-white rounded-sm">
            <input
              type="text"
              readOnly
              value={postUrl}
              className="w-full bg-transparent px-3.5 py-2.5 text-xs font-mono text-white/80 focus:outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              aria-label="Copy link to clipboard"
              className="touch-press touch-target-min px-4 py-2 border-l border-white/20 text-xs font-mono uppercase text-white hover:bg-white hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
        </div>

        {/* Send to VAIURE Direct Message */}
        <div className="space-y-2">
          <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase">
            SEND IN MESSAGE
          </label>
          <div className="space-y-1 max-h-48 overflow-y-auto divide-y divide-white/5 border border-white/10 p-2 bg-neutral-950 rounded-sm">
            {conversations.length === 0 ? (
              <p className="text-xs text-white/40 p-3 text-center font-mono">
                No active conversations yet
              </p>
            ) : (
              conversations.map((c) => (
                <div
                  key={c.id}
                  className="py-2 px-2 flex items-center justify-between hover:bg-white/5 transition-colors rounded-sm"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-[9px] text-white/70">
                      {c.participant.avatar ? (
                        <img
                          src={c.participant.avatar}
                          alt=""
                          className="w-full h-full object-cover filter grayscale"
                        />
                      ) : (
                        <span>{c.participant.username ? c.participant.username.slice(0, 2).toUpperCase() : 'VA'}</span>
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-serif uppercase text-white truncate">
                        {c.participant.displayName || c.participant.username}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">@{c.participant.username}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendDM(c.id)}
                    aria-label={`Send to ${c.participant.username}`}
                    className="touch-press touch-target-min px-3 py-1.5 bg-white text-black text-xs font-mono uppercase font-semibold hover:bg-neutral-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0 ml-2 rounded-sm"
                  >
                    {sentConvId === c.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>SENT</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>SEND</span>
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
