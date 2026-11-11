import { Router, Request, Response } from 'express';
import crypto from 'crypto';

export const midjourneyRouter = Router();

const DEFAULT_MJ_APP_ID = '936929561302675456';
const DEFAULT_MJ_COMMAND_ID = '938956540159881230';
const DEFAULT_MJ_COMMAND_VERSION = '1240417417537359943';

// Runtime manual overrides set via UI (POST /api/midjourney/config or per-request payload)
interface RuntimeDiscordConfig {
  discordToken?: string;
  guildId?: string;
  channelId?: string;
  applicationId?: string;
  commandId?: string;
  commandVersion?: string;
}

let runtimeOverride: RuntimeDiscordConfig = {};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isPlaceholder = (val: string) =>
  !val ||
  val === 'YOUR_DISCORD_USER_TOKEN' ||
  val === 'YOUR_SERVER_ID' ||
  val === 'YOUR_DISCORD_SERVER_GUILD_ID' ||
  val === 'YOUR_CHANNEL_ID' ||
  val === 'YOUR_DISCORD_CHANNEL_ID';

function cleanVal(val?: string): string {
  const trimmed = (val || '').trim();
  return isPlaceholder(trimmed) ? '' : trimmed;
}

export function resolveDiscordConfig(reqOverride?: Partial<RuntimeDiscordConfig>) {
  const discordToken =
    cleanVal(reqOverride?.discordToken) ||
    cleanVal(runtimeOverride.discordToken) ||
    cleanVal(process.env.DISCORD_TOKEN);

  const guildId =
    cleanVal(reqOverride?.guildId) ||
    cleanVal(runtimeOverride.guildId) ||
    cleanVal(process.env.GUILD_ID);

  const channelId =
    cleanVal(reqOverride?.channelId) ||
    cleanVal(runtimeOverride.channelId) ||
    cleanVal(process.env.CHANNEL_ID);

  const applicationId =
    cleanVal(reqOverride?.applicationId) ||
    cleanVal(runtimeOverride.applicationId) ||
    cleanVal(process.env.MIDJOURNEY_APP_ID) ||
    DEFAULT_MJ_APP_ID;

  const commandId =
    cleanVal(reqOverride?.commandId) ||
    cleanVal(runtimeOverride.commandId) ||
    cleanVal(process.env.MIDJOURNEY_COMMAND_ID) ||
    DEFAULT_MJ_COMMAND_ID;

  const commandVersion =
    cleanVal(reqOverride?.commandVersion) ||
    cleanVal(runtimeOverride.commandVersion) ||
    cleanVal(process.env.MIDJOURNEY_COMMAND_VERSION) ||
    DEFAULT_MJ_COMMAND_VERSION;

  const missingVars: string[] = [];
  if (!discordToken) missingVars.push('DISCORD_TOKEN');
  if (!guildId) missingVars.push('GUILD_ID');
  if (!channelId) missingVars.push('CHANNEL_ID');

  return {
    discordToken,
    guildId,
    channelId,
    applicationId,
    commandId,
    commandVersion,
    isConfigured: missingVars.length === 0,
    missingVars,
    source:
      cleanVal(reqOverride?.discordToken) || cleanVal(runtimeOverride.discordToken)
        ? 'manual_ui'
        : cleanVal(process.env.DISCORD_TOKEN)
        ? 'env'
        : 'unconfigured',
  };
}

function buildBrowserHeaders(discordToken: string, guildId: string, channelId: string) {
  return {
    Authorization: discordToken,
    'Content-Type': 'application/json',
    Accept: '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    Origin: 'https://discord.com',
    Referer: `https://discord.com/channels/${guildId}/${channelId}`,
    'X-Discord-Locale': 'en-US',
    'X-Debug-Options': 'bugReporterEnabled',
  };
}

