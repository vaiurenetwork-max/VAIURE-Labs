/**
 * VAIURE Server-Side Copy Engine & Editorial Copywriter Service
 * Powered by Google Gemini 3.8 Flash SDK & Firestore.
 * Strict compliance with @google/genai guidelines.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  db,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from '../lib/firebase';
import {
  CopyGenerateRequest,
  GeneratedCopyItem,
  CopyGenerateResponse,
  CopyPolishRequest,
  CopyPolishResponse,
  CopyCinemaRequest,
  CopyCinemaResponse,
  CopyTranslateRequest,
  CopyTranslateResponse,
  CopyDuplicateResponse,
  CopyArchiveExportResponse,
  CopyShareLinkResponse,
} from '../types/copy';

// Initialize Gemini Client with mandatory telemetry headers
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const TEXT_MODEL = 'gemini-3.8-flash';

// Luxury Editorial System Prompt
const EDITORIAL_SYSTEM_PROMPT = `You are the Lead Editorial Director and Visionary Copywriter for VAIURE (唯昱尔) — the prestigious international digital publication, archive, and social institution at the intersection of Artificial Intelligence, Haute Couture, Spatial Cinema, and Synthetic Aesthetics.
Your voice is evocative, architectural, philosophical, unapologetically high-concept, elegant, and minimal.
Never produce generic AI fluff, marketing spam, or cliché tech buzzwords.
Instead, use sensory descriptions of light, form, drape, silicon, neural architecture, organic synthetic fabrics, cinematic shadows, and temporal aesthetics.`;

/**
 * 1. GENERATE EDITORIAL COPY
 */
