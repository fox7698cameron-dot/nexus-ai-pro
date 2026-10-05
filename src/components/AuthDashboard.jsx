// ================================================
// File: src/components/AuthDashboard.jsx
// Date: 2026-10-05
// Description: Comprehensive authentication dashboard with multi-role login/register,
// biometric stubs, 2FA/MFA, JWT session management, and role-based routing
// ================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  Shield, Lock, User, Mail, Eye, EyeOff, Fingerprint, Smartphone,
  Key, AlertCircle, CheckCircle, ChevronRight, RefreshCw, LogIn,
  UserPlus, Settings, Star, Code, Zap
} from 'lucide-react';

// ---- Constants ----
const ROLES = [
  { id: 'user', label: 'User', icon: User, color: 'text-blue-400', route: '/dashboard' },
  { id: 'moderator', label: 'Moderator', icon: Shield, color: 'text-green-400', route: '/mod' },
  { id: 'developer', label: 'Developer', icon: Code, color: 'text-purple-400', route: '/dev' },
  { id: 'admin', label: 'Administrator', icon: Star, color: 'text-yellow-400', route: '/admin' },
];

const MFA_METHODS = [
  { id: 'totp', label: 'Authenticator App (TOTP)', icon: Key },
  { id: 'sms', label: 'SMS Code', icon: Smartphone },
  { id: 'email', label: 'Email Code', icon: Mail },
];

const BIOMETRIC_OPTIONS = [
  { id: 'fingerprint', label: 'Fingerprint', icon: '🖐️' },
  { id: 'touchid', label: 'Touch ID', icon: '☝️' },
  { id: 'faceid', label: 'Face ID', icon: '😊' },
  { id: 'retinal', label: 'Retinal Scan', icon: '👁️' },
];

const MIN_PASSWORD_LENGTH = 13;
const SPECIAL_CHAR_RE = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
const UPPERCASE_RE = /[A-Z]/;
const LOWERCASE_RE = /[a-z]/;
const DIGIT_RE = /[0-9]/;

// ---- Validation helpers ----

/**
 * Evaluate password strength.
 * @param {string} pw
 * @returns {{ score: number, label: string, color: string, checks: object }}
 */
function evalPassword(pw) {
  const checks = {
    length: pw.length >= MIN_PASSWORD_LENGTH,
    upper: UPPERCASE_RE.test(pw),
    lower: LOWERCASE_RE.test(pw),
    digit: DIGIT_RE.test(pw),
    special: SPECIAL_CHAR_RE.test(pw),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / 5) * 100);
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
  return { score, label: labels[passed - 1] || 'Very Weak', color: colors[passed - 1] || 'bg-red-500', checks };
}

/**
 * Validate a username (supports emojis and Unicode, 3–30 chars).
 * @param {string} username
 * @returns {string|null} error message or null
 */
function validateUsername(username) {
  if (!username) return 'Username is required';
  // Allow Unicode letters, digits, underscores, hyphens, and emoji
  const trimmed = username.trim();
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 30) return 'Username must be 30 characters or fewer';
  // Disallow control characters; everything else (including emoji) is valid
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return 'Username contains invalid characters';
  return null;
}

/**
 * Sanitize a string to prevent XSS (for display only - server must also validate).
 * @param {string} str
 * @returns {string}
 */
