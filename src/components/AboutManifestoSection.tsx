import React from 'react';

export const AboutManifestoSection: React.FC = () => {
  return (
    <section id="about" className="relative w-full bg-[#070708] border-b border-white/10 py-24 md:py-36 px-6 md:px-12 select-text">
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column Label */}
          <div className="lg:col-span-4">
            <span className="text-xs tracking-[0.3em] font-mono text-white/50 uppercase block mb-3">
              EDITORIAL MANIFESTO // VOL. 01
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-light text-white tracking-tight uppercase">
              WHY WE EXIST
            </h2>
          </div>

          {/* Right Column Manifesto Prose (Minimalist & Monumental) */}
          <div className="lg:col-span-8 space-y-8 max-w-3xl">
            <p className="text-2xl sm:text-3xl md:text-4xl font-serif font-light text-white/95 leading-snug">
              Artificial intelligence is changing how images are created, how stories are told, and how culture is imagined.
            </p>

            <p className="text-xl sm:text-2xl font-serif font-light text-neutral-300 leading-relaxed">
              We exist to discover the people and ideas shaping that transformation.
            </p>

            <div className="pt-4 border-t border-white/15 space-y-4">
              <p className="text-base sm:text-lg font-light text-neutral-400 leading-relaxed font-sans">
                Not everything created with AI is interesting.
              </p>
              <p className="text-lg sm:text-xl font-medium text-white tracking-wide uppercase font-serif">
                We believe in work with vision, originality, craft and meaning.
              </p>
            </div>

            <div className="pt-8 flex items-center justify-between text-xs font-mono tracking-widest text-white/40 uppercase">
              <span>VAIURE 唯昱尔 CURATORIAL BOARD</span>
              <span>EST. MMXXVI</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
