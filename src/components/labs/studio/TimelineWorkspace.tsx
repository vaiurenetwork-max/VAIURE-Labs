/**
 * VAIURE Studio — Timeline Workspace
 * Nonlinear video assembly editor with multi-track sequencer, media playback monitor,
 * trimming, splitting, transitions, and timecode scrubbing.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Scissors,
  Trash2,
  Copy,
  Plus,
  Layers,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Eye,
  Lock,
} from 'lucide-react';
import { StudioProject, TimelineClip, TimelineTrack } from '../../../types/studio';

interface TimelineWorkspaceProps {
  project: StudioProject;
  onUpdateTimeline: (tracks: TimelineTrack[], clips: TimelineClip[]) => void;
}

export const TimelineWorkspace: React.FC<TimelineWorkspaceProps> = ({
  project,
  onUpdateTimeline,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    project.timelineClips[0]?.id || null
  );
  const [zoomLevel, setZoomLevel] = useState(1); // pixels per second multiplier
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3200);
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRulerRef = useRef<HTMLDivElement>(null);

  // Total project duration based on clips
  const totalDuration = Math.max(
    10,
    ...project.timelineClips.map((c) => c.startTime + c.duration)
  );

  // Synchronize playback clock
  useEffect(() => {
    let anim: number;
    if (isPlaying) {
      const start = performance.now() - currentTime * 1000;
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        if (elapsed >= totalDuration) {
          setCurrentTime(totalDuration);
          setIsPlaying(false);
        } else {
          setCurrentTime(elapsed);
          anim = requestAnimationFrame(tick);
        }
      };
      anim = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(anim);
  }, [isPlaying, totalDuration]);

  // Active clip at current playhead position
  const activeClipAtPlayhead = project.timelineClips.find(
    (c) =>
      c.trackType === 'VIDEO' &&
      currentTime >= c.startTime &&
      currentTime < c.startTime + c.duration
  );

  const formatTimecode = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const f = Math.floor((secs % 1) * 24);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  // Timeline operations
  const handleSplitClipAtPlayhead = () => {
    if (!selectedClipId) return;
    const clip = project.timelineClips.find((c) => c.id === selectedClipId);
    if (!clip) return;

    const offset = currentTime - clip.startTime;
    if (offset <= 0.5 || offset >= clip.duration - 0.5) {
      showNotice('Position playhead inside clip body (at least 0.5s from edges) to split.');
      return;
    }

    const firstHalf: TimelineClip = {
      ...clip,
      duration: offset,
      outPoint: clip.inPoint + offset,
    };

    const secondHalf: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      title: `${clip.title} (Part 2)`,
      startTime: clip.startTime + offset,
      duration: clip.duration - offset,
      inPoint: clip.inPoint + offset,
    };

    const nextClips = project.timelineClips
      .filter((c) => c.id !== clip.id)
      .concat([firstHalf, secondHalf]);

    onUpdateTimeline(project.timelineTracks, nextClips);
    setSelectedClipId(secondHalf.id);
  };

  const handleDeleteClip = (clipId: string) => {
    const nextClips = project.timelineClips.filter((c) => c.id !== clipId);
    onUpdateTimeline(project.timelineTracks, nextClips);
    if (selectedClipId === clipId) {
      setSelectedClipId(nextClips[0]?.id || null);
    }
  };

  const handleDuplicateClip = (clipId: string) => {
    const clip = project.timelineClips.find((c) => c.id === clipId);
    if (!clip) return;

    const copyClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      title: `${clip.title} (Copy)`,
      startTime: clip.startTime + clip.duration + 0.5,
    };
    const nextClips = [...project.timelineClips, copyClip];
    onUpdateTimeline(project.timelineTracks, nextClips);
    setSelectedClipId(copyClip.id);
  };

  const handleTimelineScrub = (e: React.PointerEvent) => {
    if (!timelineRulerRef.current) return;
    const rect = timelineRulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pps = 40 * zoomLevel; // pixels per second
    const targetSec = Math.max(0, Math.min(totalDuration, clickX / pps));
    setCurrentTime(targetSec);
    if (videoRef.current) {
      videoRef.current.currentTime = targetSec % (videoRef.current.duration || 1);
    }
  };

  const handleAddStoryboardShotToTimeline = (shotId: string) => {
    const shot = project.shots.find((s) => s.id === shotId);
    if (!shot) return;

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      shotId: shot.id,
      trackId: 'track-v1',
      trackType: 'VIDEO',
      title: `Shot ${String(shot.shotNumber).padStart(2, '0')}: ${shot.title}`,
      mediaUrl: shot.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: shot.thumbnailUrl,
      startTime: totalDuration,
      duration: shot.duration,
      inPoint: 0,
      outPoint: shot.duration,
      volume: 1,
    };

    onUpdateTimeline(project.timelineTracks, [...project.timelineClips, newClip]);
    setSelectedClipId(newClip.id);
  };

  const selectedClip = project.timelineClips.find((c) => c.id === selectedClipId);
  const pps = 40 * zoomLevel; // pixels per second

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] overflow-hidden select-none">
      {/* 1. TOP VIDEO MONITOR PREVIEW BAR */}
      <div className="h-64 sm:h-72 lg:h-80 w-full bg-black/90 border-b border-white/10 flex flex-col items-center justify-center relative p-3">
        {/* HTML5 Video Element */}
        <div className="relative h-full aspect-video rounded-lg overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center">
          {activeClipAtPlayhead?.mediaUrl ? (
            <video
              ref={videoRef}
              src={activeClipAtPlayhead.mediaUrl}
              className="w-full h-full object-contain"
              muted={isMuted}
            />
          ) : (
            <div className="text-center p-4 text-white/40 font-mono text-xs">
              No video clip at playhead position ({formatTimecode(currentTime)})
            </div>
          )}

          {/* Timecode overlay */}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md font-mono text-xs text-white border border-white/10">
            {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
          </div>
        </div>

        {/* Video Monitor Transport Controls */}
        <div className="h-10 px-4 w-full flex items-center justify-between text-white/70 max-w-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTime(0)}
              className="p-1 rounded hover:bg-white/10 hover:text-white"
              title="Return to Start"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-full bg-white text-black hover:bg-neutral-200 transition-colors"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black" />}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 rounded hover:bg-white/10 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-white"
            />
          </div>
        </div>
      </div>

      {/* 2. TIMELINE TOOLBAR */}
      <div className="h-10 px-4 bg-[#09090D] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSplitClipAtPlayhead}
            disabled={!selectedClipId}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-white font-mono text-xs transition-colors cursor-pointer disabled:opacity-40"
            title="Split Clip at Playhead"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split Clip</span>
          </button>

          {selectedClipId && (
            <>
              <button
                onClick={() => handleDuplicateClip(selectedClipId)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 text-white font-mono text-xs transition-colors cursor-pointer"
                title="Duplicate Clip"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                onClick={() => handleDeleteClip(selectedClipId)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-500/30 text-rose-300 font-mono text-xs transition-colors cursor-pointer"
                title="Delete Clip"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </>
          )}

          {statusNotice && (
            <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] animate-silk-fade">
              {statusNotice}
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[10px] text-white/50 w-12 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. MULTI-TRACK NONLINEAR TIMELINE SEQUENCER */}
      <div
        data-no-slide-swipe="true"
        className="flex-1 flex overflow-hidden"
      >
        {/* Track Headers (Left Column) */}
        <div className="w-36 sm:w-44 bg-[#0A0A0F] border-r border-white/10 flex flex-col shrink-0 z-10">
          <div className="h-7 border-b border-white/10 px-3 flex items-center text-[9px] font-mono uppercase text-white/40">
            Track Headers
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {project.timelineTracks.map((track) => (
              <div
                key={track.id}
                className="h-16 px-3 border-b border-white/10 flex items-center justify-between text-xs font-mono text-white/80 bg-black/20"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold truncate">{track.name}</span>
                </div>
                <div className="flex items-center gap-1 text-white/40">
                  <button
                    onClick={() => {
                      const updated = project.timelineTracks.map((t) =>
                        t.id === track.id ? { ...t, isMuted: !t.isMuted } : t
                      );
                      onUpdateTimeline(updated, project.timelineClips);
                    }}
                    className={`p-1 rounded hover:text-white ${track.isMuted ? 'text-rose-400' : ''}`}
                    title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Tracks & Ruler (Right Scrollable Pane) */}
        <div
          ref={timelineRulerRef}
          onPointerDown={handleTimelineScrub}
          className="flex-1 relative overflow-x-auto overflow-y-auto bg-[#07070B] cursor-crosshair"
        >
          {/* Timeline Ruler */}
          <div
            style={{ width: `${Math.max(1200, (totalDuration + 5) * pps)}px` }}
            className="h-7 border-b border-white/10 bg-[#09090D] relative flex items-end text-[9px] font-mono text-white/40 pointer-events-none"
          >
            {Array.from({ length: Math.ceil(totalDuration) + 5 }).map((_, sec) => (
              <div
                key={sec}
                style={{ left: `${sec * pps}px` }}
                className="absolute bottom-0 h-3 border-l border-white/20 pl-1"
              >
                {sec % 2 === 0 ? `${sec}s` : ''}
              </div>
            ))}
          </div>

          {/* Red Playhead Line */}
          <div
            style={{
              left: `${currentTime * pps}px`,
            }}
            className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
          >
            <div className="w-3 h-3 -translate-x-1.5 -translate-y-1 rotate-45 bg-rose-500 rounded-sm" />
          </div>

          {/* Track Lanes */}
          <div
            style={{ width: `${Math.max(1200, (totalDuration + 5) * pps)}px` }}
            className="relative"
          >
            {project.timelineTracks.map((track) => (
              <div
                key={track.id}
                className="h-16 border-b border-white/10 relative bg-black/10"
              >
                {/* Clips belonging to this track */}
                {project.timelineClips
                  .filter((c) => c.trackId === track.id)
                  .map((clip) => {
                    const isSelected = clip.id === selectedClipId;
                    return (
                      <div
                        key={clip.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClipId(clip.id);
                        }}
                        style={{
                          left: `${clip.startTime * pps}px`,
                          width: `${clip.duration * pps}px`,
                        }}
                        className={`absolute top-1.5 bottom-1.5 rounded-md border flex items-center px-2 cursor-pointer transition-all overflow-hidden ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/60 ring-1 ring-cyan-400 z-20 shadow-lg'
                            : 'border-white/20 bg-neutral-900/80 hover:border-white/40 z-10'
                        }`}
                      >
                        {/* Thumbnail background */}
                        {clip.thumbnailUrl && (
                          <div className="w-8 h-8 rounded overflow-hidden mr-2 shrink-0 bg-black/40">
                            <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs font-bold text-white truncate">
                            {clip.title}
                          </div>
                          <div className="text-[9px] font-mono text-white/50">
                            {clip.duration}s
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
