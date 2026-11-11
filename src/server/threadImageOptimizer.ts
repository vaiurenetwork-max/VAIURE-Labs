import fs from 'fs';
import path from 'path';
import sharp, { Metadata } from 'sharp';
import { storage, storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from '../lib/firebase';

export interface OptimizedImageResult {
  id: string;
  originalName: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  originalSize: number;
  compressionRatio: number;
  status: 'completed' | 'failed';
  storagePath?: string;
  thumbnailStoragePath?: string;
  processedAt: string;
}

export interface OptimizationOptions {
  maxDimension?: number;
  quality?: number;
  thumbnailDimension?: number;
  thumbnailQuality?: number;
}

const DEFAULT_OPTIONS: Required<OptimizationOptions> = {
  maxDimension: 2048,
  quality: 82,
  thumbnailDimension: 640,
  thumbnailQuality: 78,
};

// Base storage directory paths
const UPLOADS_BASE = path.resolve(process.cwd(), 'uploads');
const THREADS_QUARANTINE_DIR = path.join(UPLOADS_BASE, 'threads', 'quarantine');
const THREADS_OPTIMIZED_DIR = path.join(UPLOADS_BASE, 'threads', 'optimized');
const THREADS_THUMBNAILS_DIR = path.join(UPLOADS_BASE, 'threads', 'thumbnails');

// Ensure directories exist
[THREADS_QUARANTINE_DIR, THREADS_OPTIMIZED_DIR, THREADS_THUMBNAILS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Validate image buffer integrity, format, dimensions, and decompression safety
 */
export async function validateImageBuffer(buffer: Buffer, originalFilename: string): Promise<Metadata> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Image file payload is empty.');
  }

  // File size limit: 50MB before decode
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('Image exceeds 50MB maximum upload limit.');
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch (err: any) {
    throw new Error(`Corrupted or malformed image data: ${err?.message || 'Invalid format'}`);
  }

  const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif'];
  if (!metadata.format || !supportedFormats.includes(metadata.format)) {
    throw new Error(`Unsupported image format: ${metadata.format || 'unknown'}. Permitted formats: WebP, JPEG, PNG, GIF, AVIF.`);
  }

  const width = metadata.width || 0;
  const height = metadata.height || 0;

  // Decompression bomb defense: max 40 megapixels and max 10000px on any side
  if (width * height > 40_000_000) {
    throw new Error('Image dimensions exceed the 40-megapixel safety boundary.');
  }
  if (width > 10000 || height > 10000) {
    throw new Error('Image dimensions exceed the 10,000px maximum constraint.');
  }

  return metadata;
}

/**
 * Main backend image optimization pipeline
 */
