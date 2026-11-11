/**
 * IVNTRI Settings, Security, Currency, Wallet & Admin Types
 * Production enterprise data models for ISO 4217 currencies, ledger wallets,
 * immutable transactions, sessions, audit logs, and administrative controls.
 */

export type AccountStatus =
  | 'ACTIVE'
  | 'EMAIL_UNVERIFIED'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'DISABLED'
  | 'DELETION_PENDING'
  | 'DELETED';

export type UserRole =
  | 'USER'
  | 'CREATOR'
  | 'ARTIST'
  | 'FILMMAKER'
  | 'PHOTOGRAPHER'
  | 'STUDIO'
  | 'BRAND'
  | 'EDITOR'
  | 'MODERATOR'
  | 'FINANCE'
  | 'SUPPORT'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type WalletStatus = 'ACTIVE' | 'RESTRICTED' | 'FROZEN';

export type TransactionType =
  | 'TOP_UP'
  | 'PURCHASE'
  | 'REFUND'
  | 'PAYOUT'
  | 'TRANSFER'
  | 'CONVERSION'
  | 'FEE'
  | 'ADJUSTMENT';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DISPUTED';

export interface UserSession {
  sessionId: string;
  uid: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  operatingSystem: string;
  approximateLocation: string;
  ipHash?: string;
  createdAt: string;
  lastActiveAt: string;
  lastLoginAt: string;
  current: boolean;
  revokedAt?: string | null;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
}

export interface UserSettings {
  uid: string;
  twoFactorEnabled: boolean;
  profileVisibility: 'PUBLIC' | 'CREATORS_ONLY' | 'PRIVATE';
  whoCanFollow: 'EVERYONE' | 'VERIFIED_ONLY';
  whoCanMessage: 'EVERYONE' | 'FOLLOWED_ONLY' | 'NO_ONE';
  whoCanComment: 'EVERYONE' | 'FOLLOWED_ONLY' | 'VERIFIED_ONLY';
  whoCanMention: 'EVERYONE' | 'FOLLOWED_ONLY' | 'NO_ONE';
  activityVisibility: boolean;
  onlineStatus: boolean;
  readReceipts: boolean;
  language: string; // 'en' | 'id' | 'zh'
  currency: string; // ISO 4217 code
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  theme: 'DARK' | 'LIGHT' | 'SYSTEM';
  reducedMotion: boolean;
  animationIntensity: 'SUBTLE' | 'STANDARD' | 'CINEMATIC';
  interfaceDensity: 'COMPACT' | 'COMFORTABLE' | 'EXPANSIVE';
  notifications: {
    likes: boolean;
    comments: boolean;
    replies: boolean;
    follows: boolean;
    mentions: boolean;
    reposts: boolean;
    messages: boolean;
    collabRequests: boolean;
    editorialSelections: boolean;
    securityAlerts: boolean;
    transactionAlerts: boolean;
    walletAlerts: boolean;
    systemAnnouncements: boolean;
    emailDigest: boolean;
    pushEnabled: boolean;
  };
  updatedAt: string;
}

export interface CurrencyConfig {
  code: string; // ISO 4217 (USD, IDR, EUR, GBP, etc.)
  name: string;
  symbol: string;
  decimalPlaces: number;
  countryOrRegion: string;
  enabled: boolean;
  displayOrder: number;
  updatedAt?: string;
}

export interface ExchangeRatesData {
  baseCurrency: string;
  provider: string;
  fetchedAt: string;
  expiresAt: string;
  version: string;
  status: 'LIVE' | 'STALE' | 'UNAVAILABLE';
  rates: Record<string, number>;
}

export interface WalletAccount {
  uid: string;
  primaryCurrency: string;
  availableBalance: number;
  pendingBalance: number;
  totalReceived: number;
  totalSpent: number;
  status: WalletStatus;
  restrictionReason?: string;
  currencyBalances?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  transactionId: string;
  uid: string;
  type: TransactionType;
  status: TransactionStatus;
  currency: string;
  amount: number;
  fee: number;
  netAmount: number;
  exchangeRate?: number;
  exchangeRateTimestamp?: string;
  targetCurrency?: string;
  targetAmount?: number;
  recipientUid?: string;
  recipientUsername?: string;
  senderUid?: string;
  senderUsername?: string;
  provider: string;
  reference: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface TopUpIntent {
  topUpId: string;
  uid: string;
  currency: string;
  amount: number;
  fee: number;
  totalCharge: number;
  paymentMethod: 'card' | 'bank_transfer' | 'qris' | 'paypal';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  providerReference?: string;
  createdAt: string;
  completedAt?: string;
}

export interface AdminAuditLog {
  logId: string;
  actorUid: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetUid?: string; // alias for targetId
  reason: string;
  timestamp: string;
  createdAt?: string; // alias for timestamp
  result: 'SUCCESS' | 'DENIED' | 'FAILED';
  targetMetadata?: Record<string, any>;
  metadata?: Record<string, any>;
  integrityHash?: string; // SHA-256 cryptographic verification checksum
}

export interface SystemSettings {
  settingId: string;
  platformName: string;
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  uploadEnabled: boolean;
  commentsEnabled: boolean;
  messagingEnabled: boolean;
  paymentsEnabled: boolean;
  topUpsEnabled: boolean;
  walletEnabled: boolean;
  minimumTopUp: number; // in USD base
  maximumTopUp: number; // in USD base
  platformFeeRate: number; // e.g. 0.025 (2.5%)
  updatedAt: string;
  updatedBy: string;
}

export interface FeatureFlag {
  featureId: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedRoles: UserRole[];
  description?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface SecurityEvent {
  eventId: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  uid?: string;
  userEmail?: string;
  ipHash?: string;
  userAgent?: string;
  timestamp: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  resolution?: string;
}

export interface SupportTicket {
  ticketId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  category: 'ACCOUNT' | 'SECURITY' | 'PAYMENT' | 'WALLET' | 'CONTENT' | 'TECHNICAL' | 'OTHER';
  subject: string;
  message: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  adminReply?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
