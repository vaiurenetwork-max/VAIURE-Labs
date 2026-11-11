/**
 * VAIURE Labs — Seedance 2.5 Centralized Credit Wallet Modal
 * Displays real-time credit balance, monthly subscription vs purchased allowance,
 * expiration dates, and immutable transaction ledger with refund tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  Crown,
  History,
  AlertCircle,
} from 'lucide-react';
import {
  CreditWalletBalance,
  CreditLedgerTransaction,
  UserSubscription,
} from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onOpenTopUp: () => void;
  onOpenMembership: () => void;
}

export const SeedanceWalletModal: React.FC<SeedanceWalletModalProps> = ({
  isOpen,
  onClose,
  userId,
  onOpenTopUp,
  onOpenMembership,
}) => {
  const [balance, setBalance] = useState<CreditWalletBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [transactions, setTransactions] = useState<CreditLedgerTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bal, sub, txs] = await Promise.all([
        seedancePlatformService.getWalletBalance(userId),
        seedancePlatformService.getUserSubscription(userId),
        seedancePlatformService.getTransactionLedger(userId),
      ]);
      setBalance(bal);
      setSubscription(sub);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const filteredTransactions = transactions.filter((tx) => {
    if (filterType === 'all') return true;
    if (filterType === 'deductions') return tx.type === 'GENERATION_DEDUCTION' || tx.type === 'RESERVATION';
    if (filterType === 'credits') return tx.type === 'PACKAGE_PURCHASE' || tx.type === 'MONTHLY_ALLOCATION';
    if (filterType === 'refunds') return tx.type === 'REFUND';
    return true;
  });

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#090A0E] border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Seedance Credit Wallet
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  Ledger Immutable
                </span>
              </h2>
              <p className="text-xs font-mono text-white/50">
                Transparent credit management for Seedance 2.5 Exclusive video generation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Balance Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Total Balance */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-1">
                <span>TOTAL AVAILABLE</span>
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
              </div>
              <div className="text-3xl font-display font-bold text-white tracking-tight">
                {balance ? balance.totalCredits.toLocaleString() : '...'}
                <span className="text-sm font-mono text-white/50 font-normal ml-1">Credits</span>
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1 flex items-center gap-1">
                <span>~ Rp{((balance?.totalCredits || 0) * 600).toLocaleString('id-ID')} retail value</span>
              </div>
            </div>

            {/* Monthly Subscription Credits */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-1">
                <span>MONTHLY QUOTA</span>
                <Crown className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-display font-bold text-white">
                {balance ? balance.monthlyCredits.toLocaleString() : '...'}
                <span className="text-xs font-mono text-white/50 font-normal ml-1">Credits</span>
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1 flex items-center gap-1 truncate">
                <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>
                  Renews:{' '}
                  {balance?.monthlyExpiryDate
                    ? new Date(balance.monthlyExpiryDate).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Purchased Top-Up Credits */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 relative overflow-hidden">
              <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-1">
                <span>PURCHASED TOP-UP</span>
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <div className="text-2xl font-display font-bold text-white">
                {balance ? balance.purchasedCredits.toLocaleString() : '...'}
                <span className="text-xs font-mono text-white/50 font-normal ml-1">Credits</span>
              </div>
              <div className="text-[11px] font-mono text-white/40 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>90-Day rolling validity</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Membership Status */}
          <div className="flex flex-wrap items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-display font-bold text-white text-sm">
                {subscription ? subscription.tier.slice(0, 2) : 'FR'}
              </div>
              <div>
                <div className="text-xs font-mono text-white/40 uppercase">Active Membership</div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{subscription ? subscription.planName : 'Free Starter'}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      subscription?.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {subscription ? subscription.status : 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenMembership();
                }}
                className="px-3.5 py-1.5 rounded-lg border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Change Plan</span>
              </button>
              <button
                onClick={() => {
                  onClose();
                  onOpenTopUp();
                }}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>Top Up Credits</span>
              </button>
            </div>
          </div>

          {/* Deduction Logic Policy Notice */}
          <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-[11px] font-mono text-blue-200/80 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-blue-300">Seedance Priority Deduction Rule:</span>
              <p>
                Generation credits are deducted from your monthly subscription quota first. If monthly quota is depleted, purchased top-up credits are utilized. If a video generation task fails at the BytePlus API level, all reserved credits are automatically refunded to your ledger.
              </p>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/70">
                <History className="w-4 h-4 text-white/50" />
                <span>Immutable Transaction Ledger</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px] font-mono">
                {(['all', 'deductions', 'credits', 'refunds'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                      filterType === type
                        ? 'bg-white text-black font-bold'
                        : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
              <div className="divide-y divide-white/5 max-h-72 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="p-8 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Loading ledger records...</span>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-white/40">
                    No transactions recorded in this category.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    return (
                      <div
                        key={tx.id}
                        className="px-4 py-3 flex items-center justify-between text-xs font-mono hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              tx.type === 'REFUND'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                : isCredit
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-red-500/10 text-red-400 border border-red-500/30'
                            }`}
                          >
                            {tx.type === 'REFUND' ? (
                              <RefreshCw className="w-3.5 h-3.5" />
                            ) : isCredit ? (
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-white/90 truncate max-w-xs sm:max-w-md font-sans text-xs">
                              {tx.description}
                            </div>
                            <div className="text-[10px] text-white/40">
                              {new Date(tx.createdAt).toLocaleString()} · Balance: {tx.balanceAfter}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-3">
                          <div
                            className={`font-display font-bold text-sm ${
                              tx.type === 'REFUND'
                                ? 'text-cyan-400'
                                : isCredit
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }`}
                          >
                            {isCredit ? `+${tx.amount}` : tx.amount}
                            <span className="text-[10px] font-mono font-normal ml-0.5">cr</span>
                          </div>
                          <div className="text-[9px] text-white/30 uppercase">{tx.type}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Seedance 2.5 Billing Engine · Secured Ledger</span>
          <button
            onClick={loadData}
            className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
