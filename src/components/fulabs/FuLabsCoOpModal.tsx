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
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBroadcastCurrent = async () => {
    setIsBroadcasting(true);
    setBroadcastSuccess(false);

    try {
      await broadcast3DScene({
        title: customTitle,
        authorId: currentUser?.id || 'guest',
        authorName: currentUser?.displayName || currentUser?.username || 'Guest Artist',
        authorAvatar:
          currentUser?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        duration: currentDuration,
        physicsMode: currentPhysicsMode,
        summary: `3D Greybox scene configured with ${currentPhysicsMode.toUpperCase()} physics kinematics across ${currentDuration}s.`,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md select-text"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#0c0e12] border border-white/15 shadow-[0_25px_80px_rgba(0,0,0,0.8)] text-white flex flex-col overflow-hidden">
        {/* Modal Header */}
        <header className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-white">
                  FU LABS 3D · CO-OP SCENE MATRIX
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-bold uppercase">
                  REAL-TIME MULTIPLAYER
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/50 mt-0.5">
                Broadcast your Three.js greybox blocking to the community or co-direct shared stages
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

        {/* Broadcast Current Scene Banner */}
        <div className="px-5 py-3 bg-gradient-to-r from-cyan-950/40 via-black to-blue-950/40 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Share2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold tracking-wider block">
                BROADCAST ACTIVE 3D STAGE
              </span>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-white/80 font-mono">
                <span className="truncate">{currentDuration}s Duration</span>
                <span>•</span>
                <span className="uppercase text-amber-300 font-semibold">{currentPhysicsMode} Physics</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Give your scene a title..."
              className="h-8 px-2.5 rounded-lg bg-black/60 border border-white/15 text-xs text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 w-48 sm:w-56 font-mono"
            />
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={handleBroadcastCurrent}
              className={`h-8 px-3.5 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                broadcastSuccess
                  ? 'bg-emerald-400 text-black'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]'
              }`}
            >
              {broadcastSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>BROADCASTED!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isBroadcasting ? 'SHARING...' : 'SHARE TO ATELIER'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Community 3D Stages Matrix Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenes.map((scene) => {
            const hasLiked = likedIds.has(scene.id);

            return (
              <div
                key={scene.id}
                className="p-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/40 transition-all flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Author Header */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={scene.authorAvatar}
                        alt={scene.authorName}
                        className="w-6 h-6 rounded-full object-cover border border-white/15 filter grayscale group-hover:grayscale-0 transition-all shrink-0"
                      />
                      <span className="text-[11px] font-mono text-white/80 truncate">
                        {scene.authorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-400/15 text-cyan-300 font-mono text-[9px] font-bold">
                        {scene.duration}S
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono text-[9px] font-bold uppercase">
                        {scene.physicsMode}
                      </span>
                    </div>
                  </div>

                  {/* Scene Title & Summary */}
                  <h4 className="font-bold text-sm text-white/95 line-clamp-1 mb-1 group-hover:text-cyan-300 transition-colors">
                    {scene.title}
                  </h4>
                  <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed mb-3">
                    {scene.summary}
                  </p>

                  {/* Environment & Entities strip */}
                  <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 mb-3">
                    <span className="truncate">Env: {scene.environmentPreset}</span>
                    <span>•</span>
                    <span>{scene.charactersCount} Actors</span>
                    <span>•</span>
                    <span>{scene.propsCount} Props</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handleLike(scene.id)}
                    className={`flex items-center gap-1 text-[10px] font-mono transition-colors cursor-pointer ${
                      hasLiked ? 'text-rose-400 font-bold' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasLiked ? 'fill-rose-400' : ''}`} />
                    <span>{scene.likesCount || 0}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectScene(scene)}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-cyan-400 hover:text-black text-white font-mono text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>LOAD & CO-DIRECT</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <footer className="px-5 py-3 border-t border-white/[0.08] bg-black/50 flex items-center justify-between text-[10px] font-mono text-white/40">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connected to VAIURE Live 3D Atelier Mesh</span>
          </div>
          <span>Changes synchronized in real-time</span>
        </footer>
      </div>
    </div>
  );
};