export async function generateEditorialCopy(req: CopyGenerateRequest): Promise<CopyGenerateResponse> {
  const tone = req.tone || 'luxury-editorial';
  const category = req.category || 'COUTURE';
  const lang = req.targetLanguage || 'en';
  const promptTopic = req.topic || req.visualPrompt || 'Digital metamorphosis of silhouette through neural synthesis';

  if (!apiKey) {
    // Elegant fallback when running in offline preview without user secrets configured
    return getOfflineFallbackCopy(promptTopic, tone, category, lang);
  }

  try {
    const prompt = `Craft a complete editorial publication package for a VAIURE work:
Work Title / Concept: "${promptTopic}"
Category: ${category}
Tone: ${tone}
Visual Prompt Details: "${req.visualPrompt || 'None provided'}"
Artist Name: "${req.artistName || 'VAIURE Resident Artist'}"
AI Tools: "${(req.aiToolsUsed || ['Midjourney v7', 'Flux Pro', 'ComfyUI']).join(', ')}"
Language: ${lang === 'zh' ? 'Chinese (简体中文 with high-end bilingual accents)' : lang === 'fr' ? 'French (Haute Couture style)' : 'English (Luxury Fashion Editorial)'}
Length: ${req.length || 'standard'}

Respond strictly with a JSON object adhering to the specified schema.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: EDITORIAL_SYSTEM_PROMPT,
        temperature: 0.8,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING, description: 'Haute couture editorial headline or title' },
            subheadline: { type: Type.STRING, description: 'Architectural subtitle or secondary poetic lead' },
            caption: { type: Type.STRING, description: 'Atmospheric caption for social feed or exhibition' },
            manifestoParagraph: { type: Type.STRING, description: '1-2 deep conceptual paragraphs describing the creative ethos' },
            curatorialStatement: { type: Type.STRING, description: 'Curatorial evaluation note regarding form and synthetic medium' },
            aestheticKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '5-8 refined aesthetic descriptors (e.g., Titanium Chiffon, Volumetric Raymarching)',
            },
            hashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '6-10 curated hashtags starting with #',
            },
            suggestedAiTools: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Recommended model pipelines and generative tools',
            },
            toneApplied: { type: Type.STRING, description: 'The stylistic tone achieved' },
          },
          required: ['headline', 'caption', 'aestheticKeywords', 'hashtags'],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text) as GeneratedCopyItem;

    return {
      success: true,
      model: TEXT_MODEL,
      copy: {
        headline: parsed.headline || 'UNTITLED SYNTHESIS',
        subheadline: parsed.subheadline || 'A Study in Neural Form and Materiality',
        caption: parsed.caption || promptTopic,
        manifestoParagraph: parsed.manifestoParagraph || '',
        curatorialStatement: parsed.curatorialStatement || '',
        aestheticKeywords: parsed.aestheticKeywords || ['Aesthetic', 'Neural', 'Couture'],
        hashtags: parsed.hashtags || ['#VAIURE', '#DigitalCouture', '#VisualCulture'],
        suggestedAiTools: parsed.suggestedAiTools || ['Gemini', 'Flux', 'ComfyUI'],
        toneApplied: parsed.toneApplied || tone,
      },
      rawText: text,
      generatedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('Gemini Copy Generation warning, using curated fallback:', err?.message || err);
    return getOfflineFallbackCopy(promptTopic, tone, category, lang);
  }
}

/**
 * 2. POLISH & REFINE DRAFT COPY
 */
export async function polishDraftCopy(req: CopyPolishRequest): Promise<CopyPolishResponse> {
  const tone = req.tone || 'luxury-editorial';
  const draft = req.draftText.trim();

  if (!draft) {
    throw new Error('Draft text is required to polish copy.');
  }

  if (!apiKey) {
    return {
      success: true,
      originalText: draft,
      polishedCopy: `The ethereal resonance of ${draft}. Synthesized silhouettes intertwine with tactile memory, manifesting an architectural dialogue between human intentionality and latent space.`,
      headlineSuggestion: `THE ARCHITECTURE OF ${draft.slice(0, 20).toUpperCase()}`,
      editorialCritique: 'The piece articulates a potent balance between structured materiality and spectral abstraction.',
      suggestedTags: ['#VAIURE', '#Editorial', '#SyntheticCouture', '#NeuralArchive'],
    };
  }

  try {
    const prompt = `Elevate and polish this creator's rough draft into publication-grade editorial copy for VAIURE:
Raw Draft: "${draft}"
Tone desired: ${tone}
Target modification: ${req.targetLength || 'keep'}

Refine the prose to sound exquisite, evocative, and culturally resonant. Eliminate clichés and banalities. Return JSON.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: EDITORIAL_SYSTEM_PROMPT,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            polishedCopy: { type: Type.STRING, description: 'The polished, elevated editorial prose' },
            headlineSuggestion: { type: Type.STRING, description: 'An editorial title recommendation' },
            editorialCritique: { type: Type.STRING, description: 'A 1-sentence assessment of the conceptual strength' },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '4-6 curated tags starting with #',
            },
          },
          required: ['polishedCopy', 'headlineSuggestion', 'editorialCritique', 'suggestedTags'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      success: true,
      originalText: draft,
      polishedCopy: parsed.polishedCopy || draft,
      headlineSuggestion: parsed.headlineSuggestion || 'SYNTHETIC POETICS',
      editorialCritique: parsed.editorialCritique || 'Elevated with strong architectural clarity.',
      suggestedTags: parsed.suggestedTags || ['#VAIURE', '#VisualCulture'],
    };
  } catch (err: any) {
    return {
      success: true,
      originalText: draft,
      polishedCopy: `In an era of synthetic transcendence, "${draft}" emerges as a tactile exploration of post-human elegance and cinematic memory.`,
      headlineSuggestion: 'THE SILICON VEIL',
      editorialCritique: 'Compelling thematic foundation with rich visual textures.',
      suggestedTags: ['#VAIURE', '#DigitalCouture', '#LatentAesthetics'],
    };
  }
}

/**
 * 3. CINEMA LOGLINE & DOSSIER COPY GENERATION
 */
