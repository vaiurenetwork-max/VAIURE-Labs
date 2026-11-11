import React, { useState, useMemo } from 'react';
import { Search, Plus, Filter, Sparkles, Compass, Flame, Clock, Layers, X } from 'lucide-react';
import { CollaborativeRoom, ProjectType } from '../../../types/collaborativeRooms';
import { RoomCard } from './RoomCard';

interface RoomListProps {
  rooms: CollaborativeRoom[];
  currentUserId: string;
  onSelectRoom: (room: CollaborativeRoom) => void;
  onCreateRoom: () => void;
  onManageRoom: (room: CollaborativeRoom) => void;
  onDeleteRoom: (roomId: string) => void;
}

export const RoomList: React.FC<RoomListProps> = ({
  rooms,
  currentUserId,
  onSelectRoom,
  onCreateRoom,
  onManageRoom,
  onDeleteRoom,
}) => {
  const [activeTab, setActiveTab] = useState<'MY_ROOMS' | 'DISCOVER'>('DISCOVER');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE_NOW' | 'MY_PROJECTS' | 'RECENT'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<ProjectType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered rooms logic
  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      // 1. Tab partitioning
      if (activeTab === 'MY_ROOMS') {
        const isOwned = room.ownerId === currentUserId;
        // In local/demo mode, if currentUserId is guest, also show rooms they created or top room
        if (!isOwned && room.ownerUsername !== 'elena_v') {
          // allow
        }
      } else {
        // DISCOVER: Private rooms must NOT appear in public discovery per requirement 4
        if (room.visibility === 'PRIVATE' && room.ownerId !== currentUserId) {
          return false;
        }
      }

      // 2. Filter Pills
      if (selectedFilter === 'ACTIVE_NOW' && room.activeCollaboratorsCount < 1) {
        return false;
      }
      if (selectedFilter === 'MY_PROJECTS' && room.ownerId !== currentUserId) {
        return false;
      }

      // 3. Category
      if (selectedCategory !== 'ALL' && room.projectType !== selectedCategory) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = room.name.toLowerCase().includes(query);
        const matchDesc = room.description.toLowerCase().includes(query);
        const matchTag = room.tags?.some((t) => t.toLowerCase().includes(query));
        const matchOwner = room.ownerDisplayName.toLowerCase().includes(query);
        if (!matchName && !matchDesc && !matchTag && !matchOwner) {
          return false;
        }
      }

      return true;
    });
  }, [rooms, activeTab, selectedFilter, selectedCategory, searchQuery, currentUserId]);

  const categories: { id: ProjectType | 'ALL'; label: string }[] = [
    { id: 'ALL', label: 'All Projects' },
    { id: 'CINEMATIC', label: 'Cinematic' },
    { id: 'NARRATIVE', label: 'Narrative' },
    { id: 'EXPERIMENTAL', label: 'Experimental' },
    { id: 'FASHION', label: 'Fashion' },
    { id: 'COMMERCIAL', label: 'Commercial' },
  ];

  return (
    <section id="creative-rooms-discovery" className="relative w-full py-10 sm:py-16 px-4 sm:px-6 lg:px-12 select-none">
      <div className="max-w-[1440px] mx-auto space-y-8">
        {/* Section Header & View Switcher */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">
              <span className="w-1.5 h-[1px] bg-white/40" />
              <span>COLLABORATIVE DISCOVERY</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-white">
              Creative Rooms
            </h2>
            <p className="font-sans text-xs sm:text-sm text-white/60">
              Find your next creative session or jump back into your team's workspace.
            </p>
          </div>

          {/* Action Row: My Rooms / Discover Tabs + Create Room Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Tabs */}
            <div className="flex items-center bg-white/[0.04] border border-white/[0.1] rounded-full p-1 text-xs font-mono">
              <button
                onClick={() => setActiveTab('DISCOVER')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'DISCOVER'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Discover Rooms</span>
              </button>

              <button
                onClick={() => setActiveTab('MY_ROOMS')}
                className={`px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'MY_ROOMS'
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>My Rooms</span>
              </button>
            </div>

            {/* Create Room CTA */}
            <button
              onClick={onCreateRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs uppercase tracking-wider font-bold transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'ALL', label: 'All Rooms' },
              { id: 'ACTIVE_NOW', label: 'Active Now' },
              { id: 'MY_PROJECTS', label: 'My Projects' },
              { id: 'RECENT', label: 'Recently Updated' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono tracking-wider transition-colors cursor-pointer border ${
                  selectedFilter === f.id
                    ? 'bg-white/10 text-white border-white/30 font-medium'
                    : 'bg-white/[0.02] text-white/50 border-white/[0.08] hover:text-white hover:border-white/20'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Input Bar */}
          <div className="relative min-w-[260px] sm:min-w-[320px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms, tags, creators..."
              className="w-full bg-white/[0.03] border border-white/10 focus:border-white/30 rounded-sm pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-white/40 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Project Type Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-white text-black font-semibold'
                  : 'bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Room Cards Grid */}
        {filteredRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filteredRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isOwner={room.ownerId === currentUserId}
                onJoin={onSelectRoom}
                onManage={onManageRoom}
                onDelete={onDeleteRoom}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="py-16 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
              <Compass className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold uppercase tracking-tight text-white">
                No Creative Rooms Found
              </h3>
              <p className="font-sans text-xs text-white/50 max-w-md mx-auto">
                No rooms match the selected filters or search query. Start a new collaborative session or reset your search.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setSelectedFilter('ALL');
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-sm border border-white/15 text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                onClick={onCreateRoom}
                className="px-4 py-2 rounded-sm bg-white text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                + Create Room
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
