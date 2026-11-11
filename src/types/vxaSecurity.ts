/**
 * VAIURE Labs — VXA Financial Security Infrastructure & Digital Wallet Core
 * Type definitions for VAIURE Credits, VXA Coin, Double-Entry Accounting Ledger,
 * Cryptographic Key Management (120s rotation), Settlements, and Fraud Detection.
 */

export type VxaAssetType = 'VXA' | 'VAIURE_CREDITS' | 'IDR';

export type WalletStatus = 'ACTIVE' | 'RESTRICTED' | 'FROZEN' | 'UNDER_REVIEW';

export type WalletSecurityStatus = 'VERIFIED' | 'STEP_UP_REQUIRED' | 'FLAGGED';

export interface VxaUserWallet {
  id: string; // Cryptographically secure UUID
  userId: string;
  status: WalletStatus;
  securityStatus: WalletSecurityStatus;

  // VAIURE Credits Balance (Utility - for video generation & compute only)
  creditBalances: {
    totalCredits: number;
    subscriptionCredits: number;
    purchasedCredits: number;
    promotionalCredits: number; // Non-withdrawable under all circumstances
  };

  // VXA Coin Balances (1 VXA = Rp1,000 IDR exact integer accounting)
  vxaBalances: {
    availableMinor: number; // in minor units (e.g., 10 VXA = 10 units = Rp10,000)
    pendingMinor: number;   // awaiting webhook settlement
    reservedMinor: number;  // locked in active withdrawal settlement pipeline
  };

  // Deposit & Withdrawal aggregated statistics
  depositStats: {
    totalDepositedIdr: number;
    totalDepositsCount: number;
    lastDepositAt?: string;
  };
  withdrawalStats: {
    totalWithdrawnIdr: number;
    totalWithdrawalsCount: number;
    lastWithdrawalAt?: string;
  };

  stepUpPinEnabled: boolean;
  stepUpPinHash?: string;
  stepUpPinSalt?: string;
  createdAt: string;
  updatedAt: string;
  lastSecurityVerificationAt: string;
}

// Dynamic 120-Second Cryptographic Signing Key
export interface DynamicSigningKey {
  kid: string;
  algorithm: 'HMAC-SHA256';
  secret: string; // Server-side only
  issuedAt: number; // Epoch ms
  expiresAt: number; // Epoch ms (issuedAt + 120,000ms)
  graceExpiresAt: number; // Epoch ms (expiresAt + 60,000ms overlap grace period)
  status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'REVOKED';
  usageCount: number;
  rotationReason: 'SCHEDULED_120S' | 'MANUAL_TRIGGER' | 'SECURITY_REVOCATION';
}

export interface KeyRegistryStatus {
  activeKid: string;
  algorithm: string;
  issuedAt: string;
  expiresAt: string;
  secondsRemaining: number;
  rotationIntervalSeconds: number;
  activeKeyHistory: Array<{
    kid: string;
    issuedAt: string;
    expiresAt: string;
    status: 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'REVOKED';
    usageCount: number;
  }>;
}

// Chart of Accounts for True Double-Entry Bookkeeping
export type AccountCode =
  | '1001_CASH_SETTLEMENT_CLEARING'        // Asset: Funds in bank settlement escrow
  | '1002_PAYMENT_GATEWAY_RECEIVABLE'      // Asset: Unsettled gateway deposits
  | '2001_USER_VXA_LIABILITY'              // Liability: Customer circulating VXA Coin
  | '2002_USER_RESERVED_VXA_LIABILITY'     // Liability: Customer VXA locked in withdrawal
  | '2003_USER_CREDITS_UTILITY_LIABILITY'  // Liability: Utility credits owned by users
  | '4001_PLATFORM_FEE_REVENUE'            // Revenue: Platform conversion/transaction fees
  | '5001_PAYMENT_GATEWAY_FEE_EXPENSE'     // Expense: Fees charged by payment processors
  | '5002_FAILED_SETTLEMENT_REFUND_EXPENSE';// Expense/Contra: Reversal allocations