function buildImagineInteractionPayload(
  prompt: string,
  cfg: ReturnType<typeof resolveDiscordConfig>
) {
  const sessionId = crypto.randomBytes(16).toString('hex');
  const nonce = String(BigInt(Date.now() - 1420070400000) << 22n);

  return {
    type: 2,
    application_id: cfg.applicationId,
    guild_id: cfg.guildId,
    channel_id: cfg.channelId,
    session_id: sessionId,
    nonce,
    data: {
      version: cfg.commandVersion,
      id: cfg.commandId,
      name: 'imagine',
      type: 1,
      options: [
        {
          type: 3,
          name: 'prompt',
          value: prompt,
        },
      ],
      application_command: {
        id: cfg.commandId,
        application_id: cfg.applicationId,
        version: cfg.commandVersion,
        default_member_permissions: null,
        type: 1,
        nsfw: false,
        name: 'imagine',
        description: 'Create images with Midjourney',
        dm_permission: true,
        options: [
          {
            type: 3,
            name: 'prompt',
            description: 'The prompt to imagine',
            required: true,
          },
        ],
      },
      attachments: [],
    },
  };
}

function matchMidjourneyMessage(
  messages: any[],
  prompt: string,
  applicationId: string,
  minTimestampMs?: number
) {
  const normalizedPrompt = prompt
    .replace(/--\w+(\s+[^\s-]+)?/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 48);

  for (const msg of messages) {
    if (!msg || msg.author?.id !== applicationId) continue;
    if (minTimestampMs && msg.timestamp) {
      const msgTime = new Date(msg.timestamp).getTime();
      if (!Number.isNaN(msgTime) && msgTime < minTimestampMs - 15000) {
        continue;
      }
    }
    const content = String(msg.content || '');
    const contentLower = content.toLowerCase();
    if (
      content.includes(prompt) ||
      (normalizedPrompt.length > 0 && contentLower.includes(normalizedPrompt))
    ) {
      const percentMatch = content.match(/\((\d{1,3})%\)/);
      const isWaiting = content.includes('Waiting to start');
      const hasPercent = content.includes('%');
      const isRendering = hasPercent || isWaiting;
      const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];

      return {
        message: msg,
        isRendering,
        isComplete: !isRendering && attachments.length > 0,
        progressPercent: percentMatch ? parseInt(percentMatch[1], 10) : isWaiting ? 0 : undefined,
        imageUrl: attachments[0]?.url || null,
        proxyUrl: attachments[0]?.proxy_url || null,
        width: attachments[0]?.width,
        height: attachments[0]?.height,
        content,
      };
    }
  }
  return null;
}

/**
 * GET /api/midjourney/status
 * Checks whether DISCORD_TOKEN, GUILD_ID, and CHANNEL_ID are configured via manual UI or server env.
 */
midjourneyRouter.get('/status', (_req: Request, res: Response) => {
  const cfg = resolveDiscordConfig();
  res.json({
    configured: cfg.isConfigured,
    source: cfg.source,
    missingVars: cfg.missingVars,
    applicationId: cfg.applicationId,
    commandId: cfg.commandId,
    commandVersion: cfg.commandVersion,
    guildId: cfg.guildId || '',
    channelId: cfg.channelId || '',
    hasToken: Boolean(cfg.discordToken),
    tokenMasked: cfg.discordToken
      ? `${cfg.discordToken.slice(0, 4)}••••${cfg.discordToken.slice(-4)}`
      : null,
    guildIdMasked: cfg.guildId ? `...${cfg.guildId.slice(-4)}` : null,
    channelIdMasked: cfg.channelId ? `...${cfg.channelId.slice(-4)}` : null,
  });
});

/**
 * POST /api/midjourney/config
 * Saves or clears manual Discord & Midjourney environment variables from the UI.
 */
