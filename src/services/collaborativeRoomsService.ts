/**
 * VAIURE Labs — Collaborative Rooms & SharedWorks Canvas Service
 * Implements real-time synchronized multiplayer collaboration with Firebase Firestore,
 * with optimistic UI updates and local persistence resilience.
 */

import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  CollaborativeRoom,
  CanvasItem,
  RoomParticipant,
  RoomActivity,
  LiveCursor,
  ParticipantRole,
} from '../types/collaborativeRooms';
import {
  DEMO_ROOMS,
  DEMO_CANVAS_ITEMS,
  DEMO_PARTICIPANTS,
  DEMO_ACTIVITIES,
} from '../data/collaborativeDemoData';

const ROOMS_COLLECTION = 'collaborativeRooms';

// In-memory / localStorage cache for immediate optimistic rendering
const STORAGE_PREFIX = 'vaiure_collab_';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

/**
 * 1. Subscribe to Public and User-joined Rooms
 */
export function subscribeToRooms(
  userId: string,
  onUpdate: (rooms: CollaborativeRoom[]) => void,
  onError?: (err: any) => void
): () => void {
  // Pre-load local cache or demo data
  const localRooms = getLocal<CollaborativeRoom[]>('rooms', DEMO_ROOMS);
  onUpdate(localRooms);

  try {
    const roomsRef = collection(db, ROOMS_COLLECTION);
    const q = query(roomsRef, orderBy('updatedAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const fetchedRooms: CollaborativeRoom[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CollaborativeRoom;
            fetchedRooms.push({ ...data, id: docSnap.id });
          });

          // Merge fetched rooms with demo rooms so discovery is always rich
          const existingIds = new Set(fetchedRooms.map((r) => r.id));
          const merged = [
            ...fetchedRooms,
            ...DEMO_ROOMS.filter((dr) => !existingIds.has(dr.id)),
          ];
          setLocal('rooms', merged);
          onUpdate(merged);
        } else {
          // If Firestore collection is empty, seed demo rooms into local view
          setLocal('rooms', DEMO_ROOMS);
          onUpdate(DEMO_ROOMS);
        }
      },
      (error) => {
        console.warn('Rooms snapshot error (using local cache):', error.message);
        handleFirestoreError(error, OperationType.GET, ROOMS_COLLECTION);
        onError?.(error);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Fallback to local rooms storage:', err);
    onUpdate(localRooms);
    return () => {};
  }
}

/**
 * 2. Create a New Room
 */
export async function createRoom(
  roomData: Omit<CollaborativeRoom, 'id' | 'createdAt' | 'updatedAt' | 'activeCollaboratorsCount'>,
  ownerParticipant: Omit<RoomParticipant, 'id' | 'joinedAt' | 'lastActiveAt'>
): Promise<CollaborativeRoom> {
  const newId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const newRoom: CollaborativeRoom = {
    ...roomData,
    id: newId,
    activeCollaboratorsCount: 1,
    createdAt: now,
    updatedAt: now,
    lastActivityText: 'Room created',
  };

  // Optimistic save
  const current = getLocal<CollaborativeRoom[]>('rooms', DEMO_ROOMS);
  setLocal('rooms', [newRoom, ...current]);

  try {
    const roomRef = doc(db, ROOMS_COLLECTION, newId);
    await setDoc(roomRef, newRoom);

    // Add owner participant
    const partRef = doc(db, ROOMS_COLLECTION, newId, 'participants', ownerParticipant.userId);
    await setDoc(partRef, {
      ...ownerParticipant,
      id: ownerParticipant.userId,
      role: 'OWNER',
      status: 'ONLINE',
      joinedAt: now,
      lastActiveAt: now,
    });

    // Add initial creation activity
    await addRoomActivity(newId, {
      actorId: ownerParticipant.userId,
      actorName: ownerParticipant.displayName,
      actorAvatar: ownerParticipant.photoURL,
      action: 'created the room and workspace',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ROOMS_COLLECTION}/${newId}`);
  }

  return newRoom;
}

/**
 * 3. Update Room Details / Permissions
 */
export async function updateRoom(
  roomId: string,
  updates: Partial<CollaborativeRoom>
): Promise<void> {
  const now = new Date().toISOString();
  const current = getLocal<CollaborativeRoom[]>('rooms', DEMO_ROOMS);
  const updatedRooms = current.map((r) => (r.id === roomId ? { ...r, ...updates, updatedAt: now } : r));
  setLocal('rooms', updatedRooms);

  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await updateDoc(roomRef, { ...updates, updatedAt: now });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * 4. Delete / Archive a Room
 */
export async function deleteRoom(roomId: string): Promise<void> {
  const current = getLocal<CollaborativeRoom[]>('rooms', DEMO_ROOMS);
  setLocal(
    'rooms',
    current.filter((r) => r.id !== roomId)
  );

  try {
    const roomRef = doc(db, ROOMS_COLLECTION, roomId);
    await deleteDoc(roomRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ROOMS_COLLECTION}/${roomId}`);
  }
}

