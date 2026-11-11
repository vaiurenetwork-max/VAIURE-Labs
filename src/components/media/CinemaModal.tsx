import React from 'react';
import { X, Sparkles, Film, Share2, Heart, Download } from 'lucide-react';
import { VideoPlayer } from './VideoPlayer';
import { SocialPost, PostMedia } from '../../types/social';

export interface CinemaModalProps {
  isOpen: boolean;
  onClose: () => void;
  post?: SocialPost | null;
  media?: PostMedia | null;
  onLike?: (postId: string) => void;
  onShare?: (post: SocialPost) => void;
}

export const CinemaModal: React.FC<CinemaModalProps> = ({
  isOpen,
  onClose,
  post,
  media,
  onLike,
  onShare,
}) => {
  if (!isOpen) return null;

  const currentMedia = media || post?.media?.find((m) => m.type === 'video') || post?.media?.[0];
  const videoUrl = currentMedia?.url || '';
  const title = post?.title || currentMedia?.caption || 'CINEMA WORK';
  const creator = post?.authorUsername || post?.authorName || 'ARCHIVE ARTIST';
  const category = post?.category || 'AI CINEMA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-0 sm:p-4 md:p-8 select-text">
      <div className="relative w-full max-w-6xl h-full sm:h-auto max-h-[95vh] bg-[#050507] border border-white/15 text-white flex flex-col overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/60">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest text-white/50 uppercase">
              CINEMA VIEWER
            </span>
          </div>

          <div className="flex items-center gap-3">
            {post && onLike && (
              <button
                onClick={() => onLike(post.id)}
                className={`p-2 border border-white/10 hover:border-white/30 transition-colors flex items-center gap-1.5 text-xs font-mono uppercase ${
                  post.isLiked ? 'text-red-400 border-red-500/40 bg-red-950/20' : 'text-white/70'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${post.isLiked ? 'fill-red-400' : ''}`} />
                <span className="hidden sm:inline">{post.likesCount || 0}</span>
              </button>
            )}

            {post && onShare && (
              <button
                onClick={() => onShare(post)}
                className="p-2 border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono uppercase"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">SHARE</span>
              </button>
            )}

            <button
              onClick={onClose}
              aria-label="Close Cinema"
              className="p-2 text-white/60 hover:text-white border border-white/15 hover:border-white transition-colors flex items-center gap-1 text-xs font-mono tracking-wider uppercase ml-2"
            >
              <span>ESC</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Player Display */}
        <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden min-h-[360px] sm:min-h-[480px]">
          {videoUrl ? (
            <VideoPlayer
              src={videoUrl}
              poster={currentMedia?.poster}
              aspectRatio="16:9"
              autoPlay={true}
              loop={true}
              muted={false}
              title={title}
              creator={creator}
              category={category}
              className="w-full h-full max-h-[70vh]"
            />
          ) : (
            <div className="p-12 text-center text-white/40 font-mono text-xs tracking-widest uppercase">
              NO VIDEO STREAM ATTACHED
            </div>
          )}
        </div>

        {/* Dossier & Metadata Footer */}
        <div className="p-5 sm:p-6 bg-neutral-950 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
                {category} · {post?.aiAttribution || 'AI GENERATIVE'}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-serif uppercase tracking-tight text-white font-medium">
              {title}
            </h2>
            {post?.caption && (
              <p className="text-xs text-neutral-400 font-light max-w-2xl line-clamp-2">
                {post.caption}
              </p>
            )}
          </div>

          {/* Right AI Pipeline Tags & Creator Info */}
          <div className="flex flex-wrap items-center gap-3">
            {post?.aiTools && post.aiTools.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.aiTools.map((tool) => (
                  <span
                    key={tool}
                    className="px-2 py-0.5 border border-white/15 bg-neutral-900 text-[10px] font-mono text-white/70 uppercase"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}

            <div className="pl-3 border-l border-white/10 text-right">
              <span className="text-[10px] font-mono text-white/40 uppercase block">DIRECTOR</span>
              <span className="text-xs font-mono text-white font-medium uppercase">
                @{creator}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
