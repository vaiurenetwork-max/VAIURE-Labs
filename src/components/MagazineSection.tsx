import React from 'react';
import { MagazineArticle } from '../data/ivntriData';
import { ArrowRight } from 'lucide-react';

interface MagazineSectionProps {
  articles?: MagazineArticle[];
  onSelectArticle: (article: MagazineArticle) => void;
}

export const MagazineSection: React.FC<MagazineSectionProps> = ({
  articles = [],
  onSelectArticle,
}) => {
  return (
    <section id="magazine" className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12 gap-6">
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              MAGAZINE
            </h2>
          </div>
        </div>

        {/* Real Articles or Minimal Empty State */}
        {articles.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            NO ARTICLES YET
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((article) => (
              <div
                key={article.id}
                onClick={() => onSelectArticle(article)}
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all p-6 flex flex-col justify-between bg-neutral-950/60"
              >
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    {article.category}
                  </span>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white group-hover:text-white/80 transition-colors mt-2">
                    {article.title}
                  </h3>
                  <p className="text-xs font-mono text-white/50 mt-1">
                    BY {article.author}
                  </p>
                  <p className="text-sm font-light text-neutral-300 mt-4 leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-white/40">
                  <span>{article.readTime}</span>
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
