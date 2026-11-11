import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { submitCuratorialOpenCall } from '../services/firestoreSocialService';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<string>('AI FASHION');
  const [formData, setFormData] = useState({
    creatorName: '',
    email: '',
    location: '',
    projectTitle: '',
    year: '2026',
    portfolioUrl: '',
    toolsUsed: '',
    projectSynopsis: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    'AI FASHION',
    'AI FILM',
    'AI ART',
    'EXPERIMENTAL',
    'OTHER',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.creatorName || !formData.email || !formData.projectTitle) {
      setSubmitError('Please fill in required fields: Creator Name, Email, and Project Title.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Persist to real Firestore submissions collection
      await submitCuratorialOpenCall({
        category,
        creatorName: formData.creatorName,
        email: formData.email,
        location: formData.location,
        projectTitle: formData.projectTitle,
        year: formData.year,
        description: formData.projectSynopsis,
        aiTools: formData.toolsUsed,
        link: formData.portfolioUrl,
      });
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Unable to submit work. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setFormData({
      creatorName: '',
      email: '',
      location: '',
      projectTitle: '',
      year: '2026',
      portfolioUrl: '',
      toolsUsed: '',
      projectSynopsis: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/90 backdrop-blur-xl overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#07070a] border border-white/15 p-6 sm:p-10 text-white my-auto shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-white/50 hover:text-white p-2 transition-colors"
          aria-label="Close Submission Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          <div className="py-12 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-white/80 mx-auto" />
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
                SUBMISSION RECEIVED
              </span>
              <h3 className="text-3xl font-serif font-light uppercase">
                THANK YOU
              </h3>
              <p className="text-sm text-neutral-300 max-w-md mx-auto font-light leading-relaxed">
                Thank you for submitting <strong className="text-white">"{formData.projectTitle}"</strong>.
                Our editorial team reviews incoming submissions regularly.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-white/20 hover:border-white text-xs font-mono tracking-[0.2em] uppercase transition-colors cursor-pointer"
            >
              CLOSE
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="border-b border-white/10 pb-6 mb-8">
              <span className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase block mb-1">
                CURATORIAL SUBMISSIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-light uppercase tracking-tight">
                SUBMIT WORK
              </h2>
              <p className="text-xs text-neutral-400 font-light mt-2">
                We accept exceptional work exploring the intersection of AI, fashion, cinema, and visual storytelling.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Picker */}
              <div>
                <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-3">
                  DISCIPLINE CATEGORY *
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-mono tracking-wider transition-colors border ${
                        category === cat
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/10 text-white/60 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Creator details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    CREATOR / STUDIO NAME *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.creatorName}
                    onChange={(e) => setFormData({ ...formData, creatorName: e.target.value })}
                    placeholder="e.g. Atelier Vance"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    EMAIL CONTACT *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="creator@studio.com"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Project title and year */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    PROJECT TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.projectTitle}
                    onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                    placeholder="Title of film, editorial, or artwork"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors font-serif"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    LOCATION / CITY
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Paris / Tokyo"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Link and AI Tools */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    PORTFOLIO / VIDEO / HIGH-RES LINK *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.portfolioUrl}
                    onChange={(e) => setFormData({ ...formData, portfolioUrl: e.target.value })}
                    placeholder="Vimeo, YouTube, Google Drive, or Website"
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    AI TOOLS & PIPELINE USED
                  </label>
                  <input
                    type="text"
                    value={formData.toolsUsed}
                    onChange={(e) => setFormData({ ...formData, toolsUsed: e.target.value })}
                    placeholder="Runway Gen-3, Midjourney v6, ComfyUI, etc."
                    className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Statement */}
              <div>
                <label className="block text-[11px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                  PROJECT SYNOPSIS & CONCEPTUAL STATEMENT
                </label>
                <textarea
                  rows={3}
                  value={formData.projectSynopsis}
                  onChange={(e) => setFormData({ ...formData, projectSynopsis: e.target.value })}
                  placeholder="Describe your creative intention, methodology, and what this work reveals about synthetic visual culture..."
                  className="w-full bg-neutral-900 border border-white/10 px-3.5 py-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors"
                />
              </div>

              {/* Error feedback */}
              {submitError && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-300">
                  {submitError}
                </div>
              )}

              {/* Submit CTA */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <p className="text-[10px] font-mono text-white/40">
                  BY SUBMITTING, YOU AFFIRM AUTHORSHIP OF THE PROMPTS & PIPELINE.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 transition-colors text-xs font-mono tracking-[0.2em] font-semibold uppercase flex items-center gap-2 cursor-pointer"
                >
                  <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT WORK'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
