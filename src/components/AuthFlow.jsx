// ================================================
// NEXUS AI PRO - Authentication Flow
// Updated: 2026-06-13
// ------------------------------------------------
// Register / Login / 2FA / MFA / Biometrics
// Password: 13+ chars, upper, lower, digit, symbol
// Usernames: support emojis & special characters
// Biometrics: WebAuthn (fingerprint, Face ID, retina)
// 2FA: TOTP (authenticator app) + Email OTP
// MFA: biometric + TOTP
// ================================================

import React, { useState, useCallback } from 'react';
import {
  Mail, Lock, User, Eye, EyeOff, Fingerprint, ScanFace,
  Shield, AlertCircle, CheckCircle, Loader2, ArrowRight,
  KeyRound, Smartphone, RefreshCw, ChevronLeft
} from 'lucide-react';

const API_BASE = '/api/auth';

async function apiFetch(path, body, method = 'POST') {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Password strength bar ─────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: 'Min 13 characters',     pass: password.length >= 13 },
    { label: 'Uppercase letter',       pass: /[A-Z]/.test(password) },
    { label: 'Lowercase letter',       pass: /[a-z]/.test(password) },
    { label: 'Number',                 pass: /[0-9]/.test(password) },
    { label: 'Special character',      pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-red-500','bg-red-500','bg-orange-500','bg-yellow-500','bg-emerald-500','bg-emerald-500'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {checks.map((_, i) => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < score ? colors[score] : 'bg-gray-600'}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checks.map((c, i) => (
          <div key={i} className={`flex items-center gap-1 text-xs ${c.pass ? 'text-emerald-400' : 'text-gray-500'}`}>
            <CheckCircle size={10} className={c.pass ? 'text-emerald-400' : 'text-gray-600'} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Input field ───────────────────────────────────
function Field({ label, type, value, onChange, placeholder, autoComplete, required, error, ...rest }) {
  const [showPass, setShowPass] = useState(false);
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type;

  return (
    <div className="space-y-1">
      <label className="text-gray-400 text-xs font-medium">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`w-full bg-gray-700 border ${error ? 'border-red-500' : 'border-gray-600'} focus:border-indigo-500 text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors placeholder-gray-500`}
          {...rest}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPass(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

// ── Error box ─────────────────────────────────────
function ErrorBox({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
      <AlertCircle size={14} className="flex-shrink-0" />
      {message}
    </div>
  );
}

// ── TOTP step ─────────────────────────────────────
function TOTPStep({ userId, onSuccess, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code from your authenticator app');
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/otp/verify', { userId, code });
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Smartphone size={40} className="text-indigo-400 mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl">Two-Factor Authentication</h2>
        <p className="text-gray-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>
      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          className="w-full bg-gray-700 border border-gray-600 focus:border-indigo-500 text-white text-center text-3xl tracking-widest rounded-lg px-3 py-4 outline-none"
        />
        <ErrorBox message={error} />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Verify'}
        </button>
        <button type="button" onClick={onBack} className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors">
          ← Back to login
        </button>
      </form>
    </div>
  );
}

// ── Biometric button ──────────────────────────────
function BiometricButton({ onSuccess, userId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleBiometric = async () => {
    if (!window.PublicKeyCredential) {
      return setError('WebAuthn not supported on this browser/device');
    }

    setLoading(true);
    setError('');

    try {
      // Get challenge from server
      const optRes = await fetch(`${API_BASE}/webauthn/authenticate/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const options = await optRes.json();

      // Convert base64url challenge to ArrayBuffer
      const challenge = Uint8Array.from(atob(options.challenge.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
      const credential = await navigator.credentials.get({
        publicKey: { ...options, challenge },
      });

      // Verify with server
      const verRes = await apiFetch('/webauthn/authenticate/verify', {
        userId,
        credentialId: credential.id,
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData))),
          clientDataJSON:    btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
          signature:         btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
        },
      });

      onSuccess(verRes);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled');
      } else {
        setError(err.message || 'Biometric authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleBiometric}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white border border-gray-600 rounded-lg py-3 font-medium text-sm transition-colors"
      >
        {loading
          ? <Loader2 size={16} className="animate-spin" />
          : <Fingerprint size={16} className="text-indigo-400" />
        }
        {loading ? 'Authenticating...' : 'Use Fingerprint / Face ID'}
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}

// ── Register form ─────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm]     = useState({ email: '', username: '', displayName: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email.includes('@')) errs.email = 'Valid email required';
    if (form.username && (form.username.length < 3 || form.username.length > 50)) {
      errs.username = '3-50 characters';
    }
    if (form.password.length < 13)          errs.password = 'Minimum 13 characters';
    if (!/[A-Z]/.test(form.password))       errs.password = (errs.password || '') + ' + uppercase';
    if (!/[a-z]/.test(form.password))       errs.password = (errs.password || '') + ' + lowercase';
    if (!/[0-9]/.test(form.password))       errs.password = (errs.password || '') + ' + number';
    if (!/[^A-Za-z0-9]/.test(form.password)) errs.password = (errs.password || '') + ' + symbol';
    if (form.password !== form.confirm)     errs.confirm  = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) return setFieldErrors(errs);

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/register', {
        email: form.email,
        username: form.username || undefined,
        displayName: form.displayName || undefined,
        password: form.password,
      });
      if (data.accessToken) {
        sessionStorage.setItem('accessToken', data.accessToken);
        sessionStorage.setItem('refreshToken', data.refreshToken);
      }
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Shield size={40} className="text-indigo-400 mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl">Create Account</h2>
        <p className="text-gray-400 text-sm mt-1">Join Nexus AI Pro</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email Address" type="email" value={form.email} onChange={set('email')}
          placeholder="you@example.com" autoComplete="email" required error={fieldErrors.email} />
        <Field label="Username (supports emojis 🚀)" type="text" value={form.username} onChange={set('username')}
          placeholder="@your_username 🎮" autoComplete="username" error={fieldErrors.username} />
        <Field label="Display Name (optional)" type="text" value={form.displayName} onChange={set('displayName')}
          placeholder="Your Name" autoComplete="name" />
        <div>
          <Field label="Password" type="password" value={form.password} onChange={set('password')}
            placeholder="Min 13 chars, mixed case + symbol" autoComplete="new-password" required error={fieldErrors.password} />
          <PasswordStrength password={form.password} />
        </div>
        <Field label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')}
          placeholder="Repeat password" autoComplete="new-password" required error={fieldErrors.confirm} />

        <ErrorBox message={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p className="text-center text-gray-500 text-sm">
          Already have an account?{' '}
          <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300">
            Sign in
          </button>
        </p>
      </form>
    </div>
  );
}

// ── Login form ────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [form, setForm]     = useState({ email: '', password: '', totpToken: '' });
  const [step, setStep]     = useState('credentials'); // credentials | totp | biometric
  const [mfaUserId, setMfaUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return setError('Email and password required');

    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/login', { email: form.email, password: form.password });

      if (data.requiresMfa) {
        setMfaUserId(data.userId);
        setStep('totp');
        return;
      }

      if (data.accessToken) {
        sessionStorage.setItem('accessToken', data.accessToken);
        sessionStorage.setItem('refreshToken', data.refreshToken);
      }
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSuccess = (data) => {
    if (data.accessToken) {
      sessionStorage.setItem('accessToken', data.accessToken);
      sessionStorage.setItem('refreshToken', data.refreshToken);
    }
    onSuccess(data);
  };

  if (step === 'totp') {
    return <TOTPStep userId={mfaUserId} onSuccess={handleMfaSuccess} onBack={() => setStep('credentials')} />;
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <Shield size={40} className="text-indigo-400 mx-auto mb-3" />
        <h2 className="text-white font-bold text-xl">Sign In</h2>
        <p className="text-gray-400 text-sm mt-1">Welcome back to Nexus AI Pro</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Email Address" type="email" value={form.email} onChange={set('email')}
          placeholder="you@example.com" autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={set('password')}
          placeholder="Your password" autoComplete="current-password" required />

        <ErrorBox message={error} />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg py-3 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-gray-500 text-xs">or</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <BiometricButton onSuccess={handleMfaSuccess} userId={null} />

        <p className="text-center text-gray-500 text-sm">
          No account yet?{' '}
          <button type="button" onClick={onSwitch} className="text-indigo-400 hover:text-indigo-300">
            Create one
          </button>
        </p>
      </form>
    </div>
  );
}

// ── Main auth shell ───────────────────────────────
export default function AuthFlow({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // login | register

  const handleSuccess = useCallback((data) => {
    if (onAuthenticated) onAuthenticated(data);
  }, [onAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-2xl p-8 shadow-2xl">
        {mode === 'login'
          ? <LoginForm onSuccess={handleSuccess} onSwitch={() => setMode('register')} />
          : <RegisterForm onSuccess={handleSuccess} onSwitch={() => setMode('login')} />
        }
      </div>
    </div>
  );
}
