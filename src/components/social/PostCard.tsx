import React, { useState } from 'react';
import { SocialPost, UserProfile } from '../../types/social';
import { AdministratorBadge } from '../admin/AdministratorBadge';
import { VideoPlayer } from '../media/VideoPlayer';
import {
  Heart,
  MessageSquare,
  Repeat,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  MoreHorizontal,
  Check,
  Sparkles,
  Link as LinkIcon,
  Copy,
} from 'lucide-react';
import { generateCopyShareLink } from '../../services/copyService';

interface PostCardProps {
  post: SocialPost;
  currentUser: UserProfile;
  isFollowing?: boolean;
  onToggleFollow: (username: string) => void;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onOpenComments: (post: SocialPost) => void;
  onOpenRepost: (post: SocialPost) => void;
  onOpenShare: (post: SocialPost) => void;
  onOpenProfile: (username: string) => void;
  onOpenModeration: (postId: string, authorId: string) => void;
  onInlineComment: (postId: string, text: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  isFollowing,
  onToggleFollow,
  onLike,
  onSave,
  onOpenComments,
  onOpenRepost,
  onOpenShare,
  onOpenProfile,
  onOpenModeration,
  onInlineComment,
}) => {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [inlineText, setInlineText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = async () => {
    try {
      const res = await generateCopyShareLink('post', post.id, post.title, post.caption);
      if (res?.shareUrl) {
        await navigator.clipboard.writeText(res.shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {
      // fallback
      await navigator.clipboard.writeText(`${window.location.origin}?view=post&id=${post.id}`);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const isAuthor = post.authorUsername === currentUser.username;
  const currentMedia = post.media[carouselIndex] || post.media[0];

  const handleInlineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineText.trim()) return;
    onInlineComment(post.id, inlineText.trim());
    setInlineText('');
  };

  return (
    <article className="w-full bg-neutral-950 border border-white/10 hover:border-white/20 transition-all duration-300 overflow-hidden text-white flex flex-col">
      {/* Repost Header if this is a repost */}
      {post.repostedBy && (
        <div className="bg-neutral-900/60 border-b border-white/5 px-6 py-2 flex items-center justify-between text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-2">
            <Repeat className="w-3.5 h-3.5 text-white/70" />
            <span>
              REPOSTED BY{' '}
              <button
                onClick={() => onOpenProfile(post.repostedBy!.username)}
                className="text-white hover:underline uppercase"
              >
                @{post.repostedBy.username}
              </button>
            </span>
          </div>
          {post.repostedBy.comment && (
            <span className="italic text-neutral-400 font-serif hidden sm:inline">
              "{post.repostedBy.comment}"
            </span>
          )}
        </div>
      )}

      {/* Creator Header */}
      <div className="p-5 sm:p-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => onOpenProfile(post.authorUsername)}
            className="w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:border-white transition-colors relative flex-shrink-0 flex items-center justify-center bg-neutral-900"
          >
            {Boolean(post.authorAvatar && post.authorAvatar.trim()) ? (
              <img
                src={post.authorAvatar}
                alt={post.authorName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter grayscale contrast-[1.1]"
              />
            ) : (
              <span className="text-xs font-mono text-white/70 uppercase">
                {(post.authorUsername || 'IV').slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => onOpenProfile(post.authorUsername)}
                className="text-sm font-serif font-light uppercase tracking-tight text-white hover:text-white/80 transition-colors"
              >
                {post.authorName}
              </button>
              <span className="text-[11px] font-mono text-white/40">
                @{post.authorUsername}
              </span>
              {(post.authorUsername === 'yinnefuxia' ||
                post.authorRole === 'SUPER_ADMIN' ||
                (post as any).authorEmail === 'fuxiayinne@gmail.com' ||
                (post as any).specialBadge === 'ADMINISTRATOR') && (
                <AdministratorBadge size="xs" />
              )}
            </div>
            <p className="text-[10px] font-mono text-white/40 uppercase">
              {post.authorRole} · {post.createdAt}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAuthor && (
            <button
              onClick={() => onToggleFollow(post.authorUsername)}
              className={`px-3 py-1 text-[11px] font-mono tracking-wider transition-colors border ${
                isFollowing
                  ? 'border-white/20 text-white/60 hover:border-white/40'
                  : 'border-white bg-white text-black hover:bg-neutral-200 font-medium'
              }`}
            >
              {isFollowing ? 'FOLLOWING' : '+ FOLLOW'}
            </button>
          )}

          <button
            onClick={() => onOpenModeration(post.id, post.authorId)}
            aria-label="Post Options"
            className="text-white/40 hover:text-white p-1 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Post Media Container */}
      <div className="relative w-full overflow-hidden bg-black flex items-center justify-center">
        {currentMedia?.type === 'video' ? (
          <div className="w-full">
            <VideoPlayer
              src={currentMedia.url}
              poster={currentMedia.poster}
              aspectRatio="16:9"
              autoPlay={false}
              loop={true}
              muted={true}
              title={post.title}
              creator={post.authorUsername}
              category={post.category}
              className="w-full border-y border-white/5"
            />
          </div>
        ) : (
          <div className="relative w-full overflow-hidden aspect-[4/5] sm:aspect-[16/10] bg-black">
            {Boolean(currentMedia?.url && currentMedia.url.trim()) ? (
              <img
                src={currentMedia.url}
                alt={post.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter grayscale contrast-[1.1]"
              />
            ) : null}
          </div>
        )}

        {/* Carousel controls if multi-media */}
        {post.media.length > 1 && (
          <>
            <button
              onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
              disabled={carouselIndex === 0}
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white transition-opacity ${
                carouselIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCarouselIndex((i) => Math.min(post.media.length - 1, i + 1))}
              disabled={carouselIndex === post.media.length - 1}
              className={`absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white transition-opacity ${
                carouselIndex === post.media.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Dots */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 pointer-events-none">
              {post.media.map((_, i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === carouselIndex ? 'bg-white w-3' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption for current media frame if any */}
      {currentMedia?.caption && (
        <div className="px-5 sm:px-6 py-2 bg-neutral-900/40 border-b border-white/5 text-[11px] font-mono text-white/50">
          {currentMedia.caption}
        </div>
      )}

      {/* Action Bar */}
      <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Like */}
          <button
            onClick={() => onLike(post.id)}
            className="flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white transition-colors"
          >
            <Heart
              className={`w-4 h-4 transition-transform active:scale-125 ${
                post.isLiked ? 'fill-white text-white' : ''
              }`}
            />
            <span className="tabular-nums">{post.likesCount}</span>
          </button>

          {/* Comment */}
          <button
            onClick={() => onOpenComments(post)}
            className="flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="tabular-nums">{post.commentsCount}</span>
          </button>

          {/* Repost */}
          <button
            onClick={() => onOpenRepost(post)}
            className={`flex items-center gap-2 text-xs font-mono transition-colors ${
              post.isReposted ? 'text-white font-medium' : 'text-white/70 hover:text-white'
            }`}
          >
            <Repeat className="w-4 h-4" />
            <span className="tabular-nums">{post.repostsCount}</span>
          </button>

          {/* Share */}
          <button
            onClick={() => onOpenShare(post)}
            className="flex items-center gap-2 text-xs font-mono text-white/70 hover:text-white transition-colors"
            title="Share post"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs font-mono text-white/70 hover:text-white transition-colors"
            title="Copy share link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <LinkIcon className="w-4 h-4" />}
            <span className="text-[10px] hidden sm:inline">{copiedLink ? 'COPIED' : 'COPY'}</span>
          </button>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave(post.id)}
          className={`flex items-center gap-2 text-xs font-mono transition-colors ${
            post.isSaved ? 'text-white' : 'text-white/70 hover:text-white'
          }`}
          title="Save to collection"
        >
          <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-white text-white' : ''}`} />
          <span className="tabular-nums">{post.savesCount}</span>
        </button>
      </div>

      {/* Post Text & Metadata */}
      <div className="p-5 sm:p-6 space-y-4 flex-1">
        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-serif font-light text-white uppercase tracking-tight">
          {post.title}
        </h3>

        {/* Caption */}
        <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed">
          {post.caption}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs font-mono text-white/60 hover:text-white cursor-pointer">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI & Pipeline Metadata Spec */}
        <div className="pt-3 border-t border-white/10 space-y-2 text-[11px] font-mono text-white/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-white/70" />
              <span className="text-white/80">{post.aiAttribution}</span>
              <span>·</span>
              <span>{post.aiTools.join(' · ')}</span>
            </div>
            <span className="text-white/40">{post.category}</span>
          </div>

          {post.collaborators && post.collaborators.length > 0 && (
            <div className="text-[10px] text-white/40">
              COLLABORATORS: {post.collaborators.join(' ')}
            </div>
          )}
        </div>

        {/* Fast inline comment input */}
        <form onSubmit={handleInlineSubmit} className="pt-2 border-t border-white/5 flex items-center gap-2">
          <input
            type="text"
            value={inlineText}
            onChange={(e) => setInlineText(e.target.value)}
            placeholder="Add an editorial observation or comment..."
            className="w-full bg-neutral-900/60 border border-white/10 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            type="submit"
            disabled={!inlineText.trim()}
            className="px-3 py-1.5 bg-white text-black text-xs font-mono tracking-wider uppercase font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            POST
          </button>
        </form>
      </div>
    </article>
  );
};
