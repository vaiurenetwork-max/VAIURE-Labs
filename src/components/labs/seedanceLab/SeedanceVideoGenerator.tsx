/**
 * VAIURE — SEEDANCE LAB VIDEO GENERATOR
 * Monochromatic Two-Column Desktop Layout (Responsive Mobile Stack)
 * Strict Black & White Glassmorphism Only.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Camera,
  Upload,
  X,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Maximize2,
  Sliders,
  Volume2,
  VolumeX,
  Info,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  SEEDANCE_MODELS,
  SeedanceModelKey,
  seedanceLabService,
  SeedanceAccountBalance,
  PosBotHistoryItem,
} from '../../../services/seedanceLabService';

interface SeedanceVideoGeneratorProps {
  initialModel?: SeedanceModelKey;
  initialPrompt?: string;
  initialAspect?: string;
  initialImages?: string[];
  balance: SeedanceAccountBalance | null;
  onGenerationComplete?: (item: PosBotHistoryItem) => void;
  onRefreshBalance?: () => void;
}

const CINEMATIC_PROMPT_PRESETS = [
  {
    title: 'Volcanic Basalt Tracking Shot',
    prompt:
      'Cinematic 24fps tracking forward shot through a cavernous volcanic basalt sanctuary. A single daylight beam slices across polished dark stone floor as obsidian silk cape billows in velvet slow motion.',
  },
  {
    title: 'Neo-Editorial Portrait Arc',
    prompt:
      'High-fashion editorial medium close-up, 35mm spherical lens. Slow orbit around model with architectural bone structure, specular highlight on jawline, muted monochrome palette, natural wind.',
  },
  {
    title: 'Brutalist Concrete FPV Flow',
    prompt:
      'Smooth FPV drone glide descending into a brutalist architectural atrium at twilight. Diffused overcast sky, minimal reflections on wet concrete, subtle cinematic motion blur.',
  },
];

export const SeedanceVideoGenerator: React.FC<SeedanceVideoGeneratorProps> = ({
  initialModel = 'seedance_25_15s',
  initialPrompt = '',
  initialAspect = '16:9',
  initialImages = [],
  balance,
  onGenerationComplete,
  onRefreshBalance,
}) => {
  // Model state
  const [selectedModel, setSelectedModel] = useState<SeedanceModelKey>(initialModel);

  // Prompt state
  const [prompt, setPrompt] = useState(initialPrompt);
  const maxPromptChars = 8000;

  // Reference images state (max 9)
  const [referenceImages, setReferenceImages] = useState<string[]>(initialImages);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generation settings
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspect);
  const [resolution, setResolution] = useState<'480P' | '720P' | '1080P'>('720P');
  const [videoFormat, setVideoFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);

  // Execution states
  type ExecutionState = 'ready' | 'preparing' | 'submitting' | 'processing' | 'completed' | 'failed';
  const [execState, setExecState] = useState<ExecutionState>('ready');
  const [currentJobCode, setCurrentJobCode] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastJobData, setLastJobData] = useState<any>(null);

  // Video player controls
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Keep duration synchronized with model
  const activeModelMeta = SEEDANCE_MODELS[selectedModel];
  const durationOption = activeModelMeta.durationSeconds;

  // Update model if external initialModel changes
  useEffect(() => {
    if (initialModel) setSelectedModel(initialModel);
  }, [initialModel]);

  // Update prompt if external initialPrompt changes
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  // Polling loop effect
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let timerInterval: NodeJS.Timeout | null = null;

    if (execState === 'processing' && currentJobCode) {
      timerInterval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      pollInterval = setInterval(async () => {
        try {
          const statusResult = await seedanceLabService.pollJobStatus(currentJobCode);

          if (statusResult.status === 'completed' && statusResult.resultUrl) {
            setExecState('completed');
            setProgress(100);
            setGeneratedVideoUrl(statusResult.resultUrl);
            if (pollInterval) clearInterval(pollInterval);
            if (timerInterval) clearInterval(timerInterval);

            if (onRefreshBalance) onRefreshBalance();
            if (onGenerationComplete) {
              onGenerationComplete({
                id: `job-${currentJobCode}`,
                job_code: currentJobCode,
                model: selectedModel,
                model_name: activeModelMeta.name,
                category: 'Video',
                prompt,
                parameters: {
                  model: selectedModel,
                  aspect_ratio: aspectRatio,
                  resolution,
                  sound_enabled: soundEnabled,
                },
                status: 'completed',
                cost_generate: activeModelMeta.costGenerate,
                result_url: statusResult.resultUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          } else if (statusResult.status === 'failed') {
            setExecState('failed');
            setErrorMessage(statusResult.error || 'Upstream generation error.');
            if (pollInterval) clearInterval(pollInterval);
            if (timerInterval) clearInterval(timerInterval);
          } else {
            setProgress(statusResult.progress || 45);
          }
        } catch (err: unknown) {
          console.warn('Polling check error:', err);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [execState, currentJobCode, prompt, selectedModel, aspectRatio, resolution, soundEnabled]);

  // Handle local image file upload & host on server
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    setErrorMessage(null);

    const availableSlots = 9 - referenceImages.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const dataUrl = await base64Promise;

        // Upload to server to get public HTTPS URL
        const hostedUrl = await seedanceLabService.uploadMedia(dataUrl, file.name);
        setReferenceImages((prev) => (prev.length < 9 ? [...prev, hostedUrl] : prev));
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Failed to upload reference image.'
        );
      }
    }

    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Remove single image
  const removeImage = (index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Clear all images
  const clearAllImages = () => {
    setReferenceImages([]);
  };

  // Validate before submission
  const validateForm = (): string | null => {
    if (!prompt.trim()) {
      return 'Please enter a description for your cinematic scene.';
    }
    if (prompt.length > maxPromptChars) {
      return `Prompt exceeds the 8,000 character limit (${prompt.length} / 8000).`;
    }
    if (activeModelMeta.isR2V && referenceImages.length === 0) {
      return `Model "${activeModelMeta.label}" is a Reference-to-Video engine. Please upload at least 1 reference image.`;
    }
    return null;
  };

  // Submit Generation Request
  const handleGenerate = async () => {
    const error = validateForm();
    if (error) {
      setErrorMessage(error);
      return;
    }

    setErrorMessage(null);
    setExecState('preparing');
    setProgress(10);
    setElapsedSeconds(0);

    try {
      setExecState('submitting');
      setProgress(25);

      const resolvedAspect = aspectRatio === 'Smart' ? '16:9' : aspectRatio;

      const submission = await seedanceLabService.submitGeneration({
        model: selectedModel,
        prompt: prompt.trim(),
        aspect_ratio: resolvedAspect,
        reference_image_urls: referenceImages,
        sound_enabled: soundEnabled,
        resolution,
        video_format: videoFormat,
        quantity,
      });

      setCurrentJobCode(submission.jobCode);
      setLastJobData({
        jobCode: submission.jobCode,
        model: selectedModel,
        prompt: prompt.trim(),
        aspectRatio: resolvedAspect,
        resolution,
        duration: durationOption,
        costGenerate: submission.costGenerate,
      });

      // If already has immediate result (e.g., local synthesised video or rapid return)
      if (submission.immediateResultUrl) {
        setExecState('completed');
        setProgress(100);
        setGeneratedVideoUrl(submission.immediateResultUrl);
        if (onRefreshBalance) onRefreshBalance();
      } else {
        setExecState('processing');
        setProgress(35);
      }
    } catch (err: unknown) {
      setExecState('failed');
      setErrorMessage(
        err instanceof Error ? err.message : 'Generation request failed. Please check connection.'
      );
    }
  };

  // Copy prompt to clipboard
  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const estimatedCostIdr = activeModelMeta.rateIdr * quantity;
  const estimatedGenUnits = activeModelMeta.costGenerate * quantity;

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-3 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1720px] mx-auto space-y-6 pb-20">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-white/20 bg-white/[0.05] backdrop-blur-md flex items-start justify-between gap-3 text-xs text-white/90 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Validation Notice: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-white/50 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 2-Column Responsive Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ============================================================== */}
          {/* LEFT PANEL: Inputs, Models, References, Settings (7 cols)       */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: Model Selector */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    01. Model Architecture
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-white/50">
                  BYTEPLUS SEEDANCE 2.5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(
                  [
                    'seedance_25_15s',
                    'seedance_25_30s',
                    'seedance_25_15s_r2v',
                    'seedance_25_30s_r2v',
                  ] as SeedanceModelKey[]
                ).map((key) => {
                  const m = SEEDANCE_MODELS[key];
                  const isSelected = selectedModel === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedModel(key);
                        setErrorMessage(null);
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-white bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.18)]'
                          : 'border-white/[0.1] bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold tracking-tight">
                          {m.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            isSelected
                              ? 'bg-black text-white font-bold'
                              : 'bg-white/[0.08] text-white/70'
                          }`}
                        >
                          {m.durationSeconds}s
                        </span>
                      </div>

                      <div
                        className={`text-[11px] font-mono flex items-center justify-between ${
                          isSelected ? 'text-black/70' : 'text-white/50'
                        }`}
                      >
                        <span>{m.isR2V ? 'Ref-to-Video' : 'Text-to-Video'}</span>
                        <span className="tabular-nums font-semibold">
                          Rp {m.rateIdr.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: Prompt Editor */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    02. Cinematic Scene Prompt
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {prompt && (
                    <button
                      onClick={() => setPrompt('')}
                      className="text-[11px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <span
                    className={`text-[11px] font-mono tabular-nums ${
                      prompt.length > maxPromptChars ? 'text-white font-bold underline' : 'text-white/60'
                    }`}
                  >
                    {prompt.length.toLocaleString()} / {maxPromptChars.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  placeholder="Describe your cinematic scene, character actions, camera movements, environment, lighting, and dialogue..."
                  className="w-full p-4 rounded-xl border border-white/[0.12] bg-black/60 text-white placeholder-white/35 text-xs sm:text-sm font-sans focus:outline-none focus:border-white transition-all resize-y leading-relaxed"
                />
              </div>

              {/* Preset inspirations */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                  Cinematic Seed Prompts:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {CINEMATIC_PROMPT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(preset.prompt)}
                      className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.08] hover:border-white/20 text-[11px] text-white/70 hover:text-white transition-all text-left cursor-pointer"
                    >
                      {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 3: Reference Image Management (Up to 9 images) */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    03. Reference Image Management
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {referenceImages.length > 0 && (
                    <button
                      onClick={clearAllImages}
                      className="text-[11px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-[11px] font-mono text-white/60">
                    {referenceImages.length} / 9 Photos
                  </span>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileUpload(e.dataTransfer.files);
                }}
                className="rounded-xl border border-dashed border-white/[0.2] hover:border-white/50 bg-black/40 hover:bg-white/[0.03] p-6 text-center transition-all cursor-pointer space-y-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <Upload className="w-6 h-6 text-white/50 group-hover:text-white mx-auto transition-colors" />
                <div className="text-xs font-medium text-white/80">
                  {isUploadingImage
                    ? 'Uploading and hosting image on server...'
                    : 'Drop reference images here or click to browse'}
                </div>
                <p className="text-[11px] text-white/40">
                  Supports up to 9 PNG, JPG, or WEBP photos for multi-angle character, wardrobe & environment lock.
                </p>
              </div>

              {/* Image Thumbnails Grid */}
              {referenceImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 pt-1">
                  {referenceImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-square rounded-lg border border-white/[0.15] bg-neutral-900 overflow-hidden group"
                    >
                      <img
                        src={imgUrl}
                        alt={`Ref ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setPreviewImageModal(imgUrl)}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(idx);
                        }}
                        className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded bg-black/75 text-[8px] font-mono text-white/70">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 4: Generation Settings Panel (BytePlus Ark Inspired) */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    04. Generation Parameters
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-white/50">BYTEPLUS ARK SPEC</span>
              </div>

              {/* Parameter A: Aspect Ratio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-white/80">Aspect Ratio</span>
                  <span className="font-mono text-white/50">{aspectRatio}</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[
                    { ratio: '21:9', label: 'Cinematic' },
                    { ratio: '16:9', label: 'Landscape' },
                    { ratio: '4:3', label: 'Classic' },
                    { ratio: '1:1', label: 'Square' },
                    { ratio: '3:4', label: 'Portrait' },
                    { ratio: '9:16', label: 'Vertical' },
                    { ratio: 'Smart', label: 'Auto' },
                  ].map((opt) => (
                    <button
                      key={opt.ratio}
                      type="button"
                      onClick={() => setAspectRatio(opt.ratio)}
                      className={`p-2 rounded-lg border text-center transition-all cursor-pointer ${
                        aspectRatio === opt.ratio
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-mono">{opt.ratio}</div>
                      <div className="text-[9px] opacity-75 truncate">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Parameter B: Resolution & Duration & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Resolution */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['480P', '720P', '1080P'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setResolution(r)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                          resolution === r
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-white/40 block">
                    720P Native Master
                  </span>
                </div>

                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Duration
                  </label>
                  <div className="p-2 rounded-lg border border-white/[0.1] bg-white/[0.03] text-[11px] font-mono flex items-center justify-between">
                    <span className="text-white font-semibold">{durationOption} Seconds</span>
                    <span className="text-white/40 text-[10px]">Model Fixed</span>
                  </div>
                  <span className="text-[9px] text-white/40 block">
                    Switch model above for 30s
                  </span>
                </div>

                {/* Video Format */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Video Format
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    {(['MP4', 'MOV'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setVideoFormat(f)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                          videoFormat === f
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <span className="text-[9px] text-white/40 block">
                    Native MP4 container
                  </span>
                </div>
              </div>

              {/* Parameter C: Sound & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/[0.06]">
                {/* Audio Output */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-white/70 block">
                    Output Sound
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(true)}
                      className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-mono transition-all cursor-pointer ${
                        soundEnabled
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Sound ON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(false)}
                      className={`p-2 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-mono transition-all cursor-pointer ${
                        !soundEnabled
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                      }`}
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>Sound OFF</span>
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-white/70">
                      Generation Quantity
                    </label>
                    <span className="text-[11px] font-mono text-white/50">{quantity}x Batch</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuantity(q)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                          quantity === q
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cost Summary & Primary Action Button */}
              <div className="pt-2 space-y-3">
                <div className="p-3 rounded-xl border border-white/[0.1] bg-black/60 flex items-center justify-between text-xs font-mono">
                  <span className="text-white/60">Estimated Cost:</span>
                  <div className="text-right">
                    <span className="font-semibold text-white tabular-nums">
                      {estimatedGenUnits} Generate Units
                    </span>
                    <span className="text-white/40 block text-[10px]">
                      Rp {estimatedCostIdr.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={execState === 'preparing' || execState === 'submitting' || execState === 'processing'}
                  onClick={handleGenerate}
                  className={`w-full py-4 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(255,255,255,0.25)] cursor-pointer active:scale-[0.99] ${
                    execState === 'processing' || execState === 'submitting' || execState === 'preparing'
                      ? 'bg-white/40 text-black cursor-not-allowed'
                      : 'bg-white text-black hover:bg-white/90'
                  }`}
                >
                  {execState === 'preparing' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Preparing Media...</span>
                    </>
                  )}
                  {execState === 'submitting' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Submitting to PosBot v1...</span>
                    </>
                  )}
                  {execState === 'processing' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>Generating Video ({elapsedSeconds}s · {progress}%)</span>
                    </>
                  )}
                  {(execState === 'ready' || execState === 'completed' || execState === 'failed') && (
                    <>
                      <Film className="w-4 h-4 fill-black" />
                      <span>GENERATE VIDEO</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* RIGHT PANEL: Live Monitor, Video Player & Results (5 cols)     */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] sticky top-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    Generation Monitor
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      execState === 'processing'
                        ? 'bg-white animate-ping'
                        : execState === 'completed'
                        ? 'bg-white'
                        : 'bg-white/30'
                    }`}
                  />
                  <span className="uppercase text-white/70">
                    {execState === 'processing' ? 'PROCESSING' : execState}
                  </span>
                </div>
              </div>

              {/* Video Player Display Container */}
              <div className="w-full aspect-video rounded-xl border border-white/[0.15] bg-neutral-950 overflow-hidden relative flex items-center justify-center group">
                {/* Active Generated Video or Completed Job */}
                {generatedVideoUrl ? (
                  <video
                    ref={videoRef}
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain bg-black"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                ) : execState === 'processing' ? (
                  /* Live Generation Processing State */
                  <div className="p-6 text-center space-y-4 max-w-sm">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <Film className="w-6 h-6 text-white absolute inset-0 m-auto" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white tracking-tight">
                        Rendering Seedance 2.5 Sequence
                      </div>
                      <p className="text-xs text-white/50 font-mono">
                        Job: {currentJobCode || 'JOB-ACTIVE'}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                        <span>Elapsed: {elapsedSeconds}s</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Idle / Sample Player */
                  <div className="relative w-full h-full">
                    <video
                      src="/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-5 space-y-1">
                      <span className="text-[10px] font-mono text-white/60 tracking-wider uppercase">
                        SEEDANCE 2.5 SAMPLE SHOWCASE
                      </span>
                      <div className="text-xs font-semibold text-white">
                        720p 15s Cinematic Fluid Dynamics
                      </div>
                      <p className="text-[11px] text-white/50 line-clamp-1">
                        High-precision fabric motion and environmental illumination.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Technical Job Drawer & Actions */}
              {generatedVideoUrl ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.025] space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between text-white/60">
                      <span>Job Code:</span>
                      <span className="text-white font-medium">{currentJobCode}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span>Model:</span>
                      <span className="text-white">{selectedModel}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span>Aspect Ratio:</span>
                      <span className="text-white">{aspectRatio}</span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span>Resolution / Container:</span>
                      <span className="text-white">720P / MP4</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={generatedVideoUrl}
                      download={`seedance_25_${currentJobCode || 'render'}.mp4`}
                      className="py-2.5 px-3 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/90 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>
                    <button
                      onClick={handleCopyPrompt}
                      className="py-2.5 px-3 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs text-white/60 space-y-2 font-sans">
                  <div className="flex items-center gap-2 text-white font-medium font-mono text-[11px]">
                    <Info className="w-3.5 h-3.5 text-white/70" />
                    <span>Seedance 2.5 Engineering Specifications</span>
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc list-inside text-white/50">
                    <li>720p native resolution at fluid cinematic framerate.</li>
                    <li>Up to 9 reference images for character and outfit continuity.</li>
                    <li>Full 8,000-character temporal prompt capacity.</li>
                    <li>Zero watermark on all generated outputs.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full-size Image Preview Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl max-h-[85vh] rounded-2xl border border-white/20 bg-neutral-950 overflow-hidden relative"
          >
            <img
              src={previewImageModal}
              alt="Enlarged Reference"
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
