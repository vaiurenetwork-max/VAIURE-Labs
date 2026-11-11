import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, Plus, User, MessageCircle, Film, Play, Compass, Sparkles, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../services/i18n';

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

const INACTIVITY_DURATION_MS = 10000; // Inactivity duration before transitioning to compact icon

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

  // Notify parent of collapse state changes if provided
  useEffect(() => {
    onCollapseChange?.(isCompact);
  }, [isCompact, onCollapseChange]);

  // Clear inactivity timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Reset 10-second inactivity timer
  const resetTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      setIsCompact(true);
    }, INACTIVITY_DURATION_MS);
  }, [clearTimer]);

  // Initial mount starts the countdown
  useEffect(() => {
    resetTimer();
    return () => clearTimer();
  }, [resetTimer, clearTimer]);

  // Reset timer on active section changes
  useEffect(() => {
    if (!isCompact) {
      resetTimer();
    }
  }, [activeSection, isCompact, resetTimer]);

  // Listen to archive scroll to reset the timer when user is actively reading
  useEffect(() => {
    const handleScroll = () => {
      if (!isCompact) {
        resetTimer();
      }
    };
    const container = document.getElementById('slide-archive-container');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isCompact, resetTimer]);

  // Handle clicking the compact icon to pop-out full navbar menu immediately
  const handlePopOut = () => {
    setIsCompact(false);
    resetTimer();
  };

  // Wrapper for navigation actions that resets the countdown
  const handleAction = (action: () => void) => {
    resetTimer();
    action();
  };

  return (
    <div className="relative w-full select-none">
      {/* 1. COMPACT POP-IN ICON (Docked at BOTTOM-LEFT so it NEVER conflicts with LiveMultiplayerDock at bottom-right) */}
      <div
        className={`absolute left-4 sm:left-6 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCompact
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-75 translate-y-2 pointer-events-none'
        }`}
        aria-hidden={!isCompact}
      >
        <button
          onClick={handlePopOut}
          aria-label="Expand navigation menu"
          title="Expand navigation menu"
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/95 backdrop-blur-md border border-neutral-800 hover:border-neutral-600 text-white shadow-[0_8px_32px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 pointer-events-auto group"
        >
          <Compass className="w-5 h-5 stroke-[1.8] text-white group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>

      {/* 2. NORMAL NAVBAR MENU (Default anchored footer, just icons without text wordings, same colors like Slide 1) */}
      <div
        className={`w-full bg-black/95 backdrop-blur-md border-t border-neutral-900 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCompact
            ? 'opacity-0 translate-y-full pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        }`}
        aria-hidden={isCompact}
      >
        <nav
          role="navigation"
          aria-label="Slide 2 Bottom Navigation"
          className="max-w-[620px] mx-auto px-6 py-2.5 flex items-center justify-between w-full pointer-events-auto"
        >
          {/* Destination 1: Home / Top */}
          <button
            onClick={() => handleAction(() => onNavigate('hero'))}
            tabIndex={isCompact ? -1 : 0}
            aria-label={t('home')}
            className={`p-2 transition-colors cursor-pointer ${
              activeSection === 'hero' ? 'text-white' : 'text-neutral-500 hover:text-white'
            }`}
            title="Return to top"
          >
            <Home className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Destination 2: Shorts (Vertical Social Video) */}
          {onOpenShorts && (
            <button
              onClick={() => handleAction(onOpenShorts)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="Shorts"
              className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              title="Shorts"
            >
              <Play className="w-6 h-6 stroke-[2]" />
            </button>
          )}

          {/* Destination 3: Threads Feed (Slide 01) */}
          <button
            onClick={() => handleAction(onOpenThreads)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Threads Feed"
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            title="Threads Feed (Slide 01)"
          >
            <MessageCircle className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Destination 4: Center [+] Create Action (Matching Slide 1 compose button style) */}
          <button
            onClick={() => handleAction(onOpenCreatePost)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Create Post"
            className="w-10 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white hover:bg-neutral-800 active:scale-95 transition-all shadow-sm cursor-pointer"
            title="Create Post"
          >
            <Plus className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Destination 5: Cinema (Slide 03) */}
          {onOpenCinema && (
            <button
              onClick={() => handleAction(onOpenCinema)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="Cinema Archive"
              className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              title="Cinema Archive (Slide 03)"
            >
              <Film className="w-6 h-6 stroke-[2]" />
            </button>
          )}

          {/* Destination 6: Labs (Slide 04) */}
          {onOpenLabs && (
            <button
              onClick={() => handleAction(onOpenLabs)}
              tabIndex={isCompact ? -1 : 0}
              aria-label="VAIURE Labs"
              className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
              title="VAIURE Labs Studio (Slide 04)"
            >
              <Sparkles className="w-6 h-6 stroke-[2]" />
            </button>
          )}

          {/* Destination 6: User Profile */}
          <button
            onClick={() => handleAction(onOpenUserProfile)}
            tabIndex={isCompact ? -1 : 0}
            aria-label={t('profile')}
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            title="Profile"
          >
            <User className="w-6 h-6 stroke-[2]" />
          </button>

          {/* Hide / Collapse Navigation Dock Button */}
          <button
            onClick={() => setIsCompact(true)}
            tabIndex={isCompact ? -1 : 0}
            aria-label="Hide navigation bar"
            className="p-2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
            title="Hide navigation bar"
          >
            <ChevronDown className="w-5 h-5 stroke-[2]" />
          </button>
        </nav>
      </div>
    </div>
  );
};
