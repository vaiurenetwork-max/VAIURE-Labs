import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types/social';
import {
  changeUsername,
  getUsernameChangeCooldown,
  checkUsernameAvailable,
  validateUsername,
  normalizeUsername,
} from '../../services/authService';
import {
  X,
  AtSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';

interface ChangeUsernameModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onUsernameChanged: (newUsername: string, lastUsernameChangeAt: string) => void;
}

export const ChangeUsernameModal: React.FC<ChangeUsernameModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onUsernameChanged,
}) => {
  const [newHandle, setNewHandle] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [confirmedPolicy, setConfirmedPolicy] = useState(false);

  // Check cooldown status
  const cooldown = getUsernameChangeCooldown(currentUser.lastUsernameChangeAt);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setNewHandle('');
      setIsChecking(false);
      setIsAvailable(null);
      setValidationError(null);
      setSubmitError(null);
      setSubmitSuccess(null);
      setConfirmedPolicy(false);
    }
  }, [isOpen]);

  // Debounced live handle check
  useEffect(() => {
    if (!newHandle.trim()) {
      setIsAvailable(null);
      setValidationError(null);
      return;
    }

    const norm = normalizeUsername(newHandle);
    if (norm === currentUser.username.toLowerCase()) {
      setIsAvailable(null);
      setValidationError('This is already your current handle.');
      return;
    }

    const validation = validateUsername(norm);
    if (!validation.valid) {
      setIsAvailable(null);
      setValidationError(validation.error || 'Invalid handle format');
      return;
    }

    setValidationError(null);
    setIsChecking(true);

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(norm);
        setIsAvailable(available);
      } catch (err) {
        console.warn('Handle check note:', err);
      } finally {
        setIsChecking(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newHandle, currentUser.username]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cooldown.canChange) return;

    const norm = normalizeUsername(newHandle);
    if (!norm || !isAvailable || !confirmedPolicy || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await changeUsername(currentUser.id, norm);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update handle.');
      }

      setSubmitSuccess(`Your handle has been successfully updated to @${norm}.`);
      const nowIso = new Date().toISOString();
      onUsernameChanged(norm, nowIso);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.warn('Change handle error:', err);
      setSubmitError(err.message || 'Failed to update handle. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-text">
      <div className="relative w-full max-w-lg bg-[#0c0c10] border border-white/15 rounded-2xl text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase block mb-0.5">
              PASSPORT SETTINGS
            </span>
            <h3 className="text-lg font-serif uppercase tracking-tight text-white font-medium">
              CHANGE USERNAME
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-full transition-colors hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Policy Notice Card */}
          <div className="p-4 border border-white/10 bg-white/[0.02] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-white/80 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>1-WEEK RATE LIMIT POLICY</span>
            </div>
            <p className="text-xs text-neutral-400 font-light leading-relaxed">
              To protect curatorial provenance, prevent identity confusion, and safeguard URL citations, usernames may only be changed <strong className="text-white font-medium">once every 7 days (1 week)</strong>.
            </p>
          </div>

          {/* Current Handle Row */}
          <div className="flex items-center justify-between p-3.5 border border-white/10 bg-black/40 rounded-xl">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                CURRENT USERNAME
              </span>
              <span className="text-sm font-mono text-white font-semibold">
                @{currentUser.username}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                STATUS
              </span>
              {cooldown.canChange ? (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 justify-end">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ELIGIBLE
                </span>
              ) : (
                <span className="text-xs font-mono text-amber-400 flex items-center gap-1 justify-end">
                  <Clock className="w-3.5 h-3.5" /> COOLDOWN ACTIVE
                </span>
              )}
            </div>
          </div>

          {/* Cooldown Active Banner */}
          {!cooldown.canChange && (
            <div className="p-4 border border-amber-500/30 bg-amber-950/20 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-mono text-amber-300 font-medium">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>COOLDOWN IN PROGRESS</span>
              </div>
              <p className="text-amber-200/80 font-light leading-relaxed">
                You recently updated your username. In accordance with the 1-week policy, you can change your handle again in:
              </p>
              <div className="text-base font-mono font-bold text-amber-300 tracking-wider pt-1">
                {cooldown.remainingDays > 0 && `${cooldown.remainingDays} DAYS `}
                {`${cooldown.remainingHours} HOURS `}
                {`${cooldown.remainingMinutes} MINUTES`}
              </div>
              {cooldown.nextAllowedDate && (
                <div className="text-[11px] font-mono text-amber-400/60 pt-1">
                  Available on: {cooldown.nextAllowedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}

          {/* Input Form if Eligible */}
          {cooldown.canChange && !submitSuccess && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono tracking-widest text-white/60 uppercase block mb-2">
                  NEW DESIRED USERNAME
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-mono text-sm">
                    @
                  </span>
                  <input
                    type="text"
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value.toLowerCase().trim())}
                    placeholder="newhandle"
                    maxLength={30}
                    disabled={isSubmitting}
                    className="w-full bg-[#121217] border border-white/15 focus:border-white rounded-xl pl-8 pr-10 py-3 text-sm text-white font-mono placeholder-white/30 focus:outline-none transition-colors"
                  />
                  {isChecking && (
                    <Loader2 className="w-4 h-4 text-white/50 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  {!isChecking && isAvailable === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                  {!isChecking && (isAvailable === false || validationError) && (
                    <AlertCircle className="w-4 h-4 text-rose-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Validation & Feedback */}
                <div className="mt-2 min-h-[20px] text-xs font-mono">
                  {validationError && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      {validationError}
                    </span>
                  )}
                  {!validationError && isAvailable === true && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                      @{normalizeUsername(newHandle)} is available!
                    </span>
                  )}
                  {!validationError && isAvailable === false && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      @{normalizeUsername(newHandle)} is already taken.
                    </span>
                  )}
                </div>
              </div>

              {/* Policy Confirmation Checkbox */}
              <div className="p-3.5 border border-white/10 bg-white/[0.02] rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confirm-username-policy"
                  checked={confirmedPolicy}
                  onChange={(e) => setConfirmedPolicy(e.target.checked)}
                  className="mt-0.5 rounded border-white/20 bg-neutral-900 text-white focus:ring-0 cursor-pointer"
                />
                <label
                  htmlFor="confirm-username-policy"
                  className="text-xs text-neutral-300 font-light leading-relaxed cursor-pointer select-none"
                >
                  I understand that changing my username will release <strong className="text-white font-mono">@{currentUser.username}</strong> back to the archive pool, and I will be <strong className="text-white">locked from changing it again for 7 days</strong>.
                </label>
              </div>

              {submitError && (
                <div className="p-3 border border-red-500/30 bg-red-950/30 rounded-lg text-xs font-mono text-red-300">
                  {submitError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isAvailable || !confirmedPolicy || isSubmitting}
                  className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-30 disabled:pointer-events-none rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Change</span>
                </button>
              </div>
            </form>
          )}

          {/* Success Screen */}
          {submitSuccess && (
            <div className="p-6 text-center space-y-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-serif uppercase tracking-tight text-white">
                USERNAME UPDATED
              </h4>
              <p className="text-xs font-mono text-emerald-300">
                {submitSuccess}
              </p>
              <p className="text-[11px] font-mono text-white/40 pt-1">
                Your 7-day rate limit cooldown has begun.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
