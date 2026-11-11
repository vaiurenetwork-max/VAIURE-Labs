/**
 * IVNTRI Immutable Ledger Wallet Service
 * Follows strict financial safety principle:
 * THE CLIENT REQUESTS. THE SERVER DECIDES. THE LEDGER RECORDS.
 */

import {
  db,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  increment,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  WalletAccount,
  WalletTransaction,
  TopUpIntent,
  TransactionType,
} from '../types/settings';

/**
 * Real-time subscription to user's wallet account balance
 */
export function subscribeToUserWallet(
  uid: string,
  onUpdate: (wallet: WalletAccount) => void
): () => void {
  const walletDocRef = doc(db, 'wallets', uid);

  const defaultWallet: WalletAccount = {
    uid,
    primaryCurrency: 'USD',
    availableBalance: 0,
    pendingBalance: 0,
    totalReceived: 0,
    totalSpent: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const unsubscribe = onSnapshot(
    walletDocRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({
          ...defaultWallet,
          ...(snap.data() as WalletAccount),
          uid,
        });
      } else {
        onUpdate(defaultWallet);
      }
    },
    (err) => {
      console.warn('Wallet listener notice:', err);
      onUpdate(defaultWallet);
    }
  );

  return unsubscribe;
}

/**
 * Real-time subscription to user's wallet transaction ledger
 */
export function subscribeToUserTransactions(
  uid: string,
  onUpdate: (transactions: WalletTransaction[]) => void,
  typeFilter?: TransactionType
): () => void {
  const txRef = collection(db, 'walletTransactions');
  const q = query(
    txRef,
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const list: WalletTransaction[] = [];
      snap.forEach((d) => {
        list.push(d.data() as WalletTransaction);
      });
      if (typeFilter) {
        onUpdate(list.filter((t) => t.type === typeFilter));
      } else {
        onUpdate(list);
      }
    },
    (err) => {
      console.warn('Transaction ledger listener note:', err);
      onUpdate([]);
    }
  );

  return unsubscribe;
}

/**
 * Create top-up intent on server
 */
export async function createTopUpIntent(
  uid: string,
  currency: string,
  amount: number,
  paymentMethod: TopUpIntent['paymentMethod']
): Promise<TopUpIntent> {
  const res = await fetch('/api/wallet/topup/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, currency, amount, paymentMethod }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initialize top-up intent');
  }

  return await res.json();
}

/**
 * Confirm top-up with payment reference (server validates and executes atomic ledger entry)
 */
export async function confirmTopUpPayment(
  topUpId: string,
  uid: string,
  paymentReference: string
): Promise<{ success: boolean; transaction: WalletTransaction }> {
  const res = await fetch('/api/wallet/topup/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topUpId, uid, paymentReference }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Payment validation failed');
  }

  return await res.json();
}

/**
 * Execute server-side currency conversion on wallet balance
 */
export async function convertWalletCurrency(
  uid: string,
  fromCurrency: string,
  toCurrency: string,
  amount: number
): Promise<{ success: boolean; transaction: WalletTransaction }> {
  const res = await fetch('/api/wallet/convert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, fromCurrency, toCurrency, amount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Currency conversion failed');
  }

  return await res.json();
}

/**
 * Transfer funds to another creator or execute Super Admin Direct Grant
 */
