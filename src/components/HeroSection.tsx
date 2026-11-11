import React, { useEffect, useRef } from 'react';
import { HERO_IMAGE } from '../data/ivntriData';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface HeroSectionProps {
  onExplore: () => void;
  onOpenLeadStory: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onExplore, onOpenLeadStory }) => {
  const { t } = useLanguage();
  const heroRef = useRef<HTMLElement>(null);
  const bgImageRef = useRef<HTMLImageElement>(null);
  const utilityRibbonRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const exploreBadgeRef = useRef<HTMLButtonElement>(null);
  const bottomMetaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!heroRef.current) return;

    // Accessibility check: respects prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      return;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // Use GSAP context for safe cleanup
    const ctx = gsap.context(() => {
      // 1. Initial Page Load — Quiet Editorial Settle
      const loadTl = gsap.timeline({ defaults: { ease: 'power2.out' } });

      loadTl.fromTo(
        headlineRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 1.4, delay: 0.1 }
      );

      if (descriptionRef.current) {
        loadTl.fromTo(
          descriptionRef.current,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 1.2 },
          '-=0.9'
        );
      }

      if (buttonsRef.current) {
        loadTl.fromTo(
          buttonsRef.current,
          { opacity: 0, y: 8 },
          { opacity: 1, y: 0, duration: 1.0 },
          '-=0.8'
        );
      }

      // 2. Scroll-Scrubbed Cinematic Motion (ScrollTrigger)
      // Connects hero animation smoothly to #slide-archive-container scroll position
      const scrollerEl = document.getElementById('slide-archive-container') || window;
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          scroller: scrollerEl,
          start: 'top top',
          end: 'bottom top',
          scrub: 1.1,
          invalidateOnRefresh: true,
        },
      });

      // Background visual: slow, restrained zoom (1.00 -> ~1.07) & subtle parallax shift
      if (bgImageRef.current) {
        scrollTl.to(
          bgImageRef.current,
          {
            scale: isMobile ? 1.04 : 1.075,
            y: isMobile ? 25 : 55,
            ease: 'none',
          },
          0
        );
      }

      // Layered typography depth: different elements move at distinct subtle speeds
      if (utilityRibbonRef.current) {
        scrollTl.to(
          utilityRibbonRef.current,
          {
            y: -10,
            opacity: 0.3,
            ease: 'none',
          },
          0
        );
      }

      if (eyebrowRef.current) {
        scrollTl.to(
          eyebrowRef.current,
          {
            y: isMobile ? -8 : -14,
            opacity: 0.8,
            ease: 'none',
          },
          0
        );
      }

      // Monumental headline: moves upward, opacity reduces very gradually
      if (headlineRef.current) {
        scrollTl.to(
          headlineRef.current,
          {
            y: isMobile ? -20 : -38,
            opacity: 0.65,
            ease: 'none',
          },
          0
        );
      }

      // Description moves at a differentiated pace
      if (descriptionRef.current) {
        scrollTl.to(
          descriptionRef.current,
          {
            y: isMobile ? -12 : -22,
            opacity: 0.72,
            ease: 'none',
          },
          0
        );
      }

      // Buttons move slightly slower
      if (buttonsRef.current) {
        scrollTl.to(
          buttonsRef.current,
          {
            y: isMobile ? -6 : -12,
            opacity: 0.82,
            ease: 'none',
          },
          0
        );
      }

      // Explore archive feed at bottom: subtly drifts & gently fades out before entering next section
      if (exploreBadgeRef.current) {
        scrollTl.to(
          exploreBadgeRef.current,
          {
            y: isMobile ? -10 : -20,
            opacity: 0,
            ease: 'power1.in',
          },
          0
        );
      }

      if (bottomMetaRef.current) {
        scrollTl.to(
          bottomMetaRef.current,
          {
            y: -10,
            opacity: 0,
            ease: 'power1.in',
          },
          0
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      id="hero"
      data-cursor="EXPLORE"
      className="relative min-h-[92vh] lg:min-h-screen w-full bg-[#050507] overflow-hidden flex flex-col justify-between pt-28 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 md:px-12 select-text"
    >
      {/* Background Cinematic Visual with smooth full-screen video loop */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <video
          src="/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover object-center will-change-transform transform-gpu"
        >
          <source src="/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4" type="video/mp4" />
        </video>
        {/* Measured dark gradient scrims for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050507] via-[#050507]/35 to-[#050507]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507]/80 via-[#050507]/25 to-transparent" />
        <div className="absolute inset-0 film-grain pointer-events-none" />
      </div>

      {/* Top Editorial Utility Ribbon */}
      <div
        ref={utilityRibbonRef}
        className="relative z-10 max-w-[1440px] w-full mx-auto flex items-center justify-between text-[10px] md:text-xs tracking-[0.25em] text-white/40 uppercase border-b border-white/10 pb-4 will-change-transform"
      >
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{t('curatedVisualArchive')}</span>
        </div>
        <span className="font-mono text-[10px]">{t('directory')}</span>
      </div>

      {/* Asymmetric Typography Composition */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto my-auto py-8 sm:py-16">
        <div className="max-w-4xl space-y-6">
          <div
            ref={eyebrowRef}
            className="inline-flex items-center gap-3 text-xs tracking-[0.28em] uppercase text-white/60 font-mono will-change-transform flex-wrap"
          >
            <span className="text-white font-medium tracking-[0.2em] font-sans text-[11px]">
              VAIURE 唯昱尔
            </span>
            <span className="text-white/25 hidden sm:inline">·</span>
            <span>{t('visualCulture')}</span>
            <span className="text-white/25 hidden sm:inline">·</span>
            <span className="text-white/45 font-light">{t('fashionCinemaArt')}</span>
          </div>

          {/* Monumental, Edge-aligned Display Headline */}
          <h1
            ref={headlineRef}
            className="text-4xl sm:text-6xl md:text-8xl lg:text-[7.5rem] font-serif font-light tracking-tight text-white leading-[0.95] sm:leading-[0.9] uppercase text-balance will-change-transform"
          >
            {t('theNewVisualCulture')}
          </h1>

          <div className="pt-4 max-w-xl space-y-6">
            <p
              ref={descriptionRef}
              className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed will-change-transform"
            >
              {t('heroSubtitle')}
            </p>

            <div ref={buttonsRef} className="flex flex-wrap items-center gap-4 pt-2 will-change-transform">
              <button
                onClick={onExplore}
                className="group px-6 py-3 bg-white text-black hover:bg-neutral-200 active:scale-[0.98] text-xs font-mono tracking-widest uppercase font-semibold transition-all duration-300 ease-editorial flex items-center gap-2.5 cursor-pointer shadow-lg"
              >
                <span>{t('exploreArchive')}</span>
                <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 ease-editorial group-hover:translate-y-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Editorial Coordinates */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto flex items-center justify-between pt-6 border-t border-white/10 text-xs font-mono text-white/40">
        <button
          ref={exploreBadgeRef}
          onClick={onExplore}
          className="group flex items-center gap-3 uppercase tracking-[0.25em] text-white/60 hover:text-white transition-colors duration-300 will-change-transform cursor-pointer"
        >
          <span>{t('exploreArchiveFeed')}</span>
          <ArrowDown className="w-3.5 h-3.5 transition-transform duration-300 ease-editorial group-hover:translate-y-1" />
        </button>

        <div
          ref={bottomMetaRef}
          className="hidden sm:block text-[11px] tracking-[0.22em] uppercase text-white/30 will-change-transform"
        >
          EDITORIAL VOL. XIV · LATENT MEDIUM CONTINUITY
        </div>
      </div>
    </section>
  );
};
