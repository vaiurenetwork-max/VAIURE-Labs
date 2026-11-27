/**
 * VAIURE HYBRID STUDIO — Video Reference & Transformation Studio
 * Full video-reference editing & AI transformation workflow powered by
 * ByteDance Seedance 2.5 (`reference_video` + multi-plate `reference_image`s)
 * and MUAPI Seedance 2.5 Spicy (extracted keyframe 480p–4K video synthesis).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Columns,
  Edit3,
  Film,
  FolderPlus,
  History,
  Image as ImageIcon,
  Layers,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  Video as VideoIcon,
  Wand2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  HybridAspectRatio,
  HybridAsset,
  HybridAssetCategory,
  HybridProductionProject,
  HybridTransformCategory,
  HybridTransformDeliveryMethod,
  HybridVideoTransformDraft,
  HybridVideoTransformVersion,
} from '../../types/hybridStudio';
import {
  GenerationResolution,
  ProviderConfigPublic,
  ProviderId,
  UnifiedGenerationJob,
} from '../../types/multiProvider';
import {
  CAMERA_MOVEMENT_OPTIONS,
  captureVideoFrameAtTime,
  compileVideoTransformPrompt,
  extractVideoMetadataFromUrl,
} from '../../services/hybridStudioService';
import {
  computeLocalMuapiPricePreview,
  mirrorCompletedVideoToFirebaseStorage,
  multiProviderGenerationService,
} from '../../services/multiProviderGenerationService';
import { seedanceLabService } from '../../services/seedanceLabService';

interface HybridVideoTransformStudioProps {
  project: HybridProductionProject;
  providers: ProviderConfigPublic[];
  ownerId: string;
  initialSourceAssetId?: string;
  isUploading: boolean;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenAuthModal?: () => void;
  onUploadFiles: (
    files: FileList,
    category: HybridAssetCategory,
    folder?: string
  ) => Promise<HybridAsset[]>;
  onAddAsset: (asset: HybridAsset) => void;
  onUpdateAssetMeta: (assetId: string, updates: Partial<HybridAsset>) => void;
  onAddFolder: (folderName: string) => void;
  onUpsertTransformVersion: (version: HybridVideoTransformVersion) => void;
  onUpdateTransformVersion: (
    versionId: string,
    updates: Partial<HybridVideoTransformVersion>
  ) => void;
  onDeleteTransformVersion: (versionId: string) => void;
  onSendToStoryboardShot: (
    outputUrl: string,
    title: string,
    thumbnailUrl?: string,
    duration?: number
  ) => void;
  onSendToTimeline: (
    outputUrl: string,
    title: string,
    thumbnailUrl?: string,
    duration?: number
  ) => void;
  onShowNotice: (text: string, type?: 'info' | 'success' | 'error') => void;
}

const ENVIRONMENT_PRESETS = [
  {
    id: 'custom',
    label: 'Custom Direction',
    prompt: '',
  },
  {
    id: 'neon-rain-city',
    label: 'Cybernetic Rain Metropolis',
    prompt:
      'Replace background with a dense rain-slicked futuristic metropolis at night, towering obsidian megastructures, wet asphalt reflections, cool cyan and amber neon signage glow',
  },
  {
    id: 'alpine-mist',
    label: 'Misty Alpine Forest',
    prompt:
      'Transform environment into a dense fog-shrouded ancient pine forest at dawn, volumetric god-rays piercing cool slate mist, moss-covered basalt terrain',
  },
  {
    id: 'brutalist-concrete',
    label: 'Monolithic Brutalist Hall',
    prompt:
      'Place scene inside a cavernous architectural concrete atrium with stark overhead skylight shafts, polished dark stone floors, minimalist monumental scale',
  },
  {
    id: 'desert-dusk',
    label: 'Dusk Basalt Canyon',
    prompt:
      'Transition setting to an expansive volcanic black-sand desert at twilight under deep indigo sky with warm horizon rim light and windblown dust haze',
  },
];

const STYLE_STARTERS = [
  { id: '35mm-anamorphic', label: '35mm Anamorphic Cinema', text: '35mm anamorphic film stock, subtle halation, organic optical flare, rich shadow roll-off, 24fps shutter blur' },
  { id: 'chiaroscuro-noir', label: 'High-Contrast Noir', text: 'Chiaroscuro theatrical contrast, deep obsidian blacks, crisp specular highlights, moody neo-noir color palette' },
  { id: 'editorial-clean', label: 'Luxury Editorial Commercial', text: 'Crisp medium-format cinema look, balanced calibrated neutrals, tactile fabric & surface micro-detail' },
  { id: 'gritty-handheld', label: 'Naturalistic Documentary', text: 'Unpolished raw cinema realism, natural ambient lighting, authentic skin & material textures' },
];

const WEATHER_OPTIONS = ['', 'Light Rain', 'Heavy Storm Rain', 'Dense Fog', 'Falling Snow', 'Drifting Smoke', 'Embers & Firelight', 'Windblown Dust'];
const TIME_OF_DAY_OPTIONS = ['', 'Blue Hour Dawn', 'Overcast Midday', 'Harsh Noon Sun', 'Golden Hour', 'Twilight Dusk', 'Deep Night'];
const PRESERVE_CHIPS = [
  'Camera movement & lens framing',
  'Scene blocking & timing',
  'Subject motion rhythm',
  'Spatial composition',
];

function createDefaultDraft(sourceAssetId = '', duration = 10): HybridVideoTransformDraft {
  return {
    sourceAssetId,
    useFullVideo: true,
    segmentStart: 0,
    segmentEnd: Math.max(2, Math.min(duration, 10)),
    environmentPreset: 'custom',
    environmentPrompt: '',
    subjectTargetDescription: '',
    characterAppearancePrompt: '',
    characterClothingPrompt: '',
    characterStyleNotes: '',
    elementsAddPrompt: '',
    atmosphereLighting: '',
    atmosphereWeather: '',
    atmosphereTimeOfDay: '',
    atmosphereMood: '',
    visualStyleDirection: '',
    mainPrompt: '',
    elementsToChange: '',
    elementsToAdd: '',
    elementsToPreserve: 'Camera movement & lens framing, subject motion rhythm',
    cameraDirection: 'Match reference camera motion',
    motionDirection: 'Preserve physical momentum of source clip',
    lightingDirection: '',
    extraReferenceAssetIds: [],
    providerId: 'bytedance',
    modelId: 'seedance_25_15s_r2v',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 5,
    physicsPriority: true,
    generateAudio: true,
    cameraFixed: false,
    highBitrate: false,
    draft: false,
    contentRating: 'standard',
  };
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimecode(sec: number): string {
  const s = Math.max(0, sec);
  const mins = Math.floor(s / 60);
  const rem = (s % 60).toFixed(1).padStart(4, '0');
  return `${String(mins).padStart(2, '0')}:${rem}`;
}

export const HybridVideoTransformStudio: React.FC<HybridVideoTransformStudioProps> = ({
  project,
  providers,
  ownerId,
  initialSourceAssetId,
  isUploading,
  focusMode,
  onToggleFocusMode,
  onOpenAuthModal,
  onUploadFiles,
  onAddAsset,
  onUpdateAssetMeta,
  onAddFolder,
  onUpsertTransformVersion,
  onUpdateTransformVersion,
  onDeleteTransformVersion,
  onSendToStoryboardShot,
  onSendToTimeline,
  onShowNotice,
}) => {
  const videoAssets = useMemo(
    () => project.assets.filter((a) => a.mediaType === 'VIDEO'),
    [project.assets]
  );
  const imageAssets = useMemo(
    () => project.assets.filter((a) => a.mediaType === 'IMAGE'),
    [project.assets]
  );
  const transforms = useMemo(() => project.videoTransforms || [], [project.videoTransforms]);
  const folders = useMemo(
    () =>
      project.assetFolders && project.assetFolders.length > 0
        ? project.assetFolders
        : ['Raw Footage', 'Transformations', 'Sets & Plates'],
    [project.assetFolders]
  );

  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>('ALL');
  const [uploadFolder, setUploadFolder] = useState<string>('Raw Footage');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  const [sourceAssetId, setSourceAssetId] = useState<string>(
    () => initialSourceAssetId || videoAssets[0]?.id || ''
  );
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    () => transforms[0]?.id || ''
  );
  const [compareMode, setCompareMode] = useState<'original' | 'transformed' | 'split'>('original');

  const [draft, setDraft] = useState<HybridVideoTransformDraft>(() =>
    createDefaultDraft(initialSourceAssetId || videoAssets[0]?.id || '', videoAssets[0]?.duration || 10)
  );
  const [rightTab, setRightTab] = useState<'categories' | 'director' | 'engine'>('categories');
  const [openCat, setOpenCat] = useState<HybridTransformCategory>('environment');

  // Interactive playback & scrubbing state
  const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
  const compareLeftRef = useRef<HTMLVideoElement | null>(null);
  const compareRightRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const refImageUploadRef = useRef<{
    slot: 'environment' | 'character' | 'elements' | 'atmosphere' | 'style' | 'extra';
  } | null>(null);
  const imagePickerInputRef = useRef<HTMLInputElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadSec, setPlayheadSec] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  // Import existing VAIURE generated renders modal/drawer
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [remoteRenders, setRemoteRenders] = useState<
    Array<{ id: string; title: string; url: string; model: string; duration?: number; createdAt: string }>
  >([]);

  // Version inline rename
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  const streamCleanupsRef = useRef<Map<string, () => void>>(new Map());
  useEffect(() => {
    return () => {
      streamCleanupsRef.current.forEach((fn) => fn());
      streamCleanupsRef.current.clear();
    };
  }, []);

  // Sync initial source ID if requested externally
  useEffect(() => {
    if (initialSourceAssetId && initialSourceAssetId !== sourceAssetId) {
      setSourceAssetId(initialSourceAssetId);
      setCompareMode('original');
    }
  }, [initialSourceAssetId, sourceAssetId]);

  // Fallback pick first video if active is removed
  useEffect(() => {
    if (!sourceAssetId && videoAssets[0]) {
      setSourceAssetId(videoAssets[0].id);
    }
  }, [sourceAssetId, videoAssets]);

  const activeSourceAsset = useMemo(
    () => project.assets.find((a) => a.id === sourceAssetId),
    [project.assets, sourceAssetId]
  );

  // Keep draft sourceAssetId & duration range synced with selected source asset
  useEffect(() => {
    if (!activeSourceAsset) return;
    const dur = activeSourceAsset.duration || 10;
    setDraft((prev) => ({
      ...prev,
      sourceAssetId: activeSourceAsset.id,
      segmentStart: 0,
      segmentEnd: Math.round(dur * 10) / 10,
      aspectRatio:
        (['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'].includes(
          activeSourceAsset.aspectRatio || ''
        )
          ? (activeSourceAsset.aspectRatio as HybridAspectRatio)
          : prev.aspectRatio),
    }));
    setPlayheadSec(0);
    setIsPlaying(false);

    // Enrich missing width/height/duration metadata asynchronously for imported remote URLs
    if (!activeSourceAsset.width || !activeSourceAsset.duration) {
      void extractVideoMetadataFromUrl(activeSourceAsset.url).then((meta) => {
        if (meta.width || meta.duration) {
          onUpdateAssetMeta(activeSourceAsset.id, {
            width: meta.width,
            height: meta.height,
            aspectRatio: meta.aspectRatio,
            duration: meta.duration ?? activeSourceAsset.duration,
            fps: meta.fps,
          });
        }
      });
    }
  }, [activeSourceAsset?.id]);

  // Active transformation versions relevant to this source (or all in project)
  const sourceTransforms = useMemo(
    () =>
      sourceAssetId
        ? transforms.filter(
            (t) => t.sourceAssetId === sourceAssetId || t.outputUrl === activeSourceAsset?.url
          )
        : transforms,
    [transforms, sourceAssetId, activeSourceAsset?.url]
  );

  const activeTransformVersion = useMemo(
    () =>
      transforms.find((t) => t.id === selectedVersionId) ||
      sourceTransforms[0] ||
      transforms[0],
    [transforms, sourceTransforms, selectedVersionId]
  );

  // Active provider & model resolution
  const activeProvider = useMemo(
    () =>
      providers.find((p) => p.providerId === draft.providerId) || providers[0],
    [providers, draft.providerId]
  );

  const availableModels = useMemo(() => {
    const list = (activeProvider?.models || []).filter((m) => m.enabled);
    if (activeProvider?.providerId === 'bytedance') {
      // Ensure Seedance 2.5 R2V entries exist for multi-plate workflows
      const hasR2V15 = list.some((m) => m.modelId === 'seedance_25_15s_r2v');
      if (!hasR2V15) {
        return [
          ...list,
          {
            providerId: 'bytedance' as ProviderId,
            modelId: 'seedance_25_15s_r2v',
            displayName: 'Seedance 2.5 R2V (15s · Video + Up to 30 Refs)',
            enabled: true,
            category: 'Reference-to-Video',
            supportsImageToVideo: true,
            supportsTextToVideo: true,
            requiresStartImage: false,
            supportsLastImage: true,
            supportsReferencePlates: true,
            maxReferenceImages: 30,
            supportsDraftMode: false,
            supportsAudio: true,
            supportsCameraFixed: true,
            supportsHighBitrate: false,
            resolutions: ['720p'] as GenerationResolution[],
            durations: [5, 10, 15],
            enabledResolutions: ['720p'] as GenerationResolution[],
            enabledDurations: [5, 10, 15],
            pricingCurrency: 'CREDITS' as const,
            appMarkupPercent: 0,
            appMarkupFlatUsd: 0,
            safetyCheckerLockedOn: false,
            safetyNotice: 'Supports reference_video + multi-plate reference images',
          },
          {
            providerId: 'bytedance' as ProviderId,
            modelId: 'seedance_25_30s_r2v',
            displayName: 'Seedance 2.5 R2V (30s · Extended Ref)',
            enabled: true,
            category: 'Reference-to-Video',
            supportsImageToVideo: true,
            supportsTextToVideo: true,
            requiresStartImage: false,
            supportsLastImage: true,
            supportsReferencePlates: true,
            maxReferenceImages: 30,
            supportsDraftMode: false,
            supportsAudio: true,
            supportsCameraFixed: true,
            supportsHighBitrate: false,
            resolutions: ['720p'] as GenerationResolution[],
            durations: [20, 30],
            enabledResolutions: ['720p'] as GenerationResolution[],
            enabledDurations: [20, 30],
            pricingCurrency: 'CREDITS' as const,
            appMarkupPercent: 0,
            appMarkupFlatUsd: 0,
            safetyCheckerLockedOn: false,
            safetyNotice: 'Extended 30s reference_video + plates',
          },
        ];
      }
    }
    return list;
  }, [activeProvider]);

  const activeModel = useMemo(
    () =>
      availableModels.find((m) => m.modelId === draft.modelId) || availableModels[0],
    [availableModels, draft.modelId]
  );

  // Collect labeled multimodal plate slots
  const boundPlates = useMemo(() => {
    const items: Array<{ asset: HybridAsset; role: string }> = [];
    const pushIf = (id: string | undefined, role: string) => {
      if (!id) return;
      const found = imageAssets.find((a) => a.id === id);
      if (found) items.push({ asset: found, role });
    };
    pushIf(draft.environmentRefAssetId, 'Environment');
    pushIf(draft.characterRefAssetId, 'Character');
    pushIf(draft.elementsRefAssetId, 'Added Element');
    pushIf(draft.atmosphereRefAssetId, 'Lighting / Atmosphere');
    pushIf(draft.styleRefAssetId, 'Visual Style');
    draft.extraReferenceAssetIds.forEach((eid) => pushIf(eid, 'Supplemental Ref'));
    return items;
  }, [draft, imageAssets]);

  const compiledPrompt = useMemo(
    () =>
      compileVideoTransformPrompt({
        draft,
        hasReferenceVideo: draft.providerId === 'bytedance' && Boolean(activeSourceAsset),
        plateLabels: boundPlates.map((p, idx) => ({
          handle: `@Image${idx + 1}`,
          role: p.role,
          name: p.asset.name,
        })),
      }),
    [draft, activeSourceAsset, boundPlates]
  );

  const muapiPricePreview = useMemo(() => {
    if (!activeModel || activeModel.pricingCurrency !== 'USD') return null;
    return computeLocalMuapiPricePreview(
      activeModel,
      draft.resolution,
      draft.duration,
      draft.draft
    );
  }, [activeModel, draft.resolution, draft.duration, draft.draft]);

  // Video file upload handler
  const handleVideoFilesUpload = async (files: FileList) => {
    const videoOnly = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (videoOnly.length === 0) {
      onShowNotice('Select valid video files (.mp4, .mov, .webm) for reference import.', 'error');
      return;
    }
    const dt = new DataTransfer();
    videoOnly.forEach((f) => dt.items.add(f));
    const added = await onUploadFiles(dt.files, 'Existing Footage', uploadFolder);
    if (added[0]) {
      setSourceAssetId(added[0].id);
      setCompareMode('original');
    }
  };

  // Upload image directly into one of the reference plate slots
  const handleSlotImageUpload = async (files: FileList) => {
    const targetSlot = refImageUploadRef.current?.slot || 'extra';
    const catMap: Record<string, HybridAssetCategory> = {
      environment: 'Environment Reference',
      character: 'Character Image',
      elements: 'Reference Image',
      atmosphere: 'Cinematic Reference',
      style: 'Cinematic Reference',
      extra: 'Reference Image',
    };
    const added = await onUploadFiles(files, catMap[targetSlot] || 'Reference Image', 'Sets & Plates');
    if (added[0]) {
      const id = added[0].id;
      setDraft((prev) => {
        if (targetSlot === 'environment') return { ...prev, environmentRefAssetId: id };
        if (targetSlot === 'character') return { ...prev, characterRefAssetId: id };
        if (targetSlot === 'elements') return { ...prev, elementsRefAssetId: id };
        if (targetSlot === 'atmosphere') return { ...prev, atmosphereRefAssetId: id };
        if (targetSlot === 'style') return { ...prev, styleRefAssetId: id };
        return {
          ...prev,
          extraReferenceAssetIds: Array.from(new Set([...prev.extraReferenceAssetIds, id])).slice(0, 25),
        };
      });
    }
  };

  // Load past VAIURE renders from both /api/ai/history and /api/generations/history
  const handleLoadRemoteRenders = async () => {
    setShowImportPanel(true);
    setIsLoadingRemote(true);
    try {
      const [bdHist, unifiedHist] = await Promise.all([
        seedanceLabService.getHistory().catch(() => []),
        multiProviderGenerationService.getUnifiedHistory().catch(() => []),
      ]);
      const merged: Array<{
        id: string;
        title: string;
        url: string;
        model: string;
        duration?: number;
        createdAt: string;
      }> = [];
      const seenUrl = new Set<string>();

      unifiedHist
        .filter((j: UnifiedGenerationJob) => j.status === 'completed' && (j.playback_url || j.provider_output_url))
        .forEach((j: UnifiedGenerationJob) => {
          const url = j.playback_url || j.provider_output_url!;
          if (seenUrl.has(url)) return;
          seenUrl.add(url);
          merged.push({
            id: j.job_id,
            title: j.prompt ? j.prompt.slice(0, 48) : j.model_name,
            url,
            model: j.model_name,
            duration: j.duration,
            createdAt: j.created_at,
          });
        });

      bdHist
        .filter((h) => h.status === 'completed' && h.result_url)
        .forEach((h) => {
          if (!h.result_url || seenUrl.has(h.result_url)) return;
          seenUrl.add(h.result_url);
          merged.push({
            id: h.job_code,
            title: h.prompt ? h.prompt.slice(0, 48) : h.model_name,
            url: h.result_url,
            model: h.model_name || h.model,
            duration: Number(h.parameters?.duration) || undefined,
            createdAt: h.created_at,
          });
        });

      setRemoteRenders(merged);
    } finally {
      setIsLoadingRemote(false);
    }
  };

  const handleImportRemoteItem = (item: {
    id: string;
    title: string;
    url: string;
    model: string;
    duration?: number;
  }) => {
    const existing = project.assets.find((a) => a.url === item.url && a.mediaType === 'VIDEO');
    if (existing) {
      setSourceAssetId(existing.id);
      setCompareMode('original');
      setShowImportPanel(false);
      onShowNotice(`Loaded "${existing.name}" into Video Reference monitor`, 'info');
      return;
    }

    const imported: HybridAsset = {
      id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `VAIURE · ${item.title || item.model}`,
      category: 'Reference Video',
      mediaType: 'VIDEO',
      url: item.url,
      duration: item.duration,
      folder: uploadFolder || 'Raw Footage',
      tags: ['imported', 'vaiure-render'],
      source: 'library',
      createdAt: new Date().toISOString(),
    };
    onAddAsset(imported);
    setSourceAssetId(imported.id);
    setCompareMode('original');
    setShowImportPanel(false);
    onShowNotice(`Imported VAIURE render into "${imported.folder}"`, 'success');
  };

  // Extract segment start & end keyframes cleanly via HTML5 canvas -> hosted URL
  const handleExtractSegmentFrames = useCallback(async (): Promise<{
    startAssetId?: string;
    endAssetId?: string;
  }> => {
    if (!activeSourceAsset?.url) {
      onShowNotice('Select or upload a reference video first.', 'error');
      return {};
    }
    setIsExtractingFrames(true);
    try {
      const startTime = draft.useFullVideo ? 0.1 : draft.segmentStart;
      const startCap = await captureVideoFrameAtTime({
        videoUrl: activeSourceAsset.url,
        timeSec: startTime,
        ownerId,
        fileName: `start_frame_${activeSourceAsset.id.slice(-5)}.png`,
      });
      const startAsset: HybridAsset = {
        id: `asset-${Date.now()}-sf`,
        name: `${activeSourceAsset.name} @ ${startTime.toFixed(1)}s`,
        category: 'Reference Image',
        mediaType: 'IMAGE',
        url: startCap.hostedUrl,
        thumbnailUrl: startCap.hostedUrl,
        folder: 'Sets & Plates',
        sourceAssetId: activeSourceAsset.id,
        tags: ['segment-start-frame'],
        source: 'generated',
        createdAt: new Date().toISOString(),
      };
      onAddAsset(startAsset);

      let endAsset: HybridAsset | undefined;
      if (!draft.useFullVideo && draft.segmentEnd > draft.segmentStart + 0.4) {
        try {
          const endCap = await captureVideoFrameAtTime({
            videoUrl: activeSourceAsset.url,
            timeSec: draft.segmentEnd,
            ownerId,
            fileName: `end_frame_${activeSourceAsset.id.slice(-5)}.png`,
          });
          endAsset = {
            id: `asset-${Date.now()}-ef`,
            name: `${activeSourceAsset.name} @ ${draft.segmentEnd.toFixed(1)}s`,
            category: 'Reference Image',
            mediaType: 'IMAGE',
            url: endCap.hostedUrl,
            thumbnailUrl: endCap.hostedUrl,
            folder: 'Sets & Plates',
            sourceAssetId: activeSourceAsset.id,
            tags: ['segment-end-frame'],
            source: 'generated',
            createdAt: new Date().toISOString(),
          };
          onAddAsset(endAsset);
        } catch {
          // optional end frame
        }
      }

      setDraft((prev) => ({
        ...prev,
        extractedStartFrameAssetId: startAsset.id,
        extractedEndFrameAssetId: endAsset?.id || prev.extractedEndFrameAssetId,
      }));
      onShowNotice(
        endAsset
          ? 'Extracted segment start & end frames cleanly to project plates'
          : 'Extracted segment start frame cleanly to project plates',
        'success'
      );
      return { startAssetId: startAsset.id, endAssetId: endAsset?.id };
    } catch (err: any) {
      onShowNotice(
        err?.message || 'Could not extract frame from this video stream. Attach a reference start image directly instead.',
        'error'
      );
      return {};
    } finally {
      setIsExtractingFrames(false);
    }
  }, [activeSourceAsset, draft.useFullVideo, draft.segmentStart, draft.segmentEnd, ownerId, onAddAsset, onShowNotice]);

  // Prompt optimization via real /api/prompt/optimize
  const handleOptimizePrompt = async () => {
    if (ownerId === 'guest') {
      onOpenAuthModal?.();
      return;
    }
    if (!compiledPrompt) {
      onShowNotice('Describe the desired transformation before optimizing.', 'error');
      return;
    }
    setIsOptimizing(true);
    try {
      const res = await seedanceLabService.optimizePromptPhysics({
        prompt: compiledPrompt,
        durationSeconds: draft.duration,
        aspectRatio: draft.aspectRatio,
        physicsPriority: draft.physicsPriority,
        contentRating: draft.contentRating,
      });
      setDraft((prev) => ({ ...prev, mainPrompt: res.optimizedPrompt }));
      onShowNotice('Applied Seedance 2.5 complex physics optimization to transformation prompt', 'success');
    } catch (err: any) {
      onShowNotice(err?.message || 'Prompt optimization failed', 'error');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Switch provider cleanly respecting real capabilities
  const handleProviderChange = (nextProv: ProviderId) => {
    const prov = providers.find((p) => p.providerId === nextProv);
    const firstModel =
      nextProv === 'bytedance'
        ? 'seedance_25_15s_r2v'
        : prov?.models.find((m) => m.enabled)?.modelId || 'muapi/seedance-2.5-spicy-image-to-video';
    const modelDef = prov?.models.find((m) => m.modelId === firstModel) || prov?.models[0];
    setDraft((prev) => ({
      ...prev,
      providerId: nextProv,
      modelId: firstModel,
      resolution:
        modelDef?.enabledResolutions.includes(prev.resolution)
          ? prev.resolution
          : modelDef?.enabledResolutions[0] || '720p',
      duration:
        modelDef?.enabledDurations.includes(prev.duration as any)
          ? prev.duration
          : modelDef?.enabledDurations[0] || 5,
    }));
  };

  // REAL BACKEND VIDEO TRANSFORMATION SUBMISSION
  const handleRunTransformation = async () => {
    if (ownerId === 'guest') {
      onOpenAuthModal?.();
      onShowNotice('Sign in to generate transformed videos via Seedance 2.5 or MUAPI', 'info');
      return;
    }
    if (!activeSourceAsset) {
      onShowNotice('Upload or import a reference video first.', 'error');
      return;
    }
    if (!compiledPrompt) {
      onShowNotice('Enter transformation prompt instructions or category settings first.', 'error');
      return;
    }

    // Ensure non-blob HTTPS URL for backend upstream fetches
    if (draft.providerId === 'bytedance' && activeSourceAsset.url.startsWith('blob:')) {
      onShowNotice(
        'This video is a local browser preview (blob URL) and cannot be fetched by ModelArk servers. Re-upload while signed in (<=24MB or Firebase Storage) or extract segment frames to run via keyframes.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    const versionId = `xform-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const nextNumber = transforms.length + 1;

    try {
      // Collect plates & ensure HTTPS URLs
      const plateUrls: string[] = [];
      for (const item of boundPlates) {
        if (item.asset.url.startsWith('data:')) {
          const uploaded = await seedanceLabService.uploadMedia(item.asset.url, item.asset.name);
          plateUrls.push(uploaded);
        } else if (!item.asset.url.startsWith('blob:')) {
          plateUrls.push(item.asset.url);
        }
      }

      // Resolve extracted start/end frame URLs if present or required (MUAPI requires start frame)
      let startFrameAssetId = draft.extractedStartFrameAssetId;
      let endFrameAssetId = draft.extractedEndFrameAssetId;

      if (draft.providerId === 'muapi' && !startFrameAssetId && plateUrls.length === 0) {
        const extracted = await handleExtractSegmentFrames();
        startFrameAssetId = extracted.startAssetId;
        endFrameAssetId = extracted.endAssetId;
      }

      const startFrameAsset = project.assets.find((a) => a.id === startFrameAssetId);
      const endFrameAsset = project.assets.find((a) => a.id === endFrameAssetId);
      const startFrameUrl = startFrameAsset?.url || plateUrls[0];
      const endFrameUrl = endFrameAsset?.url;

      if (draft.providerId === 'muapi' && (!startFrameUrl || startFrameUrl.startsWith('blob:'))) {
        onShowNotice(
          'MUAPI Seedance 2.5 Spicy requires a Start Frame image. Extract Segment Frames or attach a Reference Plate.',
          'error'
        );
        setIsSubmitting(false);
        return;
      }

      const deliveryMethod: HybridTransformDeliveryMethod =
        draft.providerId === 'muapi'
          ? 'segment_keyframes'
          : plateUrls.length > 0
          ? 'reference_video_and_plates'
          : 'reference_video';

      const initialVersion: HybridVideoTransformVersion = {
        id: versionId,
        versionNumber: nextNumber,
        label: `Transformation ${String(nextNumber).padStart(2, '0')}`,
        createdAt: new Date().toISOString(),
        sourceAssetId: activeSourceAsset.id,
        segmentStart: draft.useFullVideo ? 0 : draft.segmentStart,
        segmentEnd: draft.useFullVideo ? activeSourceAsset.duration || draft.duration : draft.segmentEnd,
        useFullVideo: draft.useFullVideo,
        providerId: draft.providerId,
        modelId: activeModel?.modelId || draft.modelId,
        modelName: activeModel?.displayName || draft.modelId,
        resolution: draft.resolution,
        duration: draft.duration,
        aspectRatio: draft.aspectRatio,
        prompt: compiledPrompt,
        elementsToChange: draft.elementsToChange,
        elementsToAdd: draft.elementsToAdd,
        elementsToPreserve: draft.elementsToPreserve,
        referenceAssetIds: [
          activeSourceAsset.id,
          ...boundPlates.map((b) => b.asset.id),
          ...(startFrameAssetId ? [startFrameAssetId] : []),
        ],
        deliveryMethod,
        status: 'QUEUED',
        progress: 10,
      };

      onUpsertTransformVersion(initialVersion);
      setSelectedVersionId(versionId);
      setCompareMode('transformed');

      const finishSuccess = (
        outputUrl: string,
        jobId: string,
        cost?: number,
        currency?: 'CREDITS' | 'USD'
      ) => {
        const resultAsset: HybridAsset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: `${initialVersion.label} · ${activeSourceAsset.name}`,
          category: 'Generated Result',
          mediaType: 'VIDEO',
          url: outputUrl,
          thumbnailUrl: startFrameUrl,
          duration: draft.duration,
          folder: 'Transformations',
          sourceAssetId: activeSourceAsset.id,
          transformVersionId: versionId,
          tags: ['transformed', draft.providerId],
          source: 'generated',
          createdAt: new Date().toISOString(),
        };
        onAddAsset(resultAsset);
        onUpdateTransformVersion(versionId, {
          status: 'COMPLETED',
          progress: 100,
          outputUrl,
          thumbnailUrl: startFrameUrl,
          jobId,
          creditCost: cost,
          currency,
        });
        onShowNotice(`"${initialVersion.label}" complete and preserved alongside original footage`, 'success');
      };

      const failVersion = (msg: string) => {
        onUpdateTransformVersion(versionId, {
          status: 'FAILED',
          progress: 0,
          error: msg,
        });
        onShowNotice(msg, 'error');
      };

      if (draft.providerId === 'bytedance') {
        // Dispatch via /api/ai/generate which passes video_url (reference_video) + reference_image_urls + first_frame/last_frame
        const chosenModelKey =
          plateUrls.length > 0
            ? draft.duration >= 20
              ? 'seedance_25_30s_r2v'
              : 'seedance_25_15s_r2v'
            : draft.duration >= 20
            ? 'seedance_25_30s'
            : 'seedance_25_15s';

        const sub = await seedanceLabService.submitGeneration({
          model: chosenModelKey,
          prompt: compiledPrompt,
          aspect_ratio: draft.aspectRatio,
          video_url: activeSourceAsset.url,
          image_url: startFrameUrl,
          end_image_url: endFrameUrl,
          reference_image_urls: plateUrls.length > 0 ? plateUrls : undefined,
          sound_enabled: draft.generateAudio,
          camera_fixed: draft.cameraFixed,
          duration: draft.duration,
          resolution: draft.resolution,
          physics_priority: draft.physicsPriority,
          content_rating: draft.contentRating,
          idempotencyKey: versionId,
        });

        onUpdateTransformVersion(versionId, {
          status: 'PROCESSING',
          progress: 24,
          jobId: sub.jobCode,
          creditCost: sub.costGenerate,
          currency: 'CREDITS',
        });

        if (sub.immediateResultUrl) {
          finishSuccess(sub.immediateResultUrl, sub.jobCode, sub.costGenerate, 'CREDITS');
          return;
        }

        let attempts = 0;
        const timer = setInterval(async () => {
          attempts++;
          try {
            const st = await seedanceLabService.pollJobStatus(sub.jobCode);
            if (st.status === 'completed' && st.resultUrl) {
              clearInterval(timer);
              streamCleanupsRef.current.delete(versionId);
              finishSuccess(st.resultUrl, sub.jobCode, sub.costGenerate, 'CREDITS');
            } else if (st.status === 'failed') {
              clearInterval(timer);
              streamCleanupsRef.current.delete(versionId);
              failVersion(st.error || 'ByteDance Seedance transformation failed.');
            } else {
              onUpdateTransformVersion(versionId, {
                status: 'PROCESSING',
                progress: st.progress || Math.min(90, 25 + attempts),
              });
            }
          } catch {
            if (attempts > 160) {
              clearInterval(timer);
              streamCleanupsRef.current.delete(versionId);
              failVersion('Transformation polling timed out.');
            }
          }
        }, 3200);
        streamCleanupsRef.current.set(versionId, () => clearInterval(timer));
      } else {
        // Dispatch via Unified Multi-Provider API (MUAPI Seedance 2.5 Spicy)
        const submitted = await multiProviderGenerationService.submitGeneration({
          provider: 'muapi',
          model_id: activeModel?.modelId || 'muapi/seedance-2.5-spicy-image-to-video',
          prompt: compiledPrompt,
          image_url: startFrameUrl,
          last_image: endFrameUrl,
          aspect_ratio: draft.aspectRatio,
          resolution: draft.resolution,
          duration: draft.duration,
          generate_audio: draft.generateAudio,
          camera_fixed: draft.cameraFixed,
          high_bitrate: draft.highBitrate,
          draft: draft.draft,
          physics_priority: draft.physicsPriority,
          content_rating: draft.contentRating,
          idempotency_key: versionId,
        });

        const job = submitted.job;
        onUpdateTransformVersion(versionId, {
          status: job.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
          progress: job.progress || 22,
          jobId: job.job_id,
          creditCost: job.estimated_cost,
          currency: job.currency,
        });

        if (job.status === 'completed' && (job.playback_url || job.provider_output_url)) {
          finishSuccess(
            job.playback_url || job.provider_output_url!,
            job.job_id,
            job.estimated_cost,
            job.currency
          );
          return;
        }

        let resolved = false;
        const handleUpdate = async (u: UnifiedGenerationJob) => {
          if (resolved) return;
          if (u.status === 'completed' && (u.playback_url || u.provider_output_url)) {
            resolved = true;
            streamCleanupsRef.current.get(versionId)?.();
            streamCleanupsRef.current.delete(versionId);
            let finalUrl = u.playback_url || u.provider_output_url!;
            try {
              const mirrored = await mirrorCompletedVideoToFirebaseStorage(u);
              if (mirrored) finalUrl = mirrored;
            } catch {
              // preserve provider playback URL
            }
            finishSuccess(finalUrl, u.job_id, u.estimated_cost, u.currency);
          } else if (u.status === 'failed') {
            resolved = true;
            streamCleanupsRef.current.get(versionId)?.();
            streamCleanupsRef.current.delete(versionId);
            failVersion(u.error || 'MUAPI transformation failed.');
          } else {
            onUpdateTransformVersion(versionId, {
              status: 'PROCESSING',
              progress: Math.min(95, Math.max(15, u.progress || 35)),
            });
          }
        };

        const unsub = multiProviderGenerationService.subscribeToJobRealtimeStream(job.job_id, {
          onInit: (p) => p.job && void handleUpdate(p.job),
          onJobUpdate: (u) => void handleUpdate(u),
          onError: () => undefined,
        });

        const poll = setInterval(async () => {
          if (resolved) return;
          try {
            const st = await multiProviderGenerationService.getJobStatus(job.job_id);
            await handleUpdate(st);
          } catch {
            // retry on next tick
          }
        }, 3800);

        streamCleanupsRef.current.set(versionId, () => {
          unsub();
          clearInterval(poll);
        });
      }
    } catch (err: any) {
      onUpdateTransformVersion(versionId, {
        status: 'FAILED',
        progress: 0,
        error: err?.message || 'Transformation submission failed.',
      });
      onShowNotice(err?.message || 'Transformation submission failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Chain a completed transformation output as a new reference asset (original stays immutable)
  const handleUseResultAsNextRef = (ver: HybridVideoTransformVersion) => {
    if (!ver.outputUrl) return;
    const existing = project.assets.find((a) => a.url === ver.outputUrl && a.mediaType === 'VIDEO');
    if (existing) {
      setSourceAssetId(existing.id);
      setCompareMode('original');
      onShowNotice(`Using "${ver.label}" as reference footage for next transformation pass`, 'info');
      return;
    }
    const chainedAsset: HybridAsset = {
      id: `asset-${Date.now()}-chain`,
      name: `${ver.label} (Reference Chain)`,
      category: 'Reference Video',
      mediaType: 'VIDEO',
      url: ver.outputUrl,
      thumbnailUrl: ver.thumbnailUrl,
      duration: ver.duration,
      folder: 'Transformations',
      sourceAssetId: ver.sourceAssetId,
      transformVersionId: ver.id,
      tags: ['chained-reference'],
      source: 'generated',
      createdAt: new Date().toISOString(),
    };
    onAddAsset(chainedAsset);
    setSourceAssetId(chainedAsset.id);
    setCompareMode('original');
    onShowNotice(`Chained "${ver.label}" as active reference without altering original footage`, 'success');
  };

  const togglePlay = () => {
    if (compareMode === 'split') {
      const l = compareLeftRef.current;
      const r = compareRightRef.current;
      if (!l) return;
      if (l.paused) {
        void l.play();
        void r?.play();
        setIsPlaying(true);
      } else {
        l.pause();
        r?.pause();
        setIsPlaying(false);
      }
      return;
    }
    const v = sourceVideoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (sec: number) => {
    setPlayheadSec(sec);
    if (sourceVideoRef.current) sourceVideoRef.current.currentTime = sec;
    if (compareLeftRef.current) compareLeftRef.current.currentTime = sec;
    if (compareRightRef.current) compareRightRef.current.currentTime = sec;
  };

  const filteredVideoAssets = useMemo(() => {
    if (selectedFolderFilter === 'ALL') return videoAssets;
    return videoAssets.filter((a) => (a.folder || 'Raw Footage') === selectedFolderFilter);
  }, [videoAssets, selectedFolderFilter]);

  const totalDur = activeSourceAsset?.duration || 10;

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden bg-[#050507] text-[#ECECE9]">
      {/* Hidden generic inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleVideoFilesUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={imagePickerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleSlotImageUpload(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* LEFT RAIL: VIDEO REFERENCE IMPORT & FOLDERS (Collapsed cleanly in Focus Mode) */}
      {!focusMode && (
        <aside className="w-72 shrink-0 bg-[#07080b] border-r border-white/[0.1] flex flex-col overflow-hidden select-none">
          <div className="h-10 px-3 border-b border-white/[0.1] bg-[#0b0d12] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300 font-semibold flex items-center gap-1.5">
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Video Reference Vault</span>
            </span>
            <span className="text-[10px] font-mono text-white/45 tabular-nums">
              {videoAssets.length} clips
            </span>
          </div>

          {/* Drag & Drop + Upload + Import Controls */}
          <div className="p-2.5 border-b border-white/[0.08] space-y-2 shrink-0">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  void handleVideoFilesUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed p-3 text-center cursor-pointer transition-colors ${
                dragActive
                  ? 'border-cyan-400 bg-cyan-950/30'
                  : 'border-white/15 bg-black/30 hover:border-white/35'
              }`}
            >
              <Upload className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
              <div className="text-[11px] font-medium text-white">
                {isUploading ? 'Uploading Footage...' : 'Upload or Drop Video'}
              </div>
              <div className="text-[9px] font-mono text-white/40 mt-0.5">
                MP4 · MOV · WEBM · Original preserved
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleLoadRemoteRenders}
                className="flex-1 py-1.5 px-2 border border-white/[0.12] bg-[#0b0d12] hover:border-cyan-400 text-[10px] font-mono uppercase text-white/80 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                Import VAIURE Renders
              </button>
              <button
                type="button"
                onClick={() => setShowNewFolderInput((v) => !v)}
                title="Create Project Folder"
                className="p-1.5 border border-white/[0.12] bg-[#0b0d12] hover:border-white/30 text-white/70 hover:text-white cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {showNewFolderInput && (
              <div className="flex gap-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="New folder name..."
                  className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/15 text-[10px] text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFolderName.trim()) {
                      onAddFolder(newFolderName.trim());
                      setUploadFolder(newFolderName.trim());
                      setSelectedFolderFilter(newFolderName.trim());
                      setNewFolderName('');
                      setShowNewFolderInput(false);
                    }
                  }}
                  className="px-2 py-1 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}

            {/* Folder selector */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={uploadFolder}
                onChange={(e) => setUploadFolder(e.target.value)}
                title="Upload destination folder"
                className="px-1.5 py-1 bg-[#0b0d12] border border-white/[0.1] text-[9px] font-mono text-white/75 focus:outline-none"
              >
                {folders.map((f) => (
                  <option key={f} value={f}>
                    Save: {f}
                  </option>
                ))}
              </select>
              <select
                value={selectedFolderFilter}
                onChange={(e) => setSelectedFolderFilter(e.target.value)}
                title="Filter clips by folder"
                className="px-1.5 py-1 bg-[#0b0d12] border border-white/[0.1] text-[9px] font-mono text-white/75 focus:outline-none"
              >
                <option value="ALL">Folder: All</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Video Clips List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredVideoAssets.length === 0 ? (
              <div className="p-5 border border-dashed border-white/10 text-center space-y-1.5">
                <Film className="w-5 h-5 mx-auto text-white/25" />
                <p className="text-[11px] text-white/60">No video clips in this folder</p>
                <p className="text-[9px] font-mono text-white/40">
                  Upload existing footage or import generated VAIURE videos above.
                </p>
              </div>
            ) : (
              filteredVideoAssets.map((asset) => {
                const isSelected = asset.id === sourceAssetId;
                const isDerived = Boolean(asset.sourceAssetId);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => {
                      setSourceAssetId(asset.id);
                      setCompareMode('original');
                    }}
                    className={`w-full text-left p-2 border transition-colors cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/25'
                        : 'border-white/[0.08] bg-[#0b0d12] hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-16 h-10 bg-black border border-white/10 overflow-hidden shrink-0">
                        <video src={asset.url} muted className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-white truncate">
                          {asset.name}
                        </div>
                        <div className="text-[9px] font-mono text-white/45 truncate mt-0.5 tabular-nums">
                          {[
                            asset.folder || 'Raw Footage',
                            asset.duration ? `${asset.duration}s` : null,
                            asset.width && asset.height ? `${asset.width}×${asset.height}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                        {isDerived && (
                          <div className="text-[9px] font-mono text-cyan-300/80 mt-0.5">
                            Derived Transform Copy
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>
      )}

      {/* CENTER STAGE: MONITOR + SEGMENT SELECTOR + COMPARE + LINEAGE VERSIONS */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#050507]">
        {/* Stage Top Header */}
        <div className="h-10 px-3 border-b border-white/[0.1] bg-[#08090e] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex items-center gap-2 text-[10px] font-mono">
            <span className="text-cyan-300 uppercase tracking-[0.15em] font-semibold whitespace-nowrap">
              Video Transform Stage
            </span>
            {activeSourceAsset && (
              <span className="text-white/60 truncate hidden sm:inline tabular-nums">
                {activeSourceAsset.name}
                {activeSourceAsset.width && activeSourceAsset.height
                  ? ` · ${activeSourceAsset.width}×${activeSourceAsset.height}`
                  : ''}
                {activeSourceAsset.aspectRatio ? ` · ${activeSourceAsset.aspectRatio}` : ''}
                {activeSourceAsset.duration ? ` · ${activeSourceAsset.duration}s` : ''}
                {activeSourceAsset.fileSizeBytes
                  ? ` · ${formatBytes(activeSourceAsset.fileSizeBytes)}`
                  : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Compare View Mode Switch */}
            <div className="flex items-center border border-white/[0.12] bg-[#0b0d12] p-0.5 text-[9px] font-mono uppercase">
              <button
                type="button"
                onClick={() => setCompareMode('original')}
                className={`px-2 py-0.5 cursor-pointer whitespace-nowrap ${
                  compareMode === 'original' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                Original
              </button>
              <button
                type="button"
                disabled={!activeTransformVersion?.outputUrl}
                onClick={() => setCompareMode('transformed')}
                className={`px-2 py-0.5 cursor-pointer whitespace-nowrap disabled:opacity-35 ${
                  compareMode === 'transformed' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                Transformed
              </button>
              <button
                type="button"
                disabled={!activeTransformVersion?.outputUrl}
                onClick={() => setCompareMode('split')}
                className={`px-2 py-0.5 flex items-center gap-1 cursor-pointer whitespace-nowrap disabled:opacity-35 ${
                  compareMode === 'split' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                <Columns className="w-2.5 h-2.5" />
                <span>Compare</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleFocusMode}
              title={focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
              className={`flex items-center gap-1 px-2 py-1 border text-[9px] font-mono uppercase cursor-pointer whitespace-nowrap ${
                focusMode
                  ? 'border-cyan-400 bg-cyan-950/35 text-cyan-300'
                  : 'border-white/[0.12] text-white/65 hover:text-white'
              }`}
            >
              {focusMode ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              <span className="hidden md:inline">{focusMode ? 'Exit Focus' : 'Focus'}</span>
            </button>
          </div>
        </div>

        {/* Main Video Player Canvas */}
        <div className="flex-1 min-h-0 flex flex-col p-3 gap-3 overflow-y-auto">
          <div className="bg-black border border-white/[0.12] min-h-[240px] max-h-[420px] flex items-center justify-center overflow-hidden relative">
            {!activeSourceAsset ? (
              <div className="p-8 text-center space-y-2.5">
                <VideoIcon className="w-8 h-8 mx-auto text-white/25" />
                <div className="text-sm font-medium text-white">No Reference Video Loaded</div>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Upload existing footage or import a generated VAIURE video from the left vault to begin directing AI transformations.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer"
                >
                  Upload Video Reference
                </button>
              </div>
            ) : compareMode === 'split' && activeTransformVersion?.outputUrl ? (
              <div className="w-full h-full grid grid-cols-2 divide-x divide-white/[0.15]">
                <div className="relative flex items-center justify-center bg-black">
                  <video
                    ref={compareLeftRef}
                    src={activeSourceAsset.url}
                    playsInline
                    muted
                    className="w-full max-h-[380px] object-contain"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 border border-white/15 text-[9px] font-mono uppercase text-white/80">
                    Original
                  </span>
                </div>
                <div className="relative flex items-center justify-center bg-black">
                  <video
                    ref={compareRightRef}
                    src={activeTransformVersion.outputUrl}
                    playsInline
                    className="w-full max-h-[380px] object-contain"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/80 border border-cyan-500/40 text-[9px] font-mono uppercase text-cyan-300">
                    {activeTransformVersion.label}
                  </span>
                </div>
              </div>
            ) : compareMode === 'transformed' && activeTransformVersion ? (
              activeTransformVersion.outputUrl ? (
                <video
                  key={activeTransformVersion.outputUrl}
                  src={activeTransformVersion.outputUrl}
                  controls
                  playsInline
                  className="w-full max-h-[400px] object-contain"
                />
              ) : (
                <div className="p-8 text-center space-y-2">
                  {activeTransformVersion.status === 'FAILED' ? (
                    <>
                      <AlertCircle className="w-7 h-7 mx-auto text-rose-400" />
                      <div className="text-xs font-mono text-rose-300">
                        {activeTransformVersion.error || 'Transformation failed'}
                      </div>
                    </>
                  ) : (
                    <>
                      <Loader2 className="w-7 h-7 mx-auto text-cyan-400 animate-spin" />
                      <div className="text-xs font-mono text-white">
                        {activeTransformVersion.label} · {activeTransformVersion.status} ({activeTransformVersion.progress}%)
                      </div>
                      <div className="text-[10px] font-mono text-white/45">
                        {activeTransformVersion.modelName} · {activeTransformVersion.resolution} · {activeTransformVersion.duration}s
                      </div>
                    </>
                  )}
                </div>
              )
            ) : (
              <video
                ref={sourceVideoRef}
                key={activeSourceAsset.url}
                src={activeSourceAsset.url}
                playsInline
                onTimeUpdate={(e) => setPlayheadSec(e.currentTarget.currentTime)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="w-full max-h-[400px] object-contain"
              />
            )}
          </div>

          {/* Scrub & Segment Selection Strip */}
          {activeSourceAsset && (
            <div className="border border-white/[0.1] bg-[#08090e] p-2.5 space-y-2.5 shrink-0">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="w-7 h-7 flex items-center justify-center bg-[#ECECE9] text-black hover:bg-white cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <span className="text-[11px] font-mono text-white/80 tabular-nums">
                    {formatTimecode(playheadSec)} / {formatTimecode(totalDur)}
                  </span>
                </div>

                {/* Entire Video vs Segment Selection */}
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                  <div className="flex items-center border border-white/15 bg-black/50 p-0.5">
                    <button
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, useFullVideo: true }))}
                      className={`px-2 py-0.5 uppercase cursor-pointer ${
                        draft.useFullVideo ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60'
                      }`}
                    >
                      Entire Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft((p) => ({ ...p, useFullVideo: false }))}
                      className={`px-2 py-0.5 uppercase cursor-pointer ${
                        !draft.useFullVideo ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60'
                      }`}
                    >
                      Segment Window
                    </button>
                  </div>

                  {!draft.useFullVideo && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            segmentStart: Math.min(Math.round(playheadSec * 10) / 10, p.segmentEnd),
                          }))
                        }
                        className="px-2 py-0.5 border border-white/15 hover:border-cyan-400 text-white/80 hover:text-cyan-300 cursor-pointer"
                      >
                        Set In ({draft.segmentStart.toFixed(1)}s)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            segmentEnd: Math.max(Math.round(playheadSec * 10) / 10, p.segmentStart),
                          }))
                        }
                        className="px-2 py-0.5 border border-white/15 hover:border-cyan-400 text-white/80 hover:text-cyan-300 cursor-pointer"
                      >
                        Set Out ({draft.segmentEnd.toFixed(1)}s)
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={isExtractingFrames}
                    onClick={() => void handleExtractSegmentFrames()}
                    className="flex items-center gap-1 px-2 py-0.5 border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40 cursor-pointer disabled:opacity-45 whitespace-nowrap"
                    title="Capture high-res Start/End frames at the active window for Image/Keyframe Seedance & MUAPI Spicy workflows"
                  >
                    {isExtractingFrames ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Scissors className="w-3 h-3" />
                    )}
                    <span>Extract Segment Frames</span>
                  </button>
                </div>
              </div>

              {/* Scrubber */}
              <div className="space-y-1">
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.5, totalDur)}
                  step={0.1}
                  value={Math.min(playheadSec, totalDur)}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                {!draft.useFullVideo && (
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-white/55">
                    <label className="flex items-center gap-2">
                      <span>In Sec:</span>
                      <input
                        type="number"
                        min={0}
                        max={draft.segmentEnd}
                        step={0.1}
                        value={draft.segmentStart}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            segmentStart: Math.max(0, Math.min(Number(e.target.value), p.segmentEnd)),
                          }))
                        }
                        className="w-16 px-1.5 py-0.5 bg-black/50 border border-white/15 text-white tabular-nums"
                      />
                    </label>
                    <label className="flex items-center gap-2 justify-end">
                      <span>Out Sec:</span>
                      <input
                        type="number"
                        min={draft.segmentStart}
                        max={totalDur}
                        step={0.1}
                        value={draft.segmentEnd}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            segmentEnd: Math.min(totalDur, Math.max(Number(e.target.value), p.segmentStart)),
                          }))
                        }
                        className="w-16 px-1.5 py-0.5 bg-black/50 border border-white/15 text-white tabular-nums"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Honest Model Input Routing Disclosure */}
              <div className="pt-1 border-t border-white/[0.06] text-[10px] font-mono text-white/50 flex items-center justify-between gap-2">
                <span>
                  {draft.providerId === 'bytedance'
                    ? !draft.useFullVideo
                      ? 'ByteDance Seedance 2.5 receives full hosted reference_video + segment timecode instruction + extracted/bound image plates.'
                      : 'ByteDance Seedance 2.5 receives reference_video + bound reference_image plates.'
                    : 'MUAPI Spicy consumes extracted Segment Start Frame (image_url) + optional End Frame for 480p–4K video synthesis.'}
                </span>
                {draft.extractedStartFrameAssetId && (
                  <span className="text-emerald-300 shrink-0 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Frame Captured</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Bottom Output Versions & Lineage Strip (Original Always Preserved) */}
          <div className="border border-white/[0.1] bg-[#08090e] p-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="uppercase tracking-wider text-white/75 flex items-center gap-1.5 font-semibold">
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Transformation Versions ({sourceTransforms.length})</span>
              </span>
              <span className="text-white/40 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Original Footage Immutable</span>
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {/* Immutable Original Tile */}
              {activeSourceAsset && (
                <button
                  type="button"
                  onClick={() => setCompareMode('original')}
                  className={`w-44 shrink-0 text-left p-2 border transition-colors cursor-pointer space-y-1 ${
                    compareMode === 'original'
                      ? 'border-emerald-400/60 bg-emerald-950/20'
                      : 'border-white/[0.1] bg-[#0b0d12] hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase text-emerald-300">
                    <span>Original Reference</span>
                    <Lock className="w-2.5 h-2.5" />
                  </div>
                  <div className="text-[11px] font-medium text-white truncate">
                    {activeSourceAsset.name}
                  </div>
                  <div className="text-[9px] font-mono text-white/45 tabular-nums">
                    {activeSourceAsset.duration ? `${activeSourceAsset.duration}s` : 'Source'} · Preserved
                  </div>
                </button>
              )}

              {/* Transformation Outputs */}
              {sourceTransforms.map((ver) => {
                const isSel = ver.id === activeTransformVersion?.id && compareMode !== 'original';
                return (
                  <div
                    key={ver.id}
                    className={`w-56 shrink-0 p-2 border bg-[#0b0d12] space-y-1.5 ${
                      isSel ? 'border-cyan-400 bg-cyan-950/20' : 'border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      {renamingId === ver.id ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <input
                            type="text"
                            value={renameText}
                            onChange={(e) => setRenameText(e.target.value)}
                            className="flex-1 min-w-0 px-1 py-0.5 bg-black border border-cyan-400 text-[10px] text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (renameText.trim()) {
                                onUpdateTransformVersion(ver.id, { label: renameText.trim() });
                              }
                              setRenamingId(null);
                            }}
                            className="text-emerald-400 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVersionId(ver.id);
                            setCompareMode('transformed');
                          }}
                          className="text-[11px] font-medium text-white truncate text-left flex-1 cursor-pointer hover:text-cyan-300"
                        >
                          {ver.label}
                        </button>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(ver.id);
                            setRenameText(ver.label);
                          }}
                          title="Rename version"
                          className="text-white/40 hover:text-white cursor-pointer"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTransformVersion(ver.id)}
                          title="Delete version"
                          className="text-white/40 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[9px] font-mono text-white/50 truncate tabular-nums">
                      {ver.resolution} · {ver.duration}s · {ver.status}
                    </div>

                    {ver.outputUrl && (
                      <div className="flex flex-wrap gap-1 pt-1 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVersionId(ver.id);
                            setCompareMode('split');
                          }}
                          className="px-1.5 py-0.5 border border-white/15 hover:border-cyan-400 text-[9px] font-mono text-white/80 hover:text-cyan-300 cursor-pointer"
                        >
                          Compare
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUseResultAsNextRef(ver)}
                          className="px-1.5 py-0.5 border border-white/15 hover:border-cyan-400 text-[9px] font-mono text-white/80 hover:text-cyan-300 cursor-pointer"
                          title="Chain this result as reference for another transformation pass"
                        >
                          Chain Ref
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendToStoryboardShot(ver.outputUrl!, ver.label, ver.thumbnailUrl, ver.duration)
                          }
                          className="px-1.5 py-0.5 border border-white/15 hover:border-emerald-400 text-[9px] font-mono text-white/80 hover:text-emerald-300 cursor-pointer"
                        >
                          Storyboard
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendToTimeline(ver.outputUrl!, ver.label, ver.thumbnailUrl, ver.duration)
                          }
                          className="px-1.5 py-0.5 border border-white/15 hover:border-emerald-400 text-[9px] font-mono text-white/80 hover:text-emerald-300 cursor-pointer"
                        >
                          + Timeline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT INSPECTOR PANEL: TRANSFORMATION MODES + PROMPT SYSTEM + ENGINE */}
      <aside className="w-[340px] sm:w-[370px] shrink-0 bg-[#07080b] border-l border-white/[0.1] flex flex-col overflow-hidden select-none">
        {/* Top Inspector Tabs */}
        <div className="h-10 px-2 border-b border-white/[0.1] bg-[#0b0d12] flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setRightTab('categories')}
            className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer ${
              rightTab === 'categories' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            1. Categories
          </button>
          <button
            type="button"
            onClick={() => setRightTab('director')}
            className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer ${
              rightTab === 'director' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            2. Director & Refs
          </button>
          <button
            type="button"
            onClick={() => setRightTab('engine')}
            className={`flex-1 py-1.5 text-[9px] font-mono uppercase tracking-wider cursor-pointer ${
              rightTab === 'engine' ? 'bg-[#ECECE9] text-black font-semibold' : 'text-white/60 hover:text-white'
            }`}
          >
            3. Engine & Run
          </button>
        </div>

        {/* Scrollable Inspector Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {rightTab === 'categories' && (
            <div className="space-y-2">
              {/* A. Environment & Background */}
              <div className="border border-white/[0.1] bg-[#0b0d12]">
                <button
                  type="button"
                  onClick={() => setOpenCat(openCat === 'environment' ? 'character' : 'environment')}
                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>A. Environment & Background</span>
                  {openCat === 'environment' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {openCat === 'environment' && (
                  <div className="p-2.5 border-t border-white/[0.08] space-y-2">
                    <select
                      value={draft.environmentPreset}
                      onChange={(e) => {
                        const preset = ENVIRONMENT_PRESETS.find((p) => p.id === e.target.value);
                        setDraft((p) => ({
                          ...p,
                          environmentPreset: e.target.value,
                          environmentPrompt: preset && preset.id !== 'custom' ? preset.prompt : p.environmentPrompt,
                        }));
                      }}
                      className="w-full px-2 py-1.5 bg-black/60 border border-white/15 text-[10px] font-mono text-white"
                    >
                      {ENVIRONMENT_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>
                          Preset: {p.label}
                        </option>
                      ))}
                    </select>
                    <textarea
                      rows={3}
                      value={draft.environmentPrompt}
                      onChange={(e) => setDraft((p) => ({ ...p, environmentPrompt: e.target.value }))}
                      placeholder="Describe new location, terrain, architecture, or background transformation..."
                      className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={draft.environmentRefAssetId || ''}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, environmentRefAssetId: e.target.value || undefined }))
                        }
                        className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Environment Ref Image: None</option>
                        {imageAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            Plate: {a.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          refImageUploadRef.current = { slot: 'environment' };
                          imagePickerInputRef.current?.click();
                        }}
                        className="px-2 py-1 border border-white/15 text-[9px] font-mono uppercase text-white/80 hover:text-white cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* B. Character & Subject */}
              <div className="border border-white/[0.1] bg-[#0b0d12]">
                <button
                  type="button"
                  onClick={() => setOpenCat(openCat === 'character' ? 'elements' : 'character')}
                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>B. Character & Subject Direction</span>
                  {openCat === 'character' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {openCat === 'character' && (
                  <div className="p-2.5 border-t border-white/[0.08] space-y-2">
                    <div className="text-[9px] font-mono text-white/45 leading-snug">
                      Directs appearance, wardrobe, and multimodal @Image plate reference; model regenerates frames holistically rather than masked pixel replacement.
                    </div>
                    <input
                      type="text"
                      value={draft.subjectTargetDescription}
                      onChange={(e) => setDraft((p) => ({ ...p, subjectTargetDescription: e.target.value }))}
                      placeholder="Target subject (e.g., central runner in foreground)"
                      className="w-full px-2 py-1 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      value={draft.characterAppearancePrompt}
                      onChange={(e) => setDraft((p) => ({ ...p, characterAppearancePrompt: e.target.value }))}
                      placeholder="Desired appearance (hair, silhouette, demeanor)"
                      className="w-full px-2 py-1 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      value={draft.characterClothingPrompt}
                      onChange={(e) => setDraft((p) => ({ ...p, characterClothingPrompt: e.target.value }))}
                      placeholder="Clothing / wardrobe transform (e.g., matte obsidian trench)"
                      className="w-full px-2 py-1 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={draft.characterRefAssetId || ''}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, characterRefAssetId: e.target.value || undefined }))
                        }
                        className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Character Ref Plate: None</option>
                        {imageAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            Plate: {a.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          refImageUploadRef.current = { slot: 'character' };
                          imagePickerInputRef.current?.click();
                        }}
                        className="px-2 py-1 border border-white/15 text-[9px] font-mono uppercase text-white/80 hover:text-white cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* C. Object & Element Addition */}
              <div className="border border-white/[0.1] bg-[#0b0d12]">
                <button
                  type="button"
                  onClick={() => setOpenCat(openCat === 'elements' ? 'atmosphere' : 'elements')}
                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>C. Object & Element Addition</span>
                  {openCat === 'elements' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {openCat === 'elements' && (
                  <div className="p-2.5 border-t border-white/[0.08] space-y-2">
                    <textarea
                      rows={3}
                      value={draft.elementsAddPrompt}
                      onChange={(e) => setDraft((p) => ({ ...p, elementsAddPrompt: e.target.value }))}
                      placeholder="Introduce new vehicles, props, foreground architecture, or creatures..."
                      className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={draft.elementsRefAssetId || ''}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, elementsRefAssetId: e.target.value || undefined }))
                        }
                        className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Object / Prop Ref: None</option>
                        {imageAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            Plate: {a.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          refImageUploadRef.current = { slot: 'elements' };
                          imagePickerInputRef.current?.click();
                        }}
                        className="px-2 py-1 border border-white/15 text-[9px] font-mono uppercase text-white/80 hover:text-white cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* D. Atmosphere & Lighting */}
              <div className="border border-white/[0.1] bg-[#0b0d12]">
                <button
                  type="button"
                  onClick={() => setOpenCat(openCat === 'atmosphere' ? 'style' : 'atmosphere')}
                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>D. Atmosphere & Lighting</span>
                  {openCat === 'atmosphere' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {openCat === 'atmosphere' && (
                  <div className="p-2.5 border-t border-white/[0.08] space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={draft.atmosphereWeather}
                        onChange={(e) => setDraft((p) => ({ ...p, atmosphereWeather: e.target.value }))}
                        className="px-2 py-1 bg-black/50 border border-white/15 text-[10px] font-mono text-white"
                      >
                        <option value="">Weather: Unchanged</option>
                        {WEATHER_OPTIONS.filter(Boolean).map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                      <select
                        value={draft.atmosphereTimeOfDay}
                        onChange={(e) => setDraft((p) => ({ ...p, atmosphereTimeOfDay: e.target.value }))}
                        className="px-2 py-1 bg-black/50 border border-white/15 text-[10px] font-mono text-white"
                      >
                        <option value="">Time: Unchanged</option>
                        {TIME_OF_DAY_OPTIONS.filter(Boolean).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={draft.atmosphereLighting}
                      onChange={(e) => setDraft((p) => ({ ...p, atmosphereLighting: e.target.value }))}
                      placeholder="Lighting transform (e.g., cold overhead tungsten, crimson rim)"
                      className="w-full px-2 py-1 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <input
                      type="text"
                      value={draft.atmosphereMood}
                      onChange={(e) => setDraft((p) => ({ ...p, atmosphereMood: e.target.value }))}
                      placeholder="Color grade / atmospheric haze..."
                      className="w-full px-2 py-1 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>

              {/* E. Cinematic Style Transformation */}
              <div className="border border-white/[0.1] bg-[#0b0d12]">
                <button
                  type="button"
                  onClick={() => setOpenCat(openCat === 'style' ? 'environment' : 'style')}
                  className="w-full px-3 py-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white cursor-pointer"
                >
                  <span>E. Cinematic Visual Style</span>
                  {openCat === 'style' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {openCat === 'style' && (
                  <div className="p-2.5 border-t border-white/[0.08] space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {STYLE_STARTERS.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setDraft((p) => ({ ...p, visualStyleDirection: s.text }))}
                          className="px-2 py-1 border border-white/15 hover:border-cyan-400 text-[9px] font-mono text-white/75 hover:text-cyan-300 cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={3}
                      value={draft.visualStyleDirection}
                      onChange={(e) => setDraft((p) => ({ ...p, visualStyleDirection: e.target.value }))}
                      placeholder="Unrestricted visual style direction (film stock, lens character, rendering mood)..."
                      className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="flex items-center gap-1.5">
                      <select
                        value={draft.styleRefAssetId || ''}
                        onChange={(e) =>
                          setDraft((p) => ({ ...p, styleRefAssetId: e.target.value || undefined }))
                        }
                        className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Style Ref Image: None</option>
                        {imageAssets.map((a) => (
                          <option key={a.id} value={a.id}>
                            Plate: {a.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          refImageUploadRef.current = { slot: 'style' };
                          imagePickerInputRef.current?.click();
                        }}
                        className="px-2 py-1 border border-white/15 text-[9px] font-mono uppercase text-white/80 hover:text-white cursor-pointer"
                      >
                        Upload
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setRightTab('director')}
                className="w-full py-2 border border-white/15 hover:border-cyan-400 text-[10px] font-mono uppercase text-white/80 hover:text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Next: Director Prompt & Reference Slots</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {rightTab === 'director' && (
            <div className="space-y-3">
              {/* Central Video Director Prompt System */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 font-semibold">
                    Main Transformation Prompt
                  </label>
                  <button
                    type="button"
                    disabled={isOptimizing}
                    onClick={handleOptimizePrompt}
                    className="flex items-center gap-1 px-2 py-0.5 border border-cyan-500/40 bg-cyan-950/35 text-[9px] font-mono uppercase text-cyan-300 hover:bg-cyan-900/45 cursor-pointer disabled:opacity-45"
                  >
                    {isOptimizing ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Optimize Physics</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={draft.mainPrompt}
                  onChange={(e) => setDraft((p) => ({ ...p, mainPrompt: e.target.value }))}
                  placeholder="Describe the overarching cinematic transformation of the reference footage..."
                  className="w-full px-2.5 py-2 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/60">
                  Elements to Change / Replace
                </label>
                <input
                  type="text"
                  value={draft.elementsToChange}
                  onChange={(e) => setDraft((p) => ({ ...p, elementsToChange: e.target.value }))}
                  placeholder="e.g., urban street -> flooded ancient temple courtyard"
                  className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/60">
                  Elements to Add
                </label>
                <input
                  type="text"
                  value={draft.elementsToAdd}
                  onChange={(e) => setDraft((p) => ({ ...p, elementsToAdd: e.target.value }))}
                  placeholder="e.g., drifting embers, volumetric fog, reflections"
                  className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-mono uppercase text-white/60">
                    Elements to Preserve (Prompt Direction)
                  </label>
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRESERVE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setDraft((p) => ({
                          ...p,
                          elementsToPreserve: p.elementsToPreserve.includes(chip)
                            ? p.elementsToPreserve
                            : [p.elementsToPreserve, chip].filter(Boolean).join(', '),
                        }))
                      }
                      className="px-1.5 py-0.5 border border-white/10 hover:border-cyan-400 text-[9px] font-mono text-white/65 hover:text-cyan-300 cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={draft.elementsToPreserve}
                  onChange={(e) => setDraft((p) => ({ ...p, elementsToPreserve: e.target.value }))}
                  className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-white/55">
                    Camera Direction
                  </label>
                  <select
                    value={draft.cameraDirection}
                    onChange={(e) => setDraft((p) => ({ ...p, cameraDirection: e.target.value }))}
                    className="w-full px-2 py-1 bg-black/50 border border-white/15 text-[10px] font-mono text-white"
                  >
                    <option value="Match reference camera motion">Match Reference</option>
                    {CAMERA_MOVEMENT_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-white/55">
                    Motion Dynamics
                  </label>
                  <input
                    type="text"
                    value={draft.motionDirection}
                    onChange={(e) => setDraft((p) => ({ ...p, motionDirection: e.target.value }))}
                    className="w-full px-2 py-1 bg-black/50 border border-white/15 text-[10px] text-white"
                  />
                </div>
              </div>

              {/* Multi-Reference Composition Summary Slots */}
              <div className="border border-white/[0.1] bg-[#0b0d12] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-white/70">
                  <span>Reference Composition Slots</span>
                  <span className="text-cyan-300">
                    {boundPlates.length} plate{boundPlates.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.05]">
                    <span className="text-white/50">VIDEO INPUT (@Video1)</span>
                    <span className={activeSourceAsset ? 'text-emerald-300 truncate max-w-[160px]' : 'text-rose-400'}>
                      {activeSourceAsset ? activeSourceAsset.name : 'Required'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-0.5 border-b border-white/[0.05]">
                    <span className="text-white/50">START KEYFRAME</span>
                    <span className={draft.extractedStartFrameAssetId ? 'text-emerald-300' : 'text-white/35'}>
                      {draft.extractedStartFrameAssetId ? 'Segment Frame Ready' : 'Optional / Auto on MUAPI'}
                    </span>
                  </div>
                  {boundPlates.map((b, i) => (
                    <div
                      key={`${b.asset.id}-${i}`}
                      className="flex items-center justify-between py-0.5 border-b border-white/[0.05]"
                    >
                      <span className="text-cyan-300">
                        @Image{i + 1} · {b.role}
                      </span>
                      <span className="text-white/80 truncate max-w-[140px]">{b.asset.name}</span>
                    </div>
                  ))}
                </div>
                {draft.providerId === 'muapi' && boundPlates.length > 0 && (
                  <div className="text-[9px] font-mono text-amber-300/90 pt-1">
                    Note: MUAPI Spicy uses the Start Keyframe + Prompt; multi-plate @Image bindings require ByteDance Seedance 2.5.
                  </div>
                )}
              </div>

              {/* Prompt Preview Toggle */}
              <button
                type="button"
                onClick={() => setShowPromptPreview((v) => !v)}
                className="w-full py-1.5 border border-white/10 text-[9px] font-mono uppercase text-white/60 hover:text-white cursor-pointer"
              >
                {showPromptPreview ? 'Hide Compiled Seedance 2.5 Prompt' : 'Preview Compiled Seedance 2.5 Prompt'}
              </button>
              {showPromptPreview && (
                <div className="p-2.5 border border-white/10 bg-black/60 text-[10px] font-mono text-white/75 leading-relaxed">
                  {compiledPrompt || 'Add transformation direction above.'}
                </div>
              )}

              <button
                type="button"
                onClick={() => setRightTab('engine')}
                className="w-full py-2 border border-white/15 hover:border-cyan-400 text-[10px] font-mono uppercase text-white/80 hover:text-cyan-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Next: Engine Parameters & Transform</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {rightTab === 'engine' && (
            <div className="space-y-3">
              {/* Provider Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/55">
                  Video Generation Engine
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleProviderChange('bytedance')}
                    className={`p-2 border text-left transition-colors cursor-pointer ${
                      draft.providerId === 'bytedance'
                        ? 'border-cyan-400 bg-cyan-950/30 text-white'
                        : 'border-white/10 bg-[#0b0d12] text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-semibold uppercase">ByteDance 2.5</div>
                    <div className="text-[9px] font-mono text-white/45 mt-0.5">
                      Native reference_video + plates
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleProviderChange('muapi')}
                    className={`p-2 border text-left transition-colors cursor-pointer ${
                      draft.providerId === 'muapi'
                        ? 'border-cyan-400 bg-cyan-950/30 text-white'
                        : 'border-white/10 bg-[#0b0d12] text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-semibold uppercase">MUAPI Spicy</div>
                    <div className="text-[9px] font-mono text-white/45 mt-0.5">
                      480p–4K via Segment Frame
                    </div>
                  </button>
                </div>
              </div>

              {/* Model */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/55">Model</label>
                <select
                  value={activeModel?.modelId || draft.modelId}
                  onChange={(e) => {
                    const m = availableModels.find((x) => x.modelId === e.target.value);
                    if (!m) return;
                    setDraft((p) => ({
                      ...p,
                      modelId: m.modelId,
                      resolution: m.enabledResolutions.includes(p.resolution)
                        ? p.resolution
                        : m.enabledResolutions[0] || '720p',
                      duration: m.enabledDurations.includes(p.duration as any)
                        ? p.duration
                        : m.enabledDurations[0] || 5,
                    }));
                  }}
                  className="w-full px-2 py-1.5 bg-[#0b0d12] border border-white/15 text-xs font-mono text-white"
                >
                  {availableModels.map((m) => (
                    <option key={m.modelId} value={m.modelId}>
                      {m.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution / Duration / Aspect Ratio */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-white/50">Aspect</label>
                  <select
                    value={draft.aspectRatio}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, aspectRatio: e.target.value as HybridAspectRatio }))
                    }
                    className="w-full px-1.5 py-1.5 bg-[#0b0d12] border border-white/15 text-[10px] font-mono text-white"
                  >
                    {['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'].map((ar) => (
                      <option key={ar} value={ar}>{ar}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-white/50">Resolution</label>
                  <select
                    value={draft.resolution}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, resolution: e.target.value as GenerationResolution }))
                    }
                    className="w-full px-1.5 py-1.5 bg-[#0b0d12] border border-white/15 text-[10px] font-mono text-white"
                  >
                    {(activeModel?.enabledResolutions || ['720p']).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono uppercase text-white/50">Duration</label>
                  <select
                    value={draft.duration}
                    onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))}
                    className="w-full px-1.5 py-1.5 bg-[#0b0d12] border border-white/15 text-[10px] font-mono text-white"
                  >
                    {(activeModel?.enabledDurations || [5, 10, 15]).map((d) => (
                      <option key={d} value={d}>{d}s</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Technical Toggles */}
              <div className="space-y-1.5 pt-1 text-[11px]">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/75">Complex Physics Priority</span>
                  <input
                    type="checkbox"
                    checked={draft.physicsPriority}
                    onChange={(e) => setDraft((p) => ({ ...p, physicsPriority: e.target.checked }))}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/75">Synchronized Audio</span>
                  <input
                    type="checkbox"
                    checked={draft.generateAudio}
                    onChange={(e) => setDraft((p) => ({ ...p, generateAudio: e.target.checked }))}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-white/75">Camera Fixed (Lock Tripod)</span>
                  <input
                    type="checkbox"
                    checked={draft.cameraFixed}
                    onChange={(e) => setDraft((p) => ({ ...p, cameraFixed: e.target.checked }))}
                    className="accent-cyan-400"
                  />
                </label>
                {activeModel?.supportsDraftMode && (
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-white/75">Draft 480p Fast Pass</span>
                    <input
                      type="checkbox"
                      checked={draft.draft}
                      onChange={(e) => setDraft((p) => ({ ...p, draft: e.target.checked }))}
                      className="accent-cyan-400"
                    />
                  </label>
                )}
              </div>

              {/* Cost Readout */}
              <div className="p-2.5 border border-white/[0.1] bg-[#0b0d12] flex items-center justify-between text-[11px] font-mono tabular-nums">
                <span className="text-white/50 uppercase">Estimated Render Cost</span>
                <span className="text-white font-semibold">
                  {muapiPricePreview
                    ? `$${muapiPricePreview.finalPriceUsd.toFixed(2)} (${muapiPricePreview.effectiveResolution})`
                    : `${draft.duration >= 20 ? 7 : 4} Credits`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Generate CTA Footer */}
        <div className="p-3 border-t border-white/[0.1] bg-[#0b0d12] space-y-2 shrink-0">
          <button
            type="button"
            disabled={isSubmitting || !activeSourceAsset || !compiledPrompt}
            onClick={() => void handleRunTransformation()}
            className="w-full py-2.5 px-4 bg-[#ECECE9] hover:bg-white text-black text-xs font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Submitting Transformation...' : 'Generate Transformed Video'}</span>
          </button>
          <div className="text-[9px] font-mono text-white/40 text-center">
            Outputs archive as separate versions · Original footage never modified
          </div>
        </div>
      </aside>

      {/* IMPORT VAIURE RENDERS MODAL */}
      {showImportPanel && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowImportPanel(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#090a0f] border border-white/[0.15] text-[#ECECE9] shadow-2xl flex flex-col max-h-[80vh]"
          >
            <div className="px-4 py-3 border-b border-white/[0.1] bg-[#0b0d12] flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold">
                Import Existing VAIURE Generated Videos
              </span>
              <button
                type="button"
                onClick={() => setShowImportPanel(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingRemote ? (
                <div className="p-10 text-center space-y-2">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-cyan-400" />
                  <div className="text-xs font-mono text-white/60">
                    Fetching completed VAIURE video history...
                  </div>
                </div>
              ) : remoteRenders.length === 0 ? (
                <div className="p-10 text-center space-y-2 border border-dashed border-white/10">
                  <Film className="w-6 h-6 mx-auto text-white/25" />
                  <div className="text-xs text-white/70">No completed remote VAIURE renders found yet.</div>
                  <div className="text-[10px] font-mono text-white/40">
                    Sign in and generate videos on Canvas or Hybrid Studio to import them here.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {remoteRenders.map((item) => (
                    <div
                      key={item.id}
                      className="border border-white/[0.1] bg-[#0b0d12] p-2.5 space-y-2"
                    >
                      <video
                        src={item.url}
                        muted
                        controls
                        className="w-full aspect-video bg-black object-contain"
                      />
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-white truncate">{item.title}</div>
                        <div className="text-[9px] font-mono text-white/45 truncate">
                          {item.model} {item.duration ? `· ${item.duration}s` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportRemoteItem(item)}
                        className="w-full py-1.5 bg-[#ECECE9] hover:bg-white text-black text-[10px] font-mono font-semibold uppercase cursor-pointer"
                      >
                        Load as Reference Footage
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