midjourneyRouter.post('/config', (req: Request, res: Response) => {
  const {
    discordToken,
    guildId,
    channelId,
    applicationId,
    commandId,
    commandVersion,
    clear,
  } = req.body || {};

  if (clear) {
    runtimeOverride = {};
    const cfg = resolveDiscordConfig();
    return res.json({
      success: true,
      message: 'Cleared manual overrides; reverted to server environment variables.',
      configured: cfg.isConfigured,
      source: cfg.source,
      missingVars: cfg.missingVars,
    });
  }

  runtimeOverride = {
    discordToken:
      typeof discordToken === 'string' && discordToken.trim()
        ? discordToken.trim()
        : runtimeOverride.discordToken,
    guildId:
      typeof guildId === 'string' && guildId.trim() ? guildId.trim() : runtimeOverride.guildId,
    channelId:
      typeof channelId === 'string' && channelId.trim()
        ? channelId.trim()
        : runtimeOverride.channelId,
    applicationId:
      typeof applicationId === 'string' && applicationId.trim()
        ? applicationId.trim()
        : runtimeOverride.applicationId,
    commandId:
      typeof commandId === 'string' && commandId.trim()
        ? commandId.trim()
        : runtimeOverride.commandId,
    commandVersion:
      typeof commandVersion === 'string' && commandVersion.trim()
        ? commandVersion.trim()
        : runtimeOverride.commandVersion,
  };

  const cfg = resolveDiscordConfig();
  return res.json({
    success: true,
    configured: cfg.isConfigured,
    source: cfg.source,
    missingVars: cfg.missingVars,
    applicationId: cfg.applicationId,
    commandId: cfg.commandId,
    commandVersion: cfg.commandVersion,
    guildId: cfg.guildId,
    channelId: cfg.channelId,
    hasToken: Boolean(cfg.discordToken),
    tokenMasked: cfg.discordToken
      ? `${cfg.discordToken.slice(0, 4)}••••${cfg.discordToken.slice(-4)}`
      : null,
    guildIdMasked: cfg.guildId ? `...${cfg.guildId.slice(-4)}` : null,
    channelIdMasked: cfg.channelId ? `...${cfg.channelId.slice(-4)}` : null,
  });
});

/**
 * POST /api/midjourney/verify
 * Tests the provided or saved Discord credentials by fetching the target Discord channel metadata.
 */
midjourneyRouter.post('/verify', async (req: Request, res: Response) => {
  const cfg = resolveDiscordConfig(req.body);
  if (!cfg.isConfigured) {
    return res.status(400).json({
      ok: false,
      error: `Missing required fields: ${cfg.missingVars.join(', ')}`,
      missingVars: cfg.missingVars,
    });
  }

  try {
    const channelRes = await fetch(`https://discord.com/api/v9/channels/${cfg.channelId}`, {
      method: 'GET',
      headers: buildBrowserHeaders(cfg.discordToken, cfg.guildId, cfg.channelId),
    });

    if (!channelRes.ok) {
      const errText = await channelRes.text().catch(() => channelRes.statusText);
      return res.status(channelRes.status).json({
        ok: false,
        error: `Discord API returned ${channelRes.status}: ${errText.slice(0, 180)}`,
      });
    }

    const channelData = await channelRes.json();
    return res.json({
      ok: true,
      channelName: channelData.name || cfg.channelId,
      channelId: channelData.id || cfg.channelId,
      guildId: channelData.guild_id || cfg.guildId,
      message: `Connected to #${channelData.name || 'channel'} (${cfg.channelId})`,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Failed to reach Discord API.',
    });
  }
});

/**
 * POST /api/midjourney/trigger
 * Step 1: Triggers the Discord /imagine interaction and returns immediately so the UI
 * can poll /api/midjourney/poll and display real-time Discord render percentages.
 */
