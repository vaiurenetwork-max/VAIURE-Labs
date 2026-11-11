import { useState, useEffect, useCallback } from 'react';
import {
  SocialPost,
  UserProfile,
  UserCollection,
  SocialNotification,
  Conversation,
  PostComment,
  ChatMessage,
} from '../types/social';
import {
  auth,
  onAuthStateChanged,
  User,
} from '../lib/firebase';
import {
  fetchUserProfile,
  ensureUserProfile,
  signOutCurrentSession,
  updateProfileData,
  AuthState,
} from './authService';
import {
  subscribeToFirestorePosts,
  subscribeToFirestoreCreators,
  createFirestorePost,
  toggleFirestorePostLike,
  toggleFirestorePostSave,
  toggleFirestoreFollow,
  createFirestoreRepost,
  addFirestoreComment,
  deleteFirestoreComment,
  updateFirestoreCommentLikes,
  subscribeToFirestoreNotifications,
  markAllNotificationsReadInFirestore,
  subscribeToFirestoreConversations,
  sendFirestoreMessage,
  subscribeToUserCollections,
  createFirestoreCollection,
  removePostFromFirestoreCollection,
  setUserOnlineStatus,
  isUserActive,
} from './firestoreSocialService';

export const EMPTY_USER: UserProfile = {
  id: '',
  username: '',
  displayName: '',
  avatar: '',
  role: 'GUEST',
  bio: '',
  location: '',
  website: '',
  followersCount: 0,
  followingCount: 0,
  postsCount: 0,
  aiSpecialties: [],
  collections: [],
};

// Clean out stale demo keys if they exist from older sessions
if (typeof window !== 'undefined') {
  try {
    const isCleaned = localStorage.getItem('ivntri_v2_clean_real');
    if (!isCleaned) {
      localStorage.removeItem('ivntri_social_posts');
      localStorage.removeItem('ivntri_creators');
      localStorage.removeItem('ivntri_comments');
      localStorage.removeItem('ivntri_notifications');
      localStorage.removeItem('ivntri_conversations');
      localStorage.removeItem('ivntri_submissions');
      localStorage.setItem('ivntri_v2_clean_real', 'true');
    }
  } catch {
    // ignore
  }
}

