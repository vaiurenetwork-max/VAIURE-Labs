/**
 * VAIURE — SEEDANCE LAB NAVBAR
 * Monochromatic Black & White Glassmorphism Header
 * Pure black (#000000), translucent dark glass, subtle white borders, soft white typography.
 */

import React from 'react';
import {
  Sparkles,
  Clock,
  ShieldCheck,
  ArrowLeft,
  Menu,
  Coins,
  RefreshCw,
  Film,
  Camera,
  Activity,
  Sliders,
  Crown,
  Radio,
  PhoneCall,
  Shield,
  Users,
  Images,
  Terminal,
} from 'lucide-react';
import { SeedanceAccountBalance, SeedanceHealthStatus } from '../../../services/seedanceLabService';

export type SeedanceLabView =
  | 'overview'
  | 'generator'
  | 'reference'
  | 'curated'
  | 'history'
  | 'plans'
  | 'credits'
  | 'agent'
  | 'streams'
  | 'rooms'
  | 'community'
  | 'account'
  | 'backend-test'
  | 'admin';

interface SeedanceLabNavbarProps {
  activeView: SeedanceLabView;
  onChangeView: (view: SeedanceLabView) => void;
  balance: SeedanceAccountBalance | null;
  health: SeedanceHealthStatus | null;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  isRefreshingBalance?: boolean;
  onRefreshBalance?: () => void;
  onRequireAuth?: () => void;
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  onOpenMenu?: () => void;
}

export const SeedanceLabNavbar: React.FC<SeedanceLabNavbarProps> = ({
  activeView,
  onChangeView,
  balance,
  health,
  isAuthenticated = false,
  isAdmin = false,
  isRefreshingBalance,
  onRefreshBalance,
  onRequireAuth,
  onBackToSlideTwo,
  onOpenMenu,
}) => {
  const navTabs: Array<{
    id: SeedanceLabView;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
  }> = [
    { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'generator', label: 'Generator', shortLabel: 'Generator', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'reference', label: 'References', shortLabel: 'Refs', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'curated', label: 'Curated', shortLabel: 'Curated', icon: <Images className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'History', shortLabel: 'History', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'plans', label: 'Plans', shortLabel: 'Plans', icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'credits', label: 'Credits', shortLabel: 'Credits', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'agent', label: 'AI Agent', shortLabel: 'Agent', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'streams', label: 'Livestreams', shortLabel: 'Live', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'rooms', label: 'Live Rooms', shortLabel: 'Rooms', icon: <PhoneCall className="w-3.5 h-3.5" /> },
    { id: 'community', label: 'Community', shortLabel: 'Community', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'account', label: 'Account & API', shortLabel: 'API', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'backend-test', label: 'Backend Test', shortLabel: 'Test', icon: <Terminal className="w-3.5 h-3.5" /> },
  ];

  if (isAdmin) {
    navTabs.push({
      id: 'admin',
      label: 'Admin Governance',
      shortLabel: 'Admin',
      icon: <Shield className="w-3.5 h-3.5" />,
    });
  }

  return (
    <header className="sticky top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-xl border-b border-white/[0.12] text-white min-h-[56px] pt-[max(0rem,env(safe-area-inset-top))] select-none shrink-0 transition-all">
      <div className="max-w-[1760px] mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Zone: Brand Identity + Slide Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open Slide Menu"
              className="min-w-[38px] min-h-[38px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-lg border border-white/[0.12] bg-white/[0.045] text-white/75 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {onBackToSlideTwo && (
            <button
              type="button"
              onClick={onBackToSlideTwo}
              aria-label="Back to Archive"
              className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07] text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap shrink-0"
              title="Return to Slide 02 Archive"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>02 ARCHIVE</span>
            </button>
          )}

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0">
              <span className="font-serif tracking-[0.2em] text-xs sm:text-sm font-semibold uppercase text-white">
                VAIURE
              </span>
              <span className="text-white/30 font-light text-xs">/</span>
              <span className="text-[11px] sm:text-xs font-sans tracking-wider font-medium text-white/90">
                SEEDANCE
              </span>
            </div>
            <span className="hidden 2xl:block text-[9px] font-sans text-white/45 tracking-tight truncate">
              Seedance 2.5 Studio Platform
            </span>
          </div>
        </div>

        {/* Center Zone: Platform Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 min-w-0">
          {navTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeView(tab.id)}
                className={`min-h-[34px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium tracking-tight whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-[0_2px_12px_rgba(255,255,255,0.15)] border border-white'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                }`}
              >
                {tab.icon}
                <span className="hidden xl:inline">{tab.label}</span>
                <span className="xl:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Zone: Plan & Live Credits + Backend Health Status */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Tier Badge */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onChangeView('plans')}
              title="Manage Subscription Tier"
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.1] text-[10px] font-mono uppercase tracking-wider text-white/85 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Crown className="w-3 h-3 text-white/75" />
              <span>{balance?.planName || balance?.tier || 'FREE'}</span>
            </button>
          ) : (
            onRequireAuth && (
              <button
                type="button"
                onClick={onRequireAuth}
                className="px-2.5 py-1.5 rounded-lg bg-white text-black text-[10px] font-mono font-semibold uppercase tracking-wider hover:bg-white/90 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
            )
          )}

          {/* Account Balance Trigger */}
          <div
            onClick={() => onChangeView('credits')}
            title="Click to manage Credits & Transaction Ledger"
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white cursor-pointer transition-all whitespace-nowrap shrink-0"
          >
            <Coins className="w-3.5 h-3.5 text-white/75" />
            <div className="flex flex-col text-right">
              <span className="font-mono text-[11px] font-semibold tracking-tight text-white tabular-nums">
                {isAuthenticated ? balance?.balance_generate ?? 0 : 0}{' '}
                <span className="text-white/50 text-[10px] font-normal">CR</span>
              </span>
              <span className="font-mono text-[9px] text-white/50 tabular-nums hidden sm:block">
                {isAuthenticated && balance
                  ? `Rp ${(balance.balance_idr_equivalent || 0).toLocaleString('id-ID')}`
                  : 'Wallet'}
              </span>
            </div>
            {onRefreshBalance && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshBalance();
                }}
                disabled={isRefreshingBalance}
                title="Refresh balance"
                aria-label="Refresh balance"
                className="p-1 rounded text-white/40 hover:text-white transition-colors"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshingBalance ? 'animate-spin text-white' : ''}`}
                />
              </button>
            )}
          </div>

          {/* Upstream Connection Telemetry */}
          <button
            type="button"
            onClick={() => onChangeView('account')}
            title="ByteDance BytePlus ModelArk API v3 Status"
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-[10px] font-mono text-white/70 cursor-pointer hover:border-white/25 transition-all whitespace-nowrap shrink-0"
          >
            <ShieldCheck
              className={`w-3.5 h-3.5 ${
                health?.ok ? 'text-white' : health?.serverKeyConfigured ? 'text-white/70' : 'text-white/40'
              }`}
            />
            <span className="tracking-wide uppercase">
              {health?.ok
                ? 'ARK LIVE'
                : health?.serverKeyConfigured
                ? 'STANDBY'
                : 'NEEDS KEY'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
