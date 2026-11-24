/**
 * VAIURE — SEEDANCE LAB REFERENCE STUDIO (30-SLOT EDITION)
 * Monochromatic Multi-Image Reference Management & Spatial Framing
 * Dedicated 30-slot workspace for character identity, costume, lighting, props & environment curation.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Eye,
  Trash2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';
import { seedanceLabService } from '../../../services/seedanceLabService';

interface SeedanceReferenceStudioProps {
  currentImages: string[];
  onUpdateImages: (images: string[]) => void;
  onSendToGenerator: (images: string[]) => void;
}

const MAX_REFERENCE_SLOTS = 30;

const SLOT_ROLES: string[] = [
  'Primary Character Front Face',
  'Primary Character Left Profile',
  'Primary Character Right Profile',
  'Character Expression Study A',
  'Character Expression Study B',
  'Full-Body Silhouette',
  'Secondary Character Anchor',
  'Supporting Cast Anchor',
  'Crowd / Background Archetype',
  'Hair & Skin Micro-Detail',
  'Hero Wardrobe Front Drape',
  'Wardrobe Fabric Weave Close-up',
  'Footwear & Lower Silhouette',
  'Primary Hero Prop / Artifact',
  'Secondary Hand Prop / Device',
  'Vehicle / Mechanical Exterior',
  'Vehicle Interior & Cockpit',
  'Dynamic Motion Pose Reference',
  'Fluid / Cloth Sim Trajectory',
  'Physics Debris & Material Scale',
  'Wide Architectural Establishing',
  'Key Environmental Landmark',
  'Interior Room & Furniture Layout',
  'Key Light Direction & Shadow',
  'Volumetric Fog / Weather FX',
  'Specular Reflection Surface',
  'Color Palette & LUT Anchor',
  'Opening Frame Framing Lock',
  'Mid-Sequence Continuity Cut',
  'Ending Keyframe Silhouette',
];

type SlotGroupFilter = 'all' | 'identity' | 'wardrobe' | 'environment';

export const SeedanceReferenceStudio: React.FC<SeedanceReferenceStudioProps> = ({
  currentImages,
  onUpdateImages,
  onSendToGenerator,
}) => {
  const [selectedOverlayRatio, setSelectedOverlayRatio] = useState<'16:9' | '9:16' | '21:9' | 'none'>('16:9');
  const [slotFilter, setSlotFilter] = useState<SlotGroupFilter>('all');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!previewImage) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImage(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewImage]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const nextImages = [...currentImages];
    const available = MAX_REFERENCE_SLOTS - nextImages.length;
    const toProcess = Array.from(files).slice(0, available);

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const reader = new FileReader();
        const b64 = await new Promise<string>((res, rej) => {
          reader.onload = () => res(reader.result as string);
          reader.onerror = rej;
          reader.readAsDataURL(file);
        });

        const url = await seedanceLabService.uploadMedia(b64, file.name);
        if (nextImages.length < MAX_REFERENCE_SLOTS) {
          nextImages.push(url);
          onUpdateImages([...nextImages]);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  };

  const removeSlot = (idx: number) => {
    onUpdateImages(currentImages.filter((_, i) => i !== idx));
  };

  const moveSlot = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    if (target < 0 || target >= currentImages.length) return;
    const copy = [...currentImages];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    onUpdateImages(copy);
  };

  const clearAll = () => {
    onUpdateImages([]);
  };

  const visibleIndices = Array.from({ length: MAX_REFERENCE_SLOTS }, (_, i) => i).filter((idx) => {
    if (slotFilter === 'identity') return idx < 10;
    if (slotFilter === 'wardrobe') return idx >= 10 && idx < 20;
    if (slotFilter === 'environment') return idx >= 20;
    return true;
  });

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
        {/* Header Strip */}
        <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Camera className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono text-white">
                30-Slot Reference Studio
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/75 tabular-nums">
                {currentImages.length} / {MAX_REFERENCE_SLOTS} Slots Active
              </span>
            </div>
            <p className="text-xs text-white/60">
              Curate up to 30 visual continuity anchors for Seedance 2.5 Reference-to-Video physics & cinema consistency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Framing Guide Aspect Toggles */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-white/[0.1] bg-black/60 text-xs font-mono">
              <span className="text-[10px] text-white/40 px-2 uppercase whitespace-nowrap">Guide:</span>
              {(['none', '16:9', '9:16', '21:9'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedOverlayRatio(r)}
                  className={`min-h-[32px] px-2.5 py-1 rounded text-[11px] transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    selectedOverlayRatio === r
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {r === 'none' ? 'Off' : r}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || currentImages.length >= MAX_REFERENCE_SLOTS}
              className="min-h-[40px] px-3.5 py-2 rounded-lg border border-white/[0.15] bg-white/[0.05] hover:bg-white/[0.12] text-white text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Batch Upload'}</span>
            </button>

            {currentImages.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="min-h-[40px] px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/60 hover:text-white text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear All
              </button>
            )}

            <button
              type="button"
              onClick={() => onSendToGenerator(currentImages)}
              className="min-h-[40px] px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap shrink-0"
            >
              <span>Apply to Generator ({currentImages.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Slot Group Tabs */}
        <section className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {(
            [
              { id: 'all', label: 'All 30 Slots' },
              { id: 'identity', label: '01–10 · Cast & Identity' },
              { id: 'wardrobe', label: '11–20 · Wardrobe, Props & Physics' },
              { id: 'environment', label: '21–30 · Sets, Lighting & Frames' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSlotFilter(tab.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                slotFilter === tab.id
                  ? 'border-white bg-white text-black font-semibold'
                  : 'border-white/[0.1] bg-white/[0.03] text-white/65 hover:text-white hover:border-white/25'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {/* 30-Slot Matrix Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {visibleIndices.map((idx) => {
            const hasImage = idx < currentImages.length;
            const imgUrl = hasImage ? currentImages[idx] : null;
            const slotTitle = SLOT_ROLES[idx] || `Reference Slot #${idx + 1}`;

            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all p-3.5 flex flex-col justify-between gap-2.5 ${
                  hasImage
                    ? 'border-white/[0.18] bg-white/[0.045] backdrop-blur-md'
                    : 'border-white/[0.08] bg-white/[0.02] border-dashed'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-white/60 gap-2">
                  <span className="text-white font-medium shrink-0 tabular-nums">#{idx + 1}</span>
                  <span className="text-[10px] truncate">{slotTitle}</span>
                </div>

                {/* Slot Viewport */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-neutral-950 border border-white/[0.08] relative flex items-center justify-center group">
                  {imgUrl ? (
                    <>
                      <img
                        src={imgUrl}
                        alt={slotTitle}
                        className="w-full h-full object-cover"
                      />
                      {/* Optional Framing Overlay */}
                      {selectedOverlayRatio !== 'none' && (
                        <div className="absolute inset-0 border border-white/40 pointer-events-none flex items-center justify-center">
                          <span className="bg-black/80 px-2 py-0.5 rounded text-[9px] font-mono text-white border border-white/20">
                            {selectedOverlayRatio} Crop
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveSlot(idx, -1)}
                            className="p-1.5 rounded-full bg-black/85 text-white hover:bg-white hover:text-black border border-white/20 cursor-pointer"
                            title="Move earlier"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewImage(imgUrl)}
                          className="p-2 rounded-full bg-white text-black hover:bg-white/90 cursor-pointer"
                          title="Inspect Full Resolution"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeSlot(idx)}
                          className="p-2 rounded-full bg-black/80 text-white hover:bg-white hover:text-black border border-white/20 cursor-pointer"
                          title="Remove Reference"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {idx < currentImages.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveSlot(idx, 1)}
                            className="p-1.5 rounded-full bg-black/85 text-white hover:bg-white hover:text-black border border-white/20 cursor-pointer"
                            title="Move later"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-1.5 text-white/35 group-hover:text-white/65 transition-colors cursor-pointer text-center p-3"
                    >
                      <Upload className="w-5 h-5" />
                      <span className="text-[11px] font-medium font-sans">
                        Assign Ref #{idx + 1}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>{hasImage ? 'ACTIVE' : 'OPEN SLOT'}</span>
                  {hasImage && (
                    <button
                      type="button"
                      onClick={() => removeSlot(idx)}
                      className="text-white/50 hover:text-white cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          multiple
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />

        {/* Instructions Footer */}
        <section className="p-5 rounded-xl border border-white/[0.08] bg-white/[0.02] text-xs text-white/60 space-y-2">
          <div className="flex items-center gap-2 text-white font-mono text-xs font-semibold">
            <Info className="w-4 h-4 text-white/70" />
            <span>Seedance 2.5 30-Plate Reference Architecture</span>
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">
            Assign cast faces & profiles in Slots #1–#10, wardrobe textures, vehicles & physics props in #11–#20, and architectural sets, lighting moodboards, and shot keyframes in #21–#30. Seedance 2.5 maintains structural geometry and fabric/fluid continuity across up to 30 plates.
          </p>
        </section>
      </div>

      {/* Enlarged Inspection Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[85vh] rounded-2xl border border-white/20 bg-neutral-950 overflow-hidden relative"
          >
            <img
              src={previewImage}
              alt="Enlarged Reference"
              className="w-full h-full object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/80 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
