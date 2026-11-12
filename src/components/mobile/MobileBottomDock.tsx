/**
 * VAIURE — MOBILE BOTTOM NAVIGATION DOCK
 * Touch-optimized bottom navigation with safe-area support, swipe-down-to-collapse,
 * and conflict-free positioning with LiveMultiplayerDock.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home,
  Plus,
  User,
  MessageCircle,
  Film,
  Play,
  Compass,
  Sparkles,
  ChevronDown,
  GripHorizontal,
} from 'lucide-react';
import { useLanguage } from '../../services/i18n';
import { Z_LAYERS } from '../../constants/zLayers';

interface MobileBottomDockProps {
  activeSection: string;
  onNavigate: (sectionId: string) => void;
  onOpenCreatePost: () => void;
  onOpenUserProfile: () => void;
  onOpenThreads: () => void;
  onOpenCinema?: () => void;
  onOpenLabs?: () => void;
  onOpenShorts?: () => void;
  onCollapseChange?: (isCollapsed: boolean) => void;
}

const INACTIVITY_DURATION_MS = 12000; // Auto-compact after 12s idle

export const MobileBottomDock: React.FC<MobileBottomDockProps> = ({
  activeSection,
  onNavigate,
  onOpenCreatePost,
  onOpenUserProfile,
  onOpenThreads,
  onOpenCinema,
  onOpenLabs,
  onOpenShorts,
  onCollapseChange,
}) => {
  const { t } = useLanguage();
  const [isCompact, setIsCompact] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch gesture state for swipe down to collapse
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    onCollapseChange?.(isCompact);
  }, [isCompact, onCollapseChange]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsCompact(true);
    }, INACTIVITY_DURATION_MS);
  }, [clearTimer]);

  useEffect(() => {
    resetTimer();
    return () => clearTimer();
  }, [resetTimer, clearTimer]);

  useEffect(() => {
    if (!isCompact) {
      resetTimer();
    }
  }, [activeSection, isCompact, resetTimer]);

  // Handle clicking compact icon
  const handlePopOut = () => {
    setIsCompact(false);
    resetTimer();
  };

  const handleAction = (action: () => void) => {
    resetTimer();
    action();
  };

  // Touch handlers to swipe down to collapse
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchEndY - touchStartY.current;

    // If dragged downward by > 30px, collapse dock
    if (diffY > 30) {
      setIsCompact(true);
    }
    touchStartY.current = null;
  };

  return (
    <div className={`relative w-full select-none ${Z_LAYERS.FLOATING_DOCK}`}>
      {/* 1. COMPACT POP-IN TRIGGER (Bottom-Left anchor with >= 44px touch target) */}
      <div
        className={`fixed left-4 sm:left-6 bottom-[max(0.75rem,env(safe-area-inset-bottom))] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCompact
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
        }`}
        aria-hidden={!isCompact}
      >
        <button
          onClick={handlePopOut}
          aria-label="Expand mobile navigation dock"
          title="Expand navigation menu"
          className="w-12 h-12 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 hover:border-white/50 text-white shadow-[0_8px_32px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 pointer-events-auto group min-h-[44px] min-w-[44px]"
        >
          <Compass className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* 2. EXPANDED MOBILE BOTTOM DOCK */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`w-full bg-black/95 backdrop-blur-xl border-t border-white/[0.1] pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.85)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCompact
            ? 'opacity-0 translate-y-full pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        }`}
        aria-hidden={isCompact}
      >
        {/* Swipe-down indicator bar */}
        <div className="w-full flex justify-center pt-1.5 pb-0.5">
          <div className="w-10 h-1 rounded-full bg-white/20 hover:bg-white/40 cursor-grab" title="Swipe down to minimize dock" />
        </div>

        <nav
          role="navigation"
          aria-label="Mobile Bottom Navigation"
          className="max-w-[620px] mx-auto px-4 py-1.5 flex items-center justify-between w-full pointer-events-auto"
        >
          {/* Destination 1: Home / Top */}
          <button
            onClick={() => handleAction(() => onNavigate('hero'))}
            tabIndex={isCompact ? -1 : 0}
            aria-label={t('home')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'hero' ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'
            }`}
            title="Return to top"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Destination 2: Shorts */}
          {onOpenShorts && (
            <button
              onClick={() => handleAction(onOpenShorts)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="Shorts"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Shorts"
            >
              <Play className="w-5 h-5" />
            </button>
          )}

          {/* Destination 3: Threads Feed (Slide 01) */}
          <button
            onClick={() => handleAction(onOpenThreads)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Threads Feed"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Threads Feed (Slide 01)"
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Destination 4: Center [+] Create Action */}
          <button
            onClick={() => handleAction(onOpenCreatePost)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Create Post"
            className="w-11 h-9 rounded-xl bg-white text-black font-bold flex items-center justify-center hover:bg-white/90 active:scale-95 transition-all shadow-sm cursor-pointer min-h-[44px] min-w-[44px]"
            title="Create Post"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Destination 5: Cinema (Slide 03) */}
          {onOpenCinema && (
            <button
              onClick={() => handleAction(onOpenCinema)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="Cinema Archive"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Cinema Archive (Slide 03)"
            >
              <Film className="w-5 h-5" />
            </button>
          )}

          {/* Destination 6: Labs (Slide 04) */}
          {onOpenLabs && (
            <button
              onClick={() => handleAction(onOpenLabs)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="Seedance Lab"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Seedance Lab (Slide 04)"
            >
              <Sparkles className="w-5 h-5" />
            </button>
          )}

          {/* Destination 7: User Profile */}
          <button
            onClick={() => handleAction(onOpenUserProfile)}
            tabIndex={isCompact ? -1 : 0}
            aria-label={t('profile')}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 rounded-xl text-white/60 hover:text-white transition-colors cursor-pointer"
            title="Profile"
          >
            <User className="w-5 h-5" />
          </button>

          {/* Collapse Icon */}
          <button
            onClick={() => setIsCompact(true)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Hide navigation bar"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
            title="Hide navigation bar"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </nav>
      </div>
    </div>
  );
};
