import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  CINEMA_PROJECTS,
  CinemaProject,
  getLocalizedCinemaProjects,
} from '../../data/cinemaProjectsData';
import { CinemaProjectDossierModal } from './CinemaProjectDossierModal';
import { CinemaWorkIndexModal } from './CinemaWorkIndexModal';
import { CinemaInfoModal } from './CinemaInfoModal';
import { useLanguage } from '../../services/i18n';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Maximize2,
  Sliders,
  Layers,
} from 'lucide-react';

interface VaiureCinemaSlideProps {
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onGoToLabs?: () => void;
  onOpenShorts?: () => void;
  onOpenMenu?: () => void;
  onOpenSubmit?: () => void;
}

export const VaiureCinemaSlide: React.FC<VaiureCinemaSlideProps> = ({
  onBackToSlideOne,
  onBackToSlideTwo,
  onGoToLabs,
  onOpenShorts,
  onOpenMenu,
  onOpenSubmit,
}) => {
  const { t, language } = useLanguage();
  const [activeProjectIdx, setActiveProjectIdx] = useState(0);
  const [selectedDossierProject, setSelectedDossierProject] = useState<CinemaProject | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Web Audio Synth references for generative ambient drone
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Timecode counter state (matching LAFOUR reference: "· 01 : 58 : 15")
  const [timecode, setTimecode] = useState('01 : 58 : 15');

  // Horizontal scroll container ref for bottom project ribbon
  const ribbonScrollRef = useRef<HTMLDivElement>(null);

  // Hero Touch swipe state for intuitive mobile project cycling
  const [touchHeroStartX, setTouchHeroStartX] = useState<number | null>(null);
  const [touchHeroStartY, setTouchHeroStartY] = useState<number | null>(null);

  const localizedProjects = useMemo(() => {
    return getLocalizedCinemaProjects(CINEMA_PROJECTS, language);
  }, [language]);

  const activeProject = localizedProjects[activeProjectIdx] || localizedProjects[0];

  // Procedural Web Audio Ambient Soundscape
  const toggleAmbientSound = () => {
    if (isMuted) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.09, ctx.currentTime);
          masterGain.connect(ctx.destination);
          gainNodeRef.current = masterGain;

          // Deep root drone (55Hz / A1)
          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(55, ctx.currentTime);

          // Warm harmonic overtone (82.4Hz / E2)
          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(82.4, ctx.currentTime);

          // Low-pass filter for velvety atmospheric warmth
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(260, ctx.currentTime);

          const droneGain = ctx.createGain();
          droneGain.gain.setValueAtTime(0.08, ctx.currentTime);

          osc1.connect(filter);
          osc2.connect(filter);
          filter.connect(droneGain);
          droneGain.connect(masterGain);

          osc1.start();
          osc2.start();
        } else if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
        }

        if (gainNodeRef.current && audioCtxRef.current) {
          gainNodeRef.current.gain.setTargetAtTime(0.09, audioCtxRef.current.currentTime, 0.4);
        }
        setIsMuted(false);
      } catch (err) {
        console.warn('Web Audio Ambient error:', err);
        setIsMuted(false);
      }
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.3);
      }
      setIsMuted(true);
    }
  };

  // Clean up AudioContext on unmount
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Dynamic ticking timecode adhering to LAFOUR's iconic cinematic clock format
  useEffect(() => {
    let frames = 15;
    let seconds = 58;
    let minutes = 1;

    const interval = setInterval(() => {
      frames = (frames + 1) % 24;
      if (frames === 0) {
        seconds = (seconds + 1) % 60;
        if (seconds === 0) {
          minutes = (minutes + 1) % 60;
        }
      }
      const pad = (n: number) => n.toString().padStart(2, '0');
      setTimecode(`${pad(minutes)} : ${pad(seconds)} : ${pad(frames)}`);
    }, 41.67); // 24 frames per second simulation

    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for cinematic switching (ArrowUp / ArrowDown)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDossierProject || isWorkModalOpen || isInfoModalOpen) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveProjectIdx((prev) => (prev + 1) % CINEMA_PROJECTS.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveProjectIdx((prev) => (prev - 1 + CINEMA_PROJECTS.length) % CINEMA_PROJECTS.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectedDossierProject(activeProject);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDossierProject, isWorkModalOpen, isInfoModalOpen, activeProject]);

  // Keep active project in view inside bottom scroll ribbon
  useEffect(() => {
    if (ribbonScrollRef.current) {
      const activeEl = ribbonScrollRef.current.children[activeProjectIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeProjectIdx]);

  // Hero Touch Handlers for horizontal swipe navigation between cinema projects
  const handleHeroTouchStart = (e: React.TouchEvent) => {
    setTouchHeroStartX(e.touches[0].clientX);
    setTouchHeroStartY(e.touches[0].clientY);
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (touchHeroStartX === null || touchHeroStartY === null) return;
    const diffX = e.changedTouches[0].clientX - touchHeroStartX;
    const diffY = e.changedTouches[0].clientY - touchHeroStartY;

    if (Math.abs(diffX) > Math.abs(diffY) * 1.3 && Math.abs(diffX) > 50) {
      if (diffX < 0) {
        // swipe left -> next project
        setActiveProjectIdx((prev) => (prev + 1) % CINEMA_PROJECTS.length);
      } else {
        // swipe right -> previous project
        setActiveProjectIdx((prev) => (prev - 1 + CINEMA_PROJECTS.length) % CINEMA_PROJECTS.length);
      }
    }
    setTouchHeroStartX(null);
    setTouchHeroStartY(null);
  };

  return (
    <div className="relative w-full h-full min-h-0 bg-[#050507] text-[#ECECE9] overflow-hidden select-none flex flex-col justify-between font-sans">
      {/* ======================================================== */}
      {/* 1. CINEMATIC FULL-BLEED HERO BACKGROUND BACKDROP         */}
      {/* ======================================================== */}
      <div
        onClick={() => setSelectedDossierProject(activeProject)}
        className="absolute inset-0 z-0 overflow-hidden cursor-pointer group select-none"
        title="Click to view full cinematic project dossier"
      >
        {/* Active Hero Image with crossfade transition */}
        <div className="relative w-full h-full">
          {localizedProjects.map((proj, idx) => (
            <div
              key={proj.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                activeProjectIdx === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img
                src={proj.heroImage}
                alt={proj.title}
                className={`w-full h-full object-cover object-center filter contrast-[1.12] brightness-[0.88] transition-transform duration-[8000ms] ease-out will-change-transform transform-gpu group-hover:scale-[1.02] ${
                  activeProjectIdx === idx ? 'animate-cinema-motion' : ''
                }`}
              />
              {/* Subtle architectural chiaroscuro gradient overlays matching LAFOUR reference */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/60 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute inset-0 film-grain pointer-events-none opacity-40" />
            </div>
          ))}
        </div>

        {/* Hover Cue in Center Viewport */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="px-5 py-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-mono uppercase tracking-widest flex items-center gap-2 shadow-2xl">
            <span>{t('cinemaOpenDossier')}</span>
            <Maximize2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP EDITORIAL HEADER (CLEAN & SIMPLE)                  */}
      {/* ======================================================== */}
      <header className="relative z-30 w-full px-4 sm:px-6 h-11 sm:h-12 flex items-center justify-between text-xs font-mono tracking-wider select-none bg-gradient-to-b from-black/85 to-transparent">
        {/* Left: Brand Name VAIURE｜唯昱尔 + Slide Switcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onBackToSlideTwo) onBackToSlideTwo();
            }}
            className="group flex items-baseline gap-1.5 cursor-pointer focus:outline-none"
            title="VAIURE｜唯昱尔"
          >
            <span className="font-display text-sm sm:text-base font-bold tracking-[0.2em] uppercase text-white group-hover:text-white/80 transition-colors">
              VAIURE
            </span>
            <span className="text-white/35 font-light text-xs sm:text-sm">｜</span>
            <span className="text-xs sm:text-sm font-light text-white/85 font-sans tracking-widest">
              唯昱尔
            </span>
          </button>

          {/* Subtle Spatial Slide Switcher */}
          <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-white/15 text-[10px] font-mono text-white/45">
            {onBackToSlideOne && (
              <button
                onClick={onBackToSlideOne}
                title="Slide 01: Threads Discourse"
                className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                01
              </button>
            )}
            {onBackToSlideTwo && (
              <button
                onClick={onBackToSlideTwo}
                title="Slide 02: Curatorial Archive"
                className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                02
              </button>
            )}
            <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold">03</span>
            {onGoToLabs && (
              <button
                onClick={onGoToLabs}
                title="Slide 04: VAIURE Filmmaking Studio"
                className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                04
              </button>
            )}
          </div>
        </div>

        {/* Center: Live 24fps Cinema Timecode Whisper */}
        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-white/50 tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-subtle-glow" />
          <span>{timecode}</span>
          <span className="text-white/25">·</span>
          <span>24 FPS</span>
        </div>

        {/* Right: Sound, Work, Studio, and Menu */}
        <div className="flex items-center gap-2">
          {/* Ambient Sound Toggle */}
          <button
            onClick={toggleAmbientSound}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>

          {/* Work Modal Trigger */}
          <button
            onClick={() => setIsWorkModalOpen(true)}
            className="px-2.5 py-1 text-[10px] font-mono text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm transition-colors cursor-pointer"
            title="Browse Complete Work Portfolio"
          >
            <span>{t('cinemaWork') || 'WORK'}</span>
          </button>

          {/* Studio Slide 04 Trigger */}
          {onGoToLabs && (
            <button
              onClick={onGoToLabs}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono text-white bg-white/10 hover:bg-white/20 border border-white/25 rounded-sm transition-colors cursor-pointer"
              title="Enter VAIURE Studio (Slide 04)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-subtle-glow" />
              <span>STUDIO</span>
            </button>
          )}

          {/* Menu Drawer button */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              aria-label="Open Navigation Menu"
              className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. CENTER FLOATING HERO METADATA (QUIET EDITORIAL KICKER) */}
      {/* ======================================================== */}
      <div className="relative z-20 px-4 sm:px-8 lg:px-12 flex-1 flex flex-col justify-end pb-3 sm:pb-6 md:pb-8 pointer-events-none">
        <div className="max-w-2xl space-y-2 pointer-events-auto">
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-[0.22em] uppercase text-white/70">
            <span className="w-2 h-[1px] bg-white/50" />
            <span>{t('cinemaFeaturedSelection')} {activeProject.code}</span>
            <span>·</span>
            <span>{activeProject.year}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold uppercase tracking-tight text-white leading-tight drop-shadow-md">
            {activeProject.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg font-serif italic text-white/80 font-light max-w-lg line-clamp-2">
            {activeProject.subtitle}
          </p>

          {/* Editorial Tap Prompt / Action */}
          <div className="pt-1">
            <button
              onClick={() => setSelectedDossierProject(activeProject)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 text-[10px] font-mono tracking-widest text-white uppercase backdrop-blur-md transition-all cursor-pointer shadow-sm"
              title="View full project dossier"
            >
              <span>{t('cinemaExploreDossier')}</span>
              <ArrowRight className="w-3 h-3 text-white/70" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM PROJECT NAVIGATION STRIP (FAITHFUL TO SCREENSHOT)*/}
      {/* ======================================================== */}
      <footer
        data-no-slide-swipe="true"
        className="relative z-30 w-full bg-black/85 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 lg:px-12 py-2.5 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none"
      >
        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          {/* Scroll Navigation Arrow Left */}
          <button
            onClick={() =>
              setActiveProjectIdx((prev) => (prev - 1 + localizedProjects.length) % localizedProjects.length)
            }
            className="hidden sm:flex p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title="Previous project (←)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Horizontal Project Strip */}
          <div
            data-no-slide-swipe="true"
            ref={ribbonScrollRef}
            className="flex-1 flex items-center gap-3.5 sm:gap-6 lg:gap-8 overflow-x-auto no-scrollbar scroll-smooth py-1 scroll-touch-snap"
          >
            {localizedProjects.map((proj, idx) => {
              const isActive = activeProjectIdx === idx;
              return (
                <div
                  key={proj.id}
                  onClick={() => setActiveProjectIdx(idx)}
                  className={`touch-press scroll-touch-item flex items-center gap-2.5 sm:gap-3.5 shrink-0 cursor-pointer transition-all duration-300 group py-1 touch-target-min ${
                    isActive ? 'opacity-100 scale-100' : 'opacity-40 hover:opacity-85'
                  }`}
                >
                  {/* Active Bullet Indicator */}
                  <div className="w-1.5 flex justify-center">
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-white/40" />
                    )}
                  </div>

                  {/* Thumbnail (16:9 cinematic proportion) */}
                  <div
                    className={`relative w-14 h-9 sm:w-22 sm:h-13 md:w-28 md:h-16 overflow-hidden bg-neutral-950 flex-shrink-0 border transition-all duration-300 rounded-[2px] ${
                      isActive
                        ? 'border-white shadow-lg ring-1 ring-white/50'
                        : 'border-white/15 group-hover:border-white/40'
                    }`}
                  >
                    <img
                      src={proj.thumbnailImage}
                      alt={proj.title}
                      className="w-full h-full object-cover filter contrast-[1.1] group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Typography Metadata */}
                  <div className="text-[10px] sm:text-[11px] font-mono leading-tight space-y-0.5 select-text min-w-0">
                    <p className="font-bold text-white uppercase tracking-tight truncate max-w-[95px] sm:max-w-[170px] group-hover:text-white">
                      {proj.title}
                    </p>
                    <p className="font-medium text-white/70 uppercase tracking-tight truncate text-[9px] sm:text-[10px] max-w-[95px] sm:max-w-[170px]">
                      {proj.subtitle}
                    </p>
                    <p className="hidden md:block text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider truncate">
                      {proj.campaignType}
                    </p>
                    <p className="hidden lg:block text-white/40 text-[9px] sm:text-[10px] truncate">
                      {proj.creators}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Index Counter on Mobile */}
          <div className="flex sm:hidden items-center text-[10px] font-mono text-white/60 tracking-widest pl-1 tabular-nums">
            <span>0{activeProjectIdx + 1}</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-white/40">0{localizedProjects.length}</span>
          </div>

          {/* Scroll Navigation Arrow Right */}
          <button
            onClick={() => setActiveProjectIdx((prev) => (prev + 1) % localizedProjects.length)}
            className="hidden sm:flex p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title="Next project (→)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 5. MODALS & DOSSIER OVERLAYS                             */}
      {/* ======================================================== */}
      {/* Project Case Study Dossier */}
      {selectedDossierProject && (
        <CinemaProjectDossierModal
          project={selectedDossierProject}
          onClose={() => setSelectedDossierProject(null)}
          onSelectProject={(p) => {
            setSelectedDossierProject(p);
            const foundIdx = localizedProjects.findIndex((item) => item.id === p.id);
            if (foundIdx !== -1) setActiveProjectIdx(foundIdx);
          }}
          allProjects={localizedProjects}
        />
      )}

      {/* Work Portfolio Index Modal */}
      <CinemaWorkIndexModal
        isOpen={isWorkModalOpen}
        onClose={() => setIsWorkModalOpen(false)}
        projects={localizedProjects}
        onSelectProject={(p) => {
          const foundIdx = localizedProjects.findIndex((item) => item.id === p.id);
          if (foundIdx !== -1) setActiveProjectIdx(foundIdx);
          setSelectedDossierProject(p);
        }}
      />

      {/* Info / Curatorial Manifesto Modal */}
      <CinemaInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onOpenSubmit={onOpenSubmit}
      />
    </div>
  );
};
