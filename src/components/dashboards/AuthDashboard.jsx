/**
 * src/components/dashboards/AuthDashboard.jsx
 * Nexus AI Pro — Auth UI: Sign-In, Register, MFA, Biometric
 * Created: 2026-07-05
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 *
 * Separate views per role: admin | dev | moderator | user
 * Password: 13+ chars, upper/lower/digit/special; emoji & special chars in username
 * 2FA TOTP, biometric (fingerprint/FaceID/TouchID/retinal) stubs
 */

import React, { useState, useCallback } from 'react';
import {
  Lock, Mail, User, Eye, EyeOff, Fingerprint, ScanFace,
  Shield, ShieldCheck, Key, AlertTriangle, CheckCircle,
  Smartphone, Loader2, QrCode, RefreshCw,
} from 'lucide-react';

// ─── Password strength checker ────────────────────────────────────────────────

function checkPasswordStrength(pw) {
  const checks = {
    length:    pw.length >= 13,
    upper:     /[A-Z]/.test(pw),
    lower:     /[a-z]/.test(pw),
    digit:     /\d/.test(pw),
    special:   /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(pw),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const level = score <= 2 ? 'weak' : score <= 3 ? 'fair' : score === 4 ? 'good' : 'strong';
  return { checks, score, level };
}

const STRENGTH_COLOR = { weak: 'bg-red-500', fair: 'bg-orange-400', good: 'bg-yellow-400', strong: 'bg-green-500' };
const STRENGTH_LABEL = { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' };

function PasswordStrengthBar({ password }) {
  const { checks, score, level } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${i <= score ? STRENGTH_COLOR[level] : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
        {[
          ['13+ chars', checks.length],
          ['Uppercase', checks.upper],
          ['Lowercase', checks.lower],
          ['Digit', checks.digit],
          ['Special char', checks.special],
        ].map(([label, ok]) => (
          <span key={label} className={ok ? 'text-green-400' : 'text-gray-500'}>
            {ok ? '✓' : '○'} {label}
          </span>
        ))}
        <span className={`ml-auto font-medium ${STRENGTH_COLOR[level].replace('bg-', 'text-')}`}>
          {STRENGTH_LABEL[level]}
        </span>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function Field({ label, type = 'text', value, onChange, placeholder, hint, error, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword && show ? 'text' : type;

  return (
    <div className="space-y-1">
      <label className="block text-sm text-gray-300">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 transition-colors ${
            error ? 'border-red-400/60 focus:ring-red-500/30' : 'border-white/10 focus:ring-blue-500/30'
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

const ROLE_COLORS = {
  admin:     'bg-red-500/20 text-red-300 border-red-500/30',
  dev:       'bg-purple-500/20 text-purple-300 border-purple-500/30',
  moderator: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  user:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[role] || ROLE_COLORS.user}`}>
      {role === 'admin' ? '👑' : role === 'dev' ? '⚙️' : role === 'moderator' ? '🛡️' : '👤'}
      {role}
    </span>
  );
}

// ─── API helpers (replace with real fetch when backend is running) ─────────────

async function apiPost(path, body) {
  const res = await fetch(`/api/auth${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AuthDashboard({ onAuthSuccess, className = '' }) {
  const [view,       setView]       = useState('login'); // login | register | mfa | biometric
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [mfaToken,   setMfaToken]   = useState('');
  const [mfaQr,      setMfaQr]      = useState(null);

  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPw: '',
    mfaCode: '', role: 'user',
  });

  const set = key => val => setForm(f => ({ ...f, [key]: val }));
  const clearError = () => setError('');

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async e => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const result = await apiPost('/login', { email: form.email, password: form.password });
      if (result.requiresMfa) {
        setMfaToken(result.mfaToken);
        setView('mfa');
      } else {
        onAuthSuccess?.(result);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [form.email, form.password, onAuthSuccess]);

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = useCallback(async e => {
    e.preventDefault();
    clearError();
    const { score } = checkPasswordStrength(form.password);
    if (score < 5) { setError('Password does not meet requirements'); return; }
    if (form.password !== form.confirmPw) { setError('Passwords do not match'); return; }

    setLoading(true);
    try {
      const result = await apiPost('/register', {
        username: form.username,
        email:    form.email,
        password: form.password,
        role:     form.role,
      });
      // Auto-login after register
      const loginResult = await apiPost('/login', { email: form.email, password: form.password });
      onAuthSuccess?.(loginResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [form, onAuthSuccess]);

  // ── MFA ─────────────────────────────────────────────────────────────────────
  const handleMfa = useCallback(async e => {
    e.preventDefault();
    clearError();
    setLoading(true);
    try {
      const result = await apiPost('/mfa/verify', { mfaToken, code: form.mfaCode });
      onAuthSuccess?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mfaToken, form.mfaCode, onAuthSuccess]);

  // ── Biometric ──────────────────────────────────────────────────────────────
  const handleBiometric = useCallback(async () => {
    clearError();
    setLoading(true);
    try {
      // Platform biometric API (WebAuthn / Capacitor native bridge)
      if (window.PublicKeyCredential) {
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge: new Uint8Array(32),
            timeout:   60000,
            userVerification: 'required',
          },
        });
        if (credential) {
          const result = await apiPost('/biometric/verify', {
            userId:       localStorage.getItem('nexus:biometricUserId'),
            credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
            signature:    btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          });
          onAuthSuccess?.(result);
        }
      } else {
        setError('WebAuthn not supported on this device');
      }
    } catch (err) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  }, [onAuthSuccess]);

  const ROLE_OPTIONS = ['user', 'moderator', 'dev', 'admin'];

  return (
    <div className={`flex items-center justify-center min-h-full p-4 ${className}`}>
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Logo / title */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Nexus AI Pro</h1>
            <p className="text-gray-400 text-sm mt-1">
              {view === 'login'     ? 'Sign in to your account'     :
               view === 'register'  ? 'Create a new account'        :
               view === 'mfa'       ? 'Enter your authenticator code' :
               'Biometric authentication'}
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 bg-red-400/10 border border-red-400/30 rounded-lg px-3 py-2 mb-4 text-sm text-red-400">
              <AlertTriangle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Login form ── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Email" type="email" value={form.email} onChange={set('email')}
                placeholder="you@example.com" autoComplete="email" />
              <Field label="Password" type="password" value={form.password} onChange={set('password')}
                placeholder="Your password" autoComplete="current-password" />

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="flex-1 h-px bg-white/10" />or<div className="flex-1 h-px bg-white/10" />
              </div>

              <button type="button" onClick={handleBiometric} disabled={loading}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg py-2.5 text-sm text-gray-300 transition-colors flex items-center justify-center gap-2">
                <Fingerprint size={14} />
                Sign in with Biometric / Face ID
              </button>

              <p className="text-center text-xs text-gray-500">
                Don't have an account?{' '}
                <button type="button" onClick={() => { setView('register'); clearError(); }}
                  className="text-blue-400 hover:text-blue-300">Create one</button>
              </p>
            </form>
          )}

          {/* ── Register form ── */}
          {view === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <Field label="Username" value={form.username} onChange={set('username')}
                placeholder="Your display name 😊" autoComplete="username"
                hint="3–64 chars — emoji and special characters welcome" />
              <Field label="Email" type="email" value={form.email} onChange={set('email')}
                placeholder="you@example.com" autoComplete="email" />
              <div>
                <Field label="Password" type="password" value={form.password} onChange={set('password')}
                  placeholder="Minimum 13 characters" autoComplete="new-password" />
                <PasswordStrengthBar password={form.password} />
              </div>
              <Field label="Confirm password" type="password" value={form.confirmPw} onChange={set('confirmPw')}
                placeholder="Repeat password" autoComplete="new-password" />

              <div className="space-y-1">
                <label className="block text-sm text-gray-300">Account type</label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} type="button" onClick={() => set('role')(r)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        form.role === r ? 'border-blue-500/60 bg-blue-500/15 text-blue-300' : 'border-white/10 bg-white/5 text-gray-400'
                      }`}>
                      <RoleBadge role={r} />
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {loading ? 'Creating account…' : 'Create Account'}
              </button>

              <p className="text-center text-xs text-gray-500">
                Already have an account?{' '}
                <button type="button" onClick={() => { setView('login'); clearError(); }}
                  className="text-blue-400 hover:text-blue-300">Sign in</button>
              </p>
            </form>
          )}

          {/* ── MFA form ── */}
          {view === 'mfa' && (
            <form onSubmit={handleMfa} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300 flex items-start gap-2">
                <Smartphone size={14} className="flex-shrink-0 mt-0.5" />
                Open your authenticator app and enter the 6-digit code.
              </div>
              <Field label="Authenticator Code" value={form.mfaCode} onChange={set('mfaCode')}
                placeholder="123456" autoComplete="one-time-code"
                hint="Enter the 6-digit TOTP code from your authenticator app" />
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium text-white transition-colors flex items-center justify-center gap-2">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                {loading ? 'Verifying…' : 'Verify Code'}
              </button>
              <button type="button" onClick={() => { setView('login'); clearError(); }}
                className="w-full text-gray-500 text-xs hover:text-gray-300 transition-colors">
                Back to sign in
              </button>
            </form>
          )}

        </div>

        {/* Security note */}
        <p className="text-center text-xs text-gray-600 mt-4 flex items-center justify-center gap-1">
          <Lock size={10} />
          AES-256-GCM encrypted · TLS 1.3 transport · bcrypt-12 passwords
        </p>
      </div>
    </div>
  );
}
