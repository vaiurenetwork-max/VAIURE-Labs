/**
 * VAIURE — SEEDANCE LAB PERSONAL AI CREATIVE AGENT ROUTES (/api/agent/*)
 * Strictly authenticated & isolated per userId.
 * Provides:
 * - Personal Creative Memory CRUD + toggle (characters, style prefs, storyline continuity, prompts, instructions)
 * - Persistent multi-turn conversation threads
 * - Seedance 2.5 prompt optimization, creation, storyline continuation & reference image analysis
 * Uses @google/genai (gemini-4-hydrogen) exclusively server-side.
 */

import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { requireFirebaseAuth } from './firebaseAuthMiddleware';
import { seedancePlatformStore } from './seedancePlatformStore';
import { SEEDANCE_25_PUBLISHED_KNOWLEDGE } from './bytedanceSchema';
import { aiLimiter, sanitizeErrorMessage, validateMagicBytes } from './securityMiddleware';
import {
  AgentActionMode,
  AgentChatMessage,
  AgentWorkspaceContext,
  CreativeMemoryCategory,
} from '../types/seedancePlatform';

export const seedanceAgentRouter = Router();

function getGeminiApiKey(): string {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key || key.startsWith('MY_') || key.startsWith('YOUR_')) {
    return '';
  }
  return key;
}

const VALID_MEMORY_CATEGORIES: CreativeMemoryCategory[] = [
  'character',
  'style',
  'storyline',
  'instruction',
  'prompt_history',
];

// Enforce verified authentication on ALL personal agent & memory routes
seedanceAgentRouter.use(requireFirebaseAuth);

// ============================================================================
// 1. PERSONAL CREATIVE MEMORY MANAGEMENT (ISOLATED PER USER)
// ============================================================================

seedanceAgentRouter.get('/memory', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  seedancePlatformStore.upsertUserRecord({
    uid: user.uid,
    email: user.email,
    displayName: user.name,
    isAdmin: user.isAdmin,
  });

  res.json({
    ok: true,
    memoryEnabled: seedancePlatformStore.isAgentMemoryEnabled(user.uid),
    items: seedancePlatformStore.getUserAgentMemories(user.uid),
  });
});

seedanceAgentRouter.patch('/settings', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { memoryEnabled } = req.body as { memoryEnabled?: boolean };
  if (typeof memoryEnabled !== 'boolean') {
    return res.status(400).json({ ok: false, error: 'memoryEnabled boolean is required.' });
  }
  const updated = seedancePlatformStore.setAgentMemoryEnabled(user.uid, memoryEnabled);
  res.json({ ok: true, memoryEnabled: updated });
});

seedanceAgentRouter.post('/memory', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { category = 'instruction', title, content, referenceImageUrls = [], enabled = true } =
    req.body as {
      category?: CreativeMemoryCategory;
      title?: string;
      content?: string;
      referenceImageUrls?: string[];
      enabled?: boolean;
    };

  if (!VALID_MEMORY_CATEGORIES.includes(category)) {
    return res.status(400).json({ ok: false, error: 'Invalid memory category.' });
  }
  if (!title || !title.trim() || !content || !content.trim()) {
    return res.status(400).json({ ok: false, error: 'Title and content are required.' });
  }

  const item = seedancePlatformStore.addUserAgentMemory(user.uid, {
    category,
    title,
    content,
    referenceImageUrls: Array.isArray(referenceImageUrls) ? referenceImageUrls : [],
    enabled,
  });
  res.status(201).json({ ok: true, item });
});

seedanceAgentRouter.patch('/memory/:id', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { id } = req.params;
  const { category, title, content, enabled, referenceImageUrls } = req.body as {
    category?: CreativeMemoryCategory;
    title?: string;
    content?: string;
    enabled?: boolean;
    referenceImageUrls?: string[];
  };

  if (category && !VALID_MEMORY_CATEGORIES.includes(category)) {
    return res.status(400).json({ ok: false, error: 'Invalid memory category.' });
  }

  const updated = seedancePlatformStore.updateUserAgentMemory(user.uid, id, {
    ...(category ? { category } : {}),
    ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
    ...(typeof content === 'string' && content.trim() ? { content: content.trim() } : {}),
    ...(typeof enabled === 'boolean' ? { enabled } : {}),
    ...(Array.isArray(referenceImageUrls) ? { referenceImageUrls } : {}),
  });

  if (!updated) {
    return res.status(404).json({ ok: false, error: 'Memory item not found for this user.' });
  }
  res.json({ ok: true, item: updated });
});

