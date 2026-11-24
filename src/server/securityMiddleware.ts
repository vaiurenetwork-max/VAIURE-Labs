/**
 * VAIURE Studio — Centralized Security Hardening Middleware & Validators
 * Provides:
 * - HTTP security headers & AI Studio iframe-compatible CSP
 * - CSRF Origin / Referer verification for state-changing API routes
 * - Scoped sliding-window rate limiters (global, auth, financial, AI, upload)
 * - Persistent in-memory brute-force lockout guard (PIN, access/invite codes)
 * - Magic-byte media upload inspection (blocks SVG/HTML/script/executable payloads)
 * - SSRF / Open Redirect / Host Header Injection / Path Traversal guards
 * - Sanitized error formatter & Express error handler
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';
import path from 'path';

// ============================================================================
// 1. SECURITY HEADERS & CSP (AI Studio iFrame Compatible)
// ============================================================================

export function applySecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  const isHttps =
    req.secure ||
    (typeof req.headers['x-forwarded-proto'] === 'string' &&
      req.headers['x-forwarded-proto'].split(',')[0].trim() === 'https');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  if (isHttps || process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // AI Studio embeds apps inside https://aistudio.google.com iframe; allow Google frame ancestors.
  // Avoid X-Frame-Options: DENY so the preview iframe renders normally.
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self' https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: blob:",
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' https: data: blob:",
      "media-src 'self' https: data: blob:",
      "font-src 'self' https: data:",
      "connect-src 'self' https: wss: ws:",
      "frame-src 'self' https:",
      "frame-ancestors 'self' https://aistudio.google.com https://*.google.com https://*.googleusercontent.com",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; ')
  );

  next();
}

export function setSecureCookie(
  req: Request,
  res: Response,
  name: string,
  value: string,
  maxAgeMs = 3600_000
): void {
  const isHttps =
    req.secure ||
    (typeof req.headers['x-forwarded-proto'] === 'string' &&
      req.headers['x-forwarded-proto'].split(',')[0].trim() === 'https');

  res.cookie(name, value, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: maxAgeMs,
    path: '/',
  });
}

// ============================================================================
// 2. ORIGIN / CSRF & WEBSOCKET ORIGIN VERIFICATION
// ============================================================================

const TRUSTED_HOST_SUFFIXES = [
  '.aistudio.google.com',
  '.google.com',
  '.googleusercontent.com',
  '.run.app',
  '.web.app',
  '.firebaseapp.com',
];

function getEnvAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGINS || '';
  const list = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(list);
}

export function isTrustedOrigin(originHeader: string | undefined, hostHeader: string | undefined): boolean {
  if (!originHeader) return true;
  if (originHeader === 'null') return false;

  let parsed: URL;
  try {
    parsed = new URL(originHeader);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const originFull = parsed.origin.toLowerCase();
  const originHost = parsed.hostname.toLowerCase();

  if (getEnvAllowedOrigins().has(originFull)) {
    return true;
  }

  // Local dev
  if (originHost === 'localhost' || originHost === '127.0.0.1' || originHost === '0.0.0.0') {
    return true;
  }

  // Same Host header match
  if (hostHeader) {
    const cleanHost = hostHeader.split(',')[0].trim().toLowerCase();
    if (parsed.host.toLowerCase() === cleanHost || originHost === cleanHost.split(':')[0]) {
      return true;
    }
  }

  // Known AI Studio / Cloud Run preview domains
  if (TRUSTED_HOST_SUFFIXES.some((suffix) => originHost === suffix.slice(1) || originHost.endsWith(suffix))) {
    return true;
  }

  return false;
}

export function csrfOriginGuard(req: Request, res: Response, next: NextFunction): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Allow server-to-server payment & AI provider webhooks (verified via HMAC signature tokens)
  if (
    req.path === '/labs/webhooks/stripe' ||
    req.originalUrl.startsWith('/api/labs/webhooks/stripe') ||
    req.path.startsWith('/webhooks/muapi/') ||
    req.originalUrl.startsWith('/api/webhooks/muapi/')
  ) {
    return next();
  }

  const origin = req.headers.origin as string | undefined;
  const referer = req.headers.referer as string | undefined;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;

  if (origin && !isTrustedOrigin(origin, host)) {
    res.status(403).json({
      ok: false,
      error: 'Cross-origin request rejected by security policy.',
    });
    return;
  }

  if (!origin && referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (!isTrustedOrigin(refOrigin, host)) {
        res.status(403).json({
          ok: false,
          error: 'Cross-site referer rejected by security policy.',
        });
        return;
      }
    } catch {
      res.status(403).json({
        ok: false,
        error: 'Malformed request referer.',
      });
      return;
    }
  }

  next();
}

// ============================================================================
// 3. SLIDING-WINDOW RATE LIMITERS
// ============================================================================

interface RateLimitOptions {
  name: string;
  windowMs: number;
  max: number;
}

export function createRateLimiter(opts: RateLimitOptions) {
  const buckets = new Map<string, number[]>();

  const cleanup = setInterval(() => {
    const cutoff = Date.now() - opts.windowMs;
    for (const [key, timestamps] of buckets.entries()) {
      const fresh = timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) buckets.delete(key);
      else buckets.set(key, fresh);
    }
  }, Math.max(30_000, opts.windowMs));
  cleanup.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const ip =
      (req.socket?.remoteAddress || req.ip || 'unknown').replace(/^::ffff:/, '');
    const uid = req.verifiedUser?.uid;
    const identityKey = uid ? `${opts.name}:uid:${uid}` : `${opts.name}:ip:${ip}`;

    const history = (buckets.get(identityKey) || []).filter((t) => t > cutoff);
    if (history.length >= opts.max) {
      const oldest = history[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        ok: false,
        error: `Too many requests (${opts.name}). Please retry in ${retryAfterSec}s.`,
      });
      return;
    }

    history.push(now);
    buckets.set(identityKey, history);
    next();
  };
}

export const globalApiLimiter = createRateLimiter({
  name: 'api',
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_API_PER_MIN || 400),
});

export const authLimiter = createRateLimiter({
  name: 'auth',
  windowMs: 15 * 60_000,
  max: Number(process.env.RATE_LIMIT_AUTH_PER_15M || 40),
});

export const financialLimiter = createRateLimiter({
  name: 'financial',
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_FIN_PER_MIN || 45),
});

export const aiLimiter = createRateLimiter({
  name: 'ai-generation',
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_AI_PER_MIN || 35),
});

export const uploadLimiter = createRateLimiter({
  name: 'upload',
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_UPLOAD_PER_MIN || 30),
});

// ============================================================================
// 4. BRUTE-FORCE LOCKOUT GUARD (PINs, Room/Stream Passcodes, Admin)
// ============================================================================

interface AttemptRecord {
  failures: number;
  lockedUntil: number;
  lastAttemptAt: number;
}

class BruteForceLockoutManager {
  private records = new Map<string, AttemptRecord>();

  public checkLocked(key: string): { locked: boolean; retryAfterSec: number } {
    const rec = this.records.get(key);
    if (!rec) return { locked: false, retryAfterSec: 0 };
    const now = Date.now();
    if (rec.lockedUntil > now) {
      return {
        locked: true,
        retryAfterSec: Math.max(1, Math.ceil((rec.lockedUntil - now) / 1000)),
      };
    }
    if (rec.lockedUntil > 0 && rec.lockedUntil <= now) {
      this.records.delete(key);
    }
    return { locked: false, retryAfterSec: 0 };
  }

  public recordFailure(
    key: string,
    maxAttempts = 5,
    lockDurationMs = 15 * 60_000
  ): { locked: boolean; attemptsRemaining: number; retryAfterSec: number } {
    const now = Date.now();
    const prev = this.records.get(key);
    const failures = (prev && now - prev.lastAttemptAt < lockDurationMs ? prev.failures : 0) + 1;

    if (failures >= maxAttempts) {
      const lockedUntil = now + lockDurationMs;
      this.records.set(key, { failures, lockedUntil, lastAttemptAt: now });
      return {
        locked: true,
        attemptsRemaining: 0,
        retryAfterSec: Math.ceil(lockDurationMs / 1000),
      };
    }

    this.records.set(key, { failures, lockedUntil: 0, lastAttemptAt: now });
    return {
      locked: false,
      attemptsRemaining: maxAttempts - failures,
      retryAfterSec: 0,
    };
  }

  public reset(key: string): void {
    this.records.delete(key);
  }
}

export const bruteForceGuard = new BruteForceLockoutManager();

// ============================================================================
// 5. IDENTIFIER, PATH TRAVERSAL, SNOWFLAKE & OPEN REDIRECT GUARDS
// ============================================================================

export function isSafeIdentifier(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 128) return false;
  if (value.includes('..') || value.includes('/') || value.includes('\\') || value.includes('\0')) {
    return false;
  }
  return /^[a-zA-Z0-9_.:@-]+$/.test(value);
}

export function isSafeDiscordSnowflake(value: unknown): value is string {
  return typeof value === 'string' && /^\d{17,20}$/.test(value.trim());
}

export function resolveSafeSubpath(baseDir: string, ...segments: string[]): string | null {
  try {
    const resolvedBase = path.resolve(baseDir);
    const candidate = path.resolve(resolvedBase, ...segments);
    const rel = path.relative(resolvedBase, candidate);
    if (!rel || rel === '') return resolvedBase;
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function resolveSafePublicOrigin(req: Request): string {
  const rawHost =
    (typeof req.headers['x-forwarded-host'] === 'string'
      ? req.headers['x-forwarded-host'].split(',')[0].trim()
      : req.get('host')) || '';

  const rawHostOnly = rawHost.split(':')[0].toLowerCase();
  const isLocalHostHeader =
    !rawHostOnly ||
    rawHostOnly === 'localhost' ||
    rawHostOnly === '127.0.0.1' ||
    rawHostOnly === '0.0.0.0';

  const configured = (process.env.PUBLIC_BASE_URL || process.env.APP_URL || '').trim();
  if (configured) {
    try {
      const configuredOrigin = new URL(configured).origin;
      // Use incoming non-local HTTPS host if valid (supports shared .run.app URL as well), otherwise use configured public origin
      if (!isLocalHostHeader && /^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(rawHost)) {
        const protoHeader = req.headers['x-forwarded-proto'];
        const proto =
          typeof protoHeader === 'string' && protoHeader.split(',')[0].trim() === 'https'
            ? 'https'
            : req.protocol === 'https'
            ? 'https'
            : 'http';
        return `${proto}://${rawHost}`;
      }
      return configuredOrigin;
    } catch {
      // Ignore invalid env value
    }
  }

  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string' && protoHeader.split(',')[0].trim() === 'https'
      ? 'https'
      : req.protocol === 'https'
      ? 'https'
      : 'http';

  const hostFallback = rawHost || 'localhost:3000';
  // Strict hostname:port character whitelist to eliminate Host Header Injection
  if (!/^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(hostFallback)) {
    return `${proto}://localhost:3000`;
  }

  return `${proto}://${hostFallback}`;
}

export function validateReturnUrl(rawUrl: unknown, req: Request, fallbackPath = '/'): string {
  const safeOrigin = resolveSafePublicOrigin(req);
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return `${safeOrigin}${fallbackPath}`;
  }

  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${safeOrigin}${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return `${safeOrigin}${fallbackPath}`;
    }
    const host = parsed.hostname.toLowerCase();
    const safeOriginHost = new URL(safeOrigin).hostname.toLowerCase();
    if (
      host === safeOriginHost ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      TRUSTED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))
    ) {
      return parsed.toString();
    }
  } catch {
    // Fall through to safe fallback
  }

  return `${safeOrigin}${fallbackPath}`;
}

// ============================================================================
// 6. SSRF PROTECTION FOR OUTBOUND URLs
// ============================================================================

function isPrivateOrReservedIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/i, '').toLowerCase();
  if (net.isIPv4(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (cloud metadata!)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  if (net.isIPv6(normalized)) {
    if (normalized === '::' || normalized === '::1') return true;
    if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    return false;
  }

  return true;
}

export function validatePublicHttpUrl(rawUrl: unknown): { valid: boolean; url?: URL; reason?: string } {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, reason: 'Empty URL.' };
  }
  if (rawUrl.length > 4096) {
    return { valid: false, reason: 'URL exceeds maximum length.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { valid: false, reason: 'Malformed URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Only HTTP/HTTPS URLs are permitted.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Embedded URL credentials are prohibited.' };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.localhost')
  ) {
    return { valid: false, reason: 'Internal or loopback hostnames are blocked.' };
  }

  // Block integer/hex/octal obfuscated IPs
  if (/^\d+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname) || /^0[0-7]+\./.test(hostname)) {
    return { valid: false, reason: 'Obfuscated IP literals are blocked.' };
  }

  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { valid: false, reason: 'Private or reserved IP addresses are blocked.' };
  }

  return { valid: true, url: parsed };
}

export async function assertPublicRemoteUrl(rawUrl: unknown): Promise<URL> {
  const check = validatePublicHttpUrl(rawUrl);
  if (!check.valid || !check.url) {
    throw new Error(check.reason || 'Disallowed remote URL.');
  }

  const hostname = check.url.hostname.replace(/^\[|\]$/g, '');
  if (!net.isIP(hostname)) {
    try {
      const resolved = await dns.lookup(hostname, { all: true });
      if (!resolved || resolved.length === 0) {
        throw new Error('Unable to resolve remote host.');
      }
      for (const entry of resolved) {
        if (isPrivateOrReservedIp(entry.address)) {
          throw new Error('Resolved IP points to a private or reserved network.');
        }
      }
    } catch (err: any) {
      if (err?.message?.includes('private or reserved')) throw err;
      throw new Error('Remote host DNS resolution blocked or failed.');
    }
  }

  return check.url;
}

// ============================================================================
// 7. MAGIC-BYTE FILE CONTENT VALIDATION (Blocks SVG / HTML / Script Uploads)
// ============================================================================

export interface MagicByteResult {
  valid: boolean;
  detectedMime?: string;
  ext?: string;
  reason?: string;
}

export function validateMagicBytes(
  buffer: Buffer,
  declaredMime?: string,
  allowedCategories: Array<'image' | 'video' | 'audio'> = ['image', 'video']
): MagicByteResult {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
    return { valid: false, reason: 'Uploaded file is empty or unreadable.' };
  }

  const normalizedMime = (declaredMime || '').toLowerCase().trim();
  if (
    normalizedMime.includes('svg') ||
    normalizedMime.includes('html') ||
    normalizedMime.includes('javascript') ||
    normalizedMime.includes('xml')
  ) {
    return { valid: false, reason: 'Executable or markup media types (SVG/HTML/XML/JS) are prohibited.' };
  }

  // Inspect leading text bytes for active markup injection disguised as image
  const headText = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf8').trimStart().toLowerCase();
  if (
    headText.startsWith('<svg') ||
    headText.startsWith('<?xml') ||
    headText.startsWith('<!doctype') ||
    headText.startsWith('<html') ||
    headText.startsWith('<script') ||
    headText.startsWith('mz') ||
    headText.startsWith('#!')
  ) {
    return { valid: false, reason: 'File signature rejected due to active markup or executable header.' };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    if (!allowedCategories.includes('image')) return { valid: false, reason: 'JPEG image not permitted on this endpoint.' };
    return { valid: true, detectedMime: 'image/jpeg', ext: '.jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (!allowedCategories.includes('image')) return { valid: false, reason: 'PNG image not permitted on this endpoint.' };
    return { valid: true, detectedMime: 'image/png', ext: '.png' };
  }

  // GIF: GIF87a / GIF89a
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    if (!allowedCategories.includes('image')) return { valid: false, reason: 'GIF image not permitted on this endpoint.' };
    return { valid: true, detectedMime: 'image/gif', ext: '.gif' };
  }

  // RIFF container: WEBP or WAV
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    const fourcc = buffer.subarray(8, 12).toString('ascii');
    if (fourcc === 'WEBP') {
      if (!allowedCategories.includes('image')) return { valid: false, reason: 'WEBP image not permitted on this endpoint.' };
      return { valid: true, detectedMime: 'image/webp', ext: '.webp' };
    }
    if (fourcc === 'WAVE') {
      if (!allowedCategories.includes('audio')) return { valid: false, reason: 'WAV audio not permitted on this endpoint.' };
      return { valid: true, detectedMime: 'audio/wav', ext: '.wav' };
    }
  }

  // ISO Base Media (MP4 / MOV / M4V / M4A): "ftyp" at offset 4
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.startsWith('qt')) {
      if (!allowedCategories.includes('video')) return { valid: false, reason: 'QuickTime video not permitted here.' };
      return { valid: true, detectedMime: 'video/quicktime', ext: '.mov' };
    }
    if (brand.startsWith('m4a') && allowedCategories.includes('audio')) {
      return { valid: true, detectedMime: 'audio/mp4', ext: '.m4a' };
    }
    if (!allowedCategories.includes('video')) return { valid: false, reason: 'MP4 video not permitted on this endpoint.' };
    return { valid: true, detectedMime: 'video/mp4', ext: '.mp4' };
  }

  // EBML / WebM: 1A 45 DF A3
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    if (!allowedCategories.includes('video') && !allowedCategories.includes('audio')) {
      return { valid: false, reason: 'WebM media not permitted on this endpoint.' };
    }
    if (normalizedMime.startsWith('audio/') && allowedCategories.includes('audio')) {
      return { valid: true, detectedMime: 'audio/webm', ext: '.webm' };
    }
    return { valid: true, detectedMime: 'video/webm', ext: '.webm' };
  }

  // MP3 (ID3 tag or MPEG frame sync)
  if (
    allowedCategories.includes('audio') &&
    ((buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0))
  ) {
    return { valid: true, detectedMime: 'audio/mpeg', ext: '.mp3' };
  }

  // OGG: OggS
  if (
    allowedCategories.includes('audio') &&
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { valid: true, detectedMime: 'audio/ogg', ext: '.ogg' };
  }

  return {
    valid: false,
    reason: 'Unsupported or unverified binary file signature.',
  };
}

// ============================================================================
// 8. SAFE ERROR SANITIZATION & EXPRESS ERROR HANDLER
// ============================================================================

export function sanitizeErrorMessage(err: unknown, fallback = 'An unexpected server error occurred.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!raw) return fallback;

  // Strip stack traces, file system paths, internal IPs, keys/tokens
  const firstLine = raw.split('\n')[0].trim();
  const scrubbed = firstLine
    .replace(/\/[a-zA-Z0-9._\-\/]+(\.(ts|js|json|env|mjs|cjs))/gi, '[internal]')
    .replace(/[A-Za-z]:\\[^\s]+/g, '[internal]')
    .replace(/(sk|rk|pk)_(live|test)_[a-zA-Z0-9]+/g, '[redacted-key]')
    .replace(/AIza[0-9A-Za-z\-_]{20,}/g, '[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/gi, 'Bearer [redacted]');

  if (
    err instanceof SyntaxError ||
    scrubbed.length > 260 ||
    /\b(ENOENT|EACCES|ECONNREFUSED|ETIMEDOUT|SyntaxError|TypeError|ReferenceError|SQLITE|is not valid JSON|Unexpected token)\b/i.test(
      scrubbed
    )
  ) {
    return fallback;
  }

  return scrubbed || fallback;
}

export const sanitizedErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  const status =
    typeof err?.status === 'number' && err.status >= 400 && err.status < 600
      ? err.status
      : typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

  if (err?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      ok: false,
      error: 'Uploaded file exceeds the maximum allowed size limit.',
    });
    return;
  }

  res.status(status).json({
    ok: false,
    error:
      status >= 500
        ? 'Internal server error. Please try again later.'
        : sanitizeErrorMessage(err, 'Invalid request.'),
  });
};

export function constantTimeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  const maxLen = Math.max(bufA.length, bufB.length, 1);
  const paddedA = Buffer.alloc(maxLen);
  const paddedB = Buffer.alloc(maxLen);
  bufA.copy(paddedA);
  bufB.copy(paddedB);
  const match = crypto.timingSafeEqual(paddedA, paddedB);
  return match && bufA.length === bufB.length;
}
