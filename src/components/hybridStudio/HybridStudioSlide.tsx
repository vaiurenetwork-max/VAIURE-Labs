/**
 * VAIURE — HYBRID STUDIO (Slide 08)
 * Full AI Film Production & Creative Direction Workspace powered by Seedance 2.5
 * Integrates:
 * - Project Control Panel & Snapshots
 * - Storyboard & Sequence Builder (Scenes -> Multi-Shot hierarchy)
 * - Functional Nonlinear Cinematic Timeline Editor
 * - AI Production Control Panel (ByteDance Official + MUAPI Seedance 2.5 Spicy)
 * - Categorized Reference & Asset Library + Character / Scene Continuity
 * - Export & Delivery Workflow + Switchable Director / Production Workspace Modes
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Film,
  Layers,
  Loader2,
  Play,
  Terminal,
  X,
} from 'lucide-react';
import { UserProfile } from '../../types/social';
import {
  HybridAspectRatio,
  HybridAsset,
  HybridAssetCategory,
  HybridCharacterProfile,
  HybridEnvironmentProfile,
  HybridFrameRate,
  HybridGenerationRecord,
  HybridProductionProject,
  HybridScene,
  HybridShot,
  HybridTimelineClip,
  HybridTimelineTrack,
  HybridVideoTransformVersion,
  HybridWorkspaceMode,
} from '../../types/hybridStudio';
import {
  GenerationResolution,
  ProviderConfigPublic,
  UnifiedGenerationJob,
} from '../../types/multiProvider';
import {
  compileShotGenerationPrompt,
  createBlankScene,
  createBlankShot,
  createNewHybridProject,
  createProjectSnapshot,
  DEFAULT_ASSET_FOLDERS,
  deleteHybridProject,
  duplicateHybridProject,
  generateScenesFromTreatment,
  listHybridProjects,
  saveHybridProject,
  uploadHybridStudioAsset,
} from '../../services/hybridStudioService';
import {
  mirrorCompletedVideoToFirebaseStorage,
  multiProviderGenerationService,
} from '../../services/multiProviderGenerationService';
import { seedanceLabService } from '../../services/seedanceLabService';
import { getAuthHeaders } from '../../services/authTokenHelper';
import { HybridProjectControlBar, HybridStudioNavAction } from './HybridProjectControlBar';
import { HybridAssetLibraryPanel } from './HybridAssetLibraryPanel';
import { HybridStoryboardBuilder } from './HybridStoryboardBuilder';
import { HybridTimelineEditor } from './HybridTimelineEditor';
import { HybridProductionControlPanel } from './HybridProductionControlPanel';
import { HybridExportDialog } from './HybridExportDialog';
import { HybridVideoTransformStudio } from './HybridVideoTransformStudio';

interface HybridStudioSlideProps {
  onOpenMenu?: () => void;
  onBackToHero?: () => void;
  onOpenAuthModal?: () => void;
  currentUser: UserProfile;
}

const FALLBACK_PROVIDERS: ProviderConfigPublic[] = [
  {
    providerId: 'bytedance',
    displayName: 'ByteDance Official',
    enabled: true,
    configured: true,
    baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    autoFallbackEnabled: false,
    pollIntervalMs: 3000,
    maxPollTimeoutMs: 600000,
    creditsPerUsd: 10,
    enforceWalletOnUsdProviders: true,
    safetyCheckerLockedOn: false,
    safetyNotice: 'Official BytePlus ModelArk Seedance 2.5 pipeline',
    updatedAt: new Date().toISOString(),
    models: [
      {
        providerId: 'bytedance',
        modelId: 'seedance_25_15s',
        displayName: 'Seedance 2.5 (15s)',
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
        resolutions: ['720p'],
        durations: [5, 10, 15],
        enabledResolutions: ['720p'],
        enabledDurations: [5, 10, 15],
        pricingCurrency: 'CREDITS',
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: false,
        safetyNotice: 'ByteDance Seedance 2.5',
      },
      {
        providerId: 'bytedance',
        modelId: 'seedance_25_30s',
        displayName: 'Seedance 2.5 Extended (30s)',
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
        resolutions: ['720p'],
        durations: [20, 30],
        enabledResolutions: ['720p'],
        enabledDurations: [20, 30],
        pricingCurrency: 'CREDITS',
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: false,
        safetyNotice: 'ByteDance Seedance 2.5 30s',
      },
    ],
  },
  {
    providerId: 'muapi',
    displayName: 'MUAPI (Seedance 2.5 Spicy)',
    clientName: 'vaiurenetwoek',
    enabled: true,
    configured: true,
    baseUrl: 'https://api.muapi.ai',
    autoFallbackEnabled: false,
    pollIntervalMs: 3000,
    maxPollTimeoutMs: 600000,
    creditsPerUsd: 10,
    enforceWalletOnUsdProviders: true,
    safetyCheckerLockedOn: false,
    safetyNotice: 'MUAPI Seedance 2.5 Spicy 480p–4K',
    updatedAt: new Date().toISOString(),
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
          '480p': { 5: 0.28, 10: 0.56, 20: 1.12, 30: 1.68 },
          '720p': { 5: 0.52, 10: 1.04, 20: 2.08, 30: 3.12 },
          '1080p': { 5: 1.04, 10: 2.08, 20: 4.16, 30: 6.24 },
          '4K': { 5: 2.08, 10: 4.16, 20: 8.32, 30: 12.48 },
        },
        appMarkupPercent: 0,
        appMarkupFlatUsd: 0,
        safetyCheckerLockedOn: false,
        safetyNotice: 'Requires start frame image',
      },
    ],
  },
];

const WORKSPACE_MODE_KEY = 'vaiure_hybrid_studio_mode';

function renumberScenesAndShots(scenes: HybridScene[]): HybridScene[] {
  return scenes.map((scene, sIdx) => ({
    ...scene,
    sceneNumber: sIdx + 1,
    shots: scene.shots.map((shot, shIdx) => ({
      ...shot,
      sceneId: scene.id,
      shotNumber: shIdx + 1,
    })),
  }));
}

export const HybridStudioSlide: React.FC<HybridStudioSlideProps> = ({
  onOpenMenu,
  onOpenAuthModal,
  currentUser,
}) => {
  const ownerId = currentUser?.id || 'guest';

  const [projectsList, setProjectsList] = useState<HybridProductionProject[]>(() => [
    createNewHybridProject(ownerId),
  ]);
  const [project, setProject] = useState<HybridProductionProject>(() => projectsList[0]);

  const [workspaceMode, setWorkspaceMode] = useState<HybridWorkspaceMode>(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_MODE_KEY);
      return saved === 'director' || saved === 'production' || saved === 'video-transform'
        ? saved
        : 'production';
    } catch {
      return 'production';
    }
  });

  const [isLeftOpen, setIsLeftOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isRightOpen, setIsRightOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true
  );
  const [focusMode, setFocusMode] = useState(false);
  const [forcedLeftTab, setForcedLeftTab] = useState<'assets' | 'continuity' | undefined>(
    undefined
  );
  const [forcedAssetCategory, setForcedAssetCategory] = useState<
    'ALL' | HybridAssetCategory | undefined
  >(undefined);
  const [transformSourceAssetId, setTransformSourceAssetId] = useState<string | undefined>(
    undefined
  );

  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    () => project.scenes[0]?.id || ''
  );
  const [selectedShotId, setSelectedShotId] = useState<string>(
    () => project.scenes[0]?.shots[0]?.id || ''
  );

  const [providers, setProviders] = useState<ProviderConfigPublic[]>(FALLBACK_PROVIDERS);
  const [isSaving, setIsSaving] = useState(false);
  const [persistedToCloud, setPersistedToCloud] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPlanningScenes, setIsPlanningScenes] = useState(false);
  const [isOptimizingPrompt, setIsOptimizingPrompt] = useState(false);
  const [isSynthesizingKeyframe, setIsSynthesizingKeyframe] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showJobsLedger, setShowJobsLedger] = useState(false);
  const [showDirectorMonitor, setShowDirectorMonitor] = useState(true);
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(
    null
  );

  const projectRef = useRef(project);
  projectRef.current = project;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamCleanupsRef = useRef<Map<string, () => void>>(new Map());

  const showNotice = useCallback((text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotice({ text, type });
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Cleanup active streams/timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      streamCleanupsRef.current.forEach((cleanup) => cleanup());
      streamCleanupsRef.current.clear();
    };
  }, []);

  // Load live provider configs (ByteDance Official & MUAPI Seedance 2.5 Spicy)
  useEffect(() => {
    let active = true;
    multiProviderGenerationService
      .getProviders()
      .then((list) => {
        if (active && Array.isArray(list) && list.length > 0) {
          setProviders(list);
        }
      })
      .catch(() => {
        // Retain deterministic fallback capabilities if backend unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  // Load projects from Firestore + local cache for user
  useEffect(() => {
    let active = true;
    listHybridProjects(ownerId).then((loaded) => {
      if (!active) return;
      if (loaded.length > 0) {
        setProjectsList(loaded);
        setProject(loaded[0]);
        setSelectedSceneId(loaded[0].scenes[0]?.id || '');
        setSelectedShotId(loaded[0].scenes[0]?.shots[0]?.id || '');
        setPersistedToCloud(ownerId !== 'guest');
      } else {
        const fresh = createNewHybridProject(ownerId);
        setProjectsList([fresh]);
        setProject(fresh);
        setSelectedSceneId(fresh.scenes[0]?.id || '');
        setSelectedShotId(fresh.scenes[0]?.shots[0]?.id || '');
      }
    });
    return () => {
      active = false;
    };
  }, [ownerId]);

  const scheduleAutoSave = useCallback((nextProject: HybridProductionProject) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveHybridProject(nextProject);
        setPersistedToCloud(res.persistedToCloud);
      } catch {
        // silent fallback
      }
    }, 1100);
  }, []);

  const commitProjectUpdate = useCallback(
    (updater: (prev: HybridProductionProject) => HybridProductionProject, immediate = false) => {
      setProject((prev) => {
        const next: HybridProductionProject = {
          ...updater(prev),
          ownerId: ownerId !== 'guest' ? ownerId : prev.ownerId,
          updatedAt: new Date().toISOString(),
        };
        setProjectsList((list) => {
          const exists = list.some((item) => item.id === next.id);
          return exists
            ? list.map((item) => (item.id === next.id ? next : item))
            : [next, ...list];
        });
        if (immediate) {
          void saveHybridProject(next).then((res) => setPersistedToCloud(res.persistedToCloud));
        } else {
          scheduleAutoSave(next);
        }
        return next;
      });
    },
    [ownerId, scheduleAutoSave]
  );

  // Active scene & shot resolution
  const activeScene = useMemo(
    () => project.scenes.find((s) => s.id === selectedSceneId) || project.scenes[0],
    [project.scenes, selectedSceneId]
  );

  const activeShot = useMemo(
    () =>
      activeScene?.shots.find((sh) => sh.id === selectedShotId) || activeScene?.shots[0],
    [activeScene, selectedShotId]
  );

  const activeJobsCount = useMemo(
    () =>
      project.scenes.reduce(
        (acc, s) =>
          acc +
          s.shots.filter((sh) => sh.status === 'PROCESSING' || sh.status === 'QUEUED').length,
        0
      ),
    [project.scenes]
  );

  // Workspace mode switch (Director vs Production vs Video Transform)
  const handleChangeMode = (mode: HybridWorkspaceMode) => {
    setWorkspaceMode(mode);
    try {
      localStorage.setItem(WORKSPACE_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const handleToggleFocusMode = () => {
    setFocusMode((prev) => {
      const next = !prev;
      if (next) {
        setIsLeftOpen(false);
        setIsRightOpen(false);
      } else {
        setIsLeftOpen(true);
        setIsRightOpen(true);
      }
      return next;
    });
  };

  const handleNavigateTool = (action: HybridStudioNavAction) => {
    setFocusMode(false);
    switch (action.target) {
      case 'storyboard':
        handleChangeMode('director');
        setIsLeftOpen(true);
        setIsRightOpen(true);
        break;
      case 'timeline':
        handleChangeMode('production');
        setIsLeftOpen(true);
        setIsRightOpen(true);
        break;
      case 'video-transform':
        handleChangeMode('video-transform');
        break;
      case 'video-reference':
        if (activeScene && activeShot) {
          handleUpdateShot(activeScene.id, activeShot.id, { generationMode: 'reference-based' });
        }
        handleChangeMode('director');
        setIsRightOpen(true);
        break;
      case 'text-to-video':
        if (activeScene && activeShot) {
          handleUpdateShot(activeScene.id, activeShot.id, { generationMode: 'text-to-video' });
        }
        handleChangeMode('director');
        setIsRightOpen(true);
        break;
      case 'image-to-video':
        if (activeScene && activeShot) {
          handleUpdateShot(activeScene.id, activeShot.id, { generationMode: 'image-to-video' });
        }
        handleChangeMode('director');
        setIsRightOpen(true);
        break;
      case 'shot-director':
      case 'advanced-model':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setIsRightOpen(true);
        break;
      case 'characters':
      case 'environments':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setForcedLeftTab('continuity');
        setIsLeftOpen(true);
        break;
      case 'media-videos':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setForcedLeftTab('assets');
        setForcedAssetCategory('Reference Video');
        setIsLeftOpen(true);
        break;
      case 'media-images':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setForcedLeftTab('assets');
        setForcedAssetCategory('Reference Image');
        setIsLeftOpen(true);
        break;
      case 'media-audio':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setForcedLeftTab('assets');
        setForcedAssetCategory('Audio File');
        setIsLeftOpen(true);
        break;
      case 'media-results':
        if (workspaceMode === 'video-transform') handleChangeMode('director');
        setForcedLeftTab('assets');
        setForcedAssetCategory('Generated Result');
        setIsLeftOpen(true);
        break;
      default:
        break;
    }
  };

  // =========================================================================
  // A. PROJECT CONTROL HANDLERS
  // =========================================================================
  const handleCreateProject = (opts: {
    name: string;
    description: string;
    resolution: GenerationResolution;
    frameRate: HybridFrameRate;
    aspectRatio: HybridAspectRatio;
  }) => {
    const fresh = createNewHybridProject(ownerId, opts);
    setProjectsList((prev) => [fresh, ...prev]);
    setProject(fresh);
    setSelectedSceneId(fresh.scenes[0]?.id || '');
    setSelectedShotId(fresh.scenes[0]?.shots[0]?.id || '');
    void saveHybridProject(fresh).then((r) => setPersistedToCloud(r.persistedToCloud));
    showNotice(`Created production "${fresh.name}"`, 'success');
  };

  const handleOpenProject = (projectId: string) => {
    const found = projectsList.find((p) => p.id === projectId);
    if (!found) return;
    setProject(found);
    setSelectedSceneId(found.scenes[0]?.id || '');
    setSelectedShotId(found.scenes[0]?.shots[0]?.id || '');
    showNotice(`Loaded production "${found.name}"`, 'info');
  };

  const handleSaveProject = async (snapshotLabel?: string) => {
    setIsSaving(true);
    try {
      let next = { ...projectRef.current };
      if (snapshotLabel || snapshotLabel === '') {
        const ver = createProjectSnapshot(next, snapshotLabel || undefined);
        next = {
          ...next,
          versions: [ver, ...next.versions].slice(0, 20),
        };
        setProject(next);
      }
      const res = await saveHybridProject(next);
      setPersistedToCloud(res.persistedToCloud);
      setProjectsList((list) => list.map((item) => (item.id === next.id ? next : item)));
      showNotice(
        snapshotLabel
          ? `Saved project snapshot (${res.persistedToCloud ? 'Cloud + Local' : 'Local'})`
          : `Saved project (${res.persistedToCloud ? 'Cloud + Local' : 'Local'})`,
        'success'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicateProject = () => {
    const copy = duplicateHybridProject(projectRef.current, ownerId);
    setProjectsList((prev) => [copy, ...prev]);
    setProject(copy);
    setSelectedSceneId(copy.scenes[0]?.id || '');
    setSelectedShotId(copy.scenes[0]?.shots[0]?.id || '');
    void saveHybridProject(copy);
    showNotice(`Duplicated project as "${copy.name}"`, 'success');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (projectsList.length <= 1) return;
    await deleteHybridProject(projectId, ownerId);
    const remaining = projectsList.filter((p) => p.id !== projectId);
    setProjectsList(remaining);
    if (project.id === projectId && remaining[0]) {
      setProject(remaining[0]);
      setSelectedSceneId(remaining[0].scenes[0]?.id || '');
      setSelectedShotId(remaining[0].scenes[0]?.shots[0]?.id || '');
    }
    showNotice('Production deleted', 'info');
  };

  const handleUpdateProjectMeta = (updates: Partial<HybridProductionProject>) => {
    commitProjectUpdate((prev) => ({ ...prev, ...updates }));
  };

  const handleRestoreVersion = (versionId: string) => {
    const target = project.versions.find((v) => v.id === versionId);
    if (!target) return;
    commitProjectUpdate(
      (prev) => ({
        ...prev,
        ...JSON.parse(JSON.stringify(target.snapshot)),
      }),
      true
    );
    showNotice(`Restored snapshot "${target.label}"`, 'success');
  };

  // =========================================================================
  // B. STORYBOARD & SEQUENCE HANDLERS
  // =========================================================================
  const handleSelectShot = (sceneId: string, shotId: string) => {
    setSelectedSceneId(sceneId);
    setSelectedShotId(shotId);
  };

  const handleAddScene = () => {
    const nextNum = project.scenes.length + 1;
    const defaultRes: GenerationResolution =
      project.resolution === '4K' ? '1080p' : project.resolution;
    const newScene = createBlankScene(nextNum, project.aspectRatio, defaultRes);
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots([...prev.scenes, newScene]),
    }));
    setSelectedSceneId(newScene.id);
    setSelectedShotId(newScene.shots[0].id);
  };

  const handleGenerateScenesFromConcept = async (concept: string) => {
    setIsPlanningScenes(true);
    try {
      const generated = await generateScenesFromTreatment({
        concept,
        aspectRatio: project.aspectRatio,
        resolution: project.resolution,
        startingSceneNumber: project.scenes.length + 1,
      });
      commitProjectUpdate((prev) => ({
        ...prev,
        scenes: renumberScenesAndShots([...prev.scenes, ...generated]),
      }));
      if (generated[0]) {
        setSelectedSceneId(generated[0].id);
        setSelectedShotId(generated[0].shots[0]?.id || '');
      }
      showNotice(`Added ${generated.length} breakdown scene(s) from treatment`, 'success');
    } catch (err: any) {
      showNotice(err?.message || 'Could not draft scenes from concept', 'error');
    } finally {
      setIsPlanningScenes(false);
    }
  };

  const handleDuplicateScene = (sceneId: string) => {
    const src = project.scenes.find((s) => s.id === sceneId);
    if (!src) return;
    const clonedSceneId = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const cloned: HybridScene = {
      ...JSON.parse(JSON.stringify(src)),
      id: clonedSceneId,
      name: `${src.name} (Copy)`,
      shots: src.shots.map((sh) => ({
        ...JSON.parse(JSON.stringify(sh)),
        id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sceneId: clonedSceneId,
      })),
    };
    commitProjectUpdate((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === sceneId);
      const next = [...prev.scenes];
      next.splice(idx + 1, 0, cloned);
      return { ...prev, scenes: renumberScenesAndShots(next) };
    });
    setSelectedSceneId(cloned.id);
    setSelectedShotId(cloned.shots[0]?.id || '');
  };

  const handleDeleteScene = (sceneId: string) => {
    if (project.scenes.length <= 1) return;
    commitProjectUpdate((prev) => {
      const nextScenes = renumberScenesAndShots(prev.scenes.filter((s) => s.id !== sceneId));
      return { ...prev, scenes: nextScenes };
    });
    if (selectedSceneId === sceneId) {
      const fallback = project.scenes.find((s) => s.id !== sceneId);
      if (fallback) {
        setSelectedSceneId(fallback.id);
        setSelectedShotId(fallback.shots[0]?.id || '');
      }
    }
  };

  const handleMoveScene = (sceneId: string, dir: 'UP' | 'DOWN') => {
    commitProjectUpdate((prev) => {
      const idx = prev.scenes.findIndex((s) => s.id === sceneId);
      if (idx === -1) return prev;
      const targetIdx = dir === 'UP' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.scenes.length) return prev;
      const copy = [...prev.scenes];
      const [item] = copy.splice(idx, 1);
      copy.splice(targetIdx, 0, item);
      return { ...prev, scenes: renumberScenesAndShots(copy) };
    });
  };

  const handleUpdateScene = (sceneId: string, updates: Partial<HybridScene>) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)),
    }));
  };

  const handleSplitSceneIntoShots = (sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const baseShot = scene.shots[scene.shots.length - 1] || createBlankShot(sceneId, 1);
    const beatB = createBlankShot(sceneId, scene.shots.length + 1, {
      title: `Shot ${String(scene.shots.length + 1).padStart(2, '0')} — Medium Coverage`,
      description: scene.description,
      mainPrompt: baseShot.mainPrompt || scene.generationPrompt,
      shotSize: 'Medium',
      cameraMovement: 'Tracking',
      characterIds: [...baseShot.characterIds],
      environmentId: baseShot.environmentId || scene.environmentId,
      providerId: baseShot.providerId,
      modelId: baseShot.modelId,
      resolution: baseShot.resolution,
      duration: baseShot.duration,
      aspectRatio: baseShot.aspectRatio,
    });
    const beatC = createBlankShot(sceneId, scene.shots.length + 2, {
      title: `Shot ${String(scene.shots.length + 2).padStart(2, '0')} — Close-Up Reaction`,
      description: scene.description,
      mainPrompt: baseShot.mainPrompt || scene.generationPrompt,
      shotSize: 'Close-Up',
      cameraMovement: 'Static',
      characterIds: [...baseShot.characterIds],
      environmentId: baseShot.environmentId || scene.environmentId,
      providerId: baseShot.providerId,
      modelId: baseShot.modelId,
      resolution: baseShot.resolution,
      duration: baseShot.duration,
      aspectRatio: baseShot.aspectRatio,
    });

    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) =>
          s.id === sceneId ? { ...s, shots: [...s.shots, beatB, beatC] } : s
        )
      ),
    }));
    setSelectedSceneId(sceneId);
    setSelectedShotId(beatB.id);
    showNotice('Split scene into multi-angle coverage shots', 'success');
  };

  const handleAddShot = (sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const prevShot = scene.shots[scene.shots.length - 1];
    const newShot = createBlankShot(sceneId, scene.shots.length + 1, {
      aspectRatio: prevShot?.aspectRatio || project.aspectRatio,
      resolution: prevShot?.resolution || (project.resolution === '4K' ? '1080p' : project.resolution),
      providerId: prevShot?.providerId || 'bytedance',
      modelId: prevShot?.modelId || 'seedance_25_15s',
      characterIds: prevShot ? [...prevShot.characterIds] : [],
      environmentId: prevShot?.environmentId || scene.environmentId,
    });
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) =>
          s.id === sceneId ? { ...s, shots: [...s.shots, newShot] } : s
        )
      ),
    }));
    setSelectedSceneId(sceneId);
    setSelectedShotId(newShot.id);
  };

  const handleDuplicateShot = (sceneId: string, shotId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    const src = scene?.shots.find((sh) => sh.id === shotId);
    if (!scene || !src) return;
    const copy: HybridShot = {
      ...JSON.parse(JSON.stringify(src)),
      id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${src.title} (Take)`,
    };
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) => {
          if (s.id !== sceneId) return s;
          const idx = s.shots.findIndex((sh) => sh.id === shotId);
          const nextShots = [...s.shots];
          nextShots.splice(idx + 1, 0, copy);
          return { ...s, shots: nextShots };
        })
      ),
    }));
    setSelectedSceneId(sceneId);
    setSelectedShotId(copy.id);
  };

  const handleDeleteShot = (sceneId: string, shotId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene || scene.shots.length <= 1) return;
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) =>
          s.id === sceneId
            ? { ...s, shots: s.shots.filter((sh) => sh.id !== shotId) }
            : s
        )
      ),
    }));
    if (selectedShotId === shotId) {
      const next = scene.shots.find((sh) => sh.id !== shotId);
      if (next) setSelectedShotId(next.id);
    }
  };

  const handleUpdateShot = useCallback(
    (sceneId: string, shotId: string, updates: Partial<HybridShot>) => {
      commitProjectUpdate((prev) => ({
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                shots: s.shots.map((sh) => (sh.id === shotId ? { ...sh, ...updates } : sh)),
              }
            : s
        ),
      }));
    },
    [commitProjectUpdate]
  );

  const handleSelectShotVersion = (sceneId: string, shotId: string, versionId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    const shot = scene?.shots.find((sh) => sh.id === shotId);
    const ver = shot?.versions.find((v) => v.id === versionId);
    if (!ver) return;
    handleUpdateShot(sceneId, shotId, {
      activeVersionId: ver.id,
      outputUrl: ver.outputUrl,
      thumbnailUrl: ver.thumbnailUrl || shot?.thumbnailUrl,
    });
    showNotice(`Switched Shot ${shot?.shotNumber} to Take v${ver.versionNumber}`, 'info');
  };

  const handleExtendFromShot = async (scene: HybridScene, shot: HybridShot) => {
    let nextPrompt = `${shot.mainPrompt || scene.generationPrompt} — Continuous visual follow-through from previous shot.`.trim();
    if (ownerId !== 'guest') {
      try {
        const cont = await seedanceLabService.continueNextScene({
          previousPrompt: shot.mainPrompt || scene.generationPrompt,
          lastFrameUrl: shot.thumbnailUrl,
          cameraMovement: shot.cameraMovement,
          durationSeconds: shot.duration,
          physicsPriority: shot.physicsPriority,
        });
        if (cont.nextScenePrompt) nextPrompt = cont.nextScenePrompt;
      } catch {
        // retain seamless continuation fallback prompt
      }
    }

    const matchingVideoAsset = project.assets.find(
      (a) => a.mediaType === 'VIDEO' && a.url === shot.outputUrl
    );

    const nextShot = createBlankShot(scene.id, scene.shots.length + 1, {
      title: `Shot ${String(scene.shots.length + 1).padStart(2, '0')} — Extended Beat`,
      mainPrompt: nextPrompt,
      shotSize: shot.shotSize,
      cameraMovement: shot.cameraMovement,
      characterIds: [...shot.characterIds],
      environmentId: shot.environmentId,
      generationMode: matchingVideoAsset ? 'video-to-video' : shot.generationMode,
      referenceVideoAssetId: matchingVideoAsset?.id,
      referenceImageAssetId: shot.referenceImageAssetId,
      providerId: matchingVideoAsset ? 'bytedance' : shot.providerId,
      modelId: matchingVideoAsset ? 'seedance_25_15s' : shot.modelId,
      aspectRatio: shot.aspectRatio,
      resolution: matchingVideoAsset ? '720p' : shot.resolution,
      duration: shot.duration,
    });

    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) =>
          s.id === scene.id ? { ...s, shots: [...s.shots, nextShot] } : s
        )
      ),
    }));
    setSelectedSceneId(scene.id);
    setSelectedShotId(nextShot.id);
    showNotice('Created continuous extension shot linked to preceding beat', 'success');
  };

  // =========================================================================
  // C. TIMELINE ASSEMBLY & SYNC
  // =========================================================================
  const appendClipsToTimeline = useCallback(
    (entries: Array<{ scene: HybridScene; shot: HybridShot }>) => {
      if (entries.length === 0) return;
      commitProjectUpdate((prev) => {
        const currentV1End = prev.timelineClips
          .filter((c) => c.trackId === 'track-v1')
          .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

        let cursor = currentV1End;
        const added: HybridTimelineClip[] = entries.map(({ scene, shot }) => {
          const mediaUrl = shot.outputUrl || '';
          const clip: HybridTimelineClip = {
            id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            trackId: 'track-v1',
            trackType: 'VIDEO',
            sceneId: scene.id,
            shotId: shot.id,
            title: `S${scene.sceneNumber}.${shot.shotNumber} ${shot.title}`,
            mediaType: mediaUrl ? 'VIDEO' : 'IMAGE',
            mediaUrl:
              mediaUrl ||
              shot.thumbnailUrl ||
              prev.assets.find((a) => a.id === shot.referenceImageAssetId)?.url ||
              '',
            thumbnailUrl:
              shot.thumbnailUrl ||
              prev.assets.find((a) => a.id === shot.referenceImageAssetId)?.url,
            startTime: Math.round(cursor * 10) / 10,
            duration: shot.duration || 5,
            inPoint: 0,
            outPoint: shot.duration || 5,
            transitionIn: cursor > 0 ? 'DISSOLVE' : 'CUT',
            transitionDuration: 0.4,
            volume: 1,
          };
          cursor += clip.duration;
          return clip;
        });

        return {
          ...prev,
          timelineClips: [...prev.timelineClips, ...added.filter((c) => Boolean(c.mediaUrl))],
        };
      });
    },
    [commitProjectUpdate]
  );

  const handleCombineSceneToSequence = (sceneId: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    const valid = scene.shots
      .filter(
        (sh) =>
          Boolean(sh.outputUrl) ||
          Boolean(sh.thumbnailUrl) ||
          Boolean(sh.referenceImageAssetId)
      )
      .map((shot) => ({ scene, shot }));
    if (valid.length === 0) {
      showNotice('Generate or attach a frame to at least one shot in this scene first.', 'error');
      return;
    }
    appendClipsToTimeline(valid);
    handleChangeMode('production');
    showNotice(`Added ${valid.length} shot(s) from Scene ${scene.sceneNumber} to Timeline`, 'success');
  };

  const handleCombineSelectedShots = (shotIds: string[]) => {
    const entries: Array<{ scene: HybridScene; shot: HybridShot }> = [];
    project.scenes.forEach((scene) => {
      scene.shots.forEach((shot) => {
        if (
          shotIds.includes(shot.id) &&
          (shot.outputUrl || shot.thumbnailUrl || shot.referenceImageAssetId)
        ) {
          entries.push({ scene, shot });
        }
      });
    });
    if (entries.length === 0) {
      showNotice('Selected shots need rendered videos or reference frames before combining.', 'error');
      return;
    }
    appendClipsToTimeline(entries);
    handleChangeMode('production');
    showNotice(`Combined ${entries.length} shot(s) into sequence`, 'success');
  };

  const handleAssembleAllRenderedShots = () => {
    const rendered = project.scenes.flatMap((scene) =>
      scene.shots
        .filter((shot) => Boolean(shot.outputUrl))
        .map((shot) => ({ scene, shot }))
    );
    if (rendered.length === 0) {
      showNotice('No rendered video shots found yet. Generate shots first.', 'info');
      return;
    }
    commitProjectUpdate((prev) => {
      let cursor = 0;
      const nonV1 = prev.timelineClips.filter((c) => c.trackId !== 'track-v1');
      const v1Clips: HybridTimelineClip[] = rendered.map(({ scene, shot }, i) => {
        const clip: HybridTimelineClip = {
          id: `clip-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          trackId: 'track-v1',
          trackType: 'VIDEO',
          sceneId: scene.id,
          shotId: shot.id,
          title: `S${scene.sceneNumber}.${shot.shotNumber} ${shot.title}`,
          mediaType: 'VIDEO',
          mediaUrl: shot.outputUrl!,
          thumbnailUrl: shot.thumbnailUrl,
          startTime: Math.round(cursor * 10) / 10,
          duration: shot.duration || 5,
          inPoint: 0,
          outPoint: shot.duration || 5,
          transitionIn: i === 0 ? 'CUT' : 'DISSOLVE',
          transitionDuration: 0.4,
          volume: 1,
        };
        cursor += clip.duration;
        return clip;
      });
      return {
        ...prev,
        timelineClips: [...v1Clips, ...nonV1],
      };
    });
    showNotice(`Synchronized ${rendered.length} rendered shot(s) onto V1 sequence`, 'success');
  };

  const handleUpdateTimeline = (
    tracks: HybridTimelineTrack[],
    clips: HybridTimelineClip[]
  ) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      timelineTracks: tracks,
      timelineClips: clips,
    }));
  };

  const handleDropAssetOnTrack = (assetId: string, trackId: string, dropTimeSec: number) => {
    const asset = project.assets.find((a) => a.id === assetId);
    const track = project.timelineTracks.find((t) => t.id === trackId);
    if (!asset || !track || track.isLocked) return;

    const clip: HybridTimelineClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      trackId: track.id,
      trackType: track.type,
      assetId: asset.id,
      title: asset.name,
      mediaType: asset.mediaType,
      mediaUrl: asset.url,
      thumbnailUrl: asset.thumbnailUrl || (asset.mediaType === 'IMAGE' ? asset.url : undefined),
      startTime: Math.max(0, dropTimeSec),
      duration: asset.duration || (asset.mediaType === 'IMAGE' ? 5 : 6),
      inPoint: 0,
      outPoint: asset.duration || (asset.mediaType === 'IMAGE' ? 5 : 6),
      transitionIn: 'CUT',
      transitionDuration: 0.35,
      volume: track.volume,
    };

    commitProjectUpdate((prev) => ({
      ...prev,
      timelineClips: [...prev.timelineClips, clip],
    }));
    showNotice(`Placed "${asset.name}" on ${track.name}`, 'info');
  };

  // =========================================================================
  // D. ASSETS, FOLDERS, VIDEO TRANSFORMS & CONTINUITY HANDLERS
  // =========================================================================
  const handleUploadFiles = async (
    files: FileList,
    category: HybridAssetCategory,
    folder?: string
  ): Promise<HybridAsset[]> => {
    setIsUploading(true);
    try {
      const uploaded: HybridAsset[] = [];
      for (const file of Array.from(files)) {
        const asset = await uploadHybridStudioAsset({
          file,
          category,
          folder,
          ownerId,
          sceneId: activeScene?.id,
          shotId: activeShot?.id,
        });
        uploaded.push(asset);
      }
      commitProjectUpdate((prev) => ({
        ...prev,
        assets: [...uploaded, ...prev.assets],
      }));
      showNotice(`Added ${uploaded.length} asset(s) to Production Library`, 'success');
      return uploaded;
    } catch (err: any) {
      showNotice(err?.message || 'Upload failed', 'error');
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddAsset = (asset: HybridAsset) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      assets: [asset, ...prev.assets.filter((a) => a.id !== asset.id)],
    }));
  };

  const handleUpdateAssetMeta = (assetId: string, updates: Partial<HybridAsset>) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => (a.id === assetId ? { ...a, ...updates } : a)),
    }));
  };

  const handleAddFolder = (folderName: string) => {
    commitProjectUpdate((prev) => {
      const curr = prev.assetFolders && prev.assetFolders.length > 0 ? prev.assetFolders : DEFAULT_ASSET_FOLDERS;
      if (curr.includes(folderName)) return prev;
      return {
        ...prev,
        assetFolders: [...curr, folderName].slice(0, 40),
      };
    });
  };

  const handleUpsertTransformVersion = (version: HybridVideoTransformVersion) => {
    commitProjectUpdate((prev) => {
      const curr = prev.videoTransforms || [];
      const exists = curr.some((v) => v.id === version.id);
      return {
        ...prev,
        videoTransforms: exists
          ? curr.map((v) => (v.id === version.id ? version : v))
          : [version, ...curr].slice(0, 100),
      };
    }, true);
  };

  const handleUpdateTransformVersion = (
    versionId: string,
    updates: Partial<HybridVideoTransformVersion>
  ) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      videoTransforms: (prev.videoTransforms || []).map((v) =>
        v.id === versionId ? { ...v, ...updates } : v
      ),
    }), Boolean(updates.status === 'COMPLETED' || updates.status === 'FAILED'));
  };

  const handleDeleteTransformVersion = (versionId: string) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      videoTransforms: (prev.videoTransforms || []).filter((v) => v.id !== versionId),
    }));
  };

  const handleSendTransformToStoryboard = (
    outputUrl: string,
    title: string,
    thumbnailUrl?: string,
    duration?: number
  ) => {
    const targetScene = activeScene || projectRef.current.scenes[0];
    if (!targetScene) return;
    const newShot = createBlankShot(targetScene.id, targetScene.shots.length + 1, {
      title: title || `Transformed Shot ${targetScene.shots.length + 1}`,
      outputUrl,
      thumbnailUrl,
      duration: duration || 5,
      status: 'COMPLETED',
      progress: 100,
    });
    commitProjectUpdate((prev) => ({
      ...prev,
      scenes: renumberScenesAndShots(
        prev.scenes.map((s) =>
          s.id === targetScene.id ? { ...s, shots: [...s.shots, newShot] } : s
        )
      ),
    }));
    setSelectedSceneId(targetScene.id);
    setSelectedShotId(newShot.id);
    handleChangeMode('director');
    showNotice(`Sent "${title}" to Storyboard Scene ${targetScene.sceneNumber}`, 'success');
  };

  const handleSendTransformToTimeline = (
    outputUrl: string,
    title: string,
    thumbnailUrl?: string,
    duration?: number
  ) => {
    commitProjectUpdate((prev) => {
      const v1End = prev.timelineClips
        .filter((c) => c.trackId === 'track-v1')
        .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
      const clip: HybridTimelineClip = {
        id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        trackId: 'track-v1',
        trackType: 'VIDEO',
        title,
        mediaType: 'VIDEO',
        mediaUrl: outputUrl,
        thumbnailUrl,
        startTime: Math.round(v1End * 10) / 10,
        duration: duration || 5,
        inPoint: 0,
        outPoint: duration || 5,
        transitionIn: v1End > 0 ? 'DISSOLVE' : 'CUT',
        transitionDuration: 0.4,
        volume: 1,
      };
      return {
        ...prev,
        timelineClips: [...prev.timelineClips, clip],
      };
    });
    handleChangeMode('production');
    showNotice(`Added "${title}" to Production Timeline`, 'success');
  };

  const handleDeleteAsset = (assetId: string) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      assets: prev.assets.filter((a) => a.id !== assetId),
    }));
  };

  const handleAssignAssetToShot = (
    assetOrId: HybridAsset | string,
    slot: 'start_frame' | 'end_frame' | 'reference_plate' | 'video_ref' | 'timeline'
  ) => {
    const asset =
      typeof assetOrId === 'string'
        ? project.assets.find((a) => a.id === assetOrId)
        : assetOrId;
    if (!asset) return;

    if (slot === 'timeline') {
      const targetTrackId =
        asset.mediaType === 'AUDIO'
          ? 'track-a1'
          : asset.category === 'Reference Image' || asset.category === 'Cinematic Reference'
          ? 'track-r1'
          : 'track-v1';
      const trackEnd = project.timelineClips
        .filter((c) => c.trackId === targetTrackId)
        .reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);
      handleDropAssetOnTrack(asset.id, targetTrackId, trackEnd);
      handleChangeMode('production');
      return;
    }

    if (!activeScene || !activeShot) return;

    if (slot === 'start_frame' && asset.mediaType === 'IMAGE') {
      handleUpdateShot(activeScene.id, activeShot.id, {
        referenceImageAssetId: asset.id,
        thumbnailUrl: activeShot.thumbnailUrl || asset.url,
        generationMode:
          activeShot.generationMode === 'text-to-video'
            ? 'image-to-video'
            : activeShot.generationMode,
      });
    } else if (slot === 'end_frame' && asset.mediaType === 'IMAGE') {
      handleUpdateShot(activeScene.id, activeShot.id, {
        endFrameAssetId: asset.id,
        generationMode: 'first-last-frame',
      });
    } else if (slot === 'reference_plate' && asset.mediaType === 'IMAGE') {
      const nextExtra = Array.from(
        new Set([...activeShot.extraReferenceAssetIds, asset.id])
      ).slice(0, 30);
      handleUpdateShot(activeScene.id, activeShot.id, {
        extraReferenceAssetIds: nextExtra,
      });
    } else if (slot === 'video_ref' && asset.mediaType === 'VIDEO') {
      handleUpdateShot(activeScene.id, activeShot.id, {
        referenceVideoAssetId: asset.id,
        generationMode: 'video-to-video',
        providerId: 'bytedance',
      });
    }
  };

  const handleUpsertCharacter = (char: HybridCharacterProfile) => {
    commitProjectUpdate((prev) => {
      const exists = prev.characters.some((c) => c.id === char.id);
      return {
        ...prev,
        characters: exists
          ? prev.characters.map((c) => (c.id === char.id ? char : c))
          : [...prev.characters, char],
      };
    });
  };

  const handleDeleteCharacter = (charId: string) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      characters: prev.characters.filter((c) => c.id !== charId),
    }));
  };

  const handleToggleCharacterOnShot = (charId: string) => {
    if (!activeScene || !activeShot) return;
    const exists = activeShot.characterIds.includes(charId);
    handleUpdateShot(activeScene.id, activeShot.id, {
      characterIds: exists
        ? activeShot.characterIds.filter((id) => id !== charId)
        : [...activeShot.characterIds, charId],
    });
  };

  const handleUpsertEnvironment = (env: HybridEnvironmentProfile) => {
    commitProjectUpdate((prev) => {
      const exists = prev.environments.some((e) => e.id === env.id);
      return {
        ...prev,
        environments: exists
          ? prev.environments.map((e) => (e.id === env.id ? env : e))
          : [...prev.environments, env],
      };
    });
  };

  const handleDeleteEnvironment = (envId: string) => {
    commitProjectUpdate((prev) => ({
      ...prev,
      environments: prev.environments.filter((e) => e.id !== envId),
    }));
  };

  const handleAssignEnvironmentToShot = (envId?: string) => {
    if (!activeScene || !activeShot) return;
    handleUpdateShot(activeScene.id, activeShot.id, { environmentId: envId });
  };

  // =========================================================================
  // E. PROMPT PHYSICS OPTIMIZATION, KEYFRAME GEN & REAL SEEDANCE GENERATION
  // =========================================================================
  const handleOptimizeShotPrompt = async (sceneId: string, shotId: string) => {
    if (ownerId === 'guest') {
      onOpenAuthModal?.();
      return;
    }
    const scene = projectRef.current.scenes.find((s) => s.id === sceneId);
    const shot = scene?.shots.find((sh) => sh.id === shotId);
    if (!scene || !shot) return;

    const compiled = compileShotGenerationPrompt({
      shot,
      scene,
      characters: projectRef.current.characters,
      environments: projectRef.current.environments,
    });
    if (!compiled) return;

    setIsOptimizingPrompt(true);
    try {
      const res = await seedanceLabService.optimizePromptPhysics({
        prompt: compiled,
        durationSeconds: shot.duration,
        aspectRatio: shot.aspectRatio,
        physicsPriority: shot.physicsPriority,
        contentRating: shot.contentRating,
      });
      handleUpdateShot(sceneId, shotId, { mainPrompt: res.optimizedPrompt });
      showNotice('Applied Seedance 2.5 complex physics optimization', 'success');
    } catch (err: any) {
      showNotice(err?.message || 'Prompt optimization failed', 'error');
    } finally {
      setIsOptimizingPrompt(false);
    }
  };

  const handleSynthesizeKeyframeForShot = async (sceneId: string, shotId: string) => {
    if (ownerId === 'guest') {
      onOpenAuthModal?.();
      return;
    }
    const scene = projectRef.current.scenes.find((s) => s.id === sceneId);
    const shot = scene?.shots.find((sh) => sh.id === shotId);
    if (!scene || !shot) return;

    const compiled = compileShotGenerationPrompt({
      shot,
      scene,
      characters: projectRef.current.characters,
      environments: projectRef.current.environments,
    });
    if (!compiled) return;

    setIsSynthesizingKeyframe(true);
    try {
      const headers = await getAuthHeaders(true);
      const characterNames = projectRef.current.characters
        .filter((c) => shot.characterIds.includes(c.id))
        .map((c) => c.name);
      const locationName =
        projectRef.current.environments.find(
          (e) => e.id === (shot.environmentId || scene.environmentId)
        )?.name || '';

      const res = await fetch('/api/prompt/generate-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: compiled,
          aspectRatio: shot.aspectRatio,
          resolution: shot.resolution === '480p' ? '720p' : '1080p',
          characterNames,
          locationName,
          projectId: projectRef.current.id,
          projectName: projectRef.current.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.imageUrl) {
        throw new Error(data?.error || 'Keyframe generation failed.');
      }

      // Host image via /api/ai/upload-media if it is a data URI so video backends accept HTTP URL cleanly
      let hostedUrl = String(data.imageUrl);
      if (hostedUrl.startsWith('data:')) {
        try {
          hostedUrl = await seedanceLabService.uploadMedia(
            hostedUrl,
            `keyframe_scn${scene.sceneNumber}_sht${shot.shotNumber}.png`
          );
        } catch {
          // keep data URL if hosting unavailable
        }
      }

      const asset: HybridAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: `Keyframe S${scene.sceneNumber}.${shot.shotNumber}`,
        category: 'Reference Image',
        mediaType: 'IMAGE',
        url: hostedUrl,
        thumbnailUrl: hostedUrl,
        tags: ['keyframe', 'generated'],
        source: 'generated',
        sceneId,
        shotId,
        createdAt: new Date().toISOString(),
      };

      commitProjectUpdate((prev) => ({
        ...prev,
        assets: [asset, ...prev.assets],
        scenes: prev.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                shots: s.shots.map((sh) =>
                  sh.id === shotId
                    ? {
                        ...sh,
                        referenceImageAssetId: asset.id,
                        thumbnailUrl: hostedUrl,
                        generationMode:
                          sh.generationMode === 'text-to-video'
                            ? 'image-to-video'
                            : sh.generationMode,
                      }
                    : sh
                ),
              }
            : s
        ),
      }));
      showNotice('Keyframe synthesized & bound to shot Start Frame', 'success');
    } catch (err: any) {
      showNotice(err?.message || 'Could not synthesize keyframe', 'error');
    } finally {
      setIsSynthesizingKeyframe(false);
    }
  };

  const resolveAssetHttpUrl = useCallback(
    async (assetId?: string): Promise<string | undefined> => {
      if (!assetId) return undefined;
      const asset = projectRef.current.assets.find((a) => a.id === assetId);
      if (!asset?.url) return undefined;
      if (asset.url.startsWith('data:') && asset.mediaType === 'IMAGE') {
        try {
          const uploaded = await seedanceLabService.uploadMedia(asset.url, asset.name);
          commitProjectUpdate((prev) => ({
            ...prev,
            assets: prev.assets.map((a) => (a.id === asset.id ? { ...a, url: uploaded } : a)),
          }));
          return uploaded;
        } catch {
          return asset.url;
        }
      }
      return asset.url;
    },
    [commitProjectUpdate]
  );

  const finalizeShotGenerationSuccess = useCallback(
    (params: {
      sceneId: string;
      shotId: string;
      recordId: string;
      jobId: string;
      videoUrl: string;
      compiledPrompt: string;
      providerId: string;
      modelId: string;
      resolution: GenerationResolution;
      duration: number;
    }) => {
      const {
        sceneId,
        shotId,
        recordId,
        jobId,
        videoUrl,
        compiledPrompt,
        providerId,
        modelId,
        resolution,
        duration,
      } = params;

      const generatedAsset: HybridAsset = {
        id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name: `Shot Render ${jobId.slice(-6)}`,
        category: 'Generated Result',
        mediaType: 'VIDEO',
        url: videoUrl,
        duration,
        tags: ['seedance-2.5', providerId],
        source: 'generated',
        sceneId,
        shotId,
        createdAt: new Date().toISOString(),
      };

      commitProjectUpdate(
        (prev) => ({
          ...prev,
          assets: [generatedAsset, ...prev.assets],
          generations: prev.generations.map((g) =>
            g.id === recordId
              ? {
                  ...g,
                  status: 'COMPLETED',
                  progress: 100,
                  outputUrl: videoUrl,
                  updatedAt: new Date().toISOString(),
                }
              : g
          ),
          scenes: prev.scenes.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  status: 'COMPLETED',
                  shots: s.shots.map((sh) => {
                    if (sh.id !== shotId) return sh;
                    const version = {
                      id: `ver-${Date.now()}`,
                      versionNumber: sh.versions.length + 1,
                      createdAt: new Date().toISOString(),
                      providerId,
                      modelId,
                      prompt: compiledPrompt,
                      resolution,
                      duration,
                      outputUrl: videoUrl,
                      thumbnailUrl: sh.thumbnailUrl,
                      jobId,
                    };
                    return {
                      ...sh,
                      status: 'COMPLETED',
                      progress: 100,
                      outputUrl: videoUrl,
                      error: undefined,
                      versions: [version, ...sh.versions].slice(0, 12),
                      activeVersionId: version.id,
                    };
                  }),
                }
              : s
          ),
        }),
        true
      );
      showNotice('Shot render complete and archived to Storyboard + Assets', 'success');
    },
    [commitProjectUpdate, showNotice]
  );

  const markShotGenerationFailed = useCallback(
    (sceneId: string, shotId: string, recordId: string, errorMsg: string) => {
      commitProjectUpdate(
        (prev) => ({
          ...prev,
          generations: prev.generations.map((g) =>
            g.id === recordId
              ? { ...g, status: 'FAILED', error: errorMsg, updatedAt: new Date().toISOString() }
              : g
          ),
          scenes: prev.scenes.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  shots: s.shots.map((sh) =>
                    sh.id === shotId
                      ? { ...sh, status: 'FAILED', progress: 0, error: errorMsg }
                      : sh
                  ),
                }
              : s
          ),
        }),
        true
      );
      showNotice(errorMsg, 'error');
    },
    [commitProjectUpdate, showNotice]
  );

  const handleGenerateShot = async (sceneId: string, shotId: string) => {
    if (ownerId === 'guest') {
      onOpenAuthModal?.();
      showNotice('Sign in to run Seedance 2.5 & MUAPI video generation', 'info');
      return;
    }

    const currProject = projectRef.current;
    const scene = currProject.scenes.find((s) => s.id === sceneId);
    const shot = scene?.shots.find((sh) => sh.id === shotId);
    if (!scene || !shot) return;

    const compiledPrompt = compileShotGenerationPrompt({
      shot,
      scene,
      characters: currProject.characters,
      environments: currProject.environments,
    });

    if (!compiledPrompt) {
      showNotice('Add a shot prompt or scene description before generating.', 'error');
      return;
    }

    const recordId = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

    // Collect reference asset IDs linked to shot/scene/characters/env
    const linkedChars = currProject.characters.filter(
      (c) => shot.characterIds.includes(c.id) || scene.characterId === c.id
    );
    const linkedEnv = currProject.environments.find(
      (e) => e.id === (shot.environmentId || scene.environmentId)
    );

    const refIds = Array.from(
      new Set(
        [
          shot.referenceImageAssetId || scene.referenceImageAssetId,
          shot.endFrameAssetId,
          shot.referenceVideoAssetId || scene.referenceVideoAssetId,
          ...shot.extraReferenceAssetIds,
          ...linkedChars.flatMap((c) => c.referenceImageAssetIds),
          linkedEnv?.referenceImageAssetId,
        ].filter(Boolean) as string[]
      )
    );

    const startImageUrl = await resolveAssetHttpUrl(
      shot.referenceImageAssetId ||
        scene.referenceImageAssetId ||
        linkedChars.flatMap((c) => c.referenceImageAssetIds)[0] ||
        linkedEnv?.referenceImageAssetId
    );
    const endImageUrl = await resolveAssetHttpUrl(shot.endFrameAssetId);
    const sourceVideoUrl = await resolveAssetHttpUrl(
      shot.referenceVideoAssetId || scene.referenceVideoAssetId
    );

    const extraPlateUrls: string[] = [];
    for (const pid of shot.extraReferenceAssetIds.slice(0, 12)) {
      const u = await resolveAssetHttpUrl(pid);
      if (u) extraPlateUrls.push(u);
    }
    linkedChars.forEach((c) => {
      c.referenceImageAssetIds.forEach((id) => {
        const a = currProject.assets.find((x) => x.id === id);
        if (a?.url && !a.url.startsWith('data:') && !extraPlateUrls.includes(a.url)) {
          extraPlateUrls.push(a.url);
        }
      });
    });

    if (
      (shot.providerId === 'muapi' || shot.generationMode === 'image-to-video') &&
      !startImageUrl
    ) {
      showNotice('Attach or synthesize a Start Frame Image first.', 'error');
      return;
    }

    if (shot.generationMode === 'video-to-video' && !sourceVideoUrl) {
      showNotice('Attach a Source Video asset to use Video Extension mode.', 'error');
      return;
    }

    const activeProv = providers.find((p) => p.providerId === shot.providerId);
    const activeMod =
      activeProv?.models.find((m) => m.modelId === shot.modelId) || activeProv?.models[0];

    const generationRecord: HybridGenerationRecord = {
      id: recordId,
      jobId: 'pending',
      projectId: currProject.id,
      sceneId: scene.id,
      shotId: shot.id,
      provider: shot.providerId,
      modelId: activeMod?.modelId || shot.modelId,
      modelName: activeMod?.displayName || shot.modelId,
      mode: shot.generationMode,
      prompt: compiledPrompt,
      referenceAssetIds: refIds,
      parameters: {
        aspectRatio: shot.aspectRatio,
        resolution: shot.resolution,
        duration: shot.duration,
        cameraFixed: shot.cameraFixed,
        physicsPriority: shot.physicsPriority,
        generateAudio: shot.generateAudio,
        highBitrate: shot.highBitrate,
        draft: shot.draft,
        seed: shot.seed,
      },
      status: 'QUEUED',
      progress: 8,
      creditCost: shot.duration >= 20 ? 7 : 4,
      currency: activeMod?.pricingCurrency === 'USD' ? 'USD' : 'CREDITS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    commitProjectUpdate((prev) => ({
      ...prev,
      generations: [generationRecord, ...prev.generations].slice(0, 120),
      scenes: prev.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              shots: s.shots.map((sh) =>
                sh.id === shotId
                  ? { ...sh, status: 'QUEUED', progress: 8, error: undefined }
                  : sh
              ),
            }
          : s
      ),
    }));

    const useLegacySeedanceRoute =
      shot.generationMode === 'video-to-video' ||
      (shot.providerId === 'bytedance' && (shot.quantity > 1 || typeof shot.seed === 'number'));

    try {
      if (useLegacySeedanceRoute) {
        const sub = await seedanceLabService.submitGeneration({
          model: shot.duration >= 20 ? 'seedance_25_30s' : 'seedance_25_15s',
          prompt: compiledPrompt,
          aspect_ratio: shot.aspectRatio,
          image_url: startImageUrl,
          end_image_url: endImageUrl,
          video_url: sourceVideoUrl,
          reference_image_urls: extraPlateUrls.length > 0 ? extraPlateUrls : undefined,
          sound_enabled: shot.generateAudio,
          camera_fixed: shot.cameraFixed,
          seed: shot.seed,
          duration: shot.duration,
          resolution: shot.resolution,
          quantity: shot.quantity || 1,
          physics_priority: shot.physicsPriority,
          content_rating: shot.contentRating,
          idempotencyKey: recordId,
        });

        commitProjectUpdate((prev) => ({
          ...prev,
          generations: prev.generations.map((g) =>
            g.id === recordId
              ? { ...g, jobId: sub.jobCode, status: 'PROCESSING', creditCost: sub.costGenerate }
              : g
          ),
          scenes: prev.scenes.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  shots: s.shots.map((sh) =>
                    sh.id === shotId
                      ? { ...sh, status: 'PROCESSING', progress: 22, activeJobId: sub.jobCode }
                      : sh
                  ),
                }
              : s
          ),
        }));

        if (sub.immediateResultUrl) {
          finalizeShotGenerationSuccess({
            sceneId,
            shotId,
            recordId,
            jobId: sub.jobCode,
            videoUrl: sub.immediateResultUrl,
            compiledPrompt,
            providerId: shot.providerId,
            modelId: activeMod?.modelId || shot.modelId,
            resolution: shot.resolution,
            duration: shot.duration,
          });
          return;
        }

        // Poll /api/ai/status/:jobCode cleanly
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const st = await seedanceLabService.pollJobStatus(sub.jobCode);
            if (st.status === 'completed' && st.resultUrl) {
              clearInterval(interval);
              streamCleanupsRef.current.delete(recordId);
              finalizeShotGenerationSuccess({
                sceneId,
                shotId,
                recordId,
                jobId: sub.jobCode,
                videoUrl: st.resultUrl,
                compiledPrompt,
                providerId: shot.providerId,
                modelId: activeMod?.modelId || shot.modelId,
                resolution: shot.resolution,
                duration: shot.duration,
              });
            } else if (st.status === 'failed') {
              clearInterval(interval);
              streamCleanupsRef.current.delete(recordId);
              markShotGenerationFailed(
                sceneId,
                shotId,
                recordId,
                st.error || 'Seedance generation failed.'
              );
            } else {
              handleUpdateShot(sceneId, shotId, {
                status: 'PROCESSING',
                progress: st.progress || 40,
              });
            }
          } catch {
            if (attempts > 160) {
              clearInterval(interval);
              streamCleanupsRef.current.delete(recordId);
              markShotGenerationFailed(sceneId, shotId, recordId, 'Generation polling timed out.');
            }
          }
        }, 3200);

        streamCleanupsRef.current.set(recordId, () => clearInterval(interval));
        return;
      }

      // Standard Multi-Provider unified pipeline (ByteDance Official + MUAPI Seedance 2.5 Spicy)
      const submitted = await multiProviderGenerationService.submitGeneration({
        provider: shot.providerId,
        model_id: activeMod?.modelId || shot.modelId,
        prompt: compiledPrompt,
        image_url: startImageUrl,
        last_image: endImageUrl,
        reference_image_urls: extraPlateUrls.length > 0 ? extraPlateUrls : undefined,
        aspect_ratio: shot.aspectRatio,
        resolution: shot.resolution,
        duration: shot.duration,
        generate_audio: shot.generateAudio,
        camera_fixed: shot.cameraFixed,
        high_bitrate: shot.highBitrate,
        draft: shot.draft,
        physics_priority: shot.physicsPriority,
        content_rating: shot.contentRating,
        idempotency_key: recordId,
      });

      const job = submitted.job;
      commitProjectUpdate((prev) => ({
        ...prev,
        generations: prev.generations.map((g) =>
          g.id === recordId
            ? {
                ...g,
                jobId: job.job_id,
                status: job.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
                creditCost: job.estimated_cost,
                currency: job.currency,
              }
            : g
        ),
        scenes: prev.scenes.map((s) =>
          s.id === sceneId
            ? {
                ...s,
                shots: s.shots.map((sh) =>
                  sh.id === shotId
                    ? {
                        ...sh,
                        status: job.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
                        progress: job.progress || 20,
                        activeJobId: job.job_id,
                      }
                    : sh
                ),
              }
            : s
        ),
      }));

      if (job.status === 'completed' && (job.playback_url || job.provider_output_url)) {
        finalizeShotGenerationSuccess({
          sceneId,
          shotId,
          recordId,
          jobId: job.job_id,
          videoUrl: job.playback_url || job.provider_output_url!,
          compiledPrompt,
          providerId: job.provider,
          modelId: job.model_id,
          resolution: job.resolution,
          duration: job.duration,
        });
        return;
      }

      let resolved = false;
      const handleUnifiedUpdate = async (updatedJob: UnifiedGenerationJob) => {
        if (resolved) return;
        if (
          updatedJob.status === 'completed' &&
          (updatedJob.playback_url || updatedJob.provider_output_url)
        ) {
          resolved = true;
          streamCleanupsRef.current.get(recordId)?.();
          streamCleanupsRef.current.delete(recordId);
          let finalUrl = updatedJob.playback_url || updatedJob.provider_output_url!;
          try {
            const mirrored = await mirrorCompletedVideoToFirebaseStorage(updatedJob);
            if (mirrored) finalUrl = mirrored;
          } catch {
            // keep playback_url
          }
          finalizeShotGenerationSuccess({
            sceneId,
            shotId,
            recordId,
            jobId: updatedJob.job_id,
            videoUrl: finalUrl,
            compiledPrompt,
            providerId: updatedJob.provider,
            modelId: updatedJob.model_id,
            resolution: updatedJob.resolution,
            duration: updatedJob.duration,
          });
        } else if (updatedJob.status === 'failed') {
          resolved = true;
          streamCleanupsRef.current.get(recordId)?.();
          streamCleanupsRef.current.delete(recordId);
          markShotGenerationFailed(
            sceneId,
            shotId,
            recordId,
            updatedJob.error || 'Video generation failed upstream.'
          );
        } else {
          handleUpdateShot(sceneId, shotId, {
            status: 'PROCESSING',
            progress: Math.min(95, Math.max(15, updatedJob.progress || 35)),
          });
        }
      };

      const unsubSse = multiProviderGenerationService.subscribeToJobRealtimeStream(
        job.job_id,
        {
          onInit: (payload) => {
            if (payload.job) void handleUnifiedUpdate(payload.job);
          },
          onJobUpdate: (updated) => {
            void handleUnifiedUpdate(updated);
          },
          onError: () => {
            // Fallback polling handles transient stream drops
          },
        }
      );

      const pollTimer = setInterval(async () => {
        if (resolved) return;
        try {
          const st = await multiProviderGenerationService.getJobStatus(job.job_id);
          await handleUnifiedUpdate(st);
        } catch {
          // wait for next tick
        }
      }, 3800);

      streamCleanupsRef.current.set(recordId, () => {
        unsubSse();
        clearInterval(pollTimer);
      });
    } catch (err: any) {
      markShotGenerationFailed(
        sceneId,
        shotId,
        recordId,
        err?.message || 'Generation submission failed.'
      );
    }
  };

  const handleRegenerateSelectedShots = (shotIds: string[]) => {
    const queue: Array<{ sceneId: string; shotId: string }> = [];
    project.scenes.forEach((s) => {
      s.shots.forEach((sh) => {
        if (shotIds.includes(sh.id)) queue.push({ sceneId: s.id, shotId: sh.id });
      });
    });
    queue.forEach(({ sceneId, shotId }) => {
      void handleGenerateShot(sceneId, shotId);
    });
  };

  const activeShotStartImg = project.assets.find(
    (a) => a.id === activeShot?.referenceImageAssetId
  );

  return (
    <div
      data-no-swipe="true"
      className="w-full h-full bg-[#050507] text-[#ECECE9] flex flex-col overflow-hidden relative"
    >
      {/* A. TOP PROJECT CONTROL BAR */}
      <HybridProjectControlBar
        project={project}
        projectsList={projectsList}
        workspaceMode={workspaceMode}
        isLeftOpen={isLeftOpen}
        isRightOpen={isRightOpen}
        focusMode={focusMode}
        isSaving={isSaving}
        persistedToCloud={persistedToCloud}
        activeJobsCount={activeJobsCount}
        onOpenMenu={onOpenMenu}
        onChangeMode={handleChangeMode}
        onToggleLeft={() => setIsLeftOpen((v) => !v)}
        onToggleRight={() => setIsRightOpen((v) => !v)}
        onToggleFocusMode={handleToggleFocusMode}
        onNavigateTool={handleNavigateTool}
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        onSaveProject={handleSaveProject}
        onDuplicateProject={handleDuplicateProject}
        onDeleteProject={handleDeleteProject}
        onUpdateProjectMeta={handleUpdateProjectMeta}
        onRestoreVersion={handleRestoreVersion}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Non-blocking Workspace Notice Bar */}
      {notice && (
        <div
          className={`px-4 py-1.5 border-b text-[11px] font-mono flex items-center justify-between gap-2 shrink-0 ${
            notice.type === 'error'
              ? 'bg-rose-950/60 border-rose-500/40 text-rose-200'
              : notice.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
              : 'bg-cyan-950/40 border-cyan-500/35 text-cyan-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {notice.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="truncate">{notice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-white/60 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MAIN STUDIO BODY */}
      {workspaceMode === 'video-transform' ? (
        <HybridVideoTransformStudio
          project={project}
          providers={providers}
          ownerId={ownerId}
          initialSourceAssetId={transformSourceAssetId}
          isUploading={isUploading}
          focusMode={focusMode}
          onToggleFocusMode={handleToggleFocusMode}
          onOpenAuthModal={onOpenAuthModal}
          onUploadFiles={handleUploadFiles}
          onAddAsset={handleAddAsset}
          onUpdateAssetMeta={handleUpdateAssetMeta}
          onAddFolder={handleAddFolder}
          onUpsertTransformVersion={handleUpsertTransformVersion}
          onUpdateTransformVersion={handleUpdateTransformVersion}
          onDeleteTransformVersion={handleDeleteTransformVersion}
          onSendToStoryboardShot={handleSendTransformToStoryboard}
          onSendToTimeline={handleSendTransformToTimeline}
          onShowNotice={showNotice}
        />
      ) : (
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* E. LEFT PANEL: REFERENCE & ASSET LIBRARY + CONTINUITY */}
        {isLeftOpen && !focusMode && (
          <div className="absolute md:relative inset-y-0 left-0 z-30 w-72 shrink-0 h-full shadow-2xl md:shadow-none">
            <HybridAssetLibraryPanel
              project={project}
              activeScene={activeScene}
              activeShot={activeShot}
              isUploading={isUploading}
              forcedTab={forcedLeftTab}
              forcedCategoryFilter={forcedAssetCategory}
              onUploadFiles={handleUploadFiles}
              onDeleteAsset={handleDeleteAsset}
              onOpenInVideoTransform={(asset) => {
                setTransformSourceAssetId(asset.id);
                handleChangeMode('video-transform');
              }}
              onAssignAssetToShot={handleAssignAssetToShot}
              onUpsertCharacter={handleUpsertCharacter}
              onDeleteCharacter={handleDeleteCharacter}
              onToggleCharacterOnShot={handleToggleCharacterOnShot}
              onUpsertEnvironment={handleUpsertEnvironment}
              onDeleteEnvironment={handleDeleteEnvironment}
              onAssignEnvironmentToShot={handleAssignEnvironmentToShot}
            />
          </div>
        )}

        {/* CENTER WORKSPACE: DIRECTOR VIEW OR PRODUCTION (STORYBOARD + TIMELINE) */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#050507]">
          {/* Director Stage Preview Monitor (Dedicated in Director Mode, keeps editing fluid) */}
          {workspaceMode === 'director' && activeShot && (
            <div className="border-b border-white/[0.1] bg-[#08090e] shrink-0">
              <div className="px-4 py-1.5 flex items-center justify-between border-b border-white/[0.06] text-[10px] font-mono">
                <span className="text-white/75 uppercase tracking-wider flex items-center gap-2">
                  <Play className="w-3 h-3 text-cyan-400" />
                  <span>
                    Director Stage · SCN {String(activeScene?.sceneNumber || 1).padStart(2, '0')} / SHT{' '}
                    {String(activeShot.shotNumber).padStart(2, '0')} — {activeShot.title}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowDirectorMonitor((v) => !v)}
                  className="text-white/50 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>{showDirectorMonitor ? 'Collapse Monitor' : 'Expand Monitor'}</span>
                  {showDirectorMonitor ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {showDirectorMonitor && (
                <div className="p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center max-h-56">
                  <div className="md:col-span-5 aspect-video max-h-44 mx-auto w-full bg-black border border-white/[0.14] flex items-center justify-center overflow-hidden">
                    {activeShot.outputUrl ? (
                      <video
                        key={activeShot.outputUrl}
                        src={activeShot.outputUrl}
                        controls
                        playsInline
                        className="w-full h-full object-contain"
                      />
                    ) : activeShot.thumbnailUrl || activeShotStartImg?.url ? (
                      <img
                        src={activeShot.thumbnailUrl || activeShotStartImg?.url}
                        alt={activeShot.title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center px-4 space-y-1">
                        <Film className="w-6 h-6 mx-auto text-white/25" />
                        <div className="text-[10px] font-mono text-white/45">
                          {activeShot.shotSize} · {activeShot.cameraMovement}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-7 space-y-2 text-xs">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                      Compiled Seedance 2.5 Directive
                    </div>
                    <p className="text-xs text-white/75 line-clamp-3 leading-relaxed">
                      {compileShotGenerationPrompt({
                        shot: activeShot,
                        scene: activeScene,
                        characters: project.characters,
                        environments: project.environments,
                      }) || 'Define shot prompt and references on the right AI Production panel.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono text-white/55">
                      <span>{activeShot.resolution}</span>
                      <span>·</span>
                      <span>{activeShot.duration}s</span>
                      <span>·</span>
                      <span>{activeShot.aspectRatio}</span>
                      {activeShot.outputUrl && activeScene && (
                        <button
                          type="button"
                          onClick={() => appendClipsToTimeline([{ scene: activeScene, shot: activeShot }])}
                          className="ml-auto flex items-center gap-1 px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/35 text-emerald-300 hover:bg-emerald-900/45 uppercase cursor-pointer"
                        >
                          <Layers className="w-3 h-3" />
                          <span>Add Shot to Timeline</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* B. STORYBOARD & SEQUENCE BUILDER */}
          <div
            className={`${
              workspaceMode === 'production' ? 'flex-[55] min-h-[210px]' : 'flex-1 min-h-0'
            } overflow-hidden`}
          >
            <HybridStoryboardBuilder
              project={project}
              selectedSceneId={activeScene?.id || ''}
              selectedShotId={activeShot?.id || ''}
              isPlanningScenes={isPlanningScenes}
              onSelectShot={handleSelectShot}
              onAddScene={handleAddScene}
              onGenerateScenesFromConcept={handleGenerateScenesFromConcept}
              onDuplicateScene={handleDuplicateScene}
              onDeleteScene={handleDeleteScene}
              onMoveScene={handleMoveScene}
              onUpdateScene={handleUpdateScene}
              onSplitSceneIntoShots={handleSplitSceneIntoShots}
              onCombineSceneToSequence={handleCombineSceneToSequence}
              onCombineSelectedShots={handleCombineSelectedShots}
              onAddShot={handleAddShot}
              onDuplicateShot={handleDuplicateShot}
              onDeleteShot={handleDeleteShot}
              onGenerateShot={handleGenerateShot}
              onRegenerateSelectedShots={handleRegenerateSelectedShots}
              onAddShotToTimeline={(scene, shot) => {
                appendClipsToTimeline([{ scene, shot }]);
                handleChangeMode('production');
                showNotice(`Added Shot ${shot.shotNumber} to Timeline`, 'success');
              }}
              onExtendFromShot={handleExtendFromShot}
            />
          </div>

          {/* C. FUNCTIONAL NONLINEAR CINEMATIC TIMELINE EDITOR (Production Mode) */}
          {workspaceMode === 'production' && (
            <div className="flex-[45] min-h-[260px] overflow-hidden">
              <HybridTimelineEditor
                project={project}
                onUpdateTimeline={handleUpdateTimeline}
                onAssembleAllRenderedShots={handleAssembleAllRenderedShots}
                onDropAssetOnTrack={handleDropAssetOnTrack}
              />
            </div>
          )}

          {/* Production Generation Ledger Footer Bar */}
          <div className="border-t border-white/[0.1] bg-[#08090e] shrink-0">
            <button
              type="button"
              onClick={() => setShowJobsLedger((v) => !v)}
              className="w-full h-7 px-3 flex items-center justify-between text-[10px] font-mono text-white/60 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span>
                  Generation Ledger ({project.generations.length})
                  {activeJobsCount > 0 ? ` · ${activeJobsCount} active` : ''}
                </span>
              </span>
              {showJobsLedger ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
            </button>

            {showJobsLedger && (
              <div className="border-t border-white/[0.08] max-h-40 overflow-y-auto divide-y divide-white/[0.06] bg-black/50 text-[10px] font-mono">
                {project.generations.length === 0 ? (
                  <div className="p-3 text-white/40 text-center">
                    No generation jobs recorded in this production yet.
                  </div>
                ) : (
                  project.generations.map((rec) => (
                    <div
                      key={rec.id}
                      className="px-3 py-1.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        {rec.status === 'COMPLETED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : rec.status === 'FAILED' ? (
                          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                        ) : (
                          <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
                        )}
                        <span className="text-white/85 truncate">
                          {rec.modelName} · {rec.parameters.resolution} · {rec.parameters.duration}s
                        </span>
                        <span className="text-white/40 truncate hidden sm:inline">
                          Job {rec.jobId} · Refs {rec.referenceAssetIds.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-white/55 tabular-nums">
                        <span>
                          {rec.currency === 'USD'
                            ? `$${rec.creditCost.toFixed(2)}`
                            : `${rec.creditCost} CR`}
                        </span>
                        <span className="uppercase">{rec.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>

        {/* D. RIGHT PANEL: AI PRODUCTION CONTROL PANEL */}
        {isRightOpen && !focusMode && (
          <div className="absolute md:relative inset-y-0 right-0 z-30 w-80 shrink-0 h-full shadow-2xl md:shadow-none">
            <HybridProductionControlPanel
              project={project}
              scene={activeScene}
              shot={activeShot}
              workspaceMode={workspaceMode}
              providers={providers}
              isGenerating={activeJobsCount > 0}
              isOptimizingPrompt={isOptimizingPrompt}
              isSynthesizingKeyframe={isSynthesizingKeyframe}
              onUpdateShot={handleUpdateShot}
              onOptimizeShotPrompt={handleOptimizeShotPrompt}
              onSynthesizeKeyframeForShot={handleSynthesizeKeyframeForShot}
              onGenerateShot={handleGenerateShot}
              onSelectShotVersion={handleSelectShotVersion}
              onDropAssetOnShotSlot={(assetId, slot) =>
                handleAssignAssetToShot(assetId, slot)
              }
            />
          </div>
        )}
      </div>
      )}

      {/* Export Dialog */}
      <HybridExportDialog
        project={project}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
};