/**
 * 5. Subscribe to Room Canvas Items
 */
export function subscribeToCanvasItems(
  roomId: string,
  onUpdate: (items: CanvasItem[]) => void
): () => void {
  const initialDemoItems = DEMO_CANVAS_ITEMS[roomId] || [];
  const localItems = getLocal<CanvasItem[]>(`canvas_${roomId}`, initialDemoItems);
  onUpdate(localItems);

  try {
    const itemsRef = collection(db, ROOMS_COLLECTION, roomId, 'canvasItems');
    const q = query(itemsRef, orderBy('updatedAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const items: CanvasItem[] = [];
          snapshot.forEach((d) => {
            items.push({ ...(d.data() as CanvasItem), id: d.id });
          });
          setLocal(`canvas_${roomId}`, items);
          onUpdate(items);
        } else {
          // If empty in DB, use local items or seed demo
          onUpdate(localItems.length > 0 ? localItems : initialDemoItems);
        }
      },
      (error) => {
        console.warn('Canvas items snapshot fallback:', error.message);
        onUpdate(localItems);
      }
    );

    return unsubscribe;
  } catch {
    onUpdate(localItems);
    return () => {};
  }
}

/**
 * 6. Add or Update Canvas Item (Optimistic + Firestore)
 */
export async function saveCanvasItem(roomId: string, item: CanvasItem): Promise<void> {
  const current = getLocal<CanvasItem[]>(`canvas_${roomId}`, DEMO_CANVAS_ITEMS[roomId] || []);
  const existingIdx = current.findIndex((i) => i.id === item.id);
  const now = new Date().toISOString();
  const updatedItem = { ...item, updatedAt: now };

  let nextList: CanvasItem[];
  if (existingIdx >= 0) {
    nextList = [...current];
    nextList[existingIdx] = updatedItem;
  } else {
    nextList = [...current, updatedItem];
  }
  setLocal(`canvas_${roomId}`, nextList);

  try {
    const itemRef = doc(db, ROOMS_COLLECTION, roomId, 'canvasItems', item.id);
    await setDoc(itemRef, updatedItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ROOMS_COLLECTION}/${roomId}/canvasItems/${item.id}`);
  }
}

/**
 * 7. Delete Canvas Item
 */
export async function deleteCanvasItem(roomId: string, itemId: string): Promise<void> {
  const current = getLocal<CanvasItem[]>(`canvas_${roomId}`, DEMO_CANVAS_ITEMS[roomId] || []);
  setLocal(
    `canvas_${roomId}`,
    current.filter((i) => i.id !== itemId)
  );

  try {
    const itemRef = doc(db, ROOMS_COLLECTION, roomId, 'canvasItems', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ROOMS_COLLECTION}/${roomId}/canvasItems/${itemId}`);
  }
}

/**
 * 8. Subscribe to Live Collaborators & Presence
 */
export function subscribeToParticipants(
  roomId: string,
  onUpdate: (participants: RoomParticipant[]) => void
): () => void {
  const initial = DEMO_PARTICIPANTS[roomId] || DEMO_PARTICIPANTS['room-neon-city'] || [];
  const local = getLocal<RoomParticipant[]>(`participants_${roomId}`, initial);
  onUpdate(local);

  try {
    const partRef = collection(db, ROOMS_COLLECTION, roomId, 'participants');
    const unsubscribe = onSnapshot(
      partRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: RoomParticipant[] = [];
          snapshot.forEach((d) => list.push({ ...(d.data() as RoomParticipant), id: d.id }));
          setLocal(`participants_${roomId}`, list);
          onUpdate(list);
        } else {
          onUpdate(local);
        }
      },
      (error) => {
        console.warn('Participants snapshot fallback:', error.message);
        onUpdate(local);
      }
    );
    return unsubscribe;
  } catch {
    onUpdate(local);
    return () => {};
  }
}

