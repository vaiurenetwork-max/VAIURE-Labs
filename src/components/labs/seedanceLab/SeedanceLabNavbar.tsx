/**
 * VAIURE — SEEDANCE LAB NAVBAR
 * Monochromatic Black & White Glassmorphism Header
 * Pure black (#000000), translucent dark glass, subtle white borders, soft white typography.
 */

import React from 'react';
import {
  Sparkles,
  Layers,
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
} from 'lucide-react';
import { SeedanceAccountBalance, SeedanceHealthStatus } from '../../../services/seedanceLabService';

export type SeedanceLabView =
  | 'overview'
  | 'generator'
  | 'reference'
  | 'history'
  | 'account';

interface SeedanceLabNavbarProps {
  activeView: SeedanceLabView;
  onChangeView: (view: SeedanceLabView) => void;
  balance: SeedanceAccountBalance | null;
  health: SeedanceHealthStatus | null;
  isRefreshingBalance?: boolean;
  onRefreshBalance?: () => void;
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
  isRefreshingBalance,
  onRefreshBalance,
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  onOpenMenu,
}) => {
  const navTabs: Array<{ id: SeedanceLabView; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'generator', label: 'Video Generator', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'reference', label: 'Reference Studio', icon: <Camera className="w-3.5 h-3.5" /> },
    { id: 'history', label: 'Generation History', icon: <Clock className="w-3.5 h-3.5" /> },
    { id: 'account', label: 'Account & API', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  return (
    <header className="sticky top-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-xl border-b border-white/[0.12] text-white min-h-[56px] pt-[max(0rem,env(safe-area-inset-top))] select-none shrink-0 transition-all">
      <div className="max-w-[1720px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3 sm:gap-4">
        {/* Left Zone: Brand Identity + Slide Exit */}
        <div className="flex items-center gap-3 shrink-0">
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              aria-label="Open Slide Menu"
              className="p-1.5 rounded-lg border border-white/[0.12] bg-white/[0.045] text-white/75 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {onBackToSlideTwo && (
            <button
              onClick={onBackToSlideTwo}
              aria-label="Back to Archive"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.07] text-xs font-mono transition-all cursor-pointer"
              title="Return to Slide 02 Archive"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>02 ARCHIVE</span>
            </button>
          )}

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-serif tracking-[0.25em] text-xs sm:text-sm font-semibold uppercase text-white">
                VAIURE
              </span>
              <span className="text-white/30 font-light text-xs">/</span>
              <span className="text-xs sm:text-sm font-sans tracking-wider font-medium text-white/90">
                SEEDANCE LAB
              </span>
              <span className="hidden xl:inline-block text-[9px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/70 uppercase">
                Seedance 2.5 Excl.
              </span>
            </div>
            <span className="hidden sm:block text-[9px] font-sans text-white/45 tracking-tight truncate">
              Professional AI Video Production Workspace
            </span>
          </div>
        </div>

        {/* Center Zone: The 5 Internal Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1">
          {navTabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeView(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium tracking-tight whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-semibold shadow-[0_2px_12px_rgba(255,255,255,0.15)] border border-white'
                    : 'bg-white/[0.04] text-white/70 hover:text-white hover:bg-white/[0.08] border border-white/[0.08]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Zone: Live Balance + Backend Health Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Account Balance Pill */}
          <div
            onClick={() => onChangeView('account')}
            title="Click to view detailed account & API diagnostics"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.12] bg-white/[0.045] hover:bg-white/[0.08] text-white cursor-pointer transition-all"
          >
            <Coins className="w-3.5 h-3.5 text-white/75" />
            <div className="flex flex-col text-right">
              <span className="font-mono text-[11px] font-semibold tracking-tight text-white tabular-nums">
                {balance ? balance.balance_generate : 250}{' '}
                <span className="text-white/50 text-[10px] font-normal">GEN</span>
              </span>
              <span className="font-mono text-[9px] text-white/50 tabular-nums">
                {balance
                  ? `Rp ${(balance.balance_idr_equivalent || 0).toLocaleString('id-ID')}`
                  : 'Rp 100.000'}
              </span>
            </div>
            {onRefreshBalance && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRefreshBalance();
                }}
                disabled={isRefreshingBalance}
                title="Refresh balance"
                className="p-1 rounded text-white/40 hover:text-white transition-colors"
              >
                <RefreshCw
                  className={`w-3 h-3 ${isRefreshingBalance ? 'animate-spin text-white' : ''}`}
                />
              </button>
            )}
          </div>

          {/* Upstream Status Badge */}
          <div
            onClick={() => onChangeView('account')}
            title="PosBot Developer API v1 Status"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.1] bg-white/[0.025] text-[10px] font-mono text-white/60 cursor-pointer hover:border-white/20 transition-all"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                health?.ok ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'bg-white/40'
              }`}
            />
            <span className="tracking-wide uppercase">
              {health?.ok ? 'API ACTIVE' : 'HYBRID STANDBY'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
