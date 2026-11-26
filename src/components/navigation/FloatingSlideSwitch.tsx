/**
 * VAIURE — INTELLIGENT RESPONSIVE FLOATING SLIDE SWITCH
 *
 * Non-conflicting default anchor at bottom-left (shifts above mobile bottom bars on Slides 01 & 02),
 * draggable with edge snapping, Escape / tap-outside collapse, and ⌘K Command Palette shortcut.
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
  Command,
} from 'lucide-react';
import { Z_LAYERS } from '../../constants/zLayers';

export interface FloatingSlideSwitchProps {
  activeSlide: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  onSelectSlide: (slideIdx: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  onMinimize?: () => void;
  onHide?: () => void;
  onOpenCommandPalette?: () => void;
  onPrefetchDestination?: (target: string) => void;
}

export const SLIDE_DEFINITIONS: Array<{
  id: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  code: string;
  name: string;
  badge?: string;
}> = [
  { id: 0, code: '00', name: 'HERO' },
  { id: 1, code: '01', name: 'THREADS', badge: 'FEED' },
  { id: 2, code: '02', name: 'ARCHIVE', badge: 'MAGAZINE' },
  { id: 3, code: '03', name: 'AI STUDIO', badge: 'HYBRID' },
  { id: 4, code: '04', name: 'SEEDANCE LAB', badge: 'SEEDANCE 2.5' },
  { id: 5, code: '05', name: 'FU LABS', badge: '3D' },
  { id: 6, code: '06', name: 'VX', badge: 'VISION' },
  { id: 7, code: '07', name: 'VAIBYTE CANVAS', badge: 'STUDIO' },
];

type DockPosition = 'bottom-left' | 'top-right' | 'bottom-center';

export const FloatingSlideSwitch: React.FC<FloatingSlideSwitchProps> = ({
  activeSlide,
  onSelectSlide,
  onMinimize,
  onHide,
  onOpenCommandPalette,
  onPrefetchDestination,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('vaiure_slide_switch_collapsed');
      if (stored !== null) return stored === 'true';
      return true;
    } catch {
      return true;
    }
  });

  const [dockPos, setDockPos] = useState<DockPosition>(() => {
    try {
      const saved = localStorage.getItem('vaiure_slide_switch_dock_v2');
      if (saved === 'top-right' || saved === 'bottom-center' || saved === 'bottom-left') {
        return saved;
      }
      return 'bottom-left';
    } catch {
      return 'bottom-left';
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);

  const switchRef = useRef<HTMLDivElement | null>(null);

  // Collapse on click outside or Escape
  useEffect(() => {
    if (isCollapsed) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (switchRef.current && !switchRef.current.contains(e.target as Node)) {
        setIsCollapsed(true);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCollapsed(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    window.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isCollapsed]);

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

  const cycleDockPosition = useCallback((newPos?: DockPosition) => {
    setDragOffset(null);
    setDockPos((prev) => {
      const target =
        newPos ||
        (prev === 'bottom-left'
          ? 'bottom-center'
          : prev === 'bottom-center'
          ? 'top-right'
          : 'bottom-left');
      try {
        localStorage.setItem('vaiure_slide_switch_dock_v2', target);
      } catch {
        // ignore
      }
      return target;
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button:not([data-drag-handle="true"])')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
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

    if (dragOffset) {
      const windowHeight = window.innerHeight;
      const elRect = switchRef.current?.getBoundingClientRect();
      if (elRect) {
        if (elRect.top < windowHeight * 0.35) {
          cycleDockPosition('top-right');
        } else if (elRect.left > window.innerWidth * 0.35 && elRect.left < window.innerWidth * 0.65) {
          cycleDockPosition('bottom-center');
        } else {
          cycleDockPosition('bottom-left');
        }
      }
    }

    dragStartRef.current = null;
  };

  const currentMeta =
    SLIDE_DEFINITIONS.find((s) => s.id === activeSlide) || SLIDE_DEFINITIONS[0];

  const isBottomNavSlide = activeSlide === 1 || activeSlide === 2;

  const getPositionClasses = () => {
    if (dragOffset) return '';

    switch (dockPos) {
      case 'top-right':
        return 'top-[max(0.75rem,env(safe-area-inset-top))] right-4 sm:right-6';
      case 'bottom-center':
        return isBottomNavSlide
          ? 'bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4rem))] sm:bottom-4 left-1/2 -translate-x-1/2'
          : 'bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2';
      case 'bottom-left':
      default:
        return isBottomNavSlide
          ? 'bottom-[max(4.75rem,calc(env(safe-area-inset-bottom)+4rem))] sm:bottom-4 left-3 sm:left-4'
          : 'bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 left-3 sm:left-4';
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
      {isCollapsed ? (
        <div className="flex items-center gap-1 p-1 rounded-full bg-[#0a0a0d]/92 border border-white/20 shadow-[0_10px_34px_rgba(0,0,0,0.85)] text-white">
          <button
            type="button"
            onMouseEnter={() => onPrefetchDestination?.('menu-all')}
            onFocus={() => onPrefetchDestination?.('menu-all')}
            onClick={() => {
              onPrefetchDestination?.('menu-all');
              toggleCollapse();
            }}
            className="flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full hover:bg-white/[0.08] transition-all cursor-pointer group active:scale-95 min-h-[44px] sm:min-h-[36px] whitespace-nowrap shrink-0"
            title="Switch Stage / Workspace"
            aria-label="Expand Slide Switcher"
          >
            <Layers className="w-3.5 h-3.5 text-white/85 shrink-0" />
            <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.16em] uppercase font-bold text-white tabular-nums">
              {currentMeta.code} · {currentMeta.name}
            </span>
            <ChevronUp className="w-3.5 h-3.5 text-white/45 group-hover:text-white transition-colors" />
          </button>

          {onOpenCommandPalette && (
            <button
              type="button"
              onMouseEnter={() => onPrefetchDestination?.('command-palette')}
              onFocus={() => onPrefetchDestination?.('command-palette')}
              onClick={onOpenCommandPalette}
              title="Command Palette (⌘K)"
              aria-label="Open Command Palette"
              className="hidden sm:flex items-center gap-1 px-2.5 h-8 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/15 hover:border-white/30 text-[10px] font-mono text-white/65 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1 p-1.5 rounded-2xl sm:rounded-full bg-[#0a0a0e]/95 border border-white/25 shadow-[0_18px_50px_rgba(0,0,0,0.92)] text-[10px] sm:text-[11px] font-mono tracking-[0.14em] uppercase text-white animate-silk-fade max-w-[94vw] overflow-x-auto scrollbar-none">
          <div
            data-drag-handle="true"
            className="hidden sm:flex items-center justify-center px-1.5 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/80 transition-colors shrink-0"
            title="Drag to reposition"
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>

          {SLIDE_DEFINITIONS.map((s) => {
            const isActive = activeSlide === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onMouseEnter={() => {
                  if (s.id > 0) onPrefetchDestination?.(`slide-${s.id}`);
                }}
                onFocus={() => {
                  if (s.id > 0) onPrefetchDestination?.(`slide-${s.id}`);
                }}
                onClick={() => {
                  onSelectSlide(s.id);
                  if (window.innerWidth < 768) setIsCollapsed(true);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer shrink-0 whitespace-nowrap flex items-center gap-1.5 min-h-[44px] sm:min-h-[32px] justify-center tabular-nums ${
                  isActive
                    ? 'bg-white text-black font-bold'
                    : 'text-white/65 hover:text-white hover:bg-white/[0.08]'
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

          <span className="text-white/15 shrink-0 px-0.5">|</span>

          {onOpenCommandPalette && (
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(true);
                onOpenCommandPalette();
              }}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-white/65 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[32px]"
              title="Open Command Palette (⌘K)"
            >
              <Command className="w-3 h-3" />
              <span className="text-[9px]">K</span>
            </button>
          )}

          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="px-2.5 py-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-[32px] flex items-center"
              title="Minimize workspace to Hero dock"
              aria-label="Minimize slide"
            >
              MIN
            </button>
          )}

          <button
            type="button"
            onClick={() => cycleDockPosition()}
            className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center"
            title={`Reposition Dock (${dockPos})`}
            aria-label="Switch dock position"
          >
            {dockPos === 'top-right' ? (
              <ArrowDown className="w-3.5 h-3.5" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px]"
            title="Collapse switcher"
            aria-label="Collapse slide switcher"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="w-8 h-8 rounded-full text-white/45 hover:text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[32px] flex items-center justify-center"
              title="Return to Motion Hero (Slide 00)"
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
