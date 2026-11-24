import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Play,
  Heart,
  Sparkles,
  Layers,
  Activity,
  Check,
  Compass,
  ArrowRight,
  Clock,
  Gauge,
  Film,
  Users,
} from 'lucide-react';
import { Shared3DScene } from '../../types/multiplayer';
import {
  subscribeToShared3DScenes,
  broadcast3DScene,
  likeShared3DScene,
} from '../../services/multiplayerPresenceService';
import { UserProfile } from '../../types/social';

interface FuLabsCoOpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  currentSceneTitle: string;
  currentDuration: number;
  currentPhysicsMode: 'slow' | 'normal' | 'fast' | 'epic' | 'complex';
  currentSeedancePrompt: string;
  currentSceneConfig: any;
  onLoadCommunityScene: (sceneConfig: any, duration: number, physicsMode: string) => void;
}

export const FuLabsCoOpModal: React.FC<FuLabsCoOpModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentSceneTitle,
  currentDuration,
  currentPhysicsMode,
  currentSeedancePrompt,
  currentSceneConfig,
  onLoadCommunityScene,
}) => {
  const [scenes, setScenes] = useState<Shared3DScene[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [customTitle, setCustomTitle] = useState(currentSceneTitle || 'Cinematic 3D Greybox Take');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToShared3DScenes(setScenes);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBroadcastCurrent = async () => {
    setIsBroadcasting(true);
    setBroadcastSuccess(false);

    try {
      await broadcast3DScene({
        title: customTitle,
        authorId: currentUser?.id || 'guest',
        authorName: currentUser?.displayName || currentUser?.username || 'Studio Director',
        authorAvatar: currentUser?.avatar || '',
        duration: currentDuration,
        physicsMode: currentPhysicsMode,
        summary: `3D Greybox blocking configured with ${currentPhysicsMode.toUpperCase()} kinematics across ${currentDuration}s.`,
        seedancePrompt: currentSeedancePrompt,
        environmentPreset: currentSceneConfig?.environment?.preset || 'modern_skyscrapers',
        charactersCount: currentSceneConfig?.characters?.length || 2,
        propsCount: currentSceneConfig?.props?.length || 2,
        sceneData: JSON.stringify(currentSceneConfig),
      });

      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to broadcast scene:', err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleLike = (id: string) => {
    if (likedIds.has(id)) return;
    setLikedIds((prev) => new Set([...prev, id]));
    likeShared3DScene(id);
  };

  const handleSelectScene = (scene: Shared3DScene) => {
    try {
      const parsed = JSON.parse(scene.sceneData);
      onLoadCommunityScene(parsed, scene.duration, scene.physicsMode);
      onClose();
    } catch (err) {
      console.error('Failed to parse community scene JSON:', err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fu Labs 3D Co-Op Scene Matrix"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md select-text"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#08090c] border border-white/15 shadow-[0_32px_90px_rgba(0,0,0,0.88)] text-[#ecece9] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <header className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#0b0d12]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 border border-white/15 bg-white/[0.03] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#ecece9]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-mono tracking-[0.16em] uppercase text-white">
                <span>Fu Labs 3D</span>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-white/75">Co-Op Scene Matrix</span>
              </div>
              <p className="text-[11px] text-white/45 mt-0.5 truncate">
                Broadcast Three.js greybox stages to the community or load shared blocking scenes
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Co-Op matrix"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Broadcast Current Scene Banner */}
        <div className="px-5 py-3.5 bg-[#0c0e14] border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-4 h-4 text-white/60 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-white/50 tracking-[0.16em] block">
                Publish Current 3D Stage
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-white/85 font-mono tabular-nums">
                <span>{currentDuration}s</span>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="uppercase">{currentPhysicsMode} Physics</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Scene title..."
              className="h-10 px-3 bg-black/70 border border-white/15 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/50 w-44 sm:w-56 font-mono"
            />
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={handleBroadcastCurrent}
              className={`h-10 px-4 font-mono text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                broadcastSuccess
                  ? 'bg-emerald-400 text-black'
                  : 'bg-[#ecece9] hover:bg-white text-black'
              }`}
            >
              {broadcastSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Published</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBroadcasting ? 'Publishing...' : 'Share Stage'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Community 3D Stages Matrix Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {scenes.map((scene) => {
            const hasLiked = likedIds.has(scene.id);

            return (
              <div
                key={scene.id}
                className="p-4 bg-[#0d0f14] hover:bg-[#12151c] border border-white/10 hover:border-white/30 transition-colors flex flex-col justify-between group"
              >
                <div>
                  {/* Author & Timing Metadata (Zero Pill Clutter) */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {scene.authorAvatar ? (
                        <img
                          src={scene.authorAvatar}
                          alt={scene.authorName}
                          referrerPolicy="no-referrer"
                          className="w-6 h-6 rounded-full object-cover border border-white/15 filter grayscale group-hover:grayscale-0 transition-all shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-white/15 bg-white/10 flex items-center justify-center text-[10px] font-mono text-white/75 shrink-0">
                          {(scene.authorName || 'S').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <span className="text-[11px] font-mono text-white/75 truncate">
                        {scene.authorName}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-white/50 tabular-nums whitespace-nowrap shrink-0">
                      {scene.duration}s · <span className="uppercase">{scene.physicsMode}</span>
                    </div>
                  </div>

                  {/* Scene Title & Summary */}
                  <h4 className="font-semibold text-sm text-white line-clamp-1 mb-1">
                    {scene.title}
                  </h4>
                  <p className="text-[11px] text-white/55 line-clamp-2 leading-relaxed mb-3">
                    {scene.summary}
                  </p>

                  {/* Environment & Entities strip */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 mb-3 tabular-nums">
                    <span className="truncate">{scene.environmentPreset.replace(/_/g, ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>{scene.charactersCount} Actors</span>
                    <span aria-hidden="true">·</span>
                    <span>{scene.propsCount} Props</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
                  <button
                    type="button"
                    onClick={() => handleLike(scene.id)}
                    className={`min-h-[36px] px-1 flex items-center gap-1.5 text-[11px] font-mono tabular-nums transition-colors cursor-pointer ${
                      hasLiked ? 'text-rose-400 font-semibold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-400' : ''}`} />
                    <span>{scene.likesCount || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectScene(scene)}
                    className="min-h-[36px] px-3 bg-white/10 hover:bg-[#ecece9] hover:text-black text-white font-mono text-[10px] font-semibold tracking-wider uppercase flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Load Stage</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <footer className="px-5 py-3 border-t border-white/[0.08] bg-[#07080a] flex items-center justify-between text-[10px] font-mono text-white/45">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-white/60" />
            <span>VAIURE Live 3D Atelier</span>
          </div>
          <span>Real-time scene sharing</span>
        </footer>
      </div>
    </div>
  );
};
