/**
 * IVNTRI Firestore Social Service
 * Production Firestore real-time sync for Posts, Users/Creators, Interactions,
 * Direct Messages, Curatorial Submissions, and Real-Time Notifications.
 * ZERO FAKE SEED DATA — 100% REAL FIREBASE DATA ONLY.
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
  storage,
  storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from '../lib/firebase';
import {
  SocialPost,
  UserProfile,
  UserCollection,
  SocialNotification,
  Conversation,
  PostComment,
  ChatMessage,
} from '../types/social';

/**
 * Real-time subscription to Posts collection from Firestore
 */
export function subscribeToFirestorePosts(
  onUpdate: (posts: SocialPost[]) => void
): () => void {
  const postsRef = collection(db, 'posts');
  const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate([]);
        return;
      }
      const loaded: SocialPost[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        loaded.push({
          id: data.id || d.id,
          authorId: data.authorUid || data.authorId || '',
          authorName: data.authorDisplayName || data.authorName || 'Creator',
          authorUsername: data.authorUsername || 'creator',
          authorAvatar: data.authorPhotoURL || data.authorAvatar || '',
          authorRole: data.authorAccountType || data.authorRole || 'CREATOR',
          authorVerified: data.authorVerified ?? false,
          title: data.title || '',
          caption: data.caption || '',
          category: data.category || 'EDITORIAL',
          postType: data.postType || data.type || 'image',
          media: data.media || [],
          tags: data.tags || [],
          aiTools: data.aiTools || data.aiToolsUsed || [],
          aiAttribution: data.aiAttribution || data.aiDisclosure || 'AI Generated',
          collaborators: data.collaborators || [],
          createdAt: data.createdAt || '',
          likesCount: Number(data.likesCount) || 0,
          commentsCount: Number(data.commentsCount) || 0,
          repostsCount: Number(data.repostsCount) || 0,
          savesCount: Number(data.savesCount) || 0,
          originalPost: data.originalPost,
          repostedBy: data.repostedBy,
        });
      });
      onUpdate(loaded);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'posts');
      onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Real-time subscription to Users/Creators from Firestore
 */
export function subscribeToFirestoreCreators(
  onUpdate: (creators: Record<string, UserProfile>) => void
): () => void {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, limit(50));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        onUpdate({});
        return;
      }
      const map: Record<string, UserProfile> = {};
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.username || data.displayName || data.email) {
          const rawName = data.username || data.displayName?.toLowerCase().replace(/\s+/g, '_') || data.email?.split('@')[0] || d.id;
          const isDesignated =
            data.email === 'rachvan420@gmail.com' ||
            data.role === 'ADMIN' ||
            data.role === 'SUPER_ADMIN';

          const profile: UserProfile = {
            id: data.uid || d.id,
            username: rawName,
            displayName: data.displayName || rawName,
            email: data.email,
            avatar: data.photoURL || '',
            bannerImage: data.bannerImage,
            role: isDesignated ? 'SUPER_ADMIN' : (data.role || data.accountType || 'CREATOR'),
            specialBadge: isDesignated ? 'ADMINISTRATOR' : data.specialBadge,
            verified: isDesignated ? true : Boolean(data.verified),
            bio: data.bio || '',
            location: data.location || '',
            website: data.website || '',
            followersCount: Number(data.followersCount) || 0,
            followingCount: Number(data.followingCount) || 0,
            postsCount: Number(data.postsCount) || 0,
            aiSpecialties: data.aiSpecialties || [],
            collections: [],
          };

          map[rawName] = profile;
        }
      });
      onUpdate(map);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
      onUpdate({});
    }
  );

  return unsubscribe;
}

/**
 * Fetch all registered users in real-time from the backend database API
 */
export async function fetchAllUsersRealtime(): Promise<UserProfile[]> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      return (data.users || []).map((u: any) => ({
        id: u.uid || u.id,
        username: u.username,
        displayName: u.displayName || u.username,
        email: u.email,
        avatar: u.photoURL || u.avatar || '',
        bannerImage: u.bannerImage,
        role: u.role || 'CREATOR',
        specialBadge: u.specialBadge,
        verified: Boolean(u.isVerified || u.verified),
        bio: u.bio || '',
        location: u.location || '',
        website: u.website || '',
        followersCount: Number(u.followersCount) || 0,
        followingCount: Number(u.followingCount) || 0,
        postsCount: Number(u.postsCount) || 0,
        aiSpecialties: u.aiSpecialties || [],
        collections: [],
      }));
    }
  } catch (err) {
    console.warn('fetchAllUsersRealtime error:', err);
  }
  return [];
}

