import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Wand2,
  Sparkles,
  ScanEye,
  ChevronDown,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Loader2,
  Layers,
  Cpu,
  AlertCircle,
  X,
  Volume2,
  Lock,
} from 'lucide-react';
import {
  ActiveModelCapabilities,
  CanvasCenterStage,
  CanvasEstimateState,
  CanvasExperienceMode,
  CanvasGenerationConfig,
  CanvasRightSectionsState,
} from './canvasWorkspaceTypes';
import { CAMERA_MOVEMENTS, FILM_STOCK_LENSES, SCENE_DIRECTORS } from './canvasTypes';
import { GenerationResolution, ProviderConfigPublic } from '../../types/multiProvider';

interface CanvasRightSettingsPanelProps {
  experienceMode: CanvasExperienceMode;
  centerStage: CanvasCenterStage;
  minimized: boolean;
  onToggleMinimize: () => void;
  sections: CanvasRightSectionsState;
  onToggleSection: (key: keyof CanvasRightSectionsState) => void;
  width: number;
  providers: ProviderConfigPublic[];
  config: CanvasGenerationConfig;
  capabilities: ActiveModelCapabilities;
  estimateState: CanvasEstimateState;
  creditBalance?: number | null;
  isGenerating: boolean;
  isEnhancingPrompt: boolean;
  isAnalyzingMedia: boolean;
  onUpdateConfig: (patch: Partial<CanvasGenerationConfig>) => void;
  onSelectProviderAndModel: (providerId: string, modelId: string) => void;
  onEnhancePrompt: () => void;
  onAnalyzeAttachedMedia: () => void;
  onGenerateVideo: () => void;
  /** Optional Painter Layer/Brush slot rendered when user switches tab in Painter mode */
  painterInspectorSlot?: React.ReactNode;
  painterLayerCount?: number;
  // Mobile drawer / sheet controls
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const ASPECT_RATIOS = ['16:9', '9:16', '21:9', '4:3', '3:4', '1:1'] as const;

export const CanvasRightSettingsPanel: React.FC<CanvasRightSettingsPanelProps> = ({
  experienceMode,
  centerStage,
  minimized,
  onToggleMinimize,
  sections,
  onToggleSection,
  width,
  providers,
  config,
  capabilities,
  estimateState,
  creditBalance,
  isGenerating,
  isEnhancingPrompt,
  isAnalyzingMedia,
  onUpdateConfig,
  onSelectProviderAndModel,
  onEnhancePrompt,
  onAnalyzeAttachedMedia,
  onGenerateVideo,
  painterInspectorSlot,
  painterLayerCount = 1,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [rightTab, setRightTab] = useState<'generation' | 'painter'>('generation');
  const showPainterTabSwitch = centerStage === 'painter' && Boolean(painterInspectorSlot);
  const activeTab = showPainterTabSwitch ? rightTab : 'generation';

  const needsStartImageWarning =
    (capabilities.requiresStartImage || config.creationMode === 'image_to_video') &&
    !config.startImageUrl &&
    config.referenceImageUrls.length === 0;

  const missingExtensionVideo =
    config.creationMode === 'video_extension' && !config.extensionVideoUrl && !config.startImageUrl;

  const canSubmit =
    !isGenerating &&
    Boolean(config.prompt.trim()) &&
    !needsStartImageWarning &&
    !missingExtensionVideo;

  const renderBasicSettings = () => (
    <div className="space-y-3">
      {/* AI Provider + Model Selection */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
          AI Model Selection
        </label>
        <select
          value={`${config.providerId}::${config.modelId}`}
          onChange={(e) => {
            const [pId, mId] = e.target.value.split('::');
            if (pId && mId) onSelectProviderAndModel(pId, mId);
          }}
          className="w-full px-2.5 py-2 rounded-lg bg-[#090b10] border border-white/[0.14] text-xs text-white focus:outline-none focus:border-white/40 cursor-pointer"
        >
          {providers.map((prov) => (
            <optgroup key={prov.providerId} label={`${prov.displayName}`}>
              {prov.models
                .filter((m) => m.enabled)
                .map((m) => (
                  <option key={`${prov.providerId}::${m.modelId}`} value={`${prov.providerId}::${m.modelId}`}>
                    {prov.displayName} — {m.displayName}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {capabilities.model?.notes && experienceMode === 'advanced' && (
          <p className="text-[10px] text-white/45 leading-snug">{capabilities.model.notes}</p>
        )}
      </div>

      {/* Resolution & Duration Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-1">
            {capabilities.resolutions.map((res) => {
              const effectiveSelected =
                config.draft && capabilities.supportsDraftMode ? res === '480p' : config.resolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() =>
                    onUpdateConfig({
                      resolution: res as GenerationResolution,
                      draft: res === '480p' ? config.draft : false,
                    })
                  }
                  className={`py-1.5 rounded-md border text-[11px] font-mono tabular-nums cursor-pointer transition-colors ${
                    effectiveSelected
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-black/40 text-white/70 border-white/[0.1] hover:border-white/25 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
            Duration
          </label>
          <div className="grid grid-cols-2 gap-1">
            {capabilities.durations.map((dur) => {
              const selected = config.duration === dur;
              return (
                <button
                  key={dur}
                  type="button"
                  onClick={() => onUpdateConfig({ duration: dur })}
                  className={`py-1.5 rounded-md border text-[11px] font-mono tabular-nums cursor-pointer transition-colors ${
                    selected
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-black/40 text-white/70 border-white/[0.1] hover:border-white/25 hover:text-white'
                  }`}
                >
                  {dur}s
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aspect Ratio (only when supported by API — hidden on MUAPI I2V) */}
      {capabilities.supportsAspectRatio && (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-1">
            {ASPECT_RATIOS.map((ratio) => {
              const active = config.aspectRatio === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => onUpdateConfig({ aspectRatio: ratio })}
                  className={`py-1.5 rounded-md border text-[11px] font-mono tabular-nums cursor-pointer transition-colors ${
                    active
                      ? 'bg-white text-black border-white font-semibold'
                      : 'bg-black/40 text-white/70 border-white/[0.1] hover:border-white/25 hover:text-white'
                  }`}
                >
                  {ratio}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Generation Quantity (only when supported by API — ByteDance only) */}
      {capabilities.supportsQuantity && experienceMode === 'advanced' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-white/55">
            <span>Generation Quantity</span>
            <span className="tabular-nums text-white/80">{config.quantity} take{config.quantity > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onUpdateConfig({ quantity: q })}
                className={`py-1.5 rounded-md border text-[11px] font-mono tabular-nums cursor-pointer ${
                  config.quantity === q
                    ? 'bg-white text-black border-white font-semibold'
                    : 'bg-black/40 text-white/70 border-white/[0.1] hover:text-white'
                }`}
              >
                {q}×
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderPromptSettings = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-white/55">
            Main Prompt
          </label>
          <div className="flex items-center gap-1">
            {(config.startImageUrl || config.extensionVideoUrl) && (
              <button
                type="button"
                onClick={onAnalyzeAttachedMedia}
                disabled={isAnalyzingMedia}
                title="Inspect attached image/video to write prompt"
                className="px-2 py-0.5 rounded border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono text-white/80 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzingMedia ? <Loader2 className="w-3 h-3 animate-spin" /> : <ScanEye className="w-3 h-3" />}
                <span>Analyze</span>
              </button>
            )}
            <button
              type="button"
              onClick={onEnhancePrompt}
              disabled={isEnhancingPrompt || !config.prompt.trim()}
              title="Enhance physics & cinematic motion details"
              className="px-2 py-0.5 rounded border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono text-white/80 flex items-center gap-1 cursor-pointer disabled:opacity-40"
            >
              {isEnhancingPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              <span>Enhance</span>
            </button>
          </div>
        </div>
        <textarea
          rows={experienceMode === 'simple' ? 4 : 5}
          value={config.prompt}
          onChange={(e) => onUpdateConfig({ prompt: e.target.value })}
          placeholder={
            capabilities.requiresStartImage
              ? 'Describe subject motion, lighting shifts, cloth/hair physics, and camera trajectory...'
              : 'Describe subject, action, environment lighting, camera motion, and physics...'
          }
          className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-white/[0.14] text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 leading-relaxed resize-y"
        />
      </div>

      {/* Scene Description & Visual Style shown cleanly in Advanced Mode */}
      {experienceMode === 'advanced' && (
        <>
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
              Scene Description & Continuity Notes
            </label>
            <textarea
              rows={2}
              value={config.sceneDescription}
              onChange={(e) => onUpdateConfig({ sceneDescription: e.target.value })}
              placeholder="Optional lighting, blocking, or Scene N+1 continuity notes..."
              className="w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/35 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
                Visual Style
              </label>
              <select
                value={config.visualStyleId}
                onChange={(e) => onUpdateConfig({ visualStyleId: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#090b10] border border-white/[0.12] text-xs text-white focus:outline-none"
              >
                <option value="">Clean Naturalist (Default)</option>
                {SCENE_DIRECTORS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} · {d.contrastRatio}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-3 text-xs">
      {/* Camera Movement + Camera Fixed */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-white/55 block">
          Camera Movement
        </label>
        <select
          value={config.cameraMovementId}
          onChange={(e) => {
            const spec = CAMERA_MOVEMENTS.find((c) => c.id === e.target.value);
            onUpdateConfig({
              cameraMovementId: e.target.value,
              cameraFixed: spec ? spec.cameraFixed : config.cameraFixed,
            });
          }}
          className="w-full px-2.5 py-1.5 rounded-lg bg-[#090b10] border border-white/[0.12] text-xs text-white focus:outline-none"
        >
          <option value="">Prompt-Controlled Camera</option>
          {CAMERA_MOVEMENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {experienceMode === 'advanced' && (
          <select
            value={config.filmStockId}
            onChange={(e) => onUpdateConfig({ filmStockId: e.target.value })}
            className="w-full px-2.5 py-1.5 rounded-lg bg-[#090b10] border border-white/[0.12] text-xs text-white focus:outline-none"
          >
            <option value="">Standard Digital Cinema Optics</option>
            {FILM_STOCK_LENSES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Supported boolean parameter switches */}
      <div className="space-y-1.5">
        {capabilities.supportsCameraFixed && (
          <label className="flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-black/40 cursor-pointer">
            <span className="flex items-center gap-2 text-[11px] text-white/85">
              <Lock className="w-3.5 h-3.5 text-white/50" />
              <span>Lock Camera Position (camera_fixed)</span>
            </span>
            <input
              type="checkbox"
              checked={config.cameraFixed}
              onChange={(e) => onUpdateConfig({ cameraFixed: e.target.checked })}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </label>
        )}

        {capabilities.supportsAudio && (
          <label className="flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-black/40 cursor-pointer">
            <span className="flex items-center gap-2 text-[11px] text-white/85">
              <Volume2 className="w-3.5 h-3.5 text-white/50" />
              <span>Generate Native Audio</span>
            </span>
            <input
              type="checkbox"
              checked={config.generateAudio}
              onChange={(e) => onUpdateConfig({ generateAudio: e.target.checked })}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </label>
        )}

        {capabilities.supportsPhysicsPriority && (
          <label className="flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-black/40 cursor-pointer">
            <span className="text-[11px] text-white/85">Complex Physics Priority</span>
            <input
              type="checkbox"
              checked={config.physicsPriority}
              onChange={(e) => onUpdateConfig({ physicsPriority: e.target.checked })}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </label>
        )}

        {capabilities.supportsHighBitrate && (
          <label className="flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-black/40 cursor-pointer">
            <span className="text-[11px] text-white/85">High Bitrate Mastering</span>
            <input
              type="checkbox"
              checked={config.highBitrate}
              onChange={(e) => onUpdateConfig({ highBitrate: e.target.checked })}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </label>
        )}

        {capabilities.supportsDraftMode && (
          <label className="flex items-center justify-between p-2 rounded-lg border border-white/[0.08] bg-black/40 cursor-pointer">
            <div>
              <div className="text-[11px] text-white/85">480p Fast Draft Preview</div>
              <div className="text-[9px] text-white/45">Preview fast & finalize 1080p after</div>
            </div>
            <input
              type="checkbox"
              checked={config.draft}
              onChange={(e) => onUpdateConfig({ draft: e.target.checked })}
              className="w-4 h-4 accent-white cursor-pointer"
            />
          </label>
        )}
      </div>

      {/* ByteDance-only Seed & Content Rating */}
      {capabilities.supportsSeed && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-white/55 block">Seed (Opt)</label>
            <input
              type="text"
              inputMode="numeric"
              value={config.seedInput}
              onChange={(e) => onUpdateConfig({ seedInput: e.target.value.replace(/[^0-9-]/g, '') })}
              placeholder="Auto (-1)"
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/[0.12] text-xs font-mono text-white placeholder:text-white/30 focus:outline-none"
            />
          </div>
          {capabilities.supportsContentRating && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-white/55 block">Safety Mode</label>
              <select
                value={config.contentRating}
                onChange={(e) =>
                  onUpdateConfig({ contentRating: e.target.value === '18+' ? '18+' : 'standard' })
                }
                className="w-full px-2 py-1.5 rounded-lg bg-[#090b10] border border-white/[0.12] text-xs font-mono text-white focus:outline-none"
              >
                <option value="standard">Standard</option>
                <option value="18+">Extended (18+)</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* MUAPI-only Draft Request ID link */}
      {capabilities.supportsDraftMode && experienceMode === 'advanced' && (
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-white/55 block">
            Draft Request ID (Optional)
          </label>
          <input
            type="text"
            value={config.draftRequestId}
            onChange={(e) => onUpdateConfig({ draftRequestId: e.target.value })}
            placeholder="Upgrade an existing MUAPI draft ID"
            className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/[0.12] text-xs font-mono text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
      )}
    </div>
  );

  const settingsPanelContent = (
    <>
      {showPainterTabSwitch && (
        <div className="grid grid-cols-2 border-b border-white/[0.08] text-[11px] font-mono shrink-0">
          <button
            type="button"
            onClick={() => setRightTab('generation')}
            className={`py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'generation'
                ? 'bg-white/[0.08] text-white font-semibold border-b-2 border-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate</span>
          </button>
          <button
            type="button"
            onClick={() => setRightTab('painter')}
            className={`py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'painter'
                ? 'bg-white/[0.08] text-white font-semibold border-b-2 border-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers ({painterLayerCount})</span>
          </button>
        </div>
      )}

      {activeTab === 'painter' && painterInspectorSlot ? (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">{painterInspectorSlot}</div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {/* Group 1: Basic Settings */}
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleSection('basic')}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
                  Basic Settings
                </span>
                {sections.basic ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>
              {sections.basic && <div className="px-3 pb-3">{renderBasicSettings()}</div>}
            </section>

            {/* Group 2: Prompt Settings */}
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleSection('prompt')}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
                  Prompt Settings
                </span>
                {sections.prompt ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>
              {sections.prompt && <div className="px-3 pb-3">{renderPromptSettings()}</div>}
            </section>

            {/* Group 3: Advanced Settings (Collapsed by Default) */}
            <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
              <button
                type="button"
                onClick={() => onToggleSection('advanced')}
                className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
                  Advanced Settings
                </span>
                {sections.advanced ? (
                  <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-white/50" />
                )}
              </button>
              {sections.advanced && <div className="px-3 pb-3">{renderAdvancedSettings()}</div>}
            </section>
          </div>

          {/* Pinned Bottom Generation Action Dock */}
          <div className="p-3 border-t border-white/[0.1] bg-[#080a0f] space-y-2.5 shrink-0">
            {(needsStartImageWarning || missingExtensionVideo) && (
              <div className="px-2.5 py-2 rounded-lg border border-amber-400/30 bg-amber-950/30 text-[11px] text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-300" />
                <span>
                  {needsStartImageWarning
                    ? 'Attach a Start Frame image from the stage or Assets library to generate.'
                    : 'Attach a Source Video or Start Frame to extend the scene.'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-mono text-white/65">
              <span>Estimated Cost</span>
              <span className="text-white font-semibold tabular-nums">
                {estimateState.loading
                  ? 'Calculating...'
                  : estimateState.estimate?.displayLabel ||
                    (capabilities.isMuapi ? 'USD Matrix' : 'Seedance Credits')}
              </span>
            </div>

            {typeof creditBalance === 'number' && !capabilities.isMuapi && (
              <div className="flex items-center justify-between text-[10px] font-mono text-white/45">
                <span>Available Credits</span>
                <span className="tabular-nums">{creditBalance.toLocaleString()}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onGenerateVideo}
              disabled={!canSubmit}
              className="w-full h-10 rounded-lg bg-[#ecece9] hover:bg-white disabled:bg-white/20 disabled:text-white/45 text-black text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Generate Video</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* DESKTOP RIGHT PANEL */}
      {minimized ? (
        <aside
          aria-label="Generation Settings Minimized"
          className="hidden lg:flex w-[54px] bg-[#0b0d12] border-l border-white/[0.1] flex-col items-center py-2.5 gap-2 shrink-0 z-10 transition-all duration-150"
        >
          <button
            type="button"
            onClick={onToggleMinimize}
            title="Restore Generation Settings"
            className="w-9 h-9 rounded-lg border border-white/[0.14] bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>
          <div className="w-7 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => {
              onToggleMinimize();
              if (!sections.basic) onToggleSection('basic');
            }}
            title="Basic Settings"
            className="w-9 h-9 rounded-lg text-white/65 hover:text-white hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <Cpu className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleMinimize();
              if (!sections.prompt) onToggleSection('prompt');
            }}
            title="Prompt Settings"
            className="w-9 h-9 rounded-lg text-white/65 hover:text-white hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleMinimize();
              if (!sections.advanced) onToggleSection('advanced');
            }}
            title="Advanced Settings"
            className="w-9 h-9 rounded-lg text-white/65 hover:text-white hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="mt-auto pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onGenerateVideo}
              disabled={!canSubmit}
              title="Generate Video"
              className="w-9 h-9 rounded-lg bg-[#ecece9] hover:bg-white disabled:bg-white/20 text-black flex items-center justify-center cursor-pointer"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
          </div>
        </aside>
      ) : (
        <aside
          aria-label="Generation Settings"
          style={{ width }}
          className="hidden lg:flex bg-[#0b0d12] border-l border-white/[0.1] flex-col shrink-0 z-10 overflow-hidden transition-[width] duration-150"
        >
          <div className="h-11 px-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/65 font-semibold">
              {activeTab === 'painter' ? 'Layer & Brush Dock' : 'Generation Settings'}
            </span>
            <button
              type="button"
              onClick={onToggleMinimize}
              title="Minimize Right Panel"
              className="w-7 h-7 rounded-md border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.1] flex items-center justify-center text-white/65 hover:text-white cursor-pointer"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          {settingsPanelContent}
        </aside>
      )}

      {/* TABLET / MOBILE DRAWER */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center sm:justify-end lg:hidden"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-96 h-[86vh] sm:h-full bg-[#0b0d12] border-t sm:border-t-0 sm:border-l border-white/15 rounded-t-2xl sm:rounded-none flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between shrink-0">
              <span className="text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold">
                {activeTab === 'painter' ? 'Layer & Brush Dock' : 'Generation Settings'}
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {settingsPanelContent}
          </aside>
        </div>
      )}
    </>
  );
};
