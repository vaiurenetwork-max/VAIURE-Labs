/**
 * VAIURE HYBRID STUDIO — Storyboard & Sequence Builder
 * Full scene & multi-shot hierarchy with independent references, camera/motion direction,
 * split/combine sequences, reorder, regenerate, and optional AI Director breakdown.
 */

import React, { useState } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Scissors,
  Layers,
  Sparkles,
  Film,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  ArrowRight,
  Wand2,
  Camera,
  UserCheck,
  MapPin,
  Image as ImageIcon,
  Video as VideoIcon,
  RefreshCw,
} from 'lucide-react';
import {
  HybridCameraMovement,
  HybridProductionProject,
  HybridScene,
  HybridShot,
} from '../../types/hybridStudio';
import { CAMERA_MOVEMENT_OPTIONS } from '../../services/hybridStudioService';

interface HybridStoryboardBuilderProps {
  project: HybridProductionProject;
  selectedSceneId: string;
  selectedShotId: string;
  isPlanningScenes: boolean;
  onSelectShot: (sceneId: string, shotId: string) => void;
  onAddScene: () => void;
  onGenerateScenesFromConcept: (concept: string) => Promise<void>;
  onDuplicateScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, dir: 'UP' | 'DOWN') => void;
  onUpdateScene: (sceneId: string, updates: Partial<HybridScene>) => void;
  onSplitSceneIntoShots: (sceneId: string) => void;
  onCombineSceneToSequence: (sceneId: string) => void;
  onCombineSelectedShots: (shotIds: string[]) => void;
  onAddShot: (sceneId: string) => void;
  onDuplicateShot: (sceneId: string, shotId: string) => void;
  onDeleteShot: (sceneId: string, shotId: string) => void;
  onGenerateShot: (sceneId: string, shotId: string) => void;
  onRegenerateSelectedShots: (shotIds: string[]) => void;
  onAddShotToTimeline: (scene: HybridScene, shot: HybridShot) => void;
  onExtendFromShot: (scene: HybridScene, shot: HybridShot) => void;
}

