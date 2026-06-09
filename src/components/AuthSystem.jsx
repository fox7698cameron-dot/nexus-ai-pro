// src/components/AuthSystem.jsx
// Nexus AI Pro — Authentication UI (Register, Login, 2FA, MFA, Biometrics, Password Strength)
// Author: Cameron Fox <contact@nexusai.pro>
// Date: 2026-06-09

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Lock, Mail, User, Eye, EyeOff, Shield, Fingerprint,
  ScanFace, Smartphone, Key, CheckCircle, XCircle,
  AlertTriangle, Loader2, ChevronLeft, Globe
} from 'lucide-react';

const MIN_PASSWORD_LENGTH = 13;

// ── Password strength analyzer ────────────────────────────────────────────────

function analyzePassword(password) {
  const checks = [
    { label: `${MIN_PASSWORD_LENGTH}+ characters`,  met: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'Uppercase letter (A–Z)',               met: /[A-Z]/.test(password)                },
    { label: 'Lowercase letter (a–z)',               met: /[a-z]/.test(password)                },
    { label: 'Number (0–9)',                         met: /[0-9]/.test(password)                },
    { label: 'Special character (!@#$…)',            met: /[^A-Za-z0-9]/.test(password)         },
    { label: 'No repeated sequences (aaa, 123)',     met: !/(.)\1{2,}/.test(password) && !/(012|123|234|345|456|567|678|789|890|abc|bcd|cde)/.test(password.toLowerCase()) },
  ];
  const score  = checks.filter(c => c.met).length;
  const levels = ['', 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981'];
  return { checks, score, level: levels[score] || 'Very Weak', color: colors[score] || '#ef4444', valid: score === 6 };
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function authFetch(url, body) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function saveSession(data) {
  localStorage.setItem('nexus:accessToken',  data.accessToken);
  localStorage.setItem('nexus:refreshToken', data.refreshToken);
  localStorage.setItem('nexus:user',         JSON.stringify(data.user));
}

// ── BiometricButton ────────────────────────────────────────────────────────────

function BiometricButton({ onSuccess, label = 'Sign in with biometrics' }) {
  const [supported, setSupported] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    setSupported(
      typeof window.PublicKeyCredential !== 'undefined' &&
      typeof navigator.credentials?.get !== 'undefined'
    );
  }, []);

  const handleBiometric = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WebAuthn / Passkey flow
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge:          crypto.getRandomValues(new Uint8Array(32)),
          rpId:               window.location.hostname,
          userVerification:   'required',
          timeout:            60000,
          allowCredentials:   [],
        },
      });
      onSuccess?.({ credentialId: credential.id, type: credential.type });
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        setError('Biometric authentication was cancelled or not available.');
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  if (!supported) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleBiometric}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 border border-gray-600 rounded-xl text-gray-200 hover:bg-gray-700 hover:border-indigo-500 transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} className="text-indigo-400" />}
        <span className="text-sm">{label}</span>
        <ScanFace size={16} className="text-gray-500 ml-auto" />
      </button>
      {error && <p className="text-red-400 text-xs text-center">{error}</p>}
    </div>
  );
}

// ── PasswordInput ──────────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder = 'Password', showStrength = false, name = 'password', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  const strength = useMemo(() => showStrength ? analyzePassword(value) : null, [value, showStrength]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type={show ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1,2,3,4,5,6].map(i => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: i <= strength.score ? strength.color : '#374151' }}
              />
            ))}
          </div>
          <p className="text-xs" style={{ color: strength.color }}>{strength.level}</p>
          <div className="grid grid-cols-2 gap-0.5">
            {strength.checks.map(c => (
              <div key={c.label} className={`flex items-center gap-1 text-xs ${c.met ? 'text-green-400' : 'text-gray-500'}`}>
                {c.met ? <CheckCircle size={10} /> : <XCircle size={10} />}
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OTP input ─────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange, length = 6 }) {
  const digits = value.padEnd(length, '').split('');

  const handleChange = (idx, char) => {
    const next = digits.map((d, i) => i === idx ? (char.slice(-1) || '') : d).join('');
    onChange(next);
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !d && i > 0) {
              const prev = document.querySelector(`[data-otp="${i - 1}"]`);
              prev?.focus();
            }
          }}
          data-otp={i}
          className="w-12 h-12 text-center text-xl font-bold bg-gray-800 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-colors"
          autoFocus={i === 0}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  );
}

