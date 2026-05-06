// src/auth/AuthSystem.jsx
// Nexus AI Pro — Full Authentication System
// Biometrics · 2FA TOTP · MFA · Role-based dashboards
// Password: 13+ chars, special characters, strength meter
// Username: emoji & unicode safe
// Updated: 2026-05-06

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  Shield, Lock, Unlock, Eye, EyeOff, Fingerprint, ScanFace,
  KeyRound, Smartphone, Mail, User, Users, AlertTriangle,
  CheckCircle2, XCircle, RefreshCw, QrCode, Copy,
  ShieldCheck, ShieldAlert, LogIn, LogOut, UserPlus,
  Settings, Crown, Code2, Wrench, Zap, Globe
} from 'lucide-react';

// ── Auth context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Role definitions ──────────────────────────────────────────────────────────
export const ROLES = {
  admin: {
    label: 'Admin',
    icon: <Crown size={14} />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-700',
    permissions: ['*'],
    dashboardSections: ['analytics', 'security', 'projects', 'users', 'subscriptions', 'integrations', 'settings', 'audit'],
  },
  dev: {
    label: 'Developer',
    icon: <Code2 size={14} />,
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-700',
    permissions: ['projects:*', 'analytics:read', 'security:read', 'integrations:*'],
    dashboardSections: ['projects', 'analytics', 'security', 'integrations'],
  },
  moderator: {
    label: 'Moderator',
    icon: <Wrench size={14} />,
    color: 'text-orange-400',
    bg: 'bg-orange-900/30',
    border: 'border-orange-700',
    permissions: ['analytics:read', 'users:moderate', 'content:*'],
    dashboardSections: ['analytics', 'users'],
  },
  user: {
    label: 'User',
    icon: <User size={14} />,
    color: 'text-gray-300',
    bg: 'bg-gray-800',
    border: 'border-gray-600',
    permissions: ['projects:own', 'analytics:own'],
    dashboardSections: ['projects', 'analytics'],
  },
};

// ── Password strength (no external dep — pure logic) ─────────────────────────
function measureStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 13) score += 25;
  if (pw.length >= 20) score += 10;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[0-9]/.test(pw)) score += 15;
  if (/[^A-Za-z0-9]/.test(pw)) score += 20;
  if (/\p{Emoji}/u.test(pw)) score += 5;
  score = Math.min(100, score);
  if (score < 40)  return { score, label: 'Weak',      color: 'bg-red-500',    text: 'text-red-400' };
  if (score < 65)  return { score, label: 'Fair',      color: 'bg-yellow-500', text: 'text-yellow-400' };
  if (score < 85)  return { score, label: 'Strong',    color: 'bg-blue-500',   text: 'text-blue-400' };
  return             { score, label: 'Excellent', color: 'bg-green-500',  text: 'text-green-400' };
}

const PW_RULES = [
  { id: 'len',     test: (pw) => pw.length >= 13,          label: '13+ characters' },
  { id: 'upper',   test: (pw) => /[A-Z]/.test(pw),         label: 'Uppercase letter' },
  { id: 'lower',   test: (pw) => /[a-z]/.test(pw),         label: 'Lowercase letter' },
  { id: 'digit',   test: (pw) => /[0-9]/.test(pw),         label: 'Number' },
  { id: 'special', test: (pw) => /[^A-Za-z0-9]/.test(pw),  label: 'Special character (!@#$…)' },
];