export const HybridStoryboardBuilder: React.FC<HybridStoryboardBuilderProps> = ({
  project,
  selectedSceneId,
  selectedShotId,
  isPlanningScenes,
  onSelectShot,
  onAddScene,
  onGenerateScenesFromConcept,
  onDuplicateScene,
  onDeleteScene,
  onMoveScene,
  onUpdateScene,
  onSplitSceneIntoShots,
  onCombineSceneToSequence,
  onCombineSelectedShots,
  onAddShot,
  onDuplicateShot,
  onDeleteShot,
  onGenerateShot,
  onRegenerateSelectedShots,
  onAddShotToTimeline,
  onExtendFromShot,
}) => {
  const [checkedShotIds, setCheckedShotIds] = useState<string[]>([]);
  const [showConceptPlanner, setShowConceptPlanner] = useState(false);
  const [conceptPitch, setConceptPitch] = useState('');
  const [expandedSceneRefsId, setExpandedSceneRefsId] = useState<string | null>(null);
  const [confirmDeleteSceneId, setConfirmDeleteSceneId] = useState<string | null>(null);

  const totalShots = project.scenes.reduce((acc, s) => acc + s.shots.length, 0);
  const totalDuration = project.scenes.reduce(
    (acc, s) => acc + s.shots.reduce((sa, sh) => sa + sh.duration, 0),
    0
  );

  const toggleShotCheck = (shotId: string) => {
    setCheckedShotIds((prev) =>
      prev.includes(shotId) ? prev.filter((id) => id !== shotId) : [...prev, shotId]
    );
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conceptPitch.trim() || isPlanningScenes) return;
    await onGenerateScenesFromConcept(conceptPitch.trim());
    setConceptPitch('');
    setShowConceptPlanner(false);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050507] overflow-hidden select-none">
      {/* Toolbar */}
      <div className="min-h-11 px-3 sm:px-4 py-2 bg-[#090a0f] border-b border-white/[0.1] flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white font-semibold">
            Storyboard & Sequence Builder
          </span>
          <span className="text-[10px] font-mono text-white/45 tabular-nums">
            {project.scenes.length} Scenes · {totalShots} Shots · {totalDuration}s
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {checkedShotIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  onCombineSelectedShots(checkedShotIds);
                  setCheckedShotIds([]);
                }}
                className="flex items-center gap-1 px-2.5 py-1 border border-emerald-500/40 bg-emerald-950/35 hover:bg-emerald-900/50 text-emerald-300 text-[10px] font-mono uppercase cursor-pointer"
              >
                <Layers className="w-3 h-3" />
                <span>Combine ({checkedShotIds.length}) → Sequence</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onRegenerateSelectedShots(checkedShotIds);
                  setCheckedShotIds([]);
                }}
                className="flex items-center gap-1 px-2.5 py-1 border border-cyan-500/40 bg-cyan-950/35 hover:bg-cyan-900/50 text-cyan-300 text-[10px] font-mono uppercase cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Regenerate ({checkedShotIds.length})</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowConceptPlanner((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 border text-[10px] font-mono uppercase transition-colors cursor-pointer ${
              showConceptPlanner
                ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                : 'border-white/15 bg-white/[0.03] hover:border-white/35 text-white/80'
            }`}
          >
            <Wand2 className="w-3 h-3 text-cyan-400" />
            <span>AI Scene Breakdown</span>
          </button>

          <button
            type="button"
            onClick={onAddScene}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#ECECE9] hover:bg-white text-black text-[10px] font-mono font-semibold uppercase transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Add Scene</span>
          </button>
        </div>
      </div>

      {/* Optional AI Director Scene Breakdown Drawer */}
      {showConceptPlanner && (
        <form
          onSubmit={handlePlanSubmit}
          className="px-4 py-3 border-b border-cyan-500/30 bg-[#0b0e14] flex flex-col sm:flex-row gap-2 shrink-0"
        >
          <input
            type="text"
            value={conceptPitch}
            onChange={(e) => setConceptPitch(e.target.value)}
            placeholder="Describe your sequence treatment (e.g., Detective crosses rain-slick neon alley, spots silhouette on bridge, pursues across wet asphalt)..."
            className="flex-1 px-3 py-1.5 bg-black/60 border border-white/15 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={isPlanningScenes || !conceptPitch.trim()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-cyan-400 text-black text-[10px] font-mono font-bold uppercase cursor-pointer disabled:opacity-45 shrink-0"
          >
            {isPlanningScenes ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isPlanningScenes ? 'Planning...' : 'Draft Scenes'}</span>
          </button>
        </form>
      )}

      {/* Scenes & Nested Shots List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        {project.scenes.map((scene, sceneIdx) => {
          const isSceneActive = scene.id === selectedSceneId;
          const sceneTotalDuration = scene.shots.reduce((a, sh) => a + sh.duration, 0);
          const isRefsExpanded = expandedSceneRefsId === scene.id;

          return (
            <section
              key={scene.id}
              className={`border bg-[#08090e] transition-colors ${
                isSceneActive ? 'border-white/25' : 'border-white/[0.09]'
              }`}
            >
              {/* Scene Header */}
              <div className="px-3.5 py-2.5 border-b border-white/[0.08] bg-[#0b0d12] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="px-2 py-0.5 border border-white/15 bg-black/50 text-[10px] font-mono font-bold text-white tabular-nums shrink-0">
                    SCENE {String(scene.sceneNumber).padStart(2, '0')}
                  </span>

                  <input
                    type="text"
                    value={scene.name}
                    onChange={(e) => onUpdateScene(scene.id, { name: e.target.value })}
                    className="bg-transparent text-xs sm:text-sm font-medium text-white focus:outline-none focus:border-b focus:border-cyan-400 min-w-[120px] flex-1"
                  />

                  <span className="hidden md:inline text-[10px] font-mono text-white/45 tabular-nums shrink-0">
                    {scene.shots.length} shots · {sceneTotalDuration}s
                  </span>
                </div>

                {/* Scene Controls */}
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveScene(scene.id, 'UP')}
                    disabled={sceneIdx === 0}
                    title="Move Scene Up"
                    className="p-1 border border-white/10 text-white/55 hover:text-white disabled:opacity-25 cursor-pointer"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveScene(scene.id, 'DOWN')}
                    disabled={sceneIdx === project.scenes.length - 1}
                    title="Move Scene Down"
                    className="p-1 border border-white/10 text-white/55 hover:text-white disabled:opacity-25 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedSceneRefsId(isRefsExpanded ? null : scene.id)
                    }
                    className={`px-2 py-1 border text-[9px] font-mono uppercase cursor-pointer ${
                      isRefsExpanded
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200'
                        : 'border-white/10 text-white/65 hover:text-white'
                    }`}
                  >
                    Scene Refs & Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() => onSplitSceneIntoShots(scene.id)}
                    title="Split scene into multiple coverage shots"
                    className="flex items-center gap-1 px-2 py-1 border border-white/10 text-[9px] font-mono uppercase text-white/70 hover:text-white cursor-pointer"
                  >
                    <Scissors className="w-3 h-3" />
                    <span className="hidden sm:inline">Split Shots</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCombineSceneToSequence(scene.id)}
                    title="Send all shots in this scene to Timeline sequence"
                    className="flex items-center gap-1 px-2 py-1 border border-white/10 hover:border-emerald-400 text-[9px] font-mono uppercase text-white/75 hover:text-emerald-300 cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="hidden sm:inline">→ Timeline</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddShot(scene.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-white/10 hover:bg-white hover:text-black text-[9px] font-mono uppercase text-white cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Shot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicateScene(scene.id)}
                    title="Duplicate Scene"
                    className="p-1 border border-white/10 text-white/55 hover:text-white cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {project.scenes.length > 1 &&
                    (confirmDeleteSceneId === scene.id ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 border border-rose-500/40 bg-rose-950/60 text-[9px] font-mono text-rose-200">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteScene(scene.id);
                            setConfirmDeleteSceneId(null);
                          }}
                          className="underline font-bold cursor-pointer"
                        >
                          Del
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteSceneId(null)}
                          className="text-white/60 cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSceneId(scene.id)}
                        title="Delete Scene"
                        className="p-1 border border-white/10 text-white/45 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ))}
                </div>
              </div>

              {/* Expandable Scene-Level Metadata & Continuity Defaults */}
              {isRefsExpanded && (
                <div className="p-3.5 border-b border-white/[0.08] bg-black/35 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[9px] font-mono uppercase text-white/45">
                      Scene Description & Narrative Prompt
                    </label>
                    <textarea
                      rows={2}
                      value={scene.description}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          description: e.target.value,
                          generationPrompt: scene.generationPrompt || e.target.value,
                        })
                      }
                      placeholder="Describe scene story beat, mood, and dramatic tension..."
                      className="w-full px-2.5 py-1.5 bg-[#0b0d12] border border-white/12 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-mono uppercase text-white/45">
                          Scene Camera Direction
                        </label>
                        <select
                          value={scene.cameraDirection}
                          onChange={(e) =>
                            onUpdateScene(scene.id, {
                              cameraDirection: e.target.value as HybridCameraMovement,
                            })
                          }
                          className="w-full mt-0.5 px-2 py-1.5 bg-[#0b0d12] border border-white/12 text-[11px] font-mono text-white"
                        >
                          {CAMERA_MOVEMENT_OPTIONS.map((cam) => (
                            <option key={cam} value={cam}>
                              {cam}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-mono uppercase text-white/45">
                          Scene Motion Direction
                        </label>
                        <input
                          type="text"
                          value={scene.motionDirection}
                          onChange={(e) =>
                            onUpdateScene(scene.id, { motionDirection: e.target.value })
                          }
                          placeholder="e.g., Slow wind drift, fluid walk"
                          className="w-full mt-0.5 px-2 py-1.5 bg-[#0b0d12] border border-white/12 text-[11px] text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-mono uppercase text-white/45">
                      Scene Reference Attachments
                    </label>
                    <select
                      value={scene.referenceImageAssetId || ''}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          referenceImageAssetId: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 bg-[#0b0d12] border border-white/12 text-[10px] font-mono text-white/80"
                    >
                      <option value="">Reference Image: None</option>
                      {project.assets
                        .filter((a) => a.mediaType === 'IMAGE')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            IMG: {a.name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={scene.referenceVideoAssetId || ''}
                      onChange={(e) =>
                        onUpdateScene(scene.id, {
                          referenceVideoAssetId: e.target.value || undefined,
                        })
                      }
                      className="w-full px-2 py-1.5 bg-[#0b0d12] border border-white/12 text-[10px] font-mono text-white/80"
                    >
                      <option value="">Reference Video: None</option>
                      {project.assets
                        .filter((a) => a.mediaType === 'VIDEO')
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            VID: {a.name}
                          </option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={scene.characterId || ''}
                        onChange={(e) =>
                          onUpdateScene(scene.id, {
                            characterId: e.target.value || undefined,
                          })
                        }
                        className="w-full px-2 py-1 bg-[#0b0d12] border border-white/12 text-[10px] font-mono text-white/80"
                      >
                        <option value="">Character: Any</option>
                        {project.characters.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={scene.environmentId || ''}
                        onChange={(e) =>
                          onUpdateScene(scene.id, {
                            environmentId: e.target.value || undefined,
                          })
                        }
                        className="w-full px-2 py-1 bg-[#0b0d12] border border-white/12 text-[10px] font-mono text-white/80"
                      >
                        <option value="">Location: Any</option>
                        {project.environments.map((en) => (
                          <option key={en.id} value={en.id}>
                            {en.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Shots Grid */}
              <div className="p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {scene.shots.map((shot) => {
                  const isShotSelected =
                    scene.id === selectedSceneId && shot.id === selectedShotId;
                  const isChecked = checkedShotIds.includes(shot.id);
                  const startImgAsset = project.assets.find(
                    (a) => a.id === shot.referenceImageAssetId
                  );
                  const refVideoAsset = project.assets.find(
                    (a) => a.id === shot.referenceVideoAssetId
                  );
                  const previewImageUrl =
                    shot.thumbnailUrl || startImgAsset?.thumbnailUrl || startImgAsset?.url;
                  const linkedCharNames = project.characters
                    .filter((c) => shot.characterIds.includes(c.id))
                    .map((c) => c.name);
                  const linkedEnv = project.environments.find(
                    (e) => e.id === (shot.environmentId || scene.environmentId)
                  );

                  return (
                    <div
                      key={shot.id}
                      onClick={() => onSelectShot(scene.id, shot.id)}
                      className={`border flex flex-col transition-all cursor-pointer bg-[#0b0d12] ${
                        isShotSelected
                          ? 'border-cyan-400 ring-1 ring-cyan-400/60'
                          : 'border-white/[0.1] hover:border-white/25'
                      }`}
                    >
                      {/* Shot Preview Frame */}
                      <div className="relative aspect-video bg-black border-b border-white/[0.08] overflow-hidden flex items-center justify-center">
                        {shot.outputUrl ? (
                          <video
                            src={shot.outputUrl}
                            controls
                            muted
                            playsInline
                            onClick={(e) => e.stopPropagation()}
                            className="w-full h-full object-cover"
                          />
                        ) : previewImageUrl ? (
                          <img
                            src={previewImageUrl}
                            alt={shot.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center px-4 space-y-1">
                            <Film className="w-6 h-6 mx-auto text-white/20" />
                            <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                              {shot.shotSize} · {shot.cameraMovement}
                            </div>
                          </div>
                        )}

                        {/* Top-Left Selector & Number */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleShotCheck(shot.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`Select Shot ${shot.shotNumber}`}
                            className="w-3.5 h-3.5 accent-cyan-400 cursor-pointer"
                          />
                          <span className="px-1.5 py-0.5 bg-black/80 border border-white/15 text-[10px] font-mono font-semibold text-white tabular-nums">
                            SHOT {String(shot.shotNumber).padStart(2, '0')}
                          </span>
                        </div>

                        {/* Top-Right Status */}
                        <div className="absolute top-2 right-2">
                          {shot.status === 'COMPLETED' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono uppercase flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Rendered</span>
                            </span>
                          ) : shot.status === 'PROCESSING' || shot.status === 'QUEUED' ? (
                            <span className="px-1.5 py-0.5 bg-cyan-950/90 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono uppercase flex items-center gap-1 tabular-nums">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              <span>{shot.progress || 15}%</span>
                            </span>
                          ) : shot.status === 'FAILED' ? (
                            <span className="px-1.5 py-0.5 bg-rose-950/90 border border-rose-500/40 text-rose-300 text-[9px] font-mono uppercase flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>Failed</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-black/80 border border-white/15 text-white/65 text-[9px] font-mono uppercase">
                              Planning
                            </span>
                          )}
                        </div>

                        {/* Bottom Metadata Strip */}
                        <div className="pointer-events-none absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white/80 bg-black/65 px-2 py-0.5">
                          <span className="tabular-nums">
                            {shot.duration}s · {shot.resolution} · {shot.aspectRatio}
                          </span>
                          <span className="uppercase">
                            {shot.providerId === 'muapi' ? 'MUAPI SPICY' : 'BYTEDANCE'}
                          </span>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-2.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-white truncate">
                            {shot.title}
                          </div>
                          <p className="text-[11px] text-white/55 line-clamp-2 leading-snug">
                            {shot.mainPrompt || shot.description || 'Configure prompt and camera direction in the AI panel.'}
                          </p>
                          {shot.error && (
                            <p className="text-[10px] font-mono text-rose-300 line-clamp-2">
                              {shot.error}
                            </p>
                          )}
                        </div>

                        {/* Continuity & Reference Readout (Zero-Pill) */}
                        <div className="text-[9px] font-mono text-white/45 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-white/[0.06] pt-1.5">
                          <span className="inline-flex items-center gap-1 text-white/65">
                            <Camera className="w-2.5 h-2.5" />
                            {shot.shotSize} / {shot.cameraMovement}
                          </span>
                          {startImgAsset && (
                            <span className="inline-flex items-center gap-1 text-cyan-300">
                              <ImageIcon className="w-2.5 h-2.5" />
                              Start Ref
                            </span>
                          )}
                          {refVideoAsset && (
                            <span className="inline-flex items-center gap-1 text-cyan-300">
                              <VideoIcon className="w-2.5 h-2.5" />
                              Video Ref
                            </span>
                          )}
                          {linkedCharNames.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-white/75">
                              <UserCheck className="w-2.5 h-2.5 text-cyan-400" />
                              {linkedCharNames.join(', ')}
                            </span>
                          )}
                          {linkedEnv && (
                            <span className="inline-flex items-center gap-1 text-amber-300">
                              <MapPin className="w-2.5 h-2.5" />
                              {linkedEnv.name}
                            </span>
                          )}
                        </div>

                        {/* Shot Actions */}
                        <div className="pt-1.5 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-1">
                          <button
                            type="button"
                            disabled={shot.status === 'PROCESSING' || shot.status === 'QUEUED'}
                            onClick={(e) => {
                              e.stopPropagation();
                              onGenerateShot(scene.id, shot.id);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-[#ECECE9] hover:bg-white text-black text-[9px] font-mono font-semibold uppercase cursor-pointer disabled:opacity-40"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{shot.outputUrl ? 'Regenerate' : 'Generate'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            {shot.outputUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddShotToTimeline(scene, shot);
                                  }}
                                  title="Add rendered shot to Timeline"
                                  className="px-1.5 py-1 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-950/40 text-[9px] font-mono uppercase cursor-pointer"
                                >
                                  + Timeline
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExtendFromShot(scene, shot);
                                  }}
                                  title="Create next consecutive shot extending from this clip"
                                  className="px-1.5 py-1 border border-cyan-500/35 text-cyan-300 hover:bg-cyan-950/40 text-[9px] font-mono uppercase cursor-pointer"
                                >
                                  Extend
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDuplicateShot(scene.id, shot.id);
                              }}
                              title="Duplicate Shot"
                              className="p-1 border border-white/10 text-white/55 hover:text-white cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {scene.shots.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteShot(scene.id, shot.id);
                                }}
                                title="Delete Shot"
                                className="p-1 border border-white/10 text-white/45 hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
