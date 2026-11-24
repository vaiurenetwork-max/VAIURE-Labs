/**
 * SLIDE 7: VaiByte - Canvas Studio
 * High-FPS interactive multi-layer 2D painting, vector blockout, typography,
 * image compositing, AI reference synthesis, and direct Seedance 2.5 frame bridge.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Menu,
  MousePointer2,
  Hand,
  Brush,
  Eraser,
  Minus,
  Square,
  Circle,
  Type as TypeIcon,
  Pipette,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
  Upload,
  Sparkles,
  Download,
  FileJson,
  FolderOpen,
  Layers,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  X,
  Check,
  Loader2,
  AlertCircle,
  Workflow,
  PenTool,
} from 'lucide-react';
import {
  CanvasToolId,
  CanvasBlendMode,
  CanvasAspectPreset,
  CanvasLayerMeta,
  CanvasHistorySnapshot,
  CANVAS_ASPECT_DIMENSIONS,
  CANVAS_BG_SWATCHES,
  CANVAS_COLOR_SWATCHES,
  DEFAULT_LAYER_FILTERS,
} from './canvasTypes';
import { WorkflowNodeGraph } from './WorkflowNodeGraph';
import { seedanceLabService } from '../../services/seedanceLabService';
import { getAuthHeaders } from '../../services/authTokenHelper';
import { UserProfile } from '../../types/social';

interface VaiByteCanvasSlideProps {
  onOpenMenu?: () => void;
  onGoToSeedance?: (exportedImageUrl?: string | string[]) => void;
  onGoToFuLabs?: () => void;
  onBackToHero?: () => void;
  currentUser?: UserProfile | null;
}

interface TextPlacementState {
  active: boolean;
  x: number;
  y: number;
  value: string;
}

interface ShapeDragState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

function makeLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const VaiByteCanvasSlide: React.FC<VaiByteCanvasSlideProps> = ({
  onOpenMenu,
  onGoToSeedance,
  onGoToFuLabs,
  onBackToHero,
}) => {
  // Primary studio mode: 'workflow' (Node Connecting-Dots Studio) | 'painter' (2D Multi-Layer Sketch/Plate Pad)
  const [studioMode, setStudioMode] = useState<'workflow' | 'painter'>('workflow');
  const [pendingFlowImageUrl, setPendingFlowImageUrl] = useState<string | null>(null);
  const [isPushingToFlow, setIsPushingToFlow] = useState<boolean>(false);

  // Artboard configuration
  const [aspectPreset, setAspectPreset] = useState<CanvasAspectPreset>('16:9');
  const [artWidth, setArtWidth] = useState<number>(1920);
  const [artHeight, setArtHeight] = useState<number>(1080);
  const [backgroundColor, setBackgroundColor] = useState<string>('#090a0f');

  // Tool state
  const [activeTool, setActiveTool] = useState<CanvasToolId>('brush');
  const [brushColor, setBrushColor] = useState<string>('#ffffff');
  const [brushSize, setBrushSize] = useState<number>(12);
  const [brushOpacity, setBrushOpacity] = useState<number>(1);
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(64);

  // Viewport transform
  const [zoom, setZoom] = useState<number>(0.45);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [isSpaceHeld, setIsSpaceHeld] = useState<boolean>(false);

  // Inspector & panels
  const [inspectorTab, setInspectorTab] = useState<'layers' | 'properties'>('layers');
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Layer stack (index 0 = bottom, last index = top)
  const initialLayerIdRef = useRef<string>(makeLayerId());
  const [layers, setLayers] = useState<CanvasLayerMeta[]>([
    {
      id: initialLayerIdRef.current,
      name: 'Background Plate',
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      filters: { ...DEFAULT_LAYER_FILTERS },
    },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>(initialLayerIdRef.current);
  const [editingLayerNameId, setEditingLayerNameId] = useState<string | null>(null);
  const [editingLayerNameVal, setEditingLayerNameVal] = useState<string>('');

  // History stacks
  const [historyStack, setHistoryStack] = useState<CanvasHistorySnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Live drawing & interaction state
  const [cursorArtCoords, setCursorArtCoords] = useState<{ x: number; y: number } | null>(null);
  const [textPlacement, setTextPlacement] = useState<TextPlacementState | null>(null);
  const [statusNotice, setStatusNotice] = useState<{ message: string; isError?: boolean } | null>(null);
  const [isSendingToSeedance, setIsSendingToSeedance] = useState<boolean>(false);

  // AI Concept Plate Generator modal state
  const [isAiPlateOpen, setIsAiPlateOpen] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingAiPlate, setIsGeneratingAiPlate] = useState<boolean>(false);

  // Refs for offscreen layer canvases & composite canvas
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerCanvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  // Active pointer stroke refs
  const pointerStateRef = useRef<{
    active: boolean;
    mode: 'draw' | 'erase' | 'shape' | 'pan' | 'move_layer';
    lastArtX: number;
    lastArtY: number;
    panStartClientX: number;
    panStartClientY: number;
    initialPanX: number;
    initialPanY: number;
    initialOffsetX: number;
    initialOffsetY: number;
  } | null>(null);
  const shapeDragRef = useRef<ShapeDragState | null>(null);
  const renderRafRef = useRef<number | null>(null);

  const showNotice = useCallback((message: string, isError = false) => {
    setStatusNotice({ message, isError });
    setTimeout(() => {
      setStatusNotice((prev) => (prev?.message === message ? null : prev));
    }, 3200);
  }, []);

  // Ensure an offscreen canvas exists for a given layer
  const ensureLayerCanvas = useCallback(
    (layerId: string, w = artWidth, h = artHeight): HTMLCanvasElement => {
      let c = layerCanvasesRef.current.get(layerId);
      if (!c) {
        c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        layerCanvasesRef.current.set(layerId, c);
      } else if (c.width !== w || c.height !== h) {
        const snapshot = document.createElement('canvas');
        snapshot.width = c.width;
        snapshot.height = c.height;
        const sctx = snapshot.getContext('2d');
        sctx?.drawImage(c, 0, 0);
        c.width = w;
        c.height = h;
        const nctx = c.getContext('2d');
        nctx?.drawImage(snapshot, 0, 0);
      }
      return c;
    },
    [artWidth, artHeight]
  );

  // Composite all visible layers + guide overlay onto compositeCanvasRef
  const renderComposite = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return;
    if (canvas.width !== artWidth || canvas.height !== artHeight) {
      canvas.width = artWidth;
      canvas.height = artHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, artWidth, artHeight);

    // 1. Background fill
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, artWidth, artHeight);
    }

    // 2. Composite visible layers bottom-to-top
    for (const layer of layers) {
      if (!layer.visible) continue;
      const offscreen = layerCanvasesRef.current.get(layer.id);
      if (!offscreen) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      ctx.globalCompositeOperation = layer.blendMode;

      const f = layer.filters;
      const filterStr = [
        f.brightness !== 100 ? `brightness(${f.brightness}%)` : '',
        f.contrast !== 100 ? `contrast(${f.contrast}%)` : '',
        f.saturate !== 100 ? `saturate(${f.saturate}%)` : '',
        f.grayscale ? 'grayscale(100%)' : '',
      ]
        .filter(Boolean)
        .join(' ');
      if (filterStr) {
        ctx.filter = filterStr;
      }

      const cx = artWidth / 2 + layer.offsetX;
      const cy = artHeight / 2 + layer.offsetY;
      ctx.translate(cx, cy);
      ctx.scale(layer.scale, layer.scale);
      ctx.drawImage(offscreen, -artWidth / 2, -artHeight / 2);
      ctx.restore();
    }

    // 3. Live shape preview (if dragging line / rect / ellipse)
    const sd = shapeDragRef.current;
    if (sd) {
      ctx.save();
      ctx.globalAlpha = brushOpacity;
      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (activeTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(sd.startX, sd.startY);
        ctx.lineTo(sd.endX, sd.endY);
        ctx.stroke();
      } else if (activeTool === 'rect') {
        const rx = Math.min(sd.startX, sd.endX);
        const ry = Math.min(sd.startY, sd.endY);
        const rw = Math.abs(sd.endX - sd.startX);
        const rh = Math.abs(sd.endY - sd.startY);
        if (shapeFilled) ctx.fillRect(rx, ry, rw, rh);
        else ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeTool === 'ellipse') {
        const cx = (sd.startX + sd.endX) / 2;
        const cy = (sd.startY + sd.endY) / 2;
        const rx = Math.max(1, Math.abs(sd.endX - sd.startX) / 2);
        const ry = Math.max(1, Math.abs(sd.endY - sd.startY) / 2);
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        if (shapeFilled) ctx.fill();
        else ctx.stroke();
      }
      ctx.restore();
    }
  }, [
    artWidth,
    artHeight,
    backgroundColor,
    layers,
    activeTool,
    brushColor,
    brushOpacity,
    brushSize,
    shapeFilled,
  ]);

  const scheduleRender = useCallback(() => {
    if (renderRafRef.current !== null) return;
    renderRafRef.current = requestAnimationFrame(() => {
      renderRafRef.current = null;
      renderComposite();
    });
  }, [renderComposite]);

  useEffect(() => {
    ensureLayerCanvas(layers[0]?.id || initialLayerIdRef.current, artWidth, artHeight);
    scheduleRender();
  }, [layers, artWidth, artHeight, backgroundColor, ensureLayerCanvas, scheduleRender]);

  // Fit artboard smoothly into viewport on mount or preset change
  const fitViewport = useCallback(
    (targetW = artWidth, targetH = artHeight) => {
      const vp = viewportRef.current;
      if (!vp) return;
      const rect = vp.getBoundingClientRect();
      const padW = Math.max(240, rect.width - 72);
      const padH = Math.max(200, rect.height - 72);
      const fitZoom = Math.min(padW / targetW, padH / targetH, 1.25);
      setZoom(Number(Math.max(0.15, fitZoom).toFixed(2)));
      setPan({ x: 0, y: 0 });
    },
    [artWidth, artHeight]
  );

  useEffect(() => {
    const timer = setTimeout(() => fitViewport(artWidth, artHeight), 80);
    return () => clearTimeout(timer);
  }, [artWidth, artHeight, fitViewport]);

  // Snapshot capture for Undo/Redo
  const captureHistorySnapshot = useCallback(
    (
      nextLayers: CanvasLayerMeta[],
      nextActiveId: string,
      w = artWidth,
      h = artHeight,
      bg = backgroundColor
    ) => {
      const snap: CanvasHistorySnapshot = {
        width: w,
        height: h,
        backgroundColor: bg,
        activeLayerId: nextActiveId,
        layers: nextLayers.map((l) => {
          const c = ensureLayerCanvas(l.id, w, h);
          return {
            ...l,
            filters: { ...l.filters },
            dataUrl: c.toDataURL('image/png'),
          };
        }),
      };

      setHistoryStack((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        const updated = [...sliced, snap].slice(-20);
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    [artWidth, artHeight, backgroundColor, ensureLayerCanvas, historyIndex]
  );

  // Record initial empty snapshot once on mount
  const initializedSnapshotRef = useRef(false);
  useEffect(() => {
    if (!initializedSnapshotRef.current) {
      initializedSnapshotRef.current = true;
      ensureLayerCanvas(initialLayerIdRef.current, artWidth, artHeight);
      captureHistorySnapshot(layers, initialLayerIdRef.current, artWidth, artHeight, backgroundColor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const restoreHistorySnapshot = useCallback(
    async (snap: CanvasHistorySnapshot) => {
      setArtWidth(snap.width);
      setArtHeight(snap.height);
      setBackgroundColor(snap.backgroundColor);

      const newMap = new Map<string, HTMLCanvasElement>();
      await Promise.all(
        snap.layers.map(
          (l) =>
            new Promise<void>((resolve) => {
              const c = document.createElement('canvas');
              c.width = snap.width;
              c.height = snap.height;
              const img = new Image();
              img.onload = () => {
                c.getContext('2d')?.drawImage(img, 0, 0);
                newMap.set(l.id, c);
                resolve();
              };
              img.onerror = () => {
                newMap.set(l.id, c);
                resolve();
              };
              img.src = l.dataUrl;
            })
        )
      );

      layerCanvasesRef.current = newMap;
      const restoredMeta: CanvasLayerMeta[] = snap.layers.map(({ dataUrl: _omit, ...meta }) => meta);
      setLayers(restoredMeta);
      setActiveLayerId(snap.activeLayerId);
      setTimeout(() => scheduleRender(), 10);
    },
    [scheduleRender]
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIdx = historyIndex - 1;
    const snap = historyStack[prevIdx];
    if (!snap) return;
    setHistoryIndex(prevIdx);
    restoreHistorySnapshot(snap);
  }, [historyIndex, historyStack, restoreHistorySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= historyStack.length - 1) return;
    const nextIdx = historyIndex + 1;
    const snap = historyStack[nextIdx];
    if (!snap) return;
    setHistoryIndex(nextIdx);
    restoreHistorySnapshot(snap);
  }, [historyIndex, historyStack, restoreHistorySnapshot]);

  // Keyboard shortcuts (only active in 2D Plate Painter mode)
  useEffect(() => {
    if (studioMode !== 'painter') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsSpaceHeld(true);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'b':
          setActiveTool('brush');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'l':
          setActiveTool('line');
          break;
        case 'r':
          setActiveTool('rect');
          break;
        case 'o':
          setActiveTool('ellipse');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'i':
          setActiveTool('eyedropper');
          break;
        case '[':
          setBrushSize((s) => Math.max(1, s - 4));
          break;
        case ']':
          setBrushSize((s) => Math.min(120, s + 4));
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpaceHeld(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [studioMode, handleUndo, handleRedo]);

  // Convert screen pointer coordinates into Artboard pixel coordinates
  const clientToArtboard = (clientX: number, clientY: number) => {
    const canvas = compositeCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * artWidth;
    const y = ((clientY - rect.top) / rect.height) * artHeight;
    return { x, y };
  };

  // Convert Artboard coordinate into active layer's local coordinate space
  const artToLayerLocal = (artX: number, artY: number, layer: CanvasLayerMeta) => {
    const cx = artWidth / 2 + layer.offsetX;
    const cy = artHeight / 2 + layer.offsetY;
    const lx = (artX - cx) / layer.scale + artWidth / 2;
    const ly = (artY - cy) / layer.scale + artHeight / 2;
    return { lx, ly };
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow right/middle click pan or Spacebar pan or Pan tool
    const effectivePan = isSpaceHeld || activeTool === 'pan' || e.button === 1;
    const target = e.target as HTMLElement;
    if (target.closest('[data-canvas-ui="true"]')) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    if (effectivePan) {
      pointerStateRef.current = {
        active: true,
        mode: 'pan',
        lastArtX: 0,
        lastArtY: 0,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: 0,
        initialOffsetY: 0,
      };
      return;
    }

    const { x: artX, y: artY } = clientToArtboard(e.clientX, e.clientY);

    if (activeTool === 'eyedropper') {
      const c = compositeCanvasRef.current;
      const ctx = c?.getContext('2d');
      if (ctx) {
        const px = Math.max(0, Math.min(artWidth - 1, Math.round(artX)));
        const py = Math.max(0, Math.min(artHeight - 1, Math.round(artY)));
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        if (pixel[3] > 0) {
          const picked = rgbToHex(pixel[0], pixel[1], pixel[2]);
          setBrushColor(picked);
          showNotice(`Picked color ${picked.toUpperCase()}`);
        }
      }
      return;
    }

    if (!activeLayer || activeLayer.locked) {
      showNotice('Selected layer is locked. Unlock it in the Layer Stack to edit.', true);
      return;
    }

    if (activeTool === 'text') {
      setTextPlacement({ active: true, x: artX, y: artY, value: '' });
      return;
    }

    if (activeTool === 'select') {
      pointerStateRef.current = {
        active: true,
        mode: 'move_layer',
        lastArtX: artX,
        lastArtY: artY,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: activeLayer.offsetX,
        initialOffsetY: activeLayer.offsetY,
      };
      return;
    }

    if (activeTool === 'line' || activeTool === 'rect' || activeTool === 'ellipse') {
      shapeDragRef.current = { startX: artX, startY: artY, endX: artX, endY: artY };
      pointerStateRef.current = {
        active: true,
        mode: 'shape',
        lastArtX: artX,
        lastArtY: artY,
        panStartClientX: e.clientX,
        panStartClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
        initialOffsetX: 0,
        initialOffsetY: 0,
      };
      scheduleRender();
      return;
    }

    // Brush or Eraser stroke
    const offscreen = ensureLayerCanvas(activeLayer.id);
    const lctx = offscreen.getContext('2d');
    if (!lctx) return;

    const { lx, ly } = artToLayerLocal(artX, artY, activeLayer);
    lctx.save();
    lctx.globalCompositeOperation = activeTool === 'eraser' ? 'destination-out' : 'source-over';
    lctx.globalAlpha = brushOpacity;
    lctx.fillStyle = brushColor;
    lctx.beginPath();
    lctx.arc(lx, ly, (brushSize / activeLayer.scale) / 2, 0, Math.PI * 2);
    lctx.fill();
    lctx.restore();

    pointerStateRef.current = {
      active: true,
      mode: activeTool === 'eraser' ? 'erase' : 'draw',
      lastArtX: lx,
      lastArtY: ly,
      panStartClientX: e.clientX,
      panStartClientY: e.clientY,
      initialPanX: pan.x,
      initialPanY: pan.y,
      initialOffsetX: 0,
      initialOffsetY: 0,
    };

    scheduleRender();
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const { x: artX, y: artY } = clientToArtboard(e.clientX, e.clientY);
    if (artX >= 0 && artX <= artWidth && artY >= 0 && artY <= artHeight) {
      setCursorArtCoords({ x: Math.round(artX), y: Math.round(artY) });
    } else {
      setCursorArtCoords(null);
    }

    const p = pointerStateRef.current;
    if (!p || !p.active) return;

    if (p.mode === 'pan') {
      const dx = e.clientX - p.panStartClientX;
      const dy = e.clientY - p.panStartClientY;
      setPan({ x: p.initialPanX + dx, y: p.initialPanY + dy });
      return;
    }

    if (p.mode === 'move_layer' && activeLayer) {
      const dx = (e.clientX - p.panStartClientX) / zoom;
      const dy = (e.clientY - p.panStartClientY) / zoom;
      setLayers((prev) =>
        prev.map((l) =>
          l.id === activeLayer.id
            ? { ...l, offsetX: Math.round(p.initialOffsetX + dx), offsetY: Math.round(p.initialOffsetY + dy) }
            : l
        )
      );
      return;
    }

    if (p.mode === 'shape' && shapeDragRef.current) {
      shapeDragRef.current.endX = artX;
      shapeDragRef.current.endY = artY;
      scheduleRender();
      return;
    }

    if ((p.mode === 'draw' || p.mode === 'erase') && activeLayer) {
      const offscreen = ensureLayerCanvas(activeLayer.id);
      const lctx = offscreen.getContext('2d');
      if (!lctx) return;
      const { lx, ly } = artToLayerLocal(artX, artY, activeLayer);

      lctx.save();
      lctx.globalCompositeOperation = p.mode === 'erase' ? 'destination-out' : 'source-over';
      lctx.globalAlpha = brushOpacity;
      lctx.strokeStyle = brushColor;
      lctx.lineWidth = brushSize / activeLayer.scale;
      lctx.lineCap = 'round';
      lctx.lineJoin = 'round';
      lctx.beginPath();
      lctx.moveTo(p.lastArtX, p.lastArtY);
      lctx.lineTo(lx, ly);
      lctx.stroke();
      lctx.restore();

      p.lastArtX = lx;
      p.lastArtY = ly;
      scheduleRender();
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointerStateRef.current;
    if (!p || !p.active) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (p.mode === 'shape' && shapeDragRef.current && activeLayer) {
      const sd = shapeDragRef.current;
      const startLocal = artToLayerLocal(sd.startX, sd.startY, activeLayer);
      const endLocal = artToLayerLocal(sd.endX, sd.endY, activeLayer);
      const offscreen = ensureLayerCanvas(activeLayer.id);
      const lctx = offscreen.getContext('2d');
      if (lctx) {
        lctx.save();
        lctx.globalAlpha = brushOpacity;
        lctx.strokeStyle = brushColor;
        lctx.fillStyle = brushColor;
        lctx.lineWidth = brushSize / activeLayer.scale;
        lctx.lineCap = 'round';
        lctx.lineJoin = 'round';

        if (activeTool === 'line') {
          lctx.beginPath();
          lctx.moveTo(startLocal.lx, startLocal.ly);
          lctx.lineTo(endLocal.lx, endLocal.ly);
          lctx.stroke();
        } else if (activeTool === 'rect') {
          const rx = Math.min(startLocal.lx, endLocal.lx);
          const ry = Math.min(startLocal.ly, endLocal.ly);
          const rw = Math.abs(endLocal.lx - startLocal.lx);
          const rh = Math.abs(endLocal.ly - startLocal.ly);
          if (shapeFilled) lctx.fillRect(rx, ry, rw, rh);
          else lctx.strokeRect(rx, ry, rw, rh);
        } else if (activeTool === 'ellipse') {
          const cx = (startLocal.lx + endLocal.lx) / 2;
          const cy = (startLocal.ly + endLocal.ly) / 2;
          const rx = Math.max(1, Math.abs(endLocal.lx - startLocal.lx) / 2);
          const ry = Math.max(1, Math.abs(endLocal.ly - startLocal.ly) / 2);
          lctx.beginPath();
          lctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          if (shapeFilled) lctx.fill();
          else lctx.stroke();
        }
        lctx.restore();
      }
      shapeDragRef.current = null;
      scheduleRender();
      captureHistorySnapshot(layers, activeLayer.id);
    } else if (p.mode === 'draw' || p.mode === 'erase' || p.mode === 'move_layer') {
      captureHistorySnapshot(layers, activeLayer?.id || activeLayerId);
    }

    pointerStateRef.current = null;
  };

  const commitTextPlacement = () => {
    if (!textPlacement || !textPlacement.value.trim() || !activeLayer) {
      setTextPlacement(null);
      return;
    }
    const offscreen = ensureLayerCanvas(activeLayer.id);
    const lctx = offscreen.getContext('2d');
    if (lctx) {
      const { lx, ly } = artToLayerLocal(textPlacement.x, textPlacement.y, activeLayer);
      lctx.save();
      lctx.globalAlpha = brushOpacity;
      lctx.fillStyle = brushColor;
      lctx.font = `600 ${Math.round(fontSize / activeLayer.scale)}px Inter, ui-sans-serif, system-ui, sans-serif`;
      lctx.textBaseline = 'top';
      const lines = textPlacement.value.split('\n');
      lines.forEach((line, i) => {
        lctx.fillText(line, lx, ly + i * (fontSize * 1.2) / activeLayer.scale);
      });
      lctx.restore();
      scheduleRender();
      captureHistorySnapshot(layers, activeLayer.id);
    }
    setTextPlacement(null);
  };

  // Switch Artboard aspect preset
  const handleSelectAspect = (preset: CanvasAspectPreset) => {
    const dim = CANVAS_ASPECT_DIMENSIONS[preset];
    setAspectPreset(preset);
    setArtWidth(dim.width);
    setArtHeight(dim.height);
    layers.forEach((l) => ensureLayerCanvas(l.id, dim.width, dim.height));
    setTimeout(() => {
      scheduleRender();
      fitViewport(dim.width, dim.height);
      captureHistorySnapshot(layers, activeLayerId, dim.width, dim.height, backgroundColor);
    }, 20);
  };

  // Layer actions
  const addNewLayer = (customName?: string, drawCb?: (ctx: CanvasRenderingContext2D) => void) => {
    const newId = makeLayerId();
    const offscreen = ensureLayerCanvas(newId, artWidth, artHeight);
    if (drawCb) {
      const ctx = offscreen.getContext('2d');
      if (ctx) drawCb(ctx);
    }
    const newMeta: CanvasLayerMeta = {
      id: newId,
      name: customName || `Layer ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      filters: { ...DEFAULT_LAYER_FILTERS },
    };
    const nextLayers = [...layers, newMeta];
    setLayers(nextLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, newId);
    }, 10);
  };

  const duplicateLayer = (layerId: string) => {
    const source = layers.find((l) => l.id === layerId);
    if (!source) return;
    const newId = makeLayerId();
    const srcCanvas = ensureLayerCanvas(source.id);
    const dstCanvas = ensureLayerCanvas(newId);
    dstCanvas.getContext('2d')?.drawImage(srcCanvas, 0, 0);

    const copyMeta: CanvasLayerMeta = {
      ...source,
      id: newId,
      name: `${source.name} Copy`,
      filters: { ...source.filters },
    };
    const idx = layers.findIndex((l) => l.id === layerId);
    const nextLayers = [...layers];
    nextLayers.splice(idx + 1, 0, copyMeta);
    setLayers(nextLayers);
    setActiveLayerId(newId);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, newId);
    }, 10);
  };

  const deleteLayer = (layerId: string) => {
    if (layers.length <= 1) {
      const offscreen = ensureLayerCanvas(layerId);
      offscreen.getContext('2d')?.clearRect(0, 0, artWidth, artHeight);
      scheduleRender();
      captureHistorySnapshot(layers, layerId);
      showNotice('Cleared base layer.');
      return;
    }
    layerCanvasesRef.current.delete(layerId);
    const nextLayers = layers.filter((l) => l.id !== layerId);
    const nextActive = nextLayers[nextLayers.length - 1]?.id || nextLayers[0].id;
    setLayers(nextLayers);
    if (activeLayerId === layerId) setActiveLayerId(nextActive);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(nextLayers, nextActive);
    }, 10);
  };

  const moveLayerOrder = (layerId: string, dir: 1 | -1) => {
    const idx = layers.findIndex((l) => l.id === layerId);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= layers.length) return;
    const copy = [...layers];
    const tmp = copy[idx];
    copy[idx] = copy[target];
    copy[target] = tmp;
    setLayers(copy);
    setTimeout(() => {
      scheduleRender();
      captureHistorySnapshot(copy, activeLayerId);
    }, 10);
  };

  // Import image(s) directly onto new canvas layer(s)
  const handleImportImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const fitScale = Math.min(artWidth / img.width, artHeight / img.height, 1);
          const dw = img.width * fitScale;
          const dh = img.height * fitScale;
          const dx = (artWidth - dw) / 2;
          const dy = (artHeight - dh) / 2;
          addNewLayer(file.name.replace(/\.[^.]+$/, ''), (ctx) => {
            ctx.drawImage(img, dx, dy, dw, dh);
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = dataUrl;
      });
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
    showNotice('Imported image onto new layer.');
  };

  // Generate AI reference backdrop / keyframe onto a new layer via /api/prompt/generate-image
  const handleGenerateAiPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isGeneratingAiPlate) return;
    setIsGeneratingAiPlate(true);
    try {
      const authHeaders = await getAuthHeaders(true);
      const res = await fetch('/api/prompt/generate-image', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          aspectRatio: aspectPreset,
          resolution: '1080p',
          projectName: 'VaiByte Canvas Studio',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to synthesize plate.');
      }

      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          addNewLayer(`AI Plate: ${aiPrompt.trim().slice(0, 22)}`, (ctx) => {
            ctx.drawImage(img, 0, 0, artWidth, artHeight);
          });
          resolve();
        };
        img.onerror = () => resolve();
        img.src = data.imageUrl;
      });

      setIsAiPlateOpen(false);
      setAiPrompt('');
      showNotice('Added AI synthesized plate to layer stack.');
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'AI plate generation failed.', true);
    } finally {
      setIsGeneratingAiPlate(false);
    }
  };

  // Build crisp composited PNG data URL
  const exportCompositeDataUrl = (): string => {
    renderComposite();
    const c = compositeCanvasRef.current;
    return c ? c.toDataURL('image/png') : '';
  };

  const handleDownloadPng = () => {
    const url = exportCompositeDataUrl();
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaibyte_canvas_${aspectPreset.replace(':', 'x')}_${Date.now()}.png`;
    link.click();
    showNotice('Exported composited PNG.');
  };

  const handleExportProjectJson = () => {
    const projectPayload = {
      app: 'VaiByte Canvas Studio',
      version: 1,
      width: artWidth,
      height: artHeight,
      backgroundColor,
      activeLayerId,
      layers: layers.map((l) => ({
        ...l,
        dataUrl: ensureLayerCanvas(l.id).toDataURL('image/png'),
      })),
    };
    const blob = new Blob([JSON.stringify(projectPayload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vaibyte_project_${Date.now()}.vaibyte.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotice('Saved .vaibyte.json project.');
  };

  const handleImportProjectJson = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.layers) || !parsed.width || !parsed.height) {
        throw new Error('Invalid .vaibyte.json project file.');
      }
      await restoreHistorySnapshot({
        width: parsed.width,
        height: parsed.height,
        backgroundColor: parsed.backgroundColor || '#090a0f',
        activeLayerId: parsed.activeLayerId || parsed.layers[0].id,
        layers: parsed.layers,
      });
      showNotice('Loaded VaiByte project.');
    } catch (err: unknown) {
      showNotice(err instanceof Error ? err.message : 'Failed to load project JSON.', true);
    } finally {
      if (jsonInputRef.current) jsonInputRef.current.value = '';
    }
  };

  // Export composite frame directly into Slide 4 Seedance Lab
  const handleSendToSeedance = async () => {
    if (!onGoToSeedance || isSendingToSeedance) return;
    setIsSendingToSeedance(true);
    try {
      const dataUrl = exportCompositeDataUrl();
      if (!dataUrl) throw new Error('Unable to read canvas frame.');
      const hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        `vaibyte_${Date.now()}.png`
      );
      onGoToSeedance(hostedUrl);
    } catch (err: unknown) {
      showNotice(
        err instanceof Error ? err.message : 'Failed to upload canvas plate for Seedance 2.5.',
        true
      );
    } finally {
      setIsSendingToSeedance(false);
    }
  };

  // Push painted frame directly into the connecting-dots Node Workflow
  const handlePushFrameToWorkflow = async () => {
    if (isPushingToFlow) return;
    setIsPushingToFlow(true);
    try {
      const dataUrl = exportCompositeDataUrl();
      if (!dataUrl) throw new Error('Unable to read canvas frame.');
      const hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        `vaibyte_flow_${Date.now()}.png`
      );
      setPendingFlowImageUrl(hostedUrl);
      setStudioMode('workflow');
    } catch (err: unknown) {
      showNotice(
        err instanceof Error ? err.message : 'Failed to push frame to Node Workflow.',
        true
      );
    } finally {
      setIsPushingToFlow(false);
    }
  };

  const updateActiveLayerProp = (patch: Partial<CanvasLayerMeta>) => {
    if (!activeLayer) return;
    setLayers((prev) => prev.map((l) => (l.id === activeLayer.id ? { ...l, ...patch } : l)));
  };

  const toolItems: Array<{ id: CanvasToolId; label: string; keyHint: string; icon: React.ReactNode }> = [
    { id: 'select', label: 'Move Layer', keyHint: 'V', icon: <MousePointer2 className="w-4 h-4" /> },
    { id: 'pan', label: 'Pan View', keyHint: 'H', icon: <Hand className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush', keyHint: 'B', icon: <Brush className="w-4 h-4" /> },
    { id: 'eraser', label: 'Eraser', keyHint: 'E', icon: <Eraser className="w-4 h-4" /> },
    { id: 'line', label: 'Line', keyHint: 'L', icon: <Minus className="w-4 h-4" /> },
    { id: 'rect', label: 'Rectangle', keyHint: 'R', icon: <Square className="w-4 h-4" /> },
    { id: 'ellipse', label: 'Ellipse', keyHint: 'O', icon: <Circle className="w-4 h-4" /> },
    { id: 'text', label: 'Text', keyHint: 'T', icon: <TypeIcon className="w-4 h-4" /> },
    { id: 'eyedropper', label: 'Eyedropper', keyHint: 'I', icon: <Pipette className="w-4 h-4" /> },
  ];

  return (
    <div
      data-no-swipe="true"
      className="relative w-full h-full flex flex-col bg-[#07080b] text-[#ECECE9] overflow-hidden select-none font-sans"
    >
      {/* Top Studio Header Bar */}
      <header className="h-14 px-3 sm:px-4 bg-[#0b0d12]/95 backdrop-blur-xl border-b border-white/[0.1] flex items-center justify-between gap-2 shrink-0 z-20 overflow-x-auto no-scrollbar">
        {/* Left: Menu + Brand + Aspect Preset */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onOpenMenu && (
            <button
              type="button"
              onClick={onOpenMenu}
              aria-label="Open Navigation Menu"
              className="w-9 h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/80 hover:text-white cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
            <button
              type="button"
              onClick={onBackToHero}
              className="font-serif tracking-[0.22em] text-xs sm:text-sm font-semibold uppercase text-white hover:text-white/80 cursor-pointer"
            >
              VAIURE
            </button>
            <span className="text-white/25">/</span>
            <span className="text-xs sm:text-sm font-mono font-semibold tracking-wider text-white">
              VaiByte — Canvas Studio
            </span>
          </div>

          {/* Primary Mode Switch: Connecting-Dots Node Workflow vs Plate Painter */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-white/[0.12] bg-black/60 text-[11px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setStudioMode('workflow')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                studioMode === 'workflow'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Node Workflow</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioMode('painter')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                studioMode === 'painter'
                  ? 'bg-white text-black font-bold'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Plate Painter</span>
            </button>
          </div>

          {studioMode === 'painter' && (
            <div className="hidden xl:flex items-center gap-1 p-1 rounded-lg border border-white/[0.1] bg-black/50 text-[10px] font-mono">
              {(Object.keys(CANVAS_ASPECT_DIMENSIONS) as CanvasAspectPreset[]).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectAspect(preset)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    aspectPreset === preset
                      ? 'bg-white text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center/Right Controls */}
        {studioMode === 'painter' ? (
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="flex items-center border border-white/[0.1] bg-white/[0.03] rounded-lg p-0.5">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo (⌘Z)"
                className="w-8 h-8 rounded flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= historyStack.length - 1}
                title="Redo (⌘⇧Z)"
                className="w-8 h-8 rounded flex items-center justify-center text-white/75 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="hidden md:flex items-center border border-white/[0.1] bg-white/[0.03] rounded-lg p-0.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.15, Number((z - 0.1).toFixed(2))))}
                className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 tabular-nums text-white/80 min-w-[46px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, Number((z + 0.1).toFixed(2))))}
                className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => fitViewport()}
                className="w-7 h-7 rounded flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                title="Fit Artboard"
              >
                <Maximize className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowGuides((g) => !g)}
              title="Toggle Rule-of-Thirds Guides"
              className={`h-9 px-2.5 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                showGuides
                  ? 'border-white/40 bg-white/15 text-white'
                  : 'border-white/[0.1] bg-white/[0.03] text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Guides</span>
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Import image onto new layer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAiPlateOpen(true)}
              className="h-9 px-2.5 rounded-lg border border-white/[0.16] bg-white/[0.06] hover:bg-white/[0.14] text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Synthesize AI Concept Plate onto Layer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Plate</span>
            </button>

            <button
              type="button"
              onClick={handlePushFrameToWorkflow}
              disabled={isPushingToFlow}
              className="h-9 px-2.5 rounded-lg border border-white/25 bg-white/[0.08] hover:bg-white/[0.16] text-white text-[11px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Send Painted Frame into Connecting-Dots Workflow"
            >
              <Workflow className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{isPushingToFlow ? 'Pushing...' : 'Push to Flow'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/85 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Export Composited PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">PNG</span>
            </button>

            {onGoToSeedance && (
              <button
                type="button"
                onClick={handleSendToSeedance}
                disabled={isSendingToSeedance}
                className="h-9 px-3 rounded-lg bg-[#ecece9] hover:bg-white text-black text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
                title="Send composited frame to Seedance 2.5 (Slide 04)"
              >
                {isSendingToSeedance ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {isSendingToSeedance ? 'Sending...' : 'To Seedance 2.5'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsInspectorOpen((v) => !v)}
              className="w-9 h-9 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] flex items-center justify-center text-white/80 hover:text-white cursor-pointer shrink-0"
              title="Toggle Layer & Inspector Panel"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 shrink-0">
            {onGoToFuLabs && (
              <button
                type="button"
                onClick={onGoToFuLabs}
                className="h-9 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/80 text-[11px] font-mono cursor-pointer whitespace-nowrap hidden md:block"
              >
                05 Fu Labs 3D
              </button>
            )}
            {onGoToSeedance && (
              <button
                type="button"
                onClick={() => onGoToSeedance()}
                className="h-9 px-3 rounded-lg bg-[#ecece9] hover:bg-white text-black text-[11px] font-mono font-semibold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Open Seedance Lab</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </header>

      {/* Global Status Notice (visible across Workflow & Painter modes) */}
      {statusNotice && studioMode === 'workflow' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-lg border border-white/20 bg-black/92 text-xs font-mono text-white backdrop-blur-xl shadow-2xl flex items-center gap-2 z-40">
          {statusNotice.isError && <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-300" />}
          <span>{statusNotice.message}</span>
        </div>
      )}

      {/* Primary Workspace Mode A: Connecting-Dots Node Workflow Studio */}
      {studioMode === 'workflow' && (
        <WorkflowNodeGraph
          externalPaintedImageUrl={pendingFlowImageUrl}
          onConsumePaintedImage={() => setPendingFlowImageUrl(null)}
          onSendImagesToSeedanceSlide4={(urls) => {
            if (urls.length > 0 && onGoToSeedance) {
              onGoToSeedance(urls);
            }
          }}
          onStatusNotice={showNotice}
        />
      )}

      {/* Primary Workspace Mode B: Multi-Layer 2D Plate Painter (kept mounted hidden when switching so painted layers stay alive in memory) */}
      <div className={studioMode === 'painter' ? 'flex-1 min-h-0 flex relative overflow-hidden' : 'hidden'}>
        {/* Left Vertical Tool Rail */}
        <aside className="w-14 bg-[#0b0d12] border-r border-white/[0.1] flex flex-col items-center py-2.5 gap-1.5 overflow-y-auto no-scrollbar shrink-0 z-10">
          {toolItems.map((tool) => {
            const isSelected = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                title={`${tool.label} (${tool.keyHint})`}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-white text-black shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.07]'
                }`}
              >
                {tool.icon}
              </button>
            );
          })}

          <div className="w-8 h-px bg-white/10 my-1" />

          {/* Active Color Picker & Swatches */}
          <label
            title="Active Brush / Ink Color"
            className="w-8 h-8 rounded-lg border border-white/25 cursor-pointer overflow-hidden shrink-0"
            style={{ backgroundColor: brushColor }}
          >
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              className="opacity-0 w-full h-full cursor-pointer"
            />
          </label>

          <div className="grid grid-cols-2 gap-1 pt-1">
            {CANVAS_COLOR_SWATCHES.slice(0, 6).map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setBrushColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-3.5 h-3.5 rounded-sm border cursor-pointer ${
                  brushColor.toLowerCase() === hex ? 'border-white scale-110' : 'border-white/20'
                }`}
                title={hex}
              />
            ))}
          </div>
        </aside>

        {/* Center Interactive Canvas Stage */}
        <div
          ref={viewportRef}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          onTouchStart={(e) => e.stopPropagation()}
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              const delta = e.deltaY > 0 ? -0.08 : 0.08;
              setZoom((z) => Math.max(0.15, Math.min(4, Number((z + delta).toFixed(2)))));
            }
          }}
          style={{ touchAction: 'none' }}
          className={`flex-1 relative overflow-hidden bg-[#06070a] flex items-center justify-center ${
            isSpaceHeld || activeTool === 'pan'
              ? 'cursor-grab active:cursor-grabbing'
              : activeTool === 'select'
              ? 'cursor-move'
              : 'cursor-crosshair'
          }`}
        >
          {/* Scaled & Panned Artboard Container */}
          <div
            style={{
              width: artWidth,
              height: artHeight,
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
            className="relative shadow-[0_24px_90px_rgba(0,0,0,0.95)] ring-1 ring-white/20 shrink-0"
          >
            {/* Transparency Checkerboard Underlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #161820 25%, transparent 25%), linear-gradient(-45deg, #161820 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #161820 75%), linear-gradient(-45deg, transparent 75%, #161820 75%)',
                backgroundSize: '32px 32px',
                backgroundPosition: '0 0, 0 16px, 16px -16px, -16px 0',
              }}
            />

            {/* Main Live Composite Canvas */}
            <canvas
              ref={compositeCanvasRef}
              width={artWidth}
              height={artHeight}
              className="relative w-full h-full block"
            />

            {/* Rule-of-Thirds & Safe Area Overlay */}
            {showGuides && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/15" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/15" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/15" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/15" />
                <div className="absolute inset-8 border border-white/10" />
              </div>
            )}

            {/* Inline Text Tool Composer Overlay */}
            {textPlacement?.active && (
              <div
                data-canvas-ui="true"
                style={{
                  left: Math.min(artWidth - 360, Math.max(16, textPlacement.x)),
                  top: Math.min(artHeight - 120, Math.max(16, textPlacement.y)),
                }}
                className="absolute z-30 p-2 rounded-xl bg-[#0a0c12]/95 border border-white/30 shadow-2xl flex items-center gap-2 min-w-[320px]"
              >
                <input
                  type="text"
                  autoFocus
                  value={textPlacement.value}
                  onChange={(e) =>
                    setTextPlacement((prev) => (prev ? { ...prev, value: e.target.value } : null))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitTextPlacement();
                    if (e.key === 'Escape') setTextPlacement(null);
                  }}
                  placeholder="Type canvas headline..."
                  className="flex-1 bg-black/70 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white"
                />
                <button
                  type="button"
                  onClick={commitTextPlacement}
                  className="p-2 rounded-lg bg-white text-black hover:bg-white/90 cursor-pointer"
                  title="Place Text"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setTextPlacement(null)}
                  className="p-2 rounded-lg border border-white/15 text-white/60 hover:text-white cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom-Right Viewport HUD */}
          <div
            data-canvas-ui="true"
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-[#0b0d12]/90 backdrop-blur-md border border-white/[0.12] text-[10px] font-mono text-white/65 flex items-center gap-3 pointer-events-auto"
          >
            <span className="tabular-nums">
              {artWidth} × {artHeight}px
            </span>
            {cursorArtCoords && (
              <span className="tabular-nums hidden sm:inline">
                X:{cursorArtCoords.x} Y:{cursorArtCoords.y}
              </span>
            )}
            <span className="text-white uppercase">{activeTool}</span>
            {onGoToFuLabs && (
              <button
                type="button"
                onClick={onGoToFuLabs}
                className="text-white/75 hover:text-white underline cursor-pointer hidden md:inline"
              >
                05 Fu Labs 3D
              </button>
            )}
          </div>

          {/* Status Toast inside Canvas */}
          {statusNotice && (
            <div
              data-canvas-ui="true"
              className={`absolute top-4 left-1/2 -translate-x-1/2 px-3.5 py-2 rounded-lg border text-xs font-mono backdrop-blur-xl shadow-xl flex items-center gap-2 z-30 ${
                statusNotice.isError
                  ? 'bg-neutral-950/95 border-white/30 text-white'
                  : 'bg-black/90 border-white/20 text-white'
              }`}
            >
              {statusNotice.isError && <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{statusNotice.message}</span>
            </div>
          )}
        </div>

        {/* Right Layer Stack & Properties Dock */}
        {isInspectorOpen && (
          <aside className="w-72 sm:w-80 bg-[#0b0d12] border-l border-white/[0.1] flex flex-col shrink-0 z-10 overflow-hidden">
            {/* Inspector Tabs */}
            <div className="grid grid-cols-2 border-b border-white/[0.08] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setInspectorTab('layers')}
                className={`py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  inspectorTab === 'layers'
                    ? 'bg-white/[0.08] text-white font-semibold border-b-2 border-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers ({layers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('properties')}
                className={`py-2.5 uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  inspectorTab === 'properties'
                    ? 'bg-white/[0.08] text-white font-semibold border-b-2 border-white'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Brush & FX</span>
              </button>
            </div>

            {inspectorTab === 'layers' ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3.5 space-y-4">
                {/* Layer Stack Header Actions */}
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => addNewLayer()}
                    className="flex-1 py-2 px-3 rounded-lg bg-white text-black text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-white/90 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Layer</span>
                  </button>
                  {activeLayer && (
                    <button
                      type="button"
                      onClick={() => duplicateLayer(activeLayer.id)}
                      title="Duplicate Active Layer"
                      className="p-2 rounded-lg border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.1] text-white/80 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Layer Stack List (Rendered top-to-bottom) */}
                <div className="space-y-1.5 flex-1 overflow-y-auto pr-0.5">
                  {[...layers].reverse().map((layer) => {
                    const isSelected = layer.id === activeLayerId;
                    const actualIdx = layers.findIndex((l) => l.id === layer.id);
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayerId(layer.id)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                          isSelected
                            ? 'border-white/45 bg-white/[0.08]'
                            : 'border-white/[0.08] bg-white/[0.025] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          {editingLayerNameId === layer.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingLayerNameVal}
                              onChange={(e) => setEditingLayerNameVal(e.target.value)}
                              onBlur={() => {
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id
                                      ? { ...l, name: editingLayerNameVal.trim() || l.name }
                                      : l
                                  )
                                );
                                setEditingLayerNameId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-black border border-white/30 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingLayerNameId(layer.id);
                                setEditingLayerNameVal(layer.name);
                              }}
                              title="Double-click to rename"
                              className="text-xs font-medium text-white truncate flex-1"
                            >
                              {layer.name}
                            </span>
                          )}

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id ? { ...l, visible: !l.visible } : l
                                  )
                                );
                              }}
                              className="p-1 text-white/60 hover:text-white cursor-pointer"
                              title={layer.visible ? 'Hide layer' : 'Show layer'}
                            >
                              {layer.visible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-white/30" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLayers((prev) =>
                                  prev.map((l) =>
                                    l.id === layer.id ? { ...l, locked: !l.locked } : l
                                  )
                                );
                              }}
                              className="p-1 text-white/60 hover:text-white cursor-pointer"
                              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                            >
                              {layer.locked ? (
                                <Lock className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 text-white/40" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={actualIdx >= layers.length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveLayerOrder(layer.id, 1);
                              }}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={actualIdx <= 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveLayerOrder(layer.id, -1);
                              }}
                              className="p-1 text-white/50 hover:text-white disabled:opacity-25 cursor-pointer"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteLayer(layer.id);
                              }}
                              className="p-1 text-white/45 hover:text-white cursor-pointer"
                              title={layers.length > 1 ? 'Delete Layer' : 'Clear Layer'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono text-white/45">
                          <span>{layer.blendMode}</span>
                          <span className="tabular-nums">{Math.round(layer.opacity * 100)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Layer Opacity & Blend Mode */}
                {activeLayer && (
                  <div className="p-3 rounded-xl border border-white/[0.08] bg-black/40 space-y-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                        <span>Layer Opacity</span>
                        <span className="tabular-nums">{Math.round(activeLayer.opacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(activeLayer.opacity * 100)}
                        onChange={(e) =>
                          updateActiveLayerProp({ opacity: Number(e.target.value) / 100 })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="font-mono text-[10px] text-white/70 block">Blend Mode</span>
                      <select
                        value={activeLayer.blendMode}
                        onChange={(e) =>
                          updateActiveLayerProp({ blendMode: e.target.value as CanvasBlendMode })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-white/[0.12] bg-[#090b10] text-xs font-mono text-white focus:outline-none"
                      >
                        <option value="source-over">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="soft-light">Soft Light</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Artboard Backdrop & Project Save/Load */}
                <div className="pt-2 border-t border-white/[0.08] space-y-2.5">
                  <span className="font-mono text-[10px] text-white/50 uppercase block">
                    Canvas Backdrop
                  </span>
                  <div className="flex items-center gap-1.5">
                    {CANVAS_BG_SWATCHES.map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBackgroundColor(bg.value)}
                        title={bg.label}
                        style={{
                          backgroundColor: bg.value === 'transparent' ? '#141720' : bg.value,
                        }}
                        className={`flex-1 h-7 rounded-md border text-[9px] font-mono cursor-pointer ${
                          backgroundColor === bg.value
                            ? 'border-white ring-1 ring-white/40'
                            : 'border-white/20'
                        }`}
                      >
                        {bg.value === 'transparent' ? 'TR' : ''}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handleExportProjectJson}
                      className="py-1.5 px-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/75 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5" />
                      <span>Save JSON</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => jsonInputRef.current?.click()}
                      className="py-1.5 px-2.5 rounded-lg border border-white/[0.1] bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-mono text-white/75 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Load JSON</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Brush, Typography, Transform & Non-Destructive Layer Filters */
              <div className="flex-1 overflow-y-auto p-3.5 space-y-5 text-xs">
                {/* Brush / Stroke Controls */}
                <div className="space-y-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                    Tool Calibration
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                      <span>Stroke Size</span>
                      <span className="tabular-nums">{brushSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={120}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                      <span>Ink Opacity</span>
                      <span className="tabular-nums">{Math.round(brushOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={100}
                      value={Math.round(brushOpacity * 100)}
                      onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                      <span>Headline Size (Text Tool)</span>
                      <span className="tabular-nums">{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={180}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[10px] text-white/70">Fill Shapes</span>
                    <button
                      type="button"
                      onClick={() => setShapeFilled((f) => !f)}
                      className={`px-2.5 py-1 rounded border text-[10px] font-mono cursor-pointer ${
                        shapeFilled
                          ? 'bg-white text-black border-white font-semibold'
                          : 'border-white/15 text-white/60'
                      }`}
                    >
                      {shapeFilled ? 'FILLED' : 'OUTLINE'}
                    </button>
                  </div>
                </div>

                {/* Active Layer Transform */}
                {activeLayer && (
                  <div className="space-y-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                        Layer Transform
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveLayerProp({ offsetX: 0, offsetY: 0, scale: 1 })
                        }
                        className="text-[10px] font-mono text-white/55 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px] text-white/70">
                        <span>Layer Scale</span>
                        <span className="tabular-nums">{Math.round(activeLayer.scale * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={250}
                        value={Math.round(activeLayer.scale * 100)}
                        onChange={(e) =>
                          updateActiveLayerProp({ scale: Number(e.target.value) / 100 })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Non-Destructive Layer Filters */}
                {activeLayer && (
                  <div className="space-y-3 p-3 rounded-xl border border-white/[0.08] bg-black/40">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                        Layer Color Grade
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveLayerProp({ filters: { ...DEFAULT_LAYER_FILTERS } })
                        }
                        className="text-[10px] font-mono text-white/55 hover:text-white cursor-pointer"
                      >
                        Reset Grade
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-white/70">
                        <span>Brightness</span>
                        <span className="tabular-nums">{activeLayer.filters.brightness}%</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={180}
                        value={activeLayer.filters.brightness}
                        onChange={(e) =>
                          updateActiveLayerProp({
                            filters: {
                              ...activeLayer.filters,
                              brightness: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-white/70">
                        <span>Contrast</span>
                        <span className="tabular-nums">{activeLayer.filters.contrast}%</span>
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={180}
                        value={activeLayer.filters.contrast}
                        onChange={(e) =>
                          updateActiveLayerProp({
                            filters: {
                              ...activeLayer.filters,
                              contrast: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between font-mono text-[10px] text-white/70">
                        <span>Saturation</span>
                        <span className="tabular-nums">{activeLayer.filters.saturate}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={activeLayer.filters.saturate}
                        onChange={(e) =>
                          updateActiveLayerProp({
                            filters: {
                              ...activeLayer.filters,
                              saturate: Number(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-white cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono text-[10px] text-white/70">Monochrome Noir</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateActiveLayerProp({
                            filters: {
                              ...activeLayer.filters,
                              grayscale: !activeLayer.filters.grayscale,
                            },
                          })
                        }
                        className={`px-2.5 py-1 rounded border text-[10px] font-mono cursor-pointer ${
                          activeLayer.filters.grayscale
                            ? 'bg-white text-black border-white font-semibold'
                            : 'border-white/15 text-white/60'
                        }`}
                      >
                        {activeLayer.filters.grayscale ? 'NOIR ON' : 'COLOR'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        multiple
        className="hidden"
        onChange={(e) => handleImportImageFiles(e.target.files)}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json,.vaibyte.json"
        className="hidden"
        onChange={(e) => handleImportProjectJson(e.target.files)}
      />

      {/* AI Concept Plate Synthesizer Modal */}
      {isAiPlateOpen && (
        <div
          onClick={() => setIsAiPlateOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleGenerateAiPlate}
            className="w-full max-w-lg rounded-2xl border border-white/20 bg-[#0b0d12] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-mono text-sm uppercase font-semibold">
                <Sparkles className="w-4 h-4" />
                <span>VaiByte AI Concept Plate</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAiPlateOpen(false)}
                className="p-1 text-white/50 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Generate a visual keyframe plate onto a dedicated layer in {aspectPreset} framing ({artWidth} × {artHeight}px).
            </p>
            <textarea
              rows={4}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe composition, architecture, subject lighting, and mood..."
              className="w-full p-3 rounded-xl border border-white/15 bg-black/70 text-xs sm:text-sm text-white placeholder-white/35 focus:outline-none focus:border-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAiPlateOpen(false)}
                className="px-4 py-2 rounded-lg border border-white/15 text-xs font-mono text-white/70 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!aiPrompt.trim() || isGeneratingAiPlate}
                className="px-4 py-2 rounded-lg bg-white text-black text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-white/90 disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAiPlate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Add AI Layer</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
