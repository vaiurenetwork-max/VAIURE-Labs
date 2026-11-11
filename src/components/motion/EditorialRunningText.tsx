import React, { useEffect, useRef } from 'react';

interface EditorialRunningTextProps {
  items: string[];
  direction?: 'left' | 'right';
  baseSpeed?: number;
  separator?: string;
  className?: string;
}

/**
 * EditorialRunningText — Cinematic Scroll-Responsive Running Typography
 *
 * Implements:
 * 1. Continuous smooth horizontal movement without visual gaps.
 * 2. Velocity-responsive scrolling (accelerates subtly with scroll speed, eases back smoothly).
 * 3. Directional contrast support (left or right).
 * 4. Automatic pause / reduced motion compliance.
 * 5. Hardware-accelerated GPU transforms (translate3d).
 */
export const EditorialRunningText: React.FC<EditorialRunningTextProps> = ({
  items,
  direction = 'left',
  baseSpeed = 0.5,
  separator = '/',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const velocityRef = useRef(0);
  const lastScrollYRef = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Check reduced motion preference
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollYRef.current;
      lastScrollYRef.current = currentScrollY;

      // Add bounded velocity boost based on scroll delta
      // Positive scroll (downward) accelerates forward; negative scroll (upward) subtly eases or reverses
      const scrollFactor = Math.min(Math.max(deltaY * 0.08, -6), 6);
      velocityRef.current += scrollFactor;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    const dirMultiplier = direction === 'left' ? -1 : 1;

    const tick = () => {
      if (isVisible && trackRef.current) {
        // Damping velocity back to 0
        velocityRef.current *= 0.92;

        const effectiveSpeed = (baseSpeed + velocityRef.current) * dirMultiplier;
        offsetRef.current += effectiveSpeed;

        const trackWidth = trackRef.current.scrollWidth / 3;

        // Wrap offset seamlessly
        if (direction === 'left') {
          if (offsetRef.current <= -trackWidth) {
            offsetRef.current += trackWidth;
          } else if (offsetRef.current > 0) {
            offsetRef.current -= trackWidth;
          }
        } else {
          if (offsetRef.current >= 0) {
            offsetRef.current -= trackWidth;
          } else if (offsetRef.current < -trackWidth) {
            offsetRef.current += trackWidth;
          }
        }

        trackRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [baseSpeed, direction]);

  // Repeat items 3 times for a seamless looping track
  const renderedItems = [...items, ...items, ...items];

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden select-none border-y border-white/10 bg-[#050507] py-3.5 sm:py-4.5 ${className}`}
      aria-hidden="true"
    >
      {/* Subtle edge fades for editorial continuity */}
      <div className="absolute inset-y-0 left-0 w-12 sm:w-24 bg-gradient-to-r from-[#050507] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 sm:w-24 bg-gradient-to-l from-[#050507] to-transparent z-10 pointer-events-none" />

      <div
        ref={trackRef}
        className="flex items-center whitespace-nowrap will-change-transform font-mono text-[10px] sm:text-xs tracking-[0.3em] uppercase text-white/45"
        style={{ transform: 'translate3d(0, 0, 0)' }}
      >
        {renderedItems.map((text, idx) => (
          <div key={idx} className="flex items-center flex-shrink-0">
            <span className="hover:text-white/80 transition-colors">{text}</span>
            <span className="mx-4 sm:mx-6 text-white/20 font-light">{separator}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
