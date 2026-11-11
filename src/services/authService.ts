/**
 * IVNTRI Firebase Authentication Service
 * Complete production-ready auth architecture for accounts, username reservation,
 * Google Sign-In, Email/Password, Password Reset, and profile persistence.
 */

import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { UserProfile } from '../types/social';

export type AuthState = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'AUTHENTICATION_ERROR';

export type AccountType =
  | 'USER'
  | 'CREATOR'
  | 'ARTIST'
  | 'FILMMAKER'
  | 'PHOTOGRAPHER'
  | 'STUDIO'
  | 'BRAND'
  | 'EDITOR'
  | 'ADMIN';

export interface UserDocData {
  uid: string;
  username: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  website: string;
  location: string;
  role: string;
  accountType: AccountType;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: string;
  lastUsernameChangeAt?: string;
  aiSpecialties?: string[];
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  const norm = normalizeUsername(username);
  if (norm.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (norm.length > 30) {
    return { valid: false, error: 'Username cannot exceed 30 characters' };
  }
  if (!/^[a-z0-9_.-]+$/.test(norm)) {
    return { valid: false, error: 'Username can only contain letters, numbers, underscores, dashes, and periods' };
  }
  return { valid: true };
}

/**
 * Check if a normalized username is already taken in the Firestore usernames registry
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const norm = normalizeUsername(username);
  if (!norm) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', norm));
    return !snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `usernames/${norm}`);
    return false;
  }
}

/**
 * Fetch a user profile document from Firestore by UID
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return null;
    const data = userSnap.data() as UserDocData;

    const isDesignatedAdmin =
      data.email === 'rachvan420@gmail.com' ||
      data.role === 'ADMIN' ||
      data.role === 'SUPER_ADMIN';

    return {
      id: data.uid,
      username: data.username,
      displayName: data.displayName,
      email: data.email,
      avatar: data.photoURL || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`,
      role: isDesignatedAdmin ? 'SUPER_ADMIN' : (data.role || data.accountType),
      specialBadge: isDesignatedAdmin ? 'ADMINISTRATOR' : (data as any).specialBadge,
      verified: isDesignatedAdmin ? true : Boolean(data.verified),
      bio: data.bio || '',
      location: data.location || 'GLOBAL // ARCHIVE',
      website: data.website || '',
      followersCount: data.followersCount || 0,
      followingCount: data.followingCount || 0,
      postsCount: data.postsCount || 0,
      aiSpecialties: data.aiSpecialties || ['Generative Fashion', 'Synthetic Cinema'],
      collections: [],
      lastUsernameChangeAt: data.lastUsernameChangeAt || undefined,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    return null;
  }
}

/**
 * Register a new user with Email + Password, atomic username reservation, and Firestore user profile doc
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  rawUsername: string,
  displayName: string,
  accountType: AccountType = 'CREATOR'
): Promise<UserProfile> {
  const norm = normalizeUsername(rawUsername);
  const validation = validateUsername(norm);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid username');
  }

  // Check username availability
  const isAvailable = await checkUsernameAvailable(norm);
  if (!isAvailable) {
    throw new Error(`Username @${norm} is already reserved by another creator`);
  }

  // Create Firebase Auth user
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  const user = userCredential.user;

  // Send email verification
  try {
    await sendEmailVerification(user);
  } catch (e) {
    console.warn('Email verification send note:', e);
  }

  const nowIso = new Date().toISOString();
  const avatarUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`;

  // Reserve username
  await setDoc(doc(db, 'usernames', norm), {
    uid: user.uid,
    username: norm,
    createdAt: nowIso,
  });

  // Create user document
  const userDoc: UserDocData = {
    uid: user.uid,
    username: norm,
    displayName: displayName.trim() || norm.toUpperCase(),
    email: user.email || email,
    photoURL: avatarUrl,
    bio: 'Visual director & digital curator at the frontier of artificial intelligence.',
    website: 'https://ivntri.com',
    location: 'PARIS // TOKYO',
    role: accountType,
    accountType,
    verified: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastActiveAt: nowIso,
    aiSpecialties: ['Haute Couture', 'Sora Cinema', 'Runway AI'],
  };

  await setDoc(doc(db, 'users', user.uid), userDoc);

  return {
    id: user.uid,
    username: userDoc.username,
    displayName: userDoc.displayName,
    avatar: userDoc.photoURL,
    role: userDoc.role,
    bio: userDoc.bio,
    location: userDoc.location,
    website: userDoc.website,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    aiSpecialties: userDoc.aiSpecialties || [],
    collections: [],
  };
}

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, pass: string): Promise<UserProfile> {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  const user = credential.user;

  // Try to fetch profile
  let profile = await fetchUserProfile(user.uid);
  if (!profile) {
    // Self-heal profile if missing
    profile = await ensureUserProfile(user);
  }
  return profile;
}

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle(): Promise<UserProfile | null> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;
    return await ensureUserProfile(user);
  } catch (err: any) {
    if (
      err?.code === 'auth/popup-closed-by-user' ||
      err?.code === 'auth/cancelled-popup-request' ||
      err?.message?.includes('popup-closed-by-user') ||
      err?.message?.includes('cancelled-popup-request')
    ) {
      console.info('Google Sign-In popup closed by user.');
      return null;
    }
    if (err?.code === 'auth/popup-blocked') {
      console.warn('Google Sign-In popup was blocked by browser.');
      throw new Error('Sign-in popup was blocked by your browser. Please allow popups or use email sign-in.');
    }
    throw err;
  }
}

/**
 * Sign in Anonymously as a Guest Creator with an instantly provisioned real-time profile in Firestore
 */
export async function loginAnonymously(): Promise<UserProfile> {
  const credential = await signInAnonymously(auth);
  const user = credential.user;
  return await ensureUserProfile(user);
}

/**
 * Ensure user document exists in Firestore for any authenticated user (e.g. Google Sign-In)
 */
export async function ensureUserProfile(user: User): Promise<UserProfile> {
  let profile = await fetchUserProfile(user.uid);
  if (profile) return profile;

  // Generate unique initial username from email or display name
  const rawBase = user.displayName || (user.email ? user.email.split('@')[0] : 'creator');
  let baseUsername = normalizeUsername(rawBase);
  if (baseUsername.length < 3) baseUsername = `creator_${user.uid.substring(0, 5)}`;

  // Test username availability
  let finalUsername = baseUsername;
  let counter = 1;
  while (!(await checkUsernameAvailable(finalUsername))) {
    finalUsername = `${baseUsername}_${counter}`;
    counter++;
    if (counter > 10) {
      finalUsername = `${baseUsername}_${Date.now().toString(36).substring(2, 6)}`;
      break;
    }
  }

  const nowIso = new Date().toISOString();
  const avatarUrl =
    user.photoURL ||
    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80`;

  // Reserve username
  await setDoc(doc(db, 'usernames', finalUsername), {
    uid: user.uid,
    username: finalUsername,
    createdAt: nowIso,
  });

  const isDesignatedAdmin = user.email === 'rachvan420@gmail.com';
  const role = isDesignatedAdmin ? 'ADMIN' : 'CREATOR';

  const userDoc: UserDocData = {
    uid: user.uid,
    username: finalUsername,
    displayName: user.displayName || finalUsername.toUpperCase(),
    email: user.email || '',
    photoURL: avatarUrl,
    bio: isDesignatedAdmin
      ? 'VAIURE 唯昱尔 Principal Visual Culture Director & AI Lead.'
      : 'Curator & visual storyteller at the intersection of AI, fashion and film.',
    website: 'https://vaiure.art',
    location: isDesignatedAdmin ? 'GLOBAL // ARCHIVE' : 'NEW YORK // LONDON',
    role,
    accountType: role,
    verified: isDesignatedAdmin,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    lastActiveAt: nowIso,
    aiSpecialties: ['Midjourney v7', 'Flux Pro', 'Gen-3 Alpha'],
  };

  await setDoc(doc(db, 'users', user.uid), userDoc);

  return {
    id: user.uid,
    username: finalUsername,
    displayName: userDoc.displayName,
    avatar: avatarUrl,
    role: userDoc.role,
    bio: userDoc.bio,
    location: userDoc.location,
    website: userDoc.website,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    aiSpecialties: userDoc.aiSpecialties || [],
    collections: [],
  };
}

/**
 * Send Password Reset Email
 */
export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Sign Out
 */
export async function signOutCurrentSession(): Promise<void> {
  await signOut(auth);
}

/**
 * Update Profile in Firestore
 */
export async function updateProfileData(uid: string, updates: Partial<UserDocData>): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
  }
}

export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface UsernameCooldownStatus {
  canChange: boolean;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  nextAllowedDate: Date | null;
  formattedMessage: string;
}

export interface UsernameChangeResult {
  success: boolean;
  error?: string;
  newUsername?: string;
  nextAllowedDate?: string;
}

/**
 * Calculate if a user is eligible to change username (enforcing 1-week cooldown)
 */
export function getUsernameChangeCooldown(lastChangedAt?: string | null): UsernameCooldownStatus {
  if (!lastChangedAt) {
    return {
      canChange: true,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAllowedDate: null,
      formattedMessage: 'You are eligible to update your handle at any time.',
    };
  }

  const lastTime = new Date(lastChangedAt).getTime();
  if (isNaN(lastTime)) {
    return {
      canChange: true,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAllowedDate: null,
      formattedMessage: 'You are eligible to update your handle at any time.',
    };
  }

  const nextAllowedTime = lastTime + ONE_WEEK_MS;
  const now = Date.now();
  const diffMs = nextAllowedTime - now;

  if (diffMs <= 0) {
    return {
      canChange: true,
      remainingDays: 0,
      remainingHours: 0,
      remainingMinutes: 0,
      nextAllowedDate: new Date(nextAllowedTime),
      formattedMessage: 'You are eligible to update your handle now.',
    };
  }

  const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  let timeString = '';
  if (remainingDays > 0) {
    timeString = `${remainingDays}d ${remainingHours}h`;
  } else if (remainingHours > 0) {
    timeString = `${remainingHours}h ${remainingMinutes}m`;
  } else {
    timeString = `${Math.max(1, remainingMinutes)}m`;
  }

  return {
    canChange: false,
    remainingDays,
    remainingHours,
    remainingMinutes,
    nextAllowedDate: new Date(nextAllowedTime),
    formattedMessage: `Username can only be changed once every 7 days. Next change available in ${timeString}.`,
  };
}

/**
 * Change Username with atomic reservation, releasing old handle, and enforcing 1-week policy
 */
export async function changeUsername(
  uid: string,
  newUsernameRaw: string
): Promise<UsernameChangeResult> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser || currentAuthUser.uid !== uid) {
    return { success: false, error: 'Authentication required. Please sign in to change your username.' };
  }

  const norm = normalizeUsername(newUsernameRaw);
  const validation = validateUsername(norm);
  if (!validation.valid) {
    return { success: false, error: validation.error || 'Invalid username format.' };
  }

  // 1. Fetch current user document
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    return { success: false, error: 'User profile record not found.' };
  }

  const userData = userSnap.data();
  const currentUsername = userData.username;

  if (norm === currentUsername) {
    return { success: false, error: 'The requested handle is identical to your current handle.' };
  }

  // 2. Enforce 1-week cooldown policy
  const cooldown = getUsernameChangeCooldown(userData.lastUsernameChangeAt);
  if (!cooldown.canChange) {
    return {
      success: false,
      error: cooldown.formattedMessage,
      nextAllowedDate: cooldown.nextAllowedDate?.toISOString(),
    };
  }

  // 3. Check username availability in registry
  const isAvailable = await checkUsernameAvailable(norm);
  if (!isAvailable) {
    return { success: false, error: `@${norm} is already reserved by another creator.` };
  }

  const nowIso = new Date().toISOString();

  // 4. Reserve new username record
  const newUsernameRef = doc(db, 'usernames', norm);
  await setDoc(newUsernameRef, {
    uid,
    username: norm,
    createdAt: nowIso,
  });

  // 5. Update user profile document
  await updateDoc(userRef, {
    username: norm,
    lastUsernameChangeAt: nowIso,
    updatedAt: nowIso,
  });

  // 6. Release old username so other creators can register it
  if (currentUsername && currentUsername !== norm) {
    try {
      const oldUsernameRef = doc(db, 'usernames', currentUsername);
      await deleteDoc(oldUsernameRef);
    } catch (cleanupErr) {
      console.warn('Old username release note:', cleanupErr);
    }
  }

  return {
    success: true,
    newUsername: norm,
    nextAllowedDate: new Date(Date.now() + ONE_WEEK_MS).toISOString(),
  };
}
