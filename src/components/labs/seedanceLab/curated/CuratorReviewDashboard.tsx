/**
 * VAIURE — SEEDANCE LAB CURATOR REVIEW & MODERATION DASHBOARD
 * Separate governance workspace reserved strictly for authorized Curators & Platform Admins.
 * Reviews owner-submitted creations before any public visibility, audits moderation logs,
 * and handles reported Public Curates items.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  Flag,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import {
  CurationPolicyChecklist,
  CurationReview,
  CurationSubmission,
  PublicCreationReport,
} from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';

interface CuratorReviewDashboardProps {
  onPublishedChanged?: () => void;
}

export const CuratorReviewDashboard: React.FC<CuratorReviewDashboardProps> = ({
  onPublishedChanged,
}) => {
  const [queueTab, setQueueTab] = useState<string>('SUBMITTED');
  const [submissions, setSubmissions] = useState<CurationSubmission[]>([]);
  const [reviews, setReviews] = useState<CurationReview[]>([]);
  const [reports, setReports] = useState<PublicCreationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Active review form
  const [checklist, setChecklist] = useState<CurationPolicyChecklist>({
    originalOrAuthorized: true,
    safetyCompliant: true,
    qualityApproved: true,
    metadataAppropriate: true,
  });
  const [creatorFeedback, setCreatorFeedback] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [curatorBadge, setCuratorBadge] = useState('');
  const [acting, setActing] = useState(false);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3200);
  };

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam =
        queueTab === 'REPORTS' || queueTab === 'AUDIT' ? 'ALL' : queueTab;
      const res = await seedanceCuratedService.listCuratorSubmissions(statusParam);
      setSubmissions(res.submissions);
      setReviews(res.reviews);
      setReports(res.reports);
      if (res.submissions.length > 0 && !res.submissions.some((s) => s.id === selectedId)) {
        setSelectedId(res.submissions[0].id);
      } else if (res.submissions.length === 0) {
        setSelectedId(null);
      }
    } catch (err: any) {
      flash(err?.message || 'Unable to load curator queue.');
    } finally {
      setLoading(false);
    }
  }, [queueTab, selectedId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const activeSub = submissions.find((s) => s.id === selectedId) || null;

  const handleDecision = async (
    decision: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  ) => {
    if (!activeSub) return;
    setActing(true);
    try {
      const res = await seedanceCuratedService.reviewSubmission(activeSub.id, {
        decision,
        internalNotes,
        creatorFeedback,
        curatorBadge,
        policyChecklist: checklist,
      });
      flash(res.message || 'Review recorded.');
      setCreatorFeedback('');
      setInternalNotes('');
      setCuratorBadge('');
      await loadQueue();
      onPublishedChanged?.();
    } catch (err: any) {
      flash(err?.message || 'Review decision failed.');
    } finally {
      setActing(false);
    }
  };

  const handleModerateReport = async (
    rep: PublicCreationReport,
    action: 'REMOVE_PUBLIC' | 'DISMISS_REPORTS'
  ) => {
    try {
      await seedanceCuratedService.moderatePublishedCreation(rep.publishedCreationId, {
        action,
        reason:
          action === 'REMOVE_PUBLIC'
            ? `Removed following report: ${rep.reason}`
            : 'Reviewed and dismissed report',
        reportId: rep.id,
      });
      flash(
        action === 'REMOVE_PUBLIC'
          ? 'Removed creation from Public Curates; private original preserved.'
          : 'Report dismissed.'
      );
      await loadQueue();
      onPublishedChanged?.();
    } catch (err: any) {
      flash(err?.message || 'Moderation action failed.');
    }
  };

  const openReportsCount = reports.filter((r) => r.status === 'OPEN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/60">
            <ShieldCheck className="w-4 h-4 text-white" />
            <span>Seedance Curation Review Board</span>
          </div>
          <p className="text-xs text-white/55">
            Verify quality, copyright authorization, safety compliance, and metadata accuracy before anything enters Public Curates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {notice && (
            <span className="text-xs font-mono text-white bg-white/[0.08] border border-white/[0.2] px-3 py-1.5 rounded-lg">
              {notice}
            </span>
          )}
          <button
            type="button"
            onClick={loadQueue}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: 'SUBMITTED', label: 'New / Submitted' },
          { id: 'UNDER_REVIEW', label: 'Under Review' },
          { id: 'REVISION_REQUESTED', label: 'Revision Requested' },
          { id: 'APPROVED', label: 'Approved' },
          { id: 'REJECTED', label: 'Rejected' },
          { id: 'WITHDRAWN', label: 'Withdrawn' },
          { id: 'ALL', label: 'All Submissions' },
          { id: 'REPORTS', label: `Reports (${openReportsCount})` },
          { id: 'AUDIT', label: 'Review Audit Log' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setQueueTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-all ${
              queueTab === t.id
                ? 'bg-white text-black font-semibold'
                : 'border border-white/[0.12] bg-white/[0.03] text-white/70 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* View 1: Reported Public Creations */}
      {queueTab === 'REPORTS' ? (
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-white/70 flex items-center gap-2">
            <Flag className="w-4 h-4" />
            <span>Reported Public Creations</span>
          </div>
          {reports.length === 0 ? (
            <div className="py-10 text-center text-xs text-white/45">
              No public creation reports filed.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 rounded-xl border border-white/[0.1] bg-black/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-white">
                      {rep.publishedTitle} ·{' '}
                      <span className="font-mono text-xs text-white/60">{rep.status}</span>
                    </div>
                    <div className="text-xs text-white/75">
                      Reason: {rep.reason} {rep.details ? `— ${rep.details}` : ''}
                    </div>
                    <div className="text-[11px] font-mono text-white/45">
                      Reported by {rep.reporterName} on {new Date(rep.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {rep.status === 'OPEN' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleModerateReport(rep, 'DISMISS_REPORTS')}
                        className="px-3 py-1.5 rounded-lg border border-white/[0.15] text-xs text-white/80 hover:bg-white/[0.08] cursor-pointer"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleModerateReport(rep, 'REMOVE_PUBLIC')}
                        className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold cursor-pointer"
                      >
                        Unpublish Creation
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : queueTab === 'AUDIT' ? (
        <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-white/70 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>Curator Decision History</span>
          </div>
          {reviews.length === 0 ? (
            <div className="py-10 text-center text-xs text-white/45">
              No curator review decisions recorded yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-3.5 rounded-xl border border-white/[0.08] bg-black/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="font-mono text-white font-semibold">
                      {rev.decision} · Submission {rev.submissionId}
                    </div>
                    {rev.creatorFeedback && (
                      <div className="text-white/75">Creator Note: {rev.creatorFeedback}</div>
                    )}
                    {rev.internalNotes && (
                      <div className="text-white/50">Internal: {rev.internalNotes}</div>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-white/45 shrink-0 text-right">
                    <div>{rev.reviewerName}</div>
                    <div>{new Date(rev.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Split Review Workbench */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Queue List */}
          <div className="lg:col-span-5 rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 space-y-3 max-h-[75vh] overflow-y-auto no-scrollbar">
            <div className="text-xs font-mono uppercase tracking-wider text-white/55">
              Submissions ({submissions.length})
            </div>

            {submissions.length === 0 ? (
              <div className="py-12 text-center text-xs text-white/45">
                No submissions in this queue.
              </div>
            ) : (
              submissions.map((sub) => {
                const selected = sub.id === selectedId;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedId(sub.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer space-y-1.5 ${
                      selected
                        ? 'border-white bg-white/[0.09]'
                        : 'border-white/[0.1] bg-black/40 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {sub.proposedTitle}
                      </span>
                      <span className="text-[10px] font-mono text-white/60 shrink-0">
                        {sub.status}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-white/50 truncate">
                      {sub.ownerName} · {sub.mediaType} · {sub.category}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 tabular-nums">
                      Submitted {new Date(sub.submittedAt).toLocaleString()}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Inspection & Decision Panel */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.12] bg-white/[0.03] p-5 space-y-5">
            {!activeSub ? (
              <div className="h-full min-h-[340px] flex flex-col items-center justify-center text-center text-xs text-white/45 gap-2">
                <AlertCircle className="w-6 h-6 text-white/30" />
                <span>Select a curation submission on the left to inspect and review.</span>
              </div>
            ) : (
              <>
                <div className="w-full rounded-xl overflow-hidden bg-black border border-white/[0.12] flex items-center justify-center max-h-[380px]">
                  {activeSub.mediaType === 'VIDEO' ? (
                    <video
                      src={activeSub.mediaStreamUrl}
                      controls
                      playsInline
                      className="max-h-[360px] max-w-full"
                    />
                  ) : (
                    <img
                      src={activeSub.mediaStreamUrl}
                      alt={activeSub.proposedTitle}
                      className="max-h-[360px] max-w-full object-contain"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">
                      {activeSub.proposedTitle}
                    </h3>
                    <span className="text-xs font-mono text-white/60">{activeSub.status}</span>
                  </div>
                  <div className="text-xs font-mono text-white/55">
                    Creator: {activeSub.ownerName} · Category: {activeSub.category} ·{' '}
                    {activeSub.aiModel} · {activeSub.resolution} · {activeSub.aspectRatio}
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed whitespace-pre-wrap">
                    {activeSub.proposedDescription}
                  </p>
                  <div className="text-[11px] font-mono text-white/50">
                    Disclosure settings: Profile ({activeSub.showCreatorProfile ? 'Public' : 'Anon'}) ·
                    AI Model ({activeSub.showAiModel ? 'Shown' : 'Hidden'}) ·
                    Prompt ({activeSub.showPromptAndParams ? 'Shared' : 'Private'})
                  </div>
                </div>

                {activeSub.privatePrompt && (
                  <div className="p-3 rounded-xl border border-white/[0.1] bg-black/50 space-y-1">
                    <div className="text-[10px] font-mono uppercase text-white/45">
                      Creator Prompt (Curator Safety Inspection Only)
                    </div>
                    <p className="text-xs text-white/75 max-h-28 overflow-y-auto no-scrollbar whitespace-pre-wrap">
                      {activeSub.privatePrompt}
                    </p>
                  </div>
                )}

                {/* Policy & Quality Checklist */}
                <div className="p-4 rounded-xl border border-white/[0.1] bg-black/40 space-y-2.5 text-xs">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-white/60">
                    Curation Policy Verification
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.originalOrAuthorized}
                        onChange={(e) =>
                          setChecklist({ ...checklist, originalOrAuthorized: e.target.checked })
                        }
                        className="accent-white"
                      />
                      <span>Original / Authorized Content</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.safetyCompliant}
                        onChange={(e) =>
                          setChecklist({ ...checklist, safetyCompliant: e.target.checked })
                        }
                        className="accent-white"
                      />
                      <span>Safety & Policy Compliant</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.qualityApproved}
                        onChange={(e) =>
                          setChecklist({ ...checklist, qualityApproved: e.target.checked })
                        }
                        className="accent-white"
                      />
                      <span>Visual / Technical Quality Approved</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checklist.metadataAppropriate}
                        onChange={(e) =>
                          setChecklist({ ...checklist, metadataAppropriate: e.target.checked })
                        }
                        className="accent-white"
                      />
                      <span>Metadata & Tags Accurate</span>
                    </label>
                  </div>
                </div>

                {/* Notes & Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/55">
                      Feedback / Reason for Creator
                    </label>
                    <textarea
                      value={creatorFeedback}
                      onChange={(e) => setCreatorFeedback(e.target.value)}
                      rows={2}
                      placeholder="Required for Reject or Request Revision..."
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-xs text-white resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono uppercase text-white/55">
                      Internal Curator Moderation Notes
                    </label>
                    <textarea
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      rows={2}
                      placeholder="Private curator audit note..."
                      className="w-full px-3 py-2 rounded-xl bg-black border border-white/[0.15] text-xs text-white resize-none"
                    />
                  </div>
                </div>

                {activeSub.status !== 'WITHDRAWN' && (
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    {activeSub.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        disabled={acting}
                        onClick={() => handleDecision('START_REVIEW')}
                        className="px-3.5 py-2 rounded-xl border border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.09] text-xs font-mono text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mark Under Review</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => handleDecision('REQUEST_REVISION')}
                      className="px-3.5 py-2 rounded-xl border border-white/[0.15] bg-white/[0.04] hover:bg-white/[0.09] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Revision</span>
                    </button>

                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => handleDecision('REJECT')}
                      className="px-3.5 py-2 rounded-xl border border-white/25 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      disabled={acting}
                      onClick={() => handleDecision('APPROVE')}
                      className="px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-white/90 flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Publish</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
