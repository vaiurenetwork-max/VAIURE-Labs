/**
 * IVNTRI Forum & Creator Thoughts Service
 * Production Firestore real-time sync for micro-threads, status dispatches,
 * topic filtering, likes, and nested replies.
 */

import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  removeUndefinedValues,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  ForumThread,
  ForumReply,
  ForumTopic,
  ReplyPermission,
  OptimizedImageItem,
  ImageProcessingStatus,
} from '../types/forum';
import { UserProfile } from '../types/social';

/**
 * Upload and trigger backend image optimization for a Thread image
 */
export async function uploadAndOptimizeThreadImage(
  file: File,
  userId: string,
  threadId: string,
  onProgress?: (progressPercent: number) => void
): Promise<OptimizedImageItem> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('userId', userId);
  formData.append('threadId', threadId);

  return new Promise<OptimizedImageItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/threads/optimize-image');
    xhr.setRequestHeader('x-user-id', userId);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          // Progress from 0% to 90% during upload, last 10% during server optimization
          const percent = Math.min(90, Math.round((event.loaded / event.total) * 90));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.success && res.image) {
            if (onProgress) onProgress(100);
            resolve(res.image as OptimizedImageItem);
          } else {
            reject(new Error(res.error || 'Backend optimization failed.'));
          }
        } catch (e: any) {
          reject(new Error('Invalid response received from optimization engine.'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          reject(new Error(errRes.error || `Server returned error (${xhr.status})`));
        } catch {
          reject(new Error(`Server returned error (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network connection error during image upload.'));
    };

    xhr.send(formData);
  });
}

/**
 * Real-time subscription to Forum Threads
 */
export function subscribeToForumThreads(
  topicFilter: string | null,
  currentUserId: string | undefined,
  onUpdate: (threads: ForumThread[]) => void
): () => void {
  const threadsRef = collection(db, 'forumThreads');
  let q = query(threadsRef, orderBy('createdAt', 'desc'), limit(50));

  if (topicFilter && topicFilter !== 'ALL') {
    q = query(
      threadsRef,
      where('topic', '==', topicFilter),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const threads: ForumThread[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const likedBy: string[] = data.likedBy || [];
        const repostedBy: string[] = data.repostedBy || [];

        // Only completed images appear in the public feed
        const optimizedImages: OptimizedImageItem[] = data.optimizedImages || [];
        const rawMediaUrls: string[] = data.mediaUrls || [];
        const publicMediaUrls = optimizedImages.length > 0
          ? optimizedImages.filter((img) => img.status === 'completed').map((img) => img.url)
          : rawMediaUrls;

        threads.push({
          id: d.id,
          authorId: data.authorId || '',
          authorUsername: data.authorUsername || 'creator',
          authorDisplayName: data.authorDisplayName || 'Creator',
          authorAvatar: data.authorAvatar || '',
          authorRole: data.authorRole || 'CREATOR',
          authorVerified: Boolean(data.authorVerified),
          topic: data.topic || 'General Discourse',
          content: data.content || '',
          mediaUrls: publicMediaUrls,
          imageProcessingStatus: (data.imageProcessingStatus as ImageProcessingStatus) || 'completed',
          optimizedImages,
          chainedThoughts: data.chainedThoughts || [],
          replyPermission: (data.replyPermission as ReplyPermission) || 'EVERYONE',
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : likedBy.length,
          likedBy,
          repliesCount: typeof data.repliesCount === 'number' ? data.repliesCount : 0,
          repostsCount: typeof data.repostsCount === 'number' ? data.repostsCount : repostedBy.length,
          repostedBy,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
          isLiked: currentUserId ? likedBy.includes(currentUserId) : false,
          isReposted: currentUserId ? repostedBy.includes(currentUserId) : false,
        });
      });
      onUpdate(threads);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'forumThreads');
      onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Publish a new Forum Thread to Firestore
 */
export async function createForumThread(
  user: UserProfile,
  data: {
    topic: ForumTopic;
    content: string;
    mediaUrls?: string[];
    optimizedImages?: OptimizedImageItem[];
    imageProcessingStatus?: ImageProcessingStatus;
    chainedThoughts?: { id: string; content: string; mediaUrls?: string[] }[];
    replyPermission: ReplyPermission;
    id?: string;
  }
): Promise<ForumThread> {
  const currentUid = auth.currentUser?.uid || user.id;
  if (!currentUid) {
    throw new Error('You must be signed in to dispatch a thread');
  }

  const threadId = data.id || `thread-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowIso = new Date().toISOString();

  // Filter chained thoughts to non-empty items
  const cleanChained = (data.chainedThoughts || [])
    .filter((ct) => ct.content.trim().length > 0)
    .map((ct) => ({
      id: ct.id || `chain-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      content: ct.content.trim(),
      mediaUrls: ct.mediaUrls || [],
    }));

  const optimizedImages = data.optimizedImages || [];
  // Media URLs in public feed strictly point to verified optimized assets
  const verifiedMediaUrls = optimizedImages.length > 0
    ? optimizedImages.filter((img) => img.status === 'completed').map((img) => img.url)
    : (data.mediaUrls || []);

  const threadDoc: Record<string, any> = {
    id: threadId,
    authorId: currentUid,
    authorUsername: user.username || 'creator',
    authorDisplayName: user.displayName || user.username || 'Creator',
    authorAvatar: user.avatar || '',
    authorRole: user.role || 'CREATOR',
    authorVerified: Boolean(user.verified || user.isVerified),
    topic: data.topic || 'General Discourse',
    content: data.content.trim(),
    mediaUrls: verifiedMediaUrls,
    optimizedImages,
    imageProcessingStatus: data.imageProcessingStatus || (optimizedImages.length > 0 ? 'completed' : 'completed'),
    chainedThoughts: cleanChained,
    replyPermission: data.replyPermission || 'EVERYONE',
    likesCount: 0,
    likedBy: [],
    repliesCount: 0,
    repostsCount: 0,
    repostedBy: [],
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const cleanPayload = removeUndefinedValues(threadDoc);
  const threadRef = doc(db, 'forumThreads', threadId);

  try {
    await setDoc(threadRef, cleanPayload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `forumThreads/${threadId}`);
    throw err;
  }

  return {
    ...threadDoc,
    likesCount: 0,
    likedBy: [],
    repliesCount: 0,
    repostsCount: 0,
    isLiked: false,
    isReposted: false,
  } as ForumThread;
}

/**
 * Toggle Like on a Forum Thread
 */
export async function toggleLikeForumThread(
  threadId: string,
  userId: string
): Promise<{ isLiked: boolean; count: number }> {
  if (!threadId || !userId) return { isLiked: false, count: 0 };
  const threadRef = doc(db, 'forumThreads', threadId);

  try {
    const snap = await getDoc(threadRef);
    if (!snap.exists()) return { isLiked: false, count: 0 };

    const data = snap.data();
    const likedBy: string[] = data.likedBy || [];
    const isCurrentlyLiked = likedBy.includes(userId);

    const updatedLikedBy = isCurrentlyLiked
      ? likedBy.filter((id) => id !== userId)
      : [...likedBy, userId];

    await updateDoc(threadRef, {
      likedBy: updatedLikedBy,
      likesCount: updatedLikedBy.length,
      updatedAt: new Date().toISOString(),
    });

    return {
      isLiked: !isCurrentlyLiked,
      count: updatedLikedBy.length,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `forumThreads/${threadId}`);
    return { isLiked: false, count: 0 };
  }
}

/**
 * Toggle Repost on a Forum Thread
 */
export async function toggleRepostForumThread(
  threadId: string,
  userId: string
): Promise<{ isReposted: boolean; count: number }> {
  if (!threadId || !userId) return { isReposted: false, count: 0 };
  const threadRef = doc(db, 'forumThreads', threadId);

  try {
    const snap = await getDoc(threadRef);
    if (!snap.exists()) return { isReposted: false, count: 0 };

    const data = snap.data();
    const repostedBy: string[] = data.repostedBy || [];
    const isCurrentlyReposted = repostedBy.includes(userId);

    const updatedRepostedBy = isCurrentlyReposted
      ? repostedBy.filter((id) => id !== userId)
      : [...repostedBy, userId];

    await updateDoc(threadRef, {
      repostedBy: updatedRepostedBy,
      repostsCount: updatedRepostedBy.length,
      updatedAt: new Date().toISOString(),
    });

    return {
      isReposted: !isCurrentlyReposted,
      count: updatedRepostedBy.length,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `forumThreads/${threadId}`);
    return { isReposted: false, count: 0 };
  }
}

/**
 * Real-time subscription to Replies inside a Thread
 */
export function subscribeToThreadReplies(
  threadId: string,
  onUpdate: (replies: ForumReply[]) => void
): () => void {
  if (!threadId) {
    onUpdate([]);
    return () => {};
  }

  const repliesRef = collection(db, 'forumThreads', threadId, 'replies');
  const q = query(repliesRef, orderBy('createdAt', 'asc'), limit(100));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const list: ForumReply[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          threadId,
          authorId: data.authorId || '',
          authorUsername: data.authorUsername || 'creator',
          authorDisplayName: data.authorDisplayName || 'Creator',
          authorAvatar: data.authorAvatar || '',
          authorRole: data.authorRole || 'CREATOR',
          authorVerified: Boolean(data.authorVerified),
          content: data.content || '',
          likesCount: typeof data.likesCount === 'number' ? data.likesCount : 0,
          likedBy: data.likedBy || [],
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `forumThreads/${threadId}/replies`);
      onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Add a Reply to a Forum Thread
 */
export async function createThreadReply(
  threadId: string,
  user: UserProfile,
  content: string
): Promise<ForumReply> {
  const currentUid = auth.currentUser?.uid || user.id;
  if (!currentUid) {
    throw new Error('You must be signed in to reply');
  }

  const replyId = `reply-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const replyData: Record<string, any> = {
    id: replyId,
    threadId,
    authorId: currentUid,
    authorUsername: user.username || 'creator',
    authorDisplayName: user.displayName || user.username || 'Creator',
    authorAvatar: user.avatar || '',
    authorRole: user.role || 'CREATOR',
    authorVerified: Boolean(user.verified || user.isVerified),
    content: content.trim(),
    likesCount: 0,
    likedBy: [],
    createdAt: nowIso,
  };

  const cleanPayload = removeUndefinedValues(replyData);
  const replyRef = doc(db, 'forumThreads', threadId, 'replies', replyId);
  const threadRef = doc(db, 'forumThreads', threadId);

  try {
    await setDoc(replyRef, cleanPayload);

    // Update replies counter on the thread document
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      const prevCount = threadSnap.data().repliesCount || 0;
      await updateDoc(threadRef, {
        repliesCount: prevCount + 1,
        updatedAt: nowIso,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `forumThreads/${threadId}/replies/${replyId}`);
    throw err;
  }

  return replyData as ForumReply;
}

/**
 * Delete a Thread (author or admin) and clean up associated backend assets
 */
export async function deleteForumThread(threadId: string, authorId?: string): Promise<void> {
  if (!threadId) return;
  const currentUid = auth.currentUser?.uid || authorId || '';
  const threadRef = doc(db, 'forumThreads', threadId);

  try {
    await deleteDoc(threadRef);

    // Securely trigger backend media asset cleanup for this thread
    try {
      await fetch(`/api/threads/${threadId}/media?userId=${encodeURIComponent(currentUid)}`, {
        method: 'DELETE',
        headers: { 'x-user-id': currentUid },
      });
    } catch (_cleanupErr) {
      // Ignored non-fatal
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `forumThreads/${threadId}`);
  }
}
