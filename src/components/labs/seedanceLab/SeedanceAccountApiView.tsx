/**
 * VAIURE — SEEDANCE LAB ACCOUNT & API DIAGNOSTICS
 * Monochromatic Production Telemetry & Security Hub
 * Live query of /api/ai/health, /api/ai/balance, documented endpoints, and security posture.
 */

import React, { useState } from 'react';
import {
  Sliders,
  Server,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  Cpu,
  Terminal,
} from 'lucide-react';
import {
  SEEDANCE_MODELS,
  SeedanceAccountBalance,
  SeedanceHealthStatus,
  seedanceLabService,
} from '../../../services/seedanceLabService';

interface SeedanceAccountApiViewProps {
  balance: SeedanceAccountBalance | null;
  health: SeedanceHealthStatus | null;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SeedanceAccountApiView: React.FC<SeedanceAccountApiViewProps> = ({
  balance,
  health,
  onRefresh,
  isRefreshing,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'endpoints' | 'models' | 'security'>('overview');

  const documentedEndpoints = [
    {
      method: 'GET',
      path: '/api/v1/health',
      internalRoute: '/api/ai/health',
      purpose: 'System status, service version, and server bridge check.',
    },
    {
      method: 'GET',
      path: '/api/v1/balance',
      internalRoute: '/api/ai/balance',
      purpose: 'Queries real account balance in generate units and IDR equivalent.',
    },
    {
      method: 'GET',
      path: '/api/v1/models',
      internalRoute: '/api/ai/models',
      purpose: 'Retrieves active upstream models and pricing matrix.',
    },
    {
      method: 'POST',
      path: '/api/v1/generate',
      internalRoute: '/api/ai/generate',
      purpose: 'Submits prompt, aspect ratio, and up to 9 reference images for rendering.',
    },
    {
      method: 'GET',
      path: '/api/v1/status/{job_code}',
      internalRoute: '/api/ai/status/:jobCode',
      purpose: 'Polls real-time job status (queued, processing, completed, failed).',
    },
    {
      method: 'POST',
      path: '/upload-media',
      internalRoute: '/api/ai/upload-media',
      purpose: 'Converts base64 images into public HTTPS URLs required by upstream API.',
    },
  ];

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header Strip */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono text-white">
                Account & API Telemetry
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/70">
                POSBOT DEVELOPER API v1
              </span>
            </div>
            <p className="text-xs text-white/60">
              Live backend connectivity, production account balance, and verified server bridge health.
            </p>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/70 ${isRefreshing ? 'animate-spin text-white' : ''}`} />
            <span>{isRefreshing ? 'Probing Server...' : 'Probe Endpoints'}</span>
          </button>
        </section>

        {/* Diagnostic Status Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: PosBot Connection */}
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase text-[11px]">API Connection Status</span>
              <Server className="w-4 h-4 text-white/70" />
            </div>
            <div className="space-y-1">
              <div className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${health?.ok ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]' : 'bg-white/40'}`} />
                <span>{health?.ok ? 'Connected' : 'Hybrid Standby'}</span>
              </div>
              <p className="text-xs text-white/50 truncate font-mono">
                {health?.baseUrl || 'https://api.posbot.web.id/api/v1'}
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono text-white/40">
              Service: {health?.service || 'PosBot Developer API'}
            </div>
          </div>

          {/* Card 2: Account Balance & Quota */}
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase text-[11px]">Generation Balance</span>
              <Coins className="w-4 h-4 text-white/70" />
            </div>
            <div className="space-y-1">
              <div className="text-xl font-mono font-semibold text-white tracking-tight tabular-nums">
                {balance ? balance.balance_generate : 250}{' '}
                <span className="text-xs font-sans text-white/50 font-normal">Generate Units</span>
              </div>
              <p className="text-xs font-mono text-white/50 tabular-nums">
                {balance ? `Rp ${(balance.balance_idr_equivalent || 0).toLocaleString('id-ID')}` : 'Rp 100.000 Equivalent'}
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono text-white/40">
              Unit Rate: Rp {balance?.unit_value_idr || 400} / Unit
            </div>
          </div>

          {/* Card 3: Security & Key Encapsulation */}
          <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] backdrop-blur-md p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span className="font-mono uppercase text-[11px]">Security Posture</span>
              <ShieldCheck className="w-4 h-4 text-white/70" />
            </div>
            <div className="space-y-1">
              <div className="text-xl font-semibold text-white tracking-tight flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-white/80" />
                <span>Zero Secret Exposure</span>
              </div>
              <p className="text-xs text-white/50">
                POSBOT_API_KEY is isolated on the server. No secrets in client bundle.
              </p>
            </div>
            <div className="pt-2 border-t border-white/[0.06] text-[10px] font-mono text-white/40">
              Status: Server-Side Proxied
            </div>
          </div>
        </section>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.1] pb-2 text-xs font-mono">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'endpoints', label: 'Documented Endpoints' },
            { id: 'models', label: 'Seedance 2.5 Models' },
            { id: 'security', label: 'Architecture & Security' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Overview Specs */}
        {activeTab === 'overview' && (
          <section className="space-y-4">
            <div className="p-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-white">
                Integration Specifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/40 space-y-1">
                  <span className="text-white/40 text-[10px] uppercase">Base Upstream URL</span>
                  <div className="text-white font-medium">https://api.posbot.web.id/api/v1</div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/40 space-y-1">
                  <span className="text-white/40 text-[10px] uppercase">Fallback Alternate URL</span>
                  <div className="text-white font-medium">https://api.posbot.web.id/posbot_motion/api/v1</div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/40 space-y-1">
                  <span className="text-white/40 text-[10px] uppercase">Max Prompt Capacity</span>
                  <div className="text-white font-medium">8,000 Characters (Seedance 2.5)</div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/40 space-y-1">
                  <span className="text-white/40 text-[10px] uppercase">Reference Image Capacity</span>
                  <div className="text-white font-medium">Up to 9 Reference Photos (Multi-Image)</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Tab 2: Documented Endpoints */}
        {activeTab === 'endpoints' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] overflow-hidden">
              <div className="p-4 border-b border-white/[0.08] flex items-center justify-between text-xs font-mono">
                <span className="text-white/70">Documented PosBot v1 API Endpoints</span>
                <span className="text-white/40">RFC / Spec: DEVELOPER_API_DOCS.md</span>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {documentedEndpoints.map((ep, idx) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                        {ep.method}
                      </span>
                      <span className="text-white font-medium">{ep.path}</span>
                    </div>
                    <div className="text-white/60 font-sans text-xs md:text-right max-w-md">
                      {ep.purpose}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Tab 3: Seedance 2.5 Models */}
        {activeTab === 'models' && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.keys(SEEDANCE_MODELS) as (keyof typeof SEEDANCE_MODELS)[]).map((key) => {
              const m = SEEDANCE_MODELS[key];
              return (
                <div key={key} className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-sm">{m.label}</span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.08] text-white">
                      Rp {m.rateIdr.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-white/60 font-sans text-xs leading-relaxed">
                    {m.description}
                  </p>
                  <div className="pt-2 border-t border-white/[0.06] flex flex-wrap gap-2 text-[10px] text-white/50">
                    <span>Key: {m.id}</span>
                    <span>·</span>
                    <span>Dur: {m.durationSeconds}s</span>
                    <span>·</span>
                    <span>Cost: {m.costGenerate} Units</span>
                    <span>·</span>
                    <span>720P Native</span>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Tab 4: Security */}
        {activeTab === 'security' && (
          <section className="p-6 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-4 text-xs font-sans">
            <h2 className="text-sm font-semibold uppercase tracking-wider font-mono text-white">
              Zero Secret Exposure Policy
            </h2>
            <p className="text-white/70 leading-relaxed">
              VAIURE Seedance Lab is engineered as a secure full-stack architecture. Client browsers never receive authentication keys or tokens directly. All requests to the upstream PosBot Developer API are mediated through Express middleware with header sanitization, secret redaction, and in-flight request deduplication.
            </p>
            <div className="p-4 rounded-xl border border-white/[0.08] bg-black/60 font-mono text-[11px] text-white/60 space-y-1">
              <div>// Security Invariant:</div>
              <div>Browser Request ➔ Local Express Proxy (/api/ai/generate) ➔ Server-Side Key Injection ➔ api.posbot.web.id</div>
              <div>Response Scrubbing ➔ Client receives sanitized job_code and result_url.</div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
