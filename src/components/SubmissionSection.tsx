import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';

interface SubmissionSectionProps {
  onOpenSubmit: () => void;
}

export const SubmissionSection: React.FC<SubmissionSectionProps> = ({ onOpenSubmit }) => {
  const { t } = useLanguage();

  return (
    <section id="submit-section" className="relative w-full bg-[#050507] border-b border-white/10 py-24 md:py-36 px-4 sm:px-6 md:px-12 select-text overflow-hidden">
      {/* Background ambient lighting accents */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto relative z-10">
        <div className="border border-white/15 bg-neutral-950/80 p-8 sm:p-14 md:p-20 relative overflow-hidden">
          <div className="max-w-4xl">
            <span className="text-xs tracking-[0.3em] font-mono text-white/40 uppercase block mb-6">
              {t('curatorialSubmissions')}
            </span>

            <h2 className="text-4xl sm:text-6xl md:text-7xl font-serif font-light text-white uppercase tracking-tight leading-[0.95] mb-8">
              {t('submitWorkToArchive')}
            </h2>

            <p className="text-base sm:text-lg text-neutral-300 font-light max-w-2xl leading-relaxed mb-10">
              {t('submitWorkDesc')}
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
              <button
                onClick={onOpenSubmit}
                className="inline-flex items-center justify-between sm:justify-start gap-4 px-8 py-4 bg-white text-black hover:bg-neutral-200 transition-all duration-300 text-xs font-mono tracking-[0.25em] font-semibold uppercase group hover:-translate-y-0.5 active:translate-y-0 cursor-pointer shadow-md"
              >
                <span>{t('submitWork')}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
              </button>

              <div className="text-xs font-mono tracking-widest text-white/40 uppercase">
                CATEGORIES: FASHION · FILM · ART · EXPERIMENTAL
              </div>
            </div>
          </div>

          <div className="absolute -bottom-10 -right-10 text-[10rem] md:text-[14rem] font-serif font-bold text-white/[0.02] pointer-events-none select-none">
            VAIURE
          </div>
        </div>
      </div>
    </section>
  );
};
