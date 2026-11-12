/**
 * VAIURE — SEEDANCE LAB REFERENCE STUDIO
 * Monochromatic Multi-Image Reference Management & Spatial Framing
 * Dedicated 9-slot workspace for character identity, costume, and environment curation.
 */

import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Eye,
  Trash2,
  ArrowRight,
  Maximize2,
  Sparkles,
  Info,
  Check,
  Layers,
} from 'lucide-react';
import { seedanceLabService } from '../../../services/seedanceLabService';

interface SeedanceReferenceStudioProps {
  currentImages: string[];
  onUpdateImages: (images: string[]) => void;
  onSendToGenerator: (images: string[]) => void;
}

const SLOT_ROLES = [
  'Character Face & Identity',
  'Costume & Textile Texture',
  'Environment & Architecture',
  'Lighting & Shadow Mood',
  'Motion Pose & Dynamics',
  'Secondary Angle / Profile',
  'Color Palette Acuan',
  'Background Depth Vector',
  'Ending Keyframe Silhouette',
];

export const SeedanceReferenceStudio: React.FC<SeedanceReferenceStudioProps> = ({
  currentImages,
  onUpdateImages,
  onSendToGenerator,
}) => {
  const [selectedOverlayRatio, setSelectedOverlayRatio] = useState<'16:9' | '9:16' | '21:9' | 'none'>('16:9');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    const available = 9 - currentImages.length;
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
        onUpdateImages([...currentImages, url]);
      } catch (err) {
        console.error('Upload failed:', err);
      }
    }

    setIsUploading(false);
  };

  const removeSlot = (idx: number) => {
    onUpdateImages(currentImages.filter((_, i) => i !== idx));
  };

  const clearAll = () => {
    onUpdateImages([]);
  };

  return (
    <div className="w-full h-full overflow-y-auto no-scrollbar p-4 sm:p-6 lg:p-8 bg-black text-white select-text">
      <div className="max-w-[1520px] mx-auto space-y-6 pb-20">
        {/* Header Strip */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-white/[0.12] bg-white/[0.035] backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-white" />
              <h1 className="text-lg font-semibold tracking-tight uppercase font-mono text-white">
                Reference Studio
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-white/[0.15] bg-white/[0.05] text-white/70">
                {currentImages.length} / 9 Slots Active
              </span>
            </div>
            <p className="text-xs text-white/60">
              Curate and lock multi-reference visual continuity for Seedance 2.5 Reference-to-Video models.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Framing Guide Aspect Toggles */}
            <div className="flex items-center gap-1 p-1 rounded-lg border border-white/[0.1] bg-black/60 text-xs font-mono">
              <span className="text-[10px] text-white/40 px-2 uppercase">Guide:</span>
              {(['none', '16:9', '9:16', '21:9'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedOverlayRatio(r)}
                  className={`px-2 py-1 rounded text-[11px] transition-all cursor-pointer ${
                    selectedOverlayRatio === r
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {r === 'none' ? 'Off' : r}
                </button>
              ))}
            </div>

            {currentImages.length > 0 && (
              <button
                onClick={clearAll}
                className="px-3 py-2 rounded-lg border border-white/[0.1] bg-white/[0.03] text-white/60 hover:text-white text-xs font-mono transition-all cursor-pointer"
              >
                Clear All
              </button>
            )}

            <button
              onClick={() => onSendToGenerator(currentImages)}
              className="px-4 py-2 rounded-lg bg-white text-black text-xs font-semibold uppercase tracking-wider hover:bg-white/90 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Apply to Generator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* 9-Slot Matrix Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, idx) => {
            const hasImage = idx < currentImages.length;
            const imgUrl = hasImage ? currentImages[idx] : null;
            const slotTitle = SLOT_ROLES[idx] || `Reference Slot #${idx + 1}`;

            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 ${
                  hasImage
                    ? 'border-white/[0.18] bg-white/[0.045] backdrop-blur-md'
                    : 'border-white/[0.08] bg-white/[0.02] border-dashed'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono text-white/60">
                  <span className="text-white font-medium">Slot #{idx + 1}</span>
                  <span className="text-[10px] truncate max-w-[150px]">{slotTitle}</span>
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
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewImage(imgUrl)}
                          className="p-2 rounded-full bg-white text-black hover:bg-white/90 cursor-pointer"
                          title="Inspect Full Resolution"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSlot(idx)}
                          className="p-2 rounded-full bg-black/80 text-white hover:bg-white hover:text-black border border-white/20 cursor-pointer"
                          title="Remove Reference"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-2 text-white/35 group-hover:text-white/60 transition-colors cursor-pointer text-center p-4"
                    >
                      <Upload className="w-6 h-6" />
                      <span className="text-xs font-medium font-sans">
                        Click to assign Reference #{idx + 1}
                      </span>
                      <span className="text-[10px] text-white/30">{slotTitle}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                  <span>{hasImage ? 'ACTIVE ATTACHMENT' : 'EMPTY SLOT'}</span>
                  {hasImage && (
                    <button
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
            <span>Seedance 2.5 Multi-Reference Best Practices</span>
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">
            For maximum facial and wardrobe continuity, upload front-facing portraits in Slot #1 and wardrobe textures in Slot #2. Seedance 2.5 automatically extracts identity anchors and preserves structural geometry across complex camera trajectories.
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
