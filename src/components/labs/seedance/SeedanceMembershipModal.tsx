/**
 * VAIURE Labs — Seedance 2.5 Five-Tier Membership Modal
 * Editorial presentation of Free, Starter, Creator, Pro, and Studio subscription tiers
 * with real-time plan switching, cancellation, and renewal tracking.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Crown,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  MembershipPlan,
  MembershipTier,
  UserSubscription,
} from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSubscriptionUpdated?: (subscription: UserSubscription) => void;
}

export const SeedanceMembershipModal: React.FC<SeedanceMembershipModalProps> = ({
  isOpen,
  onClose,
  userId,
  onSubscriptionUpdated,
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [currentSub, setCurrentSub] = useState<UserSubscription | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    try {
      const [fetchedPlans, sub] = await Promise.all([
        seedancePlatformService.getMembershipPlans(),
        seedancePlatformService.getUserSubscription(userId),
      ]);
      setPlans(fetchedPlans);
      setCurrentSub(sub);
      setSelectedTier(sub.tier);
    } catch (err) {
      console.error('Failed to load membership plans:', err);
    }
  };

  const handleSelectPlan = async (plan: MembershipPlan) => {
    if (currentSub?.tier === plan.tier) return;
    setIsProcessing(true);
    setNotification(null);
    try {
      const updated = await seedancePlatformService.updateSubscription(userId, plan.tier);
      setCurrentSub(updated);
      setSelectedTier(updated.tier);
      setNotification({
        type: 'success',
        message: `Plan successfully updated to ${plan.name}! ${plan.monthlyCredits} monthly credits allocated.`,
      });
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated(updated);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to update subscription. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsProcessing(true);
    setNotification(null);
    try {
      const updated = await seedancePlatformService.cancelSubscription(userId);
      setCurrentSub(updated);
      setConfirmCancel(false);
      setNotification({
        type: 'success',
        message: 'Your subscription will not renew after the current cycle. Completed projects remain intact.',
      });
      if (onSubscriptionUpdated) {
        onSubscriptionUpdated(updated);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to cancel subscription.',
      });
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
        className="w-full max-w-5xl bg-[#090A0F] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg sm:text-xl font-bold tracking-tight text-white uppercase">
                VAIURE LABS
              </span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] tracking-widest uppercase">
                MEMBERSHIP TIERS
              </span>
            </div>
            <p className="text-xs font-mono text-white/50 mt-1">
              Affordable, transparent AI filmmaking subscriptions with dedicated Seedance 2.5 compute credits.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs font-mono flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-950/60 border-b border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/60 border-b border-red-500/30 text-red-300'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-white/50 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Active Status Card */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-white/15 flex items-center justify-center font-serif text-lg font-bold text-white">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  Current Active Plan
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentSub ? currentSub.planName : 'Free Plan'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {currentSub ? currentSub.status : 'ACTIVE'}
                  </span>
                  {currentSub?.cancelAtPeriodEnd && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Cancels at end of cycle
                    </span>
                  )}
                </div>
                <div className="text-xs font-mono text-white/50 mt-0.5">
                  Remaining Monthly Credits:{' '}
                  <span className="text-amber-400 font-bold">
                    {currentSub ? currentSub.monthlyCreditsRemaining : 0}
                  </span>{' '}
                  · Renews on:{' '}
                  {currentSub?.currentPeriodEnd
                    ? new Date(currentSub.currentPeriodEnd).toLocaleDateString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            {currentSub && currentSub.tier !== 'FREE' && !currentSub.cancelAtPeriodEnd && (
              <button
                onClick={() => setConfirmCancel(true)}
                className="text-xs font-mono text-red-400/80 hover:text-red-300 underline cursor-pointer"
              >
                Cancel Auto-Renewal
              </button>
            )}
          </div>

          {/* Cancel Confirmation Dialog */}
          {confirmCancel && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-red-300 font-bold">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Confirm Subscription Cancellation</span>
              </div>
              <p className="text-xs font-mono text-white/70">
                Are you sure you want to stop recurring billing? You will retain access to your plan and remaining monthly credits until the end of your billing cycle. Your completed video projects will NEVER be erased.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                  className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-black font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  {isProcessing ? 'Processing...' : 'Yes, Cancel Renewal'}
                </button>
                <button
                  onClick={() => setConfirmCancel(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/20 text-white/70 hover:text-white font-mono text-xs transition-all cursor-pointer"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          )}

          {/* Billing Cycle Switcher */}
          <div className="flex justify-center">
            <div className="p-1 rounded-full bg-white/[0.04] border border-white/10 flex items-center text-xs font-mono">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-black font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Save 15%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {plans.map((plan) => {
              const isCurrent = currentSub?.tier === plan.tier;
              const isFeatured = plan.tier === 'CREATOR';
              const isStudio = plan.tier === 'STUDIO';

              const price =
                billingCycle === 'yearly' && plan.priceIDR > 0
                  ? Math.round(plan.priceIDR * 0.85)
                  : plan.priceIDR;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-4 flex flex-col justify-between transition-all relative ${
                    isFeatured
                      ? 'bg-gradient-to-b from-cyan-950/40 via-[#0A0D14] to-[#0A0D14] border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(34,211,238,0.15)]'
                      : isStudio
                      ? 'bg-gradient-to-b from-amber-950/30 via-[#0E0B0A] to-[#0E0B0A] border border-amber-500/40'
                      : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-cyan-400 text-black text-[9px] font-mono font-bold uppercase tracking-wider shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-serif text-sm font-bold uppercase tracking-wider text-white">
                        {plan.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white font-bold">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-white/50 min-h-[32px] line-clamp-2">
                      {plan.tagline}
                    </p>

                    {/* Price */}
                    <div className="my-4 pb-4 border-b border-white/10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-mono text-white/50">Rp</span>
                        <span className="text-2xl font-display font-bold text-white tracking-tight">
                          {price.toLocaleString('id-ID')}
                        </span>
                        <span className="text-[10px] font-mono text-white/40">/mo</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-400 mt-1 flex items-center gap-1 font-bold">
                        <Zap className="w-3 h-3 fill-amber-400" />
                        <span>{plan.monthlyCredits.toLocaleString()} Credits / mo</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2 text-[11px] font-mono text-white/70 mb-5">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || isProcessing}
                    className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-white/10 text-white/40 cursor-default'
                        : isFeatured
                        ? 'bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-400/20'
                        : isStudio
                        ? 'bg-amber-400 hover:bg-amber-300 text-black'
                        : 'bg-white/10 hover:bg-white text-white hover:text-black'
                    }`}
                  >
                    {isCurrent ? (
                      <span>Current Plan</span>
                    ) : (
                      <>
                        <span>{plan.priceIDR === 0 ? 'Downgrade to Free' : 'Select Plan'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guarantee & Terms Notice */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 flex flex-wrap items-center justify-between text-xs font-mono text-white/50 gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>BytePlus Seedance 2.5 Compute Allocation Guarantee</span>
            </div>
            <span>No long-term contracts. Cancel or modify anytime.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-3.5 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs font-mono text-white/40">
          <span>Prices exclude applicable local VAT · Powered by Midtrans / QRIS</span>
          <button
            onClick={onClose}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