seedanceAgentRouter.delete('/memory/:id', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const removed = seedancePlatformStore.deleteUserAgentMemory(user.uid, req.params.id);
  if (!removed) {
    return res.status(404).json({ ok: false, error: 'Memory item not found for this user.' });
  }
  res.json({ ok: true });
});

// ============================================================================
// 2. CONVERSATION HISTORY (ISOLATED PER USER)
// ============================================================================

seedanceAgentRouter.get('/conversations', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const conversations = seedancePlatformStore.getUserConversations(user.uid);
  res.json({ ok: true, conversations });
});

seedanceAgentRouter.post('/conversations', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const { title } = req.body as { title?: string };
  const conversation = seedancePlatformStore.createConversation(user.uid, title);
  res.status(201).json({ ok: true, conversation });
});

seedanceAgentRouter.delete('/conversations/:id', (req: Request, res: Response) => {
  const user = req.verifiedUser!;
  const deleted = seedancePlatformStore.deleteConversation(user.uid, req.params.id);
  if (!deleted) {
    return res.status(404).json({ ok: false, error: 'Conversation not found.' });
  }
  res.json({ ok: true });
});

// ============================================================================
// 3. PERSONAL AI AGENT CHAT & WORKSPACE ACTIONS (GEMINI-4-HYDROGEN)
// ============================================================================

