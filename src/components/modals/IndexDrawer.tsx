import React, { useState } from 'react';
import { SocialPost, UserProfile } from '../../types/social';
import { X, Search, ArrowRight, User } from 'lucide-react';

interface IndexDrawerProps {
  isOpen: boolean;
  socialPosts: SocialPost[];
  creators: Record<string, UserProfile>;
  onClose: () => void;
  onSelectSocialPost: (post: SocialPost) => void;
  onSelectUserProfile: (username: string) => void;
}

export const IndexDrawer: React.FC<IndexDrawerProps> = ({
  isOpen,
  socialPosts,
  creators,
  onClose,
  onSelectSocialPost,
  onSelectUserProfile,
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Real matching creators from Firestore (deduplicated by ID)
  const uniqueCreatorsList = Array.from(
    new Map(
      (Object.values(creators) as UserProfile[])
        .filter((c) => Boolean(c && c.id))
        .map((c) => [c.id, c])
    ).values()
  );

  const matchingCreators = uniqueCreatorsList.filter(
    (c) =>
      c.displayName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
  );

  // Real matching posts from Firestore
  const matchingPosts = socialPosts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.caption.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q))
  );

  const hasResults = matchingCreators.length > 0 || matchingPosts.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl h-full bg-[#08080a] border-l border-white/15 flex flex-col text-white shadow-2xl">
        {/* Top Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-mono tracking-widest text-white/50 uppercase">
            ARCHIVE SEARCH
          </span>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="p-6 border-b border-white/10 bg-neutral-950">
          <div className="flex items-center gap-3 border border-white/20 px-4 py-3 bg-neutral-900 focus-within:border-white transition-colors">
            <Search className="w-4 h-4 text-white/40" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="SEARCH CREATORS, TITLES, #TAGS..."
              className="w-full bg-transparent text-sm text-white placeholder-white/30 focus:outline-none uppercase font-mono"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-white/40 hover:text-white"
              >
                CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Index Results Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!hasResults ? (
            <div className="py-24 text-center text-xs font-mono text-white/40 tracking-widest uppercase">
              NO RESULTS
            </div>
          ) : (
            <>
              {/* Creators */}
              {matchingCreators.length > 0 && (
                <div className="space-y-3">
                  <span className="text-xs font-mono tracking-widest text-white/40 uppercase block flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>CREATORS ({matchingCreators.length})</span>
                  </span>
                  <div className="space-y-2">
                    {matchingCreators.map((creator) => (
                      <div
                        key={creator.id}
                        onClick={() => {
                          onSelectUserProfile(creator.username);
                          onClose();
                        }}
                        className="p-3 border border-white/5 hover:border-white/25 bg-neutral-950 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 bg-neutral-900 flex items-center justify-center text-[10px] font-mono text-white/60">
                            {Boolean(creator.avatar && creator.avatar.trim()) ? (
                              <img
                                src={creator.avatar}
                                alt=""
                                className="w-full h-full object-cover filter grayscale"
                              />
                            ) : (
                              (creator.username || 'IV').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-serif uppercase tracking-tight text-white group-hover:text-white/80">
                              {creator.displayName}
                            </h4>
                            <p className="text-[11px] font-mono text-white/50">
                              @{creator.username}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {matchingPosts.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <span className="text-xs font-mono tracking-widest text-white/40 uppercase block">
                    WORKS ({matchingPosts.length})
                  </span>
                  <div className="space-y-2">
                    {matchingPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => {
                          onSelectSocialPost(post);
                          onClose();
                        }}
                        className="p-3 border border-white/5 hover:border-white/25 bg-neutral-950 cursor-pointer flex items-center justify-between transition-colors group"
                      >
                        <div>
                          <span className="text-[9px] font-mono tracking-widest text-white/40 uppercase">
                            {post.category}
                          </span>
                          <h4 className="text-sm font-serif uppercase tracking-tight text-white group-hover:text-white/80">
                            {post.title}
                          </h4>
                          <p className="text-[11px] font-mono text-white/50">
                            BY @{post.authorUsername} · {post.likesCount} LIKES
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
