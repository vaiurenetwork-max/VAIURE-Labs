import React, { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../../types/social';
import { ForumTopic, ReplyPermission, OptimizedImageItem, ImageProcessingStatus } from '../../types/forum';
import { uploadAndOptimizeThreadImage } from '../../services/forumService';
import { addUploadedAssetToActiveProject } from '../../services/studioProjectService';
import { useLanguage } from '../../services/i18n';
import {
  X,
  Image as ImageIcon,
  Camera,
  ChevronRight,
  SlidersHorizontal,
  Plus,
  Trash2,
  Loader2,
  Check,
  Globe,
  Users,
  AtSign,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Upload,
  ArrowLeft,
  ArrowRight,
  Maximize2,
} from 'lucide-react';

interface AttachedMediaItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'optimizing' | 'completed' | 'failed';
  progress: number;
  optimizedData?: OptimizedImageItem;
  error?: string;
}

interface NewThreadModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  initialTopic?: ForumTopic;
  onClose: () => void;
  onSubmit: (threadData: {
    topic: ForumTopic;
    content: string;
    mediaUrls?: string[];
    optimizedImages?: OptimizedImageItem[];
    imageProcessingStatus?: ImageProcessingStatus;
    chainedThoughts?: { id: string; content: string; mediaUrls?: string[] }[];
    replyPermission: ReplyPermission;
    id?: string;
  }) => Promise<void>;
}

const AVAILABLE_TOPICS: ForumTopic[] = [
  'General Discourse',
  'Prompt Engineering',
  'Aesthetic Critique',
  'Cinema Direction',
  'Synthetic Runway',
  'Workflow & Tech',
  'Tools & Models',
];

