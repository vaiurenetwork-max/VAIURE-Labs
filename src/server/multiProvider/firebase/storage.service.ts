/**
 * Persistent Media Storage Service (Firebase Storage + Protected Local Vault)
 * Stores completed videos under canonical path:
 *   /generated-videos/{userId}/{jobId}/video.mp4
 *   /generated-videos/{userId}/{jobId}/thumbnail.jpg
 *   /generated-images/{userId}/{jobId}/...
 *
 * Security:
 * - Never writes generated videos into the open public /uploads/:filename directory.
 * - Uses HMAC-signed playback URLs or verified Bearer Auth when streaming from local protected vault.
 * - Uploads to Firebase Storage REST API whenever a valid user ID token is present in memory.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { isSafeIdentifier, resolveSafeSubpath } from '../../securityMiddleware';
import { BACKUP_ROOT_DIR } from '../../backupService';
import { getEphemeralUserToken } from './firestore.service';

const GENERATED_VIDEOS_ROOT = path.resolve(process.cwd(), 'uploads', 'generated-videos');
const GENERATED_IMAGES_ROOT = path.resolve(process.cwd(), 'uploads', 'generated-images');

function loadMediaSigningSecret(): string {
  const fromEnv = (process.env.MEDIA_PLAYBACK_SECRET || process.env.CURATED_ASSET_SECRET || '').trim();
  if (fromEnv && fromEnv.length >= 24) return fromEnv;
  const secretFile = path.join(BACKUP_ROOT_DIR, '.generated_media_secret');
  try {
    if (!fs.existsSync(BACKUP_ROOT_DIR)) {
      fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 24) return existing;
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.createHash('sha256').update(process.cwd() + ':media-fallback').digest('hex');
  }
}

const MEDIA_SIGNING_SECRET = loadMediaSigningSecret();

function readStorageBucket(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (parsed?.storageBucket) return String(parsed.storageBucket);
    }
  } catch {
    // ignore
  }
  return process.env.FIREBASE_STORAGE_BUCKET || 'cedar-totality-28f9p.firebasestorage.app';
}

const STORAGE_BUCKET = readStorageBucket();

export function buildCanonicalVideoStoragePath(userId: string, jobId: string): string {
  return `generated-videos/${userId}/${jobId}/video.mp4`;
}

export function buildCanonicalThumbnailStoragePath(userId: string, jobId: string): string {
  return `generated-videos/${userId}/${jobId}/thumbnail.jpg`;
}

export function signGeneratedMediaToken(userId: string, jobId: string, fileName: string, ttlSeconds = 86400 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}:${jobId}:${fileName}:${exp}`;
  const sig = crypto.createHmac('sha256', MEDIA_SIGNING_SECRET).update(payload).digest('hex');
  return `${exp}.${sig}`;
}

export function verifyGeneratedMediaToken(
  token: string,
  userId: string,
  jobId: string,
  fileName: string
): boolean {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = crypto
    .createHmac('sha256', MEDIA_SIGNING_SECRET)
    .update(`${userId}:${jobId}:${fileName}:${exp}`)
    .digest('hex');
  try {
    const a = Buffer.from(parts[1], 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildSignedLocalPlaybackUrl(userId: string, jobId: string, fileName = 'video.mp4'): string {
  const sig = signGeneratedMediaToken(userId, jobId, fileName);
  return `/api/generated-media/${encodeURIComponent(userId)}/${encodeURIComponent(jobId)}/${encodeURIComponent(fileName)}?sig=${encodeURIComponent(sig)}`;
}

export function resolveLocalGeneratedMediaFile(
  kind: 'video' | 'image',
  userId: string,
  jobId: string,
  fileName: string
): string | null {
  if (!isSafeIdentifier(userId) || !isSafeIdentifier(jobId) || !isSafeIdentifier(fileName)) {
    return null;
  }
  const root = kind === 'video' ? GENERATED_VIDEOS_ROOT : GENERATED_IMAGES_ROOT;
  return resolveSafeSubpath(root, path.join(userId, jobId, fileName));
}

export async function storeVideoBufferPersistently(params: {
  userId: string;
  jobId: string;
  buffer: Buffer;
  contentType?: string;
}): Promise<{
  firebaseStoragePath: string;
  localPath: string;
  playbackUrl: string;
  uploadedToFirebaseStorage: boolean;
}> {
  const { userId, jobId, buffer, contentType = 'video/mp4' } = params;
  if (!isSafeIdentifier(userId) || !isSafeIdentifier(jobId)) {
    throw new Error('Unsafe user or job identifier for media persistence.');
  }

  const targetDir = resolveSafeSubpath(GENERATED_VIDEOS_ROOT, path.join(userId, jobId));
  if (!targetDir) {
    throw new Error('Invalid storage target directory.');
  }
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const localPath = path.join(targetDir, 'video.mp4');
  const tmpPath = `${localPath}.tmp`;
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, localPath);

  const firebaseStoragePath = buildCanonicalVideoStoragePath(userId, jobId);
  let playbackUrl = buildSignedLocalPlaybackUrl(userId, jobId, 'video.mp4');
  let uploadedToFirebaseStorage = false;

  // Attempt Firebase Storage REST upload using cached user Bearer token
  const token = getEphemeralUserToken(userId);
  if (token) {
    try {
      const uploadEndpoint = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
        STORAGE_BUCKET
      )}/o?uploadType=media&name=${encodeURIComponent(firebaseStoragePath)}`;

      const uploadRes = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': contentType,
        },
        body: new Uint8Array(buffer),
      });

      if (uploadRes.ok) {
        const meta = (await uploadRes.json().catch(() => ({}))) as {
          downloadTokens?: string;
        };
        uploadedToFirebaseStorage = true;
        if (meta?.downloadTokens) {
          const dlToken = String(meta.downloadTokens).split(',')[0].trim();
          playbackUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
            STORAGE_BUCKET
          )}/o/${encodeURIComponent(firebaseStoragePath)}?alt=media&token=${encodeURIComponent(dlToken)}`;
        }
      }
    } catch {
      // Local vault remains guaranteed durable fallback
    }
  }

  return {
    firebaseStoragePath,
    localPath,
    playbackUrl,
    uploadedToFirebaseStorage,
  };
}

export function getGeneratedMediaStorageStats(): { totalBytes: number; fileCount: number } {
  let totalBytes = 0;
  let fileCount = 0;

  const walk = (dir: string) => {
    try {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (entry.isFile()) {
          const st = fs.statSync(full);
          totalBytes += st.size;
          fileCount++;
        }
      }
    } catch {
      // ignore
    }
  };

  walk(GENERATED_VIDEOS_ROOT);
  walk(GENERATED_IMAGES_ROOT);

  return { totalBytes, fileCount };
}
