import React, { useState, useEffect, useRef } from 'react';

export const INTRO_STORAGE_KEY = 'vaiure_intro_completed_v1';

// In-memory fallback if localStorage is disabled or restricted in private browsing
let memoryIntroCompleted = false;

/**
 * Checks whether the VAIURE cinematic intro has already completed for this client profile.
 * Handles storage exceptions (e.g. private browsing, cookies disabled) safely.
 */
export function checkIsIntroCompleted(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(INTRO_STORAGE_KEY);
    if (val === 'true') {
      return true;
    }
  } catch {
    return memoryIntroCompleted;
  }
  return memoryIntroCompleted;
}

/**
 * Marks the intro as permanently completed in persistent browser storage.
 */
export function saveIntroCompleted(): void {
  memoryIntroCompleted = true;
  try {
    localStorage.setItem(INTRO_STORAGE_KEY, 'true');
  } catch {
    // Graceful fallback for restricted storage environments
  }
}

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

type IntroPhase = 'INITIAL_BLACK' | 'REVEAL' | 'HOLD' | 'FADE_OUT' | 'DONE';

export const CinematicIntro: React.FC<CinematicIntroProps> = ({
  onComplete,
  forcePlay = false,
}) => {
  // Synchronously evaluate whether the intro must be displayed before mounting any overlay
  const shouldPlayInitially = () => {
    if (typeof window === 'undefined') return false;

    // Check URL parameters for explicit manual preview or test (?intro or ?replay)
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('intro') || urlParams.has('replay')) {
        return true;
      }
    } catch {
      // Ignore URL parsing errors
    }

    if (forcePlay) {
      return true;
    }

    // Default to false on initial load so Slide 0 Motion Hero plays unobstructed
    return false;
  };

  const [shouldRender, setShouldRender] = useState<boolean>(shouldPlayInitially);
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldPlayInitially() ? 'INITIAL_BLACK' : 'DONE'
  );
  const [isImageReady, setIsImageReady] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasStartedRef = useRef(false);

  const clearAllTimers = () => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current = [];
  };

  const handleFinish = () => {
    clearAllTimers();
    setPhase('DONE');
    setShouldRender(false);
    saveIntroCompleted();
    onComplete?.();
  };

  // Immediate skip on Escape, Space, Enter, or Click
  const handleQuickSkip = () => {
    if (phase === 'FADE_OUT' || phase === 'DONE') return;
    setPhase('FADE_OUT');
    const t = setTimeout(() => {
      handleFinish();
    }, 350);
    timersRef.current.push(t);
  };

  // React to dynamic forcePlay triggers (e.g. from the Brand Drawer "Replay Intro" button)
  useEffect(() => {
    if (forcePlay) {
      hasStartedRef.current = false;
      clearAllTimers();
      setPhase('INITIAL_BLACK');
      setShouldRender(true);
    }
  }, [forcePlay]);

  useEffect(() => {
    if (!shouldRender || phase === 'DONE') {
      return;
    }

    // Respect user's accessibility preference: prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      // Rapid minimal reveal for reduced motion
      const t = setTimeout(() => {
        handleFinish();
      }, 350);
      timersRef.current.push(t);
      return;
    }

    // Preload logo image
    const img = new Image();
    img.src = '/vaiure-logo.png';
    const markReady = () => setIsImageReady(true);
    if (img.complete) {
      markReady();
    } else {
      img.onload = markReady;
      img.onerror = markReady; // Fail-safe fallback: don't hang if image fails
    }

    // Prevent duplicate timer sequence from React 18 Strict Mode
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Phase 1: Pure Black Screen (approx. 280ms)
    const t1 = setTimeout(() => {
      setPhase('REVEAL');
    }, 280);

    // Phase 2: Logo Reveal duration (1050ms) -> transitions to Phase 3: Quiet Hold
    const t2 = setTimeout(() => {
      setPhase('HOLD');
    }, 280 + 1050);

    // Phase 3: Quiet Hold duration (420ms) -> transitions to Phase 4: Fade Out into platform
    const t3 = setTimeout(() => {
      setPhase('FADE_OUT');
    }, 280 + 1050 + 420);

    // Phase 4: Dissolve into Website (550ms) -> complete, save localStorage and unmount
    const t4 = setTimeout(() => {
      handleFinish();
    }, 280 + 1050 + 420 + 550);

    timersRef.current = [t1, t2, t3, t4];

    // Absolute fallback: intro must never block the app longer than 3.2 seconds under any circumstance
    const safetyFallback = setTimeout(() => {
      handleFinish();
    }, 3200);
    timersRef.current.push(safetyFallback);

    // Keyboard navigation accessibility: allow quick skip with Escape, Space, or Enter
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleQuickSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearAllTimers();
      hasStartedRef.current = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRender]);

  // When intro is not active or already completed, return null immediately with zero overhead
  if (!shouldRender || phase === 'DONE') {
    return null;
  }

  const isVisible = phase === 'REVEAL' || phase === 'HOLD' || phase === 'FADE_OUT';
  const isFadingOut = phase === 'FADE_OUT';

  return (
    <aside
      aria-label="VAIURE Brand Introduction"
      aria-live="polite"
      onClick={handleQuickSkip}
      className={`fixed inset-0 z-[99999] bg-[#000000] flex items-center justify-center select-none overflow-hidden cursor-default transition-opacity duration-[550ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
      }`}
    >
      {/* Centered Logo Container — Scaled proportionally for mobile, tablet, and desktop */}
      <div className="relative w-full max-w-[880px] px-6 sm:px-12 md:px-16 flex items-center justify-center">
        <div
          className={`w-full flex items-center justify-center transition-all duration-[1050ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isVisible
              ? 'opacity-100 scale-100 blur-none'
              : 'opacity-0 scale-[0.985] blur-[3px]'
          }`}
        >
          {/* Exact VAIURE Brand Logo Asset (Wordmark + AI VISUAL NETWORK | 唯昱尔) */}
          <img
            src="/vaiure-logo.png"
            alt="VAIURE — AI VISUAL NETWORK | 唯昱尔"
            className="w-full h-auto max-h-[35vh] sm:max-h-[42vh] object-contain pointer-events-none"
            style={{
              aspectRatio: '2400 / 1000',
              imageRendering: 'auto',
            }}
          />
        </div>
      </div>
    </aside>
  );
};
