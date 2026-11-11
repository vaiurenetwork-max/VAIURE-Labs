/**
 * VAIURE Labs — VXA Deposit Interface
 * Deposit Indonesian Rupiah (IDR) to receive VXA Coin at exact 1 VXA = Rp1,000 IDR.
 * Supports QRIS, Bank Virtual Accounts, and instant verified settlement.
 */

import React, { useState } from 'react';
import {
  Zap,
  QrCode,
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { VxaUserWallet } from '../../../types/vxaSecurity';

interface VxaDepositViewProps {
  userId: string;
  onDepositComplete: (wallet: VxaUserWallet) => void;
  onCancel: () => void;
}

const PRESET_AMOUNTS = [
  { idr: 10_000, vxa: 10 },
  { idr: 25_000, vxa: 25 },
  { idr: 50_000, vxa: 50, popular: true },
  { idr: 100_000, vxa: 100 },
  { idr: 250_000, vxa: 250 },
  { idr: 500_000, vxa: 500 },
];

export const VxaDepositView: React.FC<VxaDepositViewProps> = ({
  userId,
  onDepositComplete,
  onCancel,
}) => {
  const [selectedIdr, setSelectedIdr] = useState<number>(50_000);
  const [customIdr, setCustomIdr] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'BCA_VA' | 'MANDIRI_VA'>('QRIS');
  const [isInitiating, setIsInitiating] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active deposit invoice state
  const [depositOrder, setDepositOrder] = useState<{
    depositRef: string;
    amountIdr: number;
    vxaEquivalent: number;
    qrString: string;
    vaNumber: string;
  } | null>(null);

  const effectiveIdr = isCustom ? Number(customIdr) || 0 : selectedIdr;
  const effectiveVxa = Math.floor(effectiveIdr / 1000);

  const handleCreateDeposit = async () => {
    if (effectiveIdr < 10_000) {
      setErrorMsg('Minimum deposit is Rp10,000.');
      return;
    }
    setErrorMsg(null);
    setIsInitiating(true);
    try {
      const order = await vxaSecurityService.createDeposit(effectiveIdr, paymentMethod, userId);
      setDepositOrder(order);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create deposit order.');
    } finally {
      setIsInitiating(false);
    }
  };

  const handleSimulatePaymentConfirmation = async () => {
    if (!depositOrder) return;
    setIsConfirming(true);
    setErrorMsg(null);
    try {
      const res = await vxaSecurityService.confirmDeposit(
        depositOrder.amountIdr,
        paymentMethod,
        depositOrder.depositRef,
        undefined,
        userId
      );
      onDepositComplete(res.wallet);
    } catch (err: any) {
      setErrorMsg(err.message || 'Payment confirmation failed.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-[#090A10] border border-white/10 rounded-2xl space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              Deposit to VXA Wallet
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
              1 VXA = Rp1,000
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-1">
            Centrally accounted digital monetary unit · Real-time ledger posting & double-entry attestation
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

      {!depositOrder ? (
        <>
          {/* Preset Amounts */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-white/60 uppercase tracking-wider flex items-center justify-between">
              <span>Select Deposit Amount</span>
              <span className="text-amber-400 font-bold">1 VXA = Rp1,000 IDR</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESET_AMOUNTS.map((preset) => {
                const isSelected = !isCustom && selectedIdr === preset.idr;
                return (
                  <button
                    key={preset.idr}
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setSelectedIdr(preset.idr);
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.15)] font-bold'
                        : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    {preset.popular && (
                      <span className="absolute -top-2 right-2 text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-400 text-black font-bold uppercase">
                        Popular
                      </span>
                    )}
                    <span className="text-sm font-display text-white">
                      Rp{preset.idr.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[11px] font-mono text-amber-400 mt-0.5 flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-amber-400" />
                      {preset.vxa} VXA
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Amount Option */}
            <div className="pt-1">
              <div
                onClick={() => setIsCustom(true)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isCustom
                    ? 'bg-amber-500/10 border-amber-400'
                    : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="text-white/60">Or Enter Custom Amount (IDR)</span>
                  {isCustom && effectiveIdr >= 10_000 && (
                    <span className="text-amber-400 font-bold">Yields {effectiveVxa} VXA</span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-mono text-white/40">Rp</span>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    placeholder="e.g. 750000"
                    value={customIdr}
                    onFocus={() => setIsCustom(true)}
                    onChange={(e) => {
                      setIsCustom(true);
                      setCustomIdr(e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-black/40 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <div className="text-xs font-mono text-white/60 uppercase tracking-wider">
              Payment Gateway Channel
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'QRIS', label: 'QRIS Instant', icon: QrCode, badge: 'Zero Fee' },
                { id: 'BCA_VA', label: 'BCA Virtual Account', icon: Building2 },
                { id: 'MANDIRI_VA', label: 'Mandiri VA', icon: Building2 },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 font-mono text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] text-center leading-tight">{m.label}</span>
                    {m.badge && (
                      <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-400">
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-white/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SHA-256 Ledger Audit Attestation</span>
            </div>
            <div className="text-right">
              <span className="text-white/40 mr-1.5">You will receive:</span>
              <span className="text-base font-bold text-amber-400 font-display">
                {effectiveVxa} VXA
              </span>
            </div>
          </div>

          {/* Generate Invoice Button */}
          <button
            onClick={handleCreateDeposit}
            disabled={isInitiating || effectiveIdr < 10_000}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)] disabled:opacity-50"
          >
            {isInitiating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Initiating Payment Settlement Gateway...</span>
              </>
            ) : (
              <>
                <span>Proceed to Pay Rp{effectiveIdr.toLocaleString('id-ID')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </>
      ) : (
        /* Invoice & Payment Confirmation View */
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs font-mono">
            <div>
              <div className="text-white/40">Invoice Reference:</div>
              <div className="text-white font-bold">{depositOrder.depositRef}</div>
            </div>
            <div className="text-right">
              <div className="text-white/40">Target Credited Balance:</div>
              <div className="text-amber-400 font-bold text-sm">+{depositOrder.vxaEquivalent} VXA</div>
            </div>
          </div>

          {/* QRIS / VA Display Box */}
          <div className="p-6 rounded-2xl bg-black/60 border border-cyan-500/30 flex flex-col items-center justify-center space-y-4">
            {paymentMethod === 'QRIS' ? (
              <div className="space-y-3 text-center">
                <div className="w-48 h-48 bg-white p-3 rounded-2xl mx-auto shadow-2xl flex items-center justify-center">
                  <QrCode className="w-40 h-40 text-black" />
                </div>
                <div className="text-xs font-mono text-cyan-300">
                  Scan using GoPay, OVO, Dana, BCA Mobile, or any QRIS app
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-center w-full max-w-sm">
                <div className="text-xs font-mono text-white/50 uppercase">Virtual Account Number</div>
                <div className="text-xl font-mono font-bold tracking-widest text-cyan-300 p-3 bg-white/5 rounded-xl border border-white/10">
                  {depositOrder.vaNumber}
                </div>
                <p className="text-[11px] font-mono text-white/40">
                  Bank transfer to PT VAIURE LABS SETTLEMENT ESCROW
                </p>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Awaiting payment settlement confirmation (Simulated Dev Mode)</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSimulatePaymentConfirmation}
              disabled={isConfirming}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-400/20 disabled:opacity-50"
            >
              {isConfirming ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying Webhook & Ledger Postings...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  <span>Simulate Instant Webhook Confirmation (Deposit {depositOrder.vxaEquivalent} VXA)</span>
                </>
              )}
            </button>

            <button
              onClick={() => setDepositOrder(null)}
              className="w-full py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            >
              Back to Amount Selection
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
