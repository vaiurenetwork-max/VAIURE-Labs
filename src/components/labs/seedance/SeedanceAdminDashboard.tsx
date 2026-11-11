/**
 * VAIURE Labs — Seedance 2.5 Administrator Financial & API Stock Console
 * Comprehensive executive analytics dashboard tracking:
 * - Monthly Recurring Revenue (MRR)
 * - Top-Up Pack Revenue
 * - BytePlus Seedance 2.5 API expenditure (USD & IDR)
 * - Gross Profit & Gross Margin % (with low-margin warning < 40%)
 * - BytePlus API Balance Stock Tracker & Low-Balance Alert
 * - Exchange Rate USD/IDR Configuration
 * - User Credit Adjustment Tool with audit logging
 */

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Zap,
  Server,
  Users,
  Settings,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  ShieldCheck,
  Film,
  Building,
  RotateCcw,
} from 'lucide-react';
import {
  PlatformFinancialAnalytics,
  BytePlusApiStock,
} from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceAdminDashboardProps {
  currentAdminEmail?: string;
}

export const SeedanceAdminDashboard: React.FC<SeedanceAdminDashboardProps> = ({
  currentAdminEmail = 'efayour@gmail.com',
}) => {
  const [analytics, setAnalytics] = useState<PlatformFinancialAnalytics | null>(null);
  const [stock, setStock] = useState<BytePlusApiStock | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Exchange rate editor
  const [usdToIdrRate, setUsdToIdrRate] = useState<number>(16200);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);

  // User credit adjustment form
  const [targetUserId, setTargetUserId] = useState<string>('user-creator-01');
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('VIP beta tester grant');
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fin, st] = await Promise.all([
        seedancePlatformService.getFinancialAnalytics(),
        seedancePlatformService.getApiStockBalance(),
      ]);
      setAnalytics(fin);
      setStock(st);
      if (fin) {
        setUsdToIdrRate(fin.usdToIdrRate);
      }
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateExchangeRate = async () => {
    setIsUpdatingRate(true);
    try {
      await seedancePlatformService.updateExchangeRate(usdToIdrRate);
      await loadData();
    } catch (err) {
      console.error('Failed to update exchange rate:', err);
    } finally {
      setIsUpdatingRate(false);
    }
  };

  const handleAdjustUserCredits = async () => {
    if (!targetUserId.trim() || !adjustReason.trim()) return;
    setIsAdjusting(true);
    setAdjustStatus(null);
    try {
      const res = await seedancePlatformService.adjustUserCredits(
        targetUserId.trim(),
        adjustAmount,
        adjustReason.trim()
      );
      setAdjustStatus(
        `Successfully adjusted ${adjustAmount > 0 ? '+' : ''}${adjustAmount} credits for ${targetUserId}. New Balance: ${res.balance.totalCredits} cr.`
      );
      await loadData();
    } catch (err: any) {
      setAdjustStatus(`Failed: ${err.message || 'Error occurred'}`);
    } finally {
      setIsAdjusting(false);
    }
  };

  const isMarginHealthy = (analytics?.grossMarginPercent ?? 100) >= 40;
  const isStockLow = (stock?.currentBalanceUSD ?? 1000) <= (stock?.alertThresholdUSD ?? 100);

  return (
    <div className="w-full h-full flex flex-col bg-[#07080C] text-[#EDEDED] overflow-y-auto custom-scrollbar p-6 sm:p-10 select-none space-y-8">
      {/* Executive Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">
              SEEDANCE 2.5 FINANCIAL & STOCK CONSOLE
            </span>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] tracking-widest uppercase">
              CONFIDENTIAL · ADMIN
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-1">
            Real-time billing ledger reconciliation, BytePlus API expenditure, and gross margin optimization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs font-mono text-white/50">
            <div>Admin: <span className="text-white font-bold">{currentAdminEmail}</span></div>
            <div>Sync: <span className="text-emerald-400">Live Webhook</span></div>
          </div>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer"
            title="Refresh All Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Warnings & Alerts Banner */}
      {!isMarginHealthy && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono space-y-1">
            <div className="font-bold uppercase tracking-wider">
              Warning: Gross Profit Margin Below Target ({analytics?.grossMarginPercent}%)
            </div>
            <p className="text-amber-200/80">
              The aggregate gross margin is below the recommended 40% threshold. Recommend adjusting package prices or re-benchmarking USD/IDR exchange rates to prevent negative unit economics against BytePlus API bills.
            </p>
          </div>
        </div>
      )}

      {isStockLow && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-red-300 flex items-start gap-3">
          <Server className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono space-y-1">
            <div className="font-bold uppercase tracking-wider">
              Critical: BytePlus API Stock Balance Depleting (${stock?.currentBalanceUSD})
            </div>
            <p className="text-red-200/80">
              Your BytePlus Seedance 2.5 API prepaid balance is under the safety threshold of ${stock?.alertThresholdUSD}. Top up BytePlus Cloud wallet immediately to prevent video generation interruptions.
            </p>
          </div>
        </div>
      )}

      {/* Key Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="p-5 rounded-2xl bg-[#0C0D14] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2">
            <span>MONTHLY RECURRING (MRR)</span>
            <Building className="w-4 h-4" />
          </div>
          <div className="text-2xl font-display font-bold text-white tracking-tight">
            Rp{(analytics?.mrrIDR || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] font-mono text-white/40 mt-1">
            Across 5 active subscription tiers
          </div>
        </div>

        {/* Top-Up Revenue */}
        <div className="p-5 rounded-2xl bg-[#0C0D14] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-2">
            <span>TOP-UP PACK REVENUE</span>
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div className="text-2xl font-display font-bold text-white tracking-tight">
            Rp{(analytics?.topUpRevenueIDR || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] font-mono text-white/40 mt-1">
            Non-recurring credit store sales
          </div>
        </div>

        {/* BytePlus API Expenditure */}
        <div className="p-5 rounded-2xl bg-[#0C0D14] border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-red-400 mb-2">
            <span>BYTEPLUS API EXPENDITURE</span>
            <Server className="w-4 h-4" />
          </div>
          <div className="text-2xl font-display font-bold text-white tracking-tight">
            ${(analytics?.totalBytePlusApiCostUSD || 0).toFixed(2)}
          </div>
          <div className="text-[11px] font-mono text-white/40 mt-1">
            ~ Rp{(analytics?.totalBytePlusApiCostIDR || 0).toLocaleString('id-ID')} COGS
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-[#0C0D14] border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
            <span>GROSS PROFIT & MARGIN</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-display font-bold text-emerald-300 tracking-tight">
            Rp{(analytics?.grossProfitIDR || 0).toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] font-mono text-emerald-400/80 mt-1 font-bold">
            {analytics?.grossMarginPercent}% Net Gross Margin
          </div>
        </div>
      </div>

      {/* Second Row: Stock Balance & Video Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* BytePlus Stock Tracker */}
        <div className="p-6 rounded-2xl bg-[#0B0C12] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                BytePlus API Balance Stock
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              Live Gateway
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-[10px] font-mono text-white/40 uppercase">Prepaid Balance</div>
              <div className="text-2xl font-display font-bold text-white mt-1">
                ${(stock?.currentBalanceUSD || 0).toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-white/50 mt-0.5">
                ~ Rp{((stock?.currentBalanceUSD || 0) * usdToIdrRate).toLocaleString('id-ID')}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="text-[10px] font-mono text-white/40 uppercase">Safety Threshold</div>
              <div className="text-2xl font-display font-bold text-amber-400 mt-1">
                ${(stock?.alertThresholdUSD || 0).toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-white/50 mt-0.5">
                Alert triggered if below
              </div>
            </div>
          </div>

          {/* Outstanding Liabilities */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-white/40">Unspent Purchased Credits Liability:</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {(analytics?.outstandingLiabilityCredits || 0).toLocaleString()} Credits
              </div>
            </div>
            <div className="text-right">
              <div className="text-white/40">Estimated Potential Liability:</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">
                Rp{(analytics?.outstandingLiabilityIDR || 0).toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* Video Generation Statistics */}
        <div className="p-6 rounded-2xl bg-[#0B0C12] border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-amber-400" />
              <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                Video Generation Breakdown
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              Total: {analytics?.totalVideosGenerated || 0} Videos
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-[10px] font-mono text-white/40">480p Renders</div>
              <div className="text-xl font-display font-bold text-white mt-1">
                {analytics?.resolutionBreakdown?.['480p'] || 0}
              </div>
              <div className="text-[10px] font-mono text-white/50 mt-0.5">25 - 150 cr</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-[10px] font-mono text-white/40">720p Renders</div>
              <div className="text-xl font-display font-bold text-cyan-400 mt-1">
                {analytics?.resolutionBreakdown?.['720p'] || 0}
              </div>
              <div className="text-[10px] font-mono text-white/50 mt-0.5">55 - 330 cr</div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-center">
              <div className="text-[10px] font-mono text-white/40">1080p Renders</div>
              <div className="text-xl font-display font-bold text-amber-400 mt-1">
                {analytics?.resolutionBreakdown?.['1080p'] || 0}
              </div>
              <div className="text-[10px] font-mono text-white/50 mt-0.5">135 - 810 cr</div>
            </div>
          </div>

          {/* Auto-refund stats */}
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-cyan-300">
              <RotateCcw className="w-4 h-4" />
              <span>Failed Task Auto-Refunds:</span>
            </div>
            <div className="text-white font-bold">
              {analytics?.failedJobsRefunded || 0} Jobs ({analytics?.totalRefundedCredits || 0} Credits Returned)
            </div>
          </div>
        </div>
      </div>

      {/* Third Row: System Settings & User Credit Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* USD / IDR Rate Configuration */}
        <div className="p-6 rounded-2xl bg-[#0B0C12] border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
              USD to IDR Benchmark Rate
            </h3>
          </div>

          <p className="text-xs font-mono text-white/50 leading-relaxed">
            BytePlus bills in USD ($), while Indonesian creators purchase in IDR (Rp). Adjusting this benchmark updates all gross-margin cost calculations immediately.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-white/40">Rp</span>
              <input
                type="number"
                value={usdToIdrRate}
                onChange={(e) => setUsdToIdrRate(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/[0.04] border border-white/15 focus:border-cyan-400 text-sm font-mono text-white focus:outline-none"
              />
            </div>
            <button
              onClick={handleUpdateExchangeRate}
              disabled={isUpdatingRate}
              className="px-5 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-white/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdatingRate ? 'Saving...' : 'Update Rate'}
            </button>
          </div>
        </div>

        {/* User Credit Adjustment & Audit Tool */}
        <div className="p-6 rounded-2xl bg-[#0B0C12] border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="font-serif text-sm font-bold text-white uppercase tracking-wider">
              User Credit Ledger Tool
            </h3>
          </div>

          <p className="text-xs font-mono text-white/50">
            Directly credit or debit any user’s Seedance compute balance. All manual adjustments are recorded with audit trails.
          </p>

          <div className="space-y-3 pt-1 text-xs font-mono">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="User ID or Email"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="number"
                placeholder="Amount (e.g. 100 or -50)"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Number(e.target.value))}
                className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <input
              type="text"
              placeholder="Audit Reason (Required)"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-cyan-400"
            />

            <button
              onClick={handleAdjustUserCredits}
              disabled={isAdjusting || !targetUserId || !adjustReason}
              className="w-full py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-cyan-400/20 disabled:opacity-50"
            >
              {isAdjusting ? 'Executing Adjustment...' : `Execute Adjustment (${adjustAmount > 0 ? '+' : ''}${adjustAmount} cr)`}
            </button>

            {adjustStatus && (
              <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px] text-cyan-300">
                {adjustStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
