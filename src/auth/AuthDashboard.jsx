// AuthDashboard.jsx — 2026-05-07
import React, { useState, useCallback } from 'react';
import {
  Eye, EyeOff, Fingerprint, ShieldCheck, KeyRound,
  LogIn, UserPlus, RefreshCw, QrCode, Copy, CheckCircle,
  AlertCircle, Lock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEV: 'dev',
  MODERATOR: 'moderator',
  USER: 'user',
});

export const AUTH_EVENTS = Object.freeze({
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAIL: 'LOGIN_FAIL',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  MFA_SETUP: 'MFA_SETUP',
  MFA_VERIFIED: 'MFA_VERIFIED',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  BIOMETRIC_ATTEMPT: 'BIOMETRIC_ATTEMPT',
});

const VIEWS = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
  MFA_SETUP: 'mfa-setup',
  CHANGE_PASSWORD: 'change-password',
});

const ROLE_ROUTES = Object.freeze({
  [ROLES.ADMIN]: '/dashboard/admin',
  [ROLES.DEV]: '/dashboard/dev',
  [ROLES.MODERATOR]: '/dashboard/moderator',
  [ROLES.USER]: '/dashboard/user',
});

// ---------------------------------------------------------------------------
// Password-strength helpers
// ---------------------------------------------------------------------------

const SPECIAL_RE = /[!@#$%^&*()\-_+=[\]{}|;:,.<>?]/;

function scorePassword(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 13) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (SPECIAL_RE.test(password)) score += 1;
  return score; // 0–5 (maps to 5 bars); treat score ≥ 3 as "strong"
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = [
  'bg-gray-300 dark:bg-gray-600',   // 0 — empty
  'bg-red-500',                      // 1
  'bg-orange-500',                   // 2
  'bg-yellow-400',                   // 3
  'bg-green-400',                    // 4
  'bg-green-500',                    // 5
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PasswordStrengthMeter({ password }) {
  const score = scorePassword(password);

  return (
    <div className="mt-1">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`flex-1 rounded-full transition-colors duration-300 ${
              bar <= score ? STRENGTH_COLORS[score] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className={`text-xs mt-1 ${score >= 3 ? 'text-green-500' : 'text-gray-400'}`}>
          {STRENGTH_LABELS[score]}
          {score >= 3 ? ' — good to go' : ' — keep going'}
        </p>
      )}
    </div>
  );
}

function PasswordInput({ id, label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);

  const toggle = useCallback(() => setShow((s) => !s), []);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder ?? ''}
          autoComplete="current-password"
          className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600
                     dark:hover:text-gray-200"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

function StatusMessage({ type, message }) {
  if (!message) return null;

  const styles = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
  };

  const Icon = type === 'error' ? AlertCircle : CheckCircle;

  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${styles[type] ?? styles.info}`}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function SubmitButton({ loading, icon: Icon, label, loadingLabel }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white
                 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed
                 transition-colors flex items-center justify-center gap-2"
    >
      {loading
        ? <><RefreshCw size={15} className="animate-spin" />{loadingLabel ?? 'Please wait…'}</>
        : <><Icon size={15} />{label}</>
      }
    </button>
  );
}

// ---------------------------------------------------------------------------
// Login view
// ---------------------------------------------------------------------------

function LoginView({ darkMode, onSwitchView, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const body = { email, password };
      if (showMfa && mfaToken) body.mfaToken = mfaToken;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.requiresMfa && !showMfa) {
          setShowMfa(true);
          setStatus({ type: 'info', message: 'Enter your MFA token to continue.' });
          setLoading(false);
          return;
        }
        throw new Error(data.message ?? 'Login failed');
      }

      const route = ROLE_ROUTES[data.user?.role] ?? ROLE_ROUTES[ROLES.USER];
      onLoginSuccess?.(data.user, data.accessToken);
      window.location.href = route;
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [email, password, mfaToken, showMfa, onLoginSuccess]);

  const handleBiometric = useCallback(async () => {
    setStatus({ type: '', message: '' });
    setLoading(true);
    try {
      // Request challenge from server, then hand off to Capacitor BiometricAuth plugin
      const res = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { challengeId, challenge, userId } = await res.json();

      // Native biometric verification (Capacitor plugin / Face ID / Touch ID)
      const { NativeBiometric } = await import('@capacitor-community/native-biometric')
        .catch(() => ({ NativeBiometric: null }));

      let signature;
      if (NativeBiometric) {
        await NativeBiometric.verifyIdentity({ reason: 'Log in to Nexus AI Pro', title: 'Biometric Login' });
        // After native verification passes, send challenge result to server
        signature = challengeId; // server validates challenge match
      } else {
        setStatus({ type: 'error', message: 'Biometric auth is not available on this device.' });
        setLoading(false);
        return;
      }

      const authRes = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, challengeId, signature }),
      });
      const authData = await authRes.json();

      if (!authRes.ok) throw new Error(authData.message ?? 'Biometric login failed');

      const route = ROLE_ROUTES[authData.user?.role] ?? ROLE_ROUTES[ROLES.USER];
      onLoginSuccess?.(authData.user, authData.accessToken);
      window.location.href = route;
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [email, onLoginSuccess]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <StatusMessage {...status} />

      <div>
        <label htmlFor="login-email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <PasswordInput
        id="login-password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Your password"
      />

      {showMfa && (
        <div>
          <label htmlFor="login-mfa" className="block text-sm font-medium mb-1">
            MFA Token
          </label>
          <input
            id="login-mfa"
            type="text"
            inputMode="numeric"
            value={mfaToken}
            onChange={(e) => setMfaToken(e.target.value)}
            placeholder="6-digit code or backup code"
            autoComplete="one-time-code"
            maxLength={12}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono tracking-widest"
          />
        </div>
      )}

      <SubmitButton loading={loading} icon={LogIn} label="Sign In" loadingLabel="Signing in…" />

      <button
        type="button"
        onClick={handleBiometric}
        disabled={loading || !email}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm
                   border border-gray-300 dark:border-gray-600 hover:bg-gray-50
                   dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Fingerprint size={15} />
        Sign in with Biometrics
      </button>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <button
          type="button"
          onClick={() => onSwitchView(VIEWS.REGISTER)}
          className="text-blue-600 hover:underline font-medium"
        >
          Create one
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Register view
// ---------------------------------------------------------------------------

