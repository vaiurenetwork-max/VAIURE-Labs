import {
  CollaborativeRoom,
  CanvasItem,
  RoomParticipant,
  RoomActivity,
} from '../types/collaborativeRooms';

export const DEMO_ROOMS: CollaborativeRoom[] = [
  {
    id: 'room-neon-city',
    name: 'Neon City — Cinematic Experiments',
    description:
      'Exploring rain-slicked neo-noir brutalist architecture, 35mm optical flare reflections, and anamorphic lens distortion with BytePlus Seedance 2.5.',
    coverImage:
      'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=1200&q=85',
    ownerId: 'user-elena',
    ownerUsername: 'elena_v',
    ownerDisplayName: 'Elena Voss',
    ownerAvatar:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    visibility: 'PUBLIC',
    projectType: 'CINEMATIC',
    maxParticipants: 8,
    status: 'ACTIVE',
    activeCollaboratorsCount: 4,
    tags: ['Cyberpunk', 'Seedance 2.5', 'Anamorphic', '35mm'],
    inviteCode: 'NEON-8821',
    createdAt: '2026-10-14T08:00:00.000Z',
    updatedAt: '2026-10-17T14:32:00.000Z',
    lastActivityText: 'Alex generated a new video variation: High-speed monorail flyby',
  },
  {
    id: 'room-midnight-stories',
    name: 'Midnight Stories — AI Romance Film',
    description:
      'Subtle character micro-expressions, evening candlelight chiaroscuro, tactile cashmere textures, and whispered dialogue in a Parisian atelier.',
    coverImage:
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=85',
    ownerId: 'user-marcus',
    ownerUsername: 'marcus_chen',
    ownerDisplayName: 'Marcus Chen',
    ownerAvatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    visibility: 'PUBLIC',
    projectType: 'NARRATIVE',
    maxParticipants: 6,
    status: 'ACTIVE',
    activeCollaboratorsCount: 3,
    tags: ['Romance', 'Chiaroscuro', 'Atelier', '24fps'],
    inviteCode: 'MDNT-4920',
    createdAt: '2026-10-12T11:20:00.000Z',
    updatedAt: '2026-10-17T15:10:00.000Z',
    lastActivityText: 'Mia updated opening prompt tone & color grade notes',
  },
  {
    id: 'room-future-worlds',
    name: 'Future Worlds — Environment Design',
    description:
      'Colossal subterranean geothermal vaults, floating aerogel biosphere domes, and alien atmospheric haze rendered in ultra-sharp 1080p.',
    coverImage:
      'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=85',
    ownerId: 'user-tariq',
    ownerUsername: 'tariq_al',
    ownerDisplayName: 'Tariq Al-Mansoor',
    ownerAvatar:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    visibility: 'PUBLIC',
    projectType: 'EXPERIMENTAL',
    maxParticipants: 12,
    status: 'ACTIVE',
    activeCollaboratorsCount: 5,
    tags: ['Sci-Fi', 'Environment', 'Aerogel', 'Worldbuilding'],
    inviteCode: 'FUTR-1094',
    createdAt: '2026-10-10T16:45:00.000Z',
    updatedAt: '2026-10-17T16:05:00.000Z',
    lastActivityText: 'Jordan pinned 4 high-res geological reference plates',
  },
  {
    id: 'room-motion-lab',
    name: 'Motion Lab — Experimental Video',
    description:
      'Rapid kinetic camera movements, continuous spatial rotation, fluid typography dissolves, and abstract textile physics simulations.',
    coverImage:
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=85',
    ownerId: 'user-sophia',
    ownerUsername: 'sophia_k',
    ownerDisplayName: 'Sophia Kane',
    ownerAvatar:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    visibility: 'PUBLIC',
    projectType: 'FASHION',
    maxParticipants: 8,
    status: 'ACTIVE',
    activeCollaboratorsCount: 2,
    tags: ['Motion', 'Haute Couture', 'Fluid Dynamics', 'Abstract'],
    inviteCode: 'MOTN-7731',
    createdAt: '2026-10-15T09:15:00.000Z',
    updatedAt: '2026-10-17T13:40:00.000Z',
    lastActivityText: 'Sophia added cloth simulation reference video preview',
  },
];

export const DEMO_PARTICIPANTS: Record<string, RoomParticipant[]> = {
  'room-neon-city': [
    {
      id: 'part-elena',
      userId: 'user-elena',
      username: 'elena_v',
      displayName: 'Elena Voss',
      photoURL:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'OWNER',
      status: 'ONLINE',
      color: '#38BDF8', // Cyan
      joinedAt: '2026-10-14T08:00:00.000Z',
      lastActiveAt: 'Just now',
    },
    {
      id: 'part-alex',
      userId: 'user-alex',
      username: 'alex_r',
      displayName: 'Alex Rivera',
      photoURL:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      role: 'ADMIN',
      status: 'ONLINE',
      color: '#F43F5E', // Rose
      joinedAt: '2026-10-14T09:12:00.000Z',
      lastActiveAt: '1m ago',
    },
    {
      id: 'part-mia',
      userId: 'user-mia',
      username: 'mia_z',
      displayName: 'Mia Zhang',
      photoURL:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      role: 'EDITOR',
      status: 'ONLINE',
      color: '#A855F7', // Purple
      joinedAt: '2026-10-14T10:30:00.000Z',
      lastActiveAt: '3m ago',
    },
    {
      id: 'part-jordan',
      userId: 'user-jordan',
      username: 'jordan_k',
      displayName: 'Jordan Kim',
      photoURL:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      role: 'VIEWER',
      status: 'IDLE',
      color: '#10B981', // Emerald
      joinedAt: '2026-10-15T14:00:00.000Z',
      lastActiveAt: '12m ago',
    },
  ],
};

