import React, { useState, useEffect, useRef } from 'react';
import { SocialPost } from '../types/social';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface FashionSectionProps {
  posts: SocialPost[];
  onSelectPost: (post: SocialPost) => void;
}

export const FashionSection: React.FC<FashionSectionProps> = ({ posts, onSelectPost }) => {
  const { t } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const categories = [
    'ALL',
    'EDITORIAL',
    'COUTURE',
    'LUXURY',
    'DIGITAL FASHION',
    'VIRTUAL MODELS',
    'CAMPAIGNS',
  ];

  const fashionPosts = posts.filter(
    (p) =>
      p.category === 'COUTURE' ||
      p.category === 'EDITORIAL' ||
      p.category === 'DIGITAL FASHION' ||
      p.postType === 'fashion_editorial'
  );

  const filteredPosts =
    selectedCategory === 'ALL'
      ? fashionPosts
      : fashionPosts.filter((p) => p.category === selectedCategory);

  useEffect(() => {
    if (!sectionRef.current) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    const scrollerEl = document.getElementById('slide-archive-container') || window;

    const ctx = gsap.context(() => {
      // 1. Header scroll-reveal
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

      // 2. Controlled Asymmetry Grid Motion
      if (gridRef.current) {
        const cards = Array.from(gridRef.current.children) as HTMLElement[];
        cards.forEach((card, index) => {
          const mod = index % 3;
          const delay = mod === 0 ? 0 : mod === 1 ? 0.1 : 0.04;
          const yOffset = mod === 0 ? 20 : mod === 1 ? 14 : 8;

          gsap.fromTo(
            card,
            { opacity: 0, y: yOffset },
            {
              opacity: 1,
              y: 0,
              duration: 0.85,
              delay,
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
  }, [filteredPosts]);

  return (
    <section
      ref={sectionRef}
      id="fashion"
      className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div
          ref={headerRef}
          className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12 gap-6 relative"
        >
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              {t('navFashion')}
            </h2>
          </div>

          {/* Segmented Category Tabs */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs tracking-[0.2em] font-medium text-white/50 font-mono">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-1 transition-colors uppercase relative cursor-pointer ${
                  selectedCategory === cat ? 'text-white font-semibold' : 'hover:text-white/80'
                }`}
              >
                {cat}
                {selectedCategory === cat && (
                  <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white transition-all" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Real Dynamic Grid or Minimal Empty State */}
        {filteredPosts.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            {t('noWorkYet')}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectPost(post)}
                data-cursor="VIEW"
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all flex flex-col will-change-transform"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
                  {post.media[0]?.url ? (
                    <img
                      src={post.media[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-xs font-mono tracking-widest text-white uppercase flex items-center gap-1.5">
                      <span>{t('viewWork')}</span> <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </div>
                <div className="p-5 border-t border-white/10 space-y-1">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    {post.category}
                  </span>
                  <h3 className="text-lg font-serif uppercase tracking-tight text-white group-hover:text-white/80 transition-colors">
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
