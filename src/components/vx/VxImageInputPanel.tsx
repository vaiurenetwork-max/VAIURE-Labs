import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Sliders,
  Layers,
  Sparkles,
  Check,
  Info,
  Maximize2,
} from 'lucide-react';
import {
  VxImageFile,
  VxMidjourneyParams,
} from '../../types/vx';
import { processImageUpload, convertRemoteUrlToVxImage } from '../../services/vxService';
import { VX_SAMPLE_IMAGES, VxSampleImage } from './vxSamples';

interface VxImageInputPanelProps {
  primaryImage: VxImageFile | null;
  referenceImages: VxImageFile[];
  onPrimaryImageChange: (img: VxImageFile | null) => void;
  onReferenceImagesChange: (refs: VxImageFile[]) => void;
  midjourneyParams: VxMidjourneyParams;
  onParamsChange: (params: VxMidjourneyParams) => void;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
  activeModelLabel?: string;
}

const COMMON_ASPECT_RATIOS = ['16:9', '4:5', '1:1', '9:16', '3:2', '2:3', '21:9', '5:4'];

export const VxImageInputPanel: React.FC<VxImageInputPanelProps> = ({
  primaryImage,
  referenceImages,
  onPrimaryImageChange,
  onReferenceImagesChange,
  midjourneyParams,
  onParamsChange,
  isAnalyzing,
  onTriggerAnalysis,
  activeModelLabel,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [showSamplesModal, setShowSamplesModal] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [showParamSettings, setShowParamSettings] = useState(true);

  // Global clipboard paste listener for instant image reverse-engineering
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            try {
              const processed = await processImageUpload(file);
              onPrimaryImageChange(processed);
              // Auto-sync Midjourney aspect ratio
              onParamsChange({
                ...midjourneyParams,
                aspectRatio: processed.aspectRatio,
              });
            } catch (err) {
              console.error('Clipboard paste failed:', err);
            }
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [midjourneyParams, onParamsChange, onPrimaryImageChange]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processImageUpload(file);
      onPrimaryImageChange(processed);
      onParamsChange({
        ...midjourneyParams,
        aspectRatio: processed.aspectRatio,
      });
    } catch (err) {
      console.error('Image upload failed:', err);
    }
  };

  const handleRefFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const newRefs: VxImageFile[] = [...referenceImages];
      for (let i = 0; i < files.length; i++) {
        const processed = await processImageUpload(files[i]);
        processed.isPrimary = false;
        newRefs.push(processed);
      }
      onReferenceImagesChange(newRefs.slice(0, 3)); // Max 3 reference slots
    } catch (err) {
      console.error('Reference upload failed:', err);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        try {
          const processed = await processImageUpload(files[0]);
          onPrimaryImageChange(processed);
          onParamsChange({
            ...midjourneyParams,
            aspectRatio: processed.aspectRatio,
          });

          // Secondary drops go into references
          if (files.length > 1) {
            const extraRefs: VxImageFile[] = [...referenceImages];
            for (let i = 1; i < files.length; i++) {
              const refImg = await processImageUpload(files[i]);
              refImg.isPrimary = false;
              extraRefs.push(refImg);
            }
            onReferenceImagesChange(extraRefs.slice(0, 3));
          }
        } catch (err) {
          console.error('Drop upload failed:', err);
        }
      }
    },
    [midjourneyParams, onParamsChange, onPrimaryImageChange, onReferenceImagesChange, referenceImages]
  );

  const loadSample = async (sample: VxSampleImage) => {
    setIsLoadingSample(true);
    try {
      const processed = await convertRemoteUrlToVxImage(sample.url, `${sample.id}.jpg`);
      onPrimaryImageChange(processed);
      onParamsChange({
        ...midjourneyParams,
        aspectRatio: processed.aspectRatio,
      });
      setShowSamplesModal(false);
    } catch (err) {
      console.error('Failed to load sample image:', err);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const removeReference = (id: string) => {
    onReferenceImagesChange(referenceImages.filter((r) => r.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f12] border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <span className="text-[11px] font-mono uppercase tracking-[0.16em] text-white/90 font-semibold">
            PANEL A · IMAGE INPUT
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSamplesModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white text-[10px] font-mono tracking-wider transition-all cursor-pointer"
            title="Load curated editorial sample image"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>SAMPLES</span>
          </button>
        </div>
      </div>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* Primary Image Drop/Preview Container */}
        {primaryImage ? (
          <div className="space-y-3">
            {/* Aspect-Ratio Preserving Preview Container */}
            <div className="relative group rounded-lg overflow-hidden border border-white/15 bg-black/60 shadow-inner flex items-center justify-center min-h-[220px] max-h-[360px]">
              <img
                src={primaryImage.dataUrl}
                alt={primaryImage.filename}
                className="max-h-[340px] w-auto max-w-full object-contain mx-auto select-none"
              />

              {/* Floating Action Overlay on Hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4 backdrop-blur-[2px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white text-black text-[11px] font-mono font-semibold hover:bg-neutral-200 transition-colors cursor-pointer shadow-lg active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>REPLACE</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrimaryImageChange(null)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/80 hover:bg-red-500 text-white text-[11px] font-mono font-semibold transition-colors cursor-pointer shadow-lg active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>REMOVE</span>
                </button>
              </div>

              {/* Aspect Ratio Badge Top-Right */}
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/20 text-white font-mono text-[10px] tracking-wider pointer-events-none">
                AR {primaryImage.aspectRatio}
              </div>
            </div>

            {/* Image Metadata Strip */}
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-white/[0.03] border border-white/[0.06] rounded-md p-2.5">
              <div>
                <span className="text-white/40 block text-[9px] uppercase">RESOLUTION</span>
                <span className="text-white/90 font-medium">{primaryImage.width} × {primaryImage.height} px</span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">FORMAT / SIZE</span>
                <span className="text-white/90 font-medium">
                  {primaryImage.mimeType.replace('image/', '').toUpperCase()} · {(primaryImage.fileSize / 1024).toFixed(0)} KB
                </span>
              </div>
              <div>
                <span className="text-white/40 block text-[9px] uppercase">CLIPBOARD SYNC</span>
                <span className="text-emerald-400 font-medium">CTRL+V READY</span>
              </div>
            </div>

            {/* Real-time active backend indicator */}
            {activeModelLabel && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-cyan-400/[0.06] border border-cyan-400/20 text-[10px] font-mono">
                <span className="text-white/60 uppercase">ACTIVE BACKEND:</span>
                <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {activeModelLabel}
                </span>
              </div>
            )}

            {/* Quick Trigger Analysis Button */}
            <button
              type="button"
              disabled={isAnalyzing}
              onClick={onTriggerAnalysis}
              className={`w-full py-2.5 rounded-lg font-mono text-xs font-semibold uppercase tracking-[0.16em] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99] ${
                isAnalyzing
                  ? 'bg-neutral-800 text-white/50 border border-white/10 cursor-not-allowed'
                  : 'bg-white hover:bg-neutral-200 text-black shadow-white/10'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white/60" />
                  <span>ANALYZING IMAGE (GEMINI)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  <span>RUN VISUAL RECONSTRUCTION</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Empty Drag & Drop Zone */
          <div
            ref={dropZoneRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[260px] ${
              isDragOver
                ? 'border-emerald-400/90 bg-emerald-500/[0.08]'
                : 'border-white/15 bg-white/[0.015] hover:border-white/35 hover:bg-white/[0.03]'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/70 mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-5 h-5" />
            </div>

            <h4 className="text-sm font-medium text-white/90 mb-1">
              Drop target image here or click to browse
            </h4>
            <p className="text-xs text-white/50 font-mono mb-3 max-w-[280px]">
              Supports PNG, JPG, JPEG, and WEBP. You can also paste directly from clipboard (Ctrl+V).
            </p>

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-white/[0.05] border border-white/10 text-[10px] font-mono text-white/60">
                100% VISUAL FIDELITY
              </span>
              <span className="px-2 py-1 rounded bg-white/[0.05] border border-white/10 text-[10px] font-mono text-white/60">
                MIDJOURNEY V8.2
              </span>
            </div>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={refFileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/webp"
          multiple
          onChange={handleRefFileSelect}
          className="hidden"
        />

        {/* Secondary Reference Slots (Multi-Image Context) */}
        <div className="pt-2 border-t border-white/[0.07] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono tracking-wider text-white/60 uppercase flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-white/40" />
              REFERENCE SLOTS ({referenceImages.length}/3)
            </span>
            {referenceImages.length < 3 && (
              <button
                type="button"
                onClick={() => refFileInputRef.current?.click()}
                className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                + ADD REF
              </button>
            )}
          </div>

          {referenceImages.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {referenceImages.map((refImg) => (
                <div
                  key={refImg.id}
                  className="relative group h-16 rounded-md overflow-hidden border border-white/15 bg-black/40"
                >
                  <img
                    src={refImg.dataUrl}
                    alt={refImg.filename}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeReference(refImg.id)}
                    className="absolute inset-0 bg-red-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-300 cursor-pointer"
                    title="Remove reference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-2 rounded border border-white/[0.05] bg-white/[0.01] text-[10px] font-mono text-white/40 text-center">
              Optional secondary references (lighting reference, environment angle, style cues)
            </div>
          )}
        </div>

        {/* Midjourney V8.2 Parameters Tuning Strip */}
        <div className="pt-2 border-t border-white/[0.07] space-y-3">
          <div
            onClick={() => setShowParamSettings(!showParamSettings)}
            className="flex items-center justify-between cursor-pointer group"
          >
            <span className="text-[10px] font-mono tracking-wider text-white/70 uppercase flex items-center gap-1.5 group-hover:text-white transition-colors">
              <Sliders className="w-3 h-3 text-cyan-400" />
              MIDJOURNEY V8.2 PARAMETERS
            </span>
            <span className="text-[10px] font-mono text-white/40">
              {showParamSettings ? 'COLLAPSE' : 'EXPAND'}
            </span>
          </div>

          {showParamSettings && (
            <div className="p-3 rounded-lg bg-black/30 border border-white/[0.06] space-y-3">
              {/* Aspect Ratio Selector */}
              <div>
                <label className="text-[9px] font-mono text-white/50 uppercase block mb-1">
                  ASPECT RATIO (--ar)
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {COMMON_ASPECT_RATIOS.map((ar) => (
                    <button
                      key={ar}
                      type="button"
                      onClick={() => onParamsChange({ ...midjourneyParams, aspectRatio: ar })}
                      className={`py-1 rounded text-[10px] font-mono transition-all cursor-pointer ${
                        midjourneyParams.aspectRatio === ar
                          ? 'bg-white text-black font-bold shadow-sm'
                          : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white border border-white/[0.05]'
                      }`}
                    >
                      {ar}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stylize Slider (--s) */}
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono text-white/50 uppercase mb-1">
                  <span>STYLIZE (--s {midjourneyParams.stylize})</span>
                  <span className="text-white/80">{midjourneyParams.stylize}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={midjourneyParams.stylize}
                  onChange={(e) =>
                    onParamsChange({ ...midjourneyParams, stylize: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-white h-1 bg-white/20 rounded cursor-pointer"
                />
              </div>

              {/* Chaos Slider (--c) */}
              <div>
                <div className="flex items-center justify-between text-[9px] font-mono text-white/50 uppercase mb-1">
                  <span>CHAOS (--c {midjourneyParams.chaos})</span>
                  <span className="text-white/80">{midjourneyParams.chaos}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={midjourneyParams.chaos}
                  onChange={(e) =>
                    onParamsChange({ ...midjourneyParams, chaos: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-white h-1 bg-white/20 rounded cursor-pointer"
                />
              </div>

              {/* Raw Mode & Quality Toggles */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={midjourneyParams.raw}
                    onChange={(e) => onParamsChange({ ...midjourneyParams, raw: e.target.checked })}
                    className="w-3.5 h-3.5 accent-white rounded"
                  />
                  <span className="text-[10px] font-mono text-white/80">RAW MODE (--style raw)</span>
                </label>

                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-white/40 uppercase mr-1">V8.2</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 border border-emerald-400/30 text-emerald-300 font-mono text-[9px]">
                    --v 8.2
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Samples Selector Modal */}
      {showSamplesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#111317] border border-white/20 rounded-xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-semibold font-mono text-white uppercase tracking-wider">
                  SELECT EDITORIAL SAMPLE
                </h3>
                <p className="text-xs text-white/50 font-mono">
                  Instant visual test benchmarks across photographic genres
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSamplesModal(false)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer text-sm"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[360px] overflow-y-auto">
              {VX_SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  disabled={isLoadingSample}
                  onClick={() => loadSample(sample)}
                  className="group p-2.5 rounded-lg border border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04] text-left transition-all cursor-pointer flex flex-col space-y-2"
                >
                  <div className="w-full h-24 rounded overflow-hidden bg-neutral-900">
                    <img
                      src={sample.url}
                      alt={sample.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-amber-300/80 block uppercase tracking-wider">
                      {sample.category}
                    </span>
                    <h5 className="text-xs font-medium text-white/90 truncate leading-snug">
                      {sample.title}
                    </h5>
                    <span className="text-[9px] font-mono text-white/40 block mt-0.5">
                      AR {sample.aspectRatio} · {sample.width}×{sample.height}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {isLoadingSample && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-white/70">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Loading high-res sample buffer...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
