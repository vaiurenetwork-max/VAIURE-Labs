import React, { useState } from 'react';
import {
  FolderTree,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Film,
  Layers,
  Plus,
  Search,
  Eye,
} from 'lucide-react';
import { CanvasItem, CanvasItemType } from '../../../types/collaborativeRooms';

interface ProjectExplorerSidebarProps {
  items: CanvasItem[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectItem: (item: CanvasItem) => void;
  onAddItem: (type: CanvasItemType) => void;
}

export const ProjectExplorerSidebar: React.FC<ProjectExplorerSidebarProps> = ({
  items,
  isCollapsed,
  onToggleCollapse,
  onSelectItem,
  onAddItem,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | CanvasItemType>('ALL');
  const [search, setSearch] = useState('');

  const filteredItems = items.filter((item) => {
    if (activeFilter !== 'ALL' && item.type !== activeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        item.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const counts = {
    PROMPT_CARD: items.filter((i) => i.type === 'PROMPT_CARD').length,
    NOTE: items.filter((i) => i.type === 'NOTE').length,
    REFERENCE_IMAGE: items.filter((i) => i.type === 'REFERENCE_IMAGE').length,
    VIDEO_PREVIEW: items.filter((i) => i.type === 'VIDEO_PREVIEW').length,
    STORYBOARD: items.filter((i) => i.type === 'STORYBOARD').length,
  };

  if (isCollapsed) {
    return (
      <div className="relative z-30 h-full bg-[#0A0A0F] border-r border-white/10 flex flex-col items-center py-3 w-11 shrink-0 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          title="Expand Project Explorer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-3 mt-6">
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveFilter('PROMPT_CARD');
            }}
            className="p-1.5 rounded text-cyan-400 hover:bg-cyan-500/20"
            title="Prompts"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveFilter('REFERENCE_IMAGE');
            }}
            className="p-1.5 rounded text-rose-400 hover:bg-rose-500/20"
            title="References"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveFilter('VIDEO_PREVIEW');
            }}
            className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/20"
            title="Video Previews"
          >
            <Film className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              onToggleCollapse();
              setActiveFilter('STORYBOARD');
            }}
            className="p-1.5 rounded text-amber-400 hover:bg-amber-500/20"
            title="Storyboards"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className="relative z-30 h-full w-64 sm:w-72 bg-[#0A0A0F] border-r border-white/10 flex flex-col shrink-0 text-[#ECECE9] select-none shadow-xl transition-all duration-300">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-white/70" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
            Project Explorer
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Collapse Explorer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/[0.08]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter assets..."
            className="w-full bg-white/[0.04] border border-white/10 focus:border-white/30 rounded px-2.5 pl-8 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none"
          />
        </div>
      </div>

      {/* Asset Category Filters */}
      <div className="p-2 border-b border-white/[0.08] flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] font-mono">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
            activeFilter === 'ALL' ? 'bg-white text-black font-bold' : 'text-white/60 hover:text-white'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setActiveFilter('PROMPT_CARD')}
          className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
            activeFilter === 'PROMPT_CARD'
              ? 'bg-cyan-500 text-black font-bold'
              : 'text-cyan-400/80 hover:text-cyan-300'
          }`}
        >
          Prompts ({counts.PROMPT_CARD})
        </button>
        <button
          onClick={() => setActiveFilter('REFERENCE_IMAGE')}
          className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
            activeFilter === 'REFERENCE_IMAGE'
              ? 'bg-rose-500 text-black font-bold'
              : 'text-rose-400/80 hover:text-rose-300'
          }`}
        >
          Refs ({counts.REFERENCE_IMAGE})
        </button>
        <button
          onClick={() => setActiveFilter('VIDEO_PREVIEW')}
          className={`px-2 py-1 rounded transition-colors whitespace-nowrap ${
            activeFilter === 'VIDEO_PREVIEW'
              ? 'bg-emerald-500 text-black font-bold'
              : 'text-emerald-400/80 hover:text-emerald-300'
          }`}
        >
          Video ({counts.VIDEO_PREVIEW})
        </button>
      </div>

      {/* Items Tree View */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectItem(item)}
              className="p-2.5 rounded-lg border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.06] transition-all cursor-pointer space-y-1.5 group"
            >
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-white group-hover:text-emerald-400 transition-colors truncate max-w-[170px]">
                  {item.title}
                </span>
                <span className="text-[9px] text-white/40 uppercase tracking-wider">
                  {item.type.split('_')[0]}
                </span>
              </div>
              <p className="text-[10px] font-sans text-white/60 line-clamp-2 leading-relaxed">
                {item.content}
              </p>
              {item.mediaUrl && (
                <div className="relative aspect-[16/9] rounded overflow-hidden bg-black/60">
                  <img src={item.mediaUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-xs font-mono text-white/40">
            No matching assets found.
          </div>
        )}
      </div>

      {/* Add Asset Quick Button */}
      <div className="p-3 border-t border-white/10 bg-black/40 grid grid-cols-2 gap-2 text-[10px] font-mono">
        <button
          onClick={() => onAddItem('PROMPT_CARD')}
          className="p-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Prompt</span>
        </button>
        <button
          onClick={() => onAddItem('REFERENCE_IMAGE')}
          className="p-1.5 rounded border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" />
          <span>Reference</span>
        </button>
      </div>
    </aside>
  );
};
