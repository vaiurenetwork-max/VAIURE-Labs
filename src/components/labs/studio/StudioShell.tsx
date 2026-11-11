/**
 * VAIURE Studio — Studio Shell
 * Complete professional AI filmmaking studio connecting storyboards, characters,
 * video generation, timeline editing, audio, asset library, and dedicated node canvas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Home,
  Sparkles,
  Image as ImageIcon,
  FolderKanban,
  MoreHorizontal,
  Clapperboard,
  Scissors,
  Layers,
  Users,
  MapPin,
  Music,
  Share2,
  X,
  Terminal,
  Film,
  Wand2,
} from 'lucide-react';
import { StudioTopBar } from './StudioTopBar';
import { StudioSidebar, StudioNavSection } from './StudioSidebar';
import { StoryboardWorkspace } from './StoryboardWorkspace';
import { ShotInspector } from './ShotInspector';
import { CharactersWorkspace } from './CharactersWorkspace';
import { LocationsWorkspace } from './LocationsWorkspace';
import { VideoGenerationWorkspace } from './VideoGenerationWorkspace';
import {
  VaiuSeedanceWorkspace,
  VaiuSeedanceTransferPayload,
} from './VaiuSeedanceWorkspace';
import { TimelineWorkspace } from './TimelineWorkspace';
import { ProjectsWorkspace } from './ProjectsWorkspace';
import { AssetLibraryWorkspace } from './AssetLibraryWorkspace';
import { AudioWorkspace } from './AudioWorkspace';
import { ExportWorkspace } from './ExportWorkspace';
import { AIAssistantDrawer } from './AIAssistantDrawer';
import { StudioWorkflowCanvasPage } from './canvas/StudioWorkflowCanvasPage';
import {
  StudioProject,
  StoryboardShot,
  StudioCharacter,
  StudioLocation,
  TimelineTrack,
  TimelineClip,
  GenerationJob,
  StudioAsset,
  AssistantProposal,
} from '../../../types/studio';
import {
  getSavedProjects,
  saveProjectToFirestore,
  createNewProject,
  getActiveProjectId,
  setActiveProjectId,
} from '../../../services/studioProjectService';
import { UserProfile } from '../../../types/social';

interface StudioShellProps {
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  onOpenMenu?: () => void;
  onGoToRooms?: () => void;
  currentUser?: UserProfile | null;
}

export const StudioShell: React.FC<StudioShellProps> = ({
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  onOpenMenu,
  onGoToRooms,
  currentUser,
}) => {
  const [projects, setProjects] = useState<StudioProject[]>(() => getSavedProjects());
  const [activeProjectId, setActiveId] = useState<string>(() => getActiveProjectId());

  const currentProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Active production section (Default to 'image-gen' so Slide 4 immediately displays Image Generation & Midjourney UI)
  const [activeSection, setActiveSection] = useState<StudioNavSection>('image-gen');

  // Selected storyboard shot for contextual inspector
  const [selectedShotId, setSelectedShotId] = useState<string | undefined>(
    currentProject?.shots[0]?.id
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  // Left sidebar collapse toggle
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Mobile More Tools Bottom Sheet
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // AI Filmmaking Assistant drawer
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Dedicated Visual Workflow Canvas Page mode
  const [isCanvasPageOpen, setIsCanvasPageOpen] = useState(false);

  // VAIU Seedance 2.5 Transfer Payload state
  const [vaiuPrefill, setVaiuPrefill] = useState<VaiuSeedanceTransferPayload | null>(null);

  // Listen for cross-slide uploaded assets (e.g. from Slide 1 Threads)
  useEffect(() => {
    const handleAssetAdded = () => {
      setProjects(getSavedProjects());
    };
    window.addEventListener('vaiure:studio-asset-added', handleAssetAdded);
    return () => window.removeEventListener('vaiure:studio-asset-added', handleAssetAdded);
  }, []);

  // Undo / Redo History Stack
  const [undoStack, setUndoStack] = useState<StudioProject[]>([]);
  const [redoStack, setRedoStack] = useState<StudioProject[]>([]);

  // Persist project changes with undo history
  const updateProject = useCallback(
    (updated: StudioProject) => {
      setProjects((prev) => {
        const current = prev.find((p) => p.id === updated.id);
        if (current) {
          setUndoStack((u) => [...u.slice(-19), current]);
          setRedoStack([]);
        }
        return prev.map((p) => (p.id === updated.id ? updated : p));
      });
      saveProjectToFirestore(updated);
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const previousState = prevUndo[prevUndo.length - 1];
      setProjects((prevProjs) => {
        const curr = prevProjs.find((p) => p.id === previousState.id);
        if (curr) {
          setRedoStack((r) => [curr, ...r.slice(0, 19)]);
        }
        return prevProjs.map((p) => (p.id === previousState.id ? previousState : p));
      });
      saveProjectToFirestore(previousState);
      return prevUndo.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const nextState = prevRedo[0];
      setProjects((prevProjs) => {
        const curr = prevProjs.find((p) => p.id === nextState.id);
        if (curr) {
          setUndoStack((u) => [...u.slice(-19), curr]);
        }
        return prevProjs.map((p) => (p.id === nextState.id ? nextState : p));
      });
      saveProjectToFirestore(nextState);
      return prevRedo.slice(1);
    });
  }, []);

  // Sync active project selection
  const handleSelectProject = (proj: StudioProject) => {
    setActiveId(proj.id);
    setActiveProjectId(proj.id);
    setSelectedShotId(proj.shots[0]?.id);
    setActiveSection('storyboard');
  };

  // Reordering storyboard shots updates project timeline
  const handleMoveShot = (shotId: string, direction: 'UP' | 'DOWN') => {
    const shots = [...currentProject.shots];
    const index = shots.findIndex((s) => s.id === shotId);
    if (index === -1) return;

    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= shots.length) return;

    // Swap shots
    const temp = shots[index];
    shots[index] = shots[targetIndex];
    shots[targetIndex] = temp;

    // Renumber shot numbers
    const renumbered = shots.map((s, i) => ({ ...s, shotNumber: i + 1 }));

    // Synchronize Timeline Clips sequence
    let currentStart = 0;
    const syncedClips: TimelineClip[] = renumbered.map((shot, idx) => {
      const existing = currentProject.timelineClips.find((c) => c.shotId === shot.id);
      const clipDuration = shot.duration;
      const clip: TimelineClip = {
        id: existing?.id || `clip-shot-${shot.id}`,
        shotId: shot.id,
        trackId: 'track-v1',
        trackType: 'VIDEO',
        title: `Shot ${String(shot.shotNumber).padStart(2, '0')}: ${shot.title}`,
        mediaUrl: shot.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: shot.thumbnailUrl,
        startTime: currentStart,
        duration: clipDuration,
        inPoint: 0,
        outPoint: clipDuration,
        volume: 1,
      };
      currentStart += clipDuration;
      return clip;
    });

    const updatedProject: StudioProject = {
      ...currentProject,
      shots: renumbered,
      timelineClips: syncedClips,
      updatedAt: new Date().toISOString(),
    };
    updateProject(updatedProject);
  };

  // Create new shot
  const handleCreateShot = () => {
    const nextNumber = currentProject.shots.length + 1;
    const newShot: StoryboardShot = {
      id: `shot-${Date.now()}`,
      sceneId: currentProject.scenes[0]?.id || 'scene-01',
      shotNumber: nextNumber,
      title: `Shot ${String(nextNumber).padStart(2, '0')}`,
      description: 'Describe character movement, framing, and lighting directives.',
      duration: 4,
      shotSize: 'MEDIUM',
      cameraMovement: 'STATIC',
      cameraAngle: 'Eye-level',
      lens: '35mm anamorphic',
      composition: 'Rule of thirds',
      lighting: 'Chiaroscuro contrast',
      timeOfDay: 'Day',
      characterIds: currentProject.characters.slice(0, 1).map((c) => c.id),
      locationId: currentProject.locations[0]?.id,
      prompt: 'Cinematic shot with authentic 24fps film grain and atmospheric depth.',
      isManualPromptEdited: false,
      status: 'READY',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
      currentVersionNumber: 1,
      versions: [],
    };

    const nextShots = [...currentProject.shots, newShot];
    const updated: StudioProject = {
      ...currentProject,
      shots: nextShots,
    };
    updateProject(updated);
    setSelectedShotId(newShot.id);
    setIsInspectorOpen(true);
  };

  // Duplicate shot
  const handleDuplicateShot = (shotId: string) => {
    const target = currentProject.shots.find((s) => s.id === shotId);
    if (!target) return;

    const copyShot: StoryboardShot = {
      ...target,
      id: `shot-${Date.now()}`,
      shotNumber: currentProject.shots.length + 1,
      title: `${target.title} (Copy)`,
      versions: [...target.versions],
    };

    const nextShots = [...currentProject.shots, copyShot];
    updateProject({ ...currentProject, shots: nextShots });
    setSelectedShotId(copyShot.id);
  };

  // Delete shot
  const handleDeleteShot = (shotId: string) => {
    const nextShots = currentProject.shots
      .filter((s) => s.id !== shotId)
      .map((s, idx) => ({ ...s, shotNumber: idx + 1 }));
    const nextClips = currentProject.timelineClips.filter((c) => c.shotId !== shotId);

    updateProject({
      ...currentProject,
      shots: nextShots,
      timelineClips: nextClips,
    });
    if (selectedShotId === shotId) {
      setSelectedShotId(nextShots[0]?.id);
    }
  };

  // Update shot from inspector
  const handleUpdateShot = (updatedShot: StoryboardShot) => {
    const nextShots = currentProject.shots.map((s) => (s.id === updatedShot.id ? updatedShot : s));

    // Also synchronize timeline clip duration if changed
    const nextClips = currentProject.timelineClips.map((c) =>
      c.shotId === updatedShot.id ? { ...c, duration: updatedShot.duration } : c
    );

    updateProject({
      ...currentProject,
      shots: nextShots,
      timelineClips: nextClips,
    });
  };

  // Completed generation job handler
  const handleGenerationComplete = (
    newJob: GenerationJob,
    updatedShot?: StoryboardShot,
    newAsset?: StudioAsset
  ) => {
    let nextShots = currentProject.shots;
    if (updatedShot) {
      nextShots = currentProject.shots.map((s) => (s.id === updatedShot.id ? updatedShot : s));
    }

    let nextAssets = currentProject.assets;
    if (newAsset) {
      nextAssets = [newAsset, ...currentProject.assets];
    }

    const updated: StudioProject = {
      ...currentProject,
      shots: nextShots,
      assets: nextAssets,
      generationQueue: [newJob, ...currentProject.generationQueue],
    };
    updateProject(updated);
  };

  // Assistant Review-Before-Apply action
  const handleApplyAssistantProposal = (proposal: AssistantProposal) => {
    if (proposal.type === 'SHOT_PROMPT' && proposal.targetId) {
      const shot = currentProject.shots.find((s) => s.id === proposal.targetId);
      if (shot) {
        handleUpdateShot({
          ...shot,
          prompt: proposal.proposedValue,
          isManualPromptEdited: true,
        });
      }
    }
  };

  // Studio Keyboard Shortcuts (1: Storyboard, 2: Video Gen, 3: Timeline, V: Visual Workflow Canvas, Cmd/Ctrl+Z: Undo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable);

      if ((e.metaKey || e.ctrlKey) && !isInputFocused) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey || isInputFocused) return;

      const key = e.key.toLowerCase();
      if (key === '1') {
        setIsCanvasPageOpen(false);
        setActiveSection('storyboard');
      } else if (key === '2') {
        setIsCanvasPageOpen(false);
        setActiveSection('generation');
      } else if (key === '3') {
        setIsCanvasPageOpen(false);
        setActiveSection('timeline');
      } else if (key === 'v') {
        setIsCanvasPageOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // DEDICATED CANVAS ROUTE (SECTION 19):
  // When isCanvasPageOpen is true, mount dedicated full-workspace StudioWorkflowCanvasPage
  if (isCanvasPageOpen) {
    return (
      <StudioWorkflowCanvasPage
        project={currentProject}
        onBackToStudio={() => setIsCanvasPageOpen(false)}
        onUpdateProject={updateProject}
      />
    );
  }

  const selectedShot = currentProject.shots.find((s) => s.id === selectedShotId);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050507] text-[#ECECE9] overflow-hidden select-none">
      {/* 1. TOP APPLICATION BAR */}
      <StudioTopBar
        project={currentProject}
        activeMode={activeSection}
        onChangeMode={setActiveSection}
        onOpenCanvas={() => setIsCanvasPageOpen(true)}
        onRenameProject={(name) => updateProject({ ...currentProject, name })}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenMenu={onOpenMenu}
        onGoToRooms={onGoToRooms}
        onBackToSlideOne={onBackToSlideOne}
        onBackToSlideTwo={onBackToSlideTwo}
        onBackToSlideThree={onBackToSlideThree}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* 2. MAIN PRODUCTION WORKSPACE (SIDEBAR + ACTIVE VIEW + INSPECTOR) */}
      <div className="flex-1 relative flex overflow-hidden min-h-0">
        {/* LEFT NAVIGATION PANEL */}
        <StudioSidebar
          activeSection={activeSection}
          onChangeSection={setActiveSection}
          onOpenCanvas={() => setIsCanvasPageOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          shotsCount={currentProject.shots.length}
          charactersCount={currentProject.characters.length}
          locationsCount={currentProject.locations.length}
        />

        {/* CENTRAL CREATIVE WORKSPACE WITH SILK OPTICAL REVEAL */}
        <main
          key={activeSection}
          className="flex-1 relative h-full flex flex-col overflow-hidden min-h-0 animate-silk-fade"
        >
          {activeSection === 'storyboard' && (
            <StoryboardWorkspace
              project={currentProject}
              selectedShotId={selectedShotId}
              onSelectShot={(shot) => {
                setSelectedShotId(shot.id);
                setIsInspectorOpen(true);
              }}
              onCreateShot={handleCreateShot}
              onDuplicateShot={handleDuplicateShot}
              onDeleteShot={handleDeleteShot}
              onMoveShot={handleMoveShot}
              onGenerateVideoForShot={(shot) => {
                setSelectedShotId(shot.id);
                setActiveSection('generation');
              }}
            />
          )}

          {activeSection === 'characters' && (
            <CharactersWorkspace
              project={currentProject}
              onUpdateCharacters={(characters) =>
                updateProject({ ...currentProject, characters })
              }
            />
          )}

          {activeSection === 'locations' && (
            <LocationsWorkspace
              project={currentProject}
              onUpdateLocations={(locations) =>
                updateProject({ ...currentProject, locations })
              }
            />
          )}

          {activeSection === 'vaiu' && (
            <VaiuSeedanceWorkspace
              project={currentProject}
              onSendToSeedanceStudio={(payload) => {
                setVaiuPrefill(payload);
                setActiveSection('generation');
              }}
              onJobComplete={handleGenerationComplete}
              onAddAsset={(newAsset) =>
                updateProject({
                  ...currentProject,
                  assets: [newAsset, ...currentProject.assets],
                })
              }
            />
          )}

          {(activeSection === 'image-gen' ||
            activeSection === 'midjourney' ||
            activeSection === 'generation') && (
            <VideoGenerationWorkspace
              project={currentProject}
              prefilledShot={selectedShot}
              vaiuPrefill={vaiuPrefill}
              onOpenVaiu={() => setActiveSection('vaiu')}
              initialMode={
                activeSection === 'midjourney'
                  ? 'midjourney-discord'
                  : activeSection === 'image-gen'
                  ? 'image-gen'
                  : 'ref-video'
              }
              onJobComplete={handleGenerationComplete}
              onAddAsset={(newAsset) =>
                updateProject({
                  ...currentProject,
                  assets: [newAsset, ...currentProject.assets],
                })
              }
              onInsertToTimeline={(newClip) =>
                updateProject({
                  ...currentProject,
                  timelineClips: [...currentProject.timelineClips, newClip],
                })
              }
              onAttachToCharacterRef={(characterId, imageUrl) => {
                const nextChars = currentProject.characters.map((c) =>
                  c.id === characterId
                    ? { ...c, referenceImages: [imageUrl, ...c.referenceImages] }
                    : c
                );
                updateProject({ ...currentProject, characters: nextChars });
              }}
            />
          )}

          {activeSection === 'timeline' && (
            <TimelineWorkspace
              project={currentProject}
              onUpdateTimeline={(tracks, clips) =>
                updateProject({
                  ...currentProject,
                  timelineTracks: tracks,
                  timelineClips: clips,
                })
              }
            />
          )}

          {activeSection === 'projects' && (
            <ProjectsWorkspace
              currentProject={currentProject}
              onSelectProject={handleSelectProject}
              onDeleteProject={(id) => {
                const filtered = projects.filter((p) => p.id !== id);
                setProjects(filtered);
                if (activeProjectId === id && filtered.length > 0) {
                  handleSelectProject(filtered[0]);
                }
              }}
              onDuplicateProject={(p) => {
                const copy = createNewProject(`${p.name} (Copy)`, p.genre, p.aspectRatio);
                handleSelectProject(copy);
              }}
              onCreateProject={(name, genre) => {
                const created = createNewProject(name, genre);
                handleSelectProject(created);
              }}
            />
          )}

          {activeSection === 'assets' && (
            <AssetLibraryWorkspace
              project={currentProject}
              onDeleteAsset={(assetId) => {
                const nextAssets = currentProject.assets.filter((a) => a.id !== assetId);
                updateProject({ ...currentProject, assets: nextAssets });
              }}
              onAddAsset={(newAsset) =>
                updateProject({
                  ...currentProject,
                  assets: [newAsset, ...currentProject.assets],
                })
              }
            />
          )}

          {activeSection === 'audio' && <AudioWorkspace project={currentProject} />}

          {activeSection === 'export' && <ExportWorkspace project={currentProject} />}
        </main>

        {/* RIGHT CONTEXTUAL INSPECTOR (COLLAPSIBLE, SHOWN IN STORYBOARD MODE) */}
        {activeSection === 'storyboard' && isInspectorOpen && selectedShot && (
          <ShotInspector
            shot={selectedShot}
            project={currentProject}
            onUpdateShot={handleUpdateShot}
            onClose={() => setIsInspectorOpen(false)}
            onGenerateVideo={(shot) => {
              setSelectedShotId(shot.id);
              setActiveSection('generation');
            }}
          />
        )}
      </div>

      {/* 3. COMPACT MOBILE BOTTOM NAVIGATION BAR (< 768px) */}
      <nav
        aria-label="Studio Mobile Navigation"
        className="md:hidden shrink-0 bg-[#09090D]/95 backdrop-blur-md border-t border-white/10 px-2 pb-safe pt-1.5 flex items-center justify-around z-30"
      >
        <button
          onClick={() => onBackToSlideOne?.()}
          className="min-h-[44px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 text-white/55 hover:text-white transition-colors cursor-pointer touch-press"
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] font-mono">Home</span>
        </button>

        <button
          onClick={() => {
            setIsMobileMoreOpen(false);
            setActiveSection('vaiu');
          }}
          className={`min-h-[44px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-press ${
            activeSection === 'vaiu' ? 'text-cyan-400 font-bold' : 'text-white/55 hover:text-white'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span className="text-[10px] font-mono">VAIU 2.5</span>
        </button>

        <button
          onClick={() => {
            setIsMobileMoreOpen(false);
            setActiveSection('image-gen');
          }}
          className={`min-h-[44px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-press ${
            activeSection === 'image-gen' ? 'text-cyan-400 font-bold' : 'text-white/55 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-mono">Image Gen</span>
        </button>

        <button
          onClick={() => {
            setIsMobileMoreOpen(false);
            setActiveSection('midjourney');
          }}
          className={`min-h-[44px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-press ${
            activeSection === 'midjourney' ? 'text-cyan-400 font-bold' : 'text-white/55 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span className="text-[10px] font-mono">Midjourney</span>
        </button>

        <button
          onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
          className={`min-h-[44px] min-w-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer touch-press ${
            isMobileMoreOpen ||
            ['generation', 'storyboard', 'timeline', 'projects', 'characters', 'locations', 'audio', 'export', 'assets'].includes(activeSection)
              ? 'text-cyan-400 font-bold'
              : 'text-white/55 hover:text-white'
          }`}
        >
          <MoreHorizontal className="w-4 h-4" />
          <span className="text-[10px] font-mono">More</span>
        </button>
      </nav>

      {/* MOBILE "MORE" WORKSPACE BOTTOM SHEET */}
      {isMobileMoreOpen && (
        <div
          onClick={() => setIsMobileMoreOpen(false)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end md:hidden"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#0C0D12] border-t border-white/20 rounded-t-2xl p-4 pb-safe space-y-3 animate-sheet-up shadow-2xl"
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
                Production Workspaces
              </span>
              <button
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1.5 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'vaiu', label: 'VAIU Seedance 2.5', icon: Wand2 },
                { id: 'image-gen', label: 'Image Gen Studio', icon: Sparkles },
                { id: 'midjourney', label: 'Midjourney Bridge', icon: Terminal },
                { id: 'generation', label: 'Video Synthesis', icon: Film },
                { id: 'assets', label: 'Asset Library', icon: ImageIcon },
                { id: 'storyboard', label: 'Storyboard', icon: Clapperboard, count: currentProject.shots.length },
                { id: 'timeline', label: 'Timeline Editor', icon: Scissors },
                { id: 'canvas', label: 'Node Workflow', icon: Layers, isCanvas: true },
                { id: 'projects', label: 'Projects', icon: FolderKanban },
                { id: 'characters', label: 'Characters', icon: Users, count: currentProject.characters.length },
                { id: 'locations', label: 'Locations', icon: MapPin, count: currentProject.locations.length },
                { id: 'audio', label: 'Audio & Foley', icon: Music },
                { id: 'export', label: 'Export Master', icon: Share2 },
                { id: 'assistant', label: 'AI Copilot', icon: Sparkles, isAssistant: true },
              ].map((item) => {
                const Icon = item.icon;
                const active = !item.isCanvas && !item.isAssistant && activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsMobileMoreOpen(false);
                      if (item.isCanvas) {
                        setIsCanvasPageOpen(true);
                      } else if (item.isAssistant) {
                        setIsAssistantOpen(true);
                      } else {
                        setActiveSection(item.id as StudioNavSection);
                      }
                    }}
                    className={`min-h-[48px] p-3 rounded-xl border flex items-center justify-between text-left font-mono text-xs transition-all cursor-pointer touch-press ${
                      active
                        ? 'bg-cyan-500 text-black border-cyan-400 font-bold'
                        : 'bg-white/[0.04] border-white/10 text-white/85 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.count !== undefined && (
                      <span className="text-[10px] opacity-70">{item.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. AI FILMMAKING COPILOT DRAWER */}
      <AIAssistantDrawer
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        project={currentProject}
        selectedShot={selectedShot}
        onApplyProposal={handleApplyAssistantProposal}
      />
    </div>
  );
};
