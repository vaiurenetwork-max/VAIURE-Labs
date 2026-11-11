import React, { useRef, useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Plus,
  Check,
  MoreVertical,
  Flag,
  Trash2,
} from 'lucide-react';
import { ShortVideo } from '../../types/shorts';
import { UserProfile } from '../../types/social';
import { useLanguage } from '../../services/i18n';

interface ShortsVideoCardProps {
  short: ShortVideo;
  isActive: boolean;
  currentUser: UserProfile;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleLike: (short: ShortVideo) => void;
  onToggleSave: (short: ShortVideo) => void;
  onOpenComments: (short: ShortVideo) => void;
  onShare: (short: ShortVideo) => void;
  onOpenProfile?: (username: string) => void;
  onToggleFollow?: (username: string) => void;
  onDelete?: (shortId: string) => void;
  onOpenAuthModal?: () => void;
}

export const ShortsVideoCard: React.FC<ShortsVideoCardProps> = ({
  short,
  isActive,
  currentUser,
  isMuted,
  onToggleMute,
  onToggleLike,
  onToggleSave,
  onOpenComments,
  onShare,
  onOpenProfile,
  onToggleFollow,
  onDelete,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const isAuthor = currentUser.id === short.authorId;
  const lastTapRef = useRef<number>(0);

  // Autoplay / Pause based on viewport visibility
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Autoplay prevented by browser policy (starting muted):', err);
            setIsPlaying(false);
          });
      }
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Touch double-tap detection for like feedback
  const handleCardClick = (e: React.MouseEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap triggered
      e.stopPropagation();
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      if (!short.isLiked) {
        onToggleLike(short);
      }
    } else {
      togglePlayback();
    }
    lastTapRef.current = now;
  };

  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    if (short.authorUsername) {
      onToggleFollow?.(short.authorUsername);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black select-none overflow-hidden">
      {/* Video Container (Vertical 9:16 max bounds with black margins on wider screens) */}
      <div
        className="relative w-full h-full max-w-[440px] md:rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center cursor-pointer shadow-2xl"
        onClick={handleCardClick}
      >
        <video
          ref={videoRef}
          src={short.videoUrl}
          poster={short.thumbnailUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          muted={isMuted}
          preload={isActive ? 'auto' : 'metadata'}
        />

        {/* Ambient Gradient Overlays for readable editorial typography */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />

        {/* Pause/Play Center Indicator Overlay */}
        {!isPlaying && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 animate-in fade-in zoom-in-75 duration-200">
              <Play className="w-7 h-7 ml-1 fill-white" />
            </div>
          </div>
        )}

        {/* Animated Heart Burst on Double Tap */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart className="w-24 h-24 fill-red-500 text-red-500 animate-in zoom-in duration-300 drop-shadow-2xl" />
          </div>
        )}

        {/* Sound Mute Toggle Button (Top Right) — min 44x44 ergonomic target */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="touch-press touch-target-min w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/20 hover:border-white/50 text-white flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Category Pill Tag (Top Left) */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase bg-black/65 backdrop-blur-md border border-white/15 text-white/90 shadow-sm">
            {short.category}
          </span>
        </div>

        {/* RIGHT ACTION DOCK (Ergonomic 48x48 Touch Targets) */}
        <div className="absolute right-3 bottom-20 sm:bottom-24 z-20 flex flex-col items-center gap-3">
          {/* Creator Avatar & Follow Plus Button */}
          <div className="relative mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile?.(short.authorUsername);
              }}
              aria-label={`View ${short.authorName}'s profile`}
              className="touch-press touch-target-min w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-neutral-900 shadow-xl cursor-pointer block"
              title={short.authorName}
            >
              {short.authorAvatar ? (
                <img
                  src={short.authorAvatar}
                  alt={short.authorName}
                  className="w-full h-full object-cover filter grayscale"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-mono font-bold text-white uppercase bg-neutral-800">
                  {short.authorUsername?.slice(0, 2) || 'VA'}
                </div>
              )}
            </button>

            {/* Follow + Button if not current user */}
            {!isAuthor && (
              <button
                onClick={handleFollowClick}
                aria-label={short.isFollowingAuthor ? 'Following' : 'Follow Creator'}
                className={`touch-press absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 cursor-pointer ${
                  short.isFollowingAuthor
                    ? 'bg-neutral-800 border border-white/30 text-white/70'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
                title={short.isFollowingAuthor ? 'Following' : 'Follow Creator'}
              >
                {short.isFollowingAuthor ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </button>
            )}
          </div>

          {/* Like Action — 48x48 ergonomic target */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!currentUser.id) {
                onOpenAuthModal?.();
                return;
              }
              onToggleLike(short);
            }}
            aria-label={`${short.isLiked ? 'Unlike' : 'Like'} (${short.likesCount || 0})`}
            className="touch-press flex flex-col items-center gap-1 group cursor-pointer touch-target-primary justify-center"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 shadow-md ${
                short.isLiked
                  ? 'bg-red-500/20 border-red-500 text-red-500'
                  : 'bg-black/45 border-white/20 text-white/90 group-hover:border-white'
              }`}
            >
              <Heart
                className={`w-5 h-5 ${short.isLiked ? 'fill-red-500 stroke-red-500' : ''}`}
              />
            </div>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-white drop-shadow-md">
              {short.likesCount || 0}
            </span>
          </button>

          {/* Comments Action — 48x48 ergonomic target */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments(short);
            }}
            aria-label={`Open Comments (${short.commentsCount || 0})`}
            className="touch-press flex flex-col items-center gap-1 group cursor-pointer touch-target-primary justify-center"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-black/45 backdrop-blur-md border border-white/20 text-white/90 group-hover:border-white transition-all active:scale-90 shadow-md">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-white drop-shadow-md">
              {short.commentsCount || 0}
            </span>
          </button>

          {/* Save / Bookmark Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!currentUser.id) {
                onOpenAuthModal?.();
                return;
              }
              onToggleSave(short);
            }}
            aria-label={`${short.isSaved ? 'Unsave' : 'Save'} (${short.savesCount || 0})`}
            className="touch-press flex flex-col items-center gap-1 group cursor-pointer touch-target-primary justify-center"
          >
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-90 shadow-md ${
                short.isSaved
                  ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                  : 'bg-black/45 border-white/20 text-white/90 group-hover:border-white'
              }`}
            >
              <Bookmark
                className={`w-5 h-5 ${short.isSaved ? 'fill-amber-400 stroke-amber-400' : ''}`}
              />
            </div>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-white drop-shadow-md">
              {short.savesCount || 0}
            </span>
          </button>

          {/* Share Action */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(short);
            }}
            aria-label={`Share short (${short.sharesCount || 0})`}
            className="touch-press flex flex-col items-center gap-1 group cursor-pointer touch-target-primary justify-center"
          >
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-black/45 backdrop-blur-md border border-white/20 text-white/90 group-hover:border-white transition-all active:scale-90 shadow-md">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-mono tracking-wider font-semibold text-white drop-shadow-md">
              {short.sharesCount || 0}
            </span>
          </button>

          {/* More / Moderation Options */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOptionsOpen(!isOptionsOpen);
              }}
              aria-label="More options"
              className="touch-press touch-target-min w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isOptionsOpen && (
              <div
                className="absolute right-0 bottom-12 w-40 bg-[#101016] border border-white/15 rounded-xl shadow-2xl p-1.5 z-40 space-y-1 backdrop-blur-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {isAuthor && onDelete && (
                  <button
                    onClick={() => {
                      if (window.confirm(t('shortsDeletePrompt'))) {
                        onDelete(short.id);
                      }
                      setIsOptionsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-mono text-red-400 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer touch-target-min"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    onShare(short);
                    setIsOptionsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-mono text-white/80 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer touch-target-min"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM METADATA & SOUND INFO OVERLAY */}
        <div
          className="absolute left-4 right-20 bottom-5 sm:bottom-7 z-20 text-white space-y-2 pointer-events-auto select-text"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Author Handle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenProfile?.(short.authorUsername)}
              className="touch-press text-sm font-semibold tracking-wide hover:underline cursor-pointer flex items-center gap-1.5 text-white"
            >
              <span>@{short.authorUsername}</span>
              {short.authorVerified && (
                <span className="w-3.5 h-3.5 rounded-full bg-white text-black flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              )}
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium font-serif uppercase tracking-wider text-white">
              {short.title}
            </h3>
            {short.description && (
              <p className="text-xs text-white/80 line-clamp-2 font-sans font-light leading-snug">
                {short.description}
              </p>
            )}
          </div>

          {/* Hashtags */}
          {short.tags && short.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {short.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-mono text-white/70 hover:text-white"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}

          {/* Sound / Music Audio Info Ticker */}
          <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-white/75 truncate">
            <Music className="w-3.5 h-3.5 shrink-0 animate-pulse text-white/60" />
            <span className="truncate">
              {short.soundTitle || 'Original Sound'} • {short.soundAuthor || short.authorName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
