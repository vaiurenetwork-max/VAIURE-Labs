/**
 * IVNTRI Account Settings & Privacy Management Service
 * Manages user preferences, appearance, notifications, privacy,
 * and compliant account deletion workflows.
 */

import { db, doc, setDoc, getDoc, updateDoc } from '../lib/firebase';
import { UserSettings } from '../types/settings';

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'uid'> = {
  twoFactorEnabled: false,
  profileVisibility: 'PUBLIC',
  whoCanFollow: 'EVERYONE',
  whoCanMessage: 'FOLLOWED_ONLY',
  whoCanComment: 'EVERYONE',
  whoCanMention: 'EVERYONE',
  activityVisibility: true,
  onlineStatus: true,
  readReceipts: true,
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'STANDARD',
  theme: 'DARK',
  reducedMotion: false,
  animationIntensity: 'STANDARD',
  interfaceDensity: 'COMFORTABLE',
  notifications: {
    likes: true,
    comments: true,
    replies: true,
    follows: true,
    mentions: true,
    reposts: true,
    messages: true,
    collabRequests: true,
    editorialSelections: true,
    securityAlerts: true,
    transactionAlerts: true,
    walletAlerts: true,
    systemAnnouncements: true,
    emailDigest: true,
    pushEnabled: false,
  },
  updatedAt: new Date().toISOString(),
};

/**
 * Fetch settings for authenticated user
 */
export async function fetchUserSettings(uid: string): Promise<UserSettings> {
  try {
    const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_USER_SETTINGS,
        ...(snap.data() as UserSettings),
        uid,
      };
    }
  } catch (err) {
    console.warn('Settings load note:', err);
  }

  return {
    ...DEFAULT_USER_SETTINGS,
    uid,
  };
}

/**
 * Persist user settings to Firestore
 */
export async function saveUserSettings(
  uid: string,
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const settingsDocRef = doc(db, 'users', uid, 'settings', 'preferences');
  const payload = {
    ...settings,
    uid,
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(settingsDocRef, payload, { merge: true });
  } catch (err) {
    console.error('Failed to save user settings:', err);
    throw err;
  }

  return payload as UserSettings;
}

/**
 * Request account deletion with 30-day grace period
 * Preserves financial transaction records for compliance as required.
 */
export async function requestAccountDeletion(
  uid: string,
  reason?: string
): Promise<{ status: string; gracePeriodDays: number }> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      status: 'DELETION_PENDING',
      deletionRequestedAt: new Date().toISOString(),
      deletionReason: reason || 'User requested account closure',
      updatedAt: new Date().toISOString(),
    });

    // Notify backend deletion queue endpoint
    await fetch('/api/auth/account/delete-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, reason }),
    }).catch(() => {});

    return { status: 'DELETION_PENDING', gracePeriodDays: 30 };
  } catch (err) {
    console.error('Failed to request account deletion:', err);
    throw err;
  }
}
