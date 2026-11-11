/**
 * VAIURE Studio — Storyboard Workspace
 * Cinematic shot planning grid with shot sequencing, continuity references, and quick video generation.
 */

import React, { useState } from 'react';
import {
  Plus,
  Play,
  Film,
  Sparkles,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  User,
  MapPin,
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { StoryboardShot, StudioProject } from '../../../types/studio';

interface StoryboardWorkspaceProps {
  project: StudioProject;
  onSelectShot: (shot: StoryboardShot) => void;
  selectedShotId?: string;
  onCreateShot: () => void;
  onDuplicateShot: (shotId: string) => void;
  onDeleteShot: (shotId: string) => void;
  onMoveShot: (shotId: string, direction: 'UP' | 'DOWN') => void;
  onGenerateVideoForShot: (shot: StoryboardShot) => void;
}

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  project,
  onSelectShot,
  selectedShotId,
  onCreateShot,
  onDuplicateShot,
  onDeleteShot,
  onMoveShot,
  onGenerateVideoForShot,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getCharacterNames = (charIds: string[]) => {
    return project.characters
      .filter((c) => charIds.includes(c.id))
      .map((c) => c.name)
      .join(', ');
  };

  const getLocationName = (locId?: string) => {
    if (!locId) return null;
    return project.locations.find((l) => l.id === locId)?.name;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] overflow-hidden select-none">
      {/* Header Bar */}
      <div className="h-11 px-4 sm:px-6 bg-[#09090D] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            Cinematic Storyboard Sequence
          </span>
          <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 rounded bg-white/[0.04]">
            {project.shots.length} Shots
          </span>
          <span className="text-[10px] font-mono text-white/40">
            Total Duration: {project.shots.reduce((acc, s) => acc + s.duration, 0)}s
          </span>
        </div>

        {/* Create Shot CTA */}
        <button
          onClick={onCreateShot}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs font-bold uppercase transition-all cursor-pointer shadow-md"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Shot</span>
        </button>
      </div>

      {/* Grid of Cinematic Shot Cards */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
        {project.shots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-xl space-y-3">
            <Film className="w-10 h-10 text-white/20" />
            <div className="text-white font-medium text-sm font-sans">No Storyboard Shots Yet</div>
            <p className="text-xs font-mono text-white/50 max-w-sm">
              Create your first cinematic keyframe to define camera movement, lighting, lens, and character blocking.
            </p>
            <button
              onClick={onCreateShot}
              className="px-4 py-2 rounded bg-white text-black font-mono text-xs font-bold uppercase transition-transform active:scale-95"
            >
              + Create First Shot
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {project.shots.map((shot, idx) => {
              const isSelected = shot.id === selectedShotId;
              const charNames = getCharacterNames(shot.characterIds);
              const locName = getLocationName(shot.locationId);

              return (
                <div
                  key={shot.id}
                  onClick={() => onSelectShot(shot)}
                  className={`group relative rounded-lg border transition-all cursor-pointer overflow-hidden flex flex-col bg-[#0B0C11] ${
                    isSelected
                      ? 'border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                      : 'border-white/10 hover:border-white/25 hover:bg-[#0E0F16]'
                  }`}
                >
                  {/* Card Thumbnail / Frame */}
                  <div className="relative w-full aspect-[16/9] bg-black/60 overflow-hidden">
                    <img
                      src={shot.thumbnailUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'}
                      alt={shot.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                    {/* Top Shot Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white">
                        SHOT {String(shot.shotNumber).padStart(2, '0')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-md text-[9px] font-mono text-white/80 uppercase">
                        {shot.shotSize.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Status badge */}
                    <div className="absolute top-2 right-2">
                      {shot.status === 'COMPLETED' ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>RENDERED</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[9px]">
                          READY
                        </span>
                      )}
                    </div>

                    {/* Bottom overlay: Duration & Versions */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono text-white/80">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        <span>{shot.duration}s</span>
                      </div>
                      {shot.versions.length > 0 && (
                        <span className="text-[9px] text-white/50">
                          v{shot.currentVersionNumber} ({shot.versions.length} takes)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content & Metadata */}
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-display text-sm font-bold uppercase tracking-tight text-white line-clamp-1">
                        {shot.title}
                      </h3>
                      <p className="text-xs font-sans text-white/60 line-clamp-2 mt-1 leading-relaxed">
                        {shot.description}
                      </p>
                    </div>

                    {/* Metadata tags: Character & Location */}
                    <div className="pt-2 border-t border-white/[0.08] flex flex-wrap items-center gap-2 text-[10px] font-mono text-white/50">
                      {charNames && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-cyan-300">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{charNames}</span>
                        </span>
                      )}
                      {locName && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/[0.04] text-amber-300">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{locName}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 flex items-center justify-between border-t border-white/[0.08]">
                      {/* Sequence Movement */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveShot(shot.id, 'UP');
                          }}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Shot Earlier"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveShot(shot.id, 'DOWN');
                          }}
                          disabled={idx === project.shots.length - 1}
                          className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                          title="Move Shot Later"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Generate Video CTA */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateVideoForShot(shot);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 font-mono text-[10px] font-bold transition-colors cursor-pointer"
                          title="Generate Video for this shot"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate</span>
                        </button>

                        {/* Duplicate */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicateShot(shot.id);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
                          title="Duplicate Shot"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete with confirmation */}
                        {deleteConfirmId === shot.id ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40 text-[10px] font-mono text-rose-300"
                          >
                            <span>Delete?</span>
                            <button
                              onClick={() => {
                                onDeleteShot(shot.id);
                                setDeleteConfirmId(null);
                              }}
                              className="font-bold underline hover:text-white"
                            >
                              Yes
                            </button>
                            <button onClick={() => setDeleteConfirmId(null)} className="hover:text-white">
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(shot.id);
                            }}
                            className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Shot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
