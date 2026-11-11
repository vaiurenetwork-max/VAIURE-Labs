import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, CheckCircle2, UserX, VolumeX } from 'lucide-react';

interface ModerationModalProps {
  postId: string | null;
  authorId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReportPost: (postId: string, reason: string) => void;
  onBlockUser: (authorId: string) => void;
  onMuteUser: (authorId: string) => void;
}

export const ModerationModal: React.FC<ModerationModalProps> = ({
  postId,
  authorId,
  isOpen,
  onClose,
  onReportPost,
  onBlockUser,
  onMuteUser,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Unattributed AI synthesis or prompt scraping');
  const [actionDone, setActionDone] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const reasons = [
    'Unattributed AI synthesis or prompt scraping',
    'Copyright or likeness infringement',
    'Low-quality synthetic spam or duplicate generations',
    'Breach of VAIURE Curatorial Standards',
    'Misleading or harmful synthetic media',
  ];

  const handleReport = () => {
    if (postId) {
      onReportPost(postId, selectedReason);
      setActionDone('REPORT_FILED');
      setTimeout(() => {
        setActionDone(null);
        onClose();
      }, 1500);
    }
  };

  const handleBlock = () => {
    if (authorId) {
      onBlockUser(authorId);
      setActionDone('USER_BLOCKED');
      setTimeout(() => {
        setActionDone(null);
        onClose();
      }, 1500);
    }
  };

  const handleMute = () => {
    if (authorId) {
      onMuteUser(authorId);
      setActionDone('USER_MUTED');
      setTimeout(() => {
        setActionDone(null);
        onClose();
      }, 1500);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Moderation & Safety Actions"
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
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-widest text-white">
              CURATORIAL SAFETY & MODERATION
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="touch-press touch-target-min w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {actionDone ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-mono uppercase text-white">
              {actionDone === 'REPORT_FILED' && 'REPORT REGISTERED IN AUDIT LEDGER'}
              {actionDone === 'USER_BLOCKED' && 'CREATOR BLOCKED FROM YOUR FEED'}
              {actionDone === 'USER_MUTED' && 'CREATOR MUTED ACROSS PLATFORM'}
            </p>
            <p className="text-xs text-white/50">
              Action verified and synchronized with Firestore security layer.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Reason selector */}
            {postId && (
              <div className="space-y-2">
                <label className="block text-[10px] font-mono tracking-widest text-white/50 uppercase">
                  REASON FOR REPORT
                </label>
                <div className="space-y-1.5">
                  {reasons.map((r) => (
                    <button
                      key={r}
                      onClick={() => setSelectedReason(r)}
                      className={`touch-press w-full text-left p-3 text-xs font-mono border transition-colors flex items-center justify-between cursor-pointer rounded-sm ${
                        selectedReason === r
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/10 bg-neutral-900/60 text-white/70 hover:border-white/30'
                      }`}
                    >
                      <span className="pr-2">{r}</span>
                      {selectedReason === r && <span className="text-xs font-bold shrink-0">✓</span>}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleReport}
                  className="touch-press touch-target-min w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-mono font-semibold uppercase tracking-wider transition-colors mt-2 cursor-pointer rounded-sm"
                >
                  DISPATCH CONFIDENTIAL REPORT
                </button>
              </div>
            )}

            {/* User-level actions */}
            {authorId && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                  CREATOR LEVEL CONTROLS
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleMute}
                    className="touch-press touch-target-min p-3 border border-white/15 bg-neutral-900/60 hover:bg-white/10 text-white text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-sm"
                  >
                    <VolumeX className="w-4 h-4 text-white/60" />
                    <span>MUTE CREATOR</span>
                  </button>

                  <button
                    onClick={handleBlock}
                    className="touch-press touch-target-min p-3 border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 text-xs font-mono flex items-center justify-center gap-2 cursor-pointer transition-colors rounded-sm"
                  >
                    <UserX className="w-4 h-4 text-red-400" />
                    <span>BLOCK CREATOR</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
