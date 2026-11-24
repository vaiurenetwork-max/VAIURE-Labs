/**
 * VAIURE — SEEDANCE LAB CURATED GALLERY & PUBLIC DISCOVERY STORE
 * Atomic file-backed persistence at uploads/seedance_curated_db.json.
 * Private generated media assets are isolated inside uploads/curated_private/
 * and NEVER placed inside publicly served /uploads/* paths.
 *
 * STRICT PRIVACY INVARIANTS:
 * 1. Newly generated AIGC is ingested exclusively into `creations` with
 *    visibility='private' and publicationStatus='not_submitted'.
 * 2. It NEVER appears in `published` or any public search/discovery query unless
 *    its owner explicitly submits it AND an authorized Curator approves & publishes it.
 * 3. Rejected, withdrawn, or unpublished creations remain strictly private to owner
 *    and are immediately hidden/removed from public discovery.
 * 4. Zero fake creations, zero fake views, zero fake reactions.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  CollectionItem,
  CreationAnalytics,
  CreationAsset,
  CreationCollection,
  CreationComment,
  CreationReaction,
  CreationTag,
  CreatorFavorite,
  CuratedCategoryOption,
  CuratedMediaType,
  CurationPolicyChecklist,
  CurationReview,
  CurationReviewDecision,
  CurationSubmission,
  PublicCreationReport,
  PublicGallerySort,
  PublishedCreation,
  UserCreation,
} from '../types/seedanceCurated';
import { seedancePlatformStore } from './seedancePlatformStore';
import { seedanceCommunityStore } from './seedanceCommunityStore';
import { BACKUP_ROOT_DIR } from './backupService';
import {
  isSafeIdentifier,
  resolveSafeSubpath,
  validateMagicBytes,
  validatePublicHttpUrl,
} from './securityMiddleware';

const DB_DIR = path.resolve(process.cwd(), 'uploads');
const CURATED_DB_FILE = path.join(DB_DIR, 'seedance_curated_db.json');
export const CURATED_PRIVATE_DIR = path.join(DB_DIR, 'curated_private');
const MAX_PRIVATE_ASSET_BYTES = 50 * 1024 * 1024;

function loadOrCreateCuratedVaultSecret(): string {
  const fromEnv = (process.env.CURATED_ASSET_SECRET || '').trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  const secretFile = path.join(BACKUP_ROOT_DIR, '.curated_vault_secret');
  try {
    if (!fs.existsSync(BACKUP_ROOT_DIR)) {
      fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(secretFile)) {
      const existing = fs.readFileSync(secretFile, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
    const generated = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

const ASSET_TOKEN_SECRET = loadOrCreateCuratedVaultSecret();

export const CURATED_CATEGORIES: CuratedCategoryOption[] = [
  {
    id: 'ai-filmmaking',
    name: 'AI Filmmaking',
    description: 'Narrative shorts, directorial sequences, and Seedance 2.5 cinema.',
  },
  {
    id: 'cinematography-motion',
    name: 'Cinematography & Motion',
    description: 'Camera choreography, tracking shots, and kinetic lighting studies.',
  },
  {
    id: 'concept-stills',
    name: 'Concept Art & Stills',
    description: 'High-resolution keyframes, architectural frames, and look-dev plates.',
  },
  {
    id: 'character-studies',
    name: 'Character Studies',
    description: 'Identity-locked portraits, wardrobe sheets, and expressive performance plates.',
  },
  {
    id: 'worldbuilding',
    name: 'Worldbuilding & Environments',
    description: 'Spatial design, atmospheric landscapes, and sci-fi/period sets.',
  },
  {
    id: 'physics-vfx',
    name: 'Physics & VFX',
    description: 'Fluid simulation, cloth dynamics, destruction, and optical effects.',
  },
  {
    id: 'editorial-lookdev',
    name: 'Editorial & Look-Dev',
    description: 'Monochrome cinema, fashion films, and stylized visual essays.',
  },
];

interface PersistedCuratedDB {
  creations: Record<string, UserCreation>;
  assets: Record<string, CreationAsset>;
  collections: Record<string, CreationCollection>;
  collectionItems: CollectionItem[];
  submissions: Record<string, CurationSubmission>;
  reviews: CurationReview[];
  published: Record<string, PublishedCreation>;
  reactions: CreationReaction[];
  comments: Record<string, CreationComment[]>; // publishedId -> comments
  favorites: CreatorFavorite[];
  tags: Record<string, CreationTag>;
  analytics: Record<string, CreationAnalytics>; // publishedId -> analytics
  reports: PublicCreationReport[];
  curatorUserIds: string[]; // non-admin users explicitly granted Curator privilege
}

function defaultCuratedDb(): PersistedCuratedDB {
  return {
    creations: {},
    assets: {},
    collections: {},
    collectionItems: [],
    submissions: {},
    reviews: [],
    published: {},
    reactions: [],
    comments: {},
    favorites: [],
    tags: {},
    analytics: {},
    reports: [],
    curatorUserIds: [],
  };
}

function slugifyTag(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const clean: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().replace(/^#/, '').slice(0, 32);
    if (trimmed && !clean.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      clean.push(trimmed);
    }
    if (clean.length >= 12) break;
  }
  return clean;
}

function inferMediaTypeFromUrl(url: string, hint?: CuratedMediaType): CuratedMediaType {
  if (hint === 'IMAGE' || hint === 'VIDEO') return hint;
  const lower = url.toLowerCase();
  if (
    (lower.startsWith('data:image/') && !lower.startsWith('data:image/svg')) ||
    /\.(png|jpe?g|webp|gif)(\?|#|$)/.test(lower)
  ) {
    return 'IMAGE';
  }
  if (
    lower.startsWith('data:video/') ||
    /\.(mp4|webm|mov|m4v)(\?|#|$)/.test(lower)
  ) {
    return 'VIDEO';
  }
  return 'VIDEO';
}

function defaultChecklist(): CurationPolicyChecklist {
  return {
    originalOrAuthorized: true,
    safetyCompliant: true,
    qualityApproved: true,
    metadataAppropriate: true,
  };
}

function computeTrendingScore(p: PublishedCreation): number {
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(p.publishedAt).getTime()) / (1000 * 60 * 60)
  );
  const rawWeight =
    p.appreciationsCount * 5 +
    p.favoritesCount * 4 +
    p.commentsCount * 3 +
    p.sharesCount * 4 +
    p.uniqueViewsCount * 0.6;
  return Number((rawWeight / Math.pow(ageHours + 4, 1.15)).toFixed(4));
}

class SeedanceCuratedStore {
  private db: PersistedCuratedDB;
  private viewCooldown = new Map<string, number>();

  constructor() {
    this.ensureDirs();
    this.db = this.load();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
    if (!fs.existsSync(CURATED_PRIVATE_DIR)) {
      fs.mkdirSync(CURATED_PRIVATE_DIR, { recursive: true });
    }
  }

  private load(): PersistedCuratedDB {
    try {
      this.ensureDirs();
      if (!fs.existsSync(CURATED_DB_FILE)) {
        const fresh = defaultCuratedDb();
        this.writeAtomic(fresh);
        return fresh;
      }
      const raw = fs.readFileSync(CURATED_DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedCuratedDB>;
      return {
        ...defaultCuratedDb(),
        ...parsed,
        creations: parsed.creations || {},
        assets: parsed.assets || {},
        collections: parsed.collections || {},
        collectionItems: Array.isArray(parsed.collectionItems) ? parsed.collectionItems : [],
        submissions: parsed.submissions || {},
        reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
        published: parsed.published || {},
        reactions: Array.isArray(parsed.reactions) ? parsed.reactions : [],
        comments: parsed.comments || {},
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
        tags: parsed.tags || {},
        analytics: parsed.analytics || {},
        reports: Array.isArray(parsed.reports) ? parsed.reports : [],
        curatorUserIds: Array.isArray(parsed.curatorUserIds) ? parsed.curatorUserIds : [],
      };
    } catch {
      return defaultCuratedDb();
    }
  }

  private writeAtomic(data: PersistedCuratedDB): void {
    this.ensureDirs();
    const tmp = `${CURATED_DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmp, CURATED_DB_FILE);
  }

  private persist(): void {
    this.writeAtomic(this.db);
  }

  // ============================================================================
  // SIGNED PRIVATE MEDIA TOKEN HELPERS
  // ============================================================================

  signAssetToken(assetId: string, uid: string, scope: 'owner' | 'curator', ttlSeconds = 3600): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const payload = `${assetId}:${uid}:${scope}:${exp}`;
    const sig = crypto
      .createHmac('sha256', ASSET_TOKEN_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);
    return Buffer.from(`${payload}:${sig}`, 'utf-8').toString('base64url');
  }

  verifyAssetToken(
    token: string,
    expectedAssetId: string
  ): { valid: boolean; uid?: string; scope?: string } {
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf-8');
      const parts = decoded.split(':');
      if (parts.length !== 5) return { valid: false };
      const [assetId, uid, scope, expStr, sig] = parts;
      if (assetId !== expectedAssetId) return { valid: false };
      const exp = Number(expStr);
      if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
        return { valid: false };
      }
      const expectedSig = crypto
        .createHmac('sha256', ASSET_TOKEN_SECRET)
        .update(`${assetId}:${uid}:${scope}:${expStr}`)
        .digest('hex')
        .slice(0, 32);
      if (sig.length !== expectedSig.length) return { valid: false };
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
        return { valid: false };
      }
      return { valid: true, uid, scope };
    } catch {
      return { valid: false };
    }
  }

  private buildPrivateStreamUrl(assetId: string, uid: string, scope: 'owner' | 'curator'): string {
    const token = this.signAssetToken(assetId, uid, scope, 7200);
    return `/api/curated/assets/${encodeURIComponent(assetId)}/stream?token=${encodeURIComponent(token)}`;
  }

  private buildPublicStreamUrl(assetId: string): string {
    return `/api/curated/assets/${encodeURIComponent(assetId)}/stream`;
  }

  // ============================================================================
  // PRIVATE FILE STORAGE & ASSET ISOLATION
  // ============================================================================

  private savePrivateAssetFromSource(
    sourceUrl: string,
    assetId: string,
    mediaType: CuratedMediaType
  ): {
    storageKind: 'private_file' | 'external_private';
    localFileName?: string;
    externalUrl?: string;
    mimeType: string;
    byteSize: number;
  } {
    this.ensureDirs();
    if (!isSafeIdentifier(assetId)) {
      throw new Error('Invalid asset identifier.');
    }
    const defaultMime = mediaType === 'IMAGE' ? 'image/png' : 'video/mp4';

    // 1. Base64 data URL -> validate magic bytes & decode directly into uploads/curated_private/
    const dataMatch = sourceUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
    if (dataMatch) {
      const mimeType = dataMatch[1].toLowerCase();
      const buf = Buffer.from(dataMatch[2], 'base64');
      if (buf.length > MAX_PRIVATE_ASSET_BYTES) {
        throw new Error('Asset payload exceeds maximum 50MB limit.');
      }
      const magic = validateMagicBytes(buf, mimeType, ['image', 'video']);
      if (!magic.valid || !magic.detectedMime || !magic.ext) {
        throw new Error(magic.reason || 'Disallowed or invalid private asset file signature.');
      }
      const fileName = `${assetId}${magic.ext}`;
      const destPath = resolveSafeSubpath(CURATED_PRIVATE_DIR, fileName);
      if (!destPath) throw new Error('Invalid curated private storage path.');
      fs.writeFileSync(destPath, buf);
      return {
        storageKind: 'private_file',
        localFileName: fileName,
        mimeType: magic.detectedMime,
        byteSize: buf.length,
      };
    }

    // 2. Same-server /uploads/... file -> canonical path check (excludes JSON DBs, private dirs, SVG)
    let localUploadCandidate: string | null = null;
    const extractSafeUploadRel = (pathname: string): string | null => {
      if (!pathname.startsWith('/uploads/')) return null;
      const rel = pathname.slice('/uploads/'.length).split('?')[0].split('#')[0];
      const lower = rel.toLowerCase();
      if (
        !rel ||
        lower.includes('curated_private') ||
        lower.includes('quarantine') ||
        lower.endsWith('.json') ||
        lower.endsWith('.tmp') ||
        lower.endsWith('.svg') ||
        lower.endsWith('.html')
      ) {
        return null;
      }
      return resolveSafeSubpath(DB_DIR, rel);
    };

    if (sourceUrl.startsWith('/uploads/')) {
      localUploadCandidate = extractSafeUploadRel(sourceUrl);
    } else if (/^https?:\/\//i.test(sourceUrl)) {
      try {
        const parsed = new URL(sourceUrl);
        if (parsed.pathname.startsWith('/uploads/')) {
          localUploadCandidate = extractSafeUploadRel(parsed.pathname);
        }
      } catch {
        // Ignore URL parse error
      }
    }

    if (localUploadCandidate && fs.existsSync(localUploadCandidate) && fs.statSync(localUploadCandidate).isFile()) {
      const stat = fs.statSync(localUploadCandidate);
      if (stat.size > MAX_PRIVATE_ASSET_BYTES) {
        throw new Error('Asset exceeds maximum 50MB limit.');
      }
      const buf = fs.readFileSync(localUploadCandidate);
      const magic = validateMagicBytes(buf, undefined, ['image', 'video']);
      if (!magic.valid || !magic.detectedMime || !magic.ext) {
        throw new Error(magic.reason || 'Unsupported media signature.');
      }
      const fileName = `${assetId}${magic.ext}`;
      const destPath = resolveSafeSubpath(CURATED_PRIVATE_DIR, fileName);
      if (!destPath) throw new Error('Invalid destination storage path.');
      fs.copyFileSync(localUploadCandidate, destPath);
      return {
        storageKind: 'private_file',
        localFileName: fileName,
        mimeType: magic.detectedMime || defaultMime,
        byteSize: stat.size,
      };
    }

    // 3. External remote CDN URL -> must pass SSRF public URL validation
    const urlCheck = validatePublicHttpUrl(sourceUrl);
    if (!urlCheck.valid || !urlCheck.url) {
      throw new Error(urlCheck.reason || 'Disallowed external media URL.');
    }

    return {
      storageKind: 'external_private',
      externalUrl: urlCheck.url.toString(),
      mimeType: defaultMime,
      byteSize: 0,
    };
  }

  // ============================================================================
  // CURATOR PERMISSION GOVERNANCE
  // ============================================================================

  isCuratorOrAdmin(user?: { uid: string; isAdmin?: boolean } | null): boolean {
    if (!user) return false;
    if (user.isAdmin) return true;
    return this.db.curatorUserIds.includes(user.uid);
  }

  listCurators(): string[] {
    return [...this.db.curatorUserIds];
  }

  setCuratorAccess(
    targetUserId: string,
    enabled: boolean,
    actor: { uid: string; email: string }
  ): string[] {
    const cleanUid = targetUserId.trim();
    if (!cleanUid) throw new Error('targetUserId is required.');
    const exists = this.db.curatorUserIds.includes(cleanUid);
    if (enabled && !exists) {
      this.db.curatorUserIds.push(cleanUid);
    } else if (!enabled && exists) {
      this.db.curatorUserIds = this.db.curatorUserIds.filter((id) => id !== cleanUid);
    }
    this.persist();
    seedancePlatformStore.addAuditLog({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: enabled ? 'GRANT_CURATOR_ACCESS' : 'REVOKE_CURATOR_ACCESS',
      targetType: 'CURATOR_ROLE',
      targetId: cleanUid,
      reason: `Curator access ${enabled ? 'enabled' : 'disabled'} by admin`,
    });
    return [...this.db.curatorUserIds];
  }

  // ============================================================================
  // 1. AUTOMATIC AIGC INGESTION INTO PRIVATE CURATES
  // ============================================================================

  /**
   * Idempotently captures every successful AI generation into the creator's private gallery.
   * Multiple outputs from one job create distinct UserCreation entries linked by generationGroupId.
   * NEVER publishes or exposes creations publicly.
   */
  ingestCompletedGeneration(input: {
    ownerId: string;
    ownerName?: string;
    ownerAvatar?: string;
    sourceJobId: string;
    generationGroupId?: string;
    sourcePipeline: UserCreation['sourcePipeline'];
    projectId?: string;
    projectName?: string;
    title?: string;
    mediaType?: CuratedMediaType;
    outputUrls: string[];
    thumbnailUrl?: string;
    aiModel: string;
    modelCategory?: string;
    aspectRatio?: string;
    resolution?: string;
    durationSeconds?: number;
    prompt: string;
    negativePrompt?: string;
    parameters?: Record<string, unknown>;
    referenceImageCount?: number;
    generatedAt?: string;
  }): UserCreation[] {
    const validUrls = Array.from(
      new Set(
        (input.outputUrls || [])
          .filter((u): u is string => typeof u === 'string' && Boolean(u.trim()))
          .map((u) => u.trim())
      )
    );
    if (validUrls.length === 0 || !input.ownerId || !input.sourceJobId) {
      return [];
    }

    const userRecord = seedancePlatformStore.getUserRecord(input.ownerId);
    const ownerName =
      input.ownerName?.trim() ||
      userRecord?.displayName ||
      userRecord?.username ||
      'Creator';
    const generationGroupId =
      input.generationGroupId?.trim() || `grp-${input.sourceJobId}`;
    const generatedAt = input.generatedAt || new Date().toISOString();
    const created: UserCreation[] = [];

    validUrls.forEach((rawUrl, index) => {
      const variantIndex = index;
      const existing = Object.values(this.db.creations).find(
        (c) =>
          c.ownerId === input.ownerId &&
          c.sourceJobId === input.sourceJobId &&
          c.variantIndex === variantIndex
      );
      if (existing) {
        created.push(existing);
        return;
      }

      const mediaType = inferMediaTypeFromUrl(rawUrl, input.mediaType);
      const creationId = `crt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const assetId = `ast-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const stored = this.savePrivateAssetFromSource(rawUrl, assetId, mediaType);

      const asset: CreationAsset = {
        id: assetId,
        creationId,
        ownerId: input.ownerId,
        mediaType,
        storageKind: stored.storageKind,
        localFileName: stored.localFileName,
        externalUrl: stored.externalUrl,
        mimeType: stored.mimeType,
        byteSize: stored.byteSize,
        durationSeconds: mediaType === 'VIDEO' ? input.durationSeconds : undefined,
        createdAt: new Date().toISOString(),
      };
      this.db.assets[assetId] = asset;

      let thumbAssetId: string | undefined;
      if (input.thumbnailUrl && input.thumbnailUrl.trim() && input.thumbnailUrl !== rawUrl) {
        const tId = `ast-th-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const thumbStored = this.savePrivateAssetFromSource(
          input.thumbnailUrl.trim(),
          tId,
          'IMAGE'
        );
        this.db.assets[tId] = {
          id: tId,
          creationId,
          ownerId: input.ownerId,
          mediaType: 'IMAGE',
          storageKind: thumbStored.storageKind,
          localFileName: thumbStored.localFileName,
          externalUrl: thumbStored.externalUrl,
          mimeType: thumbStored.mimeType,
          byteSize: thumbStored.byteSize,
          createdAt: new Date().toISOString(),
        };
        thumbAssetId = tId;
      }

      const defaultTitleBase = (input.title || input.prompt || 'Untitled Creation')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 64);
      const title =
        validUrls.length > 1
          ? `${defaultTitleBase || 'Creation'} · Variant ${variantIndex + 1}`
          : defaultTitleBase || `${input.aiModel} Creation`;

      const nowIso = new Date().toISOString();
      const creation: UserCreation = {
        id: creationId,
        ownerId: input.ownerId,
        ownerName,
        ownerAvatar: input.ownerAvatar || '',
        sourceJobId: input.sourceJobId,
        generationGroupId,
        variantIndex,
        sourcePipeline: input.sourcePipeline,
        projectId: input.projectId || undefined,
        projectName: input.projectName || undefined,
        title,
        description: '',
        mediaType,
        primaryAssetId: assetId,
        thumbnailAssetId: thumbAssetId,
        aiModel: input.aiModel || 'Seedance 2.5',
        modelCategory: input.modelCategory || (mediaType === 'IMAGE' ? 'Image' : 'Video'),
        aspectRatio: input.aspectRatio || '16:9',
        resolution: (input.resolution || '720p').toUpperCase(),
        durationSeconds: mediaType === 'VIDEO' ? input.durationSeconds : undefined,
        prompt: input.prompt || '',
        negativePrompt: input.negativePrompt || undefined,
        parameters: input.parameters || {},
        referenceImageCount: Number(input.referenceImageCount || 0),
        visibility: 'private',
        publicationStatus: 'not_submitted',
        collectionIds: [],
        tags: [],
        generatedAt,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      this.db.creations[creationId] = creation;
      created.push(creation);
    });

    if (created.length > 0) {
      this.persist();
    }
    return created;
  }

  /**
   * Synchronizes previously completed creations from bytedance_history.json and
   * seedancePlatformStore jobs for `ownerId` so existing completed generations appear
   * seamlessly in My Private Curates (strictly private, never auto-published).
   */
  syncUserCompletedHistory(ownerId: string, ownerName?: string): number {
    if (!ownerId) return 0;
    let importedCount = 0;

    // 1. Sync ByteDance History file
    try {
      const historyFile = path.join(DB_DIR, 'bytedance_history.json');
      if (fs.existsSync(historyFile)) {
        const raw = fs.readFileSync(historyFile, 'utf-8');
        const entries = JSON.parse(raw);
        if (Array.isArray(entries)) {
          for (const entry of entries) {
            if (
              entry &&
              entry.userId === ownerId &&
              entry.status === 'completed' &&
              typeof entry.result_url === 'string' &&
              entry.result_url.trim()
            ) {
              const jobCode = String(entry.job_code || entry.id);
              const already = Object.values(this.db.creations).some(
                (c) => c.ownerId === ownerId && c.sourceJobId === jobCode
              );
              if (!already) {
                const params = (entry.parameters || {}) as Record<string, unknown>;
                const isImg = String(entry.category || '').toLowerCase() === 'image';
                const res = this.ingestCompletedGeneration({
                  ownerId,
                  ownerName,
                  sourceJobId: jobCode,
                  generationGroupId: `bd-${jobCode}`,
                  sourcePipeline: isImg ? 'bytedance_image' : 'seedance_video',
                  mediaType: isImg ? 'IMAGE' : 'VIDEO',
                  outputUrls: [entry.result_url],
                  aiModel: String(entry.model_name || entry.model || 'Seedance 2.5'),
                  modelCategory: String(entry.category || 'Video'),
                  aspectRatio: String(params.aspect_ratio || '16:9'),
                  resolution: String(params.resolution || '720p'),
                  durationSeconds: isImg
                    ? undefined
                    : Number(params.duration || (String(entry.model).includes('30s') ? 30 : 15)),
                  prompt: String(entry.prompt || ''),
                  parameters: params,
                  referenceImageCount: Array.isArray(params.reference_image_urls)
                    ? params.reference_image_urls.length
                    : 0,
                  generatedAt: String(entry.created_at || new Date().toISOString()),
                });
                importedCount += res.length;
              }
            }
          }
        }
      }
    } catch {
      // Non-fatal backfill ignore
    }

    // 2. Sync Seedance Platform Store jobs
    try {
      const jobs = seedancePlatformStore.getUserJobs(ownerId);
      for (const job of jobs) {
        if (job.status === 'COMPLETED' && job.videoUrl) {
          const already = Object.values(this.db.creations).some(
            (c) => c.ownerId === ownerId && c.sourceJobId === job.id
          );
          if (!already) {
            const res = this.ingestCompletedGeneration({
              ownerId,
              ownerName,
              sourceJobId: job.id,
              generationGroupId: `sd-${job.id}`,
              sourcePipeline: 'seedance_video',
              projectId: job.projectId,
              mediaType: 'VIDEO',
              outputUrls: [job.videoUrl],
              thumbnailUrl: job.thumbnailUrl,
              aiModel: job.model || 'Seedance 2.5',
              modelCategory: 'Video',
              aspectRatio: job.aspectRatio || '16:9',
              resolution: job.resolution || '720p',
              durationSeconds: job.duration || 15,
              prompt: job.prompt || '',
              negativePrompt: job.negativePrompt,
              parameters: {
                mode: job.mode,
                physicsPriority: job.physicsPriority,
                duration: job.duration,
                resolution: job.resolution,
                aspectRatio: job.aspectRatio,
              },
              referenceImageCount: Array.isArray(job.referenceImages)
                ? job.referenceImages.length
                : 0,
              generatedAt: job.completedAt || job.createdAt,
            });
            importedCount += res.length;
          }
        }
      }
    } catch {
      // Non-fatal
    }

    return importedCount;
  }

  // ============================================================================
  // 2. MY PRIVATE CURATES — OWNER MANAGEMENT & COLLECTIONS
  // ============================================================================

  private decoratePrivateCreation(c: UserCreation, viewerUid: string): UserCreation {
    const streamUrl = this.buildPrivateStreamUrl(c.primaryAssetId, viewerUid, 'owner');
    const thumbUrl = c.thumbnailAssetId
      ? this.buildPrivateStreamUrl(c.thumbnailAssetId, viewerUid, 'owner')
      : undefined;
    return {
      ...c,
      mediaStreamUrl: streamUrl,
      thumbnailStreamUrl: thumbUrl,
      downloadUrl: `${streamUrl}&download=1`,
    };
  }

  listPrivateCreations(
    ownerId: string,
    filters?: {
      mediaType?: 'ALL' | CuratedMediaType;
      collectionId?: string;
      projectId?: string;
      status?: string;
      search?: string;
    },
    ownerName?: string
  ): UserCreation[] {
    this.syncUserCompletedHistory(ownerId, ownerName);

    let items = Object.values(this.db.creations).filter((c) => c.ownerId === ownerId);

    if (filters?.mediaType && filters.mediaType !== 'ALL') {
      items = items.filter((c) => c.mediaType === filters.mediaType);
    }
    if (filters?.collectionId) {
      const itemIds = new Set(
        this.db.collectionItems
          .filter(
            (ci) => ci.ownerId === ownerId && ci.collectionId === filters.collectionId
          )
          .map((ci) => ci.creationId)
      );
      items = items.filter(
        (c) => itemIds.has(c.id) || c.collectionIds.includes(filters.collectionId!)
      );
    }
    if (filters?.projectId) {
      items = items.filter((c) => c.projectId === filters.projectId);
    }
    if (filters?.status && filters.status !== 'ALL') {
      items = items.filter((c) => c.publicationStatus === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.prompt.toLowerCase().includes(q) ||
          c.aiModel.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)) ||
          (c.projectName || '').toLowerCase().includes(q)
      );
    }

    items.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
    return items.map((c) => this.decoratePrivateCreation(c, ownerId));
  }

  updatePrivateCreation(
    creationId: string,
    ownerId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      projectId?: string;
      projectName?: string;
    }
  ): UserCreation {
    const existing = this.db.creations[creationId];
    if (!existing) throw new Error('Creation not found.');
    if (existing.ownerId !== ownerId) throw new Error('Only the owner can edit this private creation.');

    if (typeof updates.title === 'string') {
      const clean = updates.title.trim().slice(0, 120);
      if (!clean) throw new Error('Title cannot be empty.');
      existing.title = clean;
    }
    if (typeof updates.description === 'string') {
      existing.description = updates.description.trim().slice(0, 2000);
    }
    if (updates.tags !== undefined) {
      existing.tags = sanitizeTags(updates.tags);
    }
    if (typeof updates.projectId === 'string') {
      existing.projectId = updates.projectId.trim() || undefined;
    }
    if (typeof updates.projectName === 'string') {
      existing.projectName = updates.projectName.trim().slice(0, 80) || undefined;
    }
    existing.updatedAt = new Date().toISOString();
    this.persist();
    return this.decoratePrivateCreation(existing, ownerId);
  }

  deletePrivateCreation(creationId: string, ownerId: string): void {
    const existing = this.db.creations[creationId];
    if (!existing) throw new Error('Creation not found.');
    if (existing.ownerId !== ownerId) {
      throw new Error('Only the creator can delete this creation.');
    }

    // If currently published, unpublish cleanly first so no dead card remains in public gallery
    if (existing.publishedCreationId && this.db.published[existing.publishedCreationId]) {
      this.db.published[existing.publishedCreationId].status = 'UNPUBLISHED';
      this.db.published[existing.publishedCreationId].updatedAt = new Date().toISOString();
    }
    // Withdraw active submission if any
    if (existing.activeSubmissionId && this.db.submissions[existing.activeSubmissionId]) {
      const sub = this.db.submissions[existing.activeSubmissionId];
      if (sub.status === 'SUBMITTED' || sub.status === 'UNDER_REVIEW') {
        sub.status = 'WITHDRAWN';
        sub.updatedAt = new Date().toISOString();
      }
    }

    // Remove collection references
    this.db.collectionItems = this.db.collectionItems.filter((ci) => ci.creationId !== creationId);
    this.recomputeCollectionCounts(ownerId);

    // Delete private asset binary files from disk
    const assetIds = [existing.primaryAssetId, existing.thumbnailAssetId].filter(
      (id): id is string => Boolean(id)
    );
    for (const aId of assetIds) {
      const asset = this.db.assets[aId];
      if (asset?.localFileName) {
        const fp = path.join(CURATED_PRIVATE_DIR, asset.localFileName);
        if (fs.existsSync(fp)) {
          try {
            fs.unlinkSync(fp);
          } catch {
            // Non-fatal
          }
        }
      }
      delete this.db.assets[aId];
    }

    delete this.db.creations[creationId];
    this.persist();
  }

  // Personal Collections
  private recomputeCollectionCounts(ownerId: string): void {
    for (const col of Object.values(this.db.collections)) {
      if (col.ownerId !== ownerId) continue;
      const items = this.db.collectionItems.filter(
        (ci) => ci.ownerId === ownerId && ci.collectionId === col.id && this.db.creations[ci.creationId]
      );
      col.itemCount = items.length;
      const firstCreation = items[0] ? this.db.creations[items[0].creationId] : undefined;
      col.coverAssetId = firstCreation?.primaryAssetId;
    }
  }

  listCollections(ownerId: string): CreationCollection[] {
    this.recomputeCollectionCounts(ownerId);
    return Object.values(this.db.collections)
      .filter((col) => col.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((col) => ({
        ...col,
        coverStreamUrl: col.coverAssetId
          ? this.buildPrivateStreamUrl(col.coverAssetId, ownerId, 'owner')
          : undefined,
      }));
  }

  createCollection(ownerId: string, name: string, description = ''): CreationCollection {
    const cleanName = name.trim().slice(0, 80);
    if (!cleanName) throw new Error('Collection name is required.');
    const nowIso = new Date().toISOString();
    const id = `col-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const col: CreationCollection = {
      id,
      ownerId,
      name: cleanName,
      description: description.trim().slice(0, 500),
      itemCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.db.collections[id] = col;
    this.persist();
    return col;
  }

  renameCollection(
    collectionId: string,
    ownerId: string,
    name: string,
    description?: string
  ): CreationCollection {
    const col = this.db.collections[collectionId];
    if (!col || col.ownerId !== ownerId) throw new Error('Collection not found.');
    const clean = name.trim().slice(0, 80);
    if (!clean) throw new Error('Collection name cannot be empty.');
    col.name = clean;
    if (typeof description === 'string') {
      col.description = description.trim().slice(0, 500);
    }
    col.updatedAt = new Date().toISOString();
    this.persist();
    return col;
  }

  deleteCollection(collectionId: string, ownerId: string): void {
    const col = this.db.collections[collectionId];
    if (!col || col.ownerId !== ownerId) throw new Error('Collection not found.');
    this.db.collectionItems = this.db.collectionItems.filter(
      (ci) => !(ci.collectionId === collectionId && ci.ownerId === ownerId)
    );
    for (const c of Object.values(this.db.creations)) {
      if (c.ownerId === ownerId && c.collectionIds.includes(collectionId)) {
        c.collectionIds = c.collectionIds.filter((id) => id !== collectionId);
      }
    }
    delete this.db.collections[collectionId];
    this.persist();
  }

  assignCreationToCollection(
    collectionId: string,
    creationId: string,
    ownerId: string,
    inCollection: boolean
  ): CreationCollection {
    const col = this.db.collections[collectionId];
    if (!col || col.ownerId !== ownerId) throw new Error('Collection not found.');
    const creation = this.db.creations[creationId];
    if (!creation || creation.ownerId !== ownerId) throw new Error('Creation not found.');

    const exists = this.db.collectionItems.some(
      (ci) => ci.collectionId === collectionId && ci.creationId === creationId
    );
    if (inCollection && !exists) {
      this.db.collectionItems.unshift({
        id: `ci-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        collectionId,
        creationId,
        ownerId,
        addedAt: new Date().toISOString(),
      });
      if (!creation.collectionIds.includes(collectionId)) {
        creation.collectionIds.push(collectionId);
      }
    } else if (!inCollection && exists) {
      this.db.collectionItems = this.db.collectionItems.filter(
        (ci) => !(ci.collectionId === collectionId && ci.creationId === creationId)
      );
      creation.collectionIds = creation.collectionIds.filter((id) => id !== collectionId);
    }

    col.updatedAt = new Date().toISOString();
    this.recomputeCollectionCounts(ownerId);
    this.persist();
    return {
      ...col,
      coverStreamUrl: col.coverAssetId
        ? this.buildPrivateStreamUrl(col.coverAssetId, ownerId, 'owner')
        : undefined,
    };
  }

  // ============================================================================
  // 3. SUGGEST FOR PUBLIC CURATION & SUBMISSION TRACKING
  // ============================================================================

  submitForCuration(params: {
    creationId: string;
    ownerId: string;
    ownerName: string;
    ownerAvatar?: string;
    proposedTitle: string;
    proposedDescription: string;
    category: string;
    tags: string[];
    creativeCredits?: string;
    projectName?: string;
    showCreatorProfile: boolean;
    showAiModel: boolean;
    showPromptAndParams: boolean;
  }): CurationSubmission {
    const creation = this.db.creations[params.creationId];
    if (!creation) throw new Error('Creation not found.');
    if (creation.ownerId !== params.ownerId) {
      throw new Error('Only the creator can submit this creation for public curation.');
    }

    if (
      creation.publicationStatus === 'submitted' ||
      creation.publicationStatus === 'under_review'
    ) {
      throw new Error('This creation already has an active curation submission under review.');
    }

    const title = params.proposedTitle.trim().slice(0, 120);
    if (!title) throw new Error('Public Title is required.');
    const description = params.proposedDescription.trim().slice(0, 2000);
    if (!description) throw new Error('Public Description is required.');
    const category =
      CURATED_CATEGORIES.find((cat) => cat.name === params.category || cat.id === params.category)
        ?.name || params.category.trim();
    if (!category) throw new Error('Category is required.');

    const cleanTags = sanitizeTags(params.tags);
    const nowIso = new Date().toISOString();
    const submissionId = `sub-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const submission: CurationSubmission = {
      id: submissionId,
      creationId: creation.id,
      ownerId: params.ownerId,
      ownerName: params.ownerName || creation.ownerName,
      ownerAvatar: params.ownerAvatar || creation.ownerAvatar,
      mediaType: creation.mediaType,
      primaryAssetId: creation.primaryAssetId,
      aspectRatio: creation.aspectRatio,
      resolution: creation.resolution,
      durationSeconds: creation.durationSeconds,
      aiModel: creation.aiModel,
      proposedTitle: title,
      proposedDescription: description,
      category,
      tags: cleanTags,
      creativeCredits: (params.creativeCredits || '').trim().slice(0, 300),
      projectName: params.projectName?.trim() || creation.projectName,
      showCreatorProfile: Boolean(params.showCreatorProfile),
      showAiModel: Boolean(params.showAiModel),
      showPromptAndParams: Boolean(params.showPromptAndParams),
      status: 'SUBMITTED',
      submittedAt: nowIso,
      updatedAt: nowIso,
    };

    this.db.submissions[submissionId] = submission;
    creation.publicationStatus = 'submitted';
    creation.activeSubmissionId = submissionId;
    creation.latestReviewNotes = undefined;
    creation.updatedAt = nowIso;
    // IMPORTANT: Keep visibility strictly 'private' until a curator approves!
    creation.visibility =
      creation.publishedCreationId &&
      this.db.published[creation.publishedCreationId]?.status === 'PUBLISHED'
        ? 'public'
        : 'private';

    this.persist();
    return {
      ...submission,
      mediaStreamUrl: this.buildPrivateStreamUrl(submission.primaryAssetId, params.ownerId, 'owner'),
    };
  }

  listOwnerSubmissions(ownerId: string): CurationSubmission[] {
    return Object.values(this.db.submissions)
      .filter((s) => s.ownerId === ownerId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .map((s) => ({
        ...s,
        mediaStreamUrl: this.buildPrivateStreamUrl(s.primaryAssetId, ownerId, 'owner'),
      }));
  }

  withdrawSubmission(submissionId: string, ownerId: string): {
    submission: CurationSubmission;
    creation: UserCreation;
  } {
    const sub = this.db.submissions[submissionId];
    if (!sub) throw new Error('Submission not found.');
    if (sub.ownerId !== ownerId) throw new Error('Only the creator can withdraw this submission.');

    const creation = this.db.creations[sub.creationId];
    if (!creation) throw new Error('Associated creation not found.');

    const nowIso = new Date().toISOString();
    sub.status = 'WITHDRAWN';
    sub.updatedAt = nowIso;

    creation.visibility = 'private';
    creation.publicationStatus = 'withdrawn';
    creation.updatedAt = nowIso;

    // If previously published, hide from public gallery immediately
    if (creation.publishedCreationId && this.db.published[creation.publishedCreationId]) {
      this.db.published[creation.publishedCreationId].status = 'UNPUBLISHED';
      this.db.published[creation.publishedCreationId].updatedAt = nowIso;
    }

    this.db.reviews.unshift({
      id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      submissionId: sub.id,
      creationId: creation.id,
      reviewerId: ownerId,
      reviewerName: creation.ownerName,
      reviewerEmail: '',
      decision: 'WITHDRAW',
      internalNotes: 'Creator withdrew submission from public curation.',
      creatorFeedback: 'Withdrawn by creator; creation remains safely in My Private Curates.',
      policyChecklist: defaultChecklist(),
      createdAt: nowIso,
    });

    this.persist();
    return {
      submission: sub,
      creation: this.decoratePrivateCreation(creation, ownerId),
    };
  }

  // ============================================================================
  // 4. CURATOR REVIEW DASHBOARD (AUTHORIZED CURATORS & ADMINS)
  // ============================================================================

  listSubmissionsForCurator(
    curatorUid: string,
    statusFilter?: string
  ): {
    submissions: CurationSubmission[];
    reviews: CurationReview[];
    reports: PublicCreationReport[];
  } {
    let subs = Object.values(this.db.submissions);
    if (statusFilter && statusFilter !== 'ALL') {
      subs = subs.filter((s) => s.status === statusFilter);
    }
    subs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    const decoratedSubs = subs.map((s) => {
      const creation = this.db.creations[s.creationId];
      return {
        ...s,
        mediaStreamUrl: this.buildPrivateStreamUrl(s.primaryAssetId, curatorUid, 'curator'),
        privatePrompt: creation?.prompt,
        privateParameters: creation?.parameters,
      };
    });

    const reports = [...this.db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return {
      submissions: decoratedSubs,
      reviews: this.db.reviews.slice(0, 200),
      reports,
    };
  }

  reviewSubmission(params: {
    submissionId: string;
    reviewerId: string;
    reviewerName: string;
    reviewerEmail: string;
    decision: 'START_REVIEW' | 'APPROVE' | 'REJECT' | 'REQUEST_REVISION';
    internalNotes?: string;
    creatorFeedback?: string;
    curatorBadge?: string;
    policyChecklist?: Partial<CurationPolicyChecklist>;
  }): {
    submission: CurationSubmission;
    review: CurationReview;
    published?: PublishedCreation;
  } {
    const sub = this.db.submissions[params.submissionId];
    if (!sub) throw new Error('Curation submission not found.');
    const creation = this.db.creations[sub.creationId];
    if (!creation) throw new Error('Source creation no longer exists.');

    if (sub.status === 'WITHDRAWN') {
      throw new Error('Cannot review a submission that the creator has withdrawn.');
    }

    const nowIso = new Date().toISOString();
    const checklist: CurationPolicyChecklist = {
      ...defaultChecklist(),
      ...(params.policyChecklist || {}),
    };

    const internalNotes = (params.internalNotes || '').trim().slice(0, 1500);
    const creatorFeedback = (params.creatorFeedback || '').trim().slice(0, 1500);

    let publishedRecord: PublishedCreation | undefined;

    if (params.decision === 'START_REVIEW') {
      sub.status = 'UNDER_REVIEW';
      creation.publicationStatus = 'under_review';
    } else if (params.decision === 'APPROVE') {
      if (
        !checklist.originalOrAuthorized ||
        !checklist.safetyCompliant ||
        !checklist.qualityApproved
      ) {
        throw new Error(
          'Approval requires confirming copyright authorization, safety compliance, and quality review.'
        );
      }
      sub.status = 'APPROVED';
      sub.latestReviewNotes = creatorFeedback || 'Approved for Seedance Public Curated Gallery.';
      sub.reviewedAt = nowIso;
      sub.reviewedBy = params.reviewerId;
      sub.reviewedByName = params.reviewerName;

      creation.visibility = 'public';
      creation.publicationStatus = 'published';
      creation.latestReviewNotes = sub.latestReviewNotes;

      // Update tag index
      for (const tagLabel of sub.tags) {
        const slug = slugifyTag(tagLabel);
        if (!slug) continue;
        const existingTag = this.db.tags[slug];
        if (existingTag) {
          existingTag.usageCount += 1;
          existingTag.updatedAt = nowIso;
        } else {
          this.db.tags[slug] = {
            id: slug,
            slug,
            label: tagLabel,
            usageCount: 1,
            updatedAt: nowIso,
          };
        }
      }

      const ownerProfile = seedanceCommunityStore.getPublicUserProfileView(sub.ownerId, sub.ownerId).profile;
      const existingPub = creation.publishedCreationId
        ? this.db.published[creation.publishedCreationId]
        : undefined;
      const pubId = existingPub?.id || `pub-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      publishedRecord = {
        id: pubId,
        creationId: creation.id,
        submissionId: sub.id,
        ownerId: creation.ownerId,
        title: sub.proposedTitle,
        description: sub.proposedDescription,
        category: sub.category,
        tags: [...sub.tags],
        mediaType: creation.mediaType,
        assetId: creation.primaryAssetId,
        thumbnailAssetId: creation.thumbnailAssetId,
        aspectRatio: creation.aspectRatio,
        resolution: creation.resolution,
        durationSeconds: creation.durationSeconds,
        creativeCredits: sub.creativeCredits || undefined,
        projectName: sub.projectName || creation.projectName,
        showCreatorProfile: sub.showCreatorProfile,
        creatorDisplayName: sub.showCreatorProfile
          ? ownerProfile.displayName || sub.ownerName
          : 'Anonymous Creator',
        creatorUsername: sub.showCreatorProfile ? ownerProfile.username : undefined,
        creatorAvatar: sub.showCreatorProfile ? ownerProfile.avatar || sub.ownerAvatar : undefined,
        showAiModel: sub.showAiModel,
        aiModel: sub.showAiModel ? creation.aiModel : undefined,
        showPromptAndParams: sub.showPromptAndParams,
        disclosedPrompt: sub.showPromptAndParams ? creation.prompt : undefined,
        disclosedParameters: sub.showPromptAndParams ? creation.parameters : undefined,
        status: 'PUBLISHED',
        commentsEnabled: existingPub ? existingPub.commentsEnabled : true,
        curatorBadge: params.curatorBadge?.trim().slice(0, 48) || existingPub?.curatorBadge,
        viewsCount: existingPub?.viewsCount || 0,
        uniqueViewsCount: existingPub?.uniqueViewsCount || 0,
        appreciationsCount: existingPub?.appreciationsCount || 0,
        favoritesCount: existingPub?.favoritesCount || 0,
        commentsCount: existingPub?.commentsCount || 0,
        sharesCount: existingPub?.sharesCount || 0,
        trendingScore: existingPub?.trendingScore || 0,
        reportCount: existingPub?.reportCount || 0,
        publishedAt: existingPub?.publishedAt || nowIso,
        updatedAt: nowIso,
      };
      publishedRecord.trendingScore = computeTrendingScore(publishedRecord);

      this.db.published[pubId] = publishedRecord;
      creation.publishedCreationId = pubId;

      if (!this.db.analytics[pubId]) {
        this.db.analytics[pubId] = {
          publishedCreationId: pubId,
          totalViews: 0,
          uniqueViewerHashes: [],
          appreciations: 0,
          favorites: 0,
          comments: 0,
          shares: 0,
        };
      }

      seedanceCommunityStore.pushNotification({
        recipientId: creation.ownerId,
        actorId: params.reviewerId,
        actorDisplayName: params.reviewerName,
        type: 'CURATION_APPROVED',
        title: 'Creation Approved for Public Curates',
        body: `"${sub.proposedTitle}" passed curator review and is now live in Public Curates.`,
        deepLink: {
          section: 'curated',
          creationId: creation.id,
          publishedId: pubId,
        },
      });
    } else if (params.decision === 'REJECT') {
      if (!creatorFeedback && !internalNotes) {
        throw new Error('Please provide a rejection reason or review feedback.');
      }
      sub.status = 'REJECTED';
      sub.rejectionReason = creatorFeedback || internalNotes;
      sub.latestReviewNotes = sub.rejectionReason;
      sub.reviewedAt = nowIso;
      sub.reviewedBy = params.reviewerId;
      sub.reviewedByName = params.reviewerName;

      // Ensure private creation stays intact and strictly private
      creation.visibility = 'private';
      creation.publicationStatus = 'rejected';
      creation.latestReviewNotes = sub.rejectionReason;

      if (creation.publishedCreationId && this.db.published[creation.publishedCreationId]) {
        this.db.published[creation.publishedCreationId].status = 'UNPUBLISHED';
        this.db.published[creation.publishedCreationId].updatedAt = nowIso;
      }

      seedanceCommunityStore.pushNotification({
        recipientId: creation.ownerId,
        actorId: params.reviewerId,
        actorDisplayName: params.reviewerName,
        type: 'CURATION_REJECTED',
        title: 'Curation Submission Not Approved',
        body: `"${sub.proposedTitle}" was not approved for Public Curates: ${sub.rejectionReason}. Your creation remains safely in My Private Curates.`,
        deepLink: {
          section: 'curated',
          creationId: creation.id,
        },
      });
    } else if (params.decision === 'REQUEST_REVISION') {
      if (!creatorFeedback) {
        throw new Error('Revision instructions for the creator are required.');
      }
      sub.status = 'REVISION_REQUESTED';
      sub.revisionInstructions = creatorFeedback;
      sub.latestReviewNotes = creatorFeedback;
      sub.reviewedAt = nowIso;
      sub.reviewedBy = params.reviewerId;
      sub.reviewedByName = params.reviewerName;

      creation.visibility = 'private';
      creation.publicationStatus = 'revision_requested';
      creation.latestReviewNotes = creatorFeedback;

      seedanceCommunityStore.pushNotification({
        recipientId: creation.ownerId,
        actorId: params.reviewerId,
        actorDisplayName: params.reviewerName,
        type: 'CURATION_REVISION',
        title: 'Curation Revision Requested',
        body: `Curator feedback for "${sub.proposedTitle}": ${creatorFeedback}`,
        deepLink: {
          section: 'curated',
          creationId: creation.id,
        },
      });
    }

    sub.policyChecklist = checklist;
    sub.updatedAt = nowIso;
    creation.updatedAt = nowIso;

    const review: CurationReview = {
      id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      submissionId: sub.id,
      creationId: creation.id,
      reviewerId: params.reviewerId,
      reviewerName: params.reviewerName,
      reviewerEmail: params.reviewerEmail,
      decision: params.decision,
      internalNotes,
      creatorFeedback,
      policyChecklist: checklist,
      createdAt: nowIso,
    };
    this.db.reviews.unshift(review);
    this.persist();

    seedancePlatformStore.addAuditLog({
      actorUid: params.reviewerId,
      actorEmail: params.reviewerEmail,
      action: `CURATION_${params.decision}`,
      targetType: 'CURATION_SUBMISSION',
      targetId: sub.id,
      reason: creatorFeedback || internalNotes || params.decision,
      metadata: { creationId: creation.id, ownerId: creation.ownerId },
    });

    return {
      submission: sub,
      review,
      published: publishedRecord
        ? this.decoratePublishedCreation(publishedRecord, params.reviewerId)
        : undefined,
    };
  }

  // ============================================================================
  // 5. PUBLIC CURATED GALLERY DISCOVERY (PUBLISHED ITEMS ONLY)
  // ============================================================================

  private decoratePublishedCreation(
    p: PublishedCreation,
    viewerUid?: string
  ): PublishedCreation {
    const viewerHasAppreciated = viewerUid
      ? this.db.reactions.some(
          (r) => r.publishedCreationId === p.id && r.userId === viewerUid
        )
      : false;
    const viewerHasFavorited = viewerUid
      ? this.db.favorites.some(
          (f) => f.publishedCreationId === p.id && f.userId === viewerUid
        )
      : false;
    const viewerIsFollowingCreator =
      viewerUid && p.showCreatorProfile && p.ownerId !== viewerUid
        ? seedanceCommunityStore.getPublicUserProfileView(p.ownerId, viewerUid).isFollowing
        : false;

    // Strict output scrubbing: NEVER expose private prompt/params or hidden creator identity
    return {
      id: p.id,
      creationId: p.creationId,
      submissionId: p.submissionId,
      ownerId: p.ownerId,
      title: p.title,
      description: p.description,
      category: p.category,
      tags: p.tags,
      mediaType: p.mediaType,
      assetId: p.assetId,
      thumbnailAssetId: p.thumbnailAssetId,
      aspectRatio: p.aspectRatio,
      resolution: p.resolution,
      durationSeconds: p.durationSeconds,
      creativeCredits: p.creativeCredits,
      projectName: p.projectName,
      showCreatorProfile: p.showCreatorProfile,
      creatorDisplayName: p.showCreatorProfile ? p.creatorDisplayName : 'Anonymous Creator',
      creatorUsername: p.showCreatorProfile ? p.creatorUsername : undefined,
      creatorAvatar: p.showCreatorProfile ? p.creatorAvatar : undefined,
      showAiModel: p.showAiModel,
      aiModel: p.showAiModel ? p.aiModel : undefined,
      showPromptAndParams: p.showPromptAndParams,
      disclosedPrompt: p.showPromptAndParams ? p.disclosedPrompt : undefined,
      disclosedParameters: p.showPromptAndParams ? p.disclosedParameters : undefined,
      status: p.status,
      commentsEnabled: p.commentsEnabled,
      curatorBadge: p.curatorBadge,
      viewsCount: p.viewsCount,
      uniqueViewsCount: p.uniqueViewsCount,
      appreciationsCount: p.appreciationsCount,
      favoritesCount: p.favoritesCount,
      commentsCount: p.commentsCount,
      sharesCount: p.sharesCount,
      trendingScore: p.trendingScore,
      reportCount: p.reportCount,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      mediaStreamUrl: this.buildPublicStreamUrl(p.assetId),
      thumbnailStreamUrl: p.thumbnailAssetId
        ? this.buildPublicStreamUrl(p.thumbnailAssetId)
        : undefined,
      viewerHasAppreciated,
      viewerHasFavorited,
      viewerIsFollowingCreator,
    };
  }

  listPublicCreations(options: {
    viewerUid?: string;
    mediaType?: 'ALL' | CuratedMediaType;
    category?: string;
    search?: string;
    sort?: PublicGallerySort;
    favoritesOnly?: boolean;
    page?: number;
    limit?: number;
  }): {
    creations: PublishedCreation[];
    total: number;
    page: number;
    totalPages: number;
    tags: CreationTag[];
  } {
    let items = Object.values(this.db.published).filter((p) => p.status === 'PUBLISHED');

    if (options.mediaType && options.mediaType !== 'ALL') {
      items = items.filter((p) => p.mediaType === options.mediaType);
    }

    if (options.category && options.category !== 'ALL') {
      items = items.filter(
        (p) => p.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    if (options.favoritesOnly && options.viewerUid) {
      const favIds = new Set(
        this.db.favorites
          .filter((f) => f.userId === options.viewerUid)
          .map((f) => f.publishedCreationId)
      );
      items = items.filter((p) => favIds.has(p.id));
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      items = items.filter((p) => {
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchTag = p.tags.some((t) => t.toLowerCase().includes(q));
        const matchCreator =
          p.showCreatorProfile &&
          ((p.creatorDisplayName || '').toLowerCase().includes(q) ||
            (p.creatorUsername || '').toLowerCase().includes(q));
        // Only match AI model if creator disclosed it publicly
        const matchModel =
          p.showAiModel && (p.aiModel || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchTag || matchCreator || matchModel;
      });
    }

    const sort = options.sort || 'latest';
    items.sort((a, b) => {
      if (sort === 'most_viewed') return b.viewsCount - a.viewsCount;
      if (sort === 'most_appreciated') return b.appreciationsCount - a.appreciationsCount;
      if (sort === 'popular') {
        const scoreA = a.appreciationsCount * 3 + a.favoritesCount * 2 + a.viewsCount * 0.2;
        const scoreB = b.appreciationsCount * 3 + b.favoritesCount * 2 + b.viewsCount * 0.2;
        return scoreB - scoreA;
      }
      if (sort === 'trending') {
        return computeTrendingScore(b) - computeTrendingScore(a);
      }
      if (sort === 'recently_curated') {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return b.publishedAt.localeCompare(a.publishedAt);
    });

    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.max(1, Math.min(60, Number(options.limit || 24)));
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const slice = items.slice((page - 1) * limit, page * limit);

    const topTags = Object.values(this.db.tags)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 24);

    return {
      creations: slice.map((p) => this.decoratePublishedCreation(p, options.viewerUid)),
      total,
      page,
      totalPages,
      tags: topTags,
    };
  }

  getPublicCreationDetail(
    publishedId: string,
    viewerUid?: string,
    viewerIpHash?: string,
    incrementView = true
  ): {
    creation: PublishedCreation;
    comments: CreationComment[];
    analytics?: CreationAnalytics;
  } {
    const pub = this.db.published[publishedId];
    if (!pub || pub.status !== 'PUBLISHED') {
      throw new Error('Published creation not found.');
    }

    if (incrementView) {
      const viewerKey = viewerUid || viewerIpHash || 'anon';
      const cooldownKey = `${publishedId}:${viewerKey}`;
      const lastView = this.viewCooldown.get(cooldownKey) || 0;
      if (Date.now() - lastView > 10 * 60 * 1000) {
        this.viewCooldown.set(cooldownKey, Date.now());
        pub.viewsCount += 1;
        const analytics = this.db.analytics[publishedId] || {
          publishedCreationId: publishedId,
          totalViews: 0,
          uniqueViewerHashes: [],
          appreciations: pub.appreciationsCount,
          favorites: pub.favoritesCount,
          comments: pub.commentsCount,
          shares: pub.sharesCount,
        };
        analytics.totalViews = pub.viewsCount;
        const vHash = crypto.createHash('sha256').update(viewerKey).digest('hex').slice(0, 16);
        if (!analytics.uniqueViewerHashes.includes(vHash)) {
          analytics.uniqueViewerHashes.push(vHash);
          pub.uniqueViewsCount = analytics.uniqueViewerHashes.length;
        }
        analytics.lastViewedAt = new Date().toISOString();
        this.db.analytics[publishedId] = analytics;
        pub.trendingScore = computeTrendingScore(pub);
        this.persist();
      }
    }

    const comments = (this.db.comments[publishedId] || []).slice().sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt)
    );
    const isOwner = viewerUid && pub.ownerId === viewerUid;

    return {
      creation: this.decoratePublishedCreation(pub, viewerUid),
      comments,
      analytics: isOwner ? this.db.analytics[publishedId] : undefined,
    };
  }

  // ============================================================================
  // 6. ENGAGEMENT: APPRECIATION, FAVORITES, COMMENTS, SHARES & REPORTS
  // ============================================================================

  toggleAppreciation(publishedId: string, userId: string): {
    appreciated: boolean;
    appreciationsCount: number;
  } {
    const pub = this.db.published[publishedId];
    if (!pub || pub.status !== 'PUBLISHED') throw new Error('Published creation not found.');

    const idx = this.db.reactions.findIndex(
      (r) => r.publishedCreationId === publishedId && r.userId === userId
    );
    let appreciated = false;
    if (idx >= 0) {
      this.db.reactions.splice(idx, 1);
      pub.appreciationsCount = Math.max(0, pub.appreciationsCount - 1);
      appreciated = false;
    } else {
      this.db.reactions.push({
        id: `rx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        publishedCreationId: publishedId,
        userId,
        reactionType: 'APPRECIATE',
        createdAt: new Date().toISOString(),
      });
      pub.appreciationsCount += 1;
      appreciated = true;
    }

    if (this.db.analytics[publishedId]) {
      this.db.analytics[publishedId].appreciations = pub.appreciationsCount;
    }
    pub.trendingScore = computeTrendingScore(pub);
    this.persist();

    return { appreciated, appreciationsCount: pub.appreciationsCount };
  }

  toggleFavorite(publishedId: string, userId: string): {
    favorited: boolean;
    favoritesCount: number;
  } {
    const pub = this.db.published[publishedId];
    if (!pub || pub.status !== 'PUBLISHED') throw new Error('Published creation not found.');

    const idx = this.db.favorites.findIndex(
      (f) => f.publishedCreationId === publishedId && f.userId === userId
    );
    let favorited = false;
    if (idx >= 0) {
      this.db.favorites.splice(idx, 1);
      pub.favoritesCount = Math.max(0, pub.favoritesCount - 1);
      favorited = false;
    } else {
      this.db.favorites.push({
        id: `fav-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        userId,
        publishedCreationId: publishedId,
        createdAt: new Date().toISOString(),
      });
      pub.favoritesCount += 1;
      favorited = true;
    }

    if (this.db.analytics[publishedId]) {
      this.db.analytics[publishedId].favorites = pub.favoritesCount;
    }
    pub.trendingScore = computeTrendingScore(pub);
    this.persist();
    return { favorited, favoritesCount: pub.favoritesCount };
  }

  recordShare(publishedId: string): { sharesCount: number } {
    const pub = this.db.published[publishedId];
    if (!pub || pub.status !== 'PUBLISHED') throw new Error('Published creation not found.');
    pub.sharesCount += 1;
    if (this.db.analytics[publishedId]) {
      this.db.analytics[publishedId].shares = pub.sharesCount;
    }
    pub.trendingScore = computeTrendingScore(pub);
    this.persist();
    return { sharesCount: pub.sharesCount };
  }

  addComment(params: {
    publishedId: string;
    authorId: string;
    authorName: string;
    authorAvatar?: string;
    content: string;
  }): { comment: CreationComment; commentsCount: number } {
    const pub = this.db.published[params.publishedId];
    if (!pub || pub.status !== 'PUBLISHED') throw new Error('Published creation not found.');
    if (!pub.commentsEnabled) {
      throw new Error('Comments are disabled for this creation by its creator.');
    }

    const clean = params.content.trim().slice(0, 1500);
    if (!clean) throw new Error('Comment content cannot be empty.');

    const nowIso = new Date().toISOString();
    const comment: CreationComment = {
      id: `cmt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      publishedCreationId: pub.id,
      creationId: pub.creationId,
      authorId: params.authorId,
      authorName: params.authorName || 'Creator',
      authorAvatar: params.authorAvatar,
      content: clean,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (!this.db.comments[pub.id]) this.db.comments[pub.id] = [];
    this.db.comments[pub.id].push(comment);
    pub.commentsCount = this.db.comments[pub.id].length;
    if (this.db.analytics[pub.id]) {
      this.db.analytics[pub.id].comments = pub.commentsCount;
    }
    pub.trendingScore = computeTrendingScore(pub);
    this.persist();

    if (pub.ownerId !== params.authorId) {
      seedanceCommunityStore.pushNotification({
        recipientId: pub.ownerId,
        actorId: params.authorId,
        actorDisplayName: params.authorName,
        type: 'CURATION_COMMENT',
        title: `New comment on "${pub.title}"`,
        body: clean.slice(0, 140),
        deepLink: {
          section: 'curated',
          publishedId: pub.id,
          creationId: pub.creationId,
        },
      });
    }

    return { comment, commentsCount: pub.commentsCount };
  }

  deleteComment(
    publishedId: string,
    commentId: string,
    requesterUid: string,
    isCurator: boolean
  ): { commentsCount: number } {
    const pub = this.db.published[publishedId];
    if (!pub) throw new Error('Published creation not found.');
    const list = this.db.comments[publishedId] || [];
    const target = list.find((c) => c.id === commentId);
    if (!target) throw new Error('Comment not found.');

    if (target.authorId !== requesterUid && pub.ownerId !== requesterUid && !isCurator) {
      throw new Error('Permission denied to delete this comment.');
    }

    this.db.comments[publishedId] = list.filter((c) => c.id !== commentId);
    pub.commentsCount = this.db.comments[publishedId].length;
    if (this.db.analytics[publishedId]) {
      this.db.analytics[publishedId].comments = pub.commentsCount;
    }
    this.persist();
    return { commentsCount: pub.commentsCount };
  }

  // ============================================================================
  // 7. CREATOR POST-PUBLISH CONTROLS & MODERATION REMOVAL / REPORTS
  // ============================================================================

  updatePublishedByCreator(
    publishedId: string,
    ownerId: string,
    updates: {
      title?: string;
      description?: string;
      tags?: string[];
      category?: string;
      creativeCredits?: string;
      commentsEnabled?: boolean;
      showCreatorProfile?: boolean;
      showAiModel?: boolean;
      showPromptAndParams?: boolean;
      action?: 'unpublish';
    }
  ): PublishedCreation {
    const pub = this.db.published[publishedId];
    if (!pub) throw new Error('Published creation not found.');
    if (pub.ownerId !== ownerId) throw new Error('Only the creator can modify this published creation.');

    const creation = this.db.creations[pub.creationId];
    const nowIso = new Date().toISOString();

    if (updates.action === 'unpublish') {
      pub.status = 'UNPUBLISHED';
      pub.updatedAt = nowIso;
      if (creation) {
        creation.visibility = 'private';
        creation.publicationStatus = 'withdrawn';
        creation.updatedAt = nowIso;
      }
      if (pub.submissionId && this.db.submissions[pub.submissionId]) {
        this.db.submissions[pub.submissionId].status = 'WITHDRAWN';
        this.db.submissions[pub.submissionId].updatedAt = nowIso;
      }
      this.persist();
      return this.decoratePublishedCreation(pub, ownerId);
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
      pub.title = updates.title.trim().slice(0, 120);
    }
    if (typeof updates.description === 'string') {
      pub.description = updates.description.trim().slice(0, 2000);
    }
    if (Array.isArray(updates.tags)) {
      pub.tags = sanitizeTags(updates.tags);
    }
    if (typeof updates.category === 'string' && updates.category.trim()) {
      pub.category = updates.category.trim();
    }
    if (typeof updates.creativeCredits === 'string') {
      pub.creativeCredits = updates.creativeCredits.trim().slice(0, 300);
    }
    if (typeof updates.commentsEnabled === 'boolean') {
      pub.commentsEnabled = updates.commentsEnabled;
    }
    if (typeof updates.showCreatorProfile === 'boolean') {
      pub.showCreatorProfile = updates.showCreatorProfile;
      if (updates.showCreatorProfile) {
        const prof = seedanceCommunityStore.getPublicUserProfileView(ownerId, ownerId).profile;
        pub.creatorDisplayName = prof.displayName || creation?.ownerName || 'Creator';
        pub.creatorUsername = prof.username;
        pub.creatorAvatar = prof.avatar;
      } else {
        pub.creatorDisplayName = 'Anonymous Creator';
        pub.creatorUsername = undefined;
        pub.creatorAvatar = undefined;
      }
    }
    if (typeof updates.showAiModel === 'boolean') {
      pub.showAiModel = updates.showAiModel;
      pub.aiModel = updates.showAiModel ? creation?.aiModel : undefined;
    }
    if (typeof updates.showPromptAndParams === 'boolean') {
      pub.showPromptAndParams = updates.showPromptAndParams;
      pub.disclosedPrompt = updates.showPromptAndParams ? creation?.prompt : undefined;
      pub.disclosedParameters = updates.showPromptAndParams ? creation?.parameters : undefined;
    }

    pub.updatedAt = nowIso;
    this.persist();
    return this.decoratePublishedCreation(pub, ownerId);
  }

  reportPublicCreation(params: {
    publishedId: string;
    reporterId: string;
    reporterName: string;
    reason: string;
    details?: string;
  }): PublicCreationReport {
    const pub = this.db.published[params.publishedId];
    if (!pub || pub.status !== 'PUBLISHED') throw new Error('Published creation not found.');
    const reason = params.reason.trim().slice(0, 120);
    if (!reason) throw new Error('Report reason is required.');

    const report: PublicCreationReport = {
      id: `crep-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      publishedCreationId: pub.id,
      creationId: pub.creationId,
      publishedTitle: pub.title,
      reporterId: params.reporterId,
      reporterName: params.reporterName || 'User',
      reason,
      details: (params.details || '').trim().slice(0, 1000),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    this.db.reports.unshift(report);
    pub.reportCount += 1;
    this.persist();
    return report;
  }

  moderatePublishedCreation(params: {
    publishedId: string;
    curatorUid: string;
    curatorName: string;
    curatorEmail: string;
    action: 'REMOVE_PUBLIC' | 'DISMISS_REPORTS';
    reason: string;
    reportId?: string;
  }): void {
    const pub = this.db.published[params.publishedId];
    if (!pub) throw new Error('Published creation not found.');
    const nowIso = new Date().toISOString();

    if (params.action === 'REMOVE_PUBLIC') {
      pub.status = 'REMOVED';
      pub.updatedAt = nowIso;
      const creation = this.db.creations[pub.creationId];
      if (creation) {
        creation.visibility = 'private';
        creation.publicationStatus = 'rejected';
        creation.latestReviewNotes = `Removed from Public Curates: ${params.reason}`;
        creation.updatedAt = nowIso;
      }
      for (const r of this.db.reports) {
        if (r.publishedCreationId === pub.id && r.status === 'OPEN') {
          r.status = 'RESOLVED';
          r.reviewedBy = params.curatorUid;
          r.reviewedAt = nowIso;
          r.resolutionNote = params.reason;
        }
      }
      this.db.reviews.unshift({
        id: `rev-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        submissionId: pub.submissionId,
        creationId: pub.creationId,
        reviewerId: params.curatorUid,
        reviewerName: params.curatorName,
        reviewerEmail: params.curatorEmail,
        decision: 'MODERATE_REMOVE',
        internalNotes: params.reason,
        creatorFeedback: `Removed from Public Curates: ${params.reason}`,
        policyChecklist: defaultChecklist(),
        createdAt: nowIso,
      });

      seedanceCommunityStore.pushNotification({
        recipientId: pub.ownerId,
        actorId: params.curatorUid,
        actorDisplayName: params.curatorName,
        type: 'MODERATION_ACTION',
        title: 'Creation Removed from Public Curates',
        body: `"${pub.title}" was unpublished by curation moderation: ${params.reason}. Your private original remains safe in My Private Curates.`,
        deepLink: {
          section: 'curated',
          creationId: pub.creationId,
        },
      });
    } else if (params.action === 'DISMISS_REPORTS') {
      for (const r of this.db.reports) {
        if (
          r.publishedCreationId === pub.id &&
          r.status === 'OPEN' &&
          (!params.reportId || r.id === params.reportId)
        ) {
          r.status = 'DISMISSED';
          r.reviewedBy = params.curatorUid;
          r.reviewedAt = nowIso;
          r.resolutionNote = params.reason || 'Reviewed and cleared';
        }
      }
    }

    this.persist();
    seedancePlatformStore.addAuditLog({
      actorUid: params.curatorUid,
      actorEmail: params.curatorEmail,
      action: `CURATED_${params.action}`,
      targetType: 'PUBLISHED_CREATION',
      targetId: pub.id,
      reason: params.reason,
    });
  }

  // ============================================================================
  // 8. PROTECTED MEDIA DELIVERY GATE
  // ============================================================================

  authorizeAssetAccess(params: {
    assetId: string;
    token?: string;
    requesterUid?: string;
    requesterIsCurator?: boolean;
  }): {
    allowed: boolean;
    reason?: string;
    asset?: CreationAsset;
    filePath?: string;
    externalUrl?: string;
    isPublicAsset?: boolean;
  } {
    const asset = this.db.assets[params.assetId];
    if (!asset) {
      return { allowed: false, reason: 'Asset not found.' };
    }

    const resolveDelivery = (isPublicAsset: boolean) => {
      if (asset.storageKind === 'private_file' && asset.localFileName) {
        const fp = path.join(CURATED_PRIVATE_DIR, path.basename(asset.localFileName));
        if (!fs.existsSync(fp)) {
          return { allowed: false, reason: 'Private asset file missing on disk.' };
        }
        return { allowed: true, asset, filePath: fp, isPublicAsset };
      }
      if (asset.externalUrl) {
        return { allowed: true, asset, externalUrl: asset.externalUrl, isPublicAsset };
      }
      return { allowed: false, reason: 'Asset location unavailable.' };
    };

    // 1. Is it linked to an actively PUBLISHED public creation?
    const activePublic = Object.values(this.db.published).find(
      (p) =>
        p.status === 'PUBLISHED' &&
        (p.assetId === asset.id || p.thumbnailAssetId === asset.id)
    );
    if (activePublic) {
      return resolveDelivery(true);
    }

    // 2. Otherwise strictly private: verify owner or authorized curator
    if (params.requesterUid) {
      if (asset.ownerId === params.requesterUid) {
        return resolveDelivery(false);
      }
      if (params.requesterIsCurator) {
        const hasSubmission = Object.values(this.db.submissions).some(
          (s) => s.creationId === asset.creationId
        );
        if (hasSubmission) {
          return resolveDelivery(false);
        }
      }
    }

    // 3. Verify signed asset token (used cleanly by <img src> & <video src>)
    if (params.token) {
      const check = this.verifyAssetToken(params.token, asset.id);
      if (check.valid && check.uid) {
        if (check.uid === asset.ownerId && check.scope === 'owner') {
          return resolveDelivery(false);
        }
        if (check.scope === 'curator') {
          const hasSubmission = Object.values(this.db.submissions).some(
            (s) => s.creationId === asset.creationId
          );
          if (hasSubmission) {
            return resolveDelivery(false);
          }
        }
      }
    }

    return {
      allowed: false,
      reason: 'Access denied: private AI creation media is restricted to its creator.',
    };
  }
}

export const seedanceCuratedStore = new SeedanceCuratedStore();
