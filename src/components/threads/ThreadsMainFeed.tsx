import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ForumThread } from '../../types/forum';
import { UserProfile } from '../../types/social';
import {
  subscribeToForumThreads,
  createForumThread,
  toggleLikeForumThread,
  toggleRepostForumThread,
  deleteForumThread,
} from '../../services/forumService';
import { NewThreadModal } from '../forum/NewThreadModal';
import { ThreadReplyModal } from './ThreadReplyModal';
import { useLanguage } from '../../services/i18n';
import { LanguageSwitcher } from '../navigation/LanguageSwitcher';
import {
  Search,
  Heart,
  MessageCircle,
  MessageSquare,
  Repeat,
  Send,
  MoreHorizontal,
  Plus,
  Home,
  User as UserIcon,
  Check,
  ChevronRight,
  Sparkles,
  Bookmark,
  Share2,
  X,
  VolumeX,
  Flag,
  Trash2,
  Compass,
  ChevronDown,
} from 'lucide-react';

interface ThreadsMainFeedProps {
  currentUser: UserProfile;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  followingUsernames?: string[];
  onOpenMenu: () => void;
  onOpenSlideTwo: () => void;
  onOpenSlideThree?: () => void;
  onOpenLabs?: () => void;
  onOpenShorts?: () => void;
  onOpenMessages?: () => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenProfile: (username?: string) => void;
  onToggleFollow?: (username: string) => void;
  onOpenAuthModal?: () => void;
}

