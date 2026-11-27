import React, { useEffect, useRef } from 'react';
import { UserProfile } from '../../types/social';
import { useLanguage } from '../../services/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  X,
  MessageSquare,
  Compass,
  Film,
  Sparkles,
  Users,
  Wallet,
  Settings,
  Shield,
  LogOut,
  LogIn,
  ArrowRight,
  Plus,
  Layers,
  Play,
  User,
  Cpu,
  PenTool,
  Clapperboard,
} from 'lucide-react';
import { VxModelId } from '../../types/vx';

interface SlideMenuDrawerProps {
  isOpen: boolean;
  currentSlide: number; // 0 for Threads, 1 for Archive, 2 for Cinema
  currentUser: UserProfile;
  isAdmin?: boolean;
  unreadMessagesCount?: number;
  onClose: () => void;
  onSelectSlide: (slideIndex: number) => void;
  onNavigateArchiveSection: (sectionId: string) => void;
  onOpenShorts?: () => void;
  onOpenMessages?: () => void;
  onOpenWallet: () => void;
  onOpenSettings: () => void;
  onOpenSubmit: () => void;
  onOpenAdmin?: () => void;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  onReplayIntro?: () => void;
  onOpenCopyStudio?: () => void;
  onOpenCommandPalette?: () => void;
  selectedVxModel?: VxModelId;
  onSelectVxModel?: (modelId: VxModelId) => void;
  onPrefetchDestination?: (target: string) => void;
}

