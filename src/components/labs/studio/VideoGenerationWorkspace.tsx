/**
 * VAIURE Studio — Advanced Multi-Mode AI Generation Workspace
 * Supports 4 dedicated studio modes:
 * 1. Image Generation (Keyframe & Concept Plate Synthesis)
 * 2. Image-to-Video (First-Frame & Source Image Conditioning)
 * 3. Text-to-Video (Direct Prompt-to-Motion Synthesis)
 * 4. Reference-Based Generation (Character, Wardrobe & Location Continuity)
 *
 * Includes collapsible Left Asset/Reference Sidebar, Central Zoom/Pan Inspection Canvas,
 * Collapsible Right Parameters & Prompt Architect Panel, and Bottom Generation History Strip.
 */

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Film,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Wand2,
  RefreshCw,
  Download,
  Plus,
  User,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  SplitSquareVertical,
  ArrowRight,
  Sliders,
  Copy,
  Terminal,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Settings2,
} from 'lucide-react';
import {
  StudioProject,
  StoryboardShot,
  AspectRatio,
  Resolution,
  GenerationJob,
  ShotVersion,
  StudioAsset,
  TimelineClip,
} from '../../../types/studio';
import {
  StudioGenerationMode,
  getAvailableModels,
  getModelById,
  estimateJobCost,
} from '../../../services/videoGenerationAdapter';
import { uploadAndOptimizeThreadImage } from '../../../services/forumService';

import { VaiuSeedanceTransferPayload } from './VaiuSeedanceWorkspace';

interface VideoGenerationWorkspaceProps {
  project: StudioProject;
  prefilledShot?: StoryboardShot;
  initialMode?: StudioGenerationMode;
  vaiuPrefill?: VaiuSeedanceTransferPayload | null;
  onOpenVaiu?: () => void;
  onJobComplete: (
    newJob: GenerationJob,
    updatedShot?: StoryboardShot,
    newAsset?: StudioAsset
  ) => void;
  onAddAsset?: (asset: StudioAsset) => void;
  onInsertToTimeline?: (clip: TimelineClip) => void;
  onAttachToCharacterRef?: (characterId: string, imageUrl: string) => void;
}

const STUDIO_MODES: {
  id: StudioGenerationMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'image-gen',
    label: '1. Image Generation',
    shortLabel: 'Image Gen',
    description: 'Synthesize 1080p/4K cinematic keyframes & look-dev plates',
  },
  {
    id: 'midjourney-discord',
    label: '2. Midjourney Bridge',
    shortLabel: 'MJ Discord',
    description: 'Direct Discord v9 /imagine slash command automation & 5s channel polling',
  },
  {
    id: 'image-to-video',
    label: '3. Image-to-Video',
    shortLabel: 'Img → Video',
    description: 'Animate uploaded or generated first-frame images @ 24fps',
  },
  {
    id: 'text-to-video',
    label: '4. Text-to-Video',
    shortLabel: 'Txt → Video',
    description: 'Direct temporal motion synthesis from structured camera prompts',
  },
  {
    id: 'ref-video',
    label: '5. Reference Generation',
    shortLabel: 'Ref Synthesis',
    description: 'Multi-reference character, wardrobe & location continuity',
  },
];

