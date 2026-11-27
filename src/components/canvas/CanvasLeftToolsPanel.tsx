import React, { useState } from 'react';
import {
  Type,
  Image as ImageIcon,
  Layers,
  Film,
  Upload,
  Sparkles,
  UserCheck,
  Clapperboard,
  Camera,
  Wind,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Video,
  PenTool,
  X,
  Check,
} from 'lucide-react';
import {
  ActiveModelCapabilities,
  CanvasAssetItem,
  CanvasCreationMode,
  CanvasExperienceMode,
  CanvasGenerationConfig,
  CanvasLeftSectionsState,
} from './canvasWorkspaceTypes';
import { CAMERA_MOVEMENTS, SCENE_DIRECTORS } from './canvasTypes';

interface CanvasLeftToolsPanelProps {
  experienceMode: CanvasExperienceMode;
  minimized: boolean;
  onToggleMinimize: () => void;
  sections: CanvasLeftSectionsState;
  onToggleSection: (key: keyof CanvasLeftSectionsState) => void;
  width: number;
  compactToolbar: boolean;
  config: CanvasGenerationConfig;
  capabilities: ActiveModelCapabilities;
  assets: CanvasAssetItem[];
  isUploadingMedia: boolean;
  onSelectCreationMode: (mode: CanvasCreationMode) => void;
  onUploadFiles: (files: FileList | null) => void;
  onOpenAiPlateModal: () => void;
  onCapturePainterFrame: () => void;
  onAttachAssetAsStart: (asset: CanvasAssetItem) => void;
  onAttachAssetAsEnd: (asset: CanvasAssetItem) => void;
  onAddAssetAsReference: (asset: CanvasAssetItem) => void;
  onAttachAssetAsExtensionVideo: (asset: CanvasAssetItem) => void;
  onUpdateConfig: (patch: Partial<CanvasGenerationConfig>) => void;
  onFocusAdvancedSettings: () => void;
  onSwitchCenterStage: (stage: 'stage' | 'workflow' | 'painter') => void;
  // Mobile drawer controls
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

const CREATION_OPTIONS: Array<{
  id: CanvasCreationMode;
  label: string;
  shortLabel: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'text_to_video',
    label: 'Text to Video',
    shortLabel: 'Text',
    desc: 'Generate directly from prompt',
    icon: Type,
  },
  {
    id: 'image_to_video',
    label: 'Image to Video',
    shortLabel: 'Image',
    desc: 'Animate start & optional end frame',
    icon: ImageIcon,
  },
  {
    id: 'reference_to_video',
    label: 'Reference to Video',
    shortLabel: 'Refs',
    desc: 'Lock up to 30 @Image plates',
    icon: Layers,
  },
  {
    id: 'video_extension',
    label: 'Video Extension',
    shortLabel: 'Extend',
    desc: 'Continue clip seamlessly',
    icon: Film,
  },
];