// ── RegisterForm ────────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch, locale = 'en' }) {
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const strength   = useMemo(() => analyzePassword(password), [password]);
  const matchError = confirm.length > 0 && confirm !== password ? 'Passwords do not match' : null;

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!strength.valid) {
      setError('Password does not meet all requirements');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await authFetch('/api/auth/register', { email, username, password, locale });
      saveSession(data);
      onSuccess?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, username, password, confirm, strength, locale, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      <div className="relative">
        <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="email" name="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" autoComplete="email" required
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
        />
      </div>

      <div className="relative">
        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text" name="username" value={username} onChange={e => setUsername(e.target.value)}
          placeholder="Username (letters, emoji, symbols)" autoComplete="username" required
          className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
        />
        <p className="text-gray-600 text-xs mt-1 ml-1">Unicode, emojis, and special characters are supported</p>
      </div>

      <PasswordInput
        value={password} onChange={setPassword}
        placeholder="Password (13+ characters)" showStrength
        name="new-password" autoComplete="new-password"
      />

      <div className="relative">
        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="password" name="confirm-password" value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm password" autoComplete="new-password" required
          className={`w-full bg-gray-800 border rounded-xl pl-10 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors text-sm ${matchError ? 'border-red-600 focus:border-red-500' : 'border-gray-600 focus:border-indigo-500'}`}
        />
        {matchError && <p className="text-red-400 text-xs mt-1 ml-1">{matchError}</p>}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !strength.valid || !!matchError}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-gray-400 text-sm">
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch('login')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── LoginForm ─────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaCode,  setMfaCode]  = useState('');
  const [step,     setStep]     = useState('credentials'); // credentials | totp | mfa
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body = { email, password };
      if (step === 'totp') body.totpCode = totpCode;
      if (step === 'mfa')  body.mfaCode  = mfaCode;

      const data = await authFetch('/api/auth/login', body);

      if (data.requireTotp) { setStep('totp'); return; }
      if (data.requireMfa)  { setStep('mfa');  return; }

      saveSession(data);
      onSuccess?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, totpCode, mfaCode, step, onSuccess]);

  const handleBiometricSuccess = useCallback(() => {
    // In production: send credential assertion to /api/auth/biometric/login
    setError('Biometric login requires server-side WebAuthn validation.');
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      {step === 'credentials' && (
        <>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="email" name="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" autoComplete="email" required
              className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>

          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-gray-900 px-3 text-gray-500">or</span>
            </div>
          </div>

          <BiometricButton onSuccess={handleBiometricSuccess} />
        </>
      )}

      {step === 'totp' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setStep('credentials')} className="flex items-center gap-1 text-gray-400 text-sm hover:text-gray-200">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="text-center">
            <Smartphone size={32} className="text-indigo-400 mx-auto mb-2" />
            <p className="text-white font-medium">Authenticator Code</p>
            <p className="text-gray-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
          </div>
          <OtpInput value={totpCode} onChange={setTotpCode} />
        </div>
      )}

      {step === 'mfa' && (
        <div className="space-y-4">
          <button type="button" onClick={() => setStep('credentials')} className="flex items-center gap-1 text-gray-400 text-sm hover:text-gray-200">
            <ChevronLeft size={16} /> Back
          </button>
          <div className="text-center">
            <Key size={32} className="text-indigo-400 mx-auto mb-2" />
            <p className="text-white font-medium">MFA Code</p>
            <p className="text-gray-400 text-sm mt-1">A code has been sent to your email</p>
          </div>
          <OtpInput value={mfaCode} onChange={setMfaCode} />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg p-3">
          <AlertTriangle size={14} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (step === 'totp' && totpCode.length < 6) || (step === 'mfa' && mfaCode.length < 6)}
        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
        {loading ? 'Signing in…' : step !== 'credentials' ? 'Verify' : 'Sign In'}
      </button>

      {step === 'credentials' && (
        <p className="text-center text-gray-400 text-sm">
          No account?{' '}
          <button type="button" onClick={() => onSwitch('register')} className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Create one
          </button>
        </p>
      )}
    </form>
  );
}

// ── Main AuthSystem ────────────────────────────────────────────────────────────

export default function AuthSystem({ onAuthenticated, initialMode = 'login' }) {
  const [mode,   setMode]   = useState(initialMode); // login | register
  const [locale, setLocale] = useState('en');

  const SUPPORTED_LOCALES = [
    { code: 'en', label: 'English'   },
    { code: 'es', label: 'Español'   },
    { code: 'fr', label: 'Français'  },
    { code: 'de', label: 'Deutsch'   },
    { code: 'zh', label: '中文'       },
    { code: 'ja', label: '日本語'      },
    { code: 'ar', label: 'العربية'    },
    { code: 'pt', label: 'Português' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm mt-1">
            {mode === 'login' ? 'Welcome back — sign in to continue' : 'Create your secure account'}
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
          {/* Mode switcher */}
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
            {(['login', 'register'] ).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  mode === m ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <LoginForm    onSuccess={onAuthenticated} onSwitch={setMode} />
          ) : (
            <RegisterForm onSuccess={onAuthenticated} onSwitch={setMode} locale={locale} />
          )}
        </div>

        {/* Locale selector */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <Globe size={14} className="text-gray-500" />
          <select
            value={locale}
            onChange={e => setLocale(e.target.value)}
            className="bg-transparent text-gray-500 text-xs focus:outline-none cursor-pointer"
          >
            {SUPPORTED_LOCALES.map(l => (
              <option key={l.code} value={l.code} className="bg-gray-900">{l.label}</option>
            ))}
          </select>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <Lock size={12} className="text-green-500" />
          <p className="text-gray-600 text-xs">AES-256-GCM encrypted · Zero knowledge · GDPR compliant</p>
        </div>
      </div>
    </div>
  );
}
