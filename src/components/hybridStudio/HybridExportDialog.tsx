/**
 * VAIURE HYBRID STUDIO — Export & Delivery Dialog
 * Honest production deliverables:
 * 1. Real client-side Canvas + MediaRecorder WebM sequence render (when clip CORS allows)
 * 2. Individual generated shot MP4 downloads
 * 3. Production EDL (.edl) & full Studio Manifest (.json) download
 */

import React, { useState } from 'react';
import {
  Download,
  FileCode2,
  Film,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clapperboard,
} from 'lucide-react';
import { HybridProductionProject } from '../../types/hybridStudio';

interface HybridExportDialogProps {
  project: HybridProductionProject;
  isOpen: boolean;
  onClose: () => void;
}

export const HybridExportDialog: React.FC<HybridExportDialogProps> = ({
  project,
  isOpen,
  onClose,
}) => {
  const [isRenderingWebm, setIsRenderingWebm] = useState(false);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [webmDownloadUrl, setWebmDownloadUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const videoClips = [...project.timelineClips]
    .filter((c) => c.trackType === 'VIDEO' && Boolean(c.mediaUrl))
    .sort((a, b) => a.startTime - b.startTime);

  const renderedShots = project.scenes.flatMap((scene) =>
    scene.shots
      .filter((s) => Boolean(s.outputUrl))
      .map((s) => ({ scene, shot: s }))
  );

  const totalSequenceDuration = videoClips.reduce(
    (max, c) => Math.max(max, c.startTime + c.duration),
    0
  );

  const safeSlug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'hybrid_film';

  const handleDownloadManifestJson = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeSlug}_production_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEdl = () => {
    const fps = project.frameRate === '30fps' ? 30 : 24;
    const toSmpte = (secs: number) => {
      const totalFrames = Math.max(0, Math.round(secs * fps));
      const f = totalFrames % fps;
      const s = Math.floor(totalFrames / fps) % 60;
      const m = Math.floor(totalFrames / (fps * 60)) % 60;
      const h = Math.floor(totalFrames / (fps * 3600));
      return [h, m, s, f].map((v) => String(v).padStart(2, '0')).join(':');
    };

    const lines = [
      `TITLE: ${project.name.toUpperCase()}`,
      `FCM: NON-DROP FRAME`,
      '',
    ];

    videoClips.forEach((clip, idx) => {
      const num = String(idx + 1).padStart(3, '0');
      const trans = clip.transitionIn === 'CUT' ? 'C' : 'D';
      const srcIn = toSmpte(clip.inPoint);
      const srcOut = toSmpte(clip.inPoint + clip.duration);
      const recIn = toSmpte(clip.startTime);
      const recOut = toSmpte(clip.startTime + clip.duration);
      lines.push(
        `${num}  AX       V     ${trans}        ${srcIn} ${srcOut} ${recIn} ${recOut}`
      );
      lines.push(`* FROM CLIP NAME: ${clip.title}`);
      lines.push(`* SOURCE URL: ${clip.mediaUrl}`);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeSlug}.edl`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRenderSequenceWebm = async () => {
    setRenderError(null);
    setWebmDownloadUrl(null);

    if (videoClips.length === 0) {
      setRenderError('Add at least one video clip to the timeline before rendering a sequence.');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setRenderError('MediaRecorder is unavailable in this browser. Download individual shot clips or EDL below.');
      return;
    }

    setIsRenderingWebm(true);
    setRenderStatus('Initializing sequence canvas compositor...');

    try {
      const dims =
        project.aspectRatio === '9:16'
          ? { w: 720, h: 1280 }
          : project.aspectRatio === '1:1'
          ? { w: 1080, h: 1080 }
          : { w: 1280, h: 720 };

      const canvas = document.createElement('canvas');
      canvas.width = dims.w;
      canvas.height = dims.h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');

      const stream = canvas.captureStream(project.frameRate === '30fps' ? 30 : 24);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 6_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const recordingDone = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      recorder.start(250);

      for (let i = 0; i < videoClips.length; i++) {
        const clip = videoClips[i];
        setRenderStatus(`Compositing clip ${i + 1}/${videoClips.length}: ${clip.title}`);

        const vid = document.createElement('video');
        vid.crossOrigin = 'anonymous';
        vid.muted = true;
        vid.playsInline = true;
        vid.src = clip.mediaUrl;

        await new Promise<void>((resolve, reject) => {
          vid.onloadeddata = () => resolve();
          vid.onerror = () =>
            reject(
              new Error(
                `Cross-origin restriction blocked pixel read for "${clip.title}". Download the individual MP4 take below or use EDL.`
              )
            );
        });

        vid.currentTime = Math.max(0, clip.inPoint);
        await vid.play();

        const clipMs = Math.min(30_000, Math.max(500, clip.duration * 1000));
        const startPerf = performance.now();

        await new Promise<void>((resolve, reject) => {
          const drawFrame = () => {
            const elapsed = performance.now() - startPerf;
            if (elapsed >= clipMs || vid.ended) {
              vid.pause();
              resolve();
              return;
            }
            try {
              ctx.fillStyle = '#050507';
              ctx.fillRect(0, 0, canvas.width, canvas.height);

              // Compute aspect-fit draw coordinates
              const vw = vid.videoWidth || canvas.width;
              const vh = vid.videoHeight || canvas.height;
              const scale = Math.min(canvas.width / vw, canvas.height / vh);
              const dw = vw * scale;
              const dh = vh * scale;
              const dx = (canvas.width - dw) / 2;
              const dy = (canvas.height - dh) / 2;

              // Simple transition fade alpha
              const fadeMs = Math.min(600, clip.transitionDuration * 1000 || 350);
              let alpha = 1;
              if (clip.transitionIn === 'FADE_FROM_BLACK' || clip.transitionIn === 'DISSOLVE') {
                alpha = Math.min(1, elapsed / fadeMs);
              } else if (clip.transitionIn === 'FADE_TO_BLACK' && clipMs - elapsed < fadeMs) {
                alpha = Math.max(0, (clipMs - elapsed) / fadeMs);
              }
              ctx.globalAlpha = alpha;
              ctx.drawImage(vid, dx, dy, dw, dh);
              ctx.globalAlpha = 1;

              requestAnimationFrame(drawFrame);
            } catch {
              vid.pause();
              reject(
                new Error(
                  `Remote media server prevented canvas pixel capture for "${clip.title}". Use direct MP4 take downloads or EDL export below.`
                )
              );
            }
          };
          requestAnimationFrame(drawFrame);
        });
      }

      recorder.stop();
      const finalBlob = await recordingDone;
      const outUrl = URL.createObjectURL(finalBlob);
      setWebmDownloadUrl(outUrl);
      setRenderStatus('Sequence WebM compiled and ready for download.');
    } catch (err: any) {
      setRenderError(err?.message || 'Client sequence render could not complete.');
    } finally {
      setIsRenderingWebm(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/82 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#090a0f] border border-white/[0.15] text-[#ECECE9] shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="px-5 py-3.5 border-b border-white/[0.1] bg-[#0b0d12] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-white font-semibold">
              Export & Delivery Workflow
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/50 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-3 border border-white/[0.1] bg-[#0b0d12]">
              <div className="text-[9px] text-white/45 uppercase">Timeline Clips</div>
              <div className="text-white font-semibold mt-0.5 tabular-nums">
                {videoClips.length} Video · {totalSequenceDuration.toFixed(1)}s
              </div>
            </div>
            <div className="p-3 border border-white/[0.1] bg-[#0b0d12]">
              <div className="text-[9px] text-white/45 uppercase">Target Format</div>
              <div className="text-white font-semibold mt-0.5 tabular-nums">
                {project.resolution} · {project.frameRate}
              </div>
            </div>
            <div className="p-3 border border-white/[0.1] bg-[#0b0d12]">
              <div className="text-[9px] text-white/45 uppercase">Aspect Ratio</div>
              <div className="text-white font-semibold mt-0.5 tabular-nums">
                {project.aspectRatio}
              </div>
            </div>
          </div>

          {/* 1. Real-time Browser Sequence Assembly (WebM) */}
          <div className="p-4 border border-white/[0.1] bg-[#0b0d12] space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  1. Render Assembled Timeline Sequence (WebM)
                </h3>
                <p className="text-xs text-white/55 mt-0.5">
                  Composites sequenced timeline clips and transitions locally in your browser into a continuous WebM file.
                </p>
              </div>
              <button
                type="button"
                disabled={isRenderingWebm || videoClips.length === 0}
                onClick={handleRenderSequenceWebm}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#ECECE9] hover:bg-white text-black text-[10px] font-mono font-semibold uppercase cursor-pointer disabled:opacity-40 shrink-0"
              >
                {isRenderingWebm ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Film className="w-3.5 h-3.5" />
                )}
                <span>{isRenderingWebm ? 'Compositing...' : 'Render WebM'}</span>
              </button>
            </div>

            {renderStatus && (
              <div className="p-2.5 border border-cyan-500/30 bg-cyan-950/25 text-[11px] font-mono text-cyan-200 flex items-center gap-2">
                {isRenderingWebm ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                )}
                <span>{renderStatus}</span>
              </div>
            )}

            {renderError && (
              <div className="p-2.5 border border-amber-500/35 bg-amber-950/30 text-[11px] font-mono text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{renderError}</span>
              </div>
            )}

            {webmDownloadUrl && (
              <div className="flex items-center justify-between p-2.5 border border-emerald-500/35 bg-emerald-950/25">
                <span className="text-xs font-mono text-emerald-300">
                  Assembled sequence WebM ready
                </span>
                <a
                  href={webmDownloadUrl}
                  download={`${safeSlug}_sequence.webm`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-400 text-black text-[10px] font-mono font-bold uppercase"
                >
                  <Download className="w-3 h-3" />
                  <span>Download WebM</span>
                </a>
              </div>
            )}
          </div>

          {/* 2. EDL & Full Production Package */}
          <div className="p-4 border border-white/[0.1] bg-[#0b0d12] space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              2. NLE Edit Decision List (EDL) & Production Package
            </h3>
            <p className="text-xs text-white/55">
              Export frame-accurate CMX-3600 EDL cut sheets for DaVinci Resolve / Premiere Pro or archive the full production JSON blueprint.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadEdl}
                disabled={videoClips.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase text-white cursor-pointer disabled:opacity-40"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>Download Timeline .EDL</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadManifestJson}
                className="flex items-center gap-1.5 px-3 py-2 border border-white/15 hover:border-white/40 text-[10px] font-mono uppercase text-white cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Project JSON</span>
              </button>
            </div>
          </div>

          {/* 3. Individual Rendered Takes */}
          <div className="p-4 border border-white/[0.1] bg-[#0b0d12] space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
              3. Individual Generated Shot Masters ({renderedShots.length})
            </h3>
            {renderedShots.length === 0 ? (
              <p className="text-xs font-mono text-white/40">
                No completed shot renders yet. Generate shots from the Storyboard or AI Direction panel.
              </p>
            ) : (
              <div className="divide-y divide-white/[0.08] border border-white/[0.08] max-h-48 overflow-y-auto">
                {renderedShots.map(({ scene, shot }) => (
                  <div
                    key={shot.id}
                    className="px-3 py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-white truncate">
                        SCN {String(scene.sceneNumber).padStart(2, '0')} · SHT{' '}
                        {String(shot.shotNumber).padStart(2, '0')} — {shot.title}
                      </div>
                      <div className="text-[10px] font-mono text-white/45">
                        {shot.resolution} · {shot.duration}s · {shot.providerId.toUpperCase()}
                      </div>
                    </div>
                    <a
                      href={shot.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={`${safeSlug}_scn${scene.sceneNumber}_sht${shot.shotNumber}.mp4`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-white/15 hover:border-cyan-400 text-[10px] font-mono text-cyan-300 shrink-0"
                    >
                      <Download className="w-3 h-3" />
                      <span>MP4</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
