import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Plus,
  Compass,
  Users,
  Search,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ArrowLeft,
  Menu,
} from 'lucide-react';
import { ShortVideo, ShortCategory } from '../../types/shorts';
import { UserProfile } from '../../types/social';
import { useLanguage } from '../../services/i18n';
import {
  subscribeToFirestoreShorts,
  toggleFirestoreShortLike,
  toggleFirestoreShortSave,
  incrementFirestoreShortView,
  incrementFirestoreShortShare,
  deleteFirestoreShort,
} from '../../services/shortsService';
import { ShortsVideoCard } from './ShortsVideoCard';
import { ShortsCommentsDrawer } from './ShortsCommentsDrawer';
import { CreateShortModal } from './CreateShortModal';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';

interface ShortsViewProps {
  currentUser: UserProfile;
  followingUsernames?: string[];
  onBackToHome?: () => void;
  onOpenSlideArchive?: () => void;
  onOpenSlideCinema?: () => void;
  onOpenMenu?: () => void;
  onOpenProfile?: (username: string) => void;
  onToggleFollow?: (creatorUsername: string) => void;
  onOpenAuthModal?: () => void;
}

const CATEGORIES: (ShortCategory | 'ALL')[] = [
  'ALL',
  'AI Cinema',
  'AI Fashion',
  'Visual Art',
  'Behind the Scenes',
  'Experimental',
];

