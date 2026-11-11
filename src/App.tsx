/**
 * IVNTRI — The New Visual Culture of AI
 * Production-ready real social platform and editorial archive.
 * ZERO fake template data — 100% powered by real Firebase Authentication & Firestore.
 */

import React, { useState, useEffect } from 'react';
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

// Social Layer Components
import { ThreadsMainFeed } from './components/threads/ThreadsMainFeed';
import { SlideMenuDrawer } from './components/navigation/SlideMenuDrawer';
import { SocialFeedSection } from './components/social/SocialFeedSection';
import { ForumSection } from './components/forum/ForumSection';
import { CreatePostModal } from './components/social/CreatePostModal';
import { UserProfileModal } from './components/social/UserProfileModal';
import { CommentsDrawer } from './components/social/CommentsDrawer';
import { CollectionsModal } from './components/social/CollectionsModal';
import { DirectMessagesModal } from './components/social/DirectMessagesModal';
import { NotificationsDrawer } from './components/social/NotificationsDrawer';
import { SharePostModal } from './components/social/SharePostModal';
import { ModerationModal } from './components/social/ModerationModal';
import { AuthModal } from './components/AuthModal';
import { SubmissionModal } from './components/SubmissionModal';
import { IndexDrawer } from './components/modals/IndexDrawer';
import { SettingsCenterModal } from './components/settings/SettingsCenterModal';
import { WalletModal } from './components/wallet/WalletModal';
import { IvntriAdminModal } from './components/admin/IvntriAdminModal';
import { CinemaModal } from './components/media/CinemaModal';
import { CopyAssistantModal } from './components/modals/CopyAssistantModal';
import { VaiureCinemaSlide } from './components/cinema/VaiureCinemaSlide';
import { VaiureLabsSlide } from './components/labs/VaiureLabsSlide';
import { FuLabsGreyboxSlide } from './components/fulabs/FuLabsGreyboxSlide';
import { VxSlide } from './components/vx/VxSlide';
import { Slide0MotionHero } from './components/hero/Slide0MotionHero';
import { ShortsView } from './components/shorts/ShortsView';
import { CinematicIntro } from './components/brand/CinematicIntro';
import { checkAdminPrivileges } from './services/adminService';
import { fetchUserByHandleOrId } from './services/firestoreSocialService';

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

  // Unified 5-Slide Navigation Controller (Slide 0 = Motion Hero default page)
  const isAnyModalOpen =
    isSubmitModalOpen ||
    isIndexDrawerOpen ||
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

  // Hideable / Minimizable Workspace State for Slides 1–6 over Slide 0 Hero
  const [isSlidesMinimized, setIsSlidesMinimized] = useState(false);
  const [minimizedSlideIndex, setMinimizedSlideIndex] = useState<1 | 2 | 3 | 4 | 5 | 6 | null>(null);

  const {
    containerRef,
    currentSlide: activeSlide,
    goToSlide: rawSetActiveSlide,
    isReducedMotion,
  } = useSlideNavigation({
    initialSlide: 0,
    totalSlides: 7,
    swipeThreshold: 60,
    transitionDurationMs: 200,
    isModalOpen: isAnyModalOpen,
    enableSwipe: false, // Prevent accidental auto-sliding & false clicks
    enableKeyboard: false, // Prevent accidental arrow-key sliding
  });

  // Safe explicit slide navigation helper
  const setActiveSlide = (targetSlide: 0 | 1 | 2 | 3 | 4 | 5 | 6) => {
    if (targetSlide === 0) {
      setIsSlidesMinimized(false);
      rawSetActiveSlide(0);
    } else {
      setIsSlidesMinimized(false);
      setMinimizedSlideIndex(targetSlide);
      rawSetActiveSlide(targetSlide);
    }
  };

  // Minimize current active slide (1-6) down to compact bar over Slide 0 Hero
  const handleMinimizeCurrentSlide = () => {
    if (activeSlide > 0) {
      setMinimizedSlideIndex(activeSlide as 1 | 2 | 3 | 4 | 5 | 6);
      setIsSlidesMinimized(true);
      rawSetActiveSlide(0);
    }
  };

  // Completely hide/close Slides 1-6 and return to full-screen Slide 0 Hero
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

  const slideLabels: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
    1: '01 / THREADS',
    2: '02 / ARCHIVE',
    3: '03 / CINEMA',
    4: '04 / STUDIO',
    5: '05 / FU LABS',
    6: '06 / VX',
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

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    const container = document.getElementById('slide-archive-container');
    if (el) {
      if (container) {
        const top = Math.max(0, el.offsetTop - 80);
        container.scrollTo({ top, behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
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

  // Non-blocking repost trigger
  const [repostNotice, setRepostNotice] = useState<string | null>(null);
  const handleRepostPrompt = (post: SocialPost) => {
    if (authState === 'UNAUTHENTICATED') {
      setIsAuthModalOpen(true);
      return;
    }
    repostPost(post.id);
    setRepostNotice(`Reposted "${post.title}" to your archive stream`);
    setTimeout(() => setRepostNotice(null), 3000);
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;
  const unreadMessagesCount = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black text-[#ECECE9] font-sans antialiased selection:bg-white/20 selection:text-white">
      {/* Precision Editorial Custom Cursor (Desktop fine pointers only) */}
      <CustomCursor />

      {/* VAIURE Cinematic Logo Introduction: 4-Phase brand sequence with auto-dissolve into platform */}
      <CinematicIntro
        forcePlay={replayIntro}
        onComplete={() => setReplayIntro(false)}
      />

      {/* Non-blocking Repost Notification Toast */}
      {repostNotice && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full bg-black/90 backdrop-blur-md border border-white/20 text-white font-mono text-xs tracking-wider shadow-2xl animate-silk-fade pointer-events-none">
          {repostNotice}
        </div>
      )}

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
          className={`fixed inset-0 w-screen h-screen overflow-hidden select-none bg-[#0b0f14] ${
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
          />

          {/* Hideable & Non-Conflicting Precision Slide Switcher on Slide 0 */}
          {activeSlide === 0 && !isSlidesMinimized && (
            <FloatingSlideSwitch
              activeSlide={0}
              onSelectSlide={(idx) => setActiveSlide(idx)}
            />
          )}

          {/* Minimized Workspace Restore Dock on Slide 0 (Appears when a slide 1-4 is minimized) */}
          {isSlidesMinimized && minimizedSlideIndex !== null && (
            <div
              data-no-swipe="true"
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/90 backdrop-blur-xl border border-white/20 shadow-2xl text-white font-mono text-[10px] tracking-[0.15em] uppercase pointer-events-auto"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/60">MINIMIZED:</span>
              <button
                type="button"
                onClick={handleRestoreMinimizedSlide}
                className="px-2 py-0.5 rounded bg-white/10 hover:bg-white hover:text-black text-white font-semibold transition-colors cursor-pointer"
                title="Restore minimized slide"
              >
                {slideLabels[minimizedSlideIndex]} ↑
              </button>
              <button
                type="button"
                onClick={handleHideAllSlides}
                className="w-5 h-5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
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
            {/* Hideable & Non-Conflicting Precision Slide Switcher (Top-Center Dock) */}
            <FloatingSlideSwitch
              activeSlide={activeSlide as any}
              onSelectSlide={(idx) => setActiveSlide(idx)}
              onMinimize={handleMinimizeCurrentSlide}
              onHide={handleHideAllSlides}
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
              <VaiureCinemaSlide
                onBackToSlideOne={() => setActiveSlide(1)}
                onBackToSlideTwo={() => setActiveSlide(2)}
                onGoToLabs={() => setActiveSlide(4)}
                onOpenShorts={() => setIsShortsOpen(true)}
                onOpenMenu={() => setIsSlideMenuOpen(true)}
                onOpenSubmit={() => setIsSubmitModalOpen(true)}
              />
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
              <VaiureLabsSlide
                onBackToSlideOne={() => setActiveSlide(1)}
                onBackToSlideTwo={() => setActiveSlide(2)}
                onBackToSlideThree={() => setActiveSlide(3)}
                onOpenMenu={() => setIsSlideMenuOpen(true)}
                onOpenCreatePost={handleOpenCreate}
                currentUser={currentUser}
              />
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
                <FuLabsGreyboxSlide
                  onOpenMenu={() => setIsSlideMenuOpen(true)}
                  onGoToSlideFour={() => setActiveSlide(4)}
                  onGoToVx={() => setActiveSlide(6)}
                  onBackToHero={() => setActiveSlide(0)}
                  currentUser={currentUser}
                />
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
                <VxSlide
                  onOpenMenu={() => setIsSlideMenuOpen(true)}
                  onBackToHero={() => setActiveSlide(0)}
                  onGoToSlideFour={() => setActiveSlide(4)}
                  onGoToSlideFive={() => setActiveSlide(5)}
                  selectedModelId={selectedVxModel}
                  onSelectModel={setSelectedVxModel}
                  currentUser={currentUser}
                />
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
        onSelectSlide={(slideIdx) => setActiveSlide(slideIdx as 0 | 1 | 2 | 3 | 4 | 5 | 6)}
        selectedVxModel={selectedVxModel}
        onSelectVxModel={setSelectedVxModel}
        onNavigateArchiveSection={(secId) => {
          setActiveSlide(2);
          setTimeout(() => scrollToSection(secId), 200);
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
        onOpenProfile={() => {
          if (currentUser?.username) {
            handleOpenProfile(currentUser.username);
          }
        }}
      />

      {/* Social Layer Modals */}
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

      <SharePostModal
        post={activeSharePost}
        conversations={conversations}
        isOpen={Boolean(activeSharePost)}
        onClose={() => setActiveSharePost(null)}
        onSendToConversation={(convId, post) => {
          sendMessage(convId, `Dossier: ${post.title}`, false, undefined, post.id, post.title);
        }}
      />

      <ModerationModal
        postId={moderationTarget?.postId || null}
        authorId={moderationTarget?.authorId || null}
        isOpen={Boolean(moderationTarget)}
        onClose={() => setModerationTarget(null)}
        onReportPost={reportPost}
        onBlockUser={blockUser}
        onMuteUser={muteUser}
      />

      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
      />

      <IndexDrawer
        isOpen={isIndexDrawerOpen}
        socialPosts={posts}
        creators={creators}
        onClose={() => setIsIndexDrawerOpen(false)}
        onSelectSocialPost={(p) => setActiveCommentsPost(p)}
        onSelectUserProfile={handleOpenProfile}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Production-Grade Account, Settings, Currency, Wallet & Admin Modals */}
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
        onSignOut={() => {
          signOutUser();
          setIsSettingsOpen(false);
        }}
        onUsernameChanged={updateCurrentUsername}
      />

      <WalletModal
        isOpen={isWalletOpen}
        currentUser={currentUser}
        initialTab={walletInitialTab}
        onClose={() => setIsWalletOpen(false)}
      />

      <IvntriAdminModal
        isOpen={isAdminOpen}
        currentUser={currentUser}
        onClose={() => setIsAdminOpen(false)}
      />

      <CinemaModal
        isOpen={Boolean(activeCinemaPost)}
        onClose={() => setActiveCinemaPost(null)}
        post={activeCinemaPost}
        onLike={toggleLikePost}
        onShare={(post) => setActiveSharePost(post)}
      />

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

      {/* Real-Time Ambient Spatial Reactions Overlay */}
      <AmbientReactionOverlay currentSlide={activeSlide as AtelierSlideId} />

      {/* Global Live Atelier Multiplayer Presence Dock */}
      <LiveMultiplayerDock
        currentSlide={activeSlide as AtelierSlideId}
        currentUser={currentUser}
        onNavigateToSlide={(targetSlide) => setActiveSlide(targetSlide as any)}
        onOpenCollabRooms={() => {
          setActiveSlide(4);
        }}
      />
    </div>
  );
}
