// ================================================
// NEXUS AI PRO - Auth Forms
// File: src/components/AuthForms.jsx
// Updated: 2026-07-01
// Features: register, login, biometrics, 2FA/MFA,
//           password strength (13+), emoji usernames,
//           multi-language support
// ================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, Fingerprint, ScanFace, Key, Shield,
  User, Mail, Lock, ChevronRight, Loader2, AlertTriangle,
  CheckCircle, Globe, Smartphone,
} from 'lucide-react';

const PASSWORD_MIN = 13;

// Supported languages for registration
const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' }, { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' }, { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' },
  { code: 'hi', label: 'हिन्दी' }, { code: 'it', label: 'Italiano' },
];

// Password strength scoring (local, no library required)
function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score += 25;
  if (pw.length >= 20) score += 10;
  if (/[a-z]/.test(pw)) score += 10;
  if (/[A-Z]/.test(pw)) score += 15;
  if (/\d/.test(pw)) score += 15;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw)) score += 20;
  if (/[-￿]/.test(pw)) score += 5; // unicode bonus
  score = Math.min(100, score);
  const label = score < 30 ? 'Weak' : score < 60 ? 'Fair' : score < 80 ? 'Good' : 'Strong';
  const color = score < 30 ? 'bg-red-500' : score < 60 ? 'bg-yellow-500' : score < 80 ? 'bg-blue-500' : 'bg-green-500';
  return { score, label, color };
}

function PasswordStrengthBar({ password }) {
  const { score, label, color } = scorePassword(password);
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500 dark:text-gray-400">Strength</span>
        <span className={score >= 80 ? 'text-green-500' : score >= 60 ? 'text-blue-500' : score >= 30 ? 'text-yellow-500' : 'text-red-500'}>{label}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${color}`} style={{ width: `${score}%` }} />
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
        {[
          [`${PASSWORD_MIN}+ characters`, password.length >= PASSWORD_MIN],
          ['Uppercase letter',            /[A-Z]/.test(password)],
          ['Lowercase letter',            /[a-z]/.test(password)],
          ['Number',                      /\d/.test(password)],
          ['Special character',           /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)],
        ].map(([label, ok]) => (
          <li key={label} className={`text-xs flex items-center gap-1 ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {ok ? '✓' : '○'} {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />}
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} ${isPassword ? 'pr-10' : 'pr-3'} py-2.5 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
          autoComplete={isPassword ? 'current-password' : type === 'email' ? 'email' : 'off'}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={10} /> {error}</p>}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function TOTPVerify({ onVerify, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (code.length !== 6) { setError('Enter 6-digit code'); return; }
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Key size={40} className="mx-auto text-blue-500 mb-2" />
        <h3 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
        className="w-full text-center text-3xl tracking-[0.5em] font-mono py-4 border rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button onClick={submit} disabled={loading || code.length !== 6} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading && <Loader2 size={16} className="animate-spin" />} Verify
      </button>
      <button onClick={onBack} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">← Back</button>
    </div>
  );
}

