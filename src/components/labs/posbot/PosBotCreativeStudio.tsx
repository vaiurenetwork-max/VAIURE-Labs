/**
 * Slide 4 — AI Creative Studio Powered by PosBot Developer API
 * Complete 11-Section Production Studio:
 * 1. AI Dashboard
 * 2. Video Studio (incl. Specialized Seedance 2.5 Video Studio)
 * 3. Image Studio (13 Synthesis Models + Face Swap & Upscale 4K)
 * 4. Character and Reference Studio
 * 5. Motion Control (Motion Transfer, R2V, 2K 60fps Upscale, Watermark Remover)
 * 6. Lip-Sync Studio (MiniMax LipSync, LTX LipSync)
 * 7. AI Voice Studio (Google TTS — 8 Voices)
 * 8. AI Music Studio (8 Music Models + Structured Lyrics + Instrumental Toggle)
 * 9. Generation History
 * 10. Account Balance
 * 11. API and System Status
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  LayoutDashboard,
  Film,
  Image as ImageIcon,
  Users,
  Move,
  Mic2,
  Volume2,
  Music,
  History,
  Wallet,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Download,
  Upload,
  Wand2,
  Search,
  ShieldCheck,
  Clock,
  X,
  Eye,
  Car,
} from 'lucide-react';
import { PosBotStudioSectionId, GOOGLE_TTS_VOICES } from '../../../server/posbotSchema';
import {
  PosBotCatalogModel,
  PosBotHealthData,
  PosBotBalanceData,
  PosBotJobRecord,
  SeedanceCharacterProfile,
  SeedanceVehicleConstraint,
  DEFAULT_SEEDANCE_CHARACTERS,
  DEFAULT_VEHICLE_CONSTRAINT,
} from './posbotTypes';
import { Seedance25StudioPanel } from './Seedance25StudioPanel';

interface PosBotCreativeStudioProps {
  onSwitchToLegacyStudio?: () => void;
  onOpenRooms?: () => void;
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
}

const SECTION_NAV: Array<{
  id: PosBotStudioSectionId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'AI Dashboard', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'video-studio', label: 'Video Studio', shortLabel: 'Video', icon: Film },
  { id: 'image-studio', label: 'Image Studio', shortLabel: 'Image', icon: ImageIcon },
  {
    id: 'character-reference',
    label: 'Character & Reference Studio',
    shortLabel: 'Continuity',
    icon: Users,
  },
  { id: 'motion-control', label: 'Motion Control', shortLabel: 'Motion/R2V', icon: Move },
  { id: 'lipsync-studio', label: 'Lip-Sync Studio', shortLabel: 'Lip-Sync', icon: Mic2 },
  { id: 'voice-studio', label: 'AI Voice Studio', shortLabel: 'Voice/TTS', icon: Volume2 },
  { id: 'music-studio', label: 'AI Music Studio', shortLabel: 'Music', icon: Music },
  { id: 'history', label: 'Generation History', shortLabel: 'History', icon: History },
  { id: 'balance', label: 'Account Balance', shortLabel: 'Balance', icon: Wallet },
  { id: 'system-status', label: 'API & System Status', shortLabel: 'API Status', icon: Activity },
];

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export const PosBotCreativeStudio: React.FC<PosBotCreativeStudioProps> = ({
  onSwitchToLegacyStudio,
  onOpenRooms,
}) => {
  const [activeSection, setActiveSection] = useState<PosBotStudioSectionId>('dashboard');

  // API State
  const [health, setHealth] = useState<PosBotHealthData | null>(null);
  const [models, setModels] = useState<PosBotCatalogModel[]>([]);
  const [catalogSource, setCatalogSource] = useState<'live' | 'documented_reference'>(
    'documented_reference'
  );
  const [catalogNotice, setCatalogNotice] = useState<string | null>(null);
  const [balance, setBalance] = useState<PosBotBalanceData | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<PosBotJobRecord[]>([]);

  const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    jobCode?: string;
  } | null>(null);

  // Continuity State (Characters, Vehicle LHD/RHD Lock, Saved Public Reference URLs)
  const [characters, setCharacters] = useState<SeedanceCharacterProfile[]>(() => {
    try {
      const saved = localStorage.getItem('vaiure_posbot_characters');
      return saved ? JSON.parse(saved) : DEFAULT_SEEDANCE_CHARACTERS;
    } catch {
      return DEFAULT_SEEDANCE_CHARACTERS;
    }
  });

  const [vehicleConstraint, setVehicleConstraint] = useState<SeedanceVehicleConstraint>(() => {
    try {
      const saved = localStorage.getItem('vaiure_posbot_vehicle');
      return saved ? JSON.parse(saved) : DEFAULT_VEHICLE_CONSTRAINT;
    } catch {
      return DEFAULT_VEHICLE_CONSTRAINT;
    }
  });

  const [savedReferenceUrls, setSavedReferenceUrls] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vaiure_posbot_ref_urls');
      return saved
        ? JSON.parse(saved)
        : [
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
          ];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('vaiure_posbot_characters', JSON.stringify(characters));
    } catch {
      // ignore
    }
  }, [characters]);

  useEffect(() => {
    try {
      localStorage.setItem('vaiure_posbot_vehicle', JSON.stringify(vehicleConstraint));
    } catch {
      // ignore
    }
  }, [vehicleConstraint]);

  useEffect(() => {
    try {
      localStorage.setItem('vaiure_posbot_ref_urls', JSON.stringify(savedReferenceUrls));
    } catch {
      // ignore
    }
  }, [savedReferenceUrls]);

  // ============================================================================
  // FETCH HEALTH, MODELS, BALANCE, AND PERSISTED HISTORY
  // ============================================================================
  const fetchHealthAndModels = useCallback(async () => {
    try {
      const [healthRes, modelsRes, historyRes] = await Promise.all([
        fetch('/api/ai/health'),
        fetch('/api/ai/models'),
        fetch('/api/ai/history'),
      ]);

      const healthJson = await healthRes.json();
      setHealth(healthJson);

      const modelsJson = await modelsRes.json();
      if (Array.isArray(modelsJson.models)) {
        setModels(modelsJson.models);
        setCatalogSource(modelsJson.source || 'documented_reference');
        setCatalogNotice(modelsJson.liveError || null);
      }

      const historyJson = await historyRes.json();
      if (Array.isArray(historyJson.items)) {
        setJobs(historyJson.items);
      }
    } catch (err: unknown) {
      setHealth({
        ok: false,
        serverKeyConfigured: false,
        serverKeyStatus: 'Network error contacting backend',
        baseUrl: 'https://api.posbot.web.id/api/v1',
        error: err instanceof Error ? err.message : 'Failed to load studio state',
      });
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setIsRefreshingBalance(true);
    try {
      const res = await fetch('/api/ai/balance');
      const data = await res.json();
      if (res.ok && data.ok) {
        setBalance(data);
        setBalanceError(null);
      } else {
        setBalance(null);
        setBalanceError(data.error || 'Unable to load live balance.');
      }
    } catch (err: unknown) {
      setBalanceError(err instanceof Error ? err.message : 'Network error loading balance');
    } finally {
      setIsRefreshingBalance(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoadingInitial(true);
      await Promise.all([fetchHealthAndModels(), fetchBalance()]);
      if (mounted) setIsLoadingInitial(false);
    })();
    return () => {
      mounted = false;
    };
  }, [fetchHealthAndModels, fetchBalance]);

  // ============================================================================
  // POLLING ENGINE (EVERY 6 SECONDS FOR NON-TERMINAL JOBS ONLY)
  // ============================================================================
  const jobsRef = useRef<PosBotJobRecord[]>(jobs);
  jobsRef.current = jobs;

  const pollSingleJob = useCallback(
    async (jobCode: string) => {
      try {
        const res = await fetch(`/api/ai/jobs/${encodeURIComponent(jobCode)}`);
        const data = await res.json();
        if (res.ok && data.ok) {
          setJobs((prev) =>
            prev.map((j) =>
              j.job_code === jobCode
                ? {
                    ...j,
                    status: data.status || j.status,
                    result_url: data.result_url ?? j.result_url,
                    error_message: data.error_message ?? j.error_message,
                    cost_generate: data.cost_generate ?? j.cost_generate,
                    updated_at: data.updated_at || new Date().toISOString(),
                  }
                : j
            )
          );
          if (TERMINAL_STATUSES.has(String(data.status || '').toLowerCase())) {
            fetchBalance();
          }
        }
      } catch {
        // Keep existing job state until next poll
      }
    },
    [fetchBalance]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const activeJobs = jobsRef.current.filter(
        (j) => !TERMINAL_STATUSES.has(String(j.status || '').toLowerCase())
      );
      if (activeJobs.length === 0) return;
      activeJobs.slice(0, 5).forEach((job) => {
        pollSingleJob(job.job_code);
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [pollSingleJob]);

  // ============================================================================
  // UPLOAD LOCAL MEDIA HELPER -> RETURNS PUBLIC HTTP/HTTPS URL
  // ============================================================================
  const handleUploadLocalMedia = useCallback(async (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = String(reader.result || '');
          const res = await fetch('/api/ai/upload-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, fileName: file.name }),
          });
          const data = await res.json();
          if (res.ok && data.ok && data.url) {
            if (data.warning) {
              setSubmissionFeedback({
                type: 'error',
                message: data.warning,
              });
            }
            resolve(data.url);
          } else {
            setSubmissionFeedback({
              type: 'error',
              message: data.error || 'Failed to upload media file.',
            });
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, []);

  // ============================================================================
  // CENTRAL GENERATION SUBMISSION HANDLER
  // ============================================================================
  const handleSubmitGenerate = useCallback(
    async (payload: Record<string, unknown>) => {
      setIsSubmitting(true);
      setSubmissionFeedback(null);
      try {
        const res = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setSubmissionFeedback({
            type: 'error',
            message: data.error || 'Generation request failed.',
          });
          return;
        }

        if (data.historyEntry) {
          setJobs((prev) => [data.historyEntry, ...prev.filter((j) => j.job_code !== data.job_code)]);
        }

        if (typeof data.remaining_balance_generate === 'number') {
          setBalance((prev) =>
            prev
              ? {
                  ...prev,
                  balance_generate: data.remaining_balance_generate,
                  balance_idr_equivalent:
                    data.remaining_balance_generate * (prev.unit_value_idr || 400),
                }
              : prev
          );
        } else {
          fetchBalance();
        }

        setSubmissionFeedback({
          type: 'success',
          message: `Job submitted (${data.job_code}). Polling status every 6 seconds...`,
          jobCode: data.job_code,
        });
      } catch (err: unknown) {
        setSubmissionFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Network error submitting generation job.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchBalance]
  );

  // ============================================================================
  // GENERIC STUDIO WORKSPACE FORM STATE (FOR VIDEO, IMAGE, MOTION, LIPSYNC, VOICE, MUSIC)
  // ============================================================================
  const [videoSubTab, setVideoSubTab] = useState<'seedance25' | 'all-video'>('seedance25');
  const [imageSubTab, setImageSubTab] = useState<'synthesis' | 'edit'>('synthesis');

  const [selectedModelKey, setSelectedModelKey] = useState<string>('kling_30_5s');
  const [promptInput, setPromptInput] = useState<string>('');
  const [aspectRatioInput, setAspectRatioInput] = useState<string>('16:9');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [endImageUrlInput, setEndImageUrlInput] = useState<string>('');
  const [swapImageUrlInput, setSwapImageUrlInput] = useState<string>('');
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [audioUrlInput, setAudioUrlInput] = useState<string>('');
  const [multiImageUrls, setMultiImageUrls] = useState<string[]>([]);
  const [newMultiImageUrl, setNewMultiImageUrl] = useState<string>('');
  const [voiceInput, setVoiceInput] = useState<string>('Kore');
  const [lyricsInput, setLyricsInput] = useState<string>('');
  const [instrumentalInput, setInstrumentalInput] = useState<boolean>(false);

  // History Inspector & Filters
  const [historyFilter, setHistoryFilter] = useState<string>('all');
  const [inspectedJob, setInspectedJob] = useState<PosBotJobRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [catalogSearch, setCatalogSearch] = useState<string>('');

  // Auto-select appropriate default model when switching studio sections
  const handleSelectSection = (sectionId: PosBotStudioSectionId) => {
    setActiveSection(sectionId);
    setSubmissionFeedback(null);
    if (sectionId === 'video-studio') {
      setSelectedModelKey('kling_30_5s');
    } else if (sectionId === 'image-studio') {
      setSelectedModelKey(imageSubTab === 'edit' ? 'face_swap' : 'flux_2_pro');
    } else if (sectionId === 'motion-control') {
      setSelectedModelKey('kling_30_pro');
    } else if (sectionId === 'lipsync-studio') {
      setSelectedModelKey('minimax_lipsync');
    } else if (sectionId === 'voice-studio') {
      setSelectedModelKey('google_tts');
    } else if (sectionId === 'music-studio') {
      setSelectedModelKey('suno_v6');
    }
  };

  const currentModel = useMemo(
    () => models.find((m) => m.key === selectedModelKey) || models[0],
    [models, selectedModelKey]
  );

  const activeJobsCount = useMemo(
    () =>
      jobs.filter((j) => !TERMINAL_STATUSES.has(String(j.status || '').toLowerCase())).length,
    [jobs]
  );

  const handleGenericFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentModel) return;

    const payload: Record<string, unknown> = {
      model: currentModel.key,
    };

    if (promptInput.trim()) {
      payload.prompt = promptInput.trim();
    }
    if (currentModel.optionalFields.includes('aspect_ratio') && aspectRatioInput) {
      payload.aspect_ratio = aspectRatioInput;
    }
    if (imageUrlInput.trim()) {
      payload.image_url = imageUrlInput.trim();
    }
    if (endImageUrlInput.trim()) {
      payload.end_image_url = endImageUrlInput.trim();
    }
    if (swapImageUrlInput.trim()) {
      payload.swap_image = swapImageUrlInput.trim();
    }
    if (videoUrlInput.trim()) {
      payload.video_url = videoUrlInput.trim();
    }
    if (audioUrlInput.trim()) {
      payload.audio_url = audioUrlInput.trim();
    }
    if (multiImageUrls.length > 0) {
      payload.reference_image_urls = multiImageUrls;
      payload.image_urls = multiImageUrls;
      if (!payload.image_url) payload.image_url = multiImageUrls[0];
    }
    if (currentModel.key === 'google_tts') {
      payload.voice = voiceInput || 'Kore';
    }
    if (currentModel.category === 'Music') {
      if (lyricsInput.trim()) payload.lyrics = lyricsInput.trim();
      payload.instrumental = instrumentalInput;
    }

    await handleSubmitGenerate(payload);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/history/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setJobs(data.items);
      }
    } catch {
      // ignore
    }
  };

  // ============================================================================
  // RENDER REUSABLE MODEL FORM (FOR IMAGE, VIDEO, MOTION, LIPSYNC, VOICE, MUSIC)
  // ============================================================================
  const renderStandardModelStudio = (
    sectionTitle: string,
    sectionSubtitle: string,
    sectionModels: PosBotCatalogModel[]
  ) => {
    const selected =
      sectionModels.find((m) => m.key === selectedModelKey) || sectionModels[0];

    const needsPrompt = selected?.requiredFields.includes('prompt');
    const allowsPrompt =
      needsPrompt || selected?.optionalFields.includes('prompt');
    const needsImageUrl = selected?.requiredFields.includes('image_url');
    const allowsImageUrl =
      needsImageUrl || selected?.optionalFields.includes('image_url');
    const allowsEndImageUrl = selected?.optionalFields.includes('end_image_url');
    const needsSwapImage = selected?.requiredFields.includes('swap_image');
    const needsVideoUrl = selected?.requiredFields.includes('video_url');
    const needsAudioUrl = selected?.requiredFields.includes('audio_url');
    const allowsMultiRefs =
      selected?.requiredFields.includes('reference_image_urls') ||
      selected?.optionalFields.includes('reference_image_urls') ||
      Boolean(selected?.maxImages && selected.maxImages > 1);
    const allowsAspectRatio = selected?.optionalFields.includes('aspect_ratio');
    const isVoiceModel = selected?.key === 'google_tts';
    const isMusicModel = selected?.category === 'Music';

    const maxChars = selected?.maxPromptLength || 2000;

    return (
      <div className="space-y-5">
        {/* SECTION HEADER */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">{sectionTitle}</h2>
            <p className="text-xs text-white/60 mt-0.5">{sectionSubtitle}</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
              {sectionModels.length} Models Available
            </span>
          </div>
        </div>

        {/* MODEL SELECTOR GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {sectionModels.map((m) => {
            const active = m.key === selected?.key;
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setSelectedModelKey(m.key)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  active
                    ? 'bg-cyan-500/15 border-cyan-400 shadow-lg shadow-cyan-500/10'
                    : 'bg-white/[0.025] border-white/10 hover:border-white/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-xs font-bold text-white truncate">
                      {m.name}
                    </div>
                    <div className="font-mono text-[10px] text-white/45 truncate mt-0.5">
                      {m.key}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                    {m.cost_generate} Gen
                  </span>
                </div>
                <p className="text-[11px] text-white/55 line-clamp-2">{m.notes}</p>
              </button>
            );
          })}
        </div>

        {/* CONFIGURATION & SUBMISSION FORM */}
        {selected && (
          <form
            onSubmit={handleGenericFormSubmit}
            className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          >
            <div className="lg:col-span-7 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <span className="font-mono text-xs text-cyan-300 font-bold uppercase">
                    Selected Engine: {selected.name}
                  </span>
                  <div className="font-mono text-[11px] text-white/45">
                    Key: <code>{selected.key}</code> · Cost: {selected.cost_generate} Generate (Rp{' '}
                    {selected.cost_idr.toLocaleString()})
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-white/70">
                  {selected.pricingSource === 'live_api' ? 'Live Pricing' : 'Documented Spec'}
                </span>
              </div>

              {/* PROMPT INPUT */}
              {allowsPrompt && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs text-white font-bold">
                      {isVoiceModel
                        ? 'Speech Text (Prompt)'
                        : isMusicModel
                        ? 'Musical Style, Genre & Mood Prompt'
                        : 'Generation Prompt'}{' '}
                      {needsPrompt && <span className="text-rose-400">*</span>}
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        promptInput.length > maxChars ? 'text-rose-400 font-bold' : 'text-white/50'
                      }`}
                    >
                      {promptInput.length.toLocaleString()} / {maxChars.toLocaleString()}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    required={needsPrompt}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder={
                      isVoiceModel
                        ? 'Enter the dialogue or narration to synthesize into speech...'
                        : isMusicModel
                        ? 'e.g., Cinematic synthwave electronic score, 122 BPM, analog arpeggios, warm sub-bass...'
                        : 'Describe subject, framing, lighting, camera motion, and atmosphere...'
                    }
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* ASPECT RATIO */}
              {allowsAspectRatio && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    Aspect Ratio
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(selected.aspectRatios || ['16:9', '9:16', '1:1', '4:3', '3:4']).map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setAspectRatioInput(ar)}
                        className={`px-3 py-1.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                          aspectRatioInput === ar
                            ? 'bg-cyan-400 text-black font-bold'
                            : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* VOICE SELECTOR FOR GOOGLE TTS */}
              {isVoiceModel && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    Voice Persona
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {GOOGLE_TTS_VOICES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setVoiceInput(v)}
                        className={`px-3 py-2 rounded-lg font-mono text-xs border transition-all cursor-pointer ${
                          voiceInput === v
                            ? 'bg-cyan-400 text-black border-cyan-300 font-bold'
                            : 'bg-black/40 border-white/10 text-white/75 hover:border-white/25'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* MUSIC LYRICS & INSTRUMENTAL TOGGLE */}
              {isMusicModel && (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs text-white font-bold">
                      Song Lyrics (Optional — Structured Tags Supported)
                    </label>
                    <label className="flex items-center gap-2 font-mono text-xs text-cyan-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instrumentalInput}
                        onChange={(e) => setInstrumentalInput(e.target.checked)}
                        className="accent-cyan-400"
                      />
                      Instrumental Only (No Vocals)
                    </label>
                  </div>

                  {!instrumentalInput && (
                    <>
                      <div className="flex flex-wrap gap-1.5">
                        {['[Intro]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]', '[Bridge]', '[Outro]'].map(
                          (tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                setLyricsInput((prev) =>
                                  prev ? `${prev}\n\n${tag}\n` : `${tag}\n`
                                )
                              }
                              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/15 font-mono text-[10px] text-cyan-300 cursor-pointer"
                            >
                              + {tag}
                            </button>
                          )
                        )}
                      </div>
                      <textarea
                        rows={5}
                        value={lyricsInput}
                        onChange={(e) => setLyricsInput(e.target.value)}
                        placeholder="[Verse 1]&#10;Neon reflections on the midnight asphalt...&#10;&#10;[Chorus]&#10;We outrun the horizon..."
                        className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                      />
                    </>
                  )}
                </div>
              )}

              {/* SINGLE IMAGE URL (image_url) */}
              {allowsImageUrl && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    {needsSwapImage
                      ? 'Target Base Image URL (image_url)'
                      : 'Source / First-Frame Image URL (image_url)'}{' '}
                    {needsImageUrl && <span className="text-rose-400">*</span>}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required={needsImageUrl}
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://example.com/public-image.jpg"
                      className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                    <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await handleUploadLocalMedia(f);
                          if (url) setImageUrlInput(url);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* END FRAME IMAGE URL (end_image_url for Kling 3.0) */}
              {allowsEndImageUrl && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    End-Frame Keyframe Image URL (end_image_url — Optional)
                  </label>
                  <input
                    type="url"
                    value={endImageUrlInput}
                    onChange={(e) => setEndImageUrlInput(e.target.value)}
                    placeholder="https://example.com/end-frame.jpg"
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              {/* FACE SWAP SOURCE FACE URL (swap_image) */}
              {needsSwapImage && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    Source Face Image URL (swap_image) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={swapImageUrlInput}
                      onChange={(e) => setSwapImageUrlInput(e.target.value)}
                      placeholder="https://example.com/source-face.jpg"
                      className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                    <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await handleUploadLocalMedia(f);
                          if (url) setSwapImageUrlInput(url);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* VIDEO URL (video_url for Motion Control, LipSync, Upscale 2K 60fps, Watermark Remover) */}
              {needsVideoUrl && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    Source / Reference Video URL (video_url){' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://example.com/reference-motion.mp4"
                      className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                    <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" /> Upload MP4
                      <input
                        type="file"
                        accept="video/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await handleUploadLocalMedia(f);
                          if (url) setVideoUrlInput(url);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* AUDIO URL (audio_url for LipSync) */}
              {needsAudioUrl && (
                <div className="space-y-1.5">
                  <label className="block font-mono text-xs text-white font-bold">
                    Synchronized Speech / Vocal Audio URL (audio_url){' '}
                    <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      value={audioUrlInput}
                      onChange={(e) => setAudioUrlInput(e.target.value)}
                      placeholder="https://example.com/dialogue-audio.mp3"
                      className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                    <label className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer shrink-0">
                      <Upload className="w-3.5 h-3.5" /> Upload Audio
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await handleUploadLocalMedia(f);
                          if (url) setAudioUrlInput(url);
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* MULTI-IMAGE REFERENCES (reference_image_urls / image_urls) */}
              {allowsMultiRefs && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-xs text-white font-bold">
                      Multi-Image References ({multiImageUrls.length} / {selected.maxImages || 9})
                    </label>
                    <span className="font-mono text-[10px] text-white/45">
                      Public HTTP/HTTPS URLs required
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newMultiImageUrl}
                      onChange={(e) => setNewMultiImageUrl(e.target.value)}
                      placeholder="https://example.com/ref-image.jpg"
                      className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = newMultiImageUrl.trim();
                        if (!trimmed) return;
                        const max = selected.maxImages || 9;
                        if (multiImageUrls.length < max && !multiImageUrls.includes(trimmed)) {
                          setMultiImageUrls([...multiImageUrls, trimmed]);
                          setNewMultiImageUrl('');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-mono text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {multiImageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {multiImageUrls.map((u, idx) => (
                        <div
                          key={u + idx}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white/80"
                        >
                          <span className="text-cyan-300">#{idx + 1}</span>
                          <span className="max-w-[180px] truncate">{u}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setMultiImageUrls(multiImageUrls.filter((_, i) => i !== idx))
                            }
                            className="text-rose-400 hover:text-rose-300 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || (allowsPrompt && promptInput.length > maxChars)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-40 text-black font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer transition-all"
              >
                <Wand2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Submitting to PosBot API...'
                  : `Generate with ${selected.name} (${selected.cost_generate} Gen)`}
              </button>
            </div>

            {/* RIGHT COLUMN (5 COLS): RECENT SECTION OUTPUTS & LIVE MONITOR */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  Recent {selected.category} Jobs
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSection('history')}
                  className="font-mono text-[11px] text-cyan-300 hover:underline cursor-pointer"
                >
                  View Full History →
                </button>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {jobs.slice(0, 6).map((job) => (
                  <div
                    key={job.id}
                    className="p-3 rounded-xl bg-black/50 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {job.model_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                          job.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : job.status === 'failed' || job.status === 'cancelled'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-white/45 flex items-center justify-between">
                      <span>Code: {job.job_code}</span>
                      <span>{job.cost_generate} Gen</span>
                    </div>
                    {job.prompt && (
                      <p className="text-[11px] text-white/70 line-clamp-2">{job.prompt}</p>
                    )}
                    {job.result_url && (
                      <div className="pt-1">
                        {job.category === 'Image' || job.category === 'Image Edit' ? (
                          <img
                            src={job.result_url}
                            alt={job.model_name}
                            className="w-full max-h-48 object-cover rounded-lg border border-white/15"
                          />
                        ) : job.category === 'Voice / TTS' || job.category === 'Music' ? (
                          <audio controls src={job.result_url} className="w-full h-9" />
                        ) : (
                          <video
                            controls
                            playsInline
                            src={job.result_url}
                            className="w-full max-h-48 rounded-lg border border-white/15 bg-black"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="p-6 text-center text-xs font-mono text-white/40">
                    No generation jobs submitted yet.
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#06070A] text-[#ECECE9] overflow-hidden select-none">
      {/* TOP STUDIO HEADER BAR */}
      <header className="shrink-0 bg-[#0A0C12]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-black font-mono font-black text-xs shadow">
            PB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                VAIURE AI Creative Studio
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-mono text-[10px] text-cyan-300">
                PosBot Developer API v1
              </span>
            </div>
            <div className="text-[10px] font-mono text-white/50 flex items-center gap-2">
              <span>Slide 4 Production Suite</span>
              <span>·</span>
              <span
                className={
                  health?.serverKeyConfigured ? 'text-emerald-400' : 'text-amber-300'
                }
              >
                {health?.serverKeyConfigured
                  ? 'API Key Configured (Server)'
                  : 'Server Key Missing (Reference Mode)'}
              </span>
            </div>
          </div>
        </div>

        {/* LIVE BALANCE + ACTIVE JOBS + MODE SWITCHER */}
        <div className="flex items-center gap-2">
          {/* Active Jobs Pill */}
          {activeJobsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveSection('history')}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{activeJobsCount} Active</span>
            </button>
          )}

          {/* Balance Badge */}
          <button
            type="button"
            onClick={() => setActiveSection('balance')}
            className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {balance
                ? `${balance.balance_generate.toLocaleString()} Gen (Rp ${balance.balance_idr_equivalent.toLocaleString()})`
                : 'Balance'}
            </span>
          </button>

          {/* Switch to Timeline/Storyboard/Midjourney Legacy Workspace */}
          {onSwitchToLegacyStudio && (
            <button
              type="button"
              onClick={onSwitchToLegacyStudio}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 font-mono text-[11px] cursor-pointer"
              title="Open Timeline, Node Canvas & Midjourney Bridge"
            >
              Timeline & Midjourney
            </button>
          )}

          {onOpenRooms && (
            <button
              type="button"
              onClick={onOpenRooms}
              className="hidden sm:flex px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 font-mono text-[11px] cursor-pointer"
            >
              Collab Rooms
            </button>
          )}
        </div>
      </header>

      {/* HORIZONTAL / SIDEBAR 11-SECTION NAVIGATION */}
      <div className="shrink-0 bg-[#080A0F] border-b border-white/10 px-3 sm:px-5 py-1.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {SECTION_NAV.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSection(item.id)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  active
                    ? 'bg-cyan-400 text-black font-bold shadow'
                    : 'text-white/65 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* GLOBAL SUBMISSION FEEDBACK BANNER */}
      {submissionFeedback && (
        <div
          className={`shrink-0 px-4 py-2 border-b flex items-center justify-between gap-3 text-xs font-mono ${
            submissionFeedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {submissionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{submissionFeedback.message}</span>
          </div>
          <div className="flex items-center gap-2">
            {submissionFeedback.jobCode && (
              <button
                type="button"
                onClick={() => setActiveSection('history')}
                className="px-2 py-0.5 rounded bg-white/15 text-white hover:bg-white/25 cursor-pointer"
              >
                Track Job
              </button>
            )}
            <button
              type="button"
              onClick={() => setSubmissionFeedback(null)}
              className="p-1 text-white/60 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN SCROLLABLE WORKSPACE CONTENT */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-5">
        {/* ===================================================================
            SECTION 1: AI DASHBOARD
           =================================================================== */}
        {activeSection === 'dashboard' && (
          <div className="space-y-5">
            {/* HERO OVERVIEW */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-blue-600/10 to-purple-600/10 border border-cyan-500/30 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-400 text-black font-mono text-[10px] font-bold uppercase">
                    PosBot v1 Integrated
                  </span>
                  <span className="font-mono text-xs text-cyan-300">
                    {models.length} Documented & Live AI Models
                  </span>
                </div>
                <h1 className="text-lg sm:text-2xl font-bold text-white">
                  AI Content Creation Studio — Video, Image, Lip-Sync, Motion, Voice & Music
                </h1>
                <p className="text-xs sm:text-sm text-white/70 max-w-3xl">
                  Server-authenticated PosBot Developer API workflow with Seedance 2.5 multi-shot
                  storyboarding, LHD/RHD vehicle continuity locks, real-time job polling, and 100%
                  auto-refund protection.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setVideoSubTab('seedance25');
                    setActiveSection('video-studio');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Launch Seedance 2.5 Studio
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('image-studio')}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-mono text-xs font-bold cursor-pointer"
                >
                  Image & 4K Enhance
                </button>
              </div>
            </div>

            {/* 4 TELEMETRY SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. API Health */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center justify-between font-mono text-xs text-white/55">
                  <span>PosBot API Health</span>
                  <Activity className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-base font-bold font-mono text-white flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      health?.ok ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  {health?.ok ? 'Operational (v1)' : 'Checking / Offline'}
                </div>
                <div className="font-mono text-[10px] text-white/45 truncate">
                  {health?.baseUrl || 'https://api.posbot.web.id/api/v1'}
                </div>
              </div>

              {/* 2. Server Credentials */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center justify-between font-mono text-xs text-white/55">
                  <span>Server API Key Security</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {health?.serverKeyConfigured ? 'Ready (Server-Only)' : 'Needs POSBOT_API_KEY'}
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  Zero client bundle exposure
                </div>
              </div>

              {/* 3. Account Balance */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center justify-between font-mono text-xs text-white/55">
                  <span>Generate Balance</span>
                  <Wallet className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-base font-bold font-mono text-amber-300">
                  {balance
                    ? `${balance.balance_generate.toLocaleString()} Generate`
                    : 'Not Loaded'}
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  {balance
                    ? `≈ Rp ${balance.balance_idr_equivalent.toLocaleString()} (1 Gen = Rp ${balance.unit_value_idr})`
                    : balanceError || 'Configure POSBOT_API_KEY to view live balance'}
                </div>
              </div>

              {/* 4. Catalog & Jobs */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                <div className="flex items-center justify-between font-mono text-xs text-white/55">
                  <span>Catalog & Job Queue</span>
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-base font-bold font-mono text-white">
                  {models.length} Models · {jobs.length} Jobs
                </div>
                <div className="font-mono text-[10px] text-white/45">
                  Source: {catalogSource === 'live' ? 'Live /models API' : 'Documented v1 Spec'}
                </div>
              </div>
            </div>

            {/* STUDIO LAUNCHPAD GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  id: 'video-studio' as const,
                  title: 'Video Studio & Seedance 2.5',
                  desc: '22 Video engines including Seedance 2.5 (15s/30s), Kling 3.0, Wan 3.0 HD, MiniMax H3, and Grok Imagine 2.',
                  badge: '22 Models',
                },
                {
                  id: 'image-studio' as const,
                  title: 'Image & 4K Enhance Studio',
                  desc: '13 Image generators (GPT Image 2.5, Flux 2 Pro, Nano Banana 4K, Seedream 5) + Face Swap & 4K Upscale.',
                  badge: '15 Models',
                },
                {
                  id: 'motion-control' as const,
                  title: 'Motion Control & R2V Studio',
                  desc: 'Kling 3.0 Motion Control, BetaMotion 1080p Max, Multi-Ref R2V, 2K 60fps Upscale & Watermark Remover.',
                  badge: '16 Models',
                },
                {
                  id: 'lipsync-studio' as const,
                  title: 'Lip-Sync Studio',
                  desc: 'Synchronize character video facial movements to vocal audio with MiniMax LipSync and LTX LipSync.',
                  badge: '2 Models',
                },
                {
                  id: 'voice-studio' as const,
                  title: 'AI Voice / TTS Studio',
                  desc: 'Natural speech synthesis powered by Google TTS with 8 expressive vocal personas (Kore, Puck, Charon, Fenrir...).',
                  badge: '8 Voices',
                },
                {
                  id: 'music-studio' as const,
                  title: 'AI Music Studio',
                  desc: 'Full song and instrumental generation with Suno V6, Suno V6 Wild, Lyria 3.5, Mureka 9.5, and MiniMax Music 3.',
                  badge: '8 Models',
                },
                {
                  id: 'character-reference' as const,
                  title: 'Character & Vehicle Continuity',
                  desc: 'Manage reusable character profiles, strict LHD/RHD vehicle cabin locks, and public reference image URLs.',
                  badge: 'Continuity Lock',
                },
                {
                  id: 'history' as const,
                  title: 'Generation History & Poller',
                  desc: 'Track active job codes, inspect full request payloads, preview/download media, and refresh statuses.',
                  badge: `${jobs.length} Saved`,
                },
              ].map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSelectSection(card.id)}
                  className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-400/50 text-left transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">{card.title}</span>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[10px]">
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">{card.desc}</p>
                  </div>
                  <span className="font-mono text-[11px] text-cyan-300">Open Studio →</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 2: VIDEO STUDIO (SEEDANCE 2.5 + ALL 22 VIDEO MODELS)
           =================================================================== */}
        {activeSection === 'video-studio' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVideoSubTab('seedance25')}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                  videoSubTab === 'seedance25'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                Seedance 2.5 Multi-Shot & R2V Studio
              </button>
              <button
                type="button"
                onClick={() => setVideoSubTab('all-video')}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                  videoSubTab === 'all-video'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                All Video Models (Kling 3.0, Wan 3.0, MiniMax H3, Grok 2)
              </button>
            </div>

            {videoSubTab === 'seedance25' ? (
              <Seedance25StudioPanel
                models={models}
                characters={characters}
                vehicleConstraint={vehicleConstraint}
                onUpdateVehicleConstraint={setVehicleConstraint}
                savedReferenceUrls={savedReferenceUrls}
                balanceGenerate={balance?.balance_generate ?? null}
                isSubmitting={isSubmitting}
                onSubmitGenerate={handleSubmitGenerate}
                onUploadLocalMedia={handleUploadLocalMedia}
              />
            ) : (
              renderStandardModelStudio(
                'Video Generation Studio (Text-to-Video & Image-to-Video)',
                'Supports Kling 2.5/2.6/3.0 (with start/end frame interpolation), Wan 3.0 HD, MiniMax H3, Grok Imagine 2, Omni Flash, and BetaGrok.',
                models.filter((m) => m.category === 'Video')
              )
            )}
          </div>
        )}

        {/* ===================================================================
            SECTION 3: IMAGE STUDIO (13 SYNTHESIS MODELS + FACE SWAP & 4K UPSCALE)
           =================================================================== */}
        {activeSection === 'image-studio' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageSubTab('synthesis');
                  setSelectedModelKey('flux_2_pro');
                }}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                  imageSubTab === 'synthesis'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                Image Generation (13 Models)
              </button>
              <button
                type="button"
                onClick={() => {
                  setImageSubTab('edit');
                  setSelectedModelKey('face_swap');
                }}
                className={`px-3.5 py-2 rounded-xl font-mono text-xs transition-all cursor-pointer ${
                  imageSubTab === 'edit'
                    ? 'bg-cyan-400 text-black font-bold'
                    : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'
                }`}
              >
                Image Edit & Enhance (Face Swap & Upscale 4K)
              </button>
            </div>

            {imageSubTab === 'synthesis'
              ? renderStandardModelStudio(
                  'AI Image Synthesis Studio',
                  'High-resolution 2K/4K image synthesis with multi-image reference support (up to 16 references on GPT Image 2.5).',
                  models.filter((m) => m.category === 'Image')
                )
              : renderStandardModelStudio(
                  'Image Edit & 4K Enhancement Studio',
                  'Perform identity Face Swap (target image_url + source swap_image) or crisp 4K resolution upscaling.',
                  models.filter((m) => m.category === 'Image Edit')
                )}
          </div>
        )}

        {/* ===================================================================
            SECTION 4: CHARACTER & REFERENCE STUDIO
           =================================================================== */}
        {activeSection === 'character-reference' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* CHARACTER PROFILES */}
            <div className="lg:col-span-7 p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Character Consistency Profiles
                  </h2>
                  <p className="text-xs text-white/60">
                    Reusable identity & wardrobe locks automatically available in Seedance 2.5
                    Precision Mode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = characters.length + 1;
                    setCharacters([
                      ...characters,
                      {
                        id: `char-${Date.now()}`,
                        name: `Character ${nextNum}`,
                        roleTag: `@Character_${nextNum}`,
                        appearance: 'Describe age, facial structure, hairstyle, and demeanor',
                        wardrobe: 'Describe exact jacket, top, trousers, footwear, and colors',
                        accessories: 'Glasses, watch, props',
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 font-mono text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> New Character
                </button>
              </div>

              <div className="space-y-3">
                {characters.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={ch.name}
                          onChange={(e) =>
                            setCharacters((prev) =>
                              prev.map((c) => (c.id === ch.id ? { ...c, name: e.target.value } : c))
                            )
                          }
                          className="rounded bg-white/5 border border-white/15 px-2.5 py-1 text-xs font-bold text-white"
                        />
                        <input
                          type="text"
                          value={ch.roleTag}
                          onChange={(e) =>
                            setCharacters((prev) =>
                              prev.map((c) =>
                                c.id === ch.id ? { ...c, roleTag: e.target.value } : c
                              )
                            )
                          }
                          className="w-36 rounded bg-purple-500/15 border border-purple-400/30 px-2 py-1 font-mono text-[11px] text-purple-200"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCharacters((prev) => prev.filter((c) => c.id !== ch.id))
                        }
                        className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-mono text-[10px] text-white/50 mb-0.5">
                          Facial & Physical Appearance
                        </label>
                        <input
                          type="text"
                          value={ch.appearance}
                          onChange={(e) =>
                            setCharacters((prev) =>
                              prev.map((c) =>
                                c.id === ch.id ? { ...c, appearance: e.target.value } : c
                              )
                            )
                          }
                          className="w-full rounded bg-black/50 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-white/50 mb-0.5">
                          Locked Wardrobe & Attire
                        </label>
                        <input
                          type="text"
                          value={ch.wardrobe}
                          onChange={(e) =>
                            setCharacters((prev) =>
                              prev.map((c) =>
                                c.id === ch.id ? { ...c, wardrobe: e.target.value } : c
                              )
                            )
                          }
                          className="w-full rounded bg-black/50 border border-white/10 px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PUBLIC REFERENCE URL LIBRARY & VEHICLE CONTINUITY SUMMARY */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4" />
                  Saved Public Reference Image URLs ({savedReferenceUrls.length})
                </h3>
                <p className="text-xs text-white/55">
                  Store verified public HTTP/HTTPS reference images here for one-click attachment in
                  Seedance 2.5, R2V, and Image Studio.
                </p>

                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newMultiImageUrl}
                    onChange={(e) => setNewMultiImageUrl(e.target.value)}
                    placeholder="https://example.com/reference.jpg"
                    className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newMultiImageUrl.trim();
                      if (trimmed && /^https?:\/\//i.test(trimmed)) {
                        setSavedReferenceUrls((prev) =>
                          prev.includes(trimmed) ? prev : [trimmed, ...prev]
                        );
                        setNewMultiImageUrl('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black font-mono text-xs font-bold cursor-pointer"
                  >
                    Save URL
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {savedReferenceUrls.map((url, idx) => (
                    <div
                      key={url + idx}
                      className="p-2 rounded-xl bg-black/50 border border-white/10 flex items-center justify-between gap-2"
                    >
                      <img
                        src={url}
                        alt={`Saved Ref ${idx + 1}`}
                        className="w-10 h-10 rounded object-cover shrink-0 border border-white/10"
                      />
                      <span className="font-mono text-[10px] text-white/70 truncate flex-1">
                        Ref #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setSavedReferenceUrls((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                    <Car className="w-4 h-4" />
                    Active Vehicle Continuity Profile
                  </span>
                  <span className="font-mono text-[10px] text-white/50">
                    {vehicleConstraint.drivingSide}
                  </span>
                </div>
                <p className="text-xs text-white/75 font-bold">{vehicleConstraint.vehicleName}</p>
                <p className="text-[11px] text-white/55">
                  Steering: {vehicleConstraint.steeringWheelSide} · {vehicleConstraint.driverPosition}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVideoSubTab('seedance25');
                    setActiveSection('video-studio');
                  }}
                  className="mt-1 px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono text-xs cursor-pointer"
                >
                  Configure in Seedance 2.5 Studio →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 5: MOTION CONTROL & R2V STUDIO
           =================================================================== */}
        {activeSection === 'motion-control' &&
          renderStandardModelStudio(
            'Motion Control, Reference-to-Video (R2V) & Video Enhancement',
            'Transfer choreography from reference video_url onto character image_url (Kling 2.6/3.0 MC, BetaMotion 1080p), run R2V continuity, or upscale to 2K 60fps.',
            models.filter((m) => m.category === 'Motion / R2V')
          )}

        {/* ===================================================================
            SECTION 6: LIP-SYNC STUDIO
           =================================================================== */}
        {activeSection === 'lipsync-studio' &&
          renderStandardModelStudio(
            'AI Lip-Sync Studio (MiniMax LipSync & LTX LipSync)',
            'Provide a public target video_url and vocal audio_url to synchronize facial lip movements with frame-accurate speech.',
            models.filter((m) => m.category === 'LipSync')
          )}

        {/* ===================================================================
            SECTION 7: AI VOICE STUDIO
           =================================================================== */}
        {activeSection === 'voice-studio' &&
          renderStandardModelStudio(
            'AI Voice & Speech Synthesis Studio (Google TTS)',
            'Generate expressive dialogue and voiceover narration across 8 studio vocal personas (1 Generate / Rp 400 per synthesis).',
            models.filter((m) => m.category === 'Voice / TTS')
          )}

        {/* ===================================================================
            SECTION 8: AI MUSIC STUDIO
           =================================================================== */}
        {activeSection === 'music-studio' &&
          renderStandardModelStudio(
            'AI Music & Soundtrack Studio',
            'Compose original full-length songs or instrumental scores using Suno V6, Suno V6 Wild, Suno V6 Mini, Lyria 3.5, MiniMax Music 3, Mureka 9.5, Sonauto 3, and AceStep 1.5.',
            models.filter((m) => m.category === 'Music')
          )}

        {/* ===================================================================
            SECTION 9: GENERATION HISTORY
           =================================================================== */}
        {activeSection === 'history' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Generation History & Live Job Tracker
                </h2>
                <p className="text-xs text-white/60">
                  Non-terminal jobs automatically poll <code>GET /api/ai/jobs/:jobCode</code> every
                  6 seconds and stop immediately upon reaching <code>completed</code>,{' '}
                  <code>failed</code>, or <code>cancelled</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {['all', 'processing', 'completed', 'failed'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setHistoryFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs capitalize cursor-pointer ${
                      historyFilter === st
                        ? 'bg-cyan-400 text-black font-bold'
                        : 'bg-white/5 text-white/65 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {jobs
                .filter((j) =>
                  historyFilter === 'all'
                    ? true
                    : historyFilter === 'processing'
                    ? !TERMINAL_STATUSES.has(String(j.status).toLowerCase())
                    : String(j.status).toLowerCase() === historyFilter
                )
                .map((job) => {
                  const isTerminal = TERMINAL_STATUSES.has(String(job.status).toLowerCase());
                  return (
                    <div
                      key={job.id}
                      className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-mono text-xs font-bold text-white">
                              {job.model_name}
                            </div>
                            <div className="font-mono text-[10px] text-white/45">
                              Code: <span className="text-cyan-300">{job.job_code}</span> ·{' '}
                              {job.cost_generate} Gen
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              job.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : job.status === 'failed' || job.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-cyan-500/20 text-cyan-300 animate-pulse'
                            }`}
                          >
                            {job.status}
                          </span>
                        </div>

                        {job.prompt && (
                          <p className="text-xs text-white/75 line-clamp-3 bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono">
                            {job.prompt}
                          </p>
                        )}

                        {job.error_message && (
                          <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-200 font-mono">
                            Error: {job.error_message} (100% Auto-Refunded by PosBot)
                          </div>
                        )}

                        {job.result_url && (
                          <div className="pt-1">
                            {job.category === 'Image' || job.category === 'Image Edit' ? (
                              <img
                                src={job.result_url}
                                alt={job.model_name}
                                className="w-full h-48 object-cover rounded-xl border border-white/15"
                              />
                            ) : job.category === 'Voice / TTS' || job.category === 'Music' ? (
                              <audio controls src={job.result_url} className="w-full" />
                            ) : (
                              <video
                                controls
                                playsInline
                                src={job.result_url}
                                className="w-full h-48 object-cover rounded-xl border border-white/15 bg-black"
                              />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => pollSingleJob(job.job_code)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-mono text-white flex items-center gap-1 cursor-pointer"
                            title="Refresh Status from PosBot API"
                          >
                            <RefreshCw className={`w-3 h-3 ${!isTerminal ? 'animate-spin' : ''}`} />
                            Refresh
                          </button>

                          <button
                            type="button"
                            onClick={() => setInspectedJob(job)}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-mono text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" /> Params
                          </button>

                          {job.prompt && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(job.prompt);
                                setCopiedId(job.id);
                                setTimeout(() => setCopiedId(null), 1500);
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-mono text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === job.id ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {job.result_url && (
                            <a
                              href={job.result_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono text-[11px] flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Open
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteHistoryItem(job.id)}
                            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 cursor-pointer"
                            title="Remove from Local History"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {jobs.length === 0 && (
              <div className="p-12 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                <History className="w-8 h-8 text-white/30 mx-auto" />
                <div className="font-mono text-sm text-white/70">No Generation History Yet</div>
                <p className="text-xs text-white/45 max-w-md mx-auto">
                  Submit a generation job in Video Studio, Seedance 2.5, Image Studio, Motion
                  Control, Lip-Sync, Voice, or Music Studio to track its progress here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            SECTION 10: ACCOUNT BALANCE & BILLING TRANSPARENCY
           =================================================================== */}
        {activeSection === 'balance' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-6 p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded bg-amber-400 text-black font-mono text-[10px] font-bold uppercase">
                  PosBot Account Wallet
                </span>
                <button
                  type="button"
                  onClick={fetchBalance}
                  disabled={isRefreshingBalance}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 font-mono text-xs text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingBalance ? 'animate-spin' : ''}`} />
                  Refresh Balance
                </button>
              </div>

              {balance ? (
                <div className="space-y-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono text-amber-300">
                    {balance.balance_generate.toLocaleString()} Generate
                  </div>
                  <div className="font-mono text-sm text-white/80">
                    IDR Equivalent: Rp {balance.balance_idr_equivalent.toLocaleString()}
                  </div>
                  <div className="font-mono text-xs text-white/50">
                    Conversion Rate: 1 Generate = Rp {balance.unit_value_idr.toLocaleString()} ·
                    User ID: {balance.user_id ?? 'Authenticated'}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="font-mono text-sm text-amber-200 font-bold">
                    Live Balance Unavailable
                  </div>
                  <p className="text-xs text-white/65">
                    {balanceError ||
                      'Configure POSBOT_API_KEY in the server environment (.env) to query GET /api/v1/balance.'}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-black/50 border border-white/10 space-y-2">
                <div className="font-mono text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Billing & 100% Automatic Refund Guarantee
                </div>
                <ul className="text-xs text-white/70 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>1 Generate = Rp 400</strong> across all 60 PosBot Developer API models.
                  </li>
                  <li>
                    Your Generate balance is deducted when <code>POST /api/v1/generate</code>{' '}
                    accepts the job into the queue.
                  </li>
                  <li>
                    If an upstream generation job fails or is cancelled (`status: "failed"` or
                    `"cancelled"`), <strong>100% of the Generate cost is automatically refunded</strong>{' '}
                    to your PosBot account.
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-6 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                Cost Reference by Studio Category
              </h3>
              <div className="space-y-2 text-xs font-mono">
                {[
                  { cat: 'Image Generation (2K / 4K)', range: '1 – 4 Generate (Rp 400 – Rp 1.600)' },
                  { cat: 'Image Edit (Face Swap / 4K Upscale)', range: '1 Generate (Rp 400)' },
                  {
                    cat: 'Seedance 2.5 Video & R2V (15s / 30s)',
                    range: '4 – 7 Generate (Rp 1.600 – Rp 2.800)',
                  },
                  {
                    cat: 'Video T2V / I2V (Kling, Wan, MiniMax, Grok)',
                    range: '2 – 7 Generate (Rp 800 – Rp 2.800)',
                  },
                  { cat: 'Lip-Sync (MiniMax / LTX)', range: '3 Generate (Rp 1.200)' },
                  {
                    cat: 'Motion Control & Video Tools',
                    range: '2 – 7 Generate (Rp 800 – Rp 2.800)',
                  },
                  { cat: 'Google TTS Voice Synthesis', range: '1 Generate (Rp 400)' },
                  { cat: 'AI Music (Suno V6, Lyria 3.5, Mureka 9.5)', range: '1 – 2 Generate (Rp 400 – Rp 800)' },
                ].map((row) => (
                  <div
                    key={row.cat}
                    className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <span className="text-white/80">{row.cat}</span>
                    <span className="text-amber-300 font-bold">{row.range}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 11: API & SYSTEM STATUS + FULL 60-MODEL CATALOG TABLE
           =================================================================== */}
        {activeSection === 'system-status' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <span className="font-mono text-xs text-white/55">Upstream /health Status</span>
                <div className="font-mono text-base font-bold text-white flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      health?.ok ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  {health?.ok ? 'Connected & Healthy' : 'Unreachable'}
                </div>
                <div className="font-mono text-[11px] text-white/45">
                  Service: {health?.service || 'PosBot Public Developer API'} ({health?.version || 'v1'})
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <span className="font-mono text-xs text-white/55">Server Environment Key</span>
                <div className="font-mono text-base font-bold text-white">
                  {health?.serverKeyStatus || 'Checking...'}
                </div>
                <div className="font-mono text-[11px] text-white/45">
                  Env Var: <code>POSBOT_API_KEY</code> (Strictly Server-Side)
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                <span className="font-mono text-xs text-white/55">Catalog Synchronization</span>
                <div className="font-mono text-base font-bold text-cyan-300">
                  {catalogSource === 'live'
                    ? 'Live API Catalog (/models)'
                    : 'Documented Reference Catalog'}
                </div>
                <div className="font-mono text-[11px] text-white/45">
                  {catalogNotice || `${models.length} models validated`}
                </div>
              </div>
            </div>

            {/* SEARCHABLE 60-MODEL SPECIFICATION TABLE */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                  Complete PosBot v1 Model Catalog ({models.length} Models)
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Filter by key, name, or category..."
                    className="w-full rounded-lg bg-black/50 border border-white/15 pl-8 pr-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 text-[10px] uppercase">
                      <th className="py-2 px-2">Model Key</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2">Category</th>
                      <th className="py-2 px-2">Cost</th>
                      <th className="py-2 px-2">Max Prompt</th>
                      <th className="py-2 px-2">Required Fields</th>
                      <th className="py-2 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {models
                      .filter((m) => {
                        if (!catalogSearch.trim()) return true;
                        const q = catalogSearch.toLowerCase();
                        return (
                          m.key.toLowerCase().includes(q) ||
                          m.name.toLowerCase().includes(q) ||
                          m.category.toLowerCase().includes(q)
                        );
                      })
                      .map((m) => (
                        <tr key={m.key} className="hover:bg-white/[0.02]">
                          <td className="py-2 px-2 text-cyan-300 font-bold">{m.key}</td>
                          <td className="py-2 px-2 text-white">{m.name}</td>
                          <td className="py-2 px-2 text-white/70">{m.category}</td>
                          <td className="py-2 px-2 text-amber-300">
                            {m.cost_generate} Gen (Rp {m.cost_idr.toLocaleString()})
                          </td>
                          <td className="py-2 px-2 text-white/60">
                            {m.maxPromptLength.toLocaleString()} chars
                          </td>
                          <td className="py-2 px-2 text-white/60">
                            {m.requiredFields.join(', ')}
                          </td>
                          <td className="py-2 px-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedModelKey(m.key);
                                if (m.isSeedance25) {
                                  setVideoSubTab('seedance25');
                                  setActiveSection('video-studio');
                                } else {
                                  if (m.category === 'Video') setVideoSubTab('all-video');
                                  if (m.category === 'Image') setImageSubTab('synthesis');
                                  if (m.category === 'Image Edit') setImageSubTab('edit');
                                  setActiveSection(m.studioSection);
                                }
                              }}
                              className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] cursor-pointer"
                            >
                              Use Model
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* JOB PARAMETER INSPECTOR MODAL */}
      {inspectedJob && (
        <div
          onClick={() => setInspectedJob(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[#0D1017] border border-white/20 p-5 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <h3 className="font-mono text-sm font-bold text-white">
                  Job Parameter Inspector — {inspectedJob.job_code}
                </h3>
                <p className="font-mono text-[11px] text-white/50">
                  Model: {inspectedJob.model_name} ({inspectedJob.model})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedJob(null)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-black/70 border border-white/10 font-mono text-[11px] text-cyan-200 overflow-x-auto max-h-80">
              {JSON.stringify(inspectedJob.parameters, null, 2)}
            </pre>

            {inspectedJob.result_url && (
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-xs text-white/60 truncate max-w-sm">
                  Result: {inspectedJob.result_url}
                </span>
                <a
                  href={inspectedJob.result_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-cyan-400 text-black font-mono text-xs font-bold flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Result URL
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
