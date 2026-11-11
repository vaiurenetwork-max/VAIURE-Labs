/**
 * VAIURE Studio — Location Library Workspace
 * Architectural environments, spatial lighting references, and scene associations.
 */

import React, { useState } from 'react';
import { Plus, MapPin, Trash2, Sun, Moon, Sparkles } from 'lucide-react';
import { StudioLocation, StudioProject } from '../../../types/studio';

interface LocationsWorkspaceProps {
  project: StudioProject;
  onUpdateLocations: (locations: StudioLocation[]) => void;
}

export const LocationsWorkspace: React.FC<LocationsWorkspaceProps> = ({
  project,
  onUpdateLocations,
}) => {
  const [selectedLocId, setSelectedLocId] = useState<string>(
    project.locations[0]?.id || ''
  );
  const [newImageInput, setNewImageInput] = useState('');

  const activeLoc = project.locations.find((l) => l.id === selectedLocId) || project.locations[0];

  const handleAddLocation = () => {
    const newLoc: StudioLocation = {
      id: `loc-${Date.now()}`,
      name: 'New Production Set',
      type: 'INTERIOR',
      timeOfDay: 'Golden Hour',
      lighting: 'Atmospheric volumetric lighting and specular reflections.',
      description: 'Architectural environment description and scale.',
      referenceImages: [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
      ],
      assignedShotIds: [],
      createdAt: new Date().toISOString(),
    };
    const nextLocs = [...project.locations, newLoc];
    onUpdateLocations(nextLocs);
    setSelectedLocId(newLoc.id);
  };

  const handleUpdateActive = (field: keyof StudioLocation, value: any) => {
    if (!activeLoc) return;
    const nextLocs = project.locations.map((l) =>
      l.id === activeLoc.id ? { ...l, [field]: value } : l
    );
    onUpdateLocations(nextLocs);
  };

  const handleAddImage = () => {
    if (!newImageInput.trim() || !activeLoc) return;
    const nextImages = [...activeLoc.referenceImages, newImageInput.trim()];
    handleUpdateActive('referenceImages', nextImages);
    setNewImageInput('');
  };

  const handleRemoveImage = (index: number) => {
    if (!activeLoc) return;
    const nextImages = activeLoc.referenceImages.filter((_, i) => i !== index);
    handleUpdateActive('referenceImages', nextImages);
  };

  const handleDeleteLocation = (locId: string) => {
    const nextLocs = project.locations.filter((l) => l.id !== locId);
    onUpdateLocations(nextLocs);
    if (selectedLocId === locId) {
      setSelectedLocId(nextLocs[0]?.id || '');
    }
  };

  return (
    <div className="w-full h-full flex flex-col sm:flex-row bg-[#07070B] overflow-hidden select-none">
      {/* LEFT: Locations List */}
      <aside className="w-full sm:w-64 bg-[#09090D] border-r border-white/10 flex flex-col shrink-0">
        <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            Locations ({project.locations.length})
          </span>
          <button
            onClick={handleAddLocation}
            className="p-1 rounded bg-white/10 hover:bg-white text-white hover:text-black transition-colors cursor-pointer"
            title="Create Location"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 no-scrollbar">
          {project.locations.map((loc) => {
            const isSelected = loc.id === activeLoc?.id;
            return (
              <div
                key={loc.id}
                onClick={() => setSelectedLocId(loc.id)}
                className={`p-2.5 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-white/[0.05] shadow-sm'
                    : 'border-white/[0.08] hover:border-white/20 bg-black/20'
                }`}
              >
                <div className="w-10 h-10 rounded-md overflow-hidden bg-neutral-900 border border-white/15 shrink-0">
                  <img
                    src={loc.referenceImages[0] || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=200&q=80'}
                    alt={loc.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs font-bold text-white truncate">{loc.name}</div>
                  <div className="text-[10px] font-mono text-amber-300 truncate">{loc.type}</div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* RIGHT: Location Detail Editor */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {activeLoc ? (
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="font-display text-xl font-bold uppercase text-white tracking-tight">
                  {activeLoc.name}
                </h2>
                <span className="text-xs font-mono text-amber-400">{activeLoc.type} SETTING</span>
              </div>
              <button
                onClick={() => handleDeleteLocation(activeLoc.id)}
                className="px-3 py-1.5 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 font-mono text-xs hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                Delete Location
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Location Name</label>
                <input
                  type="text"
                  value={activeLoc.name}
                  onChange={(e) => handleUpdateActive('name', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Type</label>
                <select
                  value={activeLoc.type}
                  onChange={(e) => handleUpdateActive('type', e.target.value as 'INTERIOR' | 'EXTERIOR')}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="INTERIOR">Interior Set</option>
                  <option value="EXTERIOR">Exterior Location</option>
                </select>
              </div>
            </div>

            {/* Time of Day & Lighting */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Time of Day</label>
                <input
                  type="text"
                  placeholder="e.g. Dawn, Blue Hour, Deep Night"
                  value={activeLoc.timeOfDay}
                  onChange={(e) => handleUpdateActive('timeOfDay', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Lighting Characteristics</label>
                <input
                  type="text"
                  placeholder="e.g. Chiaroscuro morning light ray, high contrast"
                  value={activeLoc.lighting}
                  onChange={(e) => handleUpdateActive('lighting', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Architectural Description</label>
              <textarea
                rows={3}
                value={activeLoc.description}
                onChange={(e) => handleUpdateActive('description', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Reference Plates Gallery */}
            <div className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-[10px] font-mono uppercase text-white/50">
                Visual Reference Plates ({activeLoc.referenceImages.length})
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste reference plate URL (https://...)"
                  value={newImageInput}
                  onChange={(e) => setNewImageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImage()}
                  className="flex-1 px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleAddImage}
                  className="px-3 py-1.5 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200 transition-colors"
                >
                  Add Plate
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeLoc.referenceImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-video rounded-lg overflow-hidden border border-white/15 bg-black/50"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 rounded bg-black/70 text-white/60 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
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
            No location selected.
          </div>
        )}
      </main>
    </div>
  );
};
