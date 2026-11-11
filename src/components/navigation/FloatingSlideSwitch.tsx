import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Layers, EyeOff } from 'lucide-react';

interface FloatingSlideSwitchProps {
  activeSlide: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onSelectSlide: (slideIdx: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  onMinimize?: () => void;
  onHide?: () => void;
}

const SLIDE_DEFINITIONS: Array<{
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  code: string;
  name: string;
  badge?: string;
}> = [
  { id: 0, code: '00', name: 'HERO' },
  { id: 1, code: '01', name: 'THREADS', badge: 'FEED' },
  { id: 2, code: '02', name: 'ARCHIVE', badge: 'MAGAZINE' },
  { id: 3, code: '03', name: 'CINEMA', badge: 'FILM' },
  { id: 4, code: '04', name: 'STUDIO', badge: 'LABS' },
  { id: 5, code: '05', name: 'FU LABS', badge: '3D' },
  { id: 6, code: '06', name: 'VX', badge: 'VISION' },
];

export const FloatingSlideSwitch: React.FC<FloatingSlideSwitchProps> = ({
  activeSlide,
  onSelectSlide,
  onMinimize,
  onHide,
}) => {
  // Support user collapsing/hiding the switcher to a minimalist non-intrusive micro-tab
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vaiure_slide_switch_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vaiure_slide_switch_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const currentMeta =
    SLIDE_DEFINITIONS.find((s) => s.id === activeSlide) || SLIDE_DEFINITIONS[0];

  return (
    <div
      data-no-swipe="true"
      className="fixed top-2.5 sm:top-3.5 left-1/2 -translate-x-1/2 z-[45] font-sans select-none pointer-events-auto transition-all duration-300 ease-out"
    >
      {/* 1. COLLAPSED MINIMAL TRIGGER (Completely unobtrusive, never overlays icons) */}
      {isCollapsed ? (
        <button
          type="button"
          onClick={toggleCollapse}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/85 backdrop-blur-xl border border-white/20 hover:border-white/50 text-white shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-all cursor-pointer group active:scale-95"
          title="Expand Slide Switcher (Press to reveal slide navigation)"
          aria-label="Expand Slide Switcher"
        >
          <Layers className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.14em] uppercase font-bold text-white/90 group-hover:text-white">
            {currentMeta.code} / {currentMeta.name}
          </span>
          <ChevronDown className="w-3 h-3 text-white/50 group-hover:text-white transition-transform group-hover:translate-y-0.5 ml-0.5" />
        </button>
      ) : (
        /* 2. EXPANDED LUXURY SLIDE CONTROLLER */
        <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full bg-[#0b0d11]/90 backdrop-blur-2xl border border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.85)] text-[9px] sm:text-[10px] font-mono tracking-[0.14em] uppercase text-white animate-in fade-in zoom-in-95 duration-200 max-w-[96vw] overflow-x-auto scrollbar-none">
          {/* Slide 00 HERO */}
          <button
            type="button"
            onClick={() => onSelectSlide(0)}
            className={`px-2 py-0.5 sm:py-1 rounded-full transition-all cursor-pointer shrink-0 ${
              activeSlide === 0
                ? 'bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                : 'bg-white/[0.08] hover:bg-white/20 text-white/80 hover:text-white'
            }`}
            title="Slide 00: Full Kinetic Motion Hero"
          >
            00 HERO
          </button>

          <span className="text-white/20 shrink-0">|</span>

          {/* Slides 01 to 06 */}
          {SLIDE_DEFINITIONS.filter((s) => s.id !== 0).map((s) => {
            const isActive = activeSlide === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSlide(s.id)}
                className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'text-white/55 hover:text-white hover:bg-white/10'
                }`}
                title={`Slide ${s.code}: ${s.name}`}
              >
                <span>{s.code}</span>
                {isActive && (
                  <span className="hidden md:inline text-[8px] opacity-75 font-semibold">
                    {s.name}
                  </span>
                )}
              </button>
            );
          })}

          <span className="text-white/20 shrink-0">|</span>

          {/* Minimize Option */}
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="px-1.5 py-0.5 rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
              title="Minimize current slide to bottom dock"
              aria-label="Minimize slide"
            >
              — MIN
            </button>
          )}

          {/* Hide/Collapse Switcher Option */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
            title="Collapse slide switcher to discreet pill"
            aria-label="Collapse slide switcher"
          >
            <ChevronUp className="w-3 h-3" />
            <span className="hidden sm:inline text-[8px]">HIDE</span>
          </button>

          {/* Complete Close to Slide 0 Hero */}
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="px-1.5 py-0.5 rounded text-red-300/80 hover:text-white hover:bg-red-500/30 transition-colors cursor-pointer shrink-0"
              title="Close slide workspace and return to full Hero"
              aria-label="Close slide workspace"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  );
};
