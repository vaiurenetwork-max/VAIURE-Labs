import React, { useState, useEffect } from 'react';
import {
  Users,
  Radio,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  Compass,
  Layers,
  Cpu,
  ArrowRight,
  Send,
  Zap,
} from 'lucide-react';
import {
  LiveCreatorPresence,
  AtelierSlideId,
  AmbientPulseType,
} from '../../types/multiplayer';
import { UserProfile } from '../../types/social';
import {
  subscribeToOnlineCreators,
  updateCreatorPresence,
  broadcastAmbientReaction,
  AMBIENT_PULSE_CONFIG,
} from '../../services/multiplayerPresenceService';

interface LiveMultiplayerDockProps {
  currentSlide: AtelierSlideId;
  currentUser: UserProfile | null;
  onNavigateToSlide: (slide: AtelierSlideId) => void;
  onOpenCollabRooms: () => void;
  onOpenAuthModal?: () => void;
  onOpenProfile?: (username: string) => void;
}

export const LiveMultiplayerDock: React.FC<LiveMultiplayerDockProps> = ({
  currentSlide,
  currentUser,
  onNavigateToSlide,
  onOpenCollabRooms,
  onOpenAuthModal,
  onOpenProfile,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [creators, setCreators] = useState<LiveCreatorPresence[]>([]);
  const [activeTab, setActiveTab] = useState<'creators' | 'pulse'>('creators');
  const [recentPulseSent, setRecentPulseSent] = useState<string | null>(null);
  const [failedAvatars, setFailedAvatars] = useState<Record<string, boolean>>({});

  // Subscribe strictly to real-time live accounts from the user's friendlist
  const currentUserId = currentUser?.id || '';
  useEffect(() => {
    const unsub = subscribeToOnlineCreators(currentUserId || 'guest', setCreators);
    return () => unsub();
  }, [currentUserId]);

  // Periodic heartbeat every 20s while authenticated
  useEffect(() => {
    if (!currentUserId) return;
    updateCreatorPresence(currentUser, currentSlide, 'ONLINE');
    const interval = setInterval(() => {
      updateCreatorPresence(currentUser, currentSlide, 'ONLINE');
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, currentUserId, currentSlide]);

  const handleSendPulse = (pulse: AmbientPulseType) => {
    broadcastAmbientReaction({
      actor: currentUser,
      reaction: pulse,
      slideIndex: currentSlide,
    });
    setRecentPulseSent(pulse);
    setTimeout(() => setRecentPulseSent(null), 1800);
  };

  const getInitials = (name?: string, username?: string) => {
    const source = (name || username || 'FR').trim();
    return source.slice(0, 2).toUpperCase();
  };

  const getSlideIcon = (slide: AtelierSlideId) => {
    switch (slide) {
      case 5:
        return <Layers className="w-3 h-3 text-cyan-400" />;
      case 6:
        return <Cpu className="w-3 h-3 text-amber-400" />;
      case 4:
        return <Sparkles className="w-3 h-3 text-emerald-400" />;
      default:
        return <Compass className="w-3 h-3 text-white/60" />;
    }
  };

  const isBottomNavSlide = currentSlide === 1 || currentSlide === 2;
  const dockContainerRef = React.useRef<HTMLDivElement | null>(null);

  // Auto-close multiplayer drawer when tapping outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dockContainerRef.current && !dockContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  return (
    <div
      ref={dockContainerRef}
      className={`fixed ${
        isBottomNavSlide
          ? 'bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4rem))] sm:bottom-4'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4'
      } right-3 sm:right-4 z-40 font-sans select-none pointer-events-auto transition-all duration-300`}
    >
      {/* Expanded Live Friendlist Drawer */}
      {isOpen && (
        <div className="mb-2 w-[92vw] max-w-[340px] sm:w-[350px] rounded-xl bg-[#0c0e12]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.75)] text-white overflow-hidden animate-silk-fade flex flex-col max-h-[460px]">
          {/* Header */}
          <header className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  creators.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'
                }`}
              />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-white/95">
                  LIVE ATELIER
                </span>
                <span className="text-[9px] font-mono text-white/45 tabular-nums">
                  {creators.length} {creators.length === 1 ? 'FRIEND' : 'FRIENDS'} LIVE
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimize Live Atelier"
                aria-label="Close Live Atelier"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/[0.06] bg-black/40 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('creators')}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 tabular-nums ${
                activeTab === 'creators'
                  ? 'text-white border-b-2 border-cyan-400 bg-white/[0.03] font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3 text-cyan-400" />
              <span>FRIENDS LIVE ({creators.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pulse')}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pulse'
                  ? 'text-white border-b-2 border-amber-400 bg-white/[0.03] font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>SEND PULSE</span>
            </button>
          </div>

          {/* Tab Content: Active Friends */}
          {activeTab === 'creators' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[200px]">
              {creators.length === 0 ? (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-4 py-6 space-y-2.5">
                  <div className="w-9 h-9 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center text-white/40">
                    <Radio className="w-4 h-4" />
                  </div>
                  {!currentUserId ? (
                    <>
                      <p className="text-xs font-medium text-white/80">
                        Sign in to see live friends
                      </p>
                      <p className="text-[10px] font-mono text-white/45 leading-relaxed">
                        Only active accounts from your friendlist appear here.
                      </p>
                      {onOpenAuthModal && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onOpenAuthModal();
                          }}
                          className="mt-1 px-4 py-1.5 rounded-full bg-white text-black hover:bg-neutral-200 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          Sign In
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-white/80">
                        No friends live right now
                      </p>
                      <p className="text-[10px] font-mono text-white/45 leading-relaxed">
                        Followed accounts currently working in the studio will appear here in real time.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                creators.map((c) => {
                  const isSameSlide = c.currentSlide === currentSlide;
                  const showAvatarImg = Boolean(c.avatar) && !failedAvatars[c.uid];

                  return (
                    <div
                      key={c.uid}
                      className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all flex items-center justify-between group"
                    >
                      <div
                        onClick={() => {
                          if (onOpenProfile && c.username) {
                            onOpenProfile(c.username);
                            setIsOpen(false);
                          }
                        }}
                        className={`flex items-center gap-2.5 min-w-0 ${
                          onOpenProfile && c.username ? 'cursor-pointer' : ''
                        }`}
                      >
                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-neutral-900 shrink-0 flex items-center justify-center font-mono text-[10px] text-white/75">
                          {showAvatarImg ? (
                            <img
                              src={c.avatar}
                              alt={c.displayName}
                              onError={() =>
                                setFailedAvatars((prev) => ({ ...prev, [c.uid]: true }))
                              }
                              className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all"
                            />
                          ) : (
                            <span>{getInitials(c.displayName, c.username)}</span>
                          )}
                          <span
                            style={{ backgroundColor: c.color || '#10b981' }}
                            className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-black"
                          />
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-white/90 truncate">
                              {c.displayName || c.username}
                            </span>
                            {c.status === 'CREATING' && (
                              <span className="text-[8px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-300 font-semibold">
                                WORKING
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-mono text-white/40">
                            {getSlideIcon(c.currentSlide)}
                            <span className="truncate">{c.currentSlideName}</span>
                          </div>
                        </div>
                      </div>

                      {!isSameSlide ? (
                        <button
                          type="button"
                          onClick={() => {
                            onNavigateToSlide(c.currentSlide);
                            setIsOpen(false);
                          }}
                          className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/15 text-[9px] font-mono text-white/75 hover:text-white flex items-center gap-1 transition-all cursor-pointer shrink-0 min-h-[32px]"
                          title={`Jump to ${c.currentSlideName}`}
                        >
                          <span>JOIN</span>
                          <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      ) : (
                        <span className="text-[8px] font-mono text-emerald-400/80 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                          HERE
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Content: Ambient Spatial Pulse */}
          {activeTab === 'pulse' && (
            <div className="flex-1 p-3 space-y-3 min-h-[200px]">
              <div className="text-[10px] font-mono text-white/50 leading-relaxed">
                Broadcast an ambient visual ripple across the active atelier. Connected friends will experience the spatial wave in real-time.
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                {(
                  [
                    'vision',
                    'architect',
                    'cinematic',
                    'sculptural',
                    'harmony',
                    'vaiure',
                  ] as AmbientPulseType[]
                ).map((pulse) => {
                  const meta = AMBIENT_PULSE_CONFIG[pulse];
                  const isSent = recentPulseSent === pulse;

                  return (
                    <button
                      key={pulse}
                      type="button"
                      onClick={() => handleSendPulse(pulse)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSent
                          ? 'bg-white text-black font-bold scale-[0.98]'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/80 hover:text-white border-white/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span style={{ color: isSent ? '#000000' : meta.color }} className="text-sm font-bold">
                          {meta.icon}
                        </span>
                        <span className="text-[8px] opacity-50 uppercase tracking-widest">
                          {isSent ? 'SENT' : 'PULSE'}
                        </span>
                      </div>
                      <div className="mt-1 font-bold text-xs truncate">{meta.label}</div>
                      <div className="text-[8px] text-white/40 truncate mt-0.5">{meta.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Action: Jump into Collaborative Canvas */}
          <footer className="p-2.5 bg-black/60 border-t border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onOpenCollabRooms();
                setIsOpen(false);
              }}
              className="w-full py-2.5 px-3 rounded-lg bg-white text-black hover:bg-neutral-200 font-mono text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>OPEN SHAREDWORKS CANVASES</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </footer>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0a0a0e]/92 hover:bg-[#14161c] border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-2xl text-white transition-all cursor-pointer group active:scale-95 min-h-[44px] sm:min-h-[38px]"
        title="Live Friends in Atelier"
      >
        <span className="relative flex h-2 w-2">
          {creators.length > 0 && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              creators.length > 0 ? 'bg-emerald-400' : 'bg-white/35'
            }`}
          />
        </span>

        <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-white/90">
          <span className={creators.length > 0 ? 'text-emerald-400 font-bold' : 'text-white/60 font-bold'}>
            {creators.length}
          </span>{' '}
          LIVE
        </span>

        {creators.length > 0 && (
          <>
            <span className="w-px h-3 bg-white/20" />
            <div className="flex -space-x-1.5 overflow-hidden">
              {creators.slice(0, 3).map((c) => {
                const showAvatarImg = Boolean(c.avatar) && !failedAvatars[c.uid];
                return showAvatarImg ? (
                  <img
                    key={c.uid}
                    src={c.avatar}
                    alt={c.displayName}
                    onError={() =>
                      setFailedAvatars((prev) => ({ ...prev, [c.uid]: true }))
                    }
                    className="inline-block h-4 w-4 rounded-full ring-1 ring-black object-cover filter grayscale group-hover:grayscale-0 transition-all"
                  />
                ) : (
                  <span
                    key={c.uid}
                    className="inline-flex h-4 w-4 rounded-full ring-1 ring-black bg-neutral-800 items-center justify-center text-[7px] font-mono text-white/80"
                  >
                    {getInitials(c.displayName, c.username)}
                  </span>
                );
              })}
            </div>
          </>
        )}

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/60 ml-0.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-white/60 ml-0.5" />
        )}
      </button>
    </div>
  );
};
