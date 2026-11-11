/**
 * VAIURE Copy & Editorial Generation Backend Router
 * REST & SSE endpoints for AI copywriting, draft polishing, translations,
 * content cloning (duplication), archive export, and copy links.
 */

import { Router, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  generateEditorialCopy,
  polishDraftCopy,
  generateCinemaCopy,
  translateEditorialCopy,
  duplicatePost,
  duplicateThread,
  exportUserArchiveCopy,
  generateCopyShareLink,
} from './copyService';
import { db, doc, getDoc, updateDoc, increment } from '../lib/firebase';

export const copyRouter = Router();

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

/**
 * GET /api/copy/health
 * Health check & capabilities verification
 */
copyRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'VAIURE Editorial Copy & Content Replication Engine',
    model: 'gemini-3.8-flash',
    hasApiKey: Boolean(apiKey),
    capabilities: [
      'EDITORIAL_COPY_GENERATION',
      'SSE_STREAMING_COPY',
      'COPY_POLISHING',
      'CINEMA_LOGLINE_DOSSIER',
      'MULTILINGUAL_TRANSLATION',
      'POST_CLONING_DUPLICATION',
      'THREAD_CLONING_DUPLICATION',
      'USER_ARCHIVE_COPY_EXPORT',
      'SHARE_COPY_LINK_TRACKING',
    ],
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/copy/generate
 * Generate editorial copy, headlines, manifesto, and metadata
 */
copyRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const { topic, tone, category, visualPrompt, artistName, aiToolsUsed, targetLanguage, length } = req.body;
    const result = await generateEditorialCopy({
      topic,
      tone,
      category,
      visualPrompt,
      artistName,
      aiToolsUsed,
      targetLanguage,
      length,
    });
    res.json(result);
  } catch (err: any) {
    console.error('Copy generate error:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate editorial copy.' });
  }
});

/**
 * POST /api/copy/stream
 * Real-time SSE streaming generation for dynamic typing interfaces
 */
copyRouter.post('/stream', async (req: Request, res: Response) => {
  const { prompt, tone = 'luxury-editorial', category = 'COUTURE' } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required for streaming copy.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  if (!apiKey) {
    const fallbackText = `THE KINETIC HORIZON //\n\nA meditation on ${prompt}.\n\nForm dissolves into luminosity as generative tensors articulate the liminal boundary between physical couture and synthetic memory.`;
    res.write(`data: ${JSON.stringify({ chunk: fallbackText, done: true })}\n\n`);
    res.end();
    return;
  }

  try {
    const systemInstruction = `You are the Lead Editorial Director of VAIURE (唯昱尔). Write poetic, minimal, luxury fashion/cinema editorial copy. Tone: ${tone}. Category: ${category}.`;
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents: `Write an evocative editorial piece based on: "${prompt}". Keep it around 150-200 words. Include a strong headline.`,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ chunk: text, done: false })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    console.warn('Streaming error:', err?.message || err);
    res.write(`data: ${JSON.stringify({ error: err.message, done: true })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/copy/polish
 * Polish, refine, and elevate raw creator drafts
 */
copyRouter.post('/polish', async (req: Request, res: Response) => {
  try {
    const { draftText, tone, targetLength, language } = req.body;
    if (!draftText) {
      return res.status(400).json({ error: 'draftText is required' });
    }
    const result = await polishDraftCopy({ draftText, tone, targetLength, language });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to polish copy.' });
  }
});

/**
 * POST /api/copy/cinema
 * Generate cinema logline, dossier, and visual treatment
 */
copyRouter.post('/cinema', async (req: Request, res: Response) => {
  try {
    const { title, genre, visualStyle, synopsisPrompt, directorVision } = req.body;
    const result = await generateCinemaCopy({ title, genre, visualStyle, synopsisPrompt, directorVision });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate cinema copy.' });
  }
});

/**
 * POST /api/copy/translate
 * Multilingual localization of editorial copy preserving prestige tone
 */
copyRouter.post('/translate', async (req: Request, res: Response) => {
  try {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'text and targetLanguage are required.' });
    }
    const result = await translateEditorialCopy({ text, targetLanguage });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to translate copy.' });
  }
});

/**
 * POST /api/copy/post/:postId/duplicate
 * Duplicate / clone a post into a new work
 */
copyRouter.post('/post/:postId/duplicate', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { newAuthorUid, customTitle } = req.body;
    const result = await duplicatePost(postId, newAuthorUid, customTitle);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to duplicate post.' });
  }
});

/**
 * POST /api/copy/thread/:threadId/duplicate
 * Duplicate / clone a thread
 */
copyRouter.post('/thread/:threadId/duplicate', async (req: Request, res: Response) => {
  try {
    const { threadId } = req.params;
    const { newAuthorUid } = req.body;
    const result = await duplicateThread(threadId, newAuthorUid);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to duplicate thread.' });
  }
});

/**
 * POST /api/copy/export/:uid
 * Export a portable JSON copy of user archive
 */
copyRouter.post('/export/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: 'uid is required' });
    const result = await exportUserArchiveCopy(uid);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to export archive copy.' });
  }
});

/**
 * POST /api/copy/link
 * Create a tracked copy link
 */
copyRouter.post('/link', async (req: Request, res: Response) => {
  try {
    const { type, id, title, description } = req.body;
    if (!type || !id) {
      return res.status(400).json({ error: 'type and id are required' });
    }
    const result = await generateCopyShareLink(type, id, title, description);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to generate copy link.' });
  }
});

/**
 * GET /api/copy/link/:code
 * Resolve a tracked copy link and increment its counter
 */
copyRouter.get('/link/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const linkRef = doc(db, 'shareLinks', `link_${code}`);
    const snap = await getDoc(linkRef);

    if (!snap.exists()) {
      return res.status(404).json({ error: 'Share link not found.' });
    }

    const data = snap.data();
    await updateDoc(linkRef, { copyCount: increment(1) }).catch(() => {});

    res.json({
      success: true,
      data,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
