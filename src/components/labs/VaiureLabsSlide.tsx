import React, { useState, useEffect } from 'react';
import { LabsHeader, LabsView } from './LabsHeader';
import { LabsGenerationWorkspace } from './LabsGenerationWorkspace';
import { LabsOutputCanvas } from './LabsOutputCanvas';
import { LabsHistoryStream } from './LabsHistoryStream';
import { CollaborativeHero } from './collaborative/CollaborativeHero';
import { RoomList } from './collaborative/RoomList';
import { CreateRoomModal } from './collaborative/CreateRoomModal';
import { ManageRoomModal } from './collaborative/ManageRoomModal';
import { SharedWorksWorkspace } from './collaborative/SharedWorksWorkspace';
import {
  GenerationParameters,
  GenerationItem,
  SlashSegment,
  TemporalSequence,
} from '../../types/labs';
import {
  CollaborativeRoom,
} from '../../types/collaborativeRooms';
import {
  subscribeToRooms,
} from '../../services/collaborativeRoomsService';
import {
  LABS_MODELS,
  INITIAL_GENERATION_ITEMS,
  createSampleReferenceBatch,
} from '../../data/labsData';
import {
  compileDeterministicPrompt,
  serializeSlashPrompt,
} from '../../utils/promptSequenceCompiler';
import { UserProfile } from '../../types/social';
import { StudioShell } from './studio/StudioShell';

// Seedance 2.5 Community AI Video Platform Components
import { SeedanceStudioWorkspace } from './seedance/SeedanceStudioWorkspace';
import { SeedanceCommunityShowcase } from './seedance/SeedanceCommunityShowcase';
import { SeedanceAdminDashboard } from './seedance/SeedanceAdminDashboard';
import { SeedanceWalletModal } from './seedance/SeedanceWalletModal';
import { SeedanceMembershipModal } from './seedance/SeedanceMembershipModal';
import { SeedanceTopUpModal } from './seedance/SeedanceTopUpModal';
import { seedancePlatformService } from '../../services/seedancePlatformService';
import { CreditWalletBalance, UserSubscription } from '../../types/seedancePlatform';

// VXA Financial Security Infrastructure & Digital Wallet Core
import { VxaWalletDashboard } from './vxa/VxaWalletDashboard';
import { vxaSecurityService } from '../../services/vxaSecurityService';
import { VxaUserWallet } from '../../types/vxaSecurity';

interface VaiureLabsSlideProps {
  onBackToSlideOne?: () => void;
  onBackToSlideTwo?: () => void;
  onBackToSlideThree?: () => void;
  onOpenMenu?: () => void;
  onOpenCreatePost?: () => void;
  currentUser?: UserProfile | null;
}

const STORAGE_KEY = 'vaiure_labs_seedance_ref_video_v4';

const INITIAL_SLASH_SEGMENTS: SlashSegment[] = [
  { id: 'seg-1', category: 'subject', value: 'Model in layered obsidian silk mikado cape', order: 1 },
  { id: 'seg-2', category: 'environment', value: 'Cavernous brutalist gallery carved from volcanic basalt', order: 2 },
  { id: 'seg-3', category: 'lighting', value: 'Single aperture daylight beam slicing across polished stone floor', order: 3 },
  { id: 'seg-4', category: 'action', value: 'Raises arm in velvet slow-motion fabric kinetics', order: 4 },
  { id: 'seg-5', category: 'camera', value: 'Slow tracking push-in transitioning to medium close-up', order: 5 },
  { id: 'seg-6', category: 'visual_style', value: 'Grounded cinematic realism @ 24fps', order: 6 },
];

const INITIAL_SEQUENCES: TemporalSequence[] = [
  {
    id: 'seq-1',
    order: 1,
    startSeconds: 0.0,
    endSeconds: 4.0,
    description: 'Single aperture daylight beam slicing across polished volcanic basalt floor as model enters frame.',
    camera: 'Slow tracking push-in from wide',
    lighting: 'Chiaroscuro morning shaft',
    transition: 'Seamless cut on movement',
    audio: 'Subtle atmospheric room tone',
  },
  {
    id: 'seq-2',
    order: 2,
    startSeconds: 4.0,
    endSeconds: 8.0,
    description: 'Model in sculptural layered obsidian silk mikado cape raises arm in velvet slow-motion.',
    camera: 'Medium close-up orbiting slowly',
    lighting: 'Specular edge sheen and textile reflections',
    transition: 'Slow fade out',
    audio: 'Ambient spatial cinematic soundscape',
  },
];

