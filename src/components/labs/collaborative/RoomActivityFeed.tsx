import React, { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Clock, X } from 'lucide-react';
import { RoomActivity } from '../../../types/collaborativeRooms';

interface RoomActivityFeedProps {
  activities: RoomActivity[];
  isOpen: boolean;
  onToggle: () => void;
}

export const RoomActivityFeed: React.FC<RoomActivityFeedProps> = ({
  activities,
  isOpen,
  onToggle,
}) => {
  const latestActivity = activities[0];

  return (
    <div className="relative z-30 select-none">
      {/* Collapsed Pill Button */}
      {!isOpen && latestActivity && (
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black border border-white/15 text-[10px] font-mono text-white/80 backdrop-blur-md shadow-xl transition-all hover:scale-105 cursor-pointer max-w-[280px] sm:max-w-[360px]"
          title="Open Activity Log"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="truncate">
            <span className="text-white font-medium">{latestActivity.actorName.split(' ')[0]}</span>{' '}
            {latestActivity.action}
          </span>
          <Activity className="w-3 h-3 text-white/40 shrink-0 ml-1" />
        </button>
      )}

      {/* Expanded Activity Drawer */}
      {isOpen && (
        <div className="w-72 sm:w-80 rounded-xl border border-white/15 bg-[#0D0D14]/95 backdrop-blur-xl shadow-2xl p-3.5 space-y-3 text-[#ECECE9] animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Room Activity</span>
            </div>
            <button
              onClick={onToggle}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-[240px] overflow-y-auto no-scrollbar pr-1 text-xs font-mono">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div
                  key={act.id}
                  className="p-2 rounded bg-white/[0.02] border border-white/[0.05] flex items-start gap-2.5"
                >
                  <img
                    src={
                      act.actorAvatar ||
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                    }
                    alt={act.actorName}
                    className="w-5 h-5 rounded-full object-cover ring-1 ring-white/15 mt-0.5 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="text-[11px] leading-tight text-white/90">
                      <span className="font-bold text-white">{act.actorName}</span> {act.action}
                    </div>
                    {act.targetTitle && (
                      <div className="text-[10px] text-white/50 truncate italic">
                        "{act.targetTitle}"
                      </div>
                    )}
                    <div className="text-[9px] text-white/35">{act.timestamp}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[11px] font-mono text-white/40 text-center py-4">
                No activity recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
