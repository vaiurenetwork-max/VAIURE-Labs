import React, { useState } from 'react';
import { FilmProject } from '../../data/ivntriData';
import { X, Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface FilmProjectModalProps {
  film: FilmProject | null;
  onClose: () => void;
}

export const FilmProjectModal: React.FC<FilmProjectModalProps> = ({ film, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(25);

  if (!film) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg overflow-y-auto p-4 sm:p-6 md:p-12 select-text">
      <div className="relative w-full max-w-5xl bg-[#09090b] border border-white/15 my-auto text-white shadow-2xl overflow-hidden">
        {/* Sticky Close Bar */}
        <div className="sticky top-0 z-20 bg-[#09090b]/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
            CINEMATIC ARCHIVE // {film.title} ({film.year})
          </div>
          <button
            onClick={onClose}
            aria-label="Close Film Screening"
            className="text-white/60 hover:text-white p-1 transition-colors flex items-center gap-1.5 text-xs font-mono tracking-wider uppercase"
          >
            <span>CLOSE</span>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-10 md:p-14 space-y-12">
          {/* Header */}
          <div className="space-y-4 max-w-3xl">
            <div className="text-xs font-mono tracking-widest text-white/50 uppercase">
              {film.genre} · {film.runtime} · {film.aspectRatio}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-light uppercase tracking-tight leading-tight">
              {film.title}
            </h1>
            <p className="text-xs font-mono text-white/70">
              DIRECTED BY <strong className="text-white font-medium">{film.director.toUpperCase()}</strong>
            </p>
          </div>

          {/* Large Video Player Frame Simulation */}
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-black border border-white/10 group">
            <img
              src={film.coverImage}
              alt={film.title}
              referrerPolicy="no-referrer"
              className={`w-full h-full object-cover filter grayscale contrast-[1.12] transition-transform duration-1000 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />

            <div className="absolute inset-0 bg-black/30 pointer-events-none" />
            <div className="absolute inset-0 film-grain pointer-events-none" />

            {/* Simulated Watermark */}
            <div className="absolute top-4 left-4 text-[10px] font-mono text-white/60 tracking-widest bg-black/60 px-2 py-0.5 border border-white/10">
              VAIURE 唯昱尔 CINEMA ARCHIVE // MASTER DCI-4K
            </div>

            {/* Big center play toggle */}
            {!isPlaying && (
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors"
                aria-label="Play Film"
              >
                <div className="w-16 h-16 rounded-full border border-white/40 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 ml-1 fill-white" />
                </div>
              </button>
            )}

            {/* Video Controls Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent flex flex-col gap-2">
              {/* Scrubber */}
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  setProgress(Math.round((clickX / rect.width) * 100));
                }}
                className="w-full h-1 bg-white/20 hover:h-1.5 transition-all cursor-pointer relative"
              >
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-white/70 pt-1">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="hover:text-white transition-colors"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="hover:text-white transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-[11px]">02:14 / {film.runtime}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] tracking-widest text-white/40 uppercase">
                    PROJECTION ASPECT: {film.aspectRatio}
                  </span>
                  <Maximize2 className="w-3.5 h-3.5 text-white/60 hover:text-white cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

          {/* Festival Laurels */}
          {film.festivalAccolades.length > 0 && (
            <div className="border border-white/10 p-4 bg-black/40 flex flex-wrap gap-4 items-center justify-around text-center">
              {film.festivalAccolades.map((laurel, i) => (
                <div key={i} className="text-xs font-serif italic text-white/80 tracking-wide px-2">
                  ✦ {laurel} ✦
                </div>
              ))}
            </div>
          )}

          {/* Synopsis & Director's Statement */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 border-t border-white/10 pt-10">
            <div className="md:col-span-8 space-y-6">
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase">
                SYNOPSIS
              </h3>
              <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed">
                {film.synopsis}
              </p>

              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase pt-4">
                DIRECTOR'S STATEMENT & GENERATIVE CINEMATOGRAPHY
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed italic font-serif">
                "{film.directorsStatement}"
              </p>
            </div>

            {/* AI Tools & Technical Credits */}
            <div className="md:col-span-4 space-y-8 border-l border-white/10 pl-0 md:pl-8">
              <div>
                <h4 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">
                  AI TOOLS & GENERATIVE ENGINE
                </h4>
                <div className="space-y-1.5">
                  {film.aiTools.map((tool) => (
                    <div key={tool} className="text-xs font-mono text-neutral-300 flex items-center gap-2">
                      <span className="w-1 h-1 bg-white/60" />
                      <span>{tool}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono tracking-widest text-white/40 uppercase mb-3">
                  PRODUCTION CREDITS
                </h4>
                <div className="space-y-2 text-xs font-sans text-neutral-300">
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">DIRECTOR</span>
                    <span>{film.credits.director}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">SCREENPLAY</span>
                    <span>{film.credits.screenplay}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">AI CINEMATOGRAPHY</span>
                    <span>{film.credits.aiCinematography}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">NEURAL AUDIO</span>
                    <span>{film.credits.neuralAudio}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] font-mono">COLOR & GRAIN</span>
                    <span>{film.credits.colorGrading}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stills Gallery */}
          {film.stills.length > 0 && (
            <div className="space-y-6 border-t border-white/10 pt-10">
              <h3 className="text-xs font-mono tracking-widest text-white/40 uppercase">
                PRODUCTION STILLS & CONTINUITY FRAMES
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {film.stills.map((still, idx) => (
                  <div key={idx} className="aspect-[16/9] overflow-hidden bg-black border border-white/10">
                    <img
                      src={still}
                      alt={`Still ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover filter grayscale contrast-[1.1]"
                    />
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
