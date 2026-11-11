import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Share2,
  Settings,
  Cloud,
  Check,
  Undo2,
  Redo2,
  Sparkles,
  Layers,
  Activity,
  Maximize2,
} from 'lucide-react';
import { CollaborativeRoom, CanvasItem, RoomParticipant, RoomActivity } from '../../../types/collaborativeRooms';
import {
  subscribeToCanvasItems,
  subscribeToParticipants,
  subscribeToActivities,
  saveCanvasItem,
  deleteCanvasItem,
  addRoomActivity,
} from '../../../services/collaborativeRoomsService';
import { ProjectExplorerSidebar } from './ProjectExplorerSidebar';
import { CollaborativeCanvas } from './CollaborativeCanvas';
import { AIVideoLabSidebar } from './AIVideoLabSidebar';
import { CollaboratorPresenceBar } from './CollaboratorPresenceBar';
import { RoomActivityFeed } from './RoomActivityFeed';
import { InviteCollaboratorModal } from './InviteCollaboratorModal';
import { ManageRoomModal } from './ManageRoomModal';

interface SharedWorksWorkspaceProps {
  room: CollaborativeRoom;
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    photoURL?: string;
  };
  onLeaveRoom: () => void;
  onRoomUpdated: (room: CollaborativeRoom) => void;
  onRoomDeleted: (roomId: string) => void;
}