export const DEMO_CANVAS_ITEMS: Record<string, CanvasItem[]> = {
  'room-neon-city': [
    {
      id: 'card-1',
      roomId: 'room-neon-city',
      type: 'PROMPT_CARD',
      title: 'Scene 01 / Monorail Approach',
      content:
        'A sleek obsidian magnetic monorail cuts through torrential neon rain over Neo-Shinjuku. Volumetric headlights slice steam rising from deep architectural trenches. Anamorphic lens flare in cobalt blue, 35mm grain, photorealistic reflections on titanium hull.',
      x: 120,
      y: 100,
      width: 340,
      height: 220,
      color: '#38BDF8',
      tags: ['Seedance 2.5', '16:9', '24fps'],
      aspectRatio: '16:9',
      durationSeconds: 8,
      resolution: '1080p',
      modelId: 'seedance-2.5-ref-video',
      authorId: 'user-elena',
      authorName: 'Elena Voss',
      authorAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-10-17T12:00:00.000Z',
      updatedAt: '2026-10-17T14:10:00.000Z',
      connectedToIds: ['card-2', 'card-4'],
    },
    {
      id: 'card-2',
      roomId: 'room-neon-city',
      type: 'REFERENCE_IMAGE',
      title: 'Ref / Wet Asphalt Specular Reflections',
      content: 'Chiaroscuro lighting reference for puddle reflections and wet obsidian concrete.',
      mediaUrl:
        'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=800&q=80',
      x: 520,
      y: 90,
      width: 280,
      height: 240,
      color: '#F43F5E',
      weight: 0.85,
      tags: ['Texture', 'Lighting'],
      authorId: 'user-alex',
      authorName: 'Alex Rivera',
      createdAt: '2026-10-17T12:30:00.000Z',
      updatedAt: '2026-10-17T12:30:00.000Z',
    },
    {
      id: 'card-3',
      roomId: 'room-neon-city',
      type: 'NOTE',
      title: 'Director Note: Sound & Atmosphere',
      content:
        'The soundscape must contrast heavy low-frequency subterranean hum with crisp water droplet clicks. Seedance 2.5 audio generation parameter set to ambient spatial rumble.',
      x: 120,
      y: 360,
      width: 320,
      height: 170,
      color: '#A855F7',
      tags: ['Audio Directives', 'Mix Notes'],
      authorId: 'user-mia',
      authorName: 'Mia Zhang',
      createdAt: '2026-10-17T13:00:00.000Z',
      updatedAt: '2026-10-17T13:45:00.000Z',
    },
    {
      id: 'card-4',
      roomId: 'room-neon-city',
      type: 'VIDEO_PREVIEW',
      title: 'Generated Take 03 / Monorail Speed Run',
      content: 'Seedance 2.5 1080p 24fps render with verified prompt and reference matrix.',
      mediaUrl:
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80',
      x: 520,
      y: 370,
      width: 320,
      height: 250,
      color: '#10B981',
      aspectRatio: '16:9',
      durationSeconds: 8,
      resolution: '1080p',
      tags: ['Rendered', 'Approved'],
      authorId: 'user-elena',
      authorName: 'Elena Voss',
      createdAt: '2026-10-17T14:20:00.000Z',
      updatedAt: '2026-10-17T14:32:00.000Z',
    },
    {
      id: 'card-5',
      roomId: 'room-neon-city',
      type: 'STORYBOARD',
      title: 'Scene 02 / Glass Walkway Crossing',
      content:
        'Character in structured black wool trench coat walks across transparent skybridge. Rain hammering from above, city lights glowing below like bioluminescent reef.',
      x: 880,
      y: 120,
      width: 330,
      height: 230,
      color: '#38BDF8',
      sceneOrder: 2,
      tags: ['Sequence 02', 'Storyboard'],
      authorId: 'user-jordan',
      authorName: 'Jordan Kim',
      createdAt: '2026-10-17T13:10:00.000Z',
      updatedAt: '2026-10-17T14:00:00.000Z',
      connectedToIds: ['card-4'],
    },
  ],
};

export const DEMO_ACTIVITIES: Record<string, RoomActivity[]> = {
  'room-neon-city': [
    {
      id: 'act-1',
      roomId: 'room-neon-city',
      actorId: 'user-elena',
      actorName: 'Elena Voss',
      actorAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      action: 'generated a new video take',
      targetTitle: 'Generated Take 03 / Monorail Speed Run',
      timestamp: '5m ago',
    },
    {
      id: 'act-2',
      roomId: 'room-neon-city',
      actorId: 'user-mia',
      actorName: 'Mia Zhang',
      actorAvatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
      action: 'added audio and director note',
      targetTitle: 'Director Note: Sound & Atmosphere',
      timestamp: '18m ago',
    },
    {
      id: 'act-3',
      roomId: 'room-neon-city',
      actorId: 'user-alex',
      actorName: 'Alex Rivera',
      actorAvatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
      action: 'uploaded reference texture',
      targetTitle: 'Wet Asphalt Specular Reflections',
      timestamp: '32m ago',
    },
    {
      id: 'act-4',
      roomId: 'room-neon-city',
      actorId: 'user-jordan',
      actorName: 'Jordan Kim',
      actorAvatar:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      action: 'created storyboard frame',
      targetTitle: 'Scene 02 / Glass Walkway Crossing',
      timestamp: '1h ago',
    },
  ],
};
