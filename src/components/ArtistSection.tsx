import React, { useEffect, useRef } from 'react';
import { UserProfile } from '../types/social';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface ArtistSectionProps {
  creators: Record<string, UserProfile>;
  onSelectArtist: (artist: UserProfile) => void;
}

export const ArtistSection: React.FC<ArtistSectionProps> = ({ creators, onSelectArtist }) => {
  const { t } = useLanguage();
  const creatorList = Array.from(
    new Map(
      (Object.values(creators) as UserProfile[])
        .filter((c): c is UserProfile => Boolean(c && c.id))
        .map((c) => [c.id, c])
    ).values()
  );
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const scrollerEl = document.getElementById('slide-archive-container') || window;

    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              scroller: scrollerEl,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      if (gridRef.current) {
        const cards = Array.from(gridRef.current.children) as HTMLElement[];
        cards.forEach((card, index) => {
          gsap.fromTo(
            card,
            { opacity: 0, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.8,
              delay: (index % 4) * 0.07,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                scroller: scrollerEl,
                start: 'top 90%',
                toggleActions: 'play none none none',
              },
            }
          );
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [creatorList]);

  return (
    <section
      ref={sectionRef}
      id="artists"
      className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12 gap-6"
        >
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              {t('navCreators')}
            </h2>
          </div>
          <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase">
            {t('communityDirectory')}
          </span>
        </div>

        {/* Real Creators List or Minimal Empty State */}
        {creatorList.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            {t('noCreatorsYet')}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creatorList.map((creator) => (
              <div
                key={creator.id}
                onClick={() => onSelectArtist(creator)}
                data-cursor="VIEW"
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all duration-300 p-6 flex flex-col justify-between bg-neutral-950/60 hover:-translate-y-1 will-change-transform"
              >
                <div>
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-white/20 bg-neutral-900 mb-5 flex items-center justify-center font-mono text-xs text-white/60 group-hover:border-white/40 transition-colors">
                    {Boolean(creator.avatar && creator.avatar.trim()) ? (
                      <img
                        src={creator.avatar}
                        alt=""
                        className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      (creator.username || 'IV').slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white group-hover:text-white/80 transition-colors">
                    {creator.displayName}
                  </h3>
                  <p className="text-xs font-mono text-white/40 mt-1">
                    @{creator.username}
                  </p>
                  {creator.role && (
                    <p className="text-[11px] font-mono text-white/60 uppercase mt-2">
                      {creator.role}
                    </p>
                  )}
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/40">
                  <span className="tabular-nums">
                    {creator.followersCount} FOLLOWERS
                  </span>
                  <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
