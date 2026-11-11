/**
 * VAIURE Multiplayer & Real-Time Presence Service
 * Manages global creator presence, ambient spatial reactions,
 * collaborative 3D stage sharing (Slide 5), and prompt matrix exchange (Slide 6).
 */

import {
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  LiveCreatorPresence,
  AmbientReaction,
  Shared3DScene,
  SharedVxPrompt,
  MultiplayerActivityEvent,
  AtelierSlideId,
  AmbientPulseType,
} from '../types/multiplayer';
import { UserProfile } from '../types/social';

const PRESENCE_COLLECTION = 'livePresence';
const REACTIONS_COLLECTION = 'liveReactions';
const SHARED_SCENES_COLLECTION = 'sharedScenes';
const SHARED_PROMPTS_COLLECTION = 'sharedPrompts';

// Initial curated community creators active across the ateliers
export const SEED_ONLINE_CREATORS: LiveCreatorPresence[] = [
  {
    uid: 'artist-sora-01',
    username: 'sora_cinematic',
    displayName: 'Sora Tanaka',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    currentSlide: 5,
    currentSlideName: 'Fu Labs 3D',
    status: 'CREATING',
    lastHeartbeat: new Date().toISOString(),
    color: '#22d3ee', // Cyan
    role: 'Cinematic Director',
  },
  {
    uid: 'artist-elena-02',
    username: 'elena_vogue',
    displayName: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    currentSlide: 6,
    currentSlideName: 'VX Vision',
    status: 'CREATING',
    lastHeartbeat: new Date().toISOString(),
    color: '#f59e0b', // Amber
    role: 'Editorial Stylist',
  },
  {
    uid: 'artist-kael-03',
    username: 'kael_brutalist',
    displayName: 'Kael Vance',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    currentSlide: 4,
    currentSlideName: 'Studio Canvas',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    color: '#10b981', // Emerald
    role: 'Spatial Architect',
  },
  {
    uid: 'artist-amara-04',
    username: 'amara_sound',
    displayName: 'Amara Chen',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    currentSlide: 0,
    currentSlideName: 'Hero Motion',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    color: '#e879f9', // Fuchsia
    role: 'Sound Sculptor',
  },
  {
    uid: 'artist-marcus-05',
    username: 'marcus_noir',
    displayName: 'Marcus Sterling',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    currentSlide: 5,
    currentSlideName: 'Fu Labs 3D',
    status: 'CREATING',
    lastHeartbeat: new Date().toISOString(),
    color: '#38bdf8', // Sky
    role: 'Action Choreographer',
  },
  {
    uid: 'artist-yuki-06',
    username: 'yuki_optics',
    displayName: 'Yuki Morita',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    currentSlide: 6,
    currentSlideName: 'VX Vision',
    status: 'ONLINE',
    lastHeartbeat: new Date().toISOString(),
    color: '#a78bfa', // Purple
    role: 'Colorist & Optics',
  },
];

