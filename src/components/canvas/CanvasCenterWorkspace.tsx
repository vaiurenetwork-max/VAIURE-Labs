import React from 'react';
import {
  Play,
  Download,
  Loader2,
  Upload,
  PenTool,
  X,
  Film,
  Image as ImageIcon,
  ArrowRight,
  GitBranch,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  ActiveModelCapabilities,
  CanvasCenterStage,
  CanvasExperienceMode,
  CanvasGenerationConfig,
  CanvasTimelineClip,
} from './canvasWorkspaceTypes';
import { WorkflowNodeGraph } from './WorkflowNodeGraph';

interface CanvasCenterWorkspaceProps {
  centerStage: CanvasCenterStage;
  experienceMode: CanvasExperienceMode;
  showTimeline: boolean;
  onToggleTimeline: () => void;
  config: CanvasGenerationConfig;
  capabilities: ActiveModelCapabilities;
  activeClip: CanvasTimelineClip | null;
  timelineClips: CanvasTimelineClip[];
  activeGenerationStatus: {
    status: 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';
    progress: number;
    stageLabel?: string;
    error?: string | null;
    isFinalizing?: boolean;
  };
  isExtractingLastFrame: boolean;
  onSelectClip: (clip: CanvasTimelineClip) => void;
  onDeleteClip: (clipId: string) => void;
  onClearActivePreview: () => void;
  onExtendFromActiveClip: () => void;
  onFinalizeActiveDraft: () => void;
  onSendUrlToSeedance?: (url: string) => void;
  onUploadStageFiles: (files: FileList | null) => void;
  onClearStartImage: () => void;
  onClearEndImage: () => void;
  onRemoveReferenceImage: (url: string) => void;
  onClearExtensionVideo: () => void;
  onOpenPainter: () => void;
  // Workflow Node Graph props
  pendingFlowImageUrl: string | null;
  onConsumePaintedImage: () => void;
  onSendImagesToSeedance?: (urls: string[]) => void;
  onStatusNotice: (msg: string, isError?: boolean) => void;
  // Painter Node kept mounted in DOM so layers stay alive
  painterStageElement: React.ReactNode;
}

