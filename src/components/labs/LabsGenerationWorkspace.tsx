import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Film,
  Upload,
  X,
  Maximize2,
  Copy,
  Check,
  Plus,
  Layers,
  Clock,
  Tv,
  ListOrdered,
  FileCode,
  Sliders,
  AlertCircle,
  CheckCircle2,
  Send,
  Wand2,
  RefreshCw,
  Trash2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  ModelOption,
  GenerationParameters,
  ReferenceImageItem,
  ReferenceRole,
  VideoResolution,
  AspectRatioId,
  SlashSegment,
  TemporalSequence,
  PromptMode,
  TimelineValidationResult,
  Seedance25Payload,
} from '../../types/labs';
import {
  ASPECT_RATIO_OPTIONS,
  RESOLUTION_OPTIONS,
  createSampleReferenceBatch,
} from '../../data/labsData';
import {
  serializeSlashPrompt,
  validateTimeline,
  compileDeterministicPrompt,
  generateSeedance25Payload,
  autoSplitSequences,
  formatTimestamp,
  localConvertNaturalToSlash,
} from '../../utils/promptSequenceCompiler';

interface LabsGenerationWorkspaceProps {
  currentModel: ModelOption;
  params: GenerationParameters;
  onChangeParams: (newParams: Partial<GenerationParameters>) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generationProgress: number;
  generationStage?: string;
}

const MAX_PROMPT_WORDS = 50000;
const MAX_REFERENCE_IMAGES = 30;

const REFERENCE_ROLES: { id: ReferenceRole; label: string }[] = [
  { id: 'style', label: 'Style' },
  { id: 'subject', label: 'Subject' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'palette', label: 'Palette' },
  { id: 'pose', label: 'Pose' },
  { id: 'composition', label: 'Composition' },
];

const COMMON_SLASH_CATEGORIES = [
  'subject',
  'environment',
  'time_of_day',
  'action',
  'event',
  'camera',
  'lighting',
  'visual_style',
  'motion',
  'audio',
  'details',
];