midjourneyRouter.post('/trigger', async (req: Request, res: Response) => {
  const { prompt, discordToken, guildId, channelId, applicationId, commandId, commandVersion } =
    req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const cfg = resolveDiscordConfig({
    discordToken,
    guildId,
    channelId,
    applicationId,
    commandId,
    commandVersion,
  });

  if (!cfg.isConfigured) {
    return res.status(503).json({
      error: `Missing Discord credentials (${cfg.missingVars.join(', ')}). Enter them in the Discord Bridge Configuration panel before generating.`,
      missingVars: cfg.missingVars,
    });
  }

  try {
    const cleanPrompt = prompt.trim();
    const payload = buildImagineInteractionPayload(cleanPrompt, cfg);

    activeBackendJob = {
      phase: 'SENDING',
      statusText: 'Sending to Discord...',
      progressPercent: 5,
      attempt: 0,
      maxAttempts: 30,
      prompt: cleanPrompt,
      imageUrl: null,
      updatedAt: Date.now(),
    };

    const triggerResponse = await fetch('https://discord.com/api/v9/interactions', {
      method: 'POST',
      headers: buildBrowserHeaders(cfg.discordToken, cfg.guildId, cfg.channelId),
      body: JSON.stringify(payload),
    });

    if (!triggerResponse.ok) {
      const errText = await triggerResponse.text().catch(() => triggerResponse.statusText);
      activeBackendJob = {
        ...activeBackendJob,
        phase: 'ERROR',
        statusText: `Discord interaction rejected (${triggerResponse.status})`,
        updatedAt: Date.now(),
      };
      return res.status(triggerResponse.status).json({
        error: `Discord interaction rejected (${triggerResponse.status}): ${errText.slice(0, 220)}`,
      });
    }

    activeBackendJob = {
      ...activeBackendJob,
      phase: 'WAITING',
      statusText: 'Midjourney rendering (0%)...',
      progressPercent: 8,
      updatedAt: Date.now(),
    };

    return res.json({
      success: true,
      status: 'SENT_TO_DISCORD',
      statusText: 'Sending to Discord...',
      prompt: cleanPrompt,
      triggeredAt: Date.now(),
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Failed to dispatch Discord /imagine interaction.',
    });
  }
});

// Tracks live backend polling state for both 2-step polling and single-call /api/generate
interface ActiveBackendPollState {
  phase: 'IDLE' | 'SENDING' | 'WAITING' | 'RENDERING' | 'COMPLETED' | 'ERROR';
  statusText: string;
  progressPercent: number;
  attempt: number;
  maxAttempts: number;
  prompt: string;
  imageUrl: string | null;
  updatedAt: number;
}

let activeBackendJob: ActiveBackendPollState = {
  phase: 'IDLE',
  statusText: 'Idle — Ready for /imagine prompt',
  progressPercent: 0,
  attempt: 0,
  maxAttempts: 30,
  prompt: '',
  imageUrl: null,
  updatedAt: Date.now(),
};

midjourneyRouter.get('/active-status', (_req: Request, res: Response) => {
  res.json(activeBackendJob);
});

/**
 * GET & POST /api/midjourney/poll
 * Polls Discord channel history once for the matching prompt and returns live rendering progress or final CDN URL.
 */
