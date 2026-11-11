/**
 * VAIURE Labs — VXA Financial Security & Digital Wallet Dashboard
 * Central financial workspace combining:
 * - VAIURE Credits & VXA Coin accounting (1 VXA = Rp1,000 IDR)
 * - 120-Second Dynamic Cryptographic Key Rotation status pill
 * - Development Mode disclosure & regulatory safeguarding notice
 * - Sub-routes for Deposit, Withdraw, Convert, Settlements, Double-Entry Ledger, and Admin Control
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Key,
  CreditCard,
  Building2,
  Lock,
  History,
  Coins,
  ChevronRight,
  AlertCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import {
  VxaUserWallet,
  VxaTransaction,
  KeyRegistryStatus,
  SettlementTrackerRecord,
} from '../../../types/vxaSecurity';
import { VxaDepositView } from './VxaDepositView';
import { VxaWithdrawView } from './VxaWithdrawView';
import { VxaConvertView } from './VxaConvertView';
import { VxaSettlementTracker } from './VxaSettlementTracker';
import { VxaLedgerAuditView } from './VxaLedgerAuditView';
import { VxaSecurityControlModal } from './VxaSecurityControlModal';
import { VxaAdminControlCenter } from './VxaAdminControlCenter';

export type VxaWalletTab =
  | 'overview'
  | 'deposit'
  | 'withdraw'
  | 'convert'
  | 'settlements'
  | 'history'
  | 'admin';

interface VxaWalletDashboardProps {
  userId?: string;
  userEmail?: string;
  initialTab?: VxaWalletTab;
  onClose?: () => void;
}

export const VxaWalletDashboard: React.FC<VxaWalletDashboardProps> = ({
  userId = 'efayour@gmail.com',
  userEmail = 'efayour@gmail.com',
  initialTab = 'overview',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<VxaWalletTab>(initialTab);
  const [wallet, setWallet] = useState<VxaUserWallet | null>(null);
  const [transactions, setTransactions] = useState<VxaTransaction[]>([]);
  const [keyStatus, setKeyStatus] = useState<KeyRegistryStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [w, txs, keys] = await Promise.all([
        vxaSecurityService.getWallet(userId),
        vxaSecurityService.getTransactions(userId),
        vxaSecurityService.getKeyStatus(),
      ]);
      setWallet(w);
      setTransactions(txs);
      setKeyStatus(keys);
    } catch (err) {
      console.error('Failed to load VXA wallet data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Poll key status every 5 seconds for live countdown
    const keyInterval = setInterval(async () => {
      try {
        const ks = await vxaSecurityService.getKeyStatus();
        setKeyStatus(ks);
      } catch {
        // silent
      }
    }, 5000);
    return () => clearInterval(keyInterval);
  }, [userId]);

  const availableVxa = wallet?.vxaBalances.availableMinor ?? 0;
  const reservedVxa = wallet?.vxaBalances.reservedMinor ?? 0;
  const pendingVxa = wallet?.vxaBalances.pendingMinor ?? 0;
  const totalCredits = wallet?.creditBalances.totalCredits ?? 0;
  const secondsRemaining = keyStatus?.secondsRemaining ?? 120;

  return (
    <div className="w-full h-full flex flex-col bg-[#06070A] text-[#ECECE9] overflow-hidden select-none">
      {/* Sub-Navigation Bar */}
      <div className="px-4 sm:px-8 py-3 bg-[#08090D] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm sm:text-base font-bold text-white uppercase tracking-wider">
              VXA WALLET & SECURITY CORE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              1 VXA = Rp1,000 IDR
            </span>
          </div>
        </div>

        {/* Live 120-Second Dynamic Key Rotation Badge */}
        <div
          onClick={() => setIsSecurityModalOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/40 hover:bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 font-mono text-[11px] cursor-pointer transition-all shadow-sm"
          title="Click to view Cryptographic Key Manager"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold">Key Rotation:</span>
          <span>{secondsRemaining}s</span>
          <span className="text-white/40 hidden md:inline">· KID: {keyStatus?.activeKid.slice(0, 10)}...</span>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-xl p-0.5 text-xs font-mono">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'deposit', label: 'Deposit' },
            { id: 'withdraw', label: 'Withdraw' },
            { id: 'convert', label: 'Convert' },
            { id: 'settlements', label: 'Settlements' },
            { id: 'history', label: 'Ledger Audit' },
            { id: 'admin', label: 'Admin' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as VxaWalletTab)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-black font-bold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
        {/* Development Mode Notice Banner */}
        <div className="max-w-5xl mx-auto mb-6 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs font-mono text-amber-200/90 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300">REGULATORY SAFEGUARDING NOTICE — DEVELOPMENT MODE ACTIVE</span>
            <p className="text-[11px] leading-relaxed text-amber-200/80">
              VXA is currently accounted as a centralized platform value unit. Real-money customer deposits and cash redemptions are simulated for development and testing. Production monetary custody requires Bank Indonesia / OJK permissions and licensed financial partner clearing.
            </p>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Balance Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* VXA Available Balance */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/40 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-amber-400 mb-2">
                  <span>AVAILABLE VXA</span>
                  <Coins className="w-4 h-4" />
                </div>
                <div className="text-3xl font-display font-bold text-white tracking-tight">
                  {availableVxa.toLocaleString()} <span className="text-sm font-mono text-amber-400 font-normal">VXA</span>
                </div>
                <div className="text-xs font-mono text-white/50 mt-1">
                  ~ Rp{(availableVxa * 1000).toLocaleString('id-ID')} Value
                </div>
              </div>

              {/* VXA Reserved in Settlement */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-400 mb-2">
                  <span>RESERVED (IN SETTLEMENT)</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-3xl font-display font-bold text-white tracking-tight">
                  {reservedVxa.toLocaleString()} <span className="text-sm font-mono text-cyan-400 font-normal">VXA</span>
                </div>
                <div className="text-xs font-mono text-white/50 mt-1">
                  Locked in 1–2 business day pipeline
                </div>
              </div>

              {/* VAIURE Credits (Utility) */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 mb-2">
                  <span>VAIURE CREDITS (UTILITY)</span>
                  <Zap className="w-4 h-4 fill-emerald-400" />
                </div>
                <div className="text-3xl font-display font-bold text-white tracking-tight">
                  {totalCredits.toLocaleString()} <span className="text-sm font-mono text-emerald-400 font-normal">Credits</span>
                </div>
                <div className="text-xs font-mono text-white/50 mt-1">
                  For Seedance 2.5 video generation
                </div>
              </div>

              {/* Security Status */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs font-mono text-white/50">
                  <span>ACCOUNT PROTECTION</span>
                  <Lock className="w-4 h-4 text-cyan-400" />
                </div>
                <div>
                  <div className="text-base font-bold text-white flex items-center gap-1.5 mt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{wallet?.stepUpPinEnabled ? 'PIN Protected' : 'PIN Inactive'}</span>
                  </div>
                  <button
                    onClick={() => setIsSecurityModalOpen(true)}
                    className="text-[11px] font-mono text-cyan-400 hover:underline mt-1 cursor-pointer block"
                  >
                    Configure Security Settings →
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center justify-between p-5 rounded-2xl bg-[#090A10] border border-white/10 gap-3">
              <div className="space-y-0.5">
                <div className="font-serif text-sm font-bold text-white uppercase">Instant Financial Actions</div>
                <div className="text-xs font-mono text-white/40">Double-entry accounting with HMAC-SHA256 authorization</div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setActiveTab('deposit')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_15px_rgba(251,191,36,0.25)]"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>Deposit VXA</span>
                </button>

                <button
                  onClick={() => setActiveTab('withdraw')}
                  className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Withdraw IDR</span>
                </button>

                <button
                  onClick={() => setActiveTab('convert')}
                  className="px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Convert to Credits</span>
                </button>

                <button
                  onClick={() => setActiveTab('settlements')}
                  className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Settlements</span>
                </button>
              </div>
            </div>

            {/* Recent Signed Transactions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-white/60 uppercase tracking-wider font-bold">
                  Recent Signed Transactions
                </span>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>View Double-Entry Ledger</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090A10]">
                <div className="divide-y divide-white/5 max-h-72 overflow-y-auto custom-scrollbar">
                  {transactions.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono text-white/40">
                      No transactions recorded yet.
                    </div>
                  ) : (
                    transactions.slice(0, 10).map((tx) => {
                      const isCredit = tx.type === 'DEPOSIT' || tx.type === 'REFUND';
                      return (
                        <div key={tx.id} className="p-4 flex items-center justify-between text-xs font-mono hover:bg-white/[0.01]">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isCredit
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                              <div className="text-white font-bold truncate">
                                {tx.type === 'DEPOSIT' ? 'Deposit Settlement' : tx.type === 'WITHDRAWAL' ? 'Withdrawal Payout' : 'Conversion'}
                              </div>
                              <div className="text-[10px] text-white/40">
                                {new Date(tx.createdAt).toLocaleString()} · KID: {tx.kid.slice(0, 12)}...
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-display font-bold text-sm ${isCredit ? 'text-emerald-400' : 'text-white'}`}>
                              {isCredit ? '+' : '-'}{tx.amountMinor} {tx.asset}
                            </div>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-white/50 uppercase">
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DEPOSIT */}
        {activeTab === 'deposit' && (
          <VxaDepositView
            userId={userId}
            onDepositComplete={(updated) => {
              setWallet(updated);
              setActiveTab('overview');
              loadData();
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {/* TAB 3: WITHDRAW */}
        {activeTab === 'withdraw' && wallet && (
          <VxaWithdrawView
            userId={userId}
            wallet={wallet}
            onWithdrawalRequested={(settlement, updated) => {
              setWallet(updated);
              setActiveTab('settlements');
              loadData();
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {/* TAB 4: CONVERT */}
        {activeTab === 'convert' && wallet && (
          <VxaConvertView
            userId={userId}
            wallet={wallet}
            onConvertComplete={(updated) => {
              setWallet(updated);
              setActiveTab('overview');
              loadData();
            }}
            onCancel={() => setActiveTab('overview')}
          />
        )}

        {/* TAB 5: SETTLEMENTS */}
        {activeTab === 'settlements' && <VxaSettlementTracker userId={userId} />}

        {/* TAB 6: HISTORY & LEDGER AUDIT */}
        {activeTab === 'history' && <VxaLedgerAuditView />}

        {/* TAB 7: ADMIN CONTROL */}
        {activeTab === 'admin' && <VxaAdminControlCenter adminEmail={userEmail} />}
      </div>

      {/* Security Modal */}
      <VxaSecurityControlModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        userId={userId}
      />
    </div>
  );
};
