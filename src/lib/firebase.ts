import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  signInAnonymously
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc as rawSetDoc,
  getDoc,
  getDocFromServer,
  updateDoc as rawUpdateDoc,
  collection,
  addDoc as rawAddDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  deleteDoc as rawDeleteDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  orderBy,
  limit,
  writeBatch as rawWriteBatch,
  DocumentReference,
  CollectionReference,
  SetOptions,
  UpdateData,
  WithFieldValue
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  StorageReference,
  UploadTask,
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export { storageRef, uploadBytesResumable, getDownloadURL, deleteObject };
export type { StorageReference, UploadTask };

const dbConfig = firebaseConfig as Record<string, any>;
const dbId = dbConfig.firestoreDatabaseId && dbConfig.firestoreDatabaseId !== '(default)'
  ? (dbConfig.firestoreDatabaseId as string)
  : undefined;

// Following Firebase Skill requirement: export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Validate Connection to Firestore (Firebase Skill Requirement)
export async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase configuration check: client is offline.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection().catch(() => {});
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const QUOTA_STORAGE_KEY = 'ivntri_firestore_quota_exceeded';
const QUOTA_TIME_KEY = 'ivntri_firestore_quota_time';

// Default to live online mode (never block writes artificially)
let firestoreQuotaExceeded = false;
let quotaExceededTimestamp = 0;

if (typeof window !== 'undefined') {
  try {
    // Clear stale quota lockouts from previous sessions so all users can sync immediately
    localStorage.removeItem(QUOTA_STORAGE_KEY);
    localStorage.removeItem(QUOTA_TIME_KEY);
  } catch (e) {
    // ignore storage access restrictions
  }
}

const quotaListeners = new Set<(exceeded: boolean) => void>();

export function isFirestoreQuotaExceeded(): boolean {
  if (firestoreQuotaExceeded) {
    // Auto-recover after 30 seconds to re-test live operations smoothly
    if (Date.now() - quotaExceededTimestamp > 30000) {
      firestoreQuotaExceeded = false;
      quotaExceededTimestamp = 0;
      quotaListeners.forEach((fn) => {
        try {
          fn(false);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  return firestoreQuotaExceeded;
}

export function markFirestoreQuotaExceeded(): void {
  firestoreQuotaExceeded = true;
  quotaExceededTimestamp = Date.now();

  quotaListeners.forEach((fn) => {
    try {
      fn(true);
    } catch (e) {
      console.error(e);
    }
  });

  // Schedule automatic reset check
  setTimeout(() => {
    if (Date.now() - quotaExceededTimestamp >= 30000) {
      firestoreQuotaExceeded = false;
      quotaListeners.forEach((fn) => {
        try {
          fn(false);
        } catch (e) {
          console.error(e);
        }
      });
    }
  }, 30500);
}

export function subscribeToQuotaState(listener: (exceeded: boolean) => void): () => void {
  quotaListeners.add(listener);
  listener(firestoreQuotaExceeded);
  return () => {
    quotaListeners.delete(listener);
  };
}

export function isTransientDatabaseError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes('database is closing') ||
    msg.includes('closing/hidden') ||
    msg.includes('connection is closing') ||
    msg.includes('the client is offline') ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota limit exceeded') ||
    msg.includes('quota exceeded') ||
    msg.includes('free daily write units')
  );
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  if (
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('Quota limit exceeded') ||
    errMsg.includes('Free daily write units')
  ) {
    markFirestoreQuotaExceeded();
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isTransientDatabaseError(error)) {
    console.warn('Firestore Transient State Notice:', JSON.stringify(errInfo));
    return errInfo;
  }

  if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('denied')) {
    console.error('Firestore Permission Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  console.warn('Firestore Operation Notice:', JSON.stringify(errInfo));
  return errInfo;
}

// Helper: check if an error is quota related
function isQuotaError(err: any): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units')
  );
}

// Safe recursive undefined stripper so Firestore setDoc/updateDoc never errors on undefined
export function removeUndefinedValues<T = any>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedValues) as any;
  }
  if (typeof obj === 'object') {
    if (obj.constructor && obj.constructor.name !== 'Object') {
      return obj;
    }
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = removeUndefinedValues(val);
      }
    }
    return clean as T;
  }
  return obj;
}

