/**
 * VAIURE — UNIFIED MULTI-PROVIDER AI VIDEO GENERATOR
 * Supports Provider A (ByteDance Official ModelArk v3) & Provider B (MUAPI Seedance 2.5 Spicy)
 * inside one unified monochrome glassmorphism studio interface.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Film,
  Camera,
  Upload,
  X,
  Play,
  Download,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Sliders,
  Volume2,
  VolumeX,
  Info,
  AlertCircle,
  ShieldCheck,
  Layers,
  Lock,
  ArrowRight,
  Image as ImageIcon,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SEEDANCE_MODELS,
  SeedanceModelKey,
  seedanceLabService,
  SeedanceAccountBalance,
  SeedanceHistoryItem,
  SeedanceApiError,
} from '../../../services/seedanceLabService';
import { estimateSeedanceCost } from '../../../services/seedancePlatformService';
import { SeedanceCostCalculation } from '../../../types/seedancePlatform';
import {
  BackendProcessStep,
  GenerationResolution,
  PriceEstimateBreakdown,
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import {
  computeLocalMuapiPricePreview,
  multiProviderGenerationService,
} from '../../../services/multiProviderGenerationService';
import { SeedanceAgentCopilotDrawer } from './SeedanceAgentCopilotDrawer';

interface SeedanceVideoGeneratorProps {
  initialModel?: SeedanceModelKey;
  initialProvider?: ProviderId;
  initialModelId?: string;
  initialPrompt?: string;
  initialAspect?: string;
  initialImages?: string[];
  initialResolution?: '480P' | '720P' | '1080P' | '4K';
  initialDuration?: number;
  initialPhysicsPriority?: boolean;
  initialContentRating?: '18+' | 'standard';
  initialDraftRequestId?: string;
  balance: SeedanceAccountBalance | null;
  isAuthenticated?: boolean;
  onRequireAuth?: () => void;
  onOpenPlans?: () => void;
  onOpenCredits?: () => void;
  onOpenFullAgent?: () => void;
  onGenerationComplete?: (item: SeedanceHistoryItem) => void;
  onUnifiedJobUpdated?: (job: UnifiedGenerationJob) => void;
  onRefreshBalance?: () => void;
  onOpenReferenceStudio?: () => void;
  onOpenCanvasStudio?: () => void;
  onOpenHistory?: () => void;
}

const MAX_REF_IMAGES = 30;
const MAX_PROMPT_WORDS = 30000;
const MAX_PROMPT_CHARS = 240000;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const CAMERA_DIRECTIVE_CHIPS = [
  '24fps slow dolly-in',
  '35mm anamorphic orbit',
  'Low-key chiaroscuro rim light',
  'Velvet slow-motion fabric physics',
  'Complex multi-body collision & debris physics',
  'Real-time fluid & aerodynamic wind vortex',
];

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

const FALLBACK_PROVIDERS: ProviderConfigPublic[] = [
  {
    providerId: 'bytedance',
    displayName: 'ByteDance Official',
    clientName: 'BytePlus ModelArk v3',
    enabled: true,
    configured: false,
    baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    autoFallbackEnabled: false,
    pollIntervalMs: 5000,
    maxPollTimeoutMs: 1200000,
    creditsPerUsd: 27,
    enforceWalletOnUsdProviders: true,
    safetyCheckerLockedOn: true,
    safetyNotice: 'ByteDance ModelArk safety filters are active and enforced by BytePlus API.',
    updatedAt: '',
    models: [
      {
        providerId: 'bytedance',
        modelId: 'seedance_25_15s',
        displayName: 'Seedance 2.5 720p (15s)',
        enabled: true,
        category: 'Video',
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
        resolutions: ['480p', '720p', '1080p'],
        durations: [5, 10, 15],
        enabledResolutions: ['480p', '720p', '1080p'],
        enabledDurations: [5, 10, 15],
        pricingCurrency: 'CREDITS',
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: true,
        safetyNotice: 'Governed by ByteDance ModelArk safety policy.',
      },
      {
        providerId: 'bytedance',
        modelId: 'seedance_25_30s',
        displayName: 'Seedance 2.5 720p (30s)',
        enabled: true,
        category: 'Video',
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
        resolutions: ['480p', '720p', '1080p'],
        durations: [15, 20, 30],
        enabledResolutions: ['480p', '720p', '1080p'],
        enabledDurations: [15, 20, 30],
        pricingCurrency: 'CREDITS',
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: true,
        safetyNotice: 'Governed by ByteDance ModelArk safety policy.',
      },
    ],
  },
  {
    providerId: 'muapi',
    displayName: 'MUAPI',
    clientName: 'vaiurenetwoek',
    enabled: true,
    configured: false,
    baseUrl: 'https://api.muapi.ai/api/v1',
    autoFallbackEnabled: false,
    pollIntervalMs: 3000,
    maxPollTimeoutMs: 1200000,
    creditsPerUsd: 27,
    enforceWalletOnUsdProviders: true,
    safetyCheckerLockedOn: true,
    safetyNotice:
      'MUAPI safety checker is locked ON and enforced server-side per account/API configuration.',
    updatedAt: '',
    models: [
      {
        providerId: 'muapi',
        modelId: 'muapi/seedance-2.5-spicy-image-to-video',
        displayName: 'Seedance 2.5 Spicy',
        clientName: 'vaiurenetwoek',
        enabled: true,
        category: 'Image-to-Video',
        supportsImageToVideo: true,
        supportsTextToVideo: false,
        requiresStartImage: true,
        supportsLastImage: true,
        supportsReferencePlates: false,
        maxReferenceImages: 2,
        supportsDraftMode: true,
        supportsAudio: true,
        supportsCameraFixed: true,
        supportsHighBitrate: true,
        resolutions: ['480p', '720p', '1080p', '4K'],
        durations: [5, 10, 20, 30],
        enabledResolutions: ['480p', '720p', '1080p', '4K'],
        enabledDurations: [5, 10, 20, 30],
        pricingCurrency: 'USD',
        usdPricingMatrix: {
          '480p': { 5: 0.94, 10: 1.87, 20: 3.74, 30: 5.61 },
          '720p': { 5: 1.87, 10: 3.74, 20: 7.48, 30: 11.22 },
          '1080p': { 5: 4.67, 10: 9.35, 20: 18.7, 30: 28.05 },
          '4K': { 5: 9.35, 10: 18.7, 20: 37.4, 30: 56.1 },
        },
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: true,
        safetyNotice: 'MUAPI safety checker is locked ON and cannot be bypassed.',
      },
    ],
  },
];

function toCanonicalResolution(raw?: string): GenerationResolution {
  const s = String(raw || '').trim();
  if (s === '4K' || s.toLowerCase() === '4k') return '4K';
  if (s.toLowerCase() === '1080p') return '1080p';
  if (s.toLowerCase() === '480p') return '480p';
  return '720p';
}

export const SeedanceVideoGenerator: React.FC<SeedanceVideoGeneratorProps> = ({
  initialModel = 'seedance_25_15s',
  initialProvider = 'bytedance',
  initialModelId,
  initialPrompt = '',
  initialAspect = '16:9',
  initialImages = [],
  initialResolution = '720P',
  initialDuration,
  initialPhysicsPriority = true,
  initialContentRating = 'standard',
  initialDraftRequestId = '',
  balance,
  isAuthenticated = false,
  onRequireAuth,
  onOpenPlans,
  onOpenCredits,
  onOpenFullAgent,
  onGenerationComplete,
  onUnifiedJobUpdated,
  onRefreshBalance,
  onOpenReferenceStudio,
  onOpenCanvasStudio,
  onOpenHistory,
}) => {
  // Provider Catalog
  const [providers, setProviders] = useState<ProviderConfigPublic[]>(FALLBACK_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState<ProviderId>(initialProvider);
  const [selectedModelId, setSelectedModelId] = useState<string>(
    initialModelId || (initialProvider === 'muapi' ? 'muapi/seedance-2.5-spicy-image-to-video' : initialModel)
  );

  // Legacy ByteDance model alias sync
  const selectedByteDanceKey: SeedanceModelKey = (
    selectedModelId in SEEDANCE_MODELS ? selectedModelId : 'seedance_25_15s'
  ) as SeedanceModelKey;

  // Prompt state
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Reference / Image-to-Video images
  const [referenceImages, setReferenceImages] = useState<string[]>(
    initialImages.slice(0, MAX_REF_IMAGES)
  );
  const [startImageUrl, setStartImageUrl] = useState<string>(initialImages[0] || '');
  const [lastImageUrl, setLastImageUrl] = useState<string>(initialImages[1] || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingLastImage, setIsUploadingLastImage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startFileInputRef = useRef<HTMLInputElement>(null);
  const lastFileInputRef = useRef<HTMLInputElement>(null);

  // Unified Parameters
  const [aspectRatio, setAspectRatio] = useState<string>(initialAspect);
  const [resolution, setResolution] = useState<GenerationResolution>(
    toCanonicalResolution(initialResolution)
  );
  const [durationSeconds, setDurationSeconds] = useState<number>(initialDuration || 5);
  const [generateAudio, setGenerateAudio] = useState<boolean>(true);
  const [cameraFixed, setCameraFixed] = useState<boolean>(false);
  const [highBitrate, setHighBitrate] = useState<boolean>(false);
  const [draftMode, setDraftMode] = useState<boolean>(false);
  const [draftRequestId, setDraftRequestId] = useState<string>(initialDraftRequestId);
  const [showAdvancedDraftField, setShowAdvancedDraftField] = useState<boolean>(
    Boolean(initialDraftRequestId)
  );

  // ByteDance-specific controls (preserved untouched)
  const [videoFormat, setVideoFormat] = useState<'MP4' | 'MOV'>('MP4');
  const [quantity, setQuantity] = useState<number>(1);
  const [contentRating, setContentRating] = useState<'18+' | 'standard'>(initialContentRating);
  const [physicsPriority, setPhysicsPriority] = useState<boolean>(initialPhysicsPriority);

  // Pricing States
  const [dynamicCost, setDynamicCost] = useState<SeedanceCostCalculation | null>(null);
  const [usdEstimate, setUsdEstimate] = useState<PriceEstimateBreakdown | null>(null);
  const [needsCreditAction, setNeedsCreditAction] = useState(false);

  // Execution & Polling States
  type ExecutionState = 'ready' | 'preparing' | 'submitting' | 'processing' | 'completed' | 'failed';
  const [execState, setExecState] = useState<ExecutionState>('ready');
  const [activeUnifiedJob, setActiveUnifiedJob] = useState<UnifiedGenerationJob | null>(null);
  const [isFinalizingDraft, setIsFinalizingDraft] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [backendTraces, setBackendTraces] = useState<BackendProcessStep[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [expandedTraceIds, setExpandedTraceIds] = useState<Record<string, boolean>>({});

  const mergeBackendTraces = (incoming: BackendProcessStep[] | undefined) => {
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    setBackendTraces((prev) => {
      const byId = new Map<string, BackendProcessStep>();
      for (const item of prev) byId.set(item.id, item);
      for (const item of incoming) byId.set(item.id, item);
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  };

  // Load live provider registry from /api/providers
  useEffect(() => {
    let active = true;
    multiProviderGenerationService
      .getProviders()
      .then((list) => {
        if (!active || list.length === 0) return;
        setProviders(list);
      })
      .catch(() => {
        // Fallback already populated
      });
    return () => {
      active = false;
    };
  }, []);

  // Sync external initial props
  useEffect(() => {
    if (initialProvider) setSelectedProviderId(initialProvider);
  }, [initialProvider]);

  useEffect(() => {
    if (initialModelId) {
      setSelectedModelId(initialModelId);
    } else if (initialModel && selectedProviderId === 'bytedance') {
      setSelectedModelId(initialModel);
    }
  }, [initialModel, initialModelId, selectedProviderId]);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  useEffect(() => {
    setReferenceImages(initialImages);
    if (initialImages[0]) setStartImageUrl(initialImages[0]);
    if (initialImages[1]) setLastImageUrl(initialImages[1]);
  }, [initialImages]);

  useEffect(() => {
    if (initialAspect) setAspectRatio(initialAspect);
  }, [initialAspect]);

  useEffect(() => {
    if (initialResolution) setResolution(toCanonicalResolution(initialResolution));
  }, [initialResolution]);

  useEffect(() => {
    if (initialDuration) setDurationSeconds(initialDuration);
  }, [initialDuration]);

  useEffect(() => {
    setPhysicsPriority(initialPhysicsPriority);
  }, [initialPhysicsPriority]);

  useEffect(() => {
    setContentRating(initialContentRating);
  }, [initialContentRating]);

  useEffect(() => {
    if (initialDraftRequestId) {
      setDraftRequestId(initialDraftRequestId);
      setShowAdvancedDraftField(true);
    }
  }, [initialDraftRequestId]);

  useEffect(() => {
    if (!previewImageModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImageModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewImageModal]);

  const activeProvider = useMemo(
    () =>
      providers.find((p) => p.providerId === selectedProviderId) ||
      providers[0] ||
      FALLBACK_PROVIDERS[0],
    [providers, selectedProviderId]
  );

  const availableModels = useMemo(
    () => (activeProvider.models || []).filter((m) => m.enabled),
    [activeProvider]
  );

  const activeModel: ProviderModelDefinition | undefined = useMemo(
    () => availableModels.find((m) => m.modelId === selectedModelId) || availableModels[0],
    [availableModels, selectedModelId]
  );

  // When switching providers, auto-pick valid model, resolution & duration cleanly without silent downgrade inside a request
  const handleSelectProvider = (providerId: ProviderId) => {
    setSelectedProviderId(providerId);
    setErrorMessage(null);
    const prov = providers.find((p) => p.providerId === providerId);
    const firstModel = prov?.models.find((m) => m.enabled);
    if (firstModel) {
      setSelectedModelId(firstModel.modelId);
      if (!firstModel.enabledResolutions.includes(resolution)) {
        setResolution(
          firstModel.enabledResolutions.includes('720p')
            ? '720p'
            : firstModel.enabledResolutions[0] || '480p'
        );
      }
      if (!firstModel.enabledDurations.includes(durationSeconds as any)) {
        setDurationSeconds(firstModel.enabledDurations[0] || 5);
      }
      if (!firstModel.supportsDraftMode) {
        setDraftMode(false);
      }
    }
  };

  const handleSelectModel = (model: ProviderModelDefinition) => {
    setSelectedModelId(model.modelId);
    setErrorMessage(null);
    if (!model.enabledResolutions.includes(resolution)) {
      setResolution(
        model.enabledResolutions.includes('720p')
          ? '720p'
          : model.enabledResolutions[0] || '480p'
      );
    }
    if (!model.enabledDurations.includes(durationSeconds as any)) {
      setDurationSeconds(
        model.modelId.includes('30s') && model.enabledDurations.includes(30)
          ? 30
          : model.enabledDurations[model.enabledDurations.length - 1] || 5
      );
    }
    if (!model.supportsDraftMode) {
      setDraftMode(false);
    }
  };

  // Effective resolution (Draft mode strictly uses 480p)
  const effectiveResolution: GenerationResolution =
    draftMode && activeModel?.supportsDraftMode ? '480p' : resolution;

  // Live ByteDance credit calculation
  useEffect(() => {
    if (selectedProviderId !== 'bytedance') return;
    let active = true;
    const resKey = (effectiveResolution === '4K' ? '1080p' : effectiveResolution) as
      | '480p'
      | '720p'
      | '1080p';
    estimateSeedanceCost({
      model: selectedByteDanceKey,
      resolution: resKey,
      duration: durationSeconds,
      referenceImagesCount: referenceImages.length,
      physicsPriority,
      quantity,
    })
      .then((cost) => {
        if (active) setDynamicCost(cost);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    selectedProviderId,
    selectedByteDanceKey,
    effectiveResolution,
    durationSeconds,
    referenceImages.length,
    physicsPriority,
    quantity,
  ]);

  // Live MUAPI / USD authoritative cost estimation
  useEffect(() => {
    if (!activeModel || selectedProviderId === 'bytedance') {
      setUsdEstimate(null);
      return;
    }
    let active = true;
    multiProviderGenerationService
      .estimateCost({
        provider: selectedProviderId,
        modelId: activeModel.modelId,
        resolution: effectiveResolution,
        duration: durationSeconds,
        draft: draftMode,
      })
      .then((est) => {
        if (active) setUsdEstimate(est);
      })
      .catch(() => {
        // fallback computed synchronously below
      });
    return () => {
      active = false;
    };
  }, [selectedProviderId, activeModel, effectiveResolution, durationSeconds, draftMode]);

  const localUsdPreview = useMemo(
    () =>
      computeLocalMuapiPricePreview(
        activeModel,
        effectiveResolution,
        durationSeconds,
        draftMode
      ),
    [activeModel, effectiveResolution, durationSeconds, draftMode]
  );

  // Restore active job on mount if user switched views mid-render
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const savedJobId = localStorage.getItem('vaiure_active_mp_job_id');
      if (!savedJobId) return;
      multiProviderGenerationService
        .getJobStatus(savedJobId)
        .then((job) => {
          if (!job) return;
          setActiveUnifiedJob(job);
          if (job.backend_traces) mergeBackendTraces(job.backend_traces);
          if (job.status === 'pending' || job.status === 'processing') {
            setExecState('processing');
            setProgress(job.progress || 40);
          } else if (job.status === 'completed' && (job.playback_url || job.provider_output_url)) {
            setExecState('completed');
            setProgress(100);
            setGeneratedVideoUrl(job.playback_url || job.provider_output_url);
            localStorage.removeItem('vaiure_active_mp_job_id');
          } else {
            localStorage.removeItem('vaiure_active_mp_job_id');
          }
        })
        .catch(() => {
          localStorage.removeItem('vaiure_active_mp_job_id');
        });
    } catch {
      // ignore storage errors
    }
  }, [isAuthenticated]);

  // Unified real-time handler shared by both SSE push stream and 3-second fallback poll
  const applyUpdatedUnifiedJob = (updated: UnifiedGenerationJob) => {
    setActiveUnifiedJob(updated);
    if (updated.backend_traces) {
      mergeBackendTraces(updated.backend_traces);
    }
    onUnifiedJobUpdated?.(updated);

    if (updated.status === 'completed' && (updated.playback_url || updated.provider_output_url)) {
      const finalUrl = updated.playback_url || updated.provider_output_url!;
      setExecState('completed');
      setProgress(100);
      setGeneratedVideoUrl(finalUrl);
      try {
        localStorage.removeItem('vaiure_active_mp_job_id');
      } catch {
        // ignore
      }
      onRefreshBalance?.();
      onGenerationComplete?.({
        id: updated.job_id,
        job_code: updated.request_id || updated.job_id,
        model: updated.model_id,
        model_name: updated.model_name,
        category: updated.draft ? 'Draft Preview' : 'Video',
        prompt: updated.prompt,
        parameters: {
          provider: updated.provider,
          aspect_ratio: updated.aspect_ratio,
          resolution: updated.resolution,
          duration: updated.duration,
          sound_enabled: updated.generate_audio,
        },
        status: 'completed',
        cost_generate: updated.credits_deducted || 0,
        result_url: finalUrl,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      });
    } else if (updated.status === 'failed') {
      setExecState('failed');
      setErrorMessage(
        updated.refunded
          ? `${updated.error || 'Generation failed.'} (Credits automatically refunded.)`
          : updated.error || 'Video generation failed on provider.'
      );
      try {
        localStorage.removeItem('vaiure_active_mp_job_id');
      } catch {
        // ignore
      }
      onRefreshBalance?.();
    } else {
      setProgress(Math.max(25, updated.progress || 45));
    }
  };

  // Real-Time SSE stream + 3-second fallback polling & elapsed clock when processing
  useEffect(() => {
    let pollTimer: NodeJS.Timeout | null = null;
    let clockTimer: NodeJS.Timeout | null = null;
    let unsubscribeSse: (() => void) | null = null;

    if (execState === 'processing' && activeUnifiedJob?.job_id) {
      clockTimer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      if (isAuthenticated && !activeUnifiedJob.job_id.startsWith('JOB-')) {
        unsubscribeSse = multiProviderGenerationService.subscribeToJobRealtimeStream(
          activeUnifiedJob.job_id,
          {
            onConnected: () => setSseConnected(true),
            onInit: ({ job, traces }) => {
              if (traces) mergeBackendTraces(traces);
              if (job) applyUpdatedUnifiedJob(job);
            },
            onTraceStep: (trace, job) => {
              mergeBackendTraces([trace]);
              if (job) applyUpdatedUnifiedJob(job);
            },
            onJobUpdate: (job) => {
              applyUpdatedUnifiedJob(job);
            },
            onError: () => setSseConnected(false),
          }
        );
      }

      const pollDelay = Math.max(3000, activeProvider.pollIntervalMs || 3000);
      pollTimer = setInterval(async () => {
        try {
          const updated = await multiProviderGenerationService.getJobStatus(
            activeUnifiedJob.job_id
          );
          applyUpdatedUnifiedJob(updated);
        } catch {
          // Retain processing state while backend background worker handles retries
        }
      }, pollDelay);
    } else {
      setSseConnected(false);
    }

    return () => {
      if (unsubscribeSse) unsubscribeSse();
      if (pollTimer) clearInterval(pollTimer);
      if (clockTimer) clearInterval(clockTimer);
    };
  }, [execState, activeUnifiedJob?.job_id, activeProvider.pollIntervalMs, isAuthenticated]);

  const uploadSingleImageToServer = async (file: File): Promise<string> => {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return seedanceLabService.uploadMedia(dataUrl, file.name);
  };

  // Multi-image upload (ByteDance 30 plates)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    setErrorMessage(null);
    const availableSlots = MAX_REF_IMAGES - referenceImages.length;
    const filesToUpload = Array.from(files).slice(0, availableSlots);

    for (const file of filesToUpload) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const hostedUrl = await uploadSingleImageToServer(file);
        setReferenceImages((prev) =>
          prev.length < MAX_REF_IMAGES ? [...prev, hostedUrl] : prev
        );
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to upload reference image.');
      }
    }

    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // MUAPI Start Image upload
  const handleStartImageUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !files[0].type.startsWith('image/')) return;
    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const url = await uploadSingleImageToServer(files[0]);
      setStartImageUrl(url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload start image.');
    } finally {
      setIsUploadingImage(false);
      if (startFileInputRef.current) startFileInputRef.current.value = '';
    }
  };

  // MUAPI Last Image upload
  const handleLastImageUpload = async (files: FileList | null) => {
    if (!files || !files[0] || !files[0].type.startsWith('image/')) return;
    setIsUploadingLastImage(true);
    setErrorMessage(null);
    try {
      const url = await uploadSingleImageToServer(files[0]);
      setLastImageUrl(url);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to upload last image.');
    } finally {
      setIsUploadingLastImage(false);
      if (lastFileInputRef.current) lastFileInputRef.current.value = '';
    }
  };

  const handleEnhancePhysics = async () => {
    if (!prompt.trim() || isOptimizingPrompt) return;
    setIsOptimizingPrompt(true);
    setErrorMessage(null);
    try {
      const res = await seedanceLabService.optimizePromptPhysics({
        prompt: prompt.trim(),
        durationSeconds,
        aspectRatio: aspectRatio === 'Smart' ? '16:9' : aspectRatio,
        physicsPriority,
        contentRating,
      });
      if (res.optimizedPrompt) setPrompt(res.optimizedPrompt);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to optimize prompt physics.');
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const wordCount = countWords(prompt);
  const isMuapiMode = selectedProviderId !== 'bytedance';

  const handleGenerate = async () => {
    if (!isAuthenticated) {
      setErrorMessage('Please sign in to your VAIURE account to run video generations.');
      onRequireAuth?.();
      return;
    }

    if (!prompt.trim()) {
      setErrorMessage('Please enter a scene prompt before generating.');
      return;
    }
    if (wordCount > MAX_PROMPT_WORDS || prompt.length > MAX_PROMPT_CHARS) {
      setErrorMessage(`Prompt exceeds maximum length (${MAX_PROMPT_WORDS.toLocaleString()} words).`);
      return;
    }

    if (activeModel?.requiresStartImage && !startImageUrl.trim()) {
      setErrorMessage(
        `Start Image (image_url) is required for ${activeModel.displayName}. Upload an image or paste a public HTTPS image URL.`
      );
      return;
    }

    if (
      selectedProviderId === 'bytedance' &&
      SEEDANCE_MODELS[selectedByteDanceKey]?.isR2V &&
      referenceImages.length === 0
    ) {
      setErrorMessage(
        `Model "${activeModel?.displayName || selectedByteDanceKey}" requires at least 1 reference image.`
      );
      return;
    }

    setErrorMessage(null);
    setNeedsCreditAction(false);
    setGeneratedVideoUrl(null);
    setExecState('preparing');
    setProgress(10);
    setElapsedSeconds(0);
    setBackendTraces([
      {
        id: `client_dispatch_${Date.now()}`,
        timestamp: new Date().toISOString(),
        stage: 'VALIDATE',
        method: 'POST',
        endpoint: '/api/generations/submit',
        statusLabel: 'DISPATCHING',
        summary: `Dispatching generation request to backend (${activeProvider.displayName} · ${effectiveResolution} · ${durationSeconds}s)`,
      },
    ]);

    try {
      setExecState('submitting');
      setProgress(22);

      const resolvedAspect = aspectRatio === 'Smart' ? '16:9' : aspectRatio;
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `gen_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // If ByteDance multi-quantity (>1) is requested, preserve legacy batch route; otherwise unified /api/generations/submit
      if (selectedProviderId === 'bytedance' && quantity > 1) {
        const legacyRes = await seedanceLabService.submitGeneration({
          model: selectedByteDanceKey,
          prompt: prompt.trim(),
          aspect_ratio: resolvedAspect,
          reference_image_urls: referenceImages,
          sound_enabled: generateAudio,
          camera_fixed: cameraFixed,
          resolution: effectiveResolution === '4K' ? '1080P' : effectiveResolution.toUpperCase(),
          duration: durationSeconds,
          video_format: videoFormat,
          quantity,
          content_rating: contentRating,
          physics_priority: physicsPriority,
          idempotencyKey,
        });
        onRefreshBalance?.();
        if (legacyRes.immediateResultUrl) {
          setExecState('completed');
          setProgress(100);
          setGeneratedVideoUrl(legacyRes.immediateResultUrl);
        } else {
          setExecState('processing');
          setProgress(35);
          setActiveUnifiedJob({
            job_id: legacyRes.jobCode,
            user_id: '',
            provider: 'bytedance',
            model_id: selectedByteDanceKey,
            model_name: activeModel?.displayName || selectedByteDanceKey,
            request_id: legacyRes.jobCode,
            parent_draft_job_id: null,
            prompt: prompt.trim(),
            image_url: referenceImages[0] || null,
            last_image: null,
            resolution: effectiveResolution,
            duration: durationSeconds,
            generate_audio: generateAudio,
            camera_fixed: cameraFixed,
            high_bitrate: false,
            draft: false,
            draft_request_id: null,
            estimated_cost: legacyRes.costGenerate || 0,
            currency: 'CREDITS',
            status: 'processing',
            progress: 35,
            provider_output_url: null,
            firebase_storage_path: null,
            playback_url: null,
            error: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_at: null,
          });
        }
        return;
      }

      const res = await multiProviderGenerationService.submitGeneration({
        provider: selectedProviderId,
        model_id: activeModel?.modelId || selectedModelId,
        prompt: prompt.trim(),
        image_url: isMuapiMode ? startImageUrl.trim() : referenceImages[0],
        last_image: isMuapiMode ? lastImageUrl.trim() || undefined : undefined,
        reference_image_urls: isMuapiMode ? undefined : referenceImages,
        aspect_ratio: isMuapiMode ? undefined : resolvedAspect,
        resolution: effectiveResolution,
        duration: durationSeconds,
        generate_audio: generateAudio,
        camera_fixed: cameraFixed,
        high_bitrate: highBitrate,
        draft: Boolean(draftMode && activeModel?.supportsDraftMode),
        draft_request_id: !draftMode && draftRequestId.trim() ? draftRequestId.trim() : undefined,
        physics_priority: isMuapiMode ? undefined : physicsPriority,
        content_rating: isMuapiMode ? undefined : contentRating,
        idempotency_key: idempotencyKey,
      });

      setActiveUnifiedJob(res.job);
      if (res.job.backend_traces) {
        setBackendTraces(res.job.backend_traces);
      }
      onUnifiedJobUpdated?.(res.job);
      onRefreshBalance?.();

      if (res.job.status === 'completed' && (res.job.playback_url || res.job.provider_output_url)) {
        setExecState('completed');
        setProgress(100);
        setGeneratedVideoUrl(res.job.playback_url || res.job.provider_output_url);
      } else {
        setExecState('processing');
        setProgress(res.job.progress || 25);
        try {
          localStorage.setItem('vaiure_active_mp_job_id', res.job.job_id);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setExecState('failed');
      if (Array.isArray(err?.details?.traces) && err.details.traces.length > 0) {
        setBackendTraces(err.details.traces);
      } else {
        mergeBackendTraces([
          {
            id: `client_err_${Date.now()}`,
            timestamp: new Date().toISOString(),
            stage: 'ERROR',
            method: 'POST',
            endpoint: '/api/generations/submit',
            statusCode: typeof err?.status === 'number' ? err.status : 500,
            statusLabel: 'FAILED',
            summary: err?.message || 'Submission failed.',
          },
        ]);
      }
      if (err instanceof SeedanceApiError || typeof err?.status === 'number') {
        if (err.status === 401) {
          onRequireAuth?.();
        } else if (err.status === 402 || err.code === 'INSUFFICIENT_CREDITS') {
          setNeedsCreditAction(true);
        }
      }
      setErrorMessage(err?.message || 'Generation submission failed. Please try again.');
    }
  };

  // Stage B: Finalize Completed Draft -> 1080p
  const handleFinalizeCurrentDraft = async () => {
    if (!activeUnifiedJob || !activeUnifiedJob.draft || isFinalizingDraft) return;
    setIsFinalizingDraft(true);
    setErrorMessage(null);
    setNeedsCreditAction(false);

    try {
      setExecState('submitting');
      setProgress(20);
      setElapsedSeconds(0);
      setGeneratedVideoUrl(null);
      setBackendTraces([
        {
          id: `client_finalize_${Date.now()}`,
          timestamp: new Date().toISOString(),
          stage: 'VALIDATE',
          method: 'POST',
          endpoint: `/api/generations/${activeUnifiedJob.job_id}/finalize`,
          statusLabel: 'DISPATCHING',
          summary: 'Submitting 2-stage Finalize Draft -> 1080p request to backend',
        },
      ]);

      const res = await multiProviderGenerationService.finalizeDraft(activeUnifiedJob.job_id, {
        resolution: '1080p',
        high_bitrate: highBitrate,
      });

      setDraftMode(false);
      setResolution('1080p');
      if (res.parentDraftJob.request_id) {
        setDraftRequestId(res.parentDraftJob.request_id);
        setShowAdvancedDraftField(true);
      }
      setActiveUnifiedJob(res.job);
      if (res.job.backend_traces) {
        setBackendTraces(res.job.backend_traces);
      }
      onUnifiedJobUpdated?.(res.job);
      onRefreshBalance?.();

      if (res.job.status === 'completed' && (res.job.playback_url || res.job.provider_output_url)) {
        setExecState('completed');
        setProgress(100);
        setGeneratedVideoUrl(res.job.playback_url || res.job.provider_output_url);
      } else {
        setExecState('processing');
        setProgress(30);
        try {
          localStorage.setItem('vaiure_active_mp_job_id', res.job.job_id);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setExecState('failed');
      if (Array.isArray(err?.details?.traces) && err.details.traces.length > 0) {
        setBackendTraces(err.details.traces);
      }
      if (err?.status === 402 || err?.code === 'INSUFFICIENT_CREDITS') {
        setNeedsCreditAction(true);
      }
      setErrorMessage(err?.message || 'Failed to finalize draft video.');
    } finally {
      setIsFinalizingDraft(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Displayed Cost Calculations
  const activeUsdCost = usdEstimate?.finalPriceUsd ?? localUsdPreview?.finalPriceUsd ?? 0;
  const activeProviderUsd = usdEstimate?.providerCostUsd ?? localUsdPreview?.providerCostUsd ?? 0;
  const activeMarkupUsd = usdEstimate?.appMarkupUsd ?? localUsdPreview?.appMarkupUsd ?? 0;
  const activeUsdCredits =
    usdEstimate?.creditsRequired ??
    Math.max(1, Math.ceil(activeUsdCost * (activeProvider.creditsPerUsd || 27)));

  const estimatedByteDanceCredits =
    dynamicCost?.totalCreditDeduction ??
    (SEEDANCE_MODELS[selectedByteDanceKey]?.costGenerate || 4) * quantity;
  const availableCredits = balance?.balance_generate ?? 0;
  const creditsNeeded = isMuapiMode
    ? activeProvider.enforceWalletOnUsdProviders
      ? activeUsdCredits
      : 0
    : estimatedByteDanceCredits;
  const hasInsufficientCredits = isAuthenticated && creditsNeeded > 0 && availableCredits < creditsNeeded;

  const finalizePreview = useMemo(() => {
    if (!activeUnifiedJob?.draft || !activeModel) return null;
    return computeLocalMuapiPricePreview(
      activeModel,
      '1080p',
      activeUnifiedJob.duration,
      false
    );
  }, [activeUnifiedJob, activeModel]);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-3 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1720px] mx-auto space-y-6 pb-20">
        {/* Error / Notice Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl border border-white/20 bg-white/[0.05] backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/90 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Studio Notice: </span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {needsCreditAction && onOpenCredits && (
                <button
                  type="button"
                  onClick={onOpenCredits}
                  className="px-3 py-1.5 rounded-lg bg-white text-black font-mono text-[10px] font-semibold uppercase cursor-pointer"
                >
                  Open Credits
                </button>
              )}
              {needsCreditAction && onOpenPlans && (
                <button
                  type="button"
                  onClick={onOpenPlans}
                  className="px-3 py-1.5 rounded-lg border border-white/25 text-white font-mono text-[10px] uppercase cursor-pointer"
                >
                  View Plans
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setNeedsCreditAction(false);
                }}
                className="text-white/50 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Unified Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Provider, Model, Prompt, Media, Settings */}
          <div className="lg:col-span-7 space-y-6">
            {/* 01. PROVIDER & MODEL SELECTOR */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    01. AI Video Provider & Model
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-white/50 uppercase">
                  {activeProvider.displayName} · {activeProvider.configured ? 'API READY' : 'KEY UNSET'}
                </span>
              </div>

              {/* Provider Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {providers.map((prov) => {
                  const isSelected = prov.providerId === selectedProviderId;
                  return (
                    <button
                      key={prov.providerId}
                      type="button"
                      onClick={() => handleSelectProvider(prov.providerId)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-white bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.18)]'
                          : 'border-white/[0.1] bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold uppercase tracking-wide truncate">
                          {prov.displayName}
                        </div>
                        <div
                          className={`text-[10px] font-mono truncate ${
                            isSelected ? 'text-black/65' : 'text-white/45'
                          }`}
                        >
                          {prov.providerId === 'muapi'
                            ? `Seedance 2.5 Spicy · up to 4K 30s`
                            : 'BytePlus ModelArk Seedance 2.5'}
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase shrink-0 ${
                          isSelected
                            ? 'bg-black text-white font-bold'
                            : prov.configured
                            ? 'bg-white/10 text-white/80'
                            : 'bg-white/5 text-white/45'
                        }`}
                      >
                        {prov.configured ? 'Ready' : 'Needs Key'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Model Selector for Active Provider */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-white/45 uppercase tracking-wider block">
                  Select Model Architecture
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {availableModels.map((model) => {
                    const isSelected = activeModel?.modelId === model.modelId;
                    const legacyMeta =
                      model.modelId in SEEDANCE_MODELS
                        ? SEEDANCE_MODELS[model.modelId as SeedanceModelKey]
                        : null;
                    return (
                      <button
                        key={model.modelId}
                        type="button"
                        onClick={() => handleSelectModel(model)}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected
                            ? 'border-white bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.18)]'
                            : 'border-white/[0.1] bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tracking-tight">
                            {model.displayName}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-black text-white font-bold'
                                : 'bg-white/[0.08] text-white/70'
                            }`}
                          >
                            {model.pricingCurrency === 'USD'
                              ? model.resolutions.join(' / ')
                              : `${legacyMeta?.durationSeconds || model.durations[0] || 15}s`}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-mono flex items-center justify-between ${
                            isSelected ? 'text-black/70' : 'text-white/50'
                          }`}
                        >
                          <span className="truncate">{model.modelId}</span>
                          <span className="tabular-nums font-semibold shrink-0 ml-2">
                            {model.pricingCurrency === 'USD'
                              ? 'From $0.94 USD'
                              : legacyMeta
                              ? `Rp ${legacyMeta.rateIdr.toLocaleString('id-ID')}`
                              : 'Credits'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 02. PROMPT EDITOR */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                  02. Cinematic Scene Prompt
                </span>
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCopilotOpen((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-md border text-[10px] font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                      isCopilotOpen
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/20 bg-white/[0.08] hover:bg-white hover:text-black text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Copilot</span>
                  </button>
                  {prompt.trim() && (
                    <button
                      type="button"
                      disabled={isOptimizingPrompt}
                      onClick={handleEnhancePhysics}
                      className="px-2.5 py-1 rounded-md border border-white/20 bg-white/[0.08] hover:bg-white hover:text-black text-[10px] font-mono uppercase tracking-wider text-white transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Sparkles className={`w-3 h-3 ${isOptimizingPrompt ? 'animate-spin' : ''}`} />
                      <span>{isOptimizingPrompt ? 'Enhancing...' : 'Enhance Physics'}</span>
                    </button>
                  )}
                  {prompt && (
                    <button
                      type="button"
                      onClick={() => setPrompt('')}
                      className="text-[11px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <span className="text-[11px] font-mono tabular-nums text-white/65">
                    {wordCount.toLocaleString()} Words
                  </span>
                </div>
              </div>

              <SeedanceAgentCopilotDrawer
                isOpen={isCopilotOpen}
                isAuthenticated={isAuthenticated}
                workspaceContext={{
                  currentPrompt: prompt,
                  model: selectedByteDanceKey,
                  aspectRatio: aspectRatio === 'Smart' ? '16:9' : aspectRatio,
                  resolution: effectiveResolution,
                  referenceCount: isMuapiMode ? (startImageUrl ? 1 : 0) : referenceImages.length,
                }}
                onClose={() => setIsCopilotOpen(false)}
                onApplyPrompt={(nextPrompt) => setPrompt(nextPrompt)}
                onRequireAuth={onRequireAuth}
                onOpenFullAgent={onOpenFullAgent}
              />

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                placeholder={
                  isMuapiMode
                    ? 'Describe camera motion, subject expression, atmosphere, lighting, and physical action for Seedance 2.5 Spicy...'
                    : 'Describe your cinematic screenplay, character actions, complex physics, camera movements, and lighting...'
                }
                className="w-full p-4 rounded-xl border border-white/[0.12] bg-black/60 text-white placeholder-white/35 text-xs sm:text-sm font-sans focus:outline-none focus:border-white transition-all resize-y leading-relaxed"
              />

              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap gap-1.5">
                  {CAMERA_DIRECTIVE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setPrompt((prev) =>
                          prev.trim()
                            ? `${prev.trim().replace(/[.,;]+$/, '')}, ${chip}.`
                            : chip
                        )
                      }
                      className="px-2.5 py-1 rounded-md border border-white/[0.1] bg-black/50 hover:bg-white/[0.09] hover:border-white/25 text-[11px] font-mono text-white/75 hover:text-white transition-all cursor-pointer whitespace-nowrap"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
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

            {/* 03. IMAGE / REFERENCE INPUTS */}
            {isMuapiMode ? (
              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-white" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                      03. Image-to-Video Keyframes
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-white/50 uppercase">
                    START IMAGE REQUIRED · LAST IMAGE OPTIONAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Start Image (image_url) */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-white/[0.1] bg-black/40">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-white font-semibold uppercase">Start Image (`image_url`) *</span>
                      {startImageUrl && (
                        <button
                          type="button"
                          onClick={() => setStartImageUrl('')}
                          className="text-white/50 hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={startImageUrl}
                      onChange={(e) => setStartImageUrl(e.target.value)}
                      placeholder="https://... public image URL"
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-black text-xs text-white placeholder-white/35 focus:outline-none focus:border-white"
                    />
                    <div
                      onClick={() => startFileInputRef.current?.click()}
                      className="rounded-lg border border-dashed border-white/[0.2] hover:border-white/50 p-3 text-center cursor-pointer transition-all"
                    >
                      <input
                        ref={startFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleStartImageUpload(e.target.files)}
                      />
                      <span className="text-[11px] text-white/75 flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {isUploadingImage ? 'Uploading start frame...' : 'Upload Start Frame'}
                      </span>
                    </div>
                    {startImageUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden border border-white/15 bg-black">
                        <img
                          src={startImageUrl}
                          alt="Start frame preview"
                          onClick={() => setPreviewImageModal(startImageUrl)}
                          className="w-full h-full object-cover cursor-pointer"
                        />
                      </div>
                    )}
                  </div>

                  {/* Optional Last Image (last_image) */}
                  <div className="space-y-2 p-3.5 rounded-xl border border-white/[0.1] bg-black/40">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-white/80 uppercase">End Image (`last_image` Optional)</span>
                      {lastImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLastImageUrl('')}
                          className="text-white/50 hover:text-white cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={lastImageUrl}
                      onChange={(e) => setLastImageUrl(e.target.value)}
                      placeholder="https://... optional end frame URL"
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-black text-xs text-white placeholder-white/35 focus:outline-none focus:border-white"
                    />
                    <div
                      onClick={() => lastFileInputRef.current?.click()}
                      className="rounded-lg border border-dashed border-white/[0.2] hover:border-white/50 p-3 text-center cursor-pointer transition-all"
                    >
                      <input
                        ref={lastFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => handleLastImageUpload(e.target.files)}
                      />
                      <span className="text-[11px] text-white/75 flex items-center justify-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        {isUploadingLastImage ? 'Uploading end frame...' : 'Upload End Frame'}
                      </span>
                    </div>
                    {lastImageUrl && (
                      <div className="aspect-video rounded-lg overflow-hidden border border-white/15 bg-black">
                        <img
                          src={lastImageUrl}
                          alt="Last frame preview"
                          onClick={() => setPreviewImageModal(lastImageUrl)}
                          className="w-full h-full object-cover cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ByteDance 30-Plate Reference Image Management (Preserved) */
              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-white" />
                    <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                      03. Reference Image Management
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {onOpenCanvasStudio && (
                      <button
                        type="button"
                        onClick={onOpenCanvasStudio}
                        className="px-2.5 py-1 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        VaiByte Canvas ➔
                      </button>
                    )}
                    {onOpenReferenceStudio && (
                      <button
                        type="button"
                        onClick={onOpenReferenceStudio}
                        className="px-2.5 py-1 rounded-md border border-white/15 bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono uppercase tracking-wider text-white/80 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Open 30-Slot Studio
                      </button>
                    )}
                    {referenceImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setReferenceImages([])}
                        className="text-[11px] font-mono text-white/50 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Clear All
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-white/65 tabular-nums whitespace-nowrap shrink-0">
                      {referenceImages.length} / {MAX_REF_IMAGES} Photos
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload(e.dataTransfer.files);
                  }}
                  className="rounded-xl border border-dashed border-white/[0.2] hover:border-white/50 bg-black/40 hover:bg-white/[0.03] p-5 text-center transition-all cursor-pointer space-y-2 group"
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
                      ? 'Uploading and hosting image plate on server...'
                      : 'Drop up to 30 reference images here or click to browse'}
                  </div>
                </div>

                {referenceImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2 pt-1 max-h-[260px] overflow-y-auto pr-1">
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
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReferenceImages((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-black/80 text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 04. PARAMETERS, FEATURES, PRICING & GENERATE */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    04. Generation Parameters
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-white/50 uppercase">
                  {activeProvider.displayName} SPEC
                </span>
              </div>

              {/* Resolutions & Durations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white/75">Resolution</span>
                    {draftMode && activeModel?.supportsDraftMode && (
                      <span className="text-white font-semibold uppercase">Locked 480p (Draft)</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['480p', '720p', '1080p', '4K'] as GenerationResolution[]).map((resOpt) => {
                      const supported = activeModel?.enabledResolutions.includes(resOpt);
                      const lockedByDraft = draftMode && activeModel?.supportsDraftMode && resOpt !== '480p';
                      const isSelected = effectiveResolution === resOpt;
                      return (
                        <button
                          key={resOpt}
                          type="button"
                          disabled={!supported || lockedByDraft}
                          onClick={() => setResolution(resOpt)}
                          className={`py-2 px-2 rounded-lg border text-[11px] font-mono transition-all ${
                            !supported || lockedByDraft
                              ? 'border-white/[0.05] bg-black/30 text-white/25 cursor-not-allowed line-through'
                              : isSelected
                              ? 'border-white bg-white text-black font-semibold cursor-pointer'
                              : 'border-white/[0.1] bg-white/[0.03] text-white/70 hover:text-white cursor-pointer'
                          }`}
                        >
                          {resOpt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-white/75">Duration</span>
                    <span className="text-white/50">{durationSeconds}s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(activeModel?.enabledDurations || [5, 10, 20, 30]).map((dur) => {
                      const isSelected = durationSeconds === dur;
                      return (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setDurationSeconds(dur)}
                          className={`py-2 px-2 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                            isSelected
                              ? 'border-white bg-white text-black font-semibold'
                              : 'border-white/[0.1] bg-white/[0.03] text-white/70 hover:text-white'
                          }`}
                        >
                          {dur}s
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* MUAPI Feature Controls vs ByteDance Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-white/[0.06]">
                {/* GENERATE AUDIO */}
                <button
                  type="button"
                  onClick={() => setGenerateAudio((prev) => !prev)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono transition-all cursor-pointer ${
                    generateAudio
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {generateAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>GENERATE AUDIO</span>
                  </span>
                  <span>{generateAudio ? 'ON' : 'OFF'}</span>
                </button>

                {/* CAMERA FIXED */}
                <button
                  type="button"
                  onClick={() => setCameraFixed((prev) => !prev)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono transition-all cursor-pointer ${
                    cameraFixed
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white'
                  }`}
                >
                  <span>CAMERA FIXED</span>
                  <span>{cameraFixed ? 'ON' : 'OFF'}</span>
                </button>

                {/* HIGH BITRATE (MUAPI) */}
                {activeModel?.supportsHighBitrate && (
                  <button
                    type="button"
                    onClick={() => setHighBitrate((prev) => !prev)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono transition-all cursor-pointer ${
                      highBitrate
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white'
                    }`}
                  >
                    <span>HIGH BITRATE</span>
                    <span>{highBitrate ? 'ON' : 'OFF'}</span>
                  </button>
                )}

                {/* DRAFT MODE (MUAPI) */}
                {activeModel?.supportsDraftMode && (
                  <button
                    type="button"
                    onClick={() =>
                      setDraftMode((prev) => {
                        const next = !prev;
                        if (next) setResolution('480p');
                        return next;
                      })
                    }
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-mono transition-all cursor-pointer ${
                      draftMode
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white'
                    }`}
                  >
                    <span>DRAFT (480p)</span>
                    <span>{draftMode ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>

              {/* Conditional Draft Request ID (Stage B manual/advanced finalization) */}
              {isMuapiMode && !draftMode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedDraftField((prev) => !prev)}
                      className="text-[11px] font-mono text-white/55 hover:text-white underline cursor-pointer"
                    >
                      {showAdvancedDraftField
                        ? 'Hide Draft Request ID Override'
                        : '+ Finalize Existing Draft Request ID'}
                    </button>
                    <span className="text-[10px] font-mono text-white/40">
                      Auto-populated when finalizing from Draft preview
                    </span>
                  </div>
                  {showAdvancedDraftField && (
                    <input
                      type="text"
                      value={draftRequestId}
                      onChange={(e) => setDraftRequestId(e.target.value)}
                      placeholder="Optional draft_request_id from Stage A preview..."
                      className="w-full px-3 py-2 rounded-lg border border-white/[0.12] bg-black text-xs font-mono text-white placeholder-white/35"
                    />
                  )}
                </div>
              )}

              {/* ByteDance Extra Controls (Preserved) */}
              {!isMuapiMode && (
                <div className="space-y-4 pt-2 border-t border-white/[0.06]">
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-mono text-white/75 block">Aspect Ratio</span>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                      {['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'Smart'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAspectRatio(r)}
                          className={`py-1.5 rounded-lg border text-[11px] font-mono cursor-pointer ${
                            aspectRatio === r
                              ? 'border-white bg-white text-black font-semibold'
                              : 'border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-white/75 block">Content Mode</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['standard', '18+'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setContentRating(m)}
                            className={`py-1.5 rounded-lg border text-[11px] font-mono cursor-pointer ${
                              contentRating === m
                                ? 'border-white bg-white text-black font-semibold'
                                : 'border-white/[0.08] bg-white/[0.03] text-white/60'
                            }`}
                          >
                            {m === '18+' ? '18+ Mature' : 'Standard'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-white/75 block">Physics Engine</span>
                      <button
                        type="button"
                        onClick={() => setPhysicsPriority((p) => !p)}
                        className={`w-full py-1.5 px-3 rounded-lg border text-[11px] font-mono flex items-center justify-between cursor-pointer ${
                          physicsPriority
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/60'
                        }`}
                      >
                        <span>Complex Physics</span>
                        <span>{physicsPriority ? 'ON' : 'OFF'}</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono text-white/75 block">Batch Quantity</span>
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => setQuantity(q)}
                            className={`py-1.5 rounded-lg border text-[11px] font-mono cursor-pointer ${
                              quantity === q
                                ? 'border-white bg-white text-black font-semibold'
                                : 'border-white/[0.08] bg-white/[0.03] text-white/60'
                            }`}
                          >
                            {q}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Locked Safety Checker Notice */}
              <div className="px-3 py-2 rounded-xl border border-white/[0.1] bg-black/50 flex items-center gap-2 text-[11px] font-mono text-white/65">
                <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                <span>
                  {activeModel?.safetyNotice ||
                    activeProvider.safetyNotice ||
                    'Safety checker is locked ON and enforced by provider policy.'}
                </span>
              </div>

              {/* Dynamic Cost Preview Directly Above Generate Button */}
              <div className="pt-2 space-y-3">
                <div className="p-4 rounded-xl border border-white/[0.15] bg-black/75 space-y-2 text-xs font-mono">
                  {isMuapiMode ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-white/75 uppercase">Estimated generation cost:</span>
                        <span className="text-base font-bold text-white tabular-nums">
                          ${activeUsdCost.toFixed(2)} USD
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-white/50">
                        <span>
                          {activeModel?.displayName} · {effectiveResolution} · {durationSeconds}s
                          {draftMode ? ' · DRAFT PREVIEW' : ''}
                        </span>
                        <span className="tabular-nums">
                          Provider: ${activeProviderUsd.toFixed(2)}
                          {activeMarkupUsd > 0 ? ` + Markup: $${activeMarkupUsd.toFixed(2)}` : ''}
                          {activeProvider.enforceWalletOnUsdProviders
                            ? ` (${activeUsdCredits} CR wallet reserve)`
                            : ''}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Dynamic Generation Cost:</span>
                      <div className="text-right">
                        <span className="font-semibold text-white tabular-nums">
                          {estimatedByteDanceCredits} Credits
                        </span>
                        <span className="text-white/40 block text-[10px]">
                          {dynamicCost
                            ? `Base ${dynamicCost.baseCreditCost} + Physics +${dynamicCost.qualitySurchargeCredits} + Ref +${dynamicCost.referenceSurchargeCredits}`
                            : 'ByteDance Official Schedule'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px]">
                    <span className="text-white/50">
                      Available Balance ({balance?.planName || balance?.tier || 'FREE'}):
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold tabular-nums">
                        {isAuthenticated ? `${availableCredits} CR` : 'Sign In'}
                      </span>
                      {hasInsufficientCredits && onOpenCredits && (
                        <button
                          type="button"
                          onClick={onOpenCredits}
                          className="underline text-white hover:text-white/80 cursor-pointer"
                        >
                          Add Credits
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    execState === 'preparing' ||
                    execState === 'submitting' ||
                    execState === 'processing'
                  }
                  onClick={handleGenerate}
                  className={`w-full py-4 rounded-xl font-semibold text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(255,255,255,0.25)] cursor-pointer active:scale-[0.99] ${
                    execState === 'processing' ||
                    execState === 'submitting' ||
                    execState === 'preparing'
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
                      <span>Submitting to {activeProvider.displayName}...</span>
                    </>
                  )}
                  {execState === 'processing' && (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      <span>
                        Generating Video ({elapsedSeconds}s · {progress}%)
                      </span>
                    </>
                  )}
                  {(execState === 'ready' || execState === 'completed' || execState === 'failed') && (
                    <>
                      <Film className="w-4 h-4 fill-black" />
                      <span>
                        {draftMode && isMuapiMode
                          ? `GENERATE DRAFT PREVIEW (480p · $${activeUsdCost.toFixed(2)} USD)`
                          : isMuapiMode
                          ? `GENERATE VIDEO (${effectiveResolution} · $${activeUsdCost.toFixed(2)} USD)`
                          : 'GENERATE VIDEO'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Monitor, Playback & 2-Stage Draft Finalizer */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[0_8px_32px_rgba(0,0,0,0.6)] sticky top-20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-semibold tracking-wide uppercase text-white font-mono">
                    Generation Monitor
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/75">
                  {execState === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{execState}</span>
                </div>
              </div>

              {/* Pipeline Stepper */}
              <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono">
                {[
                  {
                    key: 'prep',
                    label: '01 VALIDATE',
                    active:
                      execState === 'preparing' ||
                      execState === 'submitting' ||
                      execState === 'processing' ||
                      execState === 'completed',
                  },
                  {
                    key: 'sub',
                    label: `02 ${selectedProviderId.toUpperCase()}`,
                    active:
                      execState === 'submitting' ||
                      execState === 'processing' ||
                      execState === 'completed',
                  },
                  {
                    key: 'poll',
                    label: '03 REAL-TIME 3S',
                    active: execState === 'processing' || execState === 'completed',
                  },
                  {
                    key: 'done',
                    label: '04 STORED',
                    active: execState === 'completed',
                  },
                ].map((stage) => (
                  <div
                    key={stage.key}
                    className={`px-2 py-1.5 rounded border text-center transition-colors ${
                      stage.active
                        ? 'border-white/50 bg-white/[0.1] text-white font-semibold'
                        : 'border-white/[0.06] bg-black/40 text-white/35'
                    }`}
                  >
                    {stage.label}
                  </div>
                ))}
              </div>

              {/* Player Container */}
              <div className="w-full aspect-video rounded-xl border border-white/[0.15] bg-neutral-950 overflow-hidden relative flex items-center justify-center">
                {generatedVideoUrl ? (
                  <video
                    src={generatedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="w-full h-full object-contain bg-black"
                  />
                ) : execState === 'processing' || execState === 'submitting' ? (
                  <div className="p-6 text-center space-y-4 max-w-sm">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="absolute inset-0 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <Film className="w-6 h-6 text-white absolute inset-0 m-auto" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white tracking-tight">
                        Rendering via {activeProvider.displayName}
                      </div>
                      <p className="text-xs text-white/50 font-mono">
                        Job: {activeUnifiedJob?.job_id || 'INITIALIZING'}
                      </p>
                      {activeUnifiedJob?.request_id && (
                        <p className="text-[10px] text-white/40 font-mono truncate">
                          Request ID: {activeUnifiedJob.request_id}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                        <span>Elapsed: {elapsedSeconds}s (Runs safely in background)</span>
                        <span>{progress}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
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
                        MULTI-PROVIDER SEEDANCE STUDIO
                      </span>
                      <div className="text-xs font-semibold text-white">
                        ByteDance Official + MUAPI Seedance 2.5 Spicy
                      </div>
                      <p className="text-[11px] text-white/50 line-clamp-1">
                        480p Draft Previews · 4K 30s Cinema · Persistent Storage & My Generations Sync
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Completed Job Details & Stage B Finalize Draft Button */}
              {generatedVideoUrl && activeUnifiedJob ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3.5 rounded-xl border border-white/[0.1] bg-white/[0.025] space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-white/60">
                      <span>Provider / Model:</span>
                      <span className="text-white font-semibold uppercase">
                        {activeUnifiedJob.provider} · {activeUnifiedJob.model_name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span>Resolution / Duration:</span>
                      <span className="text-white">
                        {activeUnifiedJob.resolution} · {activeUnifiedJob.duration}s
                        {activeUnifiedJob.draft ? ' (DRAFT)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/60">
                      <span>Request ID:</span>
                      <span className="text-white truncate max-w-[200px]">
                        {activeUnifiedJob.request_id || activeUnifiedJob.job_id}
                      </span>
                    </div>
                    {activeUnifiedJob.firebase_storage_path && (
                      <div className="flex items-center justify-between text-white/60">
                        <span>Storage Path:</span>
                        <span className="text-white/80 truncate max-w-[220px]">
                          /{activeUnifiedJob.firebase_storage_path}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stage B: FINALIZE DRAFT (1080p) */}
                  {activeUnifiedJob.draft && activeUnifiedJob.provider === 'muapi' && (
                    <button
                      type="button"
                      disabled={isFinalizingDraft}
                      onClick={handleFinalizeCurrentDraft}
                      className="w-full py-3.5 px-4 rounded-xl bg-white text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/90 transition-all cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isFinalizingDraft
                          ? 'Submitting Final 1080p Render...'
                          : `FINALIZE DRAFT → 1080p${
                              finalizePreview
                                ? ` ($${finalizePreview.finalPriceUsd.toFixed(2)} USD)`
                                : ''
                            }`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={generatedVideoUrl}
                      download={`${activeUnifiedJob.provider}_${activeUnifiedJob.job_id}.mp4`}
                      className="py-2.5 px-3 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/90 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download MP4</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyPrompt}
                      className="py-2.5 px-3 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white text-xs font-medium uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>

                  {onOpenHistory && (
                    <button
                      type="button"
                      onClick={onOpenHistory}
                      className="w-full py-2 rounded-lg border border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.07] text-[11px] font-mono text-white/80 uppercase cursor-pointer"
                    >
                      View All in My Generations →
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs text-white/60 space-y-2 font-sans">
                  <div className="flex items-center gap-2 text-white font-medium font-mono text-[11px]">
                    <Info className="w-3.5 h-3.5 text-white/70" />
                    <span>Unified Multi-Provider Pipeline</span>
                  </div>
                  <ul className="space-y-1 text-[11px] list-disc list-inside text-white/50">
                    <li>ByteDance Official: 15s–30s cinema & up to 30 R2V plates.</li>
                    <li>MUAPI Seedance 2.5 Spicy: 480p / 720p / 1080p / 4K · 5s–30s.</li>
                    <li>2-Stage Draft Workflow: 480p preview → Finalize 1080p render.</li>
                    <li>Background server polling survives browser close & syncs to My Generations.</li>
                  </ul>
                </div>
              )}

              {/* Live Backend Process Calls Inspector */}
              {(backendTraces.length > 0 || execState === 'submitting' || execState === 'processing') && (
                <div className="p-3.5 rounded-xl border border-white/[0.14] bg-black/75 space-y-2.5 font-mono">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase text-white">
                      <Activity className="w-3.5 h-3.5 text-white" />
                      <span>Backend Process Calls ({backendTraces.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase">
                      {sseConnected && (
                        <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold">
                          SSE LIVE
                        </span>
                      )}
                      {activeUnifiedJob?.webhook_enabled && (
                        <span className="px-1.5 py-0.5 rounded border border-white/25 text-white/80">
                          WEBHOOK
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded border border-white/15 text-white/60">
                        3S POLL
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {backendTraces.map((step, idx) => {
                      const isExpanded = Boolean(expandedTraceIds[step.id]);
                      const hasPayloads = Boolean(step.requestPreview || step.responsePreview);
                      return (
                        <div
                          key={step.id || idx}
                          className="p-2.5 rounded-lg border border-white/[0.08] bg-white/[0.025] space-y-1 text-[10px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  step.stage === 'ERROR'
                                    ? 'bg-white/20 text-white border border-white/40'
                                    : 'bg-white text-black'
                                }`}
                              >
                                {idx + 1}. {step.stage}
                              </span>
                              <span className="text-white/75 font-semibold">{step.method}</span>
                              {typeof step.statusCode === 'number' && (
                                <span className="px-1.5 py-0.5 rounded border border-white/20 text-white">
                                  HTTP {step.statusCode}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-white/45 shrink-0 tabular-nums">
                              {typeof step.latencyMs === 'number' && <span>{step.latencyMs}ms</span>}
                              <span>{new Date(step.timestamp).toLocaleTimeString()}</span>
                              {hasPayloads && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTraceIds((prev) => ({
                                      ...prev,
                                      [step.id]: !prev[step.id],
                                    }))
                                  }
                                  className="p-0.5 text-white/70 hover:text-white cursor-pointer"
                                  title="Toggle request/response JSON"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>

                          {step.endpoint && (
                            <div className="text-white/50 truncate" title={step.endpoint}>
                              {step.endpoint}
                            </div>
                          )}
                          <div className="text-white/90 font-sans text-[11px]">{step.summary}</div>

                          {isExpanded && hasPayloads && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/[0.08] space-y-1.5 text-[10px] text-white/70">
                              {step.requestPreview && (
                                <div>
                                  <div className="text-white/40 uppercase">Sanitized Request</div>
                                  <pre className="p-2 rounded bg-black border border-white/10 overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(step.requestPreview, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {step.responsePreview && (
                                <div>
                                  <div className="text-white/40 uppercase">Response Payload</div>
                                  <pre className="p-2 rounded bg-black border border-white/10 overflow-x-auto whitespace-pre-wrap break-all">
                                    {JSON.stringify(step.responsePreview, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
