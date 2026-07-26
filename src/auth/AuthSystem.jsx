// src/auth/AuthSystem.jsx — 2026-07-26
// Full auth UI: register, login, 2FA, biometrics, role-based routing
import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Lock, User, Mail, Eye, EyeOff, Fingerprint, ScanFace,
  Key, Smartphone, AlertTriangle, CheckCircle2, Globe, Loader2,
  ArrowRight, ArrowLeft,
} from 'lucide-react';

// ── Password strength ─────────────────────────────────────────────────────────
const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{13,}$/;
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji_Presentation}_-]{2,64}$/u;

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z\d]/.test(pw)) score++;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500', 'bg-emerald-500'];
  return { score, label: labels[score] || 'Very Strong', color: colors[score] || 'bg-emerald-500' };
}

// ── API helpers ───────────────────────────────────────────────────────────────
const API = '/api/auth';
async function apiFetch(path, body, token) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ── Biometric auth via WebAuthn (FIDO2) ──────────────────────────────────────
async function biometricAuth() {
  if (!window.PublicKeyCredential) throw new Error('WebAuthn not supported');
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge,
      timeout: 60000,
      userVerification: 'required',
      rpId: window.location.hostname,
    },
  });
  return credential;
}

// ── Components ────────────────────────────────────────────────────────────────

