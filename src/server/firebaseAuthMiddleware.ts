/**
 * Server-Side Firebase ID Token Verification & Authorization Middleware
 * Uses Google X.509 public certificates + Node crypto RS256 verification.
 * Never trusts spoofable x-user-id / x-user-role headers or unverified JWT claims.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface VerifiedRequestUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  isAnonymous?: boolean;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      verifiedUser?: VerifiedRequestUser;
    }
  }
}

const ADMIN_EMAILS = new Set([
  'rachvan420@gmail.com',
  'vaiurenetwork@gmail.com',
  'efayour@gmail.com',
]);

type AccountStatusChecker = (uid: string) => { suspended: boolean; role?: string } | null;
let accountStatusChecker: AccountStatusChecker | null = null;

export function registerAccountStatusChecker(fn: AccountStatusChecker): void {
  accountStatusChecker = fn;
}

function readFirebaseProjectId(): string {
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      if (parsed?.projectId) return String(parsed.projectId);
    }
  } catch {
    // Fallback below
  }
  return process.env.FIREBASE_PROJECT_ID || 'cedar-totality-28f9p';
}

const FIREBASE_PROJECT_ID = readFirebaseProjectId();
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> = {};
let certsExpiresAt = 0;

async function fetchGooglePublicCerts(): Promise<Record<string, string>> {
  if (Object.keys(cachedCerts).length > 0 && Date.now() < certsExpiresAt) {
    return cachedCerts;
  }

  const res = await fetch(GOOGLE_CERTS_URL);
  if (!res.ok) {
    if (Object.keys(cachedCerts).length > 0) {
      return cachedCerts;
    }
    throw new Error('Authentication verification service temporarily unavailable.');
  }

  const cacheControl = res.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;

  const data = (await res.json()) as Record<string, string>;
  cachedCerts = data;
  certsExpiresAt = Date.now() + ttlMs;
  return cachedCerts;
}

function base64UrlDecode(segment: string): Buffer {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64');
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedRequestUser> {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 8192) {
    throw new Error('Missing or oversized Firebase ID token.');
  }

  const parts = idToken.trim().split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed authentication token.');
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf-8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf-8')) as {
    iss?: string;
    aud?: string;
    sub?: string;
    user_id?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    exp?: number;
    iat?: number;
    auth_time?: number;
    firebase?: { sign_in_provider?: string };
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported token signing algorithm.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= nowSec - 60) {
    throw new Error('Authentication session expired. Please sign in again.');
  }
  if (!payload.iat || payload.iat > nowSec + 300) {
    throw new Error('Invalid token timestamp.');
  }
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error('Invalid token audience.');
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error('Invalid token issuer.');
  }

  const uid = payload.sub || payload.user_id || '';
  if (!uid || uid.length > 128 || !/^[a-zA-Z0-9_.:@-]+$/.test(uid)) {
    throw new Error('Invalid token subject identifier.');
  }

  const certs = await fetchGooglePublicCerts();
  let certPem = certs[header.kid];
  if (!certPem) {
    certsExpiresAt = 0;
    const refreshed = await fetchGooglePublicCerts();
    certPem = refreshed[header.kid];
  }
  if (!certPem) {
    throw new Error('Unrecognized token signing key.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signature = base64UrlDecode(sigB64);
  const validSig = verifier.verify(certPem, signature);
  if (!validSig) {
    throw new Error('Invalid token signature.');
  }

  const email = (payload.email || '').toLowerCase().trim();
  const emailVerified = Boolean(payload.email_verified);
  const isAnonymous = payload.firebase?.sign_in_provider === 'anonymous';

  // Only verified designated admin emails OR verified non-anonymous users explicitly promoted in backend store
  const storeStatus = accountStatusChecker ? accountStatusChecker(uid) : null;
  const promotedAdmin =
    !isAnonymous &&
    emailVerified &&
    (storeStatus?.role === 'ADMIN' || storeStatus?.role === 'SUPER_ADMIN');
  const isAdmin =
    !isAnonymous &&
    emailVerified &&
    (ADMIN_EMAILS.has(email) || promotedAdmin);

  return {
    uid,
    email,
    emailVerified,
    name: typeof payload.name === 'string' ? payload.name.slice(0, 120) : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture.slice(0, 1000) : undefined,
    isAnonymous,
    isAdmin,
  };
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }
  return null;
}

/**
 * Attaches verified user if valid Bearer token is present; drops suspended accounts.
 */
export async function optionalFirebaseAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    return next();
  }
  try {
    const user = await verifyFirebaseIdToken(token);
    const status = accountStatusChecker ? accountStatusChecker(user.uid) : null;
    if (!status?.suspended || user.isAdmin) {
      req.verifiedUser = user;
    }
  } catch {
    // Ignore invalid tokens on optional routes
  }
  next();
}

/**
 * Enforces valid Firebase Authentication Bearer token and rejects suspended users.
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({
      ok: false,
      error: 'Authentication required. Please sign in to your VAIURE account.',
    });
    return;
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    const status = accountStatusChecker ? accountStatusChecker(user.uid) : null;
    if (status?.suspended && !user.isAdmin) {
      res.status(403).json({
        ok: false,
        error: 'Account access has been suspended by platform moderation.',
      });
      return;
    }
    req.verifiedUser = user;
    next();
  } catch {
    res.status(401).json({
      ok: false,
      error: 'Invalid or expired authentication session.',
    });
  }
}

/**
 * Enforces verified platform administrator authorization after requireFirebaseAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.verifiedUser) {
    res.status(401).json({ ok: false, error: 'Authentication required.' });
    return;
  }
  if (!req.verifiedUser.isAdmin) {
    res.status(403).json({ ok: false, error: 'Administrator privileges required.' });
    return;
  }
  next();
}

export function isVerifiedAdminEmail(email?: string | null, emailVerified = true): boolean {
  if (!email || !emailVerified) return false;
  return ADMIN_EMAILS.has(email.toLowerCase().trim());
}
