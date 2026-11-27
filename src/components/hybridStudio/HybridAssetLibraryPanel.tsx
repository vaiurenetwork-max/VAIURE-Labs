/**
 * VAIURE HYBRID STUDIO — Reference, Asset Library & Continuity Panel
 * Supports categorized media uploads, drag-and-drop / click binding to Shots & Scenes,
 * plus persistent Character Continuity and Scene/Environment Continuity anchors.
 */

import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Film,
  Music,
  UserCheck,
  MapPin,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ArrowRight,
  Layers,
  Link2,
  Wand2,
} from 'lucide-react';
import {
  HybridAsset,
  HybridAssetCategory,
  HybridCharacterProfile,
  HybridEnvironmentProfile,
  HybridProductionProject,
  HybridScene,
  HybridShot,
} from '../../types/hybridStudio';

const ASSET_CATEGORIES: Array<'ALL' | HybridAssetCategory> = [
  'ALL',
  'Reference Image',
  'Reference Video',
  'Character Image',
  'Character Video',
  'Environment Reference',
  'Cinematic Reference',
  'Existing Footage',
  'Audio File',
  'Generated Result',
];

interface HybridAssetLibraryPanelProps {
  project: HybridProductionProject;
  activeScene?: HybridScene;
  activeShot?: HybridShot;
  isUploading: boolean;
  forcedTab?: 'assets' | 'continuity';
  forcedCategoryFilter?: 'ALL' | HybridAssetCategory;
  onUploadFiles: (files: FileList, category: HybridAssetCategory, folder?: string) => void;
  onDeleteAsset: (assetId: string) => void;
  onOpenInVideoTransform?: (asset: HybridAsset) => void;
  onAssignAssetToShot: (
    asset: HybridAsset,
    slot: 'start_frame' | 'end_frame' | 'reference_plate' | 'video_ref' | 'timeline'
  ) => void;
  onUpsertCharacter: (char: HybridCharacterProfile) => void;
  onDeleteCharacter: (charId: string) => void;
  onToggleCharacterOnShot: (charId: string) => void;
  onUpsertEnvironment: (env: HybridEnvironmentProfile) => void;
  onDeleteEnvironment: (envId: string) => void;
  onAssignEnvironmentToShot: (envId?: string) => void;
}

