import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/apiRoutes';
import { copyRouter } from './src/server/copyRoutes';
import { promptRouter } from './src/server/promptRoutes';
import { midjourneyRouter, handleMidjourneyLongPollGenerate } from './src/server/midjourneyRoutes';
import { createByteDanceRouter } from './src/server/bytedanceRoutes';
import { vxRouter } from './src/server/vxRoutes';
import { seedancePlatformRouter } from './src/server/seedancePlatformRoutes';
import { vxaSecurityRouter } from './src/server/vxaSecurityRoutes';
import { seedanceAgentRouter } from './src/server/seedanceAgentRoutes';
import { seedanceRealtimeRouter } from './src/server/seedanceRealtimeRoutes';
import { seedanceAdminRouter } from './src/server/seedanceAdminRoutes';
import { seedanceCommunityRouter } from './src/server/seedanceCommunityRoutes';
import { seedanceCuratedRouter } from './src/server/seedanceCuratedRoutes';
import { createMultiProviderRouter } from './src/server/multiProvider/routes/multiProviderRoutes';
import { startGenerationBackgroundWorker } from './src/server/multiProvider/workers/generation.worker';
import { requireFirebaseAuth } from './src/server/firebaseAuthMiddleware';
import { attachRealtimeWebSocketServer } from './src/server/realtimeHub';
import {
  applySecurityHeaders,
  csrfOriginGuard,
  globalApiLimiter,
  aiLimiter,
  sanitizedErrorHandler,
  resolveSafeSubpath,
} from './src/server/securityMiddleware';
import { startBackupScheduler } from './src/server/backupService';

dotenv.config();
process.env.DISABLE_HMR = 'true';

const SAFE_MEDIA_MIME_BY_EXT: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