/**
 * Retrieve any user document in real-time by UID or username
 */
export async function fetchUserByHandleOrId(idOrUsername: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(idOrUsername)}`);
    if (res.ok) {
      const data = await res.json();
      return {
        id: data.uid || data.id,
        username: data.username,
        displayName: data.displayName || data.username,
        email: data.email,
        avatar: data.photoURL || data.avatar || '',
        bannerImage: data.bannerImage,
        role: data.role || data.accountType || 'CREATOR',
        specialBadge: data.specialBadge,
        verified: Boolean(data.verified || data.isVerified),
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        followersCount: Number(data.followersCount) || 0,
        followingCount: Number(data.followingCount) || 0,
        postsCount: Number(data.postsCount) || 0,
        aiSpecialties: data.aiSpecialties || [],
        collections: [],
      };
    }
  } catch (err) {
    console.warn('fetchUserByHandleOrId error:', err);
  }
  return null;
}

/**
 * Real-time subscription to a specific User profile from Firestore
 */
export function subscribeToFirestoreUser(
  uid: string,
  onUpdate: (user: UserProfile | null) => void
): () => void {
  if (!uid) {
    onUpdate(null);
    return () => {};
  }
  const userRef = doc(db, 'users', uid);
  const unsubscribe = onSnapshot(
    userRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate(null);
        return;
      }
      const data = snapshot.data();
      const rawName = data.username || data.displayName?.toLowerCase().replace(/\s+/g, '_') || data.email?.split('@')[0] || snapshot.id;
      const isDesignated =
        data.email === 'rachvan420@gmail.com' ||
        data.role === 'ADMIN' ||
        data.role === 'SUPER_ADMIN';

      onUpdate({
        id: snapshot.id,
        username: rawName,
        displayName: data.displayName || rawName,
        email: data.email,
        avatar: data.photoURL || '',
        bannerImage: data.bannerImage,
        role: isDesignated ? 'SUPER_ADMIN' : (data.role || data.accountType || 'CREATOR'),
        specialBadge: isDesignated ? 'ADMINISTRATOR' : data.specialBadge,
        verified: isDesignated ? true : Boolean(data.verified),
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        followersCount: Number(data.followersCount) || 0,
        followingCount: Number(data.followingCount) || 0,
        postsCount: Number(data.postsCount) || 0,
        aiSpecialties: data.aiSpecialties || [],
        collections: [],
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      onUpdate(null);
    }
  );

  return unsubscribe;
}

/**
 * Create a new Post document in Firestore
 */
export async function createFirestorePost(post: SocialPost): Promise<void> {
  const postDocRef = doc(db, 'posts', post.id);
  const postData = {
    ...post,
    authorUid: post.authorId,
    authorUsername: post.authorUsername,
    authorDisplayName: post.authorName,
    authorPhotoURL: post.authorAvatar,
    authorVerified: post.authorVerified ?? false,
    authorAccountType: post.authorRole,
    type: post.postType,
    aiDisclosure: post.aiAttribution,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(postDocRef, postData);

    // Increment author user postsCount if user document exists
    if (post.authorId) {
      try {
        const userRef = doc(db, 'users', post.authorId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const curCount = userSnap.data().postsCount || 0;
          await updateDoc(userRef, { postsCount: curCount + 1 });
        }
      } catch (e) {
        console.warn('User postsCount sync note:', e);
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${post.id}`);
  }
}

/**
 * Toggle Like on a Post in Firestore
 */
