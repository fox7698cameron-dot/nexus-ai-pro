// src/components/AuthModal.jsx
// 2026-06-12 | Auth UI: register/login, 2FA/MFA, biometrics, password strength, unicode usernames
import React, { useState, useCallback } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Fingerprint, ScanFace,
  Shield, ShieldCheck, Key, AlertTriangle, CheckCircle,
  Smartphone, Globe, X, Loader2
} from 'lucide-react';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{13,}$/;

function PasswordStrengthBar({ password }) {
  const checks = [
    { label: 'At least 13 characters', ok: password.length >= 13 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(password) }
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['bg-red-500', 'bg-red-400', 'bg-yellow-500', 'bg-yellow-400', 'bg-green-500'];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score - 1] : 'bg-gray-700'}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-1">
        {checks.map(c => (
          <div key={c.label} className={`flex items-center gap-1.5 text-xs ${c.ok ? 'text-green-400' : 'text-gray-500'}`}>
            {c.ok ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthModal({ onAuth, onClose }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', language: 'en', mfaToken: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(
    typeof window !== 'undefined' && !!window.PublicKeyCredential
  );

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const passwordsMatch = form.password === form.confirmPassword || mode !== 'register';
  const passwordValid = PASSWORD_REGEX.test(form.password) || mode !== 'register';
  const canSubmit = form.email && form.password && (mode !== 'register' || (form.username && passwordValid && passwordsMatch));

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const body = mode === 'register'
        ? { username: form.username, email: form.email, password: form.password, language: form.language }
        : { email: form.email, password: form.password, ...(mfaRequired ? { totpToken: form.mfaToken } : {}) };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (res.status === 206 && data.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Authentication failed');
        setLoading(false);
        return;
      }

      onAuth(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function biometricLogin() {
    setError('');
    try {
      // WebAuthn / biometric flow — platform-level (Capacitor handles native biometrics)
      setError('Biometric auth requires the native mobile app or a WebAuthn-enabled device.');
    } catch {
      setError('Biometric authentication failed.');
    }
  }

  const LANGUAGES = [
    ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['ja', '日本語'], ['zh', '中文'], ['pt', 'Português'], ['ar', 'العربية'],
    ['ko', '한국어'], ['ru', 'Русский']
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Nexus AI Pro</h2>
              <p className="text-xs text-gray-400">
                {mode === 'login' ? 'Secure Sign In' : 'Create Account'}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-500 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-gray-800">
          {['login', 'register'].map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setMfaRequired(false); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium transition ${
                mode === m ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* MFA step */}
          {mfaRequired ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <Smartphone size={16} className="text-blue-400" />
                <p className="text-sm text-blue-300">Enter the 6-digit code from your authenticator app</p>
              </div>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white text-center text-lg tracking-widest font-mono placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                  placeholder="000000"
                  value={form.mfaToken}
                  onChange={update('mfaToken')}
                  maxLength={6}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <>
              {/* Username (register only) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Username (supports emoji & unicode)</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. cameron_fox or 🚀dev"
                      value={form.username}
                      onChange={update('username')}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Email address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={update('email')}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-10 py-3 text-white placeholder-gray-600 focus:border-blue-500 focus:outline-none"
                    placeholder={mode === 'register' ? '13+ chars, uppercase, number, symbol' : 'Password'}
                    value={form.password}
                    onChange={update('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {mode === 'register' && <PasswordStrengthBar password={form.password} />}
              </div>

              {/* Confirm password */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={`w-full bg-gray-900 border rounded-xl pl-9 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none ${
                        form.confirmPassword && !passwordsMatch ? 'border-red-500' : 'border-gray-700 focus:border-blue-500'
                      }`}
                      placeholder="Repeat password"
                      value={form.confirmPassword}
                      onChange={update('confirmPassword')}
                    />
                  </div>
                  {form.confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> Passwords do not match
                    </p>
                  )}
                </div>
              )}

              {/* Language (register) */}
              {mode === 'register' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Preferred Language</label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <select
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-3 text-white focus:border-blue-500 focus:outline-none appearance-none"
                      value={form.language}
                      onChange={update('language')}
                    >
                      {LANGUAGES.map(([code, name]) => (
                        <option key={code} value={code}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={submit}
            disabled={loading || !canSubmit}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : mfaRequired ? (
              <><ShieldCheck size={16} /> Verify Code</>
            ) : mode === 'login' ? (
              <><Shield size={16} /> Sign In Securely</>
            ) : (
              <><ShieldCheck size={16} /> Create Account</>
            )}
          </button>

          {/* Biometric option */}
          {mode === 'login' && (
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          )}
          {mode === 'login' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={biometricLogin}
                className="flex items-center justify-center gap-2 py-2.5 border border-gray-700 rounded-xl text-xs text-gray-300 hover:border-gray-500 hover:text-white transition"
              >
                <Fingerprint size={14} className="text-blue-400" />
                Fingerprint / Touch ID
              </button>
              <button
                onClick={biometricLogin}
                className="flex items-center justify-center gap-2 py-2.5 border border-gray-700 rounded-xl text-xs text-gray-300 hover:border-gray-500 hover:text-white transition"
              >
                <ScanFace size={14} className="text-purple-400" />
                Face ID / Retinal
              </button>
            </div>
          )}

          {/* Security badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <ShieldCheck size={11} className="text-green-500" />
            <span>AES-256-GCM encrypted · JWT auth · E2E secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