/**
 * 9. Update Participant Role or Status
 */
export async function updateParticipantRole(
  roomId: string,
  userId: string,
  role: ParticipantRole
): Promise<void> {
  const current = getLocal<RoomParticipant[]>(`participants_${roomId}`, []);
  const next = current.map((p) => (p.userId === userId ? { ...p, role } : p));
  setLocal(`participants_${roomId}`, next);

  try {
    const partRef = doc(db, ROOMS_COLLECTION, roomId, 'participants', userId);
    await updateDoc(partRef, { role, lastActiveAt: new Date().toISOString() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ROOMS_COLLECTION}/${roomId}/participants/${userId}`);
  }
}

/**
 * 10. Remove Participant from Room
 */
export async function removeParticipant(roomId: string, userId: string): Promise<void> {
  const current = getLocal<RoomParticipant[]>(`participants_${roomId}`, []);
  setLocal(
    `participants_${roomId}`,
    current.filter((p) => p.userId !== userId)
  );

  try {
    const partRef = doc(db, ROOMS_COLLECTION, roomId, 'participants', userId);
    await deleteDoc(partRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ROOMS_COLLECTION}/${roomId}/participants/${userId}`);
  }
}

/**
 * 11. Subscribe to Room Activities
 */
export function subscribeToActivities(
  roomId: string,
  onUpdate: (activities: RoomActivity[]) => void
): () => void {
  const initial = DEMO_ACTIVITIES[roomId] || DEMO_ACTIVITIES['room-neon-city'] || [];
  const local = getLocal<RoomActivity[]>(`activities_${roomId}`, initial);
  onUpdate(local);

  try {
    const actRef = collection(db, ROOMS_COLLECTION, roomId, 'activities');
    const q = query(actRef, orderBy('timestamp', 'desc'), limit(25));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: RoomActivity[] = [];
          snapshot.forEach((d) => list.push({ ...(d.data() as RoomActivity), id: d.id }));
          setLocal(`activities_${roomId}`, list);
          onUpdate(list);
        } else {
          onUpdate(local);
        }
      },
      (error) => {
        console.warn('Activities snapshot fallback:', error.message);
        onUpdate(local);
      }
    );
    return unsubscribe;
  } catch {
    onUpdate(local);
    return () => {};
  }
}

/**
 * 12. Add Room Activity Record
 */
export async function addRoomActivity(
  roomId: string,
  activity: Omit<RoomActivity, 'id' | 'roomId' | 'timestamp'>
): Promise<void> {
  const newActivity: RoomActivity = {
    ...activity,
    id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    roomId,
    timestamp: 'Just now',
  };

  const current = getLocal<RoomActivity[]>(`activities_${roomId}`, DEMO_ACTIVITIES[roomId] || []);
  setLocal(`activities_${roomId}`, [newActivity, ...current].slice(0, 30));

  try {
    const actRef = doc(db, ROOMS_COLLECTION, roomId, 'activities', newActivity.id);
    await setDoc(actRef, {
      ...newActivity,
      timestamp: new Date().toISOString(),
    });
  } catch (_e) {
    // Non-blocking for activity logs
  }
}

/**
 * 13. Live Cursor Sync
 */
export function subscribeToLiveCursors(
  roomId: string,
  currentUserId: string,
  onUpdate: (cursors: LiveCursor[]) => void
): () => void {
  try {
    const cursorsRef = collection(db, ROOMS_COLLECTION, roomId, 'cursors');
    const unsubscribe = onSnapshot(
      cursorsRef,
      (snapshot) => {
        const now = Date.now();
        const cursors: LiveCursor[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as LiveCursor;
          // Filter out own cursor and stale cursors older than 15s
          if (data.userId !== currentUserId && now - (data.lastSeen || 0) < 15000) {
            cursors.push(data);
          }
        });
        onUpdate(cursors);
      },
      (_err) => {}
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}

export async function broadcastCursorPosition(
  roomId: string,
  cursor: LiveCursor
): Promise<void> {
  try {
    const cursorRef = doc(db, ROOMS_COLLECTION, roomId, 'cursors', cursor.id);
    await setDoc(cursorRef, {
      ...cursor,
      lastSeen: Date.now(),
    });
  } catch (_e) {
    // Non-blocking cursor broadcast
  }
}