export const HybridAssetLibraryPanel: React.FC<HybridAssetLibraryPanelProps> = ({
  project,
  activeScene,
  activeShot,
  isUploading,
  forcedTab,
  forcedCategoryFilter,
  onUploadFiles,
  onDeleteAsset,
  onOpenInVideoTransform,
  onAssignAssetToShot,
  onUpsertCharacter,
  onDeleteCharacter,
  onToggleCharacterOnShot,
  onUpsertEnvironment,
  onDeleteEnvironment,
  onAssignEnvironmentToShot,
}) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'continuity'>('assets');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | HybridAssetCategory>('ALL');
  const [folderFilter, setFolderFilter] = useState<string>('ALL');
  const [uploadCategory, setUploadCategory] = useState<HybridAssetCategory>('Reference Image');
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (forcedTab) setActiveTab(forcedTab);
  }, [forcedTab]);

  React.useEffect(() => {
    if (forcedCategoryFilter) setCategoryFilter(forcedCategoryFilter);
  }, [forcedCategoryFilter]);

  // Quick character & location creation forms
  const [charName, setCharName] = useState('');
  const [charAppearance, setCharAppearance] = useState('');
  const [charWardrobe, setCharWardrobe] = useState('');

  const [envName, setEnvName] = useState('');
  const [envTime, setEnvTime] = useState('Night / Golden Hour');
  const [envLighting, setEnvLighting] = useState('');

  const folders = project.assetFolders && project.assetFolders.length > 0
    ? project.assetFolders
    : ['Raw Footage', 'Transformations', 'Sets & Plates', 'Audio & Score'];

  const filteredAssets = project.assets.filter((a) => {
    const catOk = categoryFilter === 'ALL' || a.category === categoryFilter;
    const folderOk = folderFilter === 'ALL' || (a.folder || 'Raw Footage') === folderFilter;
    return catOk && folderOk;
  });

  const handleAddCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;
    onUpsertCharacter({
      id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: charName.trim(),
      role: 'Principal Subject',
      appearancePrompt: charAppearance.trim(),
      wardrobeNotes: charWardrobe.trim(),
      referenceImageAssetIds: [],
      locked: true,
    });
    setCharName('');
    setCharAppearance('');
    setCharWardrobe('');
  };

  const handleAddEnvironment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!envName.trim()) return;
    onUpsertEnvironment({
      id: `env-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: envName.trim(),
      timeOfDay: envTime.trim() || 'Daylight',
      lightingNotes: envLighting.trim(),
      atmospherePrompt: '',
      locked: true,
    });
    setEnvName('');
    setEnvLighting('');
  };

  return (
    <aside className="w-full h-full bg-[#07080b] border-r border-white/[0.1] flex flex-col overflow-hidden select-none">
      {/* Top Tabs */}
      <div className="h-10 px-2 border-b border-white/[0.1] flex items-center gap-1 bg-[#0b0d12] shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('assets')}
          className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'assets'
              ? 'bg-[#ECECE9] text-black font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Assets ({project.assets.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('continuity')}
          className={`flex-1 py-1.5 text-[10px] font-mono uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'continuity'
              ? 'bg-[#ECECE9] text-black font-semibold'
              : 'text-white/60 hover:text-white'
          }`}
        >
          Continuity ({project.characters.length + project.environments.length})
        </button>
      </div>

      {activeTab === 'assets' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Upload Controls */}
          <div className="p-2.5 border-b border-white/[0.08] space-y-2 shrink-0 bg-black/20">
            <div className="flex items-center gap-1.5">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value as HybridAssetCategory)}
                className="flex-1 min-w-0 px-2 py-1.5 bg-[#0b0d12] border border-white/[0.12] text-[10px] font-mono text-white/85 focus:outline-none"
              >
                {ASSET_CATEGORIES.filter((c) => c !== 'ALL' && c !== 'Generated Result').map(
                  (cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  )
                )}
              </select>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white hover:text-black border border-white/15 text-[10px] font-mono uppercase text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <Upload className="w-3 h-3" />
                <span>{isUploading ? 'Uploading' : 'Upload'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onUploadFiles(e.target.files, uploadCategory);
                    e.target.value = '';
                  }
                }}
              />
            </div>

            {/* Category & Folder Filters */}
            <div className="grid grid-cols-2 gap-1.5">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="w-full px-2 py-1 bg-black/40 border border-white/[0.08] text-[10px] font-mono text-white/65 focus:outline-none"
              >
                {ASSET_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={folderFilter}
                onChange={(e) => setFolderFilter(e.target.value)}
                className="w-full px-2 py-1 bg-black/40 border border-white/[0.08] text-[10px] font-mono text-white/65 focus:outline-none"
              >
                <option value="ALL">All Folders</option>
                {folders.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Shot Context */}
          <div className="px-2.5 py-1.5 border-b border-white/[0.06] text-[10px] font-mono text-white/45 flex items-center justify-between bg-white/[0.015]">
            <span className="truncate">
              Target: {activeScene ? `SCN ${String(activeScene.sceneNumber).padStart(2, '0')}` : '—'} ·{' '}
              {activeShot ? `SHT ${String(activeShot.shotNumber).padStart(2, '0')}` : 'None'}
            </span>
            <span className="text-white/30">Drag or Click</span>
          </div>

          {/* Asset Cards */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
            {filteredAssets.length === 0 ? (
              <div className="p-6 border border-dashed border-white/10 text-center space-y-2">
                <Layers className="w-6 h-6 mx-auto text-white/25" />
                <p className="text-xs text-white/60">No media in this category</p>
                <p className="text-[10px] font-mono text-white/40">
                  Upload reference images, footage, character frames, or audio to reuse across scenes and shots.
                </p>
              </div>
            ) : (
              filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/vaiure-asset-id', asset.id);
                    e.dataTransfer.setData('text/plain', asset.url);
                  }}
                  className="border border-white/[0.1] bg-[#0b0d12] hover:border-white/25 transition-colors p-2 space-y-2 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-14 h-10 bg-black border border-white/[0.08] overflow-hidden flex items-center justify-center shrink-0">
                      {asset.mediaType === 'IMAGE' ? (
                        <img
                          src={asset.thumbnailUrl || asset.url}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : asset.mediaType === 'VIDEO' ? (
                        <video
                          src={asset.url}
                          muted
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Music className="w-4 h-4 text-cyan-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <span className="text-[11px] font-medium text-white truncate">
                          {asset.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => onDeleteAsset(asset.id)}
                          className="text-white/35 hover:text-rose-400 cursor-pointer shrink-0"
                          title="Remove asset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-[9px] font-mono text-white/45 truncate mt-0.5 tabular-nums">
                        {asset.category}
                        {asset.duration ? ` · ${asset.duration}s` : ''}
                        {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Quick One-Click Bindings */}
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-white/[0.06]">
                    {asset.mediaType === 'IMAGE' && (
                      <>
                        <button
                          type="button"
                          onClick={() => onAssignAssetToShot(asset, 'start_frame')}
                          disabled={!activeShot}
                          className="px-1.5 py-0.5 border border-white/10 hover:border-cyan-400 text-[9px] font-mono text-white/75 hover:text-cyan-300 cursor-pointer disabled:opacity-35"
                        >
                          Start Frame
                        </button>
                        <button
                          type="button"
                          onClick={() => onAssignAssetToShot(asset, 'end_frame')}
                          disabled={!activeShot}
                          className="px-1.5 py-0.5 border border-white/10 hover:border-cyan-400 text-[9px] font-mono text-white/75 hover:text-cyan-300 cursor-pointer disabled:opacity-35"
                        >
                          End Frame
                        </button>
                        <button
                          type="button"
                          onClick={() => onAssignAssetToShot(asset, 'reference_plate')}
                          disabled={!activeShot}
                          className="px-1.5 py-0.5 border border-white/10 hover:border-cyan-400 text-[9px] font-mono text-white/75 hover:text-cyan-300 cursor-pointer disabled:opacity-35"
                        >
                          + Ref Plate
                        </button>
                      </>
                    )}
                    {asset.mediaType === 'VIDEO' && (
                      <>
                        {onOpenInVideoTransform && (
                          <button
                            type="button"
                            onClick={() => onOpenInVideoTransform(asset)}
                            className="px-1.5 py-0.5 border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-[9px] font-mono text-cyan-300 cursor-pointer flex items-center gap-1"
                          >
                            <Wand2 className="w-2.5 h-2.5" />
                            <span>Transform</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onAssignAssetToShot(asset, 'video_ref')}
                          disabled={!activeShot}
                          className="px-1.5 py-0.5 border border-white/10 hover:border-cyan-400 text-[9px] font-mono text-white/75 hover:text-cyan-300 cursor-pointer disabled:opacity-35"
                        >
                          Shot Ref
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => onAssignAssetToShot(asset, 'timeline')}
                      className="px-1.5 py-0.5 border border-white/10 hover:border-emerald-400 text-[9px] font-mono text-white/75 hover:text-emerald-300 cursor-pointer ml-auto"
                    >
                      + Timeline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2.5 space-y-5">
          {/* CHARACTER CONTINUITY MODULE */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1.5 font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Character Continuity</span>
              </span>
              <span className="text-[9px] font-mono text-white/40">
                {project.characters.length} profiles
              </span>
            </div>

            <form onSubmit={handleAddCharacter} className="space-y-1.5 p-2 border border-white/[0.08] bg-[#0b0d12]">
              <input
                type="text"
                value={charName}
                onChange={(e) => setCharName(e.target.value)}
                placeholder="Character name..."
                className="w-full px-2 py-1 bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={charAppearance}
                onChange={(e) => setCharAppearance(e.target.value)}
                placeholder="Appearance (e.g., silver hair, obsidian coat)"
                className="w-full px-2 py-1 bg-black/50 border border-white/10 text-[11px] text-white focus:outline-none focus:border-cyan-400"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={charWardrobe}
                  onChange={(e) => setCharWardrobe(e.target.value)}
                  placeholder="Wardrobe lock..."
                  className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[11px] text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </form>

            <div className="space-y-1.5">
              {project.characters.map((char) => {
                const isLinked = Boolean(activeShot?.characterIds.includes(char.id));
                const linkedAsset = project.assets.find((a) =>
                  char.referenceImageAssetIds.includes(a.id)
                );
                return (
                  <div
                    key={char.id}
                    className={`p-2 border bg-[#0b0d12] space-y-1.5 ${
                      isLinked ? 'border-cyan-400/50' : 'border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white truncate">{char.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onUpsertCharacter({ ...char, locked: !char.locked })
                          }
                          title={char.locked ? 'Continuity locked' : 'Lock continuity'}
                          className="p-1 text-white/50 hover:text-white cursor-pointer"
                        >
                          {char.locked ? (
                            <Lock className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <Unlock className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCharacter(char.id)}
                          className="p-1 text-white/35 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {(char.appearancePrompt || char.wardrobeNotes) && (
                      <p className="text-[10px] text-white/55 leading-snug">
                        {[char.appearancePrompt, char.wardrobeNotes].filter(Boolean).join(' · ')}
                      </p>
                    )}

                    {/* Attach Image Reference Selector */}
                    {project.assets.some((a) => a.mediaType === 'IMAGE') && (
                      <select
                        value={char.referenceImageAssetIds[0] || ''}
                        onChange={(e) =>
                          onUpsertCharacter({
                            ...char,
                            referenceImageAssetIds: e.target.value ? [e.target.value] : [],
                          })
                        }
                        className="w-full px-1.5 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Reference Portrait: None</option>
                        {project.assets
                          .filter((a) => a.mediaType === 'IMAGE')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              Ref: {a.name}
                            </option>
                          ))}
                      </select>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      {linkedAsset && (
                        <img
                          src={linkedAsset.url}
                          alt={char.name}
                          className="w-7 h-7 object-cover border border-white/15"
                        />
                      )}
                      <button
                        type="button"
                        disabled={!activeShot}
                        onClick={() => onToggleCharacterOnShot(char.id)}
                        className={`ml-auto px-2 py-0.5 text-[9px] font-mono uppercase border cursor-pointer disabled:opacity-35 ${
                          isLinked
                            ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                            : 'border-white/15 text-white/70 hover:text-white'
                        }`}
                      >
                        {isLinked ? 'Linked to Shot' : '+ Link to Shot'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* SCENE / ENVIRONMENT CONTINUITY MODULE */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 flex items-center gap-1.5 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>Scene Continuity</span>
              </span>
              <span className="text-[9px] font-mono text-white/40">
                {project.environments.length} sets
              </span>
            </div>

            <form onSubmit={handleAddEnvironment} className="space-y-1.5 p-2 border border-white/[0.08] bg-[#0b0d12]">
              <input
                type="text"
                value={envName}
                onChange={(e) => setEnvName(e.target.value)}
                placeholder="Set / Environment name..."
                className="w-full px-2 py-1 bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <input
                type="text"
                value={envTime}
                onChange={(e) => setEnvTime(e.target.value)}
                placeholder="Time of day (e.g., Rainy Dusk)"
                className="w-full px-2 py-1 bg-black/50 border border-white/10 text-[11px] text-white focus:outline-none focus:border-amber-400"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={envLighting}
                  onChange={(e) => setEnvLighting(e.target.value)}
                  placeholder="Lighting continuity notes..."
                  className="flex-1 min-w-0 px-2 py-1 bg-black/50 border border-white/10 text-[11px] text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-2 py-1 bg-[#ECECE9] text-black text-[10px] font-mono font-semibold uppercase cursor-pointer shrink-0"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </form>

            <div className="space-y-1.5">
              {project.environments.map((env) => {
                const isBound = activeShot?.environmentId === env.id;
                return (
                  <div
                    key={env.id}
                    className={`p-2 border bg-[#0b0d12] space-y-1.5 ${
                      isBound ? 'border-amber-400/50' : 'border-white/[0.1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white truncate">{env.name}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteEnvironment(env.id)}
                        className="p-1 text-white/35 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[10px] text-white/55">
                      {env.timeOfDay} {env.lightingNotes ? `· ${env.lightingNotes}` : ''}
                    </div>
                    {project.assets.some((a) => a.mediaType === 'IMAGE') && (
                      <select
                        value={env.referenceImageAssetId || ''}
                        onChange={(e) =>
                          onUpsertEnvironment({
                            ...env,
                            referenceImageAssetId: e.target.value || undefined,
                          })
                        }
                        className="w-full px-1.5 py-1 bg-black/50 border border-white/10 text-[9px] font-mono text-white/75"
                      >
                        <option value="">Location Plate: None</option>
                        {project.assets
                          .filter((a) => a.mediaType === 'IMAGE')
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              Set: {a.name}
                            </option>
                          ))}
                      </select>
                    )}
                    <button
                      type="button"
                      disabled={!activeShot}
                      onClick={() =>
                        onAssignEnvironmentToShot(isBound ? undefined : env.id)
                      }
                      className={`w-full py-1 text-[9px] font-mono uppercase border cursor-pointer disabled:opacity-35 ${
                        isBound
                          ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                          : 'border-white/15 text-white/70 hover:text-white'
                      }`}
                    >
                      {isBound ? 'Active Set for Shot' : 'Apply Set to Shot'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
};
