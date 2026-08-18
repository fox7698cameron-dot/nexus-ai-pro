// src/auth/AuthDashboard.jsx
// Nexus AI Pro — Authentication UI
// Covers: login, register, 2FA, MFA, biometrics, password strength
// Date: 2026-08-18

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Lock, Key, Fingerprint, ScanFace, Eye, EyeOff,
  Mail, Phone, Smartphone, CheckCircle, XCircle, AlertTriangle,
  Globe, User, Loader2, ArrowRight, RefreshCw
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  validateUsername,
  generateOTP,
  generateBackupCodes,
  BiometricAuth,
  sessionManager,
  auditAuthEvent,
  MFA_METHODS,
  BIOMETRIC_TYPES,
  USER_ROLES,
} from './auth-service.js';

// ─── Password Strength Bar ────────────────────────────────────────────────────
function PasswordStrengthBar({ password }) {
  const strength = evaluatePasswordStrength(password);
  const colorMap = {
    'very-weak': '#ef4444',
    weak: '#f97316',
    fair: '#eab308',
    strong: '#22c55e',
    'very-strong': '#16a34a',
  };
  const color = colorMap[strength.label] || '#6b7280';

  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: strength.score > i * 25 ? color : '#374151',
            }}
          />
        ))}
      </div>
      {strength.errors.length > 0 && (
        <ul className="text-xs space-y-0.5">
          {strength.errors.map((err, i) => (
            <li key={i} className="flex items-center gap-1 text-red-400">
              <XCircle size={10} />
              {err}
            </li>
          ))}
        </ul>
      )}
      {strength.valid && (
        <p className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle size={10} />
          Password meets all requirements
        </p>
      )}
    </div>
  );
}

// ─── Biometric Button ─────────────────────────────────────────────────────────
function BiometricButton({ onSuccess, onError }) {
  const [checking, setChecking] = useState(false);

  const handleBiometric = useCallback(async () => {
    setChecking(true);
    try {
      const avail = await BiometricAuth.checkPlatformAvailability();
      if (!avail.available) {
        onError?.('Biometric authentication not available on this device');
        return;
      }
      // Generate challenge from server (placeholder — real impl fetches from API)
      const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      const assertion = await BiometricAuth.authenticate(challenge);
      auditAuthEvent('BIOMETRIC_AUTH_SUCCESS', { type: 'platform' });
      onSuccess?.(assertion);
    } catch (err) {
      auditAuthEvent('BIOMETRIC_AUTH_FAILURE', { reason: err.message });
      onError?.(err.message || 'Biometric authentication failed');
    } finally {
      setChecking(false);
    }
  }, [onSuccess, onError]);

  return (
    <button
      onClick={handleBiometric}
      disabled={checking}
      className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
    >
      {checking ? <Loader2 size={18} className="animate-spin" /> : <Fingerprint size={18} />}
      {checking ? 'Verifying…' : 'Use Biometric / Passkey'}
    </button>
  );
}

