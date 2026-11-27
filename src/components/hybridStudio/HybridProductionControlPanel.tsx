/**
 * VAIURE HYBRID STUDIO — AI Production Control Panel
 * Dedicated Seedance 2.5 & MUAPI Shot Direction, Multimodal Reference Binding,
 * Shot Director Controls, Exact Model Capabilities & Shot Version History.
 */

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Wand2,
  Camera,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video as VideoIcon,
  History,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  HybridAspectRatio,
  HybridCameraMovement,
  HybridGenerationMode,
  HybridProductionProject,
  HybridScene,
  HybridShot,
  HybridShotSize,
  HybridWorkspaceMode,
} from '../../types/hybridStudio';
import {
  GenerationResolution,
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
} from '../../types/multiProvider';
import {
  CAMERA_MOVEMENT_OPTIONS,
  SHOT_SIZE_OPTIONS,
  compileShotGenerationPrompt,
} from '../../services/hybridStudioService';
import { computeLocalMuapiPricePreview } from '../../services/multiProviderGenerationService';

interface HybridProductionControlPanelProps {
  project: HybridProductionProject;
  scene?: HybridScene;
  shot?: HybridShot;
  workspaceMode: HybridWorkspaceMode;
  providers: ProviderConfigPublic[];
  isGenerating: boolean;
  isOptimizingPrompt: boolean;
  isSynthesizingKeyframe: boolean;
  onUpdateShot: (sceneId: string, shotId: string, updates: Partial<HybridShot>) => void;
  onOptimizeShotPrompt: (sceneId: string, shotId: string) => void;
  onSynthesizeKeyframeForShot: (sceneId: string, shotId: string) => void;
  onGenerateShot: (sceneId: string, shotId: string) => void;
  onSelectShotVersion: (sceneId: string, shotId: string, versionId: string) => void;
  onDropAssetOnShotSlot: (
    assetId: string,
    slot: 'start_frame' | 'end_frame' | 'reference_plate' | 'video_ref'
  ) => void;
}

const GENERATION_MODES: Array<{ id: HybridGenerationMode; label: string }> = [
  { id: 'text-to-video', label: 'Text-to-Video' },
  { id: 'image-to-video', label: 'Image-to-Video' },
  { id: 'video-to-video', label: 'Video Extension' },
  { id: 'reference-based', label: 'Reference-Based' },
  { id: 'first-last-frame', label: 'First / Last Frame' },
];

const ASPECT_RATIOS: HybridAspectRatio[] = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];

