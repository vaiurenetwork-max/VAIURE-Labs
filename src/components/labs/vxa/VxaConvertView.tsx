/**
 * VAIURE Labs — VXA Conversion Interface
 * Convert eligible VXA Coin into VAIURE Credits for Seedance 2.5 video generation.
 * Enforces strict accounting segregation: Promotional credits can NEVER become money.
 */

import React, { useState } from 'react';
import {
  Zap,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins,
  Sparkles,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { VxaUserWallet } from '../../../types/vxaSecurity';

interface VxaConvertViewProps {
  userId: string;
  wallet: VxaUserWallet;
  onConvertComplete: (wallet: VxaUserWallet, credits: number) => void;
  onCancel: () => void;
}

export const VxaConvertView: React.FC<VxaConvertViewProps> = ({
  userId,
  wallet,
  onConvertComplete,
  onCancel,
}) => {
  const [vxaAmount, setVxaAmount] = useState<number>(30); // 30 VXA = 50 Credits
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableVxa = wallet.vxaBalances.availableMinor;
  // 6 VXA = 10 Credits (exact ratio: Rp6,000 / Rp600 per credit = 10 credits)
  const creditsReceived = Math.floor((vxaAmount * 1000) / 600);

  const handleConvert = async () => {
    if (vxaAmount < 6) {
      setErrorMsg('Minimum conversion amount is 6 VXA (yields 10 Credits).');
      return;
    }
    if (vxaAmount > availableVxa) {
      setErrorMsg(`Insufficient available VXA. You have ${availableVxa} VXA.`);
      return;
    }

    setErrorMsg(null);
    setIsConverting(true);
    try {
      const res = await vxaSecurityService.convertVxaToCredits(vxaAmount, userId);
      onConvertComplete(res.wallet, res.creditsReceived);
    } catch (err: any) {
      setErrorMsg(err.message || 'Conversion failed.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-[#090A10] border border-white/10 rounded-2xl space-y-6 animate-fade-in select-none">
      {/* Header */}
      <div className="border-b border-white/10 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
              Convert VXA to VAIURE Credits
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
              Compute Conversion
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-1">
            Exchange monetary VXA units for AI video generation compute credits
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

      {/* Available Balance */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
        <div>
          <span className="text-white/40 block">Your Available Balance:</span>
          <span className="text-lg font-bold text-white font-display">
            {availableVxa} VXA <span className="text-xs font-normal text-white/40 font-mono">(Rp{(availableVxa * 1000).toLocaleString('id-ID')})</span>
          </span>
        </div>
        <span className="text-[11px] text-cyan-400">Rate: 6 VXA = 10 Credits</span>
      </div>

      {/* Conversion Calculator Box */}
      <div className="p-6 rounded-2xl bg-black/60 border border-white/15 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-white/60 uppercase">
          <span>You Convert</span>
          <span>You Receive</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="relative">
              <input
                type="number"
                min="6"
                step="6"
                max={availableVxa}
                value={vxaAmount}
                onChange={(e) => setVxaAmount(Number(e.target.value))}
                className="w-full pl-3 pr-12 py-2.5 rounded-xl bg-white/[0.04] border border-white/20 text-white font-mono text-base font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-3 text-xs font-mono text-amber-400 font-bold">VXA</span>
            </div>
            <span className="text-[10px] font-mono text-white/40 block">
              ~ Rp{(vxaAmount * 1000).toLocaleString('id-ID')}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 shrink-0">
            <ArrowRight className="w-4 h-4" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/20 text-white font-mono text-base font-bold flex items-center justify-between">
              <span className="text-cyan-300">{creditsReceived}</span>
              <span className="text-xs text-cyan-400 font-mono font-bold">Credits</span>
            </div>
            <span className="text-[10px] font-mono text-white/40 block">
              For Seedance 2.5 Studio
            </span>
          </div>
        </div>

        {/* Quick Amount Pills */}
        <div className="flex items-center gap-2 pt-2">
          {[
            { vxa: 6, cr: 10 },
            { vxa: 30, cr: 50 },
            { vxa: 60, cr: 100 },
            { vxa: 120, cr: 200 },
          ].map((pill) => (
            <button
              key={pill.vxa}
              type="button"
              onClick={() => setVxaAmount(pill.vxa)}
              className={`px-3 py-1 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                vxaAmount === pill.vxa
                  ? 'bg-amber-400 text-black border-amber-300 font-bold'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              {pill.vxa} VXA ({pill.cr} cr)
            </button>
          ))}
        </div>
      </div>

      {/* Accounting & Legal Segregation Notice */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs font-mono text-amber-200/80 space-y-1.5">
        <div className="flex items-center gap-1.5 font-bold text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Accounting Policy Notice</span>
        </div>
        <p className="leading-relaxed text-[11px]">
          Converted VAIURE Credits become internal utility tokens allocated exclusively for AI video generation compute and cannot be converted back into VXA Coin or withdrawn as real money.
        </p>
      </div>

      {/* Convert Button */}
      <button
        onClick={handleConvert}
        disabled={isConverting || vxaAmount < 6 || vxaAmount > availableVxa}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.25)] disabled:opacity-50"
      >
        {isConverting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-black" />
            <span>Posting Double-Entry Conversion Entry...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-black" />
            <span>Execute Conversion ({vxaAmount} VXA → {creditsReceived} Credits)</span>
          </>
        )}
      </button>
    </div>
  );
};