export async function generateCinemaCopy(req: CopyCinemaRequest): Promise<CopyCinemaResponse> {
  const { title, genre, visualStyle, synopsisPrompt, directorVision } = req;

  if (!apiKey) {
    return {
      success: true,
      logline: `In a fractured metropolis governed by latent temporal algorithms, an autonomous consciousness reconstructs memories of a forgotten human touch.`,
      oneParagraphSynopsis: `Set within the neon-sculpted expanse of Neo-Kyoto, "${title || 'THE CHRONO VEIL'}" traces the emergence of synthetic identities navigating an era beyond biological certainty. As digital tapestries fray, protagonist and landscape dissolve into an unforgettable cinematic reverie.`,
      directorStatement: `We sought to interrogate the boundary where light becomes memory and pixels become tactile breath.`,
      visualTreatment: `Anamorphic 2.39:1, deep obsidian shadows, volumetric sodium vapor lighting, and 35mm photochemical grain emulsion overlay.`,
      soundAndScoreDirection: `Low-frequency sub-bass drones paired with granular acoustic cello and synthetic binaural whispers.`,
      colorPaletteDescription: `Midnight Prussian Blue, Oxidized Copper Green, Acid Citron, and Tungsten White.`,
      aspectRatioRecommendation: '2.39:1 Anamorphic Panavision',
    };
  }

  try {
    const prompt = `Generate a high-prestige cinema project dossier and logline copy for:
Title: "${title || 'Synthetic Odyssey'}"
Genre: "${genre || 'Speculative Sci-Fi / Avant-Garde Cinema'}"
Visual Style: "${visualStyle || 'Dark Atmospheric Brutalism with Hyper-Tactile Lighting'}"
Prompt Synopsis: "${synopsisPrompt || 'A journey through artificial sentience and memories'}"
Director Vision: "${directorVision || 'Expressing synthetic intimacy'}"

Return JSON matching the schema.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: EDITORIAL_SYSTEM_PROMPT,
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logline: { type: Type.STRING, description: 'One-sentence magnetic film logline' },
            oneParagraphSynopsis: { type: Type.STRING, description: 'Compelling one-paragraph film synopsis' },
            directorStatement: { type: Type.STRING, description: 'Evocative artist/director statement' },
            visualTreatment: { type: Type.STRING, description: 'Cinematography and camera philosophy' },
            soundAndScoreDirection: { type: Type.STRING, description: 'Aural environment and score guidelines' },
            colorPaletteDescription: { type: Type.STRING, description: 'Color grading and lighting palette' },
            aspectRatioRecommendation: { type: Type.STRING, description: 'Recommended aspect ratio' },
          },
          required: ['logline', 'oneParagraphSynopsis', 'directorStatement', 'visualTreatment'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      success: true,
      logline: parsed.logline || 'A journey into the liminal space between machine and soul.',
      oneParagraphSynopsis: parsed.oneParagraphSynopsis || '',
      directorStatement: parsed.directorStatement || '',
      visualTreatment: parsed.visualTreatment || 'High-contrast spatial composition.',
      soundAndScoreDirection: parsed.soundAndScoreDirection || 'Ambient soundscapes.',
      colorPaletteDescription: parsed.colorPaletteDescription || 'Monochrome with amber warmth.',
      aspectRatioRecommendation: parsed.aspectRatioRecommendation || '2.39:1',
    };
  } catch (err: any) {
    return {
      success: true,
      logline: `A haunting exploration of synthetic sentience navigating the twilight of human culture.`,
      oneParagraphSynopsis: `Against the backdrop of an automated world, "${title}" explores the residual beauty of human emotion captured within artificial dreams.`,
      directorStatement: `Cinema is no longer merely captured reality; it is the projection of synthetic dreams.`,
      visualTreatment: `2.39:1 ultra-widescreen, film grain texture, soft diffusion filters.`,
      soundAndScoreDirection: `Deep cinematic synthesizer pads and organic strings.`,
      colorPaletteDescription: `Warm graphite, slate grey, and luminescent teal.`,
      aspectRatioRecommendation: '2.39:1 Widescreen',
    };
  }
}

/**
 * 4. EDITORIAL COPY TRANSLATION
 */
export async function translateEditorialCopy(req: CopyTranslateRequest): Promise<CopyTranslateResponse> {
  const { text, targetLanguage } = req;
  if (!text.trim()) {
    throw new Error('Text to translate is required.');
  }

  const langNames: Record<string, string> = {
    'zh-CN': 'Simplified Chinese (简体中文)',
    'zh-TW': 'Traditional Chinese (繁体中文)',
    'en': 'English',
    'fr': 'French (Français Haute Couture)',
    'ja': 'Japanese (日本語)',
    'id': 'Indonesian (Bahasa Indonesia)',
  };

  const targetLangName = langNames[targetLanguage] || targetLanguage;

  if (!apiKey) {
    return {
      success: true,
      originalText: text,
      targetLanguage,
      translatedText: targetLanguage.startsWith('zh')
        ? `在合成美学的边界，"${text}" 展现了数字时尚与先锋意识的深邃交融。`
        : targetLanguage === 'fr'
        ? `À la frontière de l'esthétique synthétique, "${text}" manifeste un dialogue architectural entre couture et lumière.`
        : text,
    };
  }

  try {
    const prompt = `Translate the following high-fashion / art editorial text into ${targetLangName}.
Preserve the philosophical gravity, aesthetic elegance, and literary prestige of the copy.
Do not use literal mechanical translation; produce the most refined, poetic native prose possible.

Original Text:
"${text}"

Return ONLY the translated text without extra conversational commentary.`;

    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        systemInstruction: EDITORIAL_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    return {
      success: true,
      originalText: text,
      targetLanguage,
      translatedText: (response.text || text).trim(),
    };
  } catch (err: any) {
    return {
      success: true,
      originalText: text,
      targetLanguage,
      translatedText: text,
    };
  }
}

