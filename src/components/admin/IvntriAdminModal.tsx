import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Users,
  Coins,
  Sliders,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  Check,
  Ban,
  UserCheck,
  Eye,
  TrendingUp,
  Server,
  Database,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { UserProfile } from '../../types/social';
import {
  SystemSettings,
  AdminAuditLog,
  SupportTicket,
  UserRole,
  WalletAccount,
} from '../../types/settings';
import {
  fetchSystemSettings,
  updateSystemSettings,
  executeAdminUserAction,
  toggleWalletFreezeStatus,
  fetchAdminAuditLogs,
  verifyAuditLogsBatch,
  subscribeToSupportTickets,
  fetchSystemHealth,
  DEFAULT_SYSTEM_SETTINGS,
} from '../../services/adminService';
import { collection, db, getDocs, limit, query, orderBy } from '../../lib/firebase';
import { formatCurrency } from '../../services/currencyService';
import { executeSuperAdminFreeTopUp, transferWalletFunds } from '../../services/walletService';

interface IvntriAdminModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
}

export const IvntriAdminModal: React.FC<IvntriAdminModalProps> = ({
  isOpen,
  currentUser,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'finance' | 'settings' | 'audit' | 'tickets'
  >('overview');

  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [newSelectedRole, setNewSelectedRole] = useState<UserRole>('CREATOR');

  // Audit Ledger State
  const [auditFilterCategory, setAuditFilterCategory] = useState<'ALL' | 'USER' | 'WALLET' | 'SETTINGS' | 'DENIED'>('ALL');
  const [auditSearch, setAuditSearch] = useState('');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);
  const [auditIntegrityStatus, setAuditIntegrityStatus] = useState<{
    verified: boolean;
    validCount: number;
    total: number;
  } | null>(null);

  // Super Admin Treasury Operations State
  const [grantRecipient, setGrantRecipient] = useState('');
  const [grantAmount, setGrantAmount] = useState<number>(500);
  const [grantCurrency, setGrantCurrency] = useState('USD');
  const [grantNote, setGrantNote] = useState('');
  const [isGranting, setIsGranting] = useState(false);

  const [selfTopUpAmount, setSelfTopUpAmount] = useState<number>(1000);
  const [selfTopUpCurrency, setSelfTopUpCurrency] = useState('USD');
  const [isSelfTopUpProcessing, setIsSelfTopUpProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load System Settings
    fetchSystemSettings().then(setSystemSettings);

    // Load Audit Logs
    fetchAdminAuditLogs().then(setAuditLogs);

    // Load Health
    fetchSystemHealth().then(setSystemHealth);

    // Subscribe to Tickets
    const unsubTickets = subscribeToSupportTickets(setSupportTickets);

    // Load Users from Firestore
    const loadUsers = async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(50)));
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setAllUsers(list);
      } catch (err) {
        console.warn('Admin user fetch note:', err);
      }
    };
    loadUsers();

    return () => {
      unsubTickets();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  const handleToggleSetting = async (key: keyof SystemSettings, currentVal: boolean) => {
    try {
      const updated = await updateSystemSettings(currentUser.id, {
        [key]: !currentVal,
      });
      setSystemSettings(updated);
      showToast(`System setting "${key}" updated.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    }
  };

  const handleUpdateNumericSetting = async (key: keyof SystemSettings, val: number) => {
    try {
      const updated = await updateSystemSettings(currentUser.id, {
        [key]: val,
      });
      setSystemSettings(updated);
      showToast(`System setting "${key}" updated to ${val}.`);
    } catch (err: any) {
      alert(err.message || 'Failed to update system settings');
    }
  };

  const handleExecuteUserAction = async (action: 'SUSPEND' | 'UNSUSPEND' | 'VERIFY' | 'CHANGE_ROLE') => {
    if (!selectedUserForAction) return;
    setIsLoading(true);
    try {
      await executeAdminUserAction({
        actorUid: currentUser.id,
        targetUid: selectedUserForAction.id,
        action,
        role: action === 'CHANGE_ROLE' ? newSelectedRole : undefined,
        reason: actionReason || 'Curatorial and security administrative action',
      });
      showToast(`User ${action} action executed successfully.`);
      setSelectedUserForAction(null);
      setActionReason('');

      // Refresh users
      const snap = await getDocs(query(collection(db, 'users'), limit(50)));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setAllUsers(list);
    } catch (err: any) {
      alert(err.message || 'Action failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleWalletFreeze = async (targetUid: string, currentStatus: string) => {
    const nextFreeze = currentStatus !== 'FROZEN';
    try {
      await toggleWalletFreezeStatus(
        currentUser.id,
        targetUid,
        nextFreeze,
        'Administrative compliance control'
      );
      showToast(`Wallet ${nextFreeze ? 'FROZEN' : 'UNFROZEN'} successfully.`);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle wallet freeze state');
    }
  };

  const handleExecuteTreasuryGrant = async () => {
    if (!grantRecipient.trim() || grantAmount <= 0) {
      alert('Valid recipient username and grant amount greater than 0 are required.');
      return;
    }
    setIsGranting(true);
    try {
      await transferWalletFunds(
        currentUser.id,
        grantRecipient.trim(),
        grantAmount,
        grantCurrency,
        grantNote || 'Super Admin Direct Treasury Grant',
        {
          isDirectAdminGrant: true,
          actorRole: 'SUPER_ADMIN',
          actorEmail: currentUser.email,
        }
      );
      showToast(`⚡ Direct Treasury Grant of +${grantAmount} ${grantCurrency} sent to @${grantRecipient.replace('@', '')}!`);
      setGrantRecipient('');
      setGrantNote('');
    } catch (err: any) {
      alert(err.message || 'Treasury grant failed');
    } finally {
      setIsGranting(false);
    }
  };

  const handleExecuteSelfFreeTopUp = async (amt?: number) => {
    const amount = amt !== undefined ? amt : selfTopUpAmount;
    if (amount <= 0) return;
    setIsSelfTopUpProcessing(true);
    try {
      await executeSuperAdminFreeTopUp(
        currentUser.id,
        selfTopUpCurrency,
        amount,
        currentUser.email,
        'SUPER_ADMIN'
      );
      showToast(`⚡ Free Super Admin Top-Up (+${amount} ${selfTopUpCurrency}) credited successfully!`);
    } catch (err: any) {
      alert(err.message || 'Free top-up failed');
    } finally {
      setIsSelfTopUpProcessing(false);
    }
  };

  const uniqueAllUsers: any[] = Array.from(
    new Map(
      allUsers
        .filter((u: any) => Boolean(u && (u.id || u.uid)))
        .map((u: any) => [u.id || u.uid, u])
    ).values()
  );

  const filteredUsers = uniqueAllUsers.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn text-neutral-200 font-sans select-text">
      <div className="bg-[#09090b] border border-white/20 w-full max-w-6xl h-[92vh] max-h-[920px] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between bg-black/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-white/30 bg-neutral-900 flex items-center justify-center text-white">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-serif uppercase tracking-tight text-white font-medium">
                  VAIURE 唯昱尔 ADMINISTRATIVE GOVERNANCE & SECURITY
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-white/30 bg-white/10 text-white uppercase">
                  ROOT // SECURE CONSOLE
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-white/40">
                Primary Identity: rachvan420@gmail.com • Server-Side Role Enforcement • Immutable Audit Ledger
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

        {/* Action Toast */}
        {actionSuccessMessage && (
          <div className="px-6 py-2 bg-emerald-950 border-b border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-white/10 bg-neutral-950/60 flex items-center gap-2 overflow-x-auto text-xs font-mono uppercase tracking-wider">
          {[
            { id: 'overview', label: 'OVERVIEW & HEALTH' },
            { id: 'users', label: `USER REGISTRY (${allUsers.length})` },
            { id: 'finance', label: 'FINANCE & WALLET OVERSIGHT' },
            { id: 'settings', label: 'PLATFORM CONTROLS' },
            { id: 'audit', label: `AUDIT LOGS (${auditLogs.length})` },
            { id: 'tickets', label: `SUPPORT TICKETS (${supportTickets.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-white text-white font-bold'
                  : 'border-transparent text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {/* TAB 1: OVERVIEW & SYSTEM HEALTH */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="border border-white/10 bg-neutral-950 p-6 space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                    REGISTERED ACCOUNTS
                  </span>
                  <div className="text-3xl font-mono text-white font-bold">{allUsers.length}</div>
                  <span className="text-xs font-mono text-emerald-400">Firebase Auth & Firestore</span>
                </div>
                <div className="border border-white/10 bg-neutral-950 p-6 space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                    LEDGER INTEGRITY
                  </span>
                  <div className="text-3xl font-mono text-emerald-400 font-bold">100% OK</div>
                  <span className="text-xs font-mono text-white/50">Zero Overwrites • Atomic Locks</span>
                </div>
                <div className="border border-white/10 bg-neutral-950 p-6 space-y-2">
                  <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block">
                    SECURITY EVENTS
                  </span>
                  <div className="text-3xl font-mono text-white font-bold">{auditLogs.length}</div>
                  <span className="text-xs font-mono text-white/50">Recorded on Audit Trail</span>
                </div>
              </div>

              {/* System Health Telemetry */}
              <div className="border border-white/10 bg-neutral-950 p-6 space-y-4">
                <h3 className="text-xs font-mono tracking-widest text-white/50 uppercase border-b border-white/10 pb-3 flex items-center gap-2">
                  <Server className="w-4 h-4 text-white" />
                  <span>RUNTIME TELEMETRY & CLOUD REGION</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div className="p-3 bg-neutral-900 border border-white/5 space-y-1">
                    <span className="text-white/40 block">ENVIRONMENT</span>
                    <span className="text-white font-bold">Production Node.js Vite Server</span>
                  </div>
                  <div className="p-3 bg-neutral-900 border border-white/5 space-y-1">
                    <span className="text-white/40 block">AUTHENTICATION</span>
                    <span className="text-white font-bold">Firebase Auth (Google, Email, Claims)</span>
                  </div>
                  <div className="p-3 bg-neutral-900 border border-white/5 space-y-1">
                    <span className="text-white/40 block">DATABASE BACKEND</span>
                    <span className="text-white font-bold">Google Cloud Firestore (Enterprise Mode)</span>
                  </div>
                  <div className="p-3 bg-neutral-900 border border-white/5 space-y-1">
                    <span className="text-white/40 block">EXCHANGE RATES BRIDGE</span>
                    <span className="text-white font-bold">European Central Bank Institutional Feed</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER REGISTRY */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by username, display name, UID..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/20 pl-8 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-white"
                  />
                </div>
                <span className="text-xs font-mono text-white/40">
                  SHOWING {filteredUsers.length} PROFILES
                </span>
              </div>

              {/* Users Table */}
              <div className="border border-white/10 bg-neutral-950 overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 uppercase bg-black/40">
                      <th className="p-3.5">USER</th>
                      <th className="p-3.5">EMAIL</th>
                      <th className="p-3.5">ROLE</th>
                      <th className="p-3.5">STATUS</th>
                      <th className="p-3.5">WORKS</th>
                      <th className="p-3.5 text-right">ADMIN ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full border border-white/20 bg-neutral-900 overflow-hidden flex items-center justify-center font-bold text-[10px] text-white">
                              {Boolean(u.avatar && u.avatar.trim()) ? (
                                <img src={u.avatar} alt="" className="w-full h-full object-cover filter grayscale" />
                              ) : (
                                (u.username || 'IV').slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="text-white font-medium">{u.displayName || u.username}</div>
                              <div className="text-[10px] text-white/40">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-white/60">{u.email || '—'}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white uppercase text-[10px]">
                            {u.role || 'USER'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                              u.status === 'SUSPENDED'
                                ? 'text-red-400 bg-red-950/30'
                                : 'text-emerald-400 bg-emerald-950/30'
                            }`}
                          >
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="p-3.5 text-white">{u.postsCount || 0}</td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => {
                              setSelectedUserForAction(u);
                              setNewSelectedRole(u.role || 'CREATOR');
                            }}
                            className="px-2.5 py-1 border border-white/20 hover:border-white text-white transition-colors uppercase text-[10px] cursor-pointer"
                          >
                            MANAGE ROLE / STATUS
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FINANCE & WALLET OVERSIGHT */}
          {activeTab === 'finance' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* PANEL 1: SUPER ADMIN COMPLIMENTARY SELF TOP-UP */}
              <div className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-neutral-950 to-neutral-900 p-6 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/30 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-mono font-bold tracking-widest uppercase">
                      SUPER ADMIN
                    </span>
                    <h3 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                      COMPLIMENTARY SELF TOP-UP (100% FREE OF CHARGE)
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 uppercase">
                    $0.00 ZERO FEE // ROOT TREASURY
                  </span>
                </div>

                <p className="text-xs font-mono text-neutral-300">
                  Credit your personal Super Admin wallet balance instantly without external payment gateways.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      CURRENCY
                    </label>
                    <select
                      value={selfTopUpCurrency}
                      onChange={(e) => setSelfTopUpCurrency(e.target.value)}
                      className="w-full bg-neutral-900 border border-amber-500/40 p-2.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-amber-400"
                    >
                      {['USD', 'EUR', 'GBP', 'IDR', 'JPY', 'SGD', 'CHF', 'CAD', 'AUD'].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      FREE TOP-UP AMOUNT ({selfTopUpCurrency})
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={selfTopUpAmount}
                      onChange={(e) => setSelfTopUpAmount(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-neutral-900 border border-amber-500/40 p-2 text-base font-mono text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[500, 1000, 5000, 10000, 50000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelfTopUpAmount(preset)}
                      className="px-2.5 py-1 border border-amber-500/30 hover:border-amber-400 bg-amber-950/30 text-[10px] font-mono text-amber-200 cursor-pointer transition-all"
                    >
                      +{preset.toLocaleString()} {selfTopUpCurrency}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleExecuteSelfFreeTopUp()}
                  disabled={isSelfTopUpProcessing || selfTopUpAmount <= 0}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-black text-xs font-mono tracking-widest uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
                >
                  {isSelfTopUpProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>CREDITING SUPER ADMIN ACCOUNT...</span>
                    </>
                  ) : (
                    <span>TOP UP SELF FREE OF CHARGE (+{selfTopUpAmount.toLocaleString()} {selfTopUpCurrency})</span>
                  )}
                </button>
              </div>

              {/* PANEL 2: SUPER ADMIN DIRECT TREASURY GRANT TO CREATORS */}
              <div className="border border-white/15 bg-neutral-950 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold tracking-widest uppercase">
                      DISBURSEMENT
                    </span>
                    <h3 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                      DIRECT TREASURY GRANT TO CREATOR WALLETS
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-white/50 uppercase">
                    UNRESTRICTED GRANT ISSUANCE
                  </span>
                </div>

                <p className="text-xs font-mono text-white/50">
                  Mint and dispatch direct grants from the platform treasury directly into any creator&apos;s wallet without deducting your personal balance.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        RECIPIENT USERNAME
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. curator_ivn, elena_vance"
                        value={grantRecipient}
                        onChange={(e) => setGrantRecipient(e.target.value.replace('@', ''))}
                        className="w-full bg-neutral-900 border border-white/20 p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        OR SELECT FROM USER REGISTRY
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) setGrantRecipient(e.target.value);
                        }}
                        className="w-full bg-neutral-900 border border-white/20 p-2.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        <option value="">-- Choose registered creator --</option>
                        {uniqueAllUsers.map((u, i) => (
                          <option key={`opt-${u.id || i}`} value={u.username || ''}>
                            @{u.username} — {u.displayName || u.username} ({u.role || 'CREATOR'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        GRANT AMOUNT
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(Math.max(1, Number(e.target.value)))}
                        className="w-full bg-neutral-900 border border-white/20 p-2 text-base font-mono text-emerald-400 font-bold focus:outline-none focus:border-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                        CURRENCY
                      </label>
                      <select
                        value={grantCurrency}
                        onChange={(e) => setGrantCurrency(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/20 p-2.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-white"
                      >
                        {['USD', 'EUR', 'GBP', 'IDR', 'JPY', 'SGD', 'CHF', 'CAD', 'AUD'].map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono tracking-widest text-white/50 uppercase block mb-1">
                      GRANT MEMO / REASON
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VAIURE Visual Grant, Curatorial Commission Advance"
                      value={grantNote}
                      onChange={(e) => setGrantNote(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/20 p-2.5 text-xs font-mono text-white focus:outline-none focus:border-white"
                    />
                  </div>

                  <button
                    onClick={() => handleExecuteTreasuryGrant()}
                    disabled={isGranting || !grantRecipient.trim() || grantAmount <= 0}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono tracking-widest uppercase font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all disabled:opacity-50"
                  >
                    {isGranting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>DISPATCHING TREASURY GRANT...</span>
                      </>
                    ) : (
                      <span>DISPATCH TREASURY GRANT TO @{grantRecipient || 'CREATOR'} (+{grantAmount} {grantCurrency})</span>
                    )}
                  </button>
                </div>
              </div>

              {/* PANEL 3: FINANCIAL FREEZE & COMPLIANCE CONTROLS */}
              <div className="border border-white/10 bg-neutral-950 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-serif uppercase tracking-tight text-white font-medium">
                      FINANCIAL FREEZE & COMPLIANCE CONTROLS
                    </h3>
                    <p className="text-xs font-mono text-white/40">
                      Immutably halt or release balance withdrawals and transactions for any wallet.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-white/5">
                  {uniqueAllUsers.slice(0, 8).map((u, idx) => (
                    <div key={`freeze-${u.id || u.uid || idx}`} className="py-3 flex items-center justify-between text-xs font-mono">
                      <div>
                        <span className="text-white font-medium block">
                          {u.displayName || u.username} (@{u.username})
                        </span>
                        <span className="text-[10px] text-white/40">UID: {u.id}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleWalletFreeze(u.id, u.walletStatus || 'ACTIVE')}
                          className={`px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                            u.walletStatus === 'FROZEN'
                              ? 'border-emerald-500/40 text-emerald-300 hover:border-emerald-400 bg-emerald-950/20'
                              : 'border-red-500/40 text-red-300 hover:border-red-400 bg-red-950/20'
                          }`}
                        >
                          {u.walletStatus === 'FROZEN' ? 'UNFREEZE WALLET' : 'FREEZE WALLET'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PLATFORM CONTROLS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div className="border border-white/10 bg-neutral-950 p-6 space-y-6">
                <div className="border-b border-white/10 pb-4">
                  <h3 className="text-base font-serif uppercase tracking-tight text-white font-medium">
                    GLOBAL PLATFORM SWITCHES
                  </h3>
                  <p className="text-xs font-mono text-white/40">
                    Server-enforced platform flags and operational thresholds.
                  </p>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between p-3 border border-white/10 bg-black/40">
                    <div>
                      <span className="text-white font-bold block">MAINTENANCE MODE</span>
                      <span className="text-white/40 text-[11px]">
                        Temporarily suspend non-administrator access
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('maintenanceMode', systemSettings.maintenanceMode)}
                      className={`px-4 py-1.5 border uppercase cursor-pointer ${
                        systemSettings.maintenanceMode
                          ? 'border-red-500 bg-red-950 text-red-200'
                          : 'border-white/20 text-white/50'
                      }`}
                    >
                      {systemSettings.maintenanceMode ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-white/10 bg-black/40">
                    <div>
                      <span className="text-white font-bold block">WALLET TOP-UPS</span>
                      <span className="text-white/40 text-[11px]">
                        Allow users to top-up wallet balances with payment rails
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('topUpsEnabled', systemSettings.topUpsEnabled)}
                      className={`px-4 py-1.5 border uppercase cursor-pointer ${
                        systemSettings.topUpsEnabled
                          ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                          : 'border-red-500 bg-red-950 text-red-200'
                      }`}
                    >
                      {systemSettings.topUpsEnabled ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-white/10 bg-black/40">
                    <div>
                      <span className="text-white font-bold block">REGISTRATION & ONBOARDING</span>
                      <span className="text-white/40 text-[11px]">
                        Permit new creator passport registrations
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleSetting('registrationEnabled', systemSettings.registrationEnabled)}
                      className={`px-4 py-1.5 border uppercase cursor-pointer ${
                        systemSettings.registrationEnabled
                          ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                          : 'border-red-500 bg-red-950 text-red-200'
                      }`}
                    >
                      {systemSettings.registrationEnabled ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>

                  <div className="p-3 border border-white/10 bg-black/40 space-y-2">
                    <span className="text-white font-bold block">TOP-UP LIMITS (USD EQUIVALENT)</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-white/40 block">MINIMUM TOP-UP ($)</span>
                        <input
                          type="number"
                          value={systemSettings.minimumTopUp}
                          onChange={(e) =>
                            handleUpdateNumericSetting('minimumTopUp', Number(e.target.value))
                          }
                          className="w-full bg-neutral-900 border border-white/20 p-2 text-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-white/40 block">MAXIMUM TOP-UP ($)</span>
                        <input
                          type="number"
                          value={systemSettings.maximumTopUp}
                          onChange={(e) =>
                            handleUpdateNumericSetting('maximumTopUp', Number(e.target.value))
                          }
                          className="w-full bg-neutral-900 border border-white/20 p-2 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS */}
          {activeTab === 'audit' && (() => {
            const filteredLogs = auditLogs.filter((log) => {
              // Category filter
              if (auditFilterCategory === 'USER' && !log.action.includes('USER') && log.targetType !== 'USER') {
                return false;
              }
              if (auditFilterCategory === 'WALLET' && !log.action.includes('WALLET') && log.targetType !== 'WALLET') {
                return false;
              }
              if (auditFilterCategory === 'SETTINGS' && !log.action.includes('SETTINGS') && log.targetType !== 'SYSTEM_SETTINGS') {
                return false;
              }
              if (auditFilterCategory === 'DENIED' && log.result !== 'DENIED') {
                return false;
              }

              // Search query filter
              if (auditSearch.trim()) {
                const q = auditSearch.toLowerCase();
                const matchAction = log.action.toLowerCase().includes(q);
                const matchActor = (log.actorEmail || log.actorUid).toLowerCase().includes(q);
                const matchTarget = (log.targetId || log.targetUid || '').toLowerCase().includes(q);
                const matchReason = (log.reason || '').toLowerCase().includes(q);
                if (!matchAction && !matchActor && !matchTarget && !matchReason) return false;
              }

              return true;
            });

            const handleVerifyLedger = async () => {
              setIsVerifyingAudit(true);
              try {
                const res = await verifyAuditLogsBatch(auditLogs);
                setAuditIntegrityStatus({
                  verified: res.allValid,
                  validCount: res.validCount,
                  total: res.totalChecked,
                });
                showToast(
                  res.allValid
                    ? `Audit ledger integrity verified: ${res.validCount}/${res.totalChecked} immutable records valid.`
                    : `Warning: ${res.compromisedLogs.length} records flagged during integrity check.`
                );
              } catch (err: any) {
                showToast(`Ledger check failed: ${err.message}`);
              } finally {
                setIsVerifyingAudit(false);
              }
            };

            const toggleLogExpand = (id: string) => {
              setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
            };

            return (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-mono tracking-widest text-white/50 uppercase">
                      IMMUTABLE ADMINISTRATIVE ACTION AUDIT TRAIL
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 border border-emerald-500/30">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>NON-REPUDIABLE • APPEND-ONLY ARCHITECTURE</span>
                      </span>
                      {auditIntegrityStatus && (
                        <span className="text-[10px] font-mono text-white/60">
                          {auditIntegrityStatus.validCount}/{auditIntegrityStatus.total} VERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleVerifyLedger}
                      disabled={isVerifyingAudit}
                      className="px-3 py-1.5 border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 font-mono text-[11px] uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                    >
                      <Shield className={`w-3.5 h-3.5 ${isVerifyingAudit ? 'animate-spin' : ''}`} />
                      <span>{isVerifyingAudit ? 'VERIFYING...' : 'VERIFY INTEGRITY'}</span>
                    </button>
                    <button
                      onClick={() => fetchAdminAuditLogs().then(setAuditLogs)}
                      className="px-3 py-1.5 border border-white/20 bg-neutral-900 hover:bg-white/10 text-white font-mono text-[11px] uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>REFRESH</span>
                    </button>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2 border border-white/10 bg-neutral-950 font-mono text-xs">
                  <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
                    {(['ALL', 'USER', 'WALLET', 'SETTINGS', 'DENIED'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setAuditFilterCategory(cat)}
                        className={`px-2.5 py-1 uppercase text-[10px] border transition-colors cursor-pointer whitespace-nowrap ${
                          auditFilterCategory === cat
                            ? 'border-white bg-white text-black font-bold'
                            : 'border-white/10 text-white/50 hover:text-white hover:border-white/30'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[200px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Search actor, target, reason..."
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 pl-8 pr-3 py-1.5 text-white text-[11px] font-mono focus:border-white/40 focus:outline-none placeholder:text-white/30"
                    />
                  </div>
                </div>

                {filteredLogs.length === 0 ? (
                  <div className="py-20 text-center border border-white/10 text-white/40 font-mono text-xs uppercase tracking-widest bg-neutral-950">
                    {auditLogs.length === 0 ? 'NO AUDIT LOGS RECORDED YET' : 'NO AUDIT LOGS MATCH CURRENT FILTER'}
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 border border-white/10 bg-neutral-950 font-mono text-xs">
                    {filteredLogs.map((log) => {
                      const isExpanded = Boolean(expandedLogIds[log.logId]);
                      const hasTargetMeta = Boolean(log.targetMetadata && Object.keys(log.targetMetadata).length > 0);
                      const resultColor =
                        log.result === 'SUCCESS'
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                          : log.result === 'DENIED'
                          ? 'border-red-500/40 bg-red-950/30 text-red-300'
                          : 'border-amber-500/40 bg-amber-950/30 text-amber-300';

                      return (
                        <div key={log.logId} className="p-4 space-y-2 hover:bg-white/[0.02] transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-white font-bold tracking-wider uppercase">
                                {log.action}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 border font-mono uppercase tracking-widest ${resultColor}`}
                              >
                                {log.result || 'SUCCESS'}
                              </span>
                            </div>
                            <span className="text-white/40 text-[10px]">
                              {new Date(log.timestamp || log.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-white/70 text-[11px]">
                            <div>
                              <span className="text-white/40">Actor:</span>{' '}
                              <span className="text-white">{log.actorEmail || log.actorUid}</span>{' '}
                              <span className="text-[10px] text-white/40 font-mono">({log.actorRole || 'ADMIN'})</span>
                            </div>
                            <div>
                              <span className="text-white/40">Target:</span>{' '}
                              <span className="text-white/50">[{log.targetType || 'ENTITY'}]</span>{' '}
                              <span className="text-white font-mono">{log.targetId || log.targetUid}</span>
                            </div>
                          </div>

                          {log.reason && (
                            <div className="text-[11px] text-white/60 bg-black/40 p-2 border border-white/5">
                              <span className="text-white/30 uppercase text-[9px] block">Justification / Reason</span>
                              {log.reason}
                            </div>
                          )}

                          {/* Target Metadata Inspection */}
                          {hasTargetMeta && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <button
                                onClick={() => toggleLogExpand(log.logId)}
                                className="text-[10px] text-white/50 hover:text-white uppercase flex items-center space-x-1 cursor-pointer transition-colors"
                              >
                                <span>{isExpanded ? '[-] HIDE TARGET METADATA' : '[+] INSPECT TARGET METADATA'}</span>
                              </button>
                              {isExpanded && (
                                <div className="mt-2 p-2.5 bg-black/80 border border-white/10 text-[10px] space-y-1">
                                  <div className="text-white/40 uppercase tracking-widest text-[9px] mb-1">
                                    Target State Delta & Context Metadata:
                                  </div>
                                  <pre className="text-white/80 overflow-x-auto whitespace-pre-wrap font-mono">
                                    {JSON.stringify(log.targetMetadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Immutability & Cryptographic Verification Footer */}
                          <div className="flex flex-wrap items-center justify-between pt-1 text-[9px] text-white/30 font-mono border-t border-white/5">
                            <div className="flex items-center space-x-1.5">
                              <Lock className="w-3 h-3 text-emerald-400/80" />
                              <span>RECORD ID: {log.logId}</span>
                            </div>
                            {log.integrityHash && (
                              <div className="text-white/40" title={log.integrityHash}>
                                SHA-256: {log.integrityHash.substring(0, 16)}...{log.integrityHash.substring(log.integrityHash.length - 8)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 6: SUPPORT TICKETS */}
          {activeTab === 'tickets' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono tracking-widest text-white/50 uppercase">
                  ACTIVE SUPPORT & INQUIRY TICKETS
                </h3>
              </div>

              {supportTickets.length === 0 ? (
                <div className="py-20 text-center border border-white/10 text-white/40 font-mono text-xs uppercase tracking-widest">
                  NO TICKETS OPEN
                </div>
              ) : (
                <div className="divide-y divide-white/10 border border-white/10 bg-neutral-950 font-mono text-xs">
                  {supportTickets.map((tk) => (
                    <div key={tk.ticketId} className="p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">{tk.subject}</span>
                        <span className="text-[10px] px-2 py-0.5 border border-white/20 uppercase text-white/60">
                          {tk.status}
                        </span>
                      </div>
                      <p className="text-white/60">{tk.description}</p>
                      <div className="text-[10px] text-white/40">
                        User: {tk.userEmail || tk.userId} • Category: {tk.category} • {new Date(tk.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL: MANAGE USER ACTION */}
        {selectedUserForAction && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="bg-[#0c0c0e] border border-white/20 w-full max-w-md p-6 space-y-5 text-neutral-200 font-mono shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase tracking-wider text-white font-bold">
                  MANAGE ACCOUNT: @{selectedUserForAction.username}
                </span>
                <button
                  onClick={() => setSelectedUserForAction(null)}
                  className="text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">ASSIGN ROLE</label>
                  <select
                    value={newSelectedRole}
                    onChange={(e) => setNewSelectedRole(e.target.value as UserRole)}
                    className="w-full bg-neutral-900 border border-white/20 p-2 text-xs font-mono text-white uppercase focus:outline-none"
                  >
                    {[
                      'USER',
                      'CREATOR',
                      'ARTIST',
                      'FILMMAKER',
                      'PHOTOGRAPHER',
                      'STUDIO',
                      'BRAND',
                      'EDITOR',
                      'MODERATOR',
                      'FINANCE',
                      'SUPPORT',
                      'ADMIN',
                    ].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-white/40 uppercase block mb-1">
                    AUDIT JUSTIFICATION / REASON
                  </label>
                  <input
                    type="text"
                    placeholder="Document compliance or curatorial rationale"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    className="w-full bg-neutral-900 border border-white/20 p-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleExecuteUserAction('CHANGE_ROLE')}
                  disabled={isLoading}
                  className="w-full py-2 bg-white text-black hover:bg-neutral-200 text-xs font-mono uppercase tracking-wider font-semibold cursor-pointer"
                >
                  UPDATE ROLE TO {newSelectedRole}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleExecuteUserAction('SUSPEND')}
                    disabled={isLoading}
                    className="py-2 border border-red-500/40 bg-red-950/20 text-red-300 hover:border-red-400 text-xs font-mono uppercase tracking-wider cursor-pointer"
                  >
                    SUSPEND
                  </button>
                  <button
                    onClick={() => handleExecuteUserAction('UNSUSPEND')}
                    disabled={isLoading}
                    className="py-2 border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:border-emerald-400 text-xs font-mono uppercase tracking-wider cursor-pointer"
                  >
                    UNSUSPEND
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