function sanitizeDisplay(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ---- Sub-components ----

function RoleSelector({ selectedRole, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {ROLES.map(({ id, label, icon: Icon, color }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium
            ${selectedRole === id
              ? 'border-indigo-500 bg-indigo-500/20 text-white'
              : 'border-gray-600 bg-gray-800/50 text-gray-400 hover:border-gray-500'
            }`}
        >
          <Icon size={16} className={selectedRole === id ? color : ''} />
          {label}
        </button>
      ))}
    </div>
  );
}

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const { score, label, color, checks } = evalPassword(password);
  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">Strength</span>
        <span className={score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400'}>
          {label}
        </span>
      </div>
      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <ul className="grid grid-cols-2 gap-1 text-xs mt-1">
        {[
          ['length', `${MIN_PASSWORD_LENGTH}+ chars`],
          ['upper', 'Uppercase'],
          ['lower', 'Lowercase'],
          ['digit', 'Number'],
          ['special', 'Special char'],
        ].map(([key, text]) => (
          <li key={key} className={`flex items-center gap-1 ${checks[key] ? 'text-green-400' : 'text-gray-500'}`}>
            {checks[key] ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InputField({ label, id, type = 'text', value, onChange, placeholder, error, autoComplete, rightElement }) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={id} className="block text-sm text-gray-300 mb-1">{label}</label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm
            focus:outline-none focus:ring-2 transition-colors
            ${error
              ? 'border-red-500 focus:ring-red-500/50'
              : 'border-gray-600 focus:ring-indigo-500/50 focus:border-indigo-500'
            } ${rightElement ? 'pr-10' : ''}`}
        />
        {rightElement && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

function BiometricPanel({ onSelect }) {
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);

  const handleBiometric = useCallback(async (id) => {
    setPending(id);
    setResult(null);
    // Stub: In production, call platform biometric API
    await new Promise(r => setTimeout(r, 1500));
    // Always succeed in UI stub; real implementation uses WebAuthn / native API
    setResult({ success: true, method: id });
    onSelect?.(id);
    setPending(null);
  }, [onSelect]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">Or authenticate using a biometric method:</p>
      <div className="grid grid-cols-2 gap-2">
        {BIOMETRIC_OPTIONS.map(({ id, label, icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleBiometric(id)}
            disabled={!!pending}
            className="flex items-center gap-2 p-2 rounded-lg border border-gray-600 bg-gray-800/50
              text-gray-300 hover:border-indigo-500 hover:text-white transition-all text-xs disabled:opacity-50"
          >
            <span className="text-base">{icon}</span>
            {pending === id ? (
              <span className="flex items-center gap-1"><RefreshCw size={10} className="animate-spin" />Scanning...</span>
            ) : label}
          </button>
        ))}
      </div>
      {result?.success && (
        <p className="text-green-400 text-xs flex items-center gap-1">
          <CheckCircle size={12} />Biometric recognized — confirm on your device
        </p>
      )}
    </div>
  );
}

function MFAStep({ method, onVerify, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError('Enter a 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onVerify(trimmed);
    } catch (err) {
      setError(err.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const methodInfo = MFA_METHODS.find(m => m.id === method) || MFA_METHODS[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-indigo-400">
        <methodInfo.icon size={20} />
        <span className="font-medium">{methodInfo.label}</span>
      </div>
      <p className="text-sm text-gray-400">
        Enter the 6-digit code from your {methodInfo.label.toLowerCase()}.
      </p>
      <InputField
        id="mfa-code"
        label="Verification Code"
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        autoComplete="one-time-code"
        error={error}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2 px-4 rounded-lg border border-gray-600 text-gray-400 hover:text-white text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm
            font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Verify
        </button>
      </div>
    </div>
  );
}

// ---- Login Form ----
function LoginForm({ onLogin, onSwitch }) {
  const [role, setRole] = useState('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) { setError('Email or username is required'); return; }
    if (!password) { setError('Password is required'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password, role, rememberDevice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.requiresMfa) {
        setMfaMethod(data.mfaMethod || 'totp');
        setMfaStep(true);
      } else {
        onLogin?.(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (code) => {
    const res = await fetch('/api/auth/2fa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, identifier: identifier.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MFA verification failed');
    onLogin?.(data);
  };

  if (mfaStep) {
    return (
      <MFAStep
        method={mfaMethod}
        onVerify={handleMfaVerify}
        onBack={() => setMfaStep(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
      <p className="text-gray-400 text-sm mb-4">Select your role and credentials</p>

      <RoleSelector selectedRole={role} onSelect={setRole} />

      <InputField
        id="identifier"
        label="Email or Username"
        value={identifier}
        onChange={e => setIdentifier(e.target.value)}
        placeholder="you@example.com"
        autoComplete="username"
      />

      <InputField
        id="login-password"
        label="Password"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="••••••••••••••"
        autoComplete="current-password"
        rightElement={
          <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-white p-0.5">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        }
      />

      <div className="flex items-center justify-between mb-4 text-sm">
        <label className="flex items-center gap-2 text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={e => setRememberDevice(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-indigo-500"
          />
          Remember this device
        </label>
        <button type="button" className="text-indigo-400 hover:text-indigo-300">Forgot password?</button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium
          flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mb-3"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
        Sign In as {ROLES.find(r => r.id === role)?.label}
      </button>

      <button
        type="button"
        onClick={() => setShowBiometric(v => !v)}
        className="w-full py-2 px-4 border border-gray-600 text-gray-400 hover:text-white rounded-lg text-sm
          flex items-center justify-center gap-2 transition-colors mb-3"
      >
        <Fingerprint size={16} />
        {showBiometric ? 'Hide' : 'Use'} Biometric Login
      </button>

      {showBiometric && <BiometricPanel onSelect={(id) => console.info('Biometric selected:', id)} />}

      <div className="mt-4 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300 font-medium">
          Create one
        </button>
      </div>
    </form>
  );
}

// ---- Register Form ----
function RegisterForm({ onRegister, onSwitch }) {
  const [role, setRole] = useState('user');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const validate = () => {
    const errs = {};
    const usernameErr = validateUsername(username);
    if (usernameErr) errs.username = usernameErr;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Valid email required';
    const { checks } = evalPassword(password);
    if (!checks.length) errs.password = `Minimum ${MIN_PASSWORD_LENGTH} characters required`;
    else if (!checks.special) errs.password = 'Must contain a special character';
    else if (!checks.upper) errs.password = 'Must contain an uppercase letter';
    else if (!checks.digit) errs.password = 'Must contain a number';
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          mfaEnabled,
          mfaMethod: mfaEnabled ? mfaMethod : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setSuccess('Account created! You can now sign in.');
      onRegister?.(data);
    } catch (err) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className="text-xl font-bold text-white mb-1">Create Account</h2>
      <p className="text-gray-400 text-sm mb-4">Choose your role and set up credentials</p>

      <RoleSelector selectedRole={role} onSelect={setRole} />

      <InputField
        id="reg-username"
        label="Username (emoji & Unicode supported)"
        value={username}
        onChange={e => setUsername(e.target.value)}
        placeholder="cooluser123 or 🎮gamer"
        autoComplete="username"
        error={errors.username}
      />

      <InputField
        id="reg-email"
        label="Email Address"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        error={errors.email}
      />

      <div className="mb-3">
        <InputField
          id="reg-password"
          label="Password"
          type={showPw ? 'text' : 'password'}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Create a strong password"
          autoComplete="new-password"
          error={errors.password}
          rightElement={
            <button type="button" onClick={() => setShowPw(v => !v)} className="text-gray-400 hover:text-white p-0.5">
              {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          }
        />
        <PasswordStrengthBar password={password} />
      </div>

      <InputField
        id="reg-confirm-pw"
        label="Confirm Password"
        type={showPw ? 'text' : 'password'}
        value={confirmPw}
        onChange={e => setConfirmPw(e.target.value)}
        placeholder="Repeat your password"
        autoComplete="new-password"
        error={errors.confirmPw}
      />

      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={mfaEnabled}
            onChange={e => setMfaEnabled(e.target.checked)}
            className="rounded border-gray-600 bg-gray-800 text-indigo-500"
          />
          Enable Two-Factor Authentication
        </label>
        {mfaEnabled && (
          <div className="space-y-1 ml-5">
            {MFA_METHODS.map(({ id, label, icon: Icon }) => (
              <label key={id} className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input
                  type="radio"
                  name="mfaMethod"
                  value={id}
                  checked={mfaMethod === id}
                  onChange={() => setMfaMethod(id)}
                  className="text-indigo-500"
                />
                <Icon size={12} />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>

      {errors.global && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />{errors.global}
        </div>
      )}

      {success && (
        <div className="mb-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={14} />{success}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium
          flex items-center justify-center gap-2 disabled:opacity-50 transition-colors mb-3"
      >
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
        Create {ROLES.find(r => r.id === role)?.label} Account
      </button>

      <div className="mt-2 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300 font-medium">
          Sign in
        </button>
      </div>
    </form>
  );
}

// ---- Session Manager ----
function SessionInfo({ session, onLogout }) {
  const role = ROLES.find(r => r.id === session?.role);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-2xl">
          {session?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <p className="text-white font-medium">{sanitizeDisplay(session?.username || 'Unknown')}</p>
          <p className="text-gray-400 text-sm">{sanitizeDisplay(session?.email || '')}</p>
        </div>
      </div>

      {role && (
        <div className={`flex items-center gap-2 p-2 rounded-lg bg-gray-800 text-sm ${role.color}`}>
          <role.icon size={16} />
          <span className="font-medium">{role.label}</span>
          <ChevronRight size={14} className="ml-auto" />
          <span className="text-gray-400 text-xs">{role.route}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-500">Session expires</p>
          <p className="text-white">{session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'N/A'}</p>
        </div>
        <div className="p-2 bg-gray-800 rounded">
          <p className="text-gray-500">2FA Status</p>
          <p className={session?.mfaEnabled ? 'text-green-400' : 'text-yellow-400'}>
            {session?.mfaEnabled ? 'Enabled' : 'Disabled'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        className="w-full py-2 px-4 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-lg text-sm
          flex items-center justify-center gap-2 transition-colors"
      >
        <LogIn size={14} className="rotate-180" />
        Sign Out
      </button>
    </div>
  );
}

// ---- Main Export ----
export default function AuthDashboard({ initialSession = null, onAuthChange }) {
  const [view, setView] = useState(initialSession ? 'session' : 'login');
  const [session, setSession] = useState(initialSession);

  const handleLogin = useCallback((data) => {
    const sessionData = {
      token: data.token,
      username: data.user?.username,
      email: data.user?.email,
      role: data.user?.role,
      mfaEnabled: data.user?.mfaEnabled,
      expiresAt: data.expiresAt,
    };
    setSession(sessionData);
    // Store JWT in sessionStorage (not localStorage for security)
    try { sessionStorage.setItem('nx_session', JSON.stringify(sessionData)); } catch {}
    setView('session');
    onAuthChange?.(sessionData);
  }, [onAuthChange]);

  const handleRegister = useCallback((data) => {
    setView('login');
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      const token = session?.token;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    try { sessionStorage.removeItem('nx_session'); } catch {}
    setSession(null);
    setView('login');
    onAuthChange?.(null);
  }, [session, onAuthChange]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm">Secure Multi-Role Authentication</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/60 backdrop-blur border border-gray-700 rounded-2xl p-6 shadow-xl">
          {view === 'login' && (
            <LoginForm
              onLogin={handleLogin}
              onSwitch={() => setView('register')}
            />
          )}
          {view === 'register' && (
            <RegisterForm
              onRegister={handleRegister}
              onSwitch={() => setView('login')}
            />
          )}
          {view === 'session' && (
            <SessionInfo session={session} onLogout={handleLogout} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-4">
          Protected by AES-256-GCM encryption &bull; All sessions are monitored
        </p>
      </div>
    </div>
  );
}
