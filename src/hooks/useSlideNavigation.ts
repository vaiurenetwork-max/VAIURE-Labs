import React, { useState, useEffect, useRef, useCallback } from 'react';

export type SlideIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface UseSlideNavigationOptions {
  initialSlide?: SlideIndex;
  totalSlides?: number;
  swipeThreshold?: number; // default 60px
  transitionDurationMs?: number; // default 240ms
  isModalOpen?: boolean;
  enableSwipe?: boolean; // default false to prevent accidental auto-sliding & false clicks
  enableKeyboard?: boolean; // default false to prevent accidental key sliding
}

/**
 * Check if touch/pointer target is inside an interactive control or protected zone
 */
function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;

  // 1. Standard interactive controls
  const interactiveSelector = [
    'button',
    'a[href]',
    'input',
    'textarea',
    'select',
    'option',
    '[role="button"]',
    '[role="link"]',
    '[role="slider"]',
    '[role="tab"]',
    '[role="dialog"]',
    '[role="menu"]',
    '[role="menuitem"]',
    '[role="combobox"]',
    '[role="listbox"]',
    '[contenteditable="true"]',
    'video',
    'audio',
  ].join(', ');

  if (target.closest(interactiveSelector)) {
    return true;
  }

  // 2. Custom exclusion attributes across the application (e.g. Slide 4 SharedWorks Canvas)
  const customExclusionSelector = [
    '[data-no-swipe]',
    '[data-no-slide-swipe]',
    '.no-slide-swipe',
    '[data-interactive]',
    '[data-slide4-workspace]',
    '.slide4-protected-zone',
    '[data-video-player]',
    '[data-media-player]',
    '[data-timeline]',
    '[data-seedance-workspace]',
    '.seedance-workspace',
    'pre',
    'code',
    '.modal',
    '[data-modal]',
  ].join(', ');

  if (target.closest(customExclusionSelector)) {
    return true;
  }

  // 3. Horizontally scrollable containers (e.g. cinema project ribbon, sub-tabs)
  let el: Element | null = target;
  while (el && el !== document.body && el !== document.documentElement) {
    if (el.scrollWidth > el.clientWidth + 12) {
      const style = window.getComputedStyle(el);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
        return true;
      }
    }
    const style = window.getComputedStyle(el);
    if (style.touchAction === 'none' || style.touchAction.includes('pan-x')) {
      return true;
    }
    el = el.parentElement;
  }

  return false;
}