export interface DoubleEntryJournalEntry {
  entryId: string;
  timestamp: string;
  referenceType:
    | 'DEPOSIT_ISSUANCE'
    | 'WITHDRAWAL_RESERVE'
    | 'WITHDRAWAL_SETTLEMENT'
    | 'WITHDRAWAL_REVERSAL'
    | 'VXA_TO_CREDITS_CONVERT'
    | 'CREDIT_GENERATION_DEDUCTION'
    | 'CREDIT_FAILURE_REFUND'
    | 'ADMIN_AUDIT_ADJUSTMENT';
  referenceId: string;
  userId: string;
  debitAccount: AccountCode;
  creditAccount: AccountCode;
  amountMinor: number;
  currency: 'IDR' | 'VXA' | 'VAIURE_CREDITS';
  exchangeRate: number; // e.g. 1000 IDR per 1 VXA
  description: string;
  previousHash: string; // SHA-256 hash of previous entry
  hash: string;         // SHA-256(canonicalEntry + previousHash)
  signature: string;    // HMAC-SHA256 signature using active short-lived key
  kid: string;          // Signing Key ID
}

export type VxaTransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'CONVERSION'
  | 'CREDIT_DEDUCTION'
  | 'REFUND';

export type SettlementStatus =
  | 'REQUESTED'
  | 'SECURITY_REVIEW'
  | 'PROCESSING'
  | 'AWAITING_PARTNER'
  | 'SETTLED'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export interface PayoutDestination {
  bankName: string; // e.g. 'BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO'
  accountNumber: string;
  accountHolderName: string;
}

export interface VxaTransaction {
  id: string;
  idempotencyKey: string;
  userId: string;
  walletId: string;
  type: VxaTransactionType;
  asset: VxaAssetType;
  amountMinor: number;
  amountIdrEquivalent: number;
  conversionRate: number;
  feeMinor: number;
  status: SettlementStatus;
  createdAt: string;
  updatedAt: string;
  settledAt?: string;
  payoutDestination?: PayoutDestination;
  partnerReference?: string;
  failureReason?: string;
  riskScore: number;
  signature: string;
  kid: string;
  previousLedgerRef: string;
}

// Settlement Schedule Lifecycle Tracking (1–2 Business Days)
export interface SettlementStageItem {
  stage: SettlementStatus;
  label: string;
  timestamp?: string;
  completed: boolean;
  notes?: string;
}

export interface SettlementTrackerRecord {
  withdrawalId: string;
  userId: string;
  amountVxa: number;
  amountIdr: number;
  payoutDestination: PayoutDestination;
  requestedAt: string;
  targetSettlementDate: string; // Respects Indonesian banking business days
  currentStatus: SettlementStatus;
  stages: SettlementStageItem[];
  partnerReference?: string;
  isSimulatedDevMode: boolean;
}

export interface SecurityEventLog {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category:
    | 'KEY_ROTATION'
    | 'AUTH_FAILURE'
    | 'SUSPICIOUS_VELOCITY'
    | 'SIGNATURE_MISMATCH'
    | 'DOUBLE_SPEND_ATTEMPT'
    | 'UNBALANCED_JOURNAL'
    | 'WITHDRAWAL_REVIEW';
  userId?: string;
  details: string;
  ipHash?: string;
  resolved: boolean;
  actionTaken?: string;
}

export interface AdminFinancialOverview {
  totalCirculatingVxaMinor: number;
  totalCirculatingVxaIdr: number;
  totalReservedVxaMinor: number;
  totalReservedVxaIdr: number;
  totalMonetaryLiabilitiesIdr: number;
  totalVerifiedDepositsIdr: number;
  totalSettledWithdrawalsIdr: number;
  totalPendingWithdrawalsCount: number;
  totalPendingWithdrawalsIdr: number;
  totalFailedSettlementRefundsIdr: number;
  totalPlatformFeesRevenueIdr: number;
  ledgerIntegrityVerified: boolean;
  totalLedgerEntriesCount: number;
  lastLedgerHash: string;
  activeSigningKid: string;
  operatingMode: 'DEVELOPMENT_SIMULATED' | 'REGULATED_PRODUCTION';
}
