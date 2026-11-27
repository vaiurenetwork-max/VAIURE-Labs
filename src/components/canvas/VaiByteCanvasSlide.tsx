/**
 * SLIDE 7: VAIURE Canvas Studio (Unified Multi-Provider Video & Keyframe Workspace)
 * Core Philosophy: SIMPLE TO OPERATE. POWERFUL UNDER THE HOOD.
 *
 * Three-Area Workspace:
 * - Left Panel: Collapsible & Minimizable Production Tools (Creation, Assets, Advanced Tools)
 * - Center Panel: Spacious Stage (Video Preview, References, Timeline), Node Workflow DAG & 2D Plate Painter
 * - Right Panel: Collapsible & Minimizable Generation Settings (Basic, Prompt, Default-Collapsed Advanced) + Layer/Brush Dock
 * - Smart Simple Mode vs Advanced Mode toggle preserving all prompts, media, node graphs & painted layers
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Menu,
  MousePointer2,
  Hand,
  Brush,
  Eraser,
  Minus,
  Square,
  Circle,
  Type as TypeIcon,
  Pipette,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Upload,
  Sparkles,
  Download,
  FileJson,
  FolderOpen,
  Layers,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  AlertCircle,
  Workflow,
  PenTool,
  MonitorPlay,
  Minimize2,
  Maximize2,
  Wrench,
} from 'lucide-react';
import {
  CanvasToolId,
  CanvasBlendMode,
  CanvasAspectPreset,
  CanvasLayerMeta,
  CanvasHistorySnapshot,
  CANVAS_ASPECT_DIMENSIONS,
  CANVAS_BG_SWATCHES,
  CANVAS_COLOR_SWATCHES,
  DEFAULT_LAYER_FILTERS,
  SCENE_DIRECTORS,
  CAMERA_MOVEMENTS,
  FILM_STOCK_LENSES,
} from './canvasTypes';
import {
  CanvasAssetItem,
  CanvasCenterStage,
  CanvasCreationMode,
  CanvasEstimateState,
  CanvasExperienceMode,
  CanvasGenerationConfig,
  CanvasLayoutPreferences,
  CanvasLeftSectionsState,
  CanvasRightSectionsState,
  CanvasTimelineClip,
  deriveModelCapabilities,
  loadCanvasLayoutPreferences,
  saveCanvasLayoutPreferences,
} from './canvasWorkspaceTypes';
import { CanvasLeftToolsPanel } from './CanvasLeftToolsPanel';
import { CanvasCenterWorkspace } from './CanvasCenterWorkspace';
import { CanvasRightSettingsPanel } from './CanvasRightSettingsPanel';
import { extractExactLastFrame } from './videoFrameExtractor';
import { seedanceLabService, SEEDANCE_MODELS } from '../../services/seedanceLabService';
import {
  computeLocalMuapiPricePreview,
  multiProviderGenerationService,
} from '../../services/multiProviderGenerationService';
import { getAuthHeaders } from '../../services/authTokenHelper';
import { UserProfile } from '../../types/social';
import {
  GenerationResolution,
  ProviderConfigPublic,
} from '../../types/multiProvider';

interface VaiByteCanvasSlideProps {
  onOpenMenu?: () => void;
  onGoToSeedance?: (exportedImageUrl?: string | string[]) => void;
  onGoToFuLabs?: () => void;
  onBackToHero?: () => void;
  currentUser?: UserProfile | null;
}

interface TextPlacementState {
  active: boolean;
  x: number;
  y: number;
  value: string;
}

interface ShapeDragState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function makeLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function buildFallbackProviders(): ProviderConfigPublic[] {
  return [
    {
      providerId: 'bytedance',
      displayName: 'ByteDance Official',
      enabled: true,
      configured: true,
      baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
      autoFallbackEnabled: false,
      pollIntervalMs: 3500,
      maxPollTimeoutMs: 600000,
      creditsPerUsd: 27,
      enforceWalletOnUsdProviders: false,
      safetyCheckerLockedOn: true,
      safetyNotice: 'ByteDance ModelArk policy enforced.',
      updatedAt: new Date().toISOString(),
      models: Object.values(SEEDANCE_MODELS).map((m) => ({
        providerId: 'bytedance',
        modelId: m.id,
        displayName: m.name,
        enabled: true,
        category: m.isR2V ? 'Motion / R2V' : 'Video',
        supportsImageToVideo: true,
        supportsTextToVideo: !m.isR2V,
        requiresStartImage: false,
        supportsLastImage: true,
        supportsReferencePlates: true,
        maxReferenceImages: m.maxReferenceImages,
        supportsDraftMode: false,
        supportsAudio: true,
        supportsCameraFixed: true,
        supportsHighBitrate: false,
        resolutions: ['480p', '720p', '1080p'],
        durations: m.durationSeconds === 30 ? [15, 20, 30] : [5, 10, 15],
        enabledResolutions: ['480p', '720p', '1080p'],
        enabledDurations: m.durationSeconds === 30 ? [15, 20, 30] : [5, 10, 15],
        pricingCurrency: 'CREDITS',
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: true,
        safetyNotice: 'ByteDance ModelArk policy enforced.',
      })),
    },
  ];
}

export const VaiByteCanvasSlide: React.FC<VaiByteCanvasSlideProps> = ({
  onOpenMenu,
  onGoToSeedance,
  onGoToFuLabs,
  onBackToHero,
  currentUser,
}) => {
  // Persisted UI panel & layout configuration (never clears creative state)
  const [layoutPrefs, setLayoutPrefs] = useState<CanvasLayoutPreferences>(() =>
    loadCanvasLayoutPreferences()
  );

  const updateLayoutPrefs = useCallback(
    (updater: (prev: CanvasLayoutPreferences) => CanvasLayoutPreferences) => {
      setLayoutPrefs((prev) => {
        const next = updater(prev);
        saveCanvasLayoutPreferences(next);
        return next;
      });
    },
    []
  );

  // Responsive mobile drawer toggles
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  // Providers, Assets, Timeline & Generation State
  const [providers, setProviders] = useState<ProviderConfigPublic[]>(() => buildFallbackProviders());
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [assets, setAssets] = useState<CanvasAssetItem[]>([]);
  const [timelineClips, setTimelineClips] = useState<CanvasTimelineClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  const [config, setConfig] = useState<CanvasGenerationConfig>({
    providerId: 'bytedance',
    modelId: 'seedance_25_15s',
    creationMode: 'text_to_video',
    prompt: '',
    sceneDescription: '',
    visualStyleId: '',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 15,
    quantity: 1,
    cameraMovementId: '',
    filmStockId: '',
    cameraFixed: false,
    physicsPriority: true,
    generateAudio: true,
    highBitrate: false,
    draft: false,
    draftRequestId: '',
    seedInput: '',
    contentRating: 'standard',
    startImageUrl: '',
    endImageUrl: '',
    referenceImageUrls: [],
    extensionVideoUrl: '',
  });

  const capabilities = useMemo(
    () => deriveModelCapabilities(providers, config.providerId, config.modelId),
    [providers, config.providerId, config.modelId]
  );

  const [estimateState, setEstimateState] = useState<CanvasEstimateState>({
    loading: false,
    estimate: null,
  });

  const [activeGenStatus, setActiveGenStatus] = useState<{
    status: 'idle' | 'submitting' | 'processing' | 'completed' | 'failed';
    progress: number;
    stageLabel?: string;
    error?: string | null;
    isFinalizing?: boolean;
  }>({ status: 'idle', progress: 0 });

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);
  const [isExtractingLastFrame, setIsExtractingLastFrame] = useState(false);

  const activeJobCleanupRef = useRef<(() => void) | null>(null);

  // Workflow bridge
  const [pendingFlowImageUrl, setPendingFlowImageUrl] = useState<string | null>(null);
  const [isPushingToFlow, setIsPushingToFlow] = useState<boolean>(false);

  // 2D Plate Painter Artboard Configuration
  const [aspectPreset, setAspectPreset] = useState<CanvasAspectPreset>('16:9');
  const [artWidth, setArtWidth] = useState<number>(1920);
  const [artHeight, setArtHeight] = useState<number>(1080);
  const [backgroundColor, setBackgroundColor] = useState<string>('#090a0f');

  // Tool state (Painter)
  const [activeTool, setActiveTool] = useState<CanvasToolId>('brush');
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(12);
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(64);

  // Viewport transform (Painter)
  const [zoom, setZoom] = useState<number>(0.45);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);
  const [painterDockTab, setPainterDockTab] = useState<'layers' | 'properties'>('layers');

  // Layer stack
  const initialLayerIdRef = useRef<string>(makeLayerId());
  const [layers, setLayers] = useState<CanvasLayerMeta[]>([
    {
      id: initialLayerIdRef.current,
      name: 'Background Plate',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      filters: { ...DEFAULT_LAYER_FILTERS },
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>(initialLayerIdRef.current);
  const [editingLayerNameId, setEditingLayerNameId] = useState<string | null>(null);
  const [editingLayerNameVal, setEditingLayerNameVal] = useState<string>('');

  // History stacks
  const [historyStack, setHistoryStack] = useState<CanvasHistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Live drawing & notices
  const [cursorArtCoords, setCursorArtCoords] = useState<{ x: number; y: number } | null>(null);
  const [textPlacement, setTextPlacement] = useState<TextPlacementState | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isSendingToSeedance, setIsSendingToSeedance] = useState<boolean>(false);

  // AI Concept Plate Modal
  const [isAiPlateOpen, setIsAiPlateOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAiPlate, setIsGeneratingAiPlate] = useState<boolean>(false);

  // Refs for Painter canvases
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  const pointerStateRef = useRef<{
    active: boolean;
    mode: 'draw' | 'erase' | 'shape' | 'pan' | 'move_layer';
    lastArtX: number;
    lastArtY: number;
    panStartClientX: number;
    panStartClientY: number;
    initialPanX: number;
    initialPanY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);
  const shapeDragRef = useRef<ShapeDragState | null>(null);
  const renderRafRef = useRef<number | null>(null);

  // Desktop Panel Resizer state
  const resizeDragRef = useRef<{
    side: 'left' | 'right';
    startX: number;
    startWidth: number;
  } | null>(null);

  const showNotice = useCallback((message: string, isError = false) => {
    setStatusNotice({ message, isError });
    setTimeout(() => {
      setStatusNotice((prev) => (prev?.message === message ? null : prev));
    }, 3400);
  }, []);

  // Load live backend providers, balance & history
  useEffect(() => {
    let mounted = true;
    multiProviderGenerationService
      .getProviders()
      .then((list) => {
        if (!mounted || !Array.isArray(list) || list.length === 0) return;
        setProviders(list);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!currentUser) return;

    seedanceLabService
      .getBalance()
      .then((b) => {
        if (mounted && typeof b.balance_generate === 'number') {
          setCreditBalance(b.balance_generate);
        }
      })
      .catch(() => undefined);

    Promise.all([
      multiProviderGenerationService.getUnifiedHistory().catch(() => []),
      seedanceLabService.getHistory().catch(() => []),
    ]).then(([unifiedJobs, legacyItems]) => {
      if (!mounted) return;
      const clipsFromUnified: CanvasTimelineClip[] = unifiedJobs
        .filter((j) => Boolean(j.playback_url || j.provider_output_url))
        .slice(0, 12)
        .map((j) => ({
          id: j.job_id,
          jobId: j.job_id,
          title: j.prompt?.slice(0, 48) || j.model_name,
          videoUrl: j.playback_url || j.provider_output_url || '',
          thumbnailUrl: j.thumbnail_url || j.image_url || undefined,
          duration: j.duration,
          resolution: j.resolution,
          provider: j.provider,
          modelName: j.model_name,
          status: j.status,
          createdAt: j.created_at,
          isDraft: j.draft,
        }));

      const clipsFromLegacy: CanvasTimelineClip[] = legacyItems
        .filter((item) => Boolean(item.result_url) && !clipsFromUnified.some((c) => c.id === item.job_code))
        .slice(0, 10)
        .map((item) => ({
          id: item.job_code || item.id,
          jobId: item.job_code || item.id,
          title: item.prompt?.slice(0, 48) || item.model_name,
          videoUrl: item.result_url || '',
          duration: Number(item.parameters?.duration || 15),
          resolution: String(item.parameters?.resolution || '720p'),
          provider: 'bytedance',
          modelName: item.model_name || 'Seedance 2.5',
          status: 'completed',
          createdAt: item.created_at,
        }));

      const combined = [...clipsFromUnified, ...clipsFromLegacy].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setTimelineClips(combined);

      const historyAssets: CanvasAssetItem[] = [];
      combined.slice(0, 8).forEach((clip) => {
        historyAssets.push({
          id: `asset-vid-${clip.id}`,
          kind: 'video',
          name: clip.title || 'Generated Clip',
          url: clip.videoUrl,
          thumbnailUrl: clip.thumbnailUrl,
          createdAt: clip.createdAt,
          source: 'generated',
          duration: clip.duration,
          resolution: clip.resolution,
        });
      });

      unifiedJobs.forEach((j) => {
        if (j.image_url && !historyAssets.some((a) => a.url === j.image_url)) {
          historyAssets.push({
            id: `asset-img-${j.job_id}`,
            kind: 'image',
            name: 'Reference Start Frame',
            url: j.image_url,
            createdAt: j.created_at,
            source: 'uploaded',
          });
        }
      });

      if (historyAssets.length > 0) {
        setAssets((prev) => {
          const existingUrls = new Set(prev.map((p) => p.url));
          const merged = [...prev];
          historyAssets.forEach((item) => {
            if (!existingUrls.has(item.url)) {
              merged.push(item);
            }
          });
          return merged;
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  // Cleanup active SSE / polling on unmount
  useEffect(() => {
    return () => {
      activeJobCleanupRef.current?.();
      activeJobCleanupRef.current = null;
    };
  }, []);

  // Desktop Panel Resizing
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = resizeDragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      if (drag.side === 'left') {
        const nextW = Math.max(230, Math.min(360, drag.startWidth + dx));
        updateLayoutPrefs((prev) => ({ ...prev, leftWidth: nextW }));
      } else {
        const nextW = Math.max(280, Math.min(440, drag.startWidth - dx));
        updateLayoutPrefs((prev) => ({ ...prev, rightWidth: nextW }));
      }
    };
    const onUp = () => {
      resizeDragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [updateLayoutPrefs]);

  // Price Estimate calculation (live backend sync + instant local MUAPI matrix fallback)
  useEffect(() => {
    let cancelled = false;
    const localPreview = computeLocalMuapiPricePreview(
      capabilities.model,
      config.resolution,
      config.duration,
      config.draft
    );

    if (localPreview) {
      setEstimateState({
        loading: true,
        estimate: {
          provider: config.providerId,
          modelId: config.modelId,
          effectiveResolution: localPreview.effectiveResolution,
          duration: config.duration,
          draft: config.draft,
          currency: 'USD',
          providerCostUsd: localPreview.providerCostUsd,
          appMarkupUsd: localPreview.appMarkupUsd,
          finalPriceUsd: localPreview.finalPriceUsd,
          creditsRequired: Math.ceil(localPreview.finalPriceUsd * 27),
          displayLabel: `$${localPreview.finalPriceUsd.toFixed(2)} USD`,
          billingMode: 'USD',
        },
      });
    } else {
      setEstimateState((prev) => ({ ...prev, loading: true }));
    }

    const timer = setTimeout(() => {
      multiProviderGenerationService
        .estimateCost({
          provider: config.providerId,
          modelId: config.modelId,
          resolution: config.resolution,
          duration: config.duration,
          draft: config.draft,
          referenceImagesCount: config.referenceImageUrls.length,
          physicsPriority: config.physicsPriority,
        })
        .then((est) => {
          if (!cancelled) {
            setEstimateState({ loading: false, estimate: est });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEstimateState((prev) => ({ ...prev, loading: false }));
          }
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    capabilities.model,
    config.providerId,
    config.modelId,
    config.resolution,
    config.duration,
    config.draft,
    config.referenceImageUrls.length,
    config.physicsPriority,
  ]);

  // Helper: update generation config cleanly
  const updateConfig = useCallback((patch: Partial<CanvasGenerationConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSelectProviderAndModel = useCallback(
    (providerId: string, modelId: string) => {
      const caps = deriveModelCapabilities(providers, providerId, modelId);
      setConfig((prev) => {
        const nextRes = caps.resolutions.includes(prev.resolution)
          ? prev.resolution
          : caps.resolutions.includes('720p')
          ? '720p'
          : caps.resolutions[0];
        const nextDur = caps.durations.includes(prev.duration)
          ? prev.duration
          : caps.durations[0];

        let nextCreationMode = prev.creationMode;
        if (caps.isMuapi) {
          nextCreationMode = 'image_to_video';
        } else if (!caps.supportsTextToVideo && nextCreationMode === 'text_to_video') {
          nextCreationMode = 'reference_to_video';
        }

        return {
          ...prev,
          providerId,
          modelId,
          resolution: nextRes,
          duration: nextDur,
          creationMode: nextCreationMode,
          draft: caps.supportsDraftMode ? prev.draft : false,
          highBitrate: caps.supportsHighBitrate ? prev.highBitrate : false,
          quantity: caps.supportsQuantity ? prev.quantity : 1,
        };
      });
    },
    [providers]
  );

  const handleSelectCreationMode = useCallback(
    (mode: CanvasCreationMode) => {
      if (capabilities.isMuapi && (mode === 'text_to_video' || mode === 'reference_to_video')) {
        // Switch automatically to the supporting ByteDance model so the user is never stuck
        const bytedanceProv = providers.find((p) => p.providerId === 'bytedance');
        const targetModel =
          mode === 'reference_to_video'
            ? bytedanceProv?.models.find((m) => m.modelId.includes('r2v')) || bytedanceProv?.models[0]
            : bytedanceProv?.models.find((m) => m.supportsTextToVideo) || bytedanceProv?.models[0];

        if (targetModel) {
          handleSelectProviderAndModel('bytedance', targetModel.modelId);
          showNotice(
            `Switched to ${targetModel.displayName} for ${mode.replace(/_/g, ' ')}.`
          );
        }
      }
      setConfig((prev) => ({ ...prev, creationMode: mode }));
      if (layoutPrefs.centerStage !== 'stage') {
        updateLayoutPrefs((p) => ({ ...p, centerStage: 'stage' }));
      }
    },
    [
      capabilities.isMuapi,
      handleSelectProviderAndModel,
      layoutPrefs.centerStage,
      providers,
      showNotice,
      updateLayoutPrefs,
    ]
  );

  // Upload media files directly to /api/ai/upload-media and attach cleanly
  const handleUploadMediaFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploadingMedia(true);
      try {
        for (const file of Array.from(files)) {
          const isVideo = file.type.startsWith('video/');
          const isImage = file.type.startsWith('image/');
          if (!isVideo && !isImage) continue;

          const dataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(String(reader.result || ''));
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });

          const uploadedUrl = await seedanceLabService.uploadMedia(dataUrl, file.name);
          const item: CanvasAssetItem = {
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kind: isVideo ? 'video' : 'image',
            name: file.name,
            url: uploadedUrl,
            createdAt: new Date().toISOString(),
            source: 'uploaded',
          };

          setAssets((prev) => [item, ...prev]);
          setConfig((prev) => {
            if (isVideo) {
              return {
                ...prev,
                extensionVideoUrl: uploadedUrl,
                creationMode: capabilities.isMuapi ? prev.creationMode : 'video_extension',
              };
            }
            if (!prev.startImageUrl) {
              return {
                ...prev,
                startImageUrl: uploadedUrl,
                creationMode: prev.creationMode === 'text_to_video' ? 'image_to_video' : prev.creationMode,
              };
            }
            if (capabilities.supportsReferencePlates) {
              return {
                ...prev,
                referenceImageUrls: [...prev.referenceImageUrls, uploadedUrl].slice(
                  0,
                  capabilities.maxReferenceImages
                ),
              };
            }
            return { ...prev, endImageUrl: uploadedUrl };
          });
        }
        showNotice('Uploaded media added to Assets & Stage.');
      } catch (err: unknown) {
        showNotice(
          err instanceof Error ? err.message : 'Failed to upload media file.',
          true
        );
      } finally {
        setIsUploadingMedia(false);
      }
    },
    [capabilities.isMuapi, capabilities.maxReferenceImages, capabilities.supportsReferencePlates, showNotice]
  );

  // Enhance prompt physics via /api/prompt/optimize
  const handleEnhancePrompt = useCallback(async () => {
    if (!config.prompt.trim() || isEnhancingPrompt) return;
    setIsEnhancingPrompt(true);
    try {
      const res = await seedanceLabService.optimizePromptPhysics({
        prompt: config.prompt,
        durationSeconds: config.duration,
        aspectRatio: config.aspectRatio || '16:9',
        physicsPriority: config.physicsPriority,
        contentRating: config.contentRating,
      });
      if (res.optimizedPrompt) {
        updateConfig({ prompt: res.optimizedPrompt });
        showNotice('Enhanced prompt for temporal physics & cinematic fidelity.');
      }
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Failed to enhance prompt.', true);
    } finally {
      setIsEnhancingPrompt(false);
    }
  }, [
    config.aspectRatio,
    config.contentRating,
    config.duration,
    config.physicsPriority,
    config.prompt,
    isEnhancingPrompt,
    showNotice,
    updateConfig,
  ]);

  // Vision Prompt Reader via /api/prompt/analyze-media
  const handleAnalyzeAttachedMedia = useCallback(async () => {
    if ((!config.startImageUrl && !config.extensionVideoUrl) || isAnalyzingMedia) return;
    setIsAnalyzingMedia(true);
    try {
      const images = [
        ...(config.startImageUrl ? [config.startImageUrl] : []),
        ...config.referenceImageUrls,
      ].slice(0, 6);
      const videos = config.extensionVideoUrl ? [config.extensionVideoUrl] : undefined;
      const result = await seedanceLabService.analyzeMediaPrompt({
        images: images.length > 0 ? images : undefined,
        videos,
        userNotes: config.prompt || undefined,
        durationSeconds: config.duration,
        physicsPriority: config.physicsPriority,
        contentRating: config.contentRating,
      });
      if (result.analyzedPrompt) {
        updateConfig({
          prompt: result.analyzedPrompt,
          cameraFixed: result.recommendedCameraFixed,
        });
        showNotice('Analyzed attached media into a structured Seedance prompt.');
      }
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Vision analysis failed.', true);
    } finally {
      setIsAnalyzingMedia(false);
    }
  }, [
    config.contentRating,
    config.duration,
    config.extensionVideoUrl,
    config.physicsPriority,
    config.prompt,
    config.referenceImageUrls,
    config.startImageUrl,
    isAnalyzingMedia,
    showNotice,
    updateConfig,
  ]);

  // Compile full prompt incorporating optional Scene Description, Visual Style, Camera Rig & Film Stock
  const compileProductionPrompt = useCallback((): string => {
    const parts: string[] = [];
    const main = config.prompt.trim();
    if (main) parts.push(main);

    if (config.sceneDescription.trim()) {
      parts.push(`Scene Notes: ${config.sceneDescription.trim()}`);
    }
    if (config.visualStyleId) {
      const dir = SCENE_DIRECTORS.find((d) => d.id === config.visualStyleId);
      if (dir) parts.push(`Visual Direction (${dir.name}): ${dir.promptDirective}`);
    }
    if (config.cameraMovementId) {
      const cam = CAMERA_MOVEMENTS.find((c) => c.id === config.cameraMovementId);
      if (cam) parts.push(`Camera: ${cam.seedanceKeyword}`);
    }
    if (config.filmStockId) {
      const film = FILM_STOCK_LENSES.find((f) => f.id === config.filmStockId);
      if (film) parts.push(`Optics & Film Stock: ${film.spec}`);
    }
    return parts.join(' — ');
  }, [
    config.cameraMovementId,
    config.filmStockId,
    config.prompt,
    config.sceneDescription,
    config.visualStyleId,
  ]);

  // Attach completed job/take cleanly to timeline & assets
  const registerCompletedClip = useCallback(
    (clip: CanvasTimelineClip) => {
      setTimelineClips((prev) => {
        const filtered = prev.filter((c) => c.id !== clip.id);
        return [clip, ...filtered];
      });
      setActiveClipId(clip.id);
      if (clip.videoUrl) {
        setAssets((prev) => {
          if (prev.some((a) => a.url === clip.videoUrl)) return prev;
          return [
            {
              id: `asset-gen-${clip.id}`,
              kind: 'video',
              name: clip.title || clip.modelName,
              url: clip.videoUrl,
              thumbnailUrl: clip.thumbnailUrl,
              createdAt: clip.createdAt,
              source: 'generated',
              duration: clip.duration,
              resolution: clip.resolution,
            },
            ...prev,
          ];
        });
      }
      updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'stage' }));
    },
    [updateLayoutPrefs]
  );

  // Track Unified Generation Job via SSE + fallback polling
  const trackUnifiedJob = useCallback(
    (jobId: string, initialMeta: { modelName: string; title: string; resolution: string; duration: number; provider: string; isDraft?: boolean }) => {
      activeJobCleanupRef.current?.();

      let finished = false;
      let pollInterval: ReturnType<typeof setInterval> | null = null;
      let sseCleanup: (() => void) | null = null;

      const finish = () => {
        finished = true;
        if (pollInterval) clearInterval(pollInterval);
        sseCleanup?.();
        activeJobCleanupRef.current = null;
      };

      const handleUpdate = (job: any) => {
        if (!job || finished) return;
        const status = String(job.status || '').toLowerCase();
        if (status === 'completed' && (job.playback_url || job.provider_output_url)) {
          finish();
          const url = job.playback_url || job.provider_output_url;
          setActiveGenStatus({ status: 'completed', progress: 100, stageLabel: 'Completed' });
          registerCompletedClip({
            id: job.job_id || jobId,
            jobId: job.job_id || jobId,
            title: initialMeta.title,
            videoUrl: url,
            thumbnailUrl: job.thumbnail_url || job.image_url || undefined,
            duration: job.duration || initialMeta.duration,
            resolution: job.resolution || initialMeta.resolution,
            provider: job.provider || initialMeta.provider,
            modelName: job.model_name || initialMeta.modelName,
            status: 'completed',
            createdAt: job.created_at || new Date().toISOString(),
            isDraft: Boolean(job.draft),
          });
          showNotice('Video generation completed.');
          return;
        }
        if (status === 'failed') {
          finish();
          const errText = job.error || 'Video generation failed.';
          setActiveGenStatus({ status: 'failed', progress: 0, error: errText });
          showNotice(errText, true);
          return;
        }
        setActiveGenStatus({
          status: 'processing',
          progress: Number(job.progress || 35),
          stageLabel: `Rendering via ${initialMeta.modelName}...`,
        });
      };

      sseCleanup = multiProviderGenerationService.subscribeToJobRealtimeStream(jobId, {
        onInit: ({ job }) => {
          if (job) handleUpdate(job);
        },
        onJobUpdate: (job) => handleUpdate(job),
      });

      pollInterval = setInterval(async () => {
        if (finished) return;
        try {
          const job = await multiProviderGenerationService.getJobStatus(jobId);
          handleUpdate(job);
        } catch {
          // keep polling briefly
        }
      }, 3500);

      activeJobCleanupRef.current = finish;
    },
    [registerCompletedClip, showNotice]
  );

  // Execute Video Generation from Canvas Right Settings Panel
  const handleGenerateVideo = useCallback(async () => {
    const compiledPrompt = compileProductionPrompt();
    if (!compiledPrompt) {
      showNotice('Enter a prompt before generating.', true);
      return;
    }

    if ((capabilities.requiresStartImage || config.creationMode === 'image_to_video') && !config.startImageUrl && config.referenceImageUrls.length === 0) {
      showNotice('Attach a Start Frame image first.', true);
      return;
    }

    activeJobCleanupRef.current?.();
    setActiveClipId(null);
    setActiveGenStatus({
      status: 'submitting',
      progress: 8,
      stageLabel: `Submitting to ${capabilities.provider?.displayName || 'Seedance'}...`,
      error: null,
    });

    const parsedSeed =
      config.seedInput.trim() && /^-?\d+$/.test(config.seedInput.trim())
        ? Number(config.seedInput.trim())
        : undefined;

    const useDirectByteDanceEndpoint =
      !capabilities.isMuapi &&
      (config.quantity > 1 ||
        typeof parsedSeed === 'number' ||
        Boolean(config.extensionVideoUrl));

    try {
      if (useDirectByteDanceEndpoint) {
        const res = await seedanceLabService.submitGeneration({
          model: config.modelId,
          prompt: compiledPrompt,
          aspect_ratio: config.aspectRatio || '16:9',
          resolution: config.resolution,
          duration: config.duration,
          quantity: config.quantity,
          sound_enabled: config.generateAudio,
          camera_fixed: config.cameraFixed,
          physics_priority: config.physicsPriority,
          content_rating: config.contentRating,
          seed: parsedSeed,
          image_url: config.startImageUrl || undefined,
          end_image_url: config.endImageUrl || undefined,
          video_url: config.extensionVideoUrl || undefined,
          reference_image_urls:
            config.referenceImageUrls.length > 0 ? config.referenceImageUrls : undefined,
        });

        if (typeof res.remainingBalance === 'number') {
          setCreditBalance(res.remainingBalance);
        }

        if (res.immediateResultUrl) {
          setActiveGenStatus({ status: 'completed', progress: 100 });
          registerCompletedClip({
            id: res.jobCode,
            jobId: res.jobCode,
            title: config.prompt.slice(0, 48),
            videoUrl: res.immediateResultUrl,
            duration: config.duration,
            resolution: config.resolution,
            provider: config.providerId,
            modelName: capabilities.model?.displayName || config.modelId,
            status: 'completed',
            createdAt: new Date().toISOString(),
          });
          return;
        }

        setActiveGenStatus({
          status: 'processing',
          progress: 20,
          stageLabel: `Rendering via ${capabilities.model?.displayName || 'Seedance 2.5'}...`,
        });

        let stopped = false;
        const timer = setInterval(async () => {
          if (stopped) return;
          try {
            const st = await seedanceLabService.pollJobStatus(res.jobCode);
            if (st.status === 'completed' && st.resultUrl) {
              stopped = true;
              clearInterval(timer);
              activeJobCleanupRef.current = null;
              setActiveGenStatus({ status: 'completed', progress: 100 });
              registerCompletedClip({
                id: res.jobCode,
                jobId: res.jobCode,
                title: config.prompt.slice(0, 48),
                videoUrl: st.resultUrl,
                duration: config.duration,
                resolution: config.resolution,
                provider: config.providerId,
                modelName: capabilities.model?.displayName || config.modelId,
                status: 'completed',
                createdAt: new Date().toISOString(),
              });
            } else if (st.status === 'failed') {
              stopped = true;
              clearInterval(timer);
              activeJobCleanupRef.current = null;
              setActiveGenStatus({
                status: 'failed',
                progress: 0,
                error: st.error || 'Generation failed.',
              });
              showNotice(st.error || 'Generation failed.', true);
            } else {
              setActiveGenStatus({
                status: 'processing',
                progress: st.progress || 40,
                stageLabel: `Rendering via ${capabilities.model?.displayName || 'Seedance 2.5'}...`,
              });
            }
          } catch {
            // continue polling
          }
        }, 3500);

        activeJobCleanupRef.current = () => {
          stopped = true;
          clearInterval(timer);
        };
      } else {
        const res = await multiProviderGenerationService.submitGeneration({
          provider: config.providerId,
          model_id: config.modelId,
          prompt: compiledPrompt,
          image_url: config.startImageUrl || config.referenceImageUrls[0] || undefined,
          last_image: config.endImageUrl || undefined,
          reference_image_urls:
            capabilities.supportsReferencePlates && config.referenceImageUrls.length > 0
              ? config.referenceImageUrls
              : undefined,
          aspect_ratio: capabilities.supportsAspectRatio ? config.aspectRatio : undefined,
          resolution: config.resolution,
          duration: config.duration,
          generate_audio: config.generateAudio,
          camera_fixed: config.cameraFixed,
          high_bitrate: capabilities.supportsHighBitrate ? config.highBitrate : undefined,
          draft: capabilities.supportsDraftMode ? config.draft : undefined,
          draft_request_id:
            capabilities.supportsDraftMode && config.draftRequestId.trim()
              ? config.draftRequestId.trim()
              : undefined,
          physics_priority: capabilities.supportsPhysicsPriority ? config.physicsPriority : undefined,
          content_rating: capabilities.supportsContentRating ? config.contentRating : undefined,
        });

        if (typeof res.remainingBalance === 'number') {
          setCreditBalance(res.remainingBalance);
        }

        const job = res.job;
        if (job.status === 'completed' && (job.playback_url || job.provider_output_url)) {
          setActiveGenStatus({ status: 'completed', progress: 100 });
          registerCompletedClip({
            id: job.job_id,
            jobId: job.job_id,
            title: config.prompt.slice(0, 48),
            videoUrl: job.playback_url || job.provider_output_url || '',
            thumbnailUrl: job.thumbnail_url || job.image_url || undefined,
            duration: job.duration,
            resolution: job.resolution,
            provider: job.provider,
            modelName: job.model_name,
            status: 'completed',
            createdAt: job.created_at,
            isDraft: job.draft,
          });
        } else {
          setActiveGenStatus({
            status: 'processing',
            progress: job.progress || 18,
            stageLabel: `Rendering via ${job.model_name}...`,
          });
          trackUnifiedJob(job.job_id, {
            modelName: job.model_name,
            title: config.prompt.slice(0, 48) || job.model_name,
            resolution: job.resolution,
            duration: job.duration,
            provider: job.provider,
            isDraft: job.draft,
          });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit video generation.';
      setActiveGenStatus({ status: 'failed', progress: 0, error: msg });
      showNotice(msg, true);
    }
  }, [
    capabilities,
    compileProductionPrompt,
    config,
    registerCompletedClip,
    showNotice,
    trackUnifiedJob,
  ]);

  const activeClip = useMemo(
    () => timelineClips.find((c) => c.id === activeClipId) || null,
    [activeClipId, timelineClips]
  );

  // Finalize MUAPI 480p Draft to 1080p
  const handleFinalizeActiveDraft = useCallback(async () => {
    if (!activeClip?.jobId || activeGenStatus.isFinalizing) return;
    setActiveGenStatus((prev) => ({
      ...prev,
      status: 'processing',
      progress: 15,
      stageLabel: 'Finalizing Draft to 1080p High Bitrate...',
      isFinalizing: true,
    }));
    try {
      const res = await multiProviderGenerationService.finalizeDraft(activeClip.jobId, {
        resolution: '1080p',
        high_bitrate: true,
      });
      setActiveClipId(null);
      trackUnifiedJob(res.job.job_id, {
        modelName: res.job.model_name,
        title: `${activeClip.title} (1080p Final)`,
        resolution: res.job.resolution,
        duration: res.job.duration,
        provider: res.job.provider,
        isDraft: false,
      });
    } catch (err: unknown) {
      setActiveGenStatus((prev) => ({ ...prev, isFinalizing: false }));
      showNotice(err instanceof Error ? err.message : 'Failed to finalize draft.', true);
    }
  }, [activeClip, activeGenStatus.isFinalizing, showNotice, trackUnifiedJob]);

  // Extend Next Scene from active preview video (extract exact last frame & bind)
  const handleExtendFromActiveClip = useCallback(async () => {
    if (!activeClip?.videoUrl || isExtractingLastFrame) return;
    setIsExtractingLastFrame(true);
    try {
      const frameDataUrl = await extractExactLastFrame(activeClip.videoUrl);
      const hostedFrameUrl = await seedanceLabService.uploadMedia(
        frameDataUrl,
        `vaibyte_lastframe_${Date.now()}.png`
      );
      setAssets((prev) => [
        {
          id: `asset-frame-${Date.now()}`,
          kind: 'image',
          name: `Last Frame (${activeClip.title.slice(0, 18)})`,
          url: hostedFrameUrl,
          createdAt: new Date().toISOString(),
          source: 'generated',
        },
        ...prev,
      ]);
      setConfig((prev) => ({
        ...prev,
        startImageUrl: hostedFrameUrl,
        extensionVideoUrl: capabilities.isMuapi ? '' : activeClip.videoUrl,
        creationMode: capabilities.isMuapi ? 'image_to_video' : 'video_extension',
      }));
      setActiveClipId(null);
      showNotice('Extracted final frame as Start Frame for next scene continuation.');
    } catch (err: unknown) {
      showNotice(
        err instanceof Error ? err.message : 'Unable to extract last frame from video.',
        true
      );
    } finally {
      setIsExtractingLastFrame(false);
    }
  }, [activeClip, capabilities.isMuapi, isExtractingLastFrame, showNotice]);

  // =========================================================================
  // 2D Plate Painter Engine (preserved intact in memory across mode switches)
  // =========================================================================

  const ensureLayerCanvas = useCallback(
    (layerId: string, w = artWidth, h = artHeight): HTMLCanvasElement => {
      let c = layerCanvasesRef.current.get(layerId);
      if (!c) {
        c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        layerCanvasesRef.current.set(layerId, c);
      } else if (c.width !== w || c.height !== h) {
        const snapshot = document.createElement('canvas');
        snapshot.width = c.width;
        snapshot.height = c.height;
        const sctx = snapshot.getContext('2d');
        sctx?.drawImage(c, 0, 0);
        c.width = w;
        c.height = h;
        const nctx = c.getContext('2d');
        nctx?.drawImage(snapshot, 0, 0);
      }
      return c;
    },
    [artWidth, artHeight]
  );

  const renderComposite = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    if (canvas.width !== artWidth || canvas.height !== artHeight) {
      canvas.width = artWidth;
      canvas.height = artHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, artWidth, artHeight);

    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, artWidth, artHeight);
    }

    for (const layer of layers) {
      if (!layer.visible) continue;
      const offscreen = layerCanvasesRef.current.get(layer.id);
      if (!offscreen) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      ctx.globalCompositeOperation = layer.blendMode;

      const f = layer.filters;
      const filterStr = [
        f.brightness !== 100 ? `brightness(${f.brightness}%)` : '',
        f.contrast !== 100 ? `contrast(${f.contrast}%)` : '',
        f.saturate !== 100 ? `saturate(${f.saturate}%)` : '',
        f.grayscale ? 'grayscale(100%)' : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (filterStr) ctx.filter = filterStr;

      const cx = artWidth / 2 + layer.offsetX;
      const cy = artHeight / 2 + layer.offsetY;
      ctx.translate(cx, cy);
      ctx.scale(layer.scale, layer.scale);
      ctx.drawImage(offscreen, -artWidth / 2, -artHeight / 2);
      ctx.restore();
    }

    const sd = shapeDragRef.current;
    if (sd) {
      ctx.save();
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sd.startX, sd.startY);
        ctx.lineTo(sd.endX, sd.endY);
        ctx.stroke();
      } else if (activeTool === 'rect') {
        const rx = Math.min(sd.startX, sd.endX);
        const ry = Math.min(sd.startY, sd.endY);
        const rw = Math.abs(sd.endX - sd.startX);
        const rh = Math.abs(sd.endY - sd.startY);
        if (shapeFilled) ctx.fillRect(rx, ry, rw, rh);
        else ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeTool === 'ellipse') {
        const cx = (sd.startX + sd.endX) / 2;
        const cy = (sd.startY + sd.endY) / 2;
        const rx = Math.max(1, Math.abs(sd.endX - sd.startX) / 2);
        const ry = Math.max(1, Math.abs(sd.endY - sd.startY) / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (shapeFilled) ctx.fill();
        else ctx.stroke();
      }
      ctx.restore();
    }
  }, [
    artWidth,
    artHeight,
    backgroundColor,
    layers,
    activeTool,
    brushColor,
    brushOpacity,
    brushSize,
    shapeFilled,
  ]);

  const scheduleRender = useCallback(() => {
    if (renderRafRef.current !== null) return;
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      renderComposite();
    });
  }, [renderComposite]);

  useEffect(() => {
    ensureLayerCanvas(layers[0]?.id || initialLayerIdRef.current, artWidth, artHeight);
    scheduleRender();
  }, [layers, artWidth, artHeight, backgroundColor, ensureLayerCanvas, scheduleRender]);

  const fitViewport = useCallback(
    (targetW = artWidth, targetH = artHeight) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const padW = Math.max(240, rect.width - 72);
      const padH = Math.max(200, rect.height - 72);
      const fitZoom = Math.min(padW / targetW, padH / targetH, 1.25);
      setZoom(Number(Math.max(0.15, fitZoom).toFixed(2)));
      setPan({ x: 0, y: 0 });
    },
    [artWidth, artHeight]
  );

  useEffect(() => {
    if (layoutPrefs.centerStage !== 'painter') return;
    const timer = setTimeout(() => fitViewport(artWidth, artHeight), 80);
    return () => clearTimeout(timer);
  }, [artWidth, artHeight, fitViewport, layoutPrefs.centerStage]);

  const captureHistorySnapshot = useCallback(
    (
      nextLayers: CanvasLayerMeta[],
      nextActiveId: string,
      w = artWidth,
      h = artHeight,
      bg = backgroundColor
    ) => {
      const snap: CanvasHistorySnapshot = {
        width: w,
        height: h,
        backgroundColor: bg,
        activeLayerId: nextActiveId,
        layers: nextLayers.map((l) => {
          const c = ensureLayerCanvas(l.id, w, h);
          return {
            ...l,
            filters: { ...l.filters },
            dataUrl: c.toDataURL('image/png'),
          };
        }),
      };

      setHistoryStack((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, snap].slice(-20);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    [artWidth, artHeight, backgroundColor, ensureLayerCanvas, historyIndex]
  );

  const initializedSnapshotRef = useRef(false);
  useEffect(() => {
    if (!initializedSnapshotRef.current) {
      initializedSnapshotRef.current = true;
      ensureLayerCanvas(initialLayerIdRef.current, artWidth, artHeight);
      captureHistorySnapshot(layers, initialLayerIdRef.current, artWidth, artHeight, backgroundColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreHistorySnapshot = useCallback(
    async (snap: CanvasHistorySnapshot) => {
      setArtWidth(snap.width);
      setArtHeight(snap.height);
      setBackgroundColor(snap.backgroundColor);

      const newMap = new Map<string, HTMLCanvasElement>();
      await Promise.all(
        snap.layers.map(
          (l) =>
            new Promise<void>((resolve) => {
              const c = document.createElement('canvas');
              c.width = snap.width;
              c.height = snap.height;
              const img = new Image();
              img.onload = () => {
                c.getContext('2d')?.drawImage(img, 0, 0);
                newMap.set(l.id, c);
                resolve();
              };
              img.onerror = () => {
                newMap.set(l.id, c);
                resolve();
              };
              img.src = l.dataUrl;
            })
        )
      );

      layerCanvasesRef.current = newMap;
      const restoredMeta: CanvasLayerMeta[] = snap.layers.map(({ dataUrl: _omit, ...meta }) => meta);
      setLayers(restoredMeta);
      setActiveLayerId(snap.activeLayerId);
      setTimeout(() => scheduleRender(), 10);
    },
    [scheduleRender]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const snap = historyStack[prevIdx];
    if (!snap) return;
    setHistoryIndex(prevIdx);
    restoreHistorySnapshot(snap);
  }, [historyIndex, historyStack, restoreHistorySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    const snap = historyStack[nextIdx];
    if (!snap) return;
    setHistoryIndex(nextIdx);
    restoreHistorySnapshot(snap);
  }, [historyIndex, historyStack, restoreHistorySnapshot]);

  // Painter keyboard shortcuts
  useEffect(() => {
    if (layoutPrefs.centerStage !== 'painter') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'b':
          setActiveTool('brush');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'r':
          setActiveTool('rect');
          break;
        case 'o':
          setActiveTool('ellipse');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case '[':
          setBrushSize((s) => Math.max(1, s - 4));
          break;
        case ']':
          setBrushSize((s) => Math.min(120, s + 4));
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpaceHeld(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [layoutPrefs.centerStage, handleUndo, handleRedo]);

  const clientToArtboard = (clientX: number, clientY: number) => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * artWidth;
    const y = ((clientY - rect.top) / rect.height) * artHeight;
    return { x, y };
  };

  const artToLayerLocal = (artX: number, artY: number, layer: CanvasLayerMeta) => {
    const cx = artWidth / 2 + layer.offsetX;
    const cy = artHeight / 2 + layer.offsetY;
    const lx = (artX - cx) / layer.scale + artWidth / 2;
    const ly = (artY - cy) / layer.scale + artHeight / 2;
    return { lx, ly };
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const effectivePan = isSpaceHeld || activeTool === 'pan' || e.button === 1;
    const target = e.target as HTMLElement;
    if (target.closest('[data-canvas-ui="true"]')) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    if (effectivePan) {
      pointerStateRef.current = {
        active: true,
        mode: 'pan',
        lastArtX: 0,
        lastArtY: 0,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: 0,
        initialOffsetY: 0,
      };
      return;
    }

    const { x: artX, y: artY } = clientToArtboard(e.clientX, e.clientY);

    if (activeTool === 'eyedropper') {
      const c = compositeCanvasRef.current;
      const ctx = c?.getContext('2d');
      if (ctx) {
        const px = Math.max(0, Math.min(artWidth - 1, Math.round(artX)));
        const py = Math.max(0, Math.min(artHeight - 1, Math.round(artY)));
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        if (pixel[3] > 0) {
          const picked = rgbToHex(pixel[0], pixel[1], pixel[2]);
          setBrushColor(picked);
          showNotice(`Picked color ${picked.toUpperCase()}`);
        }
      }
      return;
    }

    if (!activeLayer || activeLayer.locked) {
      showNotice('Selected layer is locked. Unlock it in Layers & FX to edit.', true);
      return;
    }

    if (activeTool === 'text') {
      setTextPlacement({ active: true, x: artX, y: artY, value: '' });
      return;
    }

    if (activeTool === 'select') {
      pointerStateRef.current = {
        active: true,
        mode: 'move_layer',
        lastArtX: artX,
        lastArtY: artY,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: activeLayer.offsetX,
        initialOffsetY: activeLayer.offsetY,
      };
      return;
    }

    if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'ellipse') {
      shapeDragRef.current = { startX: artX, startY: artY, endX: artX, endY: artY };
      pointerStateRef.current = {
        active: true,
        mode: 'shape',
        lastArtX: artX,
        lastArtY: artY,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: 0,
        initialOffsetY: 0,
      };
      scheduleRender();
      return;
    }

    const offscreen = ensureLayerCanvas(activeLayer.id);
    const lctx = offscreen.getContext('2d');
    if (!lctx) return;

    const { lx, ly } = artToLayerLocal(artX, artY, activeLayer);
    lctx.save();
    lctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    lctx.globalAlpha = brushOpacity;
    lctx.fillStyle = brushColor;
    lctx.beginPath();
    lctx.arc(lx, ly, brushSize / activeLayer.scale / 2, 0, Math.PI * 2);
    lctx.fill();
    lctx.restore();

    pointerStateRef.current = {
      active: true,
      mode: activeTool === 'eraser' ? 'erase' : 'draw',
      lastArtX: lx,
      lastArtY: ly,
      panStartClientX: e.clientX,
      panStartClientY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
      initialOffsetX: 0,
      initialOffsetY: 0,
    };

    scheduleRender();
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { x: artX, y: artY } = clientToArtboard(e.clientX, e.clientY);
    if (artX >= 0 && artX <= artWidth && artY >= 0 && artY <= artHeight) {
      setCursorArtCoords({ x: Math.round(artX), y: Math.round(artY) });
    } else {
      setCursorArtCoords(null);
    }

    const p = pointerStateRef.current;
    if (!p || !p.active) return;

    if (p.mode === 'pan') {
      const dx = e.clientX - p.panStartClientX;
      const dy = e.clientY - p.panStartClientY;
      setPan({ x: p.initialPanX + dx, y: p.initialPanY + dy });
      return;
    }

    if (p.mode === 'move_layer' && activeLayer) {
      const dx = (e.clientX - p.panStartClientX) / zoom;
      const dy = (e.clientY - p.panStartClientY) / zoom;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === activeLayer.id
            ? {
                ...l,
                offsetX: Math.round(p.initialOffsetX + dx),
                offsetY: Math.round(p.initialOffsetY + dy),
              }
            : l
        )
      );
      return;
    }

    if (p.mode === 'shape' && shapeDragRef.current) {
      shapeDragRef.current.endX = artX;
      shapeDragRef.current.endY = artY;
      scheduleRender();
      return;
    }

    if ((p.mode === 'draw' || p.mode === 'erase') && activeLayer) {
      const offscreen = ensureLayerCanvas(activeLayer.id);
      const lctx = offscreen.getContext('2d');
      if (!lctx) return;
      const { lx, ly } = artToLayerLocal(artX, artY, activeLayer);

      lctx.save();
      lctx.globalCompositeOperation = p.mode === 'erase' ? 'destination-out' : 'source-over';
      lctx.globalAlpha = brushOpacity;
      lctx.strokeStyle = brushColor;
      lctx.lineWidth = brushSize / activeLayer.scale;
      lctx.lineCap = 'round';
      lctx.lineJoin = 'round';
      lctx.beginPath();
      lctx.moveTo(p.lastArtX, p.lastArtY);
      lctx.lineTo(lx, ly);
      lctx.stroke();
      lctx.restore();

      p.lastArtX = lx;
      p.lastArtY = ly;
      scheduleRender();
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerStateRef.current;
    if (!p || !p.active) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (p.mode === 'shape' && shapeDragRef.current && activeLayer) {
      const sd = shapeDragRef.current;
      const startLocal = artToLayerLocal(sd.startX, sd.startY, activeLayer);
      const endLocal = artToLayerLocal(sd.endX, sd.endY, activeLayer);
      const offscreen = ensureLayerCanvas(activeLayer.id);
      const lctx = offscreen.getContext('2d');
      if (lctx) {
        lctx.save();
        lctx.globalAlpha = brushOpacity;
        lctx.strokeStyle = brushColor;
        lctx.fillStyle = brushColor;
        lctx.lineWidth = brushSize / activeLayer.scale;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';

        if (activeTool === 'line') {
          lctx.beginPath();
          lctx.moveTo(startLocal.lx, startLocal.ly);
          lctx.lineTo(endLocal.lx, endLocal.ly);
          lctx.stroke();
        } else if (activeTool === 'rect') {
          const rx = Math.min(startLocal.lx, endLocal.lx);
          const ry = Math.min(startLocal.ly, endLocal.ly);
          const rw = Math.abs(endLocal.lx - startLocal.lx);
          const rh = Math.abs(endLocal.ly - startLocal.ly);
          if (shapeFilled) lctx.fillRect(rx, ry, rw, rh);
          else lctx.strokeRect(rx, ry, rw, rh);
        } else if (activeTool === 'ellipse') {
          const cx = (startLocal.lx + endLocal.lx) / 2;
          const cy = (startLocal.ly + endLocal.ly) / 2;
          const rx = Math.max(1, Math.abs(endLocal.lx - startLocal.lx) / 2);
          const ry = Math.max(1, Math.abs(endLocal.ly - startLocal.ly) / 2);
          lctx.beginPath();
          lctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (shapeFilled) lctx.fill();
          else lctx.stroke();
        }
        lctx.restore();
      }
      shapeDragRef.current = null;
      scheduleRender();
      captureHistorySnapshot(layers, activeLayer.id);
    } else if (p.mode === 'draw' || p.mode === 'erase' || p.mode === 'move_layer') {
      captureHistorySnapshot(layers, activeLayer?.id || activeLayerId);
    }

    pointerStateRef.current = null;
  };

  const commitTextPlacement = () => {
    if (!textPlacement || !textPlacement.value.trim() || !activeLayer) {
      setTextPlacement(null);
      return;
    }
    const offscreen = ensureLayerCanvas(activeLayer.id);
    const lctx = offscreen.getContext('2d');
    if (lctx) {
      const { lx, ly } = artToLayerLocal(textPlacement.x, textPlacement.y, activeLayer);
      lctx.save();
      lctx.globalAlpha = brushOpacity;
      lctx.fillStyle = brushColor;
      lctx.font = `600 ${Math.round(fontSize / activeLayer.scale)}px Inter, ui-sans-serif, system-ui, sans-serif`;
      lctx.textBaseline = 'top';
      const lines = textPlacement.value.split('\n');
      lines.forEach((line, i) => {
        lctx.fillText(line, lx, ly + (i * (fontSize * 1.2)) / activeLayer.scale);
      });
      lctx.restore();
      scheduleRender();
      captureHistorySnapshot(layers, activeLayer.id);
    }
    setTextPlacement(null);
  };

  const handleSelectAspect = (preset: CanvasAspectPreset) => {
    const dim = CANVAS_ASPECT_DIMENSIONS[preset];
    setAspectPreset(preset);
    setArtWidth(dim.width);
    setArtHeight(dim.height);
    layers.forEach((l) => ensureLayerCanvas(l.id, dim.width, dim.height));
    setTimeout(() => {
      scheduleRender();
      fitViewport(dim.width, dim.height);
      captureHistorySnapshot(layers, activeLayerId, dim.width, dim.height, backgroundColor);
    }, 20);
  };

  const addNewLayer = (customName?: string, drawCb?: (ctx: CanvasRenderingContext2D) => void) => {
    const newId = makeLayerId();
    const offscreen = ensureLayerCanvas(newId, artWidth, artHeight);
    if (drawCb) {
      const ctx = offscreen.getContext('2d');
      if (ctx) drawCb(ctx);
    }
    const newMeta: CanvasLayerMeta = {
      id: newId,
      name: customName || `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      filters: { ...DEFAULT_LAYER_FILTERS },
    };
    const nextLayers = [...layers, newMeta];
    setLayers(nextLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, newId);
    }, 10);
  };

  const duplicateLayer = (layerId: string) => {
    const source = layers.find((l) => l.id === layerId);
    if (!source) return;
    const newId = makeLayerId();
    const srcCanvas = ensureLayerCanvas(source.id);
    const dstCanvas = ensureLayerCanvas(newId);
    dstCanvas.getContext('2d')?.drawImage(srcCanvas, 0, 0);

    const copyMeta: CanvasLayerMeta = {
      ...source,
      id: newId,
      name: `${source.name} Copy`,
      filters: { ...source.filters },
    };
    const idx = layers.findIndex((l) => l.id === layerId);
    const nextLayers = [...layers];
    nextLayers.splice(idx + 1, 0, copyMeta);
    setLayers(nextLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, newId);
    }, 10);
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) {
      const offscreen = ensureLayerCanvas(layerId);
      offscreen.getContext('2d')?.clearRect(0, 0, artWidth, artHeight);
      scheduleRender();
      captureHistorySnapshot(layers, layerId);
      showNotice('Cleared base layer.');
      return;
    }
    layerCanvasesRef.current.delete(layerId);
    const nextLayers = layers.filter((l) => l.id !== layerId);
    const nextActive = nextLayers[nextLayers.length - 1]?.id || nextLayers[0].id;
    setLayers(nextLayers);
    if (activeLayerId === layerId) setActiveLayerId(nextActive);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, nextActive);
    }, 10);
  };

  const moveLayerOrder = (layerId: string, dir: 1 | -1) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= layers.length) return;
    const copy = [...layers];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setLayers(copy);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(copy, activeLayerId);
    }, 10);
  };

  const handleImportImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const fitScale = Math.min(artWidth / img.width, artHeight / img.height, 1);
          const dw = img.width * fitScale;
          const dh = img.height * fitScale;
          const dx = (artWidth - dw) / 2;
          const dy = (artHeight - dh) / 2;
          addNewLayer(file.name.replace(/\.[^.]+$/, ''), (ctx) => {
            ctx.drawImage(img, dx, dy, dw, dh);
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
    showNotice('Imported image onto new layer.');
  };

  // Generate AI concept plate onto both Canvas Layer & Workspace Assets
  const handleGenerateAiPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isGeneratingAiPlate) return;
    setIsGeneratingAiPlate(true);
    try {
      const authHeaders = await getAuthHeaders(true);
      const res = await fetch('/api/prompt/generate-image', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          aspectRatio: aspectPreset,
          resolution: '1080p',
          projectName: 'VaiByte Canvas Studio',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to synthesize plate.');
      }

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          addNewLayer(`AI Plate: ${aiPrompt.trim().slice(0, 22)}`, (ctx) => {
            ctx.drawImage(img, 0, 0, artWidth, artHeight);
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = data.imageUrl;
      });

      // Also expose inside unified Canvas Assets & attach as Start Frame if stage is empty
      const item: CanvasAssetItem = {
        id: `ai-plate-${Date.now()}`,
        kind: 'image',
        name: `AI Plate: ${aiPrompt.trim().slice(0, 24)}`,
        url: data.imageUrl,
        createdAt: new Date().toISOString(),
        source: 'ai_plate',
      };
      setAssets((prev) => [item, ...prev]);
      setConfig((prev) => ({
        ...prev,
        startImageUrl: prev.startImageUrl || data.imageUrl,
      }));

      setIsAiPlateOpen(false);
      setAiPrompt('');
      showNotice('Added AI synthesized plate to Canvas Assets & Layer Stack.');
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'AI plate generation failed.', true);
    } finally {
      setIsGeneratingAiPlate(false);
    }
  };

  const exportCompositeDataUrl = (): string => {
    renderComposite();
    const c = compositeCanvasRef.current;
    return c ? c.toDataURL('image/png') : '';
  };

  const handleDownloadPng = () => {
    const url = exportCompositeDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaibyte_canvas_${aspectPreset.replace(':', 'x')}_${Date.now()}.png`;
    link.click();
    showNotice('Exported composited PNG.');
  };

  const handleExportProjectJson = () => {
    const projectPayload = {
      app: 'VaiByte Canvas Studio',
      version: 1,
      width: artWidth,
      height: artHeight,
      backgroundColor,
      activeLayerId,
      layers: layers.map((l) => ({
        ...l,
        dataUrl: ensureLayerCanvas(l.id).toDataURL('image/png'),
      })),
    };
    const blob = new Blob([JSON.stringify(projectPayload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaibyte_project_${Date.now()}.vaibyte.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Saved .vaibyte.json project.');
  };

  const handleImportProjectJson = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.layers) || !parsed.width || !parsed.height) {
        throw new Error('Invalid .vaibyte.json project file.');
      }
      await restoreHistorySnapshot({
        width: parsed.width,
        height: parsed.height,
        backgroundColor: parsed.backgroundColor || '#090a0f',
        activeLayerId: parsed.activeLayerId || parsed.layers[0].id,
        layers: parsed.layers,
      });
      showNotice('Loaded VaiByte project.');
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Failed to load project JSON.', true);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  const handleCapturePainterFrameToAssets = useCallback(async () => {
    try {
      const dataUrl = exportCompositeDataUrl();
      if (!dataUrl) throw new Error('Unable to read painter frame.');
      const hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        `vaibyte_plate_${Date.now()}.png`
      );
      const item: CanvasAssetItem = {
        id: `canvas-frame-${Date.now()}`,
        kind: 'canvas_frame',
        name: `Painter Frame ${new Date().toLocaleTimeString()}`,
        url: hostedUrl,
        createdAt: new Date().toISOString(),
        source: 'canvas',
      };
      setAssets((prev) => [item, ...prev]);
      setConfig((prev) => ({
        ...prev,
        startImageUrl: hostedUrl,
        creationMode: prev.creationMode === 'text_to_video' ? 'image_to_video' : prev.creationMode,
      }));
      updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'stage' }));
      showNotice('Captured Painter frame as Start Frame.');
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Failed to capture painted frame.', true);
    }
  }, [exportCompositeDataUrl, showNotice, updateLayoutPrefs]);

  const handleSendToSeedance = async () => {
    if (!onGoToSeedance || isSendingToSeedance) return;
    setIsSendingToSeedance(true);
    try {
      const dataUrl = exportCompositeDataUrl();
      if (!dataUrl) throw new Error('Unable to read canvas frame.');
      const hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        `vaibyte_${Date.now()}.png`
      );
      onGoToSeedance(hostedUrl);
    } catch (err: unknown) {
      showNotice(
        err instanceof Error ? err.message : 'Failed to upload canvas plate for Seedance 2.5.',
        true
      );
    } finally {
      setIsSendingToSeedance(false);
    }
  };

  const handlePushFrameToWorkflow = async () => {
    if (isPushingToFlow) return;
    setIsPushingToFlow(true);
    try {
      const dataUrl = exportCompositeDataUrl();
      if (!dataUrl) throw new Error('Unable to read canvas frame.');
      const hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        `vaibyte_flow_${Date.now()}.png`
      );
      setPendingFlowImageUrl(hostedUrl);
      updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'workflow' }));
    } catch (err: unknown) {
      showNotice(
        err instanceof Error ? err.message : 'Failed to push frame to Node Workflow.',
        true
      );
    } finally {
      setIsPushingToFlow(false);
    }
  };

  const updateActiveLayerProp = (patch: Partial<CanvasLayerMeta>) => {
    if (!activeLayer) return;
    setLayers((prev) => prev.map((l) => (l.id === activeLayer.id ? { ...l, ...patch } : l)));
  };

  const toolItems: Array<{ id: CanvasToolId; label: string; keyHint: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Move Layer', keyHint: 'V', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'pan', label: 'Pan View', keyHint: 'H', icon: <Hand className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush', keyHint: 'B', icon: <Brush className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser', keyHint: 'E', icon: <Eraser className="w-4 h-4" /> },
    { id: 'line', label: 'Line', keyHint: 'L', icon: <Minus className="w-4 h-4" /> },
    { id: 'rect', label: 'Rectangle', keyHint: 'R', icon: <Square className="w-4 h-4" /> },
    { id: 'ellipse', label: 'Ellipse', keyHint: 'O', icon: <Circle className="w-4 h-4" /> },
    { id: 'text', label: 'Text', keyHint: 'T', icon: <TypeIcon className="w-4 h-4" /> },
    { id: 'eyedropper', label: 'Eyedropper', keyHint: 'I', icon: <Pipette className="w-4 h-4" /> },
  ];

  // Painter Layer & Brush Inspector (slotted into Right Panel when in Painter Mode)
  const painterInspectorSlot = (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="grid grid-cols-2 border-b border-white/[0.08] text-[10px] font-mono shrink-0">
        <button
          type="button"
          onClick={() => setPainterDockTab('layers')}
          className={`py-2 uppercase tracking-wider cursor-pointer ${
            painterDockTab === 'layers' ? 'bg-white/[0.06] text-white font-semibold' : 'text-white/50'
          }`}
        >
          Layer Stack
        </button>
        <button
          type="button"
          onClick={() => setPainterDockTab('properties')}
          className={`py-2 uppercase tracking-wider cursor-pointer ${
            painterDockTab === 'properties' ? 'bg-white/[0.06] text-white font-semibold' : 'text-white/50'
          }`}
        >
          Brush & FX
        </button>
      </div>

      {painterDockTab === 'layers' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3.5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => addNewLayer()}
              className="flex-1 py-2 px-3 rounded-lg bg-white text-black text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/90 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Layer</span>
            </button>
            {activeLayer && (
              <button
                type="button"
                onClick={() => duplicateLayer(activeLayer.id)}
                title="Duplicate Active Layer"
                className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/80 hover:text-white cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
            {[...layers].reverse().map((layer) => {
              const isSelected = layer.id === activeLayerId;
              const actualIdx = layers.findIndex((l) => l.id === layer.id);
              return (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-white/45 bg-white/[0.08]'
                      : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    {editingLayerNameId === layer.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingLayerNameVal}
                        onChange={(e) => setEditingLayerNameVal(e.target.value)}
                        onBlur={() => {
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === layer.id
                                ? { ...l, name: editingLayerNameVal.trim() || l.name }
                                : l
                            )
                          );
                          setEditingLayerNameId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 bg-black border border-white/30 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                      />
                    ) : (
                      <span
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingLayerNameId(layer.id);
                          setEditingLayerNameVal(layer.name);
                        }}
                        title="Double-click to rename"
                        className="text-xs font-medium text-white truncate flex-1"
                      >
                        {layer.name}
                      </span>
                    )}

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === layer.id ? { ...l, visible: !l.visible } : l
                            )
                          );
                        }}
                        className="p-1 text-white/60 hover:text-white cursor-pointer"
                        title={layer.visible ? 'Hide layer' : 'Show layer'}
                      >
                        {layer.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-white/30" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLayers((prev) =>
                            prev.map((l) =>
                              l.id === layer.id ? { ...l, locked: !l.locked } : l
                            )
                          );
                        }}
                        className="p-1 text-white/60 hover:text-white cursor-pointer"
                        title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      >
                        {layer.locked ? (
                          <Lock className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-white/40" />
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={actualIdx >= layers.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerOrder(layer.id, 1);
                        }}
                        className="p-1 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={actualIdx <= 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveLayerOrder(layer.id, -1);
                        }}
                        className="p-1 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="p-1 text-white/45 hover:text-white cursor-pointer"
                        title={layers.length > 1 ? 'Delete Layer' : 'Clear Layer'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-white/45">
                    <span>{layer.blendMode}</span>
                    <span className="tabular-nums">{Math.round(layer.opacity * 100)}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {activeLayer && (
            <div className="p-3 rounded-xl border border-white/[0.08] bg-black/40 space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                  <span>Layer Opacity</span>
                  <span className="tabular-nums">{Math.round(activeLayer.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(activeLayer.opacity * 100)}
                  onChange={(e) => updateActiveLayerProp({ opacity: Number(e.target.value) / 100 })}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <span className="font-mono text-[10px] text-white/70 block">Blend Mode</span>
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) =>
                    updateActiveLayerProp({ blendMode: e.target.value as CanvasBlendMode })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.12] bg-[#090b10] text-xs font-mono text-white focus:outline-none"
                >
                  <option value="source-over">Normal</option>
                  <option value="multiply">Multiply</option>
                  <option value="screen">Screen</option>
                  <option value="overlay">Overlay</option>
                  <option value="soft-light">Soft Light</option>
                </select>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
            <span className="font-mono text-[10px] text-white/50 uppercase block">
              Canvas Backdrop
            </span>
            <div className="flex items-center gap-1.5">
              {CANVAS_BG_SWATCHES.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBackgroundColor(bg.value)}
                  title={bg.label}
                  style={{
                    backgroundColor: bg.value === 'transparent' ? '#141720' : bg.value,
                  }}
                  className={`flex-1 h-7 rounded-md border text-[9px] font-mono cursor-pointer ${
                    backgroundColor === bg.value
                      ? 'border-white ring-1 ring-white/40'
                      : 'border-white/20'
                  }`}
                >
                  {bg.value === 'transparent' ? 'TR' : ''}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleExportProjectJson}
                className="py-1.5 px-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/75 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>Save JSON</span>
              </button>
              <button
                type="button"
                onClick={() => jsonInputRef.current?.click()}
                className="py-1.5 px-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/75 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Load JSON</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          <div className="space-y-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
            <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">
              Tool Calibration
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                <span>Stroke Size</span>
                <span className="tabular-nums">{brushSize}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={120}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                <span>Ink Opacity</span>
                <span className="tabular-nums">{Math.round(brushOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={Math.round(brushOpacity * 100)}
                onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                <span>Headline Size</span>
                <span className="tabular-nums">{fontSize}px</span>
              </div>
              <input
                type="range"
                min={18}
                max={180}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-white cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-mono text-[10px] text-white/70">Fill Shapes</span>
              <button
                type="button"
                onClick={() => setShapeFilled((f) => !f)}
                className={`px-2.5 py-1 rounded border text-[10px] font-mono cursor-pointer ${
                  shapeFilled ? 'bg-white text-black border-white font-semibold' : 'border-white/15 text-white/60'
                }`}
              >
                {shapeFilled ? 'FILLED' : 'OUTLINE'}
              </button>
            </div>
          </div>

          {activeLayer && (
            <div className="space-y-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                  Layer Transform & Grade
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateActiveLayerProp({
                      offsetX: 0,
                      offsetY: 0,
                      scale: 1,
                      filters: { ...DEFAULT_LAYER_FILTERS },
                    })
                  }
                  className="text-[10px] font-mono text-white/55 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-white/70">
                  <span>Scale</span>
                  <span className="tabular-nums">{Math.round(activeLayer.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={250}
                  value={Math.round(activeLayer.scale * 100)}
                  onChange={(e) => updateActiveLayerProp({ scale: Number(e.target.value) / 100 })}
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-white/70">
                  <span>Brightness</span>
                  <span className="tabular-nums">{activeLayer.filters.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={180}
                  value={activeLayer.filters.brightness}
                  onChange={(e) =>
                    updateActiveLayerProp({
                      filters: { ...activeLayer.filters, brightness: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-white cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-mono text-[10px] text-white/70">
                  <span>Contrast</span>
                  <span className="tabular-nums">{activeLayer.filters.contrast}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={180}
                  value={activeLayer.filters.contrast}
                  onChange={(e) =>
                    updateActiveLayerProp({
                      filters: { ...activeLayer.filters, contrast: Number(e.target.value) },
                    })
                  }
                  className="w-full accent-white cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 2D Painter Center Stage Element
  const painterStageElement = (
    <div className="flex-1 min-h-0 flex relative overflow-hidden">
      {/* Compact Vertical Drawing Tool Strip */}
      <aside className="w-12 bg-[#0b0d12] border-r border-white/[0.1] flex flex-col items-center py-2.5 gap-1.5 overflow-y-auto no-scrollbar shrink-0 z-10">
        {toolItems.map((tool) => {
          const isSelected = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              title={`${tool.label} (${tool.keyHint})`}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                isSelected ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
              }`}
            >
              {tool.icon}
            </button>
          );
        })}

        <div className="w-7 h-px bg-white/10 my-1" />

        <label
          title="Active Brush Color"
          className="w-7 h-7 rounded-lg border border-white/25 cursor-pointer overflow-hidden shrink-0"
          style={{ backgroundColor: brushColor }}
        >
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
          />
        </label>

        <div className="grid grid-cols-2 gap-1 pt-1">
          {CANVAS_COLOR_SWATCHES.slice(0, 6).map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setBrushColor(hex)}
              style={{ backgroundColor: hex }}
              className={`w-3 h-3 rounded-sm border cursor-pointer ${
                brushColor.toLowerCase() === hex ? 'border-white scale-110' : 'border-white/20'
              }`}
              title={hex}
            />
          ))}
        </div>
      </aside>

      {/* Painter Canvas Artboard */}
      <div
        ref={viewportRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onTouchStart={(e) => e.stopPropagation()}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.08 : 0.08;
            setZoom((z) => Math.max(0.15, Math.min(4, Number((z + delta).toFixed(2)))));
          }
        }}
        style={{ touchAction: 'none' }}
        className={`flex-1 relative overflow-hidden bg-[#06070a] flex items-center justify-center ${
          isSpaceHeld || activeTool === 'pan'
            ? 'cursor-grab active:cursor-grabbing'
            : activeTool === 'select'
            ? 'cursor-move'
            : 'cursor-crosshair'
        }`}
      >
        <div
          style={{
            width: artWidth,
            height: artHeight,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
          }}
          className="relative shadow-[0_24px_90px_rgba(0,0,0,0.95)] ring-1 ring-white/20 shrink-0"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #161820 25%, transparent 25%), linear-gradient(-45deg, #161820 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161820 75%), linear-gradient(-45deg, transparent 75%, #161820 75%)',
              backgroundSize: '32px 32px',
              backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0',
            }}
          />

          <canvas
            ref={compositeCanvasRef}
            width={artWidth}
            height={artHeight}
            className="relative w-full h-full block"
          />

          {showGuides && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
              <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
              <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
              <div className="absolute inset-8 border border-white/10" />
            </div>
          )}

          {textPlacement?.active && (
            <div
              data-canvas-ui="true"
              style={{
                left: Math.min(artWidth - 360, Math.max(16, textPlacement.x)),
                top: Math.min(artHeight - 120, Math.max(16, textPlacement.y)),
              }}
              className="absolute z-30 p-2 rounded-xl bg-[#0a0c12]/95 border border-white/30 shadow-2xl flex items-center gap-2 min-w-[320px]"
            >
              <input
                type="text"
                autoFocus
                value={textPlacement.value}
                onChange={(e) =>
                  setTextPlacement((prev) => (prev ? { ...prev, value: e.target.value } : null))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTextPlacement();
                  if (e.key === 'Escape') setTextPlacement(null);
                }}
                placeholder="Type canvas headline..."
                className="flex-1 bg-black/70 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={commitTextPlacement}
                className="p-2 rounded-lg bg-white text-black hover:bg-white/90 cursor-pointer"
                title="Place Text"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTextPlacement(null)}
                className="p-2 rounded-lg border border-white/15 text-white/60 hover:text-white cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Painter Viewport HUD */}
        <div
          data-canvas-ui="true"
          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#0b0d12]/90 backdrop-blur-md border border-white/[0.12] text-[10px] font-mono text-white/65 flex items-center gap-3 pointer-events-auto"
        >
          <span className="tabular-nums">
            {artWidth} × {artHeight}px
          </span>
          {cursorArtCoords && (
            <span className="tabular-nums hidden sm:inline">
              X:{cursorArtCoords.x} Y:{cursorArtCoords.y}
            </span>
          )}
          <span className="text-white uppercase">{activeTool}</span>
          <button
            type="button"
            onClick={handleCapturePainterFrameToAssets}
            className="text-white hover:underline cursor-pointer"
          >
            Send Frame to Stage
          </button>
        </div>
      </div>
    </div>
  );

  const stageButtons: Array<{
    id: CanvasCenterStage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'stage', label: 'Stage', icon: MonitorPlay },
    { id: 'workflow', label: 'Node Flow', icon: Workflow },
    { id: 'painter', label: 'Painter', icon: PenTool },
  ];

  return (
    <div
      data-no-swipe="true"
      className="relative w-full h-full flex flex-col bg-[#07080b] text-[#ECECE9] overflow-hidden select-none font-sans"
    >
      {/* Top Studio Header Bar */}
      <header className="h-14 px-3 sm:px-4 bg-[#0b0d12]/95 backdrop-blur-xl border-b border-white/[0.1] flex items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto no-scrollbar">
        {/* Left Zone: Navigation + Brand + Mode Switches */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open Navigation Menu"
              className="w-9 h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/80 hover:text-white cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={onBackToHero}
              className="font-serif tracking-[0.22em] text-xs sm:text-sm font-semibold uppercase text-white hover:text-white/80 cursor-pointer"
            >
              VAIURE
            </button>
            <span className="text-white/25">/</span>
            <span className="text-xs sm:text-sm font-mono font-semibold tracking-wider text-white">
              Canvas
            </span>
          </div>

          {/* Simple vs Advanced Mode Segmented Switch */}
          <div
            role="group"
            aria-label="Workspace Complexity Mode"
            className="flex items-center gap-0.5 p-1 rounded-lg border border-white/[0.12] bg-black/60 text-[11px] font-mono shrink-0"
          >
            {(['simple', 'advanced'] as CanvasExperienceMode[]).map((mode) => {
              const active = layoutPrefs.experienceMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    updateLayoutPrefs((prev) => ({
                      ...prev,
                      experienceMode: mode,
                      // In Simple mode stay clean on Stage if desired, without destroying Node/Painter data
                    }))
                  }
                  className={`px-2.5 py-1 rounded capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          {/* Center Workspace Stage Switcher */}
          <div className="flex items-center gap-0.5 p-1 rounded-lg border border-white/[0.1] bg-black/50 text-[11px] font-mono shrink-0">
            {stageButtons.map((btn) => {
              const Icon = btn.icon;
              const active = layoutPrefs.centerStage === btn.id;
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => updateLayoutPrefs((prev) => ({ ...prev, centerStage: btn.id }))}
                  className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    active ? 'bg-white/[0.16] text-white font-semibold' : 'text-white/55 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{btn.label}</span>
                </button>
              );
            })}
          </div>

          {layoutPrefs.centerStage === 'painter' && (
            <div className="hidden xl:flex items-center gap-1 p-1 rounded-lg border border-white/[0.1] bg-black/50 text-[10px] font-mono">
              {(Object.keys(CANVAS_ASPECT_DIMENSIONS) as CanvasAspectPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectAspect(preset)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                    aspectPreset === preset
                      ? 'bg-white text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Zone: Contextual Painter Controls + Layout Compactness + Mobile Drawers + Studio Bridges */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {layoutPrefs.centerStage === 'painter' && (
            <>
              <div className="flex items-center border border-white/[0.1] bg-white/[0.03] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  title="Undo (⌘Z)"
                  className="w-8 h-8 rounded flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRedo}
                  disabled={historyIndex >= historyStack.length - 1}
                  title="Redo (⌘⇧Z)"
                  className="w-8 h-8 rounded flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="hidden xl:flex items-center border border-white/[0.1] bg-white/[0.03] rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.15, Number((z - 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 tabular-nums text-white/80 min-w-[44px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(4, Number((z + 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => fitViewport()}
                  className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                  title="Fit Artboard"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowGuides((g) => !g)}
                title="Toggle Rule-of-Thirds Guides"
                className={`h-9 px-2.5 rounded-lg border text-[11px] font-mono hidden md:flex items-center gap-1.5 cursor-pointer ${
                  showGuides ? 'border-white/40 bg-white/15 text-white' : 'border-white/[0.1] text-white/60'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono hidden sm:flex items-center gap-1.5 cursor-pointer"
                title="Import image onto new layer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Import</span>
              </button>

              <button
                type="button"
                onClick={handlePushFrameToWorkflow}
                disabled={isPushingToFlow}
                className="h-9 px-2.5 rounded-lg border border-white/20 bg-white/[0.06] hover:bg-white/[0.14] text-white text-[11px] font-mono hidden md:flex items-center gap-1.5 cursor-pointer"
                title="Send Painted Frame into Node Flow"
              >
                <Workflow className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">{isPushingToFlow ? 'Pushing...' : 'To Flow'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono hidden sm:flex items-center gap-1.5 cursor-pointer"
                title="Export Composited PNG"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Compact Toolbar Mode Toggle (Desktop) */}
          <button
            type="button"
            onClick={() =>
              updateLayoutPrefs((prev) => ({ ...prev, compactToolbar: !prev.compactToolbar }))
            }
            title={layoutPrefs.compactToolbar ? 'Expand Tool Descriptions' : 'Compact Toolbars'}
            className={`hidden lg:flex w-9 h-9 rounded-lg border items-center justify-center cursor-pointer transition-colors ${
              layoutPrefs.compactToolbar
                ? 'border-white/40 bg-white/[0.14] text-white'
                : 'border-white/[0.12] bg-white/[0.04] text-white/65 hover:text-white'
            }`}
          >
            {layoutPrefs.compactToolbar ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Mobile/Tablet Left & Right Panel Triggers */}
          <button
            type="button"
            onClick={() => setIsMobileLeftOpen(true)}
            className="lg:hidden h-9 px-2.5 rounded-lg border border-white/[0.14] bg-white/[0.04] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMobileRightOpen(true)}
            className="lg:hidden h-9 px-2.5 rounded-lg border border-white/[0.14] bg-white/[0.04] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          {onGoToFuLabs && (
            <button
              type="button"
              onClick={onGoToFuLabs}
              className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/80 text-[11px] font-mono cursor-pointer whitespace-nowrap hidden xl:block"
            >
              05 Fu Labs 3D
            </button>
          )}

          {onGoToSeedance && (
            <button
              type="button"
              onClick={() => {
                if (layoutPrefs.centerStage === 'painter') {
                  void handleSendToSeedance();
                } else {
                  onGoToSeedance(config.startImageUrl || undefined);
                }
              }}
              disabled={isSendingToSeedance}
              className="h-9 px-3 rounded-lg bg-[#ecece9] hover:bg-white text-black text-[11px] font-mono font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              {isSendingToSeedance ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span className="hidden sm:inline">Seedance Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Global Toast Notice */}
      {statusNotice && (
        <div
          className={`absolute top-16 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-lg border text-xs font-mono backdrop-blur-xl shadow-2xl flex items-center gap-2 z-50 ${
            statusNotice.isError
              ? 'bg-neutral-950/95 border-amber-400/40 text-amber-100'
              : 'bg-black/92 border-white/20 text-white'
          }`}
        >
          {statusNotice.isError && <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Three-Area Workspace */}
      <div className="flex-1 min-h-0 flex relative overflow-hidden">
        {/* A. LEFT PANEL — PRODUCTION TOOLS */}
        <CanvasLeftToolsPanel
          experienceMode={layoutPrefs.experienceMode}
          minimized={layoutPrefs.leftMinimized}
          onToggleMinimize={() =>
            updateLayoutPrefs((prev) => ({ ...prev, leftMinimized: !prev.leftMinimized }))
          }
          sections={layoutPrefs.leftSections}
          onToggleSection={(key: keyof CanvasLeftSectionsState) =>
            updateLayoutPrefs((prev) => ({
              ...prev,
              leftSections: {
                ...prev.leftSections,
                [key]: !prev.leftSections[key],
              },
            }))
          }
          width={layoutPrefs.leftWidth}
          compactToolbar={layoutPrefs.compactToolbar}
          config={config}
          capabilities={capabilities}
          assets={assets}
          isUploadingMedia={isUploadingMedia}
          onSelectCreationMode={handleSelectCreationMode}
          onUploadFiles={handleUploadMediaFiles}
          onOpenAiPlateModal={() => setIsAiPlateOpen(true)}
          onCapturePainterFrame={handleCapturePainterFrameToAssets}
          onAttachAssetAsStart={(asset) => {
            updateConfig({
              startImageUrl: asset.url,
              creationMode:
                config.creationMode === 'text_to_video' ? 'image_to_video' : config.creationMode,
            });
            setActiveClipId(null);
            updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'stage' }));
            showNotice(`Attached "${asset.name}" as Start Frame.`);
          }}
          onAttachAssetAsEnd={(asset) => {
            updateConfig({ endImageUrl: asset.url });
            updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'stage' }));
            showNotice(`Attached "${asset.name}" as End Frame.`);
          }}
          onAddAssetAsReference={(asset) => {
            setConfig((prev) => {
              const exists = prev.referenceImageUrls.includes(asset.url);
              const nextRefs = exists
                ? prev.referenceImageUrls.filter((u) => u !== asset.url)
                : [...prev.referenceImageUrls, asset.url].slice(0, capabilities.maxReferenceImages);
              return { ...prev, referenceImageUrls: nextRefs };
            });
          }}
          onAttachAssetAsExtensionVideo={(asset) => {
            updateConfig({
              extensionVideoUrl: asset.url,
              creationMode: capabilities.isMuapi ? config.creationMode : 'video_extension',
            });
            setActiveClipId(null);
            updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'stage' }));
            showNotice(`Attached "${asset.name}" for Video Extension.`);
          }}
          onUpdateConfig={updateConfig}
          onFocusAdvancedSettings={() => {
            updateLayoutPrefs((prev) => ({
              ...prev,
              rightMinimized: false,
              rightSections: { ...prev.rightSections, advanced: true },
            }));
          }}
          onSwitchCenterStage={(stage) => {
            updateLayoutPrefs((prev) => ({ ...prev, centerStage: stage }));
            setIsMobileLeftOpen(false);
          }}
          isMobileOpen={isMobileLeftOpen}
          onCloseMobile={() => setIsMobileLeftOpen(false)}
        />

        {/* Desktop Left Panel Drag Resizer */}
        {!layoutPrefs.leftMinimized && (
          <div
            onPointerDown={(e) => {
              resizeDragRef.current = {
                side: 'left',
                startX: e.clientX,
                startWidth: layoutPrefs.leftWidth,
              };
            }}
            title="Drag to resize Production Tools panel"
            className="hidden lg:block w-1 hover:w-1.5 bg-transparent hover:bg-white/25 cursor-col-resize transition-colors shrink-0 z-20"
          />
        )}

        {/* B. CENTER PANEL — MAIN CANVAS */}
        <CanvasCenterWorkspace
          centerStage={layoutPrefs.centerStage}
          experienceMode={layoutPrefs.experienceMode}
          showTimeline={layoutPrefs.showTimeline}
          onToggleTimeline={() =>
            updateLayoutPrefs((prev) => ({ ...prev, showTimeline: !prev.showTimeline }))
          }
          config={config}
          capabilities={capabilities}
          activeClip={activeClip}
          timelineClips={timelineClips}
          activeGenerationStatus={activeGenStatus}
          isExtractingLastFrame={isExtractingLastFrame}
          onSelectClip={(clip) => {
            setActiveClipId(clip.id);
          }}
          onDeleteClip={(clipId) => {
            setTimelineClips((prev) => prev.filter((c) => c.id !== clipId));
            if (activeClipId === clipId) setActiveClipId(null);
            if (clipId) {
              void multiProviderGenerationService.deleteJob(clipId).catch(() => undefined);
            }
          }}
          onClearActivePreview={() => setActiveClipId(null)}
          onExtendFromActiveClip={handleExtendFromActiveClip}
          onFinalizeActiveDraft={handleFinalizeActiveDraft}
          onSendUrlToSeedance={onGoToSeedance ? (url) => onGoToSeedance(url) : undefined}
          onUploadStageFiles={handleUploadMediaFiles}
          onClearStartImage={() => updateConfig({ startImageUrl: '' })}
          onClearEndImage={() => updateConfig({ endImageUrl: '' })}
          onRemoveReferenceImage={(url) =>
            updateConfig({
              referenceImageUrls: config.referenceImageUrls.filter((u) => u !== url),
            })
          }
          onClearExtensionVideo={() => updateConfig({ extensionVideoUrl: '' })}
          onOpenPainter={() =>
            updateLayoutPrefs((prev) => ({ ...prev, centerStage: 'painter' }))
          }
          pendingFlowImageUrl={pendingFlowImageUrl}
          onConsumePaintedImage={() => setPendingFlowImageUrl(null)}
          onSendImagesToSeedance={onGoToSeedance}
          onStatusNotice={showNotice}
          painterStageElement={painterStageElement}
        />

        {/* Desktop Right Panel Drag Resizer */}
        {!layoutPrefs.rightMinimized && (
          <div
            onPointerDown={(e) => {
              resizeDragRef.current = {
                side: 'right',
                startX: e.clientX,
                startWidth: layoutPrefs.rightWidth,
              };
            }}
            title="Drag to resize Generation Settings panel"
            className="hidden lg:block w-1 hover:w-1.5 bg-transparent hover:bg-white/25 cursor-col-resize transition-colors shrink-0 z-20"
          />
        )}

        {/* C. RIGHT PANEL — GENERATION SETTINGS & PAINTER DOCK */}
        <CanvasRightSettingsPanel
          experienceMode={layoutPrefs.experienceMode}
          centerStage={layoutPrefs.centerStage}
          minimized={layoutPrefs.rightMinimized}
          onToggleMinimize={() =>
            updateLayoutPrefs((prev) => ({ ...prev, rightMinimized: !prev.rightMinimized }))
          }
          sections={layoutPrefs.rightSections}
          onToggleSection={(key: keyof CanvasRightSectionsState) =>
            updateLayoutPrefs((prev) => ({
              ...prev,
              rightSections: {
                ...prev.rightSections,
                [key]: !prev.rightSections[key],
              },
            }))
          }
          width={layoutPrefs.rightWidth}
          providers={providers}
          config={config}
          capabilities={capabilities}
          estimateState={estimateState}
          creditBalance={creditBalance}
          isGenerating={
            activeGenStatus.status === 'submitting' ||
            activeGenStatus.status === 'processing'
          }
          isEnhancingPrompt={isEnhancingPrompt}
          isAnalyzingMedia={isAnalyzingMedia}
          onUpdateConfig={updateConfig}
          onSelectProviderAndModel={handleSelectProviderAndModel}
          onEnhancePrompt={handleEnhancePrompt}
          onAnalyzeAttachedMedia={handleAnalyzeAttachedMedia}
          onGenerateVideo={handleGenerateVideo}
          painterInspectorSlot={painterInspectorSlot}
          painterLayerCount={layers.length}
          isMobileOpen={isMobileRightOpen}
          onCloseMobile={() => setIsMobileRightOpen(false)}
        />
      </div>

      {/* Hidden File Inputs for 2D Painter */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={(e) => handleImportImageFiles(e.target.files)}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,.vaibyte.json"
        className="hidden"
        onChange={(e) => handleImportProjectJson(e.target.files)}
      />

      {/* AI Concept Plate Synthesizer Modal */}
      {isAiPlateOpen && (
        <div
          onClick={() => setIsAiPlateOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGenerateAiPlate}
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#0b0d12] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-mono text-sm uppercase font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>VaiByte AI Concept Plate</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPlateOpen(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Generate a visual keyframe plate onto your Canvas Assets & Painter stack ({aspectPreset} · {artWidth} × {artHeight}px).
            </p>
            <textarea
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe composition, architecture, subject lighting, and mood..."
              className="w-full p-3 rounded-xl border border-white/15 bg-black/70 text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAiPlateOpen(false)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!aiPrompt.trim() || isGeneratingAiPlate}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-white/90 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAiPlate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Plate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