export const LabsGenerationWorkspace: React.FC<LabsGenerationWorkspaceProps> = ({
  currentModel,
  params,
  onChangeParams,
  onGenerate,
  isGenerating,
  generationProgress,
  generationStage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-navigation tabs: directives | sequences | payload
  const [workspaceTab, setWorkspaceTab] = useState<'directives' | 'sequences' | 'payload'>('directives');
  const [payloadSubTab, setPayloadSubTab] = useState<'compiled' | 'json'>('compiled');

  // Modal / overlay states
  const [isExpandedPrompt, setIsExpandedPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSlash, setCopiedSlash] = useState(false);
  const [copiedCompiled, setCopiedCompiled] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [previewingRefImage, setPreviewingRefImage] = useState<ReferenceImageItem | null>(null);

  // AI Prompt Engineering states
  const [isConvertingToSlash, setIsConvertingToSlash] = useState(false);
  const [isRebuildingNatural, setIsRebuildingNatural] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // BytePlus Seedance 2.5 API submission status
  const [submissionStatus, setSubmissionStatus] = useState<any | null>(null);
  const [isSubmittingToApi, setIsSubmittingToApi] = useState(false);

  // Live counts
  const wordCount = useMemo(() => {
    const trimmed = (params.prompt || '').trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [params.prompt]);

  const charCount = (params.prompt || '').length;
  const referenceCount = params.referenceImages?.length || 0;
  const promptMode: PromptMode = params.promptMode || 'natural';

  // Real-time timeline validation
  const timelineValidation: TimelineValidationResult = useMemo(() => {
    return validateTimeline(params.sequences || [], params.durationSeconds || 8);
  }, [params.sequences, params.durationSeconds]);

  // Real-time compiled chronological prompt
  const compiledPromptText = useMemo(() => {
    if (params.compiledPrompt && !params.isSlashDirty) {
      return params.compiledPrompt;
    }
    return compileDeterministicPrompt(params);
  }, [params]);

  // Real-time validated Seedance 2.5 JSON payload
  const seedancePayload: Seedance25Payload = useMemo(() => {
    return generateSeedance25Payload(params, timelineValidation);
  }, [params, timelineValidation]);

  // Synchronize compiled prompt into parent params if needed
  useEffect(() => {
    if (!params.compiledPrompt) {
      onChangeParams({ compiledPrompt: compiledPromptText });
    }
  }, [compiledPromptText]);

  // Reference file uploads up to 30 images
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_REFERENCE_IMAGES - referenceCount;
    if (remainingSlots <= 0) return;

    const filesToProcess = (Array.from(files) as File[]).slice(0, remainingSlots);
    const newItems: ReferenceImageItem[] = [];

    let completed = 0;
    filesToProcess.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          id: `ref-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
          url: reader.result as string,
          name: file.name.replace(/\.[^/.]+$/, ''),
          weight: 0.8,
          role: 'style',
          sizeBytes: file.size,
        });
        completed++;
        if (completed === filesToProcess.length) {
          onChangeParams({
            referenceImages: [...(params.referenceImages || []), ...newItems],
          });
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveReference = (id: string) => {
    const updated = (params.referenceImages || []).filter((r) => r.id !== id);
    onChangeParams({ referenceImages: updated });
  };

  const handleUpdateRefRole = (id: string, role: ReferenceRole) => {
    const updated = (params.referenceImages || []).map((r) =>
      r.id === id ? { ...r, role } : r
    );
    onChangeParams({ referenceImages: updated });
  };

  const handleClearAllReferences = () => {
    onChangeParams({ referenceImages: [] });
  };

  const handleLoadSampleBatch = (count: number) => {
    const batch = createSampleReferenceBatch(count);
    onChangeParams({ referenceImages: batch });
  };

  // Convert Natural Language to Slash Prompt via Gemini backend
  const handleConvertToSlash = async () => {
    const promptText = params.prompt.trim();
    if (!promptText) return;

    setIsConvertingToSlash(true);
    setAiNotice('Gemini structuring prompt into slash segments...');

    try {
      const res = await fetch('/api/prompt/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const data = await res.json();
      const segments: SlashSegment[] = data.segments || localConvertNaturalToSlash(promptText);

      onChangeParams({
        slashSegments: segments,
        promptMode: 'slash',
        isSlashDirty: false,
      });

      setAiNotice('Converted to structured slash directives.');
      setTimeout(() => setAiNotice(null), 3500);
    } catch (err: any) {
      console.warn('Gemini convert fallback:', err);
      const fallback = localConvertNaturalToSlash(promptText);
      onChangeParams({
        slashSegments: fallback,
        promptMode: 'slash',
        isSlashDirty: false,
      });
      setAiNotice('Parsed into structured slash segments.');
      setTimeout(() => setAiNotice(null), 3000);
    } finally {
      setIsConvertingToSlash(false);
    }
  };

  // Rebuild Natural Language from Slash Segments
  const handleRebuildNatural = async () => {
    const segments = params.slashSegments || [];
    if (segments.length === 0) return;

    setIsRebuildingNatural(true);
    setAiNotice('Reconstructing natural-language text...');

    try {
      const res = await fetch('/api/prompt/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          originalPrompt: params.prompt,
        }),
      });

      const data = await res.json();
      const reconstructed =
        data.reconstructedPrompt || segments.map((s) => s.value).join('. ') + '.';

      onChangeParams({
        prompt: reconstructed,
        promptMode: 'natural',
        isSlashDirty: false,
      });

      setAiNotice('Natural language prompt reconstructed.');
      setTimeout(() => setAiNotice(null), 3000);
    } catch (err: any) {
      console.warn('Rebuild fallback:', err);
      const reconstructed = segments.map((s) => s.value).join('. ') + '.';
      onChangeParams({
        prompt: reconstructed,
        promptMode: 'natural',
        isSlashDirty: false,
      });
      setAiNotice('Reconstructed using direct segment synthesis.');
      setTimeout(() => setAiNotice(null), 3000);
    } finally {
      setIsRebuildingNatural(false);
    }
  };

  // Optimize prompt with Gemini specifically for Seedance 2.5
  const handleOptimizePrompt = async () => {
    setIsOptimizingPrompt(true);
    setAiNotice('Gemini optimizing cinematic fidelity for BytePlus Seedance 2.5...');

    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiledPrompt: compiledPromptText,
          durationSeconds: params.durationSeconds,
          frameRate: params.frameRate,
          aspectRatio: params.aspectRatio,
        }),
      });

      const data = await res.json();
      if (data.optimizedPrompt) {
        onChangeParams({ compiledPrompt: data.optimizedPrompt });
        setAiNotice('Prompt successfully optimized for BytePlus Seedance 2.5.');
      }
      setTimeout(() => setAiNotice(null), 3500);
    } catch (err: any) {
      console.warn('Optimize error:', err);
      setAiNotice('Preserved local chronological compiled directives.');
      setTimeout(() => setAiNotice(null), 3000);
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  // Test / Submit to BytePlus Seedance 2.5 API
  const handleSubmitToSeedanceApi = async () => {
    setIsSubmittingToApi(true);
    setSubmissionStatus(null);

    try {
      const res = await fetch('/api/generation/seedance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: seedancePayload }),
      });

      const data = await res.json();
      setSubmissionStatus(data);
    } catch (err: any) {
      setSubmissionStatus({
        status: 'ERROR',
        submission_ready: false,
        message: err?.message || 'Failed to communicate with Seedance adapter.',
      });
    } finally {
      setIsSubmittingToApi(false);
    }
  };

  // Sequence handlers
  const handleAddSequence = () => {
    const existing = params.sequences || [];
    const lastSeq = existing[existing.length - 1];
    const total = params.durationSeconds || 8;

    let start = lastSeq ? lastSeq.endSeconds : 0;
    if (start >= total) {
      start = Math.max(0, total - 2);
    }
    const end = Math.min(total, start + 3);

    const newSeq: TemporalSequence = {
      id: `seq-${Date.now()}-${existing.length + 1}`,
      order: existing.length + 1,
      startSeconds: Math.round(start * 10) / 10,
      endSeconds: Math.round(end * 10) / 10,
      description: 'Dynamic character interaction and environmental light shift',
      camera: 'Slow tracking push-in @ 24fps',
      lighting: 'Atmospheric directional beam',
      transition: 'Seamless cut on movement',
    };

    onChangeParams({ sequences: [...existing, newSeq] });
  };

  const handleUpdateSequence = (id: string, updates: Partial<TemporalSequence>) => {
    const updated = (params.sequences || []).map((s) =>
      s.id === id ? { ...s, ...updates } : s
    );
    onChangeParams({ sequences: updated });
  };

  const handleRemoveSequence = (id: string) => {
    const updated = (params.sequences || [])
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onChangeParams({ sequences: updated });
  };

  const handleAutoSplit = (count: number) => {
    const split = autoSplitSequences(
      count,
      params.durationSeconds || 8,
      params.prompt
    );
    onChangeParams({ sequences: split });
  };

  // Slash segment editing
  const handleUpdateSlashSegment = (id: string, field: 'category' | 'value', val: string) => {
    const updated = (params.slashSegments || []).map((s) =>
      s.id === id ? { ...s, [field]: val } : s
    );
    onChangeParams({ slashSegments: updated, isSlashDirty: true });
  };

  const handleAddSlashSegment = () => {
    const existing = params.slashSegments || [];
    const newSeg: SlashSegment = {
      id: `seg-${Date.now()}-${existing.length + 1}`,
      category: 'camera',
      value: 'Cinematic tracking shot with shallow depth of field',
      order: existing.length + 1,
    };
    onChangeParams({ slashSegments: [...existing, newSeg], isSlashDirty: true });
  };

  const handleRemoveSlashSegment = (id: string) => {
    const updated = (params.slashSegments || [])
      .filter((s) => s.id !== id)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    onChangeParams({ slashSegments: updated, isSlashDirty: true });
  };

  const handleMoveSlashSegment = (index: number, direction: 'up' | 'down') => {
    const list = [...(params.slashSegments || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const reordered = list.map((s, i) => ({ ...s, order: i + 1 }));
    onChangeParams({ slashSegments: reordered, isSlashDirty: true });
  };

  return (
    <div
      data-slide4-workspace="true"
      data-no-slide-swipe="true"
      className="w-full h-full flex flex-col justify-between p-3 sm:p-4 bg-[#08080C] border-r border-white/[0.08] text-[#ECECE9] overflow-y-auto select-none touch-pan-y"
    >
      <div className="flex flex-col gap-3">
        {/* 1. Header: Model Badge & Studio Navigation Tabs */}
        <div className="flex flex-col gap-2 p-2.5 rounded bg-white/[0.03] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-white/80" />
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold text-white tracking-wide">
                  seedance 2.5 ref-video
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  BytePlus Multi-Reference Temporal Studio
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/90 border border-white/15 uppercase tracking-wider font-semibold">
                24fps
              </span>
            </div>
          </div>

          {/* Sub-navigation Segmented Control */}
          <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded border border-white/[0.06]">
            <button
              onClick={() => setWorkspaceTab('directives')}
              className={`py-1.5 px-2 rounded text-center text-[11px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                workspaceTab === 'directives'
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Directives</span>
            </button>

            <button
              onClick={() => setWorkspaceTab('sequences')}
              className={`py-1.5 px-2 rounded text-center text-[11px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
                workspaceTab === 'sequences'
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <ListOrdered className="w-3 h-3" />
              <span>Sequences</span>
              <span
                className={`text-[9px] px-1 rounded ${
                  workspaceTab === 'sequences'
                    ? 'bg-black/20 text-black font-bold'
                    : 'bg-white/10 text-white/70'
                }`}
              >
                {params.sequences?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setWorkspaceTab('payload')}
              className={`py-1.5 px-2 rounded text-center text-[11px] font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                workspaceTab === 'payload'
                  ? 'bg-white text-black font-semibold shadow-xs'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>Payload</span>
              {timelineValidation.isValid && (
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </div>

        {/* AI Notification Banner */}
        {aiNotice && (
          <div className="px-2.5 py-1.5 rounded bg-white/[0.06] border border-white/15 text-[11px] font-mono text-white/90 flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-3.5 h-3.5 text-white/90 shrink-0" />
            <span className="truncate">{aiNotice}</span>
          </div>
        )}

        {/* =========================================================================
            TAB 1: DIRECTIVES (Prompt, Slash Mode, Specs, Reference Matrix)
            ========================================================================= */}
        {workspaceTab === 'directives' && (
          <div className="flex flex-col gap-3">
            {/* Specs Row: Resolution, Duration, Frame Rate */}
            <div className="flex flex-col gap-2.5 p-3 rounded bg-white/[0.02] border border-white/[0.06]">
              {/* Resolution Selector: 480p, 720p, 1080p */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1">
                    <Tv className="w-3 h-3 text-white/40" />
                    <span>Resolution</span>
                  </label>
                  <span className="text-[10px] font-mono text-white font-semibold">
                    {params.resolution}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {RESOLUTION_OPTIONS.map((res: VideoResolution) => {
                    const isSelected = params.resolution === res;
                    return (
                      <button
                        key={res}
                        onClick={() => onChangeParams({ resolution: res })}
                        className={`py-1.5 px-2 rounded border text-center text-xs font-mono transition-all cursor-pointer ${
                          isSelected
                            ? 'border-white bg-white text-black font-bold shadow-xs'
                            : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white'
                        }`}
                      >
                        {res}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration Selector: 4-30s */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/40" />
                    <span>Duration (4-30s)</span>
                  </label>
                  <span className="text-[10px] font-mono text-white font-semibold tabular-nums">
                    {params.durationSeconds} seconds
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={4}
                    max={30}
                    step={1}
                    value={params.durationSeconds}
                    onChange={(e) =>
                      onChangeParams({ durationSeconds: Number(e.target.value) })
                    }
                    className="flex-1 accent-white cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-5 gap-1 pt-0.5">
                  {[4, 8, 12, 20, 30].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => onChangeParams({ durationSeconds: sec })}
                      className={`py-1 px-1 rounded border text-center text-[10px] font-mono transition-all cursor-pointer ${
                        params.durationSeconds === sec
                          ? 'border-white bg-white/15 text-white font-semibold'
                          : 'border-white/10 bg-white/[0.01] text-white/40 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Frame Rate Spec: 24fps */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-xs font-mono">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">
                  Frame Rate
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[11px] font-semibold border border-white/10">
                  24fps (Cinema Native)
                </span>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-5 gap-1">
                {ASPECT_RATIO_OPTIONS.map((r) => {
                  const isSelected = params.aspectRatio === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() =>
                        onChangeParams({ aspectRatio: r.id as AspectRatioId })
                      }
                      className={`py-1.5 px-1 rounded border text-center text-[10px] font-mono transition-all cursor-pointer truncate ${
                        isSelected
                          ? 'border-white bg-white/15 text-white font-semibold'
                          : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white'
                      }`}
                      title={r.label}
                    >
                      {r.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connected Prompt Editor: Natural Language vs Slash Mode */}
            <div className="flex flex-col gap-2 p-3 rounded bg-white/[0.02] border border-white/[0.06]">
              {/* Mode Toggle Header */}
              <div className="flex items-center justify-between gap-1 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-black/40 p-0.5 rounded border border-white/10">
                    <button
                      onClick={() => onChangeParams({ promptMode: 'natural' })}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        promptMode === 'natural'
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Natural
                    </button>
                    <button
                      onClick={() => onChangeParams({ promptMode: 'slash' })}
                      className={`px-2 py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        promptMode === 'slash'
                          ? 'bg-white text-black font-semibold'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      Slash Mode
                    </button>
                  </div>

                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-white/[0.04] border-white/10 text-white/60"
                    title={`${charCount.toLocaleString()} characters`}
                  >
                    {wordCount.toLocaleString()} / {MAX_PROMPT_WORDS.toLocaleString()} words
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Prominent Gemini Advanced Prompt conversion button */}
                  {promptMode === 'natural' ? (
                    <button
                      onClick={handleConvertToSlash}
                      disabled={isConvertingToSlash || !params.prompt.trim()}
                      className="px-2 py-1 rounded border border-white/20 bg-white/[0.08] hover:bg-white text-white hover:text-black transition-all text-[10px] font-mono font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40 shadow-xs"
                      title="Convert natural prompt to structured slash directives with Gemini"
                    >
                      <Wand2 className="w-3 h-3 text-white/90" />
                      <span>{isConvertingToSlash ? 'Analyzing...' : 'Advanced Prompt ✨'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleRebuildNatural}
                      disabled={isRebuildingNatural}
                      className="px-2 py-1 rounded border border-white/20 bg-white/[0.08] hover:bg-white text-white hover:text-black transition-all text-[10px] font-mono font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title="Reconstruct natural language from slash segments"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{isRebuildingNatural ? 'Rebuilding...' : 'Rebuild Natural'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(params.prompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    disabled={!params.prompt}
                    className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer disabled:opacity-20"
                    title="Copy prompt"
                  >
                    {copiedPrompt ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    onClick={() => setIsExpandedPrompt(true)}
                    className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title="Expand 50k-word editor"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Mode A: Natural Language Multiline Editor */}
              {promptMode === 'natural' ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    rows={4}
                    value={params.prompt}
                    onChange={(e) => onChangeParams({ prompt: e.target.value })}
                    placeholder="Enter natural-language video prompt (supports up to 50,000 words screenplay / treatment)..."
                    className="w-full bg-[#0C0C12] border border-white/10 focus:border-white/40 rounded p-2.5 text-xs font-mono text-white placeholder-white/25 focus:outline-none transition-colors resize-none leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Source of truth for generative video direction</span>
                    {params.prompt.length > 0 && (
                      <button
                        onClick={() => onChangeParams({ prompt: '' })}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Mode B: Advanced Slash Mode Builder */
                <div className="flex flex-col gap-2">
                  {/* Canonical Slash Representation Preview */}
                  <div className="p-2 rounded bg-black/50 border border-white/10 text-[11px] font-mono text-white/80 flex items-center justify-between gap-2 overflow-hidden">
                    <span className="truncate text-white/70">
                      {serializeSlashPrompt(params.slashSegments || []) ||
                        'No slash segments yet. Click "+ Add Segment" or "Advanced Prompt ✨".'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          serializeSlashPrompt(params.slashSegments || [])
                        );
                        setCopiedSlash(true);
                        setTimeout(() => setCopiedSlash(false), 2000);
                      }}
                      className="shrink-0 p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                      title="Copy slash string"
                    >
                      {copiedSlash ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {/* Interactive Segment Cards */}
                  <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
                    {(params.slashSegments || []).map((seg, idx) => (
                      <div
                        key={seg.id}
                        className="p-2 rounded bg-[#0C0C12] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-1 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-[9px] text-white/40 font-mono">
                              #{idx + 1}
                            </span>
                            <select
                              value={seg.category}
                              onChange={(e) =>
                                handleUpdateSlashSegment(seg.id, 'category', e.target.value)
                              }
                              className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] font-mono text-white/90 outline-none cursor-pointer"
                            >
                              {COMMON_SLASH_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleMoveSlashSegment(idx, 'up')}
                              disabled={idx === 0}
                              className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleMoveSlashSegment(idx, 'down')}
                              disabled={idx === (params.slashSegments?.length || 0) - 1}
                              className="p-0.5 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleRemoveSlashSegment(seg.id)}
                              className="p-0.5 text-red-400/60 hover:text-red-400 cursor-pointer"
                              title="Delete segment"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          value={seg.value}
                          onChange={(e) =>
                            handleUpdateSlashSegment(seg.id, 'value', e.target.value)
                          }
                          placeholder="Directive description..."
                          className="w-full bg-transparent border-b border-white/10 focus:border-white/40 pb-0.5 text-xs font-mono text-white placeholder-white/20 outline-none"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Add Segment Button */}
                  <button
                    onClick={handleAddSlashSegment}
                    className="py-1.5 px-2 border border-dashed border-white/15 hover:border-white/30 rounded text-center text-[10px] font-mono text-white/60 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Slash Directive</span>
                  </button>
                </div>
              )}
            </div>

            {/* Reference Matrix (Up to 30 Reference Images) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-white/40" />
                    <span>Reference Matrix</span>
                  </label>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-white/[0.04] border-white/10 text-white/70">
                    {referenceCount} / {MAX_REFERENCE_IMAGES} Images
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {referenceCount < MAX_REFERENCE_IMAGES && (
                    <button
                      onClick={() => handleLoadSampleBatch(12)}
                      className="text-[9px] font-mono text-white/40 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                      title="Load reference sample set"
                    >
                      +12 Refs
                    </button>
                  )}
                  {referenceCount > 0 && (
                    <button
                      onClick={handleClearAllReferences}
                      className="text-[9px] font-mono text-red-400/60 hover:text-red-400 px-1 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="p-2 bg-[#0C0C12] border border-white/10 rounded flex flex-col gap-2 max-h-48 overflow-y-auto">
                {referenceCount > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {params.referenceImages.map((ref, idx) => (
                      <div
                        key={ref.id}
                        className="relative group aspect-square rounded overflow-hidden border border-white/10 hover:border-white/30 bg-black/40 flex flex-col justify-between"
                      >
                        <img
                          src={ref.url}
                          alt={ref.name || `Ref ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer"
                          onClick={() => setPreviewingRefImage(ref)}
                        />

                        <span className="absolute top-1 left-1 text-[8px] font-mono px-1 rounded bg-black/70 text-white/80 pointer-events-none">
                          #{idx + 1}
                        </span>

                        <button
                          onClick={() => handleRemoveReference(ref.id)}
                          className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white/60 hover:text-white hover:bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Remove"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>

                        <div className="absolute bottom-0 inset-x-0 bg-black/80 px-1 py-0.5 flex items-center justify-between text-[8px] font-mono text-white/70">
                          <select
                            value={ref.role}
                            onChange={(e) =>
                              handleUpdateRefRole(ref.id, e.target.value as ReferenceRole)
                            }
                            className="bg-transparent text-[8px] text-white/80 border-none outline-none cursor-pointer uppercase tracking-tight"
                          >
                            {REFERENCE_ROLES.map((r) => (
                              <option key={r.id} value={r.id} className="bg-[#0C0C12] text-white">
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}

                    {referenceCount < MAX_REFERENCE_IMAGES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square border border-dashed border-white/15 hover:border-white/40 rounded flex flex-col items-center justify-center gap-1 text-white/40 hover:text-white transition-all cursor-pointer bg-white/[0.01] hover:bg-white/[0.04]"
                        title="Upload more references"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[8px] font-mono">Add</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2.5 px-3 border border-dashed border-white/15 hover:border-white/30 rounded flex items-center justify-center gap-2 text-white/50 hover:text-white text-xs font-mono transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Reference Images (Up to 30)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: TEMPORAL SEQUENCE STUDIO (Seedance 2.5 Timeline & Timestamps)
            ========================================================================= */}
        {workspaceTab === 'sequences' && (
          <div className="flex flex-col gap-3">
            {/* Visual Timeline Bar */}
            <div className="p-3 rounded bg-white/[0.02] border border-white/[0.06] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Timeline Map (0.0s – {params.durationSeconds}.0s @ 24fps)
                </span>
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  {timelineValidation.isValid ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Valid</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>{timelineValidation.errors[0] || 'Timeline notice'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Graphical Timeline Bar */}
              <div className="relative h-6 bg-black/60 rounded border border-white/10 flex overflow-hidden">
                {(params.sequences || []).map((seq, idx) => {
                  const total = params.durationSeconds || 8;
                  const startPct = Math.max(0, Math.min(100, (seq.startSeconds / total) * 100));
                  const endPct = Math.max(0, Math.min(100, (seq.endSeconds / total) * 100));
                  const widthPct = Math.max(2, endPct - startPct);

                  const colors = [
                    'bg-white/20 border-white/40',
                    'bg-white/30 border-white/50',
                    'bg-white/15 border-white/30',
                    'bg-white/25 border-white/45',
                  ];

                  return (
                    <div
                      key={seq.id}
                      style={{
                        position: 'absolute',
                        left: `${startPct}%`,
                        width: `${widthPct}%`,
                        height: '100%',
                      }}
                      className={`border-r flex items-center justify-center text-[9px] font-mono text-white/90 truncate px-1 ${
                        colors[idx % colors.length]
                      }`}
                      title={`Scene ${idx + 1}: ${seq.startSeconds}s - ${seq.endSeconds}s`}
                    >
                      S{idx + 1}
                    </div>
                  );
                })}
              </div>

              {/* Quick Split Buttons */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <span className="text-[9px] font-mono text-white/40">Presets:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAutoSplit(2)}
                    className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] text-[9px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    2 Scenes
                  </button>
                  <button
                    onClick={() => handleAutoSplit(3)}
                    className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] text-[9px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    3 Scenes
                  </button>
                  <button
                    onClick={() => handleAutoSplit(4)}
                    className="px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] text-[9px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    4 Scenes
                  </button>
                </div>
              </div>
            </div>

            {/* List of Sequence Cards */}
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {(params.sequences || []).map((seq, idx) => (
                <div
                  key={seq.id}
                  className="p-2.5 rounded bg-[#0C0C12] border border-white/10 hover:border-white/20 transition-all flex flex-col gap-2 text-xs font-mono"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-[11px]">
                        Scene {idx + 1}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-white/80 border border-white/10">
                        [{formatTimestamp(seq.startSeconds)} - {formatTimestamp(seq.endSeconds)}]
                      </span>
                    </div>

                    <button
                      onClick={() => handleRemoveSequence(seq.id)}
                      className="p-1 text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove scene"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Start and End inputs */}
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded border border-white/10">
                      <span className="text-white/40">Start:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={params.durationSeconds}
                        value={seq.startSeconds}
                        onChange={(e) =>
                          handleUpdateSequence(seq.id, {
                            startSeconds: Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-12 bg-transparent text-white font-mono outline-none"
                      />
                      <span className="text-white/40">s</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded border border-white/10">
                      <span className="text-white/40">End:</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={params.durationSeconds}
                        value={seq.endSeconds}
                        onChange={(e) =>
                          handleUpdateSequence(seq.id, {
                            endSeconds: Math.min(
                              params.durationSeconds || 30,
                              Number(e.target.value)
                            ),
                          })
                        }
                        className="w-12 bg-transparent text-white font-mono outline-none"
                      />
                      <span className="text-white/40">s</span>
                    </div>
                  </div>

                  {/* Scene Description */}
                  <textarea
                    rows={2}
                    value={seq.description}
                    onChange={(e) =>
                      handleUpdateSequence(seq.id, { description: e.target.value })
                    }
                    placeholder="Scene visual action and subject kinetics..."
                    className="w-full bg-black/40 border border-white/10 focus:border-white/40 rounded p-1.5 text-[11px] font-mono text-white placeholder-white/20 outline-none resize-none"
                  />

                  {/* Camera & Lighting Directives */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
                    <input
                      type="text"
                      value={seq.camera || ''}
                      onChange={(e) =>
                        handleUpdateSequence(seq.id, { camera: e.target.value })
                      }
                      placeholder="Camera: Tracking push, orbit, low angle..."
                      className="bg-black/30 border border-white/10 rounded px-1.5 py-1 text-white placeholder-white/25 outline-none font-mono"
                    />

                    <input
                      type="text"
                      value={seq.lighting || ''}
                      onChange={(e) =>
                        handleUpdateSequence(seq.id, { lighting: e.target.value })
                      }
                      placeholder="Lighting: Volumetric dawn, rim light..."
                      className="bg-black/30 border border-white/10 rounded px-1.5 py-1 text-white placeholder-white/25 outline-none font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Scene Button */}
            <button
              onClick={handleAddSequence}
              className="py-2 px-3 border border-dashed border-white/20 hover:border-white/40 rounded text-center text-xs font-mono text-white hover:bg-white/[0.04] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scene Sequence</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            TAB 3: COMPILED PROMPT & BYTEPLUS SEEDANCE 2.5 PAYLOAD
            ========================================================================= */}
        {workspaceTab === 'payload' && (
          <div className="flex flex-col gap-3">
            {/* Sub-tabs: Compiled Prompt | Seedance 2.5 JSON */}
            <div className="flex bg-black/50 p-0.5 rounded border border-white/10">
              <button
                onClick={() => setPayloadSubTab('compiled')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  payloadSubTab === 'compiled'
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Compiled Prompt
              </button>
              <button
                onClick={() => setPayloadSubTab('json')}
                className={`flex-1 py-1 px-2 rounded text-[11px] font-mono transition-all cursor-pointer ${
                  payloadSubTab === 'json'
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Seedance 2.5 JSON
              </button>
            </div>

            {payloadSubTab === 'compiled' ? (
              /* View A: Compiled Chronological Prompt with Timestamps */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    Chronological Directives with Timestamps
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleOptimizePrompt}
                      disabled={isOptimizingPrompt}
                      className="px-2 py-0.5 rounded border border-white/20 bg-white/[0.08] hover:bg-white text-white hover:text-black transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title="Optimize prompt with Gemini specifically for BytePlus Seedance 2.5"
                    >
                      <Sparkles className="w-3 h-3 text-white/90" />
                      <span>{isOptimizingPrompt ? 'Optimizing...' : 'Optimize (Gemini)'}</span>
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(compiledPromptText);
                        setCopiedCompiled(true);
                        setTimeout(() => setCopiedCompiled(false), 2000);
                      }}
                      className="p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
                      title="Copy compiled prompt"
                    >
                      {copiedCompiled ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded bg-[#0C0C12] border border-white/10 font-mono text-xs text-white/90 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {compiledPromptText}
                </div>
              </div>
            ) : (
              /* View B: BytePlus Seedance 2.5 Structured JSON Payload */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                    BytePlus Seedance 2.5 API Payload
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          JSON.stringify(seedancePayload, null, 2)
                        );
                        setCopiedJson(true);
                        setTimeout(() => setCopiedJson(false), 2000);
                      }}
                      className="px-2 py-0.5 rounded border border-white/15 text-[10px] font-mono text-white/70 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {copiedJson ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleSubmitToSeedanceApi}
                      disabled={isSubmittingToApi}
                      className="px-2 py-0.5 rounded border border-white/20 bg-white/[0.08] hover:bg-white text-white hover:text-black transition-all text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      <Send className="w-3 h-3" />
                      <span>{isSubmittingToApi ? 'Testing...' : 'Test API'}</span>
                    </button>
                  </div>
                </div>

                <pre className="p-2.5 rounded bg-[#050508] border border-white/10 font-mono text-[10px] text-white/80 overflow-x-auto max-h-72 overflow-y-auto select-text leading-tight">
                  {JSON.stringify(seedancePayload, null, 2)}
                </pre>

                {/* Submission API Result Callout */}
                {submissionStatus && (
                  <div className="p-2.5 rounded bg-white/[0.04] border border-white/15 text-[11px] font-mono flex flex-col gap-1 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {submissionStatus.provider || 'BytePlus Seedance 2.5'}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                          submissionStatus.status === 'READY'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {submissionStatus.status}
                      </span>
                    </div>
                    <p className="text-white/70 text-[10px] leading-relaxed">
                      {submissionStatus.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Generate Button (Unified and Connected to Workspace State) */}
      <div className="pt-3 border-t border-white/[0.08] mt-3">
        {isGenerating ? (
          <div className="flex flex-col gap-1.5 p-3 bg-white/[0.04] border border-white/20 rounded">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="flex items-center gap-1.5 text-white">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>seedance 2.5 ref-video...</span>
              </span>
              <span className="text-white/80 tabular-nums">{generationProgress}%</span>
            </div>

            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>

            <span className="text-[10px] font-mono text-white/50 truncate">
              {generationStage || 'Synthesizing 24fps sequence...'}
            </span>
          </div>
        ) : (
          <button
            onClick={onGenerate}
            disabled={!params.prompt.trim()}
            className="w-full py-2.5 px-4 rounded bg-white text-black font-semibold text-xs font-mono hover:bg-neutral-200 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>Generate Video (24fps @ {params.resolution})</span>
          </button>
        )}
      </div>

      {/* Expanded 50,000-Word Prompt Focus Modal */}
      {isExpandedPrompt && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4 sm:p-8">
          <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col bg-[#0A0A0F] border border-white/15 rounded-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold text-white">
                  Seedance 2.5 Treatment & Script Editor
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-white/70">
                  {wordCount.toLocaleString()} / {MAX_PROMPT_WORDS.toLocaleString()} words
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExpandedPrompt(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 flex flex-col">
              <textarea
                value={params.prompt}
                onChange={(e) => onChangeParams({ prompt: e.target.value })}
                placeholder="Write exhaustive cinematic treatment, scene progression, camera instructions, character gestures, lighting dynamics, and atmosphere up to 50,000 words..."
                className="w-full h-full bg-transparent border-none text-sm font-mono text-white placeholder-white/20 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between">
              <span className="text-xs font-mono text-white/50">
                {charCount.toLocaleString()} characters
              </span>
              <button
                onClick={() => setIsExpandedPrompt(false)}
                className="px-4 py-1.5 rounded bg-white text-black font-semibold text-xs font-mono hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Image Preview Modal */}
      {previewingRefImage && (
        <div
          onClick={() => setPreviewingRefImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#0E0E14] border border-white/20 rounded overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-white truncate">
                {previewingRefImage.name || 'Reference Image'}
              </span>
              <button
                onClick={() => setPreviewingRefImage(null)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewingRefImage.url}
              alt="Preview"
              className="w-full max-h-[60vh] object-contain bg-black"
            />
            <div className="p-3 flex items-center justify-between text-xs font-mono text-white/70 bg-black/40">
              <span className="uppercase">Role: {previewingRefImage.role}</span>
              <span>Weight: {previewingRefImage.weight || 0.8}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