export const SharedWorksWorkspace: React.FC<SharedWorksWorkspaceProps> = ({
  room,
  currentUser,
  onLeaveRoom,
  onRoomUpdated,
  onRoomDeleted,
}) => {
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [activities, setActivities] = useState<RoomActivity[]>([]);

  // Workspace layout toggles
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Modals
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Selected prompt to pass to AI Lab
  const [labPrefillPrompt, setLabPrefillPrompt] = useState<string | undefined>(undefined);

  // Real-time Firestore subscriptions for the active room
  useEffect(() => {
    const unsubItems = subscribeToCanvasItems(room.id, setItems);
    const unsubParts = subscribeToParticipants(room.id, setParticipants);
    const unsubActs = subscribeToActivities(room.id, setActivities);

    return () => {
      unsubItems();
      unsubParts();
      unsubActs();
    };
  }, [room.id]);

  const handleUpdateItem = async (updated: CanvasItem) => {
    await saveCanvasItem(room.id, updated);
  };

  const handleDeleteItem = async (itemId: string) => {
    const target = items.find((i) => i.id === itemId);
    await deleteCanvasItem(room.id, itemId);
    if (target) {
      await addRoomActivity(room.id, {
        actorId: currentUser.id || 'guest',
        actorName: currentUser.displayName || 'Creator',
        actorAvatar:
          currentUser.photoURL ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        action: `removed ${target.type.toLowerCase().replace('_', ' ')}: "${target.title}"`,
      });
    }
  };

  const handleAddItem = async (type: CanvasItem['type']) => {
    const newId = `card-${Date.now()}`;
    const titles: Record<CanvasItem['type'], string> = {
      PROMPT_CARD: 'New Scene Prompt',
      NOTE: 'Director Concept Note',
      REFERENCE_IMAGE: 'Aesthetic Reference Plate',
      VIDEO_PREVIEW: 'Rendered Take',
      SCENE_GROUP: 'Scene Group',
      STORYBOARD: `Scene 0${items.length + 1} Storyboard`,
    };

    const newItem: CanvasItem = {
      id: newId,
      roomId: room.id,
      type,
      title: titles[type] || 'New Card',
      content:
        type === 'PROMPT_CARD'
          ? 'Enter cinematic camera movement, lighting directives, optical texture, and atmosphere...'
          : 'Capture concepts, tone guidelines, color grading notes, or actor staging directives.',
      x: 200 + Math.floor(Math.random() * 200),
      y: 150 + Math.floor(Math.random() * 150),
      width: type === 'REFERENCE_IMAGE' ? 280 : 320,
      height: 200,
      mediaUrl:
        type === 'REFERENCE_IMAGE'
          ? 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80'
          : undefined,
      authorId: currentUser.id || 'guest',
      authorName: currentUser.displayName || 'Creator',
      authorAvatar: currentUser.photoURL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCanvasItem(room.id, newItem);
    await addRoomActivity(room.id, {
      actorId: currentUser.id || 'guest',
      actorName: currentUser.displayName || 'Creator',
      actorAvatar:
        currentUser.photoURL ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      action: `added a new ${type.toLowerCase().replace('_', ' ')}`,
      targetTitle: newItem.title,
    });
  };

  const handleGenerateComplete = async (generatedItem: CanvasItem) => {
    await saveCanvasItem(room.id, generatedItem);
    await addRoomActivity(room.id, {
      actorId: currentUser.id || 'guest',
      actorName: currentUser.displayName || 'Creator',
      actorAvatar:
        currentUser.photoURL ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      action: 'generated a new video variation',
      targetTitle: generatedItem.title,
    });
  };

  const handleShareLink = () => {
    const url = `${window.location.origin}#room=${room.id}&code=${room.inviteCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      data-slide4-workspace="true"
      className="slide4-protected-zone relative w-full h-full flex flex-col bg-[#07070B] text-[#ECECE9] overflow-hidden select-none"
    >
      {/* 1. TOP TOOLBAR CHROME */}
      <header className="h-12 px-3 sm:px-5 bg-[#0A0A0F] border-b border-white/10 flex items-center justify-between shrink-0 z-30 select-none">
        {/* Left: Back / Leave Room & Room Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs transition-colors cursor-pointer"
            title="Leave Collaborative Room"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rooms</span>
          </button>

          <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-tight text-white truncate max-w-[140px] sm:max-w-[260px] md:max-w-md">
              {room.name}
            </h2>
            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase tracking-wider shrink-0 hidden md:inline">
              SharedWorks Canvas
            </span>
          </div>

          {/* Sync Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-white/40">
            <Cloud className="w-3 h-3 text-emerald-400" />
            <span>Synced to Cloud</span>
          </div>
        </div>

        {/* Right: Presence, Invite, Share, Settings */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Collaborator Presence Bar */}
          <CollaboratorPresenceBar
            participants={participants}
            onInvite={() => setIsInviteOpen(true)}
          />

          <div className="h-4 w-[1px] bg-white/20 hidden sm:block" />

          {/* Share Link Button */}
          <button
            onClick={handleShareLink}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Copy Share Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Room Settings */}
          <button
            onClick={() => setIsManageOpen(true)}
            className="p-1.5 rounded bg-white/[0.04] hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Room Management & Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. THREE-PANE COLLABORATIVE WORKSPACE BODY */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Left Sidebar: Project Explorer */}
        <ProjectExplorerSidebar
          items={items}
          isCollapsed={isLeftCollapsed}
          onToggleCollapse={() => setIsLeftCollapsed(!isLeftCollapsed)}
          onSelectItem={(item) => {
            // center on item or load
          }}
          onAddItem={handleAddItem}
        />

        {/* Center: SharedWorks Canvas */}
        <main className="flex-1 relative h-full overflow-hidden">
          <CollaborativeCanvas
            roomId={room.id}
            items={items}
            currentUserId={currentUser.id || 'guest'}
            currentUsername={currentUser.displayName || 'Creator'}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onSendToLab={(prompt) => {
              setLabPrefillPrompt(prompt);
              setIsRightCollapsed(false);
            }}
          />

          {/* Floating Bottom Left Activity Feed Ticker */}
          <div className="absolute bottom-4 left-4 z-30">
            <RoomActivityFeed
              activities={activities}
              isOpen={isActivityOpen}
              onToggle={() => setIsActivityOpen(!isActivityOpen)}
            />
          </div>
        </main>

        {/* Right Sidebar: AI Video Lab */}
        <AIVideoLabSidebar
          isCollapsed={isRightCollapsed}
          prefilledPrompt={labPrefillPrompt}
          onToggleCollapse={() => setIsRightCollapsed(!isRightCollapsed)}
          onGenerateComplete={handleGenerateComplete}
          currentUserId={currentUser.id || 'guest'}
          currentUserName={currentUser.displayName || 'Creator'}
          currentUserAvatar={
            currentUser.photoURL ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
          }
          roomId={room.id}
        />
      </div>

      {/* 3. MODALS */}
      <InviteCollaboratorModal
        isOpen={isInviteOpen}
        room={room}
        onClose={() => setIsInviteOpen(false)}
      />

      <ManageRoomModal
        isOpen={isManageOpen}
        room={room}
        currentUserId={currentUser.id || 'guest'}
        onClose={() => setIsManageOpen(false)}
        onRoomUpdated={onRoomUpdated}
        onRoomDeleted={onRoomDeleted}
      />
    </div>
  );
};
