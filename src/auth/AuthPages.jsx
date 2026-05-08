// src/auth/AuthPages.jsx
// Nexus AI Pro - Authentication UI: Login, Register, 2FA, Biometrics
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Created: 2026-05-08

import React, { useState, useCallback } from 'react';
import {
  Lock, Mail, User, Eye, EyeOff, Shield, Fingerprint, ScanFace,
  Smartphone, Key, ChevronRight, CheckCircle, AlertCircle, Loader2,
  Globe
} from 'lucide-react';

// Role options presented to user on register (admin/dev only via invite)
const PUBLIC_ROLES = [
  { value: 'user', label: 'User', description: 'Standard access' },
  { value: 'dev', label: 'Developer', description: 'API access + developer hub' },
];

// Password strength calculator
function calcStrength(password) {
  let score = 0;
  if (password.length >= 13) score++;
  if (password.length >= 20) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (password.length >= 30) score++;
  return score; // 0-7
}

function PasswordStrengthBar({ password }) {
  const score = calcStrength(password);
  const levels = [
    { min: 0, label: '', color: 'bg-transparent' },
    { min: 1, label: 'Very Weak', color: 'bg-red-500' },
    { min: 2, label: 'Weak', color: 'bg-orange-500' },
    { min: 3, label: 'Fair', color: 'bg-yellow-500' },
    { min: 4, label: 'Good', color: 'bg-blue-500' },
    { min: 5, label: 'Strong', color: 'bg-green-500' },
    { min: 6, label: 'Very Strong', color: 'bg-emerald-500' },
    { min: 7, label: 'Excellent', color: 'bg-purple-500' },
  ];
  const level = levels[Math.min(score, 7)];
  if (!password) return null;
  return (
    <div className="mt-1">
      <div className="flex gap-1 mb-1">
        {[...Array(7)].map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i < score ? level.color : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className={`text-xs ${score < 4 ? 'text-red-500' : score < 6 ? 'text-yellow-600' : 'text-green-600'}`}>
        {level.label}
      </p>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder = 'Password', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function InputField({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
      <input
        {...props}
        className={`w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition ${Icon ? 'pl-9 pr-3' : 'px-3'}`}
      />
    </div>
  );
}

function AlertBox({ type, message }) {
  if (!message) return null;
  const styles = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700 dark:text-red-300',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700 dark:text-green-300',
  };
  return (
    <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${styles[type] || styles.error}`}>
      {type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaMode, setMfaMode] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaMethod, setMfaMethod] = useState(null);

  const handleLogin = async (e) => {
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
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.mfaRequired) {
        setMfaToken(data.mfaToken);
        setMfaMethod(data.mfaMethod);
        setMfaMode(true);
      } else {
        onSuccess(data);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaToken, code: mfaCode }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid MFA code'); return; }
      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!window.PublicKeyCredential) {
      setError('Biometric authentication not supported on this device');
      return;
    }
    setLoading(true);
    try {
      const challengeRes = await fetch('/api/auth/biometric/challenge', { method: 'POST' });
      const { challenge } = await challengeRes.json();
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge), c => c.charCodeAt(0)),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      });
      const assertRes = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: Array.from(new Uint8Array(credential.rawId)),
          type: credential.type,
          response: {
            authenticatorData: Array.from(new Uint8Array(credential.response.authenticatorData)),
            clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
            signature: Array.from(new Uint8Array(credential.response.signature)),
          },
        }),
      });
      const data = await assertRes.json();
      if (!assertRes.ok) { setError(data.error || 'Biometric verification failed'); return; }
      onSuccess(data);
    } catch (err) {
      setError(err.message || 'Biometric authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (mfaMode) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <Smartphone size={40} className="mx-auto text-purple-600 mb-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1">
            {mfaMethod === 'totp' ? 'Enter the 6-digit code from your authenticator app' : `Enter the code sent to your ${mfaMethod}`}
          </p>
        </div>
        <AlertBox type="error" message={error} />
        <form onSubmit={handleMFA} className="space-y-4">
          <input
            type="text"
            value={mfaCode}
            onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full text-center text-3xl font-mono tracking-[1rem] py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={loading || mfaCode.length < 6}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Verify
          </button>
        </form>
        <button onClick={() => setMfaMode(false)} className="w-full text-sm text-gray-500 hover:text-gray-700 text-center">Back to login</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Shield size={40} className="mx-auto text-purple-600 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign In</h2>
        <p className="text-sm text-gray-500 mt-1">Nexus AI Pro</p>
      </div>
      <AlertBox type="error" message={error} />
      <form onSubmit={handleLogin} className="space-y-3">
        <InputField icon={Mail} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required />
        <div>
          <PasswordInput value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
      {/* Biometric login */}
      {window.PublicKeyCredential && (
        <button
          onClick={handleBiometric}
          disabled={loading}
          className="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <Fingerprint size={16} className="text-purple-600" />
          Sign in with Biometrics
        </button>
      )}
      <p className="text-center text-sm text-gray-500">
        Don't have an account?{' '}
        <button onClick={onSwitch} className="text-purple-600 hover:underline font-medium">Create one</button>
      </p>
    </div>
  );
}

// ─── Register form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user', locale: 'en' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState([]);

  const update = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setErrors([]);
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
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
          role: form.role,
          locale: form.locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.errors) { setErrors(data.errors); } else { setError(data.error || 'Registration failed'); }
        return;
      }
      onSuccess(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const LOCALES = [
    ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['pt', 'Português'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'],
    ['ar', 'العربية'], ['hi', 'हिन्दी'], ['ru', 'Русский'],
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <User size={40} className="mx-auto text-purple-600 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Account</h2>
      </div>
      {errors.length > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>)}
        </div>
      )}
      <AlertBox type="error" message={error} />
      <form onSubmit={handleRegister} className="space-y-3">
        <InputField icon={User} type="text" value={form.username} onChange={update('username')} placeholder="Username (emoji & special chars ok)" autoComplete="username" required />
        <InputField icon={Mail} type="email" value={form.email} onChange={update('email')} placeholder="Email address" autoComplete="email" required />
        <div>
          <PasswordInput value={form.password} onChange={update('password')} placeholder="Password (min 13 chars)" autoComplete="new-password" />
          <PasswordStrengthBar password={form.password} />
          <p className="text-xs text-gray-400 mt-1">Min 13 chars · uppercase · lowercase · number · special character</p>
        </div>
        <PasswordInput value={form.confirmPassword} onChange={update('confirmPassword')} placeholder="Confirm password" autoComplete="new-password" />
        {/* Role selection */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Account Type</label>
          <div className="grid grid-cols-2 gap-2">
            {PUBLIC_ROLES.map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setForm(p => ({ ...p, role: r.value }))}
                className={`p-2.5 rounded-lg border text-xs text-left transition-colors ${
                  form.role === r.value
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-800 dark:text-gray-200">{r.label}</p>
                <p className="text-gray-400 mt-0.5">{r.description}</p>
              </button>
            ))}
          </div>
        </div>
        {/* Language */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1"><Globe size={12} /> Language / Region</label>
          <select
            value={form.locale}
            onChange={update('locale')}
            className="w-full py-2 px-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {LOCALES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-purple-600 hover:underline font-medium">Sign in</button>
      </p>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function AuthPages({ onAuthenticated }) {
  const [mode, setMode] = useState('login');

  const handleSuccess = useCallback((data) => {
    if (data.accessToken) {
      sessionStorage.setItem('nexus_access_token', data.accessToken);
      sessionStorage.setItem('nexus_refresh_token', data.refreshToken || '');
      sessionStorage.setItem('nexus_role', data.role || 'user');
      sessionStorage.setItem('nexus_user_id', data.userId || '');
    }
    onAuthenticated?.(data);
  }, [onAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl shadow-lg mb-3">
            <Shield size={32} className="text-white" />
          </div>
          <p className="text-purple-300 text-sm">Enterprise AI Platform</p>
        </div>
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6">
          {mode === 'login'
            ? <LoginForm onSuccess={handleSuccess} onSwitch={() => setMode('register')} />
            : <RegisterForm onSuccess={handleSuccess} onSwitch={() => setMode('login')} />
          }
        </div>
        {/* Trust badge */}
        <div className="text-center mt-4 flex items-center justify-center gap-2 text-gray-400 text-xs">
          <Lock size={12} />
          <span>AES-256-GCM end-to-end encrypted · TLS 1.3</span>
        </div>
      </div>
    </div>
  );
}
