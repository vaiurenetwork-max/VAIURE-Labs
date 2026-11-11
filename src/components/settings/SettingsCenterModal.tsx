import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Eye,
  Bell,
  Coins,
  Palette,
  Check,
  AlertTriangle,
  LogOut,
  Smartphone,
  Laptop,
  Globe,
  Lock,
  Trash2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Sliders,
} from 'lucide-react';
import { UserProfile } from '../../types/social';
import { UserSession, UserSettings } from '../../types/settings';
import {
  SUPPORTED_CURRENCIES,
  fetchLiveExchangeRates,
  formatCurrency,
  formatTimeAgo,
} from '../../services/currencyService';
import {
  fetchUserSessions,
  revokeIndividualSession,
  signOutOtherSessions,
  signOutEverywhere,
} from '../../services/sessionService';
import {
  fetchUserSettings,
  saveUserSettings,
  requestAccountDeletion,
  DEFAULT_USER_SETTINGS,
} from '../../services/settingsService';
import { ChangeUsernameModal } from './ChangeUsernameModal';
import { useLanguage, Language } from '../../services/i18n';

interface SettingsCenterModalProps {
  isOpen: boolean;
  currentUser: UserProfile;
  onClose: () => void;
  onOpenWallet: () => void;
  onOpenConverter: () => void;
  onSignOut: () => void;
  onUsernameChanged?: (newUsername: string, lastUsernameChangeAt: string) => void;
}