// Safe setDoc wrapper that always attempts real Firestore writes with smart retry and graceful fallback
export const setDoc = async <T = any>(
  reference: DocumentReference<T>,
  data: WithFieldValue<T>,
  options?: SetOptions
): Promise<void> => {
  const cleanData = removeUndefinedValues(data);
  try {
    if (options) {
      return await rawSetDoc(reference, cleanData, options);
    }
    return await rawSetDoc(reference, cleanData);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return Promise.resolve();
    }
    // Attempt one quick retry after 250ms for transient connection dips or closing/hidden
    try {
      await new Promise((r) => setTimeout(r, 250));
      if (options) {
        return await rawSetDoc(reference, cleanData, options);
      }
      return await rawSetDoc(reference, cleanData);
    } catch (retryErr: any) {
      if (isQuotaError(retryErr)) {
        markFirestoreQuotaExceeded();
        return Promise.resolve();
      }
      if (isTransientDatabaseError(retryErr)) {
        console.warn('Firestore setDoc transient note:', retryErr?.message || retryErr);
        return Promise.resolve();
      }
      console.warn('Firestore setDoc notice:', retryErr?.message || retryErr);
      return Promise.resolve();
    }
  }
};

// Safe updateDoc wrapper with smart retry
export const updateDoc = async <T = any>(
  reference: DocumentReference<T>,
  data: UpdateData<T>,
  ...moreFieldsAndValues: any[]
): Promise<void> => {
  const cleanData = removeUndefinedValues(data);
  try {
    if (moreFieldsAndValues.length > 0) {
      return await (rawUpdateDoc as any)(reference, cleanData, ...moreFieldsAndValues);
    }
    return await (rawUpdateDoc as any)(reference, cleanData);
  } catch (error: any) {
    if (isQuotaError(error)) {
      markFirestoreQuotaExceeded();
      return Promise.resolve();
    }
    // If document doesn't exist yet, smoothly set it with merge
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('No document to update')) {
      try {
        return await rawSetDoc(reference, cleanData as any, { merge: true });
      } catch (mergeErr) {
        console.warn('Fallback setDoc notice:', mergeErr);
        return Promise.resolve();
      }
    }
    // Retry once for transient closing/hidden
    if (isTransientDatabaseError(error)) {
      try {
        await new Promise((r) => setTimeout(r, 250));
        if (moreFieldsAndValues.length > 0) {
          return await (rawUpdateDoc as any)(reference, data, ...moreFieldsAndValues);
        }
        return await (rawUpdateDoc as any)(reference, data);
      } catch (retryErr) {
        console.warn('Firestore updateDoc retry note:', retryErr);
        return Promise.resolve();
      }
    }
    console.warn('Firestore updateDoc notice:', msg);
    return Promise.resolve();
  }
};

// Safe addDoc wrapper with smart retry
export const addDoc = async <T = any>(
  reference: CollectionReference<T>,
  data: WithFieldValue<T>
): Promise<DocumentReference<T>> => {
  try {
    return await rawAddDoc(reference, data);
  } catch (error: any) {
    if (isTransientDatabaseError(error)) {
      // Retry once after brief pause for transient network blips
      await new Promise((r) => setTimeout(r, 250));
      return await rawAddDoc(reference, data);
    }
    throw error;
  }
};

// Safe deleteDoc wrapper
export const deleteDoc = async <T = any>(
  reference: DocumentReference<T>
): Promise<void> => {
  try {
    return await rawDeleteDoc(reference);
  } catch (error: any) {
    if (isQuotaError(error) || isTransientDatabaseError(error)) {
      if (isQuotaError(error)) markFirestoreQuotaExceeded();
      return Promise.resolve();
    }
    console.warn('Firestore deleteDoc notice:', error?.message || error);
    return Promise.resolve();
  }
};

// Safe writeBatch wrapper
export const writeBatch = (firestore: any = db) => {
  const batch = rawWriteBatch(firestore);
  return {
    set: (docRef: any, data: any, options?: any) => {
      if (options) batch.set(docRef, data, options);
      else batch.set(docRef, data);
      return batch;
    },
    update: (docRef: any, data: any, ...rest: any[]) => {
      (batch.update as any)(docRef, data, ...rest);
      return batch;
    },
    delete: (docRef: any) => {
      batch.delete(docRef);
      return batch;
    },
    commit: async () => {
      try {
        return await batch.commit();
      } catch (err: any) {
        if (isQuotaError(err) || isTransientDatabaseError(err)) {
          if (isQuotaError(err)) markFirestoreQuotaExceeded();
          return Promise.resolve();
        }
        console.warn('Batch commit notice:', err?.message || err);
        return Promise.resolve();
      }
    }
  };
};

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  orderBy,
  limit
};
export type { User };
