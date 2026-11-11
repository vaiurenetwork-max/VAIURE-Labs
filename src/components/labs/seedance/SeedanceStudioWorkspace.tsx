/**
 * VAIURE Labs — Seedance 2.5 Exclusive Video Studio Workspace
 * Professional AI filmmaking generation engine featuring:
 * - Dynamic Seedance 2.5 schedule cost calculator [⚡ xx Credits required]
 * - Character, wardrobe, and vehicle consistency workflows
 * - Tier permission locks (480p, 720p, 1080p)
 * - Real-time job polling & auto-refund safety
 * - Seamless video playback & community publishing
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Zap,
  Film,
  Camera,
  Layers,
  Upload,
  Plus,
  Trash2,
  Play,
  RotateCcw,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Maximize2,
  Clock,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Eye,
  Car,
  User,
  Crown,
} from 'lucide-react';
import {
  Resolution,
  DurationSeconds,
  SeedanceGenerationJob,
  CreditWalletBalance,
  UserSubscription,
} from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceStudioWorkspaceProps {
  userId: string;
  onOpenTopUp: () => void;
  onOpenMembership: () => void;
  onOpenWallet: () => void;
  onPublishToCommunity?: (video: {
    videoUrl: string;
    thumbnailUrl: string;
    prompt: string;
    resolution: Resolution;
    durationSeconds: DurationSeconds;
  }) => void;
}

interface ReferenceImage {
  id: string;
  url: string;
  role: 'character' | 'wardrobe' | 'vehicle' | 'environment';
}

export const SeedanceStudioWorkspace: React.FC<SeedanceStudioWorkspaceProps> = ({
  userId,
  onOpenTopUp,
  onOpenMembership,
  onOpenWallet,
  onPublishToCommunity,
}) => {
  // Generation parameters
  const [prompt, setPrompt] = useState<string>(
    'Cavernous brutalist architectural sanctum carved from obsidian volcanic basalt. Daylight beam slices across polished concrete floor. Model in structural silk mikado cape walking in velvet slow-motion @ 24fps film grain.'
  );
  const [negativePrompt, setNegativePrompt] = useState<string>(
    'blurry, jitter, low quality, warped face, extra fingers, cartoon, distorted anatomy'
  );
  const [resolution, setResolution] = useState<Resolution>('720p');
  const [durationSeconds, setDurationSeconds] = useState<DurationSeconds>(10);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '2.39:1'>('16:9');
  const [workflowMode, setWorkflowMode] = useState<'text_to_video' | 'image_to_video' | 'reference_consistency'>('reference_consistency');
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([
    {
      id: 'ref-1',
      url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      role: 'character',
    },
    {
      id: 'ref-2',
      url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
      role: 'wardrobe',
    },
  ]);

  // Consistency switches
  const [lockCharacterFace, setLockCharacterFace] = useState(true);
  const [lockWardrobe, setLockWardrobe] = useState(true);
  const [lockVehicleOrientation, setLockVehicleOrientation] = useState(false);

  // User state
  const [wallet, setWallet] = useState<CreditWalletBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Active generation job state
  const [activeJob, setActiveJob] = useState<SeedanceGenerationJob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  // File input ref for reference image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user wallet & subscription on mount
  const refreshUserWallet = async () => {
    try {
      const [bal, sub] = await Promise.all([
        seedancePlatformService.getWalletBalance(userId),
        seedancePlatformService.getUserSubscription(userId),
      ]);
      setWallet(bal);
      setSubscription(sub);
    } catch (err) {
      console.error('Failed to load user credits:', err);
    }
  };

  useEffect(() => {
    refreshUserWallet();
  }, [userId]);

  // Clean up polling interval
  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  // Seedance Schedule cost calculation
  const calculateCreditCost = (res: Resolution, dur: DurationSeconds): number => {
    const SCHEDULE: Record<Resolution, Record<DurationSeconds, number>> = {
      '480p': { 5: 25, 10: 50, 15: 75, 30: 150 },
      '720p': { 5: 55, 10: 110, 15: 165, 30: 330 },
      '1080p': { 5: 135, 10: 270, 15: 405, 30: 810 },
    };
    return SCHEDULE[res]?.[dur] || 55;
  };

  const requiredCredits = calculateCreditCost(resolution, durationSeconds);
  const currentCredits = wallet?.totalCredits ?? 0;
  const hasSufficientCredits = currentCredits >= requiredCredits;

  // Tier limitations (e.g., Free only has basic; Starter has 480p; Creator has 480p/720p; Pro/Studio have 1080p)
  const isResolutionAllowed = (res: Resolution) => {
    if (!subscription) return res === '480p';
    if (subscription.tier === 'FREE') return res === '480p';
    if (subscription.tier === 'STARTER') return res === '480p';
    if (subscription.tier === 'CREATOR') return res === '480p' || res === '720p';
    return true; // PRO & STUDIO can access all
  };

  // Image Upload handler
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newRef: ReferenceImage = {
          id: `ref-${Date.now()}`,
          url: reader.result,
          role: 'character',
        };
        setReferenceImages((prev) => [...prev.slice(0, 8), newRef]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeReference = (id: string) => {
    setReferenceImages((prev) => prev.filter((r) => r.id !== id));
  };

  // Trigger Generation
  const handleStartGeneration = async () => {
    if (!prompt.trim() || isGenerating) return;
    if (!hasSufficientCredits) {
      onOpenTopUp();
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setPublishedSuccess(false);

    try {
      const response = await seedancePlatformService.startGeneration({
        userId,
        prompt: prompt.trim(),
        negativePrompt: negativePrompt.trim(),
        resolution,
        durationSeconds,
        aspectRatio,
        workflowMode,
        referenceImages: referenceImages.map((r) => ({
          url: r.url,
          label: r.role,
        })),
        characterConsistency: lockCharacterFace,
        wardrobeLock: lockWardrobe,
        vehicleLock: lockVehicleOrientation,
      });

      if (!response.ok || !response.job) {
        throw new Error(response.error || 'Failed to start generation job');
      }

      setActiveJob(response.job);

      // Start polling status
      const interval = setInterval(async () => {
        try {
          const poll = await seedancePlatformService.getJobStatus(response.job.id);
          if (poll.ok && poll.job) {
            setActiveJob(poll.job);

            if (poll.job.status === 'COMPLETED' || poll.job.status === 'FAILED') {
              clearInterval(interval);
              setIsGenerating(false);
              refreshUserWallet();

              if (poll.job.status === 'FAILED') {
                setErrorMsg(
                  poll.job.errorReason ||
                    'Seedance API generation failed. Reserved credits have been automatically refunded to your wallet.'
                );
              }
            }
          }
        } catch (pollErr) {
          console.error('Job polling error:', pollErr);
        }
      }, 1500);

      setPollIntervalId(interval);
    } catch (err: any) {
      setIsGenerating(false);
      setErrorMsg(err.message || 'Generation failed to initialize.');
      refreshUserWallet();
    }
  };

  const handlePublish = async () => {
    if (!activeJob?.videoUrl) return;
    try {
      await seedancePlatformService.publishToCommunity({
        userId,
        title: prompt.slice(0, 48) + '...',
        prompt,
        videoUrl: activeJob.videoUrl,
        thumbnailUrl: activeJob.thumbnailUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
        durationSeconds,
        resolution,
        genre: 'Cinematic',
      });
      setPublishedSuccess(true);
      if (onPublishToCommunity) {
        onPublishToCommunity({
          videoUrl: activeJob.videoUrl,
          thumbnailUrl: activeJob.thumbnailUrl || '',
          prompt,
          resolution,
          durationSeconds,
        });
      }
    } catch (err) {
      console.error('Failed to publish video:', err);
    }
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#07080B] text-[#EDEDED] overflow-hidden select-none">
      {/* LEFT COLUMN: Controls & Prompt Directives */}
      <div className="w-full lg:w-[480px] xl:w-[520px] flex-1 flex flex-col border-r border-white/10 bg-[#090A0E] overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 shrink-0">
        {/* Top Wallet & Tier Banner */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/20 transition-all cursor-pointer"
              title="Inspect Centralized Credit Wallet"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentCredits.toLocaleString()} Credits</span>
            </button>
            <button
              onClick={onOpenMembership}
              className="flex items-center gap-1.5 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
            >
              <Crown className="w-3 h-3 text-cyan-400" />
              <span className="uppercase">{subscription ? subscription.tier : 'FREE'} TIER</span>
            </button>
          </div>

          <button
            onClick={onOpenTopUp}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 text-black font-mono text-[11px] font-bold hover:brightness-110 transition-all cursor-pointer shadow-sm"
          >
            + Top Up
          </button>
        </div>

        {/* Workflow Mode Tabs */}
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider flex items-center justify-between">
            <span>Workflow Engine</span>
            <span className="text-cyan-400 font-bold">Seedance 2.5 Exclusive</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono">
            {[
              { id: 'reference_consistency', label: 'Reference Ref' },
              { id: 'image_to_video', label: 'Image-to-Video' },
              { id: 'text_to_video', label: 'Text-to-Video' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => setWorkflowMode(m.id as any)}
                className={`py-2 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  workflowMode === m.id
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Multi-Reference Consistency Uploads (When Reference Mode Active) */}
        {workflowMode === 'reference_consistency' && (
          <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-white/70 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Multi-Reference Latent Locks ({referenceImages.length}/8)
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Image</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUploadImage}
                className="hidden"
              />
            </div>

            {/* Reference Thumbnails */}
            <div className="grid grid-cols-4 gap-2">
              {referenceImages.map((ref) => (
                <div
                  key={ref.id}
                  className="group relative aspect-square rounded-xl overflow-hidden border border-white/15 bg-black"
                >
                  <img src={ref.url} alt={ref.role} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-1">
                    <span className="text-[9px] font-mono text-white/90 truncate uppercase">
                      {ref.role}
                    </span>
                  </div>
                  <button
                    onClick={() => removeReference(ref.id)}
                    className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {referenceImages.length < 8 && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border border-dashed border-white/20 hover:border-cyan-400 flex flex-col items-center justify-center gap-1 text-white/40 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] font-mono">Upload</span>
                </button>
              )}
            </div>

            {/* Consistency Toggles */}
            <div className="pt-2 border-t border-white/10 space-y-2 text-xs font-mono">
              <label className="flex items-center justify-between text-white/80 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Face & Facial Anatomy Consistency</span>
                </span>
                <input
                  type="checkbox"
                  checked={lockCharacterFace}
                  onChange={(e) => setLockCharacterFace(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between text-white/80 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Wardrobe & Textile Micro-Structure Lock</span>
                </span>
                <input
                  type="checkbox"
                  checked={lockWardrobe}
                  onChange={(e) => setLockWardrobe(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>

              <label className="flex items-center justify-between text-white/80 cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vehicle LHD/RHD Steering Geometry Lock</span>
                </span>
                <input
                  type="checkbox"
                  checked={lockVehicleOrientation}
                  onChange={(e) => setLockVehicleOrientation(e.target.checked)}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
              </label>
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-white/70">
            <span className="uppercase tracking-wider font-bold">Director Master Prompt</span>
            <span className="text-[10px] text-white/40">{prompt.length} chars</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/15 focus:border-cyan-400 text-xs font-sans text-white placeholder-white/30 focus:outline-none resize-none leading-relaxed"
            placeholder="Describe the action, spatial environment, lighting temperature, and 24fps motion camera directives..."
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono text-white/50">
            <span className="uppercase tracking-wider">Negative Directives</span>
          </div>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white/[0.02] border border-white/10 focus:border-white/30 text-xs font-mono text-white/80 placeholder-white/20 focus:outline-none"
          />
        </div>

        {/* Resolution Selector (480p, 720p, 1080p) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-white/70">
            <span className="uppercase tracking-wider font-bold">Resolution & Fidelity</span>
            <span className="text-[10px] text-white/40">Tier Protected</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['480p', '720p', '1080p'] as Resolution[]).map((res) => {
              const allowed = isResolutionAllowed(res);
              const isSelected = resolution === res;

              return (
                <button
                  key={res}
                  onClick={() => allowed && setResolution(res)}
                  disabled={!allowed}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-md shadow-cyan-500/20'
                      : allowed
                      ? 'bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]'
                      : 'bg-white/[0.01] border-white/5 text-white/30 cursor-not-allowed opacity-60'
                  }`}
                >
                  <span className="font-mono text-xs">{res}</span>
                  {!allowed && (
                    <span className="text-[8px] font-mono text-amber-400 mt-0.5">PRO Plan</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration Selector (5s, 10s, 15s, 30s) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-white/70">
            <span className="uppercase tracking-wider font-bold">Temporal Duration</span>
            <span className="text-[10px] font-mono text-white/40">24fps Continuous Motion</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {([5, 10, 15, 30] as DurationSeconds[]).map((dur) => {
              const isSelected = durationSeconds === dur;
              return (
                <button
                  key={dur}
                  onClick={() => setDurationSeconds(dur)}
                  className={`p-2 rounded-xl border font-mono text-xs transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-white/[0.03] border-white/10 text-white/80 hover:bg-white/[0.06]'
                  }`}
                >
                  {dur}s
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="space-y-2">
          <div className="text-xs font-mono text-white/70 uppercase tracking-wider font-bold">
            Aspect Ratio
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(['16:9', '9:16', '1:1', '2.39:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`py-1.5 px-2 rounded-lg border font-mono text-xs transition-all cursor-pointer ${
                  aspectRatio === ratio
                    ? 'bg-white text-black border-white font-bold'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06]'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Credit Cost Banner & Generate CTA */}
        <div className="pt-2 space-y-3">
          {/* Dynamic Credit Badge */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-amber-300">
              <Zap className="w-4 h-4 fill-amber-400" />
              <span className="font-bold">Required Compute:</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-display font-bold text-white tracking-tight">
                {requiredCredits}
              </span>
              <span className="text-amber-400">Credits</span>
              <span className="text-[10px] text-white/40">
                (~Rp{(requiredCredits * 600).toLocaleString('id-ID')})
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary Button */}
          {!hasSufficientCredits ? (
            <button
              onClick={onOpenTopUp}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>
                Insufficient Credits — Top Up (Need {requiredCredits} cr, have {currentCredits} cr)
              </span>
            </button>
          ) : (
            <button
              onClick={handleStartGeneration}
              disabled={isGenerating || !prompt.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(34,211,238,0.35)] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing Seedance 2.5 Sequence...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>
                    Synthesize with Seedance 2.5 [{requiredCredits} Credits]
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Output Canvas, Video Player & Generation Progress */}
      <div className="flex-1 flex flex-col bg-[#050508] p-4 sm:p-8 justify-between relative overflow-y-auto custom-scrollbar">
        {/* Top bar info */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-cyan-400" />
            <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
              Seedance 2.5 Master Monitor
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {resolution} @ 24fps
            </span>
          </div>

          {activeJob && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-white/40">Job ID:</span>
              <span className="text-white/80 font-mono text-[11px]">{activeJob.id.slice(0, 12)}</span>
            </div>
          )}
        </div>

        {/* Center Screen: Video Player OR Progress Animation OR Placeholder */}
        <div className="flex-1 flex items-center justify-center py-6 min-h-[360px]">
          {isGenerating && activeJob ? (
            <div className="w-full max-w-md p-6 rounded-2xl bg-[#090A10] border border-cyan-500/30 text-center space-y-4 shadow-2xl animate-pulse">
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-400/40 mx-auto flex items-center justify-center text-cyan-400">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                  {activeJob.stage}
                </div>
                <p className="text-[11px] font-mono text-white/50">
                  BytePlus Seedance 2.5 Engine · Task {activeJob.status}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300"
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Phase: Latent Motion Synthesis</span>
                <span>{activeJob.progress}%</span>
              </div>
            </div>
          ) : activeJob?.videoUrl ? (
            <div className="w-full max-w-4xl rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black relative group">
              <video
                src={activeJob.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full max-h-[60vh] object-contain mx-auto"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={activeJob.videoUrl}
                  download="seedance_2_5_master.mp4"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white text-xs font-mono flex items-center gap-1.5 border border-white/20 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/10 mx-auto flex items-center justify-center text-white/30">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-base font-bold text-white tracking-tight">
                Studio Ready for Synthesis
              </h3>
              <p className="text-xs font-mono text-white/50">
                Configure your multi-reference character locks, prompt directives, and render duration to generate master footage.
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions: Publish to Showcase, Copy Prompt, Download */}
        {activeJob?.videoUrl && (
          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Render Complete ({activeJob.resolution} · {activeJob.durationSeconds}s)</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {publishedSuccess ? (
                <span className="text-xs font-mono text-cyan-400 px-3 py-1.5 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Published to Community Showcase</span>
                </span>
              ) : (
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Publish to Community Showcase</span>
                </button>
              )}

              <a
                href={activeJob.videoUrl}
                download="seedance_master_export.mp4"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl border border-white/20 hover:border-white/40 text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Local</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
