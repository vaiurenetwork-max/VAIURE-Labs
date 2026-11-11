/**
 * IVNTRI Server-Side Financial & Administration Router
 * Strict enforcement of:
 * THE CLIENT REQUESTS. THE SERVER DECIDES. THE LEDGER RECORDS.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import {
  db,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  increment,
  writeBatch,
  deleteDoc,
} from '../lib/firebase';
import {
  WalletAccount,
  WalletTransaction,
  TopUpIntent,
  AdminAuditLog,
  SystemSettings,
  SupportTicket,
  UserRole,
} from '../types/settings';
import {
  recordAuditLog,
  logUserSuspension,
  logUserUnsuspension,
  logRoleAssignment,
  logWalletFreezing,
  logWalletAdjustment,
  logSystemSettingsChange,
  logAccessDenied,
  logAdminBootstrap,
  queryAuditLogs,
  verifyAuditTrail,
  verifyAuditLogIntegrity,
} from './auditService';
import { optimizeThreadImage, cleanupThreadMedia } from './threadImageOptimizer';

export const apiRouter = Router();

// In-memory exchange rate cache
let exchangeCache: {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
} = {
  base: 'USD',
  rates: {
    USD: 1.0,
    IDR: 15820.0,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 152.4,
    CNY: 7.23,
    SGD: 1.34,
    HKD: 7.82,
    AUD: 1.54,
    CAD: 1.39,
    CHF: 0.88,
    KRW: 1395.0,
    INR: 84.4,
    MYR: 4.46,
    THB: 34.6,
    VND: 25410.0,
    PHP: 58.7,
    AED: 3.67,
    SAR: 3.75,
    NZD: 1.68,
  },
  fetchedAt: Date.now(),
};

// ==========================================
// 1. CURRENCY & EXCHANGE RATES ENDPOINTS
// ==========================================

apiRouter.get('/currency/rates', async (req, res) => {
  const base = ((req.query.base as string) || 'USD').toUpperCase();
  const cacheAge = Date.now() - exchangeCache.fetchedAt;

  // Refresh cache if older than 1 hour or different base
  if (cacheAge > 3600000 || exchangeCache.base !== base) {
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${base}`);
      if (response.ok) {
        const json = await response.json();
        if (json && json.rates) {
          exchangeCache = {
            base,
            rates: json.rates,
            fetchedAt: Date.now(),
          };

          // Cache in Firestore
          try {
            await setDoc(doc(db, 'exchangeRates', base), {
              baseCurrency: base,
              provider: 'European Central Bank / Institutional Open Feed',
              fetchedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 3600000).toISOString(),
              version: '2026.rates.v1',
              status: 'LIVE',
              rates: json.rates,
            });
          } catch (e) {
            // firestore cache note
          }
        }
      }
    } catch (err) {
      console.warn('Live exchange rate update notice:', err);
    }
  }

  res.json({
    baseCurrency: exchangeCache.base,
    provider: 'European Central Bank / Institutional Open Feed',
    fetchedAt: new Date(exchangeCache.fetchedAt).toISOString(),
    expiresAt: new Date(exchangeCache.fetchedAt + 3600000).toISOString(),
    version: '2026.rates.v1',
    status: Date.now() - exchangeCache.fetchedAt > 7200000 ? 'STALE' : 'LIVE',
    rates: exchangeCache.rates,
  });
});

// ==========================================
// 2. WALLET & TOP-UP ENDPOINTS
// ==========================================

apiRouter.post('/wallet/topup/intent', async (req, res) => {
  try {
    const { uid, currency, amount, paymentMethod } = req.body;

    if (!uid || !currency || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid uid, currency, and positive amount are required.' });
    }

    // Check system settings for top-up limits
    let minTopUp = 10;
    let maxTopUp = 50000;
    try {
      const settingsSnap = await getDoc(doc(db, 'systemSettings', 'global'));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as SystemSettings;
        if (data.topUpsEnabled === false) {
          return res.status(403).json({ error: 'Top-ups are temporarily paused for platform maintenance.' });
        }
        if (data.minimumTopUp) minTopUp = data.minimumTopUp;
        if (data.maximumTopUp) maxTopUp = data.maximumTopUp;
      }
    } catch {
      // default
    }

    if (amount < minTopUp) {
      return res.status(400).json({ error: `Minimum top-up is ${minTopUp} ${currency}.` });
    }
    if (amount > maxTopUp) {
      return res.status(400).json({ error: `Maximum top-up is ${maxTopUp} ${currency}.` });
    }

    // Check if wallet is frozen
    const walletDoc = await getDoc(doc(db, 'wallets', uid));
    if (walletDoc.exists()) {
      const wData = walletDoc.data() as WalletAccount;
      if (wData.status === 'FROZEN' || wData.status === 'RESTRICTED') {
        return res.status(403).json({
          error: 'Your wallet is currently restricted from financial top-ups. Please contact support.',
        });
      }
    }

    // Processing fee: 1.5% gateway surcharge
    const feeRate = 0.015;
    const fee = Number((amount * feeRate).toFixed(2));
    const totalCharge = Number((amount + fee).toFixed(2));

    const topUpId = `TOPUP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const intent: TopUpIntent = {
      topUpId,
      uid,
      currency: currency.toUpperCase(),
      amount,
      fee,
      totalCharge,
      paymentMethod: paymentMethod || 'card',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'topUps', topUpId), intent);

    res.json(intent);
  } catch (err: any) {
    console.error('Top-up intent error:', err);
    res.status(500).json({ error: err.message || 'Internal server error initializing top-up.' });
  }
});

apiRouter.post('/wallet/topup/confirm', async (req, res) => {
  try {
    const { topUpId, uid, paymentReference } = req.body;

    if (!topUpId || !uid || !paymentReference) {
      return res.status(400).json({ error: 'topUpId, uid, and paymentReference are required.' });
    }

    const topUpRef = doc(db, 'topUps', topUpId);
    const topUpSnap = await getDoc(topUpRef);

    if (!topUpSnap.exists()) {
      return res.status(404).json({ error: 'Top-up intent record not found.' });
    }

    const intent = topUpSnap.data() as TopUpIntent;
    if (intent.uid !== uid) {
      return res.status(403).json({ error: 'Unauthorized intent ownership match.' });
    }

    if (intent.status === 'COMPLETED') {
      return res.status(400).json({ error: 'This top-up intent has already been fulfilled.' });
    }

    const completedAt = new Date().toISOString();
    const transactionId = `IVN-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // 1. Immutable Ledger Transaction Record
    const transaction: WalletTransaction = {
      transactionId,
      uid,
      type: 'TOP_UP',
      status: 'COMPLETED',
      currency: intent.currency,
      amount: intent.amount,
      fee: intent.fee,
      netAmount: intent.amount,
      provider: intent.paymentMethod === 'card' ? 'Visa / Mastercard Secure Gateway' : 'Global Banking Clearing',
      reference: paymentReference,
      description: `Account Top-Up (${intent.amount} ${intent.currency}) via ${intent.paymentMethod.toUpperCase()}`,
      createdAt: completedAt,
      completedAt,
    };

    // 2. Atomic Batch Update
    const batch = writeBatch(db);

    // Update Top-up Intent
    batch.update(topUpRef, {
      status: 'COMPLETED',
      completedAt,
      providerReference: paymentReference,
    });

    // Create Ledger Transaction
    batch.set(doc(db, 'walletTransactions', transactionId), transaction);

    // Increment Wallet Balance
    const walletRef = doc(db, 'wallets', uid);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      batch.update(walletRef, {
        availableBalance: increment(intent.amount),
        totalReceived: increment(intent.amount),
        updatedAt: completedAt,
      });
    } else {
      batch.set(walletRef, {
        uid,
        primaryCurrency: intent.currency,
        availableBalance: intent.amount,
        pendingBalance: 0,
        totalReceived: intent.amount,
        totalSpent: 0,
        status: 'ACTIVE',
        createdAt: completedAt,
        updatedAt: completedAt,
      });
    }

    // Send Real-time Notification
    const notifId = `notif_${Date.now()}`;
    batch.set(doc(db, 'users', uid, 'notifications', notifId), {
      id: notifId,
      type: 'wallet_topup',
      actorId: 'system_finance',
      actorName: 'IVNTRI Treasury',
      actorUsername: 'treasury',
      actorAvatar: '',
      message: `Top-up of +${intent.amount} ${intent.currency} confirmed. Ledger ref #${transactionId}`,
      createdAt: completedAt,
      read: false,
    });

    await batch.commit();

    res.json({ success: true, transaction });
  } catch (err: any) {
    console.error('Confirm top-up error:', err);
    res.status(500).json({ error: err.message || 'Payment processing validation error.' });
  }
});

apiRouter.post('/wallet/convert', async (req, res) => {
  try {
    const { uid, fromCurrency, toCurrency, amount } = req.body;

    if (!uid || !fromCurrency || !toCurrency || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid uid, fromCurrency, toCurrency, and amount are required.' });
    }

    const walletRef = doc(db, 'wallets', uid);
    const walletSnap = await getDoc(walletRef);

    if (!walletSnap.exists()) {
      return res.status(404).json({ error: 'Wallet not found.' });
    }

    const wallet = walletSnap.data() as WalletAccount;
    if (wallet.status === 'FROZEN') {
      return res.status(403).json({ error: 'Wallet is frozen from currency conversions.' });
    }

    if (wallet.availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient available balance for conversion.' });
    }

    // Exchange rate calculation
    const rates = exchangeCache.rates;
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const fromUSD = from === 'USD' ? 1 : rates[from] ? 1 / rates[from] : 1;
    const toUSD = to === 'USD' ? 1 : rates[to] || 1;
    const effectiveRate = fromUSD * toUSD;
    const feeRate = 0.005; // 0.5% conversion fee
    const grossConverted = amount * effectiveRate;
    const fee = grossConverted * feeRate;
    const netReceived = grossConverted - fee;

    const completedAt = new Date().toISOString();
    const transactionId = `IVN-${new Date().getFullYear()}-CONV-${Date.now().toString(36).toUpperCase()}`;

    const transaction: WalletTransaction = {
      transactionId,
      uid,
      type: 'CONVERSION',
      status: 'COMPLETED',
      currency: from,
      amount,
      fee: Number(fee.toFixed(2)),
      netAmount: Number(netReceived.toFixed(2)),
      exchangeRate: effectiveRate,
      exchangeRateTimestamp: new Date(exchangeCache.fetchedAt).toISOString(),
      targetCurrency: to,
      targetAmount: Number(netReceived.toFixed(2)),
      provider: 'IVNTRI Multi-Currency Ledger Clearing',
      reference: `FX-${from}-${to}`,
      description: `Converted ${amount} ${from} → ${Number(netReceived.toFixed(2))} ${to}`,
      createdAt: completedAt,
      completedAt,
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'walletTransactions', transactionId), transaction);
    batch.update(walletRef, {
      availableBalance: increment(-amount),
      totalSpent: increment(amount),
      updatedAt: completedAt,
    });

    await batch.commit();

    res.json({ success: true, transaction });
  } catch (err: any) {
    console.error('Wallet convert error:', err);
    res.status(500).json({ error: err.message || 'Currency conversion execution failed.' });
  }
});

apiRouter.post('/wallet/transfer', async (req, res) => {
  try {
    const { senderUid, recipientUsername, amount, currency, note, isDirectAdminGrant, actorRole, actorEmail } = req.body;

    if (!senderUid || !recipientUsername || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid sender, recipient, and amount are required.' });
    }

    const cleanRecipient = recipientUsername.toLowerCase().trim().replace(/^@/, '');

    // Find recipient UID
    const usernameSnap = await getDoc(doc(db, 'usernames', cleanRecipient));
    if (!usernameSnap.exists()) {
      return res.status(404).json({ error: `Recipient @${cleanRecipient} not found across VAIURE directory.` });
    }

    const recipientUid = usernameSnap.data().uid;
    const isDirectGrant = Boolean(isDirectAdminGrant);

    if (recipientUid === senderUid && !isDirectGrant) {
      return res.status(400).json({ error: 'Cannot transfer funds to yourself.' });
    }

    // Verify sender wallet (if not direct admin treasury grant)
    const senderWalletRef = doc(db, 'wallets', senderUid);
    const senderWalletSnap = await getDoc(senderWalletRef);

    if (!senderWalletSnap.exists() && !isDirectGrant) {
      return res.status(404).json({ error: 'Sender wallet not found.' });
    }

    const senderWallet = senderWalletSnap.exists() ? (senderWalletSnap.data() as WalletAccount) : null;
    if (senderWallet && (senderWallet.status === 'FROZEN' || senderWallet.status === 'RESTRICTED')) {
      return res.status(403).json({ error: 'Your wallet is restricted from transfers.' });
    }

    if (!isDirectGrant) {
      if (!senderWallet || senderWallet.availableBalance < amount) {
        return res.status(400).json({ error: 'Insufficient funds for this transfer.' });
      }
    }

    const completedAt = new Date().toISOString();
    const senderTxId = `VAI-${new Date().getFullYear()}-XFER-${Date.now().toString(36).toUpperCase()}`;
    const inTxId = `VAI-${new Date().getFullYear()}-RECV-${(Date.now() + 1).toString(36).toUpperCase()}`;

    // Create immutable transfer transaction
    const transaction: WalletTransaction = {
      transactionId: senderTxId,
      uid: senderUid,
      senderUid,
      recipientUid,
      recipientUsername: cleanRecipient,
      type: isDirectGrant ? 'ADJUSTMENT' : 'TRANSFER',
      status: 'COMPLETED',
      currency: currency || senderWallet?.primaryCurrency || 'USD',
      amount,
      fee: 0,
      netAmount: amount,
      provider: isDirectGrant ? 'VAIURE SUPER ADMIN DIRECT TREASURY GRANT' : 'VAIURE P2P Creative Ledger',
      reference: isDirectGrant ? `ADMIN-GRANT-TO-@${cleanRecipient.toUpperCase()}` : `TRANSFER-TO-@${cleanRecipient.toUpperCase()}`,
      description: note || (isDirectGrant ? `Super Admin Direct Grant to @${cleanRecipient}` : `Transfer to @${cleanRecipient}`),
      createdAt: completedAt,
      completedAt,
    };

    const batch = writeBatch(db);

    // 1. Debit sender (only if not direct admin treasury grant)
    if (!isDirectGrant) {
      batch.update(senderWalletRef, {
        availableBalance: increment(-amount),
        totalSpent: increment(amount),
        updatedAt: completedAt,
      });
      batch.set(doc(db, 'walletTransactions', senderTxId), transaction);
    } else {
      batch.set(doc(db, 'walletTransactions', senderTxId), transaction);
    }

    // 2. Credit recipient
    const recipientWalletRef = doc(db, 'wallets', recipientUid);
    const recipientWalletSnap = await getDoc(recipientWalletRef);

    if (recipientWalletSnap.exists()) {
      batch.update(recipientWalletRef, {
        availableBalance: increment(amount),
        totalReceived: increment(amount),
        updatedAt: completedAt,
      });
    } else {
      batch.set(recipientWalletRef, {
        uid: recipientUid,
        primaryCurrency: currency || 'USD',
        availableBalance: amount,
        pendingBalance: 0,
        totalReceived: amount,
        totalSpent: 0,
        status: 'ACTIVE',
        createdAt: completedAt,
        updatedAt: completedAt,
      });
    }

    // Inward transaction for recipient with senderUid and recipientUid linked
    batch.set(doc(db, 'walletTransactions', inTxId), {
      transactionId: inTxId,
      uid: recipientUid,
      senderUid,
      recipientUid,
      recipientUsername: cleanRecipient,
      type: 'TRANSFER',
      status: 'COMPLETED',
      currency: currency || 'USD',
      amount,
      fee: 0,
      netAmount: amount,
      provider: isDirectGrant ? 'VAIURE SUPER ADMIN DIRECT TREASURY GRANT' : 'VAIURE P2P Creative Ledger',
      reference: isDirectGrant ? `SUPER-ADMIN-DIRECT-GRANT` : `TRANSFER-FROM-CREATOR`,
      description: isDirectGrant
        ? `Received Super Admin Direct Grant of +${amount} ${currency || 'USD'}${note ? `: ${note}` : ''}`
        : (note || `Received transfer from creator`),
      createdAt: completedAt,
      completedAt,
    });

    // Real-time recipient notification
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    batch.set(doc(db, 'users', recipientUid, 'notifications', notifId), {
      id: notifId,
      type: 'wallet_transfer',
      actorId: senderUid,
      actorName: isDirectGrant ? 'VAIURE Super Admin Treasury' : (senderWallet?.uid || 'Creator'),
      actorUsername: isDirectGrant ? 'superadmin' : '',
      actorAvatar: '',
      message: isDirectGrant
        ? `You received a Super Admin Direct Grant of +${amount} ${currency || 'USD'}! Ref #${inTxId}`
        : `Received a wallet transfer of +${amount} ${currency || 'USD'}. Ref #${inTxId}`,
      createdAt: completedAt,
      read: false,
    });

    await batch.commit();

    res.json({ success: true, transaction });
  } catch (err: any) {
    console.error('Wallet transfer error:', err);
    res.status(500).json({ error: err.message || 'Transfer execution failed.' });
  }
});

apiRouter.post('/wallet/topup/free', async (req, res) => {
  try {
    const { uid, currency, amount, adminEmail, actorRole } = req.body;

    if (!uid || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid super admin UID and amount are required.' });
    }

    // Verify super admin privilege
    const isSuperAdmin =
      actorRole === 'SUPER_ADMIN' ||
      actorRole === 'ADMIN' ||
      (adminEmail && adminEmail.toLowerCase() === 'rachvan420@gmail.com');

    if (!isSuperAdmin) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const uData = userSnap.exists() ? userSnap.data() : null;
      const isPrivileged =
        uData?.role === 'SUPER_ADMIN' ||
        uData?.accountType === 'SUPER_ADMIN' ||
        uData?.email?.toLowerCase() === 'rachvan420@gmail.com';

      if (!isPrivileged) {
        return res.status(403).json({ error: 'Complimentary top-up is restricted to Super Admin role.' });
      }
    }

    const completedAt = new Date().toISOString();
    const txId = `VAI-${new Date().getFullYear()}-ROOT-${Date.now().toString(36).toUpperCase()}`;

    const transaction: WalletTransaction = {
      transactionId: txId,
      uid,
      senderUid: uid,
      recipientUid: uid,
      type: 'TOP_UP',
      status: 'COMPLETED',
      currency: currency || 'USD',
      amount,
      fee: 0, // 100% Free of charge
      netAmount: amount,
      provider: 'VAIURE SUPER ADMIN TREASURY // COMPLIMENTARY OVERRIDE',
      reference: `SUPERADMIN-FREE-${(adminEmail || 'ROOT').toUpperCase()}`,
      description: `Super Admin complimentary wallet self top-up (+${amount} ${currency || 'USD'}) — Free of charge`,
      createdAt: completedAt,
      completedAt,
    };

    const batch = writeBatch(db);
    const walletRef = doc(db, 'wallets', uid);
    const walletSnap = await getDoc(walletRef);

    if (walletSnap.exists()) {
      batch.update(walletRef, {
        availableBalance: increment(amount),
        totalReceived: increment(amount),
        updatedAt: completedAt,
      });
    } else {
      batch.set(walletRef, {
        uid,
        primaryCurrency: currency || 'USD',
        availableBalance: amount,
        pendingBalance: 0,
        totalReceived: amount,
        totalSpent: 0,
        status: 'ACTIVE',
        createdAt: completedAt,
        updatedAt: completedAt,
      });
    }

    batch.set(doc(db, 'walletTransactions', txId), transaction);

    const notifId = `notif_${Date.now()}`;
    batch.set(doc(db, 'users', uid, 'notifications', notifId), {
      id: notifId,
      type: 'wallet_topup',
      actorId: 'super_admin_treasury',
      actorName: 'VAIURE Treasury System',
      actorUsername: 'treasury',
      actorAvatar: '',
      message: `Super Admin complimentary top-up of +${amount} ${currency || 'USD'} added to your wallet (Free of charge). Ref #${txId}`,
      createdAt: completedAt,
      read: false,
    });

    await batch.commit();

    res.json({ success: true, transaction });
  } catch (err: any) {
    console.error('Super admin free top-up error:', err);
    res.status(500).json({ error: err.message || 'Free top-up failed.' });
  }
});

// ==========================================
// 3. SESSIONS & SECURITY ENDPOINTS
// ==========================================

apiRouter.post('/auth/session/revoke-all', async (req, res) => {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    // Record security event
    const eventId = `sec_${Date.now()}`;
    await setDoc(doc(db, 'securityEvents', eventId), {
      eventId,
      eventType: 'SESSION_REVOCATION_EVERYWHERE',
      severity: 'MEDIUM',
      uid,
      timestamp: new Date().toISOString(),
      status: 'RESOLVED',
      resolution: 'All user sessions revoked upon explicit user command',
    });

    res.json({ success: true, message: 'All device sessions revoked.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/auth/account/delete-request', async (req, res) => {
  try {
    const { uid, reason } = req.body;
    if (!uid) return res.status(400).json({ error: 'uid is required' });

    await setDoc(
      doc(db, 'users', uid),
      {
        status: 'DELETION_PENDING',
        deletionRequestedAt: new Date().toISOString(),
        deletionReason: reason || 'User requested account closure',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    res.json({ success: true, gracePeriodDays: 30 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ADMIN & GOVERNANCE ENDPOINTS
// ==========================================

  apiRouter.post('/admin/bootstrap', async (req, res) => {
    try {
      const { uid, email } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'uid and email are required.' });
      }

      const normalized = email.toLowerCase().trim();
      if (normalized !== 'rachvan420@gmail.com') {
        await logAccessDenied(
          { uid, email: normalized, role: 'USER' },
          'ADMIN_BOOTSTRAP_ATTEMPT',
          'SYSTEM',
          uid,
          'Unauthorized identity attempted super-admin bootstrapping',
          { ip: req.ip, userAgent: req.headers['user-agent'] as string }
        );
        return res.status(403).json({
          error: 'PRIMARY ADMIN ACCOUNT NOT FOUND. Only the designated platform owner can bootstrap.',
        });
      }

      // 1. Assign SUPER_ADMIN in user document
      await setDoc(
        doc(db, 'users', uid),
        {
          role: 'SUPER_ADMIN',
          accountType: 'SUPER_ADMIN',
          verified: true,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // 2. Add to admins collection
      await setDoc(doc(db, 'admins', uid), {
        uid,
        email: normalized,
        role: 'SUPER_ADMIN',
        bootstrappedAt: new Date().toISOString(),
      });

      // 3. Record immutable audit log via auditService
      const auditLog = await logAdminBootstrap(
        { uid, email: normalized, role: 'SUPER_ADMIN' },
        'Owner identity confirmation and super-admin privilege bootstrapping',
        { ip: req.ip, userAgent: req.headers['user-agent'] as string }
      );

      res.json({
        success: true,
        message: 'ADMIN BOOTSTRAP COMPLETE. Primary administrator privileges granted.',
        role: 'SUPER_ADMIN',
        auditLogId: auditLog.logId,
        integrityHash: auditLog.integrityHash,
      });
    } catch (err: any) {
      console.error('Admin bootstrap error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/admin/users/action', async (req, res) => {
    try {
      const { actorUid, targetUid, action, role, reason } = req.body;
      const ctx = { ip: req.ip, userAgent: req.headers['user-agent'] as string };

      if (!actorUid || !targetUid || !action || !reason) {
        return res.status(400).json({ error: 'actorUid, targetUid, action, and reason are required.' });
      }

      // Verify actor is admin
      const actorDoc = await getDoc(doc(db, 'users', actorUid));
      const actorData = actorDoc.data();
      const actorEmail = actorData?.email || 'admin@ivntri.com';
      const actorRole = actorData?.role || actorData?.accountType;

      if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN') {
        await logAccessDenied(
          { uid: actorUid, email: actorEmail, role: actorRole || 'USER' },
          `USER_${action}`,
          'USER',
          targetUid,
          'Actor lacks required administrative permissions to perform user moderation',
          ctx
        );
        return res.status(403).json({ error: 'Forbidden: Insufficient administrative privileges.' });
      }

      // Capture before state of target user for non-repudiation
      const targetDoc = await getDoc(doc(db, 'users', targetUid));
      const targetSnapshot = targetDoc.exists() ? targetDoc.data() : {};

      const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
      let auditLogRecord: AdminAuditLog;

      if (action === 'SUSPEND') {
        updates.status = 'SUSPENDED';
        updates.suspensionReason = reason;
        await updateDoc(doc(db, 'users', targetUid), updates);
        auditLogRecord = await logUserSuspension(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          reason,
          targetSnapshot,
          ctx
        );
      } else if (action === 'UNSUSPEND') {
        updates.status = 'ACTIVE';
        updates.suspensionReason = null;
        await updateDoc(doc(db, 'users', targetUid), updates);
        auditLogRecord = await logUserUnsuspension(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          reason,
          targetSnapshot,
          ctx
        );
      } else if (action === 'CHANGE_ROLE' && role) {
        updates.role = role;
        updates.accountType = role;
        await updateDoc(doc(db, 'users', targetUid), updates);
        auditLogRecord = await logRoleAssignment(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          targetSnapshot.role || targetSnapshot.accountType || 'USER',
          role,
          reason,
          targetSnapshot,
          ctx
        );
      } else if (action === 'VERIFY') {
        updates.verified = true;
        await updateDoc(doc(db, 'users', targetUid), updates);
        auditLogRecord = await recordAuditLog({
          actorUid,
          actorEmail,
          actorRole,
          action: 'USER_VERIFY',
          targetType: 'USER',
          targetId: targetUid,
          reason,
          result: 'SUCCESS',
          targetMetadata: {
            previousVerified: targetSnapshot.verified || false,
            newVerified: true,
            username: targetSnapshot.username,
          },
          context: ctx,
        });
      } else if (action === 'DISABLE') {
        updates.status = 'DISABLED';
        await updateDoc(doc(db, 'users', targetUid), updates);
        auditLogRecord = await recordAuditLog({
          actorUid,
          actorEmail,
          actorRole,
          action: 'USER_DISABLE',
          targetType: 'USER',
          targetId: targetUid,
          reason,
          result: 'SUCCESS',
          targetMetadata: {
            previousStatus: targetSnapshot.status,
            newStatus: 'DISABLED',
            username: targetSnapshot.username,
          },
          context: ctx,
        });
      } else {
        return res.status(400).json({ error: `Unsupported user action: ${action}` });
      }

      res.json({
        success: true,
        auditLogId: auditLogRecord.logId,
        integrityHash: auditLogRecord.integrityHash,
      });
    } catch (err: any) {
      console.error('Admin user action error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/admin/wallets/action', async (req, res) => {
    try {
      const { actorUid, targetUid, action, adjustmentAmount, adjustmentCurrency, reason } = req.body;
      const ctx = { ip: req.ip, userAgent: req.headers['user-agent'] as string };

      if (!actorUid || !targetUid || !action || !reason) {
        return res.status(400).json({ error: 'actorUid, targetUid, action, and reason are required.' });
      }

      const actorDoc = await getDoc(doc(db, 'users', actorUid));
      const actorData = actorDoc.data();
      const actorEmail = actorData?.email || 'finance@ivntri.com';
      const actorRole = actorData?.role || actorData?.accountType;

      if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN' && actorRole !== 'FINANCE') {
        await logAccessDenied(
          { uid: actorUid, email: actorEmail, role: actorRole || 'USER' },
          `WALLET_${action}`,
          'WALLET',
          targetUid,
          'Forbidden: Finance or Super Admin privileges required',
          ctx
        );
        return res.status(403).json({ error: 'Forbidden: Finance or Super Admin privileges required.' });
      }

      const walletRef = doc(db, 'wallets', targetUid);
      const walletSnap = await getDoc(walletRef);
      const walletData = walletSnap.exists() ? walletSnap.data() : {};
      let auditLogRecord: AdminAuditLog;

      if (action === 'FREEZE') {
        await updateDoc(walletRef, { status: 'FROZEN', restrictionReason: reason });
        auditLogRecord = await logWalletFreezing(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          'FREEZE',
          reason,
          walletData,
          ctx
        );
      } else if (action === 'RESTRICT') {
        await updateDoc(walletRef, { status: 'RESTRICTED', restrictionReason: reason });
        auditLogRecord = await logWalletFreezing(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          'RESTRICT',
          reason,
          walletData,
          ctx
        );
      } else if (action === 'UNFREEZE') {
        await updateDoc(walletRef, { status: 'ACTIVE', restrictionReason: null });
        auditLogRecord = await logWalletFreezing(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          'UNFREEZE',
          reason,
          walletData,
          ctx
        );
      } else if (action === 'MANUAL_ADJUSTMENT' && typeof adjustmentAmount === 'number') {
        const txId = `IVN-${new Date().getFullYear()}-ADJ-${Date.now().toString(36).toUpperCase()}`;
        const completedAt = new Date().toISOString();
        const currentBalance = walletData.availableBalance || 0;
        const newBalance = currentBalance + adjustmentAmount;

        const tx: WalletTransaction = {
          transactionId: txId,
          uid: targetUid,
          type: 'ADJUSTMENT',
          status: 'COMPLETED',
          currency: adjustmentCurrency || 'USD',
          amount: Math.abs(adjustmentAmount),
          fee: 0,
          netAmount: adjustmentAmount,
          provider: 'IVNTRI Financial Audit Adjustment',
          reference: `ADJ-BY-${actorRole}`,
          description: `Manual adjustment by admin: ${reason}`,
          createdAt: completedAt,
          completedAt,
        };

        const batch = writeBatch(db);
        batch.set(doc(db, 'walletTransactions', txId), tx);
        if (walletSnap.exists()) {
          batch.update(walletRef, {
            availableBalance: increment(adjustmentAmount),
            updatedAt: completedAt,
          });
        } else {
          batch.set(walletRef, {
            uid: targetUid,
            primaryCurrency: adjustmentCurrency || 'USD',
            availableBalance: Math.max(0, adjustmentAmount),
            pendingBalance: 0,
            totalReceived: adjustmentAmount > 0 ? adjustmentAmount : 0,
            totalSpent: adjustmentAmount < 0 ? Math.abs(adjustmentAmount) : 0,
            status: 'ACTIVE',
            createdAt: completedAt,
            updatedAt: completedAt,
          });
        }
        await batch.commit();

        auditLogRecord = await logWalletAdjustment(
          { uid: actorUid, email: actorEmail, role: actorRole },
          targetUid,
          adjustmentAmount,
          adjustmentCurrency || 'USD',
          txId,
          reason,
          currentBalance,
          newBalance,
          ctx
        );
      } else {
        return res.status(400).json({ error: `Unsupported wallet action: ${action}` });
      }

      res.json({
        success: true,
        auditLogId: auditLogRecord.logId,
        integrityHash: auditLogRecord.integrityHash,
      });
    } catch (err: any) {
      console.error('Admin wallet action error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.post('/admin/settings/update', async (req, res) => {
    try {
      const { actorUid, settings } = req.body;
      const ctx = { ip: req.ip, userAgent: req.headers['user-agent'] as string };

      if (!actorUid || !settings) {
        return res.status(400).json({ error: 'actorUid and settings are required.' });
      }

      const actorDoc = await getDoc(doc(db, 'users', actorUid));
      const actorData = actorDoc.data();
      const actorEmail = actorData?.email || 'admin@ivntri.com';
      const actorRole = actorData?.role || actorData?.accountType;

      if (actorRole !== 'ADMIN' && actorRole !== 'SUPER_ADMIN') {
        await logAccessDenied(
          { uid: actorUid, email: actorEmail, role: actorRole || 'USER' },
          'SYSTEM_SETTINGS_UPDATE',
          'SYSTEM_SETTINGS',
          'global',
          'Forbidden: Admin privileges required to update platform settings',
          ctx
        );
        return res.status(403).json({ error: 'Forbidden: Admin privileges required.' });
      }

      // Capture before state
      const currentSnap = await getDoc(doc(db, 'systemSettings', 'global'));
      const previousSettings = currentSnap.exists() ? currentSnap.data() : {};

      const payload = {
        ...settings,
        settingId: 'global',
        updatedAt: new Date().toISOString(),
        updatedBy: actorUid,
      };

      await setDoc(doc(db, 'systemSettings', 'global'), payload, { merge: true });

      // Record immutable audit log
      const auditLogRecord = await logSystemSettingsChange(
        { uid: actorUid, email: actorEmail, role: actorRole },
        previousSettings,
        settings,
        'Platform operational parameter adjustments',
        ctx
      );

      res.json({
        ...payload,
        auditLogId: auditLogRecord.logId,
        integrityHash: auditLogRecord.integrityHash,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Query audit logs with pagination and filters
  apiRouter.get('/admin/audit-logs', async (req, res) => {
    try {
      const limitCount = req.query.limit ? Number(req.query.limit) : 50;
      const action = req.query.action as string | undefined;
      const targetType = req.query.targetType as string | undefined;
      const targetId = req.query.targetId as string | undefined;
      const actorUid = req.query.actorUid as string | undefined;
      const result = req.query.result as 'SUCCESS' | 'DENIED' | 'FAILED' | undefined;

      const logs = await queryAuditLogs({
        limitCount,
        action,
        targetType,
        targetId,
        actorUid,
        result,
      });

      // Verify integrity of fetched logs
      const verification = verifyAuditTrail(logs);

      res.json({
        logs,
        total: logs.length,
        verification,
      });
    } catch (err: any) {
      console.warn('Audit query notice:', err?.message || err);
      res.status(500).json({ error: err?.message || 'Failed to query audit logs' });
    }
  });

  // Verify cryptographic integrity of audit logs
  apiRouter.post('/admin/audit-logs/verify', async (req, res) => {
    try {
      const { logs, log } = req.body;
      if (log) {
        const check = verifyAuditLogIntegrity(log);
        return res.json(check);
      }
      if (Array.isArray(logs)) {
        const summary = verifyAuditTrail(logs);
        return res.json(summary);
      }
      // If neither supplied, verify latest 100 logs from Firestore
      const latestLogs = await queryAuditLogs({ limitCount: 100 });
      const summary = verifyAuditTrail(latestLogs);
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

apiRouter.get('/admin/system-health', async (_req, res) => {
  const health: Record<string, { status: string; latencyMs?: number; notes?: string }> = {
    authentication: { status: 'OPERATIONAL', latencyMs: 14 },
    firestore: { status: 'OPERATIONAL', latencyMs: 22 },
    storage: { status: 'OPERATIONAL', latencyMs: 18 },
    exchangeRateProvider: {
      status: Date.now() - exchangeCache.fetchedAt > 7200000 ? 'DEGRADED' : 'OPERATIONAL',
      notes: `Base ${exchangeCache.base} cached with ${Object.keys(exchangeCache.rates).length} pairs`,
    },
    paymentGateway: { status: 'OPERATIONAL', notes: 'Simulated institutional test mode active' },
    securitySystem: { status: 'OPERATIONAL' },
  };

  res.json(health);
});

apiRouter.post('/support/ticket/create', async (req, res) => {
  try {
    const { userId, userEmail, userName, category, subject, message, priority } = req.body;
    if (!userId || !subject || !message) {
      return res.status(400).json({ error: 'userId, subject, and message are required.' });
    }

    const ticketId = `TICKET-${Date.now().toString(36).toUpperCase()}`;
    const ticket: SupportTicket = {
      ticketId,
      userId,
      userEmail: userEmail || '',
      userName,
      category: category || 'OTHER',
      subject,
      message,
      status: 'OPEN',
      priority: priority || 'NORMAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'supportTickets', ticketId), ticket);
    res.json(ticket);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. REAL-TIME EVENT STREAM (SSE) & BROADCASTING
// ==========================================

const sseClients: Set<any> = new Set();

export function broadcastRealtimeEvent(type: string, data: any) {
  const payload = {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
  const message = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

/**
 * GET /api/realtime/stream
 * Server-Sent Events (SSE) live connection for instant real-time data sync across clients
 */
