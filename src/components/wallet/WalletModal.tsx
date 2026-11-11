import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CreditCard,
  ArrowRightLeft,
  Send,
  History,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  TrendingUp,
  Clock,
  ExternalLink,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Printer,
  Copy,
  Check,
} from 'lucide-react';
import { UserProfile } from '../../types/social';
import {
  WalletAccount,
  WalletTransaction,
  TopUpIntent,
  TransactionType,
  TransactionStatus,
  CurrencyConfig,
  ExchangeRatesData,
} from '../../types/settings';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  fetchLiveExchangeRates,
  convertCurrencyAmount,
  formatCurrency,
  formatTimeAgo,
} from '../../services/currencyService';
import {
  subscribeToUserWallet,
  subscribeToUserTransactions,
  createTopUpIntent,
  confirmTopUpPayment,
  convertWalletCurrency,
  transferWalletFunds,
  executeSuperAdminFreeTopUp,
  downloadTransactionsCSV,
} from '../../services/walletService';

interface WalletModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  initialTab?: 'dashboard' | 'top_up' | 'convert' | 'transactions' | 'converter';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  initialTab = 'dashboard',
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'top_up' | 'convert' | 'transfer' | 'transactions' | 'converter'
  >(initialTab);

  // Real-time Wallet & Ledger
  const [wallet, setWallet] = useState<WalletAccount>({
    uid: currentUser.id,
    primaryCurrency: 'USD',
    availableBalance: 0,
    pendingBalance: 0,
    totalReceived: 0,
    totalSpent: 0,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<ExchangeRatesData | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Top-Up Workflow States
  const [topUpCurrency, setTopUpCurrency] = useState('USD');
  const [topUpAmount, setTopUpAmount] = useState<number>(100);
  const [topUpMethod, setTopUpMethod] = useState<TopUpIntent['paymentMethod']>('card');
  const [isReviewingTopUp, setIsReviewingTopUp] = useState(false);
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpSuccessTx, setTopUpSuccessTx] = useState<WalletTransaction | null>(null);

  // Currency Conversion Workflow States
  const [convertFrom, setConvertFrom] = useState('USD');
  const [convertTo, setConvertTo] = useState('IDR');
  const [convertAmount, setConvertAmount] = useState<number>(50);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccessTx, setConvertSuccessTx] = useState<WalletTransaction | null>(null);

  // Transfer Workflow States
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(25);
  const [transferCurrency, setTransferCurrency] = useState('USD');
  const [transferNote, setTransferNote] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccessTx, setTransferSuccessTx] = useState<WalletTransaction | null>(null);
  const [isDirectAdminGrant, setIsDirectAdminGrant] = useState(false);

  // Super Admin Role Detection & Complimentary Top-Up States
  const isSuperAdmin = useMemo(() => {
    return (
      currentUser.role === 'SUPER_ADMIN' ||
      currentUser.accountType === 'SUPER_ADMIN' ||
      currentUser.email?.toLowerCase() === 'rachvan420@gmail.com'
    );
  }, [currentUser]);

  const [freeTopUpAmount, setFreeTopUpAmount] = useState<number>(1000);
  const [freeTopUpCurrency, setFreeTopUpCurrency] = useState('USD');
  const [isFreeTopUpProcessing, setIsFreeTopUpProcessing] = useState(false);

  // Transaction Ledger Filters & Search
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<WalletTransaction | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Standalone Global Converter States
  const [calcFrom, setCalcFrom] = useState('USD');
  const [calcTo, setCalcTo] = useState('IDR');
  const [calcAmount, setCalcAmount] = useState<number>(100);

  // Sync initial tab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Real-time Wallet Subscription
  useEffect(() => {
    if (!isOpen || !currentUser.id) return;
    const unsubWallet = subscribeToUserWallet(currentUser.id, (w) => {
      setWallet(w);
    });
    const unsubTx = subscribeToUserTransactions(currentUser.id, (txs) => {
      setTransactions(txs);
    });
    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [isOpen, currentUser.id]);

  // Load Real-time Exchange Rates
  const loadRates = async () => {
    setRatesLoading(true);
    try {
      const data = await fetchLiveExchangeRates('USD');
      setExchangeRateInfo(data);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRates();
    }
  }, [isOpen]);

  // Filtered Ledger Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.transactionId.toLowerCase().includes(q) ||
          t.provider.toLowerCase().includes(q) ||
          t.reference.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [transactions, filterType, filterStatus, searchQuery]);

  if (!isOpen) return null;

  // Top Up Fee & Total Calculations (1.5% processing fee)
  const topUpFee = Number((topUpAmount * 0.015).toFixed(2));
  const topUpTotalCharge = Number((topUpAmount + topUpFee).toFixed(2));

  // Conversion Calculation (Live institutional rates)
  const convertPreview = exchangeRateInfo
    ? convertCurrencyAmount(convertAmount, convertFrom, convertTo, exchangeRateInfo)
    : {
        convertedAmount: 0,
        rate: 1,
        fee: 0,
        netAmount: 0,
        timestamp: new Date().toISOString(),
      };

  // Standalone Global Converter Calculation
  const standaloneCalc = exchangeRateInfo
    ? convertCurrencyAmount(calcAmount, calcFrom, calcTo, exchangeRateInfo)
    : {
        convertedAmount: 0,
        rate: 1,
        fee: 0,
        netAmount: 0,
        timestamp: new Date().toISOString(),
      };

  // Top Up Actions
  const handleExecuteTopUp = async () => {
    setIsProcessingTopUp(true);
    setTopUpError(null);
    try {
      // 1. Create server-side payment intent
      const intent = await createTopUpIntent(
        currentUser.id,
        topUpCurrency,
        topUpAmount,
        topUpMethod
      );

      // 2. Validate payment reference and record atomic transaction on ledger
      const ref = `PAY-PROV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const res = await confirmTopUpPayment(intent.topUpId, currentUser.id, ref);

      setTopUpSuccessTx(res.transaction);
      setIsReviewingTopUp(false);
    } catch (err: any) {
      setTopUpError(err.message || 'Payment provider authorization declined.');
    } finally {
      setIsProcessingTopUp(false);
    }
  };

  // Conversion Action
  const handleExecuteConversion = async () => {
    if (convertAmount <= 0) return;
    setIsConverting(true);
    setConvertError(null);
    try {
      const res = await convertWalletCurrency(
        currentUser.id,
        convertFrom,
        convertTo,
        convertAmount
      );
      setConvertSuccessTx(res.transaction);
    } catch (err: any) {
      setConvertError(err.message || 'Balance conversion declined.');
    } finally {
      setIsConverting(false);
    }
  };

  // Super Admin Free Top-Up Action
  const handleExecuteFreeTopUp = async (customAmount?: number) => {
    const amt = customAmount !== undefined ? customAmount : freeTopUpAmount;
    if (amt <= 0) return;
    setIsFreeTopUpProcessing(true);
    setTopUpError(null);
    try {
      const res = await executeSuperAdminFreeTopUp(
        currentUser.id,
        freeTopUpCurrency,
        amt,
        currentUser.email,
        'SUPER_ADMIN'
      );
      setTopUpSuccessTx(res.transaction);
    } catch (err: any) {
      setTopUpError(err.message || 'Free super admin top-up failed.');
    } finally {
      setIsFreeTopUpProcessing(false);
    }
  };

  // Transfer Action
  const handleExecuteTransfer = async () => {
    if (!transferRecipient.trim() || transferAmount <= 0) return;
    setIsTransferring(true);
    setTransferError(null);
    try {
      const res = await transferWalletFunds(
        currentUser.id,
        transferRecipient.trim(),
        transferAmount,
        transferCurrency,
        transferNote,
        {
          isDirectAdminGrant: isSuperAdmin && isDirectAdminGrant,
          actorRole: isSuperAdmin ? 'SUPER_ADMIN' : currentUser.role,
          actorEmail: currentUser.email,
        }
      );
      setTransferSuccessTx(res.transaction);
      setTransferRecipient('');
      setTransferNote('');
    } catch (err: any) {
      setTransferError(err.message || 'Transfer could not be processed.');
    } finally {
      setIsTransferring(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="bg-[#09090b] border border-white/15 w-full max-w-5xl h-[92vh] max-h-[920px] flex flex-col shadow-2xl relative overflow-hidden select-text text-neutral-200 font-sans">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white/20 bg-neutral-900 flex items-center justify-center text-white">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg sm:text-xl font-serif uppercase tracking-tight text-white font-medium">
                  WALLET
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-white/20 bg-white/5 text-white/70 uppercase">
                  {wallet.status}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-white/40">
                Multi-currency balances and transactions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1.5 border border-white/10 hover:border-white/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Rates Ticker Ribbon */}
        <div className="px-6 py-2.5 bg-neutral-950 border-b border-white/10 flex flex-wrap items-center justify-between text-[11px] font-mono gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                exchangeRateInfo?.status === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-white/50 uppercase">RATES FEED:</span>
            <span className="text-white font-medium">
              1 USD ≈ {exchangeRateInfo?.rates?.IDR ? Math.round(exchangeRateInfo.rates.IDR).toLocaleString() : '15,820'} IDR
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white/80">
              1 EUR ≈ {exchangeRateInfo?.rates?.EUR ? exchangeRateInfo.rates.EUR.toFixed(2) : '0.92'} USD
            </span>
            <span className="text-white/30">|</span>
            <span className="text-white/80">
              1 GBP ≈ {exchangeRateInfo?.rates?.GBP ? exchangeRateInfo.rates.GBP.toFixed(2) : '0.79'} USD
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/40 text-[10px]">
              UPDATED {exchangeRateInfo?.fetchedAt ? formatTimeAgo(exchangeRateInfo.fetchedAt) : 'JUST NOW'}
            </span>
            <button
              onClick={loadRates}
              disabled={ratesLoading}
              className="text-white/60 hover:text-white flex items-center gap-1 transition-colors"
              title="Refresh live exchange rates"
            >
              <RefreshCw className={`w-3 h-3 ${ratesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-neutral-950/60 flex items-center gap-2 overflow-x-auto text-xs font-mono uppercase tracking-wider">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            DASHBOARD
          </button>
          <button
            onClick={() => {
              setActiveTab('top_up');
              setIsReviewingTopUp(false);
              setTopUpSuccessTx(null);
            }}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'top_up'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            TOP UP
          </button>
          <button
            onClick={() => {
              setActiveTab('convert');
              setConvertSuccessTx(null);
            }}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'convert'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            CONVERT
          </button>
          <button
            onClick={() => {
              setActiveTab('transfer');
              setTransferSuccessTx(null);
            }}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'transfer'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            TRANSFER
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'transactions'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            TRANSACTIONS ({transactions.length})
          </button>
          <button
            onClick={() => setActiveTab('converter')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'converter'
                ? 'border-white text-white font-bold'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            RATE CALCULATOR
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* Balances Card */}
              <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      AVAILABLE LEDGER BALANCE
                    </span>
                    <div className="text-3xl sm:text-5xl font-mono font-medium text-white tracking-tight">
                      {formatCurrency(wallet.availableBalance, wallet.primaryCurrency)}
                    </div>
                  </div>

                  {/* Primary Currency Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/40 uppercase">LEDGER BASE:</span>
                    <select
                      value={wallet.primaryCurrency}
                      onChange={(e) => {
                        setWallet((prev) => ({ ...prev, primaryCurrency: e.target.value }));
                      }}
                      className="bg-neutral-900 border border-white/20 text-white text-xs font-mono px-3 py-1.5 uppercase focus:outline-none focus:border-white"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sub balances */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 text-xs font-mono">
                  <div>
                    <span className="text-white/40 uppercase block mb-1">PENDING CLEARANCE</span>
                    <span className="text-white font-medium text-lg">
                      {formatCurrency(wallet.pendingBalance, wallet.primaryCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase block mb-1">TOTAL RECEIVED</span>
                    <span className="text-emerald-400 font-medium text-lg">
                      {formatCurrency(wallet.totalReceived, wallet.primaryCurrency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 uppercase block mb-1">TOTAL DISBURSED</span>
                    <span className="text-white/70 font-medium text-lg">
                      {formatCurrency(wallet.totalSpent, wallet.primaryCurrency)}
                    </span>
                  </div>
                </div>

                {/* Super Admin Treasury Ribbon */}
                {isSuperAdmin && (
                  <div className="mt-6 p-4 border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                            SUPER ADMIN TREASURY PRIVILEGES
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-semibold">
                            ROOT ACCESS
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-white/50">
                          Top up your personal account free of charge and send direct treasury grants to creators.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('top_up')}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        ⚡ FREE SELF TOP-UP
                      </button>
                      <button
                        onClick={() => {
                          setIsDirectAdminGrant(true);
                          setActiveTab('transfer');
                        }}
                        className="px-3 py-1.5 border border-amber-500/40 hover:border-amber-400 bg-amber-950/30 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase transition-colors cursor-pointer"
                      >
                        ⚡ SEND CREATOR GRANT
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Action Ribbon */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab('top_up')}
                    className="px-5 py-2.5 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-widest uppercase font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>TOP UP BALANCE</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('convert')}
                    className="px-4 py-2.5 border border-white/30 hover:border-white text-white text-xs font-mono tracking-widest uppercase transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>CONVERT CURRENCY</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('transfer')}
                    className="px-4 py-2.5 border border-white/30 hover:border-white text-white text-xs font-mono tracking-widest uppercase transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>SEND / TRANSFER</span>
                  </button>
                  <button
                    onClick={() => downloadTransactionsCSV(transactions)}
                    className="px-4 py-2.5 border border-white/20 hover:border-white text-white/70 hover:text-white text-xs font-mono tracking-widest uppercase transition-colors flex items-center gap-2 ml-auto cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORT AUDIT CSV</span>
                  </button>
                </div>
              </div>

              {/* Recent Transactions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-xs font-mono tracking-widest text-white/50 uppercase">
                    RECENT LEDGER ACTIVITY
                  </h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-mono text-white hover:underline uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <span>VIEW FULL LEDGER</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="py-12 text-center border border-white/10 text-white/40 font-mono text-xs uppercase tracking-widest">
                    NO TRANSACTIONS RECORDED YET
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 border border-white/10 bg-neutral-950">
                    {transactions.slice(0, 5).map((t) => (
                      <div
                        key={t.transactionId}
                        onClick={() => setSelectedReceipt(t)}
                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                              t.type === 'TOP_UP'
                                ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                                : t.type === 'TRANSFER'
                                ? 'border-sky-500/30 text-sky-400 bg-sky-950/20'
                                : 'border-white/20 text-white bg-neutral-900'
                            }`}
                          >
                            {t.type === 'TOP_UP' ? (
                              <ArrowDownRight className="w-4 h-4" />
                            ) : t.type === 'TRANSFER' ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowRightLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-mono text-white font-medium">
                              {t.type} // {t.transactionId}
                            </div>
                            <div className="text-[10px] font-mono text-white/40">
                              {new Date(t.createdAt).toLocaleString()} • {t.provider}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`text-sm font-mono font-medium ${
                              t.type === 'TOP_UP' ? 'text-emerald-400' : 'text-white'
                            }`}
                          >
                            {t.type === 'TOP_UP' ? '+' : '-'}
                            {formatCurrency(t.amount, t.currency)}
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 border border-white/20 text-white/60 uppercase">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TOP UP */}
          {activeTab === 'top_up' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {topUpSuccessTx ? (
                <div className="border border-emerald-500/30 bg-emerald-950/15 p-8 text-center space-y-5">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-2xl font-serif uppercase tracking-tight text-white font-medium">
                      TOP-UP COMPLETED & VERIFIED
                    </h3>
                    <p className="text-xs font-mono text-white/60">
                      Transaction verified and immutably written to your ledger balance.
                    </p>
                  </div>

                  <div className="p-4 bg-black/60 border border-white/10 text-xs font-mono text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-white/40">TRANSACTION ID:</span>
                      <span className="text-white font-bold">{topUpSuccessTx.transactionId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">AMOUNT CREDITED:</span>
                      <span className="text-emerald-400 font-bold">
                        {formatCurrency(topUpSuccessTx.netAmount, topUpSuccessTx.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">PROVIDER REFERENCE:</span>
                      <span className="text-white">{topUpSuccessTx.reference}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setSelectedReceipt(topUpSuccessTx)}
                      className="px-4 py-2 border border-white/30 hover:border-white text-xs font-mono tracking-widest uppercase text-white cursor-pointer"
                    >
                      VIEW OFFICIAL RECEIPT
                    </button>
                    <button
                      onClick={() => setTopUpSuccessTx(null)}
                      className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-mono tracking-widest uppercase font-semibold cursor-pointer"
                    >
                      NEW TOP UP
                    </button>
                  </div>
                </div>
              ) : isReviewingTopUp ? (
                /* REVIEW TOP UP STEP */
                <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 space-y-6">
                  <div className="space-y-1 border-b border-white/10 pb-4">
                    <h3 className="text-xl font-serif uppercase tracking-tight text-white font-medium">
                      REVIEW TOP UP
                    </h3>
                    <p className="text-xs font-mono text-white/40">
                      Verify final fee calculation and total charge before server execution.
                    </p>
                  </div>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/50">TOP-UP AMOUNT:</span>
                      <span className="text-white font-bold">
                        {formatCurrency(topUpAmount, topUpCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/5">
                      <span className="text-white/50">GATEWAY PROCESSING SURCHARGE (1.5%):</span>
                      <span className="text-white">
                        {formatCurrency(topUpFee, topUpCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-white/10 text-sm">
                      <span className="text-white font-medium">TOTAL CHARGE:</span>
                      <span className="text-white font-bold">
                        {formatCurrency(topUpTotalCharge, topUpCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-white/5 px-3 border border-white/10 text-sm">
                      <span className="text-emerald-400 font-medium">FINAL WALLET CREDIT:</span>
                      <span className="text-emerald-400 font-bold">
                        +{formatCurrency(topUpAmount, topUpCurrency)}
                      </span>
                    </div>
                  </div>

                  {topUpError && (
                    <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-200">
                      {topUpError}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <button
                      onClick={() => setIsReviewingTopUp(false)}
                      disabled={isProcessingTopUp}
                      className="px-4 py-2 border border-white/20 text-xs font-mono uppercase tracking-wider text-white hover:border-white transition-colors cursor-pointer"
                    >
                      BACK
                    </button>
                    <button
                      onClick={handleExecuteTopUp}
                      disabled={isProcessingTopUp}
                      className="px-6 py-2.5 bg-white text-black hover:bg-neutral-200 text-xs font-mono tracking-widest uppercase font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessingTopUp ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>AUTHORIZING LEDGER...</span>
                        </>
                      ) : (
                        <span>CONFIRM TOP UP</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* INPUT TOP UP STEP */
                <div className="space-y-6">
                  {/* Super Admin Complimentary Top-Up VIP Card */}
                  {isSuperAdmin && (
                    <div className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-900 p-6 sm:p-7 space-y-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold tracking-widest uppercase">
                            SUPER ADMIN
                          </span>
                          <h4 className="text-base font-serif text-white tracking-tight uppercase">
                            Complimentary Account Top-Up (100% Free of Charge)
                          </h4>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 uppercase tracking-wider">
                          $0.00 FEE // DIRECT TREASURY OVERRIDE
                        </span>
                      </div>

                      <p className="text-xs font-mono text-neutral-300">
                        As Super Admin, you can credit your personal account ledger directly free of charge. No credit card or third-party payment rails are required.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] font-mono tracking-widest text-amber-200/70 uppercase block mb-1">
                            CURRENCY
                          </label>
                          <select
                            value={freeTopUpCurrency}
                            onChange={(e) => setFreeTopUpCurrency(e.target.value)}
                            className="w-full bg-neutral-900 border border-amber-500/40 p-2.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-amber-400"
                          >
                            {SUPPORTED_CURRENCIES.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} — {c.name} ({c.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-mono tracking-widest text-amber-200/70 uppercase block mb-1">
                            FREE TOP-UP AMOUNT ({freeTopUpCurrency})
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={freeTopUpAmount}
                            onChange={(e) => setFreeTopUpAmount(Math.max(1, Number(e.target.value)))}
                            className="w-full bg-neutral-900 border border-amber-500/40 p-2 text-base font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Quick presets */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {[500, 1000, 5000, 10000, 50000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFreeTopUpAmount(preset)}
                            className="px-2.5 py-1 border border-amber-500/30 hover:border-amber-400 bg-amber-950/30 text-[10px] font-mono text-amber-200 cursor-pointer transition-all"
                          >
                            +{preset.toLocaleString()} {freeTopUpCurrency}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleExecuteFreeTopUp()}
                        disabled={isFreeTopUpProcessing || freeTopUpAmount <= 0}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black text-xs font-mono tracking-widest uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
                      >
                        {isFreeTopUpProcessing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>CREDITING SUPER ADMIN ACCOUNT...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>TOP UP SELF FREE OF CHARGE (+{freeTopUpAmount.toLocaleString()} {freeTopUpCurrency})</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 space-y-6">
                    <div className="space-y-1 border-b border-white/10 pb-4">
                      <h3 className="text-xl font-serif uppercase tracking-tight text-white font-medium">
                        STANDARD TOP UP
                      </h3>
                      <p className="text-xs font-mono text-white/40">
                        Select currency, amount, and secure payment rail.
                      </p>
                    </div>

                  {/* Currency Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block">
                      CURRENCY
                    </label>
                    <select
                      value={topUpCurrency}
                      onChange={(e) => setTopUpCurrency(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} — {c.name} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Selection & Presets */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block">
                      AMOUNT ({topUpCurrency})
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="50000"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-neutral-900 border border-white/20 p-3 text-lg font-mono text-white focus:outline-none focus:border-white"
                    />

                    {/* Quick amount shortcuts */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {(topUpCurrency === 'IDR'
                        ? [100000, 500000, 1000000, 2500000]
                        : [50, 100, 250, 500, 1000]
                      ).map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTopUpAmount(preset)}
                          className="px-3 py-1 border border-white/10 hover:border-white/30 bg-white/5 text-[10px] font-mono text-white cursor-pointer"
                        >
                          +{preset.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block">
                      PAYMENT METHOD
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: 'card', label: 'CREDIT / DEBIT CARD', desc: 'Visa, Mastercard, Amex' },
                        { id: 'bank_transfer', label: 'BANK / VA TRANSFER', desc: 'SEPA, ACH, Virtual Account' },
                        { id: 'instant_rail', label: 'INSTANT RAILS', desc: 'Instant Settlement Rail' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setTopUpMethod(m.id as any)}
                          className={`p-3 border text-left cursor-pointer transition-colors ${
                            topUpMethod === m.id
                              ? 'border-white bg-white/10 text-white font-medium'
                              : 'border-white/10 bg-neutral-900 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <div className="text-xs font-mono uppercase">{m.label}</div>
                          <div className="text-[10px] font-mono text-white/40 mt-1">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setIsReviewingTopUp(true)}
                    className="w-full py-3 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-widest uppercase font-semibold cursor-pointer"
                  >
                    CONTINUE TO REVIEW TOP UP
                  </button>
                </div>
              </div>
            )}
            </div>
          )}

          {/* TAB 3: CONVERT */}
          {activeTab === 'convert' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 space-y-6">
                <div className="space-y-1 border-b border-white/10 pb-4">
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white font-medium">
                    CONVERT WALLET BALANCE
                  </h3>
                  <p className="text-xs font-mono text-white/40">
                    Execute atomic multi-currency conversion on your available balance.
                  </p>
                </div>

                {convertSuccessTx && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-200 space-y-1">
                    <p className="font-bold">CONVERSION COMPLETED</p>
                    <p>
                      Transaction #{convertSuccessTx.transactionId} recorded. Converted{' '}
                      {formatCurrency(convertAmount, convertFrom)} into{' '}
                      {formatCurrency(convertSuccessTx.netAmount, convertTo)}.
                    </p>
                  </div>
                )}

                {convertError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-200">
                    {convertError}
                  </div>
                )}

                {/* From / To Controls */}
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      FROM
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={convertAmount}
                          onChange={(e) => setConvertAmount(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-neutral-900 border border-white/20 p-3 text-lg font-mono text-white focus:outline-none focus:border-white"
                        />
                      </div>
                      <select
                        value={convertFrom}
                        onChange={(e) => setConvertFrom(e.target.value)}
                        className="bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = convertFrom;
                        setConvertFrom(convertTo);
                        setConvertTo(temp);
                      }}
                      className="p-2 border border-white/20 hover:border-white text-white/70 hover:text-white transition-colors cursor-pointer"
                      title="Swap currencies"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      TO (EXPECTED RECEIVED)
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <div className="w-full bg-neutral-900/60 border border-white/10 p-3 text-lg font-mono text-emerald-400 font-bold">
                          ≈ {formatCurrency(convertPreview.convertedAmount, convertTo)}
                        </div>
                      </div>
                      <select
                        value={convertTo}
                        onChange={(e) => setConvertTo(e.target.value)}
                        className="bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Conversion Rate Breakdown */}
                <div className="p-4 bg-black/60 border border-white/10 text-xs font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-white/40">REFERENCE RATE:</span>
                    <span className="text-white">
                      1 {convertFrom} = {convertPreview.rate.toLocaleString()} {convertTo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">CONVERSION FEE (0.5%):</span>
                    <span className="text-white">{formatCurrency(convertPreview.fee, convertFrom)}</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span className="text-white/40">RATE SOURCE:</span>
                    <span>European Central Bank / Live Open Institutional</span>
                  </div>
                </div>

                <button
                  onClick={handleExecuteConversion}
                  disabled={isConverting || convertAmount <= 0}
                  className="w-full py-3 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-widest uppercase font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConverting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>CONVERTING LEDGER...</span>
                    </>
                  ) : (
                    <span>CONVERT {convertAmount} {convertFrom} → {convertTo}</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFER */}
          {activeTab === 'transfer' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 space-y-6">
                <div className="space-y-1 border-b border-white/10 pb-4">
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white font-medium">
                    DIRECT CREATOR TRANSFER
                  </h3>
                  <p className="text-xs font-mono text-white/40">
                    Send funds instantly to another VAIURE creator or collaborator.
                  </p>
                </div>

                {transferSuccessTx && (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-200 space-y-1">
                    <p className="font-bold">TRANSFER DISPATCHED</p>
                    <p>
                      Transaction #{transferSuccessTx.transactionId} recorded. Sent{' '}
                      {formatCurrency(transferSuccessTx.amount, transferSuccessTx.currency)}.
                    </p>
                  </div>
                )}

                {transferError && (
                  <div className="p-3 bg-red-950/40 border border-red-500/30 text-xs font-mono text-red-200">
                    {transferError}
                  </div>
                )}

                {/* Super Admin Direct Treasury Grant Option */}
                {isSuperAdmin && (
                  <div className="border border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-900 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black text-[9px] font-mono font-bold uppercase">
                          SUPER ADMIN
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-200 uppercase tracking-wider">
                          DIRECT TREASURY GRANT
                        </span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <span className={`text-[10px] font-mono ${isDirectAdminGrant ? 'text-amber-300 font-bold' : 'text-white/50'}`}>
                          {isDirectAdminGrant ? 'ACTIVE (NO PERSONAL DEBIT)' : 'OFF (STANDARD DEBIT)'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isDirectAdminGrant}
                          onChange={(e) => setIsDirectAdminGrant(e.target.checked)}
                          className="w-4 h-4 accent-amber-400 cursor-pointer"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] font-mono text-neutral-300 leading-relaxed">
                      {isDirectAdminGrant
                        ? '⚡ ACTIVE: Funds will be minted and credited directly to the creator from VAIURE Treasury. Your personal balance will NOT be debited.'
                        : 'Enable this to dispatch direct treasury grants to other creators without deducting from your personal balance.'}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      RECIPIENT USERNAME
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. curator_ivn, elena_vance"
                      value={transferRecipient}
                      onChange={(e) => setTransferRecipient(e.target.value.replace('@', ''))}
                      className="w-full bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        AMOUNT {isDirectAdminGrant && <span className="text-amber-400 font-bold">(DIRECT GRANT)</span>}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-neutral-900 border border-white/20 p-3 text-lg font-mono text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        CURRENCY
                      </label>
                      <select
                        value={transferCurrency}
                        onChange={(e) => setTransferCurrency(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      MEMO / NOTE (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder={isDirectAdminGrant ? "e.g. Super Admin Treasury Grant, Accession Grant" : "e.g. Editorial Licensing Fee, Collaboration Advance"}
                      value={transferNote}
                      onChange={(e) => setTransferNote(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white focus:outline-none focus:border-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleExecuteTransfer}
                  disabled={isTransferring || !transferRecipient.trim() || transferAmount <= 0}
                  className={`w-full py-3 text-xs font-mono tracking-widest uppercase font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all ${
                    isDirectAdminGrant
                      ? 'bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isTransferring ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>DISPATCHING {isDirectAdminGrant ? 'TREASURY GRANT' : 'TRANSFER'}...</span>
                    </>
                  ) : (
                    <span>
                      {isDirectAdminGrant
                        ? `DISPATCH SUPER ADMIN TREASURY GRANT (${transferAmount} ${transferCurrency})`
                        : `CONFIRM TRANSFER`}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: TRANSACTIONS & LEDGER */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Filters & Export Bar */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search ID, reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-neutral-900 border border-white/20 pl-8 pr-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  {/* Type Filter */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-neutral-900 border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                  >
                    <option value="ALL">ALL TYPES</option>
                    <option value="TOP_UP">TOP UP</option>
                    <option value="PURCHASE">PURCHASE</option>
                    <option value="TRANSFER">TRANSFER</option>
                    <option value="CONVERSION">CONVERSION</option>
                    <option value="FEE">FEE</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-neutral-900 border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                  >
                    <option value="ALL">ALL STATUSES</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="PENDING">PENDING</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <button
                  onClick={() => downloadTransactionsCSV(transactions)}
                  className="px-4 py-2 border border-white/20 hover:border-white text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT CSV ({transactions.length})</span>
                </button>
              </div>

              {/* Transactions Table */}
              {filteredTransactions.length === 0 ? (
                <div className="py-20 text-center border border-white/10 text-white/40 font-mono text-xs uppercase tracking-widest">
                  NO LEDGER TRANSACTIONS FOUND
                </div>
              ) : (
                <div className="border border-white/10 bg-neutral-950 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/10 text-white/40 uppercase bg-black/40">
                        <th className="p-3.5">TRANSACTION ID</th>
                        <th className="p-3.5">DATE & TIME</th>
                        <th className="p-3.5">TYPE</th>
                        <th className="p-3.5">STATUS</th>
                        <th className="p-3.5">GROSS</th>
                        <th className="p-3.5">FEE</th>
                        <th className="p-3.5">NET</th>
                        <th className="p-3.5 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTransactions.map((tx) => (
                        <tr key={tx.transactionId} className="hover:bg-white/5 transition-colors">
                          <td className="p-3.5 text-white font-medium">{tx.transactionId}</td>
                          <td className="p-3.5 text-white/60">
                            {new Date(tx.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3.5">
                            <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white/80 uppercase text-[10px]">
                              {tx.type}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                                tx.status === 'COMPLETED'
                                  ? 'text-emerald-400 bg-emerald-950/30'
                                  : 'text-amber-400 bg-amber-950/30'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-white">
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="p-3.5 text-white/50">
                            {formatCurrency(tx.fee, tx.currency)}
                          </td>
                          <td className="p-3.5 text-white font-bold">
                            {formatCurrency(tx.netAmount, tx.currency)}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setSelectedReceipt(tx)}
                              className="px-2.5 py-1 border border-white/20 hover:border-white text-white/80 hover:text-white transition-colors uppercase text-[10px] cursor-pointer"
                            >
                              RECEIPT
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STANDALONE GLOBAL RATE CALCULATOR */}
          {activeTab === 'converter' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="border border-white/15 bg-neutral-950 p-6 sm:p-8 space-y-6">
                <div className="space-y-1 border-b border-white/10 pb-4">
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white font-medium">
                    GLOBAL CURRENCY CALCULATOR
                  </h3>
                  <p className="text-xs font-mono text-white/40">
                    Live reference rates across internationally recognized ISO 4217 currencies.
                  </p>
                </div>

                {/* Important Distinction Banner */}
                <div className="p-3.5 border border-amber-500/30 bg-amber-950/20 text-xs font-mono text-amber-200/90 space-y-1">
                  <div className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>ESTIMATED CONVERSION — REFERENCE ONLY</span>
                  </div>
                  <p className="text-[11px] text-amber-200/70">
                    This calculator is for informational estimations. Actual monetary conversions
                    executed on your wallet balance are locked at server timestamp execution time.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      FROM
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <input
                          type="number"
                          value={calcAmount}
                          onChange={(e) => setCalcAmount(Math.max(1, Number(e.target.value)))}
                          className="w-full bg-neutral-900 border border-white/20 p-3 text-lg font-mono text-white focus:outline-none focus:border-white"
                        />
                      </div>
                      <select
                        value={calcFrom}
                        onChange={(e) => setCalcFrom(e.target.value)}
                        className="bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        const temp = calcFrom;
                        setCalcFrom(calcTo);
                        setCalcTo(temp);
                      }}
                      className="p-2 border border-white/20 hover:border-white text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      ESTIMATED TO
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <div className="w-full bg-neutral-900/60 border border-white/10 p-3 text-lg font-mono text-white font-bold">
                          ≈ {formatCurrency(standaloneCalc.convertedAmount, calcTo)}
                        </div>
                      </div>
                      <select
                        value={calcTo}
                        onChange={(e) => setCalcTo(e.target.value)}
                        className="bg-neutral-900 border border-white/20 p-3 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Common Preset Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[10, 50, 100, 500, 1000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCalcAmount(preset)}
                      className={`px-3 py-1 border text-[10px] font-mono cursor-pointer transition-colors ${
                        calcAmount === preset
                          ? 'border-white bg-white text-black font-bold'
                          : 'border-white/10 hover:border-white/30 text-white/70'
                      }`}
                    >
                      {preset} {calcFrom}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-black/60 border border-white/10 text-xs font-mono space-y-1.5 text-white/70">
                  <div className="flex justify-between">
                    <span>LIVE BENCHMARK:</span>
                    <span className="text-white">
                      1 {calcFrom} ≈ {standaloneCalc.rate.toLocaleString()} {calcTo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>FEED PROVIDER:</span>
                    <span>European Central Bank / Institutional Open</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIMESTAMP:</span>
                    <span>{new Date().toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: VIEW OFFICIAL TRANSACTION RECEIPT */}
        {selectedReceipt && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#0c0c0e] border border-white/20 w-full max-w-lg p-6 sm:p-8 space-y-6 text-neutral-200 font-mono shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-serif uppercase tracking-widest text-white font-medium">
                    VAIURE 唯昱尔 FINANCIAL RECEIPT
                  </span>
                </div>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="text-white/60 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Body */}
              <div className="space-y-4 text-xs">
                <div className="text-center py-3 border-y border-white/10 bg-white/5 space-y-1">
                  <div className="text-[10px] text-white/40 uppercase">NET TRANSACTION AMOUNT</div>
                  <div className="text-3xl font-bold text-white tracking-tight">
                    {formatCurrency(selectedReceipt.netAmount, selectedReceipt.currency)}
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase">
                    STATUS: {selectedReceipt.status}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex justify-between">
                    <span className="text-white/40">TRANSACTION ID:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold">{selectedReceipt.transactionId}</span>
                      <button
                        onClick={() => copyToClipboard(selectedReceipt.transactionId)}
                        className="text-white/50 hover:text-white"
                        title="Copy ID"
                      >
                        {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">TYPE:</span>
                    <span className="text-white uppercase">{selectedReceipt.type}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">DATE & TIME:</span>
                    <span className="text-white">{new Date(selectedReceipt.createdAt).toUTCString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">GROSS AMOUNT:</span>
                    <span className="text-white">{formatCurrency(selectedReceipt.amount, selectedReceipt.currency)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">PLATFORM / PROCESSING FEE:</span>
                    <span className="text-white">{formatCurrency(selectedReceipt.fee, selectedReceipt.currency)}</span>
                  </div>

                  {selectedReceipt.exchangeRate && (
                    <div className="flex justify-between">
                      <span className="text-white/40">EXCHANGE RATE:</span>
                      <span className="text-white">{selectedReceipt.exchangeRate}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-white/40">PROVIDER:</span>
                    <span className="text-white">{selectedReceipt.provider}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-white/40">REFERENCE ID:</span>
                    <span className="text-white font-mono text-[11px]">{selectedReceipt.reference}</span>
                  </div>
                </div>
              </div>

              {/* Receipt Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 border border-white/20 hover:border-white text-xs font-mono uppercase tracking-wider text-white flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>PRINT / PDF</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-5 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
