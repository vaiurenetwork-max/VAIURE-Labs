/**
 * VAIURE — SEEDANCE LAB OVERVIEW DASHBOARD
 * Monochromatic Production Dashboard
 * Real-time connection status, balance telemetry, 4-model fleet showcase, quick workspace launch, and recent generation activity.
 */

import React from 'react';
import {
  Film,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Coins,
  Server,
  Play,
  Crown,
  Sparkles,
  Radio,
  PhoneCall,
  Users,
  Images,
  Lock,
} from 'lucide-react';
import {
  SEEDANCE_MODELS,
  SeedanceModelKey,
  SeedanceAccountBalance,
  SeedanceHealthStatus,
  SeedanceHistoryItem,
} from '../../../services/seedanceLabService';

interface SeedanceOverviewDashboardProps {
  balance: SeedanceAccountBalance | null;
  health: SeedanceHealthStatus | null;
  history: SeedanceHistoryItem[];
  isAuthenticated?: boolean;
  onOpenGenerator: (modelKey?: SeedanceModelKey) => void;
  onOpenHistory: () => void;
  onOpenAccount: () => void;
  onOpenPlans?: () => void;
  onOpenCredits?: () => void;
  onOpenAgent?: () => void;
  onOpenStreams?: () => void;
  onOpenRooms?: () => void;
  onOpenCommunity?: () => void;
  onOpenCurated?: (env?: 'public' | 'private') => void;
  onRequireAuth?: () => void;
  onSelectHistoryItem?: (item: SeedanceHistoryItem) => void;
}

