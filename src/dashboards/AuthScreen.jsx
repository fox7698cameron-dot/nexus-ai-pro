/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * 2026-07-29 - Auth screen: login, registration, MFA, biometric prompts
 */

import { useState } from 'react';
import {
  Lock, Mail, User, Eye, EyeOff, Shield, Fingerprint,
  Smartphone, KeyRound, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';

const PASSWORD_MIN = 13;

function StrengthBar({ password }) {
  let score = 0;
  if (password.length >= PASSWORD_MIN) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="mt-1">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score - 1] : 'bg-gray-700'} transition-colors`} />
        ))}
      </div>
      <span className={`text-xs ${colors[score - 1]?.replace('bg-', 'text-') || 'text-gray-500'}`}>
        {labels[score - 1] || 'Too Short'}
      </span>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder = 'Password', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-10 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function MFAStep({ sessionId, onSuccess, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/mfa/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, mfaToken: code })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      onSuccess(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Smartphone className="mx-auto mb-2 text-blue-400" size={40} />
        <h2 className="text-lg font-bold">Two-Factor Auth</h2>
        <p className="text-gray-400 text-sm mt-1">Enter the 6-digit code from your authenticator app</p>
      </div>
      <form onSubmit={verify} className="space-y-3">
        <input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-blue-500"
        />
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2.5 font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Verify'}
        </button>
        <button type="button" onClick={onBack} className="w-full text-gray-400 text-sm hover:text-white transition-colors">
          ← Back to login
        </button>
      </form>
    </div>
  );
}

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // login | register | mfa
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    role: 'user', adminSecret: '', locale: 'en'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaSession, setMfaSession] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(
    typeof PublicKeyCredential !== 'undefined'
  );

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validateRegister = () => {
    if (form.password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
    if (!/[A-Z]/.test(form.password)) return 'Password needs an uppercase letter';
    if (!/[0-9]/.test(form.password)) return 'Password needs a number';
    if (!/[^A-Za-z0-9]/.test(form.password)) return 'Password needs a special character';
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.requiresMfa) {
        setMfaSession(data.mfaSessionId);
        setMode('mfa');
        return;
      }
      onAuth(data);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const validationError = validateRegister();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
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
          adminSecret: form.adminSecret || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      onAuth(data);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'mfa') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <MFAStep sessionId={mfaSession} onSuccess={onAuth} onBack={() => setMode('login')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-600/30">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm mt-1">Enterprise AI Platform</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl">
          {/* Tabs */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-5">
            {[['login', 'Sign In'], ['register', 'Create Account']].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="space-y-3">
            {mode === 'register' && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input
                  required
                  value={form.username}
                  onChange={setField('username')}
                  placeholder="Username (emojis & special chars ok)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                required
                type="email"
                value={form.email}
                onChange={setField('email')}
                placeholder="Email"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
              />
            </div>

            <div>
              <PasswordInput
                required
                value={form.password}
                onChange={setField('password')}
                placeholder={mode === 'register' ? `Password (${PASSWORD_MIN}+ chars)` : 'Password'}
              />
              {mode === 'register' && <StrengthBar password={form.password} />}
            </div>

            {mode === 'register' && (
              <>
                <PasswordInput
                  required
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  placeholder="Confirm password"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={form.role}
                    onChange={setField('role')}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="dev">Developer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={form.locale}
                    onChange={setField('locale')}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    {[
                      ['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],
                      ['pt','Português'],['ja','日本語'],['ko','한국어'],['zh','中文'],
                      ['ar','العربية'],['hi','हिंदी'],['ru','Русский']
                    ].map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
                {form.role === 'admin' && (
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                      value={form.adminSecret}
                      onChange={setField('adminSecret')}
                      placeholder="Admin secret key"
                      type="password"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="text-red-400 text-xs">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg py-2.5 font-semibold text-sm mt-1 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          {biometricAvailable && mode === 'login' && (
            <button
              className="w-full mt-3 flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-600 rounded-lg py-2.5 text-sm text-gray-300 hover:text-white transition-colors"
            >
              <Fingerprint size={16} className="text-blue-400" />
              Sign in with Biometrics
            </button>
          )}

          <p className="text-center text-xs text-gray-500 mt-4">
            Password strength requires {PASSWORD_MIN}+ characters with uppercase,<br />
            numbers &amp; special characters. Emojis welcome in usernames.
          </p>
        </div>
      </div>
    </div>
  );
}
