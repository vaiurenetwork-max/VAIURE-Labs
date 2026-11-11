/**
 * VAIURE Labs — Community AI Video Showcase
 * Editorial gallery of AI films generated exclusively with Seedance 2.5,
 * featuring creator attribution, prompt inspection, like interactions, and 1-click remixing.
 */

import React, { useState, useEffect } from 'react';
import {
  Film,
  Play,
  Heart,
  Share2,
  Copy,
  Sparkles,
  Check,
  X,
  Eye,
  Filter,
  User,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { CommunityVideoPost } from '../../../types/seedancePlatform';
import { seedancePlatformService } from '../../../services/seedancePlatformService';

interface SeedanceCommunityShowcaseProps {
  onRemixVideo?: (prompt: string, resolution: string) => void;
  onOpenStudio?: () => void;
}

export const SeedanceCommunityShowcase: React.FC<SeedanceCommunityShowcaseProps> = ({
  onRemixVideo,
  onOpenStudio,
}) => {
  const [videos, setVideos] = useState<CommunityVideoPost[]>([]);
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [selectedVideo, setSelectedVideo] = useState<CommunityVideoPost | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadShowcase();
  }, [activeGenre]);

  const loadShowcase = async () => {
    try {
      const posts = await seedancePlatformService.getCommunityShowcase(
        activeGenre === 'All' ? undefined : activeGenre
      );
      setVideos(posts);
    } catch (err) {
      console.error('Failed to load showcase posts:', err);
    }
  };

  const handleLike = async (post: CommunityVideoPost) => {
    const isLiked = likedMap[post.id];
    setLikedMap((prev) => ({ ...prev, [post.id]: !isLiked }));
    setVideos((prev) =>
      prev.map((v) =>
        v.id === post.id ? { ...v, likesCount: isLiked ? v.likesCount - 1 : v.likesCount + 1 } : v
      )
    );
    try {
      await seedancePlatformService.likeVideoPost(post.id);
    } catch {
      // rollback if failed
    }
  };

  const handleCopyPrompt = (post: CommunityVideoPost) => {
    navigator.clipboard.writeText(post.prompt);
    setCopiedPromptId(post.id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#06070A] text-[#ECECE9] overflow-y-auto custom-scrollbar select-none">
      {/* Editorial Hero Header */}
      <div className="border-b border-white/10 bg-gradient-to-b from-[#0C0E14] to-[#06070A] px-6 sm:px-12 py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400 font-bold">
              VAIURE ARCHIVE · SEEDANCE 2.5
            </span>
            <span className="text-white/20">|</span>
            <span className="font-mono text-xs text-white/40">GLOBAL FILMMAKERS</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white uppercase max-w-2xl leading-[1.1]">
            Cinematic AI Film Showcase
          </h1>

          <p className="font-mono text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed">
            Curated motion pieces synthesized by directors worldwide using the official BytePlus Seedance 2.5 architecture. Inspect latent prompts, analyze camera directions, and remix sequences directly into your studio.
          </p>

          {/* Genre Filters */}
          <div className="pt-4 flex flex-wrap items-center gap-2">
            {['All', 'Cinematic', 'Brutalist Fashion', 'Sci-Fi Cyber', 'Anime Realism', 'Commercial'].map(
              (genre) => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`px-3.5 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer ${
                    activeGenre === genre
                      ? 'bg-white text-black font-bold shadow-md'
                      : 'bg-white/[0.04] border border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {genre}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="max-w-6xl mx-auto px-6 sm:px-12 py-8 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((post) => {
            const isLiked = likedMap[post.id];
            return (
              <div
                key={post.id}
                className="group rounded-2xl bg-[#0B0C12] border border-white/10 hover:border-cyan-400/50 transition-all duration-300 overflow-hidden flex flex-col shadow-lg"
              >
                {/* Video / Thumbnail Container */}
                <div
                  onClick={() => setSelectedVideo(post)}
                  className="relative aspect-video bg-black overflow-hidden cursor-pointer"
                >
                  <img
                    src={post.thumbnailUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>
                  </div>

                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-white/10">
                      {post.resolution} · {post.durationSeconds}s
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-mono text-white/70 border border-white/10">
                      Seedance 2.5
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-mono text-white/50 mb-1">
                      <span className="flex items-center gap-1.5 text-white/80">
                        <User className="w-3 h-3 text-cyan-400" />
                        <span>{post.creatorName}</span>
                      </span>
                      <span>{post.genre}</span>
                    </div>

                    <h3 className="font-serif text-sm font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
                      {post.title}
                    </h3>

                    <p className="text-xs font-mono text-white/50 line-clamp-2 mt-1 leading-relaxed">
                      {post.prompt}
                    </p>
                  </div>

                  {/* Actions footer */}
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleLike(post)}
                        className={`flex items-center gap-1 text-xs font-mono transition-colors cursor-pointer ${
                          isLiked ? 'text-red-400' : 'text-white/60 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-400' : ''}`} />
                        <span>{post.likesCount}</span>
                      </button>

                      <button
                        onClick={() => handleCopyPrompt(post)}
                        className="flex items-center gap-1 text-xs font-mono text-white/60 hover:text-white transition-colors cursor-pointer"
                        title="Copy Master Prompt"
                      >
                        {copiedPromptId === post.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedPromptId === post.id ? 'Copied' : 'Prompt'}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        if (onRemixVideo) {
                          onRemixVideo(post.prompt, post.resolution);
                        } else if (onOpenStudio) {
                          onOpenStudio();
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan-400 hover:text-black border border-white/10 text-white font-mono text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Remix</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Video Detail Modal */}
      {selectedVideo && (
        <div
          onClick={() => setSelectedVideo(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl bg-[#090A10] border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-serif text-sm font-bold text-white uppercase">
                  {selectedVideo.title}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {selectedVideo.resolution} · {selectedVideo.durationSeconds}s
                </span>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player */}
            <div className="bg-black flex items-center justify-center">
              <video
                src={selectedVideo.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full max-h-[55vh] object-contain"
              />
            </div>

            {/* Modal Footer & Prompt Inspection */}
            <div className="p-5 border-t border-white/10 space-y-3 bg-[#0B0C12]">
              <div className="flex items-center justify-between text-xs font-mono text-white/50">
                <span>Director: {selectedVideo.creatorName}</span>
                <span>Seedance 2.5 Multi-Shot R2V Latents</span>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs font-mono text-white/80 leading-relaxed">
                {selectedVideo.prompt}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => handleCopyPrompt(selectedVideo)}
                  className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/30 text-white font-mono text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </button>

                <button
                  onClick={() => {
                    const prompt = selectedVideo.prompt;
                    const res = selectedVideo.resolution;
                    setSelectedVideo(null);
                    if (onRemixVideo) {
                      onRemixVideo(prompt, res);
                    } else if (onOpenStudio) {
                      onOpenStudio();
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-mono text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-cyan-400/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open in Seedance 2.5 Studio</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
