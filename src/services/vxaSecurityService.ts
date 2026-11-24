/**
 * VAIURE Labs — VXA Financial Security Client Service
 * Frontend client connecting to all /api/vxa/* backend endpoints.
 */

import {
  VxaUserWallet,
  VxaTransaction,
  SettlementTrackerRecord,
  KeyRegistryStatus,
  DoubleEntryJournalEntry,
  AdminFinancialOverview,
  SecurityEventLog,
  PayoutDestination,
} from '../types/vxaSecurity';

import { getAuthHeaders as getVerifiedAuthHeaders } from '../lib/authHeaders';

const depositTokenCache = new Map<string, string>();

async function getAuthHeaders(_userId?: string, _userEmail?: string): Promise<Record<string, string>> {
  return getVerifiedAuthHeaders({}, true);
}

export const vxaSecurityService = {
  getWallet: async (userId?: string): Promise<VxaUserWallet> => {
    const res = await fetch('/api/vxa/wallet', {
      headers: await getAuthHeaders(userId),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch VXA wallet.');
    return data.wallet;
  },

  getTransactions: async (userId?: string): Promise<VxaTransaction[]> => {
    const res = await fetch('/api/vxa/transactions', {
      headers: await getAuthHeaders(userId),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch transactions.');
    return data.transactions;
  },

  getSettlements: async (userId?: string): Promise<SettlementTrackerRecord[]> => {
    const res = await fetch('/api/vxa/settlements', {
      headers: await getAuthHeaders(userId),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch settlements.');
    return data.settlements;
  },

  createDeposit: async (
    amountIdr: number,
    paymentMethod: string,
    userId?: string
  ): Promise<{
    depositRef: string;
    depositToken?: string;
    amountIdr: number;
    vxaEquivalent: number;
    paymentMethod: string;
    qrString: string;
    vaNumber: string;
    expiresInMinutes: number;
  }> => {
    const res = await fetch('/api/vxa/deposit/create', {
      method: 'POST',
      headers: await getAuthHeaders(userId),
      body: JSON.stringify({ amountIdr, paymentMethod }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to initiate deposit.');
    if (data.depositRef && data.depositToken) {
      depositTokenCache.set(data.depositRef, data.depositToken);
    }
    return data;
  },

  confirmDeposit: async (
    amountIdr: number,
    paymentMethod: string,
    depositRef: string,
    idempotencyKey?: string,
    userId?: string,
    explicitDepositToken?: string
  ): Promise<{ transaction: VxaTransaction; wallet: VxaUserWallet; message: string }> => {
    const depositToken = explicitDepositToken || depositTokenCache.get(depositRef);
    const res = await fetch('/api/vxa/deposit/confirm', {
      method: 'POST',
      headers: await getAuthHeaders(userId),
      body: JSON.stringify({ amountIdr, paymentMethod, depositRef, depositToken, idempotencyKey }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Deposit verification failed.');
    depositTokenCache.delete(depositRef);
    return data;
  },

  requestWithdrawal: async (
    amountVxa: number,
    destination: PayoutDestination,
    pin?: string,
    idempotencyKey?: string,
    userId?: string
  ): Promise<{ transaction: VxaTransaction; settlement: SettlementTrackerRecord; wallet: VxaUserWallet; message: string }> => {
    const res = await fetch('/api/vxa/withdraw/request', {
      method: 'POST',
      headers: await getAuthHeaders(userId),
      body: JSON.stringify({ amountVxa, destination, pin, idempotencyKey }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Withdrawal request failed.');
    return data;
  },

  convertVxaToCredits: async (
    vxaAmount: number,
    userId?: string
  ): Promise<{ creditsReceived: number; wallet: VxaUserWallet; transaction: VxaTransaction; message: string }> => {
    const res = await fetch('/api/vxa/convert', {
      method: 'POST',
      headers: await getAuthHeaders(userId),
      body: JSON.stringify({ vxaAmount }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Conversion failed.');
    return data;
  },

  getKeyStatus: async (): Promise<KeyRegistryStatus> => {
    const res = await fetch('/api/vxa/security/key-status', {
      headers: await getVerifiedAuthHeaders({}, false),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch key rotation status.');
    return data.status;
  },

  triggerKeyRotation: async (adminEmail?: string): Promise<{ activeKid: string; message: string }> => {
    const res = await fetch('/api/vxa/security/key-rotate', {
      method: 'POST',
      headers: await getAuthHeaders(undefined, adminEmail),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Key rotation failed.');
    return data;
  },

  setStepUpPin: async (pin: string, userId?: string): Promise<boolean> => {
    const res = await fetch('/api/vxa/security/step-up/pin', {
      method: 'POST',
      headers: await getAuthHeaders(userId),
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to set security PIN.');
    return true;
  },

  getLedgerEntries: async (): Promise<{ count: number; lastHash: string; entries: DoubleEntryJournalEntry[] }> => {
    const res = await fetch('/api/vxa/ledger/entries', {
      headers: await getVerifiedAuthHeaders({}, false),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch ledger entries.');
    return data;
  },

  verifyLedgerIntegrity: async (): Promise<{ ok: boolean; audit: any; verifiedAt: string }> => {
    const res = await fetch('/api/vxa/ledger/verify', {
      headers: await getVerifiedAuthHeaders({}, false),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification check failed.');
    return data;
  },

  getAdminOverview: async (adminEmail?: string): Promise<AdminFinancialOverview> => {
    const res = await fetch('/api/vxa/admin/overview', {
      headers: await getAuthHeaders(undefined, adminEmail),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch admin overview.');
    return data.overview;
  },

  getAdminSettlementQueue: async (adminEmail?: string): Promise<SettlementTrackerRecord[]> => {
    const res = await fetch('/api/vxa/admin/settlement-queue', {
      headers: await getAuthHeaders(undefined, adminEmail),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch settlement queue.');
    return data.pending;
  },

  processAdminSettlementAction: async (
    withdrawalId: string,
    action: 'APPROVE' | 'REJECT',
    reason?: string,
    adminEmail?: string
  ): Promise<{ transaction: VxaTransaction; settlement: SettlementTrackerRecord }> => {
    const res = await fetch('/api/vxa/admin/settlement-action', {
      method: 'POST',
      headers: await getAuthHeaders(undefined, adminEmail),
      body: JSON.stringify({ withdrawalId, action, reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Settlement action failed.');
    return data;
  },

  getAdminSecurityEvents: async (adminEmail?: string): Promise<SecurityEventLog[]> => {
    const res = await fetch('/api/vxa/admin/security-events', {
      headers: await getAuthHeaders(undefined, adminEmail),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to fetch security events.');
    return data.events;
  },

  runAutomatedTests: async (adminEmail?: string): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: Array<{ testName: string; passed: boolean; message: string }>;
  }> => {
    const res = await fetch('/api/vxa/admin/run-tests', {
      headers: await getAuthHeaders(undefined, adminEmail),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Test suite execution failed.');
    return data.testSuite;
  },
};