// Initial community 3D stages for Slide 5 Fu Labs Co-Op
export const INITIAL_COMMUNITY_3D_SCENES: Shared3DScene[] = [
  {
    id: 'scene-cyber-chase',
    title: 'High-Altitude Rooftop Helicopter Chase',
    authorId: 'artist-sora-01',
    authorName: 'Sora Tanaka',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    duration: 15,
    physicsMode: 'epic',
    summary: 'A speeding SUV truck and motorcycle weave through skyscraper pillars while a low-poly helicopter banks overhead with speed ramp physics.',
    seedancePrompt: '[SEEDANCE 2.5 3D GREYBOX CONDITIONED DIRECTIVE — 15S @ 24FPS | EPIC PHYSICS | 35MM CRANE]: Low-poly helicopter chase with dynamic rotor kinetics across modern skyscraper avenue.',
    environmentPreset: 'modern_skyscrapers',
    charactersCount: 2,
    propsCount: 4,
    sceneData: JSON.stringify({
      sceneTitle: 'High-Altitude Rooftop Helicopter Chase',
      duration: 15,
      physics: { mode: 'epic', timeScale: 1.35, gravityScale: 1.75, pathCurvature: 0.35, secondaryMotion: 1.4 },
      environment: { preset: 'modern_skyscrapers', streetWidth: 12, buildingScaleY: 1.6, sunAzimuthDeg: 45, sunElevationDeg: 55, weatherParticles: 'none' },
      characters: [
        { id: 'c-1', name: 'Lead Operative', action: 'running', startPos: [-2, 0, -12], endPos: [-2, 0, 10], heightMeters: 1.8, colorHex: '#e2e8f0', heldProp: 'briefcase', startTime: 0, endTime: 15 },
        { id: 'c-2', name: 'Pursuer', action: 'running', startPos: [2, 0, -14], endPos: [2, 0, 8], heightMeters: 1.85, colorHex: '#94a3b8', heldProp: 'none', startTime: 0, endTime: 15 }
      ],
      props: [
        { id: 'p-1', name: 'Rescue Helicopter', type: 'helicopter', startPos: [0, 8, -10], endPos: [0, 9, 12], dimensions: [3, 2.5, 7], rotationY: 0, colorHex: '#cbd5e1', startTime: 0, endTime: 15 },
        { id: 'p-2', name: 'Escape SUV', type: 'suv_truck', startPos: [-1.5, 0, -8], endPos: [-1.5, 0, 14], dimensions: [2.1, 1.8, 4.6], rotationY: 0, colorHex: '#64748b', startTime: 0, endTime: 15 }
      ],
      camera: { mode: 'crane', focalLengthMm: 35, startPos: [-7, 5, -8], endPos: [7, 7, 10], startTarget: [0, 1.5, -5], endTarget: [0, 1.5, 5] }
    }),
    likesCount: 38,
    remixCount: 14,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'scene-monolith-duel',
    title: 'Rainy Monolith Plaza Sword Duel',
    authorId: 'artist-marcus-05',
    authorName: 'Marcus Sterling',
    authorAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    duration: 10,
    physicsMode: 'complex',
    summary: 'Two martial artists holding sword blades in fighting stances circle around brutalist stone monoliths with 360-degree orbit camera.',
    seedancePrompt: '[SEEDANCE 2.5 3D GREYBOX CONDITIONED DIRECTIVE — 10S @ 24FPS | COMPLEX PHYSICS | 50MM ORBIT]: S-curve weaving martial duel around concrete monoliths.',
    environmentPreset: 'futuristic_architecture',
    charactersCount: 2,
    propsCount: 3,
    sceneData: JSON.stringify({
      sceneTitle: 'Rainy Monolith Plaza Sword Duel',
      duration: 10,
      physics: { mode: 'complex', timeScale: 1.3, gravityScale: 1.35, pathCurvature: 0.85, secondaryMotion: 1.65 },
      environment: { preset: 'futuristic_architecture', streetWidth: 10, buildingScaleY: 1.2, sunAzimuthDeg: 280, sunElevationDeg: 25, weatherParticles: 'rain' },
      characters: [
        { id: 'c-1', name: 'Duelist A', action: 'fighting_stance', startPos: [-2, 0, 0], endPos: [-1, 0, 1], heightMeters: 1.78, colorHex: '#f1f5f9', heldProp: 'sword_blade', startTime: 0, endTime: 10 },
        { id: 'c-2', name: 'Duelist B', action: 'fighting_stance', startPos: [2, 0, 0], endPos: [1, 0, -1], heightMeters: 1.82, colorHex: '#475569', heldProp: 'sword_blade', startTime: 0, endTime: 10 }
      ],
      props: [
        { id: 'p-1', name: 'Central Monolith', type: 'monolith', startPos: [0, 0, 0], endPos: [0, 0, 0], dimensions: [1.2, 5, 1.2], rotationY: 0, colorHex: '#334155', startTime: 0, endTime: 10 }
      ],
      camera: { mode: 'orbit', focalLengthMm: 50, startPos: [0, 2, 6], endPos: [0, 2, 6], startTarget: [0, 1.4, 0], endTarget: [0, 1.4, 0], orbitRadius: 6, orbitStartAngleDeg: 0, orbitEndAngleDeg: 360 }
    }),
    likesCount: 52,
    remixCount: 21,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'scene-subway-heist',
    title: 'Metro Transit Platform Stealth Walk',
    authorId: 'artist-kael-03',
    authorName: 'Kael Vance',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    duration: 10,
    physicsMode: 'slow',
    summary: 'A deliberate slow-motion stealth tracking shot down an underground platform as security guards survey the station.',
    seedancePrompt: '[SEEDANCE 2.5 3D GREYBOX CONDITIONED DIRECTIVE — 10S @ 24FPS | SLOW PHYSICS | 35MM DOLLY]: Gliding slow-motion platform infiltration.',
    environmentPreset: 'public_transit_stations',
    charactersCount: 3,
    propsCount: 4,
    sceneData: JSON.stringify({
      sceneTitle: 'Metro Transit Platform Stealth Walk',
      duration: 10,
      physics: { mode: 'slow', timeScale: 0.5, gravityScale: 0.7, pathCurvature: 0.1, secondaryMotion: 0.8 },
      environment: { preset: 'public_transit_stations', streetWidth: 8, buildingScaleY: 1, sunAzimuthDeg: 90, sunElevationDeg: 15, weatherParticles: 'none' },
      characters: [
        { id: 'c-1', name: 'Infiltrator', action: 'crouching_stealth', startPos: [-1, 0, -6], endPos: [-1, 0, 4], heightMeters: 1.76, colorHex: '#cbd5e1', heldProp: 'briefcase', startTime: 0, endTime: 10 },
        { id: 'c-2', name: 'Guard A', action: 'looking_around', startPos: [2, 0, -2], endPos: [2, 0, -2], heightMeters: 1.84, colorHex: '#64748b', heldProp: 'torch_light', startTime: 0, endTime: 10 }
      ],
      props: [
        { id: 'p-1', name: 'Platform Bench', type: 'bench', startPos: [1.5, 0, 2], endPos: [1.5, 0, 2], dimensions: [0.8, 0.7, 2], rotationY: 0, colorHex: '#475569', startTime: 0, endTime: 10 }
      ],
      camera: { mode: 'tracking', focalLengthMm: 35, startPos: [-4, 1.6, -5], endPos: [-3.5, 1.6, 5], startTarget: [-1, 1.2, -5], endTarget: [-1, 1.2, 5] }
    }),
    likesCount: 29,
    remixCount: 8,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

// Initial shared VX prompt matrix for Slide 6 Co-Op
export const INITIAL_SHARED_VX_PROMPTS: SharedVxPrompt[] = [
  {
    id: 'vx-prompt-vogue-editorial',
    prompt: 'Haute couture editorial portrait of an androgynous model wearing a sculptural structured obsidian wool trench coat with sharp exaggerated lapels. Striking geometric chiaroscuro lighting, razor-sharp edge contrast, dramatic single softbox angled at 45 degrees. Neutral tactile concrete gallery background, muted charcoal and warm alabaster tonal grading, shot on Hasselblad H6D-100c with 80mm f/2.8 lens, exquisite fabric micro-weave texture and natural matte skin pores',
    fullMidjourneyCommand: '/imagine prompt: Haute couture editorial portrait of an androgynous model wearing a sculptural structured obsidian wool trench coat with sharp exaggerated lapels. Striking geometric chiaroscuro lighting, razor-sharp edge contrast, dramatic single softbox angled at 45 degrees. Neutral tactile concrete gallery background, muted charcoal and warm alabaster tonal grading, shot on Hasselblad H6D-100c with 80mm f/2.8 lens, exquisite fabric micro-weave texture and natural matte skin pores --v 8.2 --style raw --ar 16:9 --s 250',
    authorId: 'artist-elena-02',
    authorName: 'Elena Rostova',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    modelId: 'gemini-4-argon',
    modelLabel: 'Gemini 4 Argon',
    mode: 'Mode A · Exact',
    confidenceScore: 98,
    aspectRatio: '16:9',
    stylize: 250,
    subjectTitle: 'Obsidian Wool Sculptural Cape',
    lightingStyle: 'Chiaroscuro 45° Key Softbox',
    cameraStyle: 'Hasselblad 80mm f/2.8 Medium Format',
    likesCount: 74,
    remixCount: 31,
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
  },
  {
    id: 'vx-prompt-brutalist-monolith',
    prompt: 'Cinematic architectural study of a massive cantilevered brutalist concrete pavilion emerging from black volcanic sand dunes under an overcast titanium sky. Low-angle 24mm wide-angle lens perspective, ultra-fine weathered concrete pores, formwork seam lines, and water stains. Diffused ambient skylight illumination, atmospheric coastal sea mist drifting through geometric voids, desaturated monochrome palette with subtle earthen ochre patina accents',
    fullMidjourneyCommand: '/imagine prompt: Cinematic architectural study of a massive cantilevered brutalist concrete pavilion emerging from black volcanic sand dunes under an overcast titanium sky. Low-angle 24mm wide-angle lens perspective, ultra-fine weathered concrete pores, formwork seam lines, and water stains. Diffused ambient skylight illumination, atmospheric coastal sea mist drifting through geometric voids, desaturated monochrome palette with subtle earthen ochre patina accents --v 8.2 --style raw --ar 21:9 --s 320',
    authorId: 'artist-kael-03',
    authorName: 'Kael Vance',
    authorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    modelId: 'gemini-3.8',
    modelLabel: 'Gemini 3.8',
    mode: 'Mode B · Photographic',
    confidenceScore: 95,
    aspectRatio: '21:9',
    stylize: 320,
    subjectTitle: 'Cantilevered Volcanic Pavilion',
    lightingStyle: 'Overcast Titanium Diffused Ambience',
    cameraStyle: '24mm Ultra-Wide Architectural Perspective',
    likesCount: 63,
    remixCount: 19,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'vx-prompt-fluid-glass',
    prompt: 'Experimental kinetic fashion portrait with dynamic rippling molten glass veil floating suspended around a motionless model in metallic liquid mercury garment. Dual light source: cool cyan tungsten rim light and soft warm amber front bounce. High-speed 1/2000s shutter capture freezing micro-droplet refractions, pristine transparency gradients, and caustic reflections on reflective ground floor',
    fullMidjourneyCommand: '/imagine prompt: Experimental kinetic fashion portrait with dynamic rippling molten glass veil floating suspended around a motionless model in metallic liquid mercury garment. Dual light source: cool cyan tungsten rim light and soft warm amber front bounce. High-speed 1/2000s shutter capture freezing micro-droplet refractions, pristine transparency gradients, and caustic reflections on reflective ground floor --v 8.2 --style raw --ar 1:1 --s 400',
    authorId: 'artist-yuki-06',
    authorName: 'Yuki Morita',
    authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    modelId: 'gemini-3.1',
    modelLabel: 'Gemini 3.1',
    mode: 'Mode C · Editorial',
    confidenceScore: 92,
    aspectRatio: '1:1',
    stylize: 400,
    subjectTitle: 'Molten Glass Veil & Mercury Textile',
    lightingStyle: 'Dual Cyan Rim & Amber Bounce',
    cameraStyle: '50mm High-Speed Refraction Macro',
    likesCount: 88,
    remixCount: 42,
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

// Memory / Local Storage Caches
const STORAGE_PRESENCE_KEY = 'vaiure_multiplayer_presence_v1';
const STORAGE_SCENES_KEY = 'vaiure_shared_3d_scenes_v1';
const STORAGE_PROMPTS_KEY = 'vaiure_shared_prompts_v1';

function getStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setStored<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const SLIDE_NAMES: Record<AtelierSlideId, string> = {
  0: 'Hero Motion',
  1: 'Threads Feed',
  2: 'Archive',
  3: 'Cinema',
  4: 'Studio Canvas',
  5: 'Fu Labs 3D',
  6: 'VX Vision',
};

// -----------------------------------------------------------------------------
// 1. PRESENCE TRACKING & LIVE CREATORS
// -----------------------------------------------------------------------------

/**
 * Update the current user's live presence heartbeat
 */
export async function updateCreatorPresence(
  user: UserProfile | null,
  activeSlide: AtelierSlideId,
  status: 'ONLINE' | 'CREATING' | 'IDLE' = 'ONLINE'
): Promise<void> {
  const uid = user?.id || 'guest-' + getStored('vaiure_guest_uid', Math.random().toString(36).substring(2, 9));
  if (!user?.id) {
    setStored('vaiure_guest_uid', uid.replace('guest-', ''));
  }

  const presenceData: LiveCreatorPresence = {
    uid,
    username: user?.username || 'GuestArtist',
    displayName: user?.displayName || 'Guest Artist',
    avatar:
      user?.avatar ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    currentSlide: activeSlide,
    currentSlideName: SLIDE_NAMES[activeSlide] || 'Atelier',
    status,
    lastHeartbeat: new Date().toISOString(),
    color: '#22d3ee',
    role: user?.role || 'Artist',
  };

  try {
    const presenceRef = doc(db, PRESENCE_COLLECTION, uid);
    await setDoc(presenceRef, presenceData, { merge: true });
  } catch (err) {
    // Graceful silent fallback
    console.debug('Presence heartbeat fallback to local session:', err);
  }
}

/**
 * Subscribe to all online creators across the platform
 */
export function subscribeToOnlineCreators(
  currentUserId: string,
  onUpdate: (creators: LiveCreatorPresence[]) => void
): () => void {
  const initialCache = getStored<LiveCreatorPresence[]>(STORAGE_PRESENCE_KEY, SEED_ONLINE_CREATORS);
  onUpdate(initialCache);

  try {
    const q = query(collection(db, PRESENCE_COLLECTION), limit(40));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: LiveCreatorPresence[] = [];
        const now = Date.now();

        snapshot.forEach((docSnap) => {
          const item = docSnap.data() as LiveCreatorPresence;
          // Filter out stale heartbeats older than 90 seconds
          const heartbeatAge = item.lastHeartbeat ? now - new Date(item.lastHeartbeat).getTime() : 0;
          if (heartbeatAge < 90000) {
            fetched.push({
              ...item,
              uid: docSnap.id,
              isCurrentUser: item.uid === currentUserId,
            });
          }
        });

        // Always merge with curated active artists so the platform never appears dormant
        const seenIds = new Set(fetched.map((f) => f.uid));
        const combined = [
          ...fetched,
          ...SEED_ONLINE_CREATORS.filter((s) => !seenIds.has(s.uid) && s.uid !== currentUserId),
        ];

        setStored(STORAGE_PRESENCE_KEY, combined);
        onUpdate(combined);
      },
      (error) => {
        console.warn('Presence snapshot warning, using cached creators:', error.message);
        handleFirestoreError(error, OperationType.GET, PRESENCE_COLLECTION);
        onUpdate(initialCache);
      }
    );

    return unsubscribe;
  } catch {
    onUpdate(initialCache);
    return () => {};
  }
}

// -----------------------------------------------------------------------------
// 2. AMBIENT SPATIAL REACTIONS & PULSES
// -----------------------------------------------------------------------------

export const AMBIENT_PULSE_CONFIG: Record<
  AmbientPulseType,
  { label: string; icon: string; color: string; desc: string }
> = {
  vision: { label: 'VISION', icon: '✦', color: '#22d3ee', desc: 'Visual clarity & composition' },
  architect: { label: 'ARCHITECT', icon: '▲', color: '#38bdf8', desc: '3D geometry & spatial blocking' },
  cinematic: { label: 'CINEMATIC', icon: '◈', color: '#f59e0b', desc: 'Film lighting & camera movement' },
  sculptural: { label: 'SCULPTURAL', icon: '■', color: '#e879f9', desc: 'Material texture & pure form' },
  harmony: { label: 'HARMONY', icon: '●', color: '#10b981', desc: 'Palette resonance & balance' },
  vaiure: { label: 'VAIURE', icon: '✦', color: '#ffffff', desc: 'Pure signature kinetic pulse' },
};

// Local event listeners for zero-latency instant feedback
type ReactionCallback = (reaction: AmbientReaction) => void;
const reactionSubscribers = new Set<ReactionCallback>();

/**
 * Broadcast an ambient visual reaction pulse
 */
export async function broadcastAmbientReaction(params: {
  actor: UserProfile | null;
  reaction: AmbientPulseType;
  slideIndex: AtelierSlideId;
  x?: number;
  y?: number;
}): Promise<void> {
  const meta = AMBIENT_PULSE_CONFIG[params.reaction];
  const newId = `reaction-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const reactionData: AmbientReaction = {
    id: newId,
    actorId: params.actor?.id || 'guest',
    actorName: params.actor?.displayName || params.actor?.username || 'Guest Artist',
    reaction: params.reaction,
    label: meta.label,
    color: meta.color,
    slideIndex: params.slideIndex,
    x: params.x ?? Math.random() * 80 + 10,
    y: params.y ?? Math.random() * 80 + 10,
    createdAt: new Date().toISOString(),
  };

  // Immediate local dispatch
  reactionSubscribers.forEach((cb) => cb(reactionData));

  try {
    const reactionRef = doc(db, REACTIONS_COLLECTION, newId);
    await setDoc(reactionRef, reactionData);
  } catch (err) {
    console.debug('Ambient pulse local broadcast active:', err);
  }
}

/**
 * Listen for ambient reactions on this slide or globally
 */
export function subscribeToAmbientReactions(
  targetSlide: AtelierSlideId | 'all',
  onReaction: ReactionCallback
): () => void {
  // Add local listener
  const localWrapper: ReactionCallback = (r) => {
    if (targetSlide === 'all' || r.slideIndex === targetSlide) {
      onReaction(r);
    }
  };
  reactionSubscribers.add(localWrapper);

  try {
    const q = query(collection(db, REACTIONS_COLLECTION), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as AmbientReaction;
            const age = Date.now() - new Date(data.createdAt).getTime();
            // Only trigger for reactions within the last 10 seconds
            if (age < 10000 && (targetSlide === 'all' || data.slideIndex === targetSlide)) {
              onReaction({ ...data, id: change.doc.id });
            }
          }
        });
      },
      (error) => {
        console.debug('Reactions stream warning:', error.message);
        handleFirestoreError(error, OperationType.GET, REACTIONS_COLLECTION);
      }
    );

    return () => {
      reactionSubscribers.delete(localWrapper);
      unsubscribe();
    };
  } catch {
    return () => {
      reactionSubscribers.delete(localWrapper);
    };
  }
}

// -----------------------------------------------------------------------------
// 3. SHARED 3D GREYBOX SCENES (SLIDE 5 FU LABS CO-OP)
// -----------------------------------------------------------------------------

/**
 * Broadcast current 3D Greybox Scene configuration to the community matrix
 */
export async function broadcast3DScene(scene: Omit<Shared3DScene, 'id' | 'likesCount' | 'remixCount' | 'createdAt'>): Promise<Shared3DScene> {
  const newId = `scene-coop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const completeScene: Shared3DScene = {
    ...scene,
    id: newId,
    likesCount: 1,
    remixCount: 0,
    createdAt: now,
  };

  // Optimistic local update
  const current = getStored<Shared3DScene[]>(STORAGE_SCENES_KEY, INITIAL_COMMUNITY_3D_SCENES);
  setStored(STORAGE_SCENES_KEY, [completeScene, ...current]);

  try {
    const sceneRef = doc(db, SHARED_SCENES_COLLECTION, newId);
    await setDoc(sceneRef, completeScene);
  } catch (err) {
    console.warn('3D scene saved to local atelier cache:', err);
  }

  return completeScene;
}

/**
 * Subscribe to shared 3D scenes
 */
export function subscribeToShared3DScenes(
  onUpdate: (scenes: Shared3DScene[]) => void
): () => void {
  const cached = getStored<Shared3DScene[]>(STORAGE_SCENES_KEY, INITIAL_COMMUNITY_3D_SCENES);
  onUpdate(cached);

  try {
    const q = query(collection(db, SHARED_SCENES_COLLECTION), orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: Shared3DScene[] = [];
          snapshot.forEach((snap) => {
            fetched.push({ ...(snap.data() as Shared3DScene), id: snap.id });
          });

          // Merge with curated initial scenes
          const seen = new Set(fetched.map((s) => s.id));
          const merged = [...fetched, ...INITIAL_COMMUNITY_3D_SCENES.filter((s) => !seen.has(s.id))];
          setStored(STORAGE_SCENES_KEY, merged);
          onUpdate(merged);
        } else {
          setStored(STORAGE_SCENES_KEY, INITIAL_COMMUNITY_3D_SCENES);
          onUpdate(INITIAL_COMMUNITY_3D_SCENES);
        }
      },
      (error) => {
        console.warn('Shared scenes snapshot fallback:', error.message);
        handleFirestoreError(error, OperationType.GET, SHARED_SCENES_COLLECTION);
        onUpdate(cached);
      }
    );

    return unsubscribe;
  } catch {
    onUpdate(cached);
    return () => {};
  }
}

