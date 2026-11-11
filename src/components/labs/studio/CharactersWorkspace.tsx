/**
 * VAIURE Studio — Character Library Workspace
 * Detailed character profiles, multi-image reference latents, wardrobe specifications, and shot linkages.
 */

import React, { useState, useRef } from 'react';
import { Plus, User, Image, Trash2, Camera, Clock, Layers, Upload } from 'lucide-react';
import { StudioCharacter, StudioProject } from '../../../types/studio';
import { uploadAndOptimizeThreadImage } from '../../../services/forumService';

interface CharactersWorkspaceProps {
  project: StudioProject;
  onUpdateCharacters: (characters: StudioCharacter[]) => void;
}

export const CharactersWorkspace: React.FC<CharactersWorkspaceProps> = ({
  project,
  onUpdateCharacters,
}) => {
  const [selectedCharId, setSelectedCharId] = useState<string>(
    project.characters[0]?.id || ''
  );
  const [newImageInput, setNewImageInput] = useState('');
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeChar = project.characters.find((c) => c.id === selectedCharId) || project.characters[0];

  const handleAddCharacter = () => {
    const newChar: StudioCharacter = {
      id: `char-${Date.now()}`,
      name: 'New Character',
      role: 'Supporting Role',
      bio: 'Character bio and motivation description.',
      appearance: 'Distinct physical attributes, posture, and facial composition.',
      wardrobe: 'Specific textile specifications and color grading.',
      distinguishingFeatures: 'Props, scars, jewelry, or posture.',
      referenceImages: [
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
      ],
      assignedShotIds: [],
      versionHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextChars = [...project.characters, newChar];
    onUpdateCharacters(nextChars);
    setSelectedCharId(newChar.id);
  };

  const handleUpdateActive = (field: keyof StudioCharacter, value: any) => {
    if (!activeChar) return;
    const nextChars = project.characters.map((c) =>
      c.id === activeChar.id ? { ...c, [field]: value, updatedAt: new Date().toISOString() } : c
    );
    onUpdateCharacters(nextChars);
  };

  const handleAddRefImage = () => {
    if (!newImageInput.trim() || !activeChar) return;
    const nextImages = [...activeChar.referenceImages, newImageInput.trim()];
    handleUpdateActive('referenceImages', nextImages);
    setNewImageInput('');
  };

  const handleUploadCharacterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChar) return;
    setIsUploadingRef(true);
    try {
      const opt = await uploadAndOptimizeThreadImage(
        file,
        'studio_director',
        `char_${activeChar.id}`
      );
      const nextImages = [...activeChar.referenceImages, opt.url];
      handleUpdateActive('referenceImages', nextImages);
    } catch {
      // handled gracefully
    } finally {
      setIsUploadingRef(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveRefImage = (index: number) => {
    if (!activeChar) return;
    const nextImages = activeChar.referenceImages.filter((_, i) => i !== index);
    handleUpdateActive('referenceImages', nextImages);
  };

  const handleDeleteCharacter = (charId: string) => {
    const nextChars = project.characters.filter((c) => c.id !== charId);
    onUpdateCharacters(nextChars);
    if (selectedCharId === charId) {
      setSelectedCharId(nextChars[0]?.id || '');
    }
  };

  return (
    <div className="w-full h-full flex flex-col sm:flex-row bg-[#07070B] overflow-hidden select-none">
      {/* LEFT: Character List */}
      <aside className="w-full sm:w-64 bg-[#09090D] border-r border-white/10 flex flex-col shrink-0">
        <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            Characters ({project.characters.length})
          </span>
          <button
            onClick={handleAddCharacter}
            className="p-1 rounded bg-white/10 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
            title="Create Character"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
          {project.characters.map((char) => {
            const isSelected = char.id === activeChar?.id;
            return (
              <div
                key={char.id}
                onClick={() => setSelectedCharId(char.id)}
                className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-cyan-400 bg-white/[0.05] shadow-sm'
                    : 'border-white/[0.08] hover:border-white/20 bg-black/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-900 border border-white/15 shrink-0">
                  <img
                    src={char.referenceImages[0] || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={char.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-bold text-white truncate">{char.name}</div>
                  <div className="text-[10px] font-sans text-white/50 truncate">{char.role}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: Character Detail Editor */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {activeChar ? (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold uppercase text-white tracking-tight">
                  {activeChar.name}
                </h2>
                <span className="text-xs font-mono text-cyan-400">{activeChar.role}</span>
              </div>
              <button
                onClick={() => handleDeleteCharacter(activeChar.id)}
                className="px-3 py-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 font-mono text-xs hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                Delete Character
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Name</label>
                <input
                  type="text"
                  value={activeChar.name}
                  onChange={(e) => handleUpdateActive('name', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Role in Story</label>
                <input
                  type="text"
                  value={activeChar.role}
                  onChange={(e) => handleUpdateActive('role', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Description & Bio */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Character Bio</label>
              <textarea
                rows={2}
                value={activeChar.bio}
                onChange={(e) => handleUpdateActive('bio', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none resize-none"
              />
            </div>

            {/* Appearance & Wardrobe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Appearance Attributes</label>
                <textarea
                  rows={3}
                  value={activeChar.appearance}
                  onChange={(e) => handleUpdateActive('appearance', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Wardrobe References</label>
                <textarea
                  rows={3}
                  value={activeChar.wardrobe}
                  onChange={(e) => handleUpdateActive('wardrobe', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Reference Images Gallery */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase text-white/50">
                  Latent Reference Images ({activeChar.referenceImages.length})
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadCharacterImage}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingRef}
                  className="px-2.5 py-1 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  <span>{isUploadingRef ? 'Optimizing...' : 'Upload Reference Photo'}</span>
                </button>
              </div>

              {/* Add Reference Image Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste reference image URL (https://...)"
                  value={newImageInput}
                  onChange={(e) => setNewImageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRefImage()}
                  className="flex-1 px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  onClick={handleAddRefImage}
                  className="px-3 py-1.5 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  Add URL
                </button>
              </div>

              {/* Image Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {activeChar.referenceImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border border-white/15 bg-black/50"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveRefImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-white/60 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-white/40 font-mono text-xs">
            No character selected.
          </div>
        )}
      </main>
    </div>
  );
};
