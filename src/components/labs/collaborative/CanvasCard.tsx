import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  Film,
  Play,
  Layers,
  Edit2,
  Trash2,
  Copy,
  Send,
  Check,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { CanvasItem, CanvasItemType } from '../../../types/collaborativeRooms';

interface CanvasCardProps {
  item: CanvasItem;
  isSelected: boolean;
  onSelect: (item: CanvasItem) => void;
  onUpdate: (item: CanvasItem) => void;
  onDelete: (itemId: string) => void;
  onSendToLab: (prompt: string, refImage?: string) => void;
  onStartDrag: (e: React.PointerEvent, item: CanvasItem) => void;
}

export const CanvasCard: React.FC<CanvasCardProps> = ({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onSendToLab,
  onStartDrag,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(item.title);
  const [editedContent, setEditedContent] = useState(item.content);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
      ...item,
      title: editedTitle.trim() || item.title,
      content: editedContent.trim() || item.content,
      activeEditorId: null,
      activeEditorName: null,
    });
    setIsEditing(false);
  };

  const getHeaderBadge = () => {
    switch (item.type) {
      case 'PROMPT_CARD':
        return (
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Sparkles className="w-3 h-3" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">PROMPT CARD</span>
          </div>
        );
      case 'NOTE':
        return (
          <div className="flex items-center gap-1.5 text-purple-400">
            <FileText className="w-3 h-3" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">NOTE</span>
          </div>
        );
      case 'REFERENCE_IMAGE':
        return (
          <div className="flex items-center gap-1.5 text-rose-400">
            <ImageIcon className="w-3 h-3" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">REFERENCE PLATE</span>
          </div>
        );
      case 'VIDEO_PREVIEW':
        return (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Film className="w-3 h-3" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">GENERATED PREVIEW</span>
          </div>
        );
      case 'STORYBOARD':
        return (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Layers className="w-3 h-3" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase">
              SCENE {item.sceneOrder ? `0${item.sceneOrder}` : ''}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      onPointerDown={(e) => {
        onSelect(item);
        // Only start drag if not clicking inside input or button
        const target = e.target as HTMLElement;
        if (!target.closest('button, input, textarea')) {
          onStartDrag(e, item);
        }
      }}
      style={{
        transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
        width: `${item.width}px`,
      }}
      className={`absolute z-10 rounded-xl border bg-[#0D0D14]/95 backdrop-blur-xl shadow-xl select-none transition-shadow ${
        isSelected
          ? 'border-white ring-2 ring-white/30 shadow-2xl z-20'
          : 'border-white/15 hover:border-white/30'
      }`}
    >
      {/* Real-Time Collaborator Editing Indicator */}
      {item.activeEditorName && (
        <div className="absolute -top-3 left-3 z-30 px-2 py-0.5 rounded-full bg-cyan-500 text-black font-mono text-[9px] font-bold shadow-md flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
          <span>{item.activeEditorName} is editing</span>
        </div>
      )}

      {/* Card Header (Drag Handle) */}
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between cursor-grab active:cursor-grabbing bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          {getHeaderBadge()}
          <span className="text-[11px] font-mono font-bold text-white truncate max-w-[150px]">
            {item.title}
          </span>
        </div>

        {/* Hover / Active Actions */}
        <div className="flex items-center gap-1">
          {item.type === 'PROMPT_CARD' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSendToLab(item.content);
              }}
              className="p-1 rounded text-cyan-400 hover:text-white hover:bg-cyan-500/20 transition-colors"
              title="Load prompt into AI Video Lab"
            >
              <Send className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing((prev) => !prev);
            }}
            className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            title="Edit card"
          >
            <Edit2 className="w-3 h-3" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-red-950/20 transition-colors"
            title="Delete card"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 space-y-2.5">
        {isEditing ? (
          <form onSubmit={handleSaveEdit} className="space-y-2">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
            />
            <textarea
              rows={3}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full bg-black/60 border border-white/20 rounded px-2 py-1 text-xs font-sans text-white focus:outline-none resize-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-[10px] font-mono text-white/50 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-white text-black font-mono text-[10px] font-bold"
              >
                Save
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Visual media preview if present */}
            {item.mediaUrl && (
              <div className="relative w-full aspect-[16/9] rounded overflow-hidden bg-black/60 border border-white/10 group/img">
                <img
                  src={item.mediaUrl}
                  alt={item.title}
                  className="w-full h-full object-cover filter contrast-[1.05]"
                />
                {item.type === 'VIDEO_PREVIEW' && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                  </div>
                )}
                {item.weight !== undefined && (
                  <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    Weight: {item.weight}
                  </div>
                )}
              </div>
            )}

            {/* Content text */}
            <p className="font-sans text-xs text-white/80 leading-relaxed line-clamp-4 select-text">
              {item.content}
            </p>

            {/* Metadata Footer */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-white/40">
              <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                {item.authorAvatar && (
                  <img
                    src={item.authorAvatar}
                    alt={item.authorName}
                    className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-white/10"
                  />
                )}
                <span className="truncate">{item.authorName}</span>
              </div>

              {item.durationSeconds && (
                <span>{item.durationSeconds}s @ {item.resolution || '1080p'}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