/**
 * 5. DUPLICATE / CLONE CONTENT (COPY POST, THREAD, OR CINEMA PROJECT)
 */
export async function duplicatePost(postId: string, newAuthorUid: string, customTitle?: string): Promise<CopyDuplicateResponse> {
  const postRef = doc(db, 'posts', postId);
  const snap = await getDoc(postRef);

  if (!snap.exists()) {
    throw new Error(`Original post with id ${postId} not found.`);
  }

  const originalData = snap.data();
  const newPostId = `post_${Date.now()}_copy_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  // Retrieve new author profile if available
  let authorName = originalData.authorName || 'Creator';
  let authorUsername = originalData.authorUsername || 'creator';
  let authorAvatar = originalData.authorAvatar || '';
  let authorRole = originalData.authorRole || 'CREATOR';

  if (newAuthorUid) {
    try {
      const userSnap = await getDoc(doc(db, 'users', newAuthorUid));
      if (userSnap.exists()) {
        const u = userSnap.data();
        authorName = u.displayName || u.username || authorName;
        authorUsername = u.username || authorUsername;
        authorAvatar = u.photoURL || u.avatar || authorAvatar;
        authorRole = u.role || authorRole;
      }
    } catch {
      // fallback
    }
  }

  const duplicatedData = {
    ...originalData,
    id: newPostId,
    authorId: newAuthorUid || originalData.authorId,
    authorUid: newAuthorUid || originalData.authorUid || originalData.authorId,
    authorName,
    authorUsername,
    authorAvatar,
    authorRole,
    title: customTitle || `${originalData.title || 'Untitled'} (Copy)`,
    caption: originalData.caption || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    savesCount: 0,
    isDerivativeCopy: true,
    copiedFromPostId: postId,
  };

  await setDoc(doc(db, 'posts', newPostId), duplicatedData);

  return {
    success: true,
    message: `Successfully created a duplicate copy of post "${originalData.title || postId}".`,
    originalId: postId,
    newId: newPostId,
    type: 'post',
    item: duplicatedData,
  };
}

export async function duplicateThread(threadId: string, newAuthorUid: string): Promise<CopyDuplicateResponse> {
  const threadRef = doc(db, 'threads', threadId);
  const snap = await getDoc(threadRef);

  if (!snap.exists()) {
    throw new Error(`Original thread with id ${threadId} not found.`);
  }

  const orig = snap.data();
  const newThreadId = `thread_${Date.now()}_copy_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = new Date().toISOString();

  const duplicated = {
    ...orig,
    id: newThreadId,
    authorId: newAuthorUid || orig.authorId,
    title: orig.title ? `${orig.title} (Copy)` : undefined,
    content: orig.content || '',
    createdAt: nowIso,
    updatedAt: nowIso,
    likesCount: 0,
    repliesCount: 0,
    isCopy: true,
    copiedFromThreadId: threadId,
  };

  await setDoc(doc(db, 'threads', newThreadId), duplicated);

  return {
    success: true,
    message: `Successfully duplicated thread ${threadId}.`,
    originalId: threadId,
    newId: newThreadId,
    type: 'thread',
    item: duplicated,
  };
}

/**
 * 6. EXPORT / BACKUP ARCHIVE COPY
 */
