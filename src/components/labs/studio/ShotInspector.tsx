/**
 * VAIURE Studio — Contextual Shot Inspector
 * Detailed cinematographic parameters, prompt synthesis builder, continuity management, and take versions.
 */

import React, { useState } from 'react';
import {
  X,
  Camera,
  Layers,
  Sparkles,
  History,
  Check,
  Eye,
  Film,
  Clock,
  User,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  StoryboardShot,
  StudioProject,
  ShotSize,
  CameraMovement,
  ShotVersion,
} from '../../../types/studio';
import { buildShotPromptFromStructuredFields } from '../../../utils/shotPromptBuilder';

interface ShotInspectorProps {
  shot: StoryboardShot;
  project: StudioProject;
  onUpdateShot: (updated: StoryboardShot) => void;
  onClose: () => void;
  onGenerateVideo: (shot: StoryboardShot) => void;
}

export const ShotInspector: React.FC<ShotInspectorProps> = ({
  shot,
  project,
  onUpdateShot,
  onClose,
  onGenerateVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'cinematography' | 'prompt' | 'versions'>('cinematography');

  const shotSizes: { id: ShotSize; label: string }[] = [
    { id: 'EXTREME_WIDE', label: 'Extreme Wide Shot (EWS)' },
    { id: 'WIDE', label: 'Wide Shot (WS)' },
    { id: 'MEDIUM', label: 'Medium Shot (MS)' },
    { id: 'MEDIUM_CLOSE_UP', label: 'Medium Close-Up (MCU)' },
    { id: 'CLOSE_UP', label: 'Close-Up (CU)' },
    { id: 'EXTREME_CLOSE_UP', label: 'Extreme Close-Up (ECU)' },
  ];

  const cameraMovements: { id: CameraMovement; label: string }[] = [
    { id: 'STATIC', label: 'Static Lock-Off' },
    { id: 'PAN', label: 'Pan (Horizontal)' },
    { id: 'TILT', label: 'Tilt (Vertical)' },
    { id: 'DOLLY_IN', label: 'Dolly In' },
    { id: 'DOLLY_OUT', label: 'Dolly Out' },
    { id: 'TRACKING', label: 'Steadicam Tracking' },
    { id: 'CRANE', label: 'Crane / Jib' },
    { id: 'HANDHELD', label: 'Handheld Kinetic' },
    { id: 'ORBIT', label: '360° Orbit' },
  ];

  const handleFieldChange = (field: keyof StoryboardShot, value: any) => {
    const updated = { ...shot, [field]: value };
    onUpdateShot(updated);
  };

  const handleRebuildPrompt = () => {
    const location = project.locations.find((l) => l.id === shot.locationId);
    const compiled = buildShotPromptFromStructuredFields(shot, project.characters, location);
    onUpdateShot({
      ...shot,
      prompt: compiled,
      isManualPromptEdited: false,
    });
  };

  const handleRestoreVersion = (version: ShotVersion) => {
    onUpdateShot({
      ...shot,
      thumbnailUrl: version.thumbnailUrl,
      videoUrl: version.videoUrl,
      prompt: version.prompt,
      currentVersionNumber: version.versionNumber,
      status: 'COMPLETED',
    });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
      />

      <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] rounded-t-2xl border-t border-white/20 shadow-[0_-20px_60px_rgba(0,0,0,0.9)] animate-sheet-up lg:animate-none lg:static lg:w-88 lg:max-h-none lg:rounded-none lg:border-t-0 lg:border-l lg:border-white/10 bg-[#08080C] flex flex-col lg:h-full shrink-0 select-none pb-safe lg:pb-0">
        {/* Mobile Drag Pill */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 lg:hidden shrink-0" />

        {/* Header */}
        <div className="h-11 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase text-white">
              Shot {String(shot.shotNumber).padStart(2, '0')} Inspector
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Shot Inspector"
            className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-white/[0.02] text-xs font-mono">
        <button
          onClick={() => setActiveTab('cinematography')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'cinematography'
              ? 'border-white text-white font-bold bg-white/[0.04]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Cinematography
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'prompt'
              ? 'border-white text-white font-bold bg-white/[0.04]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Prompt & AI
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex-1 py-2 text-center transition-colors border-b-2 ${
            activeTab === 'versions'
              ? 'border-white text-white font-bold bg-white/[0.04]'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          Takes ({shot.versions.length})
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {activeTab === 'cinematography' && (
          <div className="space-y-4">
            {/* Title & Duration */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Shot Title</label>
              <input
                type="text"
                value={shot.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/50">Duration (Sec)</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={shot.duration}
                  onChange={(e) => handleFieldChange('duration', Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono uppercase text-white/50">Scene</label>
                <select
                  value={shot.sceneId}
                  onChange={(e) => handleFieldChange('sceneId', e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                >
                  {project.scenes.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      Scene {sc.sceneNumber}: {sc.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shot Size */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Framing & Shot Size</label>
              <select
                value={shot.shotSize}
                onChange={(e) => handleFieldChange('shotSize', e.target.value as ShotSize)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              >
                {shotSizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Camera Movement */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Camera Movement</label>
              <select
                value={shot.cameraMovement}
                onChange={(e) => handleFieldChange('cameraMovement', e.target.value as CameraMovement)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              >
                {cameraMovements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Lens & Composition */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Lens / Focal Length</label>
              <input
                type="text"
                placeholder="e.g. 35mm anamorphic prime f/2.0"
                value={shot.lens || ''}
                onChange={(e) => handleFieldChange('lens', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Lighting & Atmosphere</label>
              <input
                type="text"
                placeholder="e.g. Chiaroscuro high-contrast, morning shaft beam"
                value={shot.lighting || ''}
                onChange={(e) => handleFieldChange('lighting', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {/* Character Assignment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Assigned Character(s)</label>
              <div className="space-y-1">
                {project.characters.map((char) => {
                  const isAssigned = shot.characterIds.includes(char.id);
                  return (
                    <label
                      key={char.id}
                      className="flex items-center gap-2 px-2 py-1 rounded bg-white/[0.03] text-xs font-mono text-white/80 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isAssigned}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...shot.characterIds, char.id]
                            : shot.characterIds.filter((id) => id !== char.id);
                          handleFieldChange('characterIds', next);
                        }}
                        className="rounded"
                      />
                      <span>{char.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Location Assignment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Assigned Location</label>
              <select
                value={shot.locationId || ''}
                onChange={(e) => handleFieldChange('locationId', e.target.value || undefined)}
                className="w-full px-2 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              >
                <option value="">No Location Assigned</option>
                {project.locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Blocking & Continuity Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Continuity & Blocking Notes</label>
              <textarea
                rows={2}
                placeholder="Preserve wet floor reflections, glove worn on right hand..."
                value={shot.continuityNotes || ''}
                onChange={(e) => handleFieldChange('continuityNotes', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'prompt' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase text-white/50">Generation Prompt</label>
              <button
                onClick={handleRebuildPrompt}
                className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Combine structured parameters into prompt without losing character context"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Rebuild from Parameters</span>
              </button>
            </div>

            <textarea
              rows={5}
              value={shot.prompt}
              onChange={(e) => {
                handleFieldChange('prompt', e.target.value);
                handleFieldChange('isManualPromptEdited', true);
              }}
              className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 resize-none leading-relaxed"
            />

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase text-white/50">Negative Directives</label>
              <input
                type="text"
                placeholder="oversaturated, jitter, deformed fingers..."
                value={shot.negativePrompt || ''}
                onChange={(e) => handleFieldChange('negativePrompt', e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {/* Generate Action */}
            <div className="pt-2">
              <button
                onClick={() => onGenerateVideo(shot)}
                className="w-full py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-black font-mono text-xs font-bold uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 fill-black" />
                <span>Synthesize Video for Shot</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase text-white/50">
              Recorded Take Versions (Non-Destructive)
            </div>

            {shot.versions.length === 0 ? (
              <div className="text-center py-8 text-white/40 font-mono text-xs">
                No previous video takes recorded for this shot yet.
              </div>
            ) : (
              <div className="space-y-2">
                {shot.versions.map((ver) => (
                  <div
                    key={ver.id}
                    className="p-2.5 rounded bg-white/[0.03] border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-white">
                        Take v{ver.versionNumber}
                      </span>
                      <span className="text-[9px] font-mono text-white/40">
                        {new Date(ver.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="aspect-[16/9] rounded overflow-hidden bg-black/50">
                      <img src={ver.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[9px] font-mono text-cyan-400">{ver.model}</span>
                      <button
                        onClick={() => handleRestoreVersion(ver)}
                        className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-colors cursor-pointer"
                      >
                        Restore Take
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      </aside>
    </>
  );
};
