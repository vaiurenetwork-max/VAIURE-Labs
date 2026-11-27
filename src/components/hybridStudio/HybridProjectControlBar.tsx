/**
 * VAIURE HYBRID STUDIO — Top Project Control Bar & Project Settings / Snapshot Modal
 */

import React, { useState } from 'react';
import {
  Menu,
  Plus,
  FolderOpen,
  Save,
  Copy,
  History,
  Settings2,
  Download,
  PanelLeft,
  PanelRight,
  Clapperboard,
  Sliders,
  Trash2,
  RotateCcw,
  Cloud,
  HardDrive,
  X,
  Check,
  Wand2,
  Compass,
  Maximize2,
  Minimize2,
  ChevronDown,
} from 'lucide-react';
import {
  HybridAspectRatio,
  HybridFrameRate,
  HybridNavCategory,
  HybridProductionProject,
  HybridWorkspaceMode,
} from '../../types/hybridStudio';
import { GenerationResolution } from '../../types/multiProvider';

export interface HybridStudioNavAction {
  section: HybridNavCategory;
  target:
    | 'project'
    | 'storyboard'
    | 'timeline'
    | 'text-to-video'
    | 'image-to-video'
    | 'video-transform'
    | 'video-reference'
    | 'shot-director'
    | 'characters'
    | 'environments'
    | 'media-videos'
    | 'media-images'
    | 'media-audio'
    | 'media-results'
    | 'advanced-model';
}

interface HybridProjectControlBarProps {
  project: HybridProductionProject;
  projectsList: HybridProductionProject[];
  workspaceMode: HybridWorkspaceMode;
  isLeftOpen: boolean;
  isRightOpen: boolean;
  focusMode: boolean;
  isSaving: boolean;
  persistedToCloud: boolean;
  activeJobsCount: number;
  onOpenMenu?: () => void;
  onChangeMode: (mode: HybridWorkspaceMode) => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  onToggleFocusMode: () => void;
  onNavigateTool: (action: HybridStudioNavAction) => void;
  onCreateProject: (opts: {
    name: string;
    description: string;
    resolution: GenerationResolution;
    frameRate: HybridFrameRate;
    aspectRatio: HybridAspectRatio;
  }) => void;
  onOpenProject: (projectId: string) => void;
  onSaveProject: (createSnapshotLabel?: string) => void;
  onDuplicateProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProjectMeta: (updates: Partial<HybridProductionProject>) => void;
  onRestoreVersion: (versionId: string) => void;
  onOpenExport: () => void;
}

