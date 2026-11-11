/**
 * VAIURE Studio — VAIU (Seedance 2.5 Exclusive Multimodal Prompt Architect)
 * Analyzes up to 9 user reference images + Video Genre + Camera Mode using
 * backend Gemini 4 Argon multimodal reasoning to synthesize a production-ready
 * Seedance 2.5 multi-shot R2V prompt, complete with direct Seedance 2.5 rendering.
 */

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Plus,
  Trash2,
  Camera,
  Film,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Wand2,
  Layers,
  Image as ImageIcon,
  User,
  Clock,
  Sliders,
  Play,
  RefreshCw,
  ShieldCheck,
  Car,
  Eye,
} from 'lucide-react';
import {
  StudioProject,
  AspectRatio,
  GenerationJob,
  StudioAsset,
} from '../../../types/studio';
import { uploadAndOptimizeThreadImage } from '../../../services/forumService';

export interface VaiuReferenceImageItem {
  id: string;
  url: string;
  label: string;
  role:
    | 'Primary Subject / Face'
    | 'Wardrobe / Outfit'
    | 'Environment / Set'
    | 'Vehicle / Prop'
    | 'Style / Lighting';
}

export interface VaiuSeedanceAnalysisResult {
  ok: boolean;
  feature: string;
  targetModel: string;
  engineUsed: string;
  masterPrompt: string;
  negativePrompt: string;
  referenceAnalysis: {
    index: number;
    role: string;
    extractedVisualTraits: string;
    continuityDirective: string;
  }[];
  shotTimeline: {
    timeRange: string;
    shotTitle: string;
    cameraDirective: string;
    actionDescription: string;
    lightingAndColor: string;
    audioAtmosphere: string;
  }[];
  cinematographyProfile: {
    lensAndSensor: string;
    movementStyle: string;
    colorGrade: string;
    pacingStyle: string;
  };
}

export interface VaiuSeedanceTransferPayload {
  prompt: string;
  negativePrompt: string;
  referenceImageUrls: string[];
  duration: 15 | 30;
  aspectRatio: AspectRatio;
}

interface VaiuSeedanceWorkspaceProps {
  project: StudioProject;
  onSendToSeedanceStudio: (payload: VaiuSeedanceTransferPayload) => void;
  onJobComplete?: (
    newJob: GenerationJob,
    updatedShot?: undefined,
    newAsset?: StudioAsset
  ) => void;
  onAddAsset?: (asset: StudioAsset) => void;
}

const VIDEO_GENRE_PRESETS = [
  {
    id: 'Action',
    label: 'Action',
    tagline: 'High-velocity choreography, kinetic impacts & pyrotechnic debris',
  },
  {
    id: 'Comedy',
    label: 'Comedy',
    tagline: 'Crisp comedic timing, expressive reaction beats & whip-pan reveals',
  },
  {
    id: 'Thriller',
    label: 'Thriller',
    tagline: 'High-tension chiaroscuro shadows, psychological suspense & tight framing',
  },
  {
    id: 'Sci-Fi Noir',
    label: 'Sci-Fi Noir',
    tagline: 'Anamorphic neon reflections, rain-slicked cybernetic atmosphere',
  },
  {
    id: 'Horror / Suspense',
    label: 'Horror / Suspense',
    tagline: 'Unsettling negative space, practical flicker & dread-inducing creeping dolly',
  },
  {
    id: 'Drama / Romance',
    label: 'Drama / Romance',
    tagline: 'Intimate shallow depth-of-field, golden hour rim light & emotional nuance',
  },
  {
    id: 'Commercial / Automotive',
    label: 'Commercial / Automotive',
    tagline: 'Precision rolling rig, specular sheet-metal reflections & hero product reveals',
  },
  {
    id: 'Fantasy / Epic',
    label: 'Fantasy / Epic',
    tagline: 'Sweeping orchestral scale, atmospheric god-rays & mythic worldbuilding',
  },
  {
    id: 'Cyberpunk',
    label: 'Cyberpunk',
    tagline: 'Holographic billboards, wet asphalt reflections & kinetic street energy',
  },
  {
    id: 'Music Video',
    label: 'Music Video',
    tagline: 'Stylized performance cuts, dynamic lighting strobes & bold visual rhythm',
  },
];