export const ThreadsMainFeed: React.FC<ThreadsMainFeedProps> = ({
  currentUser,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  followingUsernames = [],
  onOpenMenu,
  onOpenSlideTwo,
  onOpenSlideThree,
  onOpenLabs,
  onOpenShorts,
  onOpenMessages,
  onOpenSearch,
  onOpenNotifications,
  onOpenProfile,
  onToggleFollow,
  onOpenAuthModal,
}) => {
  const { t, language } = useLanguage();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [activeReplyThread, setActiveReplyThread] = useState<ForumThread | null>(null);
  const [activeTab, setActiveTab] = useState<'FOR_YOU' | 'FOLLOWING'>('FOR_YOU');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [menuThread, setMenuThread] = useState<ForumThread | null>(null);
  const [savedThreadIds, setSavedThreadIds] = useState<string[]>([]);
  const [isNavCompact, setIsNavCompact] = useState(false);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear 10-second navbar inactivity timer
  const clearNavTimer = useCallback(() => {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
  }, []);

  // Reset 10-second navbar inactivity timer
  const resetNavTimer = useCallback(() => {
    clearNavTimer();
    navTimerRef.current = setTimeout(() => {
      setIsNavCompact(true);
    }, 10000);
  }, [clearNavTimer]);

  // Start 10s inactivity countdown on mount
  useEffect(() => {
    resetNavTimer();
    return () => clearNavTimer();
  }, [resetNavTimer, clearNavTimer]);

  // Reset timer on active feed scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (!isNavCompact) {
        resetNavTimer();
      }
    };
    const container = document.getElementById('slide-threads-viewport');
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isNavCompact, resetNavTimer]);

  // Handle clicking compact icon to pop out full navbar menu
  const handlePopOutNav = () => {
    setIsNavCompact(false);
    resetNavTimer();
  };

  // Wrapper for any navigation action that resets timer
  const handleNavAction = (action?: () => void) => {
    resetNavTimer();
    action?.();
  };

  // Subscribe to real-time threads in Firestore — ONLY real user data, zero templates!
  useEffect(() => {
    setIsLoading(true);
    const unsub = subscribeToForumThreads(null, currentUser.id, (live) => {
      setThreads(live || []);
      setIsLoading(false);
    });

    return () => unsub();
  }, [currentUser.id]);

  const handleCreateThread = async (threadData: any) => {
    await createForumThread(currentUser, threadData);
  };

  const handleLike = async (threadId: string, currentLiked?: boolean, currentCount: number = 0) => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    const willLike = !currentLiked;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              isLiked: willLike,
              likesCount: willLike ? currentCount + 1 : Math.max(0, currentCount - 1),
            }
          : t
      )
    );

    await toggleLikeForumThread(threadId, currentUser.id);
  };

  const handleRepost = async (threadId: string, currentReposted?: boolean, currentCount: number = 0) => {
    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    const willRepost = !currentReposted;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              isReposted: willRepost,
              repostsCount: willRepost ? currentCount + 1 : Math.max(0, currentCount - 1),
            }
          : t
      )
    );

    await toggleRepostForumThread(threadId, currentUser.id);
  };

  const handleShare = (thread: ForumThread) => {
    const url = `${window.location.origin}/#thread-${thread.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(thread.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSave = (threadId: string) => {
    setSavedThreadIds((prev) =>
      prev.includes(threadId) ? prev.filter((id) => id !== threadId) : [...prev, threadId]
    );
    setMenuThread(null);
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '15m';
    try {
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'now';
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h`;
      const days = Math.floor(hrs / 24);
      return `${days}d`;
    } catch {
      return '15m';
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (activeTab === 'FOLLOWING') {
      return followingUsernames.includes(t.authorUsername) || t.authorUsername === currentUser.username;
    }
    return true;
  });

  const handleScrollToTop = () => {
    const el = document.getElementById('slide-threads-viewport');
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full h-full bg-[#000000] text-white flex flex-col justify-between selection:bg-white/20 select-text overflow-hidden">
      {/* Top Fixed App Bar */}
      <header className="shrink-0 z-30 bg-black/95 backdrop-blur-md border-b border-neutral-900 px-4 sm:px-6 pt-[max(0rem,env(safe-area-inset-top))] h-[calc(2.75rem+env(safe-area-inset-top))] sm:h-[calc(3rem+env(safe-area-inset-top))] select-none">
        <div className="w-full max-w-[1440px] mx-auto h-full flex items-center justify-between">
          {/* Left: Brand Name VAIURE｜唯昱尔 */}
          <div className="flex items-center">
            <button
              onClick={handleScrollToTop}
              className="group flex items-baseline gap-1.5 sm:gap-2 cursor-pointer focus:outline-none"
              title="VAIURE 唯昱尔 — Return to Top"
            >
              <span className="font-display text-sm sm:text-base font-bold tracking-[0.2em] uppercase text-white group-hover:text-white/80 transition-colors">
                VAIURE
              </span>
              <span className="text-white/35 font-light text-xs sm:text-sm">｜</span>
              <span className="text-xs sm:text-sm font-light text-white/85 font-sans tracking-widest">
                唯昱尔
              </span>
            </button>
          </div>


          {/* Right: Actions Cluster (Search, Language, Menu) */}
          <div className="flex items-center gap-2">

            {/* Shorts Button */}
            {onOpenShorts && (
              <button
                onClick={onOpenShorts}
                className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 hover:border-red-500/60 text-red-300 hover:text-white text-[10px] font-mono tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                title="Open VAIURE Shorts (Social Video)"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>{t('navShorts')}</span>
              </button>
            )}

            {/* Direct Messages Dispatch Button */}
            {onOpenMessages && (
              <button
                onClick={onOpenMessages}
                aria-label="Direct Messages"
                title="Direct Messages // Atelier Dispatches"
                className="relative flex w-8 h-8 rounded-full items-center justify-center text-white/70 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[13px] h-[13px] px-1 rounded-full bg-white text-black font-mono text-[8px] font-bold flex items-center justify-center leading-none ring-1 ring-black">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            )}

            {/* Search Modal Trigger */}
            <button
              onClick={onOpenSearch}
              aria-label="Search"
              title="Search Archive & Index"
              className="flex w-8 h-8 rounded-full items-center justify-center text-white/70 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Language Switcher */}
            <LanguageSwitcher variant="compact" />
          </div>
        </div>
      </header>

      {/* Main Center Stream Container (Scrollable) */}
      <div
        id="slide-threads-viewport"
        className="flex-1 w-full overflow-y-auto overflow-x-hidden min-h-0 select-text"
      >
        <main className="max-w-[620px] w-full mx-auto pb-16">
        {/* Sub-tabs: For You / Following (Native Threads Experience) */}
        <div className="flex border-b border-neutral-900 text-xs font-semibold select-none">
          <button
            onClick={() => setActiveTab('FOR_YOU')}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTab === 'FOR_YOU' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>{t('forYou')}</span>
            {activeTab === 'FOR_YOU' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[1.5px] bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('FOLLOWING')}
            className={`flex-1 py-3 text-center transition-colors relative ${
              activeTab === 'FOLLOWING' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <span>{t('following')}</span>
            {activeTab === 'FOLLOWING' && (
              <span className="absolute bottom-0 left-1/4 right-1/4 h-[1.5px] bg-white rounded-full" />
            )}
          </button>
        </div>

        {/* Top Creator Inline Composer Row */}
        <div
          onClick={() => setIsNewThreadOpen(true)}
          className="px-4 py-3.5 border-b border-neutral-900 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-950/60 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-800 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt="" className="w-full h-full object-cover filter grayscale" />
              ) : (
                <span>{currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'VA'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white tracking-tight leading-none mb-1">
                {currentUser.username ? `@${currentUser.username}` : t('startAThread')}
              </p>
              <p className="text-sm text-neutral-500 font-sans leading-none truncate">
                {t('whatsOnYourMind')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsNewThreadOpen(true);
            }}
            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-mono text-white flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
            title="Upload & Post Image"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>
        </div>

        {/* Feed Stream — Real User Data Only */}
        {isLoading && (
          <div className="divide-y divide-neutral-900 p-4 space-y-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-3 animate-pulse pt-4">
                <div className="w-10 h-10 rounded-full bg-neutral-900 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-neutral-900 rounded w-28" />
                  <div className="h-4 bg-neutral-900 rounded w-4/5" />
                  <div className="h-4 bg-neutral-900 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredThreads.length === 0 && (
          <div className="py-20 px-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full border border-neutral-800 bg-neutral-950 flex items-center justify-center mx-auto text-neutral-400">
              <MessageCircle className="w-5 h-5 stroke-[1.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white tracking-tight">
                {activeTab === 'FOLLOWING' ? t('noThreadsFollowing') : t('noThreadsYet')}
              </h3>
              <p className="text-xs text-neutral-500 font-sans max-w-xs mx-auto leading-relaxed">
                {activeTab === 'FOLLOWING'
                  ? t('noThreadsFollowingDesc')
                  : t('beFirstToStart')}
              </p>
            </div>
            <button
              onClick={() => {
                if (!currentUser.id) {
                  onOpenAuthModal?.();
                  return;
                }
                setIsNewThreadOpen(true);
              }}
              className="px-5 py-2 bg-white text-black font-semibold text-xs rounded-full hover:bg-neutral-200 transition-colors shadow-md cursor-pointer"
            >
              {t('startAThread')}
            </button>
          </div>
        )}

        <div className="divide-y divide-neutral-900">
          {!isLoading && filteredThreads.map((thread) => {
            const isLiked = Boolean(thread.isLiked);
            const isReposted = Boolean(thread.isReposted);
            const isSaved = savedThreadIds.includes(thread.id);
            const isFollowingAuthor = followingUsernames.includes(thread.authorUsername);
            const isSelf = thread.authorUsername === currentUser.username;

            return (
              <article key={thread.id} className="p-4 hover:bg-white/[0.01] transition-colors">
                <div className="flex items-start gap-3">
                  {/* Left Column: Avatar + Vertical Connector Line */}
                  <div className="flex flex-col items-center flex-shrink-0 self-stretch">
                    <div className="relative">
                      <div
                        onClick={() => onOpenProfile(thread.authorUsername)}
                        className="w-10 h-10 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex items-center justify-center cursor-pointer text-xs font-mono"
                      >
                        {thread.authorAvatar ? (
                          <img src={thread.authorAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span>{thread.authorUsername.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>

                      {/* Follow (+) badge on avatar (Exact from reference) */}
                      {!isSelf && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onToggleFollow) {
                              onToggleFollow(thread.authorUsername);
                            } else {
                              onOpenProfile(thread.authorUsername);
                            }
                          }}
                          title={isFollowingAuthor ? 'Following' : `Follow @${thread.authorUsername}`}
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shadow hover:scale-110 transition-transform ${
                            isFollowingAuthor
                              ? 'bg-neutral-800 text-emerald-400 border border-neutral-700'
                              : 'bg-white text-black'
                          }`}
                        >
                          {isFollowingAuthor ? (
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          ) : (
                            <Plus className="w-3 h-3 stroke-[3]" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Signature Threads Vertical Connecting Line */}
                    <div className="w-0.5 bg-neutral-800/80 flex-1 my-2.5 rounded-full" />
                  </div>

                  {/* Right Column: Author, Time, Text, Media, Actions */}
                  <div className="flex-1 min-w-0 pb-1">
                    {/* Top Row: Username + Time + More menu */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onOpenProfile(thread.authorUsername)}
                          className="text-sm font-semibold text-white hover:underline cursor-pointer tracking-tight"
                        >
                          {thread.authorUsername}
                        </span>
                        <span className="text-xs text-neutral-500 font-sans">
                          {formatRelativeTime(thread.createdAt)}
                        </span>
                      </div>
                      <button
                        onClick={() => setMenuThread(thread)}
                        className="text-neutral-500 hover:text-white p-1 rounded-full hover:bg-neutral-900 transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Post Content */}
                    <p className="text-sm font-sans text-neutral-100 font-light leading-relaxed mt-1 whitespace-pre-wrap break-words">
                      {thread.content}
                    </p>

                    {/* Quoted Thread Box (Like badboy745677 post in screenshot) */}
                    {thread.quotedThread && (
                      <div className="mt-2.5 p-3 rounded-xl border border-neutral-800 bg-neutral-950/80 space-y-1.5 hover:border-neutral-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-neutral-800 bg-neutral-900 flex-shrink-0">
                            <img src={thread.quotedThread.authorAvatar} alt="" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-xs font-semibold text-white">
                            {thread.quotedThread.authorUsername}
                          </span>
                          <span className="text-[11px] text-neutral-500">
                            {thread.quotedThread.createdAt}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 font-light leading-relaxed">
                          {thread.quotedThread.content}
                        </p>
                      </div>
                    )}

                    {/* Media Gallery / Optimized WebP Images with Zero CLS */}
                    {thread.mediaUrls && thread.mediaUrls.length > 0 && (
                      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none snap-x">
                        {thread.mediaUrls.map((url, imgIdx) => {
                          const optItem = thread.optimizedImages?.[imgIdx];
                          const previewSrc = optItem?.thumbnailUrl || url;
                          const fullSrc = optItem?.url || url;

                          return (
                            <div
                              key={imgIdx}
                              onClick={() => setLightboxImage(fullSrc)}
                              className="group/img relative w-44 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 flex-shrink-0 snap-start cursor-pointer hover:border-neutral-700 transition-all"
                            >
                              <img
                                src={previewSrc}
                                alt="Editorial Visual"
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover/img:scale-[1.02] transition-transform duration-300"
                              />

                              {/* Subtle WebP & Quality Indicator */}
                              {optItem?.format && (
                                <div className="absolute top-2 left-2 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider text-white/80 border border-white/10">
                                  {optItem.format}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Chained Thoughts (Add to thread items) */}
                    {thread.chainedThoughts && thread.chainedThoughts.length > 0 && (
                      <div className="mt-3 pl-3 border-l border-neutral-800 space-y-2">
                        {thread.chainedThoughts.map((c) => (
                          <div key={c.id} className="text-xs text-neutral-300 font-light">
                            {c.content}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Engagement Actions Row (Heart, Reply, Repost, Share) */}
                    <div className="flex items-center gap-5 mt-3 pt-1 text-white">
                      <button
                        onClick={() => handleLike(thread.id, isLiked, thread.likesCount)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isLiked ? 'text-red-500' : 'text-neutral-300 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-[19px] h-[19px] stroke-[1.8] ${isLiked ? 'fill-red-500' : ''}`} />
                        {thread.likesCount > 0 && (
                          <span className="text-xs font-sans font-normal text-neutral-400">
                            {thread.likesCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => setActiveReplyThread(thread)}
                        className="flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="View replies & comment"
                      >
                        <MessageCircle className="w-[19px] h-[19px] stroke-[1.8]" />
                        {thread.repliesCount > 0 && (
                          <span className="text-xs font-sans font-normal text-neutral-400">
                            {thread.repliesCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleRepost(thread.id, isReposted, thread.repostsCount)}
                        className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                          isReposted ? 'text-emerald-400' : 'text-neutral-300 hover:text-white'
                        }`}
                      >
                        <Repeat className="w-[19px] h-[19px] stroke-[1.8]" />
                        {thread.repostsCount > 0 && (
                          <span className="text-xs font-sans font-normal text-neutral-400">
                            {thread.repostsCount}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={() => handleShare(thread)}
                        className="text-neutral-300 hover:text-white transition-colors cursor-pointer"
                        title="Copy link to thread"
                      >
                        {copiedId === thread.id ? (
                          <Check className="w-[19px] h-[19px] text-emerald-400 stroke-[2]" />
                        ) : (
                          <Send className="w-[19px] h-[19px] stroke-[1.8]" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </main>
      </div>

      {/* Bottom Navigation Area: Anchored footer with 10s auto compact pop-in icon & click pop-out */}
      <div className="relative shrink-0 z-40 w-full select-none">
        {/* 1. Compact Pop-In Icon (Docked at bottom-left to prevent overlap with LiveMultiplayerDock): Click to restore */}
        <div
          className={`absolute left-4 sm:left-6 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isNavCompact
              ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
              : 'opacity-0 scale-75 translate-y-2 pointer-events-none'
          }`}
          aria-hidden={!isNavCompact}
        >
          <button
            onClick={handlePopOutNav}
            aria-label="Expand navigation menu"
            title="Expand navigation menu"
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/95 backdrop-blur-md border border-neutral-800 hover:border-neutral-600 text-white shadow-[0_8px_32px_rgba(0,0,0,0.85)] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 group"
          >
            <Compass className="w-5 h-5 stroke-[1.8] text-white group-hover:text-cyan-400 transition-colors" />
          </button>
        </div>

        {/* 2. Normal Expanded Navbar Menu: Follows down with 0 delay, slides out on 10s inactivity or manual hide */}
        <div
          className={`w-full bg-black/95 backdrop-blur-md border-t border-neutral-900 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isNavCompact
              ? 'opacity-0 translate-y-full pointer-events-none'
              : 'opacity-100 translate-y-0 pointer-events-auto'
          }`}
          aria-hidden={isNavCompact}
        >
          <nav
            role="navigation"
            aria-label="Threads Bottom Navigation"
            className="max-w-[620px] mx-auto px-6 py-2.5 flex items-center justify-between w-full"
          >
            {/* 1. Home */}
            <button
              onClick={() => handleNavAction(handleScrollToTop)}
              aria-label="Home / Top"
              className="text-white hover:text-white/80 p-2 transition-colors cursor-pointer"
              title="Return to top"
            >
              <Home className="w-6 h-6 stroke-[2] fill-white" />
            </button>

            {/* 2. Search */}
            <button
              onClick={() => handleNavAction(onOpenSearch)}
              aria-label="Search Archive"
              className="text-neutral-500 hover:text-white p-2 transition-colors cursor-pointer"
              title="Search Archive"
            >
              <Search className="w-6 h-6 stroke-[2]" />
            </button>

            {/* 3. Center [+] Compose button */}
            <button
              onClick={() => {
                handleNavAction();
                if (!currentUser.id) {
                  onOpenAuthModal?.();
                  return;
                }
                setIsNewThreadOpen(true);
              }}
              aria-label="Compose new thread"
              className="w-10 h-8 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white hover:bg-neutral-800 active:scale-95 transition-all shadow-sm cursor-pointer"
              title="New Thread"
            >
              <Plus className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* 4. Heart (Activity / Notifications) */}
            <button
              onClick={() => handleNavAction(onOpenNotifications)}
              aria-label="Notifications"
              className="relative text-neutral-500 hover:text-white p-2 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Heart className="w-6 h-6 stroke-[2]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>

            {/* 5. User Profile */}
            <button
              onClick={() => {
                handleNavAction();
                if (!currentUser.id) {
                  onOpenAuthModal?.();
                } else {
                  onOpenProfile(currentUser.username);
                }
              }}
              aria-label="Profile"
              className="text-neutral-500 hover:text-white p-2 transition-colors cursor-pointer"
              title="Profile"
            >
              <UserIcon className="w-6 h-6 stroke-[2]" />
            </button>

            {/* 6. Hide / Collapse Navbar */}
            <button
              onClick={() => setIsNavCompact(true)}
              aria-label="Hide navigation bar"
              className="text-neutral-500 hover:text-white p-2 transition-colors cursor-pointer"
              title="Hide navigation bar"
            >
              <ChevronDown className="w-5 h-5 stroke-[2]" />
            </button>
          </nav>
        </div>
      </div>

      {/* New Thread Composer Modal */}
      <NewThreadModal
        isOpen={isNewThreadOpen}
        currentUser={currentUser}
        onClose={() => setIsNewThreadOpen(false)}
        onSubmit={handleCreateThread}
      />

      {/* Thread Discussion / Reply Modal */}
      <ThreadReplyModal
        thread={activeReplyThread}
        currentUser={currentUser}
        isOpen={Boolean(activeReplyThread)}
        onClose={() => setActiveReplyThread(null)}
        onOpenProfile={onOpenProfile}
        onOpenAuthModal={onOpenAuthModal}
      />

      {/* Media Lightbox Viewer */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in"
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Full Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

      {/* More Options Sheet */}
      {menuThread && (
        <div
          onClick={() => setMenuThread(null)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-text"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-[#121217] border border-neutral-800 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 text-sm text-neutral-200 shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-200"
          >
            <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-3 sm:hidden" />
            <button
              onClick={() => {
                handleShare(menuThread);
                setMenuThread(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-left transition-colors"
            >
              <Share2 className="w-4 h-4 text-neutral-400" />
              <span>{t('copyLinkToThread')}</span>
            </button>

            <button
              onClick={() => toggleSave(menuThread.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-left transition-colors cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-neutral-400" />
              <span>{savedThreadIds.includes(menuThread.id) ? t('removeFromSaved') : t('saveThread')}</span>
            </button>

            <button
              onClick={() => {
                if (onToggleFollow) onToggleFollow(menuThread.authorUsername);
                setMenuThread(null);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-800 text-left transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-neutral-400" />
              <span>{t('toggleFollow')} @{menuThread.authorUsername}</span>
            </button>

            {(currentUser.id === menuThread.authorId || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN') && (
              <button
                onClick={async () => {
                  const targetThread = menuThread;
                  setMenuThread(null);
                  setThreads((prev) => prev.filter((t) => t.id !== targetThread.id));
                  await deleteForumThread(targetThread.id, targetThread.authorId);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-950/40 text-red-400 hover:text-red-300 text-left transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span>Delete Thread</span>
              </button>
            )}

            <button
              onClick={() => setMenuThread(null)}
              className="w-full py-2.5 text-center text-xs font-mono text-neutral-400 hover:text-white border-t border-neutral-800 mt-2 cursor-pointer"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
