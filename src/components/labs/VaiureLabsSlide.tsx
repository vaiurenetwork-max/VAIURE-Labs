/**
 * VAIURE — SEEDANCE LAB (SLIDE 04)
 * Integrated AI Creative Platform Workspace
 *
 * Dedicated strictly to ByteDance Dreamina Seedance 2.5 with:
 * - Tier Plan & Subscription Management (Free, Basic, Pro, Premium, Enterprise)
 * - Generation Credit System & Dynamic Cost Ledger
 * - Personal AI Creative Agent with Persistent User-Isolated Memory
 * - Live WebRTC Streaming & Multiplayer Live Rooms
 * - Admin Governance Console
 *
 * Design Language: BLACK & WHITE GLASSMORPHISM ONLY
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../../types/social';
import {
  SeedanceLabNavbar,
  SeedanceLabView,
} from './seedanceLab/SeedanceLabNavbar';
import { SeedanceOverviewDashboard } from './seedanceLab/SeedanceOverviewDashboard';
import { SeedanceVideoGenerator } from './seedanceLab/SeedanceVideoGenerator';
import { SeedanceReferenceStudio } from './seedanceLab/SeedanceReferenceStudio';
import { SeedanceHistoryView } from './seedanceLab/SeedanceHistoryView';
import { SeedanceAccountApiView } from './seedanceLab/SeedanceAccountApiView';
import { SeedanceBackendTestView } from './seedanceLab/SeedanceBackendTestView';
import { SeedancePlansView } from './seedanceLab/SeedancePlansView';
import { SeedanceCreditsView } from './seedanceLab/SeedanceCreditsView';
import { SeedanceAgentView } from './seedanceLab/SeedanceAgentView';
import { SeedanceLivestreamView } from './seedanceLab/SeedanceLivestreamView';
import { SeedanceRoomsView } from './seedanceLab/SeedanceRoomsView';
import { SeedanceAdminView } from './seedanceLab/SeedanceAdminView';
import { SeedanceCommunityView } from './seedanceLab/community/SeedanceCommunityView';
import {
  CuratedEnvironmentTab,
  SeedanceCuratedView,
} from './seedanceLab/curated/SeedanceCuratedView';
import { UserCreation } from '../../types/seedanceCurated';
import { CommunityGroup, SeedanceWorkflowAttachment } from '../../types/seedancePlatform';
import {
  seedanceLabService,
  SEEDANCE_MODELS,
  SeedanceAccountBalance,
  SeedanceHealthStatus,
  SeedanceHistoryItem,
  SeedanceModelKey,
} from '../../services/seedanceLabService';
import {
  mirrorCompletedVideoToFirebaseStorage,
  multiProviderGenerationService,
  subscribeToUserGenerationJobs,
} from '../../services/multiProviderGenerationService';
import { ProviderId, UnifiedGenerationJob } from '../../types/multiProvider';
import { verifyStripeCheckoutSession } from '../../services/seedancePlatformService';
import { X, CheckCircle2 } from 'lucide-react';

interface VaiureLabsSlideProps {
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  onOpenMenu?: () => void;
  onOpenCreatePost?: () => void;
  onOpenCanvasStudio?: () => void;
  onOpenAuthModal?: () => void;
  incomingReferenceImages?: string[];
  onConsumeIncomingReferences?: () => void;
  currentUser?: UserProfile | null;
  isAdmin?: boolean;
  initialView?: SeedanceLabView;
}

export const VaiureLabsSlide: React.FC<VaiureLabsSlideProps> = ({
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  onOpenMenu,
  onOpenCanvasStudio,
  onOpenAuthModal,
  incomingReferenceImages,
  onConsumeIncomingReferences,
  currentUser,
  isAdmin = false,
  initialView,
}) => {
  const isAuthenticated = Boolean(currentUser?.id && currentUser.role !== 'GUEST');

  // Navigation View
  const [activeView, setActiveView] = useState<SeedanceLabView>(initialView || 'overview');
  const [curatedEnv, setCuratedEnv] = useState<CuratedEnvironmentTab>('public');

  // Shared Generator State
  const [generatorProvider, setGeneratorProvider] = useState<ProviderId>('bytedance');
  const [generatorModelId, setGeneratorModelId] = useState<string>('seedance_25_15s');
  const [generatorModel, setGeneratorModel] = useState<SeedanceModelKey>('seedance_25_15s');
  const [generatorPrompt, setGeneratorPrompt] = useState<string>('');
  const [generatorAspect, setGeneratorAspect] = useState<string>('16:9');
  const [generatorImages, setGeneratorImages] = useState<string[]>([]);
  const [generatorResolution, setGeneratorResolution] = useState<'480P' | '720P' | '1080P' | '4K'>('720P');
  const [generatorDuration, setGeneratorDuration] = useState<number>(15);
  const [generatorDraftRequestId, setGeneratorDraftRequestId] = useState<string>('');
  const [generatorPhysicsPriority, setGeneratorPhysicsPriority] = useState<boolean>(true);
  const [generatorContentRating, setGeneratorContentRating] = useState<'18+' | 'standard'>('standard');
  const [groupStreamContext, setGroupStreamContext] = useState<{
    groupId: string;
    groupName: string;
    groupVisibility: 'PUBLIC' | 'PRIVATE';
    streamIdToJoin?: string;
  } | null>(null);

  // Backend Live Telemetry
  const [balance, setBalance] = useState<SeedanceAccountBalance | null>(null);
  const [health, setHealth] = useState<SeedanceHealthStatus | null>(null);
  const [history, setHistory] = useState<SeedanceHistoryItem[]>([]);
  const [unifiedJobs, setUnifiedJobs] = useState<UnifiedGenerationJob[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stripeBanner, setStripeBanner] = useState<string | null>(null);
  const mirroredJobIdsRef = React.useRef<Set<string>>(new Set());

  // Sync external initialView requests (e.g., from Settings, Profile, or Multiplayer Dock)
  useEffect(() => {
    if (initialView) {
      setActiveView(initialView);
    }
  }, [initialView]);

  const mergeUnifiedJobsList = useCallback((incoming: UnifiedGenerationJob[]) => {
    if (!incoming || incoming.length === 0) return;
    setUnifiedJobs((prev) => {
      const map = new Map<string, UnifiedGenerationJob>();
      for (const job of prev) map.set(job.job_id, job);
      for (const job of incoming) {
        const existing = map.get(job.job_id);
        if (!existing) {
          map.set(job.job_id, job);
        } else {
          const existingTime = new Date(existing.updated_at || existing.created_at).getTime();
          const incomingTime = new Date(job.updated_at || job.created_at).getTime();
          if (incomingTime >= existingTime || (job.playback_url && !existing.playback_url)) {
            map.set(job.job_id, {
              ...existing,
              ...job,
              playback_url: job.playback_url || existing.playback_url,
              firebase_storage_path: job.firebase_storage_path || existing.firebase_storage_path,
            });
          }
        }
      }
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, []);

  // Fetch real backend data from /api/ai/balance, /api/ai/health, /api/ai/history, /api/generations/history
  const loadBackendData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [balRes, healthRes, histRes, unifiedRes] = await Promise.all([
        seedanceLabService.getBalance().catch(() => ({
          authenticated: false,
          balance_generate: 0,
          used_credits: 0,
          monthly_credits: 0,
          purchased_credits: 0,
          balance_idr_equivalent: 0,
          unit_value_idr: 600,
          source: 'bytedance_modelark_ledger',
        })),
        seedanceLabService.getHealth().catch(() => ({
          ok: false,
          upstreamConnected: false,
          service: 'ByteDance BytePlus ModelArk API v3',
          baseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
          serverKeyConfigured: false,
        })),
        seedanceLabService.getHistory().catch(() => []),
        multiProviderGenerationService.getUnifiedHistory().catch(() => []),
      ]);

      setBalance(balRes);
      setHealth(healthRes);
      setHistory(histRes);
      mergeUnifiedJobsList(unifiedRes);
    } catch (err) {
      console.error('Failed to load Seedance Lab telemetry:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser?.id, mergeUnifiedJobsList]);

  useEffect(() => {
    loadBackendData();
  }, [loadBackendData]);

  // Real-time Firestore listener for user's generationJobs + durable Storage mirror
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;
    const unsubscribe = subscribeToUserGenerationJobs(currentUser.id, (fsJobs) => {
      mergeUnifiedJobsList(fsJobs);
    });
    return () => unsubscribe();
  }, [isAuthenticated, currentUser?.id, mergeUnifiedJobsList]);

  useEffect(() => {
    if (!isAuthenticated || unifiedJobs.length === 0) return;
    for (const job of unifiedJobs) {
      if (
        job.status === 'completed' &&
        job.playback_url &&
        !job.playback_url.includes('firebasestorage.googleapis.com') &&
        !mirroredJobIdsRef.current.has(job.job_id)
      ) {
        mirroredJobIdsRef.current.add(job.job_id);
        void mirrorCompletedVideoToFirebaseStorage(job).then((fsUrl) => {
          if (fsUrl) {
            mergeUnifiedJobsList([
              {
                ...job,
                firebase_storage_path: `generated-videos/${job.user_id}/${job.job_id}/video.mp4`,
                playback_url: fsUrl,
              },
            ]);
          }
        });
      }
    }
  }, [isAuthenticated, unifiedJobs, mergeUnifiedJobsList]);

  // Automatically verify real Stripe checkout return if ?stripe_session_id=... is present
  useEffect(() => {
    if (!isAuthenticated || typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('stripe_session_id');
    const stripeStatus = params.get('stripe_status');

    if (stripeStatus === 'cancelled') {
      setStripeBanner('Stripe checkout was cancelled. No charges were applied.');
      params.delete('stripe_session_id');
      params.delete('stripe_status');
      const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', cleaned);
      return;
    }

    if (!sessionId) return;

    let cancelled = false;
    verifyStripeCheckoutSession(sessionId)
      .then((res) => {
        if (cancelled) return;
        setStripeBanner(res.message || 'Stripe checkout verified and credited.');
        loadBackendData();
      })
      .catch((err) => {
        if (cancelled) return;
        setStripeBanner(err?.message || 'Unable to verify Stripe checkout session yet.');
      })
      .finally(() => {
        params.delete('stripe_session_id');
        params.delete('stripe_status');
        const cleaned = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}${window.location.hash}`;
        window.history.replaceState({}, '', cleaned);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadBackendData]);

  // Accept incoming Canvas Studio renders cleanly (up to 30 plates)
  useEffect(() => {
    if (incomingReferenceImages && incomingReferenceImages.length > 0) {
      setGeneratorImages((prev) =>
        Array.from(new Set([...prev, ...incomingReferenceImages])).slice(0, 30)
      );
      setGeneratorModel((prevModel) =>
        prevModel.includes('r2v') ? prevModel : 'seedance_25_15s_r2v'
      );
      setActiveView('generator');
      onConsumeIncomingReferences?.();
    }
  }, [incomingReferenceImages, onConsumeIncomingReferences]);

  // Handler: Launch Generator with preset model from Overview
  const handleLaunchGenerator = (modelKey?: SeedanceModelKey) => {
    if (modelKey) {
      setGeneratorProvider('bytedance');
      setGeneratorModel(modelKey);
      setGeneratorModelId(modelKey);
    }
    setActiveView('generator');
  };

  // Handler: Reuse History Item in Generator
  const handleReuseHistoryItem = (item: SeedanceHistoryItem) => {
    setGeneratorProvider('bytedance');
    if (item.model && item.model in SEEDANCE_MODELS) {
      setGeneratorModel(item.model as SeedanceModelKey);
      setGeneratorModelId(item.model);
    }
    if (item.prompt) {
      setGeneratorPrompt(item.prompt);
    }
    if (item.parameters?.aspect_ratio) {
      setGeneratorAspect(String(item.parameters.aspect_ratio));
    }
    if (Array.isArray(item.parameters?.reference_image_urls)) {
      const imgs = item.parameters.reference_image_urls.filter(
        (u): u is string => typeof u === 'string'
      );
      if (imgs.length > 0) setGeneratorImages(imgs.slice(0, 30));
    }
    setActiveView('generator');
  };

  const handleReuseUnifiedJob = (job: UnifiedGenerationJob) => {
    setGeneratorProvider(job.provider || 'bytedance');
    setGeneratorModelId(job.model_id);
    if (job.model_id in SEEDANCE_MODELS) {
      setGeneratorModel(job.model_id as SeedanceModelKey);
    }
    setGeneratorPrompt(job.prompt || '');
    const upperRes = String(job.resolution || '720p').toUpperCase();
    if (upperRes === '480P' || upperRes === '720P' || upperRes === '1080P' || upperRes === '4K') {
      setGeneratorResolution(upperRes as '480P' | '720P' | '1080P' | '4K');
    }
    setGeneratorDuration(job.duration || 5);
    const imgs: string[] = [];
    if (job.image_url) imgs.push(job.image_url);
    if (job.last_image) imgs.push(job.last_image);
    if (Array.isArray(job.reference_image_urls)) {
      for (const r of job.reference_image_urls) {
        if (r && !imgs.includes(r)) imgs.push(r);
      }
    }
    setGeneratorImages(imgs.slice(0, 30));
    setGeneratorDraftRequestId('');
    setActiveView('generator');
  };

  const handleOpenGeneratorWithDraftFinalize = (draftJob: UnifiedGenerationJob) => {
    setGeneratorProvider(draftJob.provider || 'muapi');
    setGeneratorModelId(draftJob.model_id);
    setGeneratorPrompt(draftJob.prompt || '');
    setGeneratorResolution('1080P');
    setGeneratorDuration(draftJob.duration || 5);
    setGeneratorDraftRequestId(draftJob.request_id || draftJob.draft_request_id || '');
    const imgs: string[] = [];
    if (draftJob.image_url) imgs.push(draftJob.image_url);
    if (draftJob.last_image) imgs.push(draftJob.last_image);
    setGeneratorImages(imgs);
    setActiveView('generator');
  };

  // Handler: Apply Reference Studio Images to Generator
  const handleApplyReferences = (images: string[]) => {
    setGeneratorImages(images.slice(0, 30));
    if (images.length > 0 && !generatorModel.includes('r2v')) {
      setGeneratorModel('seedance_25_15s_r2v');
    }
    setActiveView('generator');
  };

  // Handler: Import Seedance Workflow from Community Post straight into Generator
  const handleImportCommunityWorkflow = (workflow: SeedanceWorkflowAttachment) => {
    if (workflow.modelKey && workflow.modelKey in SEEDANCE_MODELS) {
      setGeneratorModel(workflow.modelKey as SeedanceModelKey);
    } else if (workflow.referenceImages && workflow.referenceImages.length > 0) {
      setGeneratorModel('seedance_25_15s_r2v');
    }
    if (workflow.prompt) {
      setGeneratorPrompt(workflow.prompt);
    }
    if (workflow.aspectRatio) {
      setGeneratorAspect(workflow.aspectRatio);
    }
    if (workflow.resolution) {
      const upper = workflow.resolution.toUpperCase();
      if (upper === '480P' || upper === '720P' || upper === '1080P') {
        setGeneratorResolution(upper);
      }
    }
    setGeneratorPhysicsPriority(Boolean(workflow.physicsPriority));
    setGeneratorContentRating(workflow.contentRating === '18+' ? '18+' : 'standard');
    if (Array.isArray(workflow.referenceImages)) {
      setGeneratorImages(workflow.referenceImages.slice(0, 30));
    }
    setActiveView('generator');
  };

  // Handler: Launch or Join Group Livestream from Community Workspace
  const handleLaunchGroupStream = (group: CommunityGroup, streamIdToJoin?: string) => {
    setGroupStreamContext({
      groupId: group.id,
      groupName: group.name,
      groupVisibility: group.visibility,
      streamIdToJoin,
    });
    setActiveView('streams');
  };

  // Handler: New Generation Completed
  const handleGenerationCompleted = (newItem: SeedanceHistoryItem) => {
    setHistory((prev) => [newItem, ...prev.filter((i) => i.job_code !== newItem.job_code)]);
    loadBackendData();
  };

  const handleUnifiedJobUpdated = useCallback(
    (job: UnifiedGenerationJob) => {
      mergeUnifiedJobsList([job]);
    },
    [mergeUnifiedJobsList]
  );

  const requireAuth = () => {
    onOpenAuthModal?.();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white select-none overflow-hidden font-sans">
      {/* Monochromatic Top Bar Contract */}
      <SeedanceLabNavbar
        activeView={activeView}
        onChangeView={setActiveView}
        balance={balance}
        health={health}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
        isRefreshingBalance={isRefreshing}
        onRefreshBalance={loadBackendData}
        onRequireAuth={requireAuth}
        onBackToSlideOne={onBackToSlideOne}
        onBackToSlideTwo={onBackToSlideTwo}
        onBackToSlideThree={onBackToSlideThree}
        onOpenMenu={onOpenMenu}
      />

      {stripeBanner && (
        <div className="px-4 py-2 bg-white/[0.08] border-b border-white/[0.15] flex items-center justify-between gap-3 text-xs font-mono text-white">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
            <span>{stripeBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStripeBanner(null)}
            className="text-white/60 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Viewport */}
      <main className="flex-1 w-full h-[calc(100%-56px)] overflow-hidden relative bg-[#080808]">
        {/* VIEW 1: OVERVIEW DASHBOARD */}
        {activeView === 'overview' && (
          <SeedanceOverviewDashboard
            balance={balance}
            health={health}
            history={history}
            isAuthenticated={isAuthenticated}
            onOpenGenerator={handleLaunchGenerator}
            onOpenHistory={() => setActiveView('history')}
            onOpenAccount={() => setActiveView('account')}
            onOpenPlans={() => setActiveView('plans')}
            onOpenCredits={() => setActiveView('credits')}
            onOpenAgent={() => setActiveView('agent')}
            onOpenStreams={() => setActiveView('streams')}
            onOpenRooms={() => setActiveView('rooms')}
            onOpenCommunity={() => setActiveView('community')}
            onOpenCurated={(env) => {
              setCuratedEnv(env || 'public');
              setActiveView('curated');
            }}
            onRequireAuth={requireAuth}
            onSelectHistoryItem={handleReuseHistoryItem}
          />
        )}

        {/* VIEW 2: VIDEO GENERATOR */}
        {activeView === 'generator' && (
          <SeedanceVideoGenerator
            initialModel={generatorModel}
            initialProvider={generatorProvider}
            initialModelId={generatorModelId}
            initialPrompt={generatorPrompt}
            initialAspect={generatorAspect}
            initialImages={generatorImages}
            initialResolution={generatorResolution}
            initialDuration={generatorDuration}
            initialDraftRequestId={generatorDraftRequestId}
            initialPhysicsPriority={generatorPhysicsPriority}
            initialContentRating={generatorContentRating}
            balance={balance}
            isAuthenticated={isAuthenticated}
            onRequireAuth={requireAuth}
            onOpenPlans={() => setActiveView('plans')}
            onOpenCredits={() => setActiveView('credits')}
            onOpenFullAgent={() => setActiveView('agent')}
            onGenerationComplete={handleGenerationCompleted}
            onUnifiedJobUpdated={handleUnifiedJobUpdated}
            onRefreshBalance={loadBackendData}
            onOpenReferenceStudio={() => setActiveView('reference')}
            onOpenCanvasStudio={onOpenCanvasStudio}
            onOpenHistory={() => setActiveView('history')}
          />
        )}

        {/* VIEW 3: REFERENCE STUDIO */}
        {activeView === 'reference' && (
          <SeedanceReferenceStudio
            currentImages={generatorImages}
            onUpdateImages={setGeneratorImages}
            onSendToGenerator={handleApplyReferences}
          />
        )}

        {/* VIEW 4: GENERATION HISTORY (UNIFIED MY GENERATIONS) */}
        {activeView === 'history' && (
          <SeedanceHistoryView
            history={history}
            unifiedJobs={unifiedJobs}
            onRefresh={loadBackendData}
            onUnifiedJobUpdated={handleUnifiedJobUpdated}
            onReuseInGenerator={handleReuseHistoryItem}
            onReuseUnifiedJob={handleReuseUnifiedJob}
            onOpenGeneratorWithDraftFinalize={handleOpenGeneratorWithDraftFinalize}
          />
        )}

        {/* VIEW 5: TIER PLANS & SUBSCRIPTION */}
        {activeView === 'plans' && (
          <SeedancePlansView
            isAuthenticated={isAuthenticated}
            onRequireAuth={requireAuth}
            onSubscriptionChanged={loadBackendData}
            onOpenCredits={() => setActiveView('credits')}
          />
        )}

        {/* VIEW 6: GENERATION CREDITS WALLET */}
        {activeView === 'credits' && (
          <SeedanceCreditsView
            isAuthenticated={isAuthenticated}
            onRequireAuth={requireAuth}
            onWalletUpdated={loadBackendData}
          />
        )}

        {/* VIEW 7: PERSONAL AI CREATIVE AGENT */}
        {activeView === 'agent' && (
          <SeedanceAgentView
            isAuthenticated={isAuthenticated}
            onRequireAuth={requireAuth}
            workspaceContext={{
              currentPrompt: generatorPrompt,
              model: generatorModel,
              aspectRatio: generatorAspect,
              resolution: '720p',
              referenceCount: generatorImages.length,
            }}
            onApplyPromptToGenerator={(nextPrompt) => {
              setGeneratorPrompt(nextPrompt);
              setActiveView('generator');
            }}
          />
        )}

        {/* VIEW 8: LIVESTREAMING */}
        {activeView === 'streams' && (
          <SeedanceLivestreamView
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            currentCredits={balance?.balance_generate ?? 0}
            onRequireAuth={requireAuth}
            onOpenCredits={() => setActiveView('credits')}
            onRefreshBalance={loadBackendData}
            initialGroupContext={groupStreamContext}
            onClearGroupContext={() => setGroupStreamContext(null)}
          />
        )}

        {/* VIEW 9: MULTIPLAYER CALL — LIVE ROOMS */}
        {activeView === 'rooms' && (
          <SeedanceRoomsView
            currentUser={currentUser}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            onRequireAuth={requireAuth}
          />
        )}

        {/* VIEW 10: COMMUNITY & GROUPS ECOSYSTEM */}
        {activeView === 'community' && (
          <SeedanceCommunityView
            currentUserId={currentUser?.id}
            currentCredits={balance?.balance_generate ?? 0}
            isAuthenticated={isAuthenticated}
            isPlatformAdmin={isAdmin}
            onRequireAuth={requireAuth}
            onOpenCredits={() => setActiveView('credits')}
            onRefreshBalance={loadBackendData}
            onImportWorkflowToGenerator={handleImportCommunityWorkflow}
            onLaunchGroupStream={handleLaunchGroupStream}
          />
        )}

        {/* VIEW 11: CURATED GALLERY & PRIVATE VAULT */}
        {activeView === 'curated' && (
          <SeedanceCuratedView
            currentUserId={currentUser?.id}
            isAuthenticated={isAuthenticated}
            isAdmin={isAdmin}
            initialEnvironment={curatedEnv}
            onRequireAuth={requireAuth}
            onReusePromptInGenerator={(creation: UserCreation) => {
              if (creation.prompt) setGeneratorPrompt(creation.prompt);
              if (creation.aspectRatio) setGeneratorAspect(creation.aspectRatio);
              setActiveView('generator');
            }}
          />
        )}

        {/* VIEW 10: ACCOUNT & API TELEMETRY */}
        {activeView === 'account' && (
          <SeedanceAccountApiView
            balance={balance}
            health={health}
            isAuthenticated={isAuthenticated}
            onRefresh={loadBackendData}
            onOpenPlans={() => setActiveView('plans')}
            onOpenCredits={() => setActiveView('credits')}
            onRequireAuth={requireAuth}
            isRefreshing={isRefreshing}
          />
        )}

        {/* VIEW 10b: REAL-TIME BACKEND CONNECTION TEST */}
        {activeView === 'backend-test' && (
          <SeedanceBackendTestView
            isAuthenticated={isAuthenticated}
            health={health}
            onRequireAuth={requireAuth}
            onOpenAccount={() => setActiveView('account')}
          />
        )}

        {/* VIEW 11: ADMIN PLATFORM GOVERNANCE */}
        {activeView === 'admin' && isAdmin && (
          <SeedanceAdminView
            isAdmin={isAdmin}
            onPlatformConfigUpdated={loadBackendData}
          />
        )}
      </main>
    </div>
  );
};
