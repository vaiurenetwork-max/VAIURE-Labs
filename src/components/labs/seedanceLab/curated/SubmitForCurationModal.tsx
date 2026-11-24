/**
 * VAIURE — SEEDANCE LAB SUBMIT FOR PUBLIC CURATION MODAL
 * Explicit opt-in workflow moving a private creation into curator review.
 * Never makes creations public immediately — awaits curator approval.
 */

import React, { useState } from 'react';
import {
  X,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CuratedCategoryOption, UserCreation } from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';

interface SubmitForCurationModalProps {
  creation: UserCreation;
  categories: CuratedCategoryOption[];
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitForCurationModal: React.FC<SubmitForCurationModalProps> = ({
  creation,
  categories,
  onClose,
  onSubmitted,
}) => {
  const [title, setTitle] = useState(creation.title || '');
  const [description, setDescription] = useState(
    creation.description ||
      (creation.prompt ? creation.prompt.slice(0, 260) : '')
  );
  const [category, setCategory] = useState(
    categories[0]?.name || 'AI Filmmaking'
  );
  const [tagsInput, setTagsInput] = useState(
    (creation.tags || []).join(', ')
  );
  const [creativeCredits, setCreativeCredits] = useState(
    creation.ownerName || ''
  );
  const [projectName, setProjectName] = useState(creation.projectName || '');

  // Explicit disclosure controls
  const [showCreatorProfile, setShowCreatorProfile] = useState(true);
  const [showAiModel, setShowAiModel] = useState(true);
  const [showPromptAndParams, setShowPromptAndParams] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Public title and description are required for curator review.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await seedanceCuratedService.submitForCuration({
        creationId: creation.id,
        proposedTitle: title.trim(),
        proposedDescription: description.trim(),
        category,
        tags: parsedTags,
        creativeCredits: creativeCredits.trim(),
        projectName: projectName.trim() || undefined,
        showCreatorProfile,
        showAiModel,
        showPromptAndParams,
      });
      onSubmitted();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit creation for review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-white/[0.15] bg-[#0a0a0c] text-white shadow-[0_24px_80px_rgba(0,0,0,0.9)] overflow-hidden my-auto">
        <div className="px-6 py-4 border-b border-white/[0.1] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white">
              Suggest for Public Curation
            </h2>
            <p className="text-[11px] font-mono text-white/50">
              {creation.mediaType} · {creation.resolution} · Remains private until Curator Approval
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          {/* Privacy Notice */}
          <div className="p-3.5 rounded-xl border border-white/[0.12] bg-white/[0.03] flex items-start gap-3">
            <Lock className="w-4 h-4 text-white/80 shrink-0 mt-0.5" />
            <p className="text-xs text-white/70 leading-relaxed">
              Submitting sends a copy of your metadata to the Seedance Curators for quality and safety review. Your original stays safely in{' '}
              <span className="text-white font-medium">My Private Curates</span>, and you control exactly what technical metadata is disclosed publicly.
            </p>
          </div>

          {creation.latestReviewNotes && (
            <div className="p-3.5 rounded-xl border border-white/[0.2] bg-white/[0.05] text-xs text-white/80">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/50 block mb-1">
                Previous Curator Feedback
              </span>
              {creation.latestReviewNotes}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl border border-white/30 bg-white/[0.06] flex items-center gap-2 text-xs text-white">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Public Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                placeholder="Give this piece an editorial title"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Public Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                required
                placeholder="Describe the concept, visual direction, or atmosphere..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white focus:outline-none focus:border-white/40"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name} className="bg-black text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="seedance2.5, monochrome, architecture"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Creative Credits
              </label>
              <input
                type="text"
                value={creativeCredits}
                onChange={(e) => setCreativeCredits(e.target.value)}
                maxLength={300}
                placeholder="Director / Studio credit"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-white/60">
                Project Reference (Optional)
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={80}
                placeholder="Short film or campaign title"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-white/[0.15] text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40"
              />
            </div>
          </div>

          {/* Privacy & Metadata Disclosure Controls */}
          <div className="space-y-2.5 pt-2 border-t border-white/[0.08]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-white/60">
              Public Metadata Disclosure Preferences
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                {showCreatorProfile ? (
                  <Eye className="w-4 h-4 text-white/80" />
                ) : (
                  <EyeOff className="w-4 h-4 text-white/40" />
                )}
                <div>
                  <div className="text-xs font-medium text-white">Show Creator Profile</div>
                  <div className="text-[11px] text-white/50">
                    Display your creator name & follow link publicly (disable to credit anonymously).
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showCreatorProfile}
                onChange={(e) => setShowCreatorProfile(e.target.checked)}
                className="accent-white w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-white/80" />
                <div>
                  <div className="text-xs font-medium text-white">Show AI Model Used</div>
                  <div className="text-[11px] text-white/50">
                    Disclose <span className="font-mono text-white/70">{creation.aiModel}</span> on the public card.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showAiModel}
                onChange={(e) => setShowAiModel(e.target.checked)}
                className="accent-white w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]">
              <div className="flex items-center gap-2.5">
                {showPromptAndParams ? (
                  <Eye className="w-4 h-4 text-white/80" />
                ) : (
                  <Lock className="w-4 h-4 text-white/60" />
                )}
                <div>
                  <div className="text-xs font-medium text-white">
                    Share Prompt & Generation Parameters (Optional)
                  </div>
                  <div className="text-[11px] text-white/50">
                    Kept strictly private unless you explicitly opt in here.
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showPromptAndParams}
                onChange={(e) => setShowPromptAndParams(e.target.checked)}
                className="accent-white w-4 h-4"
              />
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-medium text-white/80 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-white/90 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Submitting...' : 'Submit for Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
