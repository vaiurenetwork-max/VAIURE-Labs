/**
 * VAIURE Labs — VXA Settlement Tracker
 * Stage-by-stage tracking of 1–2 Business Day settlement lifecycle pipeline
 * with bank clearing references and cryptographic receipts.
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { vxaSecurityService } from '../../../services/vxaSecurityService';
import { SettlementTrackerRecord } from '../../../types/vxaSecurity';

interface VxaSettlementTrackerProps {
  userId: string;
}

export const VxaSettlementTracker: React.FC<VxaSettlementTrackerProps> = ({ userId }) => {
  const [settlements, setSettlements] = useState<SettlementTrackerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadSettlements = async () => {
    setIsLoading(true);
    try {
      const records = await vxaSecurityService.getSettlements(userId);
      setSettlements(records);
      if (records.length > 0 && !expandedId) {
        setExpandedId(records[0].withdrawalId);
      }
    } catch (err) {
      console.error('Failed to load settlements:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
  }, [userId]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 select-none animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base sm:text-lg font-bold text-white uppercase tracking-tight">
              Settlement Lifecycle Tracker
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
              1–2 Business Days SLA
            </span>
          </div>
          <p className="text-xs font-mono text-white/50 mt-0.5">
            Real-time Indonesian banking partner clearing pipeline (BI-FAST / Real-time Gross Settlement)
          </p>
        </div>

        <button
          onClick={loadSettlements}
          disabled={isLoading}
          className="p-2 rounded-xl border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Refresh Settlements"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Settlements List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-white/40 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Retrieving settlement pipeline data...</span>
        </div>
      ) : settlements.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#090A10] border border-white/10 text-xs font-mono text-white/40 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-white/20" />
          <p>No active or completed settlements found for your wallet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {settlements.map((record) => {
            const isExpanded = expandedId === record.withdrawalId;
            const isSettled = record.currentStatus === 'SETTLED';
            const isRejected = record.currentStatus === 'REJECTED' || record.currentStatus === 'FAILED';

            return (
              <div
                key={record.withdrawalId}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isSettled
                    ? 'bg-[#0A0D12] border-emerald-500/30'
                    : isRejected
                    ? 'bg-[#100A0A] border-red-500/30'
                    : 'bg-[#090B12] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
                }`}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : record.withdrawalId)}
                  className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.01]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isSettled
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : isRejected
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse'
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : isRejected ? (
                        <AlertCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-sm sm:text-base font-bold text-white">
                          Withdrawal: {record.amountVxa} VXA
                        </span>
                        <span className="text-xs font-mono text-white/50">
                          (Rp{record.amountIdr.toLocaleString('id-ID')})
                        </span>
                      </div>
                      <div className="text-xs font-mono text-white/40 truncate">
                        Destination: {record.payoutDestination.bankName} · {record.payoutDestination.accountNumber} ({record.payoutDestination.accountHolderName})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-bold ${
                        isSettled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isRejected
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {record.currentStatus}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/50" />
                    )}
                  </div>
                </div>

                {/* Expanded Stage Timeline */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-6 pt-2 border-t border-white/10 space-y-5 bg-black/40">
                    <div className="flex flex-wrap items-center justify-between text-xs font-mono text-white/60 pt-2 gap-2">
                      <div>
                        Reference ID: <span className="text-white font-mono">{record.partnerReference || record.withdrawalId}</span>
                      </div>
                      <div>
                        Target Completion:{' '}
                        <span className="text-cyan-300 font-bold">
                          {new Date(record.targetSettlementDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Stage Pipeline */}
                    <div className="space-y-3 pt-2">
                      {record.stages.map((stage, idx) => {
                        const isDone = stage.completed;
                        const isCurrent = !isDone && idx === record.stages.findIndex((s) => !s.completed);

                        return (
                          <div key={idx} className="flex items-start gap-3 relative">
                            {/* Connector line */}
                            {idx < record.stages.length - 1 && (
                              <div
                                className={`absolute left-3 top-6 w-0.5 h-6 ${
                                  isDone ? 'bg-emerald-400' : 'bg-white/10'
                                }`}
                              />
                            )}

                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                isDone
                                  ? 'bg-emerald-400 text-black'
                                  : isCurrent
                                  ? 'bg-cyan-400 text-black animate-pulse'
                                  : 'bg-white/10 text-white/30'
                              }`}
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                              )}
                            </div>

                            <div className="flex-1 text-xs font-mono min-w-0">
                              <div className="flex items-center justify-between">
                                <span
                                  className={`font-bold ${
                                    isDone ? 'text-white' : isCurrent ? 'text-cyan-300' : 'text-white/40'
                                  }`}
                                >
                                  {stage.label}
                                </span>
                                {stage.timestamp && (
                                  <span className="text-[10px] text-white/30">
                                    {new Date(stage.timestamp).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Legal note */}
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-[11px] font-mono text-white/40 flex items-center justify-between">
                      <span>Simulated Development Mode · Zero Custody Risk</span>
                      <span>Bank Indonesia / OJK Partner Compliant Target</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
