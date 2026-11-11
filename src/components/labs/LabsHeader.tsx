import React from 'react';
import {
  Users,
  Sparkles,
  Layers,
  Menu,
  ArrowLeft,
  Film,
  Zap,
  Crown,
  Shield,
  CreditCard,
  Coins,
} from 'lucide-react';
import { useLanguage } from '../../services/i18n';

export type LabsView = 'studio' | 'showcase' | 'wallet' | 'rooms' | 'history' | 'admin';

interface LabsHeaderProps {
  activeView: LabsView;
  onChangeView: (view: LabsView) => void;
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  onOpenMenu?: () => void;
  activeRoomName?: string;
  onLeaveRoom?: () => void;
  creditBalance?: number;
  vxaBalance?: number;
  membershipTier?: string;
  onOpenWallet?: () => void;
  onOpenTopUp?: () => void;
  onOpenMembership?: () => void;
  isAdmin?: boolean;
}

export const LabsHeader: React.FC<LabsHeaderProps> = ({
  activeView,
  onChangeView,
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  onOpenMenu,
  activeRoomName,
  onLeaveRoom,
  creditBalance,
  vxaBalance,
  membershipTier = 'FREE',
  onOpenWallet,
  onOpenTopUp,
  onOpenMembership,
  isAdmin = true,
}) => {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 left-0 right-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/[0.08] select-none text-[#ECECE9] h-12">
      <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-3">
        {/* Left: Brand Name VAIURE｜唯昱尔 + LABS */}
        <div className="flex items-center gap-2">
          {activeRoomName && onLeaveRoom ? (
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Rooms</span>
            </button>
          ) : null}

          <div className="flex items-baseline gap-1.5 cursor-pointer" onClick={() => onChangeView('studio')}>
            <span className="font-display text-sm sm:text-base font-bold tracking-[0.2em] uppercase text-white">
              VAIURE
            </span>
            <span className="text-white/35 font-light text-xs sm:text-sm">｜</span>
            <span className="text-xs sm:text-sm font-light text-white/85 font-sans tracking-widest">
              唯昱尔
            </span>
            <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase ml-1.5 border-l border-white/20 pl-2">
              LABS
            </span>
          </div>

          {activeRoomName && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-emerald-400 border-l border-white/20 pl-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/90 truncate max-w-[200px]">{activeRoomName}</span>
            </div>
          )}
        </div>

        {/* Center: Main Navigation Tabs (Studio, Showcase, VXA Wallet, Rooms, History, Admin) */}
        {!activeRoomName && (
          <div className="hidden sm:flex items-center bg-white/[0.04] border border-white/[0.08] rounded-full p-0.5 text-[11px] font-mono">
            <button
              onClick={() => onChangeView('studio')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'studio'
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Seedance 2.5</span>
            </button>
            <button
              onClick={() => onChangeView('showcase')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'showcase'
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Film className="w-3 h-3 text-amber-400" />
              <span>Showcase</span>
            </button>
            <button
              onClick={() => onChangeView('wallet')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'wallet'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'text-amber-300/80 hover:text-amber-200'
              }`}
            >
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>VXA Wallet</span>
            </button>
            <button
              onClick={() => onChangeView('rooms')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'rooms'
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3 text-emerald-400" />
              <span>Rooms</span>
            </button>
            <button
              onClick={() => onChangeView('history')}
              className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                activeView === 'history'
                  ? 'bg-white text-black font-medium shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3 text-purple-400" />
              <span>History</span>
            </button>
            {isAdmin && (
              <button
                onClick={() => onChangeView('admin')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'admin'
                    ? 'bg-cyan-400 text-black font-bold shadow-sm'
                    : 'text-cyan-400/80 hover:text-cyan-300'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin</span>
              </button>
            )}
          </div>
        )}

        {/* Right: Wallet Balance & Membership Tier Badges + Mobile Menu */}
        <div className="flex items-center gap-2">
          {vxaBalance !== undefined && (
            <button
              onClick={() => onChangeView('wallet')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold hover:bg-cyan-500/20 transition-all cursor-pointer shadow-sm"
              title="Open VXA Digital Wallet"
            >
              <Coins className="w-3 h-3 text-cyan-400" />
              <span>{vxaBalance.toLocaleString()} VXA</span>
            </button>
          )}

          {creditBalance !== undefined && onOpenWallet && (
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm"
              title="View Centralized Credit Wallet"
            >
              <Zap className="w-3 h-3 fill-amber-400" />
              <span>{creditBalance.toLocaleString()} cr</span>
            </button>
          )}

          {membershipTier && onOpenMembership && (
            <button
              onClick={onOpenMembership}
              className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/70 hover:text-white font-mono text-[10px] uppercase transition-all cursor-pointer"
              title="Inspect / Upgrade Membership Plan"
            >
              <Crown className="w-3 h-3 text-cyan-400" />
              <span>{membershipTier}</span>
            </button>
          )}

          {onOpenTopUp && (
            <button
              onClick={onOpenTopUp}
              className="px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 text-black font-mono text-[10px] font-bold transition-all cursor-pointer shadow-sm"
            >
              + Top Up
            </button>
          )}

          {/* Mobile Menu Drawer Button */}
          {onOpenMenu && (
            <button
              onClick={onOpenMenu}
              aria-label="Open Navigation Menu"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
