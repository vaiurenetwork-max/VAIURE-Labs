/**
 * VAIURE HYBRID STUDIO — Functional Nonlinear Cinematic Timeline Editor
 * Supports multiple tracks (Video V1/V2, Reference R1, Audio A1), real synchronized multi-clip
 * playback preview with transition rendering (CUT, DISSOLVE, FADE_FROM_BLACK, FADE_TO_BLACK),
 * drag-repositioning along timeline, clip trimming (in/out), splitting, track mute/lock, and zoom.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Lock,
  Unlock,
  Layers,
  Film,
  Music,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  HybridProductionProject,
  HybridTimelineClip,
  HybridTimelineTrack,
  HybridTransitionType,
} from '../../types/hybridStudio';

interface HybridTimelineEditorProps {
  project: HybridProductionProject;
  onUpdateTimeline: (tracks: HybridTimelineTrack[], clips: HybridTimelineClip[]) => void;
  onAssembleAllRenderedShots: () => void;
  onDropAssetOnTrack?: (assetId: string, trackId: string, dropTimeSec: number) => void;
}

const TRANSITION_OPTIONS: HybridTransitionType[] = [
  'CUT',
  'DISSOLVE',
  'FADE_FROM_BLACK',
  'FADE_TO_BLACK',
];

export const HybridTimelineEditor: React.FC<HybridTimelineEditorProps> = ({
  project,
  onUpdateTimeline,
  onAssembleAllRenderedShots,
  onDropAssetOnTrack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    project.timelineClips[0]?.id || null
  );
  const [zoom, setZoom] = useState(1);
  const [masterMuted, setMasterMuted] = useState(false);
  const [dragState, setDragState] = useState<{
    clipId: string;
    startClientX: number;
    initialStartTime: number;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const pps = 44 * zoom; // pixels per second

  const totalDuration = useMemo(() => {
    const maxEnd = project.timelineClips.reduce(
      (max, c) => Math.max(max, c.startTime + c.duration),
      0
    );
    return Math.max(12, Math.ceil(maxEnd + 2));
  }, [project.timelineClips]);

  // Identify active clips across V1/V2/R1/A1 at playhead
  const activeVideoClip = useMemo(() => {
    const candidates = project.timelineClips.filter((c) => {
      const track = project.timelineTracks.find((t) => t.id === c.trackId);
      return (
        c.trackType === 'VIDEO' &&
        !track?.isMuted &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
      );
    });
    // Prefer V2 overlay when layered at same timestamp, otherwise V1
    return candidates.find((c) => c.trackId === 'track-v2') || candidates[0] || null;
  }, [project.timelineClips, project.timelineTracks, currentTime]);

  const activeReferenceClip = useMemo(
    () =>
      project.timelineClips.find(
        (c) =>
          c.trackType === 'REFERENCE' &&
          currentTime >= c.startTime &&
          currentTime < c.startTime + c.duration
      ) || null,
    [project.timelineClips, currentTime]
  );

  const activeAudioClip = useMemo(() => {
    const clip = project.timelineClips.find((c) => {
      const track = project.timelineTracks.find((t) => t.id === c.trackId);
      return (
        c.trackType === 'AUDIO' &&
        !track?.isMuted &&
        currentTime >= c.startTime &&
        currentTime < c.startTime + c.duration
      );
    });
    return clip || null;
  }, [project.timelineClips, project.timelineTracks, currentTime]);

  // Playback Clock
  useEffect(() => {
    if (!isPlaying) return;
    const startPerf = performance.now() - currentTime * 1000;
    let rafId = 0;

    const tick = () => {
      const elapsed = (performance.now() - startPerf) / 1000;
      if (elapsed >= totalDuration) {
        setCurrentTime(0);
        setIsPlaying(false);
        return;
      }
      setCurrentTime(elapsed);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, totalDuration]);

  // Sync HTML5 video element to active clip & offset
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !activeVideoClip) return;
    const localOffset = Math.max(
      0,
      activeVideoClip.inPoint + (currentTime - activeVideoClip.startTime)
    );
    if (Math.abs(vid.currentTime - localOffset) > 0.35) {
      try {
        vid.currentTime = localOffset;
      } catch {
        // ignore seek before ready
      }
    }
    vid.muted = masterMuted;
    vid.volume = activeVideoClip.volume ?? 1;
    if (isPlaying && vid.paused) {
      vid.play().catch(() => undefined);
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [activeVideoClip, currentTime, isPlaying, masterMuted]);

  // Sync HTML5 audio element
  useEffect(() => {
    const aud = audioRef.current;
    if (!aud || !activeAudioClip) return;
    const localOffset = Math.max(
      0,
      activeAudioClip.inPoint + (currentTime - activeAudioClip.startTime)
    );
    if (Math.abs(aud.currentTime - localOffset) > 0.35) {
      try {
        aud.currentTime = localOffset;
      } catch {
        // ignore
      }
    }
    aud.muted = masterMuted;
    aud.volume = activeAudioClip.volume ?? 0.9;
    if (isPlaying && aud.paused) {
      aud.play().catch(() => undefined);
    } else if (!isPlaying && !aud.paused) {
      aud.pause();
    }
  }, [activeAudioClip, currentTime, isPlaying, masterMuted]);

  // Global mouse drag listener for clip repositioning
  useEffect(() => {
    if (!dragState) return;
    const targetClip = project.timelineClips.find((c) => c.id === dragState.clipId);
    if (!targetClip) return;

    const onMove = (e: PointerEvent) => {
      const deltaPx = e.clientX - dragState.startClientX;
      const deltaSec = deltaPx / pps;
      const nextStart = Math.max(0, Math.round((dragState.initialStartTime + deltaSec) * 10) / 10);
      const nextClips = project.timelineClips.map((c) =>
        c.id === dragState.clipId ? { ...c, startTime: nextStart } : c
      );
      onUpdateTimeline(project.timelineTracks, nextClips);
    };

    const onUp = () => setDragState(null);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragState, pps, project.timelineClips, project.timelineTracks, onUpdateTimeline]);

  // Visual transition opacity curve at playhead
  const monitorOpacity = useMemo(() => {
    if (!activeVideoClip) return 1;
    const clipTime = currentTime - activeVideoClip.startTime;
    const fadeDur = Math.max(0.25, activeVideoClip.transitionDuration || 0.4);
    if (
      (activeVideoClip.transitionIn === 'DISSOLVE' ||
        activeVideoClip.transitionIn === 'FADE_FROM_BLACK') &&
      clipTime < fadeDur
    ) {
      return Math.max(0.08, clipTime / fadeDur);
    }
    if (
      activeVideoClip.transitionIn === 'FADE_TO_BLACK' &&
      activeVideoClip.duration - clipTime < fadeDur
    ) {
      return Math.max(0.08, (activeVideoClip.duration - clipTime) / fadeDur);
    }
    return 1;
  }, [activeVideoClip, currentTime]);

  const formatTimecode = (secs: number) => {
    const fps = project.frameRate === '30fps' ? 30 : 24;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const f = Math.floor((secs % 1) * fps);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  const selectedClip = project.timelineClips.find((c) => c.id === selectedClipId) || null;
  const isTrackLocked = (trackId: string) =>
    Boolean(project.timelineTracks.find((t) => t.id === trackId)?.isLocked);

  const handleUpdateClip = (clipId: string, updates: Partial<HybridTimelineClip>) => {
    onUpdateTimeline(
      project.timelineTracks,
      project.timelineClips.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );
  };

  const handleSplitClip = () => {
    if (!selectedClip || isTrackLocked(selectedClip.trackId)) return;
    const offset = currentTime - selectedClip.startTime;
    if (offset < 0.4 || offset > selectedClip.duration - 0.4) return;

    const firstHalf: HybridTimelineClip = {
      ...selectedClip,
      duration: Math.round(offset * 10) / 10,
      outPoint: Math.round((selectedClip.inPoint + offset) * 10) / 10,
    };
    const secondHalf: HybridTimelineClip = {
      ...selectedClip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: `${selectedClip.title} (B)`,
      startTime: Math.round((selectedClip.startTime + offset) * 10) / 10,
      duration: Math.round((selectedClip.duration - offset) * 10) / 10,
      inPoint: Math.round((selectedClip.inPoint + offset) * 10) / 10,
      transitionIn: 'CUT',
    };

    const nextClips = project.timelineClips
      .filter((c) => c.id !== selectedClip.id)
      .concat([firstHalf, secondHalf]);
    onUpdateTimeline(project.timelineTracks, nextClips);
    setSelectedClipId(secondHalf.id);
  };

  const handleDuplicateClip = () => {
    if (!selectedClip) return;
    const copy: HybridTimelineClip = {
      ...selectedClip,
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: `${selectedClip.title} (Copy)`,
      startTime: Math.round((selectedClip.startTime + selectedClip.duration) * 10) / 10,
    };
    onUpdateTimeline(project.timelineTracks, [...project.timelineClips, copy]);
    setSelectedClipId(copy.id);
  };

  const handleDeleteClip = () => {
    if (!selectedClip || isTrackLocked(selectedClip.trackId)) return;
    const nextClips = project.timelineClips.filter((c) => c.id !== selectedClip.id);
    onUpdateTimeline(project.timelineTracks, nextClips);
    setSelectedClipId(nextClips[0]?.id || null);
  };

  const handleScrub = (e: React.PointerEvent) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + rulerRef.current.scrollLeft;
    const target = Math.max(0, Math.min(totalDuration, clickX / pps));
    setCurrentTime(target);
  };

  return (
    <div
      data-no-slide-swipe="true"
      className="w-full h-full flex flex-col bg-[#06070a] border-t border-white/[0.1] overflow-hidden select-none"
    >
      {/* 1. SEQUENCE MONITOR & CLIP INSPECTOR STRIP */}
      <div className="p-2.5 bg-[#08090e] border-b border-white/[0.1] grid grid-cols-1 lg:grid-cols-12 gap-3 items-center shrink-0">
        {/* Program Video Monitor */}
        <div className="lg:col-span-5 flex items-center gap-3">
          <div className="relative w-48 sm:w-56 aspect-video bg-black border border-white/[0.15] overflow-hidden flex items-center justify-center shrink-0">
            {activeVideoClip ? (
              activeVideoClip.mediaType === 'IMAGE' ? (
                <img
                  src={activeVideoClip.mediaUrl}
                  alt={activeVideoClip.title}
                  style={{ opacity: monitorOpacity }}
                  className="w-full h-full object-contain transition-opacity duration-75"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={activeVideoClip.mediaUrl}
                  playsInline
                  style={{ opacity: monitorOpacity }}
                  className="w-full h-full object-contain transition-opacity duration-75"
                />
              )
            ) : (
              <div className="text-center px-2">
                <Film className="w-4 h-4 mx-auto text-white/25 mb-1" />
                <div className="text-[9px] font-mono text-white/40 uppercase">
                  Empty Playhead
                </div>
              </div>
            )}

            {/* Reference Track PIP Overlay */}
            {activeReferenceClip && (
              <div className="absolute bottom-1 right-1 w-14 aspect-video border border-cyan-400/70 bg-black/90 overflow-hidden shadow-md">
                {activeReferenceClip.mediaType === 'IMAGE' ? (
                  <img
                    src={activeReferenceClip.mediaUrl}
                    alt={activeReferenceClip.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={activeReferenceClip.mediaUrl}
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/80 text-[9px] font-mono text-white tabular-nums">
              {formatTimecode(currentTime)}
            </div>
          </div>

          <div className="space-y-2 min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-white/45">
              Sequence Monitor
            </div>
            <div className="text-xs font-medium text-white truncate">
              {activeVideoClip?.title || 'No active video clip'}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                title="Return to 00:00:00"
                className="p-1.5 border border-white/15 hover:border-white/40 text-white/75 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="px-3 py-1 bg-[#ECECE9] hover:bg-white text-black text-[10px] font-mono font-semibold uppercase flex items-center gap-1 cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isPlaying ? 'Pause' : 'Play Sequence'}</span>
              </button>
              <button
                type="button"
                onClick={() => setMasterMuted((m) => !m)}
                className="p-1.5 border border-white/15 text-white/75 hover:text-white cursor-pointer"
                title={masterMuted ? 'Unmute Monitor' : 'Mute Monitor'}
              >
                {masterMuted ? (
                  <VolumeX className="w-3 h-3 text-rose-400" />
                ) : (
                  <Volume2 className="w-3 h-3" />
                )}
              </button>
            </div>
            {activeAudioClip && (
              <audio ref={audioRef} src={activeAudioClip.mediaUrl} className="hidden" />
            )}
          </div>
        </div>

        {/* Selected Clip Trim & Transition Controls */}
        <div className="lg:col-span-7 flex flex-wrap items-center justify-between gap-2 border-t lg:border-t-0 lg:border-l border-white/[0.08] pt-2 lg:pt-0 lg:pl-3">
          {selectedClip ? (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
              <div className="px-2 py-1 border border-cyan-500/35 bg-cyan-950/25 text-cyan-200 max-w-[160px] truncate">
                {selectedClip.title}
              </div>

              <label className="flex items-center gap-1 text-white/60">
                <span>Start</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={isTrackLocked(selectedClip.trackId)}
                  value={selectedClip.startTime}
                  onChange={(e) =>
                    handleUpdateClip(selectedClip.id, {
                      startTime: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                  className="w-14 px-1.5 py-1 bg-black/60 border border-white/15 text-white tabular-nums"
                />
                <span>s</span>
              </label>

              <label className="flex items-center gap-1 text-white/60">
                <span>Trim In</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  disabled={isTrackLocked(selectedClip.trackId)}
                  value={selectedClip.inPoint}
                  onChange={(e) => {
                    const nextIn = Math.max(0, Number(e.target.value) || 0);
                    handleUpdateClip(selectedClip.id, { inPoint: nextIn });
                  }}
                  className="w-14 px-1.5 py-1 bg-black/60 border border-white/15 text-white tabular-nums"
                />
              </label>

              <label className="flex items-center gap-1 text-white/60">
                <span>Dur</span>
                <input
                  type="number"
                  min={0.5}
                  max={60}
                  step={0.5}
                  disabled={isTrackLocked(selectedClip.trackId)}
                  value={selectedClip.duration}
                  onChange={(e) => {
                    const nextDur = Math.max(0.5, Number(e.target.value) || 0.5);
                    handleUpdateClip(selectedClip.id, {
                      duration: nextDur,
                      outPoint: selectedClip.inPoint + nextDur,
                    });
                  }}
                  className="w-14 px-1.5 py-1 bg-black/60 border border-white/15 text-white tabular-nums"
                />
                <span>s</span>
              </label>

              <select
                value={selectedClip.transitionIn}
                onChange={(e) =>
                  handleUpdateClip(selectedClip.id, {
                    transitionIn: e.target.value as HybridTransitionType,
                  })
                }
                className="px-2 py-1 bg-black/60 border border-white/15 text-white text-[10px]"
              >
                {TRANSITION_OPTIONS.map((tr) => (
                  <option key={tr} value={tr}>
                    Trans: {tr.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-[10px] font-mono text-white/40">
              Select a clip on the timeline to trim, move, or assign transitions.
            </span>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onAssembleAllRenderedShots}
              className="flex items-center gap-1 px-2 py-1 border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-[10px] font-mono uppercase cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>Sync Storyboard Shots</span>
            </button>
            <button
              type="button"
              disabled={!selectedClip}
              onClick={handleSplitClip}
              title="Split selected clip at playhead"
              className="p-1.5 border border-white/15 text-white/75 hover:text-white disabled:opacity-35 cursor-pointer"
            >
              <Scissors className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={!selectedClip}
              onClick={handleDuplicateClip}
              title="Duplicate clip"
              className="p-1.5 border border-white/15 text-white/75 hover:text-white disabled:opacity-35 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={!selectedClip}
              onClick={handleDeleteClip}
              title="Remove clip"
              className="p-1.5 border border-white/15 text-white/60 hover:text-rose-400 disabled:opacity-35 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>

            <div className="flex items-center border border-white/15 ml-1">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="px-1.5 text-[9px] font-mono text-white/55 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. MULTI-TRACK SEQUENCER */}
      <div className="flex-1 flex overflow-hidden min-h-[175px]">
        {/* Track Headers */}
        <div className="w-36 sm:w-44 bg-[#08090e] border-r border-white/[0.1] flex flex-col shrink-0 z-10">
          <div className="h-6 px-2.5 border-b border-white/[0.08] flex items-center text-[9px] font-mono uppercase text-white/40">
            Tracks
          </div>
          <div className="flex-1 overflow-y-auto">
            {project.timelineTracks.map((track) => (
              <div
                key={track.id}
                className="h-11 px-2.5 border-b border-white/[0.06] flex items-center justify-between gap-1 text-[10px] font-mono text-white/80"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {track.type === 'VIDEO' ? (
                    <Film className="w-3 h-3 text-cyan-400 shrink-0" />
                  ) : track.type === 'REFERENCE' ? (
                    <ImageIcon className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                  <span className="truncate">{track.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTimeline(
                        project.timelineTracks.map((t) =>
                          t.id === track.id ? { ...t, isMuted: !t.isMuted } : t
                        ),
                        project.timelineClips
                      )
                    }
                    className={`p-0.5 cursor-pointer ${
                      track.isMuted ? 'text-rose-400' : 'text-white/40 hover:text-white'
                    }`}
                    title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTimeline(
                        project.timelineTracks.map((t) =>
                          t.id === track.id ? { ...t, isLocked: !t.isLocked } : t
                        ),
                        project.timelineClips
                      )
                    }
                    className={`p-0.5 cursor-pointer ${
                      track.isLocked ? 'text-amber-400' : 'text-white/40 hover:text-white'
                    }`}
                    title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                  >
                    {track.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Lanes + Ruler */}
        <div
          ref={rulerRef}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('[data-clip-node="true"]')) {
              handleScrub(e);
            }
          }}
          className="flex-1 relative overflow-auto bg-[#050507] cursor-crosshair"
        >
          {/* Ruler */}
          <div
            style={{ width: `${Math.max(1000, totalDuration * pps)}px` }}
            className="h-6 border-b border-white/[0.08] bg-[#090a0f] relative text-[9px] font-mono text-white/40 pointer-events-none"
          >
            {Array.from({ length: totalDuration + 1 }).map((_, sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pps}px` }}
                className="absolute bottom-0 h-3 border-l border-white/20 pl-1 tabular-nums"
              >
                {sec % 2 === 0 ? `${sec}s` : ''}
              </div>
            ))}
          </div>

          {/* Playhead */}
          <div
            style={{ left: `${currentTime * pps}px` }}
            className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none"
          >
            <div className="w-2.5 h-2.5 -translate-x-1 bg-rose-500" />
          </div>

          {/* Track Lanes */}
          <div style={{ width: `${Math.max(1000, totalDuration * pps)}px` }} className="relative">
            {project.timelineTracks.map((track) => (
              <div
                key={track.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const assetId = e.dataTransfer.getData('application/vaiure-asset-id');
                  if (assetId && onDropAssetOnTrack && rulerRef.current) {
                    const rect = rulerRef.current.getBoundingClientRect();
                    const dropX = e.clientX - rect.left + rulerRef.current.scrollLeft;
                    const dropSec = Math.max(0, Math.round((dropX / pps) * 10) / 10);
                    onDropAssetOnTrack(assetId, track.id, dropSec);
                  }
                }}
                className={`h-11 border-b border-white/[0.06] relative ${
                  track.isLocked ? 'bg-white/[0.015]' : ''
                }`}
              >
                {project.timelineClips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    return (
                      <div
                        key={clip.id}
                        data-clip-node="true"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                          if (!track.isLocked) {
                            setDragState({
                              clipId: clip.id,
                              startClientX: e.clientX,
                              initialStartTime: clip.startTime,
                            });
                          }
                        }}
                        style={{
                          left: `${clip.startTime * pps}px`,
                          width: `${Math.max(28, clip.duration * pps)}px`,
                        }}
                        className={`absolute top-1 bottom-1 border px-2 flex items-center gap-1.5 overflow-hidden cursor-grab active:cursor-grabbing ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/65 text-white z-20'
                            : track.type === 'AUDIO'
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-white/85 hover:border-emerald-400'
                            : track.type === 'REFERENCE'
                            ? 'border-amber-500/40 bg-amber-950/40 text-white/85 hover:border-amber-400'
                            : 'border-white/25 bg-[#12151f] text-white/90 hover:border-white/50'
                        }`}
                      >
                        {clip.thumbnailUrl && (
                          <img
                            src={clip.thumbnailUrl}
                            alt=""
                            className="w-6 h-6 object-cover border border-white/15 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[10px] font-mono truncate font-medium">
                            {clip.title}
                          </div>
                          <div className="text-[8px] font-mono text-white/55 tabular-nums">
                            {clip.duration}s {clip.transitionIn !== 'CUT' ? `· ${clip.transitionIn}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
