import React, { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, ShieldCheck, Sparkles, Check, AlertCircle } from 'lucide-react';
import {
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  sendResetPassword,
  validateUsername,
  checkUsernameAvailable,
  AccountType,
} from '../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('CREATOR');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUsernameBlur = async () => {
    if (!username.trim() || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    const val = validateUsername(username);
    if (!val.valid) {
      setError(val.error || 'Invalid username');
      setUsernameStatus('taken');
      return;
    }
    setUsernameStatus('checking');
    const available = await checkUsernameAvailable(username);
    if (available) {
      setUsernameStatus('available');
      setError(null);
    } else {
      setUsernameStatus('taken');
      setError(`@${username.toLowerCase()} is already taken. Please choose another handle.`);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      const profile = await loginWithGoogle();
      if (profile) {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('popup-closed-by-user') ||
        err?.message?.includes('cancelled-popup-request')
      ) {
        // User closed or dismissed the popup window — no console.error or harsh error banner needed
        return;
      }
      console.warn('Google Sign-In notice:', err?.message || err);
      setError(err?.message || 'Google authentication interrupted. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await loginWithEmail(email.trim(), password);
        if (onSuccess) onSuccess();
        onClose();
      } else if (mode === 'signup') {
        if (!email.trim() || !password || !username.trim() || !displayName.trim()) {
          throw new Error('Please complete all fields to establish your archive passport.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await registerWithEmail(email.trim(), password, username, displayName, accountType);
        setSuccessMessage('Archive passport initialized. Verification email dispatched.');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 800);
      } else if (mode === 'reset') {
        if (!email.trim()) {
          throw new Error('Please enter your email to receive recovery instructions.');
        }
        await sendResetPassword(email.trim());
        setSuccessMessage('Password reset dispatch sent to your inbox.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication error encountered.';
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('No active passport found with these credentials.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already associated with a VAIURE passport.');
      } else if (msg.includes('weak-password')) {
        setError('Passport security requires a minimum of 6 characters.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const accountTypes: AccountType[] = [
    'CREATOR',
    'ARTIST',
    'FILMMAKER',
    'PHOTOGRAPHER',
    'STUDIO',
    'BRAND',
    'EDITOR',
    'USER',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-[#0a0a0c] border border-white/15 text-[#ECECE9] p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-mono tracking-[0.28em] text-white/50 uppercase">
              AUTHENTICATION // PASSPORT
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif tracking-tight text-white uppercase">
            {mode === 'signin' && 'ACCESS THE ARCHIVE'}
            {mode === 'signup' && 'INITIALIZE PASSPORT'}
            {mode === 'reset' && 'PASSPORT RECOVERY'}
          </h2>
          <p className="text-xs text-white/50 mt-1 font-mono leading-relaxed">
            {mode === 'signin' && 'Sign in to publish editorial work, curate collections & dispatch collaborations.'}
            {mode === 'signup' && 'Create your canonical identity across the international VAIURE 唯昱尔 network.'}
            {mode === 'reset' && 'Enter your verified address to receive an access recovery key.'}
          </p>
        </div>

        {/* 1-Click Google Sign-In */}
        {mode !== 'reset' && (
          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/20 hover:border-white/40 transition-all text-xs font-mono tracking-wider text-white uppercase disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
              </svg>
              <span>CONTINUE WITH GOOGLE</span>
            </button>
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0a0a0c] px-3 text-[10px] font-mono tracking-widest text-white/40 uppercase">
                OR
              </span>
            </div>
          </div>
        )}

        {/* Error / Success Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/40 text-red-200 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-mono flex items-start gap-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              {/* Display Name */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                  DISPLAY NAME / STUDIO TITLE
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. SOREN VANE"
                    className="w-full bg-white/5 border border-white/15 focus:border-white pl-9 pr-3 py-2 text-xs text-white placeholder-white/20 font-sans focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Unique Username Handle */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-white/60 uppercase mb-1.5 flex justify-between">
                  <span>CANONICAL USERNAME</span>
                  {usernameStatus === 'checking' && <span className="text-white/40">VERIFYING...</span>}
                  {usernameStatus === 'available' && <span className="text-emerald-400">AVAILABLE</span>}
                  {usernameStatus === 'taken' && <span className="text-red-400">UNAVAILABLE</span>}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-mono text-white/40">@</span>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''));
                      setUsernameStatus('idle');
                    }}
                    onBlur={handleUsernameBlur}
                    placeholder="sorenvane"
                    className={`w-full bg-white/5 border pl-8 pr-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none transition-colors ${
                      usernameStatus === 'available'
                        ? 'border-emerald-500/60'
                        : usernameStatus === 'taken'
                        ? 'border-red-500/60'
                        : 'border-white/15 focus:border-white'
                    }`}
                  />
                </div>
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-[10px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
                  PRIMARY DISCIPLINE
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {accountTypes.map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setAccountType(type)}
                      className={`py-1.5 text-[9px] font-mono uppercase tracking-wider transition-all border ${
                        accountType === type
                          ? 'bg-white text-black border-white font-semibold'
                          : 'bg-white/5 text-white/50 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-[10px] font-mono tracking-widest text-white/60 uppercase mb-1.5">
              EMAIL ADDRESS
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="curator@ivntri.com"
                className="w-full bg-white/5 border border-white/15 focus:border-white pl-9 pr-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          {mode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono tracking-widest text-white/60 uppercase">
                  SECURITY KEY / PASSWORD
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError(null);
                    }}
                    className="text-[10px] font-mono text-white/40 hover:text-white transition-colors"
                  >
                    FORGOT?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-white/5 border border-white/15 focus:border-white pl-9 pr-3 py-2 text-xs text-white placeholder-white/20 font-mono focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-mono tracking-widest uppercase font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">AUTHENTICATING ARCHIVE...</span>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'CONFIRM SIGN IN'}
                  {mode === 'signup' && 'ESTABLISH ARCHIVE IDENTITY'}
                  {mode === 'reset' && 'TRANSMIT RECOVERY KEY'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Mode Switchers */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
          {mode === 'signin' && (
            <>
              <span>New to the network?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className="text-white hover:underline uppercase tracking-wider"
              >
                CREATE PASSPORT →
              </button>
            </>
          )}

          {mode === 'signup' && (
            <>
              <span>Existing passport?</span>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-white hover:underline uppercase tracking-wider"
              >
                SIGN IN →
              </button>
            </>
          )}

          {mode === 'reset' && (
            <div className="w-full text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                }}
                className="text-white hover:underline uppercase tracking-wider"
              >
                ← BACK TO SIGN IN
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
