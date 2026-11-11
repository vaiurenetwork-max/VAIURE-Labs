/**
 * VAIURE Labs — VXA Withdrawal Interface
 * Request withdrawal of eligible VXA Coin to Indonesian bank account or e-wallet.
 * Features:
 * - 1 VXA = Rp1,000 IDR exact integer conversion
 * - Step-up PIN authentication
 * - Atomic balance reservation (preventing double-spending)
 * - 1–2 Business Day settlement lifecycle pipeline
 */

import React, { useState } from 'react';
import {
  Zap,
  Building2,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { VxaUserWallet, PayoutDestination, SettlementTrackerRecord } from '../../../types/vxaSecurity';

interface VxaWithdrawViewProps {
  userId: string;
  wallet: VxaUserWallet;
  onWithdrawalRequested: (settlement: SettlementTrackerRecord, updatedWallet: VxaUserWallet) => void;
  onCancel: () => void;
}

const SUPPORTED_BANKS = [
  'Bank Central Asia (BCA)',
  'Bank Mandiri',
  'Bank Negara Indonesia (BNI)',
  'Bank Rakyat Indonesia (BRI)',
  'GoPay (PT Dompet Anak Bangsa)',
  'OVO (PT Visionet Internasional)',
];

export const VxaWithdrawView: React.FC<VxaWithdrawViewProps> = ({
  userId,
  wallet,
  onWithdrawalRequested,
  onCancel,
}) => {
  const [amountVxa, setAmountVxa] = useState<number>(Math.min(50, wallet.vxaBalances.availableMinor));
  const [bankName, setBankName] = useState<string>(SUPPORTED_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState<string>('8801928374');
  const [accountHolderName, setAccountHolderName] = useState<string>('Director VAIURE');
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableVxa = wallet.vxaBalances.availableMinor;
  const equivalentIdr = amountVxa * 1000;

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (amountVxa < 10) {
      setErrorMsg('Minimum withdrawal amount is 10 VXA (Rp10,000).');
      return;
    }

    if (amountVxa > availableVxa) {
      setErrorMsg(`Insufficient available VXA. You have ${availableVxa} VXA available.`);
      return;
    }

    if (!accountNumber.trim() || !accountHolderName.trim()) {
      setErrorMsg('Please enter valid account destination details.');
      return;
    }

    if (wallet.stepUpPinEnabled && (!pin || pin.length !== 6)) {
      setErrorMsg('Please enter your 6-digit Security Step-Up PIN.');
      return;
    }

    setIsSubmitting(true);
    try {
      const destination: PayoutDestination = {
        bankName,
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
      };

      const res = await vxaSecurityService.requestWithdrawal(
        amountVxa,
        destination,
        pin || undefined,
        undefined,
        userId
      );

      onWithdrawalRequested(res.settlement, res.wallet);
    } catch (err: any) {
      setErrorMsg(err.message || 'Withdrawal request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-[#090A10] border border-white/10 rounded-2xl space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              Withdrawal Request
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
              1–2 Business Days
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-1">
            Move VXA Coin to Indonesian bank account or e-wallet · 1 VXA = Rp1,000 IDR
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white font-mono text-xs transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Available Balance Notice */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-white/40 block">Eligible Available Balance:</span>
          <span className="text-lg font-bold text-white font-display">
            {availableVxa} VXA <span className="text-xs text-white/40 font-normal font-mono">(Rp{(availableVxa * 1000).toLocaleString('id-ID')})</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAmountVxa(availableVxa)}
          className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-cyan-300 font-mono text-[10px] cursor-pointer"
        >
          Withdraw Max
        </button>
      </div>

      <form onSubmit={handleSubmitWithdrawal} className="space-y-4 text-xs font-mono">
        {/* Amount input */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-white/60 uppercase">
            <span>Withdrawal Amount (VXA)</span>
            <span className="text-amber-400 font-bold">1 VXA = Rp1,000 IDR</span>
          </div>
          <div className="relative">
            <input
              type="number"
              min="10"
              max={availableVxa}
              value={amountVxa}
              onChange={(e) => setAmountVxa(Number(e.target.value))}
              className="w-full pl-4 pr-24 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm focus:outline-none focus:border-cyan-400"
            />
            <span className="absolute right-3 top-2.5 text-xs text-amber-400 font-bold">
              ~ Rp{equivalentIdr.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Payout Destination */}
        <div className="space-y-1.5">
          <span className="text-white/60 uppercase">Destination Financial Institution</span>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {SUPPORTED_BANKS.map((b) => (
              <option key={b} value={b} className="bg-[#0B0C11] text-white">
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <span className="text-white/60 uppercase">Account / Mobile Number</span>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 081234567890 or 8801928374"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-white/60 uppercase">Account Holder Full Name</span>
            <input
              type="text"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="As registered at bank"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Step-Up PIN */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white/80 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Step-Up Authentication PIN</span>
            </span>
            <span className="text-[10px] text-white/40">6 Digits</span>
          </div>
          <input
            type="password"
            maxLength={6}
            placeholder="Enter 6-digit PIN (default demo: 123456)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white tracking-widest text-sm font-mono focus:outline-none focus:border-cyan-400"
          />
          <p className="text-[10px] text-white/40">
            Mandatory second-factor cryptographic signing challenge for monetary movement.
          </p>
        </div>

        {/* Settlement Pipeline Policy Notice */}
        <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-200/80 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
            <span>1–2 Business Days Settlement SLA</span>
          </div>
          <p className="leading-relaxed">
            Funds will move atomically into your <strong>Reserved Balance</strong> during security review and will settle to your bank account via BI-FAST clearing within 1 to 2 business days.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || amountVxa < 10 || amountVxa > availableVxa}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-emerald-400 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-black" />
              <span>Authorizing Atomic Balance Reservation...</span>
            </>
          ) : (
            <>
              <span>Authorize Withdrawal of {amountVxa} VXA</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