/**
 * Like a shared 3D scene
 */
export async function likeShared3DScene(sceneId: string): Promise<void> {
  const current = getStored<Shared3DScene[]>(STORAGE_SCENES_KEY, INITIAL_COMMUNITY_3D_SCENES);
  const updated = current.map((s) => (s.id === sceneId ? { ...s, likesCount: (s.likesCount || 0) + 1 } : s));
  setStored(STORAGE_SCENES_KEY, updated);

  try {
    const sceneRef = doc(db, SHARED_SCENES_COLLECTION, sceneId);
    const target = current.find((s) => s.id === sceneId);
    if (target) {
      await updateDoc(sceneRef, { likesCount: (target.likesCount || 0) + 1 });
    }
  } catch {}
}

// -----------------------------------------------------------------------------
// 4. SHARED VX PROMPT MATRIX (SLIDE 6 RECONSTRUCTION CO-OP)
// -----------------------------------------------------------------------------

/**
 * Broadcast reconstructed prompt to the shared prompt matrix
 */
export async function broadcastVxPrompt(
  promptData: Omit<SharedVxPrompt, 'id' | 'likesCount' | 'remixCount' | 'createdAt'>
): Promise<SharedVxPrompt> {
  const newId = `vx-matrix-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const entry: SharedVxPrompt = {
    ...promptData,
    id: newId,
    likesCount: 1,
    remixCount: 0,
    createdAt: now,
  };

  const current = getStored<SharedVxPrompt[]>(STORAGE_PROMPTS_KEY, INITIAL_SHARED_VX_PROMPTS);
  setStored(STORAGE_PROMPTS_KEY, [entry, ...current]);

  try {
    const promptRef = doc(db, SHARED_PROMPTS_COLLECTION, newId);
    await setDoc(promptRef, entry);
  } catch (err) {
    console.warn('VX prompt matrix cached locally:', err);
  }

  return entry;
}

/**
 * Subscribe to shared prompt matrix
 */
export function subscribeToSharedVxPrompts(
  onUpdate: (prompts: SharedVxPrompt[]) => void
): () => void {
  const cached = getStored<SharedVxPrompt[]>(STORAGE_PROMPTS_KEY, INITIAL_SHARED_VX_PROMPTS);
  onUpdate(cached);

  try {
    const q = query(collection(db, SHARED_PROMPTS_COLLECTION), orderBy('createdAt', 'desc'), limit(30));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetched: SharedVxPrompt[] = [];
          snapshot.forEach((snap) => {
            fetched.push({ ...(snap.data() as SharedVxPrompt), id: snap.id });
          });

          const seen = new Set(fetched.map((p) => p.id));
          const merged = [...fetched, ...INITIAL_SHARED_VX_PROMPTS.filter((p) => !seen.has(p.id))];
          setStored(STORAGE_PROMPTS_KEY, merged);
          onUpdate(merged);
        } else {
          setStored(STORAGE_PROMPTS_KEY, INITIAL_SHARED_VX_PROMPTS);
          onUpdate(INITIAL_SHARED_VX_PROMPTS);
        }
      },
      (error) => {
        console.warn('Shared prompts snapshot fallback:', error.message);
        handleFirestoreError(error, OperationType.GET, SHARED_PROMPTS_COLLECTION);
        onUpdate(cached);
      }
    );

    return unsubscribe;
  } catch {
    onUpdate(cached);
    return () => {};
  }
}

/**
 * Like a shared prompt matrix entry
 */
export async function likeSharedVxPrompt(promptId: string): Promise<void> {
  const current = getStored<SharedVxPrompt[]>(STORAGE_PROMPTS_KEY, INITIAL_SHARED_VX_PROMPTS);
  const updated = current.map((p) => (p.id === promptId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p));
  setStored(STORAGE_PROMPTS_KEY, updated);

  try {
    const promptRef = doc(db, SHARED_PROMPTS_COLLECTION, promptId);
    const target = current.find((p) => p.id === promptId);
    if (target) {
      await updateDoc(promptRef, { likesCount: (target.likesCount || 0) + 1 });
    }
  } catch {}
}
