import React, { useState } from 'react';
import { X, Upload, Film, Music, Tag, Sparkles, AlertCircle } from 'lucide-react';
import { UserProfile } from '../../types/social';
import { ShortCategory, ShortVideo } from '../../types/shorts';
import { useLanguage } from '../../services/i18n';
import { uploadMediaToFirebaseStorage } from '../../services/firestoreSocialService';
import { createFirestoreShort } from '../../services/shortsService';

interface CreateShortModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onPublished?: (short: ShortVideo) => void;
  onOpenAuthModal?: () => void;
}

const CATEGORIES: ShortCategory[] = [
  'AI Cinema',
  'AI Fashion',
  'Visual Art',
  'Behind the Scenes',
  'Experimental',
];

export const CreateShortModal: React.FC<CreateShortModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onPublished,
  onOpenAuthModal,
}) => {
  const { t } = useLanguage();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ShortCategory>('AI Cinema');
  const [soundTitle, setSoundTitle] = useState('');
  const [soundAuthor, setSoundAuthor] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMessage('Please select a valid video file (e.g. MP4, WebM, MOV).');
      return;
    }

    setErrorMessage('');
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser.id) {
      onOpenAuthModal?.();
      return;
    }

    if (!selectedFile && !previewUrl) {
      setErrorMessage('Please select a video to upload.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a title for your short.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let finalVideoUrl = previewUrl;

      // Real upload to Firebase Storage / Backend upload route
      if (selectedFile) {
        const uploadResult = await uploadMediaToFirebaseStorage(
          selectedFile,
          currentUser.id,
          'shorts',
          (pct) => setUploadProgress(pct)
        );
        finalVideoUrl = uploadResult.url;
      }

      // Parse tags
      const tags = tagsInput
        .split(/[,\s#]+/)
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const shortId = `short_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      const newShort: ShortVideo = {
        id: shortId,
        title: title.trim(),
        description: description.trim(),
        videoUrl: finalVideoUrl,
        authorId: currentUser.id,
        authorName: currentUser.displayName || currentUser.username || 'Creator',
        authorUsername: currentUser.username || 'creator',
        authorAvatar: currentUser.avatar || '',
        authorVerified: currentUser.verified || false,
        category,
        tags,
        soundTitle: soundTitle.trim() || 'Original Sound - VAIURE Audio',
        soundAuthor: soundAuthor.trim() || currentUser.displayName || currentUser.username,
        aspectRatio: '9/16',
        viewsCount: 0,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        savesCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      await createFirestoreShort(newShort);

      if (onPublished) {
        onPublished(newShort);
      }

      // Clean up and close
      setSelectedFile(null);
      setPreviewUrl('');
      setTitle('');
      setDescription('');
      setSoundTitle('');
      setSoundAuthor('');
      setTagsInput('');
      onClose();
    } catch (err: any) {
      console.error('Short publish error:', err);
      setErrorMessage(err.message || 'Failed to publish video short. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#09090D] border border-white/15 rounded-2xl shadow-2xl text-white overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wider font-mono uppercase text-white">
                {t('shortsUploadTitle')}
              </h2>
              <p className="text-[11px] text-white/40">
                {t('shortsUploadDesc')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Video Dropzone & Preview (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center">
              <label className="text-xs font-mono tracking-wider text-white/60 uppercase mb-2 self-start">
                {t('shortsVideoFile')} *
              </label>

              <div className="relative w-full aspect-[9/16] max-h-[380px] bg-black/60 border-2 border-dashed border-white/20 hover:border-white/40 rounded-xl overflow-hidden flex flex-col items-center justify-center group transition-colors">
                {previewUrl ? (
                  <>
                    <video
                      src={previewUrl}
                      className="w-full h-full object-cover"
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                    <label
                      htmlFor="short-video-input"
                      className="absolute bottom-3 bg-black/80 hover:bg-black text-white px-3 py-1 rounded-full text-[10px] font-mono tracking-wider border border-white/20 uppercase cursor-pointer backdrop-blur-sm transition-all"
                    >
                      Change Video
                    </label>
                  </>
                ) : (
                  <label
                    htmlFor="short-video-input"
                    className="flex flex-col items-center justify-center p-4 cursor-pointer text-center w-full h-full"
                  >
                    <Upload className="w-8 h-8 text-white/40 group-hover:text-white transition-colors mb-2 stroke-[1.5]" />
                    <span className="text-xs font-semibold text-white/80 group-hover:text-white mb-1">
                      {t('shortsChooseVideo')}
                    </span>
                    <span className="text-[10px] text-white/40 font-mono">
                      MP4, WebM (9:16 Vertical Preferred)
                    </span>
                  </label>
                )}
                <input
                  id="short-video-input"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <p className="mt-2 text-[10px] text-white/40 font-mono truncate max-w-full">
                  {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
              )}
            </div>

            {/* Right: Metadata Inputs (7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-1.5">
                  {t('shortsTitleLabel')} *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('shortsTitlePlaceholder')}
                  required
                  maxLength={120}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white placeholder-white/30"
                />
              </div>

              <div>
                <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-1.5">
                  {t('shortsCategoryLabel')}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ShortCategory)}
                  className="w-full px-3 py-2.5 bg-[#121218] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-1.5">
                  {t('shortsDescLabel')}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('shortsDescPlaceholder')}
                  rows={3}
                  maxLength={800}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white placeholder-white/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-1.5 flex items-center gap-1.5">
                    <Music className="w-3 h-3 text-white/50" />
                    <span>Sound Title</span>
                  </label>
                  <input
                    type="text"
                    value={soundTitle}
                    onChange={(e) => setSoundTitle(e.target.value)}
                    placeholder="Original Sound"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white placeholder-white/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono tracking-wider text-white/70 uppercase mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-white/50" />
                    <span>Hashtags</span>
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="#aicinema, #runway"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/15 focus:border-white focus:outline-none rounded-xl text-xs text-white placeholder-white/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-mono text-white/60">
                <span>Uploading Video...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-mono tracking-wider uppercase text-white/60 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!selectedFile && !previewUrl)}
              className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-wider uppercase font-semibold rounded-xl shadow-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? t('shortsPublishing') : t('shortsPublishBtn')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
