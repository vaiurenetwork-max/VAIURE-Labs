/**
 * Secure Media Download & Archival Service
 * Validates provider output URLs against SSRF, prevents duplicate downloads/uploads,
 * verifies binary content type and size, and stores durably in Firebase Storage + local vault.
 */

import { validatePublicHttpUrl } from '../../securityMiddleware';
import { storeVideoBufferPersistently } from '../firebase/storage.service';

const MAX_VIDEO_DOWNLOAD_BYTES = 250 * 1024 * 1024; // 250 MB safety cap
const activeArchives = new Map<string, Promise<ArchiveMediaResult>>();

export interface ArchiveMediaResult {
  ok: boolean;
  firebaseStoragePath?: string;
  localPath?: string;
  playbackUrl?: string;
  uploadedToFirebaseStorage?: boolean;
  error?: string;
}

export async function archiveCompletedVideoOutput(params: {
  jobId: string;
  userId: string;
  providerOutputUrl: string;
}): Promise<ArchiveMediaResult> {
  const existingPromise = activeArchives.get(params.jobId);
  if (existingPromise) {
    return existingPromise;
  }

  const work = (async (): Promise<ArchiveMediaResult> => {
    try {
      const urlCheck = validatePublicHttpUrl(params.providerOutputUrl);
      if (!urlCheck.valid) {
        return {
          ok: false,
          error: urlCheck.reason || 'Provider output URL failed SSRF validation.',
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);

      let res: Response;
      try {
        res = await fetch(params.providerOutputUrl, {
          method: 'GET',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res.ok) {
        return {
          ok: false,
          error:
            res.status === 403 || res.status === 410
              ? `Provider media URL expired or forbidden (HTTP ${res.status}).`
              : `Failed to download generated video (HTTP ${res.status}).`,
        };
      }

      const contentTypeHeader = (res.headers.get('content-type') || 'video/mp4').toLowerCase();
      const cleanMime = contentTypeHeader.split(';')[0].trim();
      if (
        cleanMime &&
        !cleanMime.startsWith('video/') &&
        cleanMime !== 'application/octet-stream'
      ) {
        return {
          ok: false,
          error: `Unexpected content-type "${cleanMime}" returned by provider output URL.`,
        };
      }

      const contentLength = Number(res.headers.get('content-length') || '0');
      if (contentLength > MAX_VIDEO_DOWNLOAD_BYTES) {
        return {
          ok: false,
          error: 'Generated video exceeds maximum archive size limit (250 MB).',
        };
      }

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      if (buffer.length === 0) {
        return { ok: false, error: 'Downloaded video file was empty.' };
      }
      if (buffer.length > MAX_VIDEO_DOWNLOAD_BYTES) {
        return {
          ok: false,
          error: 'Generated video exceeds maximum archive size limit (250 MB).',
        };
      }

      const stored = await storeVideoBufferPersistently({
        userId: params.userId,
        jobId: params.jobId,
        buffer,
        contentType: cleanMime.startsWith('video/') ? cleanMime : 'video/mp4',
      });

      return {
        ok: true,
        firebaseStoragePath: stored.firebaseStoragePath,
        localPath: stored.localPath,
        playbackUrl: stored.playbackUrl,
        uploadedToFirebaseStorage: stored.uploadedToFirebaseStorage,
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.name === 'AbortError' ? 'Video download timed out.' : err?.message || 'Media archive error.',
      };
    } finally {
      activeArchives.delete(params.jobId);
    }
  })();

  activeArchives.set(params.jobId, work);
  return work;
}
