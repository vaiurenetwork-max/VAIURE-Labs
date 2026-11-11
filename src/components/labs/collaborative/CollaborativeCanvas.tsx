import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Undo2,
  Redo2,
  Plus,
  Sparkles,
  FileText,
  Image as ImageIcon,
  Layers,
  MousePointer,
  Hand,
} from 'lucide-react';
import { CanvasItem, LiveCursor, RoomParticipant } from '../../../types/collaborativeRooms';
import { CanvasCard } from './CanvasCard';
import { broadcastCursorPosition, subscribeToLiveCursors } from '../../../services/collaborativeRoomsService';

interface CollaborativeCanvasProps {
  roomId: string;
  items: CanvasItem[];
  currentUserId: string;
  currentUsername: string;
  onUpdateItem: (item: CanvasItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (type: CanvasItem['type']) => void;
  onSendToLab: (prompt: string, refImage?: string) => void;
}

export const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({
  roomId,
  items,
  currentUserId,
  currentUsername,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  onSendToLab,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [toolMode, setToolMode] = useState<'SELECT' | 'PAN'>('SELECT');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Live collaborator cursors from Firestore
  const [liveCursors, setLiveCursors] = useState<LiveCursor[]>([]);

  // Local drag tracking for cards
  const [draggingItem, setDraggingItem] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialItemX: number;
    initialItemY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const lastBroadcastRef = useRef<number>(0);

  // Subscribe to other collaborators' live cursors
  useEffect(() => {
    const unsub = subscribeToLiveCursors(roomId, currentUserId, setLiveCursors);
    return () => unsub();
  }, [roomId, currentUserId]);

  // Broadcast current user's cursor on pointer move (throttled to 60ms)
  const handlePointerMoveCanvas = useCallback(
    (e: React.PointerEvent) => {
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Transform raw client coordinates into canvas virtual coordinates
      const virtualX = (rawX - pan.x) / zoom;
      const virtualY = (rawY - pan.y) / zoom;

      // 1. If currently dragging a card
      if (draggingItem) {
        const deltaX = (e.clientX - draggingItem.startX) / zoom;
        const deltaY = (e.clientY - draggingItem.startY) / zoom;
        const target = items.find((i) => i.id === draggingItem.id);
        if (target) {
          onUpdateItem({
            ...target,
            x: Math.round(draggingItem.initialItemX + deltaX),
            y: Math.round(draggingItem.initialItemY + deltaY),
          });
        }
      }

      // 2. If currently panning canvas
      if (isPanning) {
        setPan({
          x: pan.x + (e.clientX - panStart.x),
          y: pan.y + (e.clientY - panStart.y),
        });
        setPanStart({ x: e.clientX, y: e.clientY });
      }

      // 3. Broadcast cursor position to Firestore
      const now = Date.now();
      if (now - lastBroadcastRef.current > 75) {
        lastBroadcastRef.current = now;
        broadcastCursorPosition(roomId, {
          id: `cursor-${currentUserId}`,
          userId: currentUserId,
          username: currentUsername,
          color: '#38BDF8',
          x: Math.round(virtualX),
          y: Math.round(virtualY),
          lastSeen: now,
          activeCardId: selectedItemId,
        });
      }
    },
    [
      pan,
      zoom,
      draggingItem,
      isPanning,
      panStart,
      items,
      onUpdateItem,
      roomId,
      currentUserId,
      currentUsername,
      selectedItemId,
    ]
  );

  const handlePointerUpCanvas = () => {
    setDraggingItem(null);
    setIsPanning(false);
  };

  const handleStartCardDrag = (e: React.PointerEvent, item: CanvasItem) => {
    if (toolMode === 'PAN') return;
    setDraggingItem({
      id: item.id,
      startX: e.clientX,
      startY: e.clientY,
      initialItemX: item.x,
      initialItemY: item.y,
    });
  };

  const handleStartPan = (e: React.PointerEvent) => {
    // Only pan if middle button or toolMode === 'PAN' or clicking blank background
    const target = e.target as HTMLElement;
    if (toolMode === 'PAN' || e.button === 1 || target === canvasRef.current || target.dataset.canvasBackground) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.0, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      data-slide4-workspace="true"
      className="slide4-protected-zone relative w-full h-full overflow-hidden bg-[#07070B] select-none"
    >
      {/* Canvas Controls Floating Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 p-1 rounded-lg bg-black/80 border border-white/15 backdrop-blur-md shadow-2xl text-xs font-mono text-white/80">
        <button
          onClick={() => setToolMode('SELECT')}
          className={`p-1.5 rounded transition-colors ${
            toolMode === 'SELECT' ? 'bg-white text-black font-bold' : 'hover:text-white'
          }`}
          title="Selection & Move Mode"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setToolMode('PAN')}
          className={`p-1.5 rounded transition-colors ${
            toolMode === 'PAN' ? 'bg-white text-black font-bold' : 'hover:text-white'
          }`}
          title="Pan & Drag Canvas Mode"
        >
          <Hand className="w-3.5 h-3.5" />
        </button>

        <span className="w-[1px] h-4 bg-white/20 mx-0.5" />

        <button
          onClick={() => handleZoom(-0.15)}
          className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] w-10 text-center font-bold text-white/90">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={() => handleZoom(0.15)}
          className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetView}
          className="p-1.5 rounded hover:bg-white/10 hover:text-white transition-colors"
          title="Reset Zoom & Center View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Canvas Quick Add Menu (Bottom Center) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-black/85 border border-white/20 backdrop-blur-xl shadow-2xl">
        <button
          onClick={() => onAddItem('PROMPT_CARD')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-black font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>+ Prompt</span>
        </button>

        <button
          onClick={() => onAddItem('NOTE')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-black font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>+ Note</span>
        </button>

        <button
          onClick={() => onAddItem('REFERENCE_IMAGE')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-black font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>+ Reference</span>
        </button>

        <button
          onClick={() => onAddItem('STORYBOARD')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black font-mono text-xs font-bold transition-all cursor-pointer"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Storyboard</span>
        </button>
      </div>

      {/* Interactive Infinite Canvas Viewport */}
      <div
        ref={canvasRef}
        data-canvas-background="true"
        onPointerDown={handleStartPan}
        onPointerMove={handlePointerMoveCanvas}
        onPointerUp={handlePointerUpCanvas}
        onPointerCancel={handlePointerUpCanvas}
        className={`w-full h-full relative overflow-hidden ${
          toolMode === 'PAN' || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        style={{
          touchAction: 'none',
        }}
      >
        {/* Infinite Grid Background */}
        <div
          data-canvas-background="true"
          className="absolute inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)`,
            backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Transformed Canvas Plane */}
        <div
          data-canvas-background="true"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '6000px',
            height: '4000px',
          }}
          className="relative pointer-events-auto"
        >
          {/* SVG Connection Lines Between Connected Cards */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            {items.map((source) => {
              if (!source.connectedToIds || source.connectedToIds.length === 0) return null;
              return source.connectedToIds.map((targetId) => {
                const target = items.find((i) => i.id === targetId);
                if (!target) return null;

                const startX = source.x + source.width;
                const startY = source.y + source.height / 2;
                const endX = target.x;
                const endY = target.y + target.height / 2;
                const controlX = startX + (endX - startX) / 2;

                return (
                  <path
                    key={`${source.id}-${target.id}`}
                    d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
                    fill="none"
                    stroke="rgba(56, 189, 248, 0.4)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                );
              });
            })}
          </svg>

          {/* Render All Canvas Cards */}
          {items.map((item) => (
            <CanvasCard
              key={item.id}
              item={item}
              isSelected={selectedItemId === item.id}
              onSelect={(i) => setSelectedItemId(i.id)}
              onUpdate={onUpdateItem}
              onDelete={onDeleteItem}
              onSendToLab={onSendToLab}
              onStartDrag={handleStartCardDrag}
            />
          ))}

          {/* Render Live Collaborator Cursors */}
          {liveCursors.map((cursor) => (
            <div
              key={cursor.id}
              className="absolute pointer-events-none z-40 transition-all duration-100 ease-out flex items-center gap-1"
              style={{
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
            >
              <svg
                className="w-4 h-4 drop-shadow-lg"
                viewBox="0 0 24 24"
                fill={cursor.color || '#38BDF8'}
                stroke="#000"
                strokeWidth="1.5"
              >
                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.36z" />
              </svg>
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-black shadow-xl"
                style={{ backgroundColor: cursor.color || '#38BDF8' }}
              >
                {cursor.username}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