export function useSocialStore() {
  const [authState, setAuthState] = useState<AuthState>('LOADING');
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Pure real Firestore state - zero mock fallback
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(EMPTY_USER);
  const [creators, setCreators] = useState<Record<string, UserProfile>>({});
  const [comments, setComments] = useState<Record<string, PostComment[]>>({});
  const [notifications, setNotifications] = useState<SocialNotification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [mutedUsers, setMutedUsers] = useState<string[]>([]);
  const [reportedPosts, setReportedPosts] = useState<string[]>([]);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        setAuthState('AUTHENTICATED');
        try {
          let profile = await fetchUserProfile(user.uid);
          if (!profile) {
            profile = await ensureUserProfile(user);
          }
          if (profile) {
            setCurrentUser(profile);
          }
        } catch (e) {
          console.warn('Auth user profile sync note:', e);
        }
      } else {
        setAuthState('UNAUTHENTICATED');
        setCurrentUser(EMPTY_USER);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Real-time Firestore Posts subscription
  useEffect(() => {
    const unsubPosts = subscribeToFirestorePosts((livePosts) => {
      setPosts(livePosts || []);
    });

    return () => unsubPosts();
  }, []);

  // 3. Real-time Firestore Creators subscription
  useEffect(() => {
    const unsubCreators = subscribeToFirestoreCreators((liveCreators) => {
      setCreators(liveCreators || {});
    });

    return () => unsubCreators();
  }, []);

  // 4. Real-time Firestore Notifications subscription for current user
  useEffect(() => {
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }
    const unsubNotifs = subscribeToFirestoreNotifications(currentUser.id, (liveNotifs) => {
      setNotifications(liveNotifs);
    });

    return () => unsubNotifs();
  }, [currentUser?.id]);

  // 5. Real-time Firestore Conversations subscription
  useEffect(() => {
    if (!currentUser?.id) {
      setConversations([]);
      return;
    }
    const unsubConvs = subscribeToFirestoreConversations(currentUser.id, (liveConvs) => {
      setConversations(liveConvs);
    });

    return () => unsubConvs();
  }, [currentUser?.id]);

  // 6. Real-time Firestore Collections subscription for current user
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubCols = subscribeToUserCollections(currentUser.id, (liveCols) => {
      setCurrentUser((u) => ({
        ...u,
        collections: liveCols,
      }));
    });

    return () => unsubCols();
  }, [currentUser?.id]);

  // 7. Real-time Online Presence & Activity Heartbeat
  useEffect(() => {
    if (!currentUser?.id) return;

    // Immediately mark active in Firestore
    setUserOnlineStatus(currentUser.id, true);

    // Periodic heartbeat every 45 seconds to keep presence fresh
    const interval = setInterval(() => {
      setUserOnlineStatus(currentUser.id, true);
    }, 45000);

    const handleBeforeUnload = () => {
      setUserOnlineStatus(currentUser.id, false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setUserOnlineStatus(currentUser.id, false);
      } else if (document.visibilityState === 'visible') {
        setUserOnlineStatus(currentUser.id, true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setUserOnlineStatus(currentUser.id, false);
    };
  }, [currentUser?.id]);

  // Actions
  const toggleLikePost = useCallback((postId: string) => {
    if (!currentUser.id) return;
    let targetPost: SocialPost | undefined;
    let willLike = false;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        targetPost = p;
        willLike = !p.isLiked;
        return {
          ...p,
          isLiked: willLike,
          likesCount: willLike ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );

    if (targetPost) {
      toggleFirestorePostLike(
        postId,
        currentUser,
        !willLike,
        (targetPost as SocialPost).likesCount,
        (targetPost as SocialPost).authorId,
        (targetPost as SocialPost).title
      ).catch((err) => console.warn('Firestore like sync notice:', err));
    }
  }, [currentUser]);

  const toggleSavePost = useCallback((postId: string, collectionId?: string) => {
    if (!currentUser.id) return;
    let targetPost: SocialPost | undefined;
    let willSave = false;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        targetPost = p;
        willSave = !p.isSaved;
        return {
          ...p,
          isSaved: willSave,
          savesCount: willSave ? p.savesCount + 1 : Math.max(0, p.savesCount - 1),
        };
      })
    );

    setCurrentUser((prev) => {
      const targetColId = collectionId || prev.collections[0]?.id || 'vault';
      const updatedCols = prev.collections.map((col) => {
        if (col.id === targetColId) {
          const hasPost = col.postIds.includes(postId);
          return {
            ...col,
            postIds: hasPost
              ? col.postIds.filter((id) => id !== postId)
              : [...col.postIds, postId],
            updatedAt: 'Just now',
          };
        }
        return col;
      });
      return { ...prev, collections: updatedCols };
    });

    if (targetPost) {
      toggleFirestorePostSave(
        postId,
        currentUser,
        !willSave,
        (targetPost as SocialPost).savesCount,
        collectionId
      ).catch((err) => console.warn('Firestore save sync notice:', err));
    }
  }, [currentUser]);

  const toggleFollowCreator = useCallback((username: string) => {
    if (!currentUser.id) return;
    let targetCreator: UserProfile | undefined;
    let willFollow = false;

    setCreators((prev) => {
      const creator =
        prev[username] || (Object.values(prev) as UserProfile[]).find((c) => c.username === username);
      if (!creator) return prev;
      targetCreator = creator;
      willFollow = !creator.isFollowing;
      const updatedCreator = {
        ...creator,
        isFollowing: willFollow,
        followersCount: willFollow
          ? creator.followersCount + 1
          : Math.max(0, creator.followersCount - 1),
      };

      setCurrentUser((u) => ({
        ...u,
        followingCount: willFollow ? u.followingCount + 1 : Math.max(0, u.followingCount - 1),
      }));

      return { ...prev, [creator.username]: updatedCreator };
    });

    if (targetCreator) {
      toggleFirestoreFollow(currentUser, targetCreator, !willFollow).catch((err) =>
        console.warn('Firestore follow sync notice:', err)
      );
    }
  }, [currentUser]);

  const repostPost = useCallback((postId: string, quote?: string) => {
    if (!currentUser.id) return;
    const orig = posts.find((p) => p.id === postId);
    if (!orig) return;

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, repostsCount: p.repostsCount + 1, isReposted: true } : p))
    );

    const newRepost: SocialPost = {
      id: `repost-${Date.now()}`,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      authorVerified: true,
      title: orig.title,
      caption: quote || orig.caption,
      category: orig.category,
      postType: orig.postType,
      media: orig.media,
      tags: orig.tags,
      aiTools: orig.aiTools,
      aiAttribution: orig.aiAttribution,
      collaborators: orig.collaborators,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
      originalPost: {
        id: orig.id,
        authorName: orig.authorName,
        authorUsername: orig.authorUsername,
        authorAvatar: orig.authorAvatar,
        title: orig.title,
        createdAt: orig.createdAt,
      },
      repostedBy: {
        username: currentUser.username,
        name: currentUser.displayName,
        comment: quote,
      },
    };

    setPosts((prev) => [newRepost, ...prev]);

    createFirestoreRepost(newRepost, orig.id, orig.repostsCount, orig.authorId).catch((err) =>
      console.warn('Firestore repost sync notice:', err)
    );
  }, [currentUser, posts]);

  const addComment = useCallback((postId: string, content: string, parentId?: string | null) => {
    if (!currentUser.id || !content.trim()) return;

    const newComment: PostComment = {
      id: `comm-${Date.now()}`,
      postId,
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      authorUsername: currentUser.username,
      authorAvatar: currentUser.avatar,
      content,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      parentId: parentId || null,
      replies: [],
    };

    setComments((prev) => {
      const existing = prev[postId] || [];
      if (parentId) {
        const updated = existing.map((c) => {
          if (c.id === parentId) {
            return {
              ...c,
              replies: [...(c.replies || []), newComment],
            };
          }
          return c;
        });
        return { ...prev, [postId]: updated };
      }
      return { ...prev, [postId]: [newComment, ...existing] };
    });

    const targetPost = posts.find((p) => p.id === postId);
    const curCommentsCount = targetPost ? targetPost.commentsCount : 0;

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
    );

    addFirestoreComment(
      newComment,
      curCommentsCount,
      targetPost?.authorId,
      targetPost?.title
    ).catch((err) => console.warn('Firestore comment sync notice:', err));
  }, [currentUser, posts]);

  const likeComment = useCallback((postId: string, commentId: string) => {
    let newLikes = 0;
    setComments((prev) => {
      const list = prev[postId] || [];
      const updateList = (items: PostComment[]): PostComment[] =>
        items.map((c) => {
          if (c.id === commentId) {
            const isLiked = !c.isLiked;
            newLikes = isLiked ? c.likesCount + 1 : Math.max(0, c.likesCount - 1);
            return {
              ...c,
              isLiked,
              likesCount: newLikes,
            };
          }
          if (c.replies && c.replies.length > 0) {
            return { ...c, replies: updateList(c.replies) };
          }
          return c;
        });
      return { ...prev, [postId]: updateList(list) };
    });

    updateFirestoreCommentLikes(postId, commentId, newLikes).catch((err) =>
      console.warn('Firestore comment like notice:', err)
    );
  }, []);

  const deleteComment = useCallback((postId: string, commentId: string) => {
    setComments((prev) => {
      const list = prev[postId] || [];
      const filterList = (items: PostComment[]): PostComment[] =>
        items
          .filter((c) => c.id !== commentId)
          .map((c) => (c.replies ? { ...c, replies: filterList(c.replies) } : c));
      return { ...prev, [postId]: filterList(list) };
    });

    const targetPost = posts.find((p) => p.id === postId);
    const curCommentsCount = targetPost ? targetPost.commentsCount : 1;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: Math.max(0, p.commentsCount - 1) } : p
      )
    );

    deleteFirestoreComment(postId, commentId, curCommentsCount).catch((err) =>
      console.warn('Firestore comment delete notice:', err)
    );
  }, [posts]);

  const createPost = useCallback((
    post: Omit<SocialPost, 'id' | 'createdAt' | 'likesCount' | 'commentsCount' | 'repostsCount' | 'savesCount'>
  ) => {
    const newPost: SocialPost = {
      ...post,
      id: `post-${Date.now()}`,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
    };

    setPosts((prev) => [newPost, ...prev]);

    setCurrentUser((u) => ({
      ...u,
      postsCount: u.postsCount + 1,
    }));

    createFirestorePost(newPost).catch((err) =>
      console.warn('Firestore post creation notice:', err)
    );

    return newPost;
  }, []);

  const createCollection = useCallback((title: string, description: string, isPrivate: boolean) => {
    if (!currentUser.id) return;
    const newCol: UserCollection = {
      id: `col-${Date.now()}`,
      userId: currentUser.id,
      title,
      description,
      isPrivate,
      postIds: [],
      updatedAt: 'Just now',
    };
    setCurrentUser((u) => ({
      ...u,
      collections: [newCol, ...u.collections],
    }));

    // Real-time Firestore sync
    createFirestoreCollection(currentUser.id, newCol).catch((err) =>
      console.warn('Firestore collection creation notice:', err)
    );

    return newCol;
  }, [currentUser.id]);

  const removePostFromCollection = useCallback((postId: string, collectionId: string) => {
    if (!currentUser.id) return;
    setCurrentUser((u) => ({
      ...u,
      collections: u.collections.map((c) =>
        c.id === collectionId
          ? { ...c, postIds: c.postIds.filter((id) => id !== postId), updatedAt: 'Just now' }
          : c
      ),
    }));

    removePostFromFirestoreCollection(currentUser.id, collectionId, postId).catch((err) =>
      console.warn('Firestore remove post from collection notice:', err)
    );
  }, [currentUser.id]);

  const sendMessage = useCallback((
    convId: string,
    text: string,
    isCollabRequest?: boolean,
    collabDetails?: ChatMessage['collabDetails'],
    sharedPostId?: string,
    sharedPostTitle?: string,
    explicitRecipient?: UserProfile
  ) => {
    const currentUid = auth.currentUser?.uid || currentUser.id;
    if (!currentUid) return;

    const targetConv = conversations.find((c) => c.id === convId);
    const recipient = explicitRecipient || targetConv?.participant;
    if (!recipient) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: convId,
      senderId: currentUid,
      recipientId: recipient.id,
      text,
      createdAt: new Date().toISOString(),
      isCollabRequest: Boolean(isCollabRequest),
      ...(collabDetails ? { collabDetails } : {}),
      ...(sharedPostId ? { sharedPostId } : {}),
      ...(sharedPostTitle ? { sharedPostTitle } : {}),
      readAt: null,
      status: 'sent',
    };

    setConversations((prev) => {
      const exists = prev.some((c) => c.id === convId);
      if (exists) {
        return prev.map((c) => (c.id === convId ? { ...c, lastMessage: newMsg } : c));
      }
      return [
        {
          id: convId,
          participant: recipient,
          lastMessage: newMsg,
          unreadCount: 0,
        },
        ...prev,
      ];
    });

    sendFirestoreMessage(convId, newMsg, { ...currentUser, id: currentUid }, recipient).catch((err) =>
      console.warn('Firestore message dispatch notice:', err)
    );
  }, [conversations, currentUser]);

  const markNotificationsRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    if (currentUser?.id && unreadIds.length > 0) {
      markAllNotificationsReadInFirestore(currentUser.id, unreadIds).catch((err) =>
        console.warn('Firestore mark read notice:', err)
      );
    }
  }, [currentUser?.id, notifications]);

  const reportPost = useCallback((postId: string, _reason: string) => {
    setReportedPosts((prev) => [...new Set([...prev, postId])]);
  }, []);

  const blockUser = useCallback((userId: string) => {
    setBlockedUsers((prev) => [...new Set([...prev, userId])]);
  }, []);

  const muteUser = useCallback((userId: string) => {
    setMutedUsers((prev) => [...new Set([...prev, userId])]);
  }, []);

  const signOutUser = useCallback(async () => {
    await signOutCurrentSession();
    setCurrentUser(EMPTY_USER);
  }, []);

  const visiblePosts = posts.filter(
    (p) => !blockedUsers.includes(p.authorId) && !reportedPosts.includes(p.id)
  );

  const updateCurrentUsername = useCallback((newUsername: string, lastUsernameChangeAt: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      username: newUsername,
      lastUsernameChangeAt,
    }));
  }, []);

  const updateCurrentUserProfile = useCallback(
    async (updates: {
      displayName?: string;
      bio?: string;
      location?: string;
      website?: string;
      avatar?: string;
    }) => {
      if (!currentUser.id) return;
      const updatePayload: Record<string, any> = {};
      if (updates.displayName !== undefined) updatePayload.displayName = updates.displayName.trim();
      if (updates.bio !== undefined) updatePayload.bio = updates.bio.trim();
      if (updates.location !== undefined) updatePayload.location = updates.location.trim();
      if (updates.website !== undefined) updatePayload.website = updates.website.trim();
      if (updates.avatar !== undefined) updatePayload.photoURL = updates.avatar;

      await updateProfileData(currentUser.id, updatePayload as any);

      setCurrentUser((prev) => ({
        ...prev,
        displayName: updates.displayName !== undefined ? updates.displayName.trim() : prev.displayName,
        bio: updates.bio !== undefined ? updates.bio.trim() : prev.bio,
        location: updates.location !== undefined ? updates.location.trim() : prev.location,
        website: updates.website !== undefined ? updates.website.trim() : prev.website,
        avatar: updates.avatar !== undefined ? updates.avatar : prev.avatar,
      }));

      if (currentUser.username) {
        setCreators((prev) => {
          if (!prev[currentUser.username]) return prev;
          return {
            ...prev,
            [currentUser.username]: {
              ...prev[currentUser.username],
              displayName: updates.displayName !== undefined ? updates.displayName.trim() : prev[currentUser.username].displayName,
              bio: updates.bio !== undefined ? updates.bio.trim() : prev[currentUser.username].bio,
              location: updates.location !== undefined ? updates.location.trim() : prev[currentUser.username].location,
              website: updates.website !== undefined ? updates.website.trim() : prev[currentUser.username].website,
              avatar: updates.avatar !== undefined ? updates.avatar : prev[currentUser.username].avatar,
            },
          };
        });
      }
    },
    [currentUser]
  );

  return {
    posts: visiblePosts,
    allPosts: posts,
    currentUser,
    creators,
    comments,
    notifications,
    conversations,
    blockedUsers,
    mutedUsers,
    reportedPosts,
    authState,
    firebaseUser,
    toggleLikePost,
    toggleSavePost,
    toggleFollowCreator,
    repostPost,
    addComment,
    likeComment,
    deleteComment,
    createPost,
    createCollection,
    removePostFromCollection,
    sendMessage,
    markNotificationsRead,
    reportPost,
    blockUser,
    muteUser,
    signOutUser,
    isUserActive,
    updateCurrentUsername,
    updateCurrentUserProfile,
  };
}
