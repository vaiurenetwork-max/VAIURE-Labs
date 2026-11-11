import React, { useEffect, useRef } from 'react';
import {
  User,
  Film,
  Bookmark,
  Layers,
  Settings,
  HelpCircle,
  LogOut,
  Wallet,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { UserProfile } from '../../types/social';
import { useLanguage } from '../../services/i18n';

interface UserProfileMenuProps {
  currentUser: UserProfile;
  isOpen: boolean;
  isAdmin?: boolean;
  unreadMessagesCount?: number;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenMessages?: () => void;
  onOpenMyWorks?: () => void;
  onOpenSaved?: () => void;
  onOpenCollections?: () => void;
  onOpenSettings?: () => void;
  onOpenWallet?: () => void;
  onOpenAdmin?: () => void;
  onOpenHelp?: () => void;
  onSignOut?: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  currentUser,
  isOpen,
  isAdmin = false,
  unreadMessagesCount = 0,
  onClose,
  onOpenProfile,
  onOpenMessages,
  onOpenMyWorks,
  onOpenSaved,
  onOpenCollections,
  onOpenSettings,
  onOpenWallet,
  onOpenAdmin,
  onOpenHelp,
  onSignOut,
  triggerRef,
}) => {
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Outside Click and Escape Key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef?.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        triggerRef?.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  const displayName = currentUser.displayName || currentUser.username || t('profile');
  const username = currentUser.username;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="User account menu"
      style={{
        backgroundColor: 'rgba(12, 12, 14, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55)',
      }}
      className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-2rem)] border border-white/[0.08] text-white z-50 select-none animate-in fade-in duration-150 rounded-sm py-1"
    >
      {/* 01. PROFILE HEADER */}
      <button
        onClick={() => {
          onOpenProfile();
          onClose();
        }}
        role="menuitem"
        className="w-full text-left p-3 border-b border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer group flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0 flex items-center justify-center bg-neutral-900 text-white/80 font-mono text-[10px]">
          {Boolean(currentUser.avatar && currentUser.avatar.trim()) ? (
            <img
              src={currentUser.avatar}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 transition-all duration-300"
            />
          ) : (
            <span>{username ? username.slice(0, 2).toUpperCase() : 'VA'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-serif uppercase tracking-tight text-white font-medium truncate leading-tight group-hover:text-white">
            {displayName}
          </p>
          {username && (
            <p className="text-[10px] font-mono text-white/40 truncate mt-0.5">
              @{username}
            </p>
          )}
        </div>
      </button>

      {/* 02. VERTICALLY ORGANIZED PRIMARY ACTIONS */}
      <div className="py-1">
        <button
          onClick={() => {
            onOpenProfile();
            onClose();
          }}
          role="menuitem"
          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
        >
          <User className="w-3.5 h-3.5 text-white/50" />
          <span>Profile</span>
        </button>

        {onOpenMessages && (
          <button
            onClick={() => {
              onOpenMessages();
              onClose();
            }}
            role="menuitem"
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-3.5 h-3.5 text-white/50" />
              <span>Direct Messages</span>
            </div>
            {unreadMessagesCount > 0 && (
              <span className="min-w-[16px] h-4 px-1.5 rounded-full bg-white text-black font-mono text-[9px] font-bold flex items-center justify-center">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </button>
        )}

        {onOpenSaved && (
          <button
            onClick={() => {
              onOpenSaved();
              onClose();
            }}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
          >
            <Bookmark className="w-3.5 h-3.5 text-white/50" />
            <span>Saved</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            onClick={() => {
              onOpenSettings();
              onClose();
            }}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-sans text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
          >
            <Settings className="w-3.5 h-3.5 text-white/50" />
            <span>Settings</span>
          </button>
        )}

        {isAdmin && onOpenAdmin && (
          <button
            onClick={() => {
              onOpenAdmin();
              onClose();
            }}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-sans text-amber-300 hover:text-amber-200 hover:bg-amber-500/[0.08] transition-colors cursor-pointer text-left"
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin</span>
          </button>
        )}
      </div>

      {/* 03. SIGN OUT ACTION */}
      {onSignOut && (
        <div className="pt-1 mt-1 border-t border-white/[0.08]">
          <button
            onClick={() => {
              onSignOut();
              onClose();
            }}
            role="menuitem"
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-sans text-white/50 hover:text-red-400 hover:bg-red-500/[0.06] transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-3.5 h-3.5 opacity-60" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
