import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { apiRouter } from './src/server/apiRoutes';
import { copyRouter } from './src/server/copyRoutes';
import { promptRouter } from './src/server/promptRoutes';
import { midjourneyRouter, handleMidjourneyLongPollGenerate } from './src/server/midjourneyRoutes';
import { createPosBotRouter } from './src/server/posbotRoutes';
import { vxRouter } from './src/server/vxRoutes';
import { seedancePlatformRouter } from './src/server/seedancePlatformRoutes';
import { vxaSecurityRouter } from './src/server/vxaSecurityRoutes';

dotenv.config();
process.env.DISABLE_HMR = 'true';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // Ensure uploads directory exists for persistent media files
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Hero & AI Studio Asset Streaming Route: HTTP 206 Partial Content range requests for smooth looping on PC & Mobile
  const aistudioAssetsDir = path.resolve(process.cwd(), 'public', 'assets', 'aistudio');
  app.get('/assets/aistudio/:filename', (req, res, next) => {
    const rawFilename = path.basename(req.params.filename);
    const filePath = path.join(aistudioAssetsDir, rawFilename);

    if (!fs.existsSync(filePath)) {
      return next();
    }

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(rawFilename).toLowerCase();

      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';

      if (range && contentType.startsWith('video/')) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize || isNaN(start) || isNaN(end)) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (streamErr) {
      next(streamErr);
    }
  });

  // Video Streaming Route: HTTP 206 Partial Content range requests for instant scrubbing
  app.get('/uploads/:filename', (req, res, next) => {
    const rawFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, rawFilename);

    if (!fs.existsSync(filePath)) {
      return next();
    }

    try {
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(rawFilename).toLowerCase();

      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.gif') contentType = 'image/gif';

      if (range && contentType.startsWith('video/')) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          return;
        }

        const chunkSize = end - start + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (streamErr) {
      next(streamErr);
    }
  });

  // Security guard: Block any direct access to quarantined unverified assets
  app.use('/uploads/threads/quarantine', (_req, res) => {
    res.status(403).json({ error: 'Access denied: Quarantine assets are private and restricted.' });
  });

  // Long-term immutable caching for optimized WebP thread images and thumbnails
  const optimizedDir = path.join(uploadsDir, 'threads', 'optimized');
  const thumbnailsDir = path.join(uploadsDir, 'threads', 'thumbnails');
  if (!fs.existsSync(optimizedDir)) fs.mkdirSync(optimizedDir, { recursive: true });
  if (!fs.existsSync(thumbnailsDir)) fs.mkdirSync(thumbnailsDir, { recursive: true });

  app.use('/uploads/threads/optimized', express.static(optimizedDir, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));

  app.use('/uploads/threads/thumbnails', express.static(thumbnailsDir, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));

  // Fallback static files for other uploads
  app.use('/uploads', express.static(uploadsDir, { acceptRanges: true, maxAge: '7d' }));

  // Mount VAIURE AI Copywriting, Editorial Generation & Content Duplication Backend
  app.use('/api/copy', copyRouter);

  // Mount VAIURE Labs Advanced Prompt Engineering & Seedance 2.5 Temporal Sequence Studio
  app.use('/api/prompt', promptRouter);
  app.use('/api/generation', promptRouter);

  // Mount VAIURE Labs Community AI Video Platform — Seedance 2.5 Exclusive Backend
  app.use('/api/labs', seedancePlatformRouter);

  // Mount VAIURE VXA Financial Security Infrastructure & Digital Wallet Core (/api/vxa/*)
  app.use('/api/vxa', vxaSecurityRouter);

  // Mount Midjourney-Discord Official HTTPS API Automation Bridge
  app.use('/api/midjourney', midjourneyRouter);
  app.post('/api/generate', handleMidjourneyLongPollGenerate);
  app.post('/api/generate-image', handleMidjourneyLongPollGenerate);

  // Mount PosBot Developer API v1 Studio Bridge (/api/ai/*)
  app.use('/api/ai', createPosBotRouter());

  // Mount VX — Visual Reconstruction Engine Backend (/api/vx/*)
  app.use('/api/vx', vxRouter);

  // Mount IVNTRI Account, Wallet, Currency, Security, Admin & Media APIs
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'IVNTRI Video & Visual Culture Platform',
      version: '2026.ivntri.v1',
    });
  });

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

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`IVNTRI Server running on port ${PORT}`);
  });
}

startServer();
