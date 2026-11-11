import React, { useEffect, useRef } from 'react';
import { SocialPost } from '../types/social';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FeaturedStorySectionProps {
  featuredPost?: SocialPost | null;
  onOpenStory: (post: SocialPost) => void;
}

export const FeaturedStorySection: React.FC<FeaturedStorySectionProps> = ({
  featuredPost,
  onOpenStory,
}) => {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const ctx = gsap.context(() => {
      // 1. Image reveal: transitions from subtle zoom scale(1.05) to scale(1.00) on scroll
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { scale: 1.05, y: isMobile ? 8 : 16 },
          {
            scale: 1.0,
            y: isMobile ? -8 : -16,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 1.2,
            },
          }
        );
      }

      // 2. Editorial typography reveal: enters viewport with elegant short timing
      if (contentRef.current) {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 1.1,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 75%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  if (!featuredPost) {
    return (
      <section id="featured-story" className="relative w-full bg-[#050507] border-b border-white/10 py-16 px-4 sm:px-6 md:px-12 select-text">
        <div className="max-w-[1440px] mx-auto text-center py-16 border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
          {t('noFeaturedYet')}
        </div>
      </section>
    );
  }

  const coverImage = featuredPost.media[0]?.url || '';

  return (
    <section
      ref={sectionRef}
      id="featured-story"
      className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div
            onClick={() => onOpenStory(featuredPost)}
            data-cursor="VIEW"
            className="lg:col-span-7 aspect-[16/9] overflow-hidden bg-neutral-900 border border-white/10 cursor-pointer group relative"
          >
            {coverImage ? (
              <img
                ref={imageRef}
                src={coverImage}
                alt={featuredPost.title}
                className="w-full h-full object-cover filter grayscale contrast-[1.08] will-change-transform transform-gpu group-hover:contrast-[1.15] transition-all duration-700"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
              <span className="text-[11px] font-mono tracking-[0.25em] text-white uppercase flex items-center gap-2">
                <span>{t('viewDossier')}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>

          <div ref={contentRef} className="lg:col-span-5 space-y-4">
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
              FEATURED // {featuredPost.category}
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif uppercase tracking-tight text-white leading-tight">
              {featuredPost.title}
            </h2>
            {featuredPost.caption && (
              <p className="text-sm font-light text-neutral-300 leading-relaxed">
                {featuredPost.caption}
              </p>
            )}
            <p className="text-xs font-mono text-white/50">
              BY @{featuredPost.authorUsername}
            </p>
            <div className="pt-2">
              <button
                onClick={() => onOpenStory(featuredPost)}
                className="group px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-all duration-300 text-xs font-mono tracking-widest uppercase font-semibold flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>{t('openWork')}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
