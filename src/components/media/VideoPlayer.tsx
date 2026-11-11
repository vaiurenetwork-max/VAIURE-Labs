import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  PictureInPicture2,
  RefreshCw,
} from 'lucide-react';

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  aspectRatio?: '16:9' | '9:16' | '4:5' | '1:1' | '21:9' | 'auto';
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  title?: string;
  creator?: string;
  category?: string;
  className?: string;
  showEditorialOverlay?: boolean;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  aspectRatio = '16:9',
  autoPlay = false,
  loop = true,
  muted = true,
  title,
  creator,
  category,
  className = '',
  showEditorialOverlay = true,
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(muted ? 0 : 0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPip, setIsPip] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(loop);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [showRateMenu, setShowRateMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  // Format time (00:00)
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) {
      const remMins = mins % 60;
      return `${hrs.toString().padStart(2, '0')}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset controls timer
  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying && !isScrubbing) {
      hideControlsTimer.current = setTimeout(() => {
        setShowControls(false);
        setShowRateMenu(false);
      }, 2400);
    }
  }, [isPlaying, isScrubbing]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video.play().then(() => {
        setIsPlaying(true);
        triggerControls();
      }).catch((err) => {
        console.warn('Playback initiation error:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
      setShowControls(true);
    }
  }, [triggerControls]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      setVolume(0);
    } else {
      setVolume(0.8);
      video.volume = 0.8;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    setVolume(val);
    video.volume = val;
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const seekRelative = (deltaSeconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.min(Math.max(0, video.currentTime + deltaSeconds), duration);
    video.currentTime = target;
    setCurrentTime(target);
    triggerControls();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = pos * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen request rejected:', err);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPip(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setIsPip(true);
      }
    } catch (err) {
      console.warn('PiP error:', err);
    }
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowRateMenu(false);
    triggerControls();
  };

  const handleReload = () => {
    const video = videoRef.current;
    if (!video) return;
    setHasError(false);
    setIsBuffering(true);
    video.load();
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  };

  // Keyboard controls listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelative(-5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelative(5);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration, isMuted]);

  // Sync fullscreen change
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const aspectClass = {
    '16:9': 'aspect-[16/9]',
    '9:16': 'aspect-[9/16]',
    '4:5': 'aspect-[4/5]',
    '1:1': 'aspect-square',
    '21:9': 'aspect-[21/9]',
    'auto': 'aspect-auto',
  }[aspectRatio] || 'aspect-[16/9]';

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onMouseMove={triggerControls}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
        setShowRateMenu(false);
      }}
      className={`relative w-full overflow-hidden bg-black text-white select-none group font-sans outline-none ${aspectClass} ${className}`}
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        loop={isLooping}
        muted={isMuted}
        autoPlay={autoPlay}
        preload="metadata"
        onClick={togglePlay}
        onTimeUpdate={() => {
          if (!videoRef.current) return;
          setCurrentTime(videoRef.current.currentTime);
          if (videoRef.current.buffered.length > 0 && duration > 0) {
            const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
            setBuffered((bufferedEnd / duration) * 100);
          }
        }}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          setDuration(videoRef.current.duration || 0);
          videoRef.current.playbackRate = playbackRate;
          videoRef.current.muted = isMuted;
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
          if (onEnded) onEnded();
        }}
        onError={() => {
          setIsBuffering(false);
          setHasError(true);
        }}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Top Editorial Bar */}
      {showEditorialOverlay && (
        <div
          className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/85 via-black/35 to-transparent transition-opacity duration-300 pointer-events-none flex items-center justify-between ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/70 uppercase px-2 py-0.5 border border-white/20 bg-black/60 backdrop-blur-sm flex items-center gap-1.5">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              <span>{category || 'AI CINEMA // 4K'}</span>
            </span>
            {title && (
              <h3 className="text-xs font-serif uppercase tracking-tight text-white line-clamp-1 max-w-md hidden sm:block">
                {title}
              </h3>
            )}
          </div>
          {creator && (
            <span className="text-[10px] font-mono text-white/50 tracking-wider uppercase">
              @{creator}
            </span>
          )}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-[10px] font-mono tracking-widest text-white/70 uppercase">
              BUFFERING STREAM
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 text-center z-10">
          <div className="space-y-3 max-w-sm">
            <p className="text-xs font-mono text-white/70 tracking-wider uppercase">
              MEDIA STREAM INTERRUPTED
            </p>
            <button
              onClick={handleReload}
              className="px-4 py-2 bg-white text-black text-xs font-mono uppercase tracking-widest hover:bg-neutral-200 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RELOAD STREAM</span>
            </button>
          </div>
        </div>
      )}

      {/* Center Big Play Button (when paused and not scrubbing) */}
      {!isPlaying && !isBuffering && !hasError && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer transition-opacity"
        >
          <div className="w-16 h-16 rounded-full border border-white/40 bg-black/60 backdrop-blur-md flex items-center justify-center text-white hover:scale-110 hover:border-white transition-all duration-300 shadow-2xl">
            <Play className="w-6 h-6 ml-1 fill-white" />
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-8 pb-3 px-4 transition-all duration-300 ${
          showControls || !isPlaying ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Timeline / Scrubber Track */}
        <div
          ref={progressRef}
          onClick={handleSeek}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={() => setIsScrubbing(true)}
          onMouseUp={() => setIsScrubbing(false)}
          className="relative w-full h-2 group/track cursor-pointer flex items-center mb-3"
        >
          {/* Background track */}
          <div className="w-full h-1 group-hover/track:h-1.5 bg-white/20 transition-all rounded-full overflow-hidden relative">
            {/* Buffered Bar */}
            <div
              style={{ width: `${buffered}%` }}
              className="absolute left-0 top-0 bottom-0 bg-white/30 transition-all duration-150"
            />
            {/* Played Progress Bar */}
            <div
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              className="absolute left-0 top-0 bottom-0 bg-white"
            />
          </div>

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverPos}px` }}
              className="absolute -top-7 -translate-x-1/2 bg-black border border-white/20 px-1.5 py-0.5 text-[10px] font-mono text-white pointer-events-none"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Scrubber Thumb */}
          <div
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            className="absolute -translate-x-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover/track:opacity-100 transition-opacity shadow-lg"
          />
        </div>

        {/* Buttons and Readout */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Left: Play/Pause, Volume, Time */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="text-white hover:text-white/70 transition-colors p-1"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            {/* Skip -5s / +5s */}
            <button
              onClick={() => seekRelative(-10)}
              aria-label="Skip backward 10s"
              className="text-white/60 hover:text-white transition-colors p-1 hidden sm:block"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 group/volume">
              <button
                onClick={toggleMute}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="text-white/70 hover:text-white transition-colors p-1"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/20 accent-white cursor-pointer opacity-70 group-hover/volume:opacity-100 transition-opacity"
              />
            </div>

            {/* Time Readout */}
            <div className="font-mono text-[11px] tracking-widest text-white/70 ml-1">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/30 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Rate, Loop, PiP, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Playback Rate Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowRateMenu(!showRateMenu)}
                className="px-1.5 py-0.5 text-[10px] font-mono tracking-wider border border-white/20 hover:border-white text-white/80 hover:text-white transition-colors uppercase"
              >
                {playbackRate}x
              </button>

              {showRateMenu && (
                <div className="absolute bottom-8 right-0 bg-neutral-950 border border-white/20 p-1 space-y-0.5 z-30 shadow-2xl">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-3 py-1 text-[10px] font-mono tracking-wider transition-colors ${
                        playbackRate === rate ? 'bg-white text-black font-semibold' : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Loop Toggle */}
            <button
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              className={`p-1 transition-colors text-[10px] font-mono border px-1.5 py-0.5 hidden sm:inline-block ${
                isLooping ? 'border-white text-white' : 'border-white/20 text-white/40 hover:text-white'
              }`}
            >
              LOOP
            </button>

            {/* Picture in Picture */}
            {typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (document as any).pictureInPictureEnabled && (
              <button
                onClick={togglePiP}
                aria-label="Picture in picture"
                className="text-white/70 hover:text-white transition-colors p-1 hidden sm:block"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="text-white/70 hover:text-white transition-colors p-1"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
