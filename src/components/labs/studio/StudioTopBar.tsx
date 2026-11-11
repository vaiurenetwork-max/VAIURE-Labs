/**
 * VAIURE Studio — Top Application Bar
 * Persistent, compact professional toolbar with editable project title, real-time save state,
 * undo/redo, queue indicator, collaboration, and workspace switching.
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Undo2,
  Redo2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Share2,
  Keyboard,
  Layers,
  Film,
  Menu,
  Users,
  Image as ImageIcon,
  Terminal,
  Wand2,
} from 'lucide-react';
import { StudioProject } from '../../../types/studio';

interface StudioTopBarProps {
  project: StudioProject;
  activeMode: string;
  onChangeMode: (mode: any) => void;
  onOpenCanvas: () => void;
  onRenameProject: (name: string) => void;
  onOpenAssistant: () => void;
  onOpenMenu?: () => void;
  onGoToRooms?: () => void;
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const StudioTopBar: React.FC<StudioTopBarProps> = ({
  project,
  activeMode,
  onChangeMode,
  onOpenCanvas,
  onRenameProject,
  onOpenAssistant,
  onOpenMenu,
  onGoToRooms,
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.name);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim()) {
      onRenameProject(titleInput.trim());
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="h-12 px-3 sm:px-5 bg-[#09090D] border-b border-white/10 flex items-center justify-between shrink-0 select-none z-30">
      {/* LEFT: Menu drawer + Brand + Project Title + Save Status + Undo/Redo */}
      <div className="flex items-center gap-2.5 min-w-0">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            aria-label="Open Navigation Menu"
            className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-serif text-sm tracking-[0.2em] font-medium uppercase text-white">
            VAIURE
          </span>
          <span className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono uppercase tracking-wider text-white/80">
            STUDIO
          </span>
        </div>

        <div className="h-4 w-[1px] bg-white/15 hidden sm:block" />

        {/* Editable Project Title */}
        <div className="min-w-0 max-w-[130px] sm:max-w-[200px] md:max-w-xs">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
              className="px-2 py-0.5 rounded bg-black/60 border border-cyan-400 text-xs font-mono text-white focus:outline-none w-full"
            />
          ) : (
            <button
              onClick={() => {
                setTitleInput(project.name);
                setIsEditingTitle(true);
              }}
              title="Click to rename project"
              className="text-xs sm:text-sm font-display font-bold uppercase tracking-tight text-white hover:text-cyan-300 truncate block text-left transition-colors cursor-pointer"
            >
              {project.name}
            </button>
          )}
        </div>

        {/* Project Save Status */}
        <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-white/40">
          {project.saveStatus === 'Saved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          {project.saveStatus === 'Saving' && <Clock className="w-3 h-3 text-amber-400 animate-spin" />}
          {project.saveStatus === 'Unsaved Changes' && <AlertCircle className="w-3 h-3 text-amber-400" />}
          <span>{project.saveStatus}</span>
        </div>

        {/* Undo / Redo Stack Controls */}
        {(onUndo || onRedo) && (
          <div className="hidden md:flex items-center gap-0.5 pl-1 border-l border-white/10">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo Project Edit (Ctrl/Cmd+Z)"
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo Project Edit (Ctrl/Cmd+Shift+Z)"
              className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* CENTER: VAIU + Image Gen + Midjourney + Video Studio + Visual Workflow Canvas + Export Quick Switchers */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onChangeMode('vaiu')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs transition-all cursor-pointer ${
            activeMode === 'vaiu'
              ? 'bg-gradient-to-r from-cyan-400 to-emerald-400 text-black border-cyan-300 font-bold shadow-[0_0_15px_rgba(34,211,238,0.35)]'
              : 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/40 text-cyan-300 hover:text-white'
          }`}
          title="Open VAIU — Seedance 2.5 Exclusive Multimodal Prompt Architect"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>VAIU</span>
          <span className="hidden md:inline text-[9px] px-1 rounded bg-black/30">2.5</span>
        </button>

        <button
          onClick={() => onChangeMode('image-gen')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs transition-all cursor-pointer ${
            activeMode === 'image-gen'
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
              : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/75 hover:text-white'
          }`}
          title="Open Image Generation Studio"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Image Gen</span>
          <span className="sm:hidden">Img</span>
        </button>

        <button
          onClick={() => onChangeMode('midjourney')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs transition-all cursor-pointer ${
            activeMode === 'midjourney'
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(34,211,238,0.25)]'
              : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/75 hover:text-white'
          }`}
          title="Open Midjourney Discord /imagine Bridge"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Midjourney</span>
          <span className="sm:hidden">MJ</span>
        </button>

        <button
          onClick={() => onChangeMode('generation')}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs transition-all cursor-pointer ${
            activeMode === 'generation'
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
              : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/75 hover:text-white'
          }`}
          title="Open Video Synthesis Workspace"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Video Gen</span>
        </button>

        <button
          onClick={onOpenCanvas}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-medium transition-all cursor-pointer active:scale-95 shadow-sm"
          title="Open Dedicated Node Workflow Canvas Page"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Visual Workflow</span>
          <span className="lg:hidden">Canvas</span>
        </button>

        <button
          onClick={() => onChangeMode('export')}
          className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-xs transition-all cursor-pointer ${
            activeMode === 'export'
              ? 'bg-white text-black border-white font-bold'
              : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-white/75 hover:text-white'
          }`}
          title="Preview & Export Master Sequence"
        >
          <Film className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>

      {/* RIGHT: Assistant + Share + Shortcuts + Slide Jumpers */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Switch to Collaborative Rooms */}
        {onGoToRooms && (
          <button
            onClick={onGoToRooms}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            title="Switch to Collaborative Rooms"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Rooms</span>
          </button>
        )}

        {/* AI Filmmaking Assistant trigger */}
        <button
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white/80 hover:text-white font-mono text-xs transition-colors cursor-pointer"
          title="AI Filmmaking Copilot (Script, Prompt, & Continuity)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">AI Director</span>
        </button>

        {/* Share project */}
        <button
          onClick={handleShare}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="Share Project URL"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Keyboard shortcuts */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer hidden sm:block"
          title="Keyboard Shortcuts"
        >
          <Keyboard className="w-4 h-4" />
        </button>

        {/* Slide quick switcher buttons for direct jump */}
        <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-white/10 text-[10px] font-mono text-white/50">
          {onBackToSlideOne && (
            <button onClick={onBackToSlideOne} className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white">
              01
            </button>
          )}
          {onBackToSlideTwo && (
            <button onClick={onBackToSlideTwo} className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white">
              02
            </button>
          )}
          {onBackToSlideThree && (
            <button onClick={onBackToSlideThree} className="px-1.5 py-0.5 rounded hover:bg-white/10 hover:text-white">
              03
            </button>
          )}
          <span className="px-1.5 py-0.5 rounded bg-white text-black font-bold">04</span>
        </div>
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          onClick={() => setShowShortcuts(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg bg-[#0C0D12] border border-white/15 p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                Keyboard Shortcuts
              </span>
              <button onClick={() => setShowShortcuts(false)} className="text-white/40 hover:text-white text-xs">
                ESC
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/70">
                <span>Play / Pause</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">Space</kbd>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Open Visual Workflow</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">V</kbd>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Storyboard Mode</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">1</kbd>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Video Generation</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">2</kbd>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Timeline Editor</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">3</kbd>
              </div>
              <div className="flex justify-between text-white/70">
                <span>Save Project</span>
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white">Cmd + S</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
