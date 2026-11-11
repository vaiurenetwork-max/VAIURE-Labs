/**
 * VAIURE Studio — Left Navigation Panel
 * Collapsible navigation for all production stages while preserving active project state.
 */

import React from 'react';
import {
  FolderKanban,
  Users,
  MapPin,
  Camera,
  Layers,
  Film,
  Scissors,
  Image,
  Music,
  Share2,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Sparkles,
  Wand2,
} from 'lucide-react';

export type StudioNavSection =
  | 'vaiu'
  | 'projects'
  | 'characters'
  | 'locations'
  | 'storyboard'
  | 'image-gen'
  | 'midjourney'
  | 'generation'
  | 'timeline'
  | 'assets'
  | 'audio'
  | 'export';

interface StudioSidebarProps {
  activeSection: StudioNavSection;
  onChangeSection: (section: StudioNavSection) => void;
  onOpenCanvas: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  shotsCount: number;
  charactersCount: number;
  locationsCount: number;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({
  activeSection,
  onChangeSection,
  onOpenCanvas,
  isCollapsed,
  onToggleCollapse,
  shotsCount,
  charactersCount,
  locationsCount,
}) => {
  const items: {
    id: StudioNavSection | 'canvas';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    badge?: string;
    isCanvasRoute?: boolean;
  }[] = [
    { id: 'vaiu', label: 'VAIU Seedance 2.5', icon: Wand2, badge: '2.5' },
    { id: 'image-gen', label: 'Image Gen Studio', icon: Sparkles, badge: 'AI' },
    { id: 'midjourney', label: 'Midjourney Bridge', icon: Terminal, badge: 'MJ' },
    { id: 'generation', label: 'Video Synthesis', icon: Film },
    { id: 'storyboard', label: 'Storyboard', icon: Camera, count: shotsCount },
    { id: 'canvas', label: 'Visual Workflow', icon: Layers, isCanvasRoute: true, badge: 'Page' },
    { id: 'timeline', label: 'Timeline Editor', icon: Scissors },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'characters', label: 'Characters', icon: Users, count: charactersCount },
    { id: 'locations', label: 'Locations', icon: MapPin, count: locationsCount },
    { id: 'audio', label: 'Audio & Foley', icon: Music },
    { id: 'assets', label: 'Asset Library', icon: Image },
    { id: 'export', label: 'Export & Delivery', icon: Share2 },
  ];

  return (
    <nav
      className={`hidden md:flex h-full bg-[#08080C] border-r border-white/10 flex-col transition-all duration-200 select-none shrink-0 z-20 ${
        isCollapsed ? 'w-14' : 'w-52 sm:w-56'
      }`}
    >
      {/* Top Header / Collapse Toggle */}
      <div className="h-10 px-3 border-b border-white/10 flex items-center justify-between">
        {!isCollapsed && (
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
            Workspace
          </span>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer ml-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 py-2 px-1.5 space-y-1 overflow-y-auto no-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isCanvasRoute && activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isCanvasRoute) {
                  onOpenCanvas();
                } else {
                  onChangeSection(item.id as StudioNavSection);
                }
              }}
              title={item.label}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md font-mono text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-bold shadow-sm'
                  : item.isCanvasRoute
                  ? 'text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300'
                  : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between text-left min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                  {item.badge && (
                    <span className="text-[8px] font-mono px-1 rounded bg-cyan-500/20 text-cyan-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
