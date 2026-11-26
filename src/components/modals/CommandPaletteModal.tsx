import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  ArrowRight,
  Compass,
  Film,
  Sparkles,
  Layers,
  Cpu,
  MessageSquare,
  Plus,
  Play,
  Wallet,
  Settings,
  User as UserIcon,
  FileText,
  Command,
  PenTool,
} from 'lucide-react';
import { SocialPost, UserProfile } from '../../types/social';
import { Z_LAYERS } from '../../constants/zLayers';

interface CommandItem {
  id: string;
  group: 'SLIDES' | 'ACTIONS' | 'ARCHIVE' | 'CREATORS' | 'WORKS';
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  activeSlide: number;
  posts: SocialPost[];
  creators: Record<string, UserProfile>;
  onClose: () => void;
  onSelectSlide: (slide: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7) => void;
  onNavigateArchiveSection: (sectionId: string) => void;
  onOpenCreatePost: () => void;
  onOpenShorts: () => void;
  onOpenWallet: () => void;
  onOpenSettings: () => void;
  onOpenCopyStudio: () => void;
  onOpenMessages: () => void;
  onOpenSubmit: () => void;
  onOpenPost: (post: SocialPost) => void;
  onOpenProfile: (username: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  activeSlide,
  posts,
  creators,
  onClose,
  onSelectSlide,
  onNavigateArchiveSection,
  onOpenCreatePost,
  onOpenShorts,
  onOpenWallet,
  onOpenSettings,
  onOpenCopyStudio,
  onOpenMessages,
  onOpenSubmit,
  onOpenPost,
  onOpenProfile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const slides: CommandItem[] = [
      {
        id: 'slide-0',
        group: 'SLIDES',
        title: '00 / Kinetic Motion Hero',
        subtitle: activeSlide === 0 ? 'Active stage' : 'Full-viewport brand stage',
        shortcut: '00',
        icon: <Play className="w-4 h-4 text-white/80" />,
        onSelect: () => onSelectSlide(0),
      },
      {
        id: 'slide-1',
        group: 'SLIDES',
        title: '01 / Threads Discourse',
        subtitle: activeSlide === 1 ? 'Active stage' : 'Real-time creator stream & discussions',
        shortcut: '01',
        icon: <MessageSquare className="w-4 h-4 text-white/80" />,
        onSelect: () => onSelectSlide(1),
      },
      {
        id: 'slide-2',
        group: 'SLIDES',
        title: '02 / Curatorial Archive',
        subtitle: activeSlide === 2 ? 'Active stage' : 'Editorial magazine, film, fashion & creators',
        shortcut: '02',
        icon: <Compass className="w-4 h-4 text-white/80" />,
        onSelect: () => onSelectSlide(2),
      },
      {
        id: 'slide-3',
        group: 'SLIDES',
        title: '03 / AI Hybrid Production Studio',
        subtitle: activeSlide === 3 ? 'Active stage' : 'Seedance 2.5 virtual stage, command center & AI departments',
        shortcut: '03',
        icon: <Film className="w-4 h-4 text-blue-400" />,
        onSelect: () => onSelectSlide(3),
      },
      {
        id: 'slide-4',
        group: 'SLIDES',
        title: '04 / Seedance 2.5 Studio',
        subtitle: activeSlide === 4 ? 'Active stage' : 'AI video production laboratory & reference studio',
        shortcut: '04',
        icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
        onSelect: () => onSelectSlide(4),
      },
      {
        id: 'slide-5',
        group: 'SLIDES',
        title: '05 / Fu Labs 3D Greybox',
        subtitle: activeSlide === 5 ? 'Active stage' : 'Interactive Three.js spatial director',
        shortcut: '05',
        icon: <Layers className="w-4 h-4 text-cyan-400" />,
        onSelect: () => onSelectSlide(5),
      },
      {
        id: 'slide-6',
        group: 'SLIDES',
        title: '06 / VX Vision Reconstruction',
        subtitle: activeSlide === 6 ? 'Active stage' : 'Midjourney V8.2 prompt & visual forensics',
        shortcut: '06',
        icon: <Cpu className="w-4 h-4 text-amber-400" />,
        onSelect: () => onSelectSlide(6),
      },
      {
        id: 'slide-7',
        group: 'SLIDES',
        title: '07 / VaiByte - Canvas Studio',
        subtitle: activeSlide === 7 ? 'Active stage' : 'Multi-layer canvas studio & Seedance 2.5 frame bridge',
        shortcut: '07',
        icon: <PenTool className="w-4 h-4 text-white/85" />,
        onSelect: () => onSelectSlide(7),
      },
    ];

    const actions: CommandItem[] = [
      {
        id: 'act-create',
        group: 'ACTIONS',
        title: 'Publish New Work',
        subtitle: 'Create an editorial post or showcase film',
        icon: <Plus className="w-4 h-4 text-white" />,
        onSelect: onOpenCreatePost,
      },
      {
        id: 'act-shorts',
        group: 'ACTIONS',
        title: 'Open VAIURE Shorts',
        subtitle: 'Vertical social video feed',
        icon: <Play className="w-4 h-4 text-red-400" />,
        onSelect: onOpenShorts,
      },
      {
        id: 'act-copy',
        group: 'ACTIONS',
        title: 'AI Copy Studio',
        subtitle: 'Editorial copy & campaign replication assistant',
        icon: <Sparkles className="w-4 h-4 text-white/80" />,
        onSelect: onOpenCopyStudio,
      },
      {
        id: 'act-dm',
        group: 'ACTIONS',
        title: 'Direct Messages',
        subtitle: 'Atelier dispatches & collaboration requests',
        icon: <MessageSquare className="w-4 h-4 text-white/80" />,
        onSelect: onOpenMessages,
      },
      {
        id: 'act-wallet',
        group: 'ACTIONS',
        title: 'Wallet & VXA Ledger',
        subtitle: 'VAIURE Credits, VXA Coin & transaction history',
        icon: <Wallet className="w-4 h-4 text-white/80" />,
        onSelect: onOpenWallet,
      },
      {
        id: 'act-submit',
        group: 'ACTIONS',
        title: 'Submit Work to Editorial Review',
        subtitle: 'Direct curatorial submission dossier',
        icon: <FileText className="w-4 h-4 text-white/80" />,
        onSelect: onOpenSubmit,
      },
      {
        id: 'act-settings',
        group: 'ACTIONS',
        title: 'Account & Preferences',
        subtitle: 'Handle, display preferences & security settings',
        icon: <Settings className="w-4 h-4 text-white/80" />,
        onSelect: onOpenSettings,
      },
    ];

    const archive: CommandItem[] = [
      { id: 'sec-feed', group: 'ARCHIVE', title: 'Archive · Explore Feed', subtitle: 'Social curation & creator publications', icon: <Compass className="w-4 h-4 text-white/50" />, onSelect: () => { onSelectSlide(2); setTimeout(() => onNavigateArchiveSection('social-feed'), 150); } },
      { id: 'sec-forum', group: 'ARCHIVE', title: 'Archive · Forum Discourse', subtitle: 'Open studio notes & discussions', icon: <MessageSquare className="w-4 h-4 text-white/50" />, onSelect: () => { onSelectSlide(2); setTimeout(() => onNavigateArchiveSection('selection'), 150); } },
      { id: 'sec-fashion', group: 'ARCHIVE', title: 'Archive · Digital Fashion', subtitle: 'Couture & algorithmic garments', icon: <Layers className="w-4 h-4 text-white/50" />, onSelect: () => { onSelectSlide(2); setTimeout(() => onNavigateArchiveSection('fashion'), 150); } },
      { id: 'sec-film', group: 'ARCHIVE', title: 'Archive · Cinema & Motion', subtitle: 'Editorial film catalog', icon: <Film className="w-4 h-4 text-white/50" />, onSelect: () => { onSelectSlide(2); setTimeout(() => onNavigateArchiveSection('film'), 150); } },
      { id: 'sec-creators', group: 'ARCHIVE', title: 'Archive · Creators Directory', subtitle: 'Verified & emerging directors', icon: <UserIcon className="w-4 h-4 text-white/50" />, onSelect: () => { onSelectSlide(2); setTimeout(() => onNavigateArchiveSection('artists'), 150); } },
    ];

    const uniqueCreators = Array.from(
      new Map(
        (Object.values(creators) as UserProfile[])
          .filter((c) => Boolean(c && c.id && c.username))
          .map((c) => [c.id, c])
      ).values()
    );

    const creatorItems: CommandItem[] = uniqueCreators.slice(0, 12).map((c) => ({
      id: `cr-${c.id}`,
      group: 'CREATORS',
      title: c.displayName || c.username,
      subtitle: `@${c.username} · ${c.role || 'CREATOR'}`,
      icon: <UserIcon className="w-4 h-4 text-white/60" />,
      onSelect: () => onOpenProfile(c.username),
    }));

    const postItems: CommandItem[] = posts.slice(0, 16).map((p) => ({
      id: `post-${p.id}`,
      group: 'WORKS',
      title: p.title,
      subtitle: `@${p.authorUsername} · ${p.category}`,
      icon: <Film className="w-4 h-4 text-white/60" />,
      onSelect: () => onOpenPost(p),
    }));

    return [...slides, ...actions, ...archive, ...creatorItems, ...postItems];
  }, [
    activeSlide,
    creators,
    posts,
    onSelectSlide,
    onNavigateArchiveSection,
    onOpenCreatePost,
    onOpenShorts,
    onOpenWallet,
    onOpenSettings,
    onOpenCopyStudio,
    onOpenMessages,
    onOpenSubmit,
    onOpenPost,
    onOpenProfile,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      return allItems.filter((item) => item.group === 'SLIDES' || item.group === 'ACTIONS').slice(0, 12);
    }
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.group.toLowerCase().includes(q)
    );
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredItems.length ? (prev + 1) % filteredItems.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          filteredItems.length ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
        );
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        filteredItems[selectedIndex].onSelect();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Global Command Palette"
          className={`fixed inset-0 ${Z_LAYERS.MODAL_DIALOG} bg-black/80 backdrop-blur-md flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-4`}
        >
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[#0a0a0e] border border-white/20 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden text-white flex flex-col max-h-[72vh]"
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#0d0d12]">
              <Search className="w-4 h-4 text-white/45 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to slide, action, creator, or work..."
                className="w-full bg-transparent text-sm text-white placeholder-white/35 focus:outline-none font-sans"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-[10px] font-mono text-white/45 hover:text-white uppercase px-1.5 py-0.5 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Command Palette"
                className="p-1 text-white/45 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-14 text-center space-y-2">
                  <p className="text-xs font-mono uppercase tracking-widest text-white/40">
                    No matching commands or works
                  </p>
                  <p className="text-xs text-white/30">
                    Try searching for Seedance, Cinema, VX, a creator handle, or a work title.
                  </p>
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const showGroupLabel =
                    idx === 0 || filteredItems[idx - 1].group !== item.group;

                  return (
                    <React.Fragment key={item.id}>
                      {showGroupLabel && (
                        <div className="px-3 pt-2 pb-1 text-[9px] font-mono tracking-[0.22em] text-white/35 uppercase">
                          {item.group}
                        </div>
                      )}
                      <button
                        type="button"
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          item.onSelect();
                          onClose();
                        }}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black'
                            : 'text-white/85 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`shrink-0 ${isSelected ? 'text-black [&_*]:text-black' : ''}`}>
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-xs font-medium truncate ${isSelected ? 'text-black font-semibold' : 'text-white'}`}>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className={`text-[10px] font-mono truncate ${isSelected ? 'text-black/65' : 'text-white/45'}`}>
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.shortcut && (
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                                isSelected
                                  ? 'border-black/20 text-black/75'
                                  : 'border-white/15 text-white/45'
                              }`}
                            >
                              {item.shortcut}
                            </span>
                          )}
                          <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-white/25'}`} />
                        </div>
                      </button>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Footer Shortcuts Bar */}
            <div className="px-4 py-2.5 border-t border-white/10 bg-[#070709] flex items-center justify-between text-[10px] font-mono text-white/40">
              <div className="flex items-center gap-3">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
                <span>ESC Dismiss</span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-white/50">
                <Command className="w-3 h-3" />K
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