export const CanvasLeftToolsPanel: React.FC<CanvasLeftToolsPanelProps> = ({
  experienceMode,
  minimized,
  onToggleMinimize,
  sections,
  onToggleSection,
  width,
  compactToolbar,
  config,
  capabilities,
  assets,
  isUploadingMedia,
  onSelectCreationMode,
  onUploadFiles,
  onOpenAiPlateModal,
  onCapturePainterFrame,
  onAttachAssetAsStart,
  onAttachAssetAsEnd,
  onAddAssetAsReference,
  onAttachAssetAsExtensionVideo,
  onUpdateConfig,
  onFocusAdvancedSettings,
  onSwitchCenterStage,
  isMobileOpen,
  onCloseMobile,
}) => {
  const [assetTab, setAssetTab] = useState<'all' | 'image' | 'video' | 'uploaded'>('all');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const filteredAssets = assets.filter((item) => {
    if (assetTab === 'image') return item.kind === 'image' || item.kind === 'canvas_frame';
    if (assetTab === 'video') return item.kind === 'video';
    if (assetTab === 'uploaded') return item.source === 'uploaded' || item.source === 'canvas';
    return true;
  });

  const renderCreationList = () => (
    <div className="space-y-1.5">
      {CREATION_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = config.creationMode === opt.id;
        const isSpicyOnlyI2V =
          capabilities.isMuapi && (opt.id === 'text_to_video' || opt.id === 'reference_to_video');

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelectCreationMode(opt.id)}
            title={
              isSpicyOnlyI2V
                ? `${opt.label} (switches to ByteDance Seedance 2.5)`
                : opt.desc
            }
            className={`w-full text-left rounded-lg border transition-colors duration-150 cursor-pointer flex items-center gap-2.5 ${
              compactToolbar ? 'px-2.5 py-2' : 'px-3 py-2.5'
            } ${
              active
                ? 'border-white/40 bg-white/[0.1] text-white'
                : 'border-white/[0.08] bg-white/[0.02] text-white/75 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-white/55'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-medium truncate">
                  {compactToolbar ? opt.shortLabel : opt.label}
                </span>
                {isSpicyOnlyI2V && (
                  <span className="text-[9px] font-mono text-white/45 shrink-0">ByteDance</span>
                )}
              </div>
              {!compactToolbar && (
                <div className="text-[10px] text-white/45 truncate mt-0.5">{opt.desc}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );

  const renderAssetsSection = () => (
    <div className="space-y-2.5">
      {/* Compact filter tabs */}
      <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-black/50 border border-white/[0.08] text-[10px] font-mono">
        {(['all', 'image', 'video', 'uploaded'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setAssetTab(tab)}
            className={`py-1 rounded uppercase tracking-wider cursor-pointer transition-colors ${
              assetTab === tab ? 'bg-white text-black font-semibold' : 'text-white/55 hover:text-white'
            }`}
          >
            {tab === 'uploaded' ? 'Files' : tab}
          </button>
        ))}
      </div>

      {/* Quick Import / Capture Actions */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingMedia}
          className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-[11px] font-mono text-white/85 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isUploadingMedia ? 'Uploading...' : 'Upload'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenAiPlateModal}
          className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-[11px] font-mono text-white/85 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">AI Plate</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onCapturePainterFrame}
        className="w-full h-8 px-2.5 rounded-lg border border-white/[0.08] bg-black/40 hover:bg-white/[0.06] text-[10px] font-mono text-white/70 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <PenTool className="w-3 h-3 shrink-0" />
        <span>Use Current Painted Frame</span>
      </button>

      {/* Asset List */}
      {filteredAssets.length === 0 ? (
        <div className="p-3 rounded-lg border border-dashed border-white/[0.1] text-center text-[11px] text-white/40">
          No {assetTab === 'all' ? 'media' : assetTab} assets yet. Upload images/videos or generate a clip.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {filteredAssets.map((asset) => {
            const isStart = config.startImageUrl === asset.url;
            const isEnd = config.endImageUrl === asset.url;
            const isRef = config.referenceImageUrls.includes(asset.url);
            const isExt = config.extensionVideoUrl === asset.url;

            return (
              <div
                key={asset.id}
                className="p-2 rounded-lg border border-white/[0.08] bg-black/40 hover:border-white/20 transition-colors space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded bg-[#10131b] border border-white/[0.08] overflow-hidden shrink-0 flex items-center justify-center">
                    {asset.kind === 'video' ? (
                      asset.thumbnailUrl ? (
                        <img src={asset.thumbnailUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <Video className="w-4 h-4 text-white/55" />
                      )
                    ) : (
                      <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-medium text-white truncate">{asset.name}</div>
                    <div className="text-[9px] font-mono text-white/45 uppercase">
                      {asset.kind === 'video' ? 'Video' : 'Image'} · {asset.source.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                {/* Attach controls */}
                <div className="flex flex-wrap items-center gap-1">
                  {asset.kind !== 'video' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onAttachAssetAsStart(asset)}
                        className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer border transition-colors ${
                          isStart
                            ? 'bg-white text-black border-white font-semibold'
                            : 'border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                        }`}
                      >
                        {isStart ? 'Start ✓' : 'Start'}
                      </button>
                      {capabilities.supportsLastImage && (
                        <button
                          type="button"
                          onClick={() => onAttachAssetAsEnd(asset)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer border transition-colors ${
                            isEnd
                              ? 'bg-white text-black border-white font-semibold'
                              : 'border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                          }`}
                        >
                          {isEnd ? 'End ✓' : 'End'}
                        </button>
                      )}
                      {capabilities.supportsReferencePlates && (
                        <button
                          type="button"
                          onClick={() => onAddAssetAsReference(asset)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer border transition-colors ${
                            isRef
                              ? 'bg-white/20 text-white border-white/40 font-semibold'
                              : 'border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                          }`}
                        >
                          {isRef ? '@Ref ✓' : '+ @Ref'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAttachAssetAsExtensionVideo(asset)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer border transition-colors ${
                        isExt
                          ? 'bg-white text-black border-white font-semibold'
                          : 'border-white/[0.12] bg-white/[0.03] text-white/75 hover:text-white'
                      }`}
                    >
                      {isExt ? 'Extend Clip ✓' : 'Extend Clip'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderAdvancedTools = () => (
    <div className="space-y-2 text-xs">
      {/* Character Consistency */}
      <div className="p-2.5 rounded-lg border border-white/[0.08] bg-black/40 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
          <UserCheck className="w-3.5 h-3.5 text-white/70" />
          <span>Character Consistency</span>
        </div>
        <select
          value={config.visualStyleId}
          onChange={(e) => onUpdateConfig({ visualStyleId: e.target.value })}
          className="w-full px-2 py-1.5 rounded bg-[#090b10] border border-white/[0.12] text-[11px] text-white focus:outline-none"
        >
          <option value="">Default Neutral Styling</option>
          {SCENE_DIRECTORS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {capabilities.supportsReferencePlates && (
          <button
            type="button"
            onClick={() => {
              const handleTag = '@Image1 identity & garment lock: preserve exact facial geometry and textures. ';
              if (!config.prompt.includes('@Image1')) {
                onUpdateConfig({ prompt: `${handleTag}${config.prompt}`.trim() });
              }
            }}
            className="w-full py-1 px-2 rounded border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/75 hover:text-white cursor-pointer"
          >
            Insert @Image1 Identity Anchor
          </button>
        )}
      </div>

      {/* Scene Control */}
      <div className="p-2.5 rounded-lg border border-white/[0.08] bg-black/40 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-medium text-white">
          <span className="flex items-center gap-1.5">
            <Clapperboard className="w-3.5 h-3.5 text-white/70" />
            <span>Scene Control</span>
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onSwitchCenterStage('workflow')}
            className="py-1.5 px-2 rounded border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/80 cursor-pointer"
          >
            Node DAG
          </button>
          <button
            type="button"
            onClick={() => onSwitchCenterStage('painter')}
            className="py-1.5 px-2 rounded border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/80 cursor-pointer"
          >
            Plate Painter
          </button>
        </div>
      </div>

      {/* Camera Direction */}
      <div className="p-2.5 rounded-lg border border-white/[0.08] bg-black/40 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
          <Camera className="w-3.5 h-3.5 text-white/70" />
          <span>Camera Direction</span>
        </div>
        <select
          value={config.cameraMovementId}
          onChange={(e) => {
            const spec = CAMERA_MOVEMENTS.find((c) => c.id === e.target.value);
            onUpdateConfig({
              cameraMovementId: e.target.value,
              cameraFixed: spec ? spec.cameraFixed : config.cameraFixed,
            });
          }}
          className="w-full px-2 py-1.5 rounded bg-[#090b10] border border-white/[0.12] text-[11px] text-white focus:outline-none"
        >
          <option value="">Auto Camera Trajectory</option>
          {CAMERA_MOVEMENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Motion Control */}
      <div className="p-2.5 rounded-lg border border-white/[0.08] bg-black/40 space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-white">
          <Wind className="w-3.5 h-3.5 text-white/70" />
          <span>Motion Control</span>
        </div>
        {capabilities.supportsPhysicsPriority ? (
          <button
            type="button"
            onClick={() => onUpdateConfig({ physicsPriority: !config.physicsPriority })}
            className={`w-full py-1.5 px-2 rounded border text-[10px] font-mono flex items-center justify-between cursor-pointer ${
              config.physicsPriority
                ? 'border-white/40 bg-white/[0.1] text-white'
                : 'border-white/[0.1] bg-black/40 text-white/60'
            }`}
          >
            <span>Complex Physics Priority</span>
            <span>{config.physicsPriority ? <Check className="w-3 h-3" /> : 'OFF'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onUpdateConfig({ highBitrate: !config.highBitrate })}
            className={`w-full py-1.5 px-2 rounded border text-[10px] font-mono flex items-center justify-between cursor-pointer ${
              config.highBitrate
                ? 'border-white/40 bg-white/[0.1] text-white'
                : 'border-white/[0.1] bg-black/40 text-white/60'
            }`}
          >
            <span>High Bitrate Mastering</span>
            <span>{config.highBitrate ? <Check className="w-3 h-3" /> : 'OFF'}</span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onFocusAdvancedSettings}
        className="w-full py-2 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-[10px] font-mono uppercase tracking-wider text-white/85 flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Open Advanced Parameters</span>
      </button>
    </div>
  );

  const fullPanelBody = (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
      {/* Category A: Creation */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleSection('creation')}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
            Creation
          </span>
          {sections.creation ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/50" />
          )}
        </button>
        {sections.creation && <div className="px-2.5 pb-2.5">{renderCreationList()}</div>}
      </section>

      {/* Category B: Assets */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleSection('assets')}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
            Assets ({assets.length})
          </span>
          {sections.assets ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/50" />
          )}
        </button>
        {sections.assets && <div className="px-2.5 pb-2.5">{renderAssetsSection()}</div>}
      </section>

      {/* Category C: Advanced Tools */}
      <section className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
        <button
          type="button"
          onClick={() => onToggleSection('advancedTools')}
          className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-mono uppercase tracking-wider text-white/80 font-semibold">
            {experienceMode === 'simple' ? 'Production Tools' : 'Advanced Tools'}
          </span>
          {sections.advancedTools ? (
            <ChevronDown className="w-3.5 h-3.5 text-white/50" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-white/50" />
          )}
        </button>
        {sections.advancedTools && <div className="px-2.5 pb-2.5">{renderAdvancedTools()}</div>}
      </section>
    </div>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => {
          onUploadFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* DESKTOP LEFT PANEL (Expanded OR Compact Minimized Icon Strip) */}
      {minimized ? (
        <aside
          aria-label="Production Tools Minimized"
          className="hidden lg:flex w-[54px] bg-[#0b0d12] border-r border-white/[0.1] flex-col items-center py-2.5 gap-2 shrink-0 z-10 transition-all duration-150"
        >
          <button
            type="button"
            onClick={onToggleMinimize}
            title="Restore Production Tools Panel"
            className="w-9 h-9 rounded-lg border border-white/[0.14] bg-white/[0.05] hover:bg-white/[0.12] flex items-center justify-center text-white/80 hover:text-white cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          <div className="w-7 h-px bg-white/10" />
          {CREATION_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = config.creationMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectCreationMode(opt.id)}
                title={opt.label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  active ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
          <div className="w-7 h-px bg-white/10" />
          <button
            type="button"
            onClick={() => {
              onToggleMinimize();
              if (!sections.assets) onToggleSection('assets');
            }}
            title="Assets Library"
            className="w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              onToggleMinimize();
              if (!sections.advancedTools) onToggleSection('advancedTools');
            }}
            title="Advanced Tools"
            className="w-9 h-9 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] flex items-center justify-center cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </aside>
      ) : (
        <aside
          aria-label="Production Tools"
          style={{ width }}
          className="hidden lg:flex bg-[#0b0d12] border-r border-white/[0.1] flex-col shrink-0 z-10 overflow-hidden transition-[width] duration-150"
        >
          <div className="h-11 px-3 border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/65 font-semibold">
              Production Tools
            </span>
            <button
              type="button"
              onClick={onToggleMinimize}
              title="Minimize Left Panel"
              className="w-7 h-7 rounded-md border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.1] flex items-center justify-center text-white/65 hover:text-white cursor-pointer"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </div>
          {fullPanelBody}
        </aside>
      )}

      {/* TABLET / MOBILE DRAWER */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex lg:hidden"
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="w-[86vw] max-w-xs h-full bg-[#0b0d12] border-r border-white/15 flex flex-col shadow-2xl"
          >
            <div className="h-12 px-3.5 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.16em] text-white font-semibold">
                Production Tools
              </span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg border border-white/15 flex items-center justify-center text-white/75 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {fullPanelBody}
          </aside>
        </div>
      )}
    </>
  );
};
