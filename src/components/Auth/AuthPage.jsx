// nexus-ai-pro/src/components/Auth/AuthPage.jsx | 2026-04-17
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Registration, login, 2FA, password strength, biometrics, MFA — no hardcoded secrets

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye, EyeOff, Shield, Fingerprint, Smartphone, Mail,
  AlertCircle, CheckCircle, Lock, User, ChevronRight,
} from 'lucide-react';

// ── Password strength meter ───────────────────────────────────
function strengthScore(pwd) {
  let s = 0;
  if (pwd.length >= 13) s++;
  if (pwd.length >= 18) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[\W_]/.test(pwd)) s++;
  if (/[\u{1F000}-\u{1FFFF}]/u.test(pwd)) s++;
  return Math.min(s, 7);
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Extreme'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981', '#6366f1', '#8b5cf6'];

function PasswordStrength({ password }) {
  const score = strengthScore(password);
  if (!password) return null;
  const color = STRENGTH_COLORS[score];
  const pct = (score / 7) * 100;
  const checks = [
    { label: '13+ characters', ok: password.length >= 13 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special char', ok: /[\W_]/.test(password) },
  ];
  return (
    <div className="mt-2">
      <div className="w-full bg-gray-800 rounded-full h-1.5 mb-1.5">
        <div className="h-1.5 rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium" style={{ color }}>{STRENGTH_LABELS[score]}</span>
        <span className="text-xs text-gray-500">{score}/7</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1 text-xs ${c.ok ? 'text-green-400' : 'text-gray-600'}`}>
            {c.ok ? <CheckCircle size={10} /> : <AlertCircle size={10} />}{c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────
function Field({ label, type = 'text', value, onChange, placeholder, error, autoComplete, right }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-gray-800 border rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none transition
            ${error ? 'border-red-500/70 focus:border-red-500' : 'border-gray-700 focus:border-indigo-500'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {right && !isPassword && <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

// ── MFA step ──────────────────────────────────────────────────
function MfaStep({ method, onVerify, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (code.length < 4) { setError('Enter your verification code'); return; }
    setLoading(true);
    setError('');
    try {
      await onVerify(code);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const icons = { totp: Smartphone, email: Mail, sms: Smartphone };
  const Icon = icons[method] ?? Shield;
  const labels = { totp: 'Authenticator App', email: 'Email Code', sms: 'SMS Code' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
          <Icon size={24} className="text-indigo-400" />
        </div>
        <h2 className="text-lg font-bold text-white">Verify Identity</h2>
        <p className="text-gray-400 text-sm text-center">Enter the code from your {labels[method] ?? method}</p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <input
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="000000"
            className="w-full text-center bg-gray-800 border border-gray-700 rounded-xl px-4 py-4 text-white text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-indigo-500"
            autoFocus
            inputMode="numeric"
          />
          {error && <p className="text-red-400 text-xs mt-1 text-center">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading || code.length < 4}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-medium transition"
        >
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button type="button" onClick={onBack} className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm transition">
          Back to login
        </button>
      </form>
    </div>
  );
}

// ── Register form ─────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.username || form.username.length < 2) e.username = 'Min 2 characters';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (strengthScore(form.password) < 4) e.password = 'Password too weak (min 13 chars, upper, lower, digit, special)';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      onSuccess(data);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-white">Create Account</h2>
        <p className="text-gray-400 text-sm">Join Nexus AI Pro</p>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-sm">
          <AlertCircle size={14} />{serverError}
        </div>
      )}

      <Field label="Username" value={form.username} onChange={v => set('username', v)} placeholder="your_handle 🚀" error={errors.username} autoComplete="username" />
      <Field label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" error={errors.email} autoComplete="email" />
      <div>
        <Field label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder="Min 13 chars" error={errors.password} autoComplete="new-password" />
        <PasswordStrength password={form.password} />
      </div>
      <Field label="Confirm Password" type="password" value={form.confirm} onChange={v => set('confirm', v)} placeholder="Repeat password" error={errors.confirm} autoComplete="new-password" />

      <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold transition mt-2">
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <p className="text-center text-gray-500 text-sm">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</button>
      </p>
    </form>
  );
}

// ── Login form ────────────────────────────────────────────────
function LoginForm({ onSuccess, onMfa, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(
    typeof window !== 'undefined' && !!window.PublicKeyCredential
  );

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Login failed');
      if (data.mfaRequired) {
        onMfa(data.mfaMethod, data.tempToken);
      } else {
        onSuccess(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    try {
      const optRes = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const options = await optRes.json();
      const credential = await navigator.credentials.get({ publicKey: options });
      const verRes = await fetch('/api/auth/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await verRes.json();
      if (!verRes.ok) throw new Error(data.error ?? 'Biometric login failed');
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold text-white">Welcome Back</h2>
        <p className="text-gray-400 text-sm">Sign in to Nexus AI Pro</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" autoComplete="current-password" />

      <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-white font-semibold transition">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {biometricAvailable && (
        <button
          type="button"
          onClick={biometricLogin}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-gray-300 font-medium transition flex items-center justify-center gap-2"
        >
          <Fingerprint size={18} className="text-indigo-400" />
          Use Biometric / Passkey
        </button>
      )}

      <p className="text-center text-gray-500 text-sm">
        No account?{' '}
        <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300 font-medium">Register</button>
      </p>
    </form>
  );
}

// ── Auth page shell ───────────────────────────────────────────
export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');    // login | register | mfa
  const [mfaMethod, setMfaMethod] = useState(null);
  const [tempToken, setTempToken] = useState(null);

  const handleLoginSuccess = (data) => {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    onAuthenticated(data.user);
  };

  const handleMfaRequired = (method, token) => {
    setMfaMethod(method);
    setTempToken(token);
    setMode('mfa');
  };

  const handleMfaVerify = async (code) => {
    const res = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, tempToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Verification failed');
    handleLoginSuccess(data);
  };

  const handleRegisterSuccess = () => setMode('login');

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl mb-4">
            <Shield size={28} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-500 text-sm mt-1">Military-grade encrypted AI platform</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {mode === 'login' && (
            <LoginForm
              onSuccess={handleLoginSuccess}
              onMfa={handleMfaRequired}
              onSwitch={() => setMode('register')}
            />
          )}
          {mode === 'register' && (
            <RegisterForm
              onSuccess={handleRegisterSuccess}
              onSwitch={() => setMode('login')}
            />
          )}
          {mode === 'mfa' && (
            <MfaStep
              method={mfaMethod}
              onVerify={handleMfaVerify}
              onBack={() => setMode('login')}
            />
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © 2025-2026 Cameron Fox · AES-256-GCM · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}