export async function toggleFirestorePostLike(
  postId: string,
  user: UserProfile,
  currentlyLiked: boolean,
  currentLikesCount: number,
  postAuthorId?: string,
  postTitle?: string
): Promise<void> {
  if (!user.id) return;
  const likeDocRef = doc(db, 'posts', postId, 'likes', user.id);
  const postRef = doc(db, 'posts', postId);

  try {
    if (currentlyLiked) {
      await deleteDoc(likeDocRef);
      await updateDoc(postRef, {
        likesCount: Math.max(0, currentLikesCount - 1),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(likeDocRef, {
        postId,
        userId: user.id,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(postRef, {
        likesCount: currentLikesCount + 1,
        updatedAt: new Date().toISOString(),
      });

      // Send notification if author is someone else
      if (postAuthorId && postAuthorId !== user.id) {
        await createFirestoreNotification(postAuthorId, {
          id: `notif-like-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'like',
          actorId: user.id,
          actorName: user.displayName,
          actorUsername: user.username,
          actorAvatar: user.avatar,
          targetPostId: postId,
          targetPostTitle: postTitle || '',
          message: 'applauded your work',
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `posts/${postId}/likes/${user.id}`);
  }
}

/**
 * Toggle Save on a Post in Firestore
 */
export async function toggleFirestorePostSave(
  postId: string,
  user: UserProfile,
  currentlySaved: boolean,
  currentSavesCount: number,
  collectionId?: string
): Promise<void> {
  if (!user.id) return;
  const saveDocRef = doc(db, 'users', user.id, 'savedPosts', postId);
  const postRef = doc(db, 'posts', postId);

  try {
    if (currentlySaved) {
      await deleteDoc(saveDocRef);
      await updateDoc(postRef, {
        savesCount: Math.max(0, currentSavesCount - 1),
        updatedAt: new Date().toISOString(),
      });
    } else {
      await setDoc(saveDocRef, {
        postId,
        userId: user.id,
        savedAt: new Date().toISOString(),
        collectionId: collectionId || 'vault',
      });
      await updateDoc(postRef, {
        savesCount: currentSavesCount + 1,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.id}/savedPosts/${postId}`);
  }
}

/**
 * Toggle Follow Creator in Firestore
 */
export async function toggleFirestoreFollow(
  currentUser: UserProfile,
  targetUser: UserProfile,
  currentlyFollowing: boolean
): Promise<void> {
  if (!currentUser.id || !targetUser.id) return;
  const followingRef = doc(db, 'users', currentUser.id, 'following', targetUser.id);
  const followerRef = doc(db, 'users', targetUser.id, 'followers', currentUser.id);

  try {
    if (currentlyFollowing) {
      await deleteDoc(followingRef);
      await deleteDoc(followerRef);

      try {
        const uRef = doc(db, 'users', currentUser.id);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          await updateDoc(uRef, {
            followingCount: Math.max(0, (uSnap.data().followingCount || 1) - 1),
          });
        }

        const tRef = doc(db, 'users', targetUser.id);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          await updateDoc(tRef, {
            followersCount: Math.max(0, (tSnap.data().followersCount || 1) - 1),
          });
        }
      } catch (e) {
        console.warn('Follow count decrement note:', e);
      }
    } else {
      const nowIso = new Date().toISOString();
      await setDoc(followingRef, {
        followerUid: currentUser.id,
        targetUid: targetUser.id,
        createdAt: nowIso,
      });
      await setDoc(followerRef, {
        followerUid: currentUser.id,
        targetUid: targetUser.id,
        createdAt: nowIso,
      });

      try {
        const uRef = doc(db, 'users', currentUser.id);
        const uSnap = await getDoc(uRef);
        if (uSnap.exists()) {
          await updateDoc(uRef, {
            followingCount: (uSnap.data().followingCount || 0) + 1,
          });
        }

        const tRef = doc(db, 'users', targetUser.id);
        const tSnap = await getDoc(tRef);
        if (tSnap.exists()) {
          await updateDoc(tRef, {
            followersCount: (tSnap.data().followersCount || 0) + 1,
          });
        }
      } catch (e) {
        console.warn('Follow count increment note:', e);
      }

      // Send notification
      await createFirestoreNotification(targetUser.id, {
        id: `notif-follow-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'follow',
        actorId: currentUser.id,
        actorName: currentUser.displayName,
        actorUsername: currentUser.username,
        actorAvatar: currentUser.avatar,
        message: 'followed your archive',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.id}/following/${targetUser.id}`);
  }
}

/**
 * Repost a Post in Firestore
 */
export async function createFirestoreRepost(
  repostPost: SocialPost,
  originalPostId: string,
  currentRepostsCount: number,
  originalAuthorId: string
): Promise<void> {
  try {
    await createFirestorePost(repostPost);

    const origRef = doc(db, 'posts', originalPostId);
    await updateDoc(origRef, {
      repostsCount: currentRepostsCount + 1,
      updatedAt: new Date().toISOString(),
    });

    if (originalAuthorId && originalAuthorId !== repostPost.authorId) {
      await createFirestoreNotification(originalAuthorId, {
        id: `notif-repost-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'repost',
        actorId: repostPost.authorId,
        actorName: repostPost.authorName,
        actorUsername: repostPost.authorUsername,
        actorAvatar: repostPost.authorAvatar,
        targetPostId: originalPostId,
        targetPostTitle: repostPost.title,
        message: 'reposted your work',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${repostPost.id}`);
  }
}

/**
 * Add Comment in Firestore
 */
export async function addFirestoreComment(
  comment: PostComment,
  currentCommentsCount: number,
  postAuthorId?: string,
  postTitle?: string
): Promise<void> {
  const commRef = doc(db, 'posts', comment.postId, 'comments', comment.id);
  const postRef = doc(db, 'posts', comment.postId);

  try {
    await setDoc(commRef, {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      authorName: comment.authorName,
      authorUsername: comment.authorUsername,
      authorAvatar: comment.authorAvatar,
      content: comment.content,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      parentId: comment.parentId || null,
    });

    await updateDoc(postRef, {
      commentsCount: currentCommentsCount + 1,
      updatedAt: new Date().toISOString(),
    });

    if (postAuthorId && postAuthorId !== comment.authorId) {
      await createFirestoreNotification(postAuthorId, {
        id: `notif-comm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'comment',
        actorId: comment.authorId,
        actorName: comment.authorName,
        actorUsername: comment.authorUsername,
        actorAvatar: comment.authorAvatar,
        targetPostId: comment.postId,
        targetPostTitle: postTitle || '',
        message: `commented: "${comment.content.slice(0, 60)}"`,
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `posts/${comment.postId}/comments/${comment.id}`);
  }
}

/**
 * Delete Comment in Firestore
 */
export async function deleteFirestoreComment(
  postId: string,
  commentId: string,
  currentCommentsCount: number
): Promise<void> {
  const commRef = doc(db, 'posts', postId, 'comments', commentId);
  const postRef = doc(db, 'posts', postId);

  try {
    await deleteDoc(commRef);
    await updateDoc(postRef, {
      commentsCount: Math.max(0, currentCommentsCount - 1),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `posts/${postId}/comments/${commentId}`);
  }
}

/**
 * Like/Unlike Comment in Firestore
 */
export async function updateFirestoreCommentLikes(
  postId: string,
  commentId: string,
  newLikesCount: number
): Promise<void> {
  const commRef = doc(db, 'posts', postId, 'comments', commentId);
  try {
    await updateDoc(commRef, {
      likesCount: newLikesCount,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}/comments/${commentId}`);
  }
}

/**
 * Real-time subscription to Comments on a Post
 */
export function subscribeToFirestoreComments(
  postId: string,
  onUpdate: (comments: PostComment[]) => void
): () => void {
  const commsRef = collection(db, 'posts', postId, 'comments');
  const q = query(commsRef, orderBy('createdAt', 'asc'));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: PostComment[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          postId: data.postId,
          authorId: data.authorId,
          authorName: data.authorName,
          authorUsername: data.authorUsername,
          authorAvatar: data.authorAvatar,
          content: data.content,
          createdAt: data.createdAt,
          likesCount: Number(data.likesCount) || 0,
          parentId: data.parentId || null,
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `posts/${postId}/comments`);
      onUpdate([]);
    }
  );

  return unsub;
}

/**
 * Real-time subscription to Notifications for a User
 */
export function subscribeToFirestoreNotifications(
  userId: string,
  onUpdate: (notifications: SocialNotification[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const notifsRef = collection(db, 'users', userId, 'notifications');
  const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(30));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: SocialNotification[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          type: data.type,
          actorId: data.actorId,
          actorName: data.actorName,
          actorUsername: data.actorUsername,
          actorAvatar: data.actorAvatar,
          targetPostId: data.targetPostId,
          targetPostTitle: data.targetPostTitle,
          message: data.message,
          createdAt: data.createdAt,
          read: data.read ?? false,
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/notifications`);
      onUpdate([]);
    }
  );

  return unsub;
}

/**
 * Create a Notification for a User
 */
export async function createFirestoreNotification(
  userId: string,
  notif: SocialNotification
): Promise<void> {
  if (!userId) return;
  const notifRef = doc(db, 'users', userId, 'notifications', notif.id);
  try {
    await setDoc(notifRef, notif);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/notifications/${notif.id}`);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadInFirestore(
  userId: string,
  notifIds: string[]
): Promise<void> {
  if (!userId) return;
  for (const id of notifIds) {
    try {
      const ref = doc(db, 'users', userId, 'notifications', id);
      await updateDoc(ref, { read: true });
    } catch (e) {
      console.warn('Read notif note:', e);
    }
  }
}

/**
 * Deterministic Conversation ID between two user IDs
 * Guarantees User A and User B always share the exact same conversation room
 */
export function getConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `conv_${sorted[0]}_${sorted[1]}`;
}

/**
 * Real-time subscription to Conversations for a User
 */
export function subscribeToFirestoreConversations(
  userId: string,
  onUpdate: (convs: Conversation[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }
  const convsRef = collection(db, 'conversations');
  const q = query(convsRef, orderBy('updatedAt', 'desc'), limit(50));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data.participantUids && !data.participantUids.includes(userId)) {
          return;
        }
        const otherParticipant =
          data.participants && data.participants.find((p: any) => p.id !== userId);

        if (otherParticipant) {
          list.push({
            id: data.id || d.id,
            participant: otherParticipant,
            lastMessage: data.lastMessage || {
              id: `msg-${Date.now()}`,
              conversationId: data.id,
              senderId: data.lastMessageSenderId || '',
              recipientId: userId,
              text: data.lastMessageText || '',
              createdAt: data.updatedAt || '',
            },
            unreadCount: (data.unreadRecipientId === userId ? data.unreadCount : 0) || 0,
          });
        }
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'conversations');
      onUpdate([]);
    }
  );

  return unsub;
}

/**
 * Real-time subscription to individual Messages inside a Conversation
 */
export function subscribeToConversationMessages(
  convId: string,
  onUpdate: (messages: ChatMessage[]) => void
): () => void {
  if (!convId) {
    onUpdate([]);
    return () => {};
  }

  const msgsRef = collection(db, 'conversations', convId, 'messages');
  const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(150));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          conversationId: data.conversationId || convId,
          senderId: data.senderId,
          recipientId: data.recipientId,
          text: data.text || '',
          createdAt: data.createdAt || '',
          imageUrl: data.imageUrl,
          sharedPostId: data.sharedPostId,
          sharedPostTitle: data.sharedPostTitle,
          isCollabRequest: Boolean(data.isCollabRequest),
          collabDetails: data.collabDetails,
          readAt: data.readAt || null,
          status: data.status || (data.readAt ? 'read' : 'sent'),
          attachmentUrl: data.attachmentUrl,
          attachmentType: data.attachmentType,
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `conversations/${convId}/messages`);
      onUpdate([]);
    }
  );

  return unsub;
}

/**
 * Send Direct Message in Firestore
 */
export async function sendFirestoreMessage(
  convId: string,
  msg: ChatMessage,
  sender: UserProfile,
  recipient: UserProfile
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  const senderId = currentAuthUser?.uid || sender.id;
  if (!senderId || !recipient.id) return;

  const convRef = doc(db, 'conversations', convId);
  const msgRef = doc(db, 'conversations', convId, 'messages', msg.id);

  try {
    const messagePayload: Record<string, any> = {
      id: msg.id,
      conversationId: convId,
      senderId,
      recipientId: recipient.id,
      text: msg.text || '',
      createdAt: msg.createdAt || new Date().toISOString(),
      readAt: null,
      status: 'sent',
      isCollabRequest: Boolean(msg.isCollabRequest),
    };

    if (msg.imageUrl) messagePayload.imageUrl = msg.imageUrl;
    if (msg.sharedPostId) messagePayload.sharedPostId = msg.sharedPostId;
    if (msg.sharedPostTitle) messagePayload.sharedPostTitle = msg.sharedPostTitle;
    if (msg.isCollabRequest && msg.collabDetails) {
      messagePayload.collabDetails = {
        projectTitle: msg.collabDetails.projectTitle || '',
        budget: msg.collabDetails.budget || '',
        timeline: msg.collabDetails.timeline || '',
        scope: msg.collabDetails.scope || '',
      };
    }

    await setDoc(msgRef, messagePayload);

    // Update parent conversation summary
    const convSnap = await getDoc(convRef);
    const existingData = convSnap.exists() ? convSnap.data() : {};
    const prevUnread = (existingData.unreadRecipientId === recipient.id ? existingData.unreadCount : 0) || 0;

    await setDoc(
      convRef,
      {
        id: convId,
        participantUids: [senderId, recipient.id],
        participants: [
          { ...sender, id: senderId },
          recipient
        ],
        lastMessage: messagePayload,
        lastMessageText: msg.text,
        lastMessageSenderId: senderId,
        unreadRecipientId: recipient.id,
        unreadCount: prevUnread + 1,
        isCollabRequest: Boolean(msg.isCollabRequest),
        updatedAt: new Date().toISOString(),
        createdAt: existingData.createdAt || new Date().toISOString(),
      },
      { merge: true }
    );

    // Trigger recipient notification
    await createFirestoreNotification(recipient.id, {
      id: `notif-dm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: msg.isCollabRequest ? 'collab_request' : 'message',
      actorId: senderId,
      actorName: sender.displayName || 'Creator',
      actorUsername: sender.username || 'creator',
      actorAvatar: sender.avatar || '',
      message: msg.isCollabRequest
        ? `collaboration request: "${msg.collabDetails?.projectTitle || 'Project'}"`
        : `sent a dispatch: "${msg.text.slice(0, 60)}"`,
      createdAt: new Date().toISOString(),
      read: false,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages/${msg.id}`);
  }
}

/**
 * Mark conversation messages as read when viewed by current user
 */
export async function markConversationMessagesRead(
  convId: string,
  currentUserId: string
): Promise<void> {
  const currentAuthUser = auth.currentUser;
  const effectiveUserId = currentAuthUser?.uid || currentUserId;
  if (!convId || !effectiveUserId || !currentAuthUser) return;

  try {
    const convRef = doc(db, 'conversations', convId);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists() && convSnap.data().unreadRecipientId === effectiveUserId) {
      await updateDoc(convRef, { unreadCount: 0 });
    }

    const msgsRef = collection(db, 'conversations', convId, 'messages');
    const q = query(
      msgsRef,
      where('recipientId', '==', effectiveUserId),
      where('readAt', '==', null)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      const nowIso = new Date().toISOString();
      const updatePromises = snap.docs.map((d) =>
        updateDoc(d.ref, { readAt: nowIso, status: 'read' })
      );
      await Promise.all(updatePromises);
    }
  } catch (err) {
    console.warn('Mark read notice:', err);
  }
}

/**
 * Real-time subscription to User Curatorial Collections
 */
export function subscribeToUserCollections(
  userId: string,
  onUpdate: (collections: UserCollection[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const colsRef = collection(db, 'users', userId, 'collections');
  const q = query(colsRef, orderBy('updatedAt', 'desc'), limit(30));

  const unsub = onSnapshot(
    q,
    (snapshot) => {
      const list: UserCollection[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: data.id || d.id,
          userId: data.userId || userId,
          title: data.title || 'Collection',
          description: data.description || '',
          isPrivate: Boolean(data.isPrivate),
          coverImage: data.coverImage,
          postIds: data.postIds || [],
          updatedAt: data.updatedAt || 'Just now',
        });
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}/collections`);
      onUpdate([]);
    }
  );

  return unsub;
}

/**
 * Create or save Curatorial Collection in Firestore
 */
export async function createFirestoreCollection(
  userId: string,
  col: UserCollection
): Promise<void> {
  if (!userId) return;
  const colRef = doc(db, 'users', userId, 'collections', col.id);
  try {
    await setDoc(colRef, {
      ...col,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `users/${userId}/collections/${col.id}`);
  }
}

/**
 * Remove Post from Collection in Firestore
 */
export async function removePostFromFirestoreCollection(
  userId: string,
  colId: string,
  postId: string
): Promise<void> {
  if (!userId || !colId) return;
  const colRef = doc(db, 'users', userId, 'collections', colId);
  try {
    const snap = await getDoc(colRef);
    if (snap.exists()) {
      const curPosts: string[] = snap.data().postIds || [];
      await updateDoc(colRef, {
        postIds: curPosts.filter((id) => id !== postId),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/collections/${colId}`);
  }
}

/**
 * Delete Curatorial Collection from Firestore
 */
export async function deleteFirestoreCollection(
  userId: string,
  colId: string
): Promise<void> {
  if (!userId || !colId) return;
  try {
    await deleteDoc(doc(db, 'users', userId, 'collections', colId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/collections/${colId}`);
  }
}

/**
 * Real-time Online Presence & Activity Heartbeat in Firestore
 */
export async function setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  try {
    await updateDoc(userRef, {
      onlineStatus: isOnline,
      lastActiveAt: new Date().toISOString(),
    });
  } catch (err) {
    // Silent fail if network was lost during tab unload
    console.warn('Presence status update note:', err);
  }
}

/**
 * Check if a user is currently active (active in the last 3 minutes)
 */
export function isUserActive(user?: UserProfile | { onlineStatus?: boolean; lastActiveAt?: string } | null): boolean {
  if (!user || !user.onlineStatus || !user.lastActiveAt) return false;
  const diff = Date.now() - new Date(user.lastActiveAt).getTime();
  return diff < 180000; // 3 minutes
}

/**
 * Real-Time Media Upload to Firebase Storage with Firestore Metadata Logging
 * Resilient: tracks progress, uploads to storage path `users/{uid}/{folder}/{id}_{filename}`,
 * registers metadata in `users/{uid}/uploads/{id}`, and seamlessly falls back to backend storage if needed.
 */
export async function uploadMediaToFirebaseStorage(
  file: File,
  userId: string,
  folder: string = 'media',
  onProgress?: (progressPercent: number) => void
): Promise<{ url: string; path: string; size: number; mimeType: string }> {
  const isVideo = file.type.startsWith('video');
  const safeBase = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 40);
  const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `users/${userId || 'guest'}/${folder}/${fileId}_${safeBase}`;

  // 1. Attempt upload to Firebase Storage
  try {
    const fileRef = storageRef(storage, storagePath);
    const uploadTask = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
      customMetadata: {
        userId,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
      },
    });

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (e) {
            reject(e);
          }
        }
      );
    });

    // Write metadata record to Firestore
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'uploads', fileId), {
          id: fileId,
          userId,
          url: downloadUrl,
          path: storagePath,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          type: isVideo ? 'video' : 'image',
          createdAt: new Date().toISOString(),
        });
      } catch (metaErr) {
        console.warn('Upload metadata record note:', metaErr);
      }
    }

    return {
      url: downloadUrl,
      path: storagePath,
      size: file.size,
      mimeType: file.type,
    };
  } catch (storageError) {
    console.warn('Firebase Storage upload direct attempt note, using resilient media vault:', storageError);

    // 2. Resilient fallback to backend multipart storage route
    const formData = new FormData();
    formData.append('files', file);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Media upload rejected by server with HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.success || !data.file) {
      throw new Error(data.error || 'Server did not return file URL');
    }

    if (onProgress) onProgress(100);

    // Write metadata record to Firestore
    if (userId) {
      try {
        await setDoc(doc(db, 'users', userId, 'uploads', fileId), {
          id: fileId,
          userId,
          url: data.file.url,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
          type: isVideo ? 'video' : 'image',
          createdAt: new Date().toISOString(),
        });
      } catch (metaErr) {
        console.warn('Fallback upload metadata record note:', metaErr);
      }
    }

    return {
      url: data.file.url,
      path: data.file.filename || storagePath,
      size: file.size,
      mimeType: file.type,
    };
  }
}

/**
 * Save Curatorial Open Call Submission to Firestore
 */
export async function submitCuratorialOpenCall(submission: {
  category: string;
  creatorName: string;
  email: string;
  location: string;
  projectTitle: string;
  year: string;
  description: string;
  aiTools: string;
  link: string;
}): Promise<void> {
  const subId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  try {
    await setDoc(doc(db, 'submissions', subId), {
      ...submission,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `submissions/${subId}`);
  }
}