async function handlePollRequest(req: Request, res: Response) {
  const source = req.method === 'POST' ? req.body || {} : req.query || {};
  const prompt = String(source.prompt || '').trim();
  const since = Number(source.since) || 0;
  const attempt = Number(source.attempt) || activeBackendJob.attempt + 1;

  if (!prompt) {
    return res.status(400).json({ error: 'Parameter "prompt" is required.' });
  }

  const cfg = resolveDiscordConfig({
    discordToken: source.discordToken ? String(source.discordToken) : undefined,
    guildId: source.guildId ? String(source.guildId) : undefined,
    channelId: source.channelId ? String(source.channelId) : undefined,
    applicationId: source.applicationId ? String(source.applicationId) : undefined,
  });

  if (!cfg.isConfigured) {
    return res.status(503).json({
      error: `Missing Discord configuration: ${cfg.missingVars.join(', ')}`,
      missingVars: cfg.missingVars,
    });
  }

  try {
    const historyUrl = `https://discord.com/api/v9/channels/${cfg.channelId}/messages?limit=15`;
    const historyResponse = await fetch(historyUrl, {
      method: 'GET',
      headers: buildBrowserHeaders(cfg.discordToken, cfg.guildId, cfg.channelId),
    });

    if (!historyResponse.ok) {
      return res.status(historyResponse.status).json({
        error: `Discord channel poll failed (${historyResponse.status}): ${historyResponse.statusText}`,
      });
    }

    const messages = await historyResponse.json();
    if (!Array.isArray(messages)) {
      return res.json({
        status: 'WAITING',
        progressPercent: 0,
        statusText: 'Midjourney rendering (0%)...',
      });
    }

    const match = matchMidjourneyMessage(messages, prompt, cfg.applicationId, since);
    if (!match) {
      const waitStatus = 'Midjourney rendering (0%)...';
      activeBackendJob = {
        phase: 'WAITING',
        statusText: waitStatus,
        progressPercent: 0,
        attempt,
        maxAttempts: 30,
        prompt,
        imageUrl: null,
        updatedAt: Date.now(),
      };
      return res.json({
        status: 'WAITING',
        progressPercent: 0,
        statusText: waitStatus,
      });
    }

    if (match.isComplete && match.imageUrl) {
      activeBackendJob = {
        phase: 'COMPLETED',
        statusText: 'Midjourney rendering (100%) — Complete',
        progressPercent: 100,
        attempt,
        maxAttempts: 30,
        prompt,
        imageUrl: match.imageUrl,
        updatedAt: Date.now(),
      };
      return res.json({
        success: true,
        status: 'COMPLETED',
        progressPercent: 100,
        statusText: 'Midjourney rendering (100%) — Complete',
        imageUrl: match.imageUrl,
        image_url: match.imageUrl,
        proxyUrl: match.proxyUrl,
        width: match.width,
        height: match.height,
        messageId: match.message.id,
        content: match.content,
      });
    }

    const pct = match.progressPercent ?? Math.min(95, Math.max(5, attempt * 4));
    const renderStatusText =
      match.progressPercent !== undefined
        ? `Midjourney rendering (${match.progressPercent}%)...`
        : `Midjourney rendering (${pct}%)...`;

    activeBackendJob = {
      phase: 'RENDERING',
      statusText: renderStatusText,
      progressPercent: pct,
      attempt,
      maxAttempts: 30,
      prompt,
      imageUrl: null,
      updatedAt: Date.now(),
    };

    return res.json({
      status: 'RENDERING',
      progressPercent: pct,
      statusText: renderStatusText,
      content: match.content,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Discord message history poll error.',
    });
  }
}

midjourneyRouter.get('/poll', handlePollRequest);
midjourneyRouter.post('/poll', handlePollRequest);

/**
 * POST /api/generate (and POST /api/generate-image, POST /api/midjourney/generate)
 * Complete 4-step Discord Interaction + Long-Polling loop (5s interval, max 30 attempts).
 */
