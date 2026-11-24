/**
 * VAIURE — SEEDANCE LAB TIER PLAN & SUBSCRIPTION MANAGEMENT
 * Strict Black & White Monochromatic Glassmorphism.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  Check,
  RefreshCw,
  Calendar,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  XCircle,
  History,
  Zap,
  Layers,
  Lock,
} from 'lucide-react';
import {
  MembershipPlan,
  UserSubscription,
  CreditWalletBalance,
  CanonicalTierId,
} from '../../../types/seedancePlatform';
import {
  fetchMembershipPlans,
  fetchUserMembershipStatus,
  subscribeToMembership,
  toggleMembershipAutoRenew,
  cancelMembershipSubscription,
  PlatformRequestError,
} from '../../../services/seedancePlatformService';

interface SeedancePlansViewProps {
  isAuthenticated: boolean;
  onRequireAuth?: () => void;
  onSubscriptionChanged?: () => void;
  onOpenCredits?: () => void;
}

export const SeedancePlansView: React.FC<SeedancePlansViewProps> = ({
  isAuthenticated,
  onRequireAuth,
  onSubscriptionChanged,
  onOpenCredits,
}) => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [wallet, setWallet] = useState<CreditWalletBalance | null>(null);
  const [paymentConfigured, setPaymentConfigured] = useState<boolean>(false);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [togglingRenew, setTogglingRenew] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const plansRes = await fetchMembershipPlans();
      setPlans(plansRes.plans || []);
      setPaymentConfigured(Boolean(plansRes.paymentProviderConfigured));
      setPaymentProvider(plansRes.paymentProvider || null);

      if (isAuthenticated) {
        const statusRes = await fetchUserMembershipStatus();
        setSubscription(statusRes.subscription);
        setWallet(statusRes.wallet);
      } else {
        setSubscription(null);
        setWallet(null);
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed to load subscription plans.' });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectPlan = async (tier: CanonicalTierId) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setBusyTier(tier);
    setNotice(null);
    try {
      const result = await subscribeToMembership(tier);
      if (result.requiresCheckout && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result.subscription) setSubscription(result.subscription);
      if (result.wallet) setWallet(result.wallet);
      setNotice({ type: 'success', text: result.message || `${tier} plan updated.` });
      onSubscriptionChanged?.();
    } catch (err: any) {
      if (err instanceof PlatformRequestError && err.code === 'PAYMENT_PROVIDER_UNCONFIGURED') {
        setNotice({ type: 'info', text: err.message });
      } else {
        setNotice({ type: 'error', text: err?.message || 'Could not update subscription.' });
      }
    } finally {
      setBusyTier(null);
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!subscription || !isAuthenticated) return;
    setTogglingRenew(true);
    setNotice(null);
    try {
      const res = await toggleMembershipAutoRenew(!subscription.autoRenew);
      setSubscription(res.subscription);
      setNotice({ type: 'success', text: res.message });
      onSubscriptionChanged?.();
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed to update auto-renew.' });
    } finally {
      setTogglingRenew(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || !isAuthenticated) return;
    setCancelling(true);
    setNotice(null);
    try {
      const res = await cancelMembershipSubscription();
      setSubscription(res.subscription);
      setNotice({ type: 'info', text: res.message });
      onSubscriptionChanged?.();
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Failed to cancel renewal.' });
    } finally {
      setCancelling(false);
    }
  };

  const activeTier = subscription?.planTier || 'FREE';

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header */}
        <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono">
                Tier Plan & Subscription Management
              </h1>
            </div>
            <p className="text-xs text-white/60">
              Configurable Seedance 2.5 membership tiers, billing status, auto-renewal, and generation allowances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCredits && (
              <button
                type="button"
                onClick={onOpenCredits}
                className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono uppercase tracking-wider text-white transition-all cursor-pointer whitespace-nowrap"
              >
                View Credit Wallet
              </button>
            )}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Plans</span>
            </button>
          </div>
        </section>

        {/* Notice Banner */}
        {notice && (
          <div className="p-4 rounded-xl border border-white/20 bg-white/[0.05] flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <span className="text-white/90 leading-relaxed">{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-white/50 hover:text-white text-xs font-mono cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Current Subscription Summary */}
        {!isAuthenticated ? (
          <section className="p-6 rounded-2xl border border-white/[0.12] bg-white/[0.03] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Lock className="w-4 h-4" />
                <span>Sign In to Manage Your Subscription</span>
              </div>
              <p className="text-xs text-white/60">
                Authenticate with your VAIURE account to inspect your active tier, monthly allowance, expiration date, and billing history.
              </p>
            </div>
            {onRequireAuth && (
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs font-mono uppercase tracking-wider hover:bg-white/90 cursor-pointer whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )}
          </section>
        ) : subscription ? (
          <section className="rounded-2xl border border-white/[0.14] bg-white/[0.04] p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded bg-white text-black font-mono text-[11px] font-bold uppercase">
                    {subscription.planName} ({subscription.planTier})
                  </span>
                  <span className="px-2 py-0.5 rounded border border-white/20 bg-white/[0.06] font-mono text-[10px] uppercase text-white/80">
                    Status: {subscription.status}
                  </span>
                  <span className="px-2 py-0.5 rounded border border-white/15 bg-black/50 font-mono text-[10px] uppercase text-white/70">
                    Billing: {subscription.billingStatus}
                  </span>
                </div>
                <p className="text-xs text-white/60 font-mono">
                  Account: {subscription.userEmail || subscription.userId} · Payment Gateway:{' '}
                  {paymentConfigured ? `${paymentProvider?.toUpperCase()} Ready` : 'Unconfigured (Admin / Free Tiers Active)'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  disabled={togglingRenew || subscription.planTier === 'FREE'}
                  onClick={handleToggleAutoRenew}
                  className={`px-3.5 py-2 rounded-lg border text-xs font-mono uppercase transition-all cursor-pointer whitespace-nowrap ${
                    subscription.autoRenew
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-white/20 bg-white/[0.04] text-white/75 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {togglingRenew
                    ? 'Updating...'
                    : `Auto-Renew: ${subscription.autoRenew ? 'ON' : 'OFF'}`}
                </button>

                {subscription.planTier !== 'FREE' && !subscription.cancelAtPeriodEnd && (
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleCancelSubscription}
                    className="px-3.5 py-2 rounded-lg border border-white/20 bg-white/[0.03] hover:bg-white/[0.08] text-xs font-mono uppercase text-white/75 hover:text-white flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{cancelling ? 'Cancelling...' : 'Cancel Renewal'}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 space-y-1">
                <span className="text-[10px] text-white/45 uppercase flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Remaining Credits
                </span>
                <div className="text-lg font-semibold text-white tabular-nums">
                  {(wallet?.totalAvailable ?? subscription.remainingMonthlyCredits).toLocaleString()}
                </div>
                <div className="text-[10px] text-white/50 tabular-nums">
                  Monthly Allowance: {subscription.remainingMonthlyCredits.toLocaleString()} /{' '}
                  {subscription.monthlyCredits.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 space-y-1">
                <span className="text-[10px] text-white/45 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Renewal Date
                </span>
                <div className="text-sm font-semibold text-white">
                  {new Date(subscription.renewalDate).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-white/50">
                  {subscription.cancelAtPeriodEnd
                    ? 'Scheduled to cancel at period end'
                    : subscription.autoRenew
                    ? 'Automatic renewal active'
                    : 'Manual renewal'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 space-y-1">
                <span className="text-[10px] text-white/45 uppercase flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Expiration Date
                </span>
                <div className="text-sm font-semibold text-white">
                  {new Date(subscription.expiresAt || subscription.currentPeriodEnd).toLocaleDateString()}
                </div>
                <div className="text-[10px] text-white/50">
                  Period started {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-white/[0.08] bg-black/50 space-y-1">
                <span className="text-[10px] text-white/45 uppercase flex items-center gap-1.5">
                  <Layers className="w-3 h-3" /> Generation Limits
                </span>
                <div className="text-sm font-semibold text-white uppercase">
                  {subscription.limits?.maxResolution || '480p'} ·{' '}
                  {subscription.limits?.maxDurationSeconds || 15}s
                </div>
                <div className="text-[10px] text-white/50 tabular-nums">
                  Up to {subscription.limits?.maxReferenceImages ?? 5} Ref Plates ·{' '}
                  {subscription.limits?.concurrentJobs ?? 1} Concurrent
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Available Configurable 5 Tiers */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-white uppercase font-mono">
                Available Seedance 2.5 Tiers
              </h2>
              <p className="text-xs text-white/55">
                Plan quotas, prices, and generation limits are synced dynamically from administrative platform configuration.
              </p>
            </div>
            <span className="text-[10px] font-mono text-white/50 uppercase">
              {plans.length} CONFIGURED TIERS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {plans.map((plan) => {
              const isCurrent = activeTier === plan.tier && isAuthenticated;
              const isBusy = busyTier === plan.tier;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-5 transition-all ${
                    isCurrent
                      ? 'border-white bg-white/[0.08] shadow-[0_8px_32px_rgba(255,255,255,0.1)]'
                      : 'border-white/[0.12] bg-white/[0.03] hover:border-white/30'
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono uppercase tracking-wider text-white/60">
                        {plan.tier}
                      </span>
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded bg-white text-black text-[10px] font-mono font-bold uppercase">
                          Current
                        </span>
                      ) : plan.badge ? (
                        <span className="px-2 py-0.5 rounded border border-white/20 text-[10px] font-mono uppercase text-white/75">
                          {plan.badge}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="text-xl font-serif font-medium text-white">{plan.name}</h3>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="pt-2 border-t border-white/[0.08]">
                      <div className="text-2xl font-mono font-semibold text-white tabular-nums">
                        {plan.priceUsd <= 0 ? '$0' : `$${plan.priceUsd}`}
                        <span className="text-xs font-normal text-white/50"> / mo</span>
                      </div>
                      <div className="text-[11px] font-mono text-white/45 tabular-nums">
                        {plan.priceIdr <= 0
                          ? 'Rp 0 / month'
                          : `Rp ${plan.priceIdr.toLocaleString('id-ID')} / month`}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-white/[0.08] bg-black/50 space-y-1.5 text-[11px] font-mono text-white/75">
                      <div className="flex justify-between">
                        <span className="text-white/45">Monthly Credits</span>
                        <span className="text-white font-semibold tabular-nums">
                          {plan.monthlyCredits.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45">Max Resolution</span>
                        <span className="text-white uppercase">{plan.maxResolution}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45">Max Duration</span>
                        <span className="text-white">{plan.maxDurationSeconds}s</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45">Ref Plates</span>
                        <span className="text-white">{plan.maxReferenceImages}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/45">Live Viewers</span>
                        <span className="text-white">{plan.maxStreamViewers}</span>
                      </div>
                    </div>

                    <ul className="space-y-1.5 text-xs text-white/75">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    disabled={isCurrent || Boolean(busyTier)}
                    onClick={() => handleSelectPlan(plan.tier)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      isCurrent
                        ? 'border border-white/25 bg-white/[0.06] text-white/50 cursor-default'
                        : 'bg-white text-black hover:bg-white/90'
                    } disabled:opacity-60`}
                  >
                    {isBusy ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : isCurrent ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Active Plan</span>
                      </>
                    ) : plan.priceIdr <= 0 ? (
                      <span>Switch to {plan.name}</span>
                    ) : (
                      <>
                        <span>Upgrade / Switch</span>
                        {paymentConfigured && <ExternalLink className="w-3 h-3" />}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Subscription History */}
        {isAuthenticated && subscription && (
          <section className="rounded-2xl border border-white/[0.1] bg-white/[0.03] overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white">
                <History className="w-4 h-4" />
                <span>Subscription & Billing History</span>
              </div>
              <span className="text-[11px] font-mono text-white/45">
                {subscription.history?.length || 0} Events
              </span>
            </div>

            {!subscription.history || subscription.history.length === 0 ? (
              <div className="p-6 text-center text-xs text-white/50 font-mono">
                No subscription transitions logged yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {subscription.history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                          {entry.action}
                        </span>
                        <span className="text-white font-semibold">
                          {entry.planName} ({entry.planTier})
                        </span>
                        <span className="text-white/45">· {entry.billingStatus}</span>
                      </div>
                      {entry.note && <p className="text-white/60 font-sans text-xs">{entry.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white tabular-nums">
                        +{entry.creditsAllocated.toLocaleString()} Credits
                      </div>
                      <div className="text-[10px] text-white/45">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
