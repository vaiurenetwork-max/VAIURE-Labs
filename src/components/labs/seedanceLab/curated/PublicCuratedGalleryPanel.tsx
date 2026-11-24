/**
 * VAIURE — SEEDANCE LAB "PUBLIC CURATED GALLERY" DISCOVERY
 * Displays ONLY creations explicitly submitted by creators and approved & published by Curators.
 * Supports ALL / IMAGES / VIDEOS tabs, multi-criteria search, category & tag filters,
 * real engagement sort modes, saved favorites filter, pagination, and full detail modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Heart,
  Eye,
  MessageSquare,
  Bookmark,
  Play,
  Film,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  CreationTag,
  CuratedCategoryOption,
  CuratedMediaType,
  PublicGallerySort,
  PublishedCreation,
} from '../../../../types/seedanceCurated';
import { seedanceCuratedService } from '../../../../services/seedanceCuratedService';

interface PublicCuratedGalleryPanelProps {
  isAuthenticated: boolean;
  categories: CuratedCategoryOption[];
  refreshSignal?: number;
  onSelectPublished: (publishedId: string) => void;
  onRequireAuth: () => void;
}

export const PublicCuratedGalleryPanel: React.FC<PublicCuratedGalleryPanelProps> = ({
  isAuthenticated,
  categories,
  refreshSignal = 0,
  onSelectPublished,
  onRequireAuth,
}) => {
  const [creations, setCreations] = useState<PublishedCreation[]>([]);
  const [tags, setTags] = useState<CreationTag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [mediaFilter, setMediaFilter] = useState<'ALL' | CuratedMediaType>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<PublicGallerySort>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await seedanceCuratedService.listPublicCreations({
        mediaType: mediaFilter,
        category: categoryFilter,
        search: searchQuery.trim() || undefined,
        sort: sortBy,
        favoritesOnly,
        page,
        limit: 24,
      });
      setCreations(res.creations);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setTags(res.tags || []);
    } catch {
      // Keep current list on transient error
    } finally {
      setLoading(false);
    }
  }, [mediaFilter, categoryFilter, searchQuery, sortBy, favoritesOnly, page, refreshSignal]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleQuickAppreciate = async (
    e: React.MouseEvent,
    item: PublishedCreation
  ) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    try {
      const res = await seedanceCuratedService.toggleAppreciation(item.id);
      setCreations((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                viewerHasAppreciated: res.appreciated,
                appreciationsCount: res.appreciationsCount,
              }
            : c
        )
      );
    } catch {
      // Non-fatal
    }
  };

  return (
    <div className="space-y-6">
      {/* Discovery Filter & Sort Bar */}
      <div className="rounded-2xl border border-white/[0.12] bg-white/[0.03] p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Media Tabs: ALL | IMAGES | VIDEOS */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'IMAGES', 'VIDEOS'] as const).map((tab) => {
              const value: 'ALL' | CuratedMediaType =
                tab === 'IMAGES' ? 'IMAGE' : tab === 'VIDEOS' ? 'VIDEO' : 'ALL';
              const active = mediaFilter === value;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setMediaFilter(value);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-black font-semibold'
                      : 'border border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              );
            })}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setFavoritesOnly(!favoritesOnly);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-all ${
                  favoritesOnly
                    ? 'bg-white text-black font-semibold'
                    : 'border border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                }`}
              >
                <Bookmark className={`w-3 h-3 ${favoritesOnly ? 'fill-black' : ''}`} />
                <span>Saved</span>
              </button>
            )}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-wrap items-center gap-2 flex-1 lg:justify-end">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search title, creator, tags, model..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs text-white placeholder-white/35 focus:outline-none focus:border-white/35"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs font-mono text-white/85"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as PublicGallerySort);
                setPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-black border border-white/[0.14] text-xs font-mono text-white/85"
            >
              <option value="latest">Sort: Latest</option>
              <option value="recently_curated">Sort: Recently Curated</option>
              <option value="trending">Sort: Trending</option>
              <option value="popular">Sort: Popular</option>
              <option value="most_viewed">Sort: Most Viewed</option>
              <option value="most_appreciated">Sort: Most Appreciated</option>
            </select>

            <button
              type="button"
              onClick={loadGallery}
              disabled={loading}
              title="Refresh Public Curates"
              className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] text-white/75 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Interactive Trending Tags (only clickable controls) */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/[0.08] text-[11px] font-mono">
            <span className="text-white/40 uppercase tracking-wider">Tags:</span>
            {tags.slice(0, 12).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSearchQuery(t.label);
                  setPage(1);
                }}
                className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                  searchQuery.toLowerCase() === t.label.toLowerCase()
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/65 hover:text-white bg-white/[0.04]'
                }`}
              >
                #{t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs font-mono text-white/50">
        <span className="tabular-nums">
          {total} {total === 1 ? 'CURATED CREATION' : 'CURATED CREATIONS'}
        </span>
        <span className="tabular-nums">
          PAGE {page} / {totalPages}
        </span>
      </div>

      {/* Empty State or Gallery Grid */}
      {loading && creations.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-14 text-center text-xs font-mono text-white/50">
          Loading curated gallery...
        </div>
      ) : creations.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-14 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-white/30 mx-auto" />
          <div className="text-base font-serif text-white">
            {favoritesOnly
              ? 'No Saved Curated Creations Yet'
              : 'Public Curated Gallery Is Awaiting Approved Works'}
          </div>
          <p className="text-xs text-white/55 max-w-md mx-auto leading-relaxed">
            {favoritesOnly
              ? 'Bookmark creations in Explore Public Curates to build your personal inspiration shelf.'
              : 'Only creations explicitly submitted by creators and approved by Seedance Curators appear here. Private workspace generations never auto-publish.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {creations.map((item) => (
            <article
              key={item.id}
              onClick={() => onSelectPublished(item.id)}
              className="rounded-2xl border border-white/[0.12] bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.05] transition-all overflow-hidden flex flex-col justify-between cursor-pointer group"
            >
              <div>
                <div className="relative w-full aspect-video bg-black border-b border-white/[0.08] overflow-hidden">
                  {item.mediaType === 'VIDEO' ? (
                    <>
                      <video
                        src={item.mediaStreamUrl}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => undefined);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80 group-hover:opacity-0 transition-opacity">
                        <span className="p-2.5 rounded-full bg-black/70 border border-white/25 text-white">
                          <Play className="w-4 h-4 fill-white" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={item.mediaStreamUrl}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                  )}

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 border border-white/[0.15] text-[10px] font-mono text-white">
                    {item.mediaType === 'VIDEO' ? (
                      <Film className="w-3 h-3" />
                    ) : (
                      <ImageIcon className="w-3 h-3" />
                    )}
                    <span>
                      {item.mediaType === 'VIDEO' && item.durationSeconds
                        ? `${item.durationSeconds}s`
                        : item.mediaType}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div className="text-[11px] font-mono text-white/50 truncate">
                    {item.category}
                    {item.showAiModel && item.aiModel ? ` · ${item.aiModel}` : ''}
                  </div>
                  <h3 className="text-sm font-semibold text-white line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-white/60 line-clamp-2 min-h-[2rem]">
                    {item.description}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-white/60 tabular-nums">
                <span className="truncate max-w-[120px] text-white/80">
                  {item.showCreatorProfile ? item.creatorDisplayName : 'Anonymous'}
                </span>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleQuickAppreciate(e, item)}
                    className={`flex items-center gap-1 cursor-pointer transition-colors ${
                      item.viewerHasAppreciated ? 'text-white font-semibold' : 'hover:text-white'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        item.viewerHasAppreciated ? 'fill-white text-white' : ''
                      }`}
                    />
                    <span>{item.appreciationsCount}</span>
                  </button>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{item.viewsCount}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{item.commentsCount}</span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-mono text-white disabled:opacity-35 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-white/60 tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-4 py-2 rounded-xl border border-white/[0.12] bg-white/[0.04] text-xs font-mono text-white disabled:opacity-35 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
