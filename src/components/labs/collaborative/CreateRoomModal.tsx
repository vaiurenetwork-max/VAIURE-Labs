import React, { useState } from 'react';
import { X, Sparkles, Image, Lock, Globe, Key, Users, Check } from 'lucide-react';
import { CollaborativeRoom, RoomVisibility, ProjectType, RoomParticipant } from '../../../types/collaborativeRooms';
import { createRoom } from '../../../services/collaborativeRoomsService';

interface CreateRoomModalProps {
  isOpen: boolean;
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    photoURL?: string;
  };
  onClose: () => void;
  onRoomCreated: (newRoom: CollaborativeRoom) => void;
}

const PRESET_COVERS = [
  {
    name: 'Neo Noir',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Atelier Light',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Geothermal Dome',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Kinetic Motion',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85',
  },
  {
    name: 'Sculptural Mikado',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
  },
];

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onRoomCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCover, setSelectedCover] = useState(PRESET_COVERS[0].url);
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [visibility, setVisibility] = useState<RoomVisibility>('PUBLIC');
  const [projectType, setProjectType] = useState<ProjectType>('CINEMATIC');
  const [maxParticipants, setMaxParticipants] = useState<number>(8);
  const [password, setPassword] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const coverImage = customCoverUrl.trim() || selectedCover;
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const ownerParticipant: Omit<RoomParticipant, 'id' | 'joinedAt' | 'lastActiveAt'> = {
        userId: currentUser.id || 'guest-user',
        username: currentUser.username || 'director',
        displayName: currentUser.displayName || 'VAIURE Director',
        photoURL:
          currentUser.photoURL ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        role: 'OWNER',
        status: 'ONLINE',
        color: '#38BDF8',
      };

      const newRoom = await createRoom(
        {
          name: name.trim(),
          description: description.trim() || 'Collaborative real-time AI video laboratory session.',
          coverImage,
          ownerId: currentUser.id || 'guest-user',
          ownerUsername: currentUser.username || 'director',
          ownerDisplayName: currentUser.displayName || 'VAIURE Director',
          ownerAvatar: ownerParticipant.photoURL,
          visibility,
          projectType,
          maxParticipants,
          password: password.trim() || undefined,
          status: 'ACTIVE',
          tags: tags.length > 0 ? tags : ['Seedance 2.5', 'Cinema'],
          inviteCode: `VAI-${Math.floor(1000 + Math.random() * 9000)}`,
        },
        ownerParticipant
      );

      onRoomCreated(newRoom);
      onClose();
    } catch (err) {
      console.error('Failed to create room:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0B0B10] border border-white/15 rounded-xl shadow-2xl p-6 sm:p-8 space-y-6 text-[#ECECE9] animate-in zoom-in-95 duration-200 my-auto"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-white/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CREATIVE LABORATORY</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-white">
              Create Collaborative Room
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Room Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
              Room Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Neon City — Anamorphic Experiments"
              className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2.5 text-sm font-sans text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
              Project Brief / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the creative objective, aesthetic tone, or filmmaking brief..."
              className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2 text-xs font-sans text-white placeholder-white/30 focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Project Type & Max Participants */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Project Category
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none transition-colors"
              >
                <option value="CINEMATIC" className="bg-[#121218] text-white">Cinematic Film</option>
                <option value="NARRATIVE" className="bg-[#121218] text-white">Narrative Story</option>
                <option value="EXPERIMENTAL" className="bg-[#121218] text-white">Experimental Video</option>
                <option value="FASHION" className="bg-[#121218] text-white">Haute Couture / Fashion</option>
                <option value="COMMERCIAL" className="bg-[#121218] text-white">Commercial / Brand</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Max Collaborators
              </label>
              <select
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3 py-2 text-xs font-mono text-white focus:outline-none transition-colors"
              >
                {[2, 4, 6, 8, 12, 16].map((num) => (
                  <option key={num} value={num} className="bg-[#121218] text-white">
                    {num} Team Members
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visibility Controls */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
              Access Visibility
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'PUBLIC', label: 'Public', desc: 'Visible in Discovery', icon: Globe },
                { id: 'INVITE_ONLY', label: 'Invite Only', desc: 'Shared via link/code', icon: Key },
                { id: 'PRIVATE', label: 'Private', desc: 'Hidden & restricted', icon: Lock },
              ].map((vis) => {
                const Icon = vis.icon;
                const isSelected = visibility === vis.id;
                return (
                  <button
                    key={vis.id}
                    type="button"
                    onClick={() => setVisibility(vis.id as RoomVisibility)}
                    className={`p-2.5 rounded-sm border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-white bg-white/10 text-white'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-white/40'}`} />
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <div className="mt-2">
                      <div className="font-mono text-xs font-semibold">{vis.label}</div>
                      <div className="text-[10px] text-white/40 line-clamp-1">{vis.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Password if Private / Invite */}
          {visibility !== 'PUBLIC' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
                Optional Room Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for open access with link"
                className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none transition-colors"
              />
            </div>
          )}

          {/* Cinematic Cover Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
              Room Cinematic Cover Thumbnail
            </label>
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COVERS.map((cov) => (
                <button
                  key={cov.name}
                  type="button"
                  onClick={() => {
                    setSelectedCover(cov.url);
                    setCustomCoverUrl('');
                  }}
                  className={`relative aspect-[16/9] rounded overflow-hidden border transition-all cursor-pointer ${
                    selectedCover === cov.url && !customCoverUrl
                      ? 'border-white ring-2 ring-white/50 scale-[1.02]'
                      : 'border-white/15 hover:border-white/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={cov.url} alt={cov.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-[8px] font-mono text-white uppercase tracking-wider truncate px-1">
                      {cov.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-white/70">
              Project Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Seedance 2.5, 35mm, Cyberpunk, 1080p"
              className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded-sm px-3.5 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none transition-colors"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm border border-white/15 text-xs font-mono text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="px-6 py-2.5 rounded-sm bg-white text-black hover:bg-neutral-200 disabled:opacity-50 font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-md"
            >
              {isSubmitting ? 'Creating Room...' : 'Create & Enter Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
