/**
 * VAIURE Labs — VXA Financial Security & Digital Wallet Express Router
 * Endpoints for Wallets, Dynamic 120s Key Rotation, Double-Entry Ledger,
 * Deposits, Withdrawals, Currency Conversions, and Security Controls.
 *
 * Strictly enforces server-side Firebase Bearer Auth + RBAC + HMAC Deposit Tokens + Rate Limiting.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import {
  keyManager,
  ledgerEngine,
  vxaWalletRepo,
} from './vxaSecurityEngine';
import { runVxaSecurityTests } from './__tests__/vxaSecurity.test';
import {
  requireFirebaseAuth,
  requireAdmin,
} from './firebaseAuthMiddleware';
import {
  financialLimiter,
  isSafeIdentifier,
  sanitizeErrorMessage,
} from './securityMiddleware';

export const vxaSecurityRouter = Router();

// All VXA endpoints require verified Firebase ID token authentication
vxaSecurityRouter.use(requireFirebaseAuth);

function getVerifiedActorId(req: Request): string {
  // Use verified UID consistently (or normalized verified email if legacy wallet lookup matches)
  return req.verifiedUser!.uid;
}

// ============================================================================
// 1. USER WALLET & BALANCES
// ============================================================================

vxaSecurityRouter.get('/wallet', (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const wallet = vxaWalletRepo.getOrCreateWallet(userId);
    res.json({
      ok: true,
      wallet,
      conversionRate: 1000, // 1 VXA = Rp1,000 IDR
      operatingMode: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT_SIMULATED',
      notice: 'VXA is a centrally accounted platform digital monetary unit.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load wallet.') });
  }
});

vxaSecurityRouter.get('/transactions', (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const transactions = vxaWalletRepo.getTransactions(userId);
    res.json({
      ok: true,
      transactions,
      count: transactions.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load transactions.') });
  }
});

vxaSecurityRouter.get('/settlements', (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const settlements = vxaWalletRepo.getSettlements(userId);
    res.json({
      ok: true,
      settlements,
      serviceTarget: '1–2 Business Days (Indonesian Banking Hours)',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load settlements.') });
  }
});

// ============================================================================
// 2. DEPOSIT SYSTEM (Rp -> VXA)
// ============================================================================

vxaSecurityRouter.post('/deposit/create', financialLimiter, (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const { amountIdr, paymentMethod } = req.body;

    const amount = Math.trunc(Number(amountIdr));
    if (!Number.isSafeInteger(amount) || amount < 10_000 || amount > 500_000_000) {
      return res.status(400).json({
        ok: false,
        error: 'Deposit amount must be between Rp10,000 and Rp500,000,000.',
      });
    }

    const cleanMethod = String(paymentMethod || 'QRIS').slice(0, 40);
    const vxaAmount = Math.floor(amount / 1000);
    const depositRef = `DEP-REF-${Date.now()}-${crypto.randomInt(1000, 9999)}`;
    const vaNumber = `8809${crypto.randomInt(10000000, 99999999)}`;
    const depositToken = vxaWalletRepo.issueDepositToken({
      userId,
      amountIdr: amount,
      depositRef,
      paymentMethod: cleanMethod,
    });

    res.json({
      ok: true,
      depositRef,
      depositToken,
      amountIdr: amount,
      vxaEquivalent: vxaAmount,
      rate: 1000,
      paymentMethod: cleanMethod,
      qrString: `00020101021226600016ID.CO.VAIURE.VXA01189360091100223344550215${depositRef}5802ID5911VAIURE LABS6007JAKARTA6304ABCD`,
      vaNumber,
      expiresInMinutes: 30,
      instructions: 'Pay via QRIS or Virtual Account to credit VXA Coin immediately upon settlement.',
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to initiate deposit.') });
  }
});

vxaSecurityRouter.post('/deposit/confirm', financialLimiter, (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const { amountIdr, paymentMethod, depositRef, depositToken, idempotencyKey } = req.body;

    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SIMULATED_VXA_DEPOSITS !== 'true') {
      return res.status(403).json({
        ok: false,
        error: 'Client-initiated deposit confirmation is disabled in production; await gateway webhook settlement.',
      });
    }

    const amount = Math.trunc(Number(amountIdr));
    if (!Number.isSafeInteger(amount) || amount < 10_000 || amount > 500_000_000) {
      return res.status(400).json({ ok: false, error: 'Invalid deposit amount.' });
    }
    if (!depositRef || typeof depositRef !== 'string' || !isSafeIdentifier(depositRef)) {
      return res.status(400).json({ ok: false, error: 'Valid depositRef is required.' });
    }
    if (!depositToken || typeof depositToken !== 'string') {
      return res.status(403).json({ ok: false, error: 'Signed server depositToken is required.' });
    }

    const verification = vxaWalletRepo.verifyDepositToken(depositToken, {
      userId,
      amountIdr: amount,
      depositRef,
    });
    if (!verification.valid) {
      vxaWalletRepo.logSecurityEvent({
        severity: 'HIGH',
        category: 'DEPOSIT_TAMPER_ATTEMPT',
        userId,
        details: verification.reason || 'Forged deposit confirmation attempt blocked.',
        resolved: false,
      });
      return res.status(403).json({ ok: false, error: verification.reason || 'Deposit verification failed.' });
    }

    const result = vxaWalletRepo.processDeposit({
      userId,
      amountIdr: amount,
      paymentMethod: String(paymentMethod || 'QRIS').slice(0, 40),
      idempotencyKey: typeof idempotencyKey === 'string' && isSafeIdentifier(idempotencyKey)
        ? idempotencyKey
        : depositRef,
    });

    res.json({
      ok: true,
      message: `Deposit verified! +${result.transaction.amountMinor} VXA credited to your wallet.`,
      transaction: result.transaction,
      wallet: result.wallet,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Deposit confirmation rejected.') });
  }
});

// ============================================================================
// 3. WITHDRAWAL SYSTEM (VXA -> Rp)
// ============================================================================

vxaSecurityRouter.post('/withdraw/request', financialLimiter, (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const { amountVxa, destination, pin, idempotencyKey } = req.body;

    const vxa = Math.trunc(Number(amountVxa));
    if (!Number.isSafeInteger(vxa) || vxa < 10 || vxa > 100_000) {
      return res.status(400).json({ ok: false, error: 'Withdrawal must be between 10 VXA and 100,000 VXA.' });
    }

    if (
      !destination ||
      typeof destination.bankName !== 'string' ||
      typeof destination.accountNumber !== 'string' ||
      typeof destination.accountHolderName !== 'string' ||
      !destination.bankName.trim() ||
      !destination.accountNumber.trim() ||
      !destination.accountHolderName.trim()
    ) {
      return res.status(400).json({ ok: false, error: 'Complete payout bank details required.' });
    }

    const safeDest = {
      ...destination,
      bankName: destination.bankName.trim().slice(0, 80),
      accountNumber: destination.accountNumber.trim().slice(0, 40),
      accountHolderName: destination.accountHolderName.trim().slice(0, 120),
    };

    const result = vxaWalletRepo.requestWithdrawal({
      userId,
      amountVxa: vxa,
      destination: safeDest,
      pin: typeof pin === 'string' ? pin : undefined,
      idempotencyKey: typeof idempotencyKey === 'string' && isSafeIdentifier(idempotencyKey)
        ? idempotencyKey
        : undefined,
    });

    res.json({
      ok: true,
      message: `Withdrawal request for ${vxa} VXA (Rp${(vxa * 1000).toLocaleString('id-ID')}) accepted for settlement.`,
      transaction: result.transaction,
      settlement: result.settlement,
      wallet: result.wallet,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Withdrawal request failed.') });
  }
});

// ============================================================================
// 4. CONVERSION (VXA -> VAIURE Credits)
// ============================================================================

vxaSecurityRouter.post('/convert', financialLimiter, (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const { vxaAmount } = req.body;

    const amount = Math.trunc(Number(vxaAmount));
    if (!Number.isSafeInteger(amount) || amount < 6 || amount > 100_000) {
      return res.status(400).json({ ok: false, error: 'Conversion must be an integer between 6 VXA and 100,000 VXA.' });
    }

    const result = vxaWalletRepo.convertVxaToCredits(userId, amount);
    res.json({
      ok: true,
      message: `Successfully converted ${amount} VXA to ${result.creditsReceived} VAIURE Credits.`,
      creditsReceived: result.creditsReceived,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Conversion failed.') });
  }
});

// ============================================================================
// 5. SECURITY & 120-SECOND DYNAMIC KEY ROTATION
// ============================================================================

vxaSecurityRouter.get('/security/key-status', (_req: Request, res: Response) => {
  try {
    const status = keyManager.getStatus();
    res.json({
      ok: true,
      status,
      policy: {
        rotationIntervalSeconds: 120,
        gracePeriodSeconds: 60,
        algorithm: 'HMAC-SHA256',
        scope: 'Transaction Authorization & Hash-Chain Attestation',
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to retrieve key status.') });
  }
});

vxaSecurityRouter.post('/security/key-rotate', requireAdmin, (req: Request, res: Response) => {
  try {
    const newKey = keyManager.rotateKey('MANUAL_TRIGGER');
    vxaWalletRepo.logSecurityEvent({
      severity: 'MEDIUM',
      category: 'KEY_ROTATION',
      userId: req.verifiedUser!.uid,
      details: `Administrator (${req.verifiedUser!.email}) triggered manual signing key rotation: KID ${newKey.kid}`,
      resolved: true,
    });
    res.json({
      ok: true,
      message: 'New short-lived signing key activated.',
      activeKid: newKey.kid,
      issuedAt: new Date(newKey.issuedAt).toISOString(),
      expiresAt: new Date(newKey.expiresAt).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Key rotation failed.') });
  }
});

vxaSecurityRouter.post('/security/step-up/pin', financialLimiter, (req: Request, res: Response) => {
  try {
    const userId = getVerifiedActorId(req);
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ ok: false, error: 'PIN must be provided.' });
    }
    vxaWalletRepo.setStepUpPin(userId, pin);
    res.json({
      ok: true,
      message: '6-digit Security Step-Up PIN configured successfully.',
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to set security PIN.') });
  }
});

// ============================================================================
// 6. DOUBLE-ENTRY LEDGER & AUDIT TRAIL (Admin Restricted)
// ============================================================================

vxaSecurityRouter.get('/ledger/entries', requireAdmin, (_req: Request, res: Response) => {
  try {
    const entries = ledgerEngine.getLedger();
    res.json({
      ok: true,
      count: entries.length,
      lastHash: ledgerEngine.getLastHash(),
      entries: entries.slice(-50).reverse(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load ledger.') });
  }
});

vxaSecurityRouter.get('/ledger/verify', requireAdmin, (_req: Request, res: Response) => {
  try {
    const audit = ledgerEngine.verifyLedgerIntegrity();
    res.json({
      ok: audit.ok,
      audit,
      verifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Verification failed.') });
  }
});

// ============================================================================
// 7. ADMINISTRATOR FINANCIAL CONTROL DASHBOARD
// ============================================================================

vxaSecurityRouter.get('/admin/overview', requireAdmin, (_req: Request, res: Response) => {
  try {
    const overview = vxaWalletRepo.getAdminFinancialOverview();
    res.json({ ok: true, overview });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load admin overview.') });
  }
});

vxaSecurityRouter.get('/admin/settlement-queue', requireAdmin, (_req: Request, res: Response) => {
  try {
    const settlements = vxaWalletRepo.getSettlements();
    const pending = settlements.filter(
      (s) => s.currentStatus === 'SECURITY_REVIEW' || s.currentStatus === 'PROCESSING'
    );
    res.json({ ok: true, pending, totalCount: pending.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to load settlement queue.') });
  }
});

vxaSecurityRouter.post('/admin/settlement-action', requireAdmin, (req: Request, res: Response) => {
  try {
    const { withdrawalId, action, reason } = req.body;
    if (!withdrawalId || !isSafeIdentifier(withdrawalId) || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'Valid withdrawalId and action (APPROVE/REJECT) required.' });
    }

    const result = vxaWalletRepo.processSettlementAction({
      withdrawalId,
      action,
      reason: typeof reason === 'string' ? reason.slice(0, 300) : undefined,
      adminEmail: req.verifiedUser!.email,
    });

    res.json({
      ok: true,
      message: `Settlement ${action === 'APPROVE' ? 'settled' : 'rejected and refunded'}.`,
      settlement: result.settlement,
      transaction: result.transaction,
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: sanitizeErrorMessage(err, 'Settlement action failed.') });
  }
});

vxaSecurityRouter.get('/admin/security-events', requireAdmin, (_req: Request, res: Response) => {
  try {
    const events = vxaWalletRepo.getSecurityEvents();
    res.json({ ok: true, events });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Failed to fetch security events.') });
  }
});

vxaSecurityRouter.get('/admin/run-tests', requireAdmin, (_req: Request, res: Response) => {
  try {
    const testSuite = runVxaSecurityTests();
    res.json({ ok: true, testSuite });
  } catch (err) {
    res.status(500).json({ ok: false, error: sanitizeErrorMessage(err, 'Test suite failed.') });
  }
});