export const VideoGenerationWorkspace: React.FC<VideoGenerationWorkspaceProps> = ({
  project,
  prefilledShot,
  initialMode,
  vaiuPrefill,
  onOpenVaiu,
  onJobComplete,
  onAddAsset,
  onInsertToTimeline,
  onAttachToCharacterRef,
}) => {
  const resolvedInitialMode: StudioGenerationMode = initialMode || 'image-gen';
  // Studio Mode Switcher
  const [studioMode, setStudioMode] = useState<StudioGenerationMode>(resolvedInitialMode);

  // Collapsible Workspace Panels (Default closed on mobile/compact screens so canvas has 100% viewport)
  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isRightOpen, setIsRightOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isBottomOpen, setIsBottomOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );
  const [leftTab, setLeftTab] = useState<'ASSETS' | 'CHARACTERS' | 'SHOTS'>('ASSETS');

  // Central Canvas Zoom, Pan & Touch Pinch State
  const [canvasZoom, setCanvasZoom] = useState<number>(1);
  const [canvasPan, setCanvasPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistRef = useRef<number | null>(null);
  const [compareRefOverlay, setCompareRefOverlay] = useState(false);

  // Active Inspected Media on Central Canvas
  const [inspectedAsset, setInspectedAsset] = useState<{
    type: 'VIDEO' | 'IMAGE';
    url: string;
    thumbnailUrl?: string;
    title: string;
    prompt?: string;
    model?: string;
    seed?: number;
    duration?: number;
    aspectRatio?: AspectRatio;
    resolution?: Resolution;
  } | null>(() => {
    if (prefilledShot?.videoUrl) {
      return {
        type: 'VIDEO',
        url: prefilledShot.videoUrl,
        thumbnailUrl: prefilledShot.thumbnailUrl,
        title: `Shot ${String(prefilledShot.shotNumber).padStart(2, '0')}: ${prefilledShot.title}`,
        prompt: prefilledShot.prompt,
        duration: prefilledShot.duration,
      };
    }
    if (prefilledShot?.thumbnailUrl) {
      return {
        type: 'IMAGE',
        url: prefilledShot.thumbnailUrl,
        thumbnailUrl: prefilledShot.thumbnailUrl,
        title: `Shot ${String(prefilledShot.shotNumber).padStart(2, '0')} Keyframe`,
        prompt: prefilledShot.prompt,
      };
    }
    const firstAsset = project.assets[0];
    if (firstAsset) {
      return {
        type: firstAsset.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
        url: firstAsset.url,
        thumbnailUrl: firstAsset.thumbnailUrl || firstAsset.url,
        title: firstAsset.title,
        prompt: firstAsset.prompt,
        model: firstAsset.model,
        duration: firstAsset.duration,
      };
    }
    return null;
  });

  // Generation Parameters
  const availableModels = getAvailableModels(studioMode);
  const [selectedModelId, setSelectedModelId] = useState<string>(() => {
    const initialModels = getAvailableModels(resolvedInitialMode);
    return initialModels[0]?.id || 'seedance-2.5-ref-video';
  });
  const selectedModel =
    availableModels.find((m) => m.id === selectedModelId) ||
    availableModels[0] ||
    getModelById('seedance-2.5-ref-video');

  // Sync studioMode when initialMode prop changes from StudioTopBar / StudioSidebar
  React.useEffect(() => {
    const nextMode: StudioGenerationMode = initialMode || 'image-gen';
    setStudioMode(nextMode);
    const modeModels = getAvailableModels(nextMode);
    if (modeModels.length > 0) {
      setSelectedModelId(modeModels[0].id);
    }
  }, [initialMode]);

  const [prompt, setPrompt] = useState<string>(
    prefilledShot?.prompt ||
      'Extreme wide establishing shot in cavernous volcanic basalt hall. Single aperture morning sunlight beam slicing across polished dark stone floor. Symmetrical brutalist architecture. 24mm anamorphic cinema lens, rich chiaroscuro contrast @ 24fps.'
  );
  const [negativePrompt, setNegativePrompt] = useState<string>(
    prefilledShot?.negativePrompt || 'oversaturated, blurry, bad architecture, deformed hands, watermark'
  );
  const [targetShotId, setTargetShotId] = useState<string>(
    prefilledShot?.id || project.shots[0]?.id || ''
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio || '16:9');
  const [resolution, setResolution] = useState<Resolution>(project.resolution || '1080p');
  const [duration, setDuration] = useState<number>(4);
  const [seed, setSeed] = useState<number>(428910);
  const [motionIntensity, setMotionIntensity] = useState<number>(6);

  // Reference & Conditioning State
  const [sourceImageUrl, setSourceImageUrl] = useState<string>(
    prefilledShot?.thumbnailUrl || project.shots[0]?.thumbnailUrl || ''
  );
  const [endImageUrl, setEndImageUrl] = useState<string>('');
  const [swapImageUrl, setSwapImageUrl] = useState<string>('');
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string>('');
  const [extraReferenceUrls, setExtraReferenceUrls] = useState<string[]>([]);
  const [newRefUrlInput, setNewRefUrlInput] = useState<string>('');
  const [vehicleLockEnabled, setVehicleLockEnabled] = useState<boolean>(false);
  const [vehicleDrivingSide, setVehicleDrivingSide] = useState<'LHD' | 'RHD'>('LHD');
  const [vehicleModelSpec, setVehicleModelSpec] = useState<string>(
    '2026 Porsche 911 GT3 RS (Ice Grey Metallic, satin black wheels)'
  );

  // Sync VAIU Seedance 2.5 Prompt & References when transferred from VAIU Workspace
  React.useEffect(() => {
    if (!vaiuPrefill) return;
    setStudioMode('ref-video');
    setSelectedModelId('seedance-2.5-ref-video');
    setPrompt(vaiuPrefill.prompt);
    if (vaiuPrefill.negativePrompt) {
      setNegativePrompt(vaiuPrefill.negativePrompt);
    }
    setDuration(vaiuPrefill.duration);
    setAspectRatio(vaiuPrefill.aspectRatio);
    if (vaiuPrefill.referenceImageUrls.length > 0) {
      setSourceImageUrl(vaiuPrefill.referenceImageUrls[0]);
      setExtraReferenceUrls(vaiuPrefill.referenceImageUrls.slice(1));
    }
    setStatusNotice('Loaded VAIU Seedance 2.5 Master Prompt & Reference Matrix');
    const t = setTimeout(() => setStatusNotice(null), 4000);
    return () => clearTimeout(t);
  }, [vaiuPrefill]);

  const [posbotBalance, setPosbotBalance] = useState<{
    balance_generate: number;
    balance_idr_equivalent: number;
  } | null>(null);
  const [posbotHealth, setPosbotHealth] = useState<{
    ok: boolean;
    serverKeyConfigured: boolean;
  } | null>(null);
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>(
    prefilledShot?.characterIds || project.characters.slice(0, 1).map((c) => c.id)
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    prefilledShot?.locationId || project.locations[0]?.id || ''
  );

  // Upload & Prompt Optimization Status
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Generation Job State & Dynamic Polling Phase
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [generationPhase, setGenerationPhase] = useState<
    'IDLE' | 'SENDING' | 'WAITING' | 'RENDERING' | 'COMPLETED' | 'ERROR'
  >('IDLE');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [selectedImageStyleId, setSelectedImageStyleId] = useState<string>('anamorphic-35mm');
  const [lastGeneratedImage, setLastGeneratedImage] = useState<{
    url: string;
    title: string;
    prompt: string;
    model: string;
    aspectRatio: string;
    resolution: string;
    createdAt: string;
  } | null>(null);

  const IMAGE_STYLE_PRESETS = [
    {
      id: 'anamorphic-35mm',
      label: 'Anamorphic 35mm',
      directive: 'shot on Panavision Primo 35mm anamorphic lens, shallow depth of field, Kodak Vision3 500T film grain, volumetric cinema lighting',
    },
    {
      id: 'cyberpunk-noir',
      label: 'Cyberpunk Noir',
      directive: 'neo-noir rain-slicked reflections, bioluminescent cyan and amber rim lighting, atmospheric haze, high-contrast shadow detail',
    },
    {
      id: 'editorial-portrait',
      label: 'Editorial Portrait',
      directive: 'medium format Hasselblad H6D 80mm f/1.9, sculpted Rembrandt key light, ultra-detailed skin texture, natural catchlights',
    },
    {
      id: 'brutalist-scifi',
      label: 'Brutalist Sci-Fi',
      directive: 'monolithic concrete megastructure, dramatic god rays, wide-angle 18mm rectilinear lens, Denis Villeneuve atmospheric scale',
    },
  ];

  // Midjourney Discord Bridge State & Manual Environment Variable Inputs
  const [mjStatus, setMjStatus] = useState<{
    configured: boolean;
    source?: 'manual-ui' | 'env';
    missingVars: string[];
    applicationId: string;
    commandId: string;
    commandVersion?: string;
    guildId?: string;
    channelId?: string;
    hasToken?: boolean;
    tokenMasked?: string | null;
    guildIdMasked: string | null;
    channelIdMasked: string | null;
  } | null>(null);

  const [mjManualConfig, setMjManualConfig] = useState<{
    discordToken: string;
    guildId: string;
    channelId: string;
    applicationId: string;
    commandId: string;
    commandVersion: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('vaiure_mj_discord_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          discordToken: parsed.discordToken || '',
          guildId: parsed.guildId || '',
          channelId: parsed.channelId || '',
          applicationId: parsed.applicationId || '936929561302675456',
          commandId: parsed.commandId || '938956540159881230',
          commandVersion: parsed.commandVersion || '1237876415471554623',
        };
      }
    } catch {
      // ignore storage errors
    }
    return {
      discordToken: '',
      guildId: '',
      channelId: '',
      applicationId: '936929561302675456',
      commandId: '938956540159881230',
      commandVersion: '1237876415471554623',
    };
  });

  const [showMjEnvEditor, setShowMjEnvEditor] = useState<boolean>(true);
  const [showMjAdvancedIds, setShowMjAdvancedIds] = useState<boolean>(false);
  const [showDiscordToken, setShowDiscordToken] = useState<boolean>(false);
  const [discordUrlPaste, setDiscordUrlPaste] = useState<string>('');
  const [isSavingMjConfig, setIsSavingMjConfig] = useState<boolean>(false);
  const [isVerifyingMjConfig, setIsVerifyingMjConfig] = useState<boolean>(false);
  const [mjVerifyFeedback, setMjVerifyFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const [mjVersion, setMjVersion] = useState<'6.1' | '6.0' | 'niji 6'>('6.1');
  const [mjStylize, setMjStylize] = useState<number>(250);
  const [mjChaos, setMjChaos] = useState<number>(0);
  const [mjStyleRaw, setMjStyleRaw] = useState<boolean>(true);
  const [mjBridgeMode, setMjBridgeMode] = useState<'live-poll' | 'single-post'>('live-poll');
  const [mjPollAttempt, setMjPollAttempt] = useState<number>(0);

  // Sync any saved manual config from localStorage to backend on mount, then fetch status
  React.useEffect(() => {
    const syncAndCheck = async () => {
      try {
        if (
          mjManualConfig.discordToken.trim() ||
          mjManualConfig.guildId.trim() ||
          mjManualConfig.channelId.trim()
        ) {
          const res = await fetch('/api/midjourney/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(mjManualConfig),
          });
          const data = await res.json();
          if (data && typeof data.configured === 'boolean') {
            setMjStatus(data);
            return;
          }
        }
        const statusRes = await fetch('/api/midjourney/status');
        const statusData = await statusRes.json();
        if (statusData && typeof statusData.configured === 'boolean') {
          setMjStatus(statusData);
          if (statusData.guildId && !mjManualConfig.guildId) {
            setMjManualConfig((prev) => ({
              ...prev,
              guildId: statusData.guildId || prev.guildId,
              channelId: statusData.channelId || prev.channelId,
              applicationId: statusData.applicationId || prev.applicationId,
              commandId: statusData.commandId || prev.commandId,
              commandVersion: statusData.commandVersion || prev.commandVersion,
            }));
          }
        }
      } catch {
        // ignore network error on initial check
      }

      // Check PosBot /api/ai/health and /api/ai/balance
      try {
        const [hRes, bRes] = await Promise.all([
          fetch('/api/ai/health'),
          fetch('/api/ai/balance'),
        ]);
        const hData = await hRes.json();
        setPosbotHealth({
          ok: Boolean(hData?.ok),
          serverKeyConfigured: Boolean(hData?.serverKeyConfigured),
        });
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData?.ok && typeof bData.balance_generate === 'number') {
            setPosbotBalance({
              balance_generate: bData.balance_generate,
              balance_idr_equivalent: bData.balance_idr_equivalent || bData.balance_generate * 400,
            });
          }
        }
      } catch {
        // ignore network error on initial check
      }
    };
    syncAndCheck();
  }, []);

  const handleDiscordChannelUrlParse = (rawValue: string) => {
    setDiscordUrlPaste(rawValue);
    // Matches https://discord.com/channels/<GUILD_ID>/<CHANNEL_ID>
    const match = rawValue.match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)/i);
    if (match) {
      const [, extractedGuild, extractedChannel] = match;
      setMjManualConfig((prev) => ({
        ...prev,
        guildId: extractedGuild,
        channelId: extractedChannel,
      }));
      setMjVerifyFeedback({
        ok: true,
        message: `Extracted GUILD_ID (${extractedGuild.slice(0, 6)}...) & CHANNEL_ID (${extractedChannel.slice(0, 6)}...)`,
      });
    }
  };

  const handleSaveMjEnvConfig = async (silent = false) => {
    setIsSavingMjConfig(true);
    setMjVerifyFeedback(null);
    try {
      localStorage.setItem('vaiure_mj_discord_config_v1', JSON.stringify(mjManualConfig));
      const res = await fetch('/api/midjourney/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mjManualConfig),
      });
      const data = await res.json();
      if (data && typeof data.configured === 'boolean') {
        setMjStatus(data);
      }
      if (!silent) {
        setMjVerifyFeedback({
          ok: Boolean(data?.configured),
          message: data?.configured
            ? 'Manual environment variables saved & active for Midjourney requests.'
            : `Saved partial config. Still needed: ${data?.missingVars?.join(', ') || 'check fields'}`,
        });
        showToast('Midjourney Discord environment variables updated');
      }
      return data;
    } catch (err: any) {
      if (!silent) {
        setMjVerifyFeedback({
          ok: false,
          message: err?.message || 'Failed to sync manual config to server.',
        });
      }
      return null;
    } finally {
      setIsSavingMjConfig(false);
    }
  };

  const handleVerifyMjConnection = async () => {
    setIsVerifyingMjConfig(true);
    setMjVerifyFeedback(null);
    try {
      await handleSaveMjEnvConfig(true);
      const res = await fetch('/api/midjourney/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mjManualConfig),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMjVerifyFeedback({
          ok: true,
          message: data.message || `Verified Discord channel #${data.channelName || 'connected'}`,
        });
        showToast(`Discord verified: #${data.channelName || 'Channel ready'}`);
      } else {
        setMjVerifyFeedback({
          ok: false,
          message: data.error || 'Discord token or channel verification failed.',
        });
      }
    } catch (err: any) {
      setMjVerifyFeedback({
        ok: false,
        message: err?.message || 'Could not reach Discord verification endpoint.',
      });
    } finally {
      setIsVerifyingMjConfig(false);
    }
  };

  const buildMidjourneyPrompt = () => {
    const base = prompt.trim().replace(/\s+--\w+(\s+[^\s-]+)?/g, '');
    const flags: string[] = [`--ar ${aspectRatio}`, `--v ${mjVersion}`, `--s ${mjStylize}`];
    if (mjChaos > 0) flags.push(`--c ${mjChaos}`);
    if (mjStyleRaw && mjVersion !== 'niji 6') flags.push('--style raw');
    if (negativePrompt.trim()) {
      flags.push(`--no ${negativePrompt.trim()}`);
    }
    return `${base} ${flags.join(' ')}`.trim();
  };

  const showToast = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3500);
  };

  // Switch Studio Mode cleanly and select compatible model
  const handleSelectMode = (mode: StudioGenerationMode) => {
    setStudioMode(mode);
    setGenerationError(null);
    const modeModels = getAvailableModels(mode);
    if (modeModels.length > 0 && !modeModels.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(modeModels[0].id);
      if (modeModels[0].supportedDurations.length > 0) {
        setDuration(modeModels[0].supportedDurations[0]);
      }
    }
  };

  // Upload real image file from user computer to Studio Assets & Source Image
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRef(true);
    setGenerationError(null);

    try {
      const optimized = await uploadAndOptimizeThreadImage(
        file,
        'studio_director',
        `studio_${project.id}`
      );
      const uploadedAsset: StudioAsset = {
        id: `asset-upload-${Date.now()}`,
        projectId: project.id,
        shotId: targetShotId || undefined,
        type: 'REFERENCE',
        title: file.name.replace(/\.[^/.]+$/, ''),
        url: optimized.url,
        thumbnailUrl: optimized.thumbnailUrl || optimized.url,
        resolution: `${optimized.width}x${optimized.height}`,
        fileSizeBytes: optimized.size,
        version: 1,
        createdAt: new Date().toISOString(),
      };
      onAddAsset?.(uploadedAsset);
      setSourceImageUrl(optimized.url);
      setInspectedAsset({
        type: 'IMAGE',
        url: optimized.url,
        thumbnailUrl: optimized.thumbnailUrl || optimized.url,
        title: uploadedAsset.title,
        resolution: '1080p',
      });
      showToast(`Uploaded & optimized ${file.name} (${Math.round(optimized.size / 1024)} KB WebP)`);
    } catch (err: any) {
      setGenerationError(err?.message || 'Failed to upload reference image.');
    } finally {
      setIsUploadingRef(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // AI Prompt Optimization via /api/prompt/optimize
  const handleOptimizePrompt = async () => {
    if (!prompt.trim() || isOptimizingPrompt) return;
    setIsOptimizingPrompt(true);
    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiledPrompt: prompt,
          durationSeconds: duration || 4,
          frameRate: project.frameRate || '24fps',
          aspectRatio,
        }),
      });
      const data = await res.json();
      if (data.optimizedPrompt) {
        setPrompt(data.optimizedPrompt);
        showToast('Prompt enhanced with cinematic lens & lighting directives');
      }
    } catch {
      showToast('Applied local optical prompt refinement');
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const estimatedCost = estimateJobCost(
    selectedModel.id,
    studioMode === 'image-gen' ? 0 : duration
  );

  // Execute Generation (Image Mode or Video Modes)
  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setGenerationError(null);

    if (!selectedModel.isBackendConfigured) {
      setGenerationError(
        selectedModel.unconfiguredReason ||
          `${selectedModel.name} requires server API credentials. Please select a configured model.`
      );
      return;
    }

    if (studioMode === 'image-to-video' && !sourceImageUrl) {
      setGenerationError('Please select or upload a First-Frame Source Image for Image-to-Video mode.');
      return;
    }

    setIsGenerating(true);
    setProgress(10);

    const jobId = `job-${Date.now()}`;
    const targetShot = project.shots.find((s) => s.id === targetShotId);
    const activeChars = project.characters.filter((c) => selectedCharacterIds.includes(c.id));
    const activeLoc = project.locations.find((l) => l.id === selectedLocationId);

    // MODE 5 (or midjourney-v6-discord model): DIRECT DISCORD /IMAGINE API BRIDGE
    if (studioMode === 'midjourney-discord' || selectedModel.id === 'midjourney-v6-discord') {
      const hasManualCredentials =
        Boolean(mjManualConfig.discordToken.trim()) &&
        Boolean(mjManualConfig.guildId.trim()) &&
        Boolean(mjManualConfig.channelId.trim());

      if (!hasManualCredentials && !mjStatus?.configured) {
        setIsGenerating(false);
        setGenerationPhase('ERROR');
        setShowMjEnvEditor(true);
        setGenerationError(
          'Please enter your DISCORD_TOKEN, GUILD_ID, and CHANNEL_ID in the Manual Environment Variables panel before generating with Midjourney.'
        );
        return;
      }

      const compiledMjPrompt = buildMidjourneyPrompt();
      setGenerationPhase('SENDING');
      setCurrentStage('Sending to Discord...');
      setProgress(5);
      setMjPollAttempt(0);

      // Persist & sync any manual environment variable inputs before fetching Midjourney
      await handleSaveMjEnvConfig(true);

      const manualCredentialPayload = {
        discordToken: mjManualConfig.discordToken.trim() || undefined,
        guildId: mjManualConfig.guildId.trim() || undefined,
        channelId: mjManualConfig.channelId.trim() || undefined,
        applicationId: mjManualConfig.applicationId.trim() || undefined,
        commandId: mjManualConfig.commandId.trim() || undefined,
        commandVersion: mjManualConfig.commandVersion.trim() || undefined,
      };

      try {
        let finalImageUrl: string | null = null;

        if (mjBridgeMode === 'single-post') {
          // Uses POST /api/generate while polling GET /api/midjourney/active-status for live backend status
          let fallbackPct = 8;
          const statusTimer = setInterval(async () => {
            try {
              const stRes = await fetch('/api/midjourney/active-status');
              if (stRes.ok) {
                const stData = await stRes.json();
                if (stData && stData.phase && stData.phase !== 'IDLE') {
                  setGenerationPhase(stData.phase);
                  if (typeof stData.attempt === 'number') {
                    setMjPollAttempt(stData.attempt);
                  }
                  const pct =
                    typeof stData.progressPercent === 'number' && stData.progressPercent > 0
                      ? stData.progressPercent
                      : fallbackPct;
                  setProgress(pct);
                  setCurrentStage(
                    stData.statusText || `Midjourney rendering (${pct}%)...`
                  );
                  return;
                }
              }
            } catch {
              // fallback if status check fails
            }
            fallbackPct = Math.min(92, fallbackPct + 6);
            setGenerationPhase('RENDERING');
            setProgress(fallbackPct);
            setCurrentStage(`Midjourney rendering (${fallbackPct}%)...`);
          }, 2500);

          try {
            const response = await fetch('/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: compiledMjPrompt,
                ...manualCredentialPayload,
              }),
            });
            const data = await response.json();
            clearInterval(statusTimer);

            if (!response.ok || (!data.imageUrl && !data.image_url)) {
              throw new Error(data.error || 'Midjourney Discord bridge request failed.');
            }
            finalImageUrl = data.imageUrl || data.image_url;
          } catch (innerErr) {
            clearInterval(statusTimer);
            throw innerErr;
          }
        } else {
          // Live 2-Step Discord Interaction + 5s Poll Loop with real Discord message %
          const triggerAt = Date.now();
          setGenerationPhase('SENDING');
          setCurrentStage('Sending to Discord...');

          const triggerRes = await fetch('/api/midjourney/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: compiledMjPrompt,
              ...manualCredentialPayload,
            }),
          });
          const triggerData = await triggerRes.json();
          if (!triggerRes.ok) {
            throw new Error(triggerData.error || 'Discord /imagine trigger failed.');
          }

          setGenerationPhase('WAITING');
          setCurrentStage('Midjourney rendering (0%)...');
          setProgress(10);

          const maxAttempts = 30;
          let attempts = 0;

          while (!finalImageUrl && attempts < maxAttempts) {
            await new Promise((r) => setTimeout(r, 5000));
            attempts++;
            setMjPollAttempt(attempts);

            const pollRes = await fetch('/api/midjourney/poll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: compiledMjPrompt,
                since: triggerAt,
                attempt: attempts,
                ...manualCredentialPayload,
              }),
            });
            const pollData = await pollRes.json();

            if (!pollRes.ok) {
              throw new Error(pollData.error || 'Discord channel polling failed.');
            }

            if (pollData.status === 'COMPLETED' && (pollData.imageUrl || pollData.image_url)) {
              finalImageUrl = pollData.imageUrl || pollData.image_url;
              break;
            }

            const pct =
              typeof pollData.progressPercent === 'number' && pollData.progressPercent > 0
                ? pollData.progressPercent
                : Math.min(95, Math.round((attempts / maxAttempts) * 90) + 5);
            setGenerationPhase(pollData.status === 'WAITING' ? 'WAITING' : 'RENDERING');
            setProgress(pct);
            setCurrentStage(
              pollData.statusText || `Midjourney rendering (${pct}%)...`
            );
          }

          if (!finalImageUrl) {
            throw new Error(
              'Midjourney timeout after 30 polling attempts (2.5 minutes). Check your Discord channel.'
            );
          }
        }

        setProgress(100);
        setGenerationPhase('COMPLETED');
        setCurrentStage('Midjourney rendering (100%) — Complete');
        setIsGenerating(false);

        const completedJob: GenerationJob = {
          id: jobId,
          projectId: project.id,
          shotId: targetShotId || undefined,
          modelId: 'midjourney-v6-discord',
          modelName: `Midjourney v${mjVersion} (Discord)`,
          prompt: compiledMjPrompt,
          negativePrompt,
          status: 'COMPLETED',
          progress: 100,
          startedAt: Date.now() - 10000,
          completedAt: Date.now(),
          resultUrl: finalImageUrl,
          resultThumbnailUrl: finalImageUrl,
          estimatedCostCredits: estimatedCost,
        };

        let updatedShot: StoryboardShot | undefined;
        if (targetShot) {
          const newVersionNumber = (targetShot.versions?.length || 0) + 1;
          const newVersion: ShotVersion = {
            id: `v-mj-${Date.now()}`,
            versionNumber: newVersionNumber,
            thumbnailUrl: finalImageUrl,
            prompt: compiledMjPrompt,
            model: `Midjourney v${mjVersion}`,
            duration: targetShot.duration,
            createdAt: new Date().toISOString(),
          };
          updatedShot = {
            ...targetShot,
            thumbnailUrl: finalImageUrl,
            currentVersionNumber: newVersionNumber,
            versions: [newVersion, ...(targetShot.versions || [])],
            status: 'COMPLETED',
          };
        }

        const newAsset: StudioAsset = {
          id: `asset-mj-${Date.now()}`,
          projectId: project.id,
          shotId: targetShotId || undefined,
          type: 'IMAGE',
          title: `MJ v${mjVersion} — ${targetShot ? targetShot.title : 'Discord Render'}`,
          url: finalImageUrl,
          thumbnailUrl: finalImageUrl,
          prompt: compiledMjPrompt,
          model: `Midjourney v${mjVersion}`,
          resolution,
          version: updatedShot?.currentVersionNumber || 1,
          createdAt: new Date().toISOString(),
        };

        setInspectedAsset({
          type: 'IMAGE',
          url: finalImageUrl,
          thumbnailUrl: finalImageUrl,
          title: newAsset.title,
          prompt: compiledMjPrompt,
          model: `Midjourney v${mjVersion}`,
          seed,
          aspectRatio,
          resolution,
        });
        setLastGeneratedImage({
          url: finalImageUrl,
          title: newAsset.title,
          prompt: compiledMjPrompt,
          model: `Midjourney v${mjVersion} (Discord)`,
          aspectRatio,
          resolution,
          createdAt: new Date().toLocaleTimeString(),
        });
        setSourceImageUrl(finalImageUrl);
        onJobComplete(completedJob, updatedShot, newAsset);
        showToast('Midjourney Discord render complete & added to Studio Assets');
      } catch (err: any) {
        setIsGenerating(false);
        setGenerationPhase('ERROR');
        setCurrentStage('Generation failed');
        setGenerationError(err?.message || 'Midjourney Discord bridge error.');
      }
      return;
    }

    // MODE 1 (GEMINI DIRECT KEYFRAME SYNTHESIS via /api/prompt/generate-image)
    if (studioMode === 'image-gen' && !selectedModel.posbotModelKey) {
      setGenerationPhase('SENDING');
      setCurrentStage('Sending prompt to Image Synthesis Engine...');
      setProgress(18);

      const stageTimer = setInterval(() => {
        setGenerationPhase('RENDERING');
        setProgress((prev) => {
          const next = Math.min(90, prev + 16);
          setCurrentStage(`Rendering keyframe (${next}%)...`);
          return next;
        });
      }, 600);

      try {
        const response = await fetch('/api/prompt/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            negativePrompt,
            aspectRatio,
            resolution,
            seed,
            modelId: selectedModel.id,
            characterNames: activeChars.map((c) => `${c.name} (${c.appearance})`),
            locationName: activeLoc ? `${activeLoc.name} (${activeLoc.lighting})` : '',
          }),
        });

        clearInterval(stageTimer);
        const data = await response.json();
        if (!response.ok || !data.imageUrl) {
          throw new Error(data.error || 'Image synthesis failed.');
        }

        setProgress(100);
        setGenerationPhase('COMPLETED');
        setCurrentStage('Image generation (100%) — Complete');
        setIsGenerating(false);

        const resultUrl = data.imageUrl;
        const completedJob: GenerationJob = {
          id: jobId,
          projectId: project.id,
          shotId: targetShotId || undefined,
          modelId: selectedModel.id,
          modelName: selectedModel.name,
          prompt,
          negativePrompt,
          status: 'COMPLETED',
          progress: 100,
          startedAt: Date.now() - 2000,
          completedAt: Date.now(),
          resultUrl,
          resultThumbnailUrl: resultUrl,
          estimatedCostCredits: estimatedCost,
        };

        let updatedShot: StoryboardShot | undefined;
        if (targetShot) {
          const newVersionNumber = (targetShot.versions?.length || 0) + 1;
          const newVersion: ShotVersion = {
            id: `v-${Date.now()}`,
            versionNumber: newVersionNumber,
            thumbnailUrl: resultUrl,
            prompt,
            model: selectedModel.name,
            duration: targetShot.duration,
            createdAt: new Date().toISOString(),
          };
          updatedShot = {
            ...targetShot,
            thumbnailUrl: resultUrl,
            currentVersionNumber: newVersionNumber,
            versions: [newVersion, ...(targetShot.versions || [])],
            status: 'COMPLETED',
          };
        }

        const newAsset: StudioAsset = {
          id: `asset-img-${Date.now()}`,
          projectId: project.id,
          shotId: targetShotId || undefined,
          type: 'IMAGE',
          title: `Keyframe — ${targetShot ? targetShot.title : selectedModel.name}`,
          url: resultUrl,
          thumbnailUrl: resultUrl,
          prompt,
          model: selectedModel.name,
          resolution,
          version: updatedShot?.currentVersionNumber || 1,
          createdAt: new Date().toISOString(),
        };

        setInspectedAsset({
          type: 'IMAGE',
          url: resultUrl,
          thumbnailUrl: resultUrl,
          title: newAsset.title,
          prompt,
          model: selectedModel.name,
          seed: data.seed || seed,
          aspectRatio,
          resolution,
        });
        setLastGeneratedImage({
          url: resultUrl,
          title: newAsset.title,
          prompt,
          model: selectedModel.name,
          aspectRatio,
          resolution,
          createdAt: new Date().toLocaleTimeString(),
        });
        setSourceImageUrl(resultUrl);
        onJobComplete(completedJob, updatedShot, newAsset);
        showToast(data.message || 'Generated keyframe & attached to shot version history');
      } catch (err: any) {
        clearInterval(stageTimer);
        setIsGenerating(false);
        setGenerationPhase('ERROR');
        setCurrentStage('Image generation failed');
        setGenerationError(err?.message || 'Image synthesis failed.');
      }
      return;
    }

    // POSBOT DEVELOPER API v1 GENERATION (Image, Image Edit, T2V, I2V, Seedance 2.5 R2V, Motion Control)
    const isStillImageOutput = studioMode === 'image-gen';
    let resolvedPosBotKey = selectedModel.posbotModelKey || selectedModel.id;

    if (selectedModel.id === 'seedance-2.5-ref-video') {
      resolvedPosBotKey =
        duration >= 30
          ? studioMode === 'ref-video'
            ? 'seedance_25_30s_r2v'
            : 'seedance_25_30s'
          : studioMode === 'ref-video'
          ? 'seedance_25_15s_r2v'
          : 'seedance_25_15s';
    } else if (selectedModel.id === 'kling_30_5s') {
      resolvedPosBotKey =
        duration >= 15 ? 'kling_30_15s' : duration >= 10 ? 'kling_30_10s' : 'kling_30_5s';
    } else if (selectedModel.id === 'grok_imagine_2_15s') {
      resolvedPosBotKey = duration >= 30 ? 'grok_imagine_2_30s' : 'grok_imagine_2_15s';
    } else if (selectedModel.id === 'veo-3.1-generate-preview') {
      resolvedPosBotKey =
        studioMode === 'image-to-video' && sourceImageUrl
          ? 'omni_flash_i2v'
          : 'omni_flash_t2v';
    }

    // Validate model-specific required inputs before calling backend
    if (selectedModel.requiresSwapImage && (!sourceImageUrl || !swapImageUrl)) {
      setIsGenerating(false);
      setGenerationPhase('ERROR');
      setGenerationError(
        'Face Swap requires both a Target Base Image URL and a Source Face Image URL (swap_image).'
      );
      return;
    }

    if (selectedModel.requiresVideoUrl && !sourceVideoUrl.trim()) {
      setIsGenerating(false);
      setGenerationPhase('ERROR');
      setGenerationError(
        `${selectedModel.name} requires a Source Video URL (video_url).`
      );
      return;
    }

    // Assemble structured prompt with Character, Location & Vehicle LHD/RHD continuity locks when in Ref-Video / Seedance mode
    let compiledBackendPrompt = prompt.trim();
    if (studioMode === 'ref-video' || resolvedPosBotKey.startsWith('seedance_')) {
      const continuityBlocks: string[] = [];
      if (activeChars.length > 0) {
        continuityBlocks.push(
          `[Character Continuity: ${activeChars
            .map((c) => `${c.name} (${c.appearance}, Wardrobe: ${c.wardrobe})`)
            .join('; ')}]`
        );
      }
      if (activeLoc) {
        continuityBlocks.push(
          `[Location Continuity: ${activeLoc.name} (${activeLoc.timeOfDay}, ${activeLoc.lighting})]`
        );
      }
      if (vehicleLockEnabled && vehicleModelSpec.trim()) {
        const steerSide =
          vehicleDrivingSide === 'RHD'
            ? 'Right-Hand Drive (RHD — steering wheel strictly on right side, driver front-right, passenger front-left)'
            : 'Left-Hand Drive (LHD — steering wheel strictly on left side, driver front-left, passenger front-right)';
        continuityBlocks.push(
          `[Vehicle Continuity Lock: ${vehicleModelSpec.trim()} | Configuration: ${steerSide}]`
        );
      }
      if (continuityBlocks.length > 0) {
        compiledBackendPrompt = `${compiledBackendPrompt}\n${continuityBlocks.join('\n')}`.slice(
          0,
          selectedModel.maxPromptLength || 8000
        );
      }
    }

    const isValidMediaRef = (u?: string) =>
      Boolean(
        u &&
          (u.startsWith('http://') ||
            u.startsWith('https://') ||
            u.startsWith('/uploads/') ||
            u.startsWith('/assets/') ||
            u.startsWith('data:'))
      );

    // Gather reference image URLs when mode uses conditioning
    const includeImageConditioning =
      studioMode === 'image-to-video' ||
      studioMode === 'ref-video' ||
      studioMode === 'image-gen';

    const candidateRefUrls = includeImageConditioning
      ? [
          ...(isValidMediaRef(sourceImageUrl) ? [sourceImageUrl] : []),
          ...extraReferenceUrls.filter(isValidMediaRef),
          ...(studioMode === 'ref-video'
            ? activeChars.flatMap((c) => c.referenceImages || []).filter(isValidMediaRef)
            : []),
        ]
      : [];

    const uniqueRefUrls = Array.from(new Set(candidateRefUrls)).slice(
      0,
      selectedModel.maxReferenceImages || 9
    );

    const generatePayload: Record<string, unknown> = {
      model: resolvedPosBotKey,
      prompt: compiledBackendPrompt,
      aspect_ratio: aspectRatio,
    };

    if (includeImageConditioning && isValidMediaRef(sourceImageUrl)) {
      generatePayload.image_url = sourceImageUrl;
    }
    if (isValidMediaRef(endImageUrl)) {
      generatePayload.end_image_url = endImageUrl;
    }
    if (isValidMediaRef(swapImageUrl)) {
      generatePayload.swap_image = swapImageUrl;
    }
    if (isValidMediaRef(sourceVideoUrl)) {
      generatePayload.video_url = sourceVideoUrl;
    }
    if (uniqueRefUrls.length > 0) {
      generatePayload.reference_image_urls = uniqueRefUrls;
      generatePayload.image_urls = uniqueRefUrls;
    }

    setGenerationPhase('SENDING');
    setCurrentStage(`Submitting to PosBot API (${resolvedPosBotKey})...`);
    setProgress(15);

    try {
      const submitRes = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatePayload),
      });
      const submitData = await submitRes.json();

      if (!submitRes.ok || !submitData.ok || !submitData.job_code) {
        throw new Error(
          submitData.error || `PosBot generation request failed (HTTP ${submitRes.status}).`
        );
      }

      const jobCode: string = submitData.job_code;
      if (typeof submitData.remaining_balance_generate === 'number') {
        setPosbotBalance({
          balance_generate: submitData.remaining_balance_generate,
          balance_idr_equivalent: submitData.remaining_balance_generate * 400,
        });
      }

      setGenerationPhase('RENDERING');
      setProgress(48);
      setCurrentStage(`Rendering Job ${jobCode} (${selectedModel.name})...`);

      let finalResultUrl: string | null =
        submitData.result_url || submitData.outputUrl || null;
      let pollCount = 0;
      const maxPolls = 60;

      if (finalResultUrl) {
        await new Promise((r) => setTimeout(r, 650));
        setProgress(92);
      }

      while (!finalResultUrl && pollCount < maxPolls) {
        await new Promise((r) => setTimeout(r, pollCount === 0 ? 1500 : 4000));
        pollCount++;

        const statusRes = await fetch(`/api/ai/jobs/${encodeURIComponent(jobCode)}`);
        const statusData = await statusRes.json();

        if (!statusRes.ok || !statusData.ok) {
          throw new Error(statusData.error || `Failed while polling job ${jobCode}.`);
        }

        const st = String(statusData.status || 'processing').toLowerCase();
        if (st === 'completed') {
          const outUrl = statusData.result_url || statusData.outputUrl;
          if (!outUrl) {
            throw new Error(`Job ${jobCode} completed without a result_url.`);
          }
          finalResultUrl = outUrl;
          break;
        }

        if (st === 'failed' || st === 'cancelled') {
          throw new Error(
            statusData.error_message ||
              `Job ${jobCode} ${st} on upstream server (100% Generate balance auto-refunded).`
          );
        }

        const pct = Math.min(94, 30 + pollCount * 8);
        setProgress(pct);
        setCurrentStage(
          `${selectedModel.name} ${st} (${jobCode}) — Poll #${pollCount}...`
        );
      }

      if (!finalResultUrl) {
        throw new Error(
          `Job ${jobCode} is still processing on PosBot servers. Check Generation History to refresh when complete.`
        );
      }

      setIsGenerating(false);
      setProgress(100);
      setGenerationPhase('COMPLETED');
      setCurrentStage(`Complete (${jobCode})`);

      const thumbUrl = isStillImageOutput
        ? finalResultUrl
        : sourceImageUrl ||
          targetShot?.thumbnailUrl ||
          'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80';

      const completedJob: GenerationJob = {
        id: `job-${jobCode}`,
        projectId: project.id,
        shotId: targetShotId || undefined,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        prompt: compiledBackendPrompt,
        negativePrompt,
        status: 'COMPLETED',
        progress: 100,
        startedAt: Date.now() - pollCount * 6000,
        completedAt: Date.now(),
        resultUrl: finalResultUrl,
        resultThumbnailUrl: thumbUrl,
        estimatedCostCredits: submitData.cost_generate ?? estimatedCost,
      };

      let updatedShot: StoryboardShot | undefined;
      if (targetShot) {
        const newVersionNumber = (targetShot.versions?.length || 0) + 1;
        const newVersion: ShotVersion = {
          id: `v-${jobCode}`,
          versionNumber: newVersionNumber,
          thumbnailUrl: thumbUrl,
          videoUrl: isStillImageOutput ? targetShot.videoUrl : finalResultUrl,
          prompt: compiledBackendPrompt,
          model: selectedModel.name,
          duration: isStillImageOutput ? targetShot.duration : duration,
          createdAt: new Date().toISOString(),
        };
        updatedShot = {
          ...targetShot,
          thumbnailUrl: thumbUrl,
          videoUrl: isStillImageOutput ? targetShot.videoUrl : finalResultUrl,
          duration: isStillImageOutput ? targetShot.duration : duration,
          currentVersionNumber: newVersionNumber,
          versions: [newVersion, ...(targetShot.versions || [])],
          status: 'COMPLETED',
        };
      }

      const newAsset: StudioAsset = {
        id: `asset-${jobCode}`,
        projectId: project.id,
        shotId: targetShotId || undefined,
        type: isStillImageOutput ? 'IMAGE' : 'VIDEO',
        title: `${isStillImageOutput ? 'Image' : 'Take'} (${jobCode}) — ${selectedModel.name}`,
        url: finalResultUrl,
        thumbnailUrl: thumbUrl,
        duration: isStillImageOutput ? undefined : duration,
        prompt: compiledBackendPrompt,
        model: selectedModel.name,
        resolution,
        version: updatedShot?.currentVersionNumber || 1,
        createdAt: new Date().toISOString(),
      };

      setInspectedAsset({
        type: isStillImageOutput ? 'IMAGE' : 'VIDEO',
        url: finalResultUrl,
        thumbnailUrl: thumbUrl,
        title: newAsset.title,
        prompt: compiledBackendPrompt,
        model: selectedModel.name,
        seed,
        duration: isStillImageOutput ? undefined : duration,
        aspectRatio,
        resolution,
      });

      if (isStillImageOutput) {
        setLastGeneratedImage({
          url: finalResultUrl,
          title: newAsset.title,
          prompt: compiledBackendPrompt,
          model: selectedModel.name,
          aspectRatio,
          resolution,
          createdAt: new Date().toLocaleTimeString(),
        });
        setSourceImageUrl(finalResultUrl);
      }

      onJobComplete(completedJob, updatedShot, newAsset);
      showToast(`PosBot job ${jobCode} completed & added to Studio Assets`);
    } catch (err: any) {
      setIsGenerating(false);
      setGenerationPhase('ERROR');
      setCurrentStage('Generation failed');
      setGenerationError(err?.message || 'Generation request failed.');
    }
  };


  // Context-Sensitive Actions on Active Inspected Result
  const handleSendImageToVideoMode = () => {
    if (!inspectedAsset) return;
    const imgUrl = inspectedAsset.thumbnailUrl || inspectedAsset.url;
    setSourceImageUrl(imgUrl);
    handleSelectMode('image-to-video');
    showToast('Loaded active frame into Image-to-Video source slot');
  };

  const handleInsertInspectedToTimeline = () => {
    if (!inspectedAsset || !onInsertToTimeline) return;
    const lastEnd = project.timelineClips
      .filter((c) => c.trackType === 'VIDEO')
      .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
    const clipDur = inspectedAsset.duration || duration || 4;
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      shotId: targetShotId || undefined,
      trackId: 'track-v1',
      trackType: 'VIDEO',
      title: inspectedAsset.title,
      mediaUrl:
        inspectedAsset.type === 'VIDEO'
          ? inspectedAsset.url
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: inspectedAsset.thumbnailUrl || inspectedAsset.url,
      startTime: lastEnd,
      duration: clipDur,
      inPoint: 0,
      outPoint: clipDur,
      volume: 1,
    };
    onInsertToTimeline(newClip);
    showToast(`Appended "${inspectedAsset.title}" to Timeline V1 at ${lastEnd.toFixed(1)}s`);
  };

  const handleAttachInspectedToCharacter = () => {
    if (!inspectedAsset || !onAttachToCharacterRef) return;
    const targetCharId = selectedCharacterIds[0] || project.characters[0]?.id;
    if (!targetCharId) return;
    const imgUrl = inspectedAsset.thumbnailUrl || inspectedAsset.url;
    onAttachToCharacterRef(targetCharId, imgUrl);
    const charName = project.characters.find((c) => c.id === targetCharId)?.name || 'Character';
    showToast(`Added reference frame to ${charName}`);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#06060A] overflow-hidden select-none">
      {/*Hidden File Input for Direct Studio Reference / Asset Uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadFile}
        className="hidden"
      />

      {/* TOP STUDIO MODE SWITCHER & WORKSPACE CONTROLS BAR */}
      <div className="h-11 px-3 sm:px-4 bg-[#09090E] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        {/* Left: Panel Toggle + 4 Separate Studio Modes */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setIsLeftOpen(!isLeftOpen)}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
            title={isLeftOpen ? 'Collapse Left Asset Dock' : 'Expand Left Asset Dock'}
          >
            {isLeftOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1 shrink-0" />

          {STUDIO_MODES.map((m) => {
            const active = studioMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMode(m.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  active
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_16px_rgba(34,211,238,0.3)]'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] text-white/65 hover:text-white border border-white/10'
                }`}
                title={m.description}
              >
                {m.id === 'image-gen' ? (
                  <ImageIcon className="w-3 h-3" />
                ) : m.id === 'ref-video' ? (
                  <Layers className="w-3 h-3" />
                ) : (
                  <Film className="w-3 h-3" />
                )}
                <span className="hidden md:inline">{m.label}</span>
                <span className="md:hidden">{m.shortLabel}</span>
              </button>
            );
          })}

          {onOpenVaiu && (
            <button
              onClick={onOpenVaiu}
              className="px-2.5 py-1 rounded text-[11px] font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 hover:from-cyan-500/35 hover:to-emerald-500/35 text-cyan-200 border border-cyan-400/40 font-bold shadow-[0_0_12px_rgba(34,211,238,0.2)]"
              title="Open VAIU — Seedance 2.5 Exclusive Multimodal Prompt Architect"
            >
              <Wand2 className="w-3 h-3 text-cyan-300" />
              <span className="hidden md:inline">6. VAIU (Seedance 2.5 Prompt)</span>
              <span className="md:hidden">VAIU 2.5</span>
            </button>
          )}
        </div>

        {/* Center/Right: Status Toast + Canvas Zoom Controls + Right Panel Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {statusNotice && (
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 animate-silk-fade">
              <CheckCircle2 className="w-3 h-3" />
              <span>{statusNotice}</span>
            </span>
          )}

          <div className="hidden sm:flex items-center gap-1 bg-black/50 border border-white/10 rounded px-1.5 py-0.5">
            <button
              onClick={() => setCanvasZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
              className="p-1 text-white/60 hover:text-white cursor-pointer"
              title="Zoom Out Canvas"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono text-white/80 min-w-[38px] text-center">
              {Math.round(canvasZoom * 100)}%
            </span>
            <button
              onClick={() => setCanvasZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
              className="p-1 text-white/60 hover:text-white cursor-pointer"
              title="Zoom In Canvas"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setCanvasZoom(1);
                setCanvasPan({ x: 0, y: 0 });
              }}
              className="p-1 text-white/50 hover:text-cyan-300 text-[9px] font-mono cursor-pointer"
              title="Reset Fit"
            >
              FIT
            </button>
          </div>

          <button
            onClick={() => setIsRightOpen(!isRightOpen)}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title={isRightOpen ? 'Collapse Right Properties Panel' : 'Expand Right Properties Panel'}
          >
            {isRightOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* MAIN 3-COLUMN STUDIO BODY */}
      <div className="flex-1 relative flex min-h-0 overflow-hidden">
        {/* Mobile Backdrop for Left/Right Drawers */}
        {(isLeftOpen || isRightOpen) && (
          <div
            onClick={() => {
              setIsLeftOpen(false);
              setIsRightOpen(false);
            }}
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
          />
        )}

        {/* 1. LEFT COLLAPSIBLE ASSET & REFERENCE DOCK (Drawer on <1024px, Sidebar on >=1024px) */}
        {isLeftOpen && (
          <aside className="fixed lg:static inset-y-0 left-0 z-40 w-72 sm:w-80 lg:w-64 bg-[#09090D] border-r border-white/15 flex flex-col shrink-0 shadow-2xl lg:shadow-none">
            {/* Mobile Drawer Header */}
            <div className="flex lg:hidden items-center justify-between px-3 py-2.5 border-b border-white/10 bg-black/50">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                Assets & References
              </span>
              <button
                onClick={() => setIsLeftOpen(false)}
                className="px-2 py-1 rounded bg-white/10 text-[10px] font-mono text-white"
              >
                Done
              </button>
            </div>
            {/* Sub-navigation tabs */}
            <div className="grid grid-cols-3 border-b border-white/10 bg-black/30 text-[10px] font-mono">
              {(['ASSETS', 'CHARACTERS', 'SHOTS'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`py-2.5 text-center transition-colors cursor-pointer ${
                    leftTab === tab
                      ? 'text-cyan-400 font-bold border-b-2 border-cyan-400 bg-white/[0.03]'
                      : 'text-white/45 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Direct Upload Button */}
            <div className="p-2.5 border-b border-white/10">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingRef}
                className="w-full py-1.5 px-3 rounded bg-white/[0.06] hover:bg-white/15 border border-white/15 text-white font-mono text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Upload className="w-3 h-3 text-cyan-400" />
                <span>{isUploadingRef ? 'Optimizing WebP...' : 'Upload Image / Ref'}</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 no-scrollbar">
              {leftTab === 'ASSETS' &&
                project.assets.map((asset) => {
                  const isSelected = inspectedAsset?.url === asset.url;
                  const thumb = asset.thumbnailUrl || asset.url;
                  return (
                    <div
                      key={asset.id}
                      onClick={() =>
                        setInspectedAsset({
                          type: asset.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                          url: asset.url,
                          thumbnailUrl: thumb,
                          title: asset.title,
                          prompt: asset.prompt,
                          model: asset.model,
                          duration: asset.duration,
                        })
                      }
                      className={`group p-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/20'
                          : 'border-white/10 hover:border-white/25 bg-black/30'
                      }`}
                    >
                      <div className="relative aspect-video rounded bg-black overflow-hidden mb-1.5">
                        <img src={thumb} alt={asset.title} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/80 text-[8px] font-mono text-cyan-300">
                          {asset.type}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-white font-bold truncate">
                        {asset.title}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] font-mono text-white/40 truncate">
                          {asset.model || asset.resolution || 'Studio Asset'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSourceImageUrl(thumb);
                            showToast(`Set "${asset.title}" as Source Reference`);
                          }}
                          className="text-[9px] font-mono text-cyan-400 hover:underline"
                        >
                          Use as Ref
                        </button>
                      </div>
                    </div>
                  );
                })}

              {leftTab === 'CHARACTERS' &&
                project.characters.map((char) => {
                  const isBound = selectedCharacterIds.includes(char.id);
                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        setSelectedCharacterIds((prev) =>
                          prev.includes(char.id)
                            ? prev.filter((id) => id !== char.id)
                            : [...prev, char.id]
                        );
                      }}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isBound
                          ? 'border-cyan-400 bg-cyan-950/25'
                          : 'border-white/10 hover:border-white/20 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={char.referenceImages[0]}
                          alt={char.name}
                          className="w-9 h-9 rounded-full object-cover border border-white/20 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-mono font-bold text-white truncate">
                            {char.name}
                          </div>
                          <div className="text-[10px] font-sans text-white/50 truncate">
                            {char.wardrobe}
                          </div>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${
                            isBound
                              ? 'bg-cyan-400 text-black font-bold'
                              : 'bg-white/10 text-white/50'
                          }`}
                        >
                          {isBound ? 'ACTIVE' : 'BIND'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {leftTab === 'SHOTS' &&
                project.shots.map((s) => {
                  const isTarget = s.id === targetShotId;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setTargetShotId(s.id);
                        setPrompt(s.prompt);
                        setDuration(s.duration);
                        setSourceImageUrl(s.thumbnailUrl);
                        setInspectedAsset({
                          type: s.videoUrl ? 'VIDEO' : 'IMAGE',
                          url: s.videoUrl || s.thumbnailUrl,
                          thumbnailUrl: s.thumbnailUrl,
                          title: `Shot ${String(s.shotNumber).padStart(2, '0')}: ${s.title}`,
                          prompt: s.prompt,
                          duration: s.duration,
                        });
                      }}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isTarget
                          ? 'border-cyan-400 bg-cyan-950/25'
                          : 'border-white/10 hover:border-white/20 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={s.thumbnailUrl}
                          alt={s.title}
                          className="w-14 h-9 rounded object-cover border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-mono font-bold text-white truncate">
                            #{String(s.shotNumber).padStart(2, '0')} {s.title}
                          </div>
                          <div className="text-[9px] font-mono text-white/40">
                            {s.duration}s · v{s.currentVersionNumber}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </aside>
        )}

        {/* 2. CENTRAL INTERACTIVE GENERATION CANVAS & BOTTOM STRIP */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#050508] overflow-hidden">
          {/* Interactive Zoom/Pan Viewport (Mouse + Touch Pan & Pinch-to-Zoom) */}
          <div
            data-no-slide-swipe="true"
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              setIsDraggingCanvas(true);
              dragStartRef.current = { x: e.clientX - canvasPan.x, y: e.clientY - canvasPan.y };
            }}
            onMouseMove={(e) => {
              if (!isDraggingCanvas) return;
              setCanvasPan({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y,
              });
            }}
            onMouseUp={() => setIsDraggingCanvas(false)}
            onMouseLeave={() => setIsDraggingCanvas(false)}
            onTouchStart={(e) => {
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                pinchDistRef.current = Math.hypot(dx, dy);
              } else if (e.touches.length === 1) {
                setIsDraggingCanvas(true);
                dragStartRef.current = {
                  x: e.touches[0].clientX - canvasPan.x,
                  y: e.touches[0].clientY - canvasPan.y,
                };
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length === 2 && pinchDistRef.current !== null) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                const scaleDelta = dist / pinchDistRef.current;
                pinchDistRef.current = dist;
                setCanvasZoom((z) => Math.min(2.4, Math.max(0.5, Number((z * scaleDelta).toFixed(2)))));
              } else if (e.touches.length === 1 && isDraggingCanvas) {
                setCanvasPan({
                  x: e.touches[0].clientX - dragStartRef.current.x,
                  y: e.touches[0].clientY - dragStartRef.current.y,
                });
              }
            }}
            onTouchEnd={() => {
              setIsDraggingCanvas(false);
              pinchDistRef.current = null;
            }}
            className="relative flex-1 flex items-center justify-center overflow-hidden p-3 sm:p-6 cursor-grab active:cursor-grabbing touch-none"
          >
            {/* Subtle Studio Optical Grid Background */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.22) 1px, transparent 0)',
                backgroundSize: '24px 24px',
              }}
            />

            {/* Active Generation Progress Overlay */}
            {isGenerating && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 py-3 rounded-xl border border-cyan-500/40 bg-[#09090F]/95 backdrop-blur-md shadow-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                  <span className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span className="truncate">{currentStage}</span>
                  </span>
                  <span className="font-bold">{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Canvas Frame Stage */}
            <div
              style={{
                transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                transition: isDraggingCanvas ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`relative rounded-xl border border-white/15 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.85)] overflow-hidden flex items-center justify-center ${
                aspectRatio === '9:16'
                  ? 'h-[85%] aspect-[9/16]'
                  : aspectRatio === '1:1'
                  ? 'h-[82%] aspect-square'
                  : 'w-full max-w-3xl aspect-video'
              }`}
            >
              {inspectedAsset ? (
                inspectedAsset.type === 'VIDEO' ? (
                  <video
                    key={inspectedAsset.url}
                    src={inspectedAsset.url}
                    poster={inspectedAsset.thumbnailUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={inspectedAsset.url}
                    alt={inspectedAsset.title}
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <div className="text-center p-8 space-y-2">
                  <Sparkles className="w-10 h-10 text-cyan-400/40 mx-auto" />
                  <div className="text-white/70 font-mono text-xs uppercase tracking-wider">
                    VAIURE Synthesis Canvas Ready
                  </div>
                  <p className="text-white/40 font-sans text-xs max-w-xs">
                    Select a studio mode, configure your prompt or reference frame, and run generation.
                  </p>
                </div>
              )}

              {/* Optional Reference Split Comparison Overlay */}
              {compareRefOverlay && sourceImageUrl && (
                <div className="absolute inset-y-0 left-0 w-1/2 border-r-2 border-cyan-400 overflow-hidden bg-black/90">
                  <img
                    src={sourceImageUrl}
                    alt="Source Reference"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
                    SOURCE REFERENCE
                  </span>
                </div>
              )}

              {/* Top-Right Frame Telemetry Badge */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/70 flex items-center gap-2 pointer-events-none">
                <span>{aspectRatio}</span>
                <span>·</span>
                <span>{resolution}</span>
                {inspectedAsset?.model && (
                  <>
                    <span>·</span>
                    <span className="text-cyan-300">{inspectedAsset.model}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CENTRAL INTERACTIVE IMAGE GENERATION & MIDJOURNEY COMMAND DECK (Always visible in Image Gen / Midjourney modes) */}
          {(studioMode === 'image-gen' ||
            studioMode === 'midjourney-discord' ||
            selectedModel.id === 'midjourney-v6-discord') && (
            <div
              data-no-slide-swipe="true"
              className="px-3 sm:px-5 py-3 bg-[#090A10] border-t border-cyan-500/25 space-y-2.5 shrink-0"
            >
              {/* Top Row: Engine Tabs + Aspect Ratio + Env Config Toggle */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectMode('image-gen')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      studioMode === 'image-gen' && selectedModel.id !== 'midjourney-v6-discord'
                        ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                        : 'bg-white/[0.05] text-white/70 hover:text-white border border-white/10'
                    }`}
                  >
                    <ImageIcon className="w-3 h-3" />
                    <span>Studio Image Gen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMode('midjourney-discord')}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      studioMode === 'midjourney-discord' ||
                      selectedModel.id === 'midjourney-v6-discord'
                        ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                        : 'bg-white/[0.05] text-white/70 hover:text-white border border-white/10'
                    }`}
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Midjourney Discord (/imagine)</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Aspect Ratio Quick Pills */}
                  <div className="flex items-center gap-1 bg-black/50 border border-white/10 rounded p-0.5">
                    {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatio(ar)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          aspectRatio === ar
                            ? 'bg-cyan-500 text-black font-bold'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>

                  {/* Midjourney Version & Env Toggle when in Midjourney mode */}
                  {(studioMode === 'midjourney-discord' ||
                    selectedModel.id === 'midjourney-v6-discord') && (
                    <>
                      <select
                        value={mjVersion}
                        onChange={(e) => setMjVersion(e.target.value as any)}
                        className="px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-cyan-300"
                        title="Midjourney Model Version (--v)"
                      >
                        <option value="6.1">--v 6.1</option>
                        <option value="6.0">--v 6.0</option>
                        <option value="niji 6">--niji 6</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowMjEnvEditor((prev) => !prev)}
                        className={`px-2.5 py-1 rounded border text-[10px] font-mono flex items-center gap-1 cursor-pointer ${
                          mjStatus?.configured ||
                          (mjManualConfig.discordToken.trim() &&
                            mjManualConfig.guildId.trim() &&
                            mjManualConfig.channelId.trim())
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <Key className="w-3 h-3" />
                        <span>
                          {mjStatus?.configured ||
                          (mjManualConfig.discordToken.trim() &&
                            mjManualConfig.guildId.trim() &&
                            mjManualConfig.channelId.trim())
                            ? 'Discord Env Ready'
                            : 'Set Discord Env Vars'}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Inline Manual Discord Environment Variables Drawer (when toggled in central deck) */}
              {(studioMode === 'midjourney-discord' ||
                selectedModel.id === 'midjourney-v6-discord') &&
                showMjEnvEditor && (
                  <div className="p-2.5 rounded-lg bg-black/75 border border-cyan-500/30 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-white/60 block">
                        DISCORD_TOKEN *
                      </label>
                      <input
                        type={showDiscordToken ? 'text' : 'password'}
                        value={mjManualConfig.discordToken}
                        onChange={(e) =>
                          setMjManualConfig((prev) => ({
                            ...prev,
                            discordToken: e.target.value,
                          }))
                        }
                        placeholder="Paste Discord user token..."
                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-white/60 block">
                        GUILD_ID (or Channel URL) *
                      </label>
                      <input
                        type="text"
                        value={mjManualConfig.guildId}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.includes('discord.com/channels/')) {
                            handleDiscordChannelUrlParse(val);
                          } else {
                            setMjManualConfig((prev) => ({ ...prev, guildId: val }));
                          }
                        }}
                        placeholder="Server ID or paste channel URL..."
                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono uppercase text-white/60 block">
                        CHANNEL_ID *
                      </label>
                      <input
                        type="text"
                        value={mjManualConfig.channelId}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          if (val.includes('discord.com/channels/')) {
                            handleDiscordChannelUrlParse(val);
                          } else {
                            setMjManualConfig((prev) => ({ ...prev, channelId: val }));
                          }
                        }}
                        placeholder="Discord Channel ID..."
                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveMjEnvConfig(false)}
                        disabled={isSavingMjConfig}
                        className="flex-1 py-1.5 px-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[10px] font-mono text-cyan-200 font-semibold cursor-pointer"
                      >
                        {isSavingMjConfig ? 'Saving...' : 'Save Env'}
                      </button>
                      <button
                        type="button"
                        onClick={handleVerifyMjConnection}
                        disabled={isVerifyingMjConfig}
                        className="flex-1 py-1.5 px-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10px] font-mono text-emerald-200 font-semibold cursor-pointer"
                      >
                        {isVerifyingMjConfig ? 'Testing...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}

              {/* Prompt Input + Primary Generate Action Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="Enter cinematic image prompt or Midjourney /imagine description..."
                    className="w-full pl-3 pr-24 py-2 rounded-lg bg-black/70 border border-white/15 focus:border-cyan-400 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizingPrompt}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Wand2 className="w-2.5 h-2.5" />
                    <span>{isOptimizingPrompt ? '...' : 'Enhance'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>
                    {isGenerating
                      ? currentStage || `Midjourney rendering (${progress}%)...`
                      : studioMode === 'midjourney-discord' ||
                        selectedModel.id === 'midjourney-v6-discord'
                      ? 'Send /imagine to Discord'
                      : 'Generate Image'}
                  </span>
                </button>
              </div>

              {/* Dynamic Backend Polling Status Indicator Bar */}
              {(isGenerating || generationPhase !== 'IDLE') && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-black/60 border border-cyan-500/30 text-[10px] font-mono">
                  <div className="flex items-center gap-2 min-w-0">
                    {isGenerating ? (
                      <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                    ) : generationPhase === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    <span className="text-white font-semibold truncate">
                      {currentStage ||
                        (generationPhase === 'SENDING'
                          ? 'Sending to Discord...'
                          : `Midjourney rendering (${progress}%)...`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(studioMode === 'midjourney-discord' ||
                      selectedModel.id === 'midjourney-v6-discord') &&
                      isGenerating && (
                        <span className="text-white/50 tabular-nums">
                          Poll {mjPollAttempt}/30 (5s)
                        </span>
                      )}
                    <span className="text-cyan-300 font-bold tabular-nums">{progress}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTEXT-SENSITIVE EDITING & PIPELINE ACTION BAR */}
          <div className="h-11 px-4 bg-[#09090D] border-t border-white/10 flex items-center justify-between gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono font-bold text-white truncate max-w-[200px]">
                {inspectedAsset?.title || 'No Active Output'}
              </span>
              {sourceImageUrl && (
                <button
                  onClick={() => setCompareRefOverlay(!compareRefOverlay)}
                  className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 border transition-colors cursor-pointer ${
                    compareRefOverlay
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-white/[0.04] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <SplitSquareVertical className="w-3 h-3" />
                  <span>Compare Ref</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {inspectedAsset && (
                <>
                  <button
                    onClick={handleSendImageToVideoMode}
                    className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 hover:text-white flex items-center gap-1 cursor-pointer"
                    title="Use current frame as Source Image for Image-to-Video"
                  >
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                    <span>Use as First Frame</span>
                  </button>

                  {onAttachToCharacterRef && (
                    <button
                      onClick={handleAttachInspectedToCharacter}
                      className="px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[10px] font-mono text-white/80 hover:text-white flex items-center gap-1 cursor-pointer"
                      title="Save frame to active Character's Reference Library"
                    >
                      <User className="w-3 h-3 text-cyan-400" />
                      <span>Save to Character Ref</span>
                    </button>
                  )}

                  {onInsertToTimeline && (
                    <button
                      onClick={handleInsertInspectedToTimeline}
                      className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Insert to Timeline</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(inspectedAsset.url);
                      showToast('Copied CDN image URL to clipboard');
                    }}
                    className="px-2 py-1 rounded bg-white/[0.05] hover:bg-white/15 border border-white/10 text-[10px] font-mono text-white/80 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                    title="Copy CDN Image Link"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span className="hidden sm:inline">Copy Link</span>
                  </button>

                  <a
                    href={inspectedAsset.url}
                    download={`${inspectedAsset.title.replace(/\s+/g, '_')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded bg-white/[0.05] hover:bg-white/15 border border-white/10 text-white/70 hover:text-white transition-colors"
                    title="Download Master"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </>
              )}

              <button
                onClick={() => setIsBottomOpen(!isBottomOpen)}
                className="p-1.5 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-white/60 hover:text-white cursor-pointer"
                title={isBottomOpen ? 'Collapse History Strip' : 'Expand History Strip'}
              >
                {isBottomOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* BOTTOM COLLAPSIBLE GENERATION HISTORY & VERSION STRIP */}
          {isBottomOpen && (
            <div className="h-32 bg-[#08080C] border-t border-white/10 p-2.5 flex flex-col shrink-0">
              <div className="flex items-center justify-between mb-1.5 px-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                  Generation History & Project Outputs ({project.assets.length})
                </span>
                <span className="text-[10px] font-mono text-white/40">
                  {project.generationQueue.length} Logged Tasks
                </span>
              </div>
              <div className="flex-1 flex items-center gap-2.5 overflow-x-auto no-scrollbar">
                {project.assets.map((asset) => {
                  const active = inspectedAsset?.url === asset.url;
                  const thumb = asset.thumbnailUrl || asset.url;
                  return (
                    <div
                      key={asset.id}
                      onClick={() =>
                        setInspectedAsset({
                          type: asset.type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                          url: asset.url,
                          thumbnailUrl: thumb,
                          title: asset.title,
                          prompt: asset.prompt,
                          model: asset.model,
                          duration: asset.duration,
                        })
                      }
                      className={`relative w-32 h-20 rounded-lg overflow-hidden border shrink-0 cursor-pointer transition-all group ${
                        active
                          ? 'border-cyan-400 ring-1 ring-cyan-400'
                          : 'border-white/15 hover:border-white/35'
                      }`}
                    >
                      <img src={thumb} alt={asset.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-1.5 flex items-center justify-between">
                        <span className="text-[9px] font-mono text-white truncate max-w-[85px]">
                          {asset.title}
                        </span>
                        <span className="text-[8px] font-mono text-cyan-300">
                          {asset.type === 'VIDEO' ? `${asset.duration || 4}s` : 'IMG'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* MOBILE THUMB-REACH STUDIO CONTROL BAR (< 1024px) */}
          <div className="lg:hidden px-3 py-2 bg-[#0B0C12] border-t border-white/15 flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={() => {
                setIsRightOpen(false);
                setIsLeftOpen(!isLeftOpen);
              }}
              className={`min-h-[42px] px-3 rounded-lg border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer touch-press ${
                isLeftOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-white/[0.05] border-white/15 text-white/80'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Assets ({project.assets.length})</span>
            </button>

            <button
              onClick={() => {
                setIsLeftOpen(false);
                setIsRightOpen(!isRightOpen);
              }}
              className={`min-h-[42px] px-3 rounded-lg border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer touch-press ${
                isRightOpen
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-white/[0.05] border-white/15 text-white/80'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Prompt & Params</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="min-h-[42px] flex-1 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md cursor-pointer touch-press disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black shrink-0" />
              <span className="truncate">
                {isGenerating
                  ? `${progress}%`
                  : studioMode === 'image-gen'
                  ? 'Generate Img'
                  : 'Generate Video'}
              </span>
            </button>
          </div>
        </div>

        {/* 3. RIGHT COLLAPSIBLE PROPERTIES & GENERATION SETTINGS PANEL (Bottom Sheet / Drawer on <1024px) */}
        {isRightOpen && (
          <aside className="fixed lg:static inset-x-0 bottom-0 lg:inset-auto z-40 max-h-[82vh] lg:max-h-none w-full lg:w-96 bg-[#09090D] border-t lg:border-t-0 lg:border-l border-white/15 rounded-t-2xl lg:rounded-none flex flex-col shrink-0 overflow-y-auto p-4 pb-safe space-y-4 no-scrollbar shadow-2xl lg:shadow-none animate-sheet-up lg:animate-none">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  {STUDIO_MODES.find((m) => m.id === studioMode)?.shortLabel} Settings
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                  {posbotBalance
                    ? `${posbotBalance.balance_generate} GEN`
                    : posbotHealth?.serverKeyConfigured
                    ? 'API READY'
                    : 'READY'}
                </span>
                <button
                  onClick={() => setIsRightOpen(false)}
                  className="lg:hidden px-2 py-1 rounded bg-white/10 text-[10px] font-mono text-white"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Target Storyboard Shot Binding */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-white/50">
                Target Storyboard Shot
              </label>
              <select
                value={targetShotId}
                onChange={(e) => {
                  const shotId = e.target.value;
                  setTargetShotId(shotId);
                  const found = project.shots.find((s) => s.id === shotId);
                  if (found) {
                    setPrompt(found.prompt);
                    setDuration(found.duration);
                    setSourceImageUrl(found.thumbnailUrl);
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                {project.shots.map((s) => (
                  <option key={s.id} value={s.id}>
                    Shot {String(s.shotNumber).padStart(2, '0')}: {s.title} ({s.duration}s)
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Synthesis Model
                </label>
                <span className="text-[9px] font-mono text-cyan-400">
                  {selectedModel.provider}
                </span>
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 no-scrollbar">
                {availableModels.map((m) => {
                  const isSelected = m.id === selectedModel.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedModelId(m.id);
                        if (
                          m.supportedDurations.length > 0 &&
                          !m.supportedDurations.includes(duration)
                        ) {
                          setDuration(m.supportedDurations[0]);
                        }
                      }}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/30 ring-1 ring-cyan-400/50'
                          : 'border-white/10 hover:border-white/20 bg-black/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-white">{m.name}</span>
                        <div className="flex items-center gap-1">
                          {typeof m.flatGenerateCost === 'number' && (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300">
                              {m.flatGenerateCost} GEN
                            </span>
                          )}
                          {m.isBackendConfigured ? (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                              KEY REQ
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] font-sans text-white/50 mt-1 leading-snug">
                        {m.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MODEL-SPECIFIC MEDIA FIELDS (Face Swap, Kling End Frame, Motion Video URL, Multi-Refs) */}
            {(selectedModel.requiresSwapImage ||
              selectedModel.supportsEndFrameImage ||
              selectedModel.requiresVideoUrl ||
              selectedModel.id === 'upscale_4k') && (
              <div className="p-3 rounded-lg border border-cyan-500/30 bg-black/40 space-y-2.5">
                <div className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                  Model Media Inputs ({selectedModel.name})
                </div>

                {(selectedModel.requiresSwapImage || selectedModel.id === 'upscale_4k') && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-white/60">
                      Target Base Image URL (image_url) *
                    </label>
                    <input
                      type="url"
                      value={sourceImageUrl}
                      onChange={(e) => setSourceImageUrl(e.target.value)}
                      placeholder="https://example.com/base-image.jpg"
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    />
                  </div>
                )}

                {selectedModel.requiresSwapImage && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-white/60">
                      Source Face Image URL (swap_image) *
                    </label>
                    <input
                      type="url"
                      value={swapImageUrl}
                      onChange={(e) => setSwapImageUrl(e.target.value)}
                      placeholder="https://example.com/source-face.jpg"
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    />
                  </div>
                )}

                {selectedModel.supportsEndFrameImage && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-white/60">
                      End-Frame Keyframe URL (end_image_url — Optional)
                    </label>
                    <input
                      type="url"
                      value={endImageUrl}
                      onChange={(e) => setEndImageUrl(e.target.value)}
                      placeholder="https://example.com/end-frame.jpg"
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    />
                  </div>
                )}

                {selectedModel.requiresVideoUrl && (
                  <div className="space-y-1">
                    <label className="block text-[9px] font-mono text-white/60">
                      Source / Motion Reference Video URL (video_url) *
                    </label>
                    <input
                      type="url"
                      value={sourceVideoUrl}
                      onChange={(e) => setSourceVideoUrl(e.target.value)}
                      placeholder="https://example.com/reference-motion.mp4"
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    />
                  </div>
                )}
              </div>
            )}

            {/* MODE-SPECIFIC CONDITIONING: Source Image for Image-to-Video & Reference Generation */}
            {(studioMode === 'image-to-video' || studioMode === 'ref-video') && (
              <div className="p-3 rounded-lg border border-white/10 bg-black/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                    {studioMode === 'image-to-video'
                      ? 'First-Frame Source Image'
                      : 'Reference Conditioning'}
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[10px] font-mono text-white/70 hover:text-white underline cursor-pointer"
                  >
                    Upload New
                  </button>
                </div>

                {sourceImageUrl ? (
                  <div className="flex items-center gap-2.5">
                    <img
                      src={sourceImageUrl}
                      alt="Source Frame"
                      className="w-16 h-11 rounded object-cover border border-cyan-400/50 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <input
                        type="url"
                        value={sourceImageUrl}
                        onChange={(e) => setSourceImageUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-white mb-0.5"
                      />
                      <div className="text-[9px] font-mono text-white/50">
                        Source keyframe locked for synthesis.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={sourceImageUrl}
                      onChange={(e) => setSourceImageUrl(e.target.value)}
                      placeholder="Paste public https:// image URL or select asset..."
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    />
                  </div>
                )}

                {/* Multi-Image Reference URLs (up to 9 for Seedance 2.5) */}
                {selectedModel.maxReferenceImages && selectedModel.maxReferenceImages > 1 && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[9px] font-mono text-white/50">
                      <span>Additional Reference URLs ({extraReferenceUrls.length})</span>
                      <span>Max {selectedModel.maxReferenceImages}</span>
                    </div>
                    <div className="flex gap-1">
                      <input
                        type="url"
                        value={newRefUrlInput}
                        onChange={(e) => setNewRefUrlInput(e.target.value)}
                        placeholder="https://example.com/ref.jpg"
                        className="flex-1 px-2 py-1 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const u = newRefUrlInput.trim();
                          if (u && /^https?:\/\//i.test(u) && !extraReferenceUrls.includes(u)) {
                            setExtraReferenceUrls([...extraReferenceUrls, u]);
                            setNewRefUrlInput('');
                          }
                        }}
                        className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/40 text-[9px] font-mono text-cyan-300 cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                    {extraReferenceUrls.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {extraReferenceUrls.map((u, idx) => (
                          <span
                            key={u + idx}
                            onClick={() =>
                              setExtraReferenceUrls(extraReferenceUrls.filter((_, i) => i !== idx))
                            }
                            className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-cyan-200 cursor-pointer"
                            title="Click to remove"
                          >
                            Ref #{idx + 2} ×
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {studioMode === 'ref-video' && (
                  <div className="pt-2 border-t border-white/10 space-y-1.5">
                    <div className="text-[9px] font-mono uppercase text-white/40">
                      Bound Characters ({selectedCharacterIds.length}) & Location
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {project.characters.map((c) => {
                        const active = selectedCharacterIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() =>
                              setSelectedCharacterIds((prev) =>
                                prev.includes(c.id)
                                  ? prev.filter((id) => id !== c.id)
                                  : [...prev, c.id]
                              )
                            }
                            className={`px-2 py-0.5 rounded text-[9px] font-mono border transition-colors cursor-pointer ${
                              active
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                : 'bg-black/40 border-white/10 text-white/50'
                            }`}
                          >
                            @{c.name}
                          </button>
                        );
                      })}
                    </div>
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="w-full px-2 py-1 rounded bg-black/50 border border-white/10 text-[10px] font-mono text-white/80"
                    >
                      {project.locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          Location: {loc.name} ({loc.timeOfDay})
                        </option>
                      ))}
                    </select>

                    {/* Vehicle LHD / RHD Continuity Lock */}
                    <div className="pt-1.5 border-t border-white/10 space-y-1.5">
                      <label className="flex items-center justify-between text-[9px] font-mono text-white/70 cursor-pointer">
                        <span>Vehicle LHD/RHD Continuity Lock</span>
                        <input
                          type="checkbox"
                          checked={vehicleLockEnabled}
                          onChange={(e) => setVehicleLockEnabled(e.target.checked)}
                          className="accent-cyan-400"
                        />
                      </label>
                      {vehicleLockEnabled && (
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            {(['LHD', 'RHD'] as const).map((side) => (
                              <button
                                key={side}
                                type="button"
                                onClick={() => setVehicleDrivingSide(side)}
                                className={`flex-1 py-0.5 rounded text-[9px] font-mono border cursor-pointer ${
                                  vehicleDrivingSide === side
                                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                                    : 'bg-black/40 border-white/10 text-white/50'
                                }`}
                              >
                                {side === 'LHD' ? 'LHD (Steering Left)' : 'RHD (Steering Right)'}
                              </button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={vehicleModelSpec}
                            onChange={(e) => setVehicleModelSpec(e.target.value)}
                            placeholder="Vehicle make, paint, wheels, cabin details..."
                            className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 text-[10px] font-mono text-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MIDJOURNEY DISCORD API BRIDGE CONSOLE (Shown in Midjourney Mode or when Midjourney model is selected) */}
            {(studioMode === 'midjourney-discord' || selectedModel.id === 'midjourney-v6-discord') && (
              <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
                      Discord /imagine API Bridge
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(mjStatus?.configured ||
                      (mjManualConfig.discordToken.trim() &&
                        mjManualConfig.guildId.trim() &&
                        mjManualConfig.channelId.trim())) ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-mono text-emerald-300">
                        READY ({mjStatus?.source === 'manual-ui' ? 'MANUAL UI' : 'LINKED'})
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[8px] font-mono text-amber-300">
                        INPUT ENV VARS
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowMjEnvEditor((prev) => !prev)}
                      className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-[9px] font-mono text-cyan-200 flex items-center gap-1 cursor-pointer"
                      title="Toggle Manual Environment Variable Inputs"
                    >
                      <Key className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{showMjEnvEditor ? 'Hide Env' : 'Edit Env'}</span>
                    </button>
                  </div>
                </div>

                {/* MANUAL ENVIRONMENT VARIABLES CONFIGURATION PANEL */}
                {showMjEnvEditor && (
                  <div className="p-2.5 rounded-md bg-black/70 border border-cyan-500/25 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-wider text-cyan-300/90 font-semibold flex items-center gap-1">
                        <Key className="w-3 h-3 text-cyan-400" />
                        Manual Environment Variables
                      </span>
                      <span className="text-[8px] font-mono text-white/40">
                        Overrides .env before fetch
                      </span>
                    </div>

                    {/* Quick Paste Discord Channel Link */}
                    <div className="space-y-1">
                      <label className="text-[8px] font-mono uppercase text-white/45 block">
                        Quick-Fill from Discord Channel URL (Optional)
                      </label>
                      <input
                        type="text"
                        value={discordUrlPaste}
                        onChange={(e) => handleDiscordChannelUrlParse(e.target.value)}
                        placeholder="Paste https://discord.com/channels/GUILD_ID/CHANNEL_ID"
                        className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 focus:border-cyan-400 text-[10px] font-mono text-cyan-200 placeholder:text-white/25 focus:outline-none"
                      />
                    </div>

                    {/* DISCORD_TOKEN */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-mono uppercase text-white/60">
                          DISCORD_TOKEN <span className="text-rose-400">*</span>
                        </label>
                        {mjStatus?.tokenMasked && !mjManualConfig.discordToken && (
                          <span className="text-[8px] font-mono text-emerald-400">
                            Server active: {mjStatus.tokenMasked}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showDiscordToken ? 'text' : 'password'}
                          value={mjManualConfig.discordToken}
                          onChange={(e) =>
                            setMjManualConfig((prev) => ({
                              ...prev,
                              discordToken: e.target.value,
                            }))
                          }
                          placeholder={
                            mjStatus?.hasToken
                              ? 'Token set on server (type to override)...'
                              : 'Paste Discord user authorization token...'
                          }
                          className="w-full pl-2 pr-7 py-1.5 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white placeholder:text-white/25 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDiscordToken((prev) => !prev)}
                          className="absolute right-1.5 text-white/40 hover:text-white/80 cursor-pointer"
                          title={showDiscordToken ? 'Hide token' : 'Show token'}
                        >
                          {showDiscordToken ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* GUILD_ID & CHANNEL_ID */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase text-white/60 block">
                          GUILD_ID (Server) <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={mjManualConfig.guildId}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            if (val.includes('discord.com/channels/')) {
                              handleDiscordChannelUrlParse(val);
                            } else {
                              setMjManualConfig((prev) => ({ ...prev, guildId: val }));
                            }
                          }}
                          placeholder="e.g. 1092837465..."
                          className="w-full px-2 py-1.5 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white placeholder:text-white/25 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono uppercase text-white/60 block">
                          CHANNEL_ID <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={mjManualConfig.channelId}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            if (val.includes('discord.com/channels/')) {
                              handleDiscordChannelUrlParse(val);
                            } else {
                              setMjManualConfig((prev) => ({ ...prev, channelId: val }));
                            }
                          }}
                          placeholder="e.g. 1122334455..."
                          className="w-full px-2 py-1.5 rounded bg-black/60 border border-white/15 focus:border-cyan-400 text-[10px] font-mono text-white placeholder:text-white/25 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Expandable Advanced Slash Command Environment Variables */}
                    <div className="pt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setShowMjAdvancedIds((prev) => !prev)}
                        className="w-full flex items-center justify-between text-[9px] font-mono text-white/50 hover:text-cyan-300 cursor-pointer py-0.5"
                      >
                        <span className="flex items-center gap-1">
                          <Settings2 className="w-2.5 h-2.5" />
                          Advanced Bot & Command IDs (APP_ID / COMMAND_ID / VERSION)
                        </span>
                        {showMjAdvancedIds ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>

                      {showMjAdvancedIds && (
                        <div className="mt-2 space-y-2 pt-1.5 border-t border-white/5">
                          <div className="space-y-1">
                            <label className="text-[8px] font-mono uppercase text-white/45 block">
                              MIDJOURNEY_APP_ID
                            </label>
                            <input
                              type="text"
                              value={mjManualConfig.applicationId}
                              onChange={(e) =>
                                setMjManualConfig((prev) => ({
                                  ...prev,
                                  applicationId: e.target.value.trim(),
                                }))
                              }
                              placeholder="936929561302675456"
                              className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 focus:border-cyan-400 text-[10px] font-mono text-white"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-mono uppercase text-white/45 block">
                                MIDJOURNEY_COMMAND_ID
                              </label>
                              <input
                                type="text"
                                value={mjManualConfig.commandId}
                                onChange={(e) =>
                                  setMjManualConfig((prev) => ({
                                    ...prev,
                                    commandId: e.target.value.trim(),
                                  }))
                                }
                                placeholder="938956540159881230"
                                className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 focus:border-cyan-400 text-[10px] font-mono text-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[8px] font-mono uppercase text-white/45 block">
                                COMMAND_VERSION
                              </label>
                              <input
                                type="text"
                                value={mjManualConfig.commandVersion}
                                onChange={(e) =>
                                  setMjManualConfig((prev) => ({
                                    ...prev,
                                    commandVersion: e.target.value.trim(),
                                  }))
                                }
                                placeholder="1237876415471554623"
                                className="w-full px-2 py-1 rounded bg-black/60 border border-white/10 focus:border-cyan-400 text-[10px] font-mono text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Save & Sync + Test Discord Connection */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSaveMjEnvConfig(false)}
                        disabled={isSavingMjConfig}
                        className="flex-1 py-1.5 px-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[9px] font-mono uppercase tracking-wider text-cyan-200 font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>{isSavingMjConfig ? 'Saving...' : 'Save Env Vars'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleVerifyMjConnection}
                        disabled={isVerifyingMjConfig}
                        className="flex-1 py-1.5 px-2 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-[9px] font-mono uppercase tracking-wider text-emerald-200 font-semibold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>{isVerifyingMjConfig ? 'Testing...' : 'Verify Discord'}</span>
                      </button>
                    </div>

                    {mjVerifyFeedback && (
                      <div
                        className={`p-2 rounded border text-[9px] font-mono leading-relaxed ${
                          mjVerifyFeedback.ok
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                        }`}
                      >
                        {mjVerifyFeedback.message}
                      </div>
                    )}
                  </div>
                )}

                {/* Discord Endpoint & Bot Telemetry Summary */}
                <div className="p-2 rounded bg-black/50 border border-white/10 text-[9px] font-mono text-white/60 space-y-1">
                  <div className="flex justify-between">
                    <span>MJ App / Cmd ID:</span>
                    <span className="text-white/90">
                      {mjManualConfig.applicationId || mjStatus?.applicationId || '936929561302675456'} /{' '}
                      {(mjManualConfig.commandId || mjStatus?.commandId || '938956540159881230').slice(0, 6)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Channel / Guild:</span>
                    <span className="text-cyan-300">
                      {mjManualConfig.channelId && mjManualConfig.guildId
                        ? `${mjManualConfig.channelId.slice(0, 6)}... / ${mjManualConfig.guildId.slice(0, 6)}...`
                        : mjStatus?.configured
                        ? `${mjStatus.channelIdMasked} / ${mjStatus.guildIdMasked}`
                        : `Not set — enter above`}
                    </span>
                  </div>
                </div>

                {/* Midjourney Parameter Controls (--v, --s, --c, --style raw) */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-white/50">
                      MJ Version (--v)
                    </label>
                    <select
                      value={mjVersion}
                      onChange={(e) => setMjVersion(e.target.value as any)}
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    >
                      <option value="6.1">v6.1 (Latest)</option>
                      <option value="6.0">v6.0</option>
                      <option value="niji 6">Niji 6</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-mono uppercase text-white/50">
                      Polling Mode
                    </label>
                    <select
                      value={mjBridgeMode}
                      onChange={(e) => setMjBridgeMode(e.target.value as any)}
                      className="w-full px-2 py-1 rounded bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    >
                      <option value="live-poll">Live % Poll (5s x 30)</option>
                      <option value="single-post">POST /api/generate</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-white/50">
                      <span>Stylize (--s)</span>
                      <span className="text-cyan-300">{mjStylize}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1000}
                      step={50}
                      value={mjStylize}
                      onChange={(e) => setMjStylize(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-white/50">
                      <span>Chaos (--c)</span>
                      <span className="text-cyan-300">{mjChaos}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={mjChaos}
                      onChange={(e) => setMjChaos(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-1.5 text-[10px] font-mono text-white/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mjStyleRaw}
                      onChange={(e) => setMjStyleRaw(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    <span>Append --style raw (Photographic optics)</span>
                  </label>
                </div>

                {/* Live Compiled /imagine Payload Preview */}
                <div className="p-2 rounded bg-black/70 border border-white/10 text-[9px] font-mono text-cyan-200/90 break-words leading-relaxed">
                  <span className="text-white/40 select-none">/imagine prompt: </span>
                  {buildMidjourneyPrompt()}
                </div>
              </div>
            )}

            {/* DEDICATED IMAGE GENERATION STUDIO UI (Style Presets & Optical Directives) */}
            {(studioMode === 'image-gen' ||
              studioMode === 'midjourney-discord' ||
              selectedModel.id === 'midjourney-v6-discord') && (
              <div className="p-3 rounded-lg border border-white/15 bg-black/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white font-bold">
                      Image Generation Studio
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-300">
                    {studioMode === 'midjourney-discord' || selectedModel.id === 'midjourney-v6-discord'
                      ? 'Discord /imagine Bridge'
                      : 'Direct Keyframe Engine'}
                  </span>
                </div>

                {/* Quick Image Engine Switcher */}
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-md bg-black/60 border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSelectMode('image-gen')}
                    className={`py-1.5 px-2 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      studioMode === 'image-gen' && selectedModel.id !== 'midjourney-v6-discord'
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Gemini / Imagen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMode('midjourney-discord')}
                    className={`py-1.5 px-2 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                      studioMode === 'midjourney-discord' || selectedModel.id === 'midjourney-v6-discord'
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Midjourney Discord
                  </button>
                </div>

                {/* Optical & Cinematic Image Style Presets */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono text-white/50">
                      Optical & Lighting Style Preset
                    </span>
                    <span className="text-[8px] font-mono text-white/35">
                      Click to apply to prompt
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {IMAGE_STYLE_PRESETS.map((preset) => {
                      const isSelected = selectedImageStyleId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setSelectedImageStyleId(preset.id);
                            if (!prompt.toLowerCase().includes(preset.directive.slice(0, 18).toLowerCase())) {
                              setPrompt((prev) =>
                                prev.trim() ? `${prev.trim()}, ${preset.directive}` : preset.directive
                              );
                              showToast(`Applied ${preset.label} optical preset`);
                            }
                          }}
                          className={`px-2 py-1.5 rounded border text-left text-[10px] font-mono transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 font-semibold'
                              : 'bg-black/50 border-white/10 text-white/65 hover:text-white hover:border-white/25'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Prompt Editor + AI Optimize */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Prompt Directives
                </label>
                <button
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizingPrompt}
                  className="px-2 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 flex items-center gap-1 cursor-pointer"
                  title="Enhance prompt with Gemini Prompt Architect"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>{isOptimizingPrompt ? 'Optimizing...' : 'AI Enhance'}</span>
                </button>
              </div>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-2.5 py-2 rounded bg-black/50 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
              />
            </div>

            {/* Negative Prompt */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-white/50">
                Negative Directives
              </label>
              <input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/50 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Aspect Ratio & Resolution */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Aspect Ratio
                </label>
                <div className="flex gap-1">
                  {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        aspectRatio === ar
                          ? 'bg-white text-black font-bold'
                          : 'bg-black/40 border border-white/15 text-white/60 hover:text-white'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Resolution
                </label>
                <div className="flex gap-1">
                  {(['1080p', '4K'] as Resolution[]).map((res) => (
                    <button
                      key={res}
                      onClick={() => setResolution(res)}
                      className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        resolution === res
                          ? 'bg-white text-black font-bold'
                          : 'bg-black/40 border border-white/15 text-white/60 hover:text-white'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration & Seed */}
            <div className="grid grid-cols-2 gap-3">
              {studioMode !== 'image-gen' && studioMode !== 'midjourney-discord' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase text-white/50">
                    Duration
                  </label>
                  <div className="flex gap-1">
                    {selectedModel.supportedDurations.map((d) => (
                      <button
                        key={d}
                        onClick={() => setDuration(d)}
                        className={`flex-1 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          duration === d
                            ? 'bg-white text-black font-bold'
                            : 'bg-black/40 border border-white/15 text-white/60 hover:text-white'
                        }`}
                      >
                        {d}s
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className={
                  studioMode === 'image-gen' || studioMode === 'midjourney-discord'
                    ? 'col-span-2 space-y-1'
                    : 'space-y-1'
                }
              >
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Deterministic Seed
                </label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value) || 0)}
                    className="w-full px-2 py-1 rounded bg-black/50 border border-white/15 text-xs font-mono text-white"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 899999 + 100000))}
                    className="px-2 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white cursor-pointer"
                    title="Randomize Seed"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Motion Intensity (for Video Modes) */}
            {studioMode !== 'image-gen' && studioMode !== 'midjourney-discord' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-white/50">
                  <span>Camera & Subject Motion Scale</span>
                  <span className="text-white font-bold">{motionIntensity} / 10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={motionIntensity}
                  onChange={(e) => setMotionIntensity(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            )}

            {/* DYNAMIC GENERATION & POLLING STATUS INDICATOR */}
            {(isGenerating || generationPhase !== 'IDLE') && (
              <div
                className={`p-3 rounded-lg border space-y-2.5 transition-all ${
                  generationPhase === 'ERROR'
                    ? 'bg-rose-950/35 border-rose-500/40'
                    : generationPhase === 'COMPLETED'
                    ? 'bg-emerald-950/25 border-emerald-500/35'
                    : 'bg-cyan-950/25 border-cyan-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isGenerating ? (
                      <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
                    ) : generationPhase === 'COMPLETED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <span className="text-[11px] font-mono font-semibold text-white truncate">
                      {currentStage ||
                        (generationPhase === 'SENDING'
                          ? 'Sending to Discord...'
                          : generationPhase === 'RENDERING' || generationPhase === 'WAITING'
                          ? `Midjourney rendering (${progress}%)...`
                          : 'Ready')}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono tabular-nums font-bold text-cyan-300 shrink-0">
                    {progress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      generationPhase === 'ERROR'
                        ? 'bg-rose-400'
                        : generationPhase === 'COMPLETED'
                        ? 'bg-emerald-400'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.max(4, progress)}%` }}
                  />
                </div>

                {/* 3-Step Backend Polling Stage Tracker */}
                <div className="grid grid-cols-3 gap-1 pt-0.5 text-[9px] font-mono">
                  <div
                    className={`px-1.5 py-1 rounded border text-center truncate ${
                      generationPhase === 'SENDING'
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 font-semibold'
                        : progress > 5
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-black/40 text-white/40'
                    }`}
                  >
                    1. Sending
                  </div>
                  <div
                    className={`px-1.5 py-1 rounded border text-center truncate ${
                      generationPhase === 'WAITING' || generationPhase === 'RENDERING'
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200 font-semibold'
                        : generationPhase === 'COMPLETED'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-black/40 text-white/40'
                    }`}
                  >
                    2. Rendering ({progress}%)
                  </div>
                  <div
                    className={`px-1.5 py-1 rounded border text-center truncate ${
                      generationPhase === 'COMPLETED'
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200 font-semibold'
                        : 'border-white/10 bg-black/40 text-white/40'
                    }`}
                  >
                    3. Complete
                  </div>
                </div>

                {(studioMode === 'midjourney-discord' ||
                  selectedModel.id === 'midjourney-v6-discord') &&
                  isGenerating && (
                    <div className="flex items-center justify-between text-[9px] font-mono text-white/50 pt-0.5">
                      <span>Discord Channel Polling (5s interval)</span>
                      <span className="tabular-nums text-cyan-300">
                        Attempt {mjPollAttempt} / 30
                      </span>
                    </div>
                  )}
              </div>
            )}

            {/* Error Banner */}
            {generationError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-500/30 text-rose-300 font-mono text-[11px] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{generationError}</span>
              </div>
            )}

            {/* Primary Generate Button */}
            <div className="pt-1">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:scale-[0.99] text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>
                  {isGenerating
                    ? currentStage || `Midjourney rendering (${progress}%)...`
                    : studioMode === 'midjourney-discord' || selectedModel.id === 'midjourney-v6-discord'
                    ? 'Generate Image via Discord (/imagine)'
                    : studioMode === 'image-gen'
                    ? `Generate Image Keyframe (${estimatedCost} Credits)`
                    : `Generate Video (${estimatedCost} Credits)`}
                </span>
              </button>
            </div>

            {/* GENERATED IMAGE OUTPUT PREVIEW CARD IN PANEL */}
            {(lastGeneratedImage || (inspectedAsset && inspectedAsset.type === 'IMAGE')) && (
              <div className="p-3 rounded-lg border border-white/15 bg-black/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Generated Image Output
                  </span>
                  <span className="text-[9px] font-mono text-white/45">
                    {lastGeneratedImage?.model || inspectedAsset?.model || 'Studio Image'}
                  </span>
                </div>

                <div className="relative rounded-md overflow-hidden border border-white/15 bg-black aspect-video group">
                  <img
                    src={lastGeneratedImage?.url || inspectedAsset?.url}
                    alt={lastGeneratedImage?.title || inspectedAsset?.title || 'Generated Image'}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/80 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 text-[9px] font-mono text-white/80">
                    <span>{lastGeneratedImage?.aspectRatio || aspectRatio}</span>
                    <span>·</span>
                    <span>{lastGeneratedImage?.resolution || resolution}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const urlToCopy = lastGeneratedImage?.url || inspectedAsset?.url || '';
                      if (urlToCopy) {
                        navigator.clipboard?.writeText(urlToCopy);
                        showToast('Copied generated image URL to clipboard');
                      }
                    }}
                    className="flex-1 py-1.5 px-2 rounded bg-white/[0.06] hover:bg-white/15 border border-white/15 text-[10px] font-mono text-white flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>Copy Link</span>
                  </button>

                  <a
                    href={lastGeneratedImage?.url || inspectedAsset?.url}
                    download={`vaiure_image_${Date.now()}.png`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 px-2 rounded bg-white/[0.06] hover:bg-white/15 border border-white/15 text-[10px] font-mono text-white flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Download</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleSendImageToVideoMode}
                    className="flex-1 py-1.5 px-2 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-[10px] font-mono text-cyan-200 font-semibold flex items-center justify-center gap-1 cursor-pointer"
                    title="Send generated image to Image-to-Video mode"
                  >
                    <ArrowRight className="w-3 h-3 text-cyan-400" />
                    <span>Animate</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
