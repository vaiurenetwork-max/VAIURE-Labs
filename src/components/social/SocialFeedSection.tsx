import React, { useState, useMemo } from 'react';
import { SocialPost, UserProfile } from '../../types/social';
import { PostCard } from './PostCard';
import { Plus, Search, TrendingUp, Users, LayoutList, LayoutGrid, Compass } from 'lucide-react';
import { VaiureEmptyState } from '../ui/VaiurePrimitives';

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
  const [sortBy, setSortBy] = useState<'LATEST' | 'MOST LIKED' | 'DISCUSSED'>('LATEST');
  const [viewMode, setViewMode] = useState<'stream' | 'grid'>('stream');

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
  const trendingTags = useMemo(() => {
    const realTagsMap: Record<string, number> = {};
    posts.forEach((p) => {
      p.tags?.forEach((t) => {
        const clean = t.startsWith('#') ? t : `#${t}`;
        realTagsMap[clean] = (realTagsMap[clean] || 0) + 1;
      });
    });
    return Object.entries(realTagsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [posts]);

  const realCreatorsList = useMemo(
    () =>
      Array.from(
        new Map(
          (Object.values(creators) as UserProfile[])
            .filter((c) => Boolean(c && c.id && c.id !== currentUser.id))
            .map((c) => [c.id, c])
        ).values()
      ),
    [creators, currentUser.id]
  );

  // Filtering & Sorting
  const q = searchQuery.toLowerCase().trim();

  const filteredPosts = useMemo(() => {
    const base = posts.filter((post) => {
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

    if (sortBy === 'MOST LIKED') {
      return [...base].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    }
    if (sortBy === 'DISCUSSED') {
      return [...base].sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));
    }
    return base;
  }, [posts, feedMode, creators, currentUser.username, selectedCategory, q, sortBy]);

  const hasActiveFilters = Boolean(q || selectedCategory !== 'ALL' || feedMode === 'following');

  return (
    <section
      id="social-feed"
      className="relative w-full bg-[#050507] border-b border-white/10 py-16 md:py-24 px-4 sm:px-6 md:px-12 select-text"
    >
      <div className="max-w-[1440px] mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/10 pb-8 mb-10 gap-6">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block mb-2 tabular-nums">
              ARCHIVE STREAM · {filteredPosts.length} WORKS
            </span>
            <h2 className="text-4xl sm:text-6xl font-serif font-light text-white tracking-tight uppercase leading-[0.95]">
              EXPLORE
            </h2>
          </div>

          <button
            onClick={onOpenCreatePost}
            className="self-start md:self-auto px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-all duration-300 text-xs font-mono tracking-widest uppercase font-semibold flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 group cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5] transition-transform duration-300 group-hover:rotate-90" />
            <span>PUBLISH WORK</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main Feed Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Feed Mode, Search, Sort & Layout Bar */}
            <div className="border border-white/[0.09] bg-[#0a0a0d] p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex border border-white/20 p-0.5 text-xs font-mono tracking-wider self-start">
                  <button
                    type="button"
                    onClick={() => setFeedMode('for_you')}
                    className={`px-4 py-1.5 uppercase transition-colors cursor-pointer ${
                      feedMode === 'for_you'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    FOR YOU
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedMode('following')}
                    className={`px-4 py-1.5 uppercase transition-colors cursor-pointer ${
                      feedMode === 'following'
                        ? 'bg-white text-black font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    FOLLOWING
                  </button>
                </div>

                {/* Search + View Toggle */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="flex items-center gap-2 border border-white/15 px-3 py-1.5 bg-[#050507] focus-within:border-white flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="SEARCH WORKS, #TAGS..."
                      className="w-full bg-transparent text-xs text-white placeholder-white/30 focus:outline-none uppercase font-mono"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-white/40 hover:text-white cursor-pointer"
                        aria-label="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Layout Mode Toggle */}
                  <div className="hidden sm:flex border border-white/15 bg-[#050507]">
                    <button
                      type="button"
                      onClick={() => setViewMode('stream')}
                      aria-label="Stream view"
                      title="Single-column editorial stream"
                      className={`p-2 transition-colors cursor-pointer ${
                        viewMode === 'stream' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      title="2-column editorial grid"
                      className={`p-2 transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-white text-black' : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Category Filter Tabs + Sort Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-mono text-white/50">
                  {categories.map((cat) => (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`py-1 transition-colors uppercase relative cursor-pointer ${
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

                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {(['LATEST', 'MOST LIKED', 'DISCUSSED'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSortBy(mode)}
                      className={`px-2 py-1 border transition-colors cursor-pointer ${
                        sortBy === mode
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/10 text-white/45 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Filter Status Chip Bar */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-[10px] font-mono">
                  <span className="text-white/50 truncate">
                    SHOWING {filteredPosts.length} RESULTS
                    {selectedCategory !== 'ALL' ? ` · ${selectedCategory}` : ''}
                    {q ? ` · "${q.toUpperCase()}"` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFeedMode('for_you');
                      setSelectedCategory('ALL');
                      setSearchQuery('');
                    }}
                    className="text-white hover:underline uppercase shrink-0 cursor-pointer"
                  >
                    RESET ALL
                  </button>
                </div>
              )}
            </div>

            {/* Feed Stream or Grid */}
            {filteredPosts.length === 0 ? (
              <VaiureEmptyState
                icon={<Compass className="w-5 h-5" />}
                eyebrow="ARCHIVE STREAM"
                title={hasActiveFilters ? 'NO MATCHING WORKS' : 'NO ARCHIVE WORKS YET'}
                description={
                  hasActiveFilters
                    ? 'Adjust your search query, category filter, or feed view to explore published works.'
                    : 'Publish an editorial still, fashion dossier, or AI film to inaugurate this archive stream.'
                }
                actionLabel={hasActiveFilters ? 'RESET FILTERS' : 'PUBLISH WORK'}
                onAction={() => {
                  if (hasActiveFilters) {
                    setFeedMode('for_you');
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  } else {
                    onOpenCreatePost();
                  }
                }}
              />
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start'
                    : 'space-y-8'
                }
              >
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
                    onTagClick={(tag) => setSearchQuery(tag)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Rail */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Real Trending Tags */}
            <div className="border border-white/[0.09] bg-[#0a0a0d] p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono tracking-widest text-white/50 uppercase">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>TRENDING TAGS</span>
                </span>
                <span className="text-[10px] text-white/30 tabular-nums">{trendingTags.length}</span>
              </div>

              {trendingTags.length === 0 ? (
                <div className="text-[11px] font-mono text-white/35 uppercase py-2">
                  NO TRENDING TAGS YET
                </div>
              ) : (
                <div className="space-y-2">
                  {trendingTags.map(([tag, count]) => {
                    const isSelected = searchQuery.toLowerCase() === tag.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => setSearchQuery(isSelected ? '' : tag)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 text-xs cursor-pointer transition-colors border ${
                          isSelected
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-transparent hover:border-white/15 hover:bg-white/[0.03] text-neutral-300'
                        }`}
                      >
                        <span className="font-mono truncate">{tag}</span>
                        <span
                          className={`text-[10px] font-mono tabular-nums ${
                            isSelected ? 'text-black/70' : 'text-white/40'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Real Creators Directory Preview */}
            <div className="border border-white/[0.09] bg-[#0a0a0d] p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono tracking-widest text-white/50 uppercase">
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>CREATORS</span>
                </span>
                <span className="text-[10px] text-white/30 tabular-nums">
                  {realCreatorsList.length}
                </span>
              </div>

              {realCreatorsList.length === 0 ? (
                <div className="text-[11px] font-mono text-white/35 uppercase py-2">
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
                        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/15 bg-neutral-900 flex-shrink-0 flex items-center justify-center text-[10px] font-mono text-white/60">
                          {Boolean(creator.avatar && creator.avatar.trim()) ? (
                            <img
                              src={creator.avatar}
                              alt=""
                              className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all"
                            />
                          ) : (
                            (creator.username || 'IV').slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0 truncate">
                          <p className="text-xs font-serif uppercase tracking-tight text-white group-hover:text-white/80 truncate">
                            {creator.displayName}
                          </p>
                          <p className="text-[10px] font-mono text-white/45 truncate">
                            @{creator.username}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onToggleFollow(creator.username)}
                        className={`px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase transition-colors border flex-shrink-0 cursor-pointer min-h-[34px] ${
                          creator.isFollowing
                            ? 'border-white/15 text-white/50 hover:border-white/40 hover:text-white'
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
