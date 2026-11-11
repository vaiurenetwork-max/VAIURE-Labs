import React, { useEffect, useState } from 'react';
import { AmbientReaction, AtelierSlideId } from '../../types/multiplayer';
import { subscribeToAmbientReactions, AMBIENT_PULSE_CONFIG } from '../../services/multiplayerPresenceService';

interface AmbientReactionOverlayProps {
  currentSlide: AtelierSlideId;
}

interface ActiveRipple extends AmbientReaction {
  key: string;
}

export const AmbientReactionOverlay: React.FC<AmbientReactionOverlayProps> = ({ currentSlide }) => {
  const [ripples, setRipples] = useState<ActiveRipple[]>([]);

  useEffect(() => {
    const unsub = subscribeToAmbientReactions(currentSlide, (reaction) => {
      const rippleKey = `${reaction.id}-${Date.now()}`;
      setRipples((prev) => [...prev.slice(-7), { ...reaction, key: rippleKey }]);

      // Auto-cleanup ripple after 3.2s
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== rippleKey));
      }, 3200);
    });

    return () => unsub();
  }, [currentSlide]);

  if (ripples.length === 0) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none"
      aria-hidden="true"
    >
      {ripples.map((ripple) => {
        const meta = AMBIENT_PULSE_CONFIG[ripple.reaction] || AMBIENT_PULSE_CONFIG.vision;
        const posX = ripple.x ?? 50;
        const posY = ripple.y ?? 50;

        return (
          <div
            key={ripple.key}
            style={{
              left: `${posX}%`,
              top: `${posY}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute flex flex-col items-center justify-center animate-out fade-out duration-700 pointer-events-none"
          >
            {/* Multi-layered expanding rings */}
            <div
              style={{ borderColor: meta.color }}
              className="absolute w-24 h-24 rounded-full border border-opacity-60 animate-ping duration-1000"
            />
            <div
              style={{ borderColor: meta.color }}
              className="absolute w-12 h-12 rounded-full border border-opacity-80 animate-pulse duration-700"
            />

            {/* Glowing Center Badge */}
            <div
              style={{
                boxShadow: `0 0 24px ${meta.color}60`,
                borderColor: `${meta.color}80`,
              }}
              className="relative px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border flex items-center gap-2 transform -translate-y-2 animate-bounce duration-500"
            >
              <span style={{ color: meta.color }} className="text-sm font-mono font-bold">
                {meta.icon}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-widest font-black text-white uppercase">
                  {meta.label}
                </span>
                <span className="text-[8px] font-mono text-white/60 truncate max-w-[120px]">
                  {ripple.actorName}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
