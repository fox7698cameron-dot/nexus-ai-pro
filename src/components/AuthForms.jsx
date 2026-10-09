// src/components/AuthForms.jsx
// Nexus AI Pro - Authentication UI (Login / Register / 2FA / Biometrics)
// Date: 2026-10-09

import React, { useState, useCallback } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Shield, Fingerprint,
  ScanFace, Smartphone, Key, CheckCircle, AlertCircle,
  ArrowRight, Loader2, LogIn, UserPlus, RefreshCw,
} from 'lucide-react';

// Password strength checker matching backend (13+ chars, upper, lower, digit, special)
function checkPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  const checks = {
    length:  pw.length >= 13,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    digit:   /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
    long:    pw.length >= 20,
  };
  score = Object.values(checks).filter(Boolean).length;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong', 'Excellent'];
  const colors = ['', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981'];
  return { score, label: labels[score] || '', color: colors[score] || '', checks };
}

function StrengthBar({ password }) {
  const { score, label, color, checks } = checkPasswordStrength(password);
  if (!password) return null;
  return (
    <div className="mt-1 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300" style={{ background: i <= score ? color : '#374151' }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {[
          { key: 'length',  label: '13+ chars' },
          { key: 'upper',   label: 'Uppercase' },
          { key: 'lower',   label: 'Lowercase' },
          { key: 'digit',   label: 'Number' },
          { key: 'special', label: 'Special char' },
        ].map(c => (
          <span key={c.key} className={`text-xs flex items-center gap-0.5 ${checks?.[c.key] ? 'text-green-400' : 'text-gray-500'}`}>
            <CheckCircle size={9} />
            {c.label}
          </span>
        ))}
      </div>
      {label && <div className="text-xs" style={{ color }}>{label} password</div>}
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, error, icon: Icon, rightAction, autoComplete }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-300">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`w-full bg-gray-700 border rounded-lg py-2 text-sm text-white placeholder-gray-500 outline-none transition-all
            ${Icon ? 'pl-9' : 'pl-3'} ${rightAction ? 'pr-10' : 'pr-3'}
            ${error ? 'border-red-500 focus:border-red-400' : 'border-gray-600 focus:border-purple-500'}`}
        />
        {rightAction && (
          <button
            type="button"
            onClick={rightAction.onClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {rightAction.icon}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
    </div>
  );
}

// ── Login Form ─────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requireTotp, setRequireTotp] = useState(false);
  const [biometricAvail] = useState(typeof window !== 'undefined' && !!window.PublicKeyCredential);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, totpCode: totp || undefined }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requireTotp) {
          setRequireTotp(true);
          setError('Enter your 6-digit authenticator code.');
        } else {
          setError(data.error || 'Login failed');
        }
        return;
      }
      sessionStorage.setItem('nexus_token', data.accessToken);
      sessionStorage.setItem('nexus_refresh', data.refreshToken);
      onSuccess?.(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    if (!biometricAvail) return;
    try {
      // WebAuthn assertion (biometric login placeholder)
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (assertion) {
        const res = await fetch('/api/auth/biometric/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentialId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
            email,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          sessionStorage.setItem('nexus_token', data.accessToken);
          onSuccess?.(data);
        } else {
          setError(data.error || 'Biometric auth failed');
        }
      }
    } catch (err) {
      setError('Biometric authentication failed or cancelled');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} autoComplete="username" />
      <InputField
        label="Password"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        placeholder="Your password"
        icon={Lock}
        autoComplete="current-password"
        rightAction={{ icon: showPw ? <EyeOff size={14} /> : <Eye size={14} />, onClick: () => setShowPw(p => !p) }}
      />
      {requireTotp && (
        <InputField
          label="Authenticator Code"
          type="text"
          value={totp}
          onChange={setTotp}
          placeholder="000000"
          icon={Smartphone}
          autoComplete="one-time-code"
        />
      )}
      {error && <p className="text-xs text-red-400 bg-red-40010 border border-red-500 rounded-lg px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <LogIn size={16} />}
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {biometricAvail && (
        <button
          type="button"
          onClick={handleBiometric}
          className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          <Fingerprint size={16} className="text-blue-400" />
          Sign in with Biometrics
        </button>
      )}

      <p className="text-center text-xs text-gray-400">
        Don't have an account?{' '}
        <button type="button" onClick={() => onSwitch('register')} className="text-purple-400 hover:text-purple-300 font-medium">
          Create one
        </button>
      </p>
    </form>
  );
}

// ── Register Form ──────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [fields, setFields] = useState({ username: '', email: '', password: '', confirm: '', role: 'user', inviteCode: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');

  const set = (key) => (val) => setFields(f => ({ ...f, [key]: val }));

  const validate = () => {
    const errs = {};
    if (!fields.username.trim()) errs.username = 'Username required';
    if (!fields.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Valid email required';
    const strength = checkPasswordStrength(fields.password);
    if (strength.score < 5) errs.password = 'Password does not meet requirements';
    if (fields.password !== fields.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: fields.username,
          email: fields.email,
          password: fields.password,
          role: fields.role,
          inviteCode: fields.inviteCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGlobalError(data.error || 'Registration failed');
        return;
      }
      onSuccess?.(data);
    } catch {
      setGlobalError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <InputField label="Username (supports emoji & special chars)" value={fields.username} onChange={set('username')} placeholder="cooluser42 🔥" icon={User} error={errors.username} autoComplete="username" />
      <InputField label="Email" type="email" value={fields.email} onChange={set('email')} placeholder="you@example.com" icon={Mail} error={errors.email} autoComplete="email" />
      <div>
        <InputField
          label="Password (13+ characters)"
          type={showPw ? 'text' : 'password'}
          value={fields.password}
          onChange={set('password')}
          placeholder="Strong password…"
          icon={Lock}
          error={errors.password}
          autoComplete="new-password"
          rightAction={{ icon: showPw ? <EyeOff size={14} /> : <Eye size={14} />, onClick: () => setShowPw(p => !p) }}
        />
        <StrengthBar password={fields.password} />
      </div>
      <InputField label="Confirm Password" type="password" value={fields.confirm} onChange={set('confirm')} placeholder="Repeat password" icon={Lock} error={errors.confirm} autoComplete="new-password" />

      <div className="space-y-1">
        <label className="text-xs font-medium text-gray-300">Account Type</label>
        <select
          value={fields.role}
          onChange={e => setFields(f => ({ ...f, role: e.target.value }))}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
        >
          <option value="user">User</option>
          <option value="developer">Developer</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {fields.role !== 'user' && (
        <InputField label="Invite Code (required for elevated roles)" value={fields.inviteCode} onChange={set('inviteCode')} placeholder="Invite code" icon={Key} />
      )}

      {globalError && <p className="text-xs text-red-400 border border-red-500 bg-red-40010 rounded-lg px-3 py-2">{globalError}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch('login')} className="text-purple-400 hover:text-purple-300 font-medium">
          Sign in
        </button>
      </p>
    </form>
  );
}

// ── 2FA Setup ──────────────────────────────────────────────────────────────
function TwoFASetup({ userId, onDone }) {
  const [step, setStep] = useState('start'); // start | scan | confirm
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setup = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('nexus_token');
      const res = await fetch('/api/auth/totp/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        setSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
        setStep('scan');
      } else {
        setError(data.error || 'Setup failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      const token = sessionStorage.getItem('nexus_token');
      const res = await fetch('/api/auth/totp/confirm', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('done');
        onDone?.();
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Shield size={32} className="mx-auto text-purple-400 mb-2" />
        <h3 className="font-bold text-white">Set Up Two-Factor Authentication</h3>
        <p className="text-xs text-gray-400 mt-1">Use any TOTP app (Google Authenticator, Authy, etc.)</p>
      </div>

      {step === 'start' && (
        <button onClick={setup} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-2.5 text-sm font-medium">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Smartphone size={16} />}
          Set Up Authenticator
        </button>
      )}

      {step === 'scan' && (
        <div className="space-y-3">
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 mb-2">Scan this with your authenticator app or enter manually:</p>
            <code className="text-xs text-green-400 break-all font-mono">{secret}</code>
          </div>
          <InputField
            label="Enter 6-digit code from your app"
            type="text"
            value={code}
            onChange={setCode}
            placeholder="000000"
            icon={Key}
            autoComplete="one-time-code"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button onClick={confirm} disabled={loading || code.length !== 6} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
            Verify &amp; Enable 2FA
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-4">
          <CheckCircle size={40} className="mx-auto text-green-400 mb-2" />
          <p className="text-white font-medium">2FA Enabled!</p>
          <p className="text-xs text-gray-400 mt-1">Your account is now protected with two-factor authentication.</p>
        </div>
      )}
    </div>
  );
}

// ── Main Auth Component ────────────────────────────────────────────────────
export default function AuthForms({ initialMode = 'login', onAuth }) {
  const [mode, setMode] = useState(initialMode); // login | register | 2fa

  const handleAuthSuccess = (data) => {
    onAuth?.(data);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gray-900 p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-600 rounded-2xl mb-3 shadow-lg shadow-purple-600/30">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Nexus AI Pro</h1>
          <p className="text-gray-400 text-sm">
            {mode === 'login' ? 'Sign in to your account' : mode === 'register' ? 'Create your account' : 'Secure your account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 shadow-xl">
          {mode === 'login' && <LoginForm onSuccess={handleAuthSuccess} onSwitch={setMode} />}
          {mode === 'register' && <RegisterForm onSuccess={() => setMode('login')} onSwitch={setMode} />}
          {mode === '2fa' && <TwoFASetup onDone={() => setMode('login')} />}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Protected by AES-256-GCM · TLS 1.3 · MFA
        </p>
      </div>
    </div>
  );
}

// Export individual forms for use in separate dashboards
export { LoginForm, RegisterForm, TwoFASetup, checkPasswordStrength };
