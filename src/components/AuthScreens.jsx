// src/components/AuthScreens.jsx
// 2026-07-24 | Nexus AI Pro - Authentication UI
// Login, Register, MFA, Biometrics, Password Strength

import React, { useState, useCallback } from 'react';
import { Shield, Eye, EyeOff, Fingerprint, Lock, Mail, User, Key, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

function PasswordStrengthBar({ score }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct < 40 ? 'bg-red-500' : pct < 70 ? 'bg-yellow-500' : 'bg-green-500';
  const label = pct < 40 ? 'Weak' : pct < 70 ? 'Fair' : pct < 90 ? 'Good' : 'Strong';

  return (
    <div className="space-y-1">
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400">
        Password strength: <span className={pct >= 70 ? 'text-green-400' : pct >= 40 ? 'text-yellow-400' : 'text-red-400'}>{label}</span>
        {pct < 100 && ' — 13+ chars, upper/lower, number, special char'}
      </p>
    </div>
  );
}

function BiometricButton({ type, onAuth }) {
  const icons = {
    fingerprint: <Fingerprint size={20} />,
    faceid: '🆔',
    retinal: '👁️',
  };
  const labels = {
    fingerprint: 'Fingerprint / Touch ID',
    faceid: 'Face ID',
    retinal: 'Retinal Scan',
  };

  return (
    <button
      onClick={() => onAuth(type)}
      className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors border border-gray-600"
    >
      <span>{icons[type]}</span>
      <span>{labels[type]}</span>
    </button>
  );
}

function MFAForm({ onVerify, onCancel }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (token.length !== 6) { setError('Enter a 6-digit code.'); return; }
    const ok = await onVerify(token);
    if (!ok) setError('Invalid code. Try again.');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-4xl mb-2">🔐</div>
        <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-400">Enter the 6-digit code from your authenticator app.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          value={token}
          onChange={e => setToken(e.target.value.replace(/\D/g, ''))}
          className="w-full text-center text-2xl tracking-[0.5em] bg-gray-700 text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
          placeholder="000000"
          autoFocus
        />
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors">
          Verify
        </button>
        <button type="button" onClick={onCancel} className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors">
          Cancel
        </button>
      </form>
    </div>
  );
}

export function AuthScreens({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'mfa'
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingLogin, setPendingLogin] = useState(null);

  const updateField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (field === 'password') checkPasswordStrength(value);
  };

  const checkPasswordStrength = useCallback(async (pwd) => {
    try {
      const res = await fetch('/api/auth/password-strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      if (res.ok) {
        const { score } = await res.json();
        setPwStrength(score);
      }
    } catch { /* non-critical */ }
  }, []);

  const handleLogin = async (totpToken) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, totpToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.mfaRequired) {
          setPendingLogin({ email: form.email, password: form.password });
          setMode('mfa');
          setLoading(false);
          return false;
        }
        setError(data.error || 'Login failed.');
        setLoading(false);
        return false;
      }
      localStorage.setItem('nexus:accessToken', data.accessToken);
      localStorage.setItem('nexus:refreshToken', data.refreshToken);
      onAuthSuccess(data.user, data.accessToken);
      return true;
    } catch (err) {
      setError('Network error. Try again.');
      setLoading(false);
      return false;
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!form.username || !form.email || !form.password) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return; }
      localStorage.setItem('nexus:accessToken', data.accessToken);
      localStorage.setItem('nexus:refreshToken', data.refreshToken);
      onAuthSuccess(data.user, data.accessToken);
    } catch {
      setError('Network error. Try again.');
      setLoading(false);
    }
  };

  const handleBiometric = async (type) => {
    if (typeof window?.electron?.biometric?.authenticate === 'function') {
      try {
        const result = await window.electron.biometric.authenticate(`Nexus AI Pro - ${type}`);
        if (result.success) {
          setError('');
          // Biometric verified — proceed with stored credentials or token
          // In production: exchange biometric assertion for session token
          console.log('Biometric auth success:', type);
        } else {
          setError('Biometric authentication failed.');
        }
      } catch {
        setError('Biometric authentication not available.');
      }
    } else if (typeof PublicKeyCredential !== 'undefined') {
      // WebAuthn for browser
      setError('WebAuthn: Request biometric challenge from server first.');
    } else {
      setError('Biometrics not available on this device.');
    }
  };

  if (mode === 'mfa') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <MFAForm
            onVerify={async (token) => {
              if (!pendingLogin) return false;
              return handleLogin(token);
            }}
            onCancel={() => { setMode('login'); setPendingLogin(null); }}
          />
        </div>
      </div>
    );
  }

  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-3">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isRegister ? 'Create your account' : 'Sign in to continue'}
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {isRegister && (
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Username (emojis & special chars OK 🎮)"
                value={form.username}
                onChange={e => updateField('username', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={isRegister ? 'Password (min 13 chars)' : 'Password'}
              value={form.password}
              onChange={e => updateField('password', e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {isRegister && form.password && (
            <PasswordStrengthBar score={pwStrength} />
          )}

          {isRegister && (
            <div className="relative">
              <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={e => updateField('confirmPassword', e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <button
            onClick={isRegister ? handleRegister : () => handleLogin()}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>

          {/* Biometric options */}
          {!isRegister && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 text-center">Or authenticate with biometrics</p>
              <div className="flex gap-2 justify-center">
                <BiometricButton type="fingerprint" onAuth={handleBiometric} />
                <BiometricButton type="faceid" onAuth={handleBiometric} />
              </div>
            </div>
          )}

          <button
            onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}
            className="w-full text-sm text-gray-400 hover:text-white transition-colors py-1"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Protected by AES-256-GCM · TOTP MFA · End-to-end encrypted
        </p>
      </div>
    </div>
  );
}

export default AuthScreens;
