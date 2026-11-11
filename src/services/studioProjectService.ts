/**
 * VAIURE Studio — Project Persistence & State Synchronization Service
 * Manages project lifecycle, Firestore persistence, local offline fallback, and change broadcasting.
 */

import { StudioProject, StoryboardShot, StudioCharacter, StudioLocation, TimelineClip, WorkflowNode, WorkflowConnection, GenerationJob, StudioAsset } from '../types/studio';
import { INITIAL_STUDIO_PROJECTS } from '../data/studioProjectsData';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection } from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'vaiure_studio_projects_v2';
const ACTIVE_PROJECT_KEY = 'vaiure_studio_active_project_id';

export const getSavedProjects = (): StudioProject[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse local studio projects:', err);
  }
  return INITIAL_STUDIO_PROJECTS;
};

// Prevent storing large base64 data URLs (> 64KB) in localStorage on mobile devices
const stripOversizedDataUrls = (projects: StudioProject[]): StudioProject[] => {
  return projects.map((proj) => ({
    ...proj,
    assets: proj.assets.map((a) => ({
      ...a,
      url: a.url.startsWith('data:') && a.url.length > 65000 ? (a.thumbnailUrl && a.thumbnailUrl.length < 65000 ? a.thumbnailUrl : '') : a.url,
      thumbnailUrl:
        a.thumbnailUrl && a.thumbnailUrl.startsWith('data:') && a.thumbnailUrl.length > 65000
          ? ''
          : a.thumbnailUrl,
    })),
  }));
};

export const saveProjectsToStorage = (projects: StudioProject[]) => {
  try {
    const safeProjects = stripOversizedDataUrls(projects);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(safeProjects));
  } catch (err) {
    console.warn('Failed to save studio projects to localStorage:', err);
  }
};

export const getActiveProjectId = (): string => {
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || 'proj-obsidian-gallery';
};

export const setActiveProjectId = (id: string) => {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
};

/**
 * Registers an uploaded image (e.g. from Slide 1 Threads or Studio uploaders)
 * directly into the active Slide 4 Studio Project's Asset Library so it is immediately
 * available in Slide 4 as a project asset and reference frame.
 */
export const addUploadedAssetToActiveProject = (assetData: {
  id: string;
  title: string;
  url: string;
  thumbnailUrl?: string;
  resolution?: string;
  fileSizeBytes?: number;
}): StudioAsset | null => {
  try {
    const projects = getSavedProjects();
    const activeId = getActiveProjectId();
    const targetProject = projects.find((p) => p.id === activeId) || projects[0];
    if (!targetProject) return null;

    // Prevent duplicate registration of the same URL
    if (targetProject.assets.some((a) => a.url === assetData.url || a.id === assetData.id)) {
      return targetProject.assets.find((a) => a.url === assetData.url || a.id === assetData.id) || null;
    }

    const newAsset: StudioAsset = {
      id: assetData.id,
      projectId: targetProject.id,
      type: 'IMAGE',
      title: assetData.title || 'Uploaded Frame',
      url: assetData.url,
      thumbnailUrl: assetData.thumbnailUrl || assetData.url,
      resolution: assetData.resolution || '1080p',
      fileSizeBytes: assetData.fileSizeBytes,
      version: 1,
      createdAt: new Date().toISOString(),
    };

    const updatedProject: StudioProject = {
      ...targetProject,
      assets: [newAsset, ...targetProject.assets],
      updatedAt: new Date().toISOString(),
    };

    const updatedList = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
    saveProjectsToStorage(updatedList);
    saveProjectToFirestore(updatedProject);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('vaiure:studio-asset-added', {
          detail: { projectId: updatedProject.id, asset: newAsset },
        })
      );
    }

    return newAsset;
  } catch (err) {
    console.warn('Could not sync uploaded asset to Studio project:', err);
    return null;
  }
};

// Real-time Firestore sync with local fallback
export const subscribeToProject = (
  projectId: string,
  onUpdate: (project: StudioProject) => void
): (() => void) => {
  const localProjects = getSavedProjects();
  const current = localProjects.find((p) => p.id === projectId) || localProjects[0];
  if (current) {
    onUpdate(current);
  }

  if (!db) {
    return () => {};
  }

  try {
    const docRef = doc(db, 'studioProjects', projectId);
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as StudioProject;
          onUpdate(remoteData);
          // update local cache
          const updatedList = getSavedProjects().map((p) => (p.id === remoteData.id ? remoteData : p));
          saveProjectsToStorage(updatedList);
        }
      },
      (error) => {
        console.warn('Firestore studioProject sync error (using local state):', error.message);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
};

export const saveProjectToFirestore = async (project: StudioProject): Promise<boolean> => {
  // Update local storage immediately
  const existing = getSavedProjects();
  const index = existing.findIndex((p) => p.id === project.id);
  const updatedList = index >= 0 ? existing.map((p) => (p.id === project.id ? project : p)) : [project, ...existing];
  saveProjectsToStorage(updatedList);

  if (!db) return true;

  try {
    const docRef = doc(db, 'studioProjects', project.id);
    await setDoc(docRef, {
      ...project,
      lastSavedAt: new Date().toISOString(),
      saveStatus: 'Saved',
    });
    return true;
  } catch (error) {
    console.warn('Firestore save failed, fallback to local:', error);
    return false;
  }
};

export const createNewProject = (
  name: string,
  genre: StudioProject['genre'] = 'Short Film',
  aspectRatio: StudioProject['aspectRatio'] = '16:9'
): StudioProject => {
  const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newProject: StudioProject = {
    id,
    name,
    description: `New ${genre} project in VAIURE Studio.`,
    genre,
    aspectRatio,
    resolution: '1080p',
    frameRate: '24fps',
    saveStatus: 'Saved',
    lastSavedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    scenes: [
      {
        id: `scene-${Date.now()}-1`,
        sceneNumber: 1,
        title: 'Opening Scene',
        description: 'Initial sequence atmosphere and character entrance.',
        mood: 'Cinematic',
        shotIds: [],
      },
    ],
    shots: [],
    characters: [],
    locations: [],
    timelineTracks: [
      { id: 'v1', name: 'V1 Video', type: 'VIDEO', order: 1, isMuted: false, isLocked: false, volume: 1 },
      { id: 'a1', name: 'A1 Audio', type: 'AUDIO', order: 2, isMuted: false, isLocked: false, volume: 1 },
    ],
    timelineClips: [],
    assets: [],
    canvasNodes: [],
    canvasConnections: [],
    canvasSnapshots: [],
    generationQueue: [],
  };

  const existing = getSavedProjects();
  saveProjectsToStorage([newProject, ...existing]);
  setActiveProjectId(id);
  saveProjectToFirestore(newProject);
  return newProject;
};