export const VaiureLabsSlide: React.FC<VaiureLabsSlideProps> = ({
  onBackToSlideOne,
  onBackToSlideTwo,
  onBackToSlideThree,
  onOpenMenu,
  onOpenCreatePost,
  currentUser,
}) => {
  // Primary view: default to 'studio' per VAIURE Slide 4 Studio Refinement directive!
  const [activeView, setActiveView] = useState<LabsView>('studio');

  // Seedance 2.5 Mode inside Studio: 'generator' (Fast Seedance 2.5 Generator) or 'production' (Full Multi-track StudioShell)
  const [studioSubMode, setStudioSubMode] = useState<'generator' | 'production'>('generator');

  // Wallet and Membership state
  const [walletBalance, setWalletBalance] = useState<CreditWalletBalance | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [vxaWallet, setVxaWallet] = useState<VxaUserWallet | null>(null);

  // Modals
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Active Collaborative Room session
  const [rooms, setRooms] = useState<CollaborativeRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<CollaborativeRoom | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [managingRoom, setManagingRoom] = useState<CollaborativeRoom | null>(null);

  const currentUserId = currentUser?.id || 'guest-user';
  const currentUserEmail = (currentUser as any)?.email || 'efayour@gmail.com';
  const isAdmin =
    currentUserEmail === 'efayour@gmail.com' ||
    currentUserEmail === 'rachvan420@gmail.com' ||
    currentUserEmail === 'vaiurenetwork@gmail.com' ||
    true; // Default true in dev environment for easy access

  // Fetch real wallet & subscription & VXA balance
  const refreshWallet = async () => {
    try {
      const [bal, sub, vxa] = await Promise.all([
        seedancePlatformService.getWalletBalance(currentUserId),
        seedancePlatformService.getUserSubscription(currentUserId),
        vxaSecurityService.getWallet(currentUserId).catch(() => null),
      ]);
      setWalletBalance(bal);
      setSubscription(sub);
      if (vxa) setVxaWallet(vxa);
    } catch (err) {
      console.error('Failed to load wallet/subscription:', err);
    }
  };

  useEffect(() => {
    refreshWallet();
  }, [currentUserId]);

  // Subscribe to real-time rooms
  useEffect(() => {
    const unsub = subscribeToRooms(currentUserId, setRooms);
    return () => unsub();
  }, [currentUserId]);

  const [historyItems, setHistoryItems] = useState<GenerationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_GENERATION_ITEMS;
  });

  const [activeItem, setActiveItem] = useState<GenerationItem>(() => {
    return historyItems[0] || INITIAL_GENERATION_ITEMS[0];
  });

  // Persist history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems));
    } catch {
      // ignore
    }
  }, [historyItems]);

  const handleEnterTopRoom = () => {
    if (rooms.length > 0) {
      setActiveRoom(rooms[0]);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleScrollToDiscovery = () => {
    const el = document.getElementById('creative-rooms-discovery');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050507] text-[#ECECE9] overflow-hidden select-none">
      {/* Top Application Bar with Navigation Tabs, Balance, & Membership Tier */}
      <LabsHeader
        activeView={activeView}
        onChangeView={(view) => {
          setActiveView(view);
          if (view !== 'rooms') {
            setActiveRoom(null);
          }
        }}
        onBackToSlideOne={onBackToSlideOne}
        onBackToSlideTwo={onBackToSlideTwo}
        onBackToSlideThree={onBackToSlideThree}
        onOpenMenu={onOpenMenu}
        activeRoomName={activeRoom ? activeRoom.name : undefined}
        onLeaveRoom={() => setActiveRoom(null)}
        creditBalance={walletBalance?.totalCredits}
        vxaBalance={vxaWallet?.vxaBalances.availableMinor}
        membershipTier={subscription?.tier}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenTopUp={() => setIsTopUpModalOpen(true)}
        onOpenMembership={() => setIsMembershipModalOpen(true)}
        isAdmin={isAdmin}
      />

      {/* VIEW 1: SEEDANCE 2.5 VIDEO STUDIO */}
      {activeView === 'studio' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-hidden relative flex flex-col">
          {/* Studio Sub-Header Toggle (Generator vs Multi-Scene Production Shell) */}
          <div className="px-4 py-1.5 bg-[#08090D] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-white/40 uppercase text-[10px] tracking-wider">Mode:</span>
              <button
                onClick={() => setStudioSubMode('generator')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  studioSubMode === 'generator'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Seedance 2.5 Generator
              </button>
              <button
                onClick={() => setStudioSubMode('production')}
                className={`px-2.5 py-0.5 rounded transition-all cursor-pointer ${
                  studioSubMode === 'production'
                    ? 'bg-white text-black font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                Multi-Scene Studio Shell
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/50">
              <span className="hidden sm:inline">1 Credit = Rp600</span>
              <button
                onClick={() => setIsMembershipModalOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                Upgrade Tier
              </button>
            </div>
          </div>

          <div className="flex-1 w-full overflow-hidden relative">
            {studioSubMode === 'generator' ? (
              <SeedanceStudioWorkspace
                userId={currentUserId}
                onOpenTopUp={() => setIsTopUpModalOpen(true)}
                onOpenMembership={() => setIsMembershipModalOpen(true)}
                onOpenWallet={() => setIsWalletModalOpen(true)}
                onPublishToCommunity={() => {
                  setActiveView('showcase');
                }}
              />
            ) : (
              <StudioShell
                onBackToSlideOne={onBackToSlideOne}
                onBackToSlideTwo={onBackToSlideTwo}
                onBackToSlideThree={onBackToSlideThree}
                onOpenMenu={onOpenMenu}
                onGoToRooms={() => setActiveView('rooms')}
                currentUser={currentUser}
              />
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: COMMUNITY SHOWCASE */}
      {activeView === 'showcase' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-hidden relative">
          <SeedanceCommunityShowcase
            onRemixVideo={(prompt, resolution) => {
              setActiveView('studio');
              setStudioSubMode('generator');
            }}
            onOpenStudio={() => {
              setActiveView('studio');
              setStudioSubMode('generator');
            }}
          />
        </div>
      )}

      {/* VIEW: VXA FINANCIAL SECURITY & DIGITAL WALLET CORE */}
      {activeView === 'wallet' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-hidden relative bg-[#050507]">
          <VxaWalletDashboard
            userId={currentUserId}
            userEmail={currentUserEmail}
            onClose={() => {
              refreshWallet();
              setActiveView('studio');
            }}
          />
        </div>
      )}

      {/* VIEW 3: COLLABORATIVE ROOMS */}
      {activeView === 'rooms' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-hidden relative">
          {activeRoom ? (
            <SharedWorksWorkspace
              room={activeRoom}
              currentUser={{
                id: currentUser?.id || 'guest-user',
                username: currentUser?.username || 'director',
                displayName: currentUser?.displayName || 'VAIURE Creator',
                photoURL: currentUser?.photoURL,
              }}
              onLeaveRoom={() => setActiveRoom(null)}
              onRoomUpdated={(updated) => {
                setActiveRoom(updated);
                setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
              }}
              onRoomDeleted={(deletedId) => {
                setActiveRoom(null);
                setRooms((prev) => prev.filter((r) => r.id !== deletedId));
              }}
            />
          ) : (
            <div className="w-full h-full overflow-y-auto no-scrollbar scroll-smooth">
              <CollaborativeHero
                onEnterTopRoom={handleEnterTopRoom}
                onExploreLabs={handleScrollToDiscovery}
                onCreateRoom={() => setIsCreateModalOpen(true)}
              />
              <RoomList
                rooms={rooms}
                currentUserId={currentUserId}
                onSelectRoom={(room) => setActiveRoom(room)}
                onCreateRoom={() => setIsCreateModalOpen(true)}
                onManageRoom={(room) => setManagingRoom(room)}
                onDeleteRoom={(deletedId) => {
                  setRooms((prev) => prev.filter((r) => r.id !== deletedId));
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: ARCHIVE HISTORY STREAM */}
      {activeView === 'history' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-y-auto min-h-0">
          <LabsHistoryStream
            items={historyItems}
            activeItem={activeItem}
            onSelectItem={(item) => {
              setActiveItem(item);
              setActiveView('studio');
            }}
            onClearHistory={() => setHistoryItems([])}
            onPublishToFeed={onOpenCreatePost}
          />
        </div>
      )}

      {/* VIEW 5: ADMIN FINANCIAL & API STOCK CONSOLE */}
      {activeView === 'admin' && (
        <div className="flex-1 w-full h-[calc(100%-48px)] overflow-hidden relative">
          <SeedanceAdminDashboard currentAdminEmail={currentUserEmail} />
        </div>
      )}

      {/* Modals for Wallet, Membership, and Top-Up */}
      <SeedanceWalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          refreshWallet();
        }}
        userId={currentUserId}
        onOpenTopUp={() => setIsTopUpModalOpen(true)}
        onOpenMembership={() => setIsMembershipModalOpen(true)}
      />

      <SeedanceMembershipModal
        isOpen={isMembershipModalOpen}
        onClose={() => {
          setIsMembershipModalOpen(false);
          refreshWallet();
        }}
        userId={currentUserId}
        onSubscriptionUpdated={() => {
          refreshWallet();
        }}
      />

      <SeedanceTopUpModal
        isOpen={isTopUpModalOpen}
        onClose={() => {
          setIsTopUpModalOpen(false);
          refreshWallet();
        }}
        userId={currentUserId}
        onCreditsPurchased={(newBal) => {
          setWalletBalance(newBal);
        }}
      />

      {/* Modals for Room Creation and Management */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        currentUser={{
          id: currentUser?.id || 'guest-user',
          username: currentUser?.username || 'director',
          displayName: currentUser?.displayName || 'VAIURE Director',
          photoURL: currentUser?.photoURL,
        }}
        onClose={() => setIsCreateModalOpen(false)}
        onRoomCreated={(newRoom) => {
          setRooms((prev) => [newRoom, ...prev]);
          setActiveRoom(newRoom);
        }}
      />

      {managingRoom && (
        <ManageRoomModal
          isOpen={Boolean(managingRoom)}
          room={managingRoom}
          currentUserId={currentUserId}
          onClose={() => setManagingRoom(null)}
          onRoomUpdated={(updated) => {
            setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setManagingRoom(null);
          }}
          onRoomDeleted={(deletedId) => {
            setRooms((prev) => prev.filter((r) => r.id !== deletedId));
            setManagingRoom(null);
          }}
        />
      )}
    </div>
  );
};
