import React from 'react';
import { StudioProfile } from '../../data/ivntriData';
import { X, ArrowUpRight } from 'lucide-react';

interface StudioDetailModalProps {
  studio: StudioProfile | null;
  onClose: () => void;
}

export const StudioDetailModal: React.FC<StudioDetailModalProps> = ({ studio, onClose }) => {
  if (!studio) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg overflow-y-auto p-4 sm:p-6 md:p-12 select-text">
      <div className="relative w-full max-w-4xl bg-[#09090b] border border-white/15 my-auto text-white shadow-2xl overflow-hidden">
        {/* Sticky Close Bar */}
        <div className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
            ATELIER DOSSIER // {studio.name.toUpperCase()} (EST. {studio.founded})
          </div>
          <button
            onClick={onClose}
            aria-label="Close Studio Dossier"
            className="text-white/60 hover:text-white p-1 transition-colors flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase"
          >
            <span>CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10 md:p-12 space-y-8">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-black border border-white/10">
            <img
              src={studio.coverImage}
              alt={studio.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter grayscale contrast-[1.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div>
                <span className="text-xs font-mono tracking-widest text-white/60 uppercase block">
                  {studio.city.toUpperCase()} · FOUNDED {studio.founded}
                </span>
                <h1 className="text-3xl sm:text-5xl font-serif font-light uppercase tracking-tight text-white mt-1">
                  {studio.name}
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                SPECIALIZATION & CORE FOCUS
              </span>
              <p className="text-lg font-serif italic text-white/90">
                {studio.focus}
              </p>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-6">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                STUDIO OVERVIEW & LATENT ARCHITECTURE
              </span>
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed">
                {studio.description}
              </p>
            </div>

            <div className="space-y-3 border-t border-white/10 pt-6">
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                NOTABLE CLIENTS & INSTITUTIONAL COMMISSIONS
              </span>
              <div className="flex flex-wrap gap-2">
                {studio.notableClients.map((client) => (
                  <span
                    key={client}
                    className="px-3 py-1.5 bg-neutral-900 border border-white/15 text-xs font-mono text-white/80 uppercase"
                  >
                    {client}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/50">
              <span>COMMISSION INQUIRIES ROUTED VIA VAIURE 唯昱尔 ACCESSION</span>
              <span className="text-white hover:underline cursor-pointer flex items-center gap-1">
                CONTACT ATELIER <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