export const SlideMenuDrawer: React.FC<SlideMenuDrawerProps> = ({
  isOpen,
  currentSlide,
  currentUser,
  isAdmin = false,
  unreadMessagesCount = 0,
  onClose,
  onSelectSlide,
  onNavigateArchiveSection,
  onOpenShorts,
  onOpenMessages,
  onOpenWallet,
  onOpenSettings,
  onOpenSubmit,
  onOpenAdmin,
  onOpenAuthModal,
  onSignOut,
  onOpenProfile,
  onReplayIntro,
  onOpenCopyStudio,
  onOpenCommandPalette,
  selectedVxModel = 'gemini-3.8',
  onSelectVxModel,
  onPrefetchDestination,
}) => {
  const { t } = useLanguage();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & accessibility: Escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoToSection = (sectionId: string) => {
    onPrefetchDestination?.('slide-2');
    onClose();
    onSelectSlide(2);
    setTimeout(() => {
      onNavigateArchiveSection(sectionId);
    }, 60);
  };

  const archiveSections = [
    { id: 'hero', label: t('home'), icon: Sparkles, code: '01' },
    { id: 'social-feed', label: t('explore'), icon: Compass, code: '02' },
    { id: 'fashion', label: t('navFashion'), icon: Layers, code: '03' },
    { id: 'film', label: t('navFilm'), icon: Film, code: '04' },
    { id: 'studios', label: t('navStudios'), icon: Sparkles, code: '05' },
    { id: 'artists', label: t('navCreators'), icon: Users, code: '06' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Menu"
      className="fixed inset-0 z-50 flex select-text pointer-events-auto"
    >
      {/* Editorial backdrop: lightweight compositing over active video/canvas */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/68 transition-opacity duration-150 ease-out"
        aria-hidden="true"
      />

      {/* Floating editorial navigation panel */}
      <aside
        ref={drawerRef}
        style={{
          backgroundColor: 'rgba(11, 11, 14, 0.96)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55)',
        }}
        className="relative z-10 h-full w-[84vw] max-w-[340px] md:w-[280px] lg:w-[290px] border-r border-white/[0.08] flex flex-col text-white transition-transform duration-150 ease-out animate-in slide-in-from-left duration-150"
      >
        {/* Brand Header */}
        <header className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm tracking-[0.2em] font-medium uppercase text-white/95">
              VAIURE
            </span>
            <span className="text-white/30 font-light text-xs">｜</span>
            <span className="text-xs font-light text-white/80 font-sans tracking-widest">
              唯昱尔
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Navigation"
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </header>

        {/* User Profile Section — Compact horizontal editorial card */}
        <section className="px-5 py-3 border-b border-white/[0.07] bg-white/[0.015] shrink-0">
          <div
            onMouseEnter={() => {
              if (currentUser.id && onOpenProfile) onPrefetchDestination?.('profile');
            }}
            onClick={() => {
              if (currentUser.id && onOpenProfile) {
                onOpenProfile();
                onClose();
              }
            }}
            className={`flex items-center gap-3 ${
              currentUser.id && onOpenProfile ? 'cursor-pointer group' : ''
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 shrink-0 flex items-center justify-center bg-neutral-900 text-white/80 font-mono text-[10px] ring-1 ring-white/5">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.displayName || currentUser.username}
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all"
                />
              ) : (
                <span>
                  {currentUser.username
                    ? currentUser.username.slice(0, 2).toUpperCase()
                    : 'VA'}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-white/90 truncate group-hover:text-white transition-colors">
                  {currentUser.displayName || (currentUser.id ? currentUser.username : t('guestArtist'))}
                </p>
                {isAdmin && (
                  <span className="text-[8px] font-mono uppercase tracking-wider text-amber-300/90 bg-amber-400/10 border border-amber-400/25 px-1 rounded-sm shrink-0">
                    ED
                  </span>
                )}
              </div>
              <p className="text-[10px] font-mono text-white/40 truncate">
                {currentUser.id ? `@${currentUser.username}` : t('exploreArchive')}
              </p>
            </div>
          </div>
        </section>

        {/* Language Selector & Command Palette row */}
        <section className="px-5 py-3 border-b border-white/[0.07] bg-white/[0.01] shrink-0 space-y-2.5">
          <LanguageSwitcher variant="menu" />
          {onOpenCommandPalette && (
            <button
              type="button"
              onMouseEnter={() => onPrefetchDestination?.('command-palette')}
              onFocus={() => onPrefetchDestination?.('command-palette')}
              onClick={() => {
                onClose();
                onOpenCommandPalette();
              }}
              className="w-full px-3 py-2 border border-white/15 hover:border-white/40 bg-white/[0.03] hover:bg-white/[0.07] flex items-center justify-between text-[10px] font-mono text-white/75 hover:text-white transition-colors cursor-pointer"
            >
              <span>COMMAND PALETTE</span>
              <span className="px-1.5 py-0.5 bg-white/10 text-white/60 text-[9px]">⌘K</span>
            </button>
          )}
        </section>

        {/* Viewport Slide Selector (00 / HERO, 01 / THREADS, 02 / ARCHIVE, 03 / CINEMA, 04 / LABS, 05 / FU LABS, 06 / VX) */}
        <section className="px-5 py-3 border-b border-white/[0.07] space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase">
              {t('viewportSlide')}
            </span>
            <span className="text-[9px] font-mono text-white/30 tabular-nums">
              0{currentSlide} / 08
            </span>
          </div>

          <button
            onClick={() => {
              onSelectSlide(0);
              onClose();
            }}
            title="Slide 00: VAIURE Main Motion Hero"
            className={`w-full p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
              currentSlide === 0
                ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Play className="w-3 h-3 opacity-80" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                VAIURE Motion Hero
              </div>
            </div>
            <div className="text-[8px] font-mono opacity-60">00 / HERO</div>
          </button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-1')}
              onFocus={() => onPrefetchDestination?.('slide-1')}
              onClick={() => {
                onSelectSlide(1);
                onClose();
              }}
              title="Slide 01: Threads Feed"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 1
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <MessageSquare className="w-3 h-3 mb-1 opacity-80" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                {t('threadsFeed')}
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">01 / THREADS</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-2')}
              onFocus={() => onPrefetchDestination?.('slide-2')}
              onClick={() => {
                onSelectSlide(2);
                onClose();
              }}
              title="Slide 02: Main Editorial Archive"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 2
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Compass className="w-3 h-3 mb-1 opacity-80" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                {t('navArchive')}
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">02 / ARCHIVE</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-3')}
              onFocus={() => onPrefetchDestination?.('slide-3')}
              onClick={() => {
                onSelectSlide(3);
                onClose();
              }}
              title="Slide 03: AI Hybrid Production Studio (Seedance 2.5)"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 3
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Film className="w-3 h-3 mb-1 opacity-80" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                {t('cinemaSlideName')}
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">03 / AI STUDIO</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-4')}
              onFocus={() => onPrefetchDestination?.('slide-4')}
              onClick={() => {
                onSelectSlide(4);
                onClose();
              }}
              title="Slide 04: VAIURE — SEEDANCE LAB (Seedance 2.5 Production Workspace)"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 4
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Film className="w-3 h-3 mb-1 opacity-90 text-white" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                SEEDANCE LAB
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">04 / SEEDANCE LAB</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-5')}
              onFocus={() => onPrefetchDestination?.('slide-5')}
              onClick={() => {
                onSelectSlide(5);
                onClose();
              }}
              title="Slide 05: Fu Labs — Cinematic 3D Greybox Scene Generator"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 5
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Layers className="w-3 h-3 mb-1 opacity-80 text-cyan-400" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                Fu Labs 3D
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">05 / FU LABS</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-6')}
              onFocus={() => onPrefetchDestination?.('slide-6')}
              onClick={() => {
                onSelectSlide(6);
                onClose();
              }}
              title="Slide 06: VX — Visual Reconstruction Engine (Midjourney V8.2)"
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                currentSlide === 6
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <Cpu className="w-3 h-3 mb-1 opacity-80 text-amber-400" />
              <div className="text-[10px] font-sans font-medium truncate leading-tight">
                VX Vision
              </div>
              <div className="text-[8px] font-mono opacity-50 mt-0.5">06 / VX</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-7')}
              onFocus={() => onPrefetchDestination?.('slide-7')}
              onClick={() => {
                onSelectSlide(7);
                onClose();
              }}
              title="Slide 07: VaiByte - Canvas Studio"
              className={`col-span-2 sm:col-span-3 p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                currentSlide === 7
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-white/[0.08] bg-black/30 text-white/70 hover:border-white/20 hover:text-white hover:bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <PenTool className="w-3 h-3 opacity-85 shrink-0" />
                <div className="text-[10px] font-sans font-medium truncate leading-tight">
                  VaiByte — Canvas Studio
                </div>
              </div>
              <div className="text-[8px] font-mono opacity-60 shrink-0 ml-2">07 / CANVAS</div>
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('slide-8')}
              onFocus={() => onPrefetchDestination?.('slide-8')}
              onClick={() => {
                onSelectSlide(8);
                onClose();
              }}
              title="Slide 08: HYBRID STUDIO — Full AI Film Production & Creative Direction (Seedance 2.5)"
              className={`col-span-2 sm:col-span-3 p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                currentSlide === 8
                  ? 'border-white/90 bg-white text-black font-semibold shadow-sm'
                  : 'border-cyan-500/30 bg-cyan-950/20 text-white/90 hover:border-cyan-400/60 hover:text-white hover:bg-cyan-950/35'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Clapperboard className={`w-3 h-3 shrink-0 ${currentSlide === 8 ? 'text-black' : 'text-cyan-400'}`} />
                <div className="text-[10px] font-sans font-semibold tracking-wide truncate leading-tight">
                  HYBRID STUDIO
                </div>
              </div>
              <div className="text-[8px] font-mono opacity-75 shrink-0 ml-2">08 / HYBRID</div>
            </button>
          </div>

          {/* Quick Jump to Collaborative Ateliers */}
          <button
            type="button"
            onMouseEnter={() => onPrefetchDestination?.('slide-4')}
            onFocus={() => onPrefetchDestination?.('slide-4')}
            onClick={() => {
              onSelectSlide(4);
              onClose();
            }}
            className="w-full mt-2 p-2.5 bg-white/[0.03] hover:bg-white/[0.07] border border-white/12 hover:border-white/30 flex items-center justify-between text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold uppercase text-white/95 group-hover:text-white transition-colors">
                  SHAREDWORKS ATELIER · CO-OP
                </span>
                <span className="text-[8px] font-mono text-white/45">
                  Real-time multi-user canvases & prompts
                </span>
              </div>
            </div>
            <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white transition-colors" />
          </button>

          {/* SLIDE 06 · VX REAL-TIME MODEL BACKEND CONTROLLER */}
          {currentSlide === 6 && (
            <div className="mt-3 p-2.5 bg-black/60 border border-white/10 space-y-1.5 animate-silk-fade">
              <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  SLIDE 06 BACKEND ENGINE
                </span>
                <span className="text-[8px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20">
                  REAL-TIME
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                {[
                  { id: 'gemini-3' as const, label: 'Gemini 3', badge: 'VISION' },
                  { id: 'gemini-3.1' as const, label: 'Gemini 3.1', badge: 'LITE' },
                  { id: 'gemini-3.8' as const, label: 'Gemini 3.8', badge: 'REC' },
                  { id: 'gemini-4-argon' as const, label: 'Gemini 4 Argon', badge: 'FLAGSHIP' },
                ].map((m) => {
                  const isSelected =
                    selectedVxModel === m.id ||
                    (selectedVxModel === 'gemini-3.8-flash' && m.id === 'gemini-3.8');
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectVxModel && onSelectVxModel(m.id)}
                      className={`p-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-cyan-400 text-black font-bold'
                          : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/[0.06]'
                      }`}
                      title={`Switch to ${m.label} in real-time`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate">{m.label}</span>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                        )}
                      </div>
                      <span
                        className={`text-[8px] uppercase tracking-wider mt-1 ${
                          isSelected ? 'text-black/75' : 'text-white/40'
                        }`}
                      >
                        {m.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Scrollable Section: Archive Jumpers & Portal Actions */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0 text-white">
          {/* Main Archive Jumpers */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase block px-2 mb-1.5">
              {t('jumpToArchive')}
            </span>

            {archiveSections.map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onMouseEnter={() => onPrefetchDestination?.('slide-2')}
                  onFocus={() => onPrefetchDestination?.('slide-2')}
                  onClick={() => handleGoToSection(sec.id)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono tracking-wider text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75 transition-colors" />
                    <span>{sec.label}</span>
                  </div>
                  <span className="text-[9px] font-mono text-white/25 group-hover:text-white/50 transition-colors">
                    {sec.code}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Actions / Portal Actions */}
          <div className="space-y-1 pt-3 border-t border-white/[0.07]">
            <span className="text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase block px-2 mb-1.5">
              {t('portalActions')}
            </span>

            {/* Shorts Primary Social Video Action */}
            {onOpenShorts && (
              <button
                onMouseEnter={() => onPrefetchDestination?.('shorts')}
                onFocus={() => onPrefetchDestination?.('shorts')}
                onClick={() => {
                  onOpenShorts();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-mono text-white hover:bg-red-500/[0.08] hover:border-red-500/30 transition-all cursor-pointer bg-red-500/[0.04] border border-red-500/20 group"
              >
                <div className="flex items-center gap-2.5">
                  <Play className="w-3.5 h-3.5 text-red-400 fill-red-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium text-white/95">{t('navShorts')}</span>
                </div>
                <span className="text-[8px] font-mono tracking-wider uppercase bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-sm">
                  SOCIAL
                </span>
              </button>
            )}

            {/* Direct Messages Dispatch Action */}
            {onOpenMessages && (
              <button
                onMouseEnter={() => onPrefetchDestination?.('messages')}
                onFocus={() => onPrefetchDestination?.('messages')}
                onClick={() => {
                  onOpenMessages();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75" />
                  <span>Direct Messages</span>
                </div>
                {unreadMessagesCount > 0 ? (
                  <span className="min-w-[16px] h-4 px-1.5 rounded-full bg-white text-black font-mono text-[9px] font-bold flex items-center justify-center">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-white/30">DM</span>
                )}
              </button>
            )}

            <button
              onMouseEnter={() => onPrefetchDestination?.('submit')}
              onFocus={() => onPrefetchDestination?.('submit')}
              onClick={() => {
                onOpenSubmit();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Plus className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75" />
                <span>{t('submitWork')}</span>
              </div>
              <ArrowRight className="w-3 h-3 text-white/20 group-hover:text-white/50 transition-colors" />
            </button>

            <button
              onMouseEnter={() => onPrefetchDestination?.('wallet')}
              onFocus={() => onPrefetchDestination?.('wallet')}
              onClick={() => {
                onOpenWallet();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75" />
                <span>{t('wallet')}</span>
              </div>
              <span className="text-[9px] font-mono text-white/30">V-CRED</span>
            </button>

            {onOpenCopyStudio && (
              <button
                onMouseEnter={() => onPrefetchDestination?.('copy-studio')}
                onFocus={() => onPrefetchDestination?.('copy-studio')}
                onClick={() => {
                  onOpenCopyStudio();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-white/80 group-hover:text-white" />
                  <span>AI Copy Studio</span>
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-white/50">GEMINI</span>
              </button>
            )}

            <button
              onMouseEnter={() => onPrefetchDestination?.('settings')}
              onFocus={() => onPrefetchDestination?.('settings')}
              onClick={() => {
                onOpenSettings();
                onClose();
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/65 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75" />
                <span>{t('settings')}</span>
              </div>
            </button>

            {onReplayIntro && (
              <button
                onClick={() => {
                  onClose();
                  onReplayIntro();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-white/50 hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer group"
                title="Replay VAIURE Cinematic Logo Introduction"
              >
                <div className="flex items-center gap-2.5">
                  <Film className="w-3.5 h-3.5 text-white/35 group-hover:text-white/75" />
                  <span>VAIURE Brand Intro</span>
                </div>
                <span className="text-[8px] font-mono tracking-widest text-white/30 uppercase">PLAY</span>
              </button>
            )}

            {isAdmin && onOpenAdmin && (
              <button
                onMouseEnter={() => onPrefetchDestination?.('admin')}
                onFocus={() => onPrefetchDestination?.('admin')}
                onClick={() => {
                  onOpenAdmin();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-mono text-amber-300/90 hover:text-amber-200 bg-amber-400/[0.05] border border-amber-400/20 hover:bg-amber-400/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('adminConsole')}</span>
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-amber-400/80">ROOT</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer: Sign In / Out */}
        <footer className="p-4 border-t border-white/[0.07] bg-white/[0.01] shrink-0">
          {currentUser.id ? (
            <button
              onClick={() => {
                onSignOut?.();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-[11px] font-mono text-white/45 hover:text-red-400 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('signOut')}</span>
            </button>
          ) : (
            <button
              onMouseEnter={() => onPrefetchDestination?.('auth')}
              onFocus={() => onPrefetchDestination?.('auth')}
              onClick={() => {
                onOpenAuthModal?.();
                onClose();
              }}
              className="w-full py-2 bg-white text-black text-[11px] font-mono font-medium uppercase tracking-[0.15em] rounded-md hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('signIn')}</span>
            </button>
          )}
        </footer>
      </aside>
    </div>
  );
};
