/**
 * IVNTRI Immutable Ledger Wallet Service
 * Follows strict financial safety principle:
 * THE CLIENT REQUESTS. THE SERVER DECIDES. THE LEDGER RECORDS.
 */

import {
  db,
  doc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from '../lib/firebase';
import { getAuthHeaders } from '../lib/authHeaders';
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
    headers: await getAuthHeaders(),
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
    headers: await getAuthHeaders(),
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
    headers: await getAuthHeaders(),
    body: JSON.stringify({ uid, fromCurrency, toCurrency, amount }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Currency conversion failed');
  }

  return await res.json();
}

/**
 * Transfer funds to another creator or execute Super Admin Direct Grant (strictly server-authorized)
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

  const apiRes = await fetch('/api/wallet/transfer', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      senderUid,
      recipientUsername: cleanRecipient,
      amount,
      currency,
      note,
      isDirectAdminGrant: isDirectGrant,
    }),
  });

  const data = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) {
    throw new Error(data.error || 'Wallet transfer failed authorization or validation.');
  }
  return data;
}

/**
 * Top up funds for Super Admin account self (strictly server-authorized)
 */
export async function executeSuperAdminFreeTopUp(
  uid: string,
  currency: string,
  amount: number,
  _adminEmail?: string,
  _actorRole: string = 'SUPER_ADMIN'
): Promise<{ success: boolean; transaction: WalletTransaction }> {
  if (!uid || typeof amount !== 'number' || amount <= 0) {
    throw new Error('Valid super admin UID and amount greater than 0 are required.');
  }

  const apiRes = await fetch('/api/wallet/topup/free', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      uid,
      currency,
      amount,
    }),
  });

  const data = await apiRes.json().catch(() => ({}));
  if (!apiRes.ok) {
    throw new Error(data.error || 'Super Admin free top-up failed authorization.');
  }
  return data;
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