export const ShortsView: React.FC<ShortsViewProps> = ({
  currentUser,
  followingUsernames = [],
  onBackToHome,
  onOpenSlideArchive,
  onOpenSlideCinema,
  onOpenMenu,
  onOpenProfile,
  onToggleFollow,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [activeCategory, setActiveCategory] = useState<ShortCategory | 'ALL'>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [activeCommentsShort, setActiveCommentsShort] = useState<ShortVideo | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to real Firestore Shorts
  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = subscribeToFirestoreShorts(activeCategory, (loaded) => {
      setShorts(loaded);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeCategory]);

  // Filter based on For You vs Following and search query
  const displayedShorts = shorts.filter((short) => {
    // Following Tab filter
    if (activeTab === 'FOLLOWING') {
      const isFollowing = followingUsernames.some(
        (uname) => uname.toLowerCase() === short.authorUsername?.toLowerCase()
      );
      if (!isFollowing && short.authorId !== currentUser.id) {
        return false;
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = short.title?.toLowerCase().includes(q);
      const matchDesc = short.description?.toLowerCase().includes(q);
      const matchAuthor = short.authorUsername?.toLowerCase().includes(q);
      const matchTags = short.tags?.some((tag) => tag.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchAuthor && !matchTags) {
        return false;
      }
    }

    return true;
  });

  // Keep index within bounds
  useEffect(() => {
    if (currentIndex >= displayedShorts.length && displayedShorts.length > 0) {
      setCurrentIndex(displayedShorts.length - 1);
    }
  }, [displayedShorts.length, currentIndex]);

  // Track view when index changes
  useEffect(() => {
    const currentShort = displayedShorts[currentIndex];
    if (currentShort) {
      incrementFirestoreShortView(currentShort.id, currentShort.viewsCount || 0);
    }
  }, [currentIndex, displayedShorts]);

  // Keyboard navigation (Arrow Up / Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.min(prev + 1, displayedShorts.length - 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'm') {
        setIsMuted((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedShorts.length]);

  // Touch swipe support for vertical reels
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    if (Math.abs(diffY) > 50) {
      if (diffY < 0) {
        // Swiped UP -> Next video
        setCurrentIndex((prev) => Math.min(prev + 1, displayedShorts.length - 1));
      } else {
        // Swiped DOWN -> Previous video
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    touchStartY.current = null;
  };

  // Interactions
  const handleToggleLike = (short: ShortVideo) => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    toggleFirestoreShortLike(
      short.id,
      currentUser,
      Boolean(short.isLiked),
      short.likesCount || 0,
      short.authorId,
      short.title
    );
  };

  const handleToggleSave = (short: ShortVideo) => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }
    toggleFirestoreShortSave(
      short.id,
      currentUser,
      Boolean(short.isSaved),
      short.savesCount || 0
    );
  };

  const handleShare = async (short: ShortVideo) => {
    incrementFirestoreShortShare(short.id, short.sharesCount || 0);

    const shareUrl = `${window.location.origin}/shorts#${short.id}`;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.alert(t('shortsCopiedLink'));
      } catch (err) {
        console.warn('Clipboard note:', err);
      }
    }
  };

  const handleDelete = async (shortId: string) => {
    try {
      await deleteFirestoreShort(shortId);
    } catch (err) {
      console.error('Delete short error:', err);
    }
  };

  return (
    <div
      className="relative w-full h-full bg-black text-white flex flex-col overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* TOP FLOATING NAVIGATION BAR */}
      <header className="absolute top-0 left-0 right-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Left: Brand / Return Control */}
        <div className="flex items-center gap-3">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="p-1.5 rounded-full text-white/70 hover:text-white bg-black/40 border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
              title="Return to Main Archive"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-baseline gap-1.5 cursor-pointer">
            <span className="font-display text-sm font-bold tracking-[0.2em] uppercase text-white">
              VAIURE
            </span>
            <span className="text-white/35 font-light text-xs">｜</span>
            <span className="text-xs font-light text-white/80 font-sans tracking-widest">
              SHORTS
            </span>
          </div>
        </div>

        {/* Center: For You / Following Switcher */}
        <div className="flex items-center gap-1 bg-black/50 border border-white/15 backdrop-blur-md rounded-full p-0.5 text-xs font-mono tracking-wider">
          <button
            onClick={() => {
              setActiveTab('FOLLOWING');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeTab === 'FOLLOWING'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {t('shortsFollowing')}
          </button>
          <button
            onClick={() => {
              setActiveTab('FOR_YOU');
              setCurrentIndex(0);
            }}
            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
              activeTab === 'FOR_YOU'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            {t('shortsForYou')}
          </button>
        </div>

        {/* Right: Actions (Upload Short, Search, Menu) */}
        <div className="flex items-center gap-2">
          {/* Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 rounded-full text-white/70 hover:text-white bg-black/40 border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
            title="Search Shorts"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Upload Short Button */}
          <button
            onClick={() => {
              if (!currentUser.id) {
                onOpenAuthModal?.();
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-wider uppercase font-semibold rounded-full shadow-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">{t('shortsPublish')}</span>
          </button>

          {/* Slide Drawer Menu */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              className="p-2 rounded-full text-white/70 hover:text-white bg-black/40 border border-white/15 backdrop-blur-md transition-colors cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* SEARCH BAR (if toggled) */}
      {isSearchOpen && (
        <div className="absolute top-16 left-4 right-4 z-30 max-w-md mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI cinema, fashion, visual art, hashtags..."
              autoFocus
              className="w-full px-4 py-2.5 bg-black/80 border border-white/20 focus:border-white focus:outline-none rounded-full text-xs text-white placeholder-white/40 shadow-2xl backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs font-mono"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* DISCOVERY CATEGORY PILLS BAR */}
      <div className="absolute top-14 left-0 right-0 z-20 px-4 py-2 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              setCurrentIndex(0);
            }}
            className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase backdrop-blur-md transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-white/20 border border-white text-white font-semibold shadow-sm'
                : 'bg-black/40 border border-white/10 text-white/60 hover:text-white hover:border-white/25'
            }`}
          >
            {cat === 'ALL' ? t('catAll') : cat}
          </button>
        ))}
      </div>

      {/* MAIN VERTICAL FEED VIEWPORT */}
      <main className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center pt-12 pb-14 sm:pb-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-white/50">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <span className="text-xs font-mono uppercase tracking-widest">
              Connecting to Shorts...
            </span>
          </div>
        ) : displayedShorts.length === 0 ? (
          /* POLISHED EMPTY STATE WITH ZERO HARDCODED TEMPLATE VIDEOS */
          <div className="max-w-md p-8 text-center bg-[#09090D] border border-white/15 rounded-2xl shadow-2xl mx-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-white/5 border border-white/15 mx-auto flex items-center justify-center">
              <Film className="w-7 h-7 text-white/50 stroke-[1.5]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold font-mono tracking-wider uppercase text-white">
                {activeTab === 'FOLLOWING'
                  ? t('shortsEmptyFollowingTitle')
                  : t('shortsEmptyTitle')}
              </h3>
              <p className="text-xs text-white/50 leading-relaxed">
                {activeTab === 'FOLLOWING'
                  ? t('shortsEmptyFollowingDesc')
                  : t('shortsEmptyDesc')}
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (!currentUser.id) {
                    onOpenAuthModal?.();
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-wider uppercase font-semibold rounded-xl shadow-lg cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>{t('shortsBeFirst')}</span>
              </button>
              {activeTab === 'FOLLOWING' && (
                <button
                  onClick={() => setActiveTab('FOR_YOU')}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/20 text-white hover:bg-white/5 transition-colors text-xs font-mono tracking-wider uppercase rounded-xl cursor-pointer"
                >
                  Explore For You
                </button>
              )}
            </div>
          </div>
        ) : (
          /* VERTICAL VIDEO CAROUSEL */
          <div className="relative w-full h-full flex items-center justify-center">
            {displayedShorts.map((short, idx) => {
              const isCurrent = idx === currentIndex;
              return (
                <div
                  key={short.id}
                  className={`absolute inset-0 w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                    isCurrent
                      ? 'translate-y-0 opacity-100 pointer-events-auto z-10'
                      : idx < currentIndex
                      ? '-translate-y-full opacity-0 pointer-events-none z-0'
                      : 'translate-y-full opacity-0 pointer-events-none z-0'
                  }`}
                >
                  <ShortsVideoCard
                    short={short}
                    isActive={isCurrent}
                    currentUser={currentUser}
                    isMuted={isMuted}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    onToggleLike={handleToggleLike}
                    onToggleSave={handleToggleSave}
                    onOpenComments={(s) => setActiveCommentsShort(s)}
                    onShare={handleShare}
                    onOpenProfile={onOpenProfile}
                    onToggleFollow={onToggleFollow}
                    onDelete={handleDelete}
                    onOpenAuthModal={onOpenAuthModal}
                  />
                </div>
              );
            })}

            {/* Desktop Carousel Arrows (Right side) */}
            <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col items-center gap-3 z-30 pointer-events-auto">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                disabled={currentIndex === 0}
                className="w-10 h-10 rounded-full bg-black/60 border border-white/20 hover:border-white text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-95"
                title="Previous Short (Up Arrow)"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <span className="text-[10px] font-mono text-white/50 tracking-wider">
                {currentIndex + 1} / {displayedShorts.length}
              </span>
              <button
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(prev + 1, displayedShorts.length - 1)
                  )
                }
                disabled={currentIndex === displayedShorts.length - 1}
                className="w-10 h-10 rounded-full bg-black/60 border border-white/20 hover:border-white text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-95"
                title="Next Short (Down Arrow)"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* COMMENTS DRAWER */}
      <ShortsCommentsDrawer
        short={activeCommentsShort}
        currentUser={currentUser}
        isOpen={Boolean(activeCommentsShort)}
        onClose={() => setActiveCommentsShort(null)}
        onOpenProfile={onOpenProfile}
        onOpenAuthModal={onOpenAuthModal}
      />

      {/* CREATE / PUBLISH SHORT MODAL */}
      <CreateShortModal
        isOpen={isCreateModalOpen}
        currentUser={currentUser}
        onClose={() => setIsCreateModalOpen(false)}
        onPublished={(newShort) => {
          setShorts((prev) => [newShort, ...prev]);
          setCurrentIndex(0);
        }}
        onOpenAuthModal={onOpenAuthModal}
      />
    </div>
  );
};
