/**
 * VAIURE Labs — Seedance 2.5 Credit Top-Up Store Modal
 * Immediate purchase of extra compute credits with 90-day validity,
 * multi-channel payment options (QRIS, VA, Card), and real-time ledger settlement.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  QrCode,
  CreditCard,
  Building2,
  ShieldCheck,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { CreditPackage, CreditWalletBalance } from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceTopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onCreditsPurchased?: (newBalance: CreditWalletBalance) => void;
}

export const SeedanceTopUpModal: React.FC<SeedanceTopUpModalProps> = ({
  isOpen,
  onClose,
  userId,
  onCreditsPurchased,
}) => {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'bca_va' | 'mandiri_va' | 'card'>('qris');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<'select' | 'payment' | 'success'>('select');
  const [purchasedResult, setPurchasedResult] = useState<{
    package: CreditPackage;
    newBalance: CreditWalletBalance;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPackages();
      setStep('select');
      setPurchasedResult(null);
    }
  }, [isOpen]);

  const loadPackages = async () => {
    try {
      const pkgs = await seedancePlatformService.getCreditPackages();
      setPackages(pkgs);
      if (pkgs.length > 0 && !selectedPackage) {
        // default select CREATOR package
        const popular = pkgs.find((p) => p.isPopular) || pkgs[1] || pkgs[0];
        setSelectedPackage(popular);
      }
    } catch (err) {
      console.error('Failed to load credit packages:', err);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPackage) return;
    setIsProcessing(true);
    try {
      const response = await seedancePlatformService.purchasePackage(
        userId,
        selectedPackage.id,
        paymentMethod
      );
      setPurchasedResult({
        package: selectedPackage,
        newBalance: response.balance,
      });
      setStep('success');
      if (onCreditsPurchased) {
        onCreditsPurchased(response.balance);
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0B0C11] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Seedance 2.5 Credit Top-Up
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Instant Deposit
                </span>
              </h2>
              <p className="text-xs font-mono text-white/50">
                Non-expiring within 90 days · Directly credited to your Seedance compute wallet
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
          {step === 'select' && (
            <>
              {/* Package cards */}
              <div className="space-y-3">
                <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Select Credit Pack
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const pricePerCredit = Math.round(pkg.priceIDR / pkg.credits);

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
                            : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                        }`}
                      >
                        {pkg.isPopular && (
                          <span className="absolute -top-2.5 right-4 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-400 text-black shadow-sm uppercase">
                            Popular Choice
                          </span>
                        )}

                        <div className="flex items-center justify-between mb-1">
                          <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                            {pkg.name}
                          </span>
                          <span className="text-xs font-mono text-amber-400 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-amber-400" />
                            {pkg.credits} cr
                          </span>
                        </div>

                        <div className="text-xl font-display font-bold text-white tracking-tight my-2">
                          Rp{pkg.priceIDR.toLocaleString('id-ID')}
                        </div>

                        <div className="text-[11px] font-mono text-white/50 flex items-center justify-between">
                          <span>~ Rp{pricePerCredit}/credit</span>
                          <span className="flex items-center gap-1 text-emerald-400">
                            <Clock className="w-3 h-3" />
                            90-Day validity
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-mono text-white/50 uppercase tracking-wider">
                  Choose Payment Method
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'qris', label: 'QRIS Instant', icon: QrCode, badge: 'Zero Fee' },
                    { id: 'bca_va', label: 'BCA Virtual Account', icon: Building2 },
                    { id: 'mandiri_va', label: 'Mandiri VA', icon: Building2 },
                    { id: 'card', label: 'Credit Card', icon: CreditCard },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isActive = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 font-mono text-xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white text-black border-white font-bold'
                            : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[11px] text-center leading-tight">{method.label}</span>
                        {method.badge && (
                          <span className="text-[8px] px-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {method.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Summary & Security */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-white/60">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>256-Bit SSL Encrypted Settlement</span>
                </div>
                <div className="text-right">
                  <span className="text-white/40 mr-2">Total Amount:</span>
                  <span className="text-base font-bold text-white font-display">
                    Rp{(selectedPackage?.priceIDR || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={!selectedPackage || isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(251,191,36,0.3)] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Secure Payment Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed with {paymentMethod.toUpperCase()} Settlement</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </>
          )}

          {step === 'success' && purchasedResult && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-bold text-white tracking-tight">
                  Credits Credited Successfully!
                </h3>
                <p className="text-xs font-mono text-white/60">
                  +{purchasedResult.package.credits} Credits added to your Seedance compute ledger.
                </p>
              </div>

              <div className="p-4 max-w-sm mx-auto rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs font-mono">
                <div className="flex justify-between text-white/50">
                  <span>Package:</span>
                  <span className="text-white font-bold">{purchasedResult.package.name}</span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Paid:</span>
                  <span className="text-white font-bold">
                    Rp{purchasedResult.package.priceIDR.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-white/50">
                  <span>Payment Channel:</span>
                  <span className="text-emerald-400 uppercase font-bold">{paymentMethod}</span>
                </div>
                <div className="flex justify-between text-white/50 pt-2 border-t border-white/10">
                  <span>New Total Balance:</span>
                  <span className="text-amber-400 font-bold text-sm">
                    {purchasedResult.newBalance.totalCredits} Credits
                  </span>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-white/90 transition-all cursor-pointer"
                >
                  Return to Studio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Official BytePlus Seedance 2.5 Reseller Gateway</span>
          <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
