/**
 * VAIURE — VIRTUAL GIFT MODAL & ANIMATION OVERLAY
 * Integrates strictly with verified user Seedance Credits balance.
 * Requires explicit confirmation before atomic deduction; includes idempotency key.
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Gem,
  Crown,
  Film,
  Orbit,
  X,
  Coins,
  AlertCircle,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  VirtualGiftCategory,
  VirtualGiftItem,
  VirtualGiftTransaction,
} from '../../../../types/seedancePlatform';
import { seedanceCommunityService } from '../../../../services/seedanceCommunityService';

export const GiftIconGlyph: React.FC<{
  iconKey: VirtualGiftItem['iconKey'];
  className?: string;
}> = ({ iconKey, className = 'w-4 h-4' }) => {
  switch (iconKey) {
    case 'FLAME':
      return <Flame className={className} />;
    case 'PRISM':
      return <Gem className={className} />;
    case 'CROWN':
      return <Crown className={className} />;
    case 'REEL':
      return <Film className={className} />;
    case 'ORB':
      return <Orbit className={className} />;
    case 'SPARK':
    default:
      return <Sparkles className={className} />;
  }
};

export const GiftAnimationOverlay: React.FC<{
  giftTx: VirtualGiftTransaction | null;
  onDismiss: () => void;
}> = ({ giftTx, onDismiss }) => {
  useEffect(() => {
    if (!giftTx) return;
    const t = window.setTimeout(onDismiss, 4500);
    return () => window.clearTimeout(t);
  }, [giftTx, onDismiss]);

  if (!giftTx) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="pointer-events-auto max-w-md w-full rounded-2xl border border-white/30 bg-black/90 backdrop-blur-xl px-5 py-4 shadow-[0_0_50px_rgba(255,255,255,0.22)] flex items-center gap-4 text-white">
        <div className="w-11 h-11 rounded-xl border border-white/30 bg-white text-black flex items-center justify-center shrink-0 animate-pulse">
          <GiftIconGlyph iconKey={giftTx.iconKey} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/60">
            {giftTx.animationStyle.replace('_', ' ')} · VIRTUAL GIFT
          </div>
          <div className="text-sm font-semibold text-white truncate">
            @{giftTx.senderUsername} sent {giftTx.giftName} to @{giftTx.recipientUsername}
          </div>
          {giftTx.note && (
            <p className="text-xs text-white/75 truncate italic mt-0.5">“{giftTx.note}”</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs font-bold tabular-nums text-white">
            {giftTx.creditCost} CR
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[10px] font-mono text-white/45 hover:text-white cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

interface VirtualGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientUsername: string;
  recipientDisplayName: string;
  groupId?: string;
  postId?: string;
  livestreamId?: string;
  currentCredits: number;
  isAuthenticated: boolean;
  onRequireAuth?: () => void;
  onOpenCredits?: () => void;
  onGiftSent?: (tx: VirtualGiftTransaction, newCredits?: number) => void;
}

const CATEGORY_TABS: Array<{ id: 'ALL' | VirtualGiftCategory; label: string }> = [
  { id: 'ALL', label: 'All Gifts' },
  { id: 'BASIC', label: 'Basic' },
  { id: 'PREMIUM', label: 'Premium' },
  { id: 'SPECIAL_ANIMATED', label: 'Animated' },
  { id: 'EXCLUSIVE_EVENT', label: 'Exclusive' },
];

export const VirtualGiftModal: React.FC<VirtualGiftModalProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientUsername,
  recipientDisplayName,
  groupId,
  postId,
  livestreamId,
  currentCredits,
  isAuthenticated,
  onRequireAuth,
  onOpenCredits,
  onGiftSent,
}) => {
  const [catalog, setCatalog] = useState<VirtualGiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<'ALL' | VirtualGiftCategory>('ALL');
  const [selectedGift, setSelectedGift] = useState<VirtualGiftItem | null>(null);
  const [note, setNote] = useState('');
  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idemKey, setIdemKey] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setConfirmStep(false);
    setNote('');
    setSelectedGift(null);
    setLoading(true);
    seedanceCommunityService
      .getGiftCatalog()
      .then((res) => {
        const items = res.catalog || [];
        setCatalog(items);
        if (items.length > 0) setSelectedGift(items[0]);
      })
      .catch((err: any) => setError(err?.message || 'Unable to load virtual gift catalog.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered =
    category === 'ALL' ? catalog : catalog.filter((g) => g.category === category);
  const insufficient = selectedGift ? currentCredits < selectedGift.creditPrice : false;

  const handleProceedConfirm = () => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!selectedGift) return;
    if (insufficient) {
      setError(`Insufficient credits (${currentCredits} CR available, requires ${selectedGift.creditPrice} CR).`);
      return;
    }
    setError(null);
    setIdemKey(`vg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setConfirmStep(true);
  };

  const handleExecuteSend = async () => {
    if (!selectedGift) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await seedanceCommunityService.sendVirtualGift({
        giftId: selectedGift.id,
        recipientId,
        groupId,
        postId,
        livestreamId,
        note: note.trim() || undefined,
        idempotencyKey: idemKey,
      });
      onGiftSent?.(res.transaction, res.wallet?.totalAvailable);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to send virtual gift.');
      setConfirmStep(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-2xl border border-white/20 bg-[#08080a] text-white overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.1] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-mono uppercase tracking-wider font-semibold">
              Send Virtual Gift
            </h3>
            <p className="text-xs text-white/55 font-sans">
              Recipient: <span className="text-white font-medium">{recipientDisplayName}</span>{' '}
              <span className="font-mono text-white/50">@{recipientUsername}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg border border-white/15 bg-white/[0.04] text-xs font-mono tabular-nums flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-white/75" />
              <span>{currentCredits} CR</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-white/25 bg-white/[0.06] flex items-start justify-between gap-2 text-xs">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {insufficient && onOpenCredits && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCredits();
                  }}
                  className="px-2.5 py-1 rounded bg-white text-black font-mono text-[10px] font-semibold uppercase shrink-0 cursor-pointer"
                >
                  Top Up CR
                </button>
              )}
            </div>
          )}

          {!confirmStep ? (
            <>
              {/* Category Tabs */}
              <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
                {CATEGORY_TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCategory(t.id)}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      category === t.id
                        ? 'bg-white text-black border-white font-semibold'
                        : 'bg-white/[0.04] text-white/70 border-white/[0.1] hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Gift Grid */}
              {loading ? (
                <div className="py-10 text-center text-xs font-mono text-white/50">
                  Loading catalog...
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-xs font-mono text-white/50">
                  No gifts available in this category.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {filtered.map((gift) => {
                    const isSelected = selectedGift?.id === gift.id;
                    const canAfford = currentCredits >= gift.creditPrice;
                    return (
                      <button
                        key={gift.id}
                        type="button"
                        onClick={() => setSelectedGift(gift)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-white bg-white/[0.1]'
                            : 'border-white/[0.12] bg-white/[0.03] hover:border-white/25'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-white text-black border-white'
                              : 'bg-black/60 text-white border-white/15'
                          }`}
                        >
                          <GiftIconGlyph iconKey={gift.iconKey} className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {gift.name}
                            </span>
                            <span
                              className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                                canAfford ? 'text-white' : 'text-white/45'
                              }`}
                            >
                              {gift.creditPrice} CR
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-white/45 uppercase">
                            {gift.category.replace('_', ' ')}
                          </div>
                          <p className="text-[11px] text-white/60 line-clamp-2">
                            {gift.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Optional note */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase text-white/60">
                  Note (optional)
                </label>
                <input
                  type="text"
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Compliment their camera movement or scene direction..."
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.15] bg-black text-white placeholder-white/35 text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.1]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedGift}
                  onClick={handleProceedConfirm}
                  className="px-5 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    Review Gift ({selectedGift ? `${selectedGift.creditPrice} CR` : '0 CR'})
                  </span>
                </button>
              </div>
            </>
          ) : (
            selectedGift && (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-xl border border-white/20 bg-white/[0.04] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Credit Deduction</span>
                  </div>
                  <p className="text-white/70">
                    Send <span className="text-white font-semibold">{selectedGift.name}</span> to{' '}
                    <span className="text-white font-mono">@{recipientUsername}</span>?
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.1] font-mono text-[11px] tabular-nums">
                    <div>
                      <span className="text-white/50 block">Deduction Amount</span>
                      <span className="text-white font-bold">-{selectedGift.creditPrice} CR</span>
                    </div>
                    <div>
                      <span className="text-white/50 block">Remaining Balance</span>
                      <span className="text-white font-bold">
                        {Math.max(0, currentCredits - selectedGift.creditPrice)} CR
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(false)}
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteSend}
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg bg-white text-black font-mono text-xs font-semibold uppercase tracking-wider hover:bg-white/90 disabled:opacity-40 cursor-pointer"
                  >
                    {submitting ? 'Processing Ledger...' : `Confirm & Send (-${selectedGift.creditPrice} CR)`}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
