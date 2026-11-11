import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Users,
  Shield,
  Trash2,
  Copy,
  Check,
  UserX,
  AlertTriangle,
  Globe,
  Lock,
  Key,
} from 'lucide-react';
import {
  CollaborativeRoom,
  RoomParticipant,
  ParticipantRole,
  RoomVisibility,
} from '../../../types/collaborativeRooms';
import {
  updateRoom,
  deleteRoom,
  subscribeToParticipants,
  updateParticipantRole,
  removeParticipant,
} from '../../../services/collaborativeRoomsService';

interface ManageRoomModalProps {
  isOpen: boolean;
  room: CollaborativeRoom | null;
  currentUserId: string;
  onClose: () => void;
  onRoomUpdated: (updatedRoom: CollaborativeRoom) => void;
  onRoomDeleted: (roomId: string) => void;
}

export const ManageRoomModal: React.FC<ManageRoomModalProps> = ({
  isOpen,
  room,
  currentUserId,
  onClose,
  onRoomUpdated,
  onRoomDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'PARTICIPANTS' | 'DANGER'>('DETAILS');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('PUBLIC');
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name);
      setDescription(room.description);
      setVisibility(room.visibility);
      const unsub = subscribeToParticipants(room.id, setParticipants);
      return () => unsub();
    }
  }, [room]);

  if (!isOpen || !room) return null;

  const isOwner = room.ownerId === currentUserId;

  const handleCopyLink = () => {
    const url = `${window.location.origin}#room=${room.id}&code=${room.inviteCode}`;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSaving) return;

    setIsSaving(true);
    try {
      await updateRoom(room.id, {
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      onRoomUpdated({
        ...room,
        name: name.trim(),
        description: description.trim(),
        visibility,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update room:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ParticipantRole) => {
    try {
      await updateParticipantRole(room.id, userId, newRole);
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const handleRemove = async (userId: string) => {
    if (confirm('Remove this collaborator from the room?')) {
      try {
        await removeParticipant(room.id, userId);
      } catch (err) {
        console.error('Failed to remove participant:', err);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRoom(room.id);
      onRoomDeleted(room.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0C0C12] border border-white/15 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 text-[#ECECE9] animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="text-[10px] font-mono tracking-widest uppercase text-white/50">
              ROOM ADMINISTRATION
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-white truncate max-w-lg">
              Manage {room.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs font-mono">
          <button
            onClick={() => setActiveTab('DETAILS')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
              activeTab === 'DETAILS'
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/50 hover:text-white'
            }`}
          >
            Room Details
          </button>
          <button
            onClick={() => setActiveTab('PARTICIPANTS')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PARTICIPANTS'
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Participants ({participants.length})</span>
          </button>
          {isOwner && (
            <button
              onClick={() => setActiveTab('DANGER')}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer text-red-400 hover:text-red-300 ml-auto ${
                activeTab === 'DANGER' ? 'bg-red-950/40 text-red-300 font-medium' : ''
              }`}
            >
              Danger Zone
            </button>
          )}
        </div>

        {/* Tab 1: Room Details */}
        {activeTab === 'DETAILS' && (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Room Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2 text-sm font-sans text-white focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Brief / Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2 text-xs font-sans text-white focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as RoomVisibility)}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none transition-colors"
              >
                <option value="PUBLIC" className="bg-[#121218]">Public (Listed in Discovery)</option>
                <option value="INVITE_ONLY" className="bg-[#121218]">Invite Only (Hidden, Accessible via code)</option>
                <option value="PRIVATE" className="bg-[#121218]">Private (Restricted strictly to members)</option>
              </select>
            </div>

            {/* Invite Link Preview */}
            <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-white/70">
                <span>Direct Invitation Link</span>
                <span className="text-emerald-400 font-mono">Code: {room.inviteCode}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}#room=${room.id}&code=${room.inviteCode}`}
                  className="flex-1 bg-black/40 border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white/60 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 text-xs font-mono font-bold transition-colors cursor-pointer shrink-0"
                >
                  {isCopied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-sm border border-white/15 text-xs font-mono text-white/70 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-sm bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold uppercase tracking-wider"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Participants & Role Management */}
        {activeTab === 'PARTICIPANTS' && (
          <div className="space-y-4">
            <p className="text-xs font-mono text-white/60">
              Manage participant roles and permissions for this room.
            </p>

            <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-white/[0.02] max-h-[300px] overflow-y-auto">
              {participants.map((p) => {
                const isItemOwner = p.role === 'OWNER';
                return (
                  <div key={p.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={p.photoURL}
                        alt={p.displayName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-mono text-white font-medium truncate">
                          {p.displayName}
                        </div>
                        <div className="text-[10px] font-mono text-white/40">@{p.username}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isItemOwner ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                          OWNER
                        </span>
                      ) : (
                        <select
                          value={p.role}
                          disabled={!isOwner}
                          onChange={(e) => handleRoleChange(p.userId, e.target.value as ParticipantRole)}
                          className="bg-black/60 border border-white/15 rounded px-2 py-1 text-[11px] font-mono text-white/80 focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="EDITOR">EDITOR</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      )}

                      {isOwner && !isItemOwner && (
                        <button
                          onClick={() => handleRemove(p.userId)}
                          className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
                          title="Remove collaborator"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Danger Zone */}
        {activeTab === 'DANGER' && (
          <div className="space-y-4 p-4 rounded-lg border border-red-500/30 bg-red-950/20">
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>
            <p className="text-xs font-sans text-white/70 leading-relaxed">
              Deleting this room will permanently remove the SharedWorks canvas, all prompts, uploaded assets, and
              collaborative storyboards. This action cannot be undone.
            </p>

            {showDeleteConfirm ? (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-sm bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Yes, Permanently Delete Room
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-2 text-xs font-mono text-white/60 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-sm border border-red-500/40 text-red-400 hover:bg-red-900/30 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Delete This Room
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
