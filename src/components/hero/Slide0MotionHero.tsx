import React, { useEffect, useRef } from 'react';

interface Slide0MotionHeroProps {
  onOpenMenu?: () => void;
  onSeeCampaign?: () => void;
  onViewCampaigns?: () => void;
  onEnterThreads?: () => void;
  onEnterStudio?: () => void;
  isActive?: boolean;
}

const HERO_VIDEO_SRC = '/assets/aistudio/lv_0_20261022183355_b0cc82db.mp4';
const HERO_LOGO_SRC = '/assets/aistudio/file_00000000de308211b9731ea632bfcd4c_498bd48f.png';

export const Slide0MotionHero: React.FC<Slide0MotionHeroProps> = ({
  onOpenMenu,
  onSeeCampaign,
  onViewCampaigns,
  isActive = true,
}) => {
  const stageRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize exact --sc and --u scale tokens on PC and Mobile viewports
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof window === 'undefined') return;

    const syncViewportScales = () => {
      const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;
      const sc = Math.max(vw / 1280, vh / 800);

      let u: number;
      if (vw <= 560) {
        u = Math.min(1, Math.max(0.72, vw / 470));
      } else if (vh > vw) {
        u = Math.min(1.6, Math.max(0.72, vw / 860));
      } else {
        u = Math.min(3, Math.max(0.72, Math.min(vw / 1280, vh / 800)));
      }

      stage.style.setProperty('--sc', `${sc}px`);
      stage.style.setProperty('--u', `${u}px`);
    };

    syncViewportScales();
    window.addEventListener('resize', syncViewportScales, { passive: true });
    window.addEventListener('orientationchange', syncViewportScales, { passive: true });

    return () => {
      window.removeEventListener('resize', syncViewportScales);
      window.removeEventListener('orientationchange', syncViewportScales);
    };
  }, []);

  // Ensure smooth, uninterrupted full-screen background video playback & looping on PC and Mobile
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    vid.muted = true;
    vid.defaultMuted = true;
    vid.playsInline = true;
    vid.loop = true;
    vid.setAttribute('muted', '');
    vid.setAttribute('playsinline', '');
    vid.setAttribute('webkit-playsinline', '');

    const attemptPlay = () => {
      if (!vid) return;
      if (vid.paused) {
        vid.play().catch(() => {
          // Will retry on loadeddata/canplay or user gesture
        });
      }
    };

    attemptPlay();

    const handleEnded = () => {
      vid.currentTime = 0;
      attemptPlay();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        attemptPlay();
      }
    };

    vid.addEventListener('loadedmetadata', attemptPlay);
    vid.addEventListener('loadeddata', attemptPlay);
    vid.addEventListener('canplay', attemptPlay);
    vid.addEventListener('ended', handleEnded);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('touchstart', attemptPlay, { passive: true, once: true });
    window.addEventListener('pointerdown', attemptPlay, { passive: true, once: true });

    return () => {
      vid.removeEventListener('loadedmetadata', attemptPlay);
      vid.removeEventListener('loadeddata', attemptPlay);
      vid.removeEventListener('canplay', attemptPlay);
      vid.removeEventListener('ended', handleEnded);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('touchstart', attemptPlay);
      window.removeEventListener('pointerdown', attemptPlay);
    };
  }, [isActive]);

  // Smoothly interpolate ring animation playbackRate on VAIURE title hover (zero phase jump)
  const setRingsPlaybackRate = (targetRate: number) => {
    const stage = stageRef.current;
    if (!stage || typeof stage.getAnimations !== 'function') return;
    const svgEl = stage.querySelector('.rings');
    if (!svgEl || typeof svgEl.getAnimations !== 'function') return;
    const ringAnims = svgEl.getAnimations({ subtree: true });
    ringAnims.forEach((anim) => {
      try {
        if (typeof anim.updatePlaybackRate === 'function') {
          anim.updatePlaybackRate(targetRate);
        } else {
          anim.playbackRate = targetRate;
        }
      } catch {}
    });
  };

  const handleTitlePointerEnter = () => {
    const stage = stageRef.current;
    if (stage) stage.classList.add('is-title-hovered');
    setRingsPlaybackRate(1.75);
  };

  const handleTitlePointerLeave = () => {
    const stage = stageRef.current;
    if (stage) stage.classList.remove('is-title-hovered');
    setRingsPlaybackRate(1.0);
  };

  // Web Animations API Entrance Choreography (StrictMode-safe)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || typeof stage.animate !== 'function') {
      stage.classList.remove('px-intro');
      return;
    }

    stage.classList.add('px-intro');
    const failsafeTimer = window.setTimeout(() => {
      if (!cancelled) {
        stage.classList.remove('px-intro');
      }
    }, 3500);

    const EXPO = 'cubic-bezier(.16,1,.3,1)';
    const DRAW = 'cubic-bezier(.62,.04,.22,1)';
    const PANEL = 'cubic-bezier(.77,0,.18,1)';
    const SOFT = 'cubic-bezier(.25,1,.5,1)';
    const narrow = window.matchMedia('(max-width:560px)').matches;
    const S = narrow ? 0.8 : 1;
    const anims: Animation[] = [];

    const $ = <T extends Element = HTMLElement>(sel: string): T[] =>
      Array.prototype.slice.call(stage.querySelectorAll(sel));

    const add = (el: Element | null, kf: Keyframe[], o: KeyframeAnimationOptions) => {
      if (!el || typeof el.animate !== 'function') return;
      o.fill = 'both';
      anims.push(el.animate(kf, o));
    };

    const play = () => {
      if (cancelled) return;

      const paths = $<SVGPathElement>('.rings path');
      const delay = [560, 480, 400, 560, 480, 400, 100, 160, 220, 280, 340, 400];

      paths.forEach((p, i) => {
        const L = 1000;
        add(
          p,
          [
            { strokeDasharray: `0 ${L}`, strokeDashoffset: `${-L / 2}` },
            { strokeDasharray: `880 ${L}`, strokeDashoffset: '0' },
          ],
          {
            duration: i > 5 ? 1350 : 1150,
            delay: delay[i] * (i > 5 ? 1 : S),
            easing: DRAW,
          }
        );
      });

      $('.title .title-char').forEach((s, i) => {
        add(
          s,
          [{ translate: '0 105%' }, { translate: '0 0' }],
          {
            duration: 1000,
            delay: 200 + i * 38 * S,
            easing: EXPO,
          }
        );
      });

      add(
        stage.querySelector('.nav'),
        [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }],
        {
          duration: 800,
          delay: 450,
          easing: PANEL,
        }
      );

      $('.logo,.menu').forEach((e, i) => {
        add(
          e,
          [
            { opacity: 0, translate: '0 35%' },
            { opacity: 1, translate: '0 0' },
          ],
          {
            duration: 600,
            delay: 780 + i * 70,
            easing: SOFT,
          }
        );
      });

      const lines = (sel: string, start: number) => {
        $(`${sel} .ln>span`).forEach((s, i) => {
          add(
            s,
            [{ translate: '0 105%' }, { translate: '0 0' }],
            {
              duration: 800,
              delay: start + i * 70 * S,
              easing: EXPO,
            }
          );
        });
      };

      lines('.copy--tl', 700);
      lines('.copy--tr', 760);

      $('.btn').forEach((b, i) => {
        add(
          b,
          [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
          {
            duration: 750,
            delay: 950 + i * 90 * S,
            easing: PANEL,
          }
        );
      });

      $('.lbl').forEach((l, i) => {
        add(
          l,
          [
            { opacity: 0, translate: '0 .45em' },
            { opacity: 1, translate: '0 0' },
          ],
          {
            duration: 550,
            delay: 1200 + i * 90 * S,
            easing: SOFT,
          }
        );
      });

      lines('.copy--bl', 1100);
      lines('.copy--br', 1160);

      window.clearTimeout(failsafeTimer);

      Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
        if (cancelled) return;
        stage.classList.remove('px-intro');
        anims.forEach((a) => {
          try {
            a.cancel();
          } catch {}
        });
        anims.length = 0;
      });
    };

    const rafId = requestAnimationFrame(play);

    return () => {
      cancelled = true;
      window.clearTimeout(failsafeTimer);
      cancelAnimationFrame(rafId);
      anims.forEach((a) => {
        try {
          a.cancel();
        } catch {}
      });
    };
  }, []);

  return (
    <>
      <style>{`
        .vaiure-slide0-stage {
          --bg:#0b0f14;
          --ink:#ffffff;
          --panel:#000000;
          --ring:rgba(255,255,255,.5);
          --vw:100vw;
          --vh:100vh;
          --sc:max(calc(var(--vw) / 1280), calc(var(--vh) / 800));
          --u:clamp(.72px, min(calc(var(--vw) / 1280), calc(var(--vh) / 800)), 3px);
          --mono:"JetBrains Mono","Roboto Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
          --sans:"Plus Jakarta Sans",Inter,"Helvetica Neue",Arial,system-ui,sans-serif;
          position:fixed;
          inset:0;
          width:100vw;
          height:100vh;
          height:100dvh;
          overflow:hidden;
          background:var(--bg);
          -webkit-font-smoothing:antialiased;
          -moz-osx-font-smoothing:grayscale;
          text-rendering:geometricPrecision;
        }
        @supports (height:100dvh){
          .vaiure-slide0-stage { --vh:100dvh; }
        }
        .vaiure-slide0-stage .bg-video {
          position:fixed;
          inset:0;
          width:100vw;
          height:100vh;
          height:100dvh;
          min-width:100%;
          min-height:100%;
          object-fit:cover;
          object-position:center center;
          display:block;
          z-index:0;
          user-select:none;
          -webkit-user-drag:none;
          pointer-events:none;
        }
        .vaiure-slide0-stage .scene {
          position:absolute;
          left:50%;
          top:50%;
          width:calc(1280 * var(--sc));
          height:calc(800 * var(--sc));
          transform:translate(-50%,-50%);
          z-index:1;
          pointer-events:none;
        }
        .vaiure-slide0-stage .scene>svg {
          position:absolute;
          inset:0;
          width:100%;
          height:100%;
          display:block;
          overflow:visible;
        }

        /* =====================================================================
           2. WHITE CIRCULAR LINE KINETIC SCULPTURE ANIMATION (20s–35s LOOPS)
           ===================================================================== */
        @keyframes vaiureRingRotateCW {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes vaiureRingRotateCCW {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(-360deg); }
        }

        /* Subtle continuous line-drawing & arc expansion/contraction along pathLength=1000 */
        @keyframes vaiureArcFlowA {
          0%, 100% {
            stroke-dasharray: 860 1000;
            stroke-dashoffset: 0;
          }
          35% {
            stroke-dasharray: 690 1000;
            stroke-dashoffset: -155;
          }
          70% {
            stroke-dasharray: 950 1000;
            stroke-dashoffset: 95;
          }
        }
        @keyframes vaiureArcFlowB {
          0%, 100% {
            stroke-dasharray: 820 1000;
            stroke-dashoffset: 0;
          }
          40% {
            stroke-dasharray: 960 1000;
            stroke-dashoffset: 135;
          }
          75% {
            stroke-dasharray: 660 1000;
            stroke-dashoffset: -175;
          }
        }
        @keyframes vaiureArcFlowC {
          0%, 100% {
            stroke-dasharray: 900 1000;
            stroke-dashoffset: 0;
          }
          45% {
            stroke-dasharray: 710 1000;
            stroke-dashoffset: -190;
          }
          80% {
            stroke-dasharray: 970 1000;
            stroke-dashoffset: 110;
          }
        }

        /* Subtle Parallax Depth Layers between Outer, Mid, and Inner Rings */
        @keyframes vaiureRingParallaxOuter {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -2.2px, 0) scale(1.011); }
        }
        @keyframes vaiureRingParallaxMid {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, 1.8px, 0) scale(0.992); }
        }
        @keyframes vaiureRingParallaxInner {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -1.5px, 0) scale(1.016); }
        }

        .vaiure-slide0-stage .rings-parallax {
          transform-origin: 635.9px 393.5px;
          will-change: transform;
        }
        .vaiure-slide0-stage .rings-parallax--outer {
          animation: vaiureRingParallaxOuter 9.4s ease-in-out infinite;
        }
        .vaiure-slide0-stage .rings-parallax--mid {
          animation: vaiureRingParallaxMid 7.8s ease-in-out -2.4s infinite;
        }
        .vaiure-slide0-stage .rings-parallax--inner {
          animation: vaiureRingParallaxInner 6.6s ease-in-out -1.3s infinite;
        }

        .vaiure-slide0-stage .ring-orbit {
          transform-origin: 635.9px 393.5px;
          will-change: transform;
        }
        /* Individual ring rotation speeds (20s–35s) and alternating directions */
        .vaiure-slide0-stage .ring-orbit--0  { animation: vaiureRingRotateCW  34s linear infinite; }
        .vaiure-slide0-stage .ring-orbit--1  { animation: vaiureRingRotateCCW 28s linear -4s infinite; }
        .vaiure-slide0-stage .ring-orbit--2  { animation: vaiureRingRotateCW  23s linear -9s infinite; }
        .vaiure-slide0-stage .ring-orbit--3  { animation: vaiureRingRotateCCW 32s linear -2s infinite; }
        .vaiure-slide0-stage .ring-orbit--4  { animation: vaiureRingRotateCW  26s linear -11s infinite; }
        .vaiure-slide0-stage .ring-orbit--5  { animation: vaiureRingRotateCCW 21s linear -6s infinite; }
        .vaiure-slide0-stage .ring-orbit--6  { animation: vaiureRingRotateCW  20s linear -3s infinite; }
        .vaiure-slide0-stage .ring-orbit--7  { animation: vaiureRingRotateCCW 25s linear -14s infinite; }
        .vaiure-slide0-stage .ring-orbit--8  { animation: vaiureRingRotateCW  29s linear -7s infinite; }
        .vaiure-slide0-stage .ring-orbit--9  { animation: vaiureRingRotateCCW 22s linear -12s infinite; }
        .vaiure-slide0-stage .ring-orbit--10 { animation: vaiureRingRotateCW  31s linear -5s infinite; }
        .vaiure-slide0-stage .ring-orbit--11 { animation: vaiureRingRotateCCW 35s linear -16s infinite; }

        .vaiure-slide0-stage .rings path {
          fill:none;
          stroke:var(--ring);
          stroke-width:1;
          stroke-linecap:butt;
          transition: stroke 0.85s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.85s ease;
          will-change: stroke-dasharray, stroke-dashoffset;
        }

        /* Continuous arc drawing & segment expansion/contraction after intro */
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--0 path  { animation: vaiureArcFlowA 15.5s ease-in-out -1.2s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--1 path  { animation: vaiureArcFlowB 13.2s ease-in-out -4.5s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--2 path  { animation: vaiureArcFlowC 17.0s ease-in-out -2.8s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--3 path  { animation: vaiureArcFlowB 16.4s ease-in-out -6.1s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--4 path  { animation: vaiureArcFlowC 14.1s ease-in-out -3.3s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--5 path  { animation: vaiureArcFlowA 18.2s ease-in-out -8.0s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--6 path  { animation: vaiureArcFlowB 11.8s ease-in-out -2.1s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--7 path  { animation: vaiureArcFlowA 14.8s ease-in-out -5.4s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--8 path  { animation: vaiureArcFlowC 12.6s ease-in-out -3.9s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--9 path  { animation: vaiureArcFlowA 16.0s ease-in-out -7.2s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--10 path { animation: vaiureArcFlowB 17.6s ease-in-out -1.8s infinite; }
        .vaiure-slide0-stage:not(.px-intro) .ring-orbit--11 path { animation: vaiureArcFlowC 19.0s ease-in-out -9.5s infinite; }

        /* Subtle ring luminescence response when VAIURE central text is hovered */
        .vaiure-slide0-stage.is-title-hovered .rings path {
          stroke: rgba(255, 255, 255, 0.72);
        }

        /* =====================================================================
           1. CENTRAL "VAIURE" TYPOGRAPHY MOTION (6.2s SEAMLESS BREATHING LOOP)
           ===================================================================== */
        @keyframes vaiureCentralLogoBreath {
          0%, 100% {
            transform: translate3d(0, calc(1.8 * var(--sc)), 0) scale(1);
            opacity: 0.88;
          }
          50% {
            transform: translate3d(0, calc(-2.4 * var(--sc)), 0) scale(1.022);
            opacity: 1;
          }
        }

        @keyframes vaiureLetterExpand {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(calc(var(--char-idx, 0) * 1.35 * var(--sc)), 0, 0);
          }
        }

        .vaiure-slide0-stage .title {
          position:absolute;
          left:0;
          width:calc(635 * 2 * var(--sc));
          top:calc(378 * var(--sc));
          font-family:var(--sans);
          font-weight:400;
          font-size:calc(46 * var(--sc));
          line-height:1;
          font-kerning:none;
          letter-spacing:-0.01em;
          color:var(--ink);
          text-align:center;
          white-space:nowrap;
          pointer-events:none;
        }
        .vaiure-slide0-stage .title-interactive {
          display:inline-block;
          padding:calc(18 * var(--sc)) calc(32 * var(--sc));
          margin:calc(-18 * var(--sc)) calc(-32 * var(--sc));
          pointer-events:auto;
          cursor:pointer;
          transform-origin:50% 50%;
          transition:
            transform 0.85s cubic-bezier(0.22, 1, 0.36, 1),
            filter 0.85s cubic-bezier(0.22, 1, 0.36, 1);
          will-change:transform, filter;
        }
        .vaiure-slide0-stage .title-interactive:hover,
        .vaiure-slide0-stage.is-title-hovered .title-interactive {
          transform:scale(1.045);
          filter:brightness(1.22) drop-shadow(0 0 18px rgba(255, 255, 255, 0.28));
        }
        .vaiure-slide0-stage .title-kinetic {
          display:inline-block;
          transform-origin:50% 50%;
          animation:vaiureCentralLogoBreath 6.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change:transform, opacity;
        }
        .vaiure-slide0-stage .title .title-char {
          display:inline-block;
          margin-left:calc(var(--k,0) * var(--sc));
          animation:vaiureLetterExpand 6.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
          will-change:transform;
        }
        .vaiure-slide0-stage .ui {
          position:absolute;
          inset:0;
          z-index:2;
          pointer-events:none;
        }
        .vaiure-slide0-stage .ui>* {
          pointer-events:auto;
        }
        .vaiure-slide0-stage .copy {
          position:absolute;
          font-family:var(--mono);
          font-weight:400;
          font-size:calc(14 * var(--u));
          line-height:calc(17.5 * var(--u));
          letter-spacing:-0.025em;
          color:var(--ink);
          text-transform:uppercase;
          white-space:nowrap;
          text-shadow:0 1px 10px rgba(0,0,0,0.35);
        }
        .vaiure-slide0-stage .copy--tl {
          left:calc(34.5 * var(--u));
          top:calc(46.6 * var(--u));
        }
        .vaiure-slide0-stage .copy--tr {
          right:calc(45 * var(--u));
          top:calc(39 * var(--u));
          text-align:right;
        }
        .vaiure-slide0-stage .copy--bl {
          left:calc(34.5 * var(--u));
          bottom:calc(39.5 * var(--u));
        }
        .vaiure-slide0-stage .copy--br {
          right:calc(45 * var(--u));
          bottom:calc(39.5 * var(--u));
          text-align:right;
        }
        .vaiure-slide0-stage .nav {
          position:absolute;
          top:calc(29.5 * var(--u));
          left:calc(50% - 5 * var(--u));
          transform:translateX(-50%);
          width:calc(300.5 * var(--u));
          height:calc(53.7 * var(--u));
          background:var(--panel);
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:0 calc(15 * var(--u)) 0 calc(9 * var(--u));
        }
        .vaiure-slide0-stage .logo {
          display:flex;
          align-items:center;
          color:var(--ink);
          text-decoration:none;
          font-family:var(--sans);
          font-weight:700;
          font-size:calc(39 * var(--u));
          line-height:1;
          letter-spacing:-0.01em;
          height:100%;
        }
        .vaiure-slide0-stage .logo-img {
          height:calc(34 * var(--u));
          width:auto;
          max-width:calc(210 * var(--u));
          object-fit:contain;
          display:block;
          user-select:none;
          -webkit-user-drag:none;
        }
        .vaiure-slide0-stage .menu {
          position:relative;
          width:calc(17 * var(--u));
          height:calc(8.3 * var(--u));
          background:none;
          border:0;
          cursor:pointer;
          transform:translateY(calc(-0.5 * var(--u)));
        }
        .vaiure-slide0-stage .menu::before,
        .vaiure-slide0-stage .menu::after {
          content:"";
          position:absolute;
          left:0;
          right:0;
          height:max(1px,calc(1 * var(--u)));
          background:var(--ink);
        }
        .vaiure-slide0-stage .menu::before { top:0; }
        .vaiure-slide0-stage .menu::after { bottom:0; }
        .vaiure-slide0-stage .ctas {
          position:absolute;
          left:calc(35 * var(--u));
          bottom:calc(98 * var(--u));
          display:flex;
          flex-direction:column;
          gap:calc(9 * var(--u));
        }
        .vaiure-slide0-stage .btn {
          display:flex;
          align-items:center;
          justify-content:center;
          width:calc(142.4 * var(--u));
          height:calc(45 * var(--u));
          background:var(--panel);
          color:var(--ink);
          text-decoration:none;
          font-family:var(--mono);
          font-weight:400;
          font-size:calc(14 * var(--u));
          line-height:1;
          letter-spacing:-0.025em;
          text-transform:uppercase;
          white-space:nowrap;
          padding-top:calc(0.5 * 2 * var(--u));
          transition:background .2s,color .2s;
          cursor:pointer;
        }
        .vaiure-slide0-stage .btn:hover {
          background:var(--ink);
          color:var(--panel);
        }
        .vaiure-slide0-stage a:focus-visible,
        .vaiure-slide0-stage button:focus-visible {
          outline:2px solid #fff;
          outline-offset:3px;
        }
        @media (orientation:portrait) and (min-width:561px){
          .vaiure-slide0-stage { --u:clamp(.72px, calc(var(--vw) / 860), 1.6px); }
        }
        @media (max-width:560px){
          .vaiure-slide0-stage { --u:clamp(.72px, calc(var(--vw) / 470), 1px); }
          .vaiure-slide0-stage .nav {
            left:calc(20 * var(--u));
            right:calc(20 * var(--u));
            width:auto;
            transform:none;
            top:calc(20 * var(--u));
          }
          .vaiure-slide0-stage .copy--tl { left:calc(20 * var(--u)); top:calc(96 * var(--u)); }
          .vaiure-slide0-stage .copy--tr { right:calc(20 * var(--u)); top:calc(96 * var(--u)); }
          .vaiure-slide0-stage .copy--bl { left:calc(20 * var(--u)); bottom:calc(24 * var(--u)); }
          .vaiure-slide0-stage .ctas { left:calc(20 * var(--u)); bottom:calc(76 * var(--u)); }
          .vaiure-slide0-stage .copy--br { right:calc(20 * var(--u)); bottom:calc(24 * var(--u)); }
        }
        @media (prefers-reduced-motion:reduce){
          .vaiure-slide0-stage *,
          .vaiure-slide0-stage .rings-parallax,
          .vaiure-slide0-stage .ring-orbit,
          .vaiure-slide0-stage .rings path,
          .vaiure-slide0-stage .title-kinetic,
          .vaiure-slide0-stage .title .title-char {
            transition:none!important;
            animation:none!important;
          }
        }
        .vaiure-slide0-stage .ln { display:block; }
        .vaiure-slide0-stage .ln>span { display:inline-block; }
        .vaiure-slide0-stage.px-intro .rings path { stroke-dasharray:0 100000; }
        .vaiure-slide0-stage.px-intro .title { overflow:hidden; }
        .vaiure-slide0-stage.px-intro .title .title-char { translate:0 105%; }
        .vaiure-slide0-stage.px-intro .ln { overflow:hidden; }
        .vaiure-slide0-stage.px-intro .ln>span { translate:0 105%; }
        .vaiure-slide0-stage.px-intro .nav { clip-path:inset(0 50% 0 50%); }
        .vaiure-slide0-stage.px-intro .logo,
        .vaiure-slide0-stage.px-intro .menu { opacity:0; }
        .vaiure-slide0-stage.px-intro .btn { clip-path:inset(0 100% 0 0); }
        .vaiure-slide0-stage.px-intro .lbl { opacity:0; }
      `}</style>

      <main ref={stageRef} className="stage vaiure-slide0-stage px-intro">
        {/* Full-Viewport Smooth Loop Background Video (PC & Mobile) */}
        <video
          ref={videoRef}
          className="bg-video"
          src={HERO_VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          draggable={false}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>

        <div className="scene" aria-hidden="false">
          {/* Exact 12 SVG Ring Paths with Parallax Depth Layers & Desynchronized Orbital Rotation */}
          <svg
            className="rings"
            viewBox="0 0 1280 800"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {/* Outer Parallax Ring Layer */}
            <g className="rings-parallax rings-parallax--outer">
              <g className="ring-orbit ring-orbit--0">
                <path
                  pathLength={1000}
                  d="M63.82 409.55C63.71 407.98 63.31 403.27 63.17 400.13C63.03 396.99 62.95 393.83 62.98 390.68C63.01 387.53 63.12 384.37 63.33 381.22C63.54 378.07 63.87 374.93 64.26 371.80C64.66 368.67 65.14 365.54 65.70 362.43C66.26 359.32 66.89 356.21 67.62 353.14C68.35 350.06 69.17 347.01 70.08 343.98C70.99 340.95 72.01 337.95 73.09 334.98C74.17 332.01 75.33 329.05 76.57 326.14C77.81 323.23 79.11 320.35 80.51 317.51C81.91 314.67 83.39 311.87 84.95 309.12C86.51 306.37 88.14 303.66 89.85 301.00C91.55 298.34 93.34 295.73 95.18 293.16C97.02 290.59 98.91 288.05 100.87 285.58C102.84 283.11 104.88 280.70 106.97 278.34C109.06 275.98 111.23 273.68 113.44 271.43C115.65 269.18 117.93 266.99 120.25 264.86C122.57 262.73 124.95 260.66 127.38 258.65C129.81 256.64 132.29 254.70 134.82 252.82C137.35 250.94 139.92 249.12 142.54 247.37C145.16 245.62 147.82 243.92 150.51 242.29C153.20 240.66 155.92 239.07 158.69 237.57C161.46 236.07 164.27 234.63 167.11 233.28C169.96 231.93 172.84 230.66 175.76 229.46C178.68 228.26 181.64 227.15 184.61 226.10C187.58 225.05 190.58 224.05 193.60 223.14C196.62 222.23 199.66 221.39 202.73 220.64C205.80 219.89 208.89 219.23 212.00 218.64C215.11 218.05 218.23 217.55 221.36 217.11C224.49 216.67 227.77 216.31 230.79 216.01C233.81 215.71 238.05 215.45 239.50 215.34"
                />
              </g>
              <g className="ring-orbit ring-orbit--1">
                <path
                  pathLength={1000}
                  d="M122.52 484.49C121.83 483.37 119.70 480.04 118.37 477.77C117.04 475.50 115.77 473.19 114.54 470.86C113.31 468.53 112.12 466.16 111.02 463.77C109.92 461.38 108.90 458.94 107.93 456.49C106.96 454.04 106.05 451.55 105.20 449.05C104.35 446.55 103.54 444.03 102.82 441.49C102.09 438.95 101.43 436.38 100.85 433.80C100.27 431.22 99.78 428.61 99.34 426.00C98.90 423.39 98.49 420.76 98.18 418.13C97.87 415.50 97.63 412.86 97.48 410.21C97.33 407.56 97.30 404.90 97.30 402.25C97.30 399.60 97.33 396.94 97.47 394.29C97.61 391.64 97.85 389.00 98.15 386.36C98.45 383.73 98.85 381.10 99.29 378.48C99.73 375.87 100.23 373.25 100.81 370.67C101.39 368.09 102.06 365.52 102.78 362.97C103.50 360.42 104.28 357.89 105.13 355.38C105.97 352.87 106.88 350.37 107.85 347.91C108.82 345.45 109.87 343.02 110.97 340.61C112.07 338.20 113.22 335.82 114.44 333.47C115.66 331.12 116.95 328.80 118.29 326.52C119.64 324.24 121.05 322.00 122.51 319.80C123.97 317.60 125.49 315.43 127.06 313.30C128.63 311.17 130.23 309.06 131.91 307.02C133.59 304.98 135.34 303.00 137.14 301.06C138.94 299.12 140.80 297.25 142.70 295.41C144.60 293.57 146.53 291.77 148.52 290.03C150.51 288.29 152.53 286.60 154.61 284.98C156.69 283.36 158.83 281.81 160.99 280.29C163.15 278.77 165.33 277.30 167.55 275.88C169.77 274.46 172.02 273.09 174.31 271.79C176.60 270.49 178.93 269.24 181.28 268.06C183.63 266.88 186.02 265.75 188.43 264.69C190.84 263.63 193.29 262.66 195.75 261.71C198.21 260.76 200.67 259.81 203.17 258.97C205.67 258.13 208.19 257.36 210.73 256.65C213.27 255.94 215.83 255.31 218.41 254.73C220.99 254.14 223.58 253.60 226.18 253.14C228.78 252.68 231.40 252.30 234.03 251.99C236.66 251.69 239.30 251.49 241.94 251.31C244.58 251.13 247.23 250.95 249.88 250.90C252.53 250.85 255.19 250.89 257.84 251.01C260.49 251.13 263.13 251.38 265.77 251.64C268.41 251.90 271.07 252.22 273.68 252.58C276.29 252.94 280.15 253.59 281.44 253.79"
                />
              </g>
              <g className="ring-orbit ring-orbit--3">
                <path
                  pathLength={1000}
                  d="M1032.50 215.26C1034.08 215.36 1038.82 215.57 1041.96 215.85C1045.11 216.13 1048.25 216.49 1051.37 216.93C1054.49 217.37 1057.61 217.88 1060.70 218.48C1063.79 219.08 1066.87 219.78 1069.92 220.56C1072.97 221.34 1076.00 222.21 1079.01 223.13C1082.02 224.05 1085.02 225.01 1087.98 226.07C1090.94 227.12 1093.88 228.25 1096.78 229.46C1099.68 230.67 1102.54 231.98 1105.37 233.34C1108.20 234.70 1111.00 236.13 1113.77 237.62C1116.54 239.11 1119.27 240.65 1121.96 242.27C1124.65 243.89 1127.30 245.59 1129.90 247.35C1132.51 249.10 1135.07 250.92 1137.59 252.80C1140.11 254.68 1142.60 256.61 1145.02 258.61C1147.44 260.61 1149.82 262.68 1152.13 264.81C1154.45 266.94 1156.72 269.12 1158.91 271.38C1161.10 273.63 1163.22 275.97 1165.29 278.34C1167.36 280.71 1169.36 283.15 1171.31 285.62C1173.26 288.09 1175.16 290.61 1176.99 293.17C1178.82 295.74 1180.58 298.35 1182.27 301.01C1183.96 303.67 1185.56 306.39 1187.11 309.14C1188.66 311.89 1190.17 314.67 1191.58 317.49C1192.99 320.31 1194.34 323.17 1195.56 326.08C1196.78 328.99 1197.88 331.95 1198.93 334.93C1199.98 337.91 1200.97 340.91 1201.86 343.94C1202.75 346.97 1203.56 350.02 1204.28 353.09C1205.00 356.16 1205.63 359.25 1206.18 362.35C1206.73 365.45 1207.20 368.57 1207.57 371.70C1207.94 374.83 1208.22 377.97 1208.42 381.11C1208.62 384.25 1208.75 387.40 1208.78 390.54C1208.81 393.68 1208.73 396.96 1208.62 399.96C1208.51 402.96 1208.19 407.11 1208.10 408.54"
                />
              </g>
              <g className="ring-orbit ring-orbit--4">
                <path
                  pathLength={1000}
                  d="M990.53 253.66C991.84 253.43 995.75 252.69 998.38 252.30C1001.00 251.91 1003.64 251.59 1006.28 251.34C1008.92 251.09 1011.57 250.88 1014.21 250.77C1016.86 250.66 1019.50 250.65 1022.15 250.70C1024.80 250.75 1027.44 250.89 1030.08 251.07C1032.72 251.25 1035.35 251.48 1037.97 251.78C1040.59 252.08 1043.22 252.43 1045.82 252.86C1048.42 253.30 1051.02 253.81 1053.59 254.39C1056.16 254.97 1058.71 255.61 1061.25 256.32C1063.79 257.03 1066.30 257.81 1068.80 258.65C1071.30 259.48 1073.78 260.38 1076.23 261.33C1078.68 262.28 1081.12 263.29 1083.52 264.36C1085.92 265.43 1088.30 266.56 1090.65 267.74C1093.00 268.92 1095.33 270.14 1097.61 271.45C1099.89 272.75 1102.12 274.15 1104.34 275.57C1106.55 276.99 1108.74 278.45 1110.90 279.96C1113.06 281.47 1115.20 283.00 1117.28 284.62C1119.36 286.24 1121.38 287.93 1123.37 289.66C1125.36 291.39 1127.30 293.18 1129.19 295.01C1131.08 296.84 1132.93 298.73 1134.73 300.66C1136.53 302.59 1138.29 304.56 1139.98 306.58C1141.67 308.60 1143.32 310.68 1144.89 312.80C1146.46 314.92 1147.96 317.10 1149.42 319.30C1150.88 321.50 1152.29 323.75 1153.64 326.02C1154.99 328.29 1156.28 330.60 1157.50 332.94C1158.72 335.28 1159.87 337.67 1160.96 340.08C1162.05 342.49 1163.07 344.93 1164.03 347.39C1164.99 349.85 1165.89 352.34 1166.72 354.85C1167.55 357.36 1168.32 359.89 1169.02 362.44C1169.72 364.99 1170.35 367.56 1170.93 370.14C1171.51 372.72 1172.04 375.31 1172.49 377.92C1172.94 380.53 1173.32 383.15 1173.62 385.78C1173.92 388.41 1174.13 391.05 1174.29 393.69C1174.45 396.33 1174.55 398.98 1174.56 401.63C1174.57 404.28 1174.48 406.93 1174.34 409.57C1174.19 412.21 1173.99 414.85 1173.69 417.48C1173.39 420.11 1173.02 422.73 1172.57 425.34C1172.12 427.94 1171.58 430.53 1171.00 433.11C1170.42 435.69 1169.81 438.25 1169.11 440.80C1168.41 443.35 1167.66 445.88 1166.81 448.38C1165.96 450.88 1165.02 453.34 1164.03 455.78C1163.04 458.22 1161.98 460.64 1160.89 463.03C1159.80 465.42 1158.67 467.80 1157.47 470.14C1156.27 472.48 1155.01 474.80 1153.68 477.07C1152.35 479.34 1150.20 482.64 1149.51 483.76"
                />
              </g>
            </g>

            {/* Middle Parallax Ring Layer */}
            <g className="rings-parallax rings-parallax--mid">
              <g className="ring-orbit ring-orbit--2">
                <path
                  pathLength={1000}
                  d="M196.72 531.07C195.73 530.51 192.74 528.87 190.79 527.70C188.84 526.53 186.91 525.31 185.03 524.03C183.15 522.75 181.31 521.42 179.51 520.04C177.71 518.66 175.96 517.21 174.24 515.73C172.52 514.25 170.82 512.75 169.17 511.19C167.52 509.63 165.93 508.02 164.36 506.39C162.79 504.76 161.25 503.09 159.75 501.40C158.25 499.70 156.77 497.99 155.36 496.22C153.95 494.45 152.58 492.63 151.27 490.79C149.96 488.95 148.71 487.06 147.48 485.16C146.25 483.26 145.05 481.34 143.90 479.39C142.75 477.44 141.64 475.45 140.60 473.44C139.56 471.43 138.58 469.38 137.66 467.31C136.74 465.24 135.90 463.13 135.09 461.01C134.28 458.89 133.51 456.75 132.80 454.60C132.09 452.45 131.42 450.27 130.83 448.08C130.24 445.89 129.71 443.67 129.25 441.45C128.79 439.23 128.40 436.99 128.06 434.74C127.72 432.50 127.45 430.24 127.21 427.98C126.97 425.72 126.76 423.45 126.64 421.18C126.52 418.91 126.45 416.63 126.48 414.36C126.51 412.09 126.65 409.81 126.83 407.55C127.01 405.29 127.27 403.03 127.55 400.78C127.83 398.53 128.12 396.28 128.49 394.04C128.86 391.80 129.29 389.56 129.79 387.35C130.29 385.14 130.87 382.95 131.49 380.77C132.11 378.59 132.78 376.42 133.51 374.27C134.24 372.12 135.04 369.99 135.88 367.89C136.72 365.79 137.61 363.71 138.55 361.65C139.49 359.59 140.46 357.54 141.51 355.53C142.56 353.52 143.68 351.55 144.84 349.60C146.00 347.65 147.20 345.73 148.45 343.84C149.70 341.95 150.98 340.08 152.32 338.26C153.66 336.44 155.07 334.66 156.51 332.91C157.95 331.16 159.43 329.45 160.96 327.78C162.49 326.11 164.06 324.48 165.67 322.88C167.27 321.28 168.91 319.70 170.59 318.19C172.27 316.68 174.01 315.21 175.77 313.79C177.53 312.37 179.33 310.99 181.17 309.66C183.01 308.33 184.88 307.05 186.79 305.82C188.69 304.59 190.64 303.43 192.60 302.29C194.56 301.16 196.55 300.05 198.57 299.01C200.59 297.97 202.63 296.98 204.71 296.06C206.79 295.14 208.90 294.29 211.02 293.49C213.14 292.69 215.29 291.94 217.45 291.25C219.61 290.56 221.79 289.93 223.99 289.35C226.19 288.78 228.41 288.26 230.63 287.80C232.85 287.34 235.09 286.90 237.33 286.56C239.58 286.22 241.84 285.94 244.10 285.73C246.36 285.52 248.63 285.38 250.90 285.30C253.17 285.22 255.44 285.20 257.71 285.23C259.98 285.26 262.25 285.33 264.51 285.47C266.77 285.61 269.05 285.81 271.30 286.09C273.55 286.37 275.79 286.73 278.02 287.14C280.25 287.55 282.47 288.02 284.67 288.54C286.88 289.06 289.07 289.62 291.25 290.24C293.43 290.86 295.60 291.51 297.74 292.24C299.88 292.97 302.00 293.76 304.10 294.61C306.20 295.46 308.28 296.35 310.33 297.31C312.38 298.27 315.16 299.73 316.39 300.36C317.62 300.99 317.49 300.98 317.71 301.10"
                />
              </g>
              <g className="ring-orbit ring-orbit--5">
                <path
                  pathLength={1000}
                  d="M954.54 300.58C955.55 300.08 958.56 298.51 960.61 297.56C962.66 296.61 964.74 295.72 966.83 294.86C968.92 294.00 971.03 293.19 973.16 292.43C975.29 291.67 977.44 290.95 979.61 290.31C981.78 289.67 983.97 289.10 986.17 288.58C988.37 288.06 990.59 287.59 992.81 287.17C995.03 286.75 997.26 286.34 999.51 286.05C1001.75 285.76 1004.02 285.58 1006.28 285.42C1008.54 285.26 1010.80 285.17 1013.06 285.11C1015.32 285.06 1017.59 285.04 1019.86 285.09C1022.13 285.14 1024.40 285.25 1026.66 285.43C1028.92 285.61 1031.18 285.83 1033.42 286.15C1035.66 286.47 1037.90 286.89 1040.12 287.34C1042.34 287.79 1044.56 288.28 1046.76 288.83C1048.96 289.38 1051.14 289.99 1053.31 290.65C1055.48 291.31 1057.63 292.04 1059.76 292.81C1061.89 293.58 1064.00 294.41 1066.09 295.29C1068.17 296.18 1070.24 297.12 1072.27 298.12C1074.30 299.12 1076.29 300.21 1078.27 301.32C1080.25 302.43 1082.21 303.56 1084.13 304.76C1086.05 305.96 1087.94 307.22 1089.78 308.54C1091.62 309.86 1093.41 311.25 1095.18 312.66C1096.95 314.07 1098.71 315.49 1100.42 316.97C1102.13 318.45 1103.81 319.98 1105.44 321.55C1107.07 323.12 1108.64 324.75 1110.18 326.41C1111.72 328.07 1113.22 329.76 1114.67 331.50C1116.12 333.24 1117.51 335.03 1118.86 336.84C1120.21 338.65 1121.52 340.50 1122.79 342.37C1124.06 344.24 1125.32 346.12 1126.50 348.05C1127.68 349.98 1128.82 351.94 1129.90 353.93C1130.98 355.92 1132.02 357.93 1132.98 359.98C1133.94 362.03 1134.84 364.12 1135.69 366.22C1136.54 368.32 1137.35 370.43 1138.09 372.57C1138.83 374.71 1139.53 376.87 1140.15 379.05C1140.77 381.23 1141.32 383.43 1141.83 385.63C1142.34 387.83 1142.83 390.05 1143.24 392.28C1143.65 394.51 1144.01 396.75 1144.32 398.99C1144.63 401.24 1144.90 403.49 1145.08 405.75C1145.26 408.01 1145.38 410.28 1145.42 412.55C1145.46 414.82 1145.41 417.09 1145.32 419.36C1145.23 421.63 1145.10 423.89 1144.90 426.15C1144.70 428.41 1144.46 430.67 1144.13 432.91C1143.80 435.15 1143.39 437.39 1142.94 439.61C1142.49 441.83 1141.97 444.05 1141.41 446.24C1140.85 448.44 1140.24 450.62 1139.56 452.78C1138.88 454.94 1138.14 457.08 1137.35 459.20C1136.56 461.32 1135.73 463.44 1134.83 465.52C1133.93 467.60 1132.98 469.65 1131.97 471.67C1130.96 473.69 1129.87 475.69 1128.75 477.65C1127.63 479.61 1126.46 481.55 1125.25 483.46C1124.04 485.37 1122.79 487.25 1121.50 489.10C1120.21 490.95 1118.87 492.78 1117.49 494.57C1116.11 496.36 1114.66 498.11 1113.20 499.83C1111.74 501.55 1110.24 503.25 1108.70 504.90C1107.16 506.55 1105.57 508.17 1103.94 509.74C1102.31 511.31 1100.63 512.84 1098.92 514.33C1097.21 515.82 1095.48 517.29 1093.69 518.68C1091.90 520.07 1090.05 521.38 1088.18 522.67C1086.31 523.95 1084.39 525.18 1082.47 526.39C1080.55 527.60 1077.78 529.22 1076.63 529.92C1075.48 530.62 1075.73 530.48 1075.55 530.59"
                />
              </g>
              <g className="ring-orbit ring-orbit--10">
                <path
                  pathLength={1000}
                  d="M344.85 393.51C344.73 390.98 344.23 383.38 344.13 378.31C344.03 373.24 344.07 368.14 344.27 363.06C344.47 357.98 344.81 352.87 345.33 347.80C345.85 342.73 346.54 337.66 347.39 332.62C348.24 327.58 349.26 322.57 350.42 317.59C351.58 312.61 352.87 307.65 354.32 302.74C355.77 297.83 357.36 292.95 359.11 288.14C360.86 283.33 362.76 278.56 364.80 273.86C366.84 269.16 369.02 264.52 371.32 259.94C373.62 255.36 376.04 250.85 378.58 246.40C381.12 241.95 383.76 237.56 386.54 233.26C389.32 228.96 392.22 224.74 395.24 220.62C398.26 216.50 401.43 212.47 404.69 208.53C407.95 204.59 411.33 200.75 414.80 197.01C418.27 193.26 421.83 189.61 425.49 186.06C429.15 182.51 432.91 179.05 436.75 175.71C440.59 172.37 444.53 169.15 448.52 166.00C452.51 162.85 456.58 159.81 460.70 156.84C464.82 153.87 469.00 150.98 473.23 148.18C477.47 145.38 481.76 142.69 486.11 140.07C490.46 137.45 494.85 134.91 499.31 132.48C503.77 130.05 508.28 127.70 512.85 125.48C517.42 123.26 522.06 121.14 526.74 119.14C531.42 117.14 536.15 115.23 540.93 113.46C545.71 111.69 550.55 110.04 555.43 108.52C560.30 107.00 565.22 105.59 570.18 104.33C575.13 103.07 580.13 101.92 585.16 100.96C590.19 100.00 595.26 99.24 600.34 98.59C605.42 97.94 611.62 97.41 615.65 97.08C619.68 96.75 623.02 96.68 624.50 96.60"
                />
              </g>
              <g className="ring-orbit ring-orbit--11">
                <path
                  pathLength={1000}
                  d="M945.12 520.34C944.08 522.73 941.10 529.95 938.88 534.66C936.66 539.37 934.30 544.03 931.81 548.60C929.32 553.17 926.66 557.66 923.92 562.08C921.17 566.50 918.31 570.85 915.34 575.13C912.37 579.41 909.30 583.62 906.12 587.74C902.94 591.86 899.67 595.91 896.29 599.87C892.91 603.83 889.44 607.71 885.86 611.49C882.28 615.27 878.60 618.95 874.83 622.54C871.06 626.13 867.19 629.62 863.23 633.01C859.27 636.39 855.23 639.68 851.10 642.85C846.97 646.02 842.75 649.08 838.46 652.02C834.17 654.96 829.79 657.80 825.35 660.52C820.91 663.24 816.39 665.83 811.82 668.32C807.25 670.81 802.61 673.19 797.92 675.45C793.23 677.71 788.49 679.88 783.68 681.88C778.87 683.88 773.46 685.90 769.08 687.44C764.70 688.98 759.34 690.51 757.39 691.13"
                />
              </g>
            </g>

            {/* Inner Parallax Ring Layer */}
            <g className="rings-parallax rings-parallax--inner">
              <g className="ring-orbit ring-orbit--6">
                <path
                  pathLength={1000}
                  d="M501.59 510.41C500.50 509.20 497.15 505.62 495.03 503.15C492.90 500.68 490.83 498.16 488.84 495.58C486.85 493.00 484.92 490.36 483.07 487.67C481.22 484.99 479.43 482.25 477.72 479.47C476.01 476.69 474.38 473.86 472.80 471.00C471.23 468.14 469.72 465.24 468.27 462.31C466.81 459.38 465.40 456.44 464.07 453.45C462.74 450.46 461.46 447.43 460.29 444.37C459.12 441.31 458.05 438.20 457.07 435.07C456.09 431.94 455.19 428.77 454.39 425.59C453.59 422.41 452.88 419.19 452.25 415.97C451.62 412.75 451.07 409.51 450.63 406.25C450.19 402.99 449.84 399.71 449.58 396.43C449.32 393.15 449.15 389.87 449.07 386.58C448.99 383.29 449.02 380.00 449.12 376.71C449.22 373.42 449.40 370.14 449.67 366.86C449.94 363.58 450.28 360.31 450.73 357.05C451.18 353.79 451.73 350.54 452.38 347.32C453.03 344.10 453.78 340.90 454.61 337.72C455.44 334.54 456.37 331.39 457.36 328.26C458.35 325.13 459.41 322.02 460.56 318.95C461.71 315.88 462.95 312.84 464.27 309.84C465.59 306.84 467.00 303.88 468.46 300.95C469.92 298.02 471.45 295.12 473.05 292.27C474.65 289.42 476.33 286.60 478.06 283.83C479.79 281.06 481.58 278.32 483.45 275.64C485.31 272.96 487.25 270.32 489.25 267.73C491.25 265.14 493.31 262.60 495.43 260.11C497.55 257.62 499.72 255.18 501.97 252.80C504.22 250.43 506.53 248.10 508.91 245.86C511.29 243.62 513.75 241.46 516.26 239.36C518.77 237.27 521.35 235.25 523.96 233.29C526.57 231.33 529.24 229.43 531.94 227.59C534.65 225.75 537.39 223.97 540.19 222.28C542.99 220.59 545.83 218.99 548.72 217.47C551.61 215.95 554.55 214.51 557.51 213.14C560.47 211.77 563.47 210.47 566.49 209.23C569.51 207.99 572.55 206.80 575.62 205.69C578.69 204.58 581.79 203.54 584.92 202.59C588.04 201.64 591.20 200.76 594.37 199.98C597.54 199.20 600.75 198.53 603.96 197.93C607.17 197.33 610.40 196.82 613.64 196.38C616.88 195.94 620.13 195.56 623.39 195.27C626.65 194.98 629.93 194.77 633.20 194.61C636.47 194.46 639.75 194.34 643.03 194.34C646.31 194.34 649.60 194.42 652.88 194.60C656.16 194.78 659.44 195.08 662.71 195.43C665.98 195.78 669.25 196.18 672.51 196.69C675.76 197.20 680.06 198.10 682.24 198.52C684.42 198.94 685.02 199.09 685.58 199.21"
                />
              </g>
              <g className="ring-orbit ring-orbit--7">
                <path
                  pathLength={1000}
                  d="M840.46 484.48C839.48 486.16 836.63 491.26 834.58 494.57C832.53 501.14 830.39 501.14 828.17 504.33C825.95 507.52 823.64 510.66 821.26 513.73C818.88 516.80 816.40 519.81 813.86 522.75C811.32 525.69 808.68 528.56 805.99 531.37C803.30 534.18 800.54 536.92 797.71 539.59C794.88 542.26 791.99 544.86 789.03 547.38C786.07 549.90 783.02 552.33 779.94 554.70C776.86 557.07 773.72 559.37 770.53 561.59C767.34 563.81 764.09 565.97 760.79 568.02C757.49 570.07 754.13 572.06 750.71 573.92C747.29 575.78 743.47 577.71 740.28 579.17C737.09 580.63 733.03 582.10 731.58 582.69"
                />
              </g>
              <g className="ring-orbit ring-orbit--8">
                <path
                  pathLength={1000}
                  d="M552.50 599.50C550.59 598.76 544.83 596.65 541.05 595.09C537.27 593.53 533.52 591.87 529.82 590.11C526.12 588.35 522.47 586.48 518.87 584.51C515.27 582.54 511.71 580.47 508.21 578.32C504.71 576.17 501.26 573.91 497.86 571.59C494.46 569.27 491.10 566.87 487.81 564.38C484.52 561.89 481.27 559.32 478.11 556.66C474.95 554.00 471.85 551.25 468.84 548.41C465.82 545.57 462.89 542.64 460.02 539.64C457.15 536.64 454.35 533.55 451.64 530.40C448.93 527.25 446.28 524.03 443.75 520.73C441.22 517.43 438.80 514.03 436.46 510.58C434.12 507.13 431.86 503.62 429.70 500.05C427.54 496.48 425.45 492.85 423.49 489.16C421.53 485.47 419.69 481.71 417.93 477.91C416.17 474.11 414.52 470.26 412.95 466.38C411.38 462.50 409.86 458.59 408.48 454.63C407.10 450.67 405.83 446.65 404.67 442.62C403.51 438.59 402.45 434.52 401.52 430.42C400.59 426.32 399.77 422.18 399.09 418.03C398.41 413.88 397.86 409.70 397.42 405.52C396.98 401.34 396.65 397.13 396.45 392.93C396.25 388.73 396.16 384.52 396.20 380.31C396.24 376.10 396.41 371.89 396.68 367.69C396.95 363.49 397.34 359.30 397.84 355.13C398.34 350.96 398.95 346.79 399.68 342.65C400.41 338.51 401.25 334.39 402.21 330.30C403.17 326.21 404.25 322.14 405.43 318.12C406.62 314.10 407.92 310.11 409.32 306.16C410.72 302.21 412.25 298.30 413.84 294.43C415.43 290.56 417.11 286.72 418.89 282.94C420.67 279.16 422.55 275.42 424.53 271.74C426.50 268.06 428.59 264.43 430.74 260.85C432.89 257.27 435.12 253.73 437.46 250.28C439.80 246.83 442.25 243.44 444.79 240.14C447.33 236.84 449.98 233.61 452.70 230.46C455.42 227.31 458.23 224.23 461.12 221.24C464.01 218.25 467.00 215.37 470.05 212.55C473.10 209.73 476.21 206.98 479.39 204.32C482.56 201.66 485.80 199.08 489.10 196.58C492.40 194.08 495.76 191.67 499.17 189.34C502.58 187.01 506.06 184.78 509.57 182.62C513.08 180.46 516.63 178.36 520.23 176.35C523.83 174.34 527.47 172.42 531.16 170.58C534.85 168.74 538.58 166.97 542.35 165.31C546.12 163.65 549.93 162.07 553.77 160.59C557.61 159.11 561.50 157.70 565.41 156.41C569.32 155.12 573.27 153.91 577.25 152.82C581.23 151.73 585.24 150.74 589.27 149.86C593.30 148.98 597.35 148.19 601.43 147.53C605.50 146.87 609.61 146.33 613.72 145.89C617.83 145.45 621.95 145.13 626.07 145.13C630.20 144.67 634.34 144.53 638.47 144.50C642.61 144.47 646.75 144.53 650.88 144.70C655.01 144.87 659.15 145.16 663.27 145.54C667.39 145.92 671.51 146.42 675.61 147.01C679.71 147.60 683.81 148.28 687.88 149.07C691.95 149.86 696.02 150.74 700.05 151.74C704.08 152.74 708.10 153.85 712.08 155.06C716.06 156.27 720.01 157.58 723.93 159.00C727.84 160.42 731.74 161.94 735.57 163.58C739.41 165.22 743.20 166.98 746.94 168.83C750.68 170.68 754.39 172.61 758.03 174.66C761.67 176.71 765.26 178.85 768.78 181.11C772.30 183.37 775.74 185.75 779.13 188.20C782.52 190.65 785.85 193.19 789.12 195.80C792.39 198.41 795.60 201.09 798.73 203.87C801.86 206.65 804.93 209.52 807.89 212.48C810.85 215.44 813.71 218.50 816.49 221.63C819.27 224.76 821.98 227.97 824.60 231.24C827.22 234.51 829.78 237.83 832.22 241.23C834.66 244.63 837.02 248.10 839.27 251.63C841.52 255.16 843.67 258.77 845.73 262.41C847.79 266.05 849.78 269.75 851.65 273.49C853.52 277.24 855.28 281.04 856.94 284.88C858.60 288.72 860.15 292.61 861.59 296.54C863.03 300.47 864.45 304.77 865.58 308.44C866.71 312.11 867.90 316.86 868.36 318.54"
                />
              </g>
              <g className="ring-orbit ring-orbit--9">
                <path
                  pathLength={1000}
                  d="M914.79 400.51C914.66 402.77 914.38 409.57 914.00 414.09C913.62 418.61 913.12 423.13 912.50 427.62C911.88 432.11 911.14 436.58 910.30 441.03C909.46 445.48 908.53 449.93 907.47 454.33C906.41 458.73 905.23 463.11 903.94 467.45C902.65 471.79 901.21 476.09 899.71 480.36C898.21 484.63 896.62 488.88 894.92 493.07C893.22 497.26 891.41 501.42 889.51 505.53C887.61 509.64 885.61 513.71 883.49 517.71C881.37 521.71 879.14 525.67 876.81 529.55C874.48 533.43 872.02 537.25 869.49 541.01C866.96 544.77 864.36 548.49 861.63 552.11C858.90 555.73 856.06 559.27 853.13 562.73C850.20 566.19 847.16 569.57 844.05 572.86C840.93 576.15 837.73 579.37 834.44 582.49C831.16 585.61 827.79 588.65 824.34 591.59C820.89 594.53 817.35 597.37 813.75 600.12C810.15 602.87 806.47 605.52 802.74 608.09C799.01 610.66 795.19 613.15 791.39 615.55C787.59 617.95 781.85 621.32 779.94 622.47"
                />
              </g>
            </g>
          </svg>

          {/* Center Title "VAIURE" with Continuous Breathing, Letter Expansion & Interactive Hover */}
          <h1 className="title" aria-label="VAIURE">
            <span
              className="title-interactive"
              onPointerEnter={handleTitlePointerEnter}
              onPointerLeave={handleTitlePointerLeave}
            >
              <span className="title-kinetic">
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: 1.5, ['--char-idx' as any]: -2.5 }}
                >
                  V
                </span>
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: -3.0, ['--char-idx' as any]: -1.5 }}
                >
                  A
                </span>
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: 0.5, ['--char-idx' as any]: -0.5 }}
                >
                  I
                </span>
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: 1.5, ['--char-idx' as any]: 0.5 }}
                >
                  U
                </span>
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: 1.0, ['--char-idx' as any]: 1.5 }}
                >
                  R
                </span>
                <span
                  className="title-char"
                  aria-hidden="true"
                  style={{ ['--k' as any]: -1.0, ['--char-idx' as any]: 2.5 }}
                >
                  E
                </span>
              </span>
            </span>
          </h1>
        </div>

        {/* UI Chrome Layer */}
        <div className="ui">
          <nav className="nav" aria-label="Primary">
            <a
              className="logo"
              href="#home"
              aria-label="VAIURE home"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <img
                src={HERO_LOGO_SRC}
                alt="VAIURE"
                className="logo-img"
                draggable={false}
              />
            </a>
            <button
              className="menu"
              type="button"
              aria-label="Open menu"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMenu?.();
              }}
            />
          </nav>

          <p className="copy copy--tl">
            <span className="ln">
              <span>Every spark is</span>
            </span>
            <span className="ln">
              <span>a fresh impact.</span>
            </span>
          </p>

          <p className="copy copy--tr">
            <span className="ln">
              <span>We form it</span>
            </span>
            <span className="ln">
              <span>into something</span>
            </span>
            <span className="ln">
              <span>worth showing.</span>
            </span>
          </p>

          <div className="ctas">
            <a
              className="btn"
              href="#campaign"
              onClick={(e) => {
                e.preventDefault();
                onSeeCampaign?.();
              }}
            >
              <span className="lbl">See campaign</span>
            </a>
            <a
              className="btn"
              href="#campaigns"
              onClick={(e) => {
                e.preventDefault();
                onViewCampaigns?.();
              }}
            >
              <span className="lbl">View campaigns</span>
            </a>
          </div>

          <p className="copy copy--bl">
            <span className="ln">
              <span>We don&#39;t fake art.</span>
            </span>
            <span className="ln">
              <span>We make impacts.</span>
            </span>
          </p>

          <p className="copy copy--br">
            <span className="ln">
              <span>Then we run</span>
            </span>
            <span className="ln">
              <span>it in print</span>
            </span>
          </p>
        </div>
      </main>
    </>
  );
};