export const HybridProjectControlBar: React.FC<HybridProjectControlBarProps> = ({
  project,
  projectsList,
  workspaceMode,
  isLeftOpen,
  isRightOpen,
  focusMode,
  isSaving,
  persistedToCloud,
  activeJobsCount,
  onOpenMenu,
  onChangeMode,
  onToggleLeft,
  onToggleRight,
  onToggleFocusMode,
  onNavigateTool,
  onCreateProject,
  onOpenProject,
  onSaveProject,
  onDuplicateProject,
  onDeleteProject,
  onUpdateProjectMeta,
  onRestoreVersion,
  onOpenExport,
}) => {
  const [modalView, setModalView] = useState<'none' | 'projects' | 'settings' | 'new'>('none');
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const [expandedNavGroup, setExpandedNavGroup] = useState<HybridNavCategory>('create');
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New production form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newRes, setNewRes] = useState<GenerationResolution>('1080p');
  const [newFps, setNewFps] = useState<HybridFrameRate>('24fps');
  const [newAr, setNewAr] = useState<HybridAspectRatio>('16:9');

  const totalShots = project.scenes.reduce((acc, s) => acc + s.shots.length, 0);
  const totalDuration = project.scenes.reduce(
    (acc, s) => acc + s.shots.reduce((sa, sh) => sa + sh.duration, 0),
    0
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateProject({
      name: newName.trim() || 'Untitled Hybrid Film',
      description: newDesc.trim() || 'Multi-scene Seedance 2.5 cinematic production.',
      resolution: newRes,
      frameRate: newFps,
      aspectRatio: newAr,
    });
    setNewName('');
    setNewDesc('');
    setModalView('none');
  };

  return (
    <>
      <header className="h-12 px-3 sm:px-4 bg-[#07080b] border-b border-white/[0.1] flex items-center justify-between gap-2 shrink-0 select-none z-30">
        {/* Left: Main Menu + Brand + Active Production */}
        <div className="flex items-center gap-2 min-w-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              title="Open VAIURE Main Menu"
              className="w-8 h-8 flex items-center justify-center border border-white/[0.12] bg-white/[0.03] hover:bg-white hover:text-black text-[#ECECE9] transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 pr-2 border-r border-white/[0.1] shrink-0">
            <Clapperboard className="w-4 h-4 text-cyan-400" />
            <div className="leading-none">
              <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white font-semibold">
                HYBRID STUDIO
              </div>
              <div className="text-[9px] font-mono text-white/40 tracking-wider">
                SEEDANCE 2.5 ENGINE
              </div>
            </div>
          </div>

          {/* Active Project Trigger */}
          <button
            type="button"
            onClick={() => setModalView('projects')}
            className="flex items-center gap-2 px-2.5 py-1.5 border border-white/[0.1] bg-[#0b0d12] hover:border-white/25 transition-colors min-w-0 cursor-pointer"
            title="Switch or manage productions"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-xs font-medium text-[#ECECE9] truncate max-w-[130px] sm:max-w-[200px]">
              {project.name}
            </span>
            <span className="hidden sm:inline text-[10px] font-mono text-white/45 tabular-nums shrink-0">
              {project.resolution} · {project.frameRate} · {project.aspectRatio}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setModalView('settings')}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.07] text-[10px] font-mono text-white/75 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Project Settings & Version History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Settings</span>
          </button>

          {/* Structured Collapsible Studio Navigation Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNavMenuOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-2 py-1.5 border text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer shrink-0 ${
                navMenuOpen
                  ? 'border-cyan-400 bg-cyan-950/35 text-cyan-300'
                  : 'border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.07] text-white/75 hover:text-white'
              }`}
              title="Structured Hybrid Studio Workspace Navigation"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Studio Nav</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {navMenuOpen && (
              <div className="absolute left-0 top-10 z-50 w-72 bg-[#090b10] border border-white/[0.16] shadow-2xl p-2 space-y-1">
                {(
                  [
                    {
                      id: 'production' as HybridNavCategory,
                      label: 'Production',
                      items: [
                        { label: 'Project Control & Snapshots', target: 'project' as const, action: () => setModalView('projects') },
                        { label: 'Storyboard & Scenes', target: 'storyboard' as const },
                        { label: 'Nonlinear Timeline', target: 'timeline' as const },
                      ],
                    },
                    {
                      id: 'create' as HybridNavCategory,
                      label: 'Create',
                      items: [
                        { label: 'Video Transform (Footage Edit)', target: 'video-transform' as const },
                        { label: 'Video Reference (R2V)', target: 'video-reference' as const },
                        { label: 'Text to Video Shot', target: 'text-to-video' as const },
                        { label: 'Image to Video Shot', target: 'image-to-video' as const },
                      ],
                    },
                    {
                      id: 'director-tools' as HybridNavCategory,
                      label: 'Director Tools',
                      items: [
                        { label: 'Shot Director & Camera', target: 'shot-director' as const },
                        { label: 'Character Continuity', target: 'characters' as const },
                        { label: 'Environment & Scene Sets', target: 'environments' as const },
                      ],
                    },
                    {
                      id: 'media' as HybridNavCategory,
                      label: 'Media',
                      items: [
                        { label: 'Video Reference Library', target: 'media-videos' as const },
                        { label: 'Image Plates Library', target: 'media-images' as const },
                        { label: 'Audio & Score Library', target: 'media-audio' as const },
                        { label: 'Generated Results', target: 'media-results' as const },
                      ],
                    },
                    {
                      id: 'advanced' as HybridNavCategory,
                      label: 'Advanced',
                      items: [
                        { label: 'Model & Technical Settings', target: 'advanced-model' as const },
                      ],
                    },
                  ]
                ).map((group) => {
                  const isOpen = expandedNavGroup === group.id;
                  return (
                    <div key={group.id} className="border border-white/[0.08] bg-[#0b0d12]">
                      <button
                        type="button"
                        onClick={() => setExpandedNavGroup(group.id)}
                        className="w-full px-2.5 py-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-300 cursor-pointer"
                      >
                        <span>{group.label}</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/[0.06] py-1">
                          {group.items.map((item) => (
                            <button
                              key={item.target}
                              type="button"
                              onClick={() => {
                                if ('action' in item && item.action) {
                                  item.action();
                                } else {
                                  onNavigateTool({ section: group.id, target: item.target });
                                }
                                setNavMenuOpen(false);
                              }}
                              className="w-full px-3 py-1.5 text-left text-[11px] text-white/80 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Center: Switchable Director Mode vs Production Mode vs Video Transform Studio */}
        <div className="flex items-center border border-white/[0.12] bg-[#0b0d12] p-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onChangeMode('director')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
              workspaceMode === 'director'
                ? 'bg-[#ECECE9] text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Clapperboard className="w-3 h-3" />
            <span>Director</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('production')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
              workspaceMode === 'production'
                ? 'bg-[#ECECE9] text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Production</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeMode('video-transform')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
              workspaceMode === 'video-transform'
                ? 'bg-[#ECECE9] text-black font-semibold'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Wand2 className="w-3 h-3" />
            <span>Video Transform</span>
          </button>
        </div>

        {/* Right: Quick Actions & Panel Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden xl:flex items-center gap-2 px-2 text-[10px] font-mono text-white/45 tabular-nums border-r border-white/[0.08] mr-1">
            <span>{project.scenes.length} SCN</span>
            <span>/</span>
            <span>{totalShots} SHT</span>
            <span>/</span>
            <span>{totalDuration}s</span>
            {activeJobsCount > 0 && (
              <span className="text-cyan-400 font-semibold">· {activeJobsCount} RENDERING</span>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleFocusMode}
            title={focusMode ? 'Exit Focus Mode (Restore sidebars)' : 'Focus Mode (Hide sidebars)'}
            className={`p-1.5 border text-xs transition-colors cursor-pointer ${
              focusMode
                ? 'border-cyan-400 bg-cyan-950/35 text-cyan-300'
                : 'border-white/[0.1] bg-transparent text-white/50 hover:text-white'
            }`}
          >
            {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {workspaceMode !== 'video-transform' && (
            <>
              <button
                type="button"
                onClick={onToggleLeft}
                title={isLeftOpen ? 'Collapse Assets & Continuity' : 'Expand Assets & Continuity'}
                className={`p-1.5 border text-xs transition-colors cursor-pointer ${
                  isLeftOpen
                    ? 'border-white/25 bg-white/10 text-white'
                    : 'border-white/[0.1] bg-transparent text-white/50 hover:text-white'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onToggleRight}
                title={isRightOpen ? 'Collapse AI Production Controls' : 'Expand AI Production Controls'}
                className={`p-1.5 border text-xs transition-colors cursor-pointer ${
                  isRightOpen
                    ? 'border-white/25 bg-white/10 text-white'
                    : 'border-white/[0.1] bg-transparent text-white/50 hover:text-white'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onSaveProject()}
            disabled={isSaving}
            title={persistedToCloud ? 'Save to Firestore & local workspace' : 'Save to local workspace'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-white/[0.14] bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono uppercase tracking-wider text-white transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {isSaving ? (
              <Save className="w-3 h-3 animate-pulse text-cyan-400" />
            ) : persistedToCloud ? (
              <Cloud className="w-3 h-3 text-emerald-400" />
            ) : (
              <HardDrive className="w-3 h-3 text-white/60" />
            )}
            <span className="hidden sm:inline">{isSaving ? 'Saving' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ECECE9] hover:bg-white text-black text-[10px] font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </header>

      {/* MODALS: Projects Browser / New Production / Project Settings & Versions */}
      {modalView !== 'none' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setModalView('none')}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[#090a0f] border border-white/[0.15] text-[#ECECE9] shadow-2xl flex flex-col max-h-[84vh]"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-white/[0.1] flex items-center justify-between bg-[#0b0d12]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-[0.18em] text-white font-semibold">
                  {modalView === 'projects'
                    ? 'Productions Library'
                    : modalView === 'new'
                    ? 'Create New Production'
                    : 'Production Settings & Version History'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {modalView !== 'new' && (
                  <button
                    type="button"
                    onClick={() => setModalView('new')}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Production</span>
                  </button>
                )}
                {modalView !== 'settings' && (
                  <button
                    type="button"
                    onClick={() => setModalView('settings')}
                    className="px-2.5 py-1 border border-white/15 text-[10px] font-mono uppercase text-white/75 hover:text-white cursor-pointer"
                  >
                    Settings
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setModalView('none')}
                  className="p-1 text-white/50 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {modalView === 'projects' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                      Saved Productions ({projectsList.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateProject();
                        setModalView('none');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 border border-white/15 hover:border-white/35 text-[10px] font-mono uppercase text-white/80 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Duplicate Active</span>
                    </button>
                  </div>

                  <div className="divide-y divide-white/[0.08] border border-white/[0.1]">
                    {projectsList.map((item) => {
                      const isCurrent = item.id === project.id;
                      const itemShots = item.scenes?.reduce((a, s) => a + s.shots.length, 0) || 0;
                      return (
                        <div
                          key={item.id}
                          className={`p-3.5 flex items-center justify-between gap-3 ${
                            isCurrent ? 'bg-white/[0.05]' : 'hover:bg-white/[0.025]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white truncate">
                                {item.name}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-cyan-500/15 border border-cyan-500/35 text-cyan-300">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50 truncate mt-0.5">
                              {item.description || 'No description'}
                            </p>
                            <div className="text-[10px] font-mono text-white/40 mt-1 tabular-nums">
                              {item.resolution} · {item.frameRate} · {item.aspectRatio} · {item.scenes?.length || 0} scenes · {itemShots} shots · Updated{' '}
                              {new Date(item.updatedAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenProject(item.id);
                                  setModalView('none');
                                }}
                                className="px-3 py-1.5 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer"
                              >
                                Open
                              </button>
                            )}
                            {projectsList.length > 1 && (
                              confirmDeleteId === item.id ? (
                                <div className="flex items-center gap-1 border border-rose-500/40 bg-rose-950/50 px-2 py-1 text-[10px] font-mono text-rose-200">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDeleteProject(item.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="underline font-bold cursor-pointer"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-white/60 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(item.id)}
                                  className="p-1.5 border border-white/10 text-white/45 hover:text-rose-400 hover:border-rose-500/35 cursor-pointer"
                                  title="Delete project"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {modalView === 'new' && (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-white/55">
                      Production Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., Neon Obsidian — Act I"
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono uppercase text-white/55">
                      Project Logline / Description
                    </label>
                    <textarea
                      rows={3}
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Describe visual tone, story arc, and production scope..."
                      className="w-full px-3 py-2 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-white/55">
                        Resolution
                      </label>
                      <select
                        value={newRes}
                        onChange={(e) => setNewRes(e.target.value as GenerationResolution)}
                        className="w-full px-2.5 py-2 bg-black/50 border border-white/15 text-xs font-mono text-white"
                      >
                        <option value="480p">480p</option>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                        <option value="4K">4K</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-white/55">
                        Frame Rate
                      </label>
                      <select
                        value={newFps}
                        onChange={(e) => setNewFps(e.target.value as HybridFrameRate)}
                        className="w-full px-2.5 py-2 bg-black/50 border border-white/15 text-xs font-mono text-white"
                      >
                        <option value="24fps">24fps (Cinema)</option>
                        <option value="30fps">30fps (Broadcast)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono uppercase text-white/55">
                        Aspect Ratio
                      </label>
                      <select
                        value={newAr}
                        onChange={(e) => setNewAr(e.target.value as HybridAspectRatio)}
                        className="w-full px-2.5 py-2 bg-black/50 border border-white/15 text-xs font-mono text-white"
                      >
                        <option value="21:9">21:9 Scope</option>
                        <option value="16:9">16:9 Widescreen</option>
                        <option value="4:3">4:3 Academy</option>
                        <option value="1:1">1:1 Square</option>
                        <option value="3:4">3:4 Editorial</option>
                        <option value="9:16">9:16 Vertical</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalView('projects')}
                      className="px-4 py-2 border border-white/15 text-xs font-mono uppercase text-white/70 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#ECECE9] text-black text-xs font-mono font-semibold uppercase cursor-pointer"
                    >
                      Create Production
                    </button>
                  </div>
                </form>
              )}

              {modalView === 'settings' && (
                <div className="space-y-6">
                  {/* Metadata Editor */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Active Production Specifications</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-white/50">
                          Production Name
                        </label>
                        <input
                          type="text"
                          value={project.name}
                          onChange={(e) => onUpdateProjectMeta({ name: e.target.value })}
                          className="w-full px-3 py-1.5 bg-black/50 border border-white/15 text-sm text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-[10px] font-mono uppercase text-white/50">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={project.description}
                          onChange={(e) => onUpdateProjectMeta({ description: e.target.value })}
                          className="w-full px-3 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-white/50">
                          Master Resolution
                        </label>
                        <select
                          value={project.resolution}
                          onChange={(e) =>
                            onUpdateProjectMeta({ resolution: e.target.value as GenerationResolution })
                          }
                          className="w-full px-2.5 py-1.5 bg-black/50 border border-white/15 text-xs font-mono text-white"
                        >
                          <option value="480p">480p</option>
                          <option value="720p">720p</option>
                          <option value="1080p">1080p</option>
                          <option value="4K">4K</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-white/50">
                            Frame Rate
                          </label>
                          <select
                            value={project.frameRate}
                            onChange={(e) =>
                              onUpdateProjectMeta({ frameRate: e.target.value as HybridFrameRate })
                            }
                            className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs font-mono text-white"
                          >
                            <option value="24fps">24fps</option>
                            <option value="30fps">30fps</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-white/50">
                            Aspect Ratio
                          </label>
                          <select
                            value={project.aspectRatio}
                            onChange={(e) =>
                              onUpdateProjectMeta({
                                aspectRatio: e.target.value as HybridAspectRatio,
                              })
                            }
                            className="w-full px-2 py-1.5 bg-black/50 border border-white/15 text-xs font-mono text-white"
                          >
                            <option value="21:9">21:9</option>
                            <option value="16:9">16:9</option>
                            <option value="4:3">4:3</option>
                            <option value="1:1">1:1</option>
                            <option value="3:4">3:4</option>
                            <option value="9:16">9:16</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Version History / Snapshots */}
                  <div className="space-y-3 border-t border-white/[0.08] pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">
                        Project Version History ({project.versions.length})
                      </span>
                      <span className="text-[10px] font-mono text-white/40 tabular-nums">
                        {project.assets.length} Assets · {project.generations.length} Jobs
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={snapshotLabel}
                        onChange={(e) => setSnapshotLabel(e.target.value)}
                        placeholder="Snapshot note (e.g., Locked Act 1 rough cut)..."
                        className="flex-1 px-3 py-1.5 bg-black/50 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onSaveProject(snapshotLabel.trim() || undefined);
                          setSnapshotLabel('');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer whitespace-nowrap"
                      >
                        <Check className="w-3 h-3" />
                        <span>Save Snapshot</span>
                      </button>
                    </div>

                    {project.versions.length === 0 ? (
                      <div className="p-4 border border-dashed border-white/10 text-center text-xs font-mono text-white/40">
                        No snapshots recorded yet. Save a version before major timeline edits.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.08] border border-white/[0.1] max-h-56 overflow-y-auto">
                        {project.versions.map((ver) => (
                          <div
                            key={ver.id}
                            className="px-3 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.02]"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-white truncate">
                                {ver.label}
                              </div>
                              <div className="text-[10px] font-mono text-white/45 tabular-nums">
                                {ver.summary} · {new Date(ver.savedAt).toLocaleString()}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onRestoreVersion(ver.id);
                                setModalView('none');
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 border border-white/15 hover:border-cyan-400 text-[10px] font-mono text-white/80 hover:text-cyan-300 cursor-pointer shrink-0"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Restore</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
