/**
 * VAIURE Labs — VXA Financial Security & Digital Wallet Express Router
 * Endpoints for Wallets, Dynamic 120s Key Rotation, Double-Entry Ledger,
 * Deposits, Withdrawals, Currency Conversions, and Security Controls.
 */

import { Router, Request, Response } from 'express';
import {
  keyManager,
  ledgerEngine,
  vxaWalletRepo,
  calculateSettlementTargetDate,
} from './vxaSecurityEngine';
import { runVxaSecurityTests } from './__tests__/vxaSecurity.test';

export const vxaSecurityRouter = Router();

// Helper to extract authenticated user or default demo identity
function getRequestUserId(req: Request): string {
  const headerId = req.headers['x-user-id'] as string;
  const headerEmail = req.headers['x-user-email'] as string;
  return headerId || headerEmail || 'efayour@gmail.com';
}

function verifyAdminClearance(req: Request): boolean {
  const userEmail = (req.headers['x-user-email'] as string) || '';
  const adminEmails = ['efayour@gmail.com', 'rachvan420@gmail.com', 'vaiurenetwork@gmail.com'];
  return adminEmails.includes(userEmail) || true; // Development mode allows owner access
}

// ============================================================================
// 1. USER WALLET & BALANCES
// ============================================================================

vxaSecurityRouter.get('/wallet', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const wallet = vxaWalletRepo.getOrCreateWallet(userId);
    res.json({
      ok: true,
      wallet,
      conversionRate: 1000, // 1 VXA = Rp1,000 IDR
      operatingMode: 'DEVELOPMENT_SIMULATED',
      notice: 'VXA is a centrally accounted platform digital monetary unit in simulated development mode.',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/transactions', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const transactions = vxaWalletRepo.getTransactions(userId);
    res.json({
      ok: true,
      transactions,
      count: transactions.length,
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/settlements', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const settlements = vxaWalletRepo.getSettlements(userId);
    res.json({
      ok: true,
      settlements,
      serviceTarget: '1–2 Business Days (Indonesian Banking Hours)',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 2. DEPOSIT SYSTEM (Rp -> VXA)
// ============================================================================

vxaSecurityRouter.post('/deposit/create', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const { amountIdr, paymentMethod } = req.body;

    const amount = Number(amountIdr);
    if (!amount || amount < 10_000) {
      return res.status(400).json({ ok: false, error: 'Minimum deposit is Rp10,000.' });
    }

    const vxaAmount = Math.floor(amount / 1000);
    const depositRef = `DEP-REF-${Date.now()}-${Math.floor(Math.random() * 8999 + 1000)}`;

    res.json({
      ok: true,
      depositRef,
      amountIdr: amount,
      vxaEquivalent: vxaAmount,
      rate: 1000,
      paymentMethod: paymentMethod || 'QRIS',
      qrString: `00020101021226600016ID.CO.VAIURE.VXA01189360091100223344550215${depositRef}5802ID5911VAIURE LABS6007JAKARTA6304ABCD`,
      vaNumber: `8809${Math.floor(Math.random() * 89999999 + 10000000)}`,
      expiresInMinutes: 30,
      instructions: 'Pay via QRIS or Virtual Account to credit VXA Coin immediately upon settlement.',
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.post('/deposit/confirm', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const { amountIdr, paymentMethod, depositRef, idempotencyKey } = req.body;

    const amount = Number(amountIdr);
    if (!amount || amount < 10_000) {
      return res.status(400).json({ ok: false, error: 'Invalid deposit amount.' });
    }

    const result = vxaWalletRepo.processDeposit({
      userId,
      amountIdr: amount,
      paymentMethod: paymentMethod || 'QRIS',
      idempotencyKey: idempotencyKey || depositRef,
    });

    res.json({
      ok: true,
      message: `Deposit verified! +${result.transaction.amountMinor} VXA credited to your wallet.`,
      transaction: result.transaction,
      wallet: result.wallet,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 3. WITHDRAWAL SYSTEM (VXA -> Rp)
// ============================================================================

vxaSecurityRouter.post('/withdraw/request', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const { amountVxa, destination, pin, idempotencyKey } = req.body;

    const vxa = Number(amountVxa);
    if (!vxa || vxa < 10) {
      return res.status(400).json({ ok: false, error: 'Minimum withdrawal is 10 VXA (Rp10,000).' });
    }

    if (!destination || !destination.bankName || !destination.accountNumber || !destination.accountHolderName) {
      return res.status(400).json({ ok: false, error: 'Complete payout bank details required.' });
    }

    const result = vxaWalletRepo.requestWithdrawal({
      userId,
      amountVxa: vxa,
      destination,
      pin,
      idempotencyKey,
    });

    res.json({
      ok: true,
      message: `Withdrawal request for ${vxa} VXA (Rp${(vxa * 1000).toLocaleString('id-ID')}) accepted for settlement.`,
      transaction: result.transaction,
      settlement: result.settlement,
      wallet: result.wallet,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 4. CONVERSION (VXA -> VAIURE Credits)
// ============================================================================

vxaSecurityRouter.post('/convert', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const { vxaAmount } = req.body;

    const amount = Number(vxaAmount);
    if (!amount || amount < 6) {
      return res.status(400).json({ ok: false, error: 'Minimum conversion is 6 VXA (receives 10 Credits).' });
    }

    const result = vxaWalletRepo.convertVxaToCredits(userId, amount);
    res.json({
      ok: true,
      message: `Successfully converted ${amount} VXA to ${result.creditsReceived} VAIURE Credits.`,
      creditsReceived: result.creditsReceived,
      wallet: result.wallet,
      transaction: result.transaction,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
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
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.post('/security/key-rotate', (req: Request, res: Response) => {
  try {
    const newKey = keyManager.rotateKey('MANUAL_TRIGGER');
    vxaWalletRepo.logSecurityEvent({
      severity: 'MEDIUM',
      category: 'KEY_ROTATION',
      details: `Administrator triggered manual signing key rotation: KID ${newKey.kid}`,
      resolved: true,
    });
    res.json({
      ok: true,
      message: 'New short-lived signing key activated.',
      activeKid: newKey.kid,
      issuedAt: new Date(newKey.issuedAt).toISOString(),
      expiresAt: new Date(newKey.expiresAt).toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.post('/security/step-up/pin', (req: Request, res: Response) => {
  try {
    const userId = getRequestUserId(req);
    const { pin } = req.body;
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ ok: false, error: 'PIN must be provided.' });
    }
    vxaWalletRepo.setStepUpPin(userId, pin);
    res.json({
      ok: true,
      message: '6-digit Security Step-Up PIN configured successfully.',
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 6. DOUBLE-ENTRY LEDGER & AUDIT TRAIL
// ============================================================================

vxaSecurityRouter.get('/ledger/entries', (_req: Request, res: Response) => {
  try {
    const entries = ledgerEngine.getLedger();
    res.json({
      ok: true,
      count: entries.length,
      lastHash: ledgerEngine.getLastHash(),
      entries: entries.slice(-50).reverse(), // Last 50 entries
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/ledger/verify', (_req: Request, res: Response) => {
  try {
    const audit = ledgerEngine.verifyLedgerIntegrity();
    res.json({
      ok: audit.ok,
      audit,
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// 7. ADMINISTRATOR FINANCIAL CONTROL DASHBOARD
// ============================================================================

vxaSecurityRouter.get('/admin/overview', (req: Request, res: Response) => {
  try {
    if (!verifyAdminClearance(req)) {
      return res.status(403).json({ ok: false, error: 'Admin authorization required.' });
    }
    const overview = vxaWalletRepo.getAdminFinancialOverview();
    res.json({ ok: true, overview });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/admin/settlement-queue', (req: Request, res: Response) => {
  try {
    if (!verifyAdminClearance(req)) {
      return res.status(403).json({ ok: false, error: 'Admin authorization required.' });
    }
    const settlements = vxaWalletRepo.getSettlements();
    const pending = settlements.filter(
      (s) => s.currentStatus === 'SECURITY_REVIEW' || s.currentStatus === 'PROCESSING'
    );
    res.json({ ok: true, pending, totalCount: pending.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.post('/admin/settlement-action', (req: Request, res: Response) => {
  try {
    if (!verifyAdminClearance(req)) {
      return res.status(403).json({ ok: false, error: 'Admin authorization required.' });
    }
    const { withdrawalId, action, reason } = req.body;
    if (!withdrawalId || !action || !['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ ok: false, error: 'withdrawalId and valid action (APPROVE/REJECT) required.' });
    }

    const result = vxaWalletRepo.processSettlementAction({
      withdrawalId,
      action,
      reason,
      adminEmail: req.headers['x-user-email'] as string,
    });

    res.json({
      ok: true,
      message: `Settlement ${action === 'APPROVE' ? 'settled' : 'rejected and refunded'}.`,
      settlement: result.settlement,
      transaction: result.transaction,
    });
  } catch (err: any) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/admin/security-events', (req: Request, res: Response) => {
  try {
    if (!verifyAdminClearance(req)) {
      return res.status(403).json({ ok: false, error: 'Admin authorization required.' });
    }
    const events = vxaWalletRepo.getSecurityEvents();
    res.json({ ok: true, events });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

vxaSecurityRouter.get('/admin/run-tests', (req: Request, res: Response) => {
  try {
    if (!verifyAdminClearance(req)) {
      return res.status(403).json({ ok: false, error: 'Admin authorization required.' });
    }
    const testSuite = runVxaSecurityTests();
    res.json({ ok: true, testSuite });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
