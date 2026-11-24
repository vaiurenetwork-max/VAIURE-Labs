/**
 * VAIURE — SEEDANCE BACKEND CONNECTION TEST & REAL-TIME DIAGNOSTICS CONSOLE
 * Streams live upstream API probes and non-billed dry-run pipeline simulations
 * against ByteDance Official ModelArk v3 and MUAPI Seedance 2.5 Spicy.
 *
 * Design Language: Monochromatic Black & White Glassmorphism
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  KeyRound,
  Lock,
  Play,
  Radio,
  RotateCcw,
  Server,
  ShieldCheck,
  Square,
  Terminal,
  Webhook,
  XCircle,
  Zap,
} from 'lucide-react';
import { SeedanceHealthStatus } from '../../../services/seedanceLabService';
import {
  BackendConnectionTestStep,
  ConnectionSituationStatus,
  ConnectionTestMode,
  ConnectionTestTarget,
  multiProviderGenerationService,
  ProviderConnectionSummary,
} from '../../../services/multiProviderGenerationService';
import { GenerationResolution } from '../../../types/multiProvider';

interface SeedanceBackendTestViewProps {
  isAuthenticated: boolean;
  health: SeedanceHealthStatus | null;
  onRequireAuth?: () => void;
  onOpenAccount?: () => void;
}

const RESOLUTIONS: GenerationResolution[] = ['480p', '720p', '1080p', '4K'];
const DURATIONS: number[] = [5, 10, 20, 30];

const SITUATION_META: Record<
  ConnectionSituationStatus | 'idle' | 'probing',
  {
    label: string;
    toneClass: string;
    icon: React.ReactNode;
  }
> = {
  idle: {
    label: 'STANDBY',
    toneClass: 'border-white/[0.15] bg-white/[0.04] text-white/60',
    icon: <Radio className="w-3.5 h-3.5 text-white/50" />,
  },
  probing: {
    label: 'PROBING...',
    toneClass: 'border-white/40 bg-white/[0.1] text-white animate-pulse',
    icon: <Activity className="w-3.5 h-3.5 text-white animate-spin" />,
  },
  connected: {
    label: 'CONNECTED',
    toneClass: 'border-white/60 bg-white text-black font-semibold',
    icon: <CheckCircle2 className="w-3.5 h-3.5 text-black" />,
  },
  simulated_ok: {
    label: 'SIMULATED OK',
    toneClass: 'border-white/45 bg-white/[0.14] text-white',
    icon: <Zap className="w-3.5 h-3.5 text-white" />,
  },
  reachable_auth_failed: {
    label: 'AUTH REJECTED',
    toneClass: 'border-white/30 bg-white/[0.08] text-white/90',
    icon: <KeyRound className="w-3.5 h-3.5 text-white/85" />,
  },
  key_unset: {
    label: 'KEY UNSET (503)',
    toneClass: 'border-white/20 bg-white/[0.04] text-white/65',
    icon: <Lock className="w-3.5 h-3.5 text-white/60" />,
  },
  unreachable: {
    label: 'UNREACHABLE',
    toneClass: 'border-white/25 bg-white/[0.06] text-white/80',
    icon: <XCircle className="w-3.5 h-3.5 text-white/75" />,
  },
  error: {
    label: 'ERROR',
    toneClass: 'border-white/25 bg-white/[0.06] text-white/80',
    icon: <AlertTriangle className="w-3.5 h-3.5 text-white/75" />,
  },
};

export const SeedanceBackendTestView: React.FC<SeedanceBackendTestViewProps> = ({
  isAuthenticated,
  health,
  onRequireAuth,
  onOpenAccount,
}) => {
  const [target, setTarget] = useState<ConnectionTestTarget>('all');
  const [mode, setMode] = useState<ConnectionTestMode>('simulate_pipeline');
  const [resolution, setResolution] = useState<GenerationResolution>('4K');
  const [duration, setDuration] = useState<number>(10);
  const [draft, setDraft] = useState<boolean>(false);

  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [steps, setSteps] = useState<BackendConnectionTestStep[]>([]);
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});
  const [completionInfo, setCompletionInfo] = useState<{
    passedSteps: number;
    totalSteps: number;
    timestamp: string;
  } | null>(null);

  const [summaries, setSummaries] = useState<
    Record<'bytedance' | 'muapi', ProviderConnectionSummary | null>
  >({
    bytedance: null,
    muapi: null,
  });

  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.();
      abortRef.current = null;
    };
  }, []);

  const handleStop = () => {
    abortRef.current?.();
    abortRef.current = null;
    setIsRunning(false);
  };

  const handleClear = () => {
    handleStop();
    setSteps([]);
    setSummaries({ bytedance: null, muapi: null });
    setCompletionInfo(null);
    setStreamError(null);
    setRunId(null);
    setExpandedStepIds({});
  };

  const handleStartTest = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    abortRef.current?.();
    setIsRunning(true);
    setStreamError(null);
    setSteps([]);
    setCompletionInfo(null);
    setExpandedStepIds({});
    setSummaries({ bytedance: null, muapi: null });

    const cancel = multiProviderGenerationService.streamBackendConnectionTest(
      {
        target,
        mode,
        resolution,
        duration,
        draft,
      },
      {
        onStart: (payload) => {
          setRunId(payload.runId);
        },
        onStep: (step) => {
          setSteps((prev) => [...prev, step]);
        },
        onProviderSummary: (summary) => {
          setSummaries((prev) => ({
            ...prev,
            [summary.providerId]: summary,
          }));
        },
        onComplete: (payload) => {
          setIsRunning(false);
          setCompletionInfo({
            passedSteps: payload.passedSteps,
            totalSteps: payload.totalSteps,
            timestamp: payload.timestamp,
          });
          for (const s of payload.summaries) {
            setSummaries((prev) => ({
              ...prev,
              [s.providerId]: s,
            }));
          }
          abortRef.current = null;
        },
        onError: (err) => {
          setIsRunning(false);
          setStreamError(err.message);
          abortRef.current = null;
        },
      }
    );

    abortRef.current = cancel;
  };

  const toggleExpandStep = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderProviderCard = (providerId: 'bytedance' | 'muapi') => {
    const isBD = providerId === 'bytedance';
    const summary = summaries[providerId];
    const shouldProbe = target === 'all' || target === providerId;
    const situationKey: ConnectionSituationStatus | 'idle' | 'probing' = summary
      ? summary.situation
      : isRunning && shouldProbe
      ? 'probing'
      : 'idle';
    const meta = SITUATION_META[situationKey] || SITUATION_META.idle;

    const defaultEndpoint = isBD
      ? `${health?.baseUrl || 'https://ark.ap-southeast.bytepluses.com/api/v3'}/contents/generations/tasks`
      : 'https://api.muapi.ai/api/v1/seedance-2.5-spicy-image-to-video';

    return (
      <div
        key={providerId}
        className="rounded-2xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-xl p-5 flex flex-col gap-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-white/45">
              <Server className="w-3.5 h-3.5" />
              <span>{isBD ? 'PROVIDER A · OFFICIAL' : 'PROVIDER B · SPICY 4K'}</span>
            </div>
            <h3 className="text-base font-serif text-white mt-1">
              {summary?.displayName ||
                (isBD ? 'ByteDance Official (ModelArk v3)' : 'MUAPI (Seedance 2.5 Spicy)')}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono tracking-wider uppercase ${meta.toneClass}`}
            >
              {meta.icon}
              <span>{meta.label}</span>
            </span>
            {!isBD && summary?.sandboxMode && (
              <span className="px-2 py-0.5 rounded border border-white/30 bg-white/[0.08] text-[9px] font-mono uppercase tracking-wider text-white/90">
                SANDBOX MODE (NO BILLING)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-mono">
          <div className="rounded-xl border border-white/[0.08] bg-black/50 p-2.5">
            <div className="text-[9px] text-white/40 uppercase">HTTP Status</div>
            <div className="text-white mt-0.5 tabular-nums">
              {summary?.httpStatus ? `HTTP ${summary.httpStatus}` : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/50 p-2.5">
            <div className="text-[9px] text-white/40 uppercase">Latency</div>
            <div className="text-white mt-0.5 tabular-nums">
              {typeof summary?.latencyMs === 'number' ? `${summary.latencyMs} ms` : '—'}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/50 p-2.5">
            <div className="text-[9px] text-white/40 uppercase">Auth Header</div>
            <div className="text-white mt-0.5 truncate">
              {isBD ? 'Bearer ****' : 'x-api-key ****'}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-black/50 p-2.5">
            <div className="text-[9px] text-white/40 uppercase">
              {!isBD && typeof summary?.muapiAccountBalanceUsd === 'number'
                ? 'MUAPI Balance'
                : 'Poll / Push'}
            </div>
            <div className="text-white mt-0.5 tabular-nums">
              {!isBD && typeof summary?.muapiAccountBalanceUsd === 'number'
                ? `$${summary.muapiAccountBalanceUsd.toFixed(2)} USD`
                : `${summary?.pollIntervalMs || (isBD ? 5000 : 3000)}ms${
                    summary?.webhookReady ? ' + WH' : ''
                  }`}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-black/60 px-3 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-mono uppercase tracking-wider text-white/40">
              Upstream Endpoint & Situation
            </div>
            <div className="text-[11px] font-mono text-white/80 truncate mt-0.5">
              {summary?.endpoint || defaultEndpoint}
            </div>
            <div className="text-[11px] text-white/55 mt-1">
              {summary?.detail ||
                (shouldProbe
                  ? 'Press Run Connection Test to verify live backend API connectivity.'
                  : 'Excluded by current target filter.')}
            </div>
          </div>
          {summary?.keyMask && (
            <span className="px-2 py-1 rounded border border-white/[0.12] bg-white/[0.04] font-mono text-[10px] text-white/75 shrink-0">
              {summary.keyMask}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] backdrop-blur-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.24em] text-white/50">
            <Terminal className="w-3.5 h-3.5 text-white/80" />
            <span>REAL-TIME BACKEND DIAGNOSTICS · SERVER-SIDE ONLY</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif text-white tracking-tight">
            ByteDance &amp; MUAPI Live Connection Test
          </h1>
          <p className="text-xs sm:text-sm text-white/60 max-w-2xl">
            Stream live backend API reachability checks, credential status verification, HMAC
            webhook signatures, and non-billed dry-run generation payload validation in real time
            over Server-Sent Events (0 credits deducted).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onOpenAccount && (
            <button
              type="button"
              onClick={onOpenAccount}
              className="px-3.5 py-2.5 rounded-xl border border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-white/80 transition-all cursor-pointer"
            >
              API Vault Telemetry
            </button>
          )}

          <button
            type="button"
            onClick={handleClear}
            disabled={isRunning && steps.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-white/75 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white bg-white/15 hover:bg-white/25 text-xs font-mono font-semibold text-white transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop Stream</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartTest}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-white/90 text-black text-xs font-mono font-semibold tracking-wider uppercase shadow-[0_4px_20px_rgba(255,255,255,0.18)] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Connection Test</span>
            </button>
          )}
        </div>
      </div>

      {/* Authentication Prompt if Guest */}
      {!isAuthenticated && (
        <div className="rounded-2xl border border-white/25 bg-white/[0.05] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-white">
                Authentication Required for Live Backend Probes
              </div>
              <div className="text-xs text-white/60 mt-0.5">
                Server-side upstream API probing uses authenticated Bearer tokens and strict rate
                limits so external provider keys cannot be probed anonymously.
              </div>
            </div>
          </div>
          {onRequireAuth && (
            <button
              type="button"
              onClick={onRequireAuth}
              className="px-4 py-2 rounded-xl bg-white text-black text-xs font-mono font-semibold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer shrink-0"
            >
              Sign In to Test
            </button>
          )}
        </div>
      )}

      {/* Test Configuration Controls */}
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.025] backdrop-blur-xl p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Target Provider */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
            1. API Target Scope
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'all' as ConnectionTestTarget, label: 'Both APIs' },
              { id: 'bytedance' as ConnectionTestTarget, label: 'ByteDance' },
              { id: 'muapi' as ConnectionTestTarget, label: 'MUAPI' },
            ].map((item) => {
              const active = target === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setTarget(item.id)}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-white/[0.03] text-white/70 border-white/[0.12] hover:bg-white/[0.08]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Probe Mode */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
            2. Diagnostic Execution Mode
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setMode('live_probe')}
              className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                mode === 'live_probe'
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-white/[0.03] text-white/70 border-white/[0.12] hover:bg-white/[0.08]'
              }`}
            >
              Live API Probe
            </button>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setMode('simulate_pipeline')}
              className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                mode === 'simulate_pipeline'
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-white/[0.03] text-white/70 border-white/[0.12] hover:bg-white/[0.08]'
              }`}
            >
              Simulate Pipeline ($0)
            </button>
          </div>
        </div>

        {/* Dry-Run Payload Config */}
        <div className="space-y-2">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/50">
            3. Dry-Run Payload Matrix
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Dry-Run Resolution"
              disabled={isRunning}
              value={resolution}
              onChange={(e) => setResolution(e.target.value as GenerationResolution)}
              className="px-3 py-2 rounded-xl border border-white/[0.14] bg-black text-white text-xs font-mono outline-none"
            >
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <select
              aria-label="Dry-Run Duration"
              disabled={isRunning}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-white/[0.14] bg-black text-white text-xs font-mono outline-none"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}s
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => setDraft((v) => !v)}
              className={`px-3 py-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                draft
                  ? 'bg-white text-black border-white font-semibold'
                  : 'bg-white/[0.03] text-white/70 border-white/[0.12] hover:bg-white/[0.08]'
              }`}
            >
              {draft ? 'Draft 480p: ON' : 'Draft: OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Situation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderProviderCard('bytedance')}
        {renderProviderCard('muapi')}
      </div>

      {/* Stream Error */}
      {streamError && (
        <div className="rounded-xl border border-white/30 bg-white/[0.07] px-4 py-3 flex items-center gap-2.5 text-xs font-mono text-white">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{streamError}</span>
        </div>
      )}

      {/* Real-Time Backend Process Calls Stream */}
      <div className="rounded-2xl border border-white/[0.12] bg-black/80 backdrop-blur-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.1] bg-white/[0.03] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-white/80" />
            <span className="text-xs font-mono uppercase tracking-[0.18em] text-white font-semibold">
              Live Backend API Call Stream
            </span>
            {runId && (
              <span className="px-2 py-0.5 rounded border border-white/[0.12] bg-white/[0.04] text-[10px] font-mono text-white/60">
                {runId}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-white/65">
            {isRunning && (
              <span className="inline-flex items-center gap-1.5 text-white">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                STREAMING SSE
              </span>
            )}
            {completionInfo && !isRunning && (
              <span className="inline-flex items-center gap-1.5 text-white/90">
                <Webhook className="w-3.5 h-3.5" />
                {completionInfo.passedSteps}/{completionInfo.totalSteps} PASSED
              </span>
            )}
          </div>
        </div>

        <div className="divide-y divide-white/[0.07] max-h-[540px] overflow-y-auto">
          {steps.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Terminal className="w-7 h-7 text-white/30 mx-auto" />
              <div className="text-xs font-mono text-white/60 uppercase tracking-wider">
                {isRunning
                  ? 'Connecting to Server-Sent Events stream...'
                  : 'No active connection diagnostics in terminal'}
              </div>
              <p className="text-xs text-white/40 max-w-md mx-auto">
                Choose Live API Probe to verify actual upstream ByteDance &amp; MUAPI credentials,
                or Simulate Pipeline ($0) to dry-run payload building, pricing, and HMAC webhook
                signing step by step.
              </p>
            </div>
          ) : (
            steps.map((step, idx) => {
              const isExpanded = Boolean(expandedStepIds[step.id]);
              const hasInspector = Boolean(step.requestPreview || step.responsePreview);
              return (
                <div
                  key={step.id}
                  className="px-4 sm:px-5 py-3.5 hover:bg-white/[0.025] transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-[10px] font-mono text-white/40 tabular-nums w-6">
                        #{idx + 1}
                      </span>

                      {step.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-white/60 shrink-0" />
                      )}

                      <span className="px-2 py-0.5 rounded border border-white/[0.14] bg-white/[0.06] text-[10px] font-mono uppercase text-white/85">
                        {step.provider}
                      </span>

                      <span className="px-2 py-0.5 rounded border border-white/[0.1] bg-black text-[10px] font-mono uppercase text-white/65">
                        {step.phase}
                      </span>

                      {step.simulated && (
                        <span className="px-2 py-0.5 rounded border border-white/30 bg-white/[0.12] text-[10px] font-mono uppercase text-white">
                          DRY-RUN
                        </span>
                      )}

                      <span className="text-[11px] font-mono text-white/50">{step.method}</span>
                      <span className="text-[11px] font-mono text-white/80 truncate max-w-[380px]">
                        {step.endpoint}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-[10px] font-mono">
                      {typeof step.httpStatus === 'number' && (
                        <span
                          className={`px-2 py-0.5 rounded border ${
                            step.ok
                              ? 'border-white/30 bg-white/[0.08] text-white'
                              : 'border-white/20 bg-white/[0.04] text-white/70'
                          }`}
                        >
                          HTTP {step.httpStatus}
                        </span>
                      )}
                      <span className="text-white/55 tabular-nums">{step.latencyMs}ms</span>
                      <span className="text-white/40 tabular-nums">
                        {new Date(step.timestamp).toLocaleTimeString()}
                      </span>
                      {hasInspector && (
                        <button
                          type="button"
                          onClick={() => toggleExpandStep(step.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-white/[0.12] bg-white/[0.04] text-white/75 hover:text-white cursor-pointer"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                          <span>JSON</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pl-8 mt-1.5 text-xs text-white/75">{step.summary}</div>

                  {isExpanded && hasInspector && (
                    <div className="ml-8 mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {step.requestPreview && (
                        <div className="rounded-xl border border-white/[0.1] bg-black p-3">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-white/45 mb-1.5">
                            Sanitized Request Preview
                          </div>
                          <pre className="text-[11px] font-mono text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(step.requestPreview, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.responsePreview && (
                        <div className="rounded-xl border border-white/[0.1] bg-black p-3">
                          <div className="text-[9px] font-mono uppercase tracking-wider text-white/45 mb-1.5">
                            Sanitized Response Preview
                          </div>
                          <pre className="text-[11px] font-mono text-white/80 overflow-x-auto whitespace-pre-wrap break-all">
                            {JSON.stringify(step.responsePreview, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