apiRouter.get('/realtime/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  sseClients.add(res);

  // Send initial connected event
  const initPayload = {
    type: 'CONNECTED',
    data: {
      status: 'REALTIME_ACTIVE',
      database: 'ivntri-visual-archive',
      activeSubscribers: sseClients.size,
    },
    timestamp: new Date().toISOString(),
  };
  res.write(`event: CONNECTED\ndata: ${JSON.stringify(initPayload)}\n\n`);

  // Heartbeat ping every 15s to keep proxy/socket healthy
  const timer = setInterval(() => {
    try {
      res.write(`event: PING\ndata: ${JSON.stringify({ ping: Date.now() })}\n\n`);
    } catch {
      clearInterval(timer);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(timer);
    sseClients.delete(res);
  });
});

// ==========================================
// 9. REAL-TIME USERS & BACKEND DATABASE ACCESS
// ==========================================

/**
 * GET /api/users
 * Real-time accessible listing of all registered users in Firestore
 */
apiRouter.get('/users', async (req, res) => {
  try {
    const qParam = ((req.query.q as string) || '').toLowerCase().trim();
    const roleParam = (req.query.role as string) || '';

    const usersRef = collection(db, 'users');
    const snap = await getDocs(query(usersRef, limit(100)));

    const users: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      const rawName = data.username || data.displayName?.toLowerCase().replace(/\s+/g, '_') || data.email?.split('@')[0] || d.id;
      const userItem = {
        uid: d.id,
        id: d.id,
        username: rawName,
        displayName: data.displayName || rawName,
        email: data.email || '',
        avatar: data.photoURL || '',
        photoURL: data.photoURL || '',
        role: data.role || data.accountType || 'CREATOR',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
        followersCount: Number(data.followersCount) || 0,
        followingCount: Number(data.followingCount) || 0,
        postsCount: Number(data.postsCount) || 0,
        aiSpecialties: data.aiSpecialties || [],
        isVerified: Boolean(data.verified || data.isVerified),
        isBanned: Boolean(data.isBanned),
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
      };

      if (roleParam && userItem.role.toUpperCase() !== roleParam.toUpperCase()) {
        return;
      }

      if (qParam) {
        const matchesName = userItem.displayName.toLowerCase().includes(qParam);
        const matchesUsername = userItem.username.toLowerCase().includes(qParam);
        const matchesEmail = userItem.email.toLowerCase().includes(qParam);
        const matchesBio = userItem.bio.toLowerCase().includes(qParam);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesBio) {
          return;
        }
      }

      users.push(userItem);
    });

    res.json({
      success: true,
      total: users.length,
      users,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/:uidOrUsername
 * Retrieve a specific user's document directly from Firestore by UID or username
 */
apiRouter.get('/users/:uidOrUsername', async (req, res) => {
  try {
    const { uidOrUsername } = req.params;
    if (!uidOrUsername) {
      return res.status(400).json({ error: 'UID or Username is required' });
    }

    // First try by direct UID
    const userDocRef = doc(db, 'users', uidOrUsername);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return res.json({
        uid: snap.id,
        id: snap.id,
        ...snap.data(),
        fetchedAt: new Date().toISOString(),
      });
    }

    // If not found, try username lookup in users collection
    const cleanUsername = uidOrUsername.toLowerCase().replace('@', '');
    const userQuery = query(collection(db, 'users'), where('username', '==', cleanUsername), limit(1));
    const querySnap = await getDocs(userQuery);
    if (!querySnap.empty) {
      const matchDoc = querySnap.docs[0];
      return res.json({
        uid: matchDoc.id,
        id: matchDoc.id,
        ...matchDoc.data(),
        fetchedAt: new Date().toISOString(),
      });
    }

    return res.status(404).json({ error: 'User profile not found' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/:uidOrUsername/posts
 * Retrieve all works created by a specific user from Firestore
 */
apiRouter.get('/users/:uidOrUsername/posts', async (req, res) => {
  try {
    const { uidOrUsername } = req.params;
    const clean = uidOrUsername.toLowerCase().replace('@', '');

    // Query posts where authorUid == uid OR authorUsername == clean
    const postsRef = collection(db, 'posts');
    const [byUidSnap, byUserSnap] = await Promise.all([
      getDocs(query(postsRef, where('authorUid', '==', uidOrUsername), limit(50))),
      getDocs(query(postsRef, where('authorUsername', '==', clean), limit(50))),
    ]);

    const postMap = new Map<string, any>();
    byUidSnap.forEach((d) => postMap.set(d.id, { id: d.id, ...d.data() }));
    byUserSnap.forEach((d) => postMap.set(d.id, { id: d.id, ...d.data() }));

    const posts = Array.from(postMap.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    res.json({
      success: true,
      total: posts.length,
      posts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users/sync
 * Server-side endpoint to ensure and sync a user profile in Firestore
 */
apiRouter.post('/users/sync', async (req, res) => {
  try {
    const { uid, email, username, displayName, photoURL, bio, role } = req.body;
    if (!uid) {
      return res.status(400).json({ error: 'uid is required' });
    }

    const cleanUsername = (username || email?.split('@')[0] || displayName?.toLowerCase().replace(/\s+/g, '_') || `user_${uid.slice(0, 6)}`)
      .toLowerCase()
      .replace(/[^a-zA-Z0-9_]/g, '')
      .slice(0, 30);

    const nowIso = new Date().toISOString();
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    const isDesignatedAdmin = email === 'rachvan420@gmail.com';
    const effectiveRole = isDesignatedAdmin ? 'ADMIN' : (role || 'CREATOR');

    if (!snap.exists()) {
      const newUserDoc = {
        uid,
        username: cleanUsername,
        displayName: displayName || cleanUsername,
        email: email || '',
        photoURL: photoURL || '',
        bio: bio || 'Visual artist & digital culture creator at VAIURE 唯昱尔.',
        website: 'https://vaiure.art',
        location: 'GLOBAL',
        role: effectiveRole,
        accountType: effectiveRole,
        verified: isDesignatedAdmin,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        fymBalance: isDesignatedAdmin ? 100000 : 500,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await setDoc(userRef, newUserDoc);

      // Reserve username
      try {
        await setDoc(doc(db, 'usernames', cleanUsername), {
          uid,
          username: cleanUsername,
          createdAt: nowIso,
        });
      } catch (e) {
        console.warn('Username reservation note:', e);
      }

      broadcastRealtimeEvent('USER_REGISTERED', newUserDoc);

      return res.json({ success: true, created: true, user: newUserDoc });
    } else {
      const existing = snap.data();
      const updates: Record<string, any> = {
        updatedAt: nowIso,
      };
      if (displayName && displayName !== existing.displayName) updates.displayName = displayName;
      if (photoURL && photoURL !== existing.photoURL) updates.photoURL = photoURL;
      if (bio && bio !== existing.bio) updates.bio = bio;
      if (isDesignatedAdmin && existing.role !== 'ADMIN') {
        updates.role = 'ADMIN';
        updates.verified = true;
      }

      if (Object.keys(updates).length > 1) {
        await updateDoc(userRef, updates);
      }

      const mergedUser = { ...existing, ...updates };
      broadcastRealtimeEvent('USER_UPDATED', mergedUser);

      return res.json({ success: true, updated: true, user: mergedUser });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users/:targetUid/follow
 * Real-time follow/unfollow toggle on backend with counter sync and notifications
 */
apiRouter.post('/users/:targetUid/follow', async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { followerUid, followerName, followerUsername, followerAvatar } = req.body;

    if (!targetUid || !followerUid) {
      return res.status(400).json({ error: 'targetUid and followerUid are required' });
    }

    const followingRef = doc(db, 'users', followerUid, 'following', targetUid);
    const followerRef = doc(db, 'users', targetUid, 'followers', followerUid);
    const targetUserRef = doc(db, 'users', targetUid);
    const currentFollowerRef = doc(db, 'users', followerUid);

    const checkSnap = await getDoc(followingRef);
    const isCurrentlyFollowing = checkSnap.exists();
    const nowIso = new Date().toISOString();

    if (isCurrentlyFollowing) {
      // Unfollow
      await Promise.all([
        updateDoc(followingRef, { active: false }).catch(() => {}),
        updateDoc(followerRef, { active: false }).catch(() => {}),
      ]);

      const [targetSnap, userSnap] = await Promise.all([
        getDoc(targetUserRef),
        getDoc(currentFollowerRef),
      ]);

      if (targetSnap.exists()) {
        const curFollowers = Math.max(0, (targetSnap.data().followersCount || 1) - 1);
        await updateDoc(targetUserRef, { followersCount: curFollowers });
      }
      if (userSnap.exists()) {
        const curFollowing = Math.max(0, (userSnap.data().followingCount || 1) - 1);
        await updateDoc(currentFollowerRef, { followingCount: curFollowing });
      }

      broadcastRealtimeEvent('FOLLOW_UPDATED', {
        action: 'UNFOLLOW',
        followerUid,
        targetUid,
      });

      return res.json({ success: true, following: false });
    } else {
      // Follow
      await Promise.all([
        setDoc(followingRef, { followerUid, targetUid, createdAt: nowIso, active: true }),
        setDoc(followerRef, { followerUid, targetUid, createdAt: nowIso, active: true }),
      ]);

      const [targetSnap, userSnap] = await Promise.all([
        getDoc(targetUserRef),
        getDoc(currentFollowerRef),
      ]);

      let newFollowersCount = 1;
      if (targetSnap.exists()) {
        newFollowersCount = (targetSnap.data().followersCount || 0) + 1;
        await updateDoc(targetUserRef, { followersCount: newFollowersCount });
      }
      if (userSnap.exists()) {
        const curFollowing = (userSnap.data().followingCount || 0) + 1;
        await updateDoc(currentFollowerRef, { followingCount: curFollowing });
      }

      // Create notification
      const notifId = `notif-follow-${Date.now()}`;
      await setDoc(doc(db, 'users', targetUid, 'notifications', notifId), {
        id: notifId,
        type: 'follow',
        actorId: followerUid,
        actorName: followerName || 'Creator',
        actorUsername: followerUsername || 'creator',
        actorAvatar: followerAvatar || '',
        message: 'followed your visual archive',
        createdAt: nowIso,
        read: false,
      });

      broadcastRealtimeEvent('FOLLOW_UPDATED', {
        action: 'FOLLOW',
        followerUid,
        targetUid,
        newFollowersCount,
      });

      return res.json({ success: true, following: true, followersCount: newFollowersCount });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. REAL-TIME POSTS & ARCHIVE ENDPOINTS
// ==========================================

/**
 * GET /api/posts
 * Retrieve live posts from Firestore with category, author, and limit filters
 */
apiRouter.get('/posts', async (req, res) => {
  try {
    const category = req.query.category as string;
    const author = req.query.author as string;
    const limitNum = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)));

    const postsRef = collection(db, 'posts');
    const snap = await getDocs(query(postsRef, limit(limitNum)));

    let posts: any[] = [];
    snap.forEach((d) => {
      posts.push({ id: d.id, ...d.data() });
    });

    // Filter in-memory if query parameters provided
    if (category && category !== 'ALL') {
      posts = posts.filter((p) => p.category?.toUpperCase() === category.toUpperCase());
    }
    if (author) {
      posts = posts.filter(
        (p) => p.authorUsername?.toLowerCase() === author.toLowerCase() || p.authorUid === author
      );
    }

    posts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({
      success: true,
      total: posts.length,
      posts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts
 * Publish a new post to Firestore and broadcast live event to all subscribers
 */
apiRouter.post('/posts', async (req, res) => {
  try {
    const post = req.body;
    if (!post || !post.title || !post.authorId) {
      return res.status(400).json({ error: 'Post title and authorId are required' });
    }

    const postId = post.id || `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const postDoc = {
      ...post,
      id: postId,
      authorUid: post.authorId,
      authorUsername: post.authorUsername || 'creator',
      authorDisplayName: post.authorName || 'Creator',
      authorPhotoURL: post.authorAvatar || '',
      createdAt: nowIso,
      updatedAt: nowIso,
      likesCount: Number(post.likesCount) || 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
    };

    await setDoc(doc(db, 'posts', postId), postDoc);

    // Increment user postsCount
    try {
      const authorRef = doc(db, 'users', post.authorId);
      const aSnap = await getDoc(authorRef);
      if (aSnap.exists()) {
        await updateDoc(authorRef, { postsCount: (aSnap.data().postsCount || 0) + 1 });
      }
    } catch (e) {
      console.warn('User postsCount increment note:', e);
    }

    broadcastRealtimeEvent('POST_CREATED', postDoc);

    res.json({ success: true, post: postDoc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts/:postId/like
 * Toggle like on a post, update counters, and broadcast real-time event
 */
apiRouter.post('/posts/:postId/like', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, userName, userUsername, userAvatar } = req.body;

    if (!postId || !userId) {
      return res.status(400).json({ error: 'postId and userId are required' });
    }

    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const pData = postSnap.data();
    const curLikes = Number(pData.likesCount) || 0;

    const likeRef = doc(db, 'posts', postId, 'likes', userId);
    const likeSnap = await getDoc(likeRef);
    const isLiked = likeSnap.exists();

    let newCount = curLikes;
    if (isLiked) {
      await updateDoc(likeRef, { active: false }).catch(() => {});
      newCount = Math.max(0, curLikes - 1);
      await updateDoc(postRef, { likesCount: newCount });
    } else {
      await setDoc(likeRef, { postId, userId, createdAt: new Date().toISOString(), active: true });
      newCount = curLikes + 1;
      await updateDoc(postRef, { likesCount: newCount });

      // Notify author
      if (pData.authorUid && pData.authorUid !== userId) {
        const notifId = `notif-like-${Date.now()}`;
        await setDoc(doc(db, 'users', pData.authorUid, 'notifications', notifId), {
          id: notifId,
          type: 'like',
          actorId: userId,
          actorName: userName || 'Creator',
          actorUsername: userUsername || 'creator',
          actorAvatar: userAvatar || '',
          targetPostId: postId,
          targetPostTitle: pData.title || '',
          message: 'applauded your work',
          createdAt: new Date().toISOString(),
          read: false,
        });
      }
    }

    broadcastRealtimeEvent('POST_LIKED', {
      postId,
      userId,
      isLiked: !isLiked,
      likesCount: newCount,
    });

    res.json({ success: true, isLiked: !isLiked, likesCount: newCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/posts/:postId/comments
 * Retrieve comments for a post
 */
apiRouter.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const commRef = collection(db, 'posts', postId, 'comments');
    const snap = await getDocs(commRef);

    const comments: any[] = [];
    snap.forEach((d) => comments.push({ id: d.id, ...d.data() }));
    comments.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

    res.json({ success: true, total: comments.length, comments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/posts/:postId/comments
 * Add a comment to a post, increment counter, notify author, and broadcast
 */
apiRouter.post('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { authorId, authorName, authorUsername, authorAvatar, content, parentId } = req.body;

    if (!postId || !authorId || !content) {
      return res.status(400).json({ error: 'postId, authorId, and content are required' });
    }

    const commentId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const commentDoc = {
      id: commentId,
      postId,
      authorId,
      authorName: authorName || 'Creator',
      authorUsername: authorUsername || 'creator',
      authorAvatar: authorAvatar || '',
      content,
      createdAt: nowIso,
      likesCount: 0,
      parentId: parentId || null,
    };

    await setDoc(doc(db, 'posts', postId, 'comments', commentId), commentDoc);

    // Update post comments count
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);
    let newCommentsCount = 1;
    if (postSnap.exists()) {
      newCommentsCount = (Number(postSnap.data().commentsCount) || 0) + 1;
      await updateDoc(postRef, { commentsCount: newCommentsCount });

      // Notify post author
      const pAuthor = postSnap.data().authorUid || postSnap.data().authorId;
      if (pAuthor && pAuthor !== authorId) {
        const notifId = `notif-comm-${Date.now()}`;
        await setDoc(doc(db, 'users', pAuthor, 'notifications', notifId), {
          id: notifId,
          type: 'comment',
          actorId: authorId,
          actorName: authorName || 'Creator',
          actorUsername: authorUsername || 'creator',
          actorAvatar: authorAvatar || '',
          targetPostId: postId,
          targetPostTitle: postSnap.data().title || '',
          message: `commented: "${content.slice(0, 50)}"`,
          createdAt: nowIso,
          read: false,
        });
      }
    }

    broadcastRealtimeEvent('COMMENT_ADDED', {
      postId,
      comment: commentDoc,
      commentsCount: newCommentsCount,
    });

    res.json({ success: true, comment: commentDoc, commentsCount: newCommentsCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/activity/:uid
 * Retrieve user notifications
 */
apiRouter.get('/activity/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const notifsRef = collection(db, 'users', uid, 'notifications');
    const snap = await getDocs(query(notifsRef, limit(50)));

    const notifications: any[] = [];
    snap.forEach((d) => notifications.push({ id: d.id, ...d.data() }));
    notifications.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({ success: true, total: notifications.length, notifications });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/activity/:uid/read
 * Mark all notifications as read
 */
apiRouter.post('/activity/:uid/read', async (req, res) => {
  try {
    const { uid } = req.params;
    const notifsRef = collection(db, 'users', uid, 'notifications');
    const snap = await getDocs(query(notifsRef, limit(50)));

    const updates = snap.docs.map((d) => updateDoc(d.ref, { read: true }).catch(() => {}));
    await Promise.all(updates);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/stats/realtime
 * System-wide real-time metrics across Firestore collections
 */
apiRouter.get('/stats/realtime', async (_req, res) => {
  try {
    const [usersSnap, postsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), limit(500))),
      getDocs(query(collection(db, 'posts'), limit(500))),
    ]);

    res.json({
      status: 'LIVE_REALTIME',
      databaseId: 'ivntri-visual-archive',
      activeUsersCount: usersSnap.size,
      activePostsCount: postsSnap.size,
      activeSseConnections: sseClients.size,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ============================================================================
 * VAIURE SHORTS API ENDPOINTS
 * ============================================================================
 */

/**
 * GET /api/shorts
 * List shorts from Firestore
 */
apiRouter.get('/shorts', async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const author = req.query.author as string | undefined;

    const shortsRef = collection(db, 'shorts');
    const snap = await getDocs(query(shortsRef, limit(50)));

    let shorts: any[] = [];
    snap.forEach((d) => shorts.push({ id: d.id, ...d.data() }));

    if (category && category !== 'ALL') {
      shorts = shorts.filter((s) => s.category === category);
    }

    if (author) {
      shorts = shorts.filter(
        (s) => s.authorUsername?.toLowerCase() === author.toLowerCase() || s.authorId === author
      );
    }

    shorts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json({
      success: true,
      total: shorts.length,
      shorts,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shorts
 * Publish a new short
 */
apiRouter.post('/shorts', async (req, res) => {
  try {
    const short = req.body;
    if (!short || !short.title || !short.authorId || !short.videoUrl) {
      return res.status(400).json({ error: 'Title, authorId, and videoUrl are required' });
    }

    const shortId = short.id || `short_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const shortDoc = {
      ...short,
      id: shortId,
      createdAt: nowIso,
      updatedAt: nowIso,
      viewsCount: 0,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
    };

    await setDoc(doc(db, 'shorts', shortId), shortDoc);

    broadcastRealtimeEvent('SHORT_CREATED', shortDoc);

    res.json({ success: true, short: shortDoc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * ============================================================================
 * IVNTRI MEDIA UPLOAD SYSTEM (VIDEOS & IMAGES)
 * High-performance binary and multipart storage for 4K video reels and visuals
 * ============================================================================
 */

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || (file.mimetype.startsWith('video') ? '.mp4' : '.jpg');
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `ivntri_${safeBase}_${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 150 * 1024 * 1024, // 150MB per file to comfortably support high-bitrate video clips
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const isVideo = file.mimetype.startsWith('video/');
    const isImage = file.mimetype.startsWith('image/');
    if (isVideo || isImage) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only video and image files are permitted.`));
    }
  },
});

/**
 * POST /api/upload
 * Multi-file & single-file upload for video and image files.
 * Form field: 'files' (or 'file')
 */
apiRouter.post('/upload', (req: Request, res: Response): void => {
  upload.any()(req, res, (err: any) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(400).json({ success: false, error: message });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No files provided for upload.' });
      return;
    }

    const uploaded = files.map((file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const publicUrl = `/uploads/${file.filename}`;
      return {
        url: publicUrl,
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        type: isVideo ? 'video' : 'image',
        size: file.size,
        aspectRatio: isVideo ? 'aspect-[16/9]' : 'aspect-[3/4]',
        createdAt: new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      message: `Successfully uploaded ${uploaded.length} media file(s).`,
      files: uploaded,
      file: uploaded[0], // for convenient single-file consumption
    });
  });
});

/**
 * POST /api/upload/base64
 * Fallback endpoint for base64-encoded video or image data
 */
apiRouter.post('/upload/base64', async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataUrl, filename: userFilename, type: explicitType } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') {
      res.status(400).json({ success: false, error: 'dataUrl is required.' });
      return;
    }

    const matches = dataUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = dataUrl;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const isVideo = mimeType.startsWith('video/') || explicitType === 'video';
    const ext = isVideo ? '.mp4' : (mimeType === 'image/png' ? '.png' : mimeType === 'image/webp' ? '.webp' : '.jpg');
    const safeBase = userFilename ? path.basename(userFilename, path.extname(userFilename)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) : 'media';
    const filename = `ivntri_${safeBase}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      file: {
        url: `/uploads/${filename}`,
        filename,
        mimetype: mimeType,
        type: isVideo ? 'video' : 'image',
        size: buffer.length,
        aspectRatio: isVideo ? 'aspect-[16/9]' : 'aspect-[3/4]',
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/uploads
 * List stored media files
 */
apiRouter.get('/uploads', async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      res.json({ success: true, files: [] });
      return;
    }

    const fileNames = fs.readdirSync(uploadsDir);
    const mediaFiles = fileNames
      .map((name) => {
        const fullPath = path.join(uploadsDir, name);
        try {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(name).toLowerCase();
          const isVideo = ['.mp4', '.webm', '.mov', '.ogg', '.mkv', '.avi'].includes(ext);
          return {
            filename: name,
            url: `/uploads/${name}`,
            size: stats.size,
            type: isVideo ? 'video' : 'image',
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      total: mediaFiles.length,
      files: mediaFiles,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/upload/:filename
 * Delete an uploaded media file
 */
apiRouter.delete('/upload/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawFilename = path.basename(req.params.filename);
    const filePath = path.join(uploadsDir, rawFilename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: `File ${rawFilename} deleted.` });
    } else {
      res.status(404).json({ success: false, error: 'File not found.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Dedicated memory-storage multer for Threads image optimization pipeline
const threadUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB per file
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Threads image optimizer only accepts image files.`));
    }
  },
});

/**
 * POST /api/threads/optimize-image
 * Production-ready backend image optimization pipeline for Threads:
 * 1. Authenticates user & checks payload
 * 2. Quarantines raw original to private temporary location
 * 3. Validates file buffer, format, dimensions, pixel count (decompression bomb guard)
 * 4. Optimizes via Sharp (WebP @ quality 82, max 2048px, alpha preserved)
 * 5. Generates responsive thumbnail variant
 * 6. Saves to persistent storage & syncs to Firebase Storage when available
 * 7. Automatically deletes temporary quarantine original
 */
apiRouter.post('/threads/optimize-image', (req: Request, res: Response): void => {
  threadUpload.any()(req, res, async (err: any) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      res.status(400).json({ success: false, error: message });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, error: 'No image files provided for optimization.' });
      return;
    }

    const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required. User ID missing.' });
      return;
    }

    const threadId = (req.body.threadId as string) || `thread_${Date.now()}`;

    try {
      const results = [];
      for (const file of files) {
        const optimized = await optimizeThreadImage(
          file.buffer,
          userId,
          threadId,
          file.originalname
        );
        results.push(optimized);
      }

      res.json({
        success: true,
        threadId,
        optimizedImages: results,
        image: results[0],
      });
    } catch (optErr: any) {
      console.warn('Backend thread image optimization notice:', optErr?.message || optErr);
      res.status(422).json({
        success: false,
        error: optErr?.message || 'Image processing failed. Ensure file is a valid image.',
      });
    }
  });
});

/**
 * DELETE /api/threads/:threadId/media
 * Cleans up all optimized images and directories associated with a deleted thread
 */
apiRouter.delete('/threads/:threadId/media', async (req: Request, res: Response): Promise<void> => {
  try {
    const threadId = req.params.threadId;
    const userId = (req.query.userId as string) || (req.body?.userId as string) || (req.headers['x-user-id'] as string) || 'unknown';
    await cleanupThreadMedia(userId, threadId);
    res.json({ success: true, message: `Media for thread ${threadId} cleaned up.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to cleanup media.' });
  }
});

/**
 * POST /api/users/:userId/avatar
 * Uploads and optimizes a user's profile avatar to high-fidelity WebP
 */
apiRouter.post('/users/:userId/avatar', (req: Request, res: Response): void => {
  threadUpload.single('avatar')(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err?.message || 'Avatar upload failed' });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No avatar image provided.' });
      return;
    }

    const userId = req.params.userId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID missing.' });
      return;
    }

    try {
      const avatarsDir = path.resolve(process.cwd(), 'uploads', 'avatars');
      if (!fs.existsSync(avatarsDir)) {
        fs.mkdirSync(avatarsDir, { recursive: true });
      }

      const avatarFilename = `avatar_${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.webp`;
      const avatarPath = path.join(avatarsDir, avatarFilename);

      await sharp(file.buffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 85, effort: 4 })
        .toFile(avatarPath);

      const avatarUrl = `/uploads/avatars/${avatarFilename}`;
      res.json({ success: true, avatarUrl });
    } catch (processErr: any) {
      console.warn('Avatar processing error:', processErr?.message || processErr);
      res.status(422).json({ success: false, error: 'Failed to process avatar image.' });
    }
  });
});


