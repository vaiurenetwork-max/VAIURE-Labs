/**
 * VAIURE Labs — VXA Cryptographic Security & Dynamic 120s Key Monitor
 * Features:
 * - Live 120-second dynamic key rotation countdown & active KID monitor
 * - Key version registry (Active, Grace overlap, Expired, Revoked)
 * - Manual key rotation trigger
 * - 6-digit Step-Up PIN management
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Key,
  RefreshCw,
  Clock,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  History,
  ShieldCheck,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { KeyRegistryStatus } from '../../../types/vxaSecurity';

interface VxaSecurityControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export const VxaSecurityControlModal: React.FC<VxaSecurityControlModalProps> = ({
  isOpen,
  onClose,
  userId,
}) => {
  const [keyStatus, setKeyStatus] = useState<KeyRegistryStatus | null>(null);
  const [pin, setPin] = useState<string>('');
  const [pinSuccess, setPinSuccess] = useState<boolean>(false);
  const [isSettingPin, setIsSettingPin] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Poll key status every 2 seconds for live countdown
  useEffect(() => {
    if (!isOpen) return;
    loadKeyStatus();
    const interval = setInterval(() => {
      loadKeyStatus();
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const loadKeyStatus = async () => {
    try {
      const status = await vxaSecurityService.getKeyStatus();
      setKeyStatus(status);
    } catch (err) {
      console.error('Failed to load key status:', err);
    }
  };

  const handleManualRotate = async () => {
    setIsRotating(true);
    setErrorMsg(null);
    try {
      await vxaSecurityService.triggerKeyRotation();
      await loadKeyStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Key rotation failed.');
    } finally {
      setIsRotating(false);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setErrorMsg('PIN must be exactly 6 numeric digits.');
      return;
    }
    setErrorMsg(null);
    setIsSettingPin(true);
    try {
      await vxaSecurityService.setStepUpPin(pin, userId);
      setPinSuccess(true);
      setPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update PIN.');
    } finally {
      setIsSettingPin(false);
    }
  };

  if (!isOpen) return null;

  const secondsRemaining = keyStatus?.secondsRemaining ?? 120;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 120) * 100));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#090A10] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Cryptographic Key & Security Core
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  120s Dynamic Rotation
                </span>
              </h2>
              <p className="text-xs font-mono text-white/50">
                HMAC-SHA256 short-lived signing keys with 60s overlap grace periods
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
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 120s Live Countdown & Active Key Card */}
          <div className="p-5 rounded-2xl bg-[#0C0E16] border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                  Active Signing Key Version
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  Rotates in {secondsRemaining}s
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/60 border border-white/10 flex items-center justify-between text-xs font-mono">
              <div className="truncate mr-2">
                <span className="text-white/40 block text-[10px]">CURRENT KID:</span>
                <span className="text-cyan-300 font-bold font-mono truncate block">
                  {keyStatus?.activeKid || 'Loading KID...'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[10px]">
                {keyStatus?.algorithm || 'HMAC-SHA256'}
              </span>
            </div>

            {/* Countdown progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/40">
                <span>Issued: {keyStatus?.issuedAt ? new Date(keyStatus.issuedAt).toLocaleTimeString() : '...'}</span>
                <span>Interval: 120 Seconds Target</span>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <p className="text-[11px] font-mono text-white/40 leading-relaxed max-w-sm">
                Root keys remain isolated. Short-lived transaction signing keys rotate every 120 seconds with a 60-second grace overlap.
              </p>
              <button
                onClick={handleManualRotate}
                disabled={isRotating}
                className="px-3.5 py-1.5 rounded-lg border border-cyan-500/40 hover:bg-cyan-950/40 text-cyan-300 font-mono text-xs transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRotating ? 'animate-spin' : ''}`} />
                <span>Rotate Now</span>
              </button>
            </div>
          </div>

          {/* Recent Key History Table */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-mono text-white/60 uppercase">
              <History className="w-3.5 h-3.5" />
              <span>Key Version History (Recent Activations)</span>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
              <div className="divide-y divide-white/5 max-h-40 overflow-y-auto custom-scrollbar text-xs font-mono">
                {keyStatus?.activeKeyHistory?.map((k, idx) => (
                  <div key={k.kid} className="px-4 py-2 flex items-center justify-between hover:bg-white/[0.01]">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] text-white/30">#{idx + 1}</span>
                      <span className="truncate text-white/80 font-mono text-[11px]">{k.kid}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] text-white/40">Used: {k.usageCount}x</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          k.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : k.status === 'GRACE'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-white/10 text-white/40'
                        }`}
                      >
                        {k.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step-Up PIN Setup */}
          <form onSubmit={handleSavePin} className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" />
                <span className="font-serif text-sm font-bold text-white uppercase tracking-wider">
                  6-Digit Step-Up Security PIN
                </span>
              </div>
              {pinSuccess && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PIN Updated!</span>
                </span>
              )}
            </div>

            <p className="text-xs font-mono text-white/50">
              Required to authorize high-value withdrawals, currency conversions, and destination account modifications.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit numeric PIN"
                className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white font-mono text-sm tracking-widest focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isSettingPin || pin.length !== 6}
                className="px-4 py-2 rounded-xl bg-white text-black font-mono text-xs font-bold hover:bg-white/90 transition-all cursor-pointer disabled:opacity-40"
              >
                {isSettingPin ? 'Updating...' : 'Set PIN'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[11px] font-mono text-white/40">
          <span>Fail-Closed Cryptographic Verification Policy Active</span>
          <button onClick={onClose} className="hover:text-white transition-colors cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
