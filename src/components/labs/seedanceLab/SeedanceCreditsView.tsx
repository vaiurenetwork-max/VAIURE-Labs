/**
 * VAIURE — SEEDANCE LAB CREDIT WALLET, DYNAMIC COST MATRIX & TRANSACTION LEDGER
 * Strict Black & White Monochromatic Glassmorphism.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Sliders,
  AlertCircle,
  Lock,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import {
  CreditLedgerTransaction,
  CreditPackage,
  CreditWalletBalance,
  GenerationCostConfig,
} from '../../../types/seedancePlatform';
import {
  fetchCreditBalance,
  fetchCreditPackages,
  fetchCreditTransactions,
  fetchGenerationCostConfig,
  initiateCreditPackageCheckout,
  PlatformRequestError,
} from '../../../services/seedancePlatformService';

interface SeedanceCreditsViewProps {
  isAuthenticated: boolean;
  onRequireAuth?: () => void;
  onWalletUpdated?: () => void;
}

export const SeedanceCreditsView: React.FC<SeedanceCreditsViewProps> = ({
  isAuthenticated,
  onRequireAuth,
  onWalletUpdated,
}) => {
  const [wallet, setWallet] = useState<CreditWalletBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditLedgerTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [costConfig, setCostConfig] = useState<GenerationCostConfig | null>(null);
  const [paymentConfigured, setPaymentConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [txFilter, setTxFilter] = useState<string>('ALL');
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgRes, costRes] = await Promise.all([
        fetchCreditPackages(),
        fetchGenerationCostConfig(),
      ]);
      setPackages(pkgRes.packages || []);
      setPaymentConfigured(Boolean(pkgRes.paymentProviderConfigured));
      setCostConfig(costRes);

      if (isAuthenticated) {
        const [walRes, txRes] = await Promise.all([
          fetchCreditBalance(),
          fetchCreditTransactions(),
        ]);
        setWallet(walRes);
        setTransactions(txRes);
      } else {
        setWallet(null);
        setTransactions([]);
      }
    } catch (err: any) {
      setNotice(err?.message || 'Failed to load credit wallet.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBuyPackage = async (pkg: CreditPackage) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setBuyingId(pkg.id);
    setNotice(null);
    try {
      const checkout = await initiateCreditPackageCheckout(pkg.id);
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      onWalletUpdated?.();
    } catch (err: any) {
      if (err instanceof PlatformRequestError && err.code === 'PAYMENT_PROVIDER_UNCONFIGURED') {
        setNotice(err.message);
      } else {
        setNotice(err?.message || 'Credit checkout initiation failed.');
      }
    } finally {
      setBuyingId(null);
    }
  };

  const filteredTx = transactions.filter((t) =>
    txFilter === 'ALL' ? true : t.type === txFilter
  );

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono">
                Generation Credit Wallet & Ledger
              </h1>
            </div>
            <p className="text-xs text-white/60">
              Atomic balance tracking, dynamic Seedance 2.5 compute pricing, and automatic single-once failure refunds.
            </p>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </section>

        {notice && (
          <div className="p-4 rounded-xl border border-white/20 bg-white/[0.05] flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
              <span className="text-white/90">{notice}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Wallet Overview */}
        {!isAuthenticated ? (
          <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className="w-4 h-4" />
                <span>Sign In to View Your Credit Ledger</span>
              </div>
              <p className="text-xs text-white/60">
                Your credit balance, generation deductions, and refund proofs are tied to your authenticated VAIURE account.
              </p>
            </div>
            {onRequireAuth && (
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-white/90 cursor-pointer shrink-0"
              >
                Sign In
              </button>
            )}
          </section>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border border-white/[0.14] bg-white/[0.04] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-white/50">Total Available</span>
              <div className="text-2xl font-mono font-semibold text-white tabular-nums">
                {(wallet?.totalAvailable ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] font-mono text-white/50 block tabular-nums">
                ≈ Rp {((wallet?.totalAvailable ?? 0) * (costConfig?.unitValueIdr ?? 600)).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-white/50">Credits Used</span>
              <div className="text-2xl font-mono font-semibold text-white tabular-nums">
                {(wallet?.usedCredits ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] font-mono text-white/50 block">
                Net lifetime compute consumed
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-white/50">Monthly Subscription</span>
              <div className="text-2xl font-mono font-semibold text-white tabular-nums">
                {(wallet?.monthlySubscriptionCredits ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] font-mono text-white/50 block">
                {wallet?.subscriptionCreditExpiry
                  ? `Expires ${new Date(wallet.subscriptionCreditExpiry).toLocaleDateString()}`
                  : 'Refreshes on renewal'}
              </span>
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-white/50">Purchased Rollover</span>
              <div className="text-2xl font-mono font-semibold text-white tabular-nums">
                {(wallet?.purchasedTopUpCredits ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] font-mono text-white/50 block">
                Status: {wallet?.status || 'ACTIVE'}
              </span>
            </div>
          </section>
        )}

        {/* Dynamic Cost Matrix & Top-Up Packages */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dynamic Generation Cost Table */}
          <section className="lg:col-span-5 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <Sliders className="w-4 h-4" />
                <span>Dynamic Cost Matrix</span>
              </div>
              {costConfig?.autoRefundOnFailure && (
                <span className="px-2 py-0.5 rounded border border-white/20 bg-white/[0.05] text-[10px] font-mono text-white/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Auto-Refund Active
                </span>
              )}
            </div>

            {costConfig ? (
              <div className="space-y-3 text-xs font-mono">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(costConfig.baseByResolutionDuration || {}).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-2.5 rounded-lg border border-white/[0.08] bg-black/50 flex items-center justify-between"
                    >
                      <span className="text-white/60 uppercase">{key.replace('_', ' · ')}</span>
                      <span className="text-white font-semibold tabular-nums">{val} cr</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl border border-white/[0.08] bg-black/50 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-white/50">Complex Physics Priority Multiplier</span>
                    <span className="text-white tabular-nums">
                      ×{costConfig.qualityMultipliers?.cinematic_complex_physics ?? 1.25}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Extra Reference Plate (&gt;5 refs)</span>
                    <span className="text-white tabular-nums">
                      +{costConfig.referenceImageSurchargePerExtraPlate} cr / plate
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Reference Unit Valuation</span>
                    <span className="text-white tabular-nums">
                      Rp {costConfig.unitValueIdr.toLocaleString('id-ID')} / cr
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-white/50 font-mono">Loading dynamic cost configuration...</div>
            )}
          </section>

          {/* Top-Up Credit Packages */}
          <section className="lg:col-span-7 rounded-2xl border border-white/[0.1] bg-white/[0.03] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono uppercase tracking-wider text-white">
                Top-Up Credit Packs
              </div>
              <span className="text-[10px] font-mono text-white/50 uppercase">
                {paymentConfigured ? 'Verified Stripe Checkout Ready' : 'Requires Stripe / Midtrans Server Key'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="p-4 rounded-xl border border-white/[0.1] bg-black/50 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{pkg.name}</span>
                      <span className="px-2 py-0.5 rounded bg-white text-black font-mono text-[10px] font-bold tabular-nums">
                        +{pkg.credits.toLocaleString()} CR
                      </span>
                    </div>
                    <p className="text-xs text-white/60">{pkg.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                    <div className="font-mono">
                      <div className="text-sm font-semibold text-white tabular-nums">${pkg.priceUsd}</div>
                      <div className="text-[10px] text-white/45 tabular-nums">
                        Rp {pkg.priceIdr.toLocaleString('id-ID')}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={buyingId === pkg.id}
                      onClick={() => handleBuyPackage(pkg)}
                      className="px-3.5 py-2 rounded-lg bg-white text-black hover:bg-white/90 text-[11px] font-mono font-semibold uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{buyingId === pkg.id ? 'Starting...' : 'Purchase'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Ledger History */}
        {isAuthenticated && (
          <section className="rounded-2xl border border-white/[0.1] bg-white/[0.03] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs font-mono uppercase tracking-wider text-white">
                Credit Transaction Ledger ({filteredTx.length})
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px] font-mono">
                {[
                  'ALL',
                  'GENERATION_DEDUCT',
                  'GENERATION_REFUND',
                  'SUBSCRIPTION_GRANT',
                  'TOP_UP_PURCHASE',
                  'ADMIN_ADJUSTMENT',
                ].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTxFilter(f)}
                    className={`px-2.5 py-1 rounded border transition-all cursor-pointer ${
                      txFilter === f
                        ? 'border-white bg-white text-black font-semibold'
                        : 'border-white/[0.1] bg-black/40 text-white/60 hover:text-white'
                    }`}
                  >
                    {f === 'ALL' ? 'All' : f.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-white/45">
                No credit ledger entries recorded for this filter.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {filteredTx.map((tx) => {
                  const isCredit = tx.amount >= 0;
                  return (
                    <div
                      key={tx.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg border border-white/[0.12] bg-white/[0.04] flex items-center justify-center shrink-0">
                          {tx.type === 'GENERATION_REFUND' ? (
                            <RotateCcw className="w-3.5 h-3.5 text-white" />
                          ) : isCredit ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-white/60" />
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2 font-mono">
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 bg-black/50 text-white/80">
                              {tx.type}
                            </span>
                            {tx.jobId && <span className="text-[10px] text-white/45">{tx.jobId}</span>}
                          </div>
                          <p className="text-white/85 font-sans">{tx.description}</p>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0">
                        <div className={`font-semibold tabular-nums ${isCredit ? 'text-white' : 'text-white/75'}`}>
                          {isCredit ? `+${tx.amount}` : tx.amount} CR
                        </div>
                        <div className="text-[10px] text-white/45 tabular-nums">
                          Balance After: {tx.balanceAfter.toLocaleString()} ·{' '}
                          {new Date(tx.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