export async function handleMidjourneyLongPollGenerate(req: Request, res: Response) {
  const { prompt, discordToken, guildId, channelId, applicationId, commandId, commandVersion } =
    req.body || {};

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const cfg = resolveDiscordConfig({
    discordToken,
    guildId,
    channelId,
    applicationId,
    commandId,
    commandVersion,
  });

  if (!cfg.isConfigured) {
    return res.status(503).json({
      error: `Missing Discord credentials (${cfg.missingVars.join(', ')}). Enter them in the Discord Bridge Configuration panel or set environment variables.`,
      missingVars: cfg.missingVars,
    });
  }

  const cleanPrompt = prompt.trim();
  const triggeredAt = Date.now();

  try {
    console.log(`[1/3] Triggering Midjourney /imagine for: "${cleanPrompt}"`);
    activeBackendJob = {
      phase: 'SENDING',
      statusText: 'Sending to Discord...',
      progressPercent: 5,
      attempt: 0,
      maxAttempts: 30,
      prompt: cleanPrompt,
      imageUrl: null,
      updatedAt: Date.now(),
    };

    const payload = buildImagineInteractionPayload(cleanPrompt, cfg);
    const triggerResponse = await fetch('https://discord.com/api/v9/interactions', {
      method: 'POST',
      headers: buildBrowserHeaders(cfg.discordToken, cfg.guildId, cfg.channelId),
      body: JSON.stringify(payload),
    });

    if (!triggerResponse.ok) {
      const errBody = await triggerResponse.text().catch(() => triggerResponse.statusText);
      activeBackendJob = {
        ...activeBackendJob,
        phase: 'ERROR',
        statusText: `Discord trigger failed (${triggerResponse.status})`,
        updatedAt: Date.now(),
      };
      throw new Error(
        `Discord trigger failed (${triggerResponse.status}): ${errBody.slice(0, 200)}`
      );
    }

    console.log(`[2/3] Command sent. Polling Discord channel ${cfg.channelId} for completion...`);
    activeBackendJob = {
      ...activeBackendJob,
      phase: 'WAITING',
      statusText: 'Midjourney rendering (0%)...',
      progressPercent: 10,
      updatedAt: Date.now(),
    };

    let imageUrl: string | null = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts * 5 seconds = 2.5 minutes max timeout

    while (!imageUrl && attempts < maxAttempts) {
      await delay(5000);
      attempts++;

      const historyResponse = await fetch(
        `https://discord.com/api/v9/channels/${cfg.channelId}/messages?limit=10`,
        {
          method: 'GET',
          headers: buildBrowserHeaders(cfg.discordToken, cfg.guildId, cfg.channelId),
        }
      );

      if (!historyResponse.ok) continue;
      const messages = await historyResponse.json();
      if (!Array.isArray(messages)) continue;

      const match = matchMidjourneyMessage(messages, cleanPrompt, cfg.applicationId, triggeredAt);
      if (match) {
        if (match.isComplete && match.imageUrl) {
          imageUrl = match.imageUrl;
          activeBackendJob = {
            phase: 'COMPLETED',
            statusText: 'Midjourney rendering (100%) — Complete',
            progressPercent: 100,
            attempt: attempts,
            maxAttempts,
            prompt: cleanPrompt,
            imageUrl,
            updatedAt: Date.now(),
          };
          console.log(`[3/3] Success! Midjourney image found: ${imageUrl}`);
        } else {
          const pct = match.progressPercent ?? Math.min(95, Math.round((attempts / maxAttempts) * 90) + 5);
          activeBackendJob = {
            phase: 'RENDERING',
            statusText: `Midjourney rendering (${pct}%)...`,
            progressPercent: pct,
            attempt: attempts,
            maxAttempts,
            prompt: cleanPrompt,
            imageUrl: null,
            updatedAt: Date.now(),
          };
          console.log(
            `Still processing... attempt ${attempts}/${maxAttempts} (${pct}%)`
          );
        }
      } else {
        const fallbackPct = Math.min(35, attempts * 3);
        activeBackendJob = {
          phase: 'WAITING',
          statusText: `Midjourney rendering (${fallbackPct}%)...`,
          progressPercent: fallbackPct,
          attempt: attempts,
          maxAttempts,
          prompt: cleanPrompt,
          imageUrl: null,
          updatedAt: Date.now(),
        };
      }
    }

    if (!imageUrl) {
      activeBackendJob = {
        ...activeBackendJob,
        phase: 'ERROR',
        statusText: 'Midjourney timeout after 30 attempts',
        updatedAt: Date.now(),
      };
      return res.status(504).json({ error: 'Midjourney timeout or generation failed.' });
    }

    return res.json({
      success: true,
      imageUrl,
      image_url: imageUrl,
    });
  } catch (error: any) {
    console.error('Midjourney Discord Bridge Error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}

midjourneyRouter.post('/generate', handleMidjourneyLongPollGenerate);
