/**
 * VAIURE — SEEDANCE LAB ADMINISTRATIVE PLATFORM GOVERNANCE
 * Strictly role-gated for verified Administrators.
 * Manages Configurable 5 Tiers, Dynamic Credit Cost Matrix, User Directory + Credits/Plans,
 * Real Platform Stats, Livestream/Room Moderation, Transactions, and Immutable Audit Logs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  RefreshCw,
  Crown,
  Sliders,
  Users,
  Radio,
  FileText,
  Save,
  AlertCircle,
  Search,
  Gift,
  Flag,
  Cpu,
} from 'lucide-react';
import {
  CanonicalTierId,
  CommunityCategory,
  CommunityGroup,
  CommunityPlatformPolicies,
  CommunityReport,
  CreditLedgerTransaction,
  GenerationCostConfig,
  LiveCallRoom,
  LivestreamSession,
  MembershipPlan,
  PlatformAdminAuditEntry,
  PlatformFinancialAnalytics,
  PlatformUserRecord,
  VirtualGiftItem,
  VirtualGiftTransaction,
} from '../../../types/seedancePlatform';
import { platformAdminService } from '../../../services/seedanceWorkspaceService';
import { seedanceCommunityService } from '../../../services/seedanceCommunityService';
import { getAuthHeaders } from '../../../services/authTokenHelper';
import { ProviderPricingAdminPanel } from './ProviderPricingAdminPanel';

interface SeedanceAdminViewProps {
  isAdmin: boolean;
  onPlatformConfigUpdated?: () => void;
}

export const SeedanceAdminView: React.FC<SeedanceAdminViewProps> = ({
  isAdmin,
  onPlatformConfigUpdated,
}) => {
  const [subTab, setSubTab] = useState<
    'overview' | 'providers' | 'tiers' | 'costs' | 'users' | 'moderation' | 'community'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<PlatformFinancialAnalytics | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [costConfig, setCostConfig] = useState<GenerationCostConfig | null>(null);
  const [users, setUsers] = useState<
    Array<PlatformUserRecord & { subscription: any; wallet: any }>
  >([]);
  const [streams, setStreams] = useState<LivestreamSession[]>([]);
  const [rooms, setRooms] = useState<LiveCallRoom[]>([]);
  const [transactions, setTransactions] = useState<CreditLedgerTransaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<PlatformAdminAuditEntry[]>([]);

  // Community Governance State
  const [commGroups, setCommGroups] = useState<CommunityGroup[]>([]);
  const [commReports, setCommReports] = useState<CommunityReport[]>([]);
  const [commGifts, setCommGifts] = useState<VirtualGiftItem[]>([]);
  const [commGiftTxs, setCommGiftTxs] = useState<VirtualGiftTransaction[]>([]);
  const [commCategories, setCommCategories] = useState<CommunityCategory[]>([]);
  const [commPolicies, setCommPolicies] = useState<CommunityPlatformPolicies | null>(null);
  const [newGiftName, setNewGiftName] = useState('');
  const [newGiftPrice, setNewGiftPrice] = useState(10);
  const [newGiftCat, setNewGiftCat] = useState<VirtualGiftItem['category']>('BASIC');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [creditDeltas, setCreditDeltas] = useState<Record<string, string>>({});
  const [creditReasons, setCreditReasons] = useState<Record<string, string>>({});
  const [curatorUserIds, setCuratorUserIds] = useState<string[]>([]);

  const loadAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setNotice(null);
    try {
      const authH = await getAuthHeaders(false);
      const [ov, pl, cc, us, st, rm, tx, lg, cg, cr, gcat, gtx, cats, pols, curRes] = await Promise.all([
        platformAdminService.getOverview(),
        platformAdminService.getPlans(),
        platformAdminService.getCostConfig(),
        platformAdminService.getUsers(),
        platformAdminService.getStreams(),
        platformAdminService.getRooms(),
        platformAdminService.getTransactions(),
        platformAdminService.getAuditLogs(),
        seedanceCommunityService.adminListGroups(),
        seedanceCommunityService.adminListReports(),
        seedanceCommunityService.adminGetGifts(),
        seedanceCommunityService.adminGetGiftTransactions(),
        seedanceCommunityService.adminGetCategories(),
        seedanceCommunityService.adminGetPolicies(),
        fetch('/api/curated/admin/curators', { headers: authH })
          .then((r) => r.json())
          .catch(() => ({ curatorUserIds: [] })),
      ]);
      setAnalytics(ov.analytics);
      setPlans(pl.plans || []);
      setCostConfig(cc.costConfig);
      setUsers(us.users || []);
      setStreams(st.streams || []);
      setRooms(rm.rooms || []);
      setTransactions(tx.transactions || []);
      setAuditLogs(lg.logs || []);
      setCommGroups(cg.groups || []);
      setCommReports(cr.reports || []);
      setCommGifts(gcat.gifts || []);
      setCommGiftTxs(gtx.transactions || []);
      setCommCategories(cats.categories || []);
      setCommPolicies(pols.policies);
      setCuratorUserIds(Array.isArray(curRes?.curatorUserIds) ? curRes.curatorUserIds : []);
    } catch (err: any) {
      setNotice(err?.message || 'Failed to load admin governance telemetry.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  if (!isAdmin) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-black text-white">
        <div className="p-8 rounded-2xl border border-white/15 bg-white/[0.03] text-center space-y-2 max-w-md">
          <ShieldCheck className="w-8 h-8 text-white/40 mx-auto" />
          <div className="text-sm font-mono uppercase">Administrator Clearance Required</div>
          <p className="text-xs text-white/55">
            This governance console is restricted to verified VAIURE Seedance administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleSavePlan = async (plan: MembershipPlan) => {
    try {
      const res = await platformAdminService.updatePlan(plan.tier, plan);
      setPlans((prev) => prev.map((p) => (p.tier === plan.tier ? res.plan : p)));
      setNotice(`Saved configuration for ${plan.name} (${plan.tier}).`);
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      setNotice(err?.message || 'Could not save plan update.');
    }
  };

  const handleSaveCostConfig = async () => {
    if (!costConfig) return;
    try {
      const res = await platformAdminService.updateCostConfig(costConfig);
      setCostConfig(res.costConfig);
      setNotice('Dynamic generation credit cost schedule saved.');
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to save cost schedule.');
    }
  };

  const handleAssignTier = async (uid: string, tier: CanonicalTierId) => {
    try {
      await platformAdminService.assignUserPlan(uid, tier, `Assigned via Admin Console`);
      setNotice(`Assigned ${tier} plan to user ${uid}.`);
      loadAll();
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to assign user tier.');
    }
  };

  const handleAdjustCredits = async (uid: string) => {
    const rawDelta = Number(creditDeltas[uid] || '0');
    const reason = (creditReasons[uid] || '').trim();
    if (!Number.isFinite(rawDelta) || rawDelta === 0 || !reason) {
      setNotice('Enter a non-zero credit adjustment (+/-) and an audit reason.');
      return;
    }
    try {
      await platformAdminService.adjustUserCredits(uid, rawDelta, reason);
      setCreditDeltas((prev) => ({ ...prev, [uid]: '' }));
      setCreditReasons((prev) => ({ ...prev, [uid]: '' }));
      setNotice(`Adjusted credits by ${rawDelta > 0 ? `+${rawDelta}` : rawDelta} for ${uid}.`);
      loadAll();
      onPlatformConfigUpdated?.();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to adjust credits.');
    }
  };

  const handleToggleUserStatus = async (u: PlatformUserRecord) => {
    const nextStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await platformAdminService.updateUserStatus(u.uid, {
        status: nextStatus,
        reason: `Admin status change to ${nextStatus}`,
      });
      loadAll();
    } catch (err: any) {
      setNotice(err?.message || 'Failed to update user status.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1620px] mx-auto space-y-6 pb-20">
        {/* Header */}
        <section className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.035] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-white" />
              <h1 className="text-lg font-mono font-semibold uppercase tracking-tight">
                Seedance Platform Administration
              </h1>
            </div>
            <p className="text-xs text-white/60">
              Manage tiers, dynamic generation cost formulas, user wallets, moderation, and verified financial statistics.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Data</span>
          </button>
        </section>

        {notice && (
          <div className="p-3.5 rounded-xl border border-white/20 bg-white/[0.05] flex items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono border-b border-white/[0.1] pb-2">
          {[
            { id: 'overview', label: 'Platform Stats', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
            { id: 'providers', label: 'Providers & Pricing', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'tiers', label: 'Tier Plans', icon: <Crown className="w-3.5 h-3.5" /> },
            { id: 'costs', label: 'Credit Cost Rules', icon: <Sliders className="w-3.5 h-3.5" /> },
            { id: 'users', label: `Users (${users.length})`, icon: <Users className="w-3.5 h-3.5" /> },
            {
              id: 'community',
              label: `Community (${commGroups.length})`,
              icon: <Gift className="w-3.5 h-3.5" />,
            },
            { id: 'moderation', label: 'Moderation & Logs', icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all ${
                subTab === t.id
                  ? 'bg-white text-black font-semibold'
                  : 'text-white/65 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: REAL OVERVIEW STATS */}
        {subTab === 'overview' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1">
                <span className="text-white/45 uppercase">Registered Users</span>
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {analytics.totalRegisteredUsers}
                </div>
                <span className="text-[11px] text-white/50">
                  Paid Subscribers: {analytics.activeSubscribers}
                </span>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1">
                <span className="text-white/45 uppercase">Credits Consumed / Refunded</span>
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {analytics.totalCreditsConsumed || 0} / {analytics.totalRefundedCredits || 0}
                </div>
                <span className="text-[11px] text-white/50">
                  {analytics.totalGeneratedVideos} Videos · {analytics.failedGenerationsCount} Failed
                </span>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1">
                <span className="text-white/45 uppercase">Outstanding Credit Liability</span>
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {analytics.totalOutstandingCreditLiabilities.toLocaleString()} CR
                </div>
                <span className="text-[11px] text-white/50 tabular-nums">
                  Rp {analytics.outstandingLiabilitiesIdr.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1">
                <span className="text-white/45 uppercase">Live Streams / Call Rooms</span>
                <div className="text-2xl font-semibold text-white tabular-nums">
                  {analytics.activeLivestreamsCount || 0} / {analytics.activeRoomsCount || 0}
                </div>
                <span className="text-[11px] text-white/50">
                  Stripe: {analytics.paymentProviderConfigured ? 'Ready' : 'Unset'} · Gemini:{' '}
                  {analytics.geminiConfigured ? 'Ready' : 'Unset'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1B: MULTI-PROVIDER ARCHITECTURE & USD PRICING MATRIX */}
        {subTab === 'providers' && (
          <ProviderPricingAdminPanel
            onNotice={(msg) => setNotice(msg)}
            onPlatformConfigUpdated={onPlatformConfigUpdated}
          />
        )}

        {/* TAB 2: CONFIGURABLE 5 TIERS */}
        {subTab === 'tiers' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3 text-xs font-mono"
              >
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                  <span className="text-sm font-semibold text-white">
                    Tier Identifier: {plan.tier}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSavePlan(plan)}
                    className="px-3 py-1.5 rounded-lg bg-white text-black font-semibold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" /> Save Tier
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Display Name</span>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) => (p.tier === plan.tier ? { ...p, name: e.target.value } : p))
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Monthly Credits</span>
                    <input
                      type="number"
                      value={plan.monthlyCredits}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.tier === plan.tier ? { ...p, monthlyCredits: Number(e.target.value) || 0 } : p
                          )
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Price USD</span>
                    <input
                      type="number"
                      step="0.01"
                      value={plan.priceUsd}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.tier === plan.tier ? { ...p, priceUsd: Number(e.target.value) || 0 } : p
                          )
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Price IDR</span>
                    <input
                      type="number"
                      value={plan.priceIdr}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.tier === plan.tier ? { ...p, priceIdr: Number(e.target.value) || 0 } : p
                          )
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Max Resolution</span>
                    <select
                      value={plan.maxResolution}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.tier === plan.tier
                              ? { ...p, maxResolution: e.target.value as any }
                              : p
                          )
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    >
                      <option value="480p">480p</option>
                      <option value="720p">720p</option>
                      <option value="1080p">1080p</option>
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] text-white/50 uppercase">Max Ref Images</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={plan.maxReferenceImages}
                      onChange={(e) =>
                        setPlans((prev) =>
                          prev.map((p) =>
                            p.tier === plan.tier
                              ? { ...p, maxReferenceImages: Number(e.target.value) || 0 }
                              : p
                          )
                        )
                      }
                      className="w-full p-2 rounded border border-white/15 bg-black text-white"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: DYNAMIC CREDIT COST RULES */}
        {subTab === 'costs' && costConfig && (
          <div className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-5 text-xs font-mono max-w-3xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <span className="text-sm font-semibold uppercase text-white">
                Dynamic Generation Cost Matrix
              </span>
              <button
                type="button"
                onClick={handleSaveCostConfig}
                className="px-4 py-2 rounded-lg bg-white text-black font-semibold uppercase flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Save Cost Config
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(costConfig.baseByResolutionDuration || {}).map(([key, val]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px] text-white/50 uppercase">{key}</span>
                  <input
                    type="number"
                    min={1}
                    value={val}
                    onChange={(e) =>
                      setCostConfig((prev) =>
                        prev
                          ? {
                              ...prev,
                              baseByResolutionDuration: {
                                ...prev.baseByResolutionDuration,
                                [key]: Number(e.target.value) || 1,
                              },
                            }
                          : prev
                      )
                    }
                    className="w-full p-2 rounded border border-white/15 bg-black text-white"
                  />
                </label>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.08]">
              <label className="space-y-1">
                <span className="text-[10px] text-white/50 uppercase">Physics Priority Multiplier</span>
                <input
                  type="number"
                  step="0.05"
                  min={1}
                  value={costConfig.qualityMultipliers?.cinematic_complex_physics ?? 1.25}
                  onChange={(e) =>
                    setCostConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            qualityMultipliers: {
                              ...prev.qualityMultipliers,
                              cinematic_complex_physics: Number(e.target.value) || 1,
                            },
                          }
                        : prev
                    )
                  }
                  className="w-full p-2 rounded border border-white/15 bg-black text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] text-white/50 uppercase">Extra Ref Plate Surcharge</span>
                <input
                  type="number"
                  min={0}
                  value={costConfig.referenceImageSurchargePerExtraPlate}
                  onChange={(e) =>
                    setCostConfig((prev) =>
                      prev
                        ? {
                            ...prev,
                            referenceImageSurchargePerExtraPlate: Number(e.target.value) || 0,
                          }
                        : prev
                    )
                  }
                  className="w-full p-2 rounded border border-white/15 bg-black text-white"
                />
              </label>

              <label className="space-y-1">
                <span className="text-[10px] text-white/50 uppercase">Auto-Refund Failed Jobs</span>
                <button
                  type="button"
                  onClick={() =>
                    setCostConfig((prev) =>
                      prev ? { ...prev, autoRefundOnFailure: !prev.autoRefundOnFailure } : prev
                    )
                  }
                  className={`w-full p-2 rounded border font-semibold cursor-pointer ${
                    costConfig.autoRefundOnFailure
                      ? 'border-white bg-white text-black'
                      : 'border-white/20 bg-black text-white/60'
                  }`}
                >
                  {costConfig.autoRefundOnFailure ? 'ENABLED' : 'DISABLED'}
                </button>
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: USERS, SUBSCRIPTIONS & CREDIT BALANCES */}
        {subTab === 'users' && (
          <div className="space-y-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by email, username, or UID..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/[0.14] bg-black text-white text-xs font-mono"
              />
            </div>

            {filteredUsers.length === 0 ? (
              <div className="p-8 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-center text-xs font-mono text-white/50">
                No registered platform users synced yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div
                    key={u.uid}
                    className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col xl:flex-row xl:items-center justify-between gap-4 text-xs font-mono"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-semibold">{u.displayName || u.username}</span>
                        <span className="text-white/50">@{u.username}</span>
                        <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                          {u.tier}
                        </span>
                        <span className="px-2 py-0.5 rounded border border-white/15 text-[10px] text-white/75">
                          {u.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50">
                        {u.email} · UID: {u.uid} · Balance:{' '}
                        <span className="text-white font-semibold">
                          {(u.wallet?.totalAvailable ?? u.totalCredits).toLocaleString()} CR
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={u.tier}
                        onChange={(e) => handleAssignTier(u.uid, e.target.value as CanonicalTierId)}
                        className="p-1.5 rounded border border-white/20 bg-black text-white text-[11px]"
                      >
                        {(['FREE', 'BASIC', 'PRO', 'PREMIUM', 'ENTERPRISE'] as CanonicalTierId[]).map(
                          (t) => (
                            <option key={t} value={t}>
                              Plan: {t}
                            </option>
                          )
                        )}
                      </select>

                      <input
                        type="number"
                        placeholder="+/- CR"
                        value={creditDeltas[u.uid] || ''}
                        onChange={(e) =>
                          setCreditDeltas((prev) => ({ ...prev, [u.uid]: e.target.value }))
                        }
                        className="w-20 p-1.5 rounded border border-white/20 bg-black text-white text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Adjustment reason"
                        value={creditReasons[u.uid] || ''}
                        onChange={(e) =>
                          setCreditReasons((prev) => ({ ...prev, [u.uid]: e.target.value }))
                        }
                        className="w-36 p-1.5 rounded border border-white/20 bg-black text-white text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAdjustCredits(u.uid)}
                        className="px-2.5 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                      >
                        Apply CR
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const currentlyCurator = curatorUserIds.includes(u.uid);
                          const authH = await getAuthHeaders(true);
                          const r = await fetch('/api/curated/admin/curators', {
                            method: 'POST',
                            headers: authH,
                            body: JSON.stringify({
                              userId: u.uid,
                              enabled: !currentlyCurator,
                            }),
                          });
                          const d = await r.json().catch(() => ({}));
                          if (r.ok && Array.isArray(d.curatorUserIds)) {
                            setCuratorUserIds(d.curatorUserIds);
                            setNotice(
                              `${!currentlyCurator ? 'Granted' : 'Revoked'} Curator Review access for ${u.displayName || u.username}.`
                            );
                          }
                        }}
                        className={`px-2.5 py-1.5 rounded text-[10px] uppercase cursor-pointer ${
                          curatorUserIds.includes(u.uid)
                            ? 'bg-white text-black font-semibold'
                            : 'border border-white/20 hover:bg-white/[0.1]'
                        }`}
                      >
                        {curatorUserIds.includes(u.uid) ? 'Curator ✓' : 'Make Curator'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className="px-2.5 py-1.5 rounded border border-white/20 hover:bg-white/[0.1] text-[10px] uppercase cursor-pointer"
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: LIVESTREAMS / ROOMS MODERATION & AUDIT LOGS */}
        {subTab === 'moderation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-mono">
            {/* Active Streams & Rooms */}
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                <div className="flex items-center gap-2 uppercase font-semibold text-white">
                  <Radio className="w-4 h-4" /> Livestreams Moderation ({streams.length})
                </div>
                {streams.length === 0 ? (
                  <p className="text-white/45">No livestreams recorded.</p>
                ) : (
                  streams.slice(0, 12).map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-white font-semibold">{s.title}</div>
                        <div className="text-[10px] text-white/45">
                          @{s.hostUsername} · {s.status} · {s.viewerCount} viewers
                        </div>
                      </div>
                      {s.status === 'LIVE' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await platformAdminService.forceEndStream(s.id, 'Ended by admin');
                            loadAll();
                          }}
                          className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                        >
                          Force End
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                <div className="flex items-center gap-2 uppercase font-semibold text-white">
                  <Users className="w-4 h-4" /> Call Rooms Moderation ({rooms.length})
                </div>
                {rooms.length === 0 ? (
                  <p className="text-white/45">No call rooms recorded.</p>
                ) : (
                  rooms.slice(0, 12).map((r) => (
                    <div
                      key={r.id}
                      className="p-3 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-white font-semibold">{r.name}</div>
                        <div className="text-[10px] text-white/45">
                          @{r.creatorUsername} · {r.status} · {r.participants.length} peers
                        </div>
                      </div>
                      {r.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={async () => {
                            await platformAdminService.forceCloseRoom(r.id, 'Closed by admin');
                            loadAll();
                          }}
                          className="px-2.5 py-1 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                        >
                          Force Close
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit Logs & Recent Ledger */}
            <div className="p-4 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
              <div className="uppercase font-semibold text-white">
                Platform Audit & Transaction Logs ({auditLogs.length} / {transactions.length})
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-white/[0.08] bg-black/50 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold text-[9px]">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-white/45">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white/80 font-sans text-xs">{log.reason}</p>
                    <div className="text-[10px] text-white/45">
                      Actor: {log.actorEmail} · Target: {log.targetType}:{log.targetId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* TAB 6: PLATFORM COMMUNITY, GROUPS, GIFTS & POLICIES GOVERNANCE */}
        {subTab === 'community' && (
          <div className="space-y-6 text-xs font-mono">
            {/* Groups Governance */}
            <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="uppercase font-semibold text-white">
                  All Community Groups ({commGroups.length})
                </h2>
                <span className="text-[11px] text-white/50">Includes Public & Private Groups</span>
              </div>
              {commGroups.length === 0 ? (
                <p className="text-white/45">No groups created yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {commGroups.map((g) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-white font-semibold">
                          {g.name} ({g.visibility} · {g.status})
                        </div>
                        <div className="text-[10px] text-white/50">
                          Owner: @{g.ownerUsername} · {g.memberCount} members · {g.postCount} posts
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const nextStatus = g.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
                            await seedanceCommunityService.adminSetGroupStatus(
                              g.id,
                              nextStatus,
                              `Platform admin set ${nextStatus}`
                            );
                            loadAll();
                          }}
                          className="px-3 py-1.5 rounded border border-white/20 hover:bg-white/[0.1] text-[10px] uppercase cursor-pointer"
                        >
                          {g.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await seedanceCommunityService.adminDeleteGroup(g.id);
                            loadAll();
                          }}
                          className="px-3 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Community Reports */}
            <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
              <div className="flex items-center gap-2 uppercase font-semibold text-white">
                <Flag className="w-4 h-4" /> Community Reports ({commReports.length})
              </div>
              {commReports.length === 0 ? (
                <p className="text-white/45">No reports submitted.</p>
              ) : (
                <div className="space-y-2.5">
                  {commReports.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 flex flex-wrap items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-white font-semibold">
                          [{rep.status}] {rep.targetType}: {rep.targetSummary}
                        </div>
                        <div className="text-[11px] text-white/65 font-sans">
                          Reason: {rep.reason} · By @{rep.reporterUsername}
                        </div>
                      </div>
                      {rep.status === 'OPEN' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await seedanceCommunityService.adminResolveReport(rep.id, {
                                status: 'ACTION_TAKEN',
                                resolutionNote: 'Content removed by platform admin',
                                removeTargetContent: true,
                              });
                              loadAll();
                            }}
                            className="px-3 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                          >
                            Remove Content
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await seedanceCommunityService.adminResolveReport(rep.id, {
                                status: 'DISMISSED',
                                resolutionNote: 'Dismissed after review',
                              });
                              loadAll();
                            }}
                            className="px-3 py-1.5 rounded border border-white/20 text-[10px] uppercase cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Virtual Gift Catalog & Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                <h3 className="uppercase font-semibold text-white">
                  Virtual Gift Catalog ({commGifts.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newGiftName}
                    onChange={(e) => setNewGiftName(e.target.value)}
                    placeholder="Gift Name"
                    className="sm:col-span-2 p-2 rounded border border-white/20 bg-black text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    value={newGiftPrice}
                    onChange={(e) => setNewGiftPrice(Number(e.target.value) || 1)}
                    className="p-2 rounded border border-white/20 bg-black text-white"
                  />
                  <select
                    value={newGiftCat}
                    onChange={(e) => setNewGiftCat(e.target.value as any)}
                    className="p-2 rounded border border-white/20 bg-black text-white"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="PREMIUM">PREMIUM</option>
                    <option value="SPECIAL_ANIMATED">ANIMATED</option>
                    <option value="EXCLUSIVE_EVENT">EXCLUSIVE</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newGiftName.trim()) return;
                    await seedanceCommunityService.adminUpsertGift({
                      name: newGiftName.trim(),
                      creditPrice: newGiftPrice,
                      category: newGiftCat,
                    });
                    setNewGiftName('');
                    loadAll();
                  }}
                  className="px-3.5 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                >
                  Add Virtual Gift
                </button>

                <div className="space-y-2 max-h-72 overflow-y-auto pt-2">
                  {commGifts.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-black/50 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-white font-semibold">{g.name}</span> · {g.creditPrice}{' '}
                        CR · {g.category}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await seedanceCommunityService.adminUpsertGift({
                            id: g.id,
                            enabled: !g.enabled,
                          });
                          loadAll();
                        }}
                        className="px-2.5 py-1 rounded border border-white/20 text-[10px] uppercase cursor-pointer"
                      >
                        {g.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
                <h3 className="uppercase font-semibold text-white">
                  Community Policies & Gift Ledger ({commGiftTxs.length} Gifts)
                </h3>
                {commPolicies && (
                  <div className="space-y-2.5 p-3 rounded-xl border border-white/10 bg-black/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commPolicies.allowPrivateGroups}
                        onChange={(e) =>
                          setCommPolicies({
                            ...commPolicies,
                            allowPrivateGroups: e.target.checked,
                          })
                        }
                      />
                      <span>Allow Private Groups</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={commPolicies.allowVirtualGifts}
                        onChange={(e) =>
                          setCommPolicies({
                            ...commPolicies,
                            allowVirtualGifts: e.target.checked,
                          })
                        }
                      />
                      <span>Allow Virtual Gifts</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <span>Max Groups/User:</span>
                      <input
                        type="number"
                        value={commPolicies.maxGroupsPerUser}
                        onChange={(e) =>
                          setCommPolicies({
                            ...commPolicies,
                            maxGroupsPerUser: Number(e.target.value) || 25,
                          })
                        }
                        className="w-20 p-1 rounded border border-white/20 bg-black text-white"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          await seedanceCommunityService.adminUpdatePolicies(commPolicies);
                          setNotice('Global community policies updated.');
                        }}
                        className="ml-auto px-3 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" /> Save Policies
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {commGiftTxs.slice(0, 20).map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded border border-white/[0.06] bg-black/40 flex justify-between"
                    >
                      <span>
                        @{t.senderUsername} → @{t.recipientUsername} ({t.giftName})
                      </span>
                      <span className="font-bold tabular-nums">{t.creditCost} CR</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Community Categories Governance */}
            <div className="p-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="uppercase font-semibold text-white">
                  Community Categories Governance ({commCategories.length})
                </h3>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await seedanceCommunityService.adminUpdateCategories(commCategories);
                    setCommCategories(res.categories || []);
                    setNotice('Community categories configuration saved.');
                  }}
                  className="px-3 py-1.5 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3 h-3" /> Save Categories
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name"
                  className="p-2 rounded border border-white/20 bg-black text-white"
                />
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Category Description"
                  className="p-2 rounded border border-white/20 bg-black text-white"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const trimmed = newCatName.trim();
                    if (!trimmed) return;
                    const slug = trimmed
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, '');
                    const updated: CommunityCategory[] = [
                      ...commCategories,
                      {
                        id: slug || `cat-${Date.now()}`,
                        name: trimmed,
                        description: newCatDesc.trim() || `${trimmed} community workflows and discussion`,
                        enabled: true,
                        sortOrder: commCategories.length + 1,
                      },
                    ];
                    const res = await seedanceCommunityService.adminUpdateCategories(updated);
                    setCommCategories(res.categories || updated);
                    setNewCatName('');
                    setNewCatDesc('');
                    setNotice(`Added category "${trimmed}".`);
                  }}
                  className="px-3.5 py-2 rounded bg-white text-black font-semibold text-[10px] uppercase cursor-pointer"
                >
                  Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {commCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3 rounded-xl border border-white/[0.08] bg-black/50 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{cat.name}</div>
                      <div className="text-[10px] text-white/50 truncate font-sans">
                        {cat.description}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setCommCategories((prev) =>
                          prev.map((c) => (c.id === cat.id ? { ...c, enabled: !c.enabled } : c))
                        )
                      }
                      className={`px-2.5 py-1 rounded border text-[10px] uppercase cursor-pointer shrink-0 ${
                        cat.enabled
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/20 text-white/60'
                      }`}
                    >
                      {cat.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