seedanceAgentRouter.post('/chat', aiLimiter, async (req: Request, res: Response) => {
  try {
    const user = req.verifiedUser!;
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return res.status(503).json({
        ok: false,
        error:
          'GEMINI_API_KEY is not configured on the server. Configure GEMINI_API_KEY in Settings -> Secrets to enable the Personal AI Creative Agent.',
      });
    }

    const {
      conversationId,
      message,
      actionMode = 'chat',
      workspaceContext,
      referenceImageDataUrl,
    } = req.body as {
      conversationId?: string;
      message?: string;
      actionMode?: AgentActionMode;
      workspaceContext?: AgentWorkspaceContext;
      referenceImageDataUrl?: string;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ ok: false, error: 'Message text is required.' });
    }

    const memoryEnabled = seedancePlatformStore.isAgentMemoryEnabled(user.uid);
    const activeMemories = memoryEnabled
      ? seedancePlatformStore
          .getUserAgentMemories(user.uid)
          .filter((m) => m.enabled)
          .slice(0, 25)
      : [];

    const memoryBlock =
      activeMemories.length > 0
        ? activeMemories
            .map(
              (m, idx) =>
                `[Memory #${idx + 1} · ${m.category.toUpperCase()}] ${m.title}: ${m.content}`
            )
            .join('\n')
        : 'No personal creative memories enabled.';

    const workspaceSummary = workspaceContext
      ? JSON.stringify(
          {
            currentPrompt: workspaceContext.currentPrompt || '',
            selectedModel: workspaceContext.selectedModel || 'seedance_25_15s',
            aspectRatio: workspaceContext.aspectRatio || '16:9',
            resolution: workspaceContext.resolution || '720p',
            duration: workspaceContext.duration || 15,
            physicsPriority: workspaceContext.physicsPriority !== false,
            contentRating: workspaceContext.contentRating || 'standard',
            referenceImagesCount: workspaceContext.referenceImagesCount || 0,
          },
          null,
          2
        )
      : 'None provided.';

    const systemInstruction = `You are the VAIURE Seedance Lab Personal AI Creative Director & Prompt Architect for user ${
      user.name || user.email || user.uid
    }.
Your sole expertise is creative filmmaking consulting, narrative continuity, character design, dialogue/storyboard planning, and ByteDance Seedance 2.5 prompt engineering.

Seedance 2.5 Architecture & Prompt Specification:
- Prompt Formula: ${SEEDANCE_25_PUBLISHED_KNOWLEDGE.promptFormula}
- Reference Tagging: ${SEEDANCE_25_PUBLISHED_KNOWLEDGE.referenceTaggingRules.join(' ')}
- Camera Motion Discipline: ${SEEDANCE_25_PUBLISHED_KNOWLEDGE.cameraMovementRules.join(' ')}
- Physics & Continuity: ${SEEDANCE_25_PUBLISHED_KNOWLEDGE.physicsAndContinuityRules.join(' ')}

User Personal Creative Memory (${memoryEnabled ? 'ENABLED' : 'DISABLED'}):
${memoryBlock}

Active Generator Workspace Context:
${workspaceSummary}

Behavioral Directives:
1. Respect enabled Personal Creative Memory (characters, visual style preferences, ongoing storylines, instructions) for continuity.
2. Check for contradictory camera/lighting/motion directives and report them clearly in continuityWarnings.
3. Match recommended durations strictly to supported Seedance durations (5, 10, 15, 20, or 30 seconds).
4. When actionMode is 'improve_prompt', 'generate_prompt', 'continue_storyline', or 'analyze_reference', ALWAYS provide a ready-to-apply Seedance 2.5 prompt in suggestedPrompt.
5. Never invent fake API capabilities or external links. Keep answers crisp, cinema-literate, and production-ready.`;

    const conversations = seedancePlatformStore.getUserConversations(user.uid);
    const activeConv = conversationId
      ? conversations.find((c) => c.id === conversationId)
      : undefined;

    const historyTurns = (activeConv?.messages || []).slice(-10).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.text }],
    }));

    const userParts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    > = [
      {
        text: `[ACTION_MODE: ${actionMode}]\n${message.trim()}`,
      },
    ];

    if (referenceImageDataUrl && referenceImageDataUrl.startsWith('data:image/')) {
      const m = referenceImageDataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (m) {
        const imgBuf = Buffer.from(m[2], 'base64');
        const magic = validateMagicBytes(imgBuf, m[1], ['image']);
        if (!magic.valid || !magic.detectedMime) {
          return res.status(400).json({
            ok: false,
            error: magic.reason || 'Invalid or unsupported reference image format.',
          });
        }
        userParts.push({
          inlineData: {
            mimeType: magic.detectedMime,
            data: m[2],
          },
        });
      }
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Creative advice, script/character notes, or diagnostic explanation.',
            },
            suggestedPrompt: {
              type: Type.STRING,
              description:
                'Production-ready Seedance 2.5 prompt using clear camera, lighting, reference tags (@Image1..), and physics phrasing when applicable.',
            },
            suggestedDuration: {
              type: Type.INTEGER,
              description: 'Recommended duration in seconds (5, 10, 15, 20, or 30).',
            },
            continuityWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Any contradictory camera/lighting/motion rules or continuity risks detected.',
            },
            memorySuggestionTitle: {
              type: Type.STRING,
              description: 'Optional concise title if the user introduced a recurring character/style worth saving to memory.',
            },
            memorySuggestionContent: {
              type: Type.STRING,
              description: 'Optional concise summary to store in Personal Creative Memory.',
            },
          },
          required: ['reply'],
        },
      },
      contents: [
        ...historyTurns,
        {
          role: 'user',
          parts: userParts,
        },
      ],
    });

    const rawText = response.text || '{}';
    let parsed: {
      reply?: string;
      suggestedPrompt?: string;
      suggestedDuration?: number;
      continuityWarnings?: string[];
      memorySuggestionTitle?: string;
      memorySuggestionContent?: string;
    };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { reply: rawText };
    }

    const now = new Date().toISOString();
    const userMsg: AgentChatMessage = {
      id: `msg-u-${Date.now()}`,
      role: 'user',
      text: message.trim(),
      actionMode,
      createdAt: now,
    };
    const assistantMsg: AgentChatMessage = {
      id: `msg-a-${Date.now() + 1}`,
      role: 'assistant',
      text: parsed.reply || 'Prepared creative response.',
      actionMode,
      suggestedPrompt: parsed.suggestedPrompt || undefined,
      suggestedDuration: parsed.suggestedDuration || undefined,
      continuityWarnings: Array.isArray(parsed.continuityWarnings)
        ? parsed.continuityWarnings.filter(Boolean)
        : undefined,
      createdAt: new Date().toISOString(),
    };

    const convId = activeConv?.id || `conv-${Date.now()}`;
    const updatedConv = seedancePlatformStore.appendConversationMessages(
      user.uid,
      convId,
      [userMsg, assistantMsg],
      message.trim().slice(0, 48)
    );

    res.json({
      ok: true,
      conversation: updatedConv,
      assistantMessage: assistantMsg,
      memorySuggestion:
        parsed.memorySuggestionTitle && parsed.memorySuggestionContent
          ? {
              title: parsed.memorySuggestionTitle,
              content: parsed.memorySuggestionContent,
            }
          : undefined,
    });
  } catch (err: any) {
    console.error('Personal AI Agent error:', err);
    res.status(502).json({
      ok: false,
      error: sanitizeErrorMessage(err, 'AI Creative Agent request failed.'),
    });
  }
});
