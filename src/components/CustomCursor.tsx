import React, { useEffect, useRef, useState } from 'react';

export type CursorMode = 'default' | 'VIEW' | 'PLAY' | 'DRAG' | 'EXPLORE' | 'OPEN';

export const CustomCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  const [cursorMode, setCursorMode] = useState<CursorMode>('default');
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(true);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const isVisibleRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only enable on fine mouse pointers, never on coarse touchscreens
    if (window.matchMedia('(pointer: coarse)').matches) {
      setIsPointerDevice(false);
      return;
    }

    let rafId: number;

    const renderLoop = () => {
      // Smooth spring lerp for the outer halo ring
      ringPos.current.x += (mousePos.current.x - ringPos.current.x) * 0.24;
      ringPos.current.y += (mousePos.current.y - ringPos.current.y) * 0.24;

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mousePos.current.x}px, ${mousePos.current.y}px, 0)`;
        dotRef.current.style.opacity = isVisibleRef.current ? '1' : '0';
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringPos.current.x}px, ${ringPos.current.y}px, 0)`;
        ringRef.current.style.opacity = isVisibleRef.current ? '1' : '0';
      }

      rafId = requestAnimationFrame(renderLoop);
    };

    rafId = requestAnimationFrame(renderLoop);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isVisibleRef.current) {
        ringPos.current = { x: e.clientX, y: e.clientY };
        isVisibleRef.current = true;
      }
      mousePos.current = { x: e.clientX, y: e.clientY };

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest('[data-cursor]') as HTMLElement | null;
      if (cursorTarget) {
        const mode = cursorTarget.getAttribute('data-cursor') as CursorMode;
        if (mode) {
          setCursorMode((prev) => (prev !== mode ? mode : prev));
          setIsHoveringInteractive(false);
          return;
        }
      }

      const interactive = Boolean(
        target.closest('button, a, input, select, textarea, [role="button"]')
      );
      setIsHoveringInteractive((prev) => (prev !== interactive ? interactive : prev));
      setCursorMode((prev) => (prev !== 'default' ? 'default' : prev));
    };

    const handleMouseLeave = () => {
      isVisibleRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  if (!isPointerDevice) return null;

  const hasLabel = cursorMode !== 'default';

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] select-none hidden md:block overflow-hidden">
      {/* Instant Center Precision Dot */}
      <div
        ref={dotRef}
        className="fixed left-0 top-0 pointer-events-none will-change-transform transition-opacity duration-200"
        style={{ opacity: 0 }}
      >
        <div
          className={`-translate-x-1/2 -translate-y-1/2 rounded-full bg-white mix-blend-difference transition-all duration-200 ease-editorial ${
            hasLabel
              ? 'w-0 h-0 opacity-0'
              : isHoveringInteractive
              ? 'w-1.5 h-1.5 opacity-90'
              : 'w-2 h-2 opacity-80'
          }`}
        />
      </div>

      {/* Smooth Interpolated Outer Ring / Editorial Label */}
      <div
        ref={ringRef}
        className="fixed left-0 top-0 pointer-events-none will-change-transform transition-opacity duration-200"
        style={{ opacity: 0 }}
      >
        {hasLabel ? (
          <div className="-translate-x-1/2 -translate-y-1/2 bg-white/95 backdrop-blur-md text-black px-2.5 py-1 text-[9px] font-mono tracking-[0.22em] uppercase font-semibold border border-black/20 shadow-xl flex items-center justify-center whitespace-nowrap transition-transform duration-200 ease-editorial">
            {cursorMode}
          </div>
        ) : (
          <div
            className={`-translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-300 ease-editorial ${
              isHoveringInteractive
                ? 'w-8 h-8 border-white/45 bg-white/[0.04]'
                : 'w-5 h-5 border-white/15 bg-transparent'
            }`}
          />
        )}
      </div>
    </div>
  );
};
