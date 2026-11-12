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
}

export const LiveMultiplayerDock: React.FC<LiveMultiplayerDockProps> = ({
  currentSlide,
  currentUser,
  onNavigateToSlide,
  onOpenCollabRooms,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [creators, setCreators] = useState<LiveCreatorPresence[]>([]);
  const [activeTab, setActiveTab] = useState<'creators' | 'pulse'>('creators');
  const [recentPulseSent, setRecentPulseSent] = useState<string | null>(null);

  // Subscribe to real-time online creators
  const currentUserId = currentUser?.id || 'guest';
  useEffect(() => {
    const unsub = subscribeToOnlineCreators(currentUserId, setCreators);
    return () => unsub();
  }, [currentUserId]);

  // Periodic heartbeat every 20s
  useEffect(() => {
    updateCreatorPresence(currentUser, currentSlide, 'ONLINE');
    const interval = setInterval(() => {
      updateCreatorPresence(currentUser, currentSlide, 'ONLINE');
    }, 20000);
    return () => clearInterval(interval);
  }, [currentUser, currentSlide]);

  const handleSendPulse = (pulse: AmbientPulseType) => {
    broadcastAmbientReaction({
      actor: currentUser,
      reaction: pulse,
      slideIndex: currentSlide,
    });
    setRecentPulseSent(pulse);
    setTimeout(() => setRecentPulseSent(null), 1800);
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

  // Auto-close multiplayer drawer when tapping outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (dockContainerRef.current && !dockContainerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={dockContainerRef}
      className={`fixed ${
        isBottomNavSlide
          ? 'bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3.5rem))] sm:bottom-4'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4'
      } right-3 sm:right-4 z-40 font-sans select-none pointer-events-auto transition-all duration-300`}
    >
      {/* Expanded Multiplayer Drawer / Modal */}
      {isOpen && (
        <div className="mb-2 w-[92vw] max-w-[340px] sm:w-[350px] rounded-2xl bg-[#0c0e12]/95 border border-white/15 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] text-white overflow-hidden animate-in slide-in-from-bottom-3 duration-250 flex flex-col max-h-[460px]">
          {/* Header */}
          <header className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-white/95">
                  LIVE ATELIER
                </span>
                <span className="text-[9px] font-mono text-white/40">
                  {creators.length} ARTISTS COLLABORATING
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Minimize Live Atelier"
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
              className={`flex-1 py-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'creators'
                  ? 'text-white border-b-2 border-cyan-400 bg-white/[0.03] font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3 text-cyan-400" />
              <span>ACTIVE ARTISTS ({creators.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pulse')}
              className={`flex-1 py-2 text-center transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'pulse'
                  ? 'text-white border-b-2 border-amber-400 bg-white/[0.03] font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>SEND PULSE</span>
            </button>
          </div>

          {/* Tab Content: Active Creators */}
          {activeTab === 'creators' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 min-h-[200px]">
              {creators.map((c) => {
                const isCurrent = c.uid === currentUserId;
                const isSameSlide = c.currentSlide === currentSlide;

                return (
                  <div
                    key={c.uid}
                    className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                        <img
                          src={c.avatar}
                          alt={c.displayName}
                          className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all"
                        />
                        <span
                          style={{ backgroundColor: c.color }}
                          className="absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ring-black"
                        />
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-white/90 truncate">
                            {c.displayName}
                          </span>
                          {isCurrent && (
                            <span className="text-[8px] font-mono px-1 rounded bg-cyan-400/20 text-cyan-300 font-bold">
                              YOU
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
                        className="px-2 py-1 rounded-lg bg-white/[0.05] hover:bg-white/15 text-[9px] font-mono text-white/70 hover:text-white flex items-center gap-1 transition-all cursor-pointer shrink-0"
                        title={`Jump to ${c.currentSlideName}`}
                      >
                        <span>JOIN</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ) : (
                      <span className="text-[8px] font-mono text-emerald-400/80 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        HERE
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab Content: Ambient Spatial Pulse */}
          {activeTab === 'pulse' && (
            <div className="flex-1 p-3 space-y-3 min-h-[200px]">
              <div className="text-[10px] font-mono text-white/50 leading-relaxed">
                Broadcast an ambient visual ripple across the active atelier. All connected creators will experience the spatial wave in real-time.
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
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
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
                          {isSent ? 'SENT!' : 'PULSE'}
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
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-amber-500/20 hover:from-emerald-500/30 hover:to-amber-500/30 border border-white/20 text-white font-mono text-[11px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>OPEN SHAREDWORKS CANVASES</span>
              <ArrowRight className="w-3 h-3 text-white/70" />
            </button>
          </footer>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#0d0f14]/90 hover:bg-[#161a22] border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-2xl text-white transition-all cursor-pointer group active:scale-95 min-h-[44px]"
        title="Toggle Live Atelier Multiplayer Presence"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>

        <span className="text-[10px] font-mono tracking-widest uppercase font-semibold text-white/90">
          <span className="text-emerald-400 font-bold">{creators.length}</span> LIVE
        </span>

        <span className="w-px h-3 bg-white/20" />

        <div className="flex -space-x-1.5 overflow-hidden">
          {creators.slice(0, 3).map((c) => (
            <img
              key={c.uid}
              src={c.avatar}
              alt={c.displayName}
              className="inline-block h-4 w-4 rounded-full ring-1 ring-black object-cover filter grayscale group-hover:grayscale-0 transition-all"
            />
          ))}
        </div>

        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-white/60 ml-0.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-white/60 ml-0.5" />
        )}
      </button>
    </div>
  );
};
