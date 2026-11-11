import React, { useState, useEffect } from 'react';

interface CinematicLoaderProps {
  onComplete: () => void;
}

export const CinematicLoader: React.FC<CinematicLoaderProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'brand' | 'tagline' | 'exit'>('brand');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('tagline');
    }, 380);

    const t2 = setTimeout(() => {
      setPhase('exit');
    }, 920);

    const t3 = setTimeout(() => {
      onComplete();
    }, 1280);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#050507] flex flex-col items-center justify-center transition-all duration-500 ease-editorial pointer-events-none select-none ${
        phase === 'exit' ? 'opacity-0 scale-[1.015]' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute inset-0 film-grain pointer-events-none" />

      <div className="relative z-10 text-center space-y-4 px-6">
        <div className="flex flex-col items-center gap-1.5 animate-editorial-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold tracking-[0.18em] text-white uppercase">
            VAIURE
          </h1>
          <span className="text-sm sm:text-base font-light text-white/75 font-sans tracking-[0.35em]">
            唯昱尔
          </span>
        </div>

        {/* Horizontal Light Aperture Line */}
        <div className="w-32 sm:w-44 h-[1px] mx-auto bg-gradient-to-r from-transparent via-white/45 to-transparent animate-aperture-line" />

        <div className="overflow-hidden h-6">
          <p
            className={`text-xs md:text-sm font-serif italic tracking-[0.28em] uppercase text-white/75 transition-all duration-500 ease-editorial transform ${
              phase === 'tagline' || phase === 'exit'
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
          >
            A New Visual Culture
          </p>
        </div>
      </div>

      <div className="absolute bottom-8 text-[9px] font-mono tracking-[0.28em] text-white/30 uppercase">
        MMXXX · CURATED VISUAL ARCHIVE
      </div>
    </div>
  );
};
