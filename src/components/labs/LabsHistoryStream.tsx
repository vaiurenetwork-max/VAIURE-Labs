import React, { useState } from 'react';
import {
  Film,
  Star,
  Search,
  Sliders,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import { GenerationItem } from '../../types/labs';

interface LabsHistoryStreamProps {
  items: GenerationItem[];
  onSelectItem: (item: GenerationItem) => void;
  onForkSettings: (item: GenerationItem) => void;
  onToggleStar: (item: GenerationItem) => void;
  onDeleteItem: (id: string) => void;
  selectedItemId?: string;
}

export const LabsHistoryStream: React.FC<LabsHistoryStreamProps> = ({
  items,
  onSelectItem,
  onForkSettings,
  onToggleStar,
  onDeleteItem,
  selectedItemId,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'starred'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) => {
    if (filterMode === 'starred' && !item.isStarred) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPrompt = item.prompt.toLowerCase().includes(q);
      const matchModel = item.modelDisplayName.toLowerCase().includes(q);
      return matchPrompt || matchModel;
    }
    return true;
  });

  const starredCount = items.filter((i) => i.isStarred).length;

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] text-[#ECECE9] overflow-hidden select-none">
      {/* Top Controls Header */}
      <div className="p-3 sm:p-4 border-b border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#08080E]/90 shrink-0">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded p-0.5 text-xs font-mono">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-white text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            All Videos ({items.length})
          </button>
          <button
            onClick={() => setFilterMode('starred')}
            className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1.5 ${
              filterMode === 'starred'
                ? 'bg-white text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Star className="w-3 h-3" />
            <span>Starred ({starredCount})</span>
          </button>
        </div>

        {/* Right: Search Box */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search prompts..."
            className="w-full bg-[#0C0C12] border border-white/10 rounded pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      </div>

      {/* Grid of Generation Items (No empty state message) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedItemId;
            return (
              <div
                key={item.id}
                className={`group relative rounded border bg-[#0C0C12] overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-white ring-1 ring-white/50 shadow-xl'
                    : 'border-white/[0.08] hover:border-white/25'
                }`}
              >
                {/* Media Thumbnail Container */}
                <div
                  onClick={() => onSelectItem(item)}
                  className="relative aspect-video bg-black/60 overflow-hidden cursor-pointer"
                >
                  <img
                    src={item.mediaUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Badges: Resolution, Duration, 24fps */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white font-semibold border border-white/10">
                      {item.resolution || '1080p'}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white/90 border border-white/10">
                      {item.durationSeconds}s
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-white/90 border border-white/10">
                      24fps
                    </span>
                  </div>

                  {/* Star Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStar(item);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        item.isStarred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>

                  {/* Hover Inspect Action */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-3 py-1.5 rounded bg-white text-black text-[10px] font-mono font-bold tracking-wider uppercase flex items-center gap-1 shadow-lg">
                      <span>OPEN CANVAS</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>

                {/* Card Content & Metadata */}
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/50">
                    <div className="flex items-center gap-1 truncate max-w-[170px]">
                      <span className="truncate font-medium text-white">
                        {item.modelDisplayName}
                      </span>
                      {item.referenceImagesCount && item.referenceImagesCount > 0 ? (
                        <span className="text-[8.5px] px-1 py-0.2 rounded bg-white/10 text-white/70 shrink-0">
                          {item.referenceImagesCount} refs
                        </span>
                      ) : null}
                    </div>
                    <span className="tabular-nums shrink-0">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-white/70 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>

                  {/* Action Footer */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                    <button
                      onClick={() => onForkSettings(item)}
                      className="text-[10px] font-mono text-white/60 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>FORK</span>
                    </button>

                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="text-[10px] font-mono text-white/30 hover:text-red-400 transition-colors cursor-pointer p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
