import React from 'react';
import { X, Mail, Globe, MapPin, Film, Sparkles, Shield, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../services/i18n';

interface CinemaInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSubmit?: () => void;
}

export const CinemaInfoModal: React.FC<CinemaInfoModalProps> = ({
  isOpen,
  onClose,
  onOpenSubmit,
}) => {
  const { t, language } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-white animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-black/85 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans">
            唯昱尔
          </span>
          <span className="text-white/20">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/70">
            {t('cinemaCuratorialManifesto')}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close Info Modal"
          className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-12 sm:py-20 space-y-16">
        {/* Lead Manifesto Section */}
        <div className="space-y-6">
          <span className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase block">
            {t('cinemaAnewVisualCulture')} · 2026–2030+
          </span>

          <h1 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white leading-tight">
            {t('cinemaManifestoHeading')}
          </h1>

          <p className="text-base sm:text-xl font-light text-neutral-300 font-sans leading-relaxed">
            {t('cinemaManifestoSubtitle')}
          </p>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-b border-white/10 py-12 text-xs font-mono">
          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">{t('cinemaDisciplineSection')}</span>
            <h3 className="text-sm font-bold text-white uppercase">{t('cinemaPrinciple1Title')}</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              {t('cinemaPrinciple1Desc')}
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">{t('cinemaAuthorshipSection')}</span>
            <h3 className="text-sm font-bold text-white uppercase">{t('cinemaPrinciple2Title')}</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              {t('cinemaPrinciple2Desc')}
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">{t('cinemaPermanenceSection')}</span>
            <h3 className="text-sm font-bold text-white uppercase">{t('cinemaPrinciple3Title')}</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              {t('cinemaPrinciple3Desc')}
            </p>
          </div>
        </div>

        {/* Global Ateliers */}
        <div className="space-y-6">
          <h2 className="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
            {t('cinemaGlobalAteliers')}
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs font-mono">
            <div className="space-y-1">
              <span className="text-white font-bold block">PARIS</span>
              <span className="text-white/50 text-[11px] block">Rue du Faubourg Saint-Honoré</span>
              <span className="text-white/40 text-[10px]">{t('cinemaParisDesc')}</span>
            </div>

            <div className="space-y-1">
              <span className="text-white font-bold block">TOKYO</span>
              <span className="text-white/50 text-[11px] block">Aoyama, Minato-ku</span>
              <span className="text-white/40 text-[10px]">{t('cinemaTokyoDesc')}</span>
            </div>

            <div className="space-y-1">
              <span className="text-white font-bold block">SHANGHAI</span>
              <span className="text-white/50 text-[11px] block">West Bund Cultural Corridor</span>
              <span className="text-white/40 text-[10px]">{t('cinemaShanghaiDesc')}</span>
            </div>

            <div className="space-y-1">
              <span className="text-white font-bold block">NEW YORK</span>
              <span className="text-white/50 text-[11px] block">Tribeca Arts District</span>
              <span className="text-white/40 text-[10px]">{t('cinemaNewYorkDesc')}</span>
            </div>
          </div>
        </div>

        {/* Inquiries & Contact */}
        <div className="border border-white/10 bg-neutral-950 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-white font-bold text-sm uppercase block">
              {t('cinemaCommissionInquiries')}
            </span>
            <p className="text-white/50 text-xs font-sans">
              {t('cinemaCommissionDesc')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenSubmit && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSubmit();
                }}
                className="px-4 py-2.5 bg-white text-black hover:bg-neutral-200 uppercase font-semibold text-xs tracking-wider transition-colors cursor-pointer"
              >
                {t('submitWork')}
              </button>
            )}

            <a
              href="mailto:curator@vaiure.art"
              className="px-4 py-2.5 border border-white/20 hover:border-white text-white uppercase text-xs tracking-wider transition-colors"
            >
              curator@vaiure.art
            </a>
          </div>
        </div>

        {/* Footer Credit */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-white/40 gap-2">
          <span>© 2026–2035 VAIURE 唯昱尔. {t('cinemaAnewVisualCulture')}.</span>
          <span>{t('cinemaAllRightsReserved')}</span>
        </div>
      </div>
    </div>
  );
};
