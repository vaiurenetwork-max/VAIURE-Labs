/**
 * VAIURE Labs — VXA Double-Entry Ledger & Cryptographic Audit Explorer
 * Displays tamper-evident SHA-256 hash chains, balanced debits/credits,
 * dynamic signing KID references, and live cryptographic verification.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Hash,
  RefreshCw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { DoubleEntryJournalEntry } from '../../../types/vxaSecurity';

export const VxaLedgerAuditView: React.FC = () => {
  const [entries, setEntries] = useState<DoubleEntryJournalEntry[]>([]);
  const [lastHash, setLastHash] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState<{
    ok: boolean;
    totalEntries: number;
    details: string;
    verifiedAt: string;
  } | null>(null);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const data = await vxaSecurityService.getLedgerEntries();
      setEntries(data.entries);
      setLastHash(data.lastHash);
    } catch (err) {
      console.error('Failed to load ledger entries:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await vxaSecurityService.verifyLedgerIntegrity();
      setAuditResult({
        ok: res.ok,
        totalEntries: res.audit.totalEntries,
        details: res.audit.details,
        verifiedAt: res.verifiedAt,
      });
    } catch (err: any) {
      setAuditResult({
        ok: false,
        totalEntries: 0,
        details: err.message || 'Audit verification check failed.',
        verifiedAt: new Date().toISOString(),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none animate-fade-in">
      {/* Header & Verification Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base sm:text-lg font-bold text-white uppercase tracking-tight">
              Tamper-Evident Double-Entry Ledger
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              SHA-256 Hash Chain
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-1">
            Every entry references the cryptographic hash of its predecessor. Balanced debit & credit postings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:brightness-110 text-black font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-emerald-400/20 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                <span>Auditing Hash Chain...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-black" />
                <span>Verify Ledger Chain Integrity</span>
              </>
            )}
          </button>

          <button
            onClick={loadEntries}
            disabled={isLoading}
            className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Refresh Entries"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {auditResult && (
        <div
          className={`p-4 rounded-2xl border text-xs font-mono flex items-start gap-3 ${
            auditResult.ok
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/40 border-red-500/40 text-red-300'
          }`}
        >
          {auditResult.ok ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold uppercase tracking-wider">
              {auditResult.ok ? 'Ledger Cryptographic Audit: Verified Intact' : 'Ledger Integrity Compromised'}
            </div>
            <p className="text-[11px] opacity-90">{auditResult.details}</p>
            <div className="text-[10px] opacity-60">
              Verified at: {new Date(auditResult.verifiedAt).toLocaleString()} · {auditResult.totalEntries} Total Journal Records Audited
            </div>
          </div>
        </div>
      )}

      {/* Ledger Entries Table */}
      <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#090A10]">
        <div className="px-5 py-3 border-b border-white/10 bg-black/40 flex items-center justify-between text-xs font-mono text-white/50">
          <span>Journal Entries (Last {entries.length})</span>
          <span className="truncate max-w-xs text-[10px]">
            Tip Hash: <span className="text-cyan-400">{lastHash.slice(0, 16)}...</span>
          </span>
        </div>

        <div className="divide-y divide-white/5 max-h-[550px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="p-12 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading ledger journal blocks...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-xs font-mono text-white/40">
              No journal entries recorded.
            </div>
          ) : (
            entries.map((entry, idx) => (
              <div key={entry.entryId} className="p-4 hover:bg-white/[0.02] transition-colors space-y-2 text-xs font-mono">
                {/* Row 1: Header + Reference */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 text-[10px] font-bold">
                      #{entry.entryId.slice(-6)}
                    </span>
                    <span className="text-cyan-300 font-bold uppercase">{entry.referenceType}</span>
                    <span className="text-white/40 text-[10px]">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-white text-sm">
                      {entry.amountMinor.toLocaleString('id-ID')}
                    </span>
                    <span className="text-[10px] text-amber-400 uppercase font-bold">{entry.currency}</span>
                  </div>
                </div>

                {/* Row 2: Double-Entry Debit -> Credit */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] p-2 rounded-lg bg-black/50 border border-white/5">
                  <span className="text-white/50">Debit:</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {entry.debitAccount}
                  </span>
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  <span className="text-white/50">Credit:</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    {entry.creditAccount}
                  </span>
                </div>

                {/* Row 3: Description */}
                <div className="text-[11px] text-white/70 font-sans">
                  {entry.description}
                </div>

                {/* Row 4: Cryptographic SHA-256 Hash Link & KID */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px] text-white/40">
                  <div className="flex items-center gap-1.5 truncate max-w-sm">
                    <Hash className="w-3 h-3 text-white/30 shrink-0" />
                    <span className="truncate">Prev: {entry.previousHash.slice(0, 12)}... → Hash: {entry.hash.slice(0, 16)}...</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>Signed with KID: <span className="text-cyan-300">{entry.kid.slice(0, 16)}...</span></span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
