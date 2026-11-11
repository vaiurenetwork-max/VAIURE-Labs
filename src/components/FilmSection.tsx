import React, { useEffect, useRef } from 'react';
import { SocialPost } from '../types/social';
import { Play } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FilmSectionProps {
  posts: SocialPost[];
  onSelectFilm: (film: SocialPost) => void;
}

export const FilmSection: React.FC<FilmSectionProps> = ({ posts, onSelectFilm }) => {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const filmPosts = posts.filter(
    (p) => p.postType === 'short_film' || p.category === 'CINEMA'
  );

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
            { opacity: 0, y: index % 2 === 0 ? 18 : 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              delay: index * 0.08,
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
  }, [filmPosts]);

  return (
    <section
      ref={sectionRef}
      id="film"
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
              {t('navFilm')}
            </h2>
          </div>
          <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase">
            {t('cinemaFilmArchive')}
          </span>
        </div>

        {/* Real Dynamic Grid or Minimal Empty State */}
        {filmPosts.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            {t('noWorkYet')}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filmPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectFilm(post)}
                data-cursor="PLAY"
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all flex flex-col will-change-transform"
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-neutral-900">
                  {post.media[0]?.url ? (
                    <img
                      src={post.media[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-white/40 bg-black/60 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 group-hover:border-white transition-all duration-300">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-white/10 space-y-1">
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white group-hover:text-white/80 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs font-mono text-white/50">
                    @{post.authorUsername}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
