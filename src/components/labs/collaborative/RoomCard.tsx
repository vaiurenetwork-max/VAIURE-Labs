import React, { useState } from 'react';
import {
  Users,
  MoreVertical,
  Play,
  Lock,
  Globe,
  Key,
  Copy,
  Check,
  Settings,
  Trash2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { CollaborativeRoom } from '../../../types/collaborativeRooms';

interface RoomCardProps {
  room: CollaborativeRoom;
  isOwner: boolean;
  onJoin: (room: CollaborativeRoom) => void;
  onManage?: (room: CollaborativeRoom) => void;
  onDelete?: (roomId: string) => void;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  isOwner,
  onJoin,
  onManage,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}#room=${room.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    setIsMenuOpen(false);
  };

  const getVisibilityIcon = () => {
    switch (room.visibility) {
      case 'PRIVATE':
        return <Lock className="w-3 h-3 text-amber-400" />;
      case 'INVITE_ONLY':
        return <Key className="w-3 h-3 text-cyan-400" />;
      default:
        return <Globe className="w-3 h-3 text-white/50" />;
    }
  };

  return (
    <div
      onClick={() => onJoin(room)}
      className="group relative rounded-xl border border-white/10 hover:border-white/25 bg-[#09090D] hover:bg-[#0D0D14] transition-all duration-300 flex flex-col overflow-hidden shadow-lg hover:shadow-2xl cursor-pointer"
    >
      {/* 1. Cinematic Thumbnail Container (16:9 proportion) */}
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-neutral-950">
        <img
          src={room.coverImage}
          alt={room.name}
          className="w-full h-full object-cover filter contrast-[1.08] brightness-[0.85] group-hover:scale-105 group-hover:brightness-100 transition-all duration-500 ease-out"
        />

        {/* Chiaroscuro Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090D] via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges: Project Type & Visibility */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-[2px] bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono tracking-wider uppercase text-white font-medium">
              {room.projectType}
            </span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-black/60 backdrop-blur-md border border-white/15 text-[9px] font-mono text-white/70">
              {getVisibilityIcon()}
              <span>{room.visibility.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Context Menu Trigger */}
          <div className="relative pointer-events-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Room Actions"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Context Menu Dropdown */}
            {isMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-7 z-30 w-44 rounded-md border border-white/15 bg-[#121218] p-1 shadow-2xl text-[11px] font-mono text-white/80 animate-in fade-in duration-150"
              >
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Room Link'}</span>
                </button>

                {onManage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onManage(room);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-white/10 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-white/60" />
                    <span>Manage Room</span>
                  </button>
                )}

                {isOwner && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onDelete(room.id);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors text-left cursor-pointer border-t border-white/10 mt-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Room</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Collaborators Presence Chip (Bottom Left of Thumbnail) */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{room.activeCollaboratorsCount} Active Now</span>
        </div>
      </div>

      {/* 2. Room Metadata & Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          <h3 className="font-display text-base font-bold uppercase tracking-tight text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
            {room.name}
          </h3>
          <p className="font-sans text-xs text-white/60 line-clamp-2 leading-relaxed">
            {room.description}
          </p>
        </div>

        {/* Creator / Owner Info */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-white/60">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={room.ownerAvatar}
              alt={room.ownerDisplayName}
              className="w-5 h-5 rounded-full object-cover ring-1 ring-white/20 shrink-0"
            />
            <span className="truncate max-w-[120px] text-white/80">{room.ownerDisplayName}</span>
          </div>

          <div className="text-[10px] text-white/40 shrink-0">
            {new Date(room.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Last Activity Snippet */}
        {room.lastActivityText && (
          <div className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.06] text-[10px] font-mono text-white/50 truncate">
            <span className="text-white/70">Activity:</span> {room.lastActivityText}
          </div>
        )}

        {/* Tags Ribbon */}
        {room.tags && room.tags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden">
            {room.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 rounded-[2px] bg-white/[0.04] text-[9px] font-mono text-white/50 tracking-wider"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Button: Join or Resume */}
        <div className="pt-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onJoin(room);
            }}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-sm bg-white/[0.06] hover:bg-white text-white hover:text-black font-mono text-xs uppercase tracking-widest font-semibold transition-all duration-200 border border-white/15 hover:border-transparent active:scale-[0.98] cursor-pointer"
          >
            <span>{isOwner ? 'Resume Workspace' : 'Join Room'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
