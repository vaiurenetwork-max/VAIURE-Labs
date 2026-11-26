/**
 * IVNTRI — The New Visual Culture of AI
 * Production-ready real social platform and editorial archive.
 * ZERO fake template data — 100% powered by real Firebase Authentication & Firestore.
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { MotionConfig } from 'motion/react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeaturedStorySection } from './components/FeaturedStorySection';
import { FashionSection } from './components/FashionSection';
import { FilmSection } from './components/FilmSection';
import { ArtistSection } from './components/ArtistSection';
import { StudioSection } from './components/StudioSection';
import { SubmissionSection } from './components/SubmissionSection';
import { Footer } from './components/Footer';

// Navigation & Slide Controller
import { MobileBottomDock } from './components/mobile/MobileBottomDock';
import { FloatingSlideSwitch } from './components/navigation/FloatingSlideSwitch';
import { useSlideNavigation } from './hooks/useSlideNavigation';
import { CustomCursor } from './components/CustomCursor';
import { SlideMenuDrawer } from './components/navigation/SlideMenuDrawer';
import { VaiureToastHost, ToastNotice } from './components/ui/VaiurePrimitives';
import { Slide0MotionHero } from './components/hero/Slide0MotionHero';
import { CinematicIntro } from './components/brand/CinematicIntro';
import { checkAdminPrivileges } from './services/adminService';
import { fetchUserByHandleOrId } from './services/firestoreSocialService';

// Shared cached module loaders (powers both React.lazy and eager/hover preloading)
const loadThreadsMainFeed = () =>
  import('./components/threads/ThreadsMainFeed').then((m) => ({ default: m.ThreadsMainFeed }));
const loadSocialFeedSection = () =>
  import('./components/social/SocialFeedSection').then((m) => ({ default: m.SocialFeedSection }));
const loadForumSection = () =>
  import('./components/forum/ForumSection').then((m) => ({ default: m.ForumSection }));
const loadVaiureCinemaSlide = () =>
  import('./components/cinema/VaiureCinemaSlide').then((m) => ({ default: m.VaiureCinemaSlide }));
const loadVaiureLabsSlide = () =>
  import('./components/labs/VaiureLabsSlide').then((m) => ({ default: m.VaiureLabsSlide }));
const loadFuLabsGreyboxSlide = () =>
  import('./components/fulabs/FuLabsGreyboxSlide').then((m) => ({ default: m.FuLabsGreyboxSlide }));
const loadVxSlide = () =>
  import('./components/vx/VxSlide').then((m) => ({ default: m.VxSlide }));
const loadVaiByteCanvasSlide = () =>
  import('./components/canvas/VaiByteCanvasSlide').then((m) => ({ default: m.VaiByteCanvasSlide }));
const loadShortsView = () =>
  import('./components/shorts/ShortsView').then((m) => ({ default: m.ShortsView }));

const loadCreatePostModal = () =>
  import('./components/social/CreatePostModal').then((m) => ({ default: m.CreatePostModal }));
const loadUserProfileModal = () =>
  import('./components/social/UserProfileModal').then((m) => ({ default: m.UserProfileModal }));
const loadCommentsDrawer = () =>
  import('./components/social/CommentsDrawer').then((m) => ({ default: m.CommentsDrawer }));
const loadCollectionsModal = () =>
  import('./components/social/CollectionsModal').then((m) => ({ default: m.CollectionsModal }));
const loadDirectMessagesModal = () =>
  import('./components/social/DirectMessagesModal').then((m) => ({ default: m.DirectMessagesModal }));
const loadNotificationsDrawer = () =>
  import('./components/social/NotificationsDrawer').then((m) => ({ default: m.NotificationsDrawer }));
const loadSharePostModal = () =>
  import('./components/social/SharePostModal').then((m) => ({ default: m.SharePostModal }));
const loadModerationModal = () =>
  import('./components/social/ModerationModal').then((m) => ({ default: m.ModerationModal }));
const loadAuthModal = () =>
  import('./components/AuthModal').then((m) => ({ default: m.AuthModal }));
const loadSubmissionModal = () =>
  import('./components/SubmissionModal').then((m) => ({ default: m.SubmissionModal }));
const loadIndexDrawer = () =>
  import('./components/modals/IndexDrawer').then((m) => ({ default: m.IndexDrawer }));
const loadCommandPaletteModal = () =>
  import('./components/modals/CommandPaletteModal').then((m) => ({ default: m.CommandPaletteModal }));
const loadSettingsCenterModal = () =>
  import('./components/settings/SettingsCenterModal').then((m) => ({ default: m.SettingsCenterModal }));
const loadWalletModal = () =>
  import('./components/wallet/WalletModal').then((m) => ({ default: m.WalletModal }));
const loadIvntriAdminModal = () =>
  import('./components/admin/IvntriAdminModal').then((m) => ({ default: m.IvntriAdminModal }));
const loadCinemaModal = () =>
  import('./components/media/CinemaModal').then((m) => ({ default: m.CinemaModal }));
const loadCopyAssistantModal = () =>
  import('./components/modals/CopyAssistantModal').then((m) => ({ default: m.CopyAssistantModal }));

// Lazy-loaded Slides & Heavy Views
const ThreadsMainFeed = lazy(loadThreadsMainFeed);
const SocialFeedSection = lazy(loadSocialFeedSection);
const ForumSection = lazy(loadForumSection);
const VaiureCinemaSlide = lazy(loadVaiureCinemaSlide);
const VaiureLabsSlide = lazy(loadVaiureLabsSlide);
const FuLabsGreyboxSlide = lazy(loadFuLabsGreyboxSlide);
const VxSlide = lazy(loadVxSlide);
const VaiByteCanvasSlide = lazy(loadVaiByteCanvasSlide);
const ShortsView = lazy(loadShortsView);

// Lazy-loaded Modals
const CreatePostModal = lazy(loadCreatePostModal);
const UserProfileModal = lazy(loadUserProfileModal);
const CommentsDrawer = lazy(loadCommentsDrawer);
const CollectionsModal = lazy(loadCollectionsModal);
const DirectMessagesModal = lazy(loadDirectMessagesModal);
const NotificationsDrawer = lazy(loadNotificationsDrawer);
const SharePostModal = lazy(loadSharePostModal);
const ModerationModal = lazy(loadModerationModal);
const AuthModal = lazy(loadAuthModal);
const SubmissionModal = lazy(loadSubmissionModal);
const IndexDrawer = lazy(loadIndexDrawer);
const CommandPaletteModal = lazy(loadCommandPaletteModal);
const SettingsCenterModal = lazy(loadSettingsCenterModal);
const WalletModal = lazy(loadWalletModal);
const IvntriAdminModal = lazy(loadIvntriAdminModal);
const CinemaModal = lazy(loadCinemaModal);
const CopyAssistantModal = lazy(loadCopyAssistantModal);

const prefetchedKeys = new Set<string>();
function safePreload(key: string, loader: () => Promise<unknown>): void {
  if (prefetchedKeys.has(key)) return;
  prefetchedKeys.add(key);
  loader().catch(() => {
    prefetchedKeys.delete(key);
  });
}

let menuWorkspacesWarmed = false;
function preloadMenuWorkspaces(): void {
  if (menuWorkspacesWarmed) return;
  menuWorkspacesWarmed = true;
  // Wave 1: Menu utility modals + core slides so menu clicks respond instantaneously
  safePreload('command-palette', loadCommandPaletteModal);
  safePreload('auth', loadAuthModal);
  safePreload('profile', loadUserProfileModal);
  safePreload('messages', loadDirectMessagesModal);
  safePreload('settings', loadSettingsCenterModal);
  safePreload('wallet', loadWalletModal);
  safePreload('submit', loadSubmissionModal);
  safePreload('copy-studio', loadCopyAssistantModal);
  safePreload('index', loadIndexDrawer);
  safePreload('notifications', loadNotificationsDrawer);
  safePreload('slide-1', loadThreadsMainFeed);
  safePreload('slide-2a', loadSocialFeedSection);
  safePreload('slide-2b', loadForumSection);
  safePreload('slide-3', loadVaiureCinemaSlide);
  safePreload('slide-4', loadVaiureLabsSlide);
  safePreload('slide-6', loadVxSlide);
  safePreload('shorts', loadShortsView);

  // Wave 2: Heavy 3D / Canvas workspaces after a brief idle yield
  setTimeout(() => {
    safePreload('slide-5', loadFuLabsGreyboxSlide);
    safePreload('slide-7', loadVaiByteCanvasSlide);
  }, 450);
}

function preloadDestination(target: string): void {
  switch (target) {
    case 'menu-all':
      preloadMenuWorkspaces();
      break;
    case 'slide-1':
      safePreload('slide-1', loadThreadsMainFeed);
      break;
    case 'slide-2':
      safePreload('slide-2a', loadSocialFeedSection);
      safePreload('slide-2b', loadForumSection);
      break;
    case 'slide-3':
      safePreload('slide-3', loadVaiureCinemaSlide);
      break;
    case 'slide-4':
      safePreload('slide-4', loadVaiureLabsSlide);
      break;
    case 'slide-5':
      safePreload('slide-5', loadFuLabsGreyboxSlide);
      break;
    case 'slide-6':
      safePreload('slide-6', loadVxSlide);
      break;
    case 'slide-7':
      safePreload('slide-7', loadVaiByteCanvasSlide);
      break;
    case 'shorts':
      safePreload('shorts', loadShortsView);
      break;
    case 'command-palette':
      safePreload('command-palette', loadCommandPaletteModal);
      break;
    case 'messages':
      safePreload('messages', loadDirectMessagesModal);
      break;
    case 'submit':
      safePreload('submit', loadSubmissionModal);
      break;
    case 'wallet':
      safePreload('wallet', loadWalletModal);
      break;
    case 'copy-studio':
      safePreload('copy-studio', loadCopyAssistantModal);
      break;
    case 'settings':
      safePreload('settings', loadSettingsCenterModal);
      break;
    case 'admin':
      safePreload('admin', loadIvntriAdminModal);
      break;
    case 'auth':
      safePreload('auth', loadAuthModal);
      break;
    case 'profile':
      safePreload('profile', loadUserProfileModal);
      break;
    case 'comments':
      safePreload('comments', loadCommentsDrawer);
      break;
    case 'notifications':
      safePreload('notifications', loadNotificationsDrawer);
      break;
    case 'collections':
      safePreload('collections', loadCollectionsModal);
      break;
    case 'index':
      safePreload('index', loadIndexDrawer);
      break;
    case 'create-post':
      safePreload('create-post', loadCreatePostModal);
      break;
    case 'share':
      safePreload('share', loadSharePostModal);
      break;
    case 'moderation':
      safePreload('moderation', loadModerationModal);
      break;
    case 'cinema-modal':
      safePreload('cinema-modal', loadCinemaModal);
      break;
    default:
      break;
  }
}

const SlideLoadingFallback: React.FC<{ bg?: string; label?: string }> = ({
  bg = 'bg-[#050507]',
  label = 'LOADING WORKSPACE',
}) => (
  <div className={`w-full h-full ${bg} flex items-center justify-center text-white/60 font-mono text-[10px] tracking-[0.22em] uppercase select-none`}>
    <div className="flex items-center gap-3 px-4 py-2 border border-white/10 bg-black/50">
      <span className="w-2.5 h-2.5 rounded-full border border-white/70 border-t-transparent animate-spin" />
      <span>{label}</span>
    </div>
  </div>
);

const ModalLoadingFallback: React.FC = () => (
  <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center pointer-events-auto select-none">
    <div className="px-4 py-2 bg-[#0c0c0f] border border-white/15 text-white/75 font-mono text-[10px] tracking-[0.2em] uppercase flex items-center gap-2.5">
      <span className="w-2.5 h-2.5 rounded-full border border-white/80 border-t-transparent animate-spin" />
      <span>OPENING</span>
    </div>
  </div>
);

import { useSocialStore } from './services/socialStore';
import { SocialPost, UserProfile } from './types/social';
import { VxModelId } from './types/vx';
import { AmbientReactionOverlay } from './components/multiplayer/AmbientReactionOverlay';
import { LiveMultiplayerDock } from './components/multiplayer/LiveMultiplayerDock';
import { AtelierSlideId } from './types/multiplayer';

export default function App() {
  const [selectedVxModel, setSelectedVxModel] = useState<VxModelId>('gemini-3.8');
  const [isShortsOpen, setIsShortsOpen] = useState(false);
  const [isSlideMenuOpen, setIsSlideMenuOpen] = useState(false);
  const [replayIntro, setReplayIntro] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Real Social State from Firestore
  const {
    posts,
    currentUser,
    creators,
    comments,
    notifications,
    conversations,
    authState,
    toggleLikePost,
    toggleSavePost,
    toggleFollowCreator,
    repostPost,
    addComment,
    likeComment,
    deleteComment,
    createPost,
    createCollection,
    removePostFromCollection,
    sendMessage,
    markNotificationsRead,
    reportPost,
    blockUser,
    muteUser,
    signOutUser,
    updateCurrentUsername,
    updateCurrentUserProfile,
  } = useSocialStore();

  // Modals & Panels State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isIndexDrawerOpen, setIsIndexDrawerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Social Specific Modals State
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [activeProfileUser, setActiveProfileUser] = useState<UserProfile | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'posts' | 'threads' | 'saved' | 'about'>('posts');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<SocialPost | null>(null);
  const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
  const [isDirectMessagesOpen, setIsDirectMessagesOpen] = useState(false);
  const [directMessageRecipient, setDirectMessageRecipient] = useState<UserProfile | null>(null);
  const [directMessageIsCollab, setDirectMessageIsCollab] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeSharePost, setActiveSharePost] = useState<SocialPost | null>(null);
  const [moderationTarget, setModerationTarget] = useState<{ postId: string | null; authorId: string | null } | null>(null);

  // Account, Wallet, Settings & Admin System State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletInitialTab, setWalletInitialTab] = useState<
    'dashboard' | 'top_up' | 'convert' | 'transactions' | 'converter'
  >('dashboard');
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeCinemaPost, setActiveCinemaPost] = useState<SocialPost | null>(null);
  const [isCopyStudioOpen, setIsCopyStudioOpen] = useState(false);
  const [copyStudioPrefill, setCopyStudioPrefill] = useState<{
    title: string;
    caption: string;
    category: any;
    tags: string;
    aiTools: string;
  } | null>(null);

  // Unified 7-Slide Navigation Controller (Slide 0 = Motion Hero default page)
  const isAnyModalOpen =
    isSubmitModalOpen ||
    isIndexDrawerOpen ||
    isCommandPaletteOpen ||
    isAuthModalOpen ||
    isCreatePostOpen ||
    isProfileModalOpen ||
    isCollectionsModalOpen ||
    isDirectMessagesOpen ||
    isNotificationsOpen ||
    activeSharePost !== null ||
    moderationTarget !== null ||
    isSettingsOpen ||
    isWalletOpen ||
    isAdminOpen ||
    activeCinemaPost !== null ||
    isCopyStudioOpen ||
    isSlideMenuOpen ||
    isShortsOpen;

  // Global Cmd+K / Ctrl+K shortcut for Command Palette
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  // Hideable / Minimizable Workspace State for Slides 1–7 over Slide 0 Hero
  const [isSlidesMinimized, setIsSlidesMinimized] = useState(false);
  const [minimizedSlideIndex, setMinimizedSlideIndex] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | null>(null);
  const [canvasToSeedanceImages, setCanvasToSeedanceImages] = useState<string[]>([]);
  const [seedanceInitialView, setSeedanceInitialView] = useState<
    'overview' | 'generator' | 'reference' | 'history' | 'plans' | 'credits' | 'agent' | 'streams' | 'rooms' | 'account' | 'admin' | undefined
  >(undefined);

  const {
    containerRef,
    currentSlide: activeSlide,
    goToSlide: rawSetActiveSlide,
  } = useSlideNavigation({
    initialSlide: 0,
    totalSlides: 8,
    swipeThreshold: 75,
    transitionDurationMs: 240,
    isModalOpen: isAnyModalOpen,
    enableSwipe: true, // Smooth horizontal touch gestures with strict horizontal angle & interactive exclusions
    enableKeyboard: false, // Prevent accidental arrow-key sliding
  });

  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    setVisitedSlides((prev) => {
      if (prev.has(activeSlide)) return prev;
      const next = new Set(prev);
      next.add(activeSlide);
      return next;
    });
  }, [activeSlide]);

  // Idle background prefetch after Slide 0 hero first paint
  useEffect(() => {
    let cancelled = false;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const triggerWarmup = () => {
      if (!cancelled) preloadMenuWorkspaces();
    };
    const timer = window.setTimeout(() => {
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(triggerWarmup, { timeout: 600 });
      } else {
        triggerWarmup();
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Immediately warm all menu destinations the instant the slide menu drawer opens
  useEffect(() => {
    if (isSlideMenuOpen) {
      preloadMenuWorkspaces();
    }
  }, [isSlideMenuOpen]);

  // Safe explicit slide navigation helper
  const setActiveSlide = (targetSlide: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
    if (targetSlide === 0) {
      setIsSlidesMinimized(false);
      rawSetActiveSlide(0);
    } else {
      setIsSlidesMinimized(false);
      setMinimizedSlideIndex(targetSlide);
      setVisitedSlides((prev) => {
        if (prev.has(targetSlide)) return prev;
        const next = new Set(prev);
        next.add(targetSlide);
        return next;
      });
      rawSetActiveSlide(targetSlide);
    }
  };

  // Minimize current active slide (1-7) down to compact bar over Slide 0 Hero
  const handleMinimizeCurrentSlide = () => {
    if (activeSlide > 0) {
      setMinimizedSlideIndex(activeSlide as 1 | 2 | 3 | 4 | 5 | 6 | 7);
      setIsSlidesMinimized(true);
      rawSetActiveSlide(0);
    }
  };

  // Completely hide/close Slides 1-7 and return to full-screen Slide 0 Hero
  const handleHideAllSlides = () => {
    setIsSlidesMinimized(false);
    setMinimizedSlideIndex(null);
    rawSetActiveSlide(0);
  };

  // Restore minimized slide
  const handleRestoreMinimizedSlide = () => {
    if (minimizedSlideIndex) {
      setIsSlidesMinimized(false);
      rawSetActiveSlide(minimizedSlideIndex);
    }
  };

  const slideLabels: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, string> = {
    1: '01 / THREADS',
    2: '02 / ARCHIVE',
    3: '03 / AI STUDIO',
    4: '04 / SEEDANCE LAB',
    5: '05 / FU LABS',
    6: '06 / VX',
    7: '07 / VAIBYTE CANVAS',
  };

  // Check server-side admin privileges for current authenticated user
  useEffect(() => {
    if (currentUser?.id) {
      checkAdminPrivileges(currentUser.id, (currentUser as any).email).then((res) => {
        setIsAdmin(res.isAdmin);
      });
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  // Real featured post if designated by editor
  const featuredPost =
    posts.find((p) => (p as any).isFeaturedLead === true || (p as any).isEditorialSelected === true) ||
    posts[0] ||
    null;

  // Scroll spy to update active navigation anchor
  useEffect(() => {
    const container = document.getElementById('slide-archive-container');
    const handleScroll = () => {
      const sections = [
        'hero',
        'social-feed',
        'featured-story',
        'fashion',
        'film',
        'artists',
        'studios',
        'selection',
        'magazine',
        'submit-section',
        'about',
      ];
      const scrollY = container ? container.scrollTop : window.scrollY;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop - 120;
          const height = el.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeSlide]);

  const scrollToSection = (sectionId: string, attempt = 0) => {
    const el = document.getElementById(sectionId);
    const container = document.getElementById('slide-archive-container');
    if (el) {
      if (container) {
        const top = Math.max(0, el.offsetTop - 80);
        container.scrollTo({ top, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }
    if (attempt < 12) {
      window.setTimeout(() => scrollToSection(sectionId, attempt + 1), 60);
    }
  };

  // Profile opening helper
  const handleOpenProfile = async (
    username: string,
    initialTab: 'posts' | 'threads' | 'saved' | 'about' = 'posts'
  ) => {
    if (!username) return;
    const cleanUsername = username.replace(/^@/, '').trim();
    setProfileInitialTab(initialTab);

    try {
      history.replaceState(null, '', `#@${cleanUsername}`);
    } catch (_e) {}

    if (currentUser.username && cleanUsername.toLowerCase() === currentUser.username.toLowerCase()) {
      setActiveProfileUser(currentUser);
      setIsProfileModalOpen(true);
      return;
    }

    const target =
      creators[cleanUsername] ||
      (Object.values(creators) as UserProfile[]).find(
        (c) => c.username?.toLowerCase() === cleanUsername.toLowerCase()
      );

    if (target) {
      setActiveProfileUser(target);
      setIsProfileModalOpen(true);
      return;
    }

    try {
      const fetched = await fetchUserByHandleOrId(cleanUsername);
      if (fetched) {
        setActiveProfileUser(fetched);
        setIsProfileModalOpen(true);
      }
    } catch (e) {
      console.warn('Failed to load profile for:', cleanUsername, e);
    }
  };

  const handleCloseProfileModal = () => {
    setIsProfileModalOpen(false);
    if (window.location.hash.startsWith('#@') || window.location.hash.startsWith('#profile/')) {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (_e) {}
    }
  };

  // Deep-linking URL Route Listener for Profiles (#@username or ?profile=username)
  useEffect(() => {
    const handleUrlRoute = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      const profileParam = search.get('profile');

      let target: string | null = null;
      if (profileParam) {
        target = profileParam;
      } else if (hash.startsWith('#@')) {
        target = hash.slice(2);
      } else if (hash.startsWith('#profile/')) {
        target = hash.slice(9);
      } else if (hash.startsWith('#/profile/')) {
        target = hash.slice(10);
      }

      if (target) {
        target = target.split('?')[0].replace(/\/+$/, '');
        if (target) {
          handleOpenProfile(target);
        }
      }
    };

    handleUrlRoute();
    window.addEventListener('hashchange', handleUrlRoute);
    return () => window.removeEventListener('hashchange', handleUrlRoute);
  }, [creators, currentUser.username]);

  // Direct Message opening helper
  const handleOpenDM = (recipient?: UserProfile | null, isCollab = false) => {
    if (authState === 'UNAUTHENTICATED') {
      setIsAuthModalOpen(true);
      return;
    }
    setDirectMessageRecipient(recipient || null);
    setDirectMessageIsCollab(isCollab);
    setIsDirectMessagesOpen(true);
  };

  const handleOpenCreate = () => {
    if (authState === 'UNAUTHENTICATED') {
      setIsAuthModalOpen(true);
      return;
    }
    setIsCreatePostOpen(true);
  };

  // Unified non-blocking Toast Queue
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const pushToast = useCallback((message: string, tone: ToastNotice['tone'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Non-blocking repost trigger
  const handleRepostPrompt = (post: SocialPost) => {
    if (authState === 'UNAUTHENTICATED') {
      setIsAuthModalOpen(true);
      return;
    }
    repostPost(post.id);
    pushToast(`Reposted "${post.title}" to your archive stream`, 'success');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <MotionConfig reducedMotion="user">
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black text-[#ECECE9] font-sans antialiased selection:bg-white/20 selection:text-white">
      {/* Precision Editorial Custom Cursor (Desktop fine pointers only) */}
      <CustomCursor />

      {/* VAIURE Cinematic Logo Introduction: 4-Phase brand sequence with auto-dissolve into platform */}
      <CinematicIntro
        forcePlay={replayIntro}
        onComplete={() => setReplayIntro(false)}
      />

      {/* Unified Non-blocking Notification Toasts */}
      <VaiureToastHost notices={toasts} onDismiss={dismissToast} />

      {/* Viewport Root Container (Auto-Slide Locked & False-Click Protected) */}
      <div
        ref={containerRef}
        className="relative w-screen h-screen overflow-hidden bg-[#050507] select-text"
      >
        {/* =====================================================================
            SLIDE 0: VAIURE Main Motion Hero (Permanent Full-Screen Default Page)
            Never translated, scaled, or shifted; always 100vw x 100dvh
           ===================================================================== */}
        <div
          id="slide-hero0-slide-container"
          className={`fixed inset-0 w-screen h-screen overflow-hidden select-none bg-[#0b0f14] transition-opacity duration-300 ease-editorial ${
            activeSlide === 0
              ? 'pointer-events-auto z-10 opacity-100'
              : 'pointer-events-none z-0 opacity-0 invisible'
          }`}
        >
          <Slide0MotionHero
            isActive={activeSlide === 0}
            onOpenMenu={() => setIsSlideMenuOpen(true)}
            onSeeCampaign={() => setActiveSlide(3)}
            onViewCampaigns={() => setActiveSlide(2)}
            onPrefetchDestination={preloadDestination}
          />

          {/* Hideable & Non-Conflicting Precision Slide Switcher on Slide 0 */}
          {activeSlide === 0 && !isSlidesMinimized && (
            <FloatingSlideSwitch
              activeSlide={0}
              onSelectSlide={(idx) => setActiveSlide(idx)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onPrefetchDestination={preloadDestination}
            />
          )}

          {/* Minimized Workspace Restore Dock on Slide 0 */}
          {isSlidesMinimized && minimizedSlideIndex !== null && (
            <div
              data-no-swipe="true"
              className="fixed bottom-4 left-4 z-35 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0a0a0e]/92 backdrop-blur-xl border border-white/20 shadow-2xl text-white font-mono text-[10px] tracking-[0.15em] uppercase pointer-events-auto min-h-[44px] sm:min-h-[36px]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-white/55">MINIMIZED</span>
              <button
                type="button"
                onClick={handleRestoreMinimizedSlide}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white hover:text-black text-white font-semibold transition-colors cursor-pointer"
                title="Restore minimized slide"
              >
                {slideLabels[minimizedSlideIndex]} ↑
              </button>
              <button
                type="button"
                onClick={handleHideAllSlides}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
                title="Close & hide slide"
                aria-label="Hide minimized slide"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* =====================================================================
            SLIDES 1–4: Hideable & Minimizable Precision Layer (Isolated per slide)
            Only mounts/displays when activeSlide > 0 and not minimized
           ===================================================================== */}
        {activeSlide > 0 && !isSlidesMinimized && (
          <div
            data-no-swipe="true"
            className="fixed inset-0 w-screen h-screen overflow-hidden z-20 bg-[#050507] pointer-events-auto"
          >
            {/* Hideable & Non-Conflicting Precision Slide Switcher (Bottom-Left Dock) */}
            <FloatingSlideSwitch
              activeSlide={activeSlide as any}
              onSelectSlide={(idx) => setActiveSlide(idx)}
              onMinimize={handleMinimizeCurrentSlide}
              onHide={handleHideAllSlides}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              onPrefetchDestination={preloadDestination}
            />

            {/* SLIDE 1: Threads Feed (Slide 01) */}
            <div
              id="slide-threads-slide-container"
              className={` inset-0 w-full h-full overflow-hidden select-text bg-black ${
                activeSlide === 1
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {(activeSlide === 1 || visitedSlides.has(1)) && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-black" label="LOADING THREADS" />}>
                  <ThreadsMainFeed
                    currentUser={currentUser}
                    unreadNotificationsCount={unreadNotificationsCount}
                    unreadMessagesCount={unreadMessagesCount}
                    followingUsernames={creators ? Object.keys(creators) : []}
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onOpenSlideTwo={() => setActiveSlide(2)}
                    onOpenSlideThree={() => setActiveSlide(3)}
                    onOpenLabs={() => setActiveSlide(4)}
                    onOpenShorts={() => setIsShortsOpen(true)}
                    onOpenMessages={() => handleOpenDM()}
                    onOpenSearch={() => setIsIndexDrawerOpen(true)}
                    onOpenNotifications={() => {
                      setIsNotificationsOpen(true);
                      markNotificationsRead();
                    }}
                    onOpenProfile={handleOpenProfile}
                    onToggleFollow={toggleFollowCreator}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  />
                </Suspense>
              )}
            </div>

            {/* SLIDE 2: Full Curatorial Archive Main Page (Slide 02) */}
            <div
              id="slide-archive-slide-container"
              className={`inset-0 w-full h-full overflow-hidden select-text bg-[#050507] text-[#ECECE9] ${
                activeSlide === 2
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {(activeSlide === 2 || visitedSlides.has(2)) && (
                <>
                  {/* Scrollable Archive Content Area */}
                  <div
                    id="slide-archive-container"
                    className="w-full h-full overflow-y-auto overflow-x-hidden select-text pb-24"
                  >
                    <Header
                  activeSlide={activeSlide}
                  activeSection={activeSection}
                  currentUser={currentUser}
                  unreadNotificationsCount={unreadNotificationsCount}
                  unreadMessagesCount={unreadMessagesCount}
                  authState={authState}
                  isAdmin={isAdmin}
                  onNavigate={scrollToSection}
                  onBackToThreads={() => setActiveSlide(1)}
                  onGoToCinema={() => setActiveSlide(3)}
                  onGoToLabs={() => setActiveSlide(4)}
                  onGoToShorts={() => setIsShortsOpen(true)}
                  onOpenSlideMenu={() => setIsSlideMenuOpen(true)}
                  onOpenSubmit={() => setIsSubmitModalOpen(true)}
                  onOpenCreatePost={handleOpenCreate}
                  onOpenNotifications={() => {
                    setIsNotificationsOpen(true);
                    markNotificationsRead();
                  }}
                  onOpenMessages={() => handleOpenDM()}
                  onOpenUserProfile={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      handleOpenProfile(currentUser.username);
                    }
                  }}
                  onOpenMyWorks={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      handleOpenProfile(currentUser.username, 'posts');
                    }
                  }}
                  onOpenSaved={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      handleOpenProfile(currentUser.username, 'saved');
                    }
                  }}
                  onOpenCollections={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      setIsCollectionsModalOpen(true);
                    }
                  }}
                  onSignOut={signOutUser}
                  onOpenIndexDrawer={() => setIsIndexDrawerOpen(true)}
                  onOpenAuthModal={() => setIsAuthModalOpen(true)}
                  onOpenWallet={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      setWalletInitialTab('dashboard');
                      setIsWalletOpen(true);
                    }
                  }}
                  onOpenSettings={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      setIsSettingsOpen(true);
                    }
                  }}
                  onOpenAdmin={() => setIsAdminOpen(true)}
                  onOpenCopyStudio={() => setIsCopyStudioOpen(true)}
                  onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
                />

                <main>
                  {/* Hero Section */}
                  <HeroSection
                    onExplore={() => scrollToSection('social-feed')}
                    onOpenLeadStory={() => {
                      if (featuredPost) {
                        setActiveCommentsPost(featuredPost);
                      } else {
                        scrollToSection('social-feed');
                      }
                    }}
                  />

                  {/* 01 / EXPLORE: Social Feed Layer */}
                  <Suspense fallback={null}>
                    <SocialFeedSection
                      posts={posts}
                      currentUser={currentUser}
                      creators={creators}
                      onToggleLike={toggleLikePost}
                      onToggleSave={toggleSavePost}
                      onToggleFollow={toggleFollowCreator}
                      onOpenComments={(post) => setActiveCommentsPost(post)}
                      onOpenRepost={handleRepostPrompt}
                      onOpenShare={(post) => setActiveSharePost(post)}
                      onOpenProfile={handleOpenProfile}
                      onOpenModeration={(postId, authorId) => setModerationTarget({ postId, authorId })}
                      onOpenCreatePost={handleOpenCreate}
                      onInlineComment={(postId, text) => addComment(postId, text)}
                    />

                    {/* 02 / FORUM & DISCOURSE: Real-time Creator Thoughts & Statuses */}
                    <ForumSection
                      currentUser={currentUser}
                      onOpenAuthModal={() => setIsAuthModalOpen(true)}
                      onOpenProfile={handleOpenProfile}
                    />
                  </Suspense>

                  {/* 03 / EDITORIAL SELECTION: Lead Feature Dossier (if designated) */}
                  {featuredPost && (
                    <FeaturedStorySection
                      featuredPost={featuredPost}
                      onOpenStory={(post) => setActiveCommentsPost(post)}
                    />
                  )}

                  {/* 04 / FASHION: Fashion Works */}
                  <FashionSection
                    posts={posts}
                    onSelectPost={(post) => setActiveCommentsPost(post)}
                  />

                  {/* 05 / FILM: Film Works */}
                  <FilmSection
                    posts={posts}
                    onSelectFilm={(film) => setActiveCinemaPost(film)}
                  />

                  {/* 06 / CREATORS: Real Creators in Firestore */}
                  <ArtistSection
                    creators={creators}
                    onSelectArtist={(artist) => {
                      setActiveProfileUser(artist);
                      setIsProfileModalOpen(true);
                    }}
                  />

                  {/* 07 / ART: Studios */}
                  <StudioSection
                    creators={creators}
                    onSelectStudio={(studio) => {
                      setActiveProfileUser(studio);
                      setIsProfileModalOpen(true);
                    }}
                  />

                  {/* 08 / SUBMIT WORK */}
                  <SubmissionSection
                    onOpenSubmit={() => setIsSubmitModalOpen(true)}
                  />
                </main>

                <Footer
                  onNavigate={scrollToSection}
                  onOpenSubmit={() => setIsSubmitModalOpen(true)}
                />
              </div>

              {/* Permanent Footer Navigation Dock for Slide 2 */}
              <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none select-none">
                <MobileBottomDock
                  activeSection={activeSection}
                  onNavigate={scrollToSection}
                  onOpenCreatePost={handleOpenCreate}
                  onOpenUserProfile={() => {
                    if (authState === 'UNAUTHENTICATED') {
                      setIsAuthModalOpen(true);
                    } else {
                      handleOpenProfile(currentUser.username);
                    }
                  }}
                  onOpenThreads={() => setActiveSlide(1)}
                  onOpenCinema={() => setActiveSlide(3)}
                  onOpenLabs={() => setActiveSlide(4)}
                  onOpenShorts={() => setIsShortsOpen(true)}
                />
              </div>
                </>
              )}
            </div>

            {/* SLIDE 3: LAFOUR-Level Editorial Cinema & Visual Archive (Slide 03) */}
            <div
              id="slide-cinema-viewport"
              className={`inset-0 w-full h-full overflow-hidden bg-[#050507] ${
                activeSlide === 3
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {(activeSlide === 3 || visitedSlides.has(3)) && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-[#050507]" label="LOADING AI HYBRID STUDIO" />}>
                  <VaiureCinemaSlide
                    onBackToSlideOne={() => setActiveSlide(1)}
                    onBackToSlideTwo={() => setActiveSlide(2)}
                    onGoToLabs={() => setActiveSlide(4)}
                    onOpenShorts={() => setIsShortsOpen(true)}
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onOpenSubmit={() => setIsSubmitModalOpen(true)}
                  />
                </Suspense>
              )}
            </div>

            {/* SLIDE 4: VAIURE Labs — AI Image & Video Studio (Slide 04) */}
            <div
              id="slide-labs-viewport"
              className={`inset-0 w-full h-full overflow-hidden bg-[#050507] ${
                activeSlide === 4
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {(activeSlide === 4 || visitedSlides.has(4)) && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-[#050507]" label="LOADING SEEDANCE LAB" />}>
                  <VaiureLabsSlide
                    onBackToSlideOne={() => setActiveSlide(1)}
                    onBackToSlideTwo={() => setActiveSlide(2)}
                    onBackToSlideThree={() => setActiveSlide(3)}
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onOpenCreatePost={handleOpenCreate}
                    onOpenCanvasStudio={() => setActiveSlide(7)}
                    onOpenAuthModal={() => setIsAuthModalOpen(true)}
                    incomingReferenceImages={canvasToSeedanceImages}
                    onConsumeIncomingReferences={() => setCanvasToSeedanceImages([])}
                    currentUser={currentUser}
                    isAdmin={isAdmin}
                    initialView={seedanceInitialView}
                  />
                </Suspense>
              )}
            </div>

            {/* SLIDE 5: Fu Labs — Cinematic 3D Greybox Scene Generator (Slide 05) */}
            <div
              id="slide-fulabs-viewport"
              className={`inset-0 w-full h-full overflow-hidden bg-[#14171c] ${
                activeSlide === 5
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {activeSlide === 5 && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-[#14171c]" label="LOADING FU LABS 3D" />}>
                  <FuLabsGreyboxSlide
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onGoToSlideFour={() => setActiveSlide(4)}
                    onGoToVx={() => setActiveSlide(6)}
                    onBackToHero={() => setActiveSlide(0)}
                    currentUser={currentUser}
                  />
                </Suspense>
              )}
            </div>

            {/* SLIDE 6: VX — Visual Reconstruction Engine (Slide 06) */}
            <div
              id="slide-vx-viewport"
              className={`inset-0 w-full h-full overflow-hidden bg-[#07080a] ${
                activeSlide === 6
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {activeSlide === 6 && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-[#07080a]" label="LOADING VX ENGINE" />}>
                  <VxSlide
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onBackToHero={() => setActiveSlide(0)}
                    onGoToSlideFour={() => setActiveSlide(4)}
                    onGoToSlideFive={() => setActiveSlide(5)}
                    selectedModelId={selectedVxModel}
                    onSelectModel={setSelectedVxModel}
                    currentUser={currentUser}
                  />
                </Suspense>
              )}
            </div>

            {/* SLIDE 7: VaiByte - Canvas Studio (Slide 07) */}
            <div
              id="slide-canvas-viewport"
              className={`inset-0 w-full h-full overflow-hidden bg-[#07080b] ${
                activeSlide === 7
                  ? 'fixed pointer-events-auto z-10 opacity-100'
                  : 'hidden pointer-events-none z-0 opacity-0'
              }`}
            >
              {activeSlide === 7 && (
                <Suspense fallback={<SlideLoadingFallback bg="bg-[#07080b]" label="LOADING VAIBYTE CANVAS" />}>
                  <VaiByteCanvasSlide
                    onOpenMenu={() => setIsSlideMenuOpen(true)}
                    onBackToHero={() => setActiveSlide(0)}
                    onGoToFuLabs={() => setActiveSlide(5)}
                    onGoToSeedance={(exportedUrl) => {
                      if (exportedUrl) {
                        const incomingList = Array.isArray(exportedUrl) ? exportedUrl : [exportedUrl];
                        const validList = incomingList.filter(Boolean);
                        if (validList.length > 0) {
                          setCanvasToSeedanceImages((prev) => [...prev, ...validList].slice(0, 30));
                          pushToast(
                            validList.length === 1
                              ? 'Canvas plate attached to Seedance 2.5 Studio'
                              : `${validList.length} workflow plates attached to Seedance 2.5 Studio`,
                            'success'
                          );
                        }
                      }
                      setActiveSlide(4);
                    }}
                    currentUser={currentUser}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Slide Navigation Drawer (Opened via '=' icon on Slide 0, Slide 1 and Slide 2) */}
      <SlideMenuDrawer
        isOpen={isSlideMenuOpen}
        currentSlide={activeSlide}
        currentUser={currentUser}
        isAdmin={isAdmin}
        unreadMessagesCount={unreadMessagesCount}
        onClose={() => setIsSlideMenuOpen(false)}
        onSelectSlide={(slideIdx) => setActiveSlide(slideIdx as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7)}
        selectedVxModel={selectedVxModel}
        onSelectVxModel={setSelectedVxModel}
        onPrefetchDestination={preloadDestination}
        onNavigateArchiveSection={(secId) => {
          setActiveSlide(2);
          scrollToSection(secId);
        }}
        onOpenShorts={() => setIsShortsOpen(true)}
        onOpenMessages={() => handleOpenDM()}
        onOpenWallet={() => {
          if (authState === 'UNAUTHENTICATED') {
            setIsAuthModalOpen(true);
          } else {
            setWalletInitialTab('dashboard');
            setIsWalletOpen(true);
          }
        }}
        onOpenSettings={() => {
          if (authState === 'UNAUTHENTICATED') {
            setIsAuthModalOpen(true);
          } else {
            setIsSettingsOpen(true);
          }
        }}
        onOpenSubmit={() => setIsSubmitModalOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={signOutUser}
        onReplayIntro={() => setReplayIntro(true)}
        onOpenCopyStudio={() => setIsCopyStudioOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenProfile={() => {
          if (currentUser?.username) {
            handleOpenProfile(currentUser.username);
          }
        }}
      />

      {/* Social Layer & Utility Modals (Lazy-mounted only when opened) */}
      <Suspense fallback={isAnyModalOpen && !isSlideMenuOpen ? <ModalLoadingFallback /> : null}>
        {isCreatePostOpen && (
          <CreatePostModal
            isOpen={isCreatePostOpen}
            currentUser={currentUser}
            onClose={() => {
              setIsCreatePostOpen(false);
              setCopyStudioPrefill(null);
            }}
            onPublish={createPost}
            onOpenCopyStudio={() => setIsCopyStudioOpen(true)}
            initialData={copyStudioPrefill || undefined}
          />
        )}

        {isCopyStudioOpen && (
          <CopyAssistantModal
            isOpen={isCopyStudioOpen}
            currentUser={currentUser}
            posts={posts}
            onClose={() => setIsCopyStudioOpen(false)}
            onApplyToNewPost={(data) => {
              setCopyStudioPrefill(data);
              setIsCopyStudioOpen(false);
              setIsCreatePostOpen(true);
            }}
          />
        )}

        {isProfileModalOpen && (
          <UserProfileModal
            user={activeProfileUser}
            currentUser={currentUser}
            posts={posts}
            isOpen={isProfileModalOpen}
            isAdmin={isAdmin}
            initialTab={profileInitialTab}
            onClose={handleCloseProfileModal}
            onToggleFollow={toggleFollowCreator}
            onSelectPost={(post) => {
              setIsProfileModalOpen(false);
              setActiveCommentsPost(post);
            }}
            onOpenDirectMessage={(user, isCollab) => {
              setIsProfileModalOpen(false);
              handleOpenDM(user, isCollab);
            }}
            onOpenSettings={() => {
              setIsProfileModalOpen(false);
              setIsSettingsOpen(true);
            }}
            onOpenSeedanceView={(view) => {
              setIsProfileModalOpen(false);
              setSeedanceInitialView(view);
              setActiveSlide(4);
            }}
            onOpenAdmin={() => {
              setIsProfileModalOpen(false);
              setIsAdminOpen(true);
            }}
            onSignOut={() => {
              signOutUser();
              setIsProfileModalOpen(false);
            }}
            onOpenAuth={() => {
              setIsProfileModalOpen(false);
              setIsAuthModalOpen(true);
            }}
            onUsernameChanged={updateCurrentUsername}
            onUpdateProfile={updateCurrentUserProfile}
          />
        )}

        {activeCommentsPost && (
          <CommentsDrawer
            post={activeCommentsPost}
            currentUser={currentUser}
            comments={activeCommentsPost ? comments[activeCommentsPost.id] || [] : []}
            isOpen={Boolean(activeCommentsPost)}
            onClose={() => setActiveCommentsPost(null)}
            onAddComment={addComment}
            onLikeComment={likeComment}
            onDeleteComment={deleteComment}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {isCollectionsModalOpen && (
          <CollectionsModal
            isOpen={isCollectionsModalOpen}
            currentUser={currentUser}
            posts={posts}
            onClose={() => setIsCollectionsModalOpen(false)}
            onSelectPost={(post) => {
              setIsCollectionsModalOpen(false);
              setActiveCommentsPost(post);
            }}
            onCreateCollection={createCollection}
            onRemoveFromCollection={removePostFromCollection}
          />
        )}

        {isDirectMessagesOpen && (
          <DirectMessagesModal
            isOpen={isDirectMessagesOpen}
            currentUser={currentUser}
            conversations={conversations}
            creators={creators}
            activeRecipient={directMessageRecipient}
            initialCollabMode={directMessageIsCollab}
            onClose={() => setIsDirectMessagesOpen(false)}
            onSendMessage={sendMessage}
            onOpenUserProfile={handleOpenProfile}
          />
        )}

        {isNotificationsOpen && (
          <NotificationsDrawer
            isOpen={isNotificationsOpen}
            notifications={notifications}
            posts={posts}
            onClose={() => setIsNotificationsOpen(false)}
            onMarkAllRead={markNotificationsRead}
            onSelectPost={(p) => setActiveCommentsPost(p)}
            onSelectProfile={handleOpenProfile}
            onOpenDirectMessage={() => handleOpenDM()}
          />
        )}

        {activeSharePost && (
          <SharePostModal
            post={activeSharePost}
            conversations={conversations}
            isOpen={Boolean(activeSharePost)}
            onClose={() => setActiveSharePost(null)}
            onSendToConversation={(convId, post) => {
              sendMessage(convId, `Dossier: ${post.title}`, false, undefined, post.id, post.title);
            }}
          />
        )}

        {moderationTarget && (
          <ModerationModal
            postId={moderationTarget?.postId || null}
            authorId={moderationTarget?.authorId || null}
            isOpen={Boolean(moderationTarget)}
            onClose={() => setModerationTarget(null)}
            onReportPost={reportPost}
            onBlockUser={blockUser}
            onMuteUser={muteUser}
          />
        )}

        {isSubmitModalOpen && (
          <SubmissionModal
            isOpen={isSubmitModalOpen}
            onClose={() => setIsSubmitModalOpen(false)}
          />
        )}

        {isIndexDrawerOpen && (
          <IndexDrawer
            isOpen={isIndexDrawerOpen}
            socialPosts={posts}
            creators={creators}
            onClose={() => setIsIndexDrawerOpen(false)}
            onSelectSocialPost={(p) => setActiveCommentsPost(p)}
            onSelectUserProfile={handleOpenProfile}
          />
        )}

        {isCommandPaletteOpen && (
          <CommandPaletteModal
            isOpen={isCommandPaletteOpen}
            activeSlide={activeSlide}
            posts={posts}
            creators={creators}
            onClose={() => setIsCommandPaletteOpen(false)}
            onSelectSlide={(idx) => setActiveSlide(idx)}
            onNavigateArchiveSection={(secId) => scrollToSection(secId)}
            onOpenCreatePost={handleOpenCreate}
            onOpenShorts={() => setIsShortsOpen(true)}
            onOpenWallet={() => {
              if (authState === 'UNAUTHENTICATED') {
                setIsAuthModalOpen(true);
              } else {
                setWalletInitialTab('dashboard');
                setIsWalletOpen(true);
              }
            }}
            onOpenSettings={() => {
              if (authState === 'UNAUTHENTICATED') {
                setIsAuthModalOpen(true);
              } else {
                setIsSettingsOpen(true);
              }
            }}
            onOpenCopyStudio={() => setIsCopyStudioOpen(true)}
            onOpenMessages={() => handleOpenDM()}
            onOpenSubmit={() => setIsSubmitModalOpen(true)}
            onOpenPost={(p) => setActiveCommentsPost(p)}
            onOpenProfile={handleOpenProfile}
          />
        )}

        {isAuthModalOpen && (
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}

        {/* Production-Grade Account, Settings, Currency, Wallet & Admin Modals */}
        {isSettingsOpen && (
          <SettingsCenterModal
            isOpen={isSettingsOpen}
            currentUser={currentUser}
            onClose={() => setIsSettingsOpen(false)}
            onOpenWallet={() => {
              setIsSettingsOpen(false);
              setWalletInitialTab('dashboard');
              setIsWalletOpen(true);
            }}
            onOpenConverter={() => {
              setIsSettingsOpen(false);
              setWalletInitialTab('converter');
              setIsWalletOpen(true);
            }}
            onOpenSeedanceView={(view) => {
              setIsSettingsOpen(false);
              setSeedanceInitialView(view);
              setActiveSlide(4);
            }}
            onSignOut={() => {
              signOutUser();
              setIsSettingsOpen(false);
            }}
            onUsernameChanged={updateCurrentUsername}
          />
        )}

        {isWalletOpen && (
          <WalletModal
            isOpen={isWalletOpen}
            currentUser={currentUser}
            initialTab={walletInitialTab}
            onClose={() => setIsWalletOpen(false)}
          />
        )}

        {isAdminOpen && (
          <IvntriAdminModal
            isOpen={isAdminOpen}
            currentUser={currentUser}
            onClose={() => setIsAdminOpen(false)}
          />
        )}

        {activeCinemaPost && (
          <CinemaModal
            isOpen={Boolean(activeCinemaPost)}
            onClose={() => setActiveCinemaPost(null)}
            post={activeCinemaPost}
            onLike={toggleLikePost}
            onShare={(post) => setActiveSharePost(post)}
          />
        )}

        {/* VAIURE SHORTS - Short-Form Vertical Social Video Experience */}
        {isShortsOpen && (
          <div className="fixed inset-0 z-50 w-full h-full bg-black animate-in fade-in duration-300">
            <ShortsView
              currentUser={currentUser}
              followingUsernames={creators ? Object.keys(creators) : []}
              onBackToHome={() => setIsShortsOpen(false)}
              onOpenSlideArchive={() => {
                setIsShortsOpen(false);
                setActiveSlide(2);
              }}
              onOpenSlideCinema={() => {
                setIsShortsOpen(false);
                setActiveSlide(3);
              }}
              onOpenMenu={() => setIsSlideMenuOpen(true)}
              onOpenProfile={(uname) => {
                handleOpenProfile(uname);
              }}
              onToggleFollow={toggleFollowCreator}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}
            />
          </div>
        )}
      </Suspense>

      {/* Real-Time Ambient Spatial Reactions Overlay */}
      <AmbientReactionOverlay currentSlide={activeSlide as AtelierSlideId} />

      {/* Global Live Atelier Multiplayer Presence Dock */}
      <LiveMultiplayerDock
        currentSlide={activeSlide as AtelierSlideId}
        currentUser={currentUser}
        onNavigateToSlide={(targetSlide) => setActiveSlide(targetSlide as any)}
        onOpenCollabRooms={() => {
          setSeedanceInitialView('rooms');
          setActiveSlide(4);
        }}
      />
    </div>
    </MotionConfig>
  );
}