export function useSlideNavigation({
  initialSlide = 0,
  totalSlides = 5,
  swipeThreshold = 60,
  transitionDurationMs = 240,
  isModalOpen = false,
  enableSwipe = false,
  enableKeyboard = false,
}: UseSlideNavigationOptions = {}) {
  const [currentSlide, setCurrentSlide] = useState<SlideIndex>(initialSlide);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Transition animation lock
  const isTransitioningRef = useRef<boolean>(false);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current active gesture state ref
  const gestureStateRef = useRef<{
    source: 'touch' | 'mouse' | 'pointer';
    touchId?: number;
    pointerId?: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    startTime: number;
    direction: 'undetermined' | 'horizontal' | 'vertical';
  } | null>(null);

  // Synchronized state refs for event listeners
  const currentSlideRef = useRef(currentSlide);
  currentSlideRef.current = currentSlide;

  const totalSlidesRef = useRef(totalSlides);
  totalSlidesRef.current = totalSlides;

  const isModalOpenRef = useRef(isModalOpen);
  isModalOpenRef.current = isModalOpen;

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  // Lock transitions during animation
  const lockTransition = useCallback(() => {
    isTransitioningRef.current = true;
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
    }, transitionDurationMs);
  }, [transitionDurationMs]);

  // Direct slide navigation (always allowed via explicit UI actions)
  const goToSlide = useCallback(
    (index: SlideIndex) => {
      if (index >= 0 && index < totalSlides && index !== currentSlide) {
        lockTransition();
        setDragOffsetPx(0);
        setIsDragging(false);
        setCurrentSlide(index);
      }
    },
    [currentSlide, totalSlides, lockTransition]
  );

  const nextSlide = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentSlideRef.current < totalSlidesRef.current - 1) {
      lockTransition();
      setDragOffsetPx(0);
      setIsDragging(false);
      setCurrentSlide((prev) => (Math.min(totalSlidesRef.current - 1, prev + 1) as SlideIndex));
    } else {
      setDragOffsetPx(0);
      setIsDragging(false);
    }
  }, [lockTransition]);

  const previousSlide = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentSlideRef.current > 0) {
      lockTransition();
      setDragOffsetPx(0);
      setIsDragging(false);
      setCurrentSlide((prev) => (Math.max(0, prev - 1) as SlideIndex));
    } else {
      setDragOffsetPx(0);
      setIsDragging(false);
    }
  }, [lockTransition]);

  /**
   * Complete gesture evaluation when user lifts finger/mouse
   */
  const handleGestureEnd = useCallback(
    (diffX: number, diffY: number, elapsed: number, wasHorizontal: boolean) => {
      gestureStateRef.current = null;

      if (wasHorizontal && enableSwipe) {
        const absX = Math.abs(diffX);
        const absY = Math.abs(diffY);
        const velocity = elapsed > 0 ? absX / elapsed : 0; // px/ms

        const isValidSwipe =
          (absX >= swipeThreshold || (velocity >= 0.28 && absX >= 36)) &&
          absX >= absY * 1.25 &&
          elapsed <= 1000;

        if (isValidSwipe && !isTransitioningRef.current) {
          if (diffX < 0 && currentSlideRef.current < totalSlidesRef.current - 1) {
            nextSlide();
            return;
          } else if (diffX > 0 && currentSlideRef.current > 0) {
            previousSlide();
            return;
          }
        }
      }

      // Smooth spring back to current position
      setDragOffsetPx(0);
      setIsDragging(false);
    },
    [swipeThreshold, nextSlide, previousSlide, enableSwipe]
  );

  /**
   * Mount Native Touch & Pointer Engine ONLY when enableSwipe is true
   */
  useEffect(() => {
    if (!enableSwipe) {
      setDragOffsetPx(0);
      setIsDragging(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (isModalOpenRef.current || isTransitioningRef.current) return;

      if (e.touches.length !== 1) {
        gestureStateRef.current = null;
        setDragOffsetPx(0);
        setIsDragging(false);
        return;
      }

      const touch = e.touches[0];
      if (isInteractiveElement(touch.target)) {
        gestureStateRef.current = null;
        return;
      }

      gestureStateRef.current = {
        source: 'touch',
        touchId: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: Date.now(),
        direction: 'undetermined',
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureStateRef.current;
      if (!g || g.source !== 'touch') return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      if (touch.identifier !== g.touchId) return;

      g.currentX = touch.clientX;
      g.currentY = touch.clientY;

      const diffX = g.currentX - g.startX;
      const diffY = g.currentY - g.startY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (g.direction === 'undetermined') {
        if (absX >= 18 || absY >= 14) {
          if (absX >= 18 && absX >= absY * 2.2) {
            g.direction = 'horizontal';
            setIsDragging(true);
            try {
              window.getSelection()?.removeAllRanges();
            } catch (_err) {}
          } else {
            g.direction = 'vertical';
            return;
          }
        }
      }

      if (g.direction === 'horizontal') {
        if (e.cancelable) {
          e.preventDefault();
        }

        let effectiveOffset = diffX;
        const curSlide = currentSlideRef.current;
        const maxSlide = totalSlidesRef.current - 1;

        if ((curSlide === 0 && diffX > 0) || (curSlide === maxSlide && diffX < 0)) {
          effectiveOffset = diffX * 0.22;
        }

        setDragOffsetPx(effectiveOffset);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = gestureStateRef.current;
      if (!g || g.source !== 'touch') return;

      const touch = e.changedTouches[0];
      if (touch && touch.identifier === g.touchId) {
        g.currentX = touch.clientX;
        g.currentY = touch.clientY;
      }

      const diffX = g.currentX - g.startX;
      const diffY = g.currentY - g.startY;
      const elapsed = Date.now() - g.startTime;
      const wasHorizontal = g.direction === 'horizontal';

      handleGestureEnd(diffX, diffY, elapsed, wasHorizontal);
    };

    const onTouchCancel = () => {
      gestureStateRef.current = null;
      setDragOffsetPx(0);
      setIsDragging(false);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [handleGestureEnd, enableSwipe]);

  // Physical Keyboard Navigation (Only when enableKeyboard is true)
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen || isTransitioningRef.current) return;

      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable ||
          activeEl.getAttribute('role') === 'slider' ||
          activeEl.closest('input, textarea, select, [contenteditable="true"], [role="slider"]'))
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, nextSlide, previousSlide, enableKeyboard]);

  return {
    containerRef,
    currentSlide,
    goToSlide,
    nextSlide,
    previousSlide,
    canGoPrev,
    canGoNext,
    isReducedMotion,
    isDragging,
    dragOffsetPx,
  };
}
