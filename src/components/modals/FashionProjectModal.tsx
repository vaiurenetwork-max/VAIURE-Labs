import React from 'react';
import { FashionProject } from '../../data/ivntriData';
import { X, ArrowUpRight } from 'lucide-react';

interface FashionProjectModalProps {
  project: FashionProject | null;
  onClose: () => void;
  onSelectCreator?: (creatorName: string) => void;
}

export const FashionProjectModal: React.FC<FashionProjectModalProps> = ({
  project,
  onClose,
}) => {
  if (!project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg overflow-y-auto p-4 sm:p-6 md:p-12 select-text">
      <div className="relative w-full max-w-5xl bg-[#09090b] border border-white/15 my-auto text-white shadow-2xl overflow-hidden">
        {/* Sticky Close Bar */}
        <div className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
            DOSSIER REF: {project.id.toUpperCase()} // {project.category}
          </div>
          <button
            onClick={onClose}
            aria-label="Close Dossier"
            className="text-white/60 hover:text-white p-1 transition-colors flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase"
          >
            <span>CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10 md:p-14 space-y-12">
          {/* Hero Header */}
          <div className="space-y-4 max-w-3xl">
            <div className="text-xs font-mono tracking-widest text-white/50 uppercase">
              {project.category} · {project.year} · DIGITAL HAUTE COUTURE
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-light uppercase tracking-tight leading-tight">
              {project.title}
            </h1>
            <p className="text-lg text-neutral-300 font-serif italic">
              {project.deck}
            </p>
            <div className="pt-2 text-xs font-mono text-white/70">
              CREATOR: <strong className="text-white font-medium">{project.creator}</strong> ({project.creatorRole})
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-black border border-white/10">
            <img
              src={project.coverImage}
              alt={project.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter grayscale contrast-[1.08]"
            />
            <div className="absolute bottom-3 left-3 text-[10px] font-mono text-white/70 bg-black/60 px-2 py-0.5 border border-white/10">
              HERO PLATE / 8K NEURAL RENDER
            </div>
          </div>

          {/* Two-Column Editorial Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-white/10 pt-10">
            <div className="md:col-span-8 space-y-6">
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase">
                EDITORIAL CURATORIAL STATEMENT
              </h3>
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed">
                {project.synopsis}
              </p>

              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase pt-4">
                CREATIVE METHODOLOGY & LATENT ENGINEERING
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
                {project.creativeProcess}
              </p>
            </div>

            {/* AI Tools & Production Credits */}
            <div className="md:col-span-4 space-y-8 border-l border-white/10 pl-0 md:pl-8">
              <div>
                <h4 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">
                  AI PIPELINE & MODELS
                </h4>
                <div className="space-y-1.5">
                  {project.aiTools.map((tool) => (
                    <div key={tool} className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                      <span className="w-1 h-1 bg-white/60" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">
                  CREDITS & ATTRIBUTIONS
                </h4>
                <div className="space-y-2 text-xs font-sans text-neutral-300">
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">CREATIVE DIRECTION</span>
                    <span>{project.credits.creativeDirection}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">GENERATIVE DESIGN</span>
                    <span>{project.credits.generativeDesign}</span>
                  </div>
                  {project.credits.textileSimulation && (
                    <div>
                      <span className="text-white/40 block text-[10px] font-mono">TEXTILE SIMULATION</span>
                      <span>{project.credits.textileSimulation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Image Gallery */}
          {project.gallery.length > 0 && (
            <div className="space-y-6 border-t border-white/10 pt-10">
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase">
                STUDY PLATES & ARCHIVAL VARIATIONS
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {project.gallery.map((item, idx) => (
                  <div key={idx} className="space-y-2 border border-white/10 p-2 bg-black">
                    <div className="aspect-[3/4] overflow-hidden bg-neutral-900">
                      <img
                        src={item.image}
                        alt={item.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover filter grayscale contrast-[1.1]"
                      />
                    </div>
                    <p className="text-[11px] font-mono text-white/50 px-1 py-1">
                      {item.caption}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