function streamSafeMediaFile(
  filePath: string,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  cacheControl: string
): void {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = SAFE_MEDIA_MIME_BY_EXT[ext];
  if (!contentType) {
    res.status(403).json({ error: 'File type not permitted for public media delivery.' });
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) {
      res.status(404).end();
      return;
    }
    const fileSize = stat.size;
    const range = req.headers.range;

    const securityFileHeaders: Record<string, string | number> = {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': cacheControl,
      'Accept-Ranges': 'bytes',
    };

    if (range && (contentType.startsWith('video/') || contentType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start < 0 ||
        end < start ||
        start >= fileSize ||
        end >= fileSize
      ) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
        return;
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });

      res.writeHead(206, {
        ...securityFileHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunkSize,
      });
      fileStream.pipe(res);
    } else {
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      res.writeHead(200, {
        ...securityFileHeaders,
        'Content-Length': fileSize,
      });
      fileStream.pipe(res);
    }
  } catch (streamErr) {
    next(streamErr);
  }
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const httpServer = http.createServer(app);

  // Global security headers & CSRF origin guard
  app.use(applySecurityHeaders);
  app.use('/api', csrfOriginGuard);
  app.use('/api', globalApiLimiter);

  // Scoped higher JSON limit only for routes accepting base64 image/video payloads
  const largePayloadJson = express.json({ limit: '35mb' });
  app.use('/api/upload/base64', largePayloadJson);
  app.use('/api/vx', largePayloadJson);
  app.use('/api/ai', largePayloadJson);
  app.use('/api/prompt', largePayloadJson);
  app.use('/api/agent', largePayloadJson);
  app.use('/api/community', largePayloadJson);
  app.use('/api/curated', largePayloadJson);
  app.use('/api/generations', largePayloadJson);

  // Standard 12MB JSON limit elsewhere
  app.use(express.json({ limit: '12mb' }));
  app.use(express.urlencoded({ extended: true, limit: '12mb' }));

  // Ensure uploads directory exists for persistent media files
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Hero & AI Studio Asset Streaming Route (whitelisted media extensions only)
  const aistudioAssetsDir = path.resolve(process.cwd(), 'public', 'assets', 'aistudio');
  app.get('/assets/aistudio/:filename', (req, res, next) => {
    const filePath = resolveSafeSubpath(aistudioAssetsDir, path.basename(req.params.filename));
    if (!filePath || !fs.existsSync(filePath)) {
      return next();
    }
    return streamSafeMediaFile(filePath, req, res, next, 'public, max-age=31536000, immutable');
  });

  // Security guard: Explicitly block dotfiles, backup vaults, server source, rules, private DBs, & quarantine
  app.use((req, res, next) => {
    const rawPath = req.path;
    const reqPath = rawPath.toLowerCase();
    if (reqPath.includes('..') || rawPath.includes('\0')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (
      reqPath.startsWith('/.vaiure_backups') ||
      reqPath.startsWith('/src/server') ||
      reqPath === '/firestore.rules' ||
      reqPath === '/storage.rules' ||
      reqPath === '/server.ts' ||
      reqPath === '/package.json' ||
      reqPath === '/package-lock.json'
    ) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const isDevViteCache =
      process.env.NODE_ENV !== 'production' &&
      !reqPath.includes('/.env') &&
      !reqPath.includes('/.git') &&
      (reqPath.startsWith('/node_modules/.vite/') ||
        reqPath.startsWith('/node_modules/.vite-temp/') ||
        reqPath.startsWith('/node_modules/.pnpm/') ||
        reqPath.startsWith('/.vite/') ||
        (reqPath.startsWith('/@fs/') &&
          (reqPath.includes('/node_modules/.vite/') || reqPath.includes('/node_modules/.pnpm/'))));
    if (!isDevViteCache) {
      const segments = reqPath.split('/').filter(Boolean);
      if (segments.some((s) => s.startsWith('.') && s !== '.well-known')) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    }
    return next();
  });

  app.use('/uploads/threads/quarantine', (_req, res) => {
    res.status(403).json({ error: 'Access denied: Quarantine assets are private and restricted.' });
  });
  app.use('/uploads/curated_private', (_req, res) => {
    res.status(403).json({ error: 'Access denied: Private curated media assets are protected.' });
  });

  // Ensure safe public media directories exist
  const optimizedDir = path.join(uploadsDir, 'threads', 'optimized');
  const thumbnailsDir = path.join(uploadsDir, 'threads', 'thumbnails');
  const communityUploadsDir = path.join(uploadsDir, 'community');
  const avatarsUploadsDir = path.join(uploadsDir, 'avatars');
  if (!fs.existsSync(optimizedDir)) fs.mkdirSync(optimizedDir, { recursive: true });
  if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });
  if (!fs.existsSync(communityUploadsDir)) fs.mkdirSync(communityUploadsDir, { recursive: true });
  if (!fs.existsSync(avatarsUploadsDir)) fs.mkdirSync(avatarsUploadsDir, { recursive: true });

  app.use('/uploads/threads/optimized', express.static(optimizedDir, {
    maxAge: '1y',
    immutable: true,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));

  app.use('/uploads/threads/thumbnails', express.static(thumbnailsDir, {
    maxAge: '1y',
    immutable: true,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));

  // Safe media-only delivery for Community uploads (/uploads/community/:filename)
  app.get('/uploads/community/:filename', (req, res, next) => {
    const base = path.basename(req.params.filename);
    if (!base || base.startsWith('.')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const ext = path.extname(base).toLowerCase();
    if (!SAFE_MEDIA_MIME_BY_EXT[ext]) {
      return res.status(403).json({ error: 'Access denied: Non-media file access is prohibited.' });
    }
    const filePath = resolveSafeSubpath(communityUploadsDir, base);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Community media asset not found.' });
    }
    return streamSafeMediaFile(filePath, req, res, next, 'public, max-age=86400');
  });

  // Safe media-only delivery for Profile avatar uploads (/uploads/avatars/:filename)
  app.get('/uploads/avatars/:filename', (req, res, next) => {
    const base = path.basename(req.params.filename);
    if (!base || base.startsWith('.')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const ext = path.extname(base).toLowerCase();
    if (!SAFE_MEDIA_MIME_BY_EXT[ext]) {
      return res.status(403).json({ error: 'Access denied: Non-media file access is prohibited.' });
    }
    const filePath = resolveSafeSubpath(avatarsUploadsDir, base);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Avatar media asset not found.' });
    }
    return streamSafeMediaFile(filePath, req, res, next, 'public, max-age=86400');
  });

  // Strict media-only route for /uploads/* — NEVER serves JSON DBs, .tmp, .svg, .html, dotfiles, or subdirs
  app.get('/uploads/:filename', (req, res, next) => {
    const base = path.basename(req.params.filename);
    if (!base || base.startsWith('.')) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const ext = path.extname(base).toLowerCase();
    if (!SAFE_MEDIA_MIME_BY_EXT[ext]) {
      return res.status(403).json({ error: 'Access denied: Non-media file access is prohibited.' });
    }
    const filePath = resolveSafeSubpath(uploadsDir, base);
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Media asset not found.' });
    }
    return streamSafeMediaFile(filePath, req, res, next, 'public, max-age=86400');
  });

  // Catch any nested or disguised access under /uploads/* (prevents JSON DB / config / backup exposure)
  app.use('/uploads', (_req, res) => {
    res.status(403).json({ error: 'Access denied: Protected storage path.' });
  });

  // Mount VAIURE AI Copywriting, Editorial Generation & Content Duplication Backend
  app.use('/api/copy', copyRouter);

  // Mount VAIURE Labs Advanced Prompt Engineering & Seedance 2.5 Temporal Sequence Studio
  app.use('/api/prompt', promptRouter);
  app.use('/api/generation', promptRouter);

  // Mount VAIURE Labs Community AI Video Platform — Seedance 2.5 Exclusive Backend
  app.use('/api/labs', seedancePlatformRouter);

  // Mount Personal AI Creative Agent & Memory Routes (/api/agent/*)
  app.use('/api/agent', seedanceAgentRouter);

  // Mount Real-Time Livestreams & Multiplayer Call Rooms REST Routes (/api/streams/*, /api/rooms/*)
  app.use('/api', seedanceRealtimeRouter);

  // Mount Seedance Platform Governance Admin Routes (/api/admin/platform/*)
  app.use('/api/admin/platform', seedanceAdminRouter);

  // Mount Seedance Community & Groups Ecosystem Routes (/api/community/*)
  app.use('/api/community', seedanceCommunityRouter);

  // Mount Seedance Curated Gallery & Public Discovery Routes (/api/curated/*)
  app.use('/api/curated', seedanceCuratedRouter);

  // Mount VAIURE VXA Financial Security Infrastructure & Digital Wallet Core (/api/vxa/*)
  app.use('/api/vxa', vxaSecurityRouter);

  // Mount Midjourney-Discord Official HTTPS API Automation Bridge
  app.use('/api/midjourney', midjourneyRouter);
  app.post('/api/generate', requireFirebaseAuth, aiLimiter, handleMidjourneyLongPollGenerate);
  app.post('/api/generate-image', requireFirebaseAuth, aiLimiter, handleMidjourneyLongPollGenerate);

  // Mount ByteDance BytePlus ModelArk API v3 Studio Bridge (/api/ai/*)
  app.use('/api/ai', createByteDanceRouter());

  // Mount Multi-Provider AI Video Generation Routes (/api/providers, /api/generations/*, /api/generated-media/*, /api/admin/providers/*)
  app.use('/api', createMultiProviderRouter());

  // Mount VX — Visual Reconstruction Engine Backend (/api/vx/*)
  app.use('/api/vx', vxRouter);

  // Mount IVNTRI Account, Wallet, Currency, Security, Admin & Media APIs
  app.use('/api', apiRouter);

  // Non-sensitive health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'IVNTRI Video & Visual Culture Platform',
      version: '2026.ivntri.v2',
    });
  });

  // Ensure unknown /api/* paths return JSON 404 rather than falling through to SPA index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found.' });
  });

  // Start automated database backup scheduler (.vaiure_backups/)
  startBackupScheduler();

  // Start background polling worker for active multi-provider generation jobs
  startGenerationBackgroundWorker();

  // Attach Real-Time WebSocket Hub for Livestreams & Multiplayer Call Rooms (/ws)
  attachRealtimeWebSocketServer(httpServer);

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  // Centralized sanitized error handler — never leaks stack traces or filesystem paths
  app.use(sanitizedErrorHandler);

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`IVNTRI Server running on port ${PORT} with WebSocket hub at /ws`);
  });
}

startServer();
