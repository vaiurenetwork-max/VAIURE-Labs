import React, { useState, useEffect, useRef } from 'react';
import { Search, Key, MessageSquare, Sparkles } from 'lucide-react';
import { UserProfile } from '../types/social';
import { useLanguage } from '../services/i18n';
import { UserProfileMenu } from './navigation/UserProfileMenu';

interface HeaderProps {
  activeSlide?: number;
  activeSection: string;
  currentUser: UserProfile;
  unreadNotificationsCount?: number;
  unreadMessagesCount?: number;
  authState?: string;
  isAdmin?: boolean;
  onNavigate: (sectionId: string) => void;
  onOpenSubmit?: () => void;
  onOpenCreatePost?: () => void;
  onOpenNotifications?: () => void;
  onOpenMessages?: () => void;
  onOpenUserProfile: () => void;
  onOpenMyWorks?: () => void;
  onOpenSaved?: () => void;
  onOpenCollections?: () => void;
  onOpenIndexDrawer: () => void;
  onOpenAuthModal?: () => void;
  onOpenWallet?: () => void;
  onOpenSettings?: () => void;
  onOpenAdmin?: () => void;
  onSignOut?: () => void;
  onToggleMobileSocialView?: () => void;
  isMobileSocialActive?: boolean;
  onBackToThreads?: () => void;
  onGoToCinema?: () => void;
  onGoToLabs?: () => void;
  onGoToShorts?: () => void;
  onOpenSlideMenu?: () => void;
  onOpenCopyStudio?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSlide = 1,
  activeSection,
  currentUser,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  authState = 'AUTHENTICATED',
  isAdmin = false,
  onNavigate,
  onOpenUserProfile,
  onOpenMyWorks,
  onOpenSaved,
  onOpenCollections,
  onOpenIndexDrawer,
  onOpenAuthModal,
  onOpenWallet,
  onOpenSettings,
  onOpenAdmin,
  onSignOut,
  onBackToThreads,
  onGoToCinema,
  onGoToLabs,
  onGoToShorts,
  onOpenSlideMenu,
  onOpenMessages,
  onOpenCopyStudio,
}) => {
  const { t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const archiveContainer = document.getElementById('slide-archive-container');
      const scrollPos = archiveContainer ? archiveContainer.scrollTop : window.scrollY;
      setIsScrolled(scrollPos > 24);
    };

    const archiveContainer = document.getElementById('slide-archive-container');
    if (archiveContainer) {
      archiveContainer.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (archiveContainer) archiveContainer.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // When on Slide 1 (Threads feed, activeSlide === 0) or Slide 3 (Cinema, activeSlide === 2), do not render Header
  if (typeof activeSlide === 'number' && activeSlide !== 1) {
    return null;
  }

  // Refined essential primary navigation links:
  // Short, familiar, one-word editorial categories representing the platform's core destinations
  const navLinks = [
    { id: 'social-feed', label: t('explore') },
    { id: 'film', label: t('navFilm') },
    { id: 'fashion', label: t('navFashion') },
    { id: 'shorts', label: t('navShorts'), isShorts: true },
    { id: 'artists', label: t('navCreators') },
  ];

  const handleLinkClick = (id: string, isShorts?: boolean) => {
    if (isShorts && onGoToShorts) {
      onGoToShorts();
      return;
    }
    onNavigate(id);
  };

  return (
    <header
      className={`sticky top-0 left-0 right-0 z-40 transition-colors duration-300 select-none ${
        isScrolled
          ? 'bg-[#050507]/95 backdrop-blur-md border-b border-white/[0.08] shadow-sm'
          : 'bg-[#050507]/80 backdrop-blur-sm border-b border-white/[0.04]'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-11 sm:h-12 flex items-center justify-between gap-3">
        {/* LEFT: Wordmark */}
        <div className="flex items-center gap-4 shrink-0">
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              handleLinkClick('hero');
            }}
            className="group flex items-baseline gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-sm"
            title="VAIURE 唯昱尔 — Return to Top"
          >
            <span className="font-display text-sm sm:text-base font-bold tracking-[0.2em] uppercase text-white group-hover:text-white/80 transition-colors">
              VAIURE
            </span>
            <span className="text-white/30 font-light text-xs sm:text-sm">｜</span>
            <span className="text-xs sm:text-sm font-light text-white/80 font-sans tracking-widest">
              唯昱尔
            </span>
          </a>

          {/* Subtle Spatial Slide Switcher (01 · 02 · 03 · 04) */}
          <div className="hidden xl:flex items-center gap-1 pl-3 border-l border-white/10 text-[10px] font-mono text-white/45">
            {onBackToThreads && (
              <button
                onClick={onBackToThreads}
                title="Slide 01: Threads Discourse"
                className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                01
              </button>
            )}
            <span
              title="Slide 02: Curatorial Archive"
              className="px-1.5 py-0.5 rounded bg-white text-black font-bold"
            >
              02
            </span>
            {onGoToCinema && (
              <button
                onClick={onGoToCinema}
                title="Slide 03: Cinema Portfolio"
                className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                03
              </button>
            )}
            {onGoToLabs && (
              <button
                onClick={onGoToLabs}
                title="Slide 04: VAIURE Studio & Labs"
                className="px-1.5 py-0.5 rounded hover:bg-white/[0.08] hover:text-white transition-colors cursor-pointer"
              >
                04
              </button>
            )}
          </div>
        </div>

        {/* CENTER: Clean Typographic Section Navigation */}
        <nav
          aria-label="Archive Sections"
          className="hidden lg:flex items-center gap-6 text-[11px] font-mono tracking-[0.18em] uppercase"
        >
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                onClick={() => handleLinkClick(link.id, link.isShorts)}
                className={`editorial-link py-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-white font-semibold editorial-link-active'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* RIGHT: Essential Utility Controls & Account */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Copy Studio Trigger */}
          {onOpenCopyStudio && (
            <button
              onClick={onOpenCopyStudio}
              aria-label="AI Copy Studio"
              title="VAIURE AI Copy Studio & Editorial Replication Engine (Gemini 3.8 Flash)"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-[11px] font-mono tracking-wider text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/12 transition-all rounded-sm cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-white/90" />
              <span className="hidden sm:inline">COPY STUDIO</span>
            </button>
          )}

          {/* VAIURE Studio / Labs Trigger (Slide 04) */}
          {onGoToLabs && (
            <button
              onClick={onGoToLabs}
              aria-label="VAIURE Studio & Labs"
              title="Slide 04: VAIURE Filmmaking Studio & Collaborative Labs"
              className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono tracking-wider text-white bg-white/10 hover:bg-white/20 border border-white/25 transition-all rounded-sm cursor-pointer active:scale-95 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-subtle-glow" />
              <span>STUDIO</span>
            </button>
          )}

          {/* Working Search Index Trigger */}
          <button
            onClick={onOpenIndexDrawer}
            aria-label={t('search')}
            title={t('search')}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Compact Direct Message Entry Point */}
          {onOpenMessages && (
            <button
              onClick={onOpenMessages}
              aria-label="Direct Messages"
              title="Direct Messages // Atelier Dispatches"
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white/65 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 active:scale-95"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-white text-black font-mono text-[9px] font-bold flex items-center justify-center leading-none ring-1 ring-black">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>
          )}

          {/* Account/Profile Control or Sign In */}
          {authState === 'UNAUTHENTICATED' ? (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/25 hover:border-white text-[11px] font-mono tracking-wider text-white uppercase transition-colors cursor-pointer rounded-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/50 active:scale-98"
            >
              <Key className="w-3 h-3 text-white/60" />
              <span>{t('signIn')}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                ref={profileTriggerRef}
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isProfileMenuOpen}
                aria-label="User Account Menu"
                className={`touch-press w-8 h-8 rounded-full overflow-hidden border transition-all relative flex items-center justify-center bg-neutral-900 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                  isProfileMenuOpen
                    ? 'border-white ring-1 ring-white/50'
                    : 'border-white/20 hover:border-white/60'
                }`}
                title={currentUser.displayName || currentUser.username || 'Profile'}
              >
                {Boolean(currentUser.avatar && currentUser.avatar.trim()) ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter grayscale"
                  />
                ) : (
                  <span className="text-[10px] font-mono text-white/70 uppercase">
                    {currentUser.username ? currentUser.username.slice(0, 2).toUpperCase() : 'VA'}
                  </span>
                )}
              </button>

              {/* Simplified Profile Menu */}
              <UserProfileMenu
                currentUser={currentUser}
                isOpen={isProfileMenuOpen}
                isAdmin={isAdmin}
                unreadMessagesCount={unreadMessagesCount}
                onClose={() => setIsProfileMenuOpen(false)}
                onOpenProfile={() => {
                  onOpenUserProfile();
                  setIsProfileMenuOpen(false);
                }}
                onOpenMessages={onOpenMessages ? () => {
                  onOpenMessages();
                  setIsProfileMenuOpen(false);
                } : undefined}
                onOpenMyWorks={onOpenMyWorks}
                onOpenSaved={onOpenSaved}
                onOpenCollections={onOpenCollections}
                onOpenSettings={onOpenSettings}
                onOpenWallet={onOpenWallet}
                onOpenAdmin={onOpenAdmin}
                onSignOut={onSignOut}
                triggerRef={profileTriggerRef}
              />
            </div>
          )}

          {/* Compact Mobile Menu Trigger (when screen < md) */}
          {onOpenSlideMenu && (
            <button
              onClick={onOpenSlideMenu}
              aria-label="Open Navigation Menu"
              className="md:hidden touch-press touch-target-min flex items-center justify-center px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-widest text-white/90 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 uppercase transition-all cursor-pointer active:scale-95"
              title="Open Navigation Menu"
            >
              <span>MENU</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