// ─── MFA Selector ─────────────────────────────────────────────────────────────
function MFASelector({ onSelect, selected }) {
  const methods = [
    { id: MFA_METHODS.TOTP, label: 'Authenticator App', icon: <Smartphone size={16} /> },
    { id: MFA_METHODS.SMS, label: 'SMS', icon: <Phone size={16} /> },
    { id: MFA_METHODS.EMAIL, label: 'Email OTP', icon: <Mail size={16} /> },
    { id: MFA_METHODS.HARDWARE_KEY, label: 'Hardware Key', icon: <Key size={16} /> },
    { id: MFA_METHODS.BIOMETRIC, label: 'Biometric', icon: <Fingerprint size={16} /> },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {methods.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all
            ${selected === m.id
              ? 'border-blue-500 bg-blue-500/20 text-blue-400'
              : 'border-gray-600 bg-gray-800/50 text-gray-300 hover:border-gray-400'
            }`}
        >
          {m.icon}
          <span className="truncate">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
function OTPInput({ length = 6, onComplete }) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const refs = Array.from({ length }, () => React.createRef());

  const handleChange = (index, value) => {
    const clean = value.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < length - 1) refs[index + 1].current?.focus();
    if (next.every(d => d !== '')) onComplete?.(next.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    const next = Array(length).fill('');
    text.split('').forEach((c, i) => { next[i] = c; });
    setDigits(next);
    if (text.length === length) onComplete?.(text);
    e.preventDefault();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          className="w-10 h-12 text-center text-lg font-mono rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none transition-colors"
        />
      ))}
    </div>
  );
}

// ─── Register Form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitchToLogin, apiBase }) {
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirmPassword: '',
    phone: '', locale: 'en',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('form'); // form | mfa-setup | biometric-setup | done

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = () => {
    const uv = validateUsername(form.username);
    if (!uv.valid) return uv.error;
    if (!form.email.includes('@')) return 'Valid email is required';
    const ps = evaluatePasswordStrength(form.password);
    if (!ps.valid) return ps.errors[0];
    if (form.password !== form.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.trim(),
          email: form.email.toLowerCase().trim(),
          password: form.password,
          phone: form.phone || undefined,
          locale: form.locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      auditAuthEvent('REGISTER_SUCCESS', { userId: data.userId });
      setStep('done');
      onSuccess?.(data);
    } catch (err) {
      auditAuthEvent('REGISTER_FAILURE', { reason: err.message });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const LOCALES = [
    { code: 'en', label: '🇺🇸 English' },
    { code: 'es', label: '🇪🇸 Español' },
    { code: 'fr', label: '🇫🇷 Français' },
    { code: 'de', label: '🇩🇪 Deutsch' },
    { code: 'zh', label: '🇨🇳 中文' },
    { code: 'ja', label: '🇯🇵 日本語' },
    { code: 'ko', label: '🇰🇷 한국어' },
    { code: 'ar', label: '🇸🇦 العربية' },
    { code: 'pt', label: '🇧🇷 Português' },
    { code: 'ru', label: '🇷🇺 Русский' },
    { code: 'hi', label: '🇮🇳 हिन्दी' },
  ];

  if (step === 'done') {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="mx-auto text-green-400" size={48} />
        <h3 className="text-xl font-bold text-white">Account Created!</h3>
        <p className="text-gray-400">Check your email to verify your account.</p>
        <button onClick={onSwitchToLogin} className="text-blue-400 hover:underline">
          Sign in now →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Username <span className="text-gray-500">(emoji &amp; Unicode supported)</span>
        </label>
        <input
          type="text"
          value={form.username}
          onChange={e => handleChange('username', e.target.value)}
          placeholder="Your username 🚀"
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={e => handleChange('email', e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={e => handleChange('password', e.target.value)}
            placeholder="13+ characters with special chars"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {form.password && <PasswordStrengthBar password={form.password} />}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Confirm Password</label>
        <input
          type="password"
          value={form.confirmPassword}
          onChange={e => handleChange('confirmPassword', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Language / Region
        </label>
        <select
          value={form.locale}
          onChange={e => handleChange('locale', e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:border-blue-500 focus:outline-none"
        >
          {LOCALES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
        {loading ? 'Creating Account…' : 'Create Account'}
      </button>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-blue-400 hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitchToRegister, apiBase }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaMethod, setMfaMethod] = useState(null);
  const [sessionToken, setSessionToken] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      if (data.mfaRequired) {
        setSessionToken(data.sessionToken);
        setMfaStep(true);
        setMfaMethod(data.mfaMethod || MFA_METHODS.TOTP);
        auditAuthEvent('LOGIN_MFA_REQUIRED', { method: data.mfaMethod });
      } else {
        sessionManager.setSession(data.token, data.user);
        sessionManager.setRefreshToken(data.refreshToken);
        auditAuthEvent('LOGIN_SUCCESS', { userId: data.user?.id });
        onSuccess?.(data);
      }
    } catch (err) {
      auditAuthEvent('LOGIN_FAILURE', { identifier: identifier.trim() });
      // Enumeration-safe: always show generic error
      setError('Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMFAVerify = async (code) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          code,
          method: mfaMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'MFA verification failed');
      sessionManager.setSession(data.token, data.user);
      sessionManager.setRefreshToken(data.refreshToken);
      auditAuthEvent('MFA_SUCCESS', { userId: data.user?.id, method: mfaMethod });
      onSuccess?.(data);
    } catch (err) {
      auditAuthEvent('MFA_FAILURE', { method: mfaMethod });
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (mfaStep) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Shield className="mx-auto mb-2 text-blue-400" size={32} />
          <h3 className="text-lg font-bold text-white">Two-Factor Authentication</h3>
          <p className="text-sm text-gray-400 mt-1">
            Enter the code from your {mfaMethod === MFA_METHODS.TOTP ? 'authenticator app' : 'device'}
          </p>
        </div>

        <OTPInput length={6} onComplete={handleMFAVerify} />

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <XCircle size={14} />
            {error}
          </div>
        )}

        {loading && <div className="text-center text-gray-400 text-sm">Verifying…</div>}

        <div className="space-y-2">
          <BiometricButton
            onSuccess={() => onSuccess?.({ biometric: true })}
            onError={setError}
          />
          <button
            onClick={() => { setMfaStep(false); setError(''); }}
            className="w-full text-sm text-gray-400 hover:text-gray-200 py-2"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Username or Email
        </label>
        <input
          type="text"
          value={identifier}
          onChange={e => { setIdentifier(e.target.value); setError(''); }}
          placeholder="Username or email"
          autoComplete="username"
          className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Your password"
            autoComplete="current-password"
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-500">
          <span className="px-2 bg-gray-900">or</span>
        </div>
      </div>

      <BiometricButton
        onSuccess={() => onSuccess?.({ biometric: true })}
        onError={setError}
      />

      <p className="text-center text-sm text-gray-400">
        New here?{' '}
        <button type="button" onClick={onSwitchToRegister} className="text-blue-400 hover:underline">
          Create account
        </button>
      </p>
    </form>
  );
}

// ─── Main Auth Dashboard ──────────────────────────────────────────────────────
export default function AuthDashboard({ onAuthSuccess, apiBase = '' }) {
  const [view, setView] = useState('login'); // login | register

  const handleSuccess = useCallback((data) => {
    onAuthSuccess?.(data);
  }, [onAuthSuccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 mt-1">Military-grade security · Multi-platform</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
          {/* Tab switcher */}
          <div className="flex bg-gray-800 rounded-xl p-1 mb-6">
            {['login', 'register'].map(tab => (
              <button
                key={tab}
                onClick={() => setView(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all capitalize
                  ${view === tab
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-400 hover:text-gray-200'
                  }`}
              >
                {tab === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          {view === 'login' ? (
            <LoginForm
              onSuccess={handleSuccess}
              onSwitchToRegister={() => setView('register')}
              apiBase={apiBase}
            />
          ) : (
            <RegisterForm
              onSuccess={handleSuccess}
              onSwitchToLogin={() => setView('login')}
              apiBase={apiBase}
            />
          )}
        </div>

        {/* Security badges */}
        <div className="flex justify-center gap-4 mt-6">
          {['AES-256-GCM', 'E2E Encrypted', 'MFA Ready'].map(badge => (
            <span key={badge} className="flex items-center gap-1 text-xs text-gray-500">
              <CheckCircle size={10} className="text-green-500" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