export const HybridProductionControlPanel: React.FC<HybridProductionControlPanelProps> = ({
  project,
  scene,
  shot,
  workspaceMode,
  providers,
  isGenerating,
  isOptimizingPrompt,
  isSynthesizingKeyframe,
  onUpdateShot,
  onOptimizeShotPrompt,
  onSynthesizeKeyframeForShot,
  onGenerateShot,
  onSelectShotVersion,
  onDropAssetOnShotSlot,
}) => {
  const [showStructuredFields, setShowStructuredFields] = useState(true);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [dropHighlight, setDropHighlight] = useState<string | null>(null);

  const activeProvider = useMemo(
    () =>
      providers.find((p) => p.providerId === (shot?.providerId || 'bytedance')) ||
      providers[0],
    [providers, shot?.providerId]
  );

  const availableModels = useMemo(
    () => (activeProvider?.models || []).filter((m) => m.enabled),
    [activeProvider]
  );

  const activeModel: ProviderModelDefinition | undefined = useMemo(
    () =>
      availableModels.find((m) => m.modelId === shot?.modelId) || availableModels[0],
    [availableModels, shot?.modelId]
  );

  const compiledPrompt = useMemo(() => {
    if (!shot) return '';
    return compileShotGenerationPrompt({
      shot,
      scene,
      characters: project.characters,
      environments: project.environments,
    });
  }, [shot, scene, project.characters, project.environments]);

  const muapiPricePreview = useMemo(() => {
    if (!shot || !activeModel || activeModel.pricingCurrency !== 'USD') return null;
    return computeLocalMuapiPricePreview(
      activeModel,
      shot.resolution,
      shot.duration,
      shot.draft
    );
  }, [shot, activeModel]);

  if (!scene || !shot) {
    return (
      <aside className="w-full h-full bg-[#07080b] border-l border-white/[0.1] p-6 flex items-center justify-center text-center">
        <p className="text-xs font-mono text-white/45">
          Select a scene and shot from the Storyboard to direct AI video generation.
        </p>
      </aside>
    );
  }

  const updateShot = (updates: Partial<HybridShot>) =>
    onUpdateShot(scene.id, shot.id, updates);

  const startImgAsset = project.assets.find((a) => a.id === shot.referenceImageAssetId);
  const endImgAsset = project.assets.find((a) => a.id === shot.endFrameAssetId);
  const refVideoAsset = project.assets.find((a) => a.id === shot.referenceVideoAssetId);
  const extraRefAssets = project.assets.filter((a) =>
    shot.extraReferenceAssetIds.includes(a.id)
  );

  const requiresStartImage =
    Boolean(activeModel?.requiresStartImage) ||
    shot.generationMode === 'image-to-video' ||
    shot.generationMode === 'first-last-frame';

  const missingRequiredStartImage = requiresStartImage && !startImgAsset;
  const missingRequiredVideo =
    shot.generationMode === 'video-to-video' && !refVideoAsset;

  const allowedResolutions: GenerationResolution[] =
    activeModel?.enabledResolutions?.length
      ? activeModel.enabledResolutions
      : ['720p'];
  const allowedDurations: number[] =
    activeModel?.enabledDurations?.length
      ? activeModel.enabledDurations
      : [5, 10, 15];

  const handleProviderChange = (nextProviderId: ProviderId) => {
    const nextProv = providers.find((p) => p.providerId === nextProviderId);
    const firstModel = nextProv?.models.find((m) => m.enabled);
    const nextRes = firstModel?.enabledResolutions[0] || '720p';
    const nextDur = firstModel?.enabledDurations[0] || 5;
    updateShot({
      providerId: nextProviderId,
      modelId: firstModel?.modelId || shot.modelId,
      resolution: firstModel?.enabledResolutions.includes(shot.resolution)
        ? shot.resolution
        : nextRes,
      duration: firstModel?.enabledDurations.includes(shot.duration as any)
        ? shot.duration
        : nextDur,
      generationMode:
        firstModel?.requiresStartImage && shot.generationMode === 'text-to-video'
          ? 'image-to-video'
          : shot.generationMode,
      quantity: firstModel?.providerId === 'muapi' ? 1 : shot.quantity,
    });
  };

  const handleModelChange = (modelId: string) => {
    const m = availableModels.find((item) => item.modelId === modelId);
    if (!m) return;
    updateShot({
      modelId: m.modelId,
      resolution: m.enabledResolutions.includes(shot.resolution)
        ? shot.resolution
        : m.enabledResolutions[0] || '720p',
      duration: m.enabledDurations.includes(shot.duration as any)
        ? shot.duration
        : m.enabledDurations[0] || 5,
      generationMode:
        m.requiresStartImage && shot.generationMode === 'text-to-video'
          ? 'image-to-video'
          : shot.generationMode,
    });
  };

  const renderDropSlot = (
    slot: 'start_frame' | 'end_frame' | 'video_ref',
    label: string,
    currentAsset: typeof startImgAsset | undefined,
    acceptVideo = false
  ) => (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDropHighlight(slot);
      }}
      onDragLeave={() => setDropHighlight(null)}
      onDrop={(e) => {
        e.preventDefault();
        setDropHighlight(null);
        const assetId = e.dataTransfer.getData('application/vaiure-asset-id');
        if (assetId) onDropAssetOnShotSlot(assetId, slot);
      }}
      className={`p-2 border transition-colors bg-[#0b0d12] space-y-1.5 ${
        dropHighlight === slot ? 'border-cyan-400 bg-cyan-950/30' : 'border-white/[0.1]'
      }`}
    >
      <div className="flex items-center justify-between text-[9px] font-mono uppercase text-white/55">
        <span>{label}</span>
        {currentAsset && (
          <button
            type="button"
            onClick={() =>
              updateShot(
                slot === 'start_frame'
                  ? { referenceImageAssetId: undefined }
                  : slot === 'end_frame'
                  ? { endFrameAssetId: undefined }
                  : { referenceVideoAssetId: undefined }
              )
            }
            className="text-white/45 hover:text-rose-400 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {currentAsset ? (
        <div className="flex items-center gap-2">
          {currentAsset.mediaType === 'VIDEO' ? (
            <video src={currentAsset.url} muted className="w-12 h-8 object-cover bg-black" />
          ) : (
            <img
              src={currentAsset.thumbnailUrl || currentAsset.url}
              alt={currentAsset.name}
              className="w-12 h-8 object-cover bg-black"
            />
          )}
          <span className="text-[10px] text-white/85 truncate flex-1">{currentAsset.name}</span>
        </div>
      ) : (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onDropAssetOnShotSlot(e.target.value, slot);
          }}
          className="w-full px-1.5 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/60"
        >
          <option value="">Drop asset or pick...</option>
          {project.assets
            .filter((a) => (acceptVideo ? a.mediaType === 'VIDEO' : a.mediaType === 'IMAGE'))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
      )}
    </div>
  );

  return (
    <aside className="w-full h-full bg-[#07080b] border-l border-white/[0.1] flex flex-col overflow-hidden select-none">
      {/* Header */}
      <div className="h-10 px-3 border-b border-white/[0.1] bg-[#0b0d12] flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-cyan-300 font-semibold truncate">
            AI Production Control
          </div>
        </div>
        <span className="text-[10px] font-mono text-white/55 tabular-nums shrink-0">
          SCN {String(scene.sceneNumber).padStart(2, '0')} · SHT {String(shot.shotNumber).padStart(2, '0')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Shot Title & Status */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-mono uppercase text-white/45">Active Shot Title</label>
          <input
            type="text"
            value={shot.title}
            onChange={(e) => updateShot({ title: e.target.value })}
            className="w-full px-2.5 py-1.5 bg-[#0b0d12] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Generation Mode Selector */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">
            Video Generation Mode
          </div>
          <div className="grid grid-cols-2 gap-1">
            {GENERATION_MODES.map((m) => {
              const disabledForMuapi =
                shot.providerId === 'muapi' &&
                (m.id === 'text-to-video' || m.id === 'video-to-video' || m.id === 'reference-based');
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabledForMuapi}
                  onClick={() => updateShot({ generationMode: m.id })}
                  title={
                    disabledForMuapi
                      ? 'Select ByteDance Official for this mode'
                      : m.label
                  }
                  className={`px-2 py-1.5 text-[10px] font-mono text-left border transition-colors cursor-pointer disabled:opacity-35 ${
                    shot.generationMode === m.id
                      ? 'border-cyan-400 bg-cyan-500/15 text-white font-semibold'
                      : 'border-white/[0.1] bg-[#0b0d12] text-white/65 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shot Director (Framing & Camera Rig) */}
        <div className="p-2.5 border border-white/[0.1] bg-[#0b0d12] space-y-2">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/60 flex items-center gap-1.5">
            <Camera className="w-3 h-3 text-cyan-400" />
            <span>Shot Director Controls</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-mono uppercase text-white/40">Shot Size</label>
              <select
                value={shot.shotSize}
                onChange={(e) => updateShot({ shotSize: e.target.value as HybridShotSize })}
                className="w-full mt-0.5 px-2 py-1 bg-black/60 border border-white/15 text-[10px] font-mono text-white"
              >
                {SHOT_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-mono uppercase text-white/40">Camera Move</label>
              <select
                value={shot.cameraMovement}
                onChange={(e) =>
                  updateShot({ cameraMovement: e.target.value as HybridCameraMovement })
                }
                className="w-full mt-0.5 px-2 py-1 bg-black/60 border border-white/15 text-[10px] font-mono text-white"
              >
                {CAMERA_MOVEMENT_OPTIONS.map((cm) => (
                  <option key={cm} value={cm}>
                    {cm}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Creative Direction Fields */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">
              Creative Direction
            </span>
            <button
              type="button"
              onClick={() => setShowStructuredFields((v) => !v)}
              className="text-[9px] font-mono text-white/50 hover:text-white flex items-center gap-0.5 cursor-pointer"
            >
              <span>{showStructuredFields ? 'Compact' : 'Structured'}</span>
              {showStructuredFields ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>

          <textarea
            rows={3}
            value={shot.mainPrompt}
            onChange={(e) => updateShot({ mainPrompt: e.target.value })}
            placeholder="Main shot prompt: describe subject, action, framing, lens feel, and atmosphere..."
            className="w-full px-2.5 py-2 bg-[#0b0d12] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-cyan-400"
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              disabled={isOptimizingPrompt || !compiledPrompt}
              onClick={() => onOptimizeShotPrompt(scene.id, shot.id)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-white/15 hover:border-cyan-400 text-[9px] font-mono uppercase text-white/85 cursor-pointer disabled:opacity-40"
            >
              {isOptimizingPrompt ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Wand2 className="w-3 h-3 text-cyan-400" />
              )}
              <span>Optimize Physics</span>
            </button>
            <button
              type="button"
              disabled={isSynthesizingKeyframe || !compiledPrompt}
              onClick={() => onSynthesizeKeyframeForShot(scene.id, shot.id)}
              title="Synthesize a start keyframe image and bind to this shot"
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 border border-white/15 hover:border-amber-400 text-[9px] font-mono uppercase text-white/85 cursor-pointer disabled:opacity-40"
            >
              {isSynthesizingKeyframe ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ImageIcon className="w-3 h-3 text-amber-400" />
              )}
              <span>Gen Keyframe</span>
            </button>
          </div>

          {showStructuredFields && (
            <div className="space-y-1.5 pt-1">
              <input
                type="text"
                value={shot.actionDescription}
                onChange={(e) => updateShot({ actionDescription: e.target.value })}
                placeholder="Action description (what happens beat by beat)..."
                className="w-full px-2 py-1 bg-[#0b0d12] border border-white/10 text-[11px] text-white"
              />
              <input
                type="text"
                value={shot.subjectMovement}
                onChange={(e) => updateShot({ subjectMovement: e.target.value })}
                placeholder="Subject movement (speed, direction, posture)..."
                className="w-full px-2 py-1 bg-[#0b0d12] border border-white/10 text-[11px] text-white"
              />
              <input
                type="text"
                value={shot.lightingDirection}
                onChange={(e) => updateShot({ lightingDirection: e.target.value })}
                placeholder="Lighting direction (key light, rim, contrast)..."
                className="w-full px-2 py-1 bg-[#0b0d12] border border-white/10 text-[11px] text-white"
              />
              <input
                type="text"
                value={shot.visualStyle}
                onChange={(e) => updateShot({ visualStyle: e.target.value })}
                placeholder="Visual style (35mm anamorphic, film stock, color)..."
                className="w-full px-2 py-1 bg-[#0b0d12] border border-white/10 text-[11px] text-white"
              />
            </div>
          )}
        </div>

        {/* Multimodal References for Shot */}
        <div className="space-y-1.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/50">
            Shot Reference Inputs
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {renderDropSlot(
              'start_frame',
              requiresStartImage ? 'Start Frame Image (Required)' : 'Start Frame Image',
              startImgAsset,
              false
            )}
            {(shot.generationMode === 'first-last-frame' || activeModel?.supportsLastImage) &&
              renderDropSlot('end_frame', 'Last Frame Image (Optional)', endImgAsset, false)}
            {shot.generationMode === 'video-to-video' &&
              renderDropSlot('video_ref', 'Source Video for Extension (Required)', refVideoAsset, true)}
          </div>

          {extraRefAssets.length > 0 && (
            <div className="p-2 border border-white/10 bg-[#0b0d12] space-y-1">
              <div className="text-[9px] font-mono uppercase text-white/50">
                Reference Plates ({extraRefAssets.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {extraRefAssets.map((a) => (
                  <div
                    key={a.id}
                    className="relative w-10 h-10 border border-white/15 overflow-hidden group"
                  >
                    <img src={a.url} alt={a.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() =>
                        updateShot({
                          extraReferenceAssetIds: shot.extraReferenceAssetIds.filter(
                            (id) => id !== a.id
                          ),
                        })
                      }
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-300 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Engine & Model Parameters */}
        <div className="p-2.5 border border-white/[0.1] bg-[#0b0d12] space-y-2.5">
          <div className="text-[9px] font-mono uppercase tracking-wider text-white/60 font-semibold">
            Seedance 2.5 Engine & Output
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="text-[9px] font-mono uppercase text-white/45">Provider</label>
              <select
                value={shot.providerId}
                onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
                className="w-full mt-0.5 px-2 py-1.5 bg-black/60 border border-white/15 text-xs font-mono text-white"
              >
                {providers.map((p) => (
                  <option key={p.providerId} value={p.providerId}>
                    {p.displayName} {p.sandboxMode ? '(Sandbox)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-white/45">Model</label>
              <select
                value={activeModel?.modelId || shot.modelId}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 bg-black/60 border border-white/15 text-xs font-mono text-white"
              >
                {availableModels.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <label className="text-[9px] font-mono uppercase text-white/45">Res</label>
              <select
                value={shot.resolution}
                onChange={(e) =>
                  updateShot({ resolution: e.target.value as GenerationResolution })
                }
                className="w-full mt-0.5 px-1.5 py-1 bg-black/60 border border-white/15 text-[11px] font-mono text-white"
              >
                {allowedResolutions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-white/45">Duration</label>
              <select
                value={shot.duration}
                onChange={(e) => updateShot({ duration: Number(e.target.value) })}
                className="w-full mt-0.5 px-1.5 py-1 bg-black/60 border border-white/15 text-[11px] font-mono text-white tabular-nums"
              >
                {allowedDurations.map((d) => (
                  <option key={d} value={d}>
                    {d}s
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-mono uppercase text-white/45">Ratio</label>
              <select
                value={shot.aspectRatio}
                disabled={shot.providerId === 'muapi'}
                onChange={(e) =>
                  updateShot({ aspectRatio: e.target.value as HybridAspectRatio })
                }
                className="w-full mt-0.5 px-1.5 py-1 bg-black/60 border border-white/15 text-[11px] font-mono text-white disabled:opacity-45"
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>
                    {ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model Capability Flags */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono pt-1">
            {activeModel?.supportsAudio && (
              <label className="flex items-center gap-1.5 text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shot.generateAudio}
                  onChange={(e) => updateShot({ generateAudio: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Audio Sync</span>
              </label>
            )}
            {activeModel?.supportsCameraFixed && (
              <label className="flex items-center gap-1.5 text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shot.cameraFixed}
                  onChange={(e) => updateShot({ cameraFixed: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Camera Lock</span>
              </label>
            )}
            {shot.providerId === 'bytedance' && (
              <label className="flex items-center gap-1.5 text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shot.physicsPriority}
                  onChange={(e) => updateShot({ physicsPriority: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Complex Physics</span>
              </label>
            )}
            {activeModel?.supportsDraftMode && (
              <label className="flex items-center gap-1.5 text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shot.draft}
                  onChange={(e) => updateShot({ draft: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>Draft Mode (480p)</span>
              </label>
            )}
            {activeModel?.supportsHighBitrate && !shot.draft && (
              <label className="flex items-center gap-1.5 text-white/75 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shot.highBitrate}
                  onChange={(e) => updateShot({ highBitrate: e.target.checked })}
                  className="accent-cyan-400"
                />
                <span>High Bitrate</span>
              </label>
            )}
          </div>

          {/* Expandable Advanced Settings */}
          {(workspaceMode === 'production' || showAdvancedSettings) && (
            <div className="pt-2 border-t border-white/[0.08] space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvancedSettings((v) => !v)}
                className="w-full flex items-center justify-between text-[9px] font-mono uppercase text-white/50 hover:text-white cursor-pointer"
              >
                <span>Advanced Settings</span>
                {showAdvancedSettings ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>

              {showAdvancedSettings && (
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  {shot.providerId === 'bytedance' && (
                    <div>
                      <label className="text-[9px] text-white/45">Quantity</label>
                      <select
                        value={shot.quantity}
                        onChange={(e) =>
                          updateShot({ quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                        className="w-full mt-0.5 px-1.5 py-1 bg-black/60 border border-white/15 text-white"
                      >
                        <option value={1}>1 Take</option>
                        <option value={2}>2 Takes</option>
                        <option value={3}>3 Takes</option>
                        <option value={4}>4 Takes</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[9px] text-white/45">Seed (Optional)</label>
                    <input
                      type="number"
                      value={shot.seed ?? ''}
                      onChange={(e) =>
                        updateShot({
                          seed: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="Auto"
                      className="w-full mt-0.5 px-1.5 py-1 bg-black/60 border border-white/15 text-white tabular-nums"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Price / Credits Estimate */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono">
            <span className="text-white/50">Estimated Cost</span>
            <span className="text-white font-semibold tabular-nums">
              {muapiPricePreview
                ? `$${muapiPricePreview.finalPriceUsd.toFixed(2)} USD`
                : `${shot.duration >= 20 ? 7 : 4} Credits`}
            </span>
          </div>

          {missingRequiredStartImage && (
            <div className="p-2 border border-amber-500/35 bg-amber-950/30 text-[10px] font-mono text-amber-200 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>
                Attach or synthesize a Start Frame Image before generating in{' '}
                {shot.providerId === 'muapi' ? 'MUAPI Spicy' : 'Image-to-Video'} mode.
              </span>
            </div>
          )}

          {missingRequiredVideo && (
            <div className="p-2 border border-amber-500/35 bg-amber-950/30 text-[10px] font-mono text-amber-200 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>Attach a Source Video asset to extend in Video Extension mode.</span>
            </div>
          )}

          {/* Primary Generate CTA */}
          <button
            type="button"
            disabled={
              isGenerating ||
              shot.status === 'PROCESSING' ||
              shot.status === 'QUEUED' ||
              !compiledPrompt ||
              missingRequiredStartImage ||
              missingRequiredVideo
            }
            onClick={() => onGenerateShot(scene.id, shot.id)}
            className="w-full py-2.5 bg-[#ECECE9] hover:bg-white text-black text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            {isGenerating || shot.status === 'PROCESSING' || shot.status === 'QUEUED' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Shot ({shot.progress || 10}%)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{shot.outputUrl ? 'Regenerate Shot' : 'Generate Shot'}</span>
              </>
            )}
          </button>
        </div>

        {/* Shot Takes / Version History */}
        {shot.versions.length > 0 && (
          <div className="border border-white/[0.1] bg-[#0b0d12]">
            <button
              type="button"
              onClick={() => setShowVersions((v) => !v)}
              className="w-full px-2.5 py-2 flex items-center justify-between text-[10px] font-mono uppercase text-white/75 hover:text-white cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3 h-3 text-cyan-400" />
                <span>Shot Takes ({shot.versions.length})</span>
              </span>
              {showVersions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showVersions && (
              <div className="border-t border-white/[0.08] divide-y divide-white/[0.06] max-h-40 overflow-y-auto">
                {shot.versions.map((ver) => {
                  const isActive = ver.id === shot.activeVersionId;
                  return (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => onSelectShotVersion(scene.id, shot.id, ver.id)}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 text-[10px] font-mono cursor-pointer ${
                        isActive
                          ? 'bg-cyan-500/15 text-cyan-200'
                          : 'text-white/65 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="truncate">
                        v{ver.versionNumber} · {ver.resolution} · {ver.duration}s
                      </span>
                      <span className="text-[9px] opacity-65 shrink-0">
                        {isActive ? 'ACTIVE' : 'USE'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