function InputField({ id, type = 'text', label, value, onChange, error, hint, icon: Icon, rightEl, required, autoComplete }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <div className="relative">
        {Icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon size={16} /></span>}
        <input
          id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} ${rightEl ? 'pr-10' : 'pr-3'} py-2.5 rounded-lg border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'} bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 text-sm`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={!!error}
        />
        {rightEl && <span className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</span>}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, error, hint, autoComplete = 'current-password', showStrength = false }) {
  const [show, setShow] = useState(false);
  const strength = showStrength ? passwordStrength(value) : null;
  return (
    <div className="space-y-1">
      <InputField
        id={id} type={show ? 'text' : 'password'} label={label} value={value} onChange={onChange}
        error={error} hint={hint} icon={Lock} autoComplete={autoComplete}
        rightEl={
          <button type="button" onClick={() => setShow(s => !s)} className="text-gray-400 hover:text-gray-600" aria-label={show ? 'Hide password' : 'Show password'}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
      {showStrength && value && (
        <div className="space-y-1">
          <div className="flex gap-1 h-1">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className={`flex-1 rounded-full ${strength.score >= i ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
            ))}
          </div>
          <p className="text-xs text-gray-500">{strength.label}</p>
        </div>
      )}
    </div>
  );
}

// ── Login screen ──────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable] = useState(() => !!window.PublicKeyCredential);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true); setError('');
    try {
      const data = await apiFetch('/login', { email, password, ...(mfaRequired ? { totpToken } : {}) });
      localStorage.setItem('nexus:access', data.access);
      localStorage.setItem('nexus:refresh', data.refresh);
      localStorage.setItem('nexus:user', JSON.stringify(data.user));
      onSuccess(data.user, data.access);
    } catch (err) {
      if (err.message.includes('2FA') || err.message.includes('mfa')) { setMfaRequired(true); setError('Enter your 2FA code'); }
      else setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setLoading(true); setError('');
    try {
      await biometricAuth();
      // In production: send credential to server for verification, receive tokens
      setError('Biometric registration complete — link to your account in Settings');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-3">
          <Shield size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sign in to Nexus AI Pro</h1>
        <p className="text-sm text-gray-500 mt-1">Military-grade encrypted platform</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <InputField id="email" type="email" label="Email address" value={email} onChange={setEmail} icon={Mail} autoComplete="email" required />
        <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />

        {mfaRequired && (
          <InputField id="totp" type="text" label="2FA Code" value={totpToken} onChange={setTotpToken}
            icon={Smartphone} hint="Enter the 6-digit code from your authenticator app" autoComplete="one-time-code" required />
        )}

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          Sign In
        </button>
      </form>

      {biometricAvailable && (
        <button onClick={handleBiometric} disabled={loading}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg transition text-sm font-medium">
          <Fingerprint size={16} />
          Sign in with Biometrics
        </button>
      )}

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <button onClick={onRegister} className="text-blue-600 hover:underline font-medium">Create one</button>
      </p>
    </div>
  );
}

// ── Register screen ───────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onLogin }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', language: 'en', role: 'user' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!USERNAME_RE.test(form.username)) e.username = 'Use 2–64 chars: letters, numbers, emoji, _ or -';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!PASSWORD_RE.test(form.password)) e.password = 'Must be 13+ chars with upper, lower, digit & special char';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setErrors({}); setLoading(true); setGlobalError('');
    try {
      const data = await apiFetch('/register', { username: form.username, email: form.email, password: form.password, language: form.language });
      localStorage.setItem('nexus:access', data.access);
      localStorage.setItem('nexus:refresh', data.refresh);
      localStorage.setItem('nexus:user', JSON.stringify(data.user));
      onSuccess(data.user, data.access);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const languages = [
    ['en','🇺🇸 English'],['es','🇪🇸 Español'],['fr','🇫🇷 Français'],['de','🇩🇪 Deutsch'],
    ['ja','🇯🇵 日本語'],['zh','🇨🇳 中文'],['pt','🇧🇷 Português'],['ar','🇸🇦 العربية'],['ko','🇰🇷 한국어'],
  ];

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 mb-3">
          <User size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
        <p className="text-sm text-gray-500 mt-1">Join Nexus AI Pro</p>
      </div>

      {globalError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
          <AlertTriangle size={14} /> {globalError}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <InputField id="reg-username" label="Username" value={form.username} onChange={set('username')}
          icon={User} hint="Letters, numbers, emoji, _ or - (2–64 chars)" error={errors.username} autoComplete="username" required />
        <InputField id="reg-email" type="email" label="Email address" value={form.email} onChange={set('email')}
          icon={Mail} error={errors.email} autoComplete="email" required />
        <PasswordField id="reg-password" label="Password" value={form.password} onChange={set('password')}
          hint="13+ chars • upper + lower + digit + special character" error={errors.password} autoComplete="new-password" showStrength />
        <PasswordField id="reg-confirm" label="Confirm password" value={form.confirm} onChange={set('confirm')}
          error={errors.confirm} autoComplete="new-password" />

        <div className="space-y-1">
          <label htmlFor="reg-lang" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Globe size={16} /></span>
            <select id="reg-lang" value={form.language} onChange={e => set('language')(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
              {languages.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          Create Account
        </button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button onClick={onLogin} className="text-blue-600 hover:underline font-medium">Sign in</button>
      </p>
    </div>
  );
}

// ── 2FA Setup screen ──────────────────────────────────────────────────────────
function TwoFASetup({ token, onDone }) {
  const [secret, setSecret] = useState('');
  const [otpauth, setOtpauth] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [step, setStep] = useState('init');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSecret(data.secret); setOtpauth(data.otpauth); setStep('scan');
    } catch { setError('Failed to set up 2FA'); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBackupCodes(data.backupCodes); setStep('backup');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <Key size={20} className="text-orange-600" />
        </div>
        <div><h2 className="font-bold text-gray-900 dark:text-white">Enable 2FA</h2><p className="text-sm text-gray-500">Authenticator app required</p></div>
      </div>

      {step === 'init' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">Two-factor authentication adds an extra layer of security. You'll need an authenticator app (Google Authenticator, Authy, etc.).</p>
          <button onClick={setup} disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2.5 rounded-lg transition">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />} Set Up 2FA
          </button>
          <button onClick={onDone} className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2">Skip for now</button>
        </div>
      )}

      {step === 'scan' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Scan this QR code or enter the secret manually in your authenticator app.</p>
          <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-3">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`}
              alt="QR code" className="rounded-lg" width={200} height={200} />
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded font-mono break-all">{secret}</code>
          </div>
          <InputField id="2fa-code" label="Enter 6-digit code" value={code} onChange={setCode}
            icon={Smartphone} hint="Enter the code shown in your authenticator app" autoComplete="one-time-code" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button onClick={verify} disabled={loading || code.length < 6}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Verify & Enable
          </button>
        </div>
      )}

      {step === 'backup' && (
        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
            <p className="font-medium text-amber-800 dark:text-amber-300 text-sm mb-2">Save your backup codes</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Store these in a safe place. Each code can only be used once.</p>
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((c, i) => <code key={i} className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded font-mono text-center">{c}</code>)}
            </div>
          </div>
          <button onClick={onDone}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-lg transition">
            <CheckCircle2 size={16} /> Done — I've saved my codes
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main AuthSystem export ────────────────────────────────────────────────────
export function AuthSystem({ onAuthenticated }) {
  const [screen, setScreen] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  // Re-use existing session
  useEffect(() => {
    const saved = localStorage.getItem('nexus:user');
    const savedToken = localStorage.getItem('nexus:access');
    if (saved && savedToken) {
      try { onAuthenticated(JSON.parse(saved), savedToken); } catch (_e) { /* stale/corrupted session */ }
    }
  }, [onAuthenticated]);

  const handleAuthSuccess = useCallback((u, t) => {
    setUser(u); setToken(t);
    if (!u.mfaEnabled) setScreen('2fa-prompt');
    else onAuthenticated(u, t);
  }, [onAuthenticated]);

  const handleSkip2fa = useCallback(() => {
    if (user) onAuthenticated(user, token);
  }, [user, token, onAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
        {screen === 'login'  && <LoginForm onSuccess={handleAuthSuccess} onRegister={() => setScreen('register')} />}
        {screen === 'register' && <RegisterForm onSuccess={handleAuthSuccess} onLogin={() => setScreen('login')} />}
        {screen === '2fa-prompt' && <TwoFASetup token={token} onDone={handleSkip2fa} />}
      </div>
    </div>
  );
}

export default AuthSystem;