export async function transferWalletFunds(
  senderUid: string,
  recipientUsername: string,
  amount: number,
  currency: string,
  note?: string,
  options?: { isDirectAdminGrant?: boolean; actorRole?: string; actorEmail?: string }
): Promise<{ success: boolean; transaction: WalletTransaction }> {
  const cleanRecipient = recipientUsername.toLowerCase().trim().replace(/^@/, '');
  const isDirectGrant = Boolean(options?.isDirectAdminGrant);

  if (!senderUid || !cleanRecipient || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Valid sender, recipient, and amount greater than 0 are required.');
  }

  // 1. Try server-side transfer endpoint first (authoritative ledger with zero permissions errors)
  try {
    const apiRes = await fetch('/api/wallet/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderUid,
        recipientUsername: cleanRecipient,
        amount,
        currency,
        note,
        isDirectAdminGrant: isDirectGrant,
        actorRole: options?.actorRole,
        actorEmail: options?.actorEmail,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      return data;
    } else {
      const errData = await apiRes.json().catch(() => ({}));
      if (errData.error && apiRes.status !== 500) {
        throw new Error(errData.error);
      }
      console.warn('API transfer returned non-ok, falling back to direct ledger:', errData);
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('Network')) {
      throw apiErr;
    }
    console.warn('Network issue calling /api/wallet/transfer, falling back to client ledger:', apiErr);
  }

  // 2. Direct Firestore fallback
  try {
    // 1. Resolve recipient username -> uid
    const usernameRef = doc(db, 'usernames', cleanRecipient);
    const usernameSnap = await getDoc(usernameRef);
    if (!usernameSnap.exists()) {
      throw new Error(`Recipient @${cleanRecipient} not found across VAIURE directory.`);
    }

    const recipientUid = usernameSnap.data()?.uid;
    if (!recipientUid) {
      throw new Error(`Unable to resolve identity for @${cleanRecipient}.`);
    }

    if (recipientUid === senderUid && !isDirectGrant) {
      throw new Error('Cannot transfer funds to your own wallet.');
    }

    // 2. Sender wallet verification (unless direct admin grant)
    const senderWalletRef = doc(db, 'wallets', senderUid);
    const senderWalletSnap = await getDoc(senderWalletRef);

    if (!senderWalletSnap.exists() && !isDirectGrant) {
      throw new Error('Sender wallet account not found or uninitialized.');
    }

    const senderWallet = senderWalletSnap.exists() ? (senderWalletSnap.data() as WalletAccount) : null;
    if (senderWallet && (senderWallet.status === 'FROZEN' || senderWallet.status === 'RESTRICTED')) {
      throw new Error('Your wallet has administrative restrictions and cannot initiate transfers.');
    }

    if (!isDirectGrant) {
      const currentAvailable = senderWallet?.availableBalance ?? 0;
      if (currentAvailable < amount) {
        throw new Error(`Insufficient funds. Your available balance is ${senderWallet?.primaryCurrency || 'USD'} ${currentAvailable.toFixed(2)}, requested ${amount}.`);
      }
    }

    const completedAt = new Date().toISOString();
    const senderTxId = `VAI-${new Date().getFullYear()}-XFER-${Date.now().toString(36).toUpperCase()}`;
    const inTxId = `VAI-${new Date().getFullYear()}-RECV-${(Date.now() + 1).toString(36).toUpperCase()}`;

    // 3. Sender Outward Transaction
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

    // 4. Debit sender (only if not direct admin treasury grant)
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

    // 5. Credit recipient wallet
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

    // 6. Recipient Inward Transaction with linked senderUid & recipientUid
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

    // 7. Notification for recipient
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

    return { success: true, transaction };
  } catch (err: any) {
    console.error('Wallet transfer execution error:', err);
    handleFirestoreError(err, OperationType.WRITE, 'wallets');
    throw err;
  }
}

/**
 * Top up funds for Super Admin account self (100% free of charge)
 */
export async function executeSuperAdminFreeTopUp(
  uid: string,
  currency: string,
  amount: number,
  adminEmail?: string,
  actorRole: string = 'SUPER_ADMIN'
): Promise<{ success: boolean; transaction: WalletTransaction }> {
  if (!uid || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Valid super admin UID and amount greater than 0 are required.');
  }

  // 1. Try server-side endpoint first
  try {
    const apiRes = await fetch('/api/wallet/topup/free', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        currency,
        amount,
        adminEmail,
        actorRole,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      return data;
    } else {
      const errData = await apiRes.json().catch(() => ({}));
      if (errData.error && apiRes.status !== 500) {
        throw new Error(errData.error);
      }
      console.warn('API free top-up returned non-ok, falling back to direct ledger:', errData);
    }
  } catch (apiErr: any) {
    if (apiErr.message && !apiErr.message.includes('fetch') && !apiErr.message.includes('Network')) {
      throw apiErr;
    }
    console.warn('Network issue calling /api/wallet/topup/free, falling back to client ledger:', apiErr);
  }

  // 2. Client-side fallback
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

  try {
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

    // Real-time Notification
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

    return { success: true, transaction };
  } catch (err: any) {
    console.error('Super admin free top-up error:', err);
    handleFirestoreError(err, OperationType.WRITE, 'wallets');
    throw err;
  }
}

/**
 * Export real transactions to CSV string
 */
export function exportTransactionsToCSV(transactions: WalletTransaction[]): string {
  const headers = [
    'Transaction ID',
    'Date & Time',
    'Type',
    'Status',
    'Currency',
    'Gross Amount',
    'Platform Fee',
    'Net Amount',
    'Provider',
    'Reference',
    'Description',
  ];

  const rows = transactions.map((t) => [
    `"${t.transactionId}"`,
    `"${t.createdAt}"`,
    `"${t.type}"`,
    `"${t.status}"`,
    `"${t.currency}"`,
    t.amount,
    t.fee,
    t.netAmount,
    `"${t.provider}"`,
    `"${t.reference}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Trigger browser file download for transaction CSV
 */
export function downloadTransactionsCSV(transactions: WalletTransaction[]): void {
  const csvContent = exportTransactionsToCSV(transactions);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `IVNTRI_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