export const CanvasCenterWorkspace: React.FC<CanvasCenterWorkspaceProps> = ({
  centerStage,
  experienceMode,
  showTimeline,
  onToggleTimeline,
  config,
  capabilities,
  activeClip,
  timelineClips,
  activeGenerationStatus,
  isExtractingLastFrame,
  onSelectClip,
  onDeleteClip,
  onClearActivePreview,
  onExtendFromActiveClip,
  onFinalizeActiveDraft,
  onSendUrlToSeedance,
  onUploadStageFiles,
  onClearStartImage,
  onClearEndImage,
  onRemoveReferenceImage,
  onClearExtensionVideo,
  onOpenPainter,
  pendingFlowImageUrl,
  onConsumePaintedImage,
  onSendImagesToSeedance,
  onStatusNotice,
  painterStageElement,
}) => {
  const stageFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);

  const hasAnyReference =
    Boolean(config.startImageUrl) ||
    Boolean(config.endImageUrl) ||
    Boolean(config.extensionVideoUrl) ||
    config.referenceImageUrls.length > 0;

  const isBusy =
    activeGenerationStatus.status === 'submitting' ||
    activeGenerationStatus.status === 'processing';

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadStageFiles(e.dataTransfer.files);
    }
  };

  return (
    <main className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#06070a] relative overflow-hidden">
      <input
        ref={stageFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          onUploadStageFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* STAGE VIEW: Large Video Preview + Scene Composition + Reference Strip + Timeline */}
      {centerStage === 'stage' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Primary Spacious Stage Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className="flex-1 min-h-0 p-3 sm:p-5 lg:p-6 flex flex-col items-center justify-center overflow-y-auto"
          >
            <div
              className={`w-full max-w-5xl rounded-2xl border bg-[#090b10] transition-colors overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8)] ${
                isDragOver ? 'border-white/55 bg-white/[0.04]' : 'border-white/[0.1]'
              }`}
            >
              {/* Active Video Playback OR Live Generation Progress OR Composition Drop Stage */}
              {activeClip && activeClip.videoUrl ? (
                <div className="flex flex-col">
                  <div className="relative bg-black aspect-video max-h-[56vh] w-full flex items-center justify-center overflow-hidden">
                    <video
                      key={activeClip.videoUrl}
                      src={activeClip.videoUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Clean Action Footer under Video Preview */}
                  <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0b0d12] flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-white truncate">
                        {activeClip.title || 'Generated Video'}
                      </div>
                      <div className="text-[10px] font-mono text-white/50 tabular-nums">
                        {activeClip.modelName} · {activeClip.resolution} · {activeClip.duration}s
                        {activeClip.isDraft ? ' · Draft Preview' : ''}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {activeClip.isDraft && (
                        <button
                          type="button"
                          onClick={onFinalizeActiveDraft}
                          disabled={activeGenerationStatus.isFinalizing}
                          className="h-8 px-3 rounded-lg bg-[#ecece9] hover:bg-white text-black text-[11px] font-mono font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {activeGenerationStatus.isFinalizing ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>Finalize 1080p</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={onExtendFromActiveClip}
                        disabled={isExtractingLastFrame}
                        className="h-8 px-3 rounded-lg border border-white/[0.14] bg-white/[0.05] hover:bg-white/[0.12] text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isExtractingLastFrame ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <GitBranch className="w-3.5 h-3.5" />
                        )}
                        <span>Extend Scene</span>
                      </button>

                      <a
                        href={activeClip.videoUrl}
                        download={`vaiure_canvas_${Date.now()}.mp4`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                      </a>

                      {onSendUrlToSeedance && (
                        <button
                          type="button"
                          onClick={() => onSendUrlToSeedance(activeClip.videoUrl)}
                          className="h-8 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Seedance Lab</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={onClearActivePreview}
                        title="Return to Composition Stage"
                        className="h-8 px-2.5 rounded-lg border border-white/[0.1] text-white/55 hover:text-white text-[11px] font-mono cursor-pointer"
                      >
                        Compose
                      </button>
                    </div>
                  </div>
                </div>
              ) : isBusy ? (
                <div className="aspect-video max-h-[54vh] w-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                  <div className="space-y-1.5 max-w-md">
                    <div className="text-sm font-medium text-white">
                      {activeGenerationStatus.stageLabel || 'Synthesizing Video Sequence'}
                    </div>
                    <div className="text-xs font-mono text-white/55 tabular-nums">
                      {capabilities.model?.displayName || 'Seedance 2.5'} · {config.resolution} · {config.duration}s
                    </div>
                  </div>
                  <div className="w-full max-w-sm h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${Math.max(8, Math.min(100, activeGenerationStatus.progress))}%` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-white/45 tabular-nums">
                    {Math.round(activeGenerationStatus.progress)}% Complete
                  </div>
                </div>
              ) : (
                /* Scene Composition Focal Stage */
                <div className="aspect-video max-h-[54vh] w-full relative flex flex-col items-center justify-center p-6 sm:p-10">
                  {activeGenerationStatus.status === 'failed' && activeGenerationStatus.error && (
                    <div className="mb-4 px-3.5 py-2 rounded-lg border border-rose-400/35 bg-rose-950/40 text-xs text-rose-200 flex items-center gap-2 max-w-xl">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-300" />
                      <span className="truncate">{activeGenerationStatus.error}</span>
                    </div>
                  )}

                  {config.startImageUrl || config.endImageUrl ? (
                    <div className="w-full h-full flex items-center justify-center gap-4">
                      {config.startImageUrl && (
                        <div className="relative h-full max-h-[42vh] aspect-video rounded-xl overflow-hidden border border-white/[0.14] bg-black group">
                          <img
                            src={config.startImageUrl}
                            alt="Start Frame"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-mono text-white">
                            Start Frame
                          </div>
                          <button
                            type="button"
                            onClick={onClearStartImage}
                            title="Remove Start Frame"
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/80 border border-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {config.endImageUrl && (
                        <div className="relative h-full max-h-[42vh] aspect-video rounded-xl overflow-hidden border border-white/[0.14] bg-black">
                          <img
                            src={config.endImageUrl}
                            alt="End Frame"
                            className="w-full h-full object-contain"
                          />
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-mono text-white">
                            End Frame
                          </div>
                          <button
                            type="button"
                            onClick={onClearEndImage}
                            title="Remove End Frame"
                            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/80 border border-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : config.extensionVideoUrl ? (
                    <div className="relative h-full max-h-[42vh] aspect-video rounded-xl overflow-hidden border border-white/[0.14] bg-black">
                      <video
                        src={config.extensionVideoUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-white/15 text-[10px] font-mono text-white">
                        Source Clip
                      </div>
                      <button
                        type="button"
                        onClick={onClearExtensionVideo}
                        title="Remove Video"
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/80 border border-white/20 text-white/80 hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center max-w-md space-y-4">
                      <div className="space-y-1.5">
                        <div className="text-xs font-mono uppercase tracking-[0.2em] text-white/45">
                          {capabilities.model?.displayName || 'Seedance 2.5'} ·{' '}
                          {config.creationMode.replace(/_/g, ' ')}
                        </div>
                        <h2 className="text-lg sm:text-xl font-medium text-white tracking-tight">
                          {capabilities.requiresStartImage || config.creationMode === 'image_to_video'
                            ? 'Drop a start frame or pick from Assets'
                            : 'Compose your shot prompt & references'}
                        </h2>
                        <p className="text-xs text-white/50 leading-relaxed">
                          Configure parameters in the right panel, attach visual references on the left,
                          or sketch custom keyframes in Plate Painter.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => stageFileInputRef.current?.click()}
                          className="h-9 px-3.5 rounded-lg border border-white/[0.16] bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-white flex items-center gap-2 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Media</span>
                        </button>
                        <button
                          type="button"
                          onClick={onOpenPainter}
                          className="h-9 px-3.5 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.09] text-xs font-mono text-white/80 hover:text-white flex items-center gap-2 cursor-pointer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Sketch Keyframe</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Clean Active References Strip */}
            {hasAnyReference && (
              <div className="w-full max-w-5xl mt-3 px-3 py-2 rounded-xl border border-white/[0.08] bg-[#0b0d12]/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/45 shrink-0 mr-1">
                  Active Bindings
                </span>
                {config.startImageUrl && (
                  <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-white/[0.14] bg-black/50 shrink-0">
                    <img src={config.startImageUrl} alt="" className="w-6 h-6 rounded object-cover" />
                    <span className="text-[10px] font-mono text-white">Start</span>
                    <button
                      type="button"
                      onClick={onClearStartImage}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {config.endImageUrl && (
                  <div className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-white/[0.14] bg-black/50 shrink-0">
                    <img src={config.endImageUrl} alt="" className="w-6 h-6 rounded object-cover" />
                    <span className="text-[10px] font-mono text-white">End</span>
                    <button
                      type="button"
                      onClick={onClearEndImage}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {config.extensionVideoUrl && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-white/[0.14] bg-black/50 shrink-0">
                    <Film className="w-3.5 h-3.5 text-white/75" />
                    <span className="text-[10px] font-mono text-white">Extend Clip</span>
                    <button
                      type="button"
                      onClick={onClearExtensionVideo}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                {config.referenceImageUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-white/[0.12] bg-black/50 shrink-0"
                  >
                    <img src={url} alt="" className="w-6 h-6 rounded object-cover" />
                    <span className="text-[10px] font-mono text-white/85">@Image{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveReferenceImage(url)}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Bottom Timeline Visualization */}
          <div className="border-t border-white/[0.08] bg-[#090b10] shrink-0">
            <div className="h-9 px-3 sm:px-4 flex items-center justify-between">
              <button
                type="button"
                onClick={onToggleTimeline}
                className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.16em] text-white/65 hover:text-white cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>Timeline Sequence ({timelineClips.length})</span>
                {showTimeline ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>

              <div className="flex items-center gap-3 text-[10px] font-mono text-white/45 tabular-nums">
                <span>Target Duration: {config.duration}s</span>
                {experienceMode === 'advanced' && (
                  <span className="hidden sm:inline">
                    Total Reel: {timelineClips.reduce((acc, c) => acc + (c.duration || 0), 0)}s
                  </span>
                )}
              </div>
            </div>

            {showTimeline && (
              <div className="px-3 sm:px-4 pb-3 pt-1">
                {timelineClips.length === 0 ? (
                  <div className="h-14 rounded-lg border border-dashed border-white/[0.08] flex items-center justify-between px-4 text-[11px] font-mono text-white/40">
                    <span>Generated takes appear here for instant scrubbing and Scene N+1 continuation.</span>
                    <span className="hidden sm:inline tabular-nums">00:00 — 00:{String(config.duration).padStart(2, '0')}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                    {timelineClips.map((clip, idx) => {
                      const selected = activeClip?.id === clip.id;
                      const widthPx = Math.max(150, Math.min(240, clip.duration * 10));
                      return (
                        <div
                          key={clip.id}
                          style={{ width: widthPx }}
                          onClick={() => onSelectClip(clip)}
                          className={`group shrink-0 rounded-lg border p-2 cursor-pointer transition-colors ${
                            selected
                              ? 'border-white/50 bg-white/[0.1]'
                              : 'border-white/[0.08] bg-black/50 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-mono text-white font-semibold truncate">
                              #{String(idx + 1).padStart(2, '0')} · {clip.duration}s
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono text-white/50">{clip.resolution}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteClip(clip.id);
                                }}
                                title="Remove take"
                                className="opacity-0 group-hover:opacity-100 text-white/45 hover:text-white transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[10px] text-white/60 truncate mt-1">
                            {clip.title || clip.modelName}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WORKFLOW NODE GRAPH STAGE */}
      {centerStage === 'workflow' && (
        <div className="flex-1 min-h-0 flex relative overflow-hidden">
          <WorkflowNodeGraph
            externalPaintedImageUrl={pendingFlowImageUrl}
            onConsumePaintedImage={onConsumePaintedImage}
            onSendImagesToSeedanceSlide4={(urls) => {
              if (urls.length > 0 && onSendImagesToSeedance) {
                onSendImagesToSeedance(urls);
              }
            }}
            onStatusNotice={onStatusNotice}
          />
        </div>
      )}

      {/* 2D PLATE PAINTER STAGE (always kept mounted hidden when inactive so layers stay alive) */}
      <div className={centerStage === 'painter' ? 'flex-1 min-h-0 flex relative overflow-hidden' : 'hidden'}>
        {painterStageElement}
      </div>
    </main>
  );
};
