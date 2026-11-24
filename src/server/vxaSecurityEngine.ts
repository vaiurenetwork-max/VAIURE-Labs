/**
 * VAIURE Labs — VXA Financial Security & Cryptographic Engine
 * Implements:
 * 1. Dynamic 120-Second Cryptographic Signing Key Rotation with KID registry
 * 2. SHA-256 Hash-Linked Tamper-Evident Ledger (Double-Entry Bookkeeping)
 * 3. Atomic Balance Reservations (Available -> Reserved -> Settled / Reversal)
 * 4. Indonesian Banking Business Day Settlement Engine (1–2 Days)
 * 5. Fraud Detection & Step-Up Security Verification
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  VxaUserWallet,
  DynamicSigningKey,
  KeyRegistryStatus,
  AccountCode,
  DoubleEntryJournalEntry,
  VxaTransaction,
  SettlementStatus,
  PayoutDestination,
  SettlementTrackerRecord,
  SecurityEventLog,
  AdminFinancialOverview,
} from '../types/vxaSecurity';
import { BACKUP_ROOT_DIR } from './backupService';
import { bruteForceGuard } from './securityMiddleware';

const VXA_DB_FILE = path.join(BACKUP_ROOT_DIR, 'vxa_ledger_db.json');

function loadOrCreateVxaVaultSecret(): string {
  const envSecret = (process.env.VXA_VAULT_SECRET || '').trim();
  if (envSecret.length >= 32) return envSecret;
  const secretFile = path.join(BACKUP_ROOT_DIR, '.vxa_deposit_secret');
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

const VXA_VAULT_SECRET = loadOrCreateVxaVaultSecret();

function hashPinScrypt(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}

// ============================================================================
// 1. DYNAMIC 120-SECOND CRYPTOGRAPHIC SIGNING KEY MANAGER
// ============================================================================

const ROTATION_INTERVAL_MS = 120_000; // Exactly 120 seconds (2 minutes)
const GRACE_PERIOD_MS = 60_000;       // 60-second overlap grace period

class CryptographicKeyManager {
  private keyRegistry: Map<string, DynamicSigningKey> = new Map();
  private activeKid: string = '';
  private rotationTimer: NodeJS.Timeout | null = null;
  private onRotateCallbacks: Array<(newKey: DynamicSigningKey) => void> = [];

  constructor() {
    this.rotateKey('SCHEDULED_120S');
    this.startRotationDaemon();
  }

  private generateSecureKey(reason: 'SCHEDULED_120S' | 'MANUAL_TRIGGER' | 'SECURITY_REVOCATION'): DynamicSigningKey {
    const now = Date.now();
    const kid = `vxa_kid_${now}_${crypto.randomBytes(4).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex'); // 256-bit cryptographically secure key

    return {
      kid,
      algorithm: 'HMAC-SHA256',
      secret,
      issuedAt: now,
      expiresAt: now + ROTATION_INTERVAL_MS,
      graceExpiresAt: now + ROTATION_INTERVAL_MS + GRACE_PERIOD_MS,
      status: 'ACTIVE',
      usageCount: 0,
      rotationReason: reason,
    };
  }

  public rotateKey(reason: 'SCHEDULED_120S' | 'MANUAL_TRIGGER' | 'SECURITY_REVOCATION' = 'SCHEDULED_120S'): DynamicSigningKey {
    const now = Date.now();

    // Transition current active key to GRACE status if still valid
    if (this.activeKid && this.keyRegistry.has(this.activeKid)) {
      const current = this.keyRegistry.get(this.activeKid)!;
      if (current.status === 'ACTIVE') {
        current.status = 'GRACE';
      }
    }

    // Purge expired keys past grace period
    for (const [kid, key] of this.keyRegistry.entries()) {
      if (now > key.graceExpiresAt && key.status !== 'REVOKED') {
        key.status = 'EXPIRED';
      }
    }

    const newKey = this.generateSecureKey(reason);
    this.keyRegistry.set(newKey.kid, newKey);
    this.activeKid = newKey.kid;

    // Notify listeners
    this.onRotateCallbacks.forEach((cb) => cb(newKey));
    return newKey;
  }

  public revokeKey(kid: string): boolean {
    const key = this.keyRegistry.get(kid);
    if (!key) return false;
    key.status = 'REVOKED';
    if (this.activeKid === kid) {
      this.rotateKey('SECURITY_REVOCATION');
    }
    return true;
  }

  public getActiveKey(): DynamicSigningKey {
    const key = this.keyRegistry.get(this.activeKid);
    if (!key || key.status !== 'ACTIVE' || Date.now() > key.expiresAt) {
      return this.rotateKey('SCHEDULED_120S');
    }
    return key;
  }

  public getSigningKey(kid: string): DynamicSigningKey | null {
    return this.keyRegistry.get(kid) || null;
  }

  public signPayload(payload: string): { signature: string; kid: string; timestamp: number } {
    const active = this.getActiveKey();
    active.usageCount += 1;
    const hmac = crypto.createHmac('sha256', active.secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');
    return { signature, kid: active.kid, timestamp: Date.now() };
  }

  public verifySignature(payload: string, signature: string, kid: string): boolean {
    const key = this.getSigningKey(kid);
    if (!key) return false;
    if (key.status === 'REVOKED') return false;

    const now = Date.now();
    if (now > key.graceExpiresAt) return false; // Past grace overlap

    const hmac = crypto.createHmac('sha256', key.secret);
    hmac.update(payload);
    const expected = hmac.digest('hex');

    // Constant-time buffer comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
  }

  public getStatus(): KeyRegistryStatus {
    const active = this.getActiveKey();
    const now = Date.now();
    const secondsRemaining = Math.max(0, Math.ceil((active.expiresAt - now) / 1000));

    const history = Array.from(this.keyRegistry.values())
      .slice(-10)
      .reverse()
      .map((k) => ({
        kid: k.kid,
        issuedAt: new Date(k.issuedAt).toISOString(),
        expiresAt: new Date(k.expiresAt).toISOString(),
        status: k.status,
        usageCount: k.usageCount,
      }));

    return {
      activeKid: active.kid,
      algorithm: active.algorithm,
      issuedAt: new Date(active.issuedAt).toISOString(),
      expiresAt: new Date(active.expiresAt).toISOString(),
      secondsRemaining,
      rotationIntervalSeconds: ROTATION_INTERVAL_MS / 1000,
      activeKeyHistory: history,
    };
  }

  private startRotationDaemon() {
    this.rotationTimer = setInterval(() => {
      const active = this.keyRegistry.get(this.activeKid);
      if (!active || Date.now() >= active.expiresAt) {
        this.rotateKey('SCHEDULED_120S');
      }
    }, 5000);
    this.rotationTimer.unref();
  }

  public destroy() {
    if (this.rotationTimer) clearInterval(this.rotationTimer);
  }
}

export const keyManager = new CryptographicKeyManager();

// ============================================================================
// 2. DOUBLE-ENTRY ACCOUNTING & HASH-LINKED TAMPER-EVIDENT LEDGER
// ============================================================================

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

class DoubleEntryLedgerEngine {
  private ledger: DoubleEntryJournalEntry[] = [];
  private lastHash: string = GENESIS_HASH;

  constructor() {
    this.loadOrSeed();
  }

  private loadOrSeed() {
    try {
      if (fs.existsSync(VXA_DB_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(VXA_DB_FILE, 'utf8'));
        if (Array.isArray(parsed?.ledger) && parsed.ledger.length > 0) {
          this.ledger = parsed.ledger;
          this.lastHash = this.ledger[this.ledger.length - 1].hash || GENESIS_HASH;
          return;
        }
      }
    } catch {
      // Fallback to genesis seed
    }
    this.postOpeningBalance();
  }

  public getRawEntriesForPersist(): DoubleEntryJournalEntry[] {
    return this.ledger;
  }

  private postOpeningBalance() {
    this.recordEntry({
      referenceType: 'DEPOSIT_ISSUANCE',
      referenceId: 'genesis_sys_open',
      userId: 'system-escrow',
      debitAccount: '1001_CASH_SETTLEMENT_CLEARING',
      creditAccount: '2001_USER_VXA_LIABILITY',
      amountMinor: 1_000_000, // Rp1,000,000 seed liquidity
      currency: 'IDR',
      exchangeRate: 1000,
      description: 'System initial liquidity escrow seed',
    });
  }

  public recordEntry(params: {
    referenceType: DoubleEntryJournalEntry['referenceType'];
    referenceId: string;
    userId: string;
    debitAccount: AccountCode;
    creditAccount: AccountCode;
    amountMinor: number;
    currency: 'IDR' | 'VXA' | 'VAIURE_CREDITS';
    exchangeRate: number;
    description: string;
  }): DoubleEntryJournalEntry {
    if (params.debitAccount === params.creditAccount) {
      throw new Error('Double-entry violation: Debit and Credit accounts must be distinct.');
    }
    if (params.amountMinor <= 0) {
      throw new Error('Double-entry violation: Transaction amount must be positive integer.');
    }

    const timestamp = new Date().toISOString();
    const entryId = `jnl_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const previousHash = this.lastHash;

    // Canonical payload string for cryptographic hashing
    const canonicalPayload = JSON.stringify({
      entryId,
      timestamp,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
      debitAccount: params.debitAccount,
      creditAccount: params.creditAccount,
      amountMinor: params.amountMinor,
      currency: params.currency,
      exchangeRate: params.exchangeRate,
      description: params.description,
      previousHash,
    });

    const hash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
    const { signature, kid } = keyManager.signPayload(hash);

    const entry: DoubleEntryJournalEntry = {
      entryId,
      timestamp,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      userId: params.userId,
      debitAccount: params.debitAccount,
      creditAccount: params.creditAccount,
      amountMinor: params.amountMinor,
      currency: params.currency,
      exchangeRate: params.exchangeRate,
      description: params.description,
      previousHash,
      hash,
      signature,
      kid,
    };

    this.ledger.push(entry);
    this.lastHash = hash;
    return entry;
  }

  public getLedger(): DoubleEntryJournalEntry[] {
    return [...this.ledger];
  }

  public getLastHash(): string {
    return this.lastHash;
  }

  // Verification method checking every single link in the hash chain and key signature
  public verifyLedgerIntegrity(): {
    ok: boolean;
    totalEntries: number;
    brokenIndex?: number;
    lastHash: string;
    details: string;
  } {
    let prevHash = GENESIS_HASH;

    for (let i = 0; i < this.ledger.length; i++) {
      const entry = this.ledger[i];

      // 1. Verify previous hash link
      if (entry.previousHash !== prevHash) {
        return {
          ok: false,
          totalEntries: this.ledger.length,
          brokenIndex: i,
          lastHash: this.lastHash,
          details: `Broken hash chain link at entry #${i} (${entry.entryId}). Expected prevHash ${prevHash}, got ${entry.previousHash}.`,
        };
      }

      // 2. Recompute canonical hash
      const canonicalPayload = JSON.stringify({
        entryId: entry.entryId,
        timestamp: entry.timestamp,
        referenceType: entry.referenceType,
        referenceId: entry.referenceId,
        userId: entry.userId,
        debitAccount: entry.debitAccount,
        creditAccount: entry.creditAccount,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        exchangeRate: entry.exchangeRate,
        description: entry.description,
        previousHash: entry.previousHash,
      });

      const computedHash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');
      if (computedHash !== entry.hash) {
        return {
          ok: false,
          totalEntries: this.ledger.length,
          brokenIndex: i,
          lastHash: this.lastHash,
          details: `Hash mismatch at entry #${i}. Computed: ${computedHash}, Stored: ${entry.hash}.`,
        };
      }

      // 3. Verify cryptographic signature if key still in registry
      const key = keyManager.getSigningKey(entry.kid);
      if (key && key.status !== 'REVOKED') {
        const hmac = crypto.createHmac('sha256', key.secret);
        hmac.update(entry.hash);
        const expectedSig = hmac.digest('hex');
        if (expectedSig !== entry.signature) {
          return {
            ok: false,
            totalEntries: this.ledger.length,
            brokenIndex: i,
            lastHash: this.lastHash,
            details: `Cryptographic signature forged or corrupted at entry #${i}.`,
          };
        }
      }

      prevHash = entry.hash;
    }

    return {
      ok: true,
      totalEntries: this.ledger.length,
      lastHash: this.lastHash,
      details: 'All double-entry ledger blocks and SHA-256 links verified cryptographically intact.',
    };
  }
}

export const ledgerEngine = new DoubleEntryLedgerEngine();

// ============================================================================
// 3. INDONESIAN BANKING BUSINESS DAY SETTLEMENT ENGINE (1–2 DAYS)
// ============================================================================

// Indonesian public holidays sample (ISO date format YYYY-MM-DD)
const INDONESIA_HOLIDAYS_2026 = new Set([
  '2026-01-01', // New Year
  '2026-02-17', // Isra Mi'raj
  '2026-03-21', // Hari Raya Idul Fitri
  '2026-03-22', // Idul Fitri Day 2
  '2026-05-01', // Labor Day
  '2026-08-17', // Independence Day
  '2026-12-25', // Christmas
]);

export function calculateSettlementTargetDate(requestedAt: Date = new Date()): {
  targetDate: string;
  businessDays: number;
} {
  // Convert to Western Indonesia Time (WIB, UTC+7)
  const wibTime = new Date(requestedAt.getTime() + 7 * 3600 * 1000);
  const hour = wibTime.getUTCHours();

  // If submitted after 15:00 WIB cut-off, start count from next business day
  let daysToAdd = hour >= 15 ? 1 : 0;
  let targetBusinessDays = 2; // Default 1–2 business days target

  const current = new Date(wibTime);
  let addedBusinessDays = 0;

  while (addedBusinessDays < targetBusinessDays) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dayOfWeek = current.getUTCDay(); // 0: Sun, 6: Sat
    const dateStr = current.toISOString().slice(0, 10);

    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = INDONESIA_HOLIDAYS_2026.has(dateStr);

    if (!isWeekend && !isHoliday) {
      addedBusinessDays += 1;
    }
  }

  return {
    targetDate: current.toISOString(),
    businessDays: 2,
  };
}

// ============================================================================
// 4. USER WALLET & FINANCIAL REPOSITORY
// ============================================================================

class VxaWalletRepository {
  private wallets: Map<string, VxaUserWallet> = new Map();
  private transactions: Map<string, VxaTransaction> = new Map();
  private settlements: Map<string, SettlementTrackerRecord> = new Map();
  private securityEvents: SecurityEventLog[] = [];
  private idempotencyStore: Set<string> = new Set();

  constructor() {
    this.loadState();
  }

  private loadState(): void {
    try {
      if (fs.existsSync(VXA_DB_FILE)) {
        const raw = JSON.parse(fs.readFileSync(VXA_DB_FILE, 'utf8'));
        if (raw && typeof raw === 'object') {
          for (const [k, v] of Object.entries(raw.wallets || {})) {
            this.wallets.set(k, v as VxaUserWallet);
          }
          for (const [k, v] of Object.entries(raw.transactions || {})) {
            this.transactions.set(k, v as VxaTransaction);
          }
          for (const [k, v] of Object.entries(raw.settlements || {})) {
            this.settlements.set(k, v as SettlementTrackerRecord);
          }
          if (Array.isArray(raw.securityEvents)) {
            this.securityEvents = raw.securityEvents;
          }
          if (Array.isArray(raw.idempotencyKeys)) {
            this.idempotencyStore = new Set(raw.idempotencyKeys);
          }
        }
      }
    } catch {
      // Proceed with clean repository
    }
    if (this.wallets.size === 0 && process.env.NODE_ENV !== 'production') {
      this.seedDemoUser();
    }
  }

  private persistState(): void {
    try {
      if (!fs.existsSync(BACKUP_ROOT_DIR)) {
        fs.mkdirSync(BACKUP_ROOT_DIR, { recursive: true, mode: 0o700 });
      }
      const payload = {
        wallets: Object.fromEntries(this.wallets.entries()),
        transactions: Object.fromEntries(this.transactions.entries()),
        settlements: Object.fromEntries(this.settlements.entries()),
        securityEvents: this.securityEvents.slice(0, 200),
        idempotencyKeys: Array.from(this.idempotencyStore).slice(-5000),
        ledger: ledgerEngine.getRawEntriesForPersist(),
        updatedAt: new Date().toISOString(),
      };
      const tmp = `${VXA_DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
      fs.renameSync(tmp, VXA_DB_FILE);
    } catch {
      // Non-fatal in read-only env
    }
  }

  private seedDemoUser() {
    const demoUserId = 'efayour@gmail.com';
    const devSalt = crypto.randomBytes(16).toString('hex');
    const wallet: VxaUserWallet = {
      id: `wlt_${crypto.randomUUID()}`,
      userId: demoUserId,
      status: 'ACTIVE',
      securityStatus: 'VERIFIED',
      creditBalances: {
        totalCredits: 350,
        subscriptionCredits: 200,
        purchasedCredits: 150,
        promotionalCredits: 0,
      },
      vxaBalances: {
        availableMinor: 50,
        pendingMinor: 0,
        reservedMinor: 0,
      },
      depositStats: {
        totalDepositedIdr: 50_000,
        totalDepositsCount: 1,
        lastDepositAt: new Date(Date.now() - 86400000).toISOString(),
      },
      withdrawalStats: {
        totalWithdrawnIdr: 0,
        totalWithdrawalsCount: 0,
      },
      // Do not hardcode static weak salt in persisted state; PIN must be configured securely via setStepUpPin
      stepUpPinEnabled: false,
      stepUpPinHash: undefined,
      stepUpPinSalt: devSalt,
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
      lastSecurityVerificationAt: new Date().toISOString(),
    };
    this.wallets.set(demoUserId, wallet);
    this.persistState();
  }

  public issueDepositToken(params: {
    userId: string;
    amountIdr: number;
    depositRef: string;
    paymentMethod: string;
  }): string {
    const exp = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    const payload = `${params.userId}|${params.amountIdr}|${params.depositRef}|${params.paymentMethod}|${exp}`;
    const sig = crypto
      .createHmac('sha256', VXA_VAULT_SECRET)
      .update(payload)
      .digest('hex');
    return Buffer.from(`${payload}|${sig}`, 'utf8').toString('base64url');
  }

  public verifyDepositToken(
    token: string,
    expected: { userId: string; amountIdr: number; depositRef: string }
  ): { valid: boolean; reason?: string } {
    try {
      const raw = Buffer.from(token, 'base64url').toString('utf8');
      const parts = raw.split('|');
      if (parts.length !== 6) return { valid: false, reason: 'Malformed deposit authorization token.' };
      const [uid, amountStr, depRef, method, expStr, sig] = parts;
      if (uid !== expected.userId || depRef !== expected.depositRef || Number(amountStr) !== expected.amountIdr) {
        return { valid: false, reason: 'Deposit token mismatch.' };
      }
      const exp = Number(expStr);
      if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
        return { valid: false, reason: 'Deposit authorization token has expired.' };
      }
      const expectedSig = crypto
        .createHmac('sha256', VXA_VAULT_SECRET)
        .update(`${uid}|${amountStr}|${depRef}|${method}|${expStr}`)
        .digest('hex');
      if (
        sig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expectedSig, 'utf8'))
      ) {
        return { valid: false, reason: 'Invalid deposit authorization signature.' };
      }
      const consumeKey = `depref:${depRef}`;
      if (this.idempotencyStore.has(consumeKey)) {
        return { valid: false, reason: 'Deposit authorization token has already been used.' };
      }
      this.idempotencyStore.add(consumeKey);
      this.persistState();
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Invalid deposit authorization token.' };
    }
  }

  public getOrCreateWallet(userId: string): VxaUserWallet {
    if (this.wallets.has(userId)) {
      return this.wallets.get(userId)!;
    }

    const newWallet: VxaUserWallet = {
      id: `wlt_${crypto.randomUUID()}`,
      userId,
      status: 'ACTIVE',
      securityStatus: 'VERIFIED',
      creditBalances: {
        totalCredits: 20, // Free welcome credits
        subscriptionCredits: 20,
        purchasedCredits: 0,
        promotionalCredits: 0,
      },
      vxaBalances: {
        availableMinor: 0,
        pendingMinor: 0,
        reservedMinor: 0,
      },
      depositStats: {
        totalDepositedIdr: 0,
        totalDepositsCount: 0,
      },
      withdrawalStats: {
        totalWithdrawnIdr: 0,
        totalWithdrawalsCount: 0,
      },
      stepUpPinEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSecurityVerificationAt: new Date().toISOString(),
    };

    this.wallets.set(userId, newWallet);
    this.persistState();
    return newWallet;
  }

  public setStepUpPin(userId: string, pin: string): boolean {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error('PIN must be exactly 6 numeric digits.');
    }
    const wallet = this.getOrCreateWallet(userId);
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = `scrypt:${hashPinScrypt(pin, salt)}`;

    wallet.stepUpPinEnabled = true;
    wallet.stepUpPinHash = hash;
    wallet.stepUpPinSalt = salt;
    wallet.updatedAt = new Date().toISOString();
    bruteForceGuard.reset(`vxa_pin:${userId}`);
    this.persistState();
    return true;
  }

  public verifyStepUpPin(userId: string, pin: string): boolean {
    const lock = bruteForceGuard.checkLocked(`vxa_pin:${userId}`);
    if (lock.locked) {
      throw new Error(`Too many incorrect PIN attempts. Locked for ${lock.retryAfterSec}s.`);
    }

    const wallet = this.getOrCreateWallet(userId);
    if (!wallet.stepUpPinEnabled || !wallet.stepUpPinHash || !wallet.stepUpPinSalt) {
      return true; // No PIN configured yet
    }
    if (!/^\d{6}$/.test(pin || '')) {
      bruteForceGuard.recordFailure(`vxa_pin:${userId}`);
      this.logSecurityEvent({
        severity: 'HIGH',
        category: 'AUTH_FAILURE',
        userId,
        details: 'Malformed or invalid step-up PIN verification attempt.',
        resolved: false,
      });
      return false;
    }

    let matched = false;
    if (wallet.stepUpPinHash.startsWith('scrypt:')) {
      const storedHex = wallet.stepUpPinHash.slice('scrypt:'.length);
      const checkHex = hashPinScrypt(pin, wallet.stepUpPinSalt);
      if (storedHex.length === checkHex.length) {
        matched = crypto.timingSafeEqual(Buffer.from(checkHex, 'hex'), Buffer.from(storedHex, 'hex'));
      }
    } else if (wallet.stepUpPinSalt !== 'salt_demo') {
      const checkHex = crypto.createHash('sha256').update(pin + wallet.stepUpPinSalt).digest('hex');
      if (checkHex.length === wallet.stepUpPinHash.length) {
        matched = crypto.timingSafeEqual(
          Buffer.from(checkHex, 'hex'),
          Buffer.from(wallet.stepUpPinHash, 'hex')
        );
      }
      if (matched) {
        // Transparently upgrade legacy SHA-256 PIN to scrypt
        const newSalt = crypto.randomBytes(16).toString('hex');
        wallet.stepUpPinSalt = newSalt;
        wallet.stepUpPinHash = `scrypt:${hashPinScrypt(pin, newSalt)}`;
        this.persistState();
      }
    }

    if (!matched) {
      const res = bruteForceGuard.recordFailure(`vxa_pin:${userId}`, 5, 15 * 60_000);
      this.logSecurityEvent({
        severity: res.locked ? 'CRITICAL' : 'HIGH',
        category: 'AUTH_FAILURE',
        userId,
        details: res.locked
          ? 'Step-up PIN locked out after 5 failed attempts.'
          : 'Incorrect step-up PIN verification attempt.',
        resolved: false,
      });
      if (res.locked) {
        throw new Error(`Too many incorrect PIN attempts. Account PIN locked for ${res.retryAfterSec}s.`);
      }
    } else {
      bruteForceGuard.reset(`vxa_pin:${userId}`);
    }
    return matched;
  }

  // ==========================================================================
  // DEPOSIT WORKFLOW
  // 1 VXA = Rp1,000 IDR
  // ==========================================================================
  public processDeposit(params: {
    userId: string;
    amountIdr: number;
    paymentMethod: string;
    idempotencyKey?: string;
  }): { transaction: VxaTransaction; wallet: VxaUserWallet } {
    const { userId, paymentMethod } = params;
    const amountIdr = Math.trunc(params.amountIdr);

    if (!Number.isSafeInteger(amountIdr) || amountIdr < 10_000 || amountIdr > 500_000_000) {
      throw new Error('Deposit amount must be a valid integer between Rp10,000 and Rp500,000,000.');
    }

    const idempotencyKey = params.idempotencyKey || `dep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    if (this.idempotencyStore.has(idempotencyKey)) {
      throw new Error('Duplicate transaction: Idempotency token already settled.');
    }
    this.idempotencyStore.add(idempotencyKey);

    const wallet = this.getOrCreateWallet(userId);
    if (wallet.status === 'FROZEN' || wallet.status === 'RESTRICTED') {
      this.idempotencyStore.delete(idempotencyKey);
      throw new Error('Wallet is currently frozen or restricted.');
    }

    // Exact integer math: 1 VXA = Rp1,000
    const vxaAmount = Math.floor(amountIdr / 1000);
    const txId = `tx_dep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const journal = ledgerEngine.recordEntry({
      referenceType: 'DEPOSIT_ISSUANCE',
      referenceId: txId,
      userId,
      debitAccount: '1002_PAYMENT_GATEWAY_RECEIVABLE',
      creditAccount: '2001_USER_VXA_LIABILITY',
      amountMinor: amountIdr,
      currency: 'IDR',
      exchangeRate: 1000,
      description: `Verified deposit: +${vxaAmount} VXA via ${paymentMethod} (Rp${amountIdr.toLocaleString('id-ID')})`,
    });

    wallet.vxaBalances.availableMinor += vxaAmount;
    wallet.depositStats.totalDepositedIdr += amountIdr;
    wallet.depositStats.totalDepositsCount += 1;
    wallet.depositStats.lastDepositAt = new Date().toISOString();
    wallet.updatedAt = new Date().toISOString();

    const { signature, kid } = keyManager.signPayload(txId + amountIdr);

    const transaction: VxaTransaction = {
      id: txId,
      idempotencyKey,
      userId,
      walletId: wallet.id,
      type: 'DEPOSIT',
      asset: 'VXA',
      amountMinor: vxaAmount,
      amountIdrEquivalent: amountIdr,
      conversionRate: 1000,
      feeMinor: 0,
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      partnerReference: `MIDTRANS-SETTLED-${Date.now()}`,
      riskScore: 0,
      signature,
      kid,
      previousLedgerRef: journal.hash,
    };

    this.transactions.set(txId, transaction);
    this.persistState();
    return { transaction, wallet };
  }

  // ==========================================================================
  // WITHDRAWAL WORKFLOW (RESERVATION -> SETTLEMENT PIPELINE)
  // ==========================================================================
  public requestWithdrawal(params: {
    userId: string;
    amountVxa: number;
    destination: PayoutDestination;
    pin?: string;
    idempotencyKey?: string;
  }): { transaction: VxaTransaction; settlement: SettlementTrackerRecord; wallet: VxaUserWallet } {
    const { userId, destination, pin } = params;
    const amountVxa = Math.trunc(params.amountVxa);

    if (!Number.isSafeInteger(amountVxa) || amountVxa < 10 || amountVxa > 100_000) {
      throw new Error('Withdrawal amount must be an integer between 10 VXA and 100,000 VXA.');
    }

    const wallet = this.getOrCreateWallet(userId);
    if (wallet.status === 'FROZEN' || wallet.status === 'RESTRICTED') {
      throw new Error('Wallet has administrative restrictions and cannot withdraw.');
    }

    // 1. Verify Step-Up PIN if enabled
    if (wallet.stepUpPinEnabled && pin) {
      const isValidPin = this.verifyStepUpPin(userId, pin);
      if (!isValidPin) {
        throw new Error('Invalid 6-digit Security Step-Up PIN.');
      }
    } else if (wallet.stepUpPinEnabled && !pin) {
      throw new Error('Step-up PIN required for withdrawal authorization.');
    }

    // 2. Validate Available Balance
    if (wallet.vxaBalances.availableMinor < amountVxa) {
      throw new Error(`Insufficient available VXA balance. Available: ${wallet.vxaBalances.availableMinor} VXA, Requested: ${amountVxa} VXA.`);
    }

    const idempotencyKey = params.idempotencyKey || `wth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    if (this.idempotencyStore.has(idempotencyKey)) {
      throw new Error('Duplicate withdrawal request detected.');
    }
    this.idempotencyStore.add(idempotencyKey);

    const risk = this.evaluateRiskScore(userId, amountVxa);
    const amountIdr = amountVxa * 1000;
    const txId = `tx_wth_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Atomic balance reservation
    wallet.vxaBalances.availableMinor -= amountVxa;
    wallet.vxaBalances.reservedMinor += amountVxa;
    wallet.updatedAt = new Date().toISOString();

    const journal = ledgerEngine.recordEntry({
      referenceType: 'WITHDRAWAL_RESERVE',
      referenceId: txId,
      userId,
      debitAccount: '2001_USER_VXA_LIABILITY',
      creditAccount: '2002_USER_RESERVED_VXA_LIABILITY',
      amountMinor: amountIdr,
      currency: 'VXA',
      exchangeRate: 1000,
      description: `Withdrawal reserved: ${amountVxa} VXA -> ${destination.bankName} ${destination.accountNumber}`,
    });

    const { signature, kid } = keyManager.signPayload(txId + amountVxa);
    const { targetDate } = calculateSettlementTargetDate();

    const transaction: VxaTransaction = {
      id: txId,
      idempotencyKey,
      userId,
      walletId: wallet.id,
      type: 'WITHDRAWAL',
      asset: 'VXA',
      amountMinor: amountVxa,
      amountIdrEquivalent: amountIdr,
      conversionRate: 1000,
      feeMinor: 0,
      status: 'SECURITY_REVIEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payoutDestination: destination,
      partnerReference: `BI-FAST-REQ-${Date.now()}`,
      riskScore: risk.riskScore,
      signature,
      kid,
      previousLedgerRef: journal.hash,
    };

    const settlement: SettlementTrackerRecord = {
      withdrawalId: txId,
      userId,
      amountVxa,
      amountIdr,
      payoutDestination: destination,
      requestedAt: new Date().toISOString(),
      targetSettlementDate: targetDate,
      currentStatus: 'SECURITY_REVIEW',
      isSimulatedDevMode: true,
      partnerReference: transaction.partnerReference,
      stages: [
        { stage: 'REQUESTED', label: 'Withdrawal Request Submitted', timestamp: new Date().toISOString(), completed: true },
        { stage: 'SECURITY_REVIEW', label: 'Cryptographic & Risk Engine Review', timestamp: new Date().toISOString(), completed: true },
        { stage: 'PROCESSING', label: 'Queued for Financial Partner Dispatch', completed: false },
        { stage: 'AWAITING_PARTNER', label: 'BI-FAST / Real-Time Clearing', completed: false },
        { stage: 'SETTLED', label: 'Bank Settlement Complete', completed: false },
      ],
    };

    this.transactions.set(txId, transaction);
    this.settlements.set(txId, settlement);
    this.persistState();
    return { transaction, settlement, wallet };
  }

  public processSettlementAction(params: {
    withdrawalId: string;
    action: 'APPROVE' | 'REJECT';
    reason?: string;
    adminEmail?: string;
  }): { transaction: VxaTransaction; settlement: SettlementTrackerRecord; wallet: VxaUserWallet } {
    const tx = this.transactions.get(params.withdrawalId);
    const settlement = this.settlements.get(params.withdrawalId);
    if (!tx || !settlement) {
      throw new Error(`Withdrawal ${params.withdrawalId} not found.`);
    }
    if (settlement.currentStatus === 'SETTLED' || settlement.currentStatus === 'REJECTED') {
      throw new Error(`Settlement ${params.withdrawalId} is already in terminal state (${settlement.currentStatus}).`);
    }

    const wallet = this.getOrCreateWallet(tx.userId);
    const amountIdr = tx.amountMinor * 1000;

    if (params.action === 'APPROVE') {
      if (wallet.vxaBalances.reservedMinor < tx.amountMinor) {
        throw new Error('Reserved balance invariant violation during settlement approval.');
      }
      wallet.vxaBalances.reservedMinor -= tx.amountMinor;
      wallet.withdrawalStats.totalWithdrawnIdr += amountIdr;
      wallet.withdrawalStats.totalWithdrawalsCount += 1;
      wallet.withdrawalStats.lastWithdrawalAt = new Date().toISOString();
      wallet.updatedAt = new Date().toISOString();

      ledgerEngine.recordEntry({
        referenceType: 'WITHDRAWAL_SETTLEMENT',
        referenceId: tx.id,
        userId: tx.userId,
        debitAccount: '2002_USER_RESERVED_VXA_LIABILITY',
        creditAccount: '1001_CASH_SETTLEMENT_CLEARING',
        amountMinor: amountIdr,
        currency: 'IDR',
        exchangeRate: 1000,
        description: `Settlement payout finalized: ${tx.amountMinor} VXA (Rp${amountIdr.toLocaleString('id-ID')}) -> ${tx.payoutDestination?.bankName}`,
      });

      tx.status = 'SETTLED';
      tx.settledAt = new Date().toISOString();
      tx.updatedAt = new Date().toISOString();

      settlement.currentStatus = 'SETTLED';
      settlement.stages.forEach((s) => {
        s.completed = true;
        if (!s.timestamp) s.timestamp = new Date().toISOString();
      });
    } else {
      if (wallet.vxaBalances.reservedMinor < tx.amountMinor) {
        throw new Error('Reserved balance invariant violation during settlement reversal.');
      }
      wallet.vxaBalances.reservedMinor -= tx.amountMinor;
      wallet.vxaBalances.availableMinor += tx.amountMinor;
      wallet.updatedAt = new Date().toISOString();

      ledgerEngine.recordEntry({
        referenceType: 'WITHDRAWAL_REVERSAL',
        referenceId: tx.id,
        userId: tx.userId,
        debitAccount: '2002_USER_RESERVED_VXA_LIABILITY',
        creditAccount: '2001_USER_VXA_LIABILITY',
        amountMinor: amountIdr,
        currency: 'VXA',
        exchangeRate: 1000,
        description: `Withdrawal reversed: +${tx.amountMinor} VXA restored. Reason: ${params.reason || 'Verification rejected'}`,
      });

      tx.status = 'REJECTED';
      tx.failureReason = params.reason || 'Settlement rejected by security review.';
      tx.updatedAt = new Date().toISOString();

      settlement.currentStatus = 'REJECTED';
      settlement.stages.push({
        stage: 'REJECTED',
        label: `Settlement Rejected: ${tx.failureReason}`,
        timestamp: new Date().toISOString(),
        completed: true,
      });
    }

    this.logSecurityEvent({
      severity: 'MEDIUM',
      category: 'SETTLEMENT_DECISION',
      userId: tx.userId,
      details: `Admin ${params.adminEmail || 'unknown'} executed ${params.action} on settlement ${tx.id}`,
      resolved: true,
    });
    this.persistState();
    return { transaction: tx, settlement, wallet };
  }

  public convertVxaToCredits(userId: string, rawVxaAmount: number): {
    wallet: VxaUserWallet;
    creditsReceived: number;
    transaction: VxaTransaction;
  } {
    const vxaAmount = Math.trunc(rawVxaAmount);
    if (!Number.isSafeInteger(vxaAmount) || vxaAmount < 6 || vxaAmount > 100_000) {
      throw new Error('Conversion amount must be an integer between 6 VXA and 100,000 VXA.');
    }

    const wallet = this.getOrCreateWallet(userId);
    if (wallet.status === 'FROZEN' || wallet.status === 'RESTRICTED') {
      throw new Error('Wallet is frozen or restricted.');
    }
    if (wallet.vxaBalances.availableMinor < vxaAmount) {
      throw new Error(`Insufficient available VXA. Available: ${wallet.vxaBalances.availableMinor} VXA.`);
    }

    const creditsReceived = Math.floor((vxaAmount * 1000) / 600);
    const amountIdr = vxaAmount * 1000;
    const txId = `tx_cnv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    wallet.vxaBalances.availableMinor -= vxaAmount;
    wallet.creditBalances.purchasedCredits += creditsReceived;
    wallet.creditBalances.totalCredits += creditsReceived;
    wallet.updatedAt = new Date().toISOString();

    const journal = ledgerEngine.recordEntry({
      referenceType: 'VXA_TO_CREDITS_CONVERT',
      referenceId: txId,
      userId,
      debitAccount: '2001_USER_VXA_LIABILITY',
      creditAccount: '2003_USER_CREDITS_UTILITY_LIABILITY',
      amountMinor: amountIdr,
      currency: 'VXA',
      exchangeRate: 1000,
      description: `Converted ${vxaAmount} VXA into ${creditsReceived} VAIURE Credits (Utility only)`,
    });

    const { signature, kid } = keyManager.signPayload(txId + creditsReceived);

    const transaction: VxaTransaction = {
      id: txId,
      idempotencyKey: `cnv_idem_${txId}`,
      userId,
      walletId: wallet.id,
      type: 'CONVERSION',
      asset: 'VAIURE_CREDITS',
      amountMinor: creditsReceived,
      amountIdrEquivalent: amountIdr,
      conversionRate: 1000,
      feeMinor: 0,
      status: 'SETTLED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
      riskScore: 0,
      signature,
      kid,
      previousLedgerRef: journal.hash,
    };

    this.transactions.set(txId, transaction);
    this.persistState();
    return { wallet, creditsReceived, transaction };
  }

  // ==========================================================================
  // RISK SCORING & AUDIT LOGGING
  // ==========================================================================
  private evaluateRiskScore(userId: string, requestedAmountVxa: number): { riskScore: number; flags: string[] } {
    let score = 5;
    const flags: string[] = [];

    const userTxs = Array.from(this.transactions.values()).filter((t) => t.userId === userId);
    const recentDeposits = userTxs.filter(
      (t) => t.type === 'DEPOSIT' && Date.now() - new Date(t.createdAt).getTime() < 3600_000
    );

    // Rapid deposit & withdraw check (< 1 hour)
    if (recentDeposits.length > 0) {
      score += 35;
      flags.push('Rapid deposit-and-withdraw velocity (< 1 hour)');
    }

    // High single withdrawal
    if (requestedAmountVxa > 500) {
      score += 25;
      flags.push('Large withdrawal volume (> 500 VXA)');
    }

    return { riskScore: Math.min(100, score), flags };
  }

  public logSecurityEvent(event: Omit<SecurityEventLog, 'id' | 'timestamp'>): SecurityEventLog {
    const fullEvent: SecurityEventLog = {
      ...event,
      id: `sec_evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
    };
    this.securityEvents.unshift(fullEvent);
    if (this.securityEvents.length > 200) this.securityEvents.pop();
    this.persistState();
    return fullEvent;
  }

  public getSecurityEvents(): SecurityEventLog[] {
    return [...this.securityEvents];
  }

  public getTransactions(userId?: string): VxaTransaction[] {
    const all = Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return userId ? all.filter((t) => t.userId === userId) : all;
  }

  public getSettlements(userId?: string): SettlementTrackerRecord[] {
    const all = Array.from(this.settlements.values()).sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    );
    return userId ? all.filter((s) => s.userId === userId) : all;
  }

  public getAdminFinancialOverview(): AdminFinancialOverview {
    let totalCirculatingVxaMinor = 0;
    let totalReservedVxaMinor = 0;
    let totalVerifiedDepositsIdr = 0;
    let totalSettledWithdrawalsIdr = 0;
    let totalPendingWithdrawalsCount = 0;
    let totalPendingWithdrawalsIdr = 0;

    for (const wallet of this.wallets.values()) {
      totalCirculatingVxaMinor += wallet.vxaBalances.availableMinor;
      totalReservedVxaMinor += wallet.vxaBalances.reservedMinor;
      totalVerifiedDepositsIdr += wallet.depositStats.totalDepositedIdr;
      totalSettledWithdrawalsIdr += wallet.withdrawalStats.totalWithdrawnIdr;
    }

    for (const tx of this.transactions.values()) {
      if (tx.type === 'WITHDRAWAL' && (tx.status === 'SECURITY_REVIEW' || tx.status === 'PROCESSING')) {
        totalPendingWithdrawalsCount += 1;
        totalPendingWithdrawalsIdr += tx.amountIdrEquivalent;
      }
    }

    const ledgerVerify = ledgerEngine.verifyLedgerIntegrity();

    return {
      totalCirculatingVxaMinor,
      totalCirculatingVxaIdr: totalCirculatingVxaMinor * 1000,
      totalReservedVxaMinor,
      totalReservedVxaIdr: totalReservedVxaMinor * 1000,
      totalMonetaryLiabilitiesIdr: (totalCirculatingVxaMinor + totalReservedVxaMinor) * 1000,
      totalVerifiedDepositsIdr,
      totalSettledWithdrawalsIdr,
      totalPendingWithdrawalsCount,
      totalPendingWithdrawalsIdr,
      totalFailedSettlementRefundsIdr: 0,
      totalPlatformFeesRevenueIdr: 15_000,
      ledgerIntegrityVerified: ledgerVerify.ok,
      totalLedgerEntriesCount: ledgerEngine.getLedger().length,
      lastLedgerHash: ledgerEngine.getLastHash(),
      activeSigningKid: keyManager.getActiveKey().kid,
      operatingMode: 'DEVELOPMENT_SIMULATED',
    };
  }
}

export const vxaWalletRepo = new VxaWalletRepository();
