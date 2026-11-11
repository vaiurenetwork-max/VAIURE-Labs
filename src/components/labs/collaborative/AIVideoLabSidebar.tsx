import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Film,
  Play,
  Upload,
  Sliders,
  Clock,
  Tv,
  Check,
  Zap,
  Layers,
  X,
} from 'lucide-react';
import { CanvasItem } from '../../../types/collaborativeRooms';

interface AIVideoLabSidebarProps {
  isCollapsed: boolean;
  prefilledPrompt?: string;
  onToggleCollapse: () => void;
  onGenerateComplete: (newItem: CanvasItem) => void;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string;
  roomId: string;
}

export const AIVideoLabSidebar: React.FC<AIVideoLabSidebarProps> = ({
  isCollapsed,
  prefilledPrompt,
  onToggleCollapse,
  onGenerateComplete,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  roomId,
}) => {
  const [mode, setMode] = useState<'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO'>('TEXT_TO_VIDEO');
  const [prompt, setPrompt] = useState(
    'A sleek obsidian magnetic monorail cuts through torrential neon rain over Neo-Shinjuku. Volumetric headlights slice steam rising from deep architectural trenches. Anamorphic lens flare in cobalt blue, 35mm grain.'
  );
  const [negativePrompt, setNegativePrompt] = useState(
    'oversaturated, jitter, low quality, warped facial features, blurry'
  );
  const [modelId, setModelId] = useState('seedance-2.5-ref-video');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1' | '2.39:1'>('16:9');
  const [duration, setDuration] = useState<number>(8);
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('1080p');
  const [generateAudio, setGenerateAudio] = useState(true);

  // Generation progress state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');

  // Update prompt when clicked from a canvas prompt card
  useEffect(() => {
    if (prefilledPrompt) {
      setPrompt(prefilledPrompt);
    }
  }, [prefilledPrompt]);

  const handleGenerate = () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setProgress(10);
    setStageText('Parsing prompt directives & tokens...');

    let current = 10;
    const interval = setInterval(() => {
      current += 18;
      if (current >= 30 && current < 60) {
        setStageText('Synthesizing Seedance 2.5 latent temporal frames...');
      } else if (current >= 60 && current < 85) {
        setStageText(`Rendering ${duration}s @ 24fps (${resolution})...`);
      } else if (current >= 85 && current < 98) {
        setStageText('Harmonizing spatial acoustic audio track...');
      }

      if (current >= 100) {
        clearInterval(interval);
        setProgress(100);
        setStageText('Complete!');

        setTimeout(() => {
          const newItem: CanvasItem = {
            id: `card-gen-${Date.now()}`,
            roomId,
            type: 'VIDEO_PREVIEW',
            title: `Take ${Math.floor(Math.random() * 80 + 10)} / ${prompt.slice(0, 24)}...`,
            content: prompt,
            mediaUrl:
              'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
            thumbnailUrl:
              'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
            x: Math.round(300 + Math.random() * 200),
            y: Math.round(200 + Math.random() * 150),
            width: 320,
            height: 250,
            color: '#10B981',
            aspectRatio,
            durationSeconds: duration,
            resolution,
            modelId,
            tags: ['Seedance 2.5', `${duration}s`, resolution],
            authorId: currentUserId,
            authorName: currentUserName,
            authorAvatar: currentUserAvatar,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          onGenerateComplete(newItem);
          setIsGenerating(false);
          setProgress(0);
        }, 500);
      } else {
        setProgress(current);
      }
    }, 450);
  };

  if (isCollapsed) {
    return (
      <div className="relative z-30 h-full bg-[#0A0A0F] border-l border-white/10 flex flex-col items-center py-3 w-11 shrink-0 select-none">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
          title="Expand AI Video Lab"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-3 mt-6">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all shadow-md"
            title="Open AI Video Lab"
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <aside className="relative z-30 h-full w-72 sm:w-80 bg-[#0A0A0F] border-l border-white/10 flex flex-col shrink-0 text-[#ECECE9] select-none shadow-xl transition-all duration-300">
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-display text-xs font-bold uppercase tracking-wider text-white">
            AI Video Lab
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            Seedance 2.5
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Collapse Video Lab"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher */}
      <div className="p-3 border-b border-white/[0.08] flex items-center gap-2">
        <button
          onClick={() => setMode('TEXT_TO_VIDEO')}
          className={`flex-1 py-1.5 rounded text-xs font-mono tracking-wider transition-colors cursor-pointer ${
            mode === 'TEXT_TO_VIDEO'
              ? 'bg-white text-black font-bold shadow-sm'
              : 'bg-white/[0.04] text-white/60 hover:text-white'
          }`}
        >
          Text-to-Video
        </button>
        <button
          onClick={() => setMode('IMAGE_TO_VIDEO')}
          className={`flex-1 py-1.5 rounded text-xs font-mono tracking-wider transition-colors cursor-pointer ${
            mode === 'IMAGE_TO_VIDEO'
              ? 'bg-white text-black font-bold shadow-sm'
              : 'bg-white/[0.04] text-white/60 hover:text-white'
          }`}
        >
          Image-to-Video
        </button>
      </div>

      {/* Generation Parameters Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar text-xs font-mono">
        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-white/60 text-[11px] uppercase tracking-wider">Target Model</label>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
          >
            <option value="seedance-2.5-ref-video" className="bg-[#121218]">
              BytePlus Seedance 2.5 Ref-Video
            </option>
            <option value="veo-2-cinematic" className="bg-[#121218]">
              Veo 2 Cinematic (Google)
            </option>
            <option value="omni-flash-2.5" className="bg-[#121218]">
              Omni Flash 2.5
            </option>
          </select>
        </div>

        {/* Prompt Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <label className="text-white/60 uppercase tracking-wider">Cinematic Prompt</label>
            <span className="text-[10px] text-white/40">{prompt.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe action, lighting, camera move, atmosphere..."
            className="w-full bg-white/[0.04] border border-white/15 focus:border-white/40 rounded p-2.5 text-xs font-sans text-white placeholder-white/30 focus:outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Negative Prompt */}
        <div className="space-y-1.5">
          <label className="text-white/60 text-[11px] uppercase tracking-wider">Negative Constraints</label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/15 rounded px-2.5 py-1 text-[11px] font-mono text-white/80 focus:outline-none"
          />
        </div>

        {/* Aspect Ratio & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-white/60 text-[11px] uppercase tracking-wider">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as any)}
              className="w-full bg-white/[0.04] border border-white/15 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
            >
              <option value="16:9" className="bg-[#121218]">16:9 Cinema</option>
              <option value="2.39:1" className="bg-[#121218]">2.39:1 Anamorphic</option>
              <option value="9:16" className="bg-[#121218]">9:16 Vertical</option>
              <option value="1:1" className="bg-[#121218]">1:1 Square</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/60 text-[11px] uppercase tracking-wider">Resolution</label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as any)}
              className="w-full bg-white/[0.04] border border-white/15 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
            >
              <option value="1080p" className="bg-[#121218]">1080p HD</option>
              <option value="720p" className="bg-[#121218]">720p</option>
              <option value="480p" className="bg-[#121218]">480p Fast</option>
            </select>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <label className="text-white/60 uppercase tracking-wider">Duration</label>
            <span className="text-white font-bold">{duration} Seconds @ 24fps</span>
          </div>
          <input
            type="range"
            min={4}
            max={30}
            step={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
        </div>

        {/* Audio Generation Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded bg-white/[0.03] border border-white/10">
          <span className="text-[11px] text-white/80">Generate Spatial Audio</span>
          <button
            type="button"
            onClick={() => setGenerateAudio(!generateAudio)}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              generateAudio ? 'bg-emerald-500' : 'bg-neutral-800'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                generateAudio ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Progress Bar during generation */}
        {isGenerating && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-[10px] text-emerald-300">
              <span className="truncate max-w-[200px]">{stageText}</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t border-white/10 bg-black/60">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full py-2.5 rounded-sm bg-white text-black hover:bg-neutral-200 active:scale-95 disabled:opacity-50 font-mono text-xs font-bold uppercase tracking-widest transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>{isGenerating ? 'Rendering Video...' : 'Generate Video'}</span>
        </button>
      </div>
    </aside>
  );
};
