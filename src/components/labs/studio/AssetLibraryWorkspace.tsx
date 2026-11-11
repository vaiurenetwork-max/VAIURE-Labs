/**
 * VAIURE Studio — Asset Library Workspace
 * Central archive of generated videos, latent reference images, dialogue recordings, and project deliverables.
 * Supports real file uploads (images via Sharp WebP pipeline, video/audio via base64 studio upload) and search filtering.
 */

import React, { useState, useRef } from 'react';
import {
  Image,
  Film,
  Music,
  Download,
  Trash2,
  Search,
  Upload,
  CheckCircle2,
  Eye,
  X,
} from 'lucide-react';
import { StudioProject, StudioAsset, StudioAssetType } from '../../../types/studio';
import { uploadAndOptimizeThreadImage } from '../../../services/forumService';

interface AssetLibraryWorkspaceProps {
  project: StudioProject;
  onDeleteAsset: (assetId: string) => void;
  onAddAsset?: (asset: StudioAsset) => void;
}

export const AssetLibraryWorkspace: React.FC<AssetLibraryWorkspaceProps> = ({
  project,
  onDeleteAsset,
  onAddAsset,
}) => {
  const [selectedType, setSelectedType] = useState<StudioAssetType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [previewAsset, setPreviewAsset] = useState<StudioAsset | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredAssets = project.assets.filter((asset) => {
    if (selectedType !== 'ALL' && asset.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        asset.title.toLowerCase().includes(q) ||
        (asset.prompt && asset.prompt.toLowerCase().includes(q)) ||
        (asset.model && asset.model.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onAddAsset) return;
    setIsUploading(true);
    setUploadNotice(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
          const opt = await uploadAndOptimizeThreadImage(
            file,
            'studio_director',
            `asset_${project.id}`
          );
          const newAsset: StudioAsset = {
            id: `asset-img-${Date.now()}-${i}`,
            projectId: project.id,
            type: 'IMAGE',
            title: file.name.replace(/\.[^/.]+$/, ''),
            url: opt.url,
            thumbnailUrl: opt.thumbnailUrl || opt.url,
            resolution: `${opt.width}x${opt.height}`,
            fileSizeBytes: opt.size,
            version: 1,
            createdAt: new Date().toISOString(),
          };
          onAddAsset(newAsset);
        } else {
          // Upload video or audio via /api/upload/base64
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('Failed to read media file'));
            reader.readAsDataURL(file);
          });

          const res = await fetch('/api/upload/base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              filename: file.name,
              type: file.type.startsWith('video/') ? 'video' : 'image',
            }),
          });
          const data = await res.json();
          if (data.success && data.file) {
            const isVid = file.type.startsWith('video/');
            const isAud = file.type.startsWith('audio/');
            const newAsset: StudioAsset = {
              id: `asset-media-${Date.now()}-${i}`,
              projectId: project.id,
              type: isVid ? 'VIDEO' : isAud ? 'AUDIO' : 'REFERENCE',
              title: file.name.replace(/\.[^/.]+$/, ''),
              url: data.file.url,
              resolution: isVid ? '1080p' : undefined,
              fileSizeBytes: data.file.size,
              version: 1,
              createdAt: new Date().toISOString(),
            };
            onAddAsset(newAsset);
          }
        }
      }
      setUploadNotice(`Uploaded ${files.length} file(s) to project library.`);
      setTimeout(() => setUploadNotice(null), 3500);
    } catch (err: any) {
      setUploadNotice(err?.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07070B] overflow-hidden select-none">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header & Filter Bar */}
      <div className="min-h-[48px] py-2 px-4 sm:px-6 bg-[#09090D] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-white font-bold">
            Asset Library
          </span>
          <span className="text-[10px] font-mono text-white/40">
            ({filteredAssets.length} Assets)
          </span>
          {uploadNotice && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{uploadNotice}</span>
            </span>
          )}
        </div>

        {/* Search + Filters + Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assets or prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded bg-black/50 border border-white/15 text-xs font-mono text-white placeholder-white/35 focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
            />
          </div>

          {(['ALL', 'VIDEO', 'IMAGE', 'AUDIO', 'REFERENCE'] as (StudioAssetType | 'ALL')[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  selectedType === type
                    ? 'bg-white text-black font-bold'
                    : 'bg-white/[0.04] text-white/60 hover:text-white'
                }`}
              >
                {type}
              </button>
            )
          )}

          {onAddAsset && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[11px] font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Uploading...' : 'Upload Media'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Assets Grid */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        {filteredAssets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-white/10 rounded-xl space-y-2">
            <Film className="w-8 h-8 text-white/20" />
            <div className="text-white text-xs font-mono">No matching assets found.</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="group rounded-lg border border-white/10 bg-[#0A0A0F] hover:border-white/25 overflow-hidden flex flex-col transition-all"
              >
                <div
                  onClick={() => setPreviewAsset(asset)}
                  className="relative aspect-video bg-black/60 overflow-hidden cursor-pointer"
                >
                  <img
                    src={
                      asset.thumbnailUrl ||
                      asset.url ||
                      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80'
                    }
                    alt={asset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[9px] font-mono text-cyan-300">
                    {asset.type}
                  </span>
                </div>

                <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono text-xs font-bold text-white truncate">
                      {asset.title}
                    </h4>
                    {asset.prompt && (
                      <p className="text-[10px] font-sans text-white/50 line-clamp-2 mt-0.5">
                        {asset.prompt}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] font-mono text-white/40">
                    <span className="truncate max-w-[110px]">
                      {asset.model || asset.resolution || 'Studio Asset'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewAsset(asset)}
                        className="p-1 hover:text-cyan-300 transition-colors cursor-pointer"
                        title="Inspect Asset"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={asset.url}
                        download
                        className="p-1 hover:text-white transition-colors"
                        title="Download Asset"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => onDeleteAsset(asset.id)}
                        className="p-1 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Inspector Modal */}
      {previewAsset && (
        <div
          onClick={() => setPreviewAsset(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl bg-[#0B0B10] border border-white/15 rounded-xl overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-mono text-xs font-bold text-white">{previewAsset.title}</div>
              <button
                onClick={() => setPreviewAsset(null)}
                className="p-1 text-white/60 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              {previewAsset.type === 'VIDEO' ? (
                <video src={previewAsset.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <img src={previewAsset.url} alt={previewAsset.title} className="w-full h-full object-contain" />
              )}
            </div>
            {previewAsset.prompt && (
              <div className="p-4 border-t border-white/10 text-xs font-mono text-white/70">
                {previewAsset.prompt}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
