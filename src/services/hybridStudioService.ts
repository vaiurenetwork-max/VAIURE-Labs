/**
 * VAIURE — HYBRID STUDIO Service
 * Handles Firestore persistence (`hybridStudioProjects` strictly owner-scoped),
 * local offline cache fallback, project snapshots/duplication, media uploads,
 * structured prompt compilation, and Seedance AI scene breakdown calls.
 */

import {
  collection,
  db,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  handleFirestoreError,
  limit,
  OperationType,
  query,
  setDoc,
  storage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
  where,
} from '../lib/firebase';
import {
  HybridAspectRatio,
  HybridAsset,
  HybridAssetCategory,
  HybridCameraMovement,
  HybridCharacterProfile,
  HybridEnvironmentProfile,
  HybridFrameRate,
  HybridProductionProject,
  HybridProjectVersion,
  HybridScene,
  HybridShot,
  HybridShotSize,
  HybridTimelineTrack,
  HybridVideoTransformDraft,
} from '../types/hybridStudio';
import { GenerationResolution } from '../types/multiProvider';
import { seedanceLabService } from './seedanceLabService';

export const DEFAULT_ASSET_FOLDERS: string[] = [
  'Raw Footage',
  'Transformations',
  'Characters & Wardrobe',
  'Sets & Plates',
  'Audio & Score',
];

const COLLECTION = 'hybridStudioProjects';
const LOCAL_STORAGE_KEY = 'vaiure_hybrid_studio_projects_v1';

export const SHOT_SIZE_OPTIONS: HybridShotSize[] = [
  'Extreme Wide',
  'Wide',
  'Medium',
  'Close-Up',
  'Extreme Close-Up',
  'Over-the-Shoulder',
  'POV',
];

export const CAMERA_MOVEMENT_OPTIONS: HybridCameraMovement[] = [
  'Static',
  'Pan & Tilt',
  'Dolly',
  'Tracking',
  'Crane',
  'Handheld',
  'Steadicam',
  'Orbit',
];

export const DEFAULT_TIMELINE_TRACKS: HybridTimelineTrack[] = [
  { id: 'track-v1', name: 'V1 Main Sequence', type: 'VIDEO', isMuted: false, isLocked: false, volume: 1 },
  { id: 'track-v2', name: 'V2 Cutaways / B-Roll', type: 'VIDEO', isMuted: false, isLocked: false, volume: 1 },
  { id: 'track-r1', name: 'R1 Reference Plate', type: 'REFERENCE', isMuted: false, isLocked: false, volume: 1 },
  { id: 'track-a1', name: 'A1 Audio / Score', type: 'AUDIO', isMuted: false, isLocked: false, volume: 0.9 },
];

