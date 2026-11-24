/**
 * VAIURE — SEEDANCE LAB ADMIN: PROVIDERS, CAPABILITIES, USD PRICING MATRIX & ANALYTICS
 * Monochromatic Glassmorphism Governance Sub-Panel
 * Strictly admin-gated via /api/admin/providers/*. API credentials are encrypted server-side and never returned.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  KeyRound,
  Save,
  RefreshCw,
  Plus,
  HardDrive,
  Activity,
  DollarSign,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  GenerationDuration,
  GenerationResolution,
  MultiProviderAnalyticsSummary,
  ProviderConfigPublic,
  ProviderModelDefinition,
  UnifiedGenerationJob,
} from '../../../types/multiProvider';
import { multiProviderGenerationService } from '../../../services/multiProviderGenerationService';

interface ProviderPricingAdminPanelProps {
  onNotice?: (msg: string) => void;
  onPlatformConfigUpdated?: () => void;
}

const ALL_RESOLUTIONS: GenerationResolution[] = ['480p', '720p', '1080p', '4K'];
const ALL_DURATIONS: GenerationDuration[] = [5, 10, 20, 30];

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const ProviderPricingAdminPanel: React.FC<ProviderPricingAdminPanelProps> = ({
  onNotice,
  onPlatformConfigUpdated,
}) => {
  const [providers, setProviders] = useState<ProviderConfigPublic[]>([]);
  const [analytics, setAnalytics] = useState<MultiProviderAnalyticsSummary | null>(null);
  const [recentJobs, setRecentJobs] = useState<UnifiedGenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [sandboxKeyInputs, setSandboxKeyInputs] = useState<Record<string, string>>({});

  // Add New Model form state
  const [showAddModel, setShowAddModel] = useState(false);
  const [newModelProvider, setNewModelProvider] = useState<string>('muapi');
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelEndpoint, setNewModelEndpoint] = useState(
    'https://api.muapi.ai/api/v1/'
  );
  const [newModelResultTemplate, setNewModelResultTemplate] = useState(
    'https://api.muapi.ai/api/v1/predictions/{request_id}/result'
  );
  const [newModelMarkupPct, setNewModelMarkupPct] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [provList, analRes] = await Promise.all([
        multiProviderGenerationService.adminListProviders(),
        multiProviderGenerationService.adminGetAnalytics(),
      ]);
      setProviders(provList);
      setAnalytics(analRes.analytics);
      setRecentJobs(analRes.recentJobs || []);
    } catch (err: any) {
      onNotice?.(err?.message || 'Failed to load multi-provider admin settings.');
    } finally {
      setLoading(false);
    }
  }, [onNotice]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProvider = async (provider: ProviderConfigPublic) => {
    setSavingKey(`provider:${provider.providerId}`);
    try {
      const pendingApiKey = (apiKeyInputs[provider.providerId] || '').trim();
      const pendingSandboxKey = (sandboxKeyInputs[provider.providerId] || '').trim();
      const updated = await multiProviderGenerationService.adminUpdateProvider(provider.providerId, {
        displayName: provider.displayName,
        clientName: provider.clientName,
        enabled: provider.enabled,
        sandboxMode: Boolean(provider.sandboxMode),
        baseUrl: provider.baseUrl,
        autoFallbackEnabled: provider.autoFallbackEnabled,
        pollIntervalMs: provider.pollIntervalMs,
        creditsPerUsd: provider.creditsPerUsd,
        enforceWalletOnUsdProviders: provider.enforceWalletOnUsdProviders,
        ...(pendingApiKey ? { apiKey: pendingApiKey } : {}),
        ...(pendingSandboxKey ? { sandboxApiKey: pendingSandboxKey } : {}),
      });
      setProviders((prev) =>
        prev.map((p) => (p.providerId === provider.providerId ? updated : p))
      );
      if (pendingApiKey) {
        setApiKeyInputs((prev) => ({ ...prev, [provider.providerId]: '' }));
      }
      if (pendingSandboxKey) {
        setSandboxKeyInputs((prev) => ({ ...prev, [provider.providerId]: '' }));
      }
      onNotice?.(
        `Saved ${updated.displayName} settings${
          pendingApiKey || pendingSandboxKey ? ' & encrypted API credential' : ''
        }.`
      );
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      onNotice?.(err?.message || 'Failed to save provider settings.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveModel = async (providerId: string, model: ProviderModelDefinition) => {
    setSavingKey(`model:${providerId}:${model.modelId}`);
    try {
      const res = await multiProviderGenerationService.adminUpsertModel(providerId, model);
      setProviders((prev) =>
        prev.map((p) => (p.providerId === providerId ? res.provider : p))
      );
      onNotice?.(`Saved model capabilities & USD pricing matrix for ${model.displayName}.`);
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      onNotice?.(err?.message || 'Failed to save model configuration.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreateCustomModel = async () => {
    const cleanId = newModelId.trim();
    const cleanName = newModelName.trim() || cleanId;
    if (!cleanId) {
      onNotice?.('Enter a valid Model ID (e.g. muapi/seedance-2.5-pro).');
      return;
    }
    setSavingKey('create-model');
    try {
      const res = await multiProviderGenerationService.adminUpsertModel(newModelProvider, {
        modelId: cleanId,
        displayName: cleanName,
        submitEndpoint: newModelEndpoint.trim() || undefined,
        resultEndpointTemplate: newModelResultTemplate.trim() || undefined,
        enabled: true,
        category: 'Image-to-Video',
        resolutions: ['480p', '720p', '1080p', '4K'],
        enabledResolutions: ['480p', '720p', '1080p', '4K'],
        durations: [5, 10, 20, 30],
        enabledDurations: [5, 10, 20, 30],
        pricingCurrency: 'USD',
        usdPricingMatrix: {
          '480p': { 5: 0.94, 10: 1.87, 20: 3.74, 30: 5.61 },
          '720p': { 5: 1.87, 10: 3.74, 20: 7.48, 30: 11.22 },
          '1080p': { 5: 4.67, 10: 9.35, 20: 18.7, 30: 28.05 },
          '4K': { 5: 9.35, 10: 18.7, 20: 37.4, 30: 56.1 },
        },
        appMarkupPercent: Number(newModelMarkupPct) || 0,
        appMarkupFlatUsd: 0,
      });
      setProviders((prev) =>
        prev.map((p) => (p.providerId === newModelProvider ? res.provider : p))
      );
      setNewModelId('');
      setNewModelName('');
      setShowAddModel(false);
      onNotice?.(`Added new model "${cleanName}" under provider ${newModelProvider}.`);
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      onNotice?.(err?.message || 'Could not create model.');
    } finally {
      setSavingKey(null);
    }
  };

  const updateLocalProvider = (
    providerId: string,
    updater: (p: ProviderConfigPublic) => ProviderConfigPublic
  ) => {
    setProviders((prev) => prev.map((p) => (p.providerId === providerId ? updater(p) : p)));
  };

  const updateLocalModel = (
    providerId: string,
    modelId: string,
    updater: (m: ProviderModelDefinition) => ProviderModelDefinition
  ) => {
    updateLocalProvider(providerId, (prov) => ({
      ...prov,
      models: prov.models.map((m) => (m.modelId === modelId ? updater(m) : m)),
    }));
  };

  return (
    <div className="space-y-6 text-xs font-mono">
      {/* Top Toolbar & Monitoring Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-white" />
          <h2 className="text-sm font-semibold uppercase text-white">
            Multi-Provider Architecture, Encrypted Keys &amp; Pricing Matrix
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddModel((v) => !v)}
            className="px-3 py-2 rounded-lg bg-white text-black font-semibold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer hover:bg-white/90"
          >
            <Plus className="w-3.5 h-3.5" /> Add Provider Model
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-lg border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-white text-[11px] uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Reload
          </button>
        </div>
      </div>

      {/* Live Multi-Provider Telemetry Summary */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-1">
            <div className="flex items-center justify-between text-white/50 uppercase text-[10px]">
              <span>Multi-Provider Jobs</span>
              <Activity className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums">
              {analytics.totalJobs}
            </div>
            <div className="text-[11px] text-white/55">
              {analytics.completedJobs} Done · {analytics.activeJobs} Active · {analytics.failedJobs}{' '}
              Failed
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-1">
            <div className="flex items-center justify-between text-white/50 uppercase text-[10px]">
              <span>Draft -&gt; Final Workflow</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums">
              {analytics.draftJobs} / {analytics.finalizedJobs}
            </div>
            <div className="text-[11px] text-white/55">Drafts Created / Finalized 1080p</div>
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-1">
            <div className="flex items-center justify-between text-white/50 uppercase text-[10px]">
              <span>USD Cost vs App Markup</span>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums">
              ${analytics.totalEstimatedRevenueUsd.toFixed(2)}
            </div>
            <div className="text-[11px] text-white/55 tabular-nums">
              Provider: ${analytics.totalProviderCostUsd.toFixed(2)} · Markup: $
              {analytics.totalMarkupUsd.toFixed(2)}
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-1">
            <div className="flex items-center justify-between text-white/50 uppercase text-[10px]">
              <span>Protected Video Vault</span>
              <HardDrive className="w-3.5 h-3.5" />
            </div>
            <div className="text-2xl font-semibold text-white tabular-nums">
              {formatBytes(analytics.totalStoredBytes)}
            </div>
            <div className="text-[11px] text-white/55">
              {analytics.storedFilesCount} Archived Media Files
            </div>
          </div>
        </div>
      )}

      {/* Add New Provider Model Drawer */}
      {showAddModel && (
        <div className="p-5 rounded-2xl border border-white/25 bg-white/[0.05] space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-sm font-semibold uppercase text-white">
              Register Additional MUAPI / Provider Model
            </span>
            <button
              type="button"
              onClick={() => setShowAddModel(false)}
              className="text-white/60 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="space-y-1">
              <span className="text-[10px] text-white/55 uppercase">Provider</span>
              <select
                value={newModelProvider}
                onChange={(e) => setNewModelProvider(e.target.value)}
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              >
                {providers.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.displayName} ({p.providerId})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-white/55 uppercase">Model ID</span>
              <input
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="muapi/seedance-2.5-pro-image-to-video"
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-white/55 uppercase">Display Name</span>
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="Seedance 2.5 Pro"
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-[10px] text-white/55 uppercase">Submit Endpoint</span>
              <input
                type="text"
                value={newModelEndpoint}
                onChange={(e) => setNewModelEndpoint(e.target.value)}
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-white/55 uppercase">Default App Markup (%)</span>
              <input
                type="number"
                min={0}
                value={newModelMarkupPct}
                onChange={(e) => setNewModelMarkupPct(Number(e.target.value) || 0)}
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              />
            </label>
            <label className="space-y-1 md:col-span-3">
              <span className="text-[10px] text-white/55 uppercase">Result Endpoint Template</span>
              <input
                type="text"
                value={newModelResultTemplate}
                onChange={(e) => setNewModelResultTemplate(e.target.value)}
                className="w-full p-2 rounded border border-white/20 bg-black text-white"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleCreateCustomModel}
            disabled={savingKey === 'create-model'}
            className="px-4 py-2 rounded-lg bg-white text-black font-semibold uppercase text-[11px] cursor-pointer hover:bg-white/90"
          >
            {savingKey === 'create-model' ? 'Saving...' : 'Create Model & Initialize Matrix'}
          </button>
        </div>
      )}

      {/* Provider Cards */}
      <div className="space-y-6">
        {providers.map((provider) => {
          const provStats = analytics?.byProvider?.[provider.providerId];
          return (
            <section
              key={provider.providerId}
              className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-5"
            >
              {/* Provider Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-white">
                      {provider.displayName}
                    </span>
                    <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] uppercase">
                      ID: {provider.providerId}
                    </span>
                    {provider.clientName && (
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] border border-white/15 text-[10px]">
                        Client: {provider.clientName}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        provider.configured
                          ? 'bg-white text-black'
                          : 'border border-white/25 text-white/70'
                      }`}
                    >
                      {provider.configured ? `Key Ready (${provider.keyMask || 'Vault'})` : 'API Key Unset'}
                    </span>
                    {provider.providerId === 'muapi' && provider.sandboxMode && (
                      <span className="px-2 py-0.5 rounded border border-white/40 bg-white/[0.12] text-[10px] font-bold uppercase text-white">
                        SANDBOX MODE ({provider.sandboxKeyMask || 'is_test'})
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/55">
                    {provider.safetyNotice}
                    {provStats &&
                      ` · Requests: ${provStats.total} (${provStats.completed} completed, ${provStats.failed} failed)`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateLocalProvider(provider.providerId, (p) => ({
                        ...p,
                        enabled: !p.enabled,
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold uppercase cursor-pointer ${
                      provider.enabled
                        ? 'border-white bg-white text-black'
                        : 'border-white/20 text-white/60'
                    }`}
                  >
                    {provider.enabled ? 'Provider Enabled' : 'Provider Disabled'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveProvider(provider)}
                    disabled={savingKey === `provider:${provider.providerId}`}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-black font-semibold text-[11px] uppercase flex items-center gap-1.5 cursor-pointer hover:bg-white/90"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {savingKey === `provider:${provider.providerId}` ? 'Saving...' : 'Save Provider'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Provider Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="space-y-1">
                  <span className="text-[10px] text-white/50 uppercase flex items-center gap-1">
                    <KeyRound className="w-3 h-3" /> Update API Key (Encrypted)
                  </span>
                  <input
                    type="password"
                    value={apiKeyInputs[provider.providerId] || ''}
                    onChange={(e) =>
                      setApiKeyInputs((prev) => ({
                        ...prev,
                        [provider.providerId]: e.target.value,
                      }))
                    }
                    placeholder={
                      provider.configured
                        ? `Current: ${provider.keyMask || 'configured'} (enter to rotate)`
                        : 'Paste backend x-api-key...'
                    }
                    autoComplete="off"
                    className="w-full p-2 rounded border border-white/15 bg-black text-white placeholder-white/35"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] text-white/50 uppercase">Base API URL</span>
                  <input
                    type="text"
                    value={provider.baseUrl}
                    onChange={(e) =>
                      updateLocalProvider(provider.providerId, (p) => ({
                        ...p,
                        baseUrl: e.target.value,
                      }))
                    }
                    className="w-full p-2 rounded border border-white/15 bg-black text-white"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[10px] text-white/50 uppercase">Poll Interval (ms)</span>
                  <input
                    type="number"
                    min={2000}
                    max={30000}
                    step={500}
                    value={provider.pollIntervalMs}
                    onChange={(e) =>
                      updateLocalProvider(provider.providerId, (p) => ({
                        ...p,
                        pollIntervalMs: Number(e.target.value) || 3000,
                      }))
                    }
                    className="w-full p-2 rounded border border-white/15 bg-black text-white"
                  />
                </label>

                <div className="space-y-1">
                  <span className="text-[10px] text-white/50 uppercase">Auto-Fallback Policy</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateLocalProvider(provider.providerId, (p) => ({
                        ...p,
                        autoFallbackEnabled: !p.autoFallbackEnabled,
                      }))
                    }
                    className={`w-full p-2 rounded border font-semibold cursor-pointer ${
                      provider.autoFallbackEnabled
                        ? 'border-white bg-white text-black'
                        : 'border-white/20 bg-black text-white/70'
                    }`}
                  >
                    {provider.autoFallbackEnabled
                      ? 'Fallback ON (Manual Opt-In)'
                      : 'Strict Selected Provider Only'}
                  </button>
                </div>
              </div>

              {provider.providerId === 'muapi' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-xl border border-white/[0.1] bg-black/50">
                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> Sandbox Mode API Key (is_test, Encrypted)
                    </span>
                    <input
                      type="password"
                      value={sandboxKeyInputs[provider.providerId] || ''}
                      onChange={(e) =>
                        setSandboxKeyInputs((prev) => ({
                          ...prev,
                          [provider.providerId]: e.target.value,
                        }))
                      }
                      placeholder={
                        provider.sandboxConfigured
                          ? `Current Sandbox: ${provider.sandboxKeyMask || 'configured'} (enter to rotate)`
                          : 'Paste MUAPI sandbox x-api-key...'
                      }
                      autoComplete="off"
                      className="w-full p-2 rounded border border-white/15 bg-black text-white placeholder-white/35"
                    />
                  </label>

                  <div className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">
                      MUAPI Execution Mode
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateLocalProvider(provider.providerId, (p) => ({
                          ...p,
                          sandboxMode: !p.sandboxMode,
                        }))
                      }
                      className={`w-full p-2 rounded border font-semibold cursor-pointer ${
                        provider.sandboxMode
                          ? 'border-white bg-white text-black'
                          : 'border-white/20 bg-black text-white/75'
                      }`}
                    >
                      {provider.sandboxMode
                        ? 'SANDBOX MODE ON (Mock Outputs · $0 Billing)'
                        : 'LIVE PRODUCTION MODE (Real Credits)'}
                    </button>
                  </div>
                </div>
              )}

              {provider.providerId !== 'bytedance' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Credits per $1.00 USD</span>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={provider.creditsPerUsd}
                      onChange={(e) =>
                        updateLocalProvider(provider.providerId, (p) => ({
                          ...p,
                          creditsPerUsd: Number(e.target.value) || 25,
                        }))
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>
                  <div className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Wallet Deduction on Submit</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateLocalProvider(provider.providerId, (p) => ({
                          ...p,
                          enforceWalletOnUsdProviders: !p.enforceWalletOnUsdProviders,
                        }))
                      }
                      className={`w-full p-2 rounded border font-semibold cursor-pointer ${
                        provider.enforceWalletOnUsdProviders
                          ? 'border-white bg-white text-black'
                          : 'border-white/20 bg-black text-white/65'
                      }`}
                    >
                      {provider.enforceWalletOnUsdProviders
                        ? 'Require Credit Wallet Balance'
                        : 'USD Estimate Only (No Credit Hold)'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/60">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Safety Checker is permanently locked ON for compliance.</span>
                  </div>
                </div>
              )}

              {/* Models & 16-Cell USD Pricing Matrices */}
              <div className="space-y-4">
                {provider.models.map((model) => (
                  <div
                    key={model.modelId}
                    className="p-4 rounded-xl border border-white/[0.1] bg-black/50 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {model.displayName}
                          </span>
                          <span className="px-2 py-0.5 rounded border border-white/15 text-[10px] text-white/70">
                            {model.modelId}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px]">
                            {model.pricingCurrency}
                          </span>
                        </div>
                        {model.submitEndpoint && (
                          <div className="text-[10px] text-white/45 mt-0.5">
                            POST {model.submitEndpoint}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateLocalModel(provider.providerId, model.modelId, (m) => ({
                              ...m,
                              enabled: !m.enabled,
                            }))
                          }
                          className={`px-2.5 py-1 rounded border text-[10px] uppercase cursor-pointer ${
                            model.enabled
                              ? 'border-white bg-white text-black font-semibold'
                              : 'border-white/20 text-white/60'
                          }`}
                        >
                          {model.enabled ? 'Model Active' : 'Model Paused'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveModel(provider.providerId, model)}
                          disabled={savingKey === `model:${provider.providerId}:${model.modelId}`}
                          className="px-3 py-1 rounded bg-white text-black font-semibold text-[10px] uppercase flex items-center gap-1 cursor-pointer hover:bg-white/90"
                        >
                          <Save className="w-3 h-3" />
                          <span>
                            {savingKey === `model:${provider.providerId}:${model.modelId}`
                              ? 'Saving...'
                              : 'Save Model'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Enabled Resolutions & Durations Toggles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-white/50 uppercase">
                          Enabled Resolutions (Strict — Blocked When Disabled)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {model.resolutions.map((resOpt) => {
                            const active = model.enabledResolutions.includes(resOpt);
                            return (
                              <button
                                key={resOpt}
                                type="button"
                                onClick={() =>
                                  updateLocalModel(provider.providerId, model.modelId, (m) => {
                                    const exists = m.enabledResolutions.includes(resOpt);
                                    const next = exists
                                      ? m.enabledResolutions.filter((r) => r !== resOpt)
                                      : [...m.enabledResolutions, resOpt];
                                    return { ...m, enabledResolutions: next };
                                  })
                                }
                                className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer ${
                                  active
                                    ? 'border-white bg-white text-black font-semibold'
                                    : 'border-white/15 text-white/45 line-through'
                                }`}
                              >
                                {resOpt}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] text-white/50 uppercase">
                          Enabled Durations (Seconds)
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {model.durations.map((durOpt) => {
                            const active = model.enabledDurations.includes(durOpt);
                            return (
                              <button
                                key={durOpt}
                                type="button"
                                onClick={() =>
                                  updateLocalModel(provider.providerId, model.modelId, (m) => {
                                    const exists = m.enabledDurations.includes(durOpt);
                                    const next = exists
                                      ? m.enabledDurations.filter((d) => d !== durOpt)
                                      : [...m.enabledDurations, durOpt];
                                    return { ...m, enabledDurations: next };
                                  })
                                }
                                className={`px-2.5 py-1 rounded border text-[11px] cursor-pointer ${
                                  active
                                    ? 'border-white bg-white text-black font-semibold'
                                    : 'border-white/15 text-white/45 line-through'
                                }`}
                              >
                                {durOpt}s
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* App Markup + 16-Cell USD Pricing Matrix */}
                    {model.pricingCurrency === 'USD' && model.usdPricingMatrix && (
                      <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="space-y-1">
                            <span className="text-[10px] text-white/50 uppercase">
                              Separate App Markup (%)
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.5"
                              value={model.appMarkupPercent}
                              onChange={(e) =>
                                updateLocalModel(provider.providerId, model.modelId, (m) => ({
                                  ...m,
                                  appMarkupPercent: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="w-full p-2 rounded border border-white/15 bg-black text-white"
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] text-white/50 uppercase">
                              Separate Flat App Markup ($ USD)
                            </span>
                            <input
                              type="number"
                              min={0}
                              step="0.05"
                              value={model.appMarkupFlatUsd}
                              onChange={(e) =>
                                updateLocalModel(provider.providerId, model.modelId, (m) => ({
                                  ...m,
                                  appMarkupFlatUsd: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="w-full p-2 rounded border border-white/15 bg-black text-white"
                            />
                          </label>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-[11px]">
                            <thead>
                              <tr className="border-b border-white/15 text-white/60 uppercase">
                                <th className="py-2 pr-3">Resolution</th>
                                {ALL_DURATIONS.map((d) => (
                                  <th key={d} className="py-2 px-2">
                                    {d}s Base USD
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {ALL_RESOLUTIONS.map((resKey) => {
                                const row = model.usdPricingMatrix?.[resKey] || {};
                                return (
                                  <tr key={resKey} className="border-b border-white/[0.06]">
                                    <td className="py-2 pr-3 font-semibold text-white">{resKey}</td>
                                    {ALL_DURATIONS.map((durKey) => (
                                      <td key={durKey} className="py-1.5 px-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step="0.01"
                                          value={row[durKey] ?? 0}
                                          onChange={(e) => {
                                            const val = Math.max(0, Number(e.target.value) || 0);
                                            updateLocalModel(
                                              provider.providerId,
                                              model.modelId,
                                              (m) => ({
                                                ...m,
                                                usdPricingMatrix: {
                                                  ...(m.usdPricingMatrix || {}),
                                                  [resKey]: {
                                                    ...((m.usdPricingMatrix || {})[resKey] || {}),
                                                    [durKey]: val,
                                                  },
                                                },
                                              })
                                            );
                                          }}
                                          className="w-24 p-1.5 rounded border border-white/15 bg-black text-white tabular-nums"
                                        />
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Recent API Usage & Provider Request Logs */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
            <h3 className="uppercase font-semibold text-white">
              Recent Provider API Logs ({analytics.recentLogs.length})
            </h3>
            {analytics.recentLogs.length === 0 ? (
              <p className="text-white/45">No provider API activity recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {analytics.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-white/[0.08] bg-black/50 space-y-1 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        [{log.provider.toUpperCase()}] {log.action} ·{' '}
                        {log.success ? 'OK' : 'ERROR'}
                        {log.httpStatus ? ` (${log.httpStatus})` : ''}
                      </span>
                      <span className="text-white/45">
                        {new Date(log.timestamp).toLocaleTimeString()}
                        {typeof log.latencyMs === 'number' ? ` · ${log.latencyMs}ms` : ''}
                      </span>
                    </div>
                    <div className="text-white/60">
                      Job: {log.job_id} · Model: {log.model_id}
                      {typeof log.estimatedCostUsd === 'number' && log.estimatedCostUsd > 0
                        ? ` · $${log.estimatedCostUsd.toFixed(2)}`
                        : ''}
                    </div>
                    {log.error && (
                      <div className="flex items-center gap-1 text-white/75">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span className="truncate">{log.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
            <h3 className="uppercase font-semibold text-white">
              Recent Multi-Provider Jobs ({recentJobs.length})
            </h3>
            {recentJobs.length === 0 ? (
              <p className="text-white/45">No multi-provider generation jobs recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recentJobs.slice(0, 25).map((job) => (
                  <div
                    key={job.job_id}
                    className="p-2.5 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between gap-3 text-[11px]"
                  >
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">
                        [{job.provider.toUpperCase()}] {job.model_name} · {job.resolution} ·{' '}
                        {job.duration}s {job.draft ? '· DRAFT' : ''}
                      </div>
                      <div className="text-white/50 truncate">
                        {job.job_id} · User: {job.user_email || job.user_id}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white uppercase font-semibold">{job.status}</div>
                      <div className="text-white/60 tabular-nums">
                        {job.currency === 'USD'
                          ? `$${Number(job.estimated_cost || 0).toFixed(2)}`
                          : `${job.credits_deducted || 0} CR`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
