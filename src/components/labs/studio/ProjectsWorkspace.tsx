/**
 * VAIURE Studio — Projects Management Dashboard
 * Switch between active film projects, create new projects with templates, duplicate, and archive.
 */

import React, { useState } from 'react';
import { Plus, FolderKanban, Copy, Trash2, Clock, Film, Check } from 'lucide-react';
import { StudioProject } from '../../../types/studio';
import { createNewProject, getSavedProjects } from '../../../services/studioProjectService';

interface ProjectsWorkspaceProps {
  currentProject: StudioProject;
  onSelectProject: (project: StudioProject) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: StudioProject) => void;
  onCreateProject: (name: string, genre: StudioProject['genre']) => void;
}

export const ProjectsWorkspace: React.FC<ProjectsWorkspaceProps> = ({
  currentProject,
  onSelectProject,
  onDeleteProject,
  onDuplicateProject,
  onCreateProject,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<StudioProject['genre']>('Short Film');
  const allProjects = getSavedProjects();

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName.trim(), selectedGenre);
    setIsCreating(false);
    setNewProjectName('');
  };

  const templates: { genre: StudioProject['genre']; description: string }[] = [
    { genre: 'Short Film', description: 'Narrative arc with character and location depth.' },
    { genre: 'Music Video', description: 'Rhythmic temporal cuts with lighting kinetics.' },
    { genre: 'Commercial', description: 'Brand and fashion haute couture micro-campaign.' },
    { genre: 'Cinematic Scene', description: 'Focused dramatic dialogue or action sequence.' },
    { genre: 'Experimental Film', description: 'Abstract visual topologies and optical forms.' },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] overflow-y-auto p-4 sm:p-8 select-none no-scrollbar">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/50">
              VAIURE STUDIO
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold uppercase tracking-tight text-white">
              Production Projects
            </h1>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Project</span>
          </button>
        </div>

        {/* Modal / In-line Creation */}
        {isCreating && (
          <div className="p-5 rounded-xl border border-white/20 bg-[#0C0D12] space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
              Initialize New Production Project
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Project Title</label>
                <input
                  type="text"
                  placeholder="e.g. Neon Horizon"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-2.5 py-2 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase text-white/50">Production Workflow</label>
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value as any)}
                  className="w-full px-2.5 py-2 rounded bg-black/40 border border-white/15 text-xs font-mono text-white focus:outline-none"
                >
                  {templates.map((t) => (
                    <option key={t.genre} value={t.genre}>
                      {t.genre} — {t.description}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded text-white/60 hover:text-white font-mono text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 rounded bg-white text-black font-mono text-xs font-bold uppercase hover:bg-neutral-200"
              >
                Create Project
              </button>
            </div>
          </div>
        )}

        {/* Project Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allProjects.map((p) => {
            const isActive = p.id === currentProject.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-950/20 shadow-lg ring-1 ring-cyan-400'
                    : 'border-white/10 hover:border-white/25 bg-[#0A0A0F]'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-400 font-bold uppercase">{p.genre}</span>
                    <span className="text-white/40">{new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <h3 className="font-display text-base font-bold uppercase tracking-tight text-white line-clamp-1">
                    {p.name}
                  </h3>

                  <p className="text-xs font-sans text-white/60 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-white/50">
                  <div className="flex items-center gap-2">
                    <span>{p.shots?.length || 0} Shots</span>
                    <span>·</span>
                    <span>{p.aspectRatio}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                        ACTIVE
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(p);
                        }}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white text-white hover:text-black transition-colors"
                      >
                        Open
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
