import React from 'react';
import { X } from 'lucide-react';
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
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050507]/96 backdrop-blur-2xl flex flex-col overflow-y-auto select-text text-[#ECECE9] animate-in fade-in duration-300">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-md border-b border-white/10 px-6 sm:px-12 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white">
            VAIURE
          </span>
          <span className="text-xs text-white/50 font-sans">
            唯昱尔
          </span>
          <span className="text-white/20">/</span>
          <span className="text-xs font-mono uppercase tracking-widest text-white/70">
            AI HYBRID PRODUCTION ARCHITECTURE
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Studio Info Modal"
          className="p-2 -mr-2 text-white/70 hover:text-white hover:bg-white/10 rounded-sm transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full px-6 sm:px-12 py-12 sm:py-20 space-y-16">
        <div className="space-y-6">
          <span className="text-xs font-mono tracking-[0.25em] text-blue-400 uppercase block">
            VAIURE AI STUDIO LABS · SEEDANCE 2.5 CORE INFRASTRUCTURE
          </span>

          <h1 className="text-3xl sm:text-5xl font-display font-bold uppercase tracking-tight text-white leading-tight">
            NEXT-GENERATION HYBRID FILMMAKING COMPLEX UNITING VIRTUAL SOUNDSTAGES & SEEDANCE 2.5.
          </h1>

          <p className="text-base sm:text-xl font-light text-neutral-300 font-sans leading-relaxed">
            Engineered as six glass-connected operational zones—from the curved LED Command Center and Virtual Production Volume to liquid-cooled compute racks—VAIURE bridges physical optics with industrial-scale AI video production.
          </p>
        </div>

        {/* Core Architecture Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-b border-white/10 py-12 text-xs font-mono">
          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">01 / SOUNDSTAGE + LED</span>
            <h3 className="text-sm font-bold text-white uppercase">PHYSICAL OPTICS PRECISION</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              Curved micro-LED volumes, motorized cinema cranes, and optical motion capture eliminate synthetic weightlessness in favor of genuine lens physics.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">02 / SEEDANCE 2.5</span>
            <h3 className="text-sm font-bold text-white uppercase">MULTI-PROVIDER SYNTHESIS</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              Dedicated prompt engineering workstations orchestrate ByteDance & MUAPI Seedance 2.5 pipelines up to 4K resolution and 30-second master sequences.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-white/40 uppercase tracking-widest block">03 / FINISHING & SAN</span>
            <h3 className="text-sm font-bold text-white uppercase">END-TO-END COLOR & COMPUTE</h3>
            <p className="text-white/60 leading-relaxed font-sans text-xs">
              400GbE fiber fabric connects capture bays directly to OLED HDR grading suites and high-density render infrastructure with deterministic provenance.
            </p>
          </div>
        </div>

        {/* Inquiries */}
        <div className="border border-white/10 bg-[#0A0A0E] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 font-mono text-xs">
          <div className="space-y-1">
            <span className="text-white font-bold text-sm uppercase block">
              STUDIO PRODUCTION ACCESS & COMMISSIONS
            </span>
            <p className="text-white/55 text-xs font-sans">
              Book virtual volume shoots, hybrid Seedance 2.5 commercial pipelines, or bespoke technical consultation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenSubmit && (
              <button
                type="button"
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
              href="mailto:studio@vaiure.art"
              className="px-4 py-2.5 border border-white/20 hover:border-white text-white uppercase text-xs tracking-wider transition-colors"
            >
              studio@vaiure.art
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