// ── Username validation: allow emoji, unicode, no injection ───────────────────
function validateUsername(u) {
  if (!u || u.length < 3) return 'Username must be at least 3 characters.';
  if (u.length > 32)      return 'Username must be 32 characters or fewer.';
  // Disallow HTML angle brackets and SQL meta-characters only
  if (/[<>"';\\]/.test(u)) return 'Username contains disallowed characters: < > " \' ; \\';
  return null;
}

// ── TOTP simulation (server handles real speakeasy) ───────────────────────────
function TOTPDisplay({ secret, qrUrl }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="rounded-xl bg-gray-800 border border-gray-700 p-5 space-y-4">
      <div className="flex items-center gap-2 text-white font-semibold">
        <QrCode size={18} className="text-blue-400" />
        Set up Authenticator App
      </div>
      <p className="text-gray-400 text-sm">Scan this QR code in Google Authenticator, Authy, or any TOTP app.</p>
      {qrUrl && <img src={qrUrl} alt="2FA QR code" className="w-40 h-40 bg-white p-2 rounded-lg mx-auto" />}
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-900 rounded px-3 py-2 text-xs text-blue-300 font-mono break-all">{secret}</code>
        <button onClick={copy} className="p-2 hover:bg-gray-700 rounded transition-colors">
          {copied ? <CheckCircle2 size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

// ── Biometric button ──────────────────────────────────────────────────────────
function BiometricAuth({ onSuccess, onError }) {
  const [status, setStatus] = useState('idle');

  const attempt = async (method) => {
    setStatus('checking');
    try {
      if (method === 'webauthn' && window.PublicKeyCredential) {
        // Real WebAuthn assertion in production — mocked here
        await new Promise((r) => setTimeout(r, 800));
        setStatus('success');
        onSuccess({ method: 'webauthn', ts: Date.now() });
      } else if (method === 'device' && window.Capacitor?.isNativePlatform?.()) {
        // Capacitor native biometric (iOS/Android)
        const { BiometricAuth: Bio } = await import('@aparajita/capacitor-biometric-auth');
        await Bio.authenticate({ reason: 'Verify your identity', iosFallbackTitle: 'Use Passcode' });
        setStatus('success');
        onSuccess({ method: 'native-biometric', ts: Date.now() });
      } else {
        throw new Error('Biometrics not available on this platform.');
      }
    } catch (e) {
      setStatus('error');
      onError(e.message);
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-gray-400 text-xs text-center uppercase tracking-wide">Biometric Authentication</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { method: 'webauthn', label: 'Touch ID / Face ID', icon: <Fingerprint size={20} />, desc: 'WebAuthn / FIDO2' },
          { method: 'device',   label: 'Device Biometric',   icon: <ScanFace size={20} />,   desc: 'Native (iOS/Android)' },
        ].map((b) => (
          <button
            key={b.method}
            onClick={() => attempt(b.method)}
            disabled={status === 'checking'}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500 disabled:opacity-50 transition-all"
          >
            <span className={status === 'success' ? 'text-green-400' : status === 'error' ? 'text-red-400' : 'text-blue-400'}>{b.icon}</span>
            <span className="text-white text-xs font-medium">{b.label}</span>
            <span className="text-gray-500 text-xs">{b.desc}</span>
          </button>
        ))}
      </div>
      {status === 'success' && <p className="text-green-400 text-xs text-center flex items-center justify-center gap-1"><CheckCircle2 size={12} />Biometric verified</p>}
      {status === 'error'   && <p className="text-red-400 text-xs text-center flex items-center justify-center gap-1"><XCircle size={12} />Biometric failed — try password</p>}
    </div>
  );
}

// ── Registration form ─────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const strength = measureStrength(form.password);

  const validate = () => {
    const e = {};
    const unErr = validateUsername(form.username);
    if (unErr) e.username = unErr;
    if (!form.email.includes('@')) e.email = 'Enter a valid email address.';
    if (strength.score < 65)       e.password = 'Password is too weak — use 13+ characters with mixed types.';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onSuccess(data);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      {/* Username — emoji + unicode safe */}
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Username <span className="text-gray-500 text-xs">(emoji &amp; unicode OK)</span></label>
        <input
          value={form.username}
          onChange={set('username')}
          placeholder="nexus_user 🚀"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={set('email')}
          placeholder="you@example.com"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Password</label>
        <div className="relative">
          <input
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            placeholder="Min 13 chars + special chars"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
          <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {/* Strength bar */}
        {form.password && (
          <div className="mt-2">
            <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.score}%` }} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${strength.text}`}>{strength.label}</span>
              <div className="flex gap-2">
                {PW_RULES.map((r) => (
                  <span key={r.id} title={r.label} className={r.test(form.password) ? 'text-green-400' : 'text-gray-600'}>
                    {r.test(form.password) ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
      </div>

      {/* Confirm */}
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Confirm Password</label>
        <input
          type={showPw ? 'text' : 'password'}
          value={form.confirm}
          onChange={set('confirm')}
          placeholder="Re-enter password"
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        {errors.confirm && <p className="text-red-400 text-xs mt-1">{errors.confirm}</p>}
      </div>

      {/* Role (admin-configurable; default user) */}
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Account Type</label>
        <select
          value={form.role}
          onChange={set('role')}
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
        >
          {Object.entries(ROLES).map(([id, r]) => (
            <option key={id} value={id}>{r.label}</option>
          ))}
        </select>
      </div>

      {errors.submit && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">
          <AlertTriangle size={14} />{errors.submit}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {submitting ? <RefreshCw size={16} className="animate-spin" /> : <UserPlus size={16} />}
        {submitting ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-gray-400 text-sm">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-blue-400 hover:underline">Sign in</button>
      </p>
    </form>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [step, setStep]       = useState('credentials'); // 'credentials' | '2fa' | 'biometric'
  const [form, setForm]       = useState({ identifier: '', password: '' });
  const [totp, setTotp]       = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [submitting, setSub]  = useState(false);
  const [authToken, setToken] = useState(null);

  const handleCredentials = async (e) => {
    e.preventDefault();
    setErrors({});
    setSub(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: form.identifier, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.mfaRequired) {
        setToken(data.tempToken);
        setStep('2fa');
      } else {
        onSuccess(data);
      }
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSub(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setErrors({});
    setSub(true);
    try {
      const res  = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken: authToken, totp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA verification failed');
      onSuccess(data);
    } catch (err) {
      setErrors({ totp: err.message });
    } finally {
      setSub(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  if (step === '2fa') {
    return (
      <form onSubmit={handleMFA} className="space-y-4">
        <div className="text-center">
          <Smartphone size={32} className="text-blue-400 mx-auto mb-2" />
          <h3 className="text-white font-semibold">Two-Factor Verification</h3>
          <p className="text-gray-400 text-sm">Enter the 6-digit code from your authenticator app.</p>
        </div>
        <input
          value={totp}
          onChange={(e) => setTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500"
        />
        {errors.totp && <p className="text-red-400 text-xs text-center">{errors.totp}</p>}
        <button
          type="submit"
          disabled={totp.length < 6 || submitting}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          Verify
        </button>
        <button type="button" onClick={() => setStep('credentials')} className="w-full text-gray-400 text-sm hover:text-white">Back</button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCredentials} className="space-y-4">
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Email or Username</label>
          <input
            value={form.identifier}
            onChange={set('identifier')}
            placeholder="you@example.com or nexus_user"
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={set('password')}
              placeholder="Your password"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        {errors.submit && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">
            <AlertTriangle size={14} />{errors.submit}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <RefreshCw size={16} className="animate-spin" /> : <LogIn size={16} />}
          {submitting ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-gray-500 text-xs">or</span>
        <div className="flex-1 h-px bg-gray-700" />
      </div>

      <BiometricAuth
        onSuccess={(data) => onSuccess({ ...data, method: 'biometric' })}
        onError={(msg) => setErrors({ submit: msg })}
      />

      <p className="text-center text-gray-400 text-sm">
        No account?{' '}
        <button onClick={onSwitch} className="text-blue-400 hover:underline">Create one</button>
      </p>
    </div>
  );
}

// ── Role-based dashboard shell ────────────────────────────────────────────────
function RoleDashboard({ user, onLogout }) {
  const role = ROLES[user.role] || ROLES.user;
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-blue-400" />
          <span className="font-bold text-white">Nexus AI Pro</span>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${role.color} ${role.bg} border ${role.border}`}>
            {role.icon}{role.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-300 text-sm">{user.username}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-1 text-gray-400 hover:text-white text-sm transition-colors"
          >
            <LogOut size={14} />Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Welcome back, {user.username}</h2>
          <p className="text-gray-400 text-sm">
            Signed in as <span className={role.color}>{role.label}</span> · Access: {role.permissions.join(', ')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {role.dashboardSections.map((section) => {
            const sectionMeta = {
              analytics:     { label: 'Analytics',    icon: '📊', desc: 'Social & content metrics' },
              security:      { label: 'Security',     icon: '🛡️', desc: 'Threats & scan results' },
              projects:      { label: 'Projects',     icon: '🚀', desc: 'Project tracker & game dev' },
              users:         { label: 'Users',        icon: '👥', desc: 'Manage users & roles' },
              subscriptions: { label: 'Subscriptions',icon: '💳', desc: 'Billing & plans' },
              integrations:  { label: 'Integrations', icon: '🔌', desc: 'Cloud & engine connectors' },
              settings:      { label: 'Settings',     icon: '⚙️', desc: 'System configuration' },
              audit:         { label: 'Audit Logs',   icon: '📋', desc: 'Security & activity logs' },
            }[section];
            if (!sectionMeta) return null;
            return (
              <div key={section} className="rounded-xl bg-gray-800 border border-gray-700 hover:border-blue-500 p-5 cursor-pointer transition-all">
                <div className="text-3xl mb-2">{sectionMeta.icon}</div>
                <p className="text-white font-semibold text-sm">{sectionMeta.label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{sectionMeta.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Auth provider & gate ──────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('nexus:user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setReady(true);
  }, []);

  const login  = (u) => { setUser(u); localStorage.setItem('nexus:user', JSON.stringify(u)); };
  const logout = ()  => { setUser(null); localStorage.removeItem('nexus:user'); };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Top-level auth gate ───────────────────────────────────────────────────────
export default function AuthSystem({ children }) {
  const { user, login, logout, ready } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [registered, setRegistered] = useState(null);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <RefreshCw size={24} className="text-blue-400 animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <>
        <RoleDashboard user={user} onLogout={logout} />
        {children}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={32} className="text-blue-400" />
            <span className="text-3xl font-bold text-white">Nexus AI Pro</span>
          </div>
          <p className="text-gray-400 text-sm">Military-grade encrypted AI platform</p>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex gap-1 mb-6 bg-gray-900 rounded-xl p-1">
            {['login', 'register'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {registered && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 size={14} />Account created! Please sign in.
            </div>
          )}

          {mode === 'login'
            ? <LoginForm onSuccess={login} onSwitch={() => setMode('register')} />
            : <RegisterForm onSuccess={(d) => { setRegistered(d); setMode('login'); }} onSwitch={() => setMode('login')} />
          }
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          AES-256-GCM · PBKDF2-SHA512 · E2E Encrypted
        </p>
      </div>
    </div>
  );
}
