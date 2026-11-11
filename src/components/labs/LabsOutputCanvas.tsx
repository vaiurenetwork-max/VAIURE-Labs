import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Share2,
  Maximize2,
  Play,
  Sparkles,
  X,
  FileText,
  Layers,
} from 'lucide-react';
import { GenerationItem } from '../../types/labs';
import { FILM_STILL_IMAGE } from '../../data/ivntriData';

interface LabsOutputCanvasProps {
  activeItem: GenerationItem | null;
  onForkSettings: (item: GenerationItem) => void;
  onPublishToFeed?: (item: GenerationItem) => void;
  isGenerating?: boolean;
  generationProgress?: number;
  generationStage?: string;
}

export const LabsOutputCanvas: React.FC<LabsOutputCanvasProps> = ({
  activeItem,
  onForkSettings,
  onPublishToFeed,
  isGenerating,
  generationProgress,
  generationStage,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullPromptModal, setShowFullPromptModal] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Fallback item so there is NEVER an empty state
  const displayItem: GenerationItem = activeItem || {
    id: 'default-preview',
    createdAt: Date.now(),
    mode: 'video',
    modelId: 'seedance-2.5-ref-video',
    modelDisplayName: 'seedance 2.5 ref-video',
    provider: 'Seedance Engine',
    prompt:
      'Cavernous brutalist gallery carved from volcanic basalt. Single aperture daylight beam slicing across polished stone floor. 24fps film cadence, 1080p master.',
    aspectRatio: '16:9',
    resolution: '1080p',
    durationSeconds: 8,
    frameRate: '24fps',
    mediaUrl: FILM_STILL_IMAGE,
    isVideo: true,
    seed: 9283719,
    renderTimeSec: 14.2,
    referenceImagesCount: 12,
    wordCount: 30,
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(displayItem.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = displayItem.mediaUrl;
    a.download = `VAIURE_${displayItem.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  const wordCount = displayItem.wordCount || displayItem.prompt.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050507] text-[#ECECE9] overflow-hidden select-none">
      {/* 1. Canvas Top Metadata Info Bar */}
      <div className="h-10 border-b border-white/[0.08] px-3 sm:px-4 flex items-center justify-between bg-[#060609]/80 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="font-semibold text-white">
              {displayItem.modelDisplayName}
            </span>

            {/* Resolution Spec */}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white font-semibold">
              {displayItem.resolution || '1080p'}
            </span>

            {/* Duration Spec */}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/80">
              {displayItem.durationSeconds}s
            </span>

            {/* Frame Rate Spec */}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/90">
              {displayItem.frameRate || '24fps'}
            </span>

            {/* Aspect Ratio */}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-white/60">
              {displayItem.aspectRatio}
            </span>

            {/* References Count */}
            {displayItem.referenceImagesCount && displayItem.referenceImagesCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/80 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-white/70" />
                <span>{displayItem.referenceImagesCount} refs</span>
              </span>
            ) : null}

            {wordCount > 50 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-white/60 hidden md:inline">
                {wordCount.toLocaleString()} words
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowFullPromptModal(true)}
            className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-mono"
            title="Inspect prompt"
          >
            <FileText className="w-3.5 h-3.5 text-white/70" />
            <span className="hidden sm:inline">Prompt</span>
          </button>

          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Main Stage Media Preview (Never Empty) */}
      <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center z-20 p-6 bg-black/80 backdrop-blur-md border border-white/20 rounded shadow-2xl max-w-sm">
            <Sparkles className="w-8 h-8 text-white animate-spin" />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-mono font-semibold text-white">
                seedance 2.5 ref-video
              </span>
              <span className="text-xs font-mono text-white/70">{generationProgress}%</span>
              <span className="text-[10px] font-mono text-white/50 px-2">
                {generationStage || 'Synthesizing 24fps sequence...'}
              </span>
            </div>
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${generationProgress || 30}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <div className="relative group max-h-[70vh] flex items-center justify-center rounded overflow-hidden shadow-2xl border border-white/10">
              <img
                src={displayItem.mediaUrl}
                alt={displayItem.prompt}
                className="max-h-[70vh] max-w-full object-contain pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/35 transition-colors flex items-center justify-center pointer-events-auto">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white cursor-pointer hover:scale-105 transition-transform shadow-lg">
                  <Play className="w-5 h-5 ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Action Bar */}
      <div
        data-no-slide-swipe="true"
        className="border-t border-white/[0.08] px-4 py-2.5 pb-16 sm:pb-2.5 bg-[#07070B] flex flex-wrap items-center justify-between gap-2 shrink-0"
      >
        <div className="flex items-center gap-2 max-w-[65%] min-w-0">
          <span
            onClick={() => setShowFullPromptModal(true)}
            className="text-xs font-mono text-white/70 truncate hidden sm:inline hover:text-white cursor-pointer"
            title="Click to view full prompt"
          >
            {displayItem.prompt}
          </span>

          <button
            onClick={handleCopyPrompt}
            className="px-2.5 py-1 rounded border border-white/10 text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            title="Copy prompt"
          >
            {copiedPrompt ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => onForkSettings(displayItem)}
            className="px-2.5 py-1 rounded border border-white/10 text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Load into workspace"
          >
            Fork
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onPublishToFeed && (
            <button
              onClick={() => onPublishToFeed(displayItem)}
              className="px-2.5 py-1 rounded border border-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
              title="Post video to Threads feed"
            >
              <Share2 className="w-3 h-3" />
              <span>Post</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            className="px-3 py-1 rounded bg-white text-black font-semibold text-xs font-mono hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
            title="Download video"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3 h-3" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Download className="w-3 h-3" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. Fullscreen Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              onClick={handleDownload}
              className="px-3 py-1 rounded bg-white text-black text-xs font-mono uppercase cursor-pointer"
            >
              Download
            </button>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-[95vw] max-h-[90vh] flex items-center justify-center">
            <img
              src={displayItem.mediaUrl}
              alt={displayItem.prompt}
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          </div>
        </div>
      )}

      {/* 5. Prompt & Seedance 2.5 Payload Inspector Modal */}
      {showFullPromptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowFullPromptModal(false)}
        >
          <div
            className="max-w-3xl w-full max-h-[85vh] bg-[#0A0A0E] border border-white/20 rounded p-4 sm:p-5 flex flex-col gap-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-semibold text-white">
                  Seedance 2.5 Directive Inspector
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  {wordCount.toLocaleString()} words
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyPrompt}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                >
                  {copiedPrompt ? 'Copied' : 'Copy Active'}
                </button>
                <button
                  onClick={() => setShowFullPromptModal(false)}
                  className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inspection tabs */}
            <div className="flex bg-black/40 p-0.5 rounded border border-white/10 text-xs font-mono">
              <span className="px-3 py-1 bg-white/15 text-white font-semibold rounded">
                Compiled Chronological Prompt & Payload
              </span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-3 bg-black/40 rounded border border-white/10 text-xs font-mono text-white/90 select-text">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">
                  Original Descriptive Prompt:
                </span>
                <p className="whitespace-pre-wrap leading-relaxed bg-[#0E0E14] p-2.5 rounded border border-white/5 text-white/80">
                  {displayItem.prompt}
                </p>
              </div>

              {displayItem.compiledPrompt && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">
                    Compiled Directives with Exact Timestamps:
                  </span>
                  <pre className="whitespace-pre-wrap leading-relaxed bg-[#0E0E14] p-2.5 rounded border border-white/5 text-white/90 font-mono text-[11px]">
                    {displayItem.compiledPrompt}
                  </pre>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">
                    BytePlus Seedance 2.5 Payload Schema:
                  </span>
                  <button
                    onClick={() => {
                      const payloadObj = {
                        model: 'seedance-2.5',
                        input: {
                          prompt: displayItem.compiledPrompt || displayItem.prompt,
                          aspect_ratio: displayItem.aspectRatio,
                          resolution: displayItem.resolution || '1080p',
                          duration_seconds: displayItem.durationSeconds || 8,
                          frame_rate: '24fps',
                          reference_images_count: displayItem.referenceImagesCount || 0,
                        },
                      };
                      navigator.clipboard.writeText(JSON.stringify(payloadObj, null, 2));
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="text-[10px] text-white/60 hover:text-white underline cursor-pointer"
                  >
                    Copy Payload
                  </button>
                </div>
                <pre className="p-2.5 rounded bg-[#07070B] border border-white/5 text-[10px] text-white/70 overflow-x-auto leading-tight">
                  {JSON.stringify(
                    {
                      schema_version: '1.0',
                      provider: 'byteplus',
                      model: 'seedance-2.5',
                      input: {
                        prompt: displayItem.compiledPrompt || displayItem.prompt,
                        aspect_ratio: displayItem.aspectRatio,
                        resolution: displayItem.resolution || '1080p',
                        duration_seconds: displayItem.durationSeconds || 8,
                        frame_rate: '24fps',
                        reference_images_count: displayItem.referenceImagesCount || 0,
                      },
                      metadata: {
                        target_api: 'BytePlus Seedance 2.5 Video Generation API',
                        timestamp: new Date(displayItem.createdAt).toISOString(),
                      },
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