const CAMERA_MODE_PRESETS = [
  {
    id: 'Cinema Film',
    label: 'Cinema Film',
    spec: 'ARRI Alexa 65 · Panavision C-Series Anamorphic · 24fps 180° Shutter',
  },
  {
    id: 'Handheld Vlog',
    label: 'Handheld Vlog',
    spec: 'Organic operator micro-shake · 24mm f/1.4 wide lens · authentic catch-focus',
  },
  {
    id: 'Documentary',
    label: 'Documentary',
    spec: 'Observational shoulder-rig · Cinema verité zoom · natural available lighting',
  },
  {
    id: 'FPV Drone',
    label: 'FPV Drone',
    spec: 'High-G acrobatic proximity flight · banked horizon turns · hyper-kinetic flow',
  },
  {
    id: 'Steadicam Tracking',
    label: 'Steadicam Tracking',
    spec: 'Fluid 3-axis gimbal long-take · unbroken spatial follow · 35mm Master Prime',
  },
  {
    id: 'IMAX 65mm Epic',
    label: 'IMAX 65mm Epic',
    spec: '15-perf 65mm large format · deep monumental scale · zero distortion',
  },
  {
    id: 'CCTV / Found Footage',
    label: 'CCTV / Found Footage',
    spec: 'High-angle surveillance / bodycam optics · diegetic timestamp & raw sensor grit',
  },
  {
    id: 'Macro / Commercial',
    label: 'Macro / Commercial',
    spec: '100mm Probe Macro lens · Bolt high-speed motion control · razor-thin bokeh',
  },
];

const REFERENCE_ROLES: VaiuReferenceImageItem['role'][] = [
  'Primary Subject / Face',
  'Wardrobe / Outfit',
  'Environment / Set',
  'Vehicle / Prop',
  'Style / Lighting',
];