export function createBlankShot(
  sceneId: string,
  shotNumber: number,
  overrides: Partial<HybridShot> = {}
): HybridShot {
  return {
    id: `shot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sceneId,
    shotNumber,
    title: `Shot ${String(shotNumber).padStart(2, '0')}`,
    description: '',
    mainPrompt: '',
    actionDescription: '',
    subjectMovement: '',
    cameraMovement: 'Dolly',
    shotSize: 'Wide',
    visualStyle: 'Anamorphic 35mm cinema film, natural film grain',
    lightingDirection: 'Motivational key light with atmospheric depth',
    motionDirection: 'Controlled 24fps physical momentum',
    characterIds: [],
    extraReferenceAssetIds: [],
    generationMode: 'text-to-video',
    providerId: 'bytedance',
    modelId: 'seedance_25_15s',
    aspectRatio: '16:9',
    resolution: '720p',
    duration: 5,
    quantity: 1,
    cameraFixed: false,
    physicsPriority: true,
    generateAudio: true,
    highBitrate: false,
    draft: false,
    contentRating: 'standard',
    status: 'PLANNING',
    progress: 0,
    versions: [],
    ...overrides,
  };
}

export function createBlankScene(
  sceneNumber: number,
  aspectRatio: HybridAspectRatio = '16:9',
  resolution: GenerationResolution = '720p',
  overrides: Partial<HybridScene> = {}
): HybridScene {
  const sceneId = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const initialShot = createBlankShot(sceneId, 1, {
    title: `Shot 01 — Establishing Frame`,
    aspectRatio,
    resolution,
    cameraMovement: 'Dolly',
    shotSize: 'Wide',
  });
  return {
    id: sceneId,
    sceneNumber,
    name: `Scene ${String(sceneNumber).padStart(2, '0')}`,
    description: '',
    cameraDirection: 'Dolly',
    motionDirection: 'Smooth forward camera momentum',
    generationPrompt: '',
    duration: 5,
    status: 'PLANNING',
    shots: [initialShot],
    ...overrides,
  };
}

export function createNewHybridProject(
  ownerId: string,
  opts?: {
    name?: string;
    description?: string;
    resolution?: GenerationResolution;
    frameRate?: HybridFrameRate;
    aspectRatio?: HybridAspectRatio;
  }
): HybridProductionProject {
  const now = new Date().toISOString();
  const resolution = opts?.resolution || '1080p';
  const frameRate = opts?.frameRate || '24fps';
  const aspectRatio = opts?.aspectRatio || '16:9';
  const firstScene = createBlankScene(1, aspectRatio, '720p', {
    name: 'Scene 01 — Opening Sequence',
    description: 'Establishing mood, subject framing, and directional light.',
  });

  return {
    id: `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: ownerId || 'guest',
    name: opts?.name?.trim() || 'Untitled Hybrid Film',
    description:
      opts?.description?.trim() ||
      'Multi-scene Seedance 2.5 cinematic production workspace.',
    resolution,
    frameRate,
    aspectRatio,
    scenes: [firstScene],
    characters: [],
    environments: [],
    assets: [],
    assetFolders: [...DEFAULT_ASSET_FOLDERS],
    videoTransforms: [],
    timelineTracks: DEFAULT_TIMELINE_TRACKS.map((t) => ({ ...t })),
    timelineClips: [],
    generations: [],
    versions: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function compileShotGenerationPrompt(params: {
  shot: HybridShot;
  scene?: HybridScene;
  characters: HybridCharacterProfile[];
  environments: HybridEnvironmentProfile[];
}): string {
  const { shot, scene, characters, environments } = params;
  const linkedChars = characters.filter(
    (c) => shot.characterIds.includes(c.id) || (scene?.characterId && scene.characterId === c.id)
  );
  const linkedEnv = environments.find(
    (e) => e.id === (shot.environmentId || scene?.environmentId)
  );

  const parts: string[] = [];

  // Core framing & lens language
  parts.push(`${shot.shotSize} shot, ${shot.cameraMovement} camera movement.`);

  if (shot.mainPrompt.trim()) {
    parts.push(shot.mainPrompt.trim());
  } else if (scene?.generationPrompt.trim()) {
    parts.push(scene.generationPrompt.trim());
  } else if (shot.description.trim()) {
    parts.push(shot.description.trim());
  }

  if (scene?.description.trim() && !shot.mainPrompt.includes(scene.description.trim())) {
    parts.push(`Scene context: ${scene.description.trim()}.`);
  }

  if (linkedChars.length > 0) {
    const charBlock = linkedChars
      .map(
        (c) =>
          `${c.name}${c.appearancePrompt ? ` (${c.appearancePrompt})` : ''}${
            c.wardrobeNotes ? `, wearing ${c.wardrobeNotes}` : ''
          }`
      )
      .join('; ');
    parts.push(`Characters: ${charBlock}.`);
  }

  if (linkedEnv) {
    parts.push(
      `Location: ${linkedEnv.name}${linkedEnv.timeOfDay ? ` (${linkedEnv.timeOfDay})` : ''}${
        linkedEnv.atmospherePrompt ? `, ${linkedEnv.atmospherePrompt}` : ''
      }${linkedEnv.lightingNotes ? `, lighting: ${linkedEnv.lightingNotes}` : ''}.`
    );
  }

  if (shot.actionDescription.trim()) {
    parts.push(`Action: ${shot.actionDescription.trim()}.`);
  }
  if (shot.subjectMovement.trim()) {
    parts.push(`Subject movement: ${shot.subjectMovement.trim()}.`);
  }
  if (shot.motionDirection.trim()) {
    parts.push(`Motion dynamics: ${shot.motionDirection.trim()}.`);
  } else if (scene?.motionDirection.trim()) {
    parts.push(`Motion dynamics: ${scene.motionDirection.trim()}.`);
  }
  if (shot.lightingDirection.trim()) {
    parts.push(`Lighting: ${shot.lightingDirection.trim()}.`);
  }
  if (shot.visualStyle.trim()) {
    parts.push(`Visual aesthetic: ${shot.visualStyle.trim()}.`);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function compileVideoTransformPrompt(params: {
  draft: HybridVideoTransformDraft;
  hasReferenceVideo: boolean;
  plateLabels?: Array<{ handle: string; role: string; name: string }>;
}): string {
  const { draft, hasReferenceVideo, plateLabels = [] } = params;
  const parts: string[] = [];

  if (hasReferenceVideo) {
    parts.push('Reference @Video1 as the foundational footage.');
  }

  if (!draft.useFullVideo && draft.segmentEnd > draft.segmentStart) {
    parts.push(
      `Focus transformation direction on timecode window ${draft.segmentStart.toFixed(1)}s–${draft.segmentEnd.toFixed(1)}s.`
    );
  }

  if (plateLabels.length > 0) {
    const refsDesc = plateLabels
      .map((p) => `${p.handle} (${p.role}: ${p.name})`)
      .join(', ');
    parts.push(`Reference plates: ${refsDesc}.`);
  }

  if (draft.mainPrompt.trim()) {
    parts.push(draft.mainPrompt.trim());
  }

  if (draft.elementsToChange.trim()) {
    parts.push(`Transform / Change: ${draft.elementsToChange.trim()}.`);
  }

  if (draft.environmentPrompt.trim()) {
    parts.push(`Environment & Background: ${draft.environmentPrompt.trim()}.`);
  }

  if (
    draft.subjectTargetDescription.trim() ||
    draft.characterAppearancePrompt.trim() ||
    draft.characterClothingPrompt.trim() ||
    draft.characterStyleNotes.trim()
  ) {
    const charBits = [
      draft.subjectTargetDescription.trim() ? `Target subject: ${draft.subjectTargetDescription.trim()}` : '',
      draft.characterAppearancePrompt.trim() ? `Appearance: ${draft.characterAppearancePrompt.trim()}` : '',
      draft.characterClothingPrompt.trim() ? `Clothing: ${draft.characterClothingPrompt.trim()}` : '',
      draft.characterStyleNotes.trim() ? `Character style: ${draft.characterStyleNotes.trim()}` : '',
    ].filter(Boolean);
    parts.push(charBits.join('. ') + '.');
  }

  if (draft.elementsToAdd.trim() || draft.elementsAddPrompt.trim()) {
    const addBits = [draft.elementsToAdd.trim(), draft.elementsAddPrompt.trim()].filter(Boolean);
    parts.push(`Add visual elements: ${addBits.join('; ')}.`);
  }

  const atmoBits = [
    draft.atmosphereLighting.trim() ? `Lighting: ${draft.atmosphereLighting.trim()}` : '',
    draft.atmosphereWeather.trim() ? `Weather: ${draft.atmosphereWeather.trim()}` : '',
    draft.atmosphereTimeOfDay.trim() ? `Time of day: ${draft.atmosphereTimeOfDay.trim()}` : '',
    draft.atmosphereMood.trim() ? `Atmosphere: ${draft.atmosphereMood.trim()}` : '',
    draft.lightingDirection.trim() ? `Lighting direction: ${draft.lightingDirection.trim()}` : '',
  ].filter(Boolean);
  if (atmoBits.length > 0) {
    parts.push(atmoBits.join('. ') + '.');
  }

  if (draft.visualStyleDirection.trim()) {
    parts.push(`Cinematic visual style: ${draft.visualStyleDirection.trim()}.`);
  }

  if (draft.cameraDirection.trim() || draft.motionDirection.trim()) {
    parts.push(
      `Camera & motion direction: ${[draft.cameraDirection.trim(), draft.motionDirection.trim()]
        .filter(Boolean)
        .join(', ')}.`
    );
  }

  if (draft.elementsToPreserve.trim()) {
    parts.push(`Preserve from reference: ${draft.elementsToPreserve.trim()}.`);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function createProjectSnapshot(
  project: HybridProductionProject,
  label?: string
): HybridProjectVersion {
  const shotCount = project.scenes.reduce((acc, s) => acc + s.shots.length, 0);
  const now = new Date().toISOString();
  const nextVerNumber = project.versions.length + 1;
  return {
    id: `ver-${Date.now()}`,
    label: label?.trim() || `v${nextVerNumber}.0 — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    savedAt: now,
    summary: `${project.scenes.length} scenes · ${shotCount} shots · ${project.timelineClips.length} timeline clips`,
    sceneCount: project.scenes.length,
    shotCount,
    clipCount: project.timelineClips.length,
    snapshot: {
      name: project.name,
      description: project.description,
      resolution: project.resolution,
      frameRate: project.frameRate,
      aspectRatio: project.aspectRatio,
      scenes: JSON.parse(JSON.stringify(project.scenes)),
      characters: JSON.parse(JSON.stringify(project.characters)),
      environments: JSON.parse(JSON.stringify(project.environments)),
      timelineTracks: JSON.parse(JSON.stringify(project.timelineTracks)),
      timelineClips: JSON.parse(JSON.stringify(project.timelineClips)),
    },
  };
}

function readLocalCache(ownerId?: string): HybridProductionProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (!ownerId) return parsed;
    return parsed.filter((p) => p && (p.ownerId === ownerId || p.ownerId === 'guest'));
  } catch {
    return [];
  }
}

function writeLocalCache(project: HybridProductionProject): void {
  try {
    const all = readLocalCache();
    const filtered = all.filter((p) => p.id !== project.id);
    const updated = [project, ...filtered].slice(0, 18);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Strip large data URIs if storage quota is tight
    try {
      const compact = sanitizeForFirestore(project);
      const all = readLocalCache();
      const filtered = all.filter((p) => p.id !== project.id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([compact, ...filtered].slice(0, 10)));
    } catch {
      // ignore quota limits
    }
  }
}

function removeLocalCache(projectId: string): void {
  try {
    const all = readLocalCache().filter((p) => p.id !== projectId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

function stripDataUri(value: unknown): string {
  if (typeof value !== 'string') return '';
  if (value.startsWith('data:') && value.length > 2048) {
    return '';
  }
  return value;
}

/**
 * Ensures Firestore payload adheres cleanly to size/key rules and strips raw data URIs >2KB.
 */
function sanitizeForFirestore(project: HybridProductionProject): HybridProductionProject {
  const deepSanitize = (val: unknown): unknown => {
    if (typeof val === 'string') {
      return val.startsWith('data:') && val.length > 2048 ? '' : val;
    }
    if (Array.isArray(val)) {
      return val.map(deepSanitize);
    }
    if (val && typeof val === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (v !== undefined) {
          out[k] = deepSanitize(v);
        }
      }
      return out;
    }
    return val;
  };

  const sanitized = deepSanitize(project) as HybridProductionProject;
  sanitized.name = (sanitized.name || 'Untitled Hybrid Film').slice(0, 140);
  sanitized.description = (sanitized.description || '').slice(0, 2000);
  sanitized.scenes = (sanitized.scenes || []).slice(0, 60);
  sanitized.assets = (sanitized.assets || []).slice(0, 200).map((a) => ({
    ...a,
    url: stripDataUri(a.url),
    thumbnailUrl: a.thumbnailUrl ? stripDataUri(a.thumbnailUrl) : undefined,
  }));
  sanitized.assetFolders = (sanitized.assetFolders || DEFAULT_ASSET_FOLDERS).slice(0, 40);
  sanitized.videoTransforms = (sanitized.videoTransforms || []).slice(0, 100);
  sanitized.characters = (sanitized.characters || []).slice(0, 60);
  sanitized.environments = (sanitized.environments || []).slice(0, 60);
  sanitized.timelineTracks = (sanitized.timelineTracks || []).slice(0, 16);
  sanitized.timelineClips = (sanitized.timelineClips || []).slice(0, 200);
  sanitized.generations = (sanitized.generations || []).slice(0, 150);
  sanitized.versions = (sanitized.versions || []).slice(0, 20);
  return sanitized;
}

export async function listHybridProjects(ownerId: string): Promise<HybridProductionProject[]> {
  const local = readLocalCache(ownerId);
  if (!ownerId || ownerId === 'guest') {
    return local;
  }

  try {
    const q = query(
      collection(db, COLLECTION),
      where('ownerId', '==', ownerId),
      limit(30)
    );
    const snap = await getDocs(q);
    const remote: HybridProductionProject[] = [];
    snap.forEach((docSnap) => {
      remote.push({ ...(docSnap.data() as HybridProductionProject), id: docSnap.id });
    });

    const mergedMap = new Map<string, HybridProductionProject>();
    [...local, ...remote].forEach((proj) => {
      const prev = mergedMap.get(proj.id);
      if (!prev || new Date(proj.updatedAt).getTime() >= new Date(prev.updatedAt).getTime()) {
        mergedMap.set(proj.id, proj);
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (err: any) {
    if (String(err?.message || '').toLowerCase().includes('permission')) {
      try {
        handleFirestoreError(err, OperationType.LIST, COLLECTION);
      } catch {
        // Fall through gracefully so local projects remain accessible
      }
    }
    return local;
  }
}

export async function saveHybridProject(
  project: HybridProductionProject
): Promise<{ project: HybridProductionProject; persistedToCloud: boolean }> {
  const stamped: HybridProductionProject = {
    ...project,
    updatedAt: new Date().toISOString(),
  };

  writeLocalCache(stamped);

  if (!stamped.ownerId || stamped.ownerId === 'guest') {
    return { project: stamped, persistedToCloud: false };
  }

  const cleanDoc = sanitizeForFirestore(stamped);
  try {
    const ref = doc(db, COLLECTION, cleanDoc.id);
    await setDoc(ref, cleanDoc, { merge: true });
    return { project: stamped, persistedToCloud: true };
  } catch (err: any) {
    console.warn('Hybrid Studio Firestore save fallback:', err?.message || err);
    return { project: stamped, persistedToCloud: false };
  }
}

export async function loadHybridProject(
  projectId: string,
  ownerId: string
): Promise<HybridProductionProject | null> {
  const local = readLocalCache(ownerId).find((p) => p.id === projectId) || null;
  if (!ownerId || ownerId === 'guest') return local;

  try {
    const snap = await getDoc(doc(db, COLLECTION, projectId));
    if (snap.exists()) {
      return { ...(snap.data() as HybridProductionProject), id: snap.id };
    }
    return local;
  } catch {
    return local;
  }
}

export async function deleteHybridProject(projectId: string, ownerId: string): Promise<void> {
  removeLocalCache(projectId);
  if (!ownerId || ownerId === 'guest') return;
  try {
    await deleteDoc(doc(db, COLLECTION, projectId));
  } catch (err) {
    console.warn('Hybrid Studio Firestore delete warning:', err);
  }
}

export function duplicateHybridProject(
  source: HybridProductionProject,
  ownerId: string,
  newName?: string
): HybridProductionProject {
  const now = new Date().toISOString();
  const cloned: HybridProductionProject = JSON.parse(JSON.stringify(source));
  return {
    ...cloned,
    id: `hybrid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: ownerId || source.ownerId,
    name: newName?.trim() || `${source.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    versions: [],
  };
}

function computeCleanAspectRatio(width?: number, height?: number): string | undefined {
  if (!width || !height || width <= 0 || height <= 0) return undefined;
  const ratio = width / height;
  if (Math.abs(ratio - 21 / 9) < 0.14) return '21:9';
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 4 / 3) < 0.08) return '4:3';
  if (Math.abs(ratio - 1) < 0.06) return '1:1';
  if (Math.abs(ratio - 3 / 4) < 0.08) return '3:4';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const d = gcd(width, height);
  return `${Math.round(width / d)}:${Math.round(height / d)}`;
}

export async function extractVideoMetadataFromUrl(
  url: string,
  file?: File
): Promise<{
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fps?: number;
  fileSizeBytes?: number;
  mimeType?: string;
}> {
  return await new Promise((resolve) => {
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.muted = true;
    const timeout = setTimeout(() => {
      resolve({
        fileSizeBytes: file?.size,
        mimeType: file?.type || undefined,
      });
    }, 6000);
    el.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration =
        Number.isFinite(el.duration) && el.duration > 0
          ? Math.round(el.duration * 10) / 10
          : undefined;
      const width = el.videoWidth > 0 ? el.videoWidth : undefined;
      const height = el.videoHeight > 0 ? el.videoHeight : undefined;
      resolve({
        duration,
        width,
        height,
        aspectRatio: computeCleanAspectRatio(width, height),
        fps: 24,
        fileSizeBytes: file?.size,
        mimeType: file?.type || undefined,
      });
    };
    el.onerror = () => {
      clearTimeout(timeout);
      resolve({
        fileSizeBytes: file?.size,
        mimeType: file?.type || undefined,
      });
    };
    el.src = url;
  });
}

/**
 * Captures an exact frame at `timeSec` from an accessible HTML5 video URL and uploads it
 * via /api/ai/upload-media when signed in so Seedance 2.5 / MUAPI receive a public HTTPS URL.
 */
export async function captureVideoFrameAtTime(params: {
  videoUrl: string;
  timeSec: number;
  ownerId: string;
  fileName?: string;
}): Promise<{ dataUrl: string; hostedUrl: string }> {
  const { videoUrl, timeSec, ownerId, fileName } = params;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    let settled = false;
    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      reject(new Error(msg));
    };

    const timer = setTimeout(() => fail('Video frame capture timed out (CORS or stream unavailable).'), 10000);

    video.onloadedmetadata = () => {
      const clamped = Math.max(0.05, Math.min(Math.max(0.1, (video.duration || 1) - 0.05), timeSec));
      video.currentTime = clamped;
    };

    video.onseeked = () => {
      if (settled) return;
      try {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timer);
          fail('Canvas 2D context unavailable.');
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        const pngData = canvas.toDataURL('image/png');
        clearTimeout(timer);
        settled = true;
        resolve(pngData);
      } catch (err: any) {
        clearTimeout(timer);
        fail(err?.message || 'Unable to extract video frame (cross-origin protected video).');
      }
    };

    video.onerror = () => {
      clearTimeout(timer);
      fail('Failed to load video stream for keyframe extraction.');
    };

    video.src = videoUrl;
  });

  let hostedUrl = dataUrl;
  if (ownerId && ownerId !== 'guest') {
    try {
      hostedUrl = await seedanceLabService.uploadMedia(
        dataUrl,
        fileName || `segment_frame_${Math.round(timeSec * 10)}.png`
      );
    } catch {
      hostedUrl = dataUrl;
    }
  }

  return { dataUrl, hostedUrl };
}

/**
 * Uploads image, video, or audio asset cleanly to Firebase Storage or backend /api/ai/upload-media,
 * extracting video dimensions/duration/aspectRatio and falling back cleanly for guest sessions.
 */
export async function uploadHybridStudioAsset(params: {
  file: File;
  category: HybridAssetCategory;
  ownerId: string;
  folder?: string;
  sceneId?: string;
  shotId?: string;
}): Promise<HybridAsset> {
  const { file, category, ownerId, folder, sceneId, shotId } = params;
  const mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' = file.type.startsWith('video/')
    ? 'VIDEO'
    : file.type.startsWith('audio/')
    ? 'AUDIO'
    : 'IMAGE';

  let resolvedUrl = '';
  const readAsDataUrl = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });

  // 1. For images <= 12MB, prefer existing /api/ai/upload-media route
  if (mediaType === 'IMAGE' && file.size <= 12 * 1024 * 1024) {
    try {
      const dataUrl = await readAsDataUrl();
      if (ownerId && ownerId !== 'guest') {
        resolvedUrl = await seedanceLabService.uploadMedia(dataUrl, file.name);
      } else {
        resolvedUrl = dataUrl;
      }
    } catch {
      resolvedUrl = '';
    }
  }

  // 2. For videos/audio or large files, try Firebase Storage when authenticated
  if (!resolvedUrl && ownerId && ownerId !== 'guest') {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `hybrid-studio/${ownerId}/${Date.now()}_${safeName}`;
      const ref = storageRef(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(ref, file, {
          contentType: file.type || 'application/octet-stream',
        });
        task.on('state_changed', undefined, reject, () => resolve());
      });
      resolvedUrl = await getDownloadURL(ref);
    } catch {
      resolvedUrl = '';
    }
  }

  // 3. Fallback for video/audio <= 24MB to /api/ai/upload-media so backend API receives a hosted HTTPS URL
  if (!resolvedUrl && ownerId && ownerId !== 'guest' && file.size <= 24 * 1024 * 1024) {
    try {
      const dataUrl = await readAsDataUrl();
      resolvedUrl = await seedanceLabService.uploadMedia(dataUrl, file.name);
    } catch {
      resolvedUrl = '';
    }
  }

  // 4. Session object URL fallback if offline / unauthenticated
  if (!resolvedUrl) {
    resolvedUrl = URL.createObjectURL(file);
  }

  let duration: number | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let aspectRatio: string | undefined;
  let fps: number | undefined;

  if (mediaType === 'VIDEO') {
    const meta = await extractVideoMetadataFromUrl(resolvedUrl, file);
    duration = meta.duration;
    width = meta.width;
    height = meta.height;
    aspectRatio = meta.aspectRatio;
    fps = meta.fps;
  } else if (mediaType === 'AUDIO') {
    duration = await new Promise<number | undefined>((resolve) => {
      const el = document.createElement('audio');
      el.preload = 'metadata';
      el.onloadedmetadata = () => {
        const d =
          Number.isFinite(el.duration) && el.duration > 0
            ? Math.round(el.duration * 10) / 10
            : undefined;
        resolve(d);
      };
      el.onerror = () => resolve(undefined);
      el.src = resolvedUrl;
    });
  } else if (mediaType === 'IMAGE') {
    const imgDims = await new Promise<{ width?: number; height?: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = resolvedUrl;
    });
    width = imgDims.width;
    height = imgDims.height;
    aspectRatio = computeCleanAspectRatio(width, height);
  }

  return {
    id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: file.name,
    category,
    mediaType,
    url: resolvedUrl,
    thumbnailUrl: mediaType === 'IMAGE' ? resolvedUrl : undefined,
    duration,
    width,
    height,
    aspectRatio,
    fps,
    fileSizeBytes: file.size,
    mimeType: file.type || undefined,
    folder:
      folder ||
      (mediaType === 'VIDEO'
        ? 'Raw Footage'
        : mediaType === 'AUDIO'
        ? 'Audio & Score'
        : 'Sets & Plates'),
    tags: [category.toLowerCase(), mediaType.toLowerCase()],
    source: 'upload',
    sceneId,
    shotId,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Uses the real backend Director Breakdown / VAIU planner to turn a story pitch
 * into multi-scene structured HybridScenes ready for Seedance 2.5 direction.
 */
export async function generateScenesFromTreatment(params: {
  concept: string;
  aspectRatio: HybridAspectRatio;
  resolution: GenerationResolution;
  startingSceneNumber: number;
}): Promise<HybridScene[]> {
  const { concept, aspectRatio, resolution, startingSceneNumber } = params;
  try {
    const res = await seedanceLabService.runSceneDirector({
      directorName: 'VAIURE Hybrid Director',
      sceneConcept: concept,
      durationSeconds: 15,
    });
    const beats = (res.beatSheet || []).slice(0, 4);
    if (beats.length > 0) {
      return beats.map((beat, idx) => {
        const cleanBeat = beat.replace(/^\[[^\]]+\]\s*/, '').trim();
        const sceneNum = startingSceneNumber + idx;
        const scene = createBlankScene(sceneNum, aspectRatio, resolution === '4K' ? '1080p' : resolution, {
          name: `Scene ${String(sceneNum).padStart(2, '0')} — Beat ${idx + 1}`,
          description: cleanBeat,
          generationPrompt: cleanBeat,
        });
        scene.shots[0] = {
          ...scene.shots[0],
          title: `Shot 01 — ${cleanBeat.slice(0, 38)}${cleanBeat.length > 38 ? '...' : ''}`,
          description: cleanBeat,
          mainPrompt: cleanBeat,
          shotSize: idx === 0 ? 'Wide' : idx === beats.length - 1 ? 'Close-Up' : 'Medium',
          cameraMovement: idx % 2 === 0 ? 'Dolly' : 'Tracking',
        };
        return scene;
      });
    }
  } catch {
    // Deterministic scene split fallback if offline
  }

  const clauses = concept
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const effectiveClauses = clauses.length > 0 ? clauses : [concept.trim()];

  return effectiveClauses.map((text, idx) => {
    const sceneNum = startingSceneNumber + idx;
    const scene = createBlankScene(sceneNum, aspectRatio, resolution === '4K' ? '1080p' : resolution, {
      name: `Scene ${String(sceneNum).padStart(2, '0')}`,
      description: text,
      generationPrompt: text,
    });
    scene.shots[0] = {
      ...scene.shots[0],
      title: `Shot 01 — Opening Beat`,
      description: text,
      mainPrompt: text,
    };
    return scene;
  });
}
