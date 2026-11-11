import React, { useState } from 'react';
import { PostType, AiAttribution, PostMedia, UserProfile } from '../../types/social';
import { VideoPlayer } from '../media/VideoPlayer';
import { uploadMediaToFirebaseStorage } from '../../services/firestoreSocialService';
import { X, Upload, Trash2, Eye, Plus, Film, Loader2, Play, Sparkles, Wand2 } from 'lucide-react';
import { generateEditorialCopy, polishDraftCopy } from '../../services/copyService';

interface CreatePostModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onPublish: (postData: any) => void;
  onOpenCopyStudio?: () => void;
  initialData?: {
    title?: string;
    caption?: string;
    category?: any;
    tags?: string;
    aiTools?: string;
  };
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onPublish,
  onOpenCopyStudio,
  initialData,
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const [title, setTitle] = useState(initialData?.title || '');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [category, setCategory] = useState<'EDITORIAL' | 'COUTURE' | 'CINEMA' | 'DIGITAL FASHION' | 'ARTWORK' | 'EXPERIMENTAL'>(initialData?.category || 'COUTURE');
  const [postType, setPostType] = useState<PostType>('image');
  const [aiAttribution, setAiAttribution] = useState<AiAttribution>('AI Generated');
  const [aiTools, setAiTools] = useState(initialData?.aiTools || '');
  const [collaborators, setCollaborators] = useState('');
  const [tags, setTags] = useState(initialData?.tags || '');
  const [mediaList, setMediaList] = useState<PostMedia[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isEnhancingCopy, setIsEnhancingCopy] = useState(false);

  // Sync initialData when passed
  React.useEffect(() => {
    if (initialData) {
      if (initialData.title) setTitle(initialData.title);
      if (initialData.caption) setCaption(initialData.caption);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.tags) setTags(initialData.tags);
      if (initialData.aiTools) setAiTools(initialData.aiTools);
    }
  }, [initialData]);

  // Quick AI copy enhance
  const handleQuickCopyEnhance = async () => {
    const seed = caption.trim() || title.trim() || 'Avant-garde digital couture';
    setIsEnhancingCopy(true);
    try {
      const res = await generateEditorialCopy({
        topic: seed,
        category,
        artistName: currentUser.displayName || currentUser.username,
      });
      if (res.success && res.copy) {
        setTitle(res.copy.headline);
        setCaption(res.copy.caption);
        setTags(res.copy.hashtags.join(' '));
        if (res.copy.suggestedAiTools?.length) {
          setAiTools(res.copy.suggestedAiTools.join(', '));
        }
      }
    } catch (e) {
      console.warn('Quick copy enhance notice:', e);
    } finally {
      setIsEnhancingCopy(false);
    }
  };

  // Real upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadProgress(`Uploading ${files.length} file(s) to media vault...`);

    try {
      const newMedia: PostMedia[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) continue;

        setUploadProgress(`Uploading ${i + 1}/${files.length}: ${file.name}...`);

        const isVideo = file.type.startsWith('video');
        const uploadResult = await uploadMediaToFirebaseStorage(
          file,
          currentUser.id,
          'posts',
          (pct) => {
            setUploadProgress(`Uploading ${file.name} (${pct}%)...`);
          }
        );

        newMedia.push({
          url: uploadResult.url,
          aspectRatio: isVideo ? 'aspect-[16/9]' : 'aspect-[3/4]',
          type: isVideo ? 'video' : 'image',
          caption: file.name,
          size: uploadResult.size,
          mimeType: uploadResult.mimeType,
          filename: uploadResult.path,
        });
      }

      setMediaList((prev) => [...prev, ...newMedia]);

      const hasVideo = newMedia.some((m) => m.type === 'video') || mediaList.some((m) => m.type === 'video');
      if (hasVideo) {
        setPostType('video');
      } else if (mediaList.length + newMedia.length > 1) {
        setPostType('carousel');
      }

      setUploadProgress(null);
    } catch (err: any) {
      console.error('File upload error:', err);
      setUploadError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddMediaUrl = () => {
    if (!urlInput.trim()) return;
    const cleanUrl = urlInput.trim();
    const isVideo = cleanUrl.includes('.mp4') || cleanUrl.includes('.webm') || cleanUrl.includes('.mov') || cleanUrl.includes('video');
    setMediaList((prev) => [
      ...prev,
      {
        url: cleanUrl,
        aspectRatio: isVideo ? 'aspect-[16/9]' : 'aspect-[3/4]',
        type: isVideo ? 'video' : 'image',
      },
    ]);
    if (isVideo) {
      setPostType('video');
    }
    setUrlInput('');
  };

  const handleRemoveMedia = (index: number) => {
    setMediaList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || mediaList.length === 0) {
      setUploadError('Please provide a title and at least one image or video.');
      return;
    }

    const cleanedTags = tags
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const cleanedTools = aiTools
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const cleanedCollabs = collaborators
      .split(' ')
      .map((c) => c.trim())
      .filter(Boolean);

    const postPayload = {
      authorId: currentUser.id,
      authorName: currentUser.displayName || 'Creator',
      authorUsername: currentUser.username || 'creator',
      authorAvatar: currentUser.avatar || '',
      authorRole: currentUser.role || 'CREATOR',
      authorVerified: true,
      title: title.trim(),
      caption: caption.trim(),
      category,
      postType: mediaList.length > 1 ? 'carousel' : postType,
      media: mediaList,
      tags: cleanedTags,
      aiTools: cleanedTools,
      aiAttribution,
      collaborators: cleanedCollabs,
    };

    onPublish(postPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#07070a] border border-white/15 text-white max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono tracking-widest text-white/50 uppercase">
              PUBLISH WORK
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex border border-white/20 p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 uppercase ${
                  activeTab === 'edit' ? 'bg-white text-black font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                EDIT
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 uppercase flex items-center gap-1.5 ${
                  activeTab === 'preview' ? 'bg-white text-black font-semibold' : 'text-white/60 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>PREVIEW</span>
              </button>
            </div>

            <button onClick={onClose} className="text-white/60 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto p-6 sm:p-8 flex-1 space-y-6">
          {activeTab === 'edit' ? (
            <form id="create-post-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Media Upload Area */}
              <div>
                <label className="block text-xs font-mono tracking-widest text-white/60 uppercase mb-2">
                  MEDIA ASSETS (IMAGE / VIDEO / CAROUSEL)
                </label>
                <div className="border border-dashed border-white/20 p-6 text-center space-y-4 bg-neutral-950">
                  <input
                    type="file"
                    id="media-file-input"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="media-file-input"
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-mono uppercase font-semibold cursor-pointer transition-colors ${
                      isUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{isUploading ? 'UPLOADING TO VAULT...' : 'SELECT VIDEOS & IMAGES'}</span>
                  </label>

                  {/* Uploading progress notification */}
                  {uploadProgress && (
                    <div className="flex items-center justify-center gap-2 text-xs font-mono text-emerald-400">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{uploadProgress}</span>
                    </div>
                  )}

                  {/* Upload Error notification */}
                  {uploadError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-500/30 text-[11px] font-mono text-red-300 max-w-md mx-auto">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 max-w-md mx-auto pt-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="OR PASTE VIDEO / IMAGE URL..."
                      className="flex-1 bg-white/5 border border-white/15 px-3 py-1.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddMediaUrl}
                      className="px-3 py-1.5 border border-white/20 hover:border-white text-xs font-mono uppercase text-white"
                    >
                      ADD
                    </button>
                  </div>
                </div>

                {/* Uploaded Media Thumbnails */}
                {mediaList.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase block">
                      ATTACHED MEDIA ({mediaList.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {mediaList.map((m, index) => (
                        <div key={index} className="relative aspect-[4/3] border border-white/20 bg-neutral-900 group overflow-hidden">
                          {m.type === 'video' ? (
                            <div className="w-full h-full relative bg-black flex flex-col items-center justify-center">
                              <video
                                src={m.url}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover filter grayscale opacity-70 group-hover:opacity-100 transition-opacity"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Film className="w-6 h-6 text-white/80" />
                              </div>
                              <span className="absolute bottom-1 left-1 px-1.5 py-0.2 bg-black/80 text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                                4K VIDEO
                              </span>
                            </div>
                          ) : m.url ? (
                            <img src={m.url} alt="" className="w-full h-full object-cover filter grayscale" />
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(index)}
                            aria-label="Remove media"
                            className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-red-950 text-white transition-colors border border-white/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                          {m.caption && (
                            <span className="absolute top-1 left-1 px-1 bg-black/70 text-[9px] font-mono text-white/70 truncate max-w-[80%]">
                              {m.caption}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Title & AI Copy Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase">
                    TITLE *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleQuickCopyEnhance}
                      disabled={isEnhancingCopy}
                      className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 bg-white/10 hover:bg-white hover:text-black text-white/80 border border-white/15 transition-all disabled:opacity-50"
                      title="Generate high-fashion title & caption using Gemini 3.8 Flash"
                    >
                      {isEnhancingCopy ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      <span>{isEnhancingCopy ? 'GENERATING...' : 'AI COPY ASSIST'}</span>
                    </button>
                    {onOpenCopyStudio && (
                      <button
                        type="button"
                        onClick={onOpenCopyStudio}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-white/50 hover:text-white uppercase transition-colors"
                      >
                        <Wand2 className="w-2.5 h-2.5" />
                        <span>OPEN STUDIO</span>
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="TITLE..."
                  className="w-full bg-white/5 border border-white/15 focus:border-white px-3 py-2 text-sm text-white placeholder-white/20 font-serif uppercase tracking-tight focus:outline-none"
                />
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase">
                    CAPTION / CONTEXT
                  </label>
                  <span className="text-[10px] font-mono text-white/40">
                    EDITORIAL PROSE & INTENT
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Notes on composition, aesthetic dialogue, or research..."
                  className="w-full bg-white/5 border border-white/15 focus:border-white p-3 text-xs text-white placeholder-white/20 font-sans focus:outline-none"
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-[#07070a] border border-white/15 focus:border-white p-2 text-xs font-mono text-white focus:outline-none uppercase"
                  >
                    <option value="COUTURE">COUTURE</option>
                    <option value="EDITORIAL">EDITORIAL</option>
                    <option value="CINEMA">CINEMA</option>
                    <option value="DIGITAL FASHION">DIGITAL FASHION</option>
                    <option value="ARTWORK">ARTWORK</option>
                    <option value="EXPERIMENTAL">EXPERIMENTAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    AI ATTRIBUTION
                  </label>
                  <select
                    value={aiAttribution}
                    onChange={(e: any) => setAiAttribution(e.target.value)}
                    className="w-full bg-[#07070a] border border-white/15 focus:border-white p-2 text-xs font-mono text-white focus:outline-none uppercase"
                  >
                    <option value="AI Generated">AI GENERATED</option>
                    <option value="AI Assisted">AI ASSISTED</option>
                    <option value="Hybrid">HYBRID</option>
                  </select>
                </div>
              </div>

              {/* AI Tools & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    AI TOOLS USED
                  </label>
                  <input
                    type="text"
                    value={aiTools}
                    onChange={(e) => setAiTools(e.target.value)}
                    placeholder="e.g. FLUX.1, Midjourney, Kling"
                    className="w-full bg-white/5 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-widest text-white/60 uppercase mb-1.5">
                    TAGS
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="#couture #cinema #generative"
                    className="w-full bg-white/5 border border-white/15 px-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none"
                  />
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl sm:text-2xl font-serif uppercase tracking-tight text-white">
                  {title || 'UNTITLED WORK'}
                </h3>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 border border-emerald-500/30 px-2 py-0.5 uppercase">
                  {category} · {aiAttribution}
                </span>
              </div>

              {mediaList[0]?.type === 'video' ? (
                <div className="w-full max-w-2xl mx-auto border border-white/20 bg-black">
                  <VideoPlayer
                    src={mediaList[0].url}
                    poster={mediaList[0].poster}
                    title={title}
                    creator={currentUser.username}
                    category={category}
                    aspectRatio="16:9"
                    autoPlay={false}
                  />
                </div>
              ) : mediaList[0]?.url ? (
                <div className="aspect-[3/4] max-w-sm mx-auto overflow-hidden bg-neutral-900 border border-white/20">
                  <img src={mediaList[0].url} alt="" className="w-full h-full object-cover filter grayscale" />
                </div>
              ) : null}

              {caption && (
                <p className="text-xs text-neutral-300 font-light max-w-2xl mx-auto bg-neutral-900/50 p-3 border border-white/10">
                  {caption}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-white/20 hover:border-white text-xs font-mono uppercase text-white/70 hover:text-white"
          >
            CANCEL
          </button>
          <button
            type="submit"
            form="create-post-form"
            disabled={isUploading}
            className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 disabled:opacity-50 text-xs font-mono tracking-widest uppercase font-semibold transition-colors flex items-center gap-2 cursor-pointer"
          >
            {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{isUploading ? 'UPLOADING...' : 'CONFIRM & PUBLISH'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
