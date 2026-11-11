import React, { useState, useEffect } from 'react';
import { Sparkles, Users, ArrowRight, Play, Eye, Flame, Compass } from 'lucide-react';
import { useLanguage } from '../../../services/i18n';
import { DEMO_ROOMS, DEMO_PARTICIPANTS } from '../../../data/collaborativeDemoData';

interface CollaborativeHeroProps {
  onEnterTopRoom: () => void;
  onExploreLabs: () => void;
  onCreateRoom: () => void;
}

export const CollaborativeHero: React.FC<CollaborativeHeroProps> = ({
  onEnterTopRoom,
  onExploreLabs,
  onCreateRoom,
}) => {
  const { t } = useLanguage();
  const [activeCursorIndex, setActiveCursorIndex] = useState(0);

  // Simulated live cursor positions for the preview canvas
  const previewCursors = [
    { name: 'Alex Rivera', role: 'Editor', color: '#F43F5E', x: 28, y: 35 },
    { name: 'Elena Voss', role: 'Owner', color: '#38BDF8', x: 62, y: 48 },
    { name: 'Mia Zhang', role: 'Director', color: '#A855F7', x: 42, y: 68 },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveCursorIndex((prev) => (prev + 1) % previewCursors.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const featuredRoom = DEMO_ROOMS[0];
  const participants = DEMO_PARTICIPANTS['room-neon-city'] || [];

  return (
    <section className="relative w-full border-b border-white/[0.08] bg-[#050507] text-[#ECECE9] overflow-hidden select-none">
      {/* Background Ambient Glow & Chiaroscuro Gradients (Matching Slide 2) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[300px] bg-white/[0.02] rounded-full blur-[140px]" />
        <div className="absolute -top-12 right-1/4 w-[500px] h-[350px] bg-emerald-500/[0.02] rounded-full blur-[160px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050507]/60 to-[#050507]" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Editorial Kicker, Headline, and CTAs */}
          <div className="lg:col-span-6 space-y-6">
            {/* Eyebrow / Category Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.12] text-[11px] font-mono tracking-[0.2em] uppercase text-white/80 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>VAIURE LABS / MULTIPLAYER COLLABORATION</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-bold uppercase tracking-tight text-white leading-[1.08] drop-shadow-sm">
              Create Together. <br />
              <span className="font-serif italic font-normal text-white/90">Imagine Beyond.</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-sm sm:text-base font-sans text-white/65 leading-relaxed max-w-xl">
              Enter a shared creative space where ideas become cinematic AI videos. Invite your team,
              experiment together, and watch every change happen in real time.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onEnterTopRoom}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-sm bg-white text-black hover:bg-neutral-200 active:scale-95 font-mono text-xs uppercase tracking-widest font-bold transition-all shadow-md cursor-pointer"
              >
                <span>Enter a Room</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onExploreLabs}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm bg-white/[0.06] hover:bg-white/[0.12] active:scale-95 border border-white/15 text-white font-mono text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-white/70" />
                <span>Explore Collaborative Labs</span>
              </button>

              <button
                onClick={onCreateRoom}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-white/50 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer ml-auto sm:ml-0"
              >
                <span>+ Create Room</span>
              </button>
            </div>

            {/* Collaborator Avatars & Live Presence Indicators */}
            <div className="pt-4 border-t border-white/[0.08] flex items-center gap-4">
              <div className="flex items-center -space-x-2">
                {participants.slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id}
                    className="relative w-8 h-8 rounded-full ring-2 ring-[#050507] overflow-hidden bg-neutral-900"
                    title={`${p.displayName} (${p.role})`}
                  >
                    <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-black" />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-mono text-white/60">
                <span className="text-white font-bold">{participants.length} Collaborators</span> active in{' '}
                <span className="text-white/80 underline underline-offset-2">{featuredRoom.name.split('—')[0]}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Canvas Visual Preview */}
          <div className="lg:col-span-6">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-xl border border-white/15 bg-black/60 backdrop-blur-xl overflow-hidden shadow-2xl group">
              {/* Subtle Canvas Dot Grid Pattern */}
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                  backgroundSize: '24px 24px',
                }}
              />

              {/* Top Mini Workspace Chrome Bar */}
              <div className="relative z-10 w-full h-9 px-3.5 bg-black/80 border-b border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-white/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-white font-medium truncate max-w-[180px]">
                    {featuredRoom.name}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-white/10 text-white/80 text-[9px]">LIVE</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/40">SharedWorks Canvas</span>
                </div>
              </div>

              {/* Canvas Content Preview Area */}
              <div className="relative w-full h-[calc(100%-36px)] p-4 sm:p-6 overflow-hidden">
                {/* Simulated Visual Cards */}
                <div className="grid grid-cols-2 gap-3 h-full">
                  {/* Card 1: Prompt Node */}
                  <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md space-y-1.5 transform hover:-translate-y-0.5 transition-transform duration-300">
                    <div className="flex items-center justify-between text-[9px] font-mono text-cyan-400">
                      <span>PROMPT CARD</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    </div>
                    <p className="text-[11px] font-mono text-white/90 line-clamp-3 leading-snug">
                      Sleek magnetic monorail cuts through torrential neon rain over Neo-Shinjuku. 35mm optical flares...
                    </p>
                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-cyan-300/80">
                      <span>Seedance 2.5</span>
                      <span>·</span>
                      <span>1080p</span>
                    </div>
                  </div>

                  {/* Card 2: Generated Video Preview */}
                  <div className="relative rounded-lg border border-white/20 bg-neutral-900/80 overflow-hidden transform hover:-translate-y-0.5 transition-transform duration-300">
                    <img
                      src={featuredRoom.coverImage}
                      alt="Preview"
                      className="w-full h-full object-cover filter contrast-[1.1] brightness-[0.85]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-white">
                      <span className="flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                        <span>Take 03</span>
                      </span>
                      <span className="text-[8px] text-white/70">8s @ 24fps</span>
                    </div>
                  </div>
                </div>

                {/* Animated Floating Collaborator Cursors */}
                {previewCursors.map((cursor, idx) => (
                  <div
                    key={cursor.name}
                    className="absolute z-20 pointer-events-none transition-all duration-1000 ease-out flex items-center gap-1"
                    style={{
                      left: `${cursor.x + (activeCursorIndex === idx ? 4 : -2)}%`,
                      top: `${cursor.y + (activeCursorIndex === idx ? -3 : 2)}%`,
                    }}
                  >
                    {/* SVG Cursor Pointer */}
                    <svg
                      className="w-4 h-4 drop-shadow-md"
                      viewBox="0 0 24 24"
                      fill={cursor.color}
                      stroke="#000"
                      strokeWidth="1.5"
                    >
                      <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
                    </svg>
                    <span
                      className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-black shadow-lg"
                      style={{ backgroundColor: cursor.color }}
                    >
                      {cursor.name.split(' ')[0]}
                    </span>
                  </div>
                ))}

                {/* Subtle Activity Notification Pill (Bottom Center) */}
                <div className="absolute bottom-3 left-4 right-4 z-20">
                  <div className="px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono text-white/80 flex items-center gap-2 shadow-lg animate-in fade-in duration-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="truncate">
                      Alex Rivera generated a new variation: <span className="text-white font-medium">Monorail Speed Run</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
