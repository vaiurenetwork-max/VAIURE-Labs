import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Heart,
  Sparkles,
  GitFork,
  Cpu,
  Layers,
  ArrowRight,
  Eye,
  Sliders,
} from 'lucide-react';
import { SharedVxPrompt } from '../../types/multiplayer';
import {
  subscribeToSharedVxPrompts,
  broadcastVxPrompt,
  likeSharedVxPrompt,
} from '../../services/multiplayerPresenceService';
import { UserProfile } from '../../types/social';

interface VxCoOpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  currentPrompt: string;
  currentFullCommand: string;
  currentModelId: string;
  currentModelLabel: string;
  currentMode: string;
  currentConfidenceScore?: number;
  currentAspectRatio: string;
  currentStylize: number;
  onForkPrompt: (prompt: string, fullCommand: string) => void;
}

export const VxCoOpModal: React.FC<VxCoOpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentPrompt,
  currentFullCommand,
  currentModelId,
  currentModelLabel,
  currentMode,
  currentConfidenceScore = 95,
  currentAspectRatio,
  currentStylize,
  onForkPrompt,
}) => {
  const [prompts, setPrompts] = useState<SharedVxPrompt[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToSharedVxPrompts(setPrompts);
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcast = async () => {
    if (!currentPrompt) return;
    setIsBroadcasting(true);
    setBroadcastSuccess(false);

    try {
      await broadcastVxPrompt({
        prompt: currentPrompt,
        fullMidjourneyCommand: currentFullCommand || `/imagine prompt: ${currentPrompt} --v 8.2 --style raw --ar ${currentAspectRatio}`,
        authorId: currentUser?.id || 'guest',
        authorName: currentUser?.displayName || currentUser?.username || 'Guest Artist',
        authorAvatar:
          currentUser?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        modelId: currentModelId,
        modelLabel: currentModelLabel,
        mode: currentMode,
        confidenceScore: currentConfidenceScore,
        aspectRatio: currentAspectRatio,
        stylize: currentStylize,
        subjectTitle: 'Reconstructed Optical Matrix',
      });

      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to broadcast prompt:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set([...prev, id]));
    likeSharedVxPrompt(id);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-text"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0a0c0f] border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.8)] text-white flex flex-col overflow-hidden font-sans">
        {/* Header */}
        <header className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-white">
                  VX · LIVE PROMPT MATRIX
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold uppercase">
                  CO-OP PROMPTING
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/50 mt-0.5">
                Share reverse-engineered Midjourney V8.2 prompts or fork and refine community reconstructions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Broadcast Active Prompt Strip */}
        <div className="px-5 py-3 bg-gradient-to-r from-amber-950/40 via-black to-stone-900 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold tracking-wider block">
                BROADCAST RECONSTRUCTED PROMPT
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-white/70 font-mono truncate">
                <span className="truncate max-w-[280px] sm:max-w-[420px]">
                  {currentPrompt ? `"${currentPrompt}"` : 'No prompt generated yet in Panel C.'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isBroadcasting || !currentPrompt}
            onClick={handleBroadcast}
            className={`h-8 px-4 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
              broadcastSuccess
                ? 'bg-emerald-400 text-black'
                : !currentPrompt
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-amber-400 hover:bg-amber-300 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
            }`}
          >
            {broadcastSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>SHARED!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isBroadcasting ? 'SHARING...' : 'SHARE TO MATRIX'}</span>
              </>
            )}
          </button>
        </div>

        {/* Community Prompts Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {prompts.map((p) => {
            const isCopied = copiedId === p.id;
            const hasLiked = likedIds.has(p.id);

            return (
              <div
                key={p.id}
                className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.08] hover:border-amber-400/40 transition-all flex flex-col gap-3 group"
              >
                {/* Top Metas */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={p.authorAvatar}
                      alt={p.authorName}
                      className="w-7 h-7 rounded-full object-cover border border-white/15 filter grayscale group-hover:grayscale-0 transition-all shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white/90 truncate">
                        {p.authorName}
                      </span>
                      <span className="text-[9px] font-mono text-white/40">
                        Synthesized via {p.modelLabel || 'Gemini'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-[9px]">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      {p.confidenceScore || 95}% FIDELITY
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                      --ar {p.aspectRatio || '16:9'}
                    </span>
                  </div>
                </div>

                {/* Prompt Text Block */}
                <div className="p-3 rounded-lg bg-black/50 border border-white/[0.06] text-xs font-mono text-white/85 leading-relaxed selection:bg-amber-400 selection:text-black">
                  {p.prompt}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => handleLike(p.id)}
                    className={`flex items-center gap-1.5 text-[10px] font-mono transition-colors cursor-pointer ${
                      hasLiked ? 'text-rose-400 font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-400' : ''}`} />
                    <span>{p.likesCount || 0}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(p.id, p.fullMidjourneyCommand || p.prompt)}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white font-mono text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'COPIED!' : 'COPY COMMAND'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onForkPrompt(p.prompt, p.fullMidjourneyCommand || p.prompt);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-mono text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <GitFork className="w-3 h-3" />
                      <span>FORK & REFINE</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