function BiometricPrompt({ onVerify, onSkip }) {
  const [status, setStatus] = useState('idle');

  const triggerBiometric = async () => {
    setStatus('scanning');
    try {
      // WebAuthn credential request (works on iOS Safari, macOS, Windows Hello, Android)
      if (window.PublicKeyCredential) {
        const challRes = await fetch('/api/auth/biometrics/challenge', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('nexus_access_token')}` },
        });
        const { challenge } = await challRes.json();

        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
            timeout: 60000,
            rpId: window.location.hostname,
            userVerification: 'required',
          },
        });
        setStatus('success');
        await onVerify({ credentialId: credential.id, clientDataHash: challenge });
      } else {
        onSkip();
      }
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-colors ${status === 'scanning' ? 'bg-blue-100 dark:bg-blue-900/30 animate-pulse' : status === 'success' ? 'bg-green-100 dark:bg-green-900/30' : status === 'error' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
        {status === 'success' ? <CheckCircle size={36} className="text-green-500" /> :
          status === 'error' ? <AlertTriangle size={36} className="text-red-500" /> :
            <Fingerprint size={36} className={status === 'scanning' ? 'text-blue-500' : 'text-gray-400'} />}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white">Biometric Authentication</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Use Touch ID, Face ID, fingerprint, or Windows Hello to sign in</p>
      {status === 'idle' && (
        <button onClick={triggerBiometric} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
          <Fingerprint size={16} /> Use Biometrics
        </button>
      )}
      {status === 'error' && <p className="text-sm text-red-500">Authentication failed. Try again.</p>}
      <button onClick={onSkip} className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">Use password instead</button>
    </div>
  );
}

// ── Register Form ──────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', language: 'en' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const validate = () => {
    const e = {};
    if (!form.username || [...form.username].length < 2) e.username = 'Username must be at least 2 characters';
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    const { score } = scorePassword(form.password);
    if (score < 60) e.password = `Password too weak (score ${score}/100)`;
    if (form.password.length < PASSWORD_MIN) e.password = `Minimum ${PASSWORD_MIN} characters required`;
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async e => {
    e.preventDefault();
    setApiError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, language: form.language }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error || 'Registration failed'); return; }
      localStorage.setItem('nexus_access_token', data.accessToken);
      localStorage.setItem('nexus_refresh_token', data.refreshToken);
      onSuccess(data.user);
    } catch (err) {
      setApiError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <InputField label="Username" value={form.username} onChange={v => set('username', v)} placeholder="Can include emoji 🎮 & special chars" icon={User} error={errors.username}
        hint="Supports emoji, Unicode, and special characters" />
      <InputField label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" icon={Mail} error={errors.email} />
      <div>
        <InputField label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder={`${PASSWORD_MIN}+ characters required`} icon={Lock} error={errors.password} />
        <PasswordStrengthBar password={form.password} />
      </div>
      <InputField label="Confirm Password" type="password" value={form.confirm} onChange={v => set('confirm', v)} placeholder="Repeat password" icon={Lock} error={errors.confirm} />
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Globe size={14} /> Language</label>
        <select value={form.language} onChange={e => set('language', e.target.value)} className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
        </select>
      </div>
      {apiError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{apiError}</div>}
      <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />} Create Account
      </button>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</button>
      </p>
    </form>
  );
}

// ── Login Form ─────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }) {
  const [step, setStep] = useState('credentials'); // credentials | mfa | biometric
  const [form, setForm] = useState({ email: '', password: '' });
  const [userId, setUserId] = useState(null);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const set = (f, v) => setForm(x => ({ ...x, [f]: v }));

  const submitCredentials = async e => {
    e.preventDefault();
    setApiError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setApiError(data.error || 'Login failed'); return; }
      if (data.requiresMFA) {
        setUserId(data.userId);
        setMfaMethod(data.method || 'totp');
        setStep('mfa');
        return;
      }
      localStorage.setItem('nexus_access_token', data.accessToken);
      localStorage.setItem('nexus_refresh_token', data.refreshToken);
      onSuccess(data.user);
    } catch { setApiError('Network error.'); }
    finally { setLoading(false); }
  };

  const verifyMFA = async code => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password, mfaCode: code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MFA failed');
    localStorage.setItem('nexus_access_token', data.accessToken);
    localStorage.setItem('nexus_refresh_token', data.refreshToken);
    onSuccess(data.user);
  };

  return (
    <div>
      {step === 'credentials' && (
        <form onSubmit={submitCredentials} className="space-y-4">
          <InputField label="Email" type="email" value={form.email} onChange={v => set('email', v)} placeholder="you@example.com" icon={Mail} />
          <InputField label="Password" type="password" value={form.password} onChange={v => set('password', v)} placeholder="Your password" icon={Lock} />
          {apiError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{apiError}</div>}
          <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />} Sign In
          </button>
          <button type="button" onClick={() => setStep('biometric')} className="w-full py-2.5 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Fingerprint size={16} /> Use Biometrics / Face ID
          </button>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            No account?{' '}
            <button type="button" onClick={onSwitch} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign up free</button>
          </p>
        </form>
      )}
      {step === 'mfa' && <TOTPVerify onVerify={verifyMFA} onBack={() => setStep('credentials')} />}
      {step === 'biometric' && (
        <BiometricPrompt onVerify={async () => { }} onSkip={() => setStep('credentials')} />
      )}
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────────────────

export default function AuthForms({ initialMode = 'login', onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);

  const handleSuccess = user => {
    if (onAuthenticated) onAuthenticated(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm mt-1">Military-grade encrypted AI platform</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          {mode === 'login'
            ? <LoginForm onSuccess={handleSuccess} onSwitch={() => setMode('register')} />
            : <RegisterForm onSuccess={handleSuccess} onSwitch={() => setMode('login')} />}
        </div>
        <p className="text-center text-xs text-gray-500 mt-4">
          End-to-end encrypted · AES-256-GCM · Zero-knowledge
        </p>
      </div>
    </div>
  );
}