export const SettingsCenterModal: React.FC<SettingsCenterModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onOpenWallet,
  onOpenConverter,
  onSignOut,
  onUsernameChanged,
}) => {
  const [activeTab, setActiveTab] = useState<
    'account' | 'security' | 'privacy' | 'notifications' | 'currency' | 'appearance'
  >('account');

  const [isChangeUsernameOpen, setIsChangeUsernameOpen] = useState(false);
  const { language: currentLang, setLanguage, t } = useLanguage();

  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_USER_SETTINGS,
    uid: currentUser.id,
  });

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [exchangeRateInfo, setExchangeRateInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security modals inside settings
  const [showSignOutEverywhereConfirm, setShowSignOutEverywhereConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [deletionRequested, setDeletionRequested] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUser.id) return;

    // Load settings
    fetchUserSettings(currentUser.id).then(setSettings);

    // Load active sessions
    fetchUserSessions(currentUser.id).then(setSessions);

    // Load live exchange rate reference
    fetchLiveExchangeRates('USD').then(setExchangeRateInfo);
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleSaveSettings = async (partial: Partial<UserSettings>) => {
    setIsLoading(true);
    try {
      const updated = await saveUserSettings(currentUser.id, partial);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    await revokeIndividualSession(currentUser.id, sessionId);
    setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
  };

  const handleSignOutOtherDevices = async () => {
    await signOutOtherSessions(currentUser.id);
    const refreshed = await fetchUserSessions(currentUser.id);
    setSessions(refreshed);
  };

  const handleSignOutEverywhere = async () => {
    setShowSignOutEverywhereConfirm(false);
    await signOutEverywhere(currentUser.id);
    onSignOut();
    onClose();
  };

  const handleConfirmAccountDeletion = async () => {
    await requestAccountDeletion(currentUser.id, deletionReason);
    setDeletionRequested(true);
    setShowDeleteConfirm(false);
  };

  const tabs = [
    { id: 'account', label: 'ACCOUNT', icon: User },
    { id: 'security', label: 'SECURITY', icon: Shield },
    { id: 'privacy', label: 'PRIVACY', icon: Eye },
    { id: 'notifications', label: 'NOTIFICATIONS', icon: Bell },
    { id: 'currency', label: 'CURRENCY', icon: Coins },
    { id: 'appearance', label: 'PREFERENCES', icon: Palette },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6 md:p-10 select-text overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#07070a] border border-white/15 my-auto text-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-neutral-950/80">
          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase block">
              SETTINGS
            </span>
            <h2 className="text-xl font-serif font-light uppercase tracking-tight text-white">
              SETTINGS & PREFERENCES
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {saveSuccess && (
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> SAVED
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Layout: Sidebar Nav + Tab Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Vertical Navigation Bar */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-white/10 p-3 sm:p-4 bg-black/40 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible flex-shrink-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-mono tracking-widest uppercase transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-black font-semibold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Tab Area */}
          <div className="flex-1 p-6 sm:p-8 md:p-10 overflow-y-auto space-y-8">
            {/* 1. ACCOUNT */}
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    ACCOUNT IDENTITY
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    Primary public record and access coordinates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 border border-white/10 bg-neutral-950/60">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      DISPLAY NAME
                    </span>
                    <p className="text-sm font-serif uppercase text-white font-medium">
                      {currentUser.displayName || 'Creator'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      USERNAME
                    </span>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono text-white/90">@{currentUser.username}</p>
                      <button
                        type="button"
                        onClick={() => setIsChangeUsernameOpen(true)}
                        className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 uppercase tracking-wider underline flex items-center gap-1 cursor-pointer"
                      >
                        CHANGE HANDLE
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      EMAIL COORDINATE
                    </span>
                    <p className="text-xs font-mono text-white/90">
                      {currentUser.role === 'GUEST' ? 'Unauthenticated Session' : currentUser.id ? 'Authenticated' : '—'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      ACCOUNT TIER & ROLE
                    </span>
                    <span className="inline-block px-2.5 py-1 bg-white/10 border border-white/20 text-[10px] font-mono text-white uppercase tracking-wider">
                      {currentUser.role}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      CURATORIAL VERIFICATION
                    </span>
                    <p className="text-xs font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> VERIFIED CREATOR
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono tracking-widest text-white/40 uppercase block mb-1">
                      WALLET CONNECTION
                    </span>
                    <button
                      onClick={onOpenWallet}
                      className="text-xs font-mono text-white underline hover:text-white/80 uppercase flex items-center gap-1"
                    >
                      <span>OPEN WALLET DASHBOARD</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Account Deletion Section */}
                <div className="pt-8 border-t border-red-500/20 space-y-4">
                  <div>
                    <h4 className="text-base font-serif uppercase tracking-tight text-red-300">
                      DELETE ACCOUNT
                    </h4>
                    <p className="text-xs text-neutral-400 font-light leading-relaxed mt-1">
                      Permanent account deactivation. Upon request, your account enters a 30-day grace period.
                      Financial transaction records and immutable ledger proofs are legally retained in compliance with international accounting regulations.
                    </p>
                  </div>

                  {deletionRequested ? (
                    <div className="p-4 border border-amber-500/40 bg-amber-950/20 text-xs font-mono text-amber-200">
                      ACCOUNT CLOSURE PENDING — 30-DAY GRACE PERIOD ACTIVE.
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 border border-red-500/40 hover:border-red-500 bg-red-950/30 text-xs font-mono tracking-widest text-red-200 uppercase transition-colors"
                    >
                      REQUEST ACCOUNT DELETION
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. SECURITY */}
            {activeTab === 'security' && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    SECURITY & SESSION MANAGEMENT
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    Active device registries, two-factor authentication, and multi-device termination.
                  </p>
                </div>

                {/* Two Factor Toggle */}
                <div className="p-5 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-sm font-serif uppercase text-white">
                      TWO-FACTOR AUTHENTICATION (2FA)
                    </span>
                    <p className="text-xs font-light text-neutral-400">
                      Require an additional security code when authenticating on unfamiliar devices.
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      handleSaveSettings({
                        twoFactorEnabled: !settings.twoFactorEnabled,
                      })
                    }
                    className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition-colors ${
                      settings.twoFactorEnabled
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-white/20 text-white/50 hover:text-white'
                    }`}
                  >
                    {settings.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {/* Active Sessions List */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <span className="text-xs font-mono tracking-widest text-white/50 uppercase">
                      ACTIVE SESSIONS & DEVICES ({sessions.length})
                    </span>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSignOutOtherDevices}
                        className="text-[11px] font-mono tracking-wider text-white/60 hover:text-white uppercase transition-colors"
                      >
                        SIGN OUT OTHER DEVICES
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setShowSignOutEverywhereConfirm(true)}
                        className="text-[11px] font-mono tracking-wider text-red-400 hover:text-red-300 uppercase transition-colors"
                      >
                        SIGN OUT EVERYWHERE
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {sessions.map((sess) => (
                      <div
                        key={sess.sessionId}
                        className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 border border-white/15 bg-neutral-900 flex items-center justify-center flex-shrink-0">
                            {sess.deviceType === 'mobile' ? (
                              <Smartphone className="w-4 h-4 text-white/70" />
                            ) : (
                              <Laptop className="w-4 h-4 text-white/70" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-serif uppercase tracking-tight text-white font-medium">
                                {sess.deviceName}
                              </span>
                              {sess.current && (
                                <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-500/50 text-[9px] font-mono text-emerald-300 uppercase">
                                  CURRENT SESSION
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-white/40 mt-0.5">
                              {sess.approximateLocation} · Active {formatTimeAgo(sess.lastActiveAt)}
                            </p>
                          </div>
                        </div>

                        {!sess.current && sess.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleRevokeSession(sess.sessionId)}
                            className="px-3 py-1 border border-white/20 hover:border-red-400 hover:text-red-300 text-[10px] font-mono uppercase tracking-wider text-white/60 transition-colors"
                          >
                            REVOKE
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. PRIVACY */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    PRIVACY & PERMISSION ARCHITECTURE
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    Control who can discover, message, follow, and observe your activity.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Profile Visibility */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        PROFILE VISIBILITY
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Who can access your monograph and curated works.
                      </p>
                    </div>

                    <select
                      value={settings.profileVisibility}
                      onChange={(e: any) =>
                        handleSaveSettings({ profileVisibility: e.target.value })
                      }
                      className="bg-black border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none"
                    >
                      <option value="PUBLIC">PUBLIC</option>
                      <option value="CREATORS_ONLY">CREATORS ONLY</option>
                      <option value="PRIVATE">PRIVATE</option>
                    </select>
                  </div>

                  {/* Messaging */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        WHO CAN DIRECT MESSAGE
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Direct dispatches and collaboration negotiations.
                      </p>
                    </div>

                    <select
                      value={settings.whoCanMessage}
                      onChange={(e: any) =>
                        handleSaveSettings({ whoCanMessage: e.target.value })
                      }
                      className="bg-black border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none"
                    >
                      <option value="EVERYONE">EVERYONE</option>
                      <option value="FOLLOWED_ONLY">FOLLOWED CREATORS ONLY</option>
                      <option value="NO_ONE">NO ONE</option>
                    </select>
                  </div>

                  {/* Comments */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        WHO CAN COMMENT
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Editorial observations on your published works.
                      </p>
                    </div>

                    <select
                      value={settings.whoCanComment}
                      onChange={(e: any) =>
                        handleSaveSettings({ whoCanComment: e.target.value })
                      }
                      className="bg-black border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none"
                    >
                      <option value="EVERYONE">EVERYONE</option>
                      <option value="FOLLOWED_ONLY">FOLLOWED ONLY</option>
                      <option value="VERIFIED_ONLY">VERIFIED ONLY</option>
                    </select>
                  </div>

                  {/* Online Status */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        ONLINE ACTIVITY STATUS
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Indicate active state in direct dispatch rooms.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleSaveSettings({ onlineStatus: !settings.onlineStatus })
                      }
                      className={`px-3 py-1 text-xs font-mono uppercase border ${
                        settings.onlineStatus
                          ? 'border-emerald-500 text-emerald-300'
                          : 'border-white/20 text-white/50'
                      }`}
                    >
                      {settings.onlineStatus ? 'VISIBLE' : 'HIDDEN'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. NOTIFICATIONS */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    NOTIFICATION DISPATCH CONTROLS
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    Granular preferences for social alerts, security warnings, and wallet transactions.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'likes', label: 'Likes & Appreciation' },
                    { key: 'comments', label: 'Comments & Discussions' },
                    { key: 'replies', label: 'Replies to Observations' },
                    { key: 'follows', label: 'New Followers' },
                    { key: 'mentions', label: 'Mentions (@username)' },
                    { key: 'reposts', label: 'Reposts with Quotes' },
                    { key: 'messages', label: 'Direct Dispatches' },
                    { key: 'collabRequests', label: 'Collaboration Proposals' },
                    { key: 'editorialSelections', label: 'Curatorial Open Call Status' },
                    { key: 'securityAlerts', label: 'Security & Sign-in Warnings' },
                    { key: 'transactionAlerts', label: 'Financial & Ledger Alerts' },
                    { key: 'walletAlerts', label: 'Top-Up & Payout Confirmations' },
                    { key: 'systemAnnouncements', label: 'Platform Announcements' },
                    { key: 'emailDigest', label: 'Weekly Editorial Email Digest' },
                  ].map(({ key, label }) => {
                    const currentVal = (settings.notifications as any)?.[key] ?? true;
                    return (
                      <div
                        key={key}
                        onClick={() =>
                          handleSaveSettings({
                            notifications: {
                              ...settings.notifications,
                              [key]: !currentVal,
                            },
                          })
                        }
                        className="p-3.5 border border-white/10 bg-neutral-950/60 flex items-center justify-between cursor-pointer hover:border-white/25 transition-colors"
                      >
                        <span className="text-xs font-mono uppercase text-neutral-300">
                          {label}
                        </span>
                        <div
                          className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                            currentVal
                              ? 'border-white bg-white text-black'
                              : 'border-white/30 bg-transparent'
                          }`}
                        >
                          {currentVal && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. CURRENCY & RATES */}
            {activeTab === 'currency' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    CURRENCY & EXCHANGE RATES
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    International ISO 4217 currency selection, live institutional conversion benchmarks, and global converter.
                  </p>
                </div>

                {/* Live Benchmark Rate Banner */}
                {exchangeRateInfo && (
                  <div className="p-5 border border-white/15 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-mono tracking-widest uppercase text-white">
                          LIVE EXCHANGE RATE FEED
                        </span>
                      </div>
                      <p className="text-sm font-serif uppercase text-neutral-200">
                        1 USD ≈ {formatCurrency(exchangeRateInfo.rates?.IDR || 15820, 'IDR')}
                      </p>
                      <p className="text-[10px] font-mono text-white/40">
                        {exchangeRateInfo.provider} · RATE UPDATED {formatTimeAgo(exchangeRateInfo.fetchedAt)}
                      </p>
                    </div>

                    <button
                      onClick={onOpenConverter}
                      className="px-4 py-2 bg-white text-black hover:bg-neutral-200 text-xs font-mono tracking-widest uppercase font-semibold transition-colors flex items-center gap-2"
                    >
                      <span>CURRENCY CONVERTER</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Primary Platform Currency */}
                <div className="space-y-3">
                  <span className="text-xs font-mono tracking-widest text-white/50 uppercase block">
                    ACTIVE PLATFORM CURRENCY PREFERENCE
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {SUPPORTED_CURRENCIES.slice(0, 12).map((c) => (
                      <button
                        key={c.code}
                        onClick={() => handleSaveSettings({ currency: c.code })}
                        className={`p-3 border text-left flex flex-col justify-between transition-colors ${
                          settings.currency === c.code
                            ? 'border-white bg-white text-black font-semibold'
                            : 'border-white/15 bg-neutral-950/60 text-white/80 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono">{c.code}</span>
                          <span className="text-xs font-mono opacity-60">{c.symbol}</span>
                        </div>
                        <span className="text-[10px] truncate opacity-70 mt-2">
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. APPEARANCE & PREFERENCES */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-serif uppercase tracking-tight text-white mb-1">
                    {t('displayAndLocalization')}
                  </h3>
                  <p className="text-xs font-light text-neutral-400">
                    Language, interface density, motion ergonomics, and international formatting.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Language */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        {t('interfaceLanguage')}
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Separated from financial currency preferences.
                      </p>
                    </div>

                    <select
                      value={currentLang}
                      onChange={(e: any) => {
                        const newLang = e.target.value as Language;
                        setLanguage(newLang);
                        handleSaveSettings({ language: newLang });
                      }}
                      className="bg-black border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none cursor-pointer"
                    >
                      <option value="en">🇬🇧 ENGLISH (GLOBAL)</option>
                      <option value="id">🇮🇩 BAHASA INDONESIA</option>
                      <option value="zh">🇨🇳 中文 (CHINESE)</option>
                    </select>
                  </div>

                  {/* Reduced Motion */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        REDUCED MOTION
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Restrain cinematic fluid choreography and cursor momentum.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleSaveSettings({ reducedMotion: !settings.reducedMotion })
                      }
                      aria-label="Toggle Reduced Motion"
                      className={`touch-press touch-target-min px-4 py-2 text-xs font-mono uppercase border cursor-pointer ${
                        settings.reducedMotion
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/20 text-white/50 hover:border-white/50'
                      }`}
                    >
                      {settings.reducedMotion ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Autoplay Videos on Touch Devices */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        TOUCH AUTOPLAY
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Allow short-form vertical videos to play automatically on mobile networks.
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        handleSaveSettings({
                          animationIntensity:
                            settings.animationIntensity === 'SUBTLE' ? 'STANDARD' : 'SUBTLE',
                        })
                      }
                      aria-label="Toggle Touch Autoplay"
                      className={`touch-press touch-target-min px-4 py-2 text-xs font-mono uppercase border cursor-pointer ${
                        settings.animationIntensity !== 'SUBTLE'
                          ? 'border-white bg-white text-black font-semibold'
                          : 'border-white/20 text-white/50 hover:border-white/50'
                      }`}
                    >
                      {settings.animationIntensity !== 'SUBTLE' ? 'ENABLED' : 'PAUSED'}
                    </button>
                  </div>

                  {/* Density */}
                  <div className="p-4 border border-white/10 bg-neutral-950/60 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-widest text-white block">
                        INTERFACE DENSITY
                      </span>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Spatial proportion for feed galleries and monograph indexes.
                      </p>
                    </div>

                    <select
                      value={settings.interfaceDensity}
                      onChange={(e: any) =>
                        handleSaveSettings({ interfaceDensity: e.target.value })
                      }
                      className="bg-black border border-white/20 px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none"
                    >
                      <option value="COMPACT">COMPACT</option>
                      <option value="COMFORTABLE">COMFORTABLE</option>
                      <option value="EXPANSIVE">EXPANSIVE EDITORIAL</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal: Sign Out Everywhere */}
        {showSignOutEverywhereConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
            <div className="max-w-md w-full border border-red-500/40 bg-[#07070a] p-6 space-y-4 text-white">
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" />
                <span>SIGN OUT EVERYWHERE?</span>
              </div>
              <p className="text-xs text-neutral-300 font-light leading-relaxed">
                This action terminates all active sessions across all devices, phones, and browsers.
                You will be required to re-authenticate. Account data and portfolios remain preserved.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowSignOutEverywhereConfirm(false)}
                  className="px-4 py-2 border border-white/20 text-xs font-mono uppercase text-white/70"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSignOutEverywhere}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-mono uppercase font-semibold text-white"
                >
                  SIGN OUT EVERYWHERE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal: Delete Account */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
            <div className="max-w-lg w-full border border-red-500/50 bg-[#07070a] p-6 space-y-4 text-white">
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" />
                <span>CONFIRM ACCOUNT DELETION</span>
              </div>
              <p className="text-xs text-neutral-300 font-light leading-relaxed">
                Your account will be placed into a 30-day deactivation grace period.
                Public works, creator profile, and dispatches will be archived.
                Under statutory accounting requirements, immutable wallet transactions and financial logs are preserved.
              </p>
              <div>
                <label className="block text-[10px] font-mono text-white/50 uppercase mb-1">
                  OPTIONAL REASON FOR DEPARTURE
                </label>
                <textarea
                  rows={2}
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Tell us what could be improved..."
                  className="w-full bg-neutral-900 border border-white/15 p-2 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-white/20 text-xs font-mono uppercase text-white/70"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleConfirmAccountDeletion}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-xs font-mono uppercase font-semibold text-white"
                >
                  CONFIRM CLOSURE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Username Modal */}
        <ChangeUsernameModal
          isOpen={isChangeUsernameOpen}
          currentUser={currentUser}
          onClose={() => setIsChangeUsernameOpen(false)}
          onUsernameChanged={(newU, newT) => {
            onUsernameChanged?.(newU, newT);
          }}
        />
      </div>
    </div>
  );
};
