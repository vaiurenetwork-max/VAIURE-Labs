/**
 * VAIURE Shorts Service
 * Production Firestore real-time sync for Shorts, Interactions,
 * Comments, Views, Shares, and Video Publishing.
 * NO permanently hardcoded sample videos. Clean real Firestore data with polished empty state.
 */

import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { ShortVideo, ShortComment, ShortCategory } from '../types/shorts';
import { UserProfile } from '../types/social';
import { createFirestoreNotification } from './firestoreSocialService';

/**
 * Real-time subscription to Shorts collection from Firestore
 */
export function subscribeToFirestoreShorts(
  categoryFilter?: ShortCategory | 'ALL',
  onUpdate?: (shorts: ShortVideo[]) => void
): () => void {
  const shortsRef = collection(db, 'shorts');
  const q = query(shortsRef, orderBy('createdAt', 'desc'), limit(50));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        if (onUpdate) onUpdate([]);
        return;
      }
      const loaded: ShortVideo[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        loaded.push({
          id: data.id || d.id,
          title: data.title || '',
          description: data.description || '',
          videoUrl: data.videoUrl || '',
          thumbnailUrl: data.thumbnailUrl || '',
          authorId: data.authorId || '',
          authorName: data.authorName || 'Creator',
          authorUsername: data.authorUsername || 'creator',
          authorAvatar: data.authorAvatar || '',
          authorVerified: Boolean(data.authorVerified),
          category: (data.category as ShortCategory) || 'AI Cinema',
          tags: Array.isArray(data.tags) ? data.tags : [],
          soundTitle: data.soundTitle || 'Original Sound - VAIURE Audio',
          soundAuthor: data.soundAuthor || data.authorName || 'VAIURE Creator',
          duration: Number(data.duration) || 0,
          aspectRatio: data.aspectRatio || '9/16',
          viewsCount: Number(data.viewsCount) || 0,
          likesCount: Number(data.likesCount) || 0,
          commentsCount: Number(data.commentsCount) || 0,
          sharesCount: Number(data.sharesCount) || 0,
          savesCount: Number(data.savesCount) || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        });
      });

      const filtered =
        categoryFilter && categoryFilter !== 'ALL'
          ? loaded.filter((s) => s.category === categoryFilter)
          : loaded;

      if (onUpdate) onUpdate(filtered);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'shorts');
      if (onUpdate) onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Publish a new Short Video to Firestore
 */
export async function createFirestoreShort(short: ShortVideo): Promise<void> {
  const shortDocRef = doc(db, 'shorts', short.id);
  const now = new Date().toISOString();
  const payload = {
    ...short,
    createdAt: short.createdAt || now,
    updatedAt: now,
    viewsCount: short.viewsCount || 0,
    likesCount: short.likesCount || 0,
    commentsCount: short.commentsCount || 0,
    sharesCount: short.sharesCount || 0,
    savesCount: short.savesCount || 0,
  };

  try {
    await setDoc(shortDocRef, payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `shorts/${short.id}`);
  }
}

/**
 * Delete a Short Video
 */
export async function deleteFirestoreShort(shortId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'shorts', shortId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `shorts/${shortId}`);
  }
}

/**
 * Toggle Like on a Short Video
 */
export async function toggleFirestoreShortLike(
  shortId: string,
  user: UserProfile,
  currentlyLiked: boolean,
  currentLikesCount: number,
  authorId?: string,
  shortTitle?: string
): Promise<void> {
  if (!user.id) return;
  const shortRef = doc(db, 'shorts', shortId);

  try {
    const newCount = currentlyLiked
      ? Math.max(0, currentLikesCount - 1)
      : currentLikesCount + 1;

    await updateDoc(shortRef, {
      likesCount: newCount,
      updatedAt: new Date().toISOString(),
    });

    if (!currentlyLiked && authorId && authorId !== user.id) {
      await createFirestoreNotification(authorId, {
        id: `notif-short-like-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'like',
        actorId: user.id,
        actorName: user.displayName,
        actorUsername: user.username,
        actorAvatar: user.avatar,
        targetPostId: shortId,
        targetPostTitle: shortTitle || 'Short Video',
        message: 'liked your short video',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `shorts/${shortId}`);
  }
}

/**
 * Toggle Save / Bookmark on a Short Video
 */
export async function toggleFirestoreShortSave(
  shortId: string,
  user: UserProfile,
  currentlySaved: boolean,
  currentSavesCount: number
): Promise<void> {
  if (!user.id) return;
  const shortRef = doc(db, 'shorts', shortId);

  try {
    const newCount = currentlySaved
      ? Math.max(0, currentSavesCount - 1)
      : currentSavesCount + 1;

    await updateDoc(shortRef, {
      savesCount: newCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `shorts/${shortId}`);
  }
}

/**
 * Increment View Counter
 */
export async function incrementFirestoreShortView(
  shortId: string,
  currentViews: number
): Promise<void> {
  try {
    const shortRef = doc(db, 'shorts', shortId);
    await updateDoc(shortRef, {
      viewsCount: currentViews + 1,
    });
  } catch (err) {
    // Non-blocking view count increment
    console.warn('View increment note:', err);
  }
}

/**
 * Increment Share Counter
 */
export async function incrementFirestoreShortShare(
  shortId: string,
  currentShares: number
): Promise<void> {
  try {
    const shortRef = doc(db, 'shorts', shortId);
    await updateDoc(shortRef, {
      sharesCount: currentShares + 1,
    });
  } catch (err) {
    console.warn('Share increment note:', err);
  }
}

/**
 * Real-time subscription to Short Video Comments
 */
export function subscribeToShortComments(
  shortId: string,
  onUpdate: (comments: ShortComment[]) => void
): () => void {
  const commsRef = collection(db, 'shorts', shortId, 'comments');
  const q = query(commsRef, orderBy('createdAt', 'desc'), limit(50));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: ShortComment[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          shortId: data.shortId || shortId,
          authorId: data.authorId || '',
          authorName: data.authorName || 'Creator',
          authorUsername: data.authorUsername || 'creator',
          authorAvatar: data.authorAvatar || '',
          content: data.content || '',
          createdAt: data.createdAt || new Date().toISOString(),
          likesCount: Number(data.likesCount) || 0,
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `shorts/${shortId}/comments`);
      onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Add Comment to a Short Video
 */
export async function addFirestoreShortComment(
  comment: ShortComment,
  currentCommentsCount: number,
  authorId?: string,
  shortTitle?: string
): Promise<void> {
  const commRef = doc(db, 'shorts', comment.shortId, 'comments', comment.id);
  const shortRef = doc(db, 'shorts', comment.shortId);

  try {
    await setDoc(commRef, {
      ...comment,
      createdAt: new Date().toISOString(),
      likesCount: 0,
    });

    await updateDoc(shortRef, {
      commentsCount: currentCommentsCount + 1,
      updatedAt: new Date().toISOString(),
    });

    if (authorId && authorId !== comment.authorId) {
      await createFirestoreNotification(authorId, {
        id: `notif-short-comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'comment',
        actorId: comment.authorId,
        actorName: comment.authorName,
        actorUsername: comment.authorUsername,
        actorAvatar: comment.authorAvatar,
        targetPostId: comment.shortId,
        targetPostTitle: shortTitle || 'Short Video',
        message: `commented on your short: "${comment.content.slice(0, 50)}"`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `shorts/${comment.shortId}/comments/${comment.id}`);
  }
}