function RegisterView({ onSwitchView }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const setField = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (form.password !== form.confirm) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (scorePassword(form.password) < 3) {
      setStatus({ type: 'error', message: 'Password is too weak. Aim for a score of at least Fair.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Registration failed');

      setStatus({ type: 'success', message: 'Account created! You can now sign in.' });
      setTimeout(() => onSwitchView(VIEWS.LOGIN), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [form, onSwitchView]);

  const pwScore = scorePassword(form.password);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <StatusMessage {...status} />

      <div>
        <label htmlFor="reg-username" className="block text-sm font-medium mb-1">Username</label>
        <input
          id="reg-username"
          type="text"
          value={form.username}
          onChange={setField('username')}
          placeholder="Your display name (emoji ok)"
          maxLength={32}
          required
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-sm font-medium mb-1">Email</label>
        <input
          id="reg-email"
          type="email"
          value={form.email}
          onChange={setField('email')}
          placeholder="you@example.com"
          autoComplete="email"
          required
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <PasswordInput
          id="reg-password"
          label="Password"
          value={form.password}
          onChange={setField('password')}
          placeholder="Min 13 chars, upper, lower, digit, special"
        />
        <PasswordStrengthMeter password={form.password} />
      </div>

      <PasswordInput
        id="reg-confirm"
        label="Confirm Password"
        value={form.confirm}
        onChange={setField('confirm')}
        placeholder="Repeat your password"
      />

      {form.confirm.length > 0 && form.password !== form.confirm && (
        <p className="text-xs text-red-500">Passwords do not match.</p>
      )}

      <SubmitButton
        loading={loading}
        icon={UserPlus}
        label="Create Account"
        loadingLabel="Creating account…"
      />

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => onSwitchView(VIEWS.LOGIN)}
          className="text-blue-600 hover:underline font-medium"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

// ---------------------------------------------------------------------------
// MFA Setup view
// ---------------------------------------------------------------------------

function MfaSetupView({ userId, onSwitchView }) {
  const [mfaData, setMfaData] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [copied, setCopied] = useState(false);

  const loadSetup = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'MFA setup failed');
      setMfaData(data);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setFetching(false);
    }
  }, [userId]);

  const handleVerify = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'MFA verification failed');
      setStatus({ type: 'success', message: 'MFA enabled successfully!' });
      setTimeout(() => onSwitchView(VIEWS.LOGIN), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [userId, token, onSwitchView]);

  const copyBackupCodes = useCallback(() => {
    if (!mfaData?.backupCodes) return;
    navigator.clipboard.writeText(mfaData.backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mfaData]);

  if (!mfaData) {
    return (
      <div className="space-y-4">
        <StatusMessage {...status} />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Set up two-factor authentication to secure your account.
        </p>
        <button
          type="button"
          onClick={loadSetup}
          disabled={fetching}
          className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white
                     bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors
                     flex items-center justify-center gap-2"
        >
          {fetching
            ? <><RefreshCw size={15} className="animate-spin" />Loading…</>
            : <><QrCode size={15} />Generate MFA Setup</>
          }
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StatusMessage {...status} />

      <div>
        <p className="text-sm font-medium mb-2">1. Scan with your authenticator app</p>
        {mfaData.qrCodeUrl ? (
          <div className="flex justify-center p-3 bg-white rounded-lg border border-gray-200 dark:border-gray-600">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mfaData.qrCodeUrl)}`}
              alt="MFA QR code"
              width={180}
              height={180}
              className="rounded"
            />
          </div>
        ) : null}
        <p className="text-xs text-gray-500 mt-1 font-mono break-all">{mfaData.secret}</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">2. Save your backup codes</p>
          <button
            type="button"
            onClick={copyBackupCodes}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy all'}
          </button>
        </div>
        <ul className="grid grid-cols-2 gap-1">
          {mfaData.backupCodes?.map((code, i) => (
            <li
              key={i}
              className="font-mono text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700
                         text-gray-800 dark:text-gray-200 tracking-wider"
            >
              {code}
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleVerify} className="space-y-3">
        <div>
          <label htmlFor="mfa-token" className="block text-sm font-medium mb-1">
            3. Enter the 6-digit code to confirm
          </label>
          <input
            id="mfa-token"
            type="text"
            inputMode="numeric"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456"
            maxLength={6}
            autoComplete="one-time-code"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono
                       tracking-[0.4em] text-center"
          />
        </div>
        <SubmitButton loading={loading} icon={ShieldCheck} label="Activate MFA" loadingLabel="Verifying…" />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Change Password view
// ---------------------------------------------------------------------------

function ChangePasswordView({ userId, onSwitchView }) {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const setField = useCallback((field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (form.newPassword !== form.confirm) {
      setStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    if (scorePassword(form.newPassword) < 3) {
      setStatus({ type: 'error', message: 'New password is too weak.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          oldPassword: form.oldPassword,
          newPassword: form.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Password change failed');

      setStatus({ type: 'success', message: 'Password changed successfully.' });
      setForm({ oldPassword: '', newPassword: '', confirm: '' });
      setTimeout(() => onSwitchView(VIEWS.LOGIN), 1500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [form, userId, onSwitchView]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <StatusMessage {...status} />

      <PasswordInput
        id="cp-old"
        label="Current Password"
        value={form.oldPassword}
        onChange={setField('oldPassword')}
        placeholder="Your current password"
      />

      <div>
        <PasswordInput
          id="cp-new"
          label="New Password"
          value={form.newPassword}
          onChange={setField('newPassword')}
          placeholder="Min 13 chars"
        />
        <PasswordStrengthMeter password={form.newPassword} />
      </div>

      <PasswordInput
        id="cp-confirm"
        label="Confirm New Password"
        value={form.confirm}
        onChange={setField('confirm')}
        placeholder="Repeat new password"
      />

      {form.confirm.length > 0 && form.newPassword !== form.confirm && (
        <p className="text-xs text-red-500">Passwords do not match.</p>
      )}

      <SubmitButton
        loading={loading}
        icon={KeyRound}
        label="Change Password"
        loadingLabel="Updating…"
      />

      <button
        type="button"
        onClick={() => onSwitchView(VIEWS.LOGIN)}
        className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-center"
      >
        Cancel
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// AuthDashboard (root component)
// ---------------------------------------------------------------------------

const VIEW_TITLES = {
  [VIEWS.LOGIN]: 'Sign In',
  [VIEWS.REGISTER]: 'Create Account',
  [VIEWS.MFA_SETUP]: 'Set Up Two-Factor Auth',
  [VIEWS.CHANGE_PASSWORD]: 'Change Password',
};

export default function AuthDashboard({
  onLoginSuccess,
  darkMode = false,
  initialView = VIEWS.LOGIN,
  userId = null,
}) {
  const [view, setView] = useState(initialView ?? VIEWS.LOGIN);

  const switchView = useCallback((nextView) => {
    setView(nextView);
  }, []);

  const resolvedView = Object.values(VIEWS).includes(view) ? view : VIEWS.LOGIN;

  const renderView = () => {
    switch (resolvedView) {
      case VIEWS.LOGIN:
        return <LoginView darkMode={darkMode} onSwitchView={switchView} onLoginSuccess={onLoginSuccess} />;
      case VIEWS.REGISTER:
        return <RegisterView onSwitchView={switchView} />;
      case VIEWS.MFA_SETUP:
        return <MfaSetupView userId={userId} onSwitchView={switchView} />;
      case VIEWS.CHANGE_PASSWORD:
        return <ChangePasswordView userId={userId} onSwitchView={switchView} />;
      default:
        return null;
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100
                      flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border
                          border-gray-100 dark:border-gray-700 p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-blue-600 text-white">
                <Lock size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold leading-tight">Nexus AI Pro</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {VIEW_TITLES[resolvedView]}
                </p>
              </div>
            </div>

            {/* Active view */}
            {renderView()}

            {/* Footer nav links (only on login/register) */}
            {(resolvedView === VIEWS.LOGIN || resolvedView === VIEWS.REGISTER) && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap
                              justify-center gap-3 text-xs text-gray-400">
                <button
                  type="button"
                  onClick={() => switchView(VIEWS.MFA_SETUP)}
                  className="hover:text-blue-500 transition-colors flex items-center gap-1"
                >
                  <ShieldCheck size={12} /> Setup MFA
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => switchView(VIEWS.CHANGE_PASSWORD)}
                  className="hover:text-blue-500 transition-colors flex items-center gap-1"
                >
                  <KeyRound size={12} /> Change Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
