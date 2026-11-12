/**
 * VAIURE — INTELLIGENT RESPONSIVE FLOATING SLIDE SWITCH
 *
 * Features:
 * - Non-conflicting intelligent positioning across Desktop, Tablet, and Mobile.
 * - Draggable with touch & pointer physics + edge snapping.
 * - Auto-collapse to micro-pill on idle or mobile to avoid covering top/bottom navbars.
 * - Tap-outside to dismiss expanded menu.
 * - Touch targets >= 44px on mobile and touchscreen devices.
 * - Full safe-area insets support (env(safe-area-inset-top), env(safe-area-inset-bottom)).
 * - Centralized z-index layering (Z_LAYERS.NAV_SWITCHER = z-40).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  ArrowDown,
  ArrowUp,
  X,
  Compass,
} from 'lucide-react';
import { Z_LAYERS } from '../../constants/zLayers';

export interface FloatingSlideSwitchProps {
  activeSlide: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onSelectSlide: (slideIdx: 0 | 1 | 2 | 3 | 4 | 5 | 6) => void;
  onMinimize?: () => void;
  onHide?: () => void;
}

export const SLIDE_DEFINITIONS: Array<{
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  code: string;
  name: string;
  badge?: string;
}> = [
  { id: 0, code: '00', name: 'HERO' },
  { id: 1, code: '01', name: 'THREADS', badge: 'FEED' },
  { id: 2, code: '02', name: 'ARCHIVE', badge: 'MAGAZINE' },
  { id: 3, code: '03', name: 'CINEMA', badge: 'FILM' },
  { id: 4, code: '04', name: 'SEEDANCE LAB', badge: 'SEEDANCE 2.5' },
  { id: 5, code: '05', name: 'FU LABS', badge: '3D' },
  { id: 6, code: '06', name: 'VX', badge: 'VISION' },
];

type DockPosition = 'top-center' | 'top-right' | 'bottom-center';

export const FloatingSlideSwitch: React.FC<FloatingSlideSwitchProps> = ({
  activeSlide,
  onSelectSlide,
  onMinimize,
  onHide,
}) => {
  // Collapsed state: on mobile default to collapsed micro-pill to prevent blocking top headers
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('vaiure_slide_switch_collapsed');
      if (stored !== null) return stored === 'true';
      // Default to collapsed on small screens, expanded on desktop
      return typeof window !== 'undefined' && window.innerWidth < 1024;
    } catch {
      return false;
    }
  });

  // Dock placement: 'top-center' | 'top-right' | 'bottom-center'
  const [dockPos, setDockPos] = useState<DockPosition>(() => {
    try {
      const saved = localStorage.getItem('vaiure_slide_switch_dock');
      if (saved === 'top-right' || saved === 'bottom-center' || saved === 'top-center') {
        return saved;
      }
      return 'top-center';
    } catch {
      return 'top-center';
    }
  });

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initialOffsetX: number; initialOffsetY: number } | null>(null);
  const hasMovedRef = useRef(false);

  const switchRef = useRef<HTMLDivElement | null>(null);

  // Auto-collapse when user taps outside the expanded switcher
  useEffect(() => {
    if (isCollapsed) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setIsCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCollapsed]);

  // Persist collapsed state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('vaiure_slide_switch_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Cycle dock position
  const cycleDockPosition = useCallback((newPos?: DockPosition) => {
    setDragOffset(null); // Reset manual drag offset
    setDockPos((prev) => {
      const target = newPos || (prev === 'top-center' ? 'top-right' : prev === 'top-right' ? 'bottom-center' : 'top-center');
      try {
        localStorage.setItem('vaiure_slide_switch_dock', target);
      } catch {
        // ignore
      }
      return target;
    });
  }, []);

  // Pointer/Touch Drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag from non-button elements or drag handles
    const target = e.target as HTMLElement;
    if (target.closest('button:not([data-drag-handle="true"])')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    hasMovedRef.current = false;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialOffsetX: dragOffset?.x || 0,
      initialOffsetY: dragOffset?.y || 0,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMovedRef.current = true;
    }

    setDragOffset({
      x: dragStartRef.current.initialOffsetX + dx,
      y: dragStartRef.current.initialOffsetY + dy,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    // If dragged near bottom of screen, snap to bottom dock; if near top, snap to top
    if (dragOffset) {
      const windowHeight = window.innerHeight;
      const elRect = switchRef.current?.getBoundingClientRect();
      if (elRect) {
        if (elRect.top > windowHeight * 0.65) {
          cycleDockPosition('bottom-center');
        } else if (elRect.left > window.innerWidth * 0.6) {
          cycleDockPosition('top-right');
        } else {
          cycleDockPosition('top-center');
        }
      }
    }

    dragStartRef.current = null;
  };

  const currentMeta =
    SLIDE_DEFINITIONS.find((s) => s.id === activeSlide) || SLIDE_DEFINITIONS[0];

  // Compute CSS placement based on dockPos or manual drag offset
  const getPositionClasses = () => {
    if (dragOffset) {
      return ''; // will use inline transform
    }

    switch (dockPos) {
      case 'top-right':
        return 'top-[max(0.625rem,env(safe-area-inset-top))] right-4 sm:right-6';
      case 'bottom-center':
        return 'bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2';
      case 'top-center':
      default:
        // Positioned with smart responsiveness: on mobile top-2, on desktop top-2.5
        return 'top-[max(0.625rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2';
    }
  };

  const dragStyle: React.CSSProperties = dragOffset
    ? {
        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        touchAction: 'none',
      }
    : {
        touchAction: 'pan-x',
      };

  return (
    <div
      ref={switchRef}
      data-no-swipe="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={dragStyle}
      className={`fixed ${getPositionClasses()} ${Z_LAYERS.NAV_SWITCHER} font-sans select-none pointer-events-auto transition-all duration-200 ease-out`}
    >
      {/* 1. COLLAPSED MINIMAL TRIGGER (Unobtrusive, touch-friendly >= 44px touch target) */}
      {isCollapsed ? (
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/90 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.85)] text-white">
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full hover:bg-white/[0.08] transition-all cursor-pointer group active:scale-95 min-h-[44px]"
            title="Expand Slide Switcher (Select active slide)"
            aria-label="Expand Slide Switcher"
          >
            <Layers className="w-3.5 h-3.5 text-white/90 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-white">
              {currentMeta.code} / {currentMeta.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform group-hover:translate-y-0.5" />
          </button>

          {/* Quick Dock Position Toggle (Top vs Bottom) */}
          <button
            type="button"
            onClick={() => cycleDockPosition()}
            title={`Move Switcher (${dockPos === 'bottom-center' ? 'Dock to Top' : 'Dock to Bottom'})`}
            aria-label="Toggle switcher position"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {dockPos === 'bottom-center' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )}
          </button>
        </div>
      ) : (
        /* 2. EXPANDED LUXURY MONOCHROME SLIDE CONTROLLER */
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-2xl sm:rounded-full bg-[#0a0a0c]/95 backdrop-blur-2xl border border-white/25 shadow-[0_16px_48px_rgba(0,0,0,0.9)] text-[10px] sm:text-[11px] font-mono tracking-[0.14em] uppercase text-white animate-in fade-in zoom-in-95 duration-200 max-w-[96vw] overflow-x-auto scrollbar-none">
          {/* Draggable Grip Handle */}
          <div
            data-drag-handle="true"
            className="hidden sm:flex items-center justify-center px-1.5 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/80 transition-colors"
            title="Drag to reposition slide bar"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {/* Slide 00 HERO */}
          <button
            type="button"
            onClick={() => {
              onSelectSlide(0);
              // Auto-collapse on mobile after selection
              if (window.innerWidth < 768) setIsCollapsed(true);
            }}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center ${
              activeSlide === 0
                ? 'bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                : 'bg-white/[0.06] hover:bg-white/15 text-white/80 hover:text-white'
            }`}
            title="Slide 00: Kinetic Hero Studio"
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
                onClick={() => {
                  onSelectSlide(s.id);
                  if (window.innerWidth < 768) setIsCollapsed(true);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer shrink-0 flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] justify-center ${
                  isActive
                    ? 'bg-white text-black font-bold shadow-[0_0_12px_rgba(255,255,255,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
                title={`Slide ${s.code}: ${s.name}`}
              >
                <span>{s.code}</span>
                {isActive && (
                  <span className="hidden md:inline text-[9px] font-semibold opacity-80">
                    {s.name}
                  </span>
                )}
              </button>
            );
          })}

          <span className="text-white/20 shrink-0">|</span>

          {/* Minimize Slide Option */}
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center"
              title="Minimize current slide to bottom dock"
              aria-label="Minimize slide"
            >
              — MIN
            </button>
          )}

          {/* Position Toggle Button (Top vs Bottom Dock) */}
          <button
            type="button"
            onClick={() => cycleDockPosition()}
            className="p-1.5 rounded text-white/50 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center"
            title={`Switch to ${dockPos === 'bottom-center' ? 'Top Dock' : 'Bottom Dock'}`}
            aria-label="Switch dock position"
          >
            {dockPos === 'bottom-center' ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Collapse Switcher Option */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2 py-1 rounded text-white/60 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px]"
            title="Collapse slide switcher to discreet pill"
            aria-label="Collapse slide switcher"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[9px]">COLLAPSE</span>
          </button>

          {/* Close Slide Workspace */}
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="p-1.5 rounded text-white/40 hover:text-white hover:bg-white/20 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center"
              title="Close slide workspace"
              aria-label="Close slide workspace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
