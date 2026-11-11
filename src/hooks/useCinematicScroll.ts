import { useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export function useCinematicScroll() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mediaMobile = window.matchMedia('(max-width: 768px)');

    setIsReducedMotion(mediaReduced.matches);
    setIsMobile(mediaMobile.matches);

    const handleReducedChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    mediaReduced.addEventListener('change', handleReducedChange);
    mediaMobile.addEventListener('change', handleMobileChange);

    return () => {
      mediaReduced.removeEventListener('change', handleReducedChange);
      mediaMobile.removeEventListener('change', handleMobileChange);
    };
  }, []);

  return {
    isReducedMotion,
    isMobile,
    gsap,
    ScrollTrigger,
  };
}
