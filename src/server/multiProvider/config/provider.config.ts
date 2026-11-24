/**
 * Runtime Multi-Provider Configuration & Encrypted Secret Vault
 * - Stores provider configs in uploads/provider_configs_db.json (no API secrets stored in plaintext)
 * - Encrypts admin-entered API keys using AES-256-GCM inside .vaiure_backups/.provider_secrets.enc
 * - Env variables (MUAPIAPP_API_KEY, BYTEDANCE_API_KEY / ARK_API_KEY) take precedence or fallback seamlessly
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  ProviderConfigPublic,
  ProviderId,
  ProviderModelDefinition,
} from '../../../types/multiProvider';
import { BACKUP_ROOT_DIR } from '../../backupService';
import { getByteDanceConfigStatus } from '../../bytedanceClient';
import { DEFAULT_BYTEDANCE_MODELS, DEFAULT_MUAPI_MODELS } from './model.capabilities';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
const CONFIG_DB_FILE = path.join(UPLOADS_DIR, 'provider_configs_db.json');
const ENCRYPTED_SECRETS_FILE = path.join(BACKUP_ROOT_DIR, '.provider_secrets.enc');
const VAULT_KEY_FILE = path.join(BACKUP_ROOT_DIR, '.provider_vault_key');

export interface InternalProviderConfig
  extends Omit<
    ProviderConfigPublic,
    'configured' | 'keyMask' | 'sandboxConfigured' | 'sandboxKeyMask'
  > {
  apiKeyHeader?: string;
}

interface PersistedProviderDB {
  providers: Record<string, InternalProviderConfig>;
  updatedAt: string;
}

function getOrCreateVaultMasterKey(): Buffer {
  const fromEnv = (process.env.PROVIDER_VAULT_SECRET || process.env.CURATED_ASSET_SECRET || '').trim();
  if (fromEnv && fromEnv.length >= 32) {
    return crypto.createHash('sha256').update(fromEnv).digest();
  }
  try {
    if (!fs.existsSync(BACKUP_ROOT_DIR)) {
      fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
    }
    if (fs.existsSync(VAULT_KEY_FILE)) {
      const hex = fs.readFileSync(VAULT_KEY_FILE, 'utf8').trim();
      if (hex.length >= 64) {
        return Buffer.from(hex.slice(0, 64), 'hex');
      }
    }
    const generated = crypto.randomBytes(32);
    fs.writeFileSync(VAULT_KEY_FILE, generated.toString('hex'), { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch {
    return crypto.createHash('sha256').update(process.cwd() + ':vaiure-fallback').digest();
  }
}

function readEncryptedSecrets(): Record<string, string> {
  try {
    if (!fs.existsSync(ENCRYPTED_SECRETS_FILE)) return {};
    const raw = JSON.parse(fs.readFileSync(ENCRYPTED_SECRETS_FILE, 'utf8')) as {
      iv: string;
      tag: string;
      ciphertext: string;
    };
    const key = getOrCreateVaultMasterKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(raw.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(raw.tag, 'hex'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(raw.ciphertext, 'hex')),
      decipher.final(),
    ]).toString('utf8');
    const parsed = JSON.parse(plain);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeEncryptedSecrets(secrets: Record<string, string>): void {
  if (!fs.existsSync(BACKUP_ROOT_DIR)) {
    fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
  }
  const key = getOrCreateVaultMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(secrets), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const tmpFile = `${ENCRYPTED_SECRETS_FILE}.tmp`;
  fs.writeFileSync(
    tmpFile,
    JSON.stringify({
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      ciphertext: encrypted.toString('hex'),
    }),
    { encoding: 'utf8', mode: 0o600 }
  );
  fs.renameSync(tmpFile, ENCRYPTED_SECRETS_FILE);
}

function buildDefaultProviders(): Record<string, InternalProviderConfig> {
  const now = new Date().toISOString();
  return {
    bytedance: {
      providerId: 'bytedance',
      displayName: 'ByteDance Official',
      clientName: 'BytePlus ModelArk v3',
      enabled: true,
      baseUrl: (process.env.BYTEDANCE_BASE_URL || 'https://ark.ap-southeast.bytepluses.com/api/v3').trim(),
      autoFallbackEnabled: false,
      pollIntervalMs: 5000,
      maxPollTimeoutMs: 20 * 60 * 1000,
      creditsPerUsd: 27,
      enforceWalletOnUsdProviders: true,
      safetyCheckerLockedOn: true,
      safetyNotice: 'ByteDance ModelArk safety filters are active and enforced by BytePlus API.',
      models: JSON.parse(JSON.stringify(DEFAULT_BYTEDANCE_MODELS)),
      updatedAt: now,
    },
    muapi: {
      providerId: 'muapi',
      displayName: 'MUAPI',
      clientName: (process.env.MUAPI_CLIENT_NAME || 'vaiurenetwoek').trim(),
      enabled: true,
      baseUrl: (process.env.MUAPI_BASE_URL || 'https://api.muapi.ai/api/v1').trim(),
      autoFallbackEnabled: false,
      pollIntervalMs: 3000,
      maxPollTimeoutMs: 20 * 60 * 1000,
      creditsPerUsd: 27,
      enforceWalletOnUsdProviders: true,
      safetyCheckerLockedOn: true,
      safetyNotice:
        'MUAPI safety checker is locked ON and cannot be bypassed via client settings.',
      models: JSON.parse(JSON.stringify(DEFAULT_MUAPI_MODELS)),
      apiKeyHeader: 'x-api-key',
      updatedAt: now,
    },
  };
}

function normalizeApiKeyInput(raw: string | undefined): string {
  if (!raw) return '';
  let clean = raw.replace(/[\r\n]+/g, '').trim();
  // Strip accidental surrounding quotes
  if (
    (clean.startsWith('"') && clean.endsWith('"') && clean.length >= 2) ||
    (clean.startsWith("'") && clean.endsWith("'") && clean.length >= 2)
  ) {
    clean = clean.slice(1, -1).trim();
  }
  // Strip accidental header/scheme prefixes copied from docs/curl
  clean = clean.replace(/^(?:x-api-key|authorization)\s*[:=]\s*/i, '').trim();
  clean = clean.replace(/^Bearer\s+/i, '').trim();
  return clean;
}