export async function optimizeThreadImage(
  buffer: Buffer,
  userId: string,
  threadId: string,
  originalFilename: string,
  options?: OptimizationOptions
): Promise<OptimizedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const safeBaseName = path.basename(originalFilename, path.extname(originalFilename)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);

  // 1. Quarantine: Save raw original to private temporary quarantine location
  const userQuarantineDir = path.join(THREADS_QUARANTINE_DIR, userId, threadId);
  if (!fs.existsSync(userQuarantineDir)) {
    fs.mkdirSync(userQuarantineDir, { recursive: true });
  }
  const quarantineFilePath = path.join(userQuarantineDir, `${imageId}_${safeBaseName}.tmp`);
  await fs.promises.writeFile(quarantineFilePath, buffer);

  try {
    // 2. Validate actual file contents
    const metadata = await validateImageBuffer(buffer, originalFilename);
    const originalWidth = metadata.width || 1;
    const originalHeight = metadata.height || 1;
    const originalSize = buffer.length;
    const hasAlpha = Boolean(metadata.hasAlpha);
    const isAnimated = Boolean(metadata.pages && metadata.pages > 1);

    // 3. Process Full-Resolution Editorial Variant (Max 2048px, WebP quality ~82)
    let sharpPipeline = sharp(buffer, { animated: isAnimated });

    // Only resize if largest dimension exceeds maxDimension (never upscale smaller images)
    if (Math.max(originalWidth, originalHeight) > opts.maxDimension) {
      sharpPipeline = sharpPipeline.resize({
        width: originalWidth >= originalHeight ? opts.maxDimension : undefined,
        height: originalHeight > originalWidth ? opts.maxDimension : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let optimizedBuffer: Buffer;
    let finalFormat = 'webp';

    if (isAnimated) {
      // Preserve animation in WebP
      optimizedBuffer = await sharpPipeline
        .webp({ quality: opts.quality, effort: 4, force: true })
        .toBuffer();
    } else {
      optimizedBuffer = await sharpPipeline
        .webp({
          quality: opts.quality,
          alphaQuality: hasAlpha ? 90 : undefined,
          effort: 4,
          smartSubsample: true,
          force: true,
        })
        .toBuffer();
    }

    // Adaptive Optimization Check:
    // If the input was already a clean WebP or JPEG and sharp output is unexpectedly larger,
    // and dimensions are within bounds, keep the original stream if it preserves quality.
    if (
      optimizedBuffer.length > originalSize &&
      (metadata.format === 'webp' || metadata.format === 'jpeg') &&
      Math.max(originalWidth, originalHeight) <= opts.maxDimension
    ) {
      optimizedBuffer = buffer;
      finalFormat = metadata.format;
    }

    // 4. Process Fast Mobile / Feed Thumbnail Variant (Max 640px, WebP quality ~78)
    let thumbPipeline = sharp(buffer, { animated: false }); // Static preview for responsive feed speed
    if (Math.max(originalWidth, originalHeight) > opts.thumbnailDimension) {
      thumbPipeline = thumbPipeline.resize({
        width: originalWidth >= originalHeight ? opts.thumbnailDimension : undefined,
        height: originalHeight > originalWidth ? opts.thumbnailDimension : undefined,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    const thumbnailBuffer = await thumbPipeline
      .webp({ quality: opts.thumbnailQuality, effort: 3, force: true })
      .toBuffer();

    // Inspect final dimensions
    const finalMeta = await sharp(optimizedBuffer).metadata();
    const finalWidth = finalMeta.width || originalWidth;
    const finalHeight = finalMeta.height || originalHeight;

    // 5. Save optimized files to persistent local storage directory
    const userOptimizedDir = path.join(THREADS_OPTIMIZED_DIR, userId, threadId);
    const userThumbnailDir = path.join(THREADS_THUMBNAILS_DIR, userId, threadId);
    if (!fs.existsSync(userOptimizedDir)) fs.mkdirSync(userOptimizedDir, { recursive: true });
    if (!fs.existsSync(userThumbnailDir)) fs.mkdirSync(userThumbnailDir, { recursive: true });

    const optimizedFilename = `${imageId}.${finalFormat}`;
    const thumbnailFilename = `${imageId}_thumb.webp`;
    const optimizedFilePath = path.join(userOptimizedDir, optimizedFilename);
    const thumbnailFilePath = path.join(userThumbnailDir, thumbnailFilename);

    await fs.promises.writeFile(optimizedFilePath, optimizedBuffer);
    await fs.promises.writeFile(thumbnailFilePath, thumbnailBuffer);

    let publicOptimizedUrl = `/uploads/threads/optimized/${userId}/${threadId}/${optimizedFilename}`;
    let publicThumbnailUrl = `/uploads/threads/thumbnails/${userId}/${threadId}/${thumbnailFilename}`;
    const storagePath = `threads/${userId}/${threadId}/optimized/${optimizedFilename}`;
    const thumbnailStoragePath = `threads/${userId}/${threadId}/thumbnails/${thumbnailFilename}`;

    // 6. Resilient Firebase Storage Sync (if storage is reachable)
    try {
      if (storage) {
        const optRef = storageRef(storage, storagePath);
        const thumbRef = storageRef(storage, thumbnailStoragePath);

        const uploadTask = uploadBytesResumable(optRef, optimizedBuffer, {
          contentType: `image/${finalFormat}`,
          customMetadata: {
            userId,
            threadId,
            imageId,
            optimized: 'true',
            originalName: originalFilename,
          },
        });

        // Wait for upload with 5-second timeout so it doesn't block local serving
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            uploadTask.on(
              'state_changed',
              null,
              (err) => reject(err),
              async () => {
                try {
                  const cloudUrl = await getDownloadURL(optRef);
                  publicOptimizedUrl = cloudUrl;
                  resolve();
                } catch (e) {
                  reject(e);
                }
              }
            );
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Storage timeout')), 5000)),
        ]).catch((e) => {
          // Gracefully fallback to streaming local uploads
        });

        // Background thumbnail sync
        uploadBytesResumable(thumbRef, thumbnailBuffer, {
          contentType: 'image/webp',
        }).catch(() => {});
      }
    } catch (_storageErr) {
      // Local URL fallback remains active
    }

    // 7. Cleanup Quarantine: Delete temporary original file
    try {
      if (fs.existsSync(quarantineFilePath)) {
        await fs.promises.unlink(quarantineFilePath);
      }
    } catch (_cleanupErr) {
      // Ignored
    }

    const compressionRatio = Number((optimizedBuffer.length / originalSize).toFixed(3));

    return {
      id: imageId,
      originalName: originalFilename,
      url: publicOptimizedUrl,
      thumbnailUrl: publicThumbnailUrl,
      width: finalWidth,
      height: finalHeight,
      format: finalFormat,
      size: optimizedBuffer.length,
      originalSize,
      compressionRatio,
      status: 'completed',
      storagePath,
      thumbnailStoragePath,
      processedAt: new Date().toISOString(),
    };
  } catch (error: any) {
    // 8. Error handling: Cleanup quarantine on failure
    try {
      if (fs.existsSync(quarantineFilePath)) {
        await fs.promises.unlink(quarantineFilePath);
      }
    } catch (_cleanErr) {
      // Ignored
    }

    throw new Error(error?.message || 'Backend image optimization failed.');
  }
}

/**
 * Cleanup thread media on deletion
 */
export async function cleanupThreadMedia(userId: string, threadId: string): Promise<void> {
  try {
    const userOptDir = path.join(THREADS_OPTIMIZED_DIR, userId, threadId);
    if (fs.existsSync(userOptDir)) {
      await fs.promises.rm(userOptDir, { recursive: true, force: true });
    }

    const userThumbDir = path.join(THREADS_THUMBNAILS_DIR, userId, threadId);
    if (fs.existsSync(userThumbDir)) {
      await fs.promises.rm(userThumbDir, { recursive: true, force: true });
    }

    const userQuarantineDir = path.join(THREADS_QUARANTINE_DIR, userId, threadId);
    if (fs.existsSync(userQuarantineDir)) {
      await fs.promises.rm(userQuarantineDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn('Thread media cleanup notice:', err);
  }
}
