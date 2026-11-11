import React from 'react';
import { SocialPost } from '../types/social';
import { ArrowUpRight } from 'lucide-react';

interface EditorsSelectionSectionProps {
  posts: SocialPost[];
  onSelectEntry: (post: SocialPost) => void;
}

export const EditorsSelectionSection: React.FC<EditorsSelectionSectionProps> = ({
  posts,
  onSelectEntry,
}) => {
  // Real posts designated or selected by editorial
  const selectedPosts = posts.filter(
    (p) => (p as any).isEditorialSelected === true
  );

  return (
    <section id="selection" className="relative w-full bg-[#050507] border-b border-white/10 py-20 md:py-32 px-4 sm:px-6 md:px-12 select-text">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-12 gap-6">
          <div>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              EDITOR'S SELECTION
            </h2>
          </div>
        </div>

        {/* Real Curatorial Selections or Minimal Empty State */}
        {selectedPosts.length === 0 ? (
          <div className="py-24 text-center border border-white/10 text-white/40 font-mono text-xs tracking-widest uppercase">
            NO EDITORIAL SELECTIONS YET
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {selectedPosts.map((post) => (
              <div
                key={post.id}
                onClick={() => onSelectEntry(post)}
                className="group cursor-pointer border border-white/10 hover:border-white/30 transition-all flex flex-col"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-neutral-900">
                  {post.media[0]?.url ? (
                    <img
                      src={post.media[0].url}
                      alt={post.title}
                      className="w-full h-full object-cover filter grayscale group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <span className="text-xs font-mono tracking-widest text-white uppercase flex items-center gap-1.5">
                      VIEW DOSSIER <ArrowUpRight className="w-3.5 h-3.5" />
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
