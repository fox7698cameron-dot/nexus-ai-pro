// src/dashboards/AuthDashboard.jsx
// 2026-07-23 | Nexus AI Pro - Authentication UI
// Roles: admin, dev, moderator, user | Biometrics | 2FA | Multi-language
// 13+ char passwords | Unicode usernames | Dark/Light | Mobile/Desktop

import React, { useState, useCallback } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Fingerprint, ScanFace,
  Shield, ShieldCheck, Key, AlertTriangle, CheckCircle2,
  Smartphone, Globe, ChevronDown, LogIn, UserPlus, RefreshCw
} from 'lucide-react';

const PASSWORD_RULES = [
  { test: v => v.length >= 13, label: 'At least 13 characters' },
  { test: v => /[A-Z]/.test(v), label: 'One uppercase letter' },
  { test: v => /[a-z]/.test(v), label: 'One lowercase letter' },
  { test: v => /\d/.test(v), label: 'One number' },
  { test: v => /[\W_]/.test(v), label: 'One special character (!@#$%...)' },
];

const LOCALES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' }, { code: 'de', label: 'Deutsch' },
  { code: 'zh-CN', label: '中文' }, { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' }, { code: 'ar', label: 'العربية' },
  { code: 'pt', label: 'Português' }, { code: 'ru', label: 'Русский' },
];

function PasswordStrengthBar({ password }) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  const pct = (passed / PASSWORD_RULES.length) * 100;
  const color = passed <= 2 ? 'bg-red-500' : passed <= 3 ? 'bg-amber-500' : passed <= 4 ? 'bg-yellow-500' : 'bg-green-500';
  const label = passed <= 2 ? 'Weak' : passed <= 3 ? 'Fair' : passed <= 4 ? 'Good' : 'Strong';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">Password strength</span>
        <span className={`font-medium ${passed <= 2 ? 'text-red-500' : passed <= 3 ? 'text-amber-500' : passed <= 4 ? 'text-yellow-500' : 'text-green-500'}`}>{label}</span>
      </div>
      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {PASSWORD_RULES.map((rule, i) => {
          const ok = rule.test(password);
          return (
            <div key={i} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              <div className={`w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0 ${ok ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {ok && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              {rule.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BiometricButton({ type, onAuthenticate, label }) {
  const [loading, setLoading] = useState(false);

  const icons = { fingerprint: Fingerprint, face: ScanFace, retinal: Eye };
  const Icon = icons[type] || Fingerprint;

  const handleClick = async () => {
    setLoading(true);
    try {
      // WebAuthn / FIDO2 credential request
      const challengeRes = await fetch('/api/auth/biometric/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!challengeRes.ok) throw new Error('Failed to get challenge');
      const { challenge, credentialIds } = await challengeRes.json();

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          allowCredentials: (credentialIds || []).map(id => ({ type: 'public-key', id: Uint8Array.from(atob(id), c => c.charCodeAt(0)) })),
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (!credential) throw new Error('No credential obtained');

      await onAuthenticate({
        type,
        credentialId: credential.id,
        clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
      });
    } catch (err) {
      console.error('Biometric error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex-1 flex flex-col items-center gap-2 p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <Icon size={28} className={`${loading ? 'animate-pulse text-indigo-500' : 'text-gray-400 group-hover:text-indigo-500'} transition-colors`} />
      <span className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 text-center">{loading ? 'Authenticating...' : label}</span>
    </button>
  );
}

function TOTPModal({ onVerify, onClose }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return; }
    const success = await onVerify(code);
    if (!success) { setError('Invalid code. Try again.'); setCode(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <Smartphone size={40} className="mx-auto text-indigo-600 mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the code from your authenticator app</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
            placeholder="000000"
            className="w-full text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-200 dark:border-gray-700 rounded-xl px-4 py-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
          />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors">Verify</button>
          <button type="button" onClick={onClose} className="w-full py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">Cancel</button>
        </form>
      </div>
    </div>
  );
}

export default function AuthDashboard({ onAuthSuccess, initialMode = 'login', locale = 'en' }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', locale: locale || 'en' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTOTP, setShowTOTP] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  const updateForm = useCallback((key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setError('');
  }, []);

  const handleLogin = async () => {
    if (!form.email || !form.password) { setError('Email and password are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, locale: form.locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.requiresMFA) {
        setPendingUserId(data.userId);
        setShowTOTP(true);
      } else {
        localStorage.setItem('nexus:session', data.sessionToken);
        localStorage.setItem('nexus:refresh', data.refreshToken);
        onAuthSuccess?.(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!form.username || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, locale: form.locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setMode('login');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (code) => {
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: pendingUserId, token: code }),
      });
      const data = await res.json();
      if (!res.ok) return false;
      localStorage.setItem('nexus:session', data.sessionToken);
      localStorage.setItem('nexus:refresh', data.refreshToken);
      setShowTOTP(false);
      onAuthSuccess?.(data);
      return true;
    } catch {
      return false;
    }
  };

  const handleBiometricAuth = async (authData) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Biometric authentication failed');
      localStorage.setItem('nexus:session', data.sessionToken);
      localStorage.setItem('nexus:refresh', data.refreshToken);
      onAuthSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const supportsWebAuthn = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nexus AI Pro</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Military-grade security platform</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <LogIn size={16} className="inline mr-2" />Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${mode === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <UserPlus size={16} className="inline mr-2" />Create Account
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-400">
                <AlertTriangle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.username}
                  onChange={e => updateForm('username', e.target.value)}
                  placeholder="Username (emoji, Unicode, @handle)"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
            )}

            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                placeholder="Email address"
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => updateForm('password', e.target.value)}
                onFocus={() => mode === 'register' && setShowPasswordRules(true)}
                placeholder="Password (13+ characters)"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-10 pr-12 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button onClick={() => setShowPassword(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'register' && showPasswordRules && form.password && (
              <PasswordStrengthBar password={form.password} />
            )}

            {mode === 'register' && (
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={e => updateForm('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400 focus:ring-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                <button onClick={() => setShowConfirm(s => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div className="relative">
                <Globe size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={form.locale}
                  onChange={e => updateForm('locale', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none transition-all"
                >
                  {LOCALES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            )}

            <button
              onClick={mode === 'login' ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><RefreshCw size={18} className="animate-spin" />Processing...</> : mode === 'login' ? <><LogIn size={18} />Sign In</> : <><UserPlus size={18} />Create Account</>}
            </button>

            {mode === 'login' && supportsWebAuthn && (
              <div>
                <div className="relative flex items-center my-2">
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                  <span className="px-3 text-xs text-gray-400 dark:text-gray-500">or use biometrics</span>
                  <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="flex gap-3">
                  <BiometricButton type="fingerprint" label="Fingerprint / Touch ID" onAuthenticate={handleBiometricAuth} />
                  <BiometricButton type="face" label="Face ID / Face Unlock" onAuthenticate={handleBiometricAuth} />
                  <BiometricButton type="retinal" label="Retinal Scan" onAuthenticate={handleBiometricAuth} />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-center">
                <button className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Forgot Password?</button>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                <Shield size={12} />
                <span>AES-256-GCM encrypted · 2FA/MFA supported · FIDO2 biometrics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTOTP && <TOTPModal onVerify={handleMFAVerify} onClose={() => { setShowTOTP(false); setPendingUserId(null); }} />}
    </div>
  );
}
