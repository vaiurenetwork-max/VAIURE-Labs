import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  HYBRID_STUDIO_DEPARTMENTS,
  SEEDANCE_PIPELINE_STAGES,
  StudioDepartment,
  getLocalizedStudioDepartments,
} from '../../data/hybridStudioData';
import { CinemaProjectDossierModal } from './CinemaProjectDossierModal';
import { CinemaWorkIndexModal } from './CinemaWorkIndexModal';
import { CinemaInfoModal } from './CinemaInfoModal';
import { useLanguage } from '../../services/i18n';
import {
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Maximize2,
  Layers,
  Play,
  Pause,
  Cpu,
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
  onOpenMenu,
  onOpenSubmit,
}) => {
  const { language } = useLanguage();
  const [activeDeptIdx, setActiveDeptIdx] = useState(0);
  const [selectedDossierDept, setSelectedDossierDept] = useState<StudioDepartment | null>(null);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [timecode, setTimecode] = useState('01 : 58 : 15');
  const ribbonScrollRef = useRef<HTMLDivElement>(null);

  const [touchHeroStartX, setTouchHeroStartX] = useState<number | null>(null);
  const [touchHeroStartY, setTouchHeroStartY] = useState<number | null>(null);
  const [isAutoCycling, setIsAutoCycling] = useState(false);

  const localizedDepartments = useMemo(() => {
    return getLocalizedStudioDepartments(HYBRID_STUDIO_DEPARTMENTS, language);
  }, [language]);

  const activeDept = localizedDepartments[activeDeptIdx] || localizedDepartments[0];

  // Procedural Web Audio Studio Room Tone (subtle low-frequency architectural acoustic resonance)
  const toggleAmbientSound = () => {
    if (isMuted) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
          masterGain.connect(ctx.destination);
          gainNodeRef.current = masterGain;

          const osc1 = ctx.createOscillator();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(55, ctx.currentTime);

          const osc2 = ctx.createOscillator();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(82.4, ctx.currentTime);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(240, ctx.currentTime);

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
          gainNodeRef.current.gain.setTargetAtTime(0.08, audioCtxRef.current.currentTime, 0.4);
        }
        setIsMuted(false);
      } catch {
        setIsMuted(false);
      }
    } else {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.3);
      }
      setIsMuted(true);
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  // 24fps production facility sync timecode
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
    }, 41.67);

    return () => clearInterval(interval);
  }, []);

  // Optional automated studio tour cycle
  useEffect(() => {
    if (!isAutoCycling || selectedDossierDept || isFacilityModalOpen || isInfoModalOpen) return;
    const cycleTimer = setInterval(() => {
      setActiveDeptIdx((prev) => (prev + 1) % localizedDepartments.length);
    }, 6500);
    return () => clearInterval(cycleTimer);
  }, [isAutoCycling, localizedDepartments.length, selectedDossierDept, isFacilityModalOpen, isInfoModalOpen]);

  // Keyboard switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedDossierDept || isFacilityModalOpen || isInfoModalOpen) return;
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveDeptIdx((prev) => (prev + 1) % localizedDepartments.length);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveDeptIdx((prev) => (prev - 1 + localizedDepartments.length) % localizedDepartments.length);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setSelectedDossierDept(activeDept);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDossierDept, isFacilityModalOpen, isInfoModalOpen, activeDept, localizedDepartments.length]);

  useEffect(() => {
    if (ribbonScrollRef.current) {
      const activeEl = ribbonScrollRef.current.children[activeDeptIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeDeptIdx]);

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
        setActiveDeptIdx((prev) => (prev + 1) % localizedDepartments.length);
      } else {
        setActiveDeptIdx((prev) => (prev - 1 + localizedDepartments.length) % localizedDepartments.length);
      }
    }
    setTouchHeroStartX(null);
    setTouchHeroStartY(null);
  };

  const handleSelectPipelineStage = (departmentId: string) => {
    const idx = localizedDepartments.findIndex((d) => d.id === departmentId);
    if (idx !== -1) {
      setActiveDeptIdx(idx);
    }
  };

  return (
    <div
      onTouchStart={handleHeroTouchStart}
      onTouchEnd={handleHeroTouchEnd}
      className="relative w-full h-full min-h-0 bg-[#050507] text-[#ECECE9] overflow-hidden select-none flex flex-col justify-between font-sans"
    >
      {/* ======================================================== */}
      {/* 1. ARCHITECTURAL HYBRID STUDIO FULL-BLEED VISUALIZATION  */}
      {/* ======================================================== */}
      <div
        onClick={() => setSelectedDossierDept(activeDept)}
        className="absolute inset-0 z-0 overflow-hidden cursor-pointer group select-none"
        title="Inspect studio department architectural blueprint"
      >
        <div className="relative w-full h-full">
          {localizedDepartments.map((dept, idx) => (
            <div
              key={dept.id}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                activeDeptIdx === idx ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
              }`}
            >
              <img
                src={dept.heroImage}
                alt={dept.title}
                className={`w-full h-full object-cover object-center filter contrast-[1.08] brightness-[0.86] transition-transform duration-[8000ms] ease-out will-change-transform transform-gpu group-hover:scale-[1.02] ${
                  activeDeptIdx === idx ? 'animate-cinema-motion' : ''
                }`}
              />
              {/* Architectural chiaroscuro + subtle cobalt edge atmosphere */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-black/35 to-black/65 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/80 via-transparent to-black/30 pointer-events-none" />
              <div className="absolute inset-0 film-grain pointer-events-none opacity-35" />
            </div>
          ))}
        </div>

        {/* Center Hover Cue */}
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="px-4 py-2 rounded-sm bg-black/75 backdrop-blur-md border border-white/25 text-white text-[11px] font-mono uppercase tracking-widest flex items-center gap-2 shadow-2xl">
            <span>INSPECT ZONE BLUEPRINT</span>
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP PRESENTATION HEADER (PRESERVING VAIURE CHROME)    */}
      {/* ======================================================== */}
      <header className="relative z-30 w-full px-4 sm:px-6 pt-[max(0rem,env(safe-area-inset-top))] h-[calc(2.75rem+env(safe-area-inset-top))] sm:h-[calc(3rem+env(safe-area-inset-top))] flex items-center justify-between text-xs font-mono tracking-wider select-none bg-gradient-to-b from-black/90 to-transparent">
        {/* Left: Brand Identity + Slide Switcher */}
        <div className="flex items-center gap-3">
          <button
            type="button"
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

          <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-white/15 text-[10px] font-mono text-white/45">
            {onBackToSlideOne && (
              <button
                type="button"
                onClick={onBackToSlideOne}
                title="Slide 01: Threads Discourse"
                className="px-1.5 py-0.5 rounded-sm hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                01
              </button>
            )}
            {onBackToSlideTwo && (
              <button
                type="button"
                onClick={onBackToSlideTwo}
                title="Slide 02: Curatorial Archive"
                className="px-1.5 py-0.5 rounded-sm hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                02
              </button>
            )}
            <span className="px-1.5 py-0.5 rounded-sm bg-white text-black font-bold">03</span>
            {onGoToLabs && (
              <button
                type="button"
                onClick={onGoToLabs}
                title="Slide 04: VAIURE Seedance 2.5 Studio"
                className="px-1.5 py-0.5 rounded-sm hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                04
              </button>
            )}
          </div>
        </div>

        {/* Center: Live Facility Telemetry Whisper */}
        <div className="hidden md:flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-white/55 tabular-nums whitespace-nowrap shrink-0">
          <span>{timecode}</span>
          <span className="text-white/25" aria-hidden="true">·</span>
          <span>SEEDANCE 2.5 COMPLEX</span>
          <span className="text-white/25" aria-hidden="true">·</span>
          <span className="text-white/80">
            {String(activeDeptIdx + 1).padStart(2, '0')} / {String(localizedDepartments.length).padStart(2, '0')}
          </span>
        </div>

        {/* Right Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAutoCycling((prev) => !prev)}
            className={`min-h-[44px] sm:min-h-[32px] px-2 sm:px-2.5 flex items-center gap-1.5 rounded-sm border text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isAutoCycling
                ? 'bg-white text-black border-white font-semibold'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/75 hover:text-white'
            }`}
            title={isAutoCycling ? 'Pause facility tour' : 'Auto-tour studio zones'}
            aria-label={isAutoCycling ? 'Pause facility tour' : 'Auto-tour studio zones'}
          >
            {isAutoCycling ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span className="hidden md:inline">{isAutoCycling ? 'TOUR ON' : 'TOUR'}</span>
          </button>

          <button
            type="button"
            onClick={toggleAmbientSound}
            className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors cursor-pointer shrink-0"
            title={isMuted ? 'Enable Studio Acoustics' : 'Mute Studio Acoustics'}
            aria-label={isMuted ? 'Enable Studio Acoustics' : 'Mute Studio Acoustics'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-white" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFacilityModalOpen(true)}
            className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-[10px] font-mono text-white/85 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 rounded-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="View Complete Facility Architecture & Pipeline"
          >
            <span>FACILITY</span>
          </button>

          <button
            type="button"
            onClick={() => setIsInfoModalOpen(true)}
            className="hidden sm:flex min-h-[32px] px-2.5 py-1 items-center text-[10px] font-mono text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Studio Architecture Specs"
          >
            <span>SPECS</span>
          </button>

          {onGoToLabs && (
            <button
              type="button"
              onClick={onGoToLabs}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-mono text-white bg-blue-600/25 hover:bg-blue-600/40 border border-blue-400/40 rounded-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Launch Seedance 2.5 Generation Workspace (Slide 04)"
            >
              <Cpu className="w-3 h-3 text-blue-300" />
              <span>STUDIO</span>
            </button>
          )}

          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open Navigation Menu"
              className="min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white transition-colors cursor-pointer shrink-0"
              title="Open Navigation Menu"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. HERO METADATA + SEEDANCE 2.5 PRODUCTION PIPELINE      */}
      {/* ======================================================== */}
      <div className="relative z-20 px-4 sm:px-8 lg:px-12 flex-1 flex flex-col justify-end pb-3 sm:pb-5 md:pb-6 pointer-events-none">
        <div className="w-full max-w-5xl space-y-3 pointer-events-auto">
          {/* Quiet Kicker */}
          <div className="inline-flex flex-wrap items-center gap-2 text-[10px] sm:text-xs font-mono tracking-[0.2em] uppercase text-white/75">
            <span className="w-2.5 h-[1px] bg-blue-400" />
            <span className="text-blue-400 font-semibold">AI HYBRID PRODUCTION STUDIO</span>
            <span className="text-white/35">·</span>
            <span>{activeDept.code}</span>
            <span className="text-white/35">·</span>
            <span className="text-white/55">{activeDept.zoneLabel}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold uppercase tracking-tight text-white leading-[1.05] drop-shadow-md">
            {activeDept.title}
          </h1>

          <p className="text-xs sm:text-base md:text-lg font-serif italic text-white/85 font-light max-w-2xl line-clamp-2">
            {activeDept.subtitle}
          </p>

          {/* Interactive Seedance 2.5 Production Pipeline Bar */}
          <div className="pt-1 hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SEEDANCE_PIPELINE_STAGES.map((stage, idx) => {
              const isStageActive = activeDept.pipelineStageIds.includes(stage.id);
              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectPipelineStage(stage.departmentId)}
                    title={`${stage.label}: ${stage.summary}`}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider border rounded-sm transition-all cursor-pointer whitespace-nowrap ${
                      isStageActive
                        ? 'bg-blue-950/75 border-blue-400/70 text-white font-semibold'
                        : 'bg-black/55 border-white/15 text-white/55 hover:text-white hover:border-white/40'
                    }`}
                  >
                    <span className="text-blue-400/90 mr-1.5">{stage.step}</span>
                    <span>{stage.label}</span>
                  </button>
                  {idx < SEEDANCE_PIPELINE_STAGES.length - 1 && (
                    <span className="text-white/25 text-[10px] font-mono select-none">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Primary Actions */}
          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedDossierDept(activeDept)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sm bg-white/10 hover:bg-white/20 active:scale-95 border border-white/25 text-[10px] font-mono tracking-widest text-white uppercase backdrop-blur-md transition-all cursor-pointer"
              title="Inspect department architecture and equipment dossier"
            >
              <span>INSPECT DEPARTMENT</span>
              <ArrowRight className="w-3 h-3 text-white/80" />
            </button>

            {onGoToLabs && (
              <button
                type="button"
                onClick={onGoToLabs}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sm bg-white text-black hover:bg-white/90 active:scale-95 text-[10px] font-mono font-bold tracking-widest uppercase transition-all cursor-pointer"
                title="Open Seedance 2.5 Generation Studio"
              >
                <span>LAUNCH SEEDANCE 2.5 LAB</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM DEPARTMENT NAVIGATION RIBBON                   */}
      {/* ======================================================== */}
      <footer
        data-no-slide-swipe="true"
        className="relative z-30 w-full bg-[#050507]/90 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 lg:px-12 py-2.5 sm:py-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] select-none"
      >
        <div
          className="absolute top-0 left-0 h-[1.5px] bg-blue-400 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
          style={{ width: `${((activeDeptIdx + 1) / Math.max(1, localizedDepartments.length)) * 100}%` }}
          aria-hidden="true"
        />

        <div className="w-full flex items-center justify-between gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() =>
              setActiveDeptIdx((prev) => (prev - 1 + localizedDepartments.length) % localizedDepartments.length)
            }
            className="hidden sm:flex min-w-[36px] min-h-[36px] items-center justify-center rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title="Previous department (←)"
            aria-label="Previous department"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            data-no-slide-swipe="true"
            ref={ribbonScrollRef}
            className="flex-1 flex items-center gap-3.5 sm:gap-5 lg:gap-7 overflow-x-auto no-scrollbar scroll-smooth py-1 scroll-touch-snap"
          >
            {localizedDepartments.map((dept, idx) => {
              const isActive = activeDeptIdx === idx;
              return (
                <div
                  key={dept.id}
                  onClick={() => setActiveDeptIdx(idx)}
                  className={`touch-press scroll-touch-item flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer transition-all duration-300 group py-1 touch-target-min ${
                    isActive ? 'opacity-100' : 'opacity-45 hover:opacity-85'
                  }`}
                >
                  <div className="w-1.5 flex justify-center">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-blue-400' : 'bg-white/25 group-hover:bg-white/45'
                      }`}
                    />
                  </div>

                  <div
                    className={`relative w-14 h-9 sm:w-22 sm:h-13 md:w-28 md:h-16 overflow-hidden bg-neutral-950 flex-shrink-0 border transition-all duration-300 rounded-[2px] ${
                      isActive
                        ? 'border-white shadow-lg ring-1 ring-blue-400/50'
                        : 'border-white/15 group-hover:border-white/40'
                    }`}
                  >
                    <img
                      src={dept.thumbnailImage}
                      alt={dept.title}
                      className="w-full h-full object-cover filter contrast-[1.08] group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="text-[10px] sm:text-[11px] font-mono leading-tight space-y-0.5 select-text min-w-0">
                    <p className="font-bold text-white uppercase tracking-tight truncate max-w-[105px] sm:max-w-[175px]">
                      {dept.title}
                    </p>
                    <p className="font-medium text-blue-400/90 uppercase tracking-tight truncate text-[9px] sm:text-[10px] max-w-[105px] sm:max-w-[175px]">
                      {dept.code}
                    </p>
                    <p className="hidden md:block text-white/50 text-[9px] sm:text-[10px] uppercase tracking-wider truncate">
                      {dept.categoryLabel}
                    </p>
                    <p className="hidden lg:block text-white/40 text-[9px] sm:text-[10px] truncate max-w-[175px]">
                      {dept.leadRole}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex sm:hidden items-center text-[10px] font-mono text-white/60 tracking-widest pl-1 tabular-nums">
            <span>0{activeDeptIdx + 1}</span>
            <span className="text-white/30 mx-1">/</span>
            <span className="text-white/40">0{localizedDepartments.length}</span>
          </div>

          <button
            type="button"
            onClick={() => setActiveDeptIdx((prev) => (prev + 1) % localizedDepartments.length)}
            className="hidden sm:flex p-2 rounded-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
            title="Next department (→)"
            aria-label="Next department"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>

      {/* ======================================================== */}
      {/* 5. ARCHITECTURAL DOSSIER & FACILITY MODALS               */}
      {/* ======================================================== */}
      {selectedDossierDept && (
        <CinemaProjectDossierModal
          department={selectedDossierDept}
          onClose={() => setSelectedDossierDept(null)}
          onSelectDepartment={(d) => {
            setSelectedDossierDept(d);
            const foundIdx = localizedDepartments.findIndex((item) => item.id === d.id);
            if (foundIdx !== -1) setActiveDeptIdx(foundIdx);
          }}
          allDepartments={localizedDepartments}
          onGoToLabs={onGoToLabs}
        />
      )}

      <CinemaWorkIndexModal
        isOpen={isFacilityModalOpen}
        onClose={() => setIsFacilityModalOpen(false)}
        departments={localizedDepartments}
        onSelectDepartment={(d) => {
          const foundIdx = localizedDepartments.findIndex((item) => item.id === d.id);
          if (foundIdx !== -1) setActiveDeptIdx(foundIdx);
          setSelectedDossierDept(d);
        }}
        onGoToLabs={onGoToLabs}
      />

      <CinemaInfoModal
        isOpen={isInfoModalOpen}
        onClose={() => setIsInfoModalOpen(false)}
        onOpenSubmit={onOpenSubmit}
      />
    </div>
  );
};