export const VaiuSeedanceWorkspace: React.FC<VaiuSeedanceWorkspaceProps> = ({
  project,
  onSendToSeedanceStudio,
  onJobComplete,
  onAddAsset,
}) => {
  // Reference Images State (Seedance 2.5 supports up to 9 reference images)
  const [references, setReferences] = useState<VaiuReferenceImageItem[]>(() => {
    const initial: VaiuReferenceImageItem[] = [];
    const firstChar = project.characters[0];
    if (firstChar?.referenceImages?.[0]) {
      initial.push({
        id: 'ref-init-1',
        url: firstChar.referenceImages[0],
        label: firstChar.name || 'Lead Character',
        role: 'Primary Subject / Face',
      });
    }
    const firstShot = project.shots[0];
    if (firstShot?.thumbnailUrl && initial.length < 2) {
      initial.push({
        id: 'ref-init-2',
        url: firstShot.thumbnailUrl,
        label: firstShot.title || 'Scene Environment',
        role: 'Environment / Set',
      });
    }
    return initial;
  });

  const [urlInput, setUrlInput] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Genre & Camera Mode State
  const [selectedGenre, setSelectedGenre] = useState<string>('Action');
  const [customGenre, setCustomGenre] = useState<string>('');
  const [selectedCameraMode, setSelectedCameraMode] = useState<string>('Cinema Film');
  const [customCameraMode, setCustomCameraMode] = useState<string>('');

  // Seedance 2.5 Exclusive Parameters
  const [duration, setDuration] = useState<15 | 30>(15);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio || '16:9');
  const [storyConcept, setStoryConcept] = useState<string>(
    'Protagonist moves through the environment with intense focus, interacting dynamically with the scene before a dramatic camera reveal.'
  );
  const [vehicleLockEnabled, setVehicleLockEnabled] = useState<boolean>(false);
  const [vehicleDrivingSide, setVehicleDrivingSide] = useState<'LHD' | 'RHD'>('LHD');
  const [vehicleModelSpec, setVehicleModelSpec] = useState<string>(
    '2026 Porsche 911 GT3 RS (Ice Grey Metallic, satin black wheels)'
  );

  // Gemini 4 Argon Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [result, setResult] = useState<VaiuSeedanceAnalysisResult | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<string>('');
  const [editableNegativePrompt, setEditableNegativePrompt] = useState<string>(
    'morphing face, inconsistent outfit, deformed hands, extra fingers, blurry textures, watermark, text overlay, jump cut jitter, amateur framing'
  );
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Direct Seedance 2.5 Video Render State inside VAIU
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [renderStatusText, setRenderStatusText] = useState<string>('');
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Handle Multi-File Upload
  const handleFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList.item(i);
      if (f) files.push(f);
    }

    setIsUploadingFile(true);
    try {
      for (const file of files) {
        if (references.length >= 9) break;
        // Read data URL first for immediate display & inlineData Gemini inspection
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read image file'));
          reader.readAsDataURL(file);
        });

        let finalUrl = dataUrl;
        try {
          const optimized = await uploadAndOptimizeThreadImage(
            file,
            'studio_director',
            `studio_${project.id}`
          );
          if (optimized?.url) {
            finalUrl = optimized.url;
          }
        } catch {
          // Keep dataUrl if upload optimization fails
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 28) || 'Reference Image';
        setReferences((prev) => {
          if (prev.length >= 9) return prev;
          const nextRole: VaiuReferenceImageItem['role'] =
            prev.length === 0
              ? 'Primary Subject / Face'
              : prev.length === 1
              ? 'Wardrobe / Outfit'
              : prev.length === 2
              ? 'Environment / Set'
              : 'Style / Lighting';
          return [
            ...prev,
            {
              id: `vaiu-ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              url: finalUrl,
              label: cleanName,
              role: nextRole,
            },
          ];
        });
      }
    } finally {
      setIsUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleAddUrlReference = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || references.length >= 9) return;
    setReferences((prev) => [
      ...prev,
      {
        id: `vaiu-ref-${Date.now()}`,
        url: trimmed,
        label: `Reference #${prev.length + 1}`,
        role: prev.length === 0 ? 'Primary Subject / Face' : 'Environment / Set',
      },
    ]);
    setUrlInput('');
  };

  const handleRemoveReference = (id: string) => {
    setReferences((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateReference = (
    id: string,
    patch: Partial<Pick<VaiuReferenceImageItem, 'label' | 'role'>>
  ) => {
    setReferences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  // Trigger Gemini 4 Argon VAIU Seedance 2.5 Prompt Synthesis
  const handleGenerateVaiuPrompt = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisStep('Inspecting multi-reference image anchors with Gemini 4 Argon...');

    const stepTimer1 = setTimeout(() => {
      setAnalysisStep(
        `Mapping ${customGenre.trim() || selectedGenre} pacing & ${
          customCameraMode.trim() || selectedCameraMode
        } optical rig...`
      );
    }, 1100);

    const stepTimer2 = setTimeout(() => {
      setAnalysisStep(
        `Compiling Seedance 2.5 (${duration}s R2V) chronological multi-shot prompt...`
      );
    }, 2300);

    try {
      const response = await fetch('/api/prompt/vaiu-seedance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceImages: references.map((r) => ({
            url: r.url,
            label: r.label,
            role: r.role,
          })),
          videoGenre: selectedGenre,
          customGenre: customGenre.trim() || undefined,
          cameraMode: selectedCameraMode,
          customCameraMode: customCameraMode.trim() || undefined,
          storyConcept: storyConcept.trim(),
          duration,
          aspectRatio,
          vehicleLock: vehicleLockEnabled
            ? {
                enabled: true,
                drivingSide: vehicleDrivingSide,
                modelSpec: vehicleModelSpec,
              }
            : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'VAIU Gemini 4 Argon analysis failed');
      }

      setResult(data);
      setEditablePrompt(data.masterPrompt || '');
      if (data.negativePrompt) {
        setEditableNegativePrompt(data.negativePrompt);
      }
    } catch (err: any) {
      setAnalysisError(err?.message || 'Failed to synthesize VAIU Seedance 2.5 prompt.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      setAnalysisStep('');
    }
  };

  // Copy Master Prompt
  const handleCopyPrompt = () => {
    if (!editablePrompt.trim()) return;
    navigator.clipboard.writeText(editablePrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  // Transfer directly to Seedance 2.5 Video Generation Workspace
  const handleTransferToStudio = () => {
    const activePrompt = editablePrompt.trim();
    if (!activePrompt) return;
    onSendToSeedanceStudio({
      prompt: activePrompt,
      negativePrompt: editableNegativePrompt,
      referenceImageUrls: references.map((r) => r.url),
      duration,
      aspectRatio,
    });
  };

  // Direct One-Click Render with Seedance 2.5 right inside VAIU
  const handleDirectSeedanceRender = async () => {
    const activePrompt = editablePrompt.trim();
    if (!activePrompt) return;

    setIsRenderingVideo(true);
    setRenderError(null);
    setRenderProgress(12);
    const seedanceModelKey =
      duration === 30 ? 'seedance_25_30s_r2v' : 'seedance_25_15s_r2v';
    setRenderStatusText(`Submitting VAIU Master Prompt to ${seedanceModelKey}...`);

    try {
      const refUrls = references.map((r) => r.url);
      const primaryImage = refUrls[0] || project.shots[0]?.thumbnailUrl || '';

      const submitRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: seedanceModelKey,
          prompt: activePrompt,
          aspect_ratio: aspectRatio,
          image_url: primaryImage || undefined,
          reference_image_urls: refUrls.length > 0 ? refUrls : undefined,
          image_urls: refUrls.length > 0 ? refUrls : undefined,
        }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok || !submitData.ok || !submitData.job_code) {
        throw new Error(submitData.error || 'Seedance 2.5 generation submission failed.');
      }

      const jobCode: string = submitData.job_code;
      setRenderProgress(45);
      setRenderStatusText(`Seedance 2.5 rendering (${jobCode})...`);

      let finalVideoUrl: string | null =
        submitData.result_url || submitData.outputUrl || null;
      let pollCount = 0;

      while (!finalVideoUrl && pollCount < 45) {
        await new Promise((r) => setTimeout(r, pollCount === 0 ? 1500 : 3500));
        pollCount++;
        const statusRes = await fetch(`/api/ai/jobs/${encodeURIComponent(jobCode)}`);
        const statusData = await statusRes.json();
        if (!statusRes.ok || !statusData.ok) {
          throw new Error(statusData.error || `Failed polling Seedance 2.5 job ${jobCode}.`);
        }
        const st = String(statusData.status || 'processing').toLowerCase();
        if (st === 'completed') {
          finalVideoUrl = statusData.result_url || statusData.outputUrl || null;
          break;
        }
        if (st === 'failed' || st === 'cancelled') {
          throw new Error(statusData.error_message || `Seedance 2.5 job ${jobCode} ${st}.`);
        }
        const pct = Math.min(94, 45 + pollCount * 8);
        setRenderProgress(pct);
        setRenderStatusText(`Seedance 2.5 rendering (${pct}%) — Job ${jobCode}...`);
      }

      if (!finalVideoUrl) {
        throw new Error(`Seedance 2.5 job ${jobCode} timed out.`);
      }

      setRenderedVideoUrl(finalVideoUrl);
      setRenderProgress(100);
      setRenderStatusText(`Seedance 2.5 Master Video Ready (${jobCode})`);

      const thumbUrl =
        primaryImage ||
        project.shots[0]?.thumbnailUrl ||
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';

      const newJob: GenerationJob = {
        id: `job-${jobCode}`,
        projectId: project.id,
        shotId: project.shots[0]?.id,
        modelId: 'seedance-2.5-ref-video',
        modelName: `Seedance 2.5 (${duration}s VAIU R2V)`,
        prompt: activePrompt,
        negativePrompt: editableNegativePrompt,
        status: 'COMPLETED',
        progress: 100,
        startedAt: Date.now() - 4000,
        completedAt: Date.now(),
        resultUrl: finalVideoUrl,
        resultThumbnailUrl: thumbUrl,
        estimatedCostCredits: duration === 30 ? 30 : 15,
      };

      const newAsset: StudioAsset = {
        id: `asset-vaiu-${Date.now()}`,
        projectId: project.id,
        shotId: project.shots[0]?.id,
        title: `VAIU Seedance 2.5 (${customGenre.trim() || selectedGenre} · ${
          customCameraMode.trim() || selectedCameraMode
        })`,
        type: 'VIDEO',
        url: finalVideoUrl,
        thumbnailUrl: thumbUrl,
        duration,
        version: 1,
        createdAt: new Date().toISOString(),
        prompt: activePrompt,
        model: 'Seedance 2.5',
        resolution: '1080p',
      };

      if (onJobComplete) {
        onJobComplete(newJob, undefined, newAsset);
      } else if (onAddAsset) {
        onAddAsset(newAsset);
      }
    } catch (err: any) {
      setRenderError(err?.message || 'Seedance 2.5 render failed');
    } finally {
      setIsRenderingVideo(false);
    }
  };

  // Vault items from project Characters & Assets for quick adding
  const vaultImages: { url: string; label: string; role: VaiuReferenceImageItem['role'] }[] = [
    ...project.characters.flatMap((c) =>
      (c.referenceImages || []).map((url) => ({
        url,
        label: c.name,
        role: 'Primary Subject / Face' as const,
      }))
    ),
    ...project.locations
      .filter((loc) => loc.referenceImage)
      .map((loc) => ({
        url: loc.referenceImage,
        label: loc.name,
        role: 'Environment / Set' as const,
      })),
    ...project.assets
      .filter((a) => a.type === 'IMAGE')
      .map((a) => ({
        url: a.url,
        label: a.title,
        role: 'Style / Lighting' as const,
      })),
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-[#06060A] text-[#ECECE9] overflow-hidden select-none">
      {/* TOP VAIU HEADER BANNER */}
      <div className="px-4 sm:px-6 py-3 bg-gradient-to-r from-[#090B12] via-[#0D1322] to-[#090B12] border-b border-cyan-500/25 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.2)]">
            <Wand2 className="w-4 h-4 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-sm sm:text-base font-bold tracking-[0.16em] uppercase text-white">
                VAIU
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-300">
                Seedance 2.5 Exclusive
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono text-emerald-300">
                <Sparkles className="w-3 h-3" />
                Gemini 4 Argon Multimodal Director
              </span>
            </div>
            <p className="text-[11px] font-mono text-white/55 mt-0.5">
              Input up to 9 reference images + Video Genre + Camera Mode → Ready-to-use Seedance 2.5 R2V Multi-Shot Prompt
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/50 border border-white/10 rounded-md p-0.5 font-mono text-[11px]">
            <button
              onClick={() => setDuration(15)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                duration === 15
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              15s R2V
            </button>
            <button
              onClick={() => setDuration(30)}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                duration === 30
                  ? 'bg-cyan-500 text-black font-bold'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              30s R2V
            </button>
          </div>

          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            aria-label="Seedance 2.5 Aspect Ratio"
            className="px-2.5 py-1.5 rounded-md bg-black/60 border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none cursor-pointer"
          >
            <option value="16:9">16:9 Widescreen</option>
            <option value="9:16">9:16 Vertical</option>
            <option value="1:1">1:1 Square</option>
            <option value="4:3">4:3 IMAX / Classic</option>
            <option value="3:4">3:4 Portrait</option>
          </select>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN (7 COLS): MULTI-REFERENCE IMAGES + GENRE + CAMERA MODE */}
        <div className="lg:col-span-7 h-full lg:overflow-y-auto p-4 sm:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-white/10">
          {/* SECTION 1: REFERENCE IMAGES MATRIX (UP TO 9 IMAGES FOR SEEDANCE 2.5) */}
          <section className="rounded-xl bg-[#0B0C12] border border-white/10 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  1. Reference Images Input (Seedance 2.5 R2V Anchor Matrix)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-cyan-300">
                  {references.length} / 9 Images
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile || references.length >= 9}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 font-mono text-xs transition-all cursor-pointer disabled:opacity-40"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingFile ? 'Uploading...' : 'Upload Images'}</span>
                </button>

                <button
                  onClick={() => setShowVaultPicker(!showVaultPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white/80 font-mono text-xs transition-all cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>From Studio Vault</span>
                </button>
              </div>
            </div>

            {/* URL Input Bar */}
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrlReference()}
                placeholder="Or paste reference image URL (character face, outfit, car, set location)..."
                className="flex-1 px-3 py-1.5 rounded-md bg-black/60 border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:border-cyan-400 focus:outline-none"
              />
              <button
                onClick={handleAddUrlReference}
                disabled={!urlInput.trim() || references.length >= 9}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white disabled:opacity-30 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add URL</span>
              </button>
            </div>

            {/* Studio Vault Picker Drawer */}
            {showVaultPicker && (
              <div className="p-3 rounded-lg bg-black/70 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                    Click to attach from Project Characters, Locations & Assets ({vaultImages.length})
                  </span>
                  <button
                    onClick={() => setShowVaultPicker(false)}
                    className="text-[10px] font-mono text-white/50 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto">
                  {vaultImages.map((v, idx) => (
                    <button
                      key={`${v.url}-${idx}`}
                      onClick={() => {
                        if (references.length >= 9) return;
                        setReferences((prev) => [
                          ...prev,
                          {
                            id: `vaiu-vault-${Date.now()}-${idx}`,
                            url: v.url,
                            label: v.label,
                            role: v.role,
                          },
                        ]);
                      }}
                      className="group relative rounded overflow-hidden border border-white/10 hover:border-cyan-400 aspect-video bg-black text-left cursor-pointer"
                    >
                      <img
                        src={v.url}
                        alt={v.label}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1.5 py-0.5 text-[9px] font-mono text-white truncate">
                        {v.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reference Cards Grid */}
            {references.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/15 hover:border-cyan-400/50 rounded-lg p-6 text-center cursor-pointer transition-colors bg-black/30"
              >
                <ImageIcon className="w-7 h-7 text-cyan-400/70 mx-auto mb-2" />
                <p className="text-xs font-mono text-white/80">
                  Drop or click to upload Reference Images (Character Face, Outfit, Environment, Props)
                </p>
                <p className="text-[10px] font-mono text-white/40 mt-1">
                  Gemini 4 Argon will inspect every image to lock identity, wardrobe, and lighting for Seedance 2.5
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {references.map((refItem, idx) => (
                  <div
                    key={refItem.id}
                    className="rounded-lg bg-black/60 border border-white/15 overflow-hidden flex flex-col"
                  >
                    <div className="relative h-28 bg-black">
                      <img
                        src={refItem.url}
                        alt={refItem.label}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300">
                        REF #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleRemoveReference(refItem.id)}
                        title="Remove Reference"
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/80 hover:bg-red-500/80 text-white/70 hover:text-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="p-2 space-y-1.5">
                      <input
                        type="text"
                        value={refItem.label}
                        onChange={(e) =>
                          handleUpdateReference(refItem.id, { label: e.target.value })
                        }
                        placeholder="Reference Label"
                        className="w-full px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-[11px] font-mono text-white focus:border-cyan-400 focus:outline-none"
                      />
                      <select
                        value={refItem.role}
                        onChange={(e) =>
                          handleUpdateReference(refItem.id, {
                            role: e.target.value as VaiuReferenceImageItem['role'],
                          })
                        }
                        aria-label="Reference Role"
                        className="w-full px-2 py-1 rounded bg-black border border-white/10 text-[10px] font-mono text-cyan-300 focus:border-cyan-400 focus:outline-none cursor-pointer"
                      >
                        {REFERENCE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* SECTION 2: VIDEO GENRE SELECTOR */}
          <section className="rounded-xl bg-[#0B0C12] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-amber-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  2. Video Genre ("Comedy, Action, Thriller, etc.")
                </h2>
              </div>
              <span className="text-[10px] font-mono text-amber-300">
                Active: {customGenre.trim() || selectedGenre}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VIDEO_GENRE_PRESETS.map((g) => {
                const isSelected = !customGenre.trim() && selectedGenre === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setCustomGenre('');
                    }}
                    title={g.tagline}
                    className={`px-2.5 py-2 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                        : 'bg-black/40 border-white/10 text-white/75 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="text-xs truncate">{g.label}</div>
                    <div className="text-[9px] text-white/45 truncate mt-0.5">{g.tagline}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="Or type custom hybrid video genre (e.g., 'Martial Arts Slapstick Comedy', 'Psychological Cyberpunk Thriller')..."
                className="w-full px-3 py-1.5 rounded-md bg-black/60 border border-white/10 text-xs font-mono text-white placeholder:text-white/35 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </section>

          {/* SECTION 3: CAMERA MODE SELECTOR */}
          <section className="rounded-xl bg-[#0B0C12] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  3. Mode Camera ("Cinema Film, Handheld Vlog, Documentary, etc.")
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-300">
                Active: {customCameraMode.trim() || selectedCameraMode}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAMERA_MODE_PRESETS.map((cam) => {
                const isSelected = !customCameraMode.trim() && selectedCameraMode === cam.id;
                return (
                  <button
                    key={cam.id}
                    onClick={() => {
                      setSelectedCameraMode(cam.id);
                      setCustomCameraMode('');
                    }}
                    className={`p-2.5 rounded-lg border text-left font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                        : 'bg-black/40 border-white/10 text-white/75 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{cam.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="text-[10px] text-white/45 truncate mt-0.5">{cam.spec}</div>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={customCameraMode}
                onChange={(e) => setCustomCameraMode(e.target.value)}
                placeholder="Or type custom camera mode / lens rig (e.g., 'SnorriCam Body-Mount 18mm', 'Split-Diopter 70s Thriller Rig')..."
                className="w-full px-3 py-1.5 rounded-md bg-black/60 border border-white/10 text-xs font-mono text-white placeholder:text-white/35 focus:border-emerald-400 focus:outline-none"
              />
            </div>
          </section>

          {/* SECTION 4: ACTION BEATS & OPTIONAL VEHICLE CONTINUITY LOCK */}
          <section className="rounded-xl bg-[#0B0C12] border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  4. Scene Action Concept & Continuity Locks
                </h2>
              </div>
              <label className="flex items-center gap-1.5 text-[11px] font-mono text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={vehicleLockEnabled}
                  onChange={(e) => setVehicleLockEnabled(e.target.checked)}
                  className="accent-cyan-400"
                />
                <Car className="w-3.5 h-3.5 text-cyan-400" />
                <span>Vehicle LHD/RHD Lock</span>
              </label>
            </div>

            <textarea
              rows={2}
              value={storyConcept}
              onChange={(e) => setStoryConcept(e.target.value)}
              placeholder="Describe the core action, dialogue beat, or comedic/thriller twist you want in this Seedance 2.5 sequence..."
              className="w-full p-2.5 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-white placeholder:text-white/30 focus:border-cyan-400 focus:outline-none resize-none"
            />

            {vehicleLockEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setVehicleDrivingSide('LHD')}
                    className={`flex-1 py-1 rounded text-[10px] font-mono cursor-pointer ${
                      vehicleDrivingSide === 'LHD'
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'bg-black/50 text-white/60'
                    }`}
                  >
                    LHD (Left-Hand)
                  </button>
                  <button
                    onClick={() => setVehicleDrivingSide('RHD')}
                    className={`flex-1 py-1 rounded text-[10px] font-mono cursor-pointer ${
                      vehicleDrivingSide === 'RHD'
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'bg-black/50 text-white/60'
                    }`}
                  >
                    RHD (Right-Hand)
                  </button>
                </div>
                <input
                  type="text"
                  value={vehicleModelSpec}
                  onChange={(e) => setVehicleModelSpec(e.target.value)}
                  placeholder="Exact vehicle model & color..."
                  className="sm:col-span-2 px-2.5 py-1 rounded bg-black/60 border border-white/15 text-xs font-mono text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>
            )}

            {/* GENERATE VAIU PROMPT CTA */}
            <button
              onClick={handleGenerateVaiuPrompt}
              disabled={isAnalyzing}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-black font-mono text-xs sm:text-sm font-bold uppercase tracking-wider shadow-[0_0_25px_rgba(34,211,238,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{analysisStep || 'Gemini 4 Argon Analyzing References...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    Generate VAIU Seedance 2.5 Prompt ({references.length} Refs ·{' '}
                    {customGenre.trim() || selectedGenre} ·{' '}
                    {customCameraMode.trim() || selectedCameraMode})
                  </span>
                </>
              )}
            </button>

            {analysisError && (
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 flex items-center gap-2 text-xs font-mono text-red-200">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN (5 COLS): GEMINI 4 ARGON OUTPUT & ONE-CLICK SEEDANCE 2.5 EXECUTION */}
        <div className="lg:col-span-5 h-full lg:overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#07080D]">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  VAIU Seedance 2.5 Master Output
                </h2>
              </div>
              <p className="text-[10px] font-mono text-white/45 mt-0.5">
                {result
                  ? `Synthesized via ${result.engineUsed} · Ready for Seedance 2.5 (${duration}s)`
                  : 'Click Generate to run multimodal reference & camera synthesis'}
              </p>
            </div>

            {editablePrompt && (
              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-mono text-white transition-colors cursor-pointer"
              >
                {copiedPrompt ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* MASTER PROMPT EDITOR BOX */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
              <span>SEEDANCE 2.5 READY-TO-USE PROMPT (CHRONOLOGICAL R2V FORMAT)</span>
              <span>{editablePrompt.length} / 8000 chars</span>
            </div>
            <textarea
              rows={8}
              value={editablePrompt}
              onChange={(e) => setEditablePrompt(e.target.value)}
              placeholder="Your compiled Seedance 2.5 multi-shot prompt with [00.0s-15.0s] timecodes, reference anchors, and optical rig directives will appear here..."
              className="w-full p-3 rounded-xl bg-black/80 border border-cyan-500/30 text-xs font-mono text-cyan-100 leading-relaxed focus:border-cyan-400 focus:outline-none resize-y"
            />
          </div>

          {/* NEGATIVE PROMPT BOX */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-white/45">
              Seedance 2.5 Continuity Negative Prompt
            </span>
            <input
              type="text"
              value={editableNegativePrompt}
              onChange={(e) => setEditableNegativePrompt(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono text-white/75 focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* EXECUTION BUTTONS: SEND TO STUDIO OR DIRECT RENDER */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={handleTransferToStudio}
              disabled={!editablePrompt.trim()}
              className="py-2.5 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/20 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-35"
            >
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open in Seedance Studio</span>
            </button>

            <button
              onClick={handleDirectSeedanceRender}
              disabled={!editablePrompt.trim() || isRenderingVideo}
              className="py-2.5 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all cursor-pointer disabled:opacity-40"
            >
              {isRenderingVideo ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Rendering ({renderProgress}%)...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Render Seedance 2.5 Video</span>
                </>
              )}
            </button>
          </div>

          {/* LIVE SEEDANCE 2.5 VIDEO RENDER STATUS / PLAYER */}
          {(isRenderingVideo || renderedVideoUrl || renderError) && (
            <div className="rounded-xl bg-black/80 border border-cyan-500/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-cyan-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {renderStatusText || 'Seedance 2.5 R2V Pipeline'}
                </span>
                <span className="text-white/60">{renderProgress}%</span>
              </div>

              {isRenderingVideo && (
                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.max(5, renderProgress)}%` }}
                  />
                </div>
              )}

              {renderError && (
                <div className="text-xs font-mono text-red-300 bg-red-500/10 border border-red-500/30 rounded p-2">
                  {renderError}
                </div>
              )}

              {renderedVideoUrl && (
                <div className="space-y-2">
                  <video
                    src={renderedVideoUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="w-full rounded-lg border border-white/15 bg-black max-h-64 object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* MULTIMODAL ANALYSIS BREAKDOWN (CINEMATOGRAPHY PROFILE, REFERENCE ANCHORS & SHOT TIMELINE) */}
          {result && (
            <div className="space-y-4 pt-2">
              {/* Cinematography Profile */}
              <div className="rounded-xl bg-[#0C0E16] border border-white/10 p-3 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                  Optical & Cinematography Profile
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <div className="text-[9px] text-white/40 uppercase">Lens & Sensor</div>
                    <div className="text-white/90 mt-0.5">
                      {result.cinematographyProfile?.lensAndSensor}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <div className="text-[9px] text-white/40 uppercase">Camera Motion</div>
                    <div className="text-white/90 mt-0.5">
                      {result.cinematographyProfile?.movementStyle}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <div className="text-[9px] text-white/40 uppercase">Color & Lighting</div>
                    <div className="text-white/90 mt-0.5">
                      {result.cinematographyProfile?.colorGrade}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <div className="text-[9px] text-white/40 uppercase">Genre Pacing</div>
                    <div className="text-white/90 mt-0.5">
                      {result.cinematographyProfile?.pacingStyle}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reference Image Anchor Breakdown */}
              {result.referenceAnalysis && result.referenceAnalysis.length > 0 && (
                <div className="rounded-xl bg-[#0C0E16] border border-white/10 p-3 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    Reference Anchor Directives ({result.referenceAnalysis.length})
                  </span>
                  <div className="space-y-1.5">
                    {result.referenceAnalysis.map((ref) => (
                      <div
                        key={ref.index}
                        className="p-2 rounded bg-black/50 border border-white/5 text-[11px] font-mono space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-cyan-300 font-bold">
                          <span>
                            [REF #{ref.index}] {ref.role}
                          </span>
                        </div>
                        <div className="text-white/80">{ref.extractedVisualTraits}</div>
                        <div className="text-[10px] text-emerald-300/80">
                          Lock: {ref.continuityDirective}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chronological Multi-Shot Breakdown */}
              {result.shotTimeline && result.shotTimeline.length > 0 && (
                <div className="rounded-xl bg-[#0C0E16] border border-white/10 p-3 space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
                    Seedance 2.5 Time-Coded Shot Breakdown
                  </span>
                  <div className="space-y-2">
                    {result.shotTimeline.map((shot, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-black/60 border border-white/10 text-[11px] font-mono space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                            [{shot.timeRange}]
                          </span>
                          <span className="text-white font-bold">{shot.shotTitle}</span>
                        </div>
                        <div className="text-emerald-300 text-[10px]">
                          Camera: {shot.cameraDirective}
                        </div>
                        <div className="text-white/85">{shot.actionDescription}</div>
                        <div className="text-white/50 text-[10px]">
                          Light: {shot.lightingAndColor} · Audio: {shot.audioAtmosphere}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