export const SeedanceOverviewDashboard: React.FC<SeedanceOverviewDashboardProps> = ({
  balance,
  health,
  history,
  isAuthenticated = false,
  onOpenGenerator,
  onOpenHistory,
  onOpenAccount,
  onOpenPlans,
  onOpenCredits,
  onOpenAgent,
  onOpenStreams,
  onOpenRooms,
  onOpenCommunity,
  onOpenCurated,
  onRequireAuth,
  onSelectHistoryItem,
}) => {
  const modelKeys: SeedanceModelKey[] = [
    'seedance_25_15s',
    'seedance_25_30s',
    'seedance_25_15s_r2v',
    'seedance_25_30s_r2v',
  ];

  const completedCount = history.filter((h) => h.status === 'completed').length;
  const recentItems = history.slice(0, 4);

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-8 pb-16">
        {/* Hero Banner: Production Identity & Quick Launch */}
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl p-6 sm:p-10 shadow-[0_16px_48px_rgba(0,0,0,0.8)]">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-mono tracking-widest uppercase px-2.5 py-0.5 rounded border border-white/[0.2] bg-white/[0.06] text-white">
                  PRODUCTION LAB
                </span>
                <span className="text-white/40 text-xs">·</span>
                <span className="text-xs font-mono text-white/60">
                  ByteDance Dreamina Seedance 2.5 Engine
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-serif tracking-tight text-white font-medium">
                VAIURE — SEEDANCE LAB
              </h1>
              <p className="text-sm sm:text-base text-white/75 font-sans leading-relaxed">
                Unified AI filmmaking platform for Seedance 2.5 video synthesis, Personal Creative AI Agent
                orchestration, subscription & credit management, live studio broadcasts, and multiplayer rooms.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <button
                onClick={() => onOpenGenerator()}
                className="px-6 py-3.5 rounded-xl bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-white/90 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Film className="w-4 h-4" />
                <span>Launch Video Generator</span>
              </button>
              <button
                onClick={onOpenPlans || onOpenAccount}
                className="px-5 py-3.5 rounded-xl border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white font-medium text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-white/75" />
                <span>{balance?.planName ? `${balance.planName} Plan` : 'Plans & Tiers'}</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
          </div>
        </section>

        {/* 4-Stat Metric Strip */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Engine Status */}
          <div className="rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase tracking-wider text-[11px]">Lab Status</span>
              <Activity className="w-4 h-4 text-white/70" />
            </div>
            <div className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white shrink-0" />
              <span>Operational</span>
            </div>
            <p className="text-xs text-white/50">
              Seedance 2.5 Architecture · Zero Watermark
            </p>
          </div>

          {/* Card 2: API Connection */}
          <div
            onClick={onOpenAccount}
            className="rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-2 cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase tracking-wider text-[11px]">ByteDance ModelArk API</span>
              <Server className="w-4 h-4 text-white/70" />
            </div>
            <div className="text-xl font-semibold text-white tracking-tight">
              {health?.ok
                ? 'Connected (v3)'
                : health?.serverKeyConfigured
                ? 'Standby'
                : 'Awaiting API Key'}
            </div>
            <p className="text-xs text-white/50 truncate font-mono">
              {health?.baseUrl || 'https://ark.ap-southeast.bytepluses.com/api/v3'}
            </p>
          </div>

          {/* Card 3: Account Balance */}
          <div
            onClick={() => {
              if (!isAuthenticated && onRequireAuth) {
                onRequireAuth();
              } else if (onOpenCredits) {
                onOpenCredits();
              } else {
                onOpenAccount();
              }
            }}
            className="rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-2 cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase tracking-wider text-[11px]">Credit Wallet</span>
              <Coins className="w-4 h-4 text-white/70" />
            </div>
            <div className="text-xl font-mono font-semibold text-white tracking-tight tabular-nums">
              {isAuthenticated ? balance?.balance_generate ?? 0 : 0}{' '}
              <span className="text-xs font-sans text-white/50 font-normal">Credits</span>
            </div>
            <p className="text-xs text-white/50 font-mono tabular-nums">
              {isAuthenticated
                ? `Tier: ${balance?.planName || balance?.tier || 'FREE'} · Used ${balance?.used_credits ?? 0}`
                : 'Sign in to view wallet balance'}
            </p>
          </div>

          {/* Card 4: Completed Generations */}
          <div
            onClick={onOpenHistory}
            className="rounded-xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-2 cursor-pointer hover:border-white/20 transition-all"
          >
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase tracking-wider text-[11px]">Archived Outputs</span>
              <CheckCircle2 className="w-4 h-4 text-white/70" />
            </div>
            <div className="text-xl font-mono font-semibold text-white tracking-tight tabular-nums">
              {completedCount}{' '}
              <span className="text-xs font-sans text-white/50 font-normal">Renders</span>
            </div>
            <p className="text-xs text-white/50">
              {history.length > 0 ? `${history.length} total logged jobs` : 'Ready for first render'}
            </p>
          </div>
        </section>

        {/* Platform Capabilities Quick Launch */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={() => onOpenPlans?.()}
            className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Crown className="w-4 h-4 text-white" />
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
            </div>
            <div className="text-sm font-semibold text-white">Subscription & Credits</div>
            <p className="text-xs text-white/55">
              Compare Free, Basic, Pro, Premium & Enterprise tiers, billing cycle & credit ledger.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onOpenAgent?.()}
            className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Sparkles className="w-4 h-4 text-white" />
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
            </div>
            <div className="text-sm font-semibold text-white">Personal AI Agent</div>
            <p className="text-xs text-white/55">
              Private creative assistant with your persistent characters, style & storyline memory.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onOpenStreams?.()}
            className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <Radio className="w-4 h-4 text-white" />
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
            </div>
            <div className="text-sm font-semibold text-white">Livestreams</div>
            <p className="text-xs text-white/55">
              Start or join live WebRTC studio streams with real-time chat and moderation.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onOpenRooms?.()}
            className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 text-left space-y-2 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <PhoneCall className="w-4 h-4 text-white" />
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
            </div>
            <div className="text-sm font-semibold text-white">Multiplayer Live Rooms</div>
            <p className="text-xs text-white/55">
              Create or join real-time voice/video rooms with invite codes and peer controls.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onOpenCommunity?.()}
            className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25 text-left space-y-2 transition-all cursor-pointer sm:col-span-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Community & Groups Ecosystem</span>
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
            </div>
            <p className="text-xs text-white/55">
              Discover creator groups, collaborate privately or publicly, share & 1-click import Seedance workflows, follow directors, and send virtual gifts.
            </p>
          </button>

          <div className="p-5 rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-white/25 text-left space-y-3 transition-all sm:col-span-2 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Images className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">Curated Gallery & Private Vault</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-white/40" />
              </div>
              <p className="text-xs text-white/55">
                All completed renders auto-save privately to My Private Curates. Selectively submit favorites for Curator Review into Explore Public Curates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenCurated?.('public')}
                className="px-3 py-1.5 rounded-lg bg-white text-black text-[11px] font-semibold uppercase tracking-wider cursor-pointer"
              >
                Explore Public Curates
              </button>
              <button
                type="button"
                onClick={() => onOpenCurated?.('private')}
                className="px-3 py-1.5 rounded-lg border border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>My Private Curates</span>
              </button>
            </div>
          </div>
        </section>

        {/* Seedance 2.5 Model Fleet Matrix */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Seedance 2.5 Model Matrix
              </h2>
              <p className="text-xs text-white/50">
                Four official production configurations powered by ByteDance BytePlus ModelArk infrastructure.
              </p>
            </div>
            <span className="text-[11px] font-mono text-white/40">4 ACTIVE VARIANTS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelKeys.map((key) => {
              const model = SEEDANCE_MODELS[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05] transition-all p-5 flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05]">
                          {model.durationSeconds}s
                        </span>
                        <span className="text-sm font-semibold text-white">{model.label}</span>
                      </div>
                      <span className="text-xs font-mono text-white/75 font-medium tabular-nums">
                        {model.costGenerate} CR
                      </span>
                    </div>

                    <p className="text-xs text-white/60 leading-relaxed font-sans">
                      {model.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-white/50">
                      <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.07]">
                        Key: {model.id}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.07]">
                        Native: 720P
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.07]">
                        Max: 30,000 Words
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.07]">
                        Up to 30 Refs
                      </span>
                      {model.isR2V && (
                        <span className="px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.2] text-white">
                          R2V Multi-Image
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenGenerator(key)}
                    className="w-full py-2.5 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white hover:text-black hover:border-white text-white text-xs font-medium tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Configure in Generator</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent Production History Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">
                Recent Generation Activity
              </h2>
              <p className="text-xs text-white/50">
                Latest jobs submitted to your Seedance 2.5 generation pipeline.
              </p>
            </div>
            <button
              onClick={onOpenHistory}
              className="text-xs font-mono text-white/70 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View Full History ({history.length})</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {recentItems.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-8 text-center space-y-3">
              <Clock className="w-8 h-8 text-white/30 mx-auto" />
              <div className="text-sm font-medium text-white/80">
                {isAuthenticated ? 'No Generation History Yet' : 'Sign In for Personal Workspace History'}
              </div>
              <p className="text-xs text-white/50 max-w-md mx-auto">
                {isAuthenticated
                  ? 'Submit your first prompt using the Video Generator to initiate a Seedance 2.5 render.'
                  : 'Authenticate with your VAIURE account to persist your renders, credits, and AI creative memory.'}
              </p>
              <button
                onClick={() => (!isAuthenticated && onRequireAuth ? onRequireAuth() : onOpenGenerator())}
                className="mt-2 px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-white/90 transition-all cursor-pointer"
              >
                {isAuthenticated ? 'Create First Video' : 'Sign In Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectHistoryItem) onSelectHistoryItem(item);
                  }}
                  className="rounded-xl border border-white/[0.1] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05] p-3.5 space-y-3 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-neutral-900 border border-white/[0.08] relative flex items-center justify-center">
                      {item.result_url && (item.result_url.endsWith('.mp4') || item.result_url.endsWith('.webm')) ? (
                        <video
                          src={item.result_url}
                          className="w-full h-full object-cover"
                          preload="metadata"
                          muted
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-white/40">
                          <Film className="w-6 h-6" />
                          <span className="text-[10px] font-mono uppercase">{item.model}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="p-2 rounded-full bg-white text-black">
                          <Play className="w-4 h-4 fill-black" />
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                      <span className="truncate max-w-[120px]">{item.job_code}</span>
                      <span className="uppercase text-white/70">
                        {item.status === 'completed' ? '✓ DONE' : item.status}
                      </span>
                    </div>

                    <p className="text-xs text-white/80 line-clamp-2 font-sans">
                      {item.prompt || 'No prompt description'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span>{item.cost_generate} CR</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
