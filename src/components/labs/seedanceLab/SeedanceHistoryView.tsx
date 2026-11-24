/**
 * VAIURE — SEEDANCE LAB UNIFIED MY GENERATIONS GALLERY
 * Monochromatic Production Render History & Live Multi-Provider Archive
 * Combines ByteDance Official & MUAPI Seedance 2.5 Spicy generations with:
 * - Real-time / 5s auto-polling for pending & processing jobs
 * - Draft vs Final filtering, Provider filtering, Status filtering
 * - Direct 1-click "Finalize Draft -> 1080p" workflow & Details inspection modal
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Download,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Search,
  Film,
  X,
  ArrowRight,
  Sparkles,
  Info,
  Volume2,
  VolumeX,
  Camera,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { SeedanceHistoryItem, seedanceLabService } from '../../../services/seedanceLabService';
import { GenerationResolution, UnifiedGenerationJob } from '../../../types/multiProvider';
import { multiProviderGenerationService } from '../../../services/multiProviderGenerationService';

interface SeedanceHistoryViewProps {
  history: SeedanceHistoryItem[];
  unifiedJobs?: UnifiedGenerationJob[];
  onRefresh: () => void;
  onUnifiedJobUpdated?: (job: UnifiedGenerationJob) => void;
  onReuseInGenerator: (item: SeedanceHistoryItem) => void;
  onReuseUnifiedJob?: (job: UnifiedGenerationJob) => void;
  onOpenGeneratorWithDraftFinalize?: (draftJob: UnifiedGenerationJob) => void;
}

function legacyToUnifiedJob(item: SeedanceHistoryItem): UnifiedGenerationJob {
  const normalizedStatus = (item.status || 'completed').toLowerCase();
  const status: UnifiedGenerationJob['status'] =
    normalizedStatus === 'completed' || normalizedStatus === 'succeeded'
      ? 'completed'
      : normalizedStatus === 'failed'
      ? 'failed'
      : normalizedStatus === 'queued' || normalizedStatus === 'pending'
      ? 'pending'
      : 'processing';

  const duration = item.model?.includes('30s') ? 30 : 15;
  const rawRes = String(item.parameters?.resolution || '720p').toLowerCase();
  const resolution: GenerationResolution =
    rawRes === '480p' ? '480p' : rawRes === '1080p' ? '1080p' : rawRes === '4k' ? '4K' : '720p';

  return {
    job_id: item.job_code || item.id,
    user_id: '',
    provider: 'bytedance',
    model_id: item.model || 'seedance_25_15s',
    model_name: item.model || 'Seedance 2.5',
    request_id: item.job_code || null,
    parent_draft_job_id: null,
    prompt: item.prompt || '',
    image_url: null,
    last_image: null,
    reference_image_urls: Array.isArray(item.parameters?.reference_image_urls)
      ? (item.parameters.reference_image_urls as string[])
      : undefined,
    aspect_ratio: item.parameters?.aspect_ratio ? String(item.parameters.aspect_ratio) : '16:9',
    resolution,
    duration,
    generate_audio: true,
    camera_fixed: false,
    high_bitrate: false,
    draft: false,
    draft_request_id: null,
    estimated_cost: item.cost_generate || 0,
    credits_deducted: item.cost_generate || 0,
    currency: 'CREDITS',
    status,
    progress: status === 'completed' ? 100 : status === 'failed' ? 0 : 40,
    provider_output_url: item.result_url || null,
    firebase_storage_path: null,
    playback_url: item.result_url || null,
    error: null,
    created_at: item.created_at,
    updated_at: item.created_at,
    completed_at: status === 'completed' ? item.created_at : null,
  };
}

function isVideoPlaybackUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith('/api/generated-media/') ||
    trimmed.startsWith('/uploads/') ||
    trimmed.includes('.mp4') ||
    trimmed.includes('.webm') ||
    trimmed.includes('.mov') ||
    trimmed.includes('firebasestorage.googleapis.com') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  );
}

export const SeedanceHistoryView: React.FC<SeedanceHistoryViewProps> = ({
  history,
  unifiedJobs = [],
  onRefresh,
  onUnifiedJobUpdated,
  onReuseInGenerator,
  onReuseUnifiedJob,
  onOpenGeneratorWithDraftFinalize,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'bytedance' | 'muapi'>('all');
  const [filterType, setFilterType] = useState<'all' | 'draft' | 'final'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');

  const [activePlaybackJob, setActivePlaybackJob] = useState<UnifiedGenerationJob | null>(null);
  const [detailsModalJob, setDetailsModalJob] = useState<UnifiedGenerationJob | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [finalizingDraftId, setFinalizingDraftId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Merge unifiedJobs (preferred, richer) + legacy history fallback (deduplicated)
  const mergedJobs = useMemo(() => {
    const byKey = new Map<string, { job: UnifiedGenerationJob; isUnified: boolean; legacyItem?: SeedanceHistoryItem }>();

    for (const uj of unifiedJobs) {
      byKey.set(uj.job_id, { job: uj, isUnified: true });
    }

    for (const item of history) {
      const key = item.job_code || item.id;
      if (!byKey.has(key)) {
        byKey.set(key, {
          job: legacyToUnifiedJob(item),
          isUnified: false,
          legacyItem: item,
        });
      }
    }

    return Array.from(byKey.values()).sort(
      (a, b) =>
        new Date(b.job.created_at).getTime() - new Date(a.job.created_at).getTime()
    );
  }, [unifiedJobs, history]);

  // Auto-poll any active unified jobs every 5 seconds
  const activePollSignature = useMemo(
    () =>
      mergedJobs
        .filter(
          (entry) =>
            entry.isUnified &&
            (entry.job.status === 'pending' || entry.job.status === 'processing')
        )
        .map((entry) => entry.job.job_id)
        .join(','),
    [mergedJobs]
  );

  useEffect(() => {
    if (!activePollSignature) return;
    const activeIds = activePollSignature.split(',').filter(Boolean);

    const tick = async () => {
      for (const jobId of activeIds) {
        try {
          const updated = await multiProviderGenerationService.getJobStatus(jobId);
          onUnifiedJobUpdated?.(updated);
        } catch {
          // Transient polling error will retry next cycle
        }
      }
    };

    const timer = window.setInterval(tick, 3000);
    return () => window.clearInterval(timer);
  }, [activePollSignature, onUnifiedJobUpdated]);

  useEffect(() => {
    if (!activePlaybackJob && !detailsModalJob) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePlaybackJob(null);
        setDetailsModalJob(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePlaybackJob, detailsModalJob]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const handleConfirmDelete = async (entry: {
    job: UnifiedGenerationJob;
    isUnified: boolean;
    legacyItem?: SeedanceHistoryItem;
  }) => {
    const id = entry.job.job_id;
    setIsDeletingId(id);
    try {
      if (entry.isUnified) {
        await multiProviderGenerationService.deleteJob(id);
      } else if (entry.legacyItem) {
        await seedanceLabService.deleteHistoryEntry(entry.legacyItem.id || entry.legacyItem.job_code);
      }
      setConfirmDeleteId(null);
      onRefresh();
    } catch (err: any) {
      setActionFeedback({ type: 'err', msg: err?.message || 'Unable to delete generation.' });
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDirectFinalizeDraft = async (draftJob: UnifiedGenerationJob) => {
    setFinalizingDraftId(draftJob.job_id);
    setActionFeedback(null);
    try {
      const res = await multiProviderGenerationService.finalizeDraft(draftJob.job_id, {
        resolution: '1080p',
      });
      onUnifiedJobUpdated?.(res.job);
      onRefresh();
      setActionFeedback({
        type: 'ok',
        msg: `Finalization job ${res.job.job_id} submitted at 1080p from draft ${draftJob.request_id || draftJob.job_id}.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'err',
        msg: err?.message || 'Unable to finalize draft at this time.',
      });
    } finally {
      setFinalizingDraftId(null);
    }
  };

  const filteredEntries = mergedJobs.filter(({ job }) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (job.prompt && job.prompt.toLowerCase().includes(q)) ||
      job.job_id.toLowerCase().includes(q) ||
      (job.request_id && job.request_id.toLowerCase().includes(q)) ||
      (job.model_name && job.model_name.toLowerCase().includes(q));

    const provLower = String(job.provider || 'bytedance').toLowerCase();
    const matchesProvider =
      filterProvider === 'all' ||
      (filterProvider === 'bytedance' && provLower === 'bytedance') ||
      (filterProvider === 'muapi' && provLower !== 'bytedance');

    const matchesType =
      filterType === 'all' ||
      (filterType === 'draft' && job.draft) ||
      (filterType === 'final' && !job.draft);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'completed' && job.status === 'completed') ||
      (filterStatus === 'processing' && (job.status === 'pending' || job.status === 'processing')) ||
      (filterStatus === 'failed' && job.status === 'failed');

    return matchesSearch && matchesProvider && matchesType && matchesStatus;
  });

  const handleTriggerReuse = (entry: {
    job: UnifiedGenerationJob;
    isUnified: boolean;
    legacyItem?: SeedanceHistoryItem;
  }) => {
    if (onReuseUnifiedJob) {
      onReuseUnifiedJob(entry.job);
      return;
    }
    if (entry.legacyItem) {
      onReuseInGenerator(entry.legacyItem);
      return;
    }
    onReuseInGenerator({
      id: entry.job.job_id,
      job_code: entry.job.job_id,
      model: entry.job.model_id,
      prompt: entry.job.prompt,
      parameters: {
        aspect_ratio: entry.job.aspect_ratio || '16:9',
        resolution: entry.job.resolution,
        reference_image_urls: entry.job.reference_image_urls || (entry.job.image_url ? [entry.job.image_url] : []),
      },
      status: entry.job.status,
      result_url: entry.job.playback_url || entry.job.provider_output_url,
      cost_generate: entry.job.credits_deducted || 0,
      created_at: entry.job.created_at,
    });
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1560px] mx-auto space-y-6 pb-20">
        {/* Header & Filters Strip */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <h1 className="text-lg font-semibold tracking-tight uppercase font-mono text-white">
                  My Generations
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/75">
                  {mergedJobs.length} Total Jobs
                </span>
                {activePollSignature && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-black font-semibold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Auto-Polling Active
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60 mt-1">
                Unified production gallery across ByteDance Official and MUAPI Seedance 2.5 Spicy (Drafts, Final 1080p/4K renders &amp; durable storage).
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.045] hover:bg-white/[0.09] text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white/75" />
              <span>Sync Archive</span>
            </button>
          </div>

          {actionFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between gap-3 ${
                actionFeedback.type === 'ok'
                  ? 'border-white/25 bg-white/[0.06] text-white'
                  : 'border-white/20 bg-white/[0.04] text-white/90'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{actionFeedback.msg}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Search & Multi-Axis Filters */}
          <div className="flex flex-col gap-3 pt-2 border-t border-white/[0.08]">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by prompt, job_id, request_id, or model..."
                  className="w-full min-h-[40px] pl-9 pr-4 py-2 rounded-xl border border-white/[0.1] bg-black/60 text-xs text-white placeholder-white/35 focus:outline-none focus:border-white transition-all font-sans"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-mono">
                {(
                  [
                    { id: 'all', label: 'All Status' },
                    { id: 'completed', label: 'Completed' },
                    { id: 'processing', label: 'Active' },
                    { id: 'failed', label: 'Failed' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setFilterStatus(st.id)}
                    className={`min-h-[34px] px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      filterStatus === st.id
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All Providers' },
                    { id: 'bytedance', label: 'ByteDance Official' },
                    { id: 'muapi', label: 'MUAPI Spicy' },
                  ] as const
                ).map((pv) => (
                  <button
                    key={pv.id}
                    type="button"
                    onClick={() => setFilterProvider(pv.id)}
                    className={`min-h-[32px] px-3 py-1 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      filterProvider === pv.id
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                    }`}
                  >
                    {pv.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'All Types' },
                    { id: 'draft', label: 'Drafts Only' },
                    { id: 'final', label: 'Final Videos' },
                  ] as const
                ).map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() => setFilterType(tp.id)}
                    className={`min-h-[32px] px-3 py-1 rounded-lg border text-[11px] whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                      filterType === tp.id
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white'
                    }`}
                  >
                    {tp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Generations Grid */}
        {filteredEntries.length === 0 ? (
          <div className="p-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-center space-y-3">
            <Film className="w-8 h-8 text-white/30 mx-auto" />
            <div className="text-sm font-medium text-white/80">No Matching Generations Found</div>
            <p className="text-xs text-white/50 max-w-sm mx-auto">
              No generation records match your current provider, type, or status filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEntries.map((entry) => {
              const { job } = entry;
              const videoUrl = job.playback_url || job.provider_output_url;
              const hasVideo = isVideoPlaybackUrl(videoUrl) && job.status === 'completed';
              const isMuapi = String(job.provider).toLowerCase() !== 'bytedance';
              const canFinalizeDraft =
                isMuapi &&
                job.draft &&
                job.status === 'completed' &&
                Boolean(job.request_id || job.draft_request_id);

              return (
                <div
                  key={job.job_id}
                  className="rounded-2xl border border-white/[0.1] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] p-4 space-y-3.5 transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Media Preview */}
                    <div
                      onClick={() => hasVideo && setActivePlaybackJob(job)}
                      className={`w-full aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.08] relative flex items-center justify-center ${
                        hasVideo ? 'cursor-pointer' : ''
                      }`}
                    >
                      {hasVideo ? (
                        <video
                          src={videoUrl!}
                          preload="metadata"
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : job.status === 'pending' || job.status === 'processing' ? (
                        <div className="flex flex-col items-center gap-2 text-white/75 p-4 text-center">
                          <RefreshCw className="w-6 h-6 animate-spin" />
                          <span className="text-[11px] font-mono uppercase">
                            {job.status} · {job.progress || 0}%
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-white/40 p-4 text-center">
                          <Film className="w-6 h-6" />
                          <span className="text-[10px] font-mono">
                            {job.status === 'failed' ? 'Generation Failed' : job.model_name}
                          </span>
                        </div>
                      )}

                      {hasVideo && (
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="p-2.5 rounded-full bg-white text-black shadow-lg">
                            <Play className="w-4 h-4 fill-black" />
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded bg-black/85 border border-white/15 text-[9px] font-mono font-semibold text-white uppercase">
                          {job.provider}
                        </span>
                        {job.draft ? (
                          <span className="px-2 py-0.5 rounded bg-white text-black text-[9px] font-mono font-bold uppercase">
                            DRAFT
                          </span>
                        ) : job.parent_draft_job_id ? (
                          <span className="px-2 py-0.5 rounded bg-black/85 border border-white/25 text-[9px] font-mono text-white uppercase">
                            FINALIZED
                          </span>
                        ) : null}
                      </div>

                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/85 border border-white/15 text-[9px] font-mono text-white/90 uppercase">
                        {job.status}
                      </div>
                    </div>

                    {/* Identifiers & Timestamp */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-white/55">
                      <span className="truncate max-w-[180px]" title={job.job_id}>
                        {job.model_name}
                      </span>
                      <span>{new Date(job.created_at).toLocaleString()}</span>
                    </div>

                    {/* Prompt */}
                    <p className="text-xs text-white/85 line-clamp-3 font-sans leading-relaxed">
                      {job.prompt || 'No prompt recorded'}
                    </p>

                    {job.status === 'failed' && job.error && (
                      <div className="p-2 rounded-lg border border-white/15 bg-black/60 text-[10px] font-mono text-white/75 line-clamp-2">
                        Error: {job.error}
                      </div>
                    )}

                    {/* Technical Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-white/70">
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-white font-semibold">
                        {job.resolution}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08]">
                        {job.duration}s
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] flex items-center gap-1">
                        {job.generate_audio ? (
                          <>
                            <Volume2 className="w-2.5 h-2.5" /> Audio ON
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-2.5 h-2.5" /> Audio OFF
                          </>
                        )}
                      </span>
                      {job.camera_fixed && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] flex items-center gap-1">
                          <Camera className="w-2.5 h-2.5" /> Fixed
                        </span>
                      )}
                      {job.high_bitrate && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] flex items-center gap-1">
                          <Sliders className="w-2.5 h-2.5" /> Hi-Bitrate
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.14] text-white font-semibold tabular-nums">
                        {job.currency === 'USD'
                          ? `$${Number(job.estimated_cost || 0).toFixed(2)} USD`
                          : `${job.credits_deducted || job.estimated_cost || 0} CR`}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-white/[0.08] space-y-2">
                    {canFinalizeDraft && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDirectFinalizeDraft(job)}
                          disabled={finalizingDraftId === job.job_id}
                          className="flex-1 min-h-[34px] px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-mono font-bold uppercase tracking-wider hover:bg-white/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {finalizingDraftId === job.job_id
                              ? 'Finalizing...'
                              : 'Finalize Draft -> 1080p'}
                          </span>
                        </button>
                        {onOpenGeneratorWithDraftFinalize && (
                          <button
                            type="button"
                            onClick={() => onOpenGeneratorWithDraftFinalize(job)}
                            title="Load draft ID in Generator"
                            className="min-h-[34px] px-2.5 py-1.5 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-white text-[10px] font-mono uppercase cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleTriggerReuse(entry)}
                        className="min-h-[34px] px-3 py-1.5 rounded-lg border border-white/[0.16] bg-white/[0.06] hover:bg-white text-white hover:text-black text-[11px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>Reuse</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailsModalJob(job)}
                          title="Inspect technical job details"
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-white/75 hover:text-white transition-all cursor-pointer"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>

                        {job.prompt && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(job.job_id, job.prompt)}
                            title="Copy prompt"
                            className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
                          >
                            {copiedId === job.job_id ? (
                              <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

                        {hasVideo && (
                          <a
                            href={videoUrl!}
                            download={`vaiure_${job.provider}_${job.job_id}.mp4`}
                            title="Download MP4"
                            className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {confirmDeleteId === job.job_id ? (
                          <div className="flex items-center gap-1 pl-1">
                            <button
                              type="button"
                              onClick={() => handleConfirmDelete(entry)}
                              disabled={isDeletingId === job.job_id}
                              className="min-h-[34px] px-2.5 rounded-lg bg-white text-black text-[10px] font-mono font-bold uppercase cursor-pointer hover:bg-white/90"
                            >
                              {isDeletingId === job.job_id ? '...' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[34px] px-2 rounded-lg border border-white/15 text-white/60 hover:text-white text-[10px] font-mono uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(job.job_id)}
                            title="Delete generation"
                            className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.1] text-white/50 hover:text-white transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Video Playback Modal */}
      {activePlaybackJob && (
        <div
          onClick={() => setActivePlaybackJob(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl w-full rounded-2xl border border-white/20 bg-neutral-950 overflow-hidden shadow-2xl space-y-4 p-5 cursor-default"
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-white text-black font-bold uppercase">
                  {activePlaybackJob.provider}
                </span>
                <span className="text-white font-semibold">
                  {activePlaybackJob.model_name} · {activePlaybackJob.resolution} · {activePlaybackJob.duration}s
                </span>
                {activePlaybackJob.draft && (
                  <span className="px-2 py-0.5 rounded border border-white/25 text-white/80 uppercase">
                    DRAFT
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActivePlaybackJob(null)}
                className="p-1 rounded-full text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/10">
              <video
                src={(activePlaybackJob.playback_url || activePlaybackJob.provider_output_url)!}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <p className="text-xs text-white/80 font-sans leading-relaxed">
              {activePlaybackJob.prompt}
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-white/10">
              {String(activePlaybackJob.provider).toLowerCase() !== 'bytedance' &&
                activePlaybackJob.draft &&
                activePlaybackJob.status === 'completed' && (
                  <button
                    type="button"
                    onClick={() => {
                      void handleDirectFinalizeDraft(activePlaybackJob);
                      setActivePlaybackJob(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Finalize Draft -&gt; 1080p</span>
                  </button>
                )}
              <a
                href={(activePlaybackJob.playback_url || activePlaybackJob.provider_output_url)!}
                download={`vaiure_${activePlaybackJob.provider}_${activePlaybackJob.job_id}.mp4`}
                className="px-4 py-2 rounded-lg border border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-medium uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Technical Details Modal */}
      {detailsModalJob && (
        <div
          onClick={() => setDetailsModalJob(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full rounded-2xl border border-white/20 bg-neutral-950 p-5 space-y-4 text-xs font-mono cursor-default max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-semibold uppercase text-white">
                Generation Technical Record
              </span>
              <button
                type="button"
                onClick={() => setDetailsModalJob(null)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Job ID</div>
                <div className="text-white break-all">{detailsModalJob.job_id}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Provider / Model</div>
                <div className="text-white break-all">
                  {detailsModalJob.provider} · {detailsModalJob.model_id}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Provider Request ID</div>
                <div className="text-white break-all">{detailsModalJob.request_id || '—'}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Draft Request / Parent Job</div>
                <div className="text-white break-all">
                  {detailsModalJob.draft_request_id || detailsModalJob.parent_draft_job_id || '—'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Specs</div>
                <div className="text-white">
                  {detailsModalJob.resolution} · {detailsModalJob.duration}s · Audio:{' '}
                  {detailsModalJob.generate_audio ? 'ON' : 'OFF'} · Fixed:{' '}
                  {detailsModalJob.camera_fixed ? 'YES' : 'NO'} · High Bitrate:{' '}
                  {detailsModalJob.high_bitrate ? 'YES' : 'NO'}
                </div>
              </div>
              <div className="p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Cost & Billing</div>
                <div className="text-white">
                  {detailsModalJob.currency === 'USD'
                    ? `$${Number(detailsModalJob.estimated_cost || 0).toFixed(2)} USD`
                    : `${detailsModalJob.credits_deducted || detailsModalJob.estimated_cost || 0} CREDITS`}
                  {typeof detailsModalJob.provider_cost_usd === 'number' &&
                    ` (Provider: $${detailsModalJob.provider_cost_usd.toFixed(2)} · Markup: $${Number(
                      detailsModalJob.markup_usd || 0
                    ).toFixed(2)})`}
                </div>
              </div>
              <div className="sm:col-span-2 p-2.5 rounded-lg border border-white/10 bg-black/60">
                <div className="text-white/45 uppercase">Storage Path & Playback URL</div>
                <div className="text-white/80 break-all">
                  Storage: {detailsModalJob.firebase_storage_path || 'Local protected vault'}
                </div>
                <div className="text-white/80 break-all mt-1">
                  Playback: {detailsModalJob.playback_url || detailsModalJob.provider_output_url || 'Pending'}
                </div>
              </div>
              {detailsModalJob.error && (
                <div className="sm:col-span-2 p-2.5 rounded-lg border border-white/20 bg-black text-white">
                  <div className="text-white/50 uppercase">Error</div>
                  <div className="break-all">{detailsModalJob.error}</div>
                </div>
              )}

              {Array.isArray(detailsModalJob.backend_traces) &&
                detailsModalJob.backend_traces.length > 0 && (
                  <div className="sm:col-span-2 p-3 rounded-xl border border-white/15 bg-black/70 space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                      <span className="text-white/60 uppercase text-[10px]">
                        Backend Process Calls ({detailsModalJob.backend_traces.length})
                      </span>
                      <span className="text-[10px] text-white/50 uppercase">
                        {detailsModalJob.webhook_enabled ? 'Webhook + 3s Poll' : '3s Real-Time Poll'}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {detailsModalJob.backend_traces.map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className="p-2 rounded-lg border border-white/10 bg-white/[0.03] space-y-1 text-[10px]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold">
                                {idx + 1}. {step.stage}
                              </span>
                              <span className="text-white/80 font-semibold">{step.method}</span>
                              {typeof step.statusCode === 'number' && (
                                <span className="px-1.5 py-0.5 rounded border border-white/20 text-white">
                                  HTTP {step.statusCode}
                                </span>
                              )}
                            </div>
                            <span className="text-white/45 tabular-nums">
                              {new Date(step.timestamp).toLocaleTimeString()}
                              {typeof step.latencyMs === 'number' ? ` · ${step.latencyMs}ms` : ''}
                            </span>
                          </div>
                          {step.endpoint && (
                            <div className="text-white/55 break-all">{step.endpoint}</div>
                          )}
                          <div className="text-white/90">{step.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