export const NewThreadModal: React.FC<NewThreadModalProps> = ({
  isOpen,
  currentUser,
  initialTopic = 'General Discourse',
  onClose,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const [topic, setTopic] = useState<ForumTopic>(initialTopic);
  const [isTopicMenuOpen, setIsTopicMenuOpen] = useState(false);
  const [content, setContent] = useState('');
  
  // Track attached media through the backend optimization pipeline
  const [attachedMedia, setAttachedMedia] = useState<AttachedMediaItem[]>([]);
  const threadIdRef = useRef<string>('');

  // Chained thoughts ("Add to thread")
  const [chainedThoughts, setChainedThoughts] = useState<
    { id: string; content: string; mediaUrls: string[] }[]
  >([]);

  // Post options: Who can reply
  const [replyPermission, setReplyPermission] = useState<ReplyPermission>('EVERYONE');
  const [isReplyOptionsOpen, setIsReplyOptionsOpen] = useState(false);

  // Federation / Archival toggle
  const [broadcastToArchive, setBroadcastToArchive] = useState(true);

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);
  const uploadedSignaturesRef = useRef<Set<string>>(new Set());
  const mainTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset form when opened and clean up temporary object URLs
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setAttachedMedia((prev) => {
        prev.forEach((m) => {
          if (m.previewUrl) {
            try {
              URL.revokeObjectURL(m.previewUrl);
            } catch {}
          }
        });
        return [];
      });
      uploadedSignaturesRef.current.clear();
      setChainedThoughts([]);
      setSubmitError(null);
      setIsTopicMenuOpen(false);
      setIsReplyOptionsOpen(false);
      threadIdRef.current = `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setTimeout(() => {
        mainTextareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddChainedThought = () => {
    setChainedThoughts((prev) => [
      ...prev,
      {
        id: `chain-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        content: '',
        mediaUrls: [],
      },
    ]);
  };

  const handleUpdateChainedContent = (index: number, val: string) => {
    setChainedThoughts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], content: val };
      return copy;
    });
  };

  const handleRemoveChainedThought = (index: number) => {
    setChainedThoughts((prev) => prev.filter((_, i) => i !== index));
  };

  // Process a single image through the backend optimization pipeline
  const processImageUpload = async (item: AttachedMediaItem) => {
    const threadId = threadIdRef.current;
    const userId = currentUser.id || 'guest';

    setAttachedMedia((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, status: 'uploading', progress: 10, error: undefined } : m))
    );

    try {
      const optimizedResult = await uploadAndOptimizeThreadImage(
        item.file,
        userId,
        threadId,
        (pct) => {
          setAttachedMedia((prev) =>
            prev.map((m) =>
              m.id === item.id
                ? {
                    ...m,
                    progress: pct,
                    status: pct >= 90 ? 'optimizing' : 'uploading',
                  }
                : m
            )
          );
        }
      );

      setAttachedMedia((prev) =>
        prev.map((m) =>
          m.id === item.id
            ? {
                ...m,
                status: 'completed',
                progress: 100,
                optimizedData: optimizedResult,
              }
            : m
        )
      );

      // Sync uploaded image directly into Slide 4 AI Studio Asset Library
      addUploadedAssetToActiveProject({
        id: optimizedResult.id || item.id,
        title: item.file.name.replace(/\.[^/.]+$/, '') || 'Slide 1 Upload',
        url: optimizedResult.url,
        thumbnailUrl: optimizedResult.thumbnailUrl || optimizedResult.url,
        resolution:
          optimizedResult.width && optimizedResult.height
            ? `${optimizedResult.width}x${optimizedResult.height}`
            : '1080p',
        fileSizeBytes: optimizedResult.size,
      });
    } catch (err: any) {
      console.warn('Backend image optimization notice, using client DataURL fallback:', err);
      try {
        const fallbackDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Read error'));
          reader.readAsDataURL(item.file);
        });
        const fallbackOpt: OptimizedImageItem = {
          id: item.id,
          originalName: item.file.name,
          url: fallbackDataUrl,
          thumbnailUrl: fallbackDataUrl,
          width: 1200,
          height: 1600,
          format: item.file.type.split('/')[1]?.toUpperCase() || 'IMG',
          size: item.file.size,
          originalSize: item.file.size,
          status: 'completed',
        };
        setAttachedMedia((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  status: 'completed',
                  progress: 100,
                  optimizedData: fallbackOpt,
                }
              : m
          )
        );
        addUploadedAssetToActiveProject({
          id: item.id,
          title: item.file.name.replace(/\.[^/.]+$/, '') || 'Slide 1 Upload',
          url: fallbackDataUrl,
          thumbnailUrl: fallbackDataUrl,
          resolution: '1200x1600',
          fileSizeBytes: item.file.size,
        });
      } catch {
        setAttachedMedia((prev) =>
          prev.map((m) =>
            m.id === item.id
              ? {
                  ...m,
                  status: 'failed',
                  error: err?.message || 'Optimization failed.',
                }
              : m
          )
        );
      }
    }
  };

  const enqueueImageFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const newItems: AttachedMediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setSubmitError(`File "${file.name}" is not an image. Only image formats (JPEG, PNG, WebP, AVIF, GIF) are permitted.`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        setSubmitError(`Image "${file.name}" exceeds the 50MB maximum upload limit.`);
        continue;
      }

      // Prevent duplicate uploads from repeated taps
      const sig = `${file.name}-${file.size}-${file.lastModified}`;
      if (uploadedSignaturesRef.current.has(sig)) {
        continue;
      }
      uploadedSignaturesRef.current.add(sig);

      const itemId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const previewUrl = URL.createObjectURL(file);
      const item: AttachedMediaItem = {
        id: itemId,
        file,
        previewUrl,
        status: 'uploading',
        progress: 0,
      };
      newItems.push(item);
    }

    if (newItems.length > 0) {
      setSubmitError(null);
      setAttachedMedia((prev) => [...prev, ...newItems]);
      newItems.forEach((item) => {
        processImageUpload(item);
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      enqueueImageFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleReplaceFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = replaceTargetIdRef.current;
    if (!file || !targetId) return;
    if (!file.type.startsWith('image/')) {
      setSubmitError(`File "${file.name}" is not a valid image.`);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const updatedItem: AttachedMediaItem = {
      id: targetId,
      file,
      previewUrl,
      status: 'uploading',
      progress: 0,
    };

    setAttachedMedia((prev) =>
      prev.map((m) => {
        if (m.id === targetId) {
          if (m.previewUrl) {
            try {
              URL.revokeObjectURL(m.previewUrl);
            } catch {}
          }
          return updatedItem;
        }
        return m;
      })
    );
    processImageUpload(updatedItem);
    replaceTargetIdRef.current = null;
    if (replaceInputRef.current) replaceInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      enqueueImageFiles(pastedFiles);
    }
  };

  const handleMoveAttached = (index: number, direction: 'LEFT' | 'RIGHT') => {
    setAttachedMedia((prev) => {
      const targetIndex = direction === 'LEFT' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleRemoveAttached = (id: string) => {
    setAttachedMedia((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch (_e) {}
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    // Check if any attached media is still actively processing
    const isAnyProcessing = attachedMedia.some(
      (m) => m.status === 'uploading' || m.status === 'optimizing'
    );
    if (isAnyProcessing) {
      setSubmitError('Please wait for backend image optimization to complete before posting.');
      return;
    }

    const failedItems = attachedMedia.filter((m) => m.status === 'failed');
    if (failedItems.length > 0) {
      setSubmitError('Please remove or retry any failed image uploads before posting.');
      return;
    }

    const completedImages: OptimizedImageItem[] = attachedMedia
      .filter((m) => m.status === 'completed' && Boolean(m.optimizedData))
      .map((m) => m.optimizedData!);

    if (!content.trim() && completedImages.length === 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit({
        id: threadIdRef.current,
        topic,
        content: content.trim(),
        mediaUrls: completedImages.map((img) => img.url),
        optimizedImages: completedImages,
        imageProcessingStatus: 'completed',
        chainedThoughts: chainedThoughts.filter((c) => c.content.trim().length > 0),
        replyPermission,
      });
      onClose();
    } catch (err: any) {
      console.error('Error dispatching thread:', err);
      setSubmitError(err.message || 'Failed to dispatch thread.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAnyProcessing = attachedMedia.some(
    (m) => m.status === 'uploading' || m.status === 'optimizing'
  );
  const completedCount = attachedMedia.filter((m) => m.status === 'completed').length;
  const canPost = (content.trim().length > 0 || completedCount > 0) && !isAnyProcessing && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4 md:p-6 overflow-y-auto select-text">
      <div className="relative w-full max-w-xl min-h-screen sm:min-h-0 bg-[#0d0d10] sm:border sm:border-white/15 sm:rounded-2xl text-white shadow-2xl flex flex-col overflow-hidden max-h-[96vh]">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 bg-[#0d0d10]/95 backdrop-blur border-b border-white/10 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-white/60 hover:text-white p-1 transition-colors rounded-full hover:bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-base font-semibold tracking-tight text-white font-sans">
              {t('newThread')}
            </h2>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* User Row & Topic Selector */}
          <div className="flex items-start gap-3 relative">
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-xs text-white/70">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.displayName}
                  className="w-full h-full object-cover filter grayscale"
                />
              ) : (
                <span>
                  {currentUser.username
                    ? currentUser.username.slice(0, 2).toUpperCase()
                    : 'IV'}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-semibold text-white tracking-tight">
                  {currentUser.username || 'creator'}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
                {/* Topic Selector Button */}
                <button
                  type="button"
                  onClick={() => setIsTopicMenuOpen(!isTopicMenuOpen)}
                  className="text-xs font-mono tracking-wider text-white/70 hover:text-white bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded-full border border-white/15 flex items-center gap-1 transition-colors"
                >
                  <span className="truncate max-w-[140px]">{topic}</span>
                </button>
              </div>

              {/* Topic Dropdown Popover */}
              {isTopicMenuOpen && (
                <div className="absolute top-8 left-12 z-30 w-64 bg-[#141419] border border-white/20 rounded-xl shadow-2xl py-2 mt-1 divide-y divide-white/5">
                  <div className="px-3 py-1.5 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                    SELECT COMMUNITY OR TOPIC
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {AVAILABLE_TOPICS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setTopic(t);
                          setIsTopicMenuOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between ${
                          topic === t
                            ? 'text-white font-medium bg-white/10'
                            : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span>{t}</span>
                        {topic === t && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Main Thread Content Textarea */}
              <div className="mt-2">
                <textarea
                  ref={mainTextareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={t('whatsOnYourMind')}
                  rows={4}
                  className="w-full bg-transparent text-sm sm:text-base text-white placeholder-white/35 focus:outline-none resize-none leading-relaxed font-sans"
                />
              </div>

              {/* Uploaded Media Previews in Compact Responsive Grid */}
              {attachedMedia.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-2.5">
                  {attachedMedia.map((item, idx) => {
                    const isUploadingThis = item.status === 'uploading';
                    const isOptimizingThis = item.status === 'optimizing';
                    const isCompleted = item.status === 'completed';
                    const isFailed = item.status === 'failed';
                    const opt = item.optimizedData;

                    return (
                      <div
                        key={item.id}
                        className={`group relative aspect-[4/5] rounded-xl overflow-hidden border bg-neutral-950 flex flex-col justify-between p-2 transition-all ${
                          isFailed
                            ? 'border-red-500/50 bg-red-950/20'
                            : isCompleted
                            ? 'border-emerald-500/35 shadow-lg'
                            : 'border-white/20'
                        }`}
                      >
                        {/* Background Thumbnail Image */}
                        <img
                          src={opt?.thumbnailUrl || item.previewUrl}
                          alt="Media Preview"
                          onClick={() => setPreviewLightboxUrl(opt?.url || item.previewUrl)}
                          className="absolute inset-0 w-full h-full object-cover filter brightness-95 cursor-pointer"
                        />

                        {/* Top Overlay Badge & Always-Accessible Touch Actions */}
                        <div className="relative z-10 flex items-center justify-between w-full gap-1">
                          {isCompleted ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-black/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                              <Check className="w-2.5 h-2.5" />
                              <span>{opt?.format || 'WEBP'}</span>
                            </span>
                          ) : isFailed ? (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-red-950/90 text-red-300 border border-red-500/40 flex items-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" />
                              <span>FAILED</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider bg-black/80 backdrop-blur-md text-white/80 border border-white/20 flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-400" />
                              <span>{isOptimizingThis ? 'OPTIMIZING' : `${item.progress}%`}</span>
                            </span>
                          )}

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                replaceTargetIdRef.current = item.id;
                                replaceInputRef.current?.click();
                              }}
                              className="p-1.5 bg-black/80 hover:bg-black text-white/80 hover:text-cyan-300 rounded-full transition-colors cursor-pointer shadow"
                              title="Replace image"
                              aria-label="Replace image"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewLightboxUrl(opt?.url || item.previewUrl)}
                              className="p-1.5 bg-black/80 hover:bg-black text-white/80 hover:text-white rounded-full transition-colors cursor-pointer shadow"
                              title="Inspect full image"
                              aria-label="Inspect full image"
                            >
                              <Maximize2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttached(item.id)}
                              className="p-1.5 bg-black/80 hover:bg-black text-white/80 hover:text-rose-400 rounded-full transition-colors cursor-pointer shadow"
                              title="Remove image"
                              aria-label="Remove image"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Center Processing Overlay if Uploading or Optimizing */}
                        {(isUploadingThis || isOptimizingThis) && (
                          <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center">
                            <Loader2 className="w-5 h-5 text-white animate-spin mb-1.5" />
                            <span className="text-[10px] font-mono text-white/90">
                              {isOptimizingThis ? 'Encoding WebP' : 'Uploading...'}
                            </span>
                            <div className="w-16 h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
                              <div
                                className="h-full bg-emerald-400 transition-all duration-300"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Failed Retry Overlay */}
                        {isFailed && (
                          <div className="absolute inset-0 z-0 bg-black/85 flex flex-col items-center justify-center p-2 text-center space-y-1.5">
                            <p className="text-[10px] text-red-300 leading-tight line-clamp-2 px-1">
                              {item.error || 'Failed to process image.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => processImageUpload(item)}
                              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[10px] font-mono text-white flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry Upload</span>
                            </button>
                          </div>
                        )}

                        {/* Bottom Metadata & Touch Reorder Ribbon */}
                        {isCompleted && opt && (
                          <div className="relative z-10 space-y-1">
                            {attachedMedia.length > 1 && (
                              <div className="flex items-center justify-between px-0.5">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveAttached(idx, 'LEFT')}
                                  className="p-1 rounded bg-black/80 text-white/85 hover:text-white disabled:opacity-30 cursor-pointer"
                                  title="Move Left"
                                  aria-label="Move Left"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === attachedMedia.length - 1}
                                  onClick={() => handleMoveAttached(idx, 'RIGHT')}
                                  className="p-1 rounded bg-black/80 text-white/85 hover:text-white disabled:opacity-30 cursor-pointer"
                                  title="Move Right"
                                  aria-label="Move Right"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="bg-black/85 backdrop-blur-md rounded px-1.5 py-0.5 text-[9px] font-mono text-white/75 flex items-center justify-between border border-white/10">
                              <span>
                                {opt.width && opt.height ? `${opt.width}×${opt.height}` : `${Math.round(opt.size / 1024)} KB`}
                              </span>
                              <span className="text-cyan-300" title="Synced to Slide 4 Studio Assets">
                                STUDIO READY
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* General Error Notification */}
              {submitError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span className="flex-1">{submitError}</span>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-red-400/60 hover:text-red-300 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Hidden Native File & Camera Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                onChange={handleReplaceFileSelect}
                className="hidden"
              />

              {/* Compact Touchscreen Upload Bar (Photo Library + Camera + Drag & Drop) */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    enqueueImageFiles(e.dataTransfer.files);
                  }
                }}
                className={`mt-2 p-2.5 rounded-xl border transition-all flex flex-wrap items-center justify-between gap-2 ${
                  isDraggingOver
                    ? 'border-white bg-white/10 text-white'
                    : 'border-white/15 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-3.5 py-2 rounded-lg bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer touch-press"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Photo Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="min-h-[44px] px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer touch-press"
                    title="Take photo with device camera"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Camera</span>
                  </button>
                </div>

                <span className="text-[10px] font-mono text-white/45 hidden sm:inline">
                  Auto WebP · Syncs to Slide 4 Studio
                </span>
              </div>
            </div>
          </div>

          {/* Fullscreen Image Lightbox Preview */}
          {previewLightboxUrl && (
            <div
              onClick={() => setPreviewLightboxUrl(null)}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
            >
              <button
                type="button"
                onClick={() => setPreviewLightboxUrl(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewLightboxUrl}
                alt="Attached Preview"
                className="max-w-full max-h-[88vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          )}

          {/* Chained Thoughts (Connected Thread items) */}
          {chainedThoughts.map((chained, idx) => (
            <div key={chained.id} className="flex items-start gap-3 relative pl-4 mt-3">
              {/* Thread line connecting from previous item */}
              <div className="absolute left-[18px] -top-6 bottom-6 w-0.5 bg-white/15" />

              <div className="w-7 h-7 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center bg-neutral-900 font-mono text-[10px] text-white/70 relative z-10">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt=""
                    className="w-full h-full object-cover filter grayscale"
                  />
                ) : (
                  <span>IV</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50 font-mono">
                    Thread Part {idx + 2}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChainedThought(idx)}
                    className="text-white/40 hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <textarea
                  value={chained.content}
                  onChange={(e) => handleUpdateChainedContent(idx, e.target.value)}
                  placeholder="Continue your thought..."
                  rows={2}
                  className="w-full bg-transparent text-sm text-white placeholder-white/35 focus:outline-none resize-none leading-relaxed mt-1"
                />
              </div>
            </div>
          ))}

          {/* "Add to thread" Trigger Row */}
          <div className="flex items-center gap-3 pl-1 pt-1">
            <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center bg-neutral-900 text-white/40">
              <Plus className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onClick={handleAddChainedThought}
              className="text-xs text-white/50 hover:text-white font-medium transition-colors"
            >
              Add to thread
            </button>
          </div>

          {/* Error Notice */}
          {submitError && (
            <div className="p-3 bg-red-950/60 border border-red-500/30 rounded-lg text-xs text-red-300 font-mono">
              {submitError}
            </div>
          )}
        </div>

        {/* Bottom Bar: Post options & Dispatch button */}
        <div className="sticky bottom-0 z-20 bg-[#0d0d10]/95 backdrop-blur border-t border-white/10 px-5 py-3 flex items-center justify-between">
          {/* Post options dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsReplyOptionsOpen(!isReplyOptionsOpen)}
              className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white font-mono tracking-wider transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>
                {replyPermission === 'EVERYONE'
                  ? t('anyoneCanReply')
                  : replyPermission === 'FOLLOWERS'
                  ? t('followersCanReply')
                  : t('mentionsCanReply')}
              </span>
            </button>

            {isReplyOptionsOpen && (
              <div className="absolute bottom-8 left-0 z-30 w-56 bg-[#141419] border border-white/20 rounded-xl shadow-2xl py-2 divide-y divide-white/5">
                <div className="px-3 py-1 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                  {t('whoCanReply')}
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyPermission('EVERYONE');
                      setIsReplyOptionsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 cursor-pointer ${
                      replyPermission === 'EVERYONE' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t('anyoneCanReply')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyPermission('FOLLOWERS');
                      setIsReplyOptionsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 cursor-pointer ${
                      replyPermission === 'FOLLOWERS' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{t('followersCanReply')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyPermission('MENTIONS');
                      setIsReplyOptionsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 cursor-pointer ${
                      replyPermission === 'MENTIONS' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    <AtSign className="w-3.5 h-3.5" />
                    <span>{t('mentionsCanReply')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Archive / Sync Switch */}
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-white/50">
              <span>{t('archiveSync')}</span>
              <button
                type="button"
                onClick={() => setBroadcastToArchive(!broadcastToArchive)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  broadcastToArchive ? 'bg-white' : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-black absolute top-0.5 transition-transform ${
                    broadcastToArchive ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Post button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canPost || isSubmitting}
              className={`px-5 py-2 rounded-full font-sans text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 ${
                canPost && !isSubmitting
                  ? 'bg-white text-black hover:bg-neutral-200 shadow-md cursor-pointer'
                  : 'bg-white/15 text-white/35 cursor-not-allowed'
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('post')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