function isPlaceholderSecret(val: string | undefined): boolean {
  const trimmed = normalizeApiKeyInput(val);
  if (!trimmed) return true;
  const upper = trimmed.toUpperCase();
  if (upper.startsWith('YOUR_') || upper.startsWith('MY_') || upper.startsWith('REPLACE_')) {
    return true;
  }
  return false;
}

function maskSecretKey(secret: string): string {
  const clean = normalizeApiKeyInput(secret);
  if (clean.length <= 4) return '****';
  return `****${clean.slice(-4)}`;
}

class ProviderConfigStore {
  private db: PersistedProviderDB;

  constructor() {
    this.db = this.load();
  }

  private load(): PersistedProviderDB {
    const defaults = buildDefaultProviders();
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      if (!fs.existsSync(CONFIG_DB_FILE)) {
        const fresh: PersistedProviderDB = {
          providers: defaults,
          updatedAt: new Date().toISOString(),
        };
        this.writeDb(fresh);
        return fresh;
      }
      const raw = JSON.parse(fs.readFileSync(CONFIG_DB_FILE, 'utf8')) as Partial<PersistedProviderDB>;
      const loadedProviders: Record<string, InternalProviderConfig> = { ...defaults };
      if (raw?.providers && typeof raw.providers === 'object') {
        for (const [id, cfg] of Object.entries(raw.providers)) {
          if (!cfg) continue;
          const base = loadedProviders[id];
          if (base) {
            loadedProviders[id] = {
              ...base,
              ...cfg,
              models: Array.isArray(cfg.models) && cfg.models.length > 0 ? cfg.models : base.models,
            };
          } else {
            loadedProviders[id] = cfg;
          }
        }
      }
      return {
        providers: loadedProviders,
        updatedAt: raw?.updatedAt || new Date().toISOString(),
      };
    } catch {
      return {
        providers: defaults,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  private writeDb(next: PersistedProviderDB): void {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      }
      const tmp = `${CONFIG_DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
      fs.renameSync(tmp, CONFIG_DB_FILE);
    } catch {
      // non-fatal disk fallback
    }
  }

  persist(): void {
    this.db.updatedAt = new Date().toISOString();
    this.writeDb(this.db);
  }

  /**
   * Resolves sandbox API credential for a provider (e.g. MUAPI_SANDBOX_API_KEY / muapi_sandbox vault slot).
   */
  getProviderSandboxApiKey(providerId: ProviderId): string {
    if (providerId === 'muapi') {
      const envSandbox = normalizeApiKeyInput(process.env.MUAPI_SANDBOX_API_KEY);
      if (!isPlaceholderSecret(envSandbox)) return envSandbox;
    }
    const secrets = readEncryptedSecrets();
    const vaultKey = normalizeApiKeyInput(secrets[`${providerId}_sandbox`]);
    return isPlaceholderSecret(vaultKey) ? '' : vaultKey;
  }

  /**
   * Resolves live (non-sandbox) backend API credential for a provider.
   */
  getProviderLiveApiKey(providerId: ProviderId): string {
    if (providerId === 'bytedance') {
      const envKey = normalizeApiKeyInput(
        process.env.BYTEDANCE_API_KEY || process.env.ARK_API_KEY || process.env.BYTEPLUS_API_KEY
      );
      if (!isPlaceholderSecret(envKey)) return envKey;
    }
    if (providerId === 'muapi') {
      const envKey = normalizeApiKeyInput(process.env.MUAPIAPP_API_KEY || process.env.MUAPI_API_KEY);
      if (!isPlaceholderSecret(envKey)) return envKey;
    }
    const secrets = readEncryptedSecrets();
    const vaultKey = normalizeApiKeyInput(secrets[providerId]);
    return isPlaceholderSecret(vaultKey) ? '' : vaultKey;
  }

  /**
   * Indicates whether MUAPI is actively routing with its Sandbox (is_test) key.
   */
  isSandboxModeActive(providerId: ProviderId): boolean {
    const cfg = this.db.providers[providerId];
    const sandboxKey = this.getProviderSandboxApiKey(providerId);
    const liveKey = this.getProviderLiveApiKey(providerId);
    if (cfg?.sandboxMode && sandboxKey) return true;
    if (!liveKey && sandboxKey) return true;
    return false;
  }

  /**
   * Resolves active backend API credential for a provider. NEVER exposed to frontend.
   */
  getProviderApiKey(providerId: ProviderId): string {
    const cfg = this.db.providers[providerId];
    const sandboxKey = this.getProviderSandboxApiKey(providerId);
    const liveKey = this.getProviderLiveApiKey(providerId);

    if (cfg?.sandboxMode && sandboxKey) {
      return sandboxKey;
    }
    if (liveKey) {
      return liveKey;
    }
    if (sandboxKey) {
      return sandboxKey;
    }
    return '';
  }

  setProviderApiKey(providerId: ProviderId, rawApiKey: string): { configured: boolean; keyMask?: string } {
    const trimmed = normalizeApiKeyInput(rawApiKey);
    const secrets = readEncryptedSecrets();
    if (!trimmed) {
      delete secrets[providerId];
    } else {
      secrets[providerId] = trimmed;
    }
    writeEncryptedSecrets(secrets);
    const activeKey = this.getProviderApiKey(providerId);
    return {
      configured: Boolean(activeKey),
      keyMask: activeKey ? maskSecretKey(activeKey) : undefined,
    };
  }

  setProviderSandboxApiKey(
    providerId: ProviderId,
    rawApiKey: string
  ): { sandboxConfigured: boolean; sandboxKeyMask?: string } {
    const trimmed = normalizeApiKeyInput(rawApiKey);
    const secrets = readEncryptedSecrets();
    const slot = `${providerId}_sandbox`;
    if (!trimmed) {
      delete secrets[slot];
    } else {
      secrets[slot] = trimmed;
    }
    writeEncryptedSecrets(secrets);
    const activeSandbox = this.getProviderSandboxApiKey(providerId);
    return {
      sandboxConfigured: Boolean(activeSandbox),
      sandboxKeyMask: activeSandbox ? maskSecretKey(activeSandbox) : undefined,
    };
  }

  getInternalProvider(providerId: ProviderId): InternalProviderConfig | undefined {
    return this.db.providers[providerId];
  }

  toPublicConfig(cfg: InternalProviderConfig): ProviderConfigPublic {
    let configured = false;
    let keyMask: string | undefined;
    const sandboxKey = this.getProviderSandboxApiKey(cfg.providerId);
    const sandboxActive = this.isSandboxModeActive(cfg.providerId);

    if (cfg.providerId === 'bytedance') {
      const bdStatus = getByteDanceConfigStatus();
      const overrideKey = this.getProviderApiKey('bytedance');
      configured = bdStatus.configured || Boolean(overrideKey);
      if (overrideKey) {
        keyMask = maskSecretKey(overrideKey);
      }
    } else {
      const key = this.getProviderApiKey(cfg.providerId);
      configured = Boolean(key);
      if (key) {
        keyMask = maskSecretKey(key);
      }
    }

    return {
      providerId: cfg.providerId,
      displayName: cfg.displayName,
      clientName: cfg.clientName,
      enabled: cfg.enabled,
      configured,
      keyMask,
      sandboxMode: sandboxActive,
      sandboxConfigured: Boolean(sandboxKey),
      sandboxKeyMask: sandboxKey ? maskSecretKey(sandboxKey) : undefined,
      baseUrl: cfg.baseUrl,
      autoFallbackEnabled: Boolean(cfg.autoFallbackEnabled),
      pollIntervalMs: cfg.pollIntervalMs || 5000,
      maxPollTimeoutMs: cfg.maxPollTimeoutMs || 20 * 60 * 1000,
      creditsPerUsd: cfg.creditsPerUsd || 27,
      enforceWalletOnUsdProviders: cfg.enforceWalletOnUsdProviders !== false,
      safetyCheckerLockedOn: cfg.safetyCheckerLockedOn !== false,
      safetyNotice:
        cfg.safetyNotice || 'Provider safety checks are enabled and managed by provider policy.',
      models: cfg.models,
      updatedAt: cfg.updatedAt,
    };
  }

  listPublicProviders(includeDisabled = false): ProviderConfigPublic[] {
    return Object.values(this.db.providers)
      .filter((p) => includeDisabled || p.enabled)
      .map((p) => this.toPublicConfig(p));
  }

  upsertProvider(
    providerId: ProviderId,
    updates: Partial<InternalProviderConfig>
  ): ProviderConfigPublic {
    const existing = this.db.providers[providerId];
    const now = new Date().toISOString();
    const next: InternalProviderConfig = existing
      ? {
          ...existing,
          ...updates,
          providerId,
          safetyCheckerLockedOn: true,
          updatedAt: now,
        }
      : {
          providerId,
          displayName: updates.displayName || providerId.toUpperCase(),
          clientName: updates.clientName || 'vaiurenetwoek',
          enabled: updates.enabled !== false,
          baseUrl: updates.baseUrl || 'https://api.muapi.ai/api/v1',
          autoFallbackEnabled: Boolean(updates.autoFallbackEnabled),
          pollIntervalMs: updates.pollIntervalMs || 5000,
          maxPollTimeoutMs: updates.maxPollTimeoutMs || 20 * 60 * 1000,
          creditsPerUsd: updates.creditsPerUsd || 27,
          enforceWalletOnUsdProviders: updates.enforceWalletOnUsdProviders !== false,
          safetyCheckerLockedOn: true,
          safetyNotice:
            updates.safetyNotice ||
            'Safety checker is locked ON according to provider API policy.',
          models: Array.isArray(updates.models) ? updates.models : [],
          apiKeyHeader: updates.apiKeyHeader || 'x-api-key',
          updatedAt: now,
        };
    this.db.providers[providerId] = next;
    this.persist();
    return this.toPublicConfig(next);
  }

  upsertModel(providerId: ProviderId, model: ProviderModelDefinition): ProviderConfigPublic {
    const existing = this.db.providers[providerId];
    if (!existing) {
      throw new Error(`Provider "${providerId}" not found.`);
    }
    const cleanModel: ProviderModelDefinition = {
      ...model,
      providerId,
      safetyCheckerLockedOn: true,
    };
    const idx = existing.models.findIndex((m) => m.modelId === cleanModel.modelId);
    if (idx >= 0) {
      existing.models[idx] = cleanModel;
    } else {
      existing.models.push(cleanModel);
    }
    existing.updatedAt = new Date().toISOString();
    this.persist();
    return this.toPublicConfig(existing);
  }

  findModel(
    providerId: ProviderId,
    modelId: string
  ): { provider: InternalProviderConfig; model: ProviderModelDefinition } | null {
    const provider = this.db.providers[providerId];
    if (!provider) return null;
    const model = provider.models.find((m) => m.modelId === modelId);
    if (!model) return null;
    return { provider, model };
  }
}

export const providerConfigStore = new ProviderConfigStore();
