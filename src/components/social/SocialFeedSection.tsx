import React, { useState } from 'react';
import { SocialPost, UserProfile } from '../../types/social';
import { PostCard } from './PostCard';
import { Plus, Search, TrendingUp, Users } from 'lucide-react';

interface SocialFeedSectionProps {
  posts: SocialPost[];
  currentUser: UserProfile;
  creators: Record<string, UserProfile>;
  onToggleLike: (postId: string) => void;
  onToggleSave: (postId: string) => void;
  onToggleFollow: (username: string) => void;
  onOpenComments: (post: SocialPost) => void;
  onOpenRepost: (post: SocialPost) => void;
  onOpenShare: (post: SocialPost) => void;
  onOpenProfile: (username: string) => void;
  onOpenModeration: (postId: string, authorId: string) => void;
  onOpenCreatePost: () => void;
  onInlineComment: (postId: string, text: string) => void;
}

export const SocialFeedSection: React.FC<SocialFeedSectionProps> = ({
  posts,
  currentUser,
  creators,
  onToggleLike,
  onToggleSave,
  onToggleFollow,
  onOpenComments,
  onOpenRepost,
  onOpenShare,
  onOpenProfile,
  onOpenModeration,
  onOpenCreatePost,
  onInlineComment,
}) => {
  const [feedMode, setFeedMode] = useState<'for_you' | 'following'>('for_you');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    'ALL',
    'COUTURE',
    'EDITORIAL',
    'CINEMA',
    'DIGITAL FASHION',
    'ARTWORK',
    'EXPERIMENTAL',
  ];

  // Derive real trending hashtags from real posts
  const realTagsMap: Record<string, number> = {};
  posts.forEach((p) => {
    p.tags?.forEach((t) => {
      const clean = t.startsWith('#') ? t : `#${t}`;
      realTagsMap[clean] = (realTagsMap[clean] || 0) + 1;
    });
  });
  const trendingTags = Object.entries(realTagsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const realCreatorsList = Array.from(
    new Map(
      (Object.values(creators) as UserProfile[])
        .filter((c) => Boolean(c && c.id && c.id !== currentUser.id))
        .map((c) => [c.id, c])
    ).values()
  );

  // Filtering
  const q = searchQuery.toLowerCase().trim();

  const filteredPosts = posts.filter((post) => {
    if (feedMode === 'following') {
      const creator = creators[post.authorUsername];
      const isFollowed = creator?.isFollowing || post.authorUsername === currentUser.username;
      if (!isFollowed) return false;
    }

    if (selectedCategory !== 'ALL' && post.category !== selectedCategory) {
      return false;
    }

    if (q) {
      const matchesTitle = post.title.toLowerCase().includes(q);
      const matchesCaption = post.caption.toLowerCase().includes(q);
      const matchesAuthor =
        post.authorName.toLowerCase().includes(q) || post.authorUsername.toLowerCase().includes(q);
      const matchesTag = post.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTool = post.aiTools.some((tool) => tool.toLowerCase().includes(q));
      if (!matchesTitle && !matchesCaption && !matchesAuthor && !matchesTag && !matchesTool) {
        return false;
      }
    }

    return true;
  });

  return (
    <section id="social-feed" className="relative w-full bg-[#050507] border-b border-white/10 py-16 md:py-24 px-4 sm:px-6 md:px-12 select-text">
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-10 gap-6">
          <div>
            <h2 className="text-4xl sm:text-6xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              EXPLORE
            </h2>
          </div>

          <button
            onClick={onOpenCreatePost}
            className="self-start md:self-auto px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-all duration-300 text-xs font-mono tracking-widest uppercase font-semibold flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
            <span>PUBLISH WORK</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main Feed Column (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Feed Mode Selector & Search Filter Bar */}
            <div className="border border-white/10 bg-neutral-950/80 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex border border-white/20 p-0.5 text-xs font-mono tracking-wider">
                  <button
                    onClick={() => setFeedMode('for_you')}
                    className={`px-4 py-1.5 uppercase transition-colors ${
                      feedMode === 'for_you'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    FOR YOU
                  </button>
                  <button
                    onClick={() => setFeedMode('following')}
                    className={`px-4 py-1.5 uppercase transition-colors ${
                      feedMode === 'following'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    FOLLOWING
                  </button>
                </div>

                {/* Search Bar */}
                <div className="flex items-center gap-2 border border-white/15 px-3 py-1.5 bg-neutral-900 focus-within:border-white w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="SEARCH..."
                    className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none uppercase font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-[10px] text-white/40 hover:text-white"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-2 border-t border-white/5 text-xs font-mono text-white/50">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`py-1 transition-colors uppercase relative ${
                      selectedCategory === cat ? 'text-white font-semibold' : 'hover:text-white'
                    }`}
                  >
                    {cat}
                    {selectedCategory === cat && (
                      <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Publish Strip */}
            <div
              onClick={onOpenCreatePost}
              className="p-4 border border-dashed border-white/20 hover:border-white/40 bg-neutral-950/60 cursor-pointer transition-colors flex items-center justify-between group"
            >
              <span className="text-xs font-mono text-white/50 group-hover:text-white/80 transition-colors uppercase">
                + PUBLISH WORK
              </span>
              <button
                type="button"
                className="px-3 py-1 bg-neutral-900 border border-white/20 text-xs font-mono uppercase text-white"
              >
                CREATE
              </button>
            </div>

            {/* Feed Stream */}
            {filteredPosts.length === 0 ? (
              <div className="py-24 text-center border border-white/10 p-8 text-white/40 font-mono text-xs tracking-widest uppercase">
                {searchQuery ? 'NO RESULTS' : 'NO WORK YET'}
              </div>
            ) : (
              <div className="space-y-8">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={currentUser}
                    isFollowing={creators[post.authorUsername]?.isFollowing}
                    onToggleFollow={onToggleFollow}
                    onLike={onToggleLike}
                    onSave={onToggleSave}
                    onOpenComments={onOpenComments}
                    onOpenRepost={onOpenRepost}
                    onOpenShare={onOpenShare}
                    onOpenProfile={onOpenProfile}
                    onOpenModeration={onOpenModeration}
                    onInlineComment={onInlineComment}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Rail */}
          <div className="lg:col-span-4 space-y-6">
            {/* Real Trending */}
            <div className="border border-white/10 bg-neutral-950/80 p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-white/50 uppercase">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>TRENDING</span>
              </div>

              {trendingTags.length === 0 ? (
                <div className="text-[11px] font-mono text-white/30 uppercase py-2">
                  NO TRENDING WORK
                </div>
              ) : (
                <div className="space-y-3">
                  {trendingTags.map(([tag, count]) => (
                    <div
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="flex items-center justify-between text-xs cursor-pointer group"
                    >
                      <span className="font-mono text-neutral-300 group-hover:text-white transition-colors">
                        {tag}
                      </span>
                      <span className="text-[10px] font-mono text-white/40 tabular-nums">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Real Creators */}
            <div className="border border-white/10 bg-neutral-950/80 p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-white/50 uppercase">
                <Users className="w-3.5 h-3.5" />
                <span>CREATORS</span>
              </div>

              {realCreatorsList.length === 0 ? (
                <div className="text-[11px] font-mono text-white/30 uppercase py-2">
                  NO CREATORS YET
                </div>
              ) : (
                <div className="space-y-4">
                  {realCreatorsList.slice(0, 6).map((creator) => (
                    <div
                      key={creator.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div
                        onClick={() => onOpenProfile(creator.username)}
                        className="flex items-center gap-3 cursor-pointer group min-w-0"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 bg-neutral-900 flex-shrink-0 flex items-center justify-center text-[10px] font-mono text-white/60">
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
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-serif uppercase tracking-tight text-white group-hover:text-white/80 truncate">
                            {creator.displayName}
                          </p>
                          <p className="text-[10px] font-mono text-white/40 truncate">
                            @{creator.username}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => onToggleFollow(creator.username)}
                        className={`px-3 py-1 text-[10px] font-mono tracking-wider uppercase transition-colors border flex-shrink-0 ${
                          creator.isFollowing
                            ? 'border-white/15 text-white/50'
                            : 'border-white bg-white text-black font-semibold hover:bg-neutral-200'
                        }`}
                      >
                        {creator.isFollowing ? 'FOLLOWED' : '+ FOLLOW'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
