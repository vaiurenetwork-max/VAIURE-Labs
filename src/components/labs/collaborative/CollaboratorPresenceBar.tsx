import React, { useState } from 'react';
import { UserPlus, Circle } from 'lucide-react';
import { RoomParticipant } from '../../../types/collaborativeRooms';

interface CollaboratorPresenceBarProps {
  participants: RoomParticipant[];
  onInvite: () => void;
}

export const CollaboratorPresenceBar: React.FC<CollaboratorPresenceBarProps> = ({
  participants,
  onInvite,
}) => {
  const [hoveredParticipant, setHoveredParticipant] = useState<RoomParticipant | null>(null);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center -space-x-2">
        {participants.map((p) => {
          const isOnline = p.status === 'ONLINE';
          return (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredParticipant(p)}
              onMouseLeave={() => setHoveredParticipant(null)}
              className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full ring-2 ring-[#08080C] overflow-hidden bg-neutral-900 cursor-pointer transition-transform hover:scale-110 hover:z-20"
              style={{ outline: `2px solid ${p.color || '#38BDF8'}` }}
            >
              <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
              {/* Online pulse indicator */}
              {isOnline && (
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
              )}
            </div>
          );
        })}

        {/* Hover Popover */}
        {hoveredParticipant && (
          <div className="absolute top-10 left-0 z-40 bg-[#121218] border border-white/20 rounded-md p-2.5 shadow-2xl text-[11px] font-mono text-white min-w-[160px] animate-in fade-in duration-100 pointer-events-none">
            <div className="font-bold flex items-center justify-between">
              <span>{hoveredParticipant.displayName}</span>
              <span
                className="text-[9px] px-1 rounded uppercase font-bold text-black"
                style={{ backgroundColor: hoveredParticipant.color }}
              >
                {hoveredParticipant.role}
              </span>
            </div>
            <div className="text-[10px] text-white/50">@{hoveredParticipant.username}</div>
            <div className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{hoveredParticipant.status}</span>
            </div>
          </div>
        )}
      </div>

      {/* Invite Button */}
      <button
        onClick={onInvite}
        className="flex items-center gap-1 px-2.5 py-1 rounded-sm bg-white/10 hover:bg-white text-white hover:text-black font-mono text-[11px] uppercase tracking-wider font-semibold transition-all cursor-pointer border border-white/15"
        title="Invite Collaborators"
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Invite</span>
      </button>
    </div>
  );
};