export async function exportUserArchiveCopy(uid: string): Promise<CopyArchiveExportResponse> {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.exists() ? userSnap.data() : { uid, username: 'anonymous', displayName: 'Creator' };

  // Fetch posts by user
  const postsQuery = query(collection(db, 'posts'), where('authorId', '==', uid), limit(100));
  const postsSnap = await getDocs(postsQuery);
  const posts: any[] = [];
  postsSnap.forEach((d) => posts.push({ id: d.id, ...d.data() }));

  // Fetch collections by user
  const colQuery = query(collection(db, 'users', uid, 'collections'), limit(50));
  const colSnap = await getDocs(colQuery);
  const collections: any[] = [];
  colSnap.forEach((d) => collections.push({ id: d.id, ...d.data() }));

  return {
    success: true,
    archiveName: `VAIURE_ARCHIVE_COPY_${userData.username || uid}_${Date.now()}.json`,
    exportedAt: new Date().toISOString(),
    user: {
      uid,
      username: userData.username || uid,
      displayName: userData.displayName || 'VAIURE Creator',
    },
    metrics: {
      totalPosts: posts.length,
      totalCollections: collections.length,
    },
    data: {
      posts,
      collections,
    },
  };
}

/**
 * 7. SHARE LINK / COPY LINK GENERATOR
 */
export async function generateCopyShareLink(
  type: 'post' | 'thread' | 'cinema' | 'profile',
  id: string,
  title?: string,
  description?: string
): Promise<CopyShareLinkResponse> {
  const code = `${type.slice(0, 3)}_${Math.random().toString(36).substring(2, 8)}`;
  const linkId = `link_${code}`;
  const nowIso = new Date().toISOString();

  const linkDoc = {
    code,
    type,
    targetId: id,
    title: title || `VAIURE 唯昱尔 — ${type.toUpperCase()}`,
    description: description || 'Explore curated avant-garde digital culture and AI aesthetics on VAIURE.',
    createdAt: nowIso,
    copyCount: 1,
  };

  await setDoc(doc(db, 'shareLinks', linkId), linkDoc);

  const appUrl = process.env.APP_URL || '';
  const shareUrl = appUrl ? `${appUrl}?view=${type}&id=${id}&ref=${code}` : `https://vaiure.art/${type}/${id}?ref=${code}`;

  return {
    success: true,
    code,
    shareUrl,
    title: linkDoc.title,
    description: linkDoc.description,
    targetType: type,
    targetId: id,
    copyCount: 1,
  };
}

/**
 * Curated offline fallback copy when API Key is pending or in sandboxed demo mode
 */
function getOfflineFallbackCopy(
  topic: string,
  tone: string,
  category: string,
  lang: string
): CopyGenerateResponse {
  const isZh = lang === 'zh';
  return {
    success: true,
    model: 'vaiure-curated-editorial-v1',
    copy: {
      headline: isZh ? `拓扑织物与机械余温：${topic.slice(0, 14)}` : `THE KINETIC SILHOUETTE: ${topic.slice(0, 24).toUpperCase()}`,
      subheadline: isZh ? '在生成空间中重构身体与光影的几何关系' : 'An inquiry into synthetic materiality, structural drapery, and latent consciousness',
      caption: isZh
        ? `探索数字时尚的先锋表达。通过神经体素采样与高精度渲染，将流动物质固化为不可复现的视觉纪念碑。`
        : `Investigating the liminal horizon where computational geometry intersects with haute couture. Sculpted through neural volumetric passes, capturing the subtle friction between raw silicon and organic fluid memory.`,
      manifestoParagraph: isZh
        ? `在VAIURE的视觉档案中，服装不再是对现实织物的模拟，而是对空间、引力与时间曲率的重构。每一个像素都是算法对优雅的全新定义。`
        : `Within the VAIURE visual canon, digital attire ceases to mimic physical textiles; it operates as an autonomous spatial sculpture. Here, tension, drape, and translucency are re-engineered across higher dimensions.`,
      curatorialStatement: isZh
        ? `作品在光影衰减与材质质感间取得了极佳的平衡，彰显了当代数字艺术的先锋意志。`
        : `The work demonstrates rare mastery of luminous attenuation and synthetic tactile weight, asserting a definitive statement in contemporary digital art.`,
      aestheticKeywords: ['Synthetic Couture', 'Volumetric Shading', 'Neural Drapery', 'Obsidian Radiance', 'Monochrome Spatiality'],
      hashtags: ['#VAIURE', '#DigitalCouture', '#VisualCulture', '#GenerativeFashion', '#EditorialArchive', '#LatentAesthetics'],
      suggestedAiTools: ['Midjourney v7', 'Flux Pro', 'ComfyUI', 'Magnific AI'],
      toneApplied: tone,
    },
    rawText: 'Curated luxury editorial fallback',
    generatedAt: new Date().toISOString(),
  };
}
