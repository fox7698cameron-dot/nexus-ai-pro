/**
 * src/components/dashboards/AuthPages.jsx
 * Authentication UI — Login, Register, 2FA, Biometrics, Password Strength
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Created: 2026-08-12
 *
 * Features:
 *  - Role-based registration (user/dev/moderator/admin)
 *  - 13+ char password enforcement with strength meter
 *  - TOTP 2FA integration
 *  - WebAuthn biometric flow (fingerprint / Face ID)
 *  - Unicode username support (emoji, special chars)
 *  - Multi-language via i18n context
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Fingerprint, ScanFace,
  ShieldCheck, Shield, ArrowRight, AlertCircle, CheckCircle,
  Loader2, Smartphone, Key, QrCode, RefreshCw
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PASSWORD_LEN = 13;

const PASSWORD_RULES = [
  { label: `${MIN_PASSWORD_LEN}+ characters`, test: p => [...p].length >= MIN_PASSWORD_LEN },
  { label: 'Uppercase letter',  test: p => /[A-Z]/.test(p) },
  { label: 'Lowercase letter',  test: p => /[a-z]/.test(p) },
  { label: 'Number',            test: p => /[0-9]/.test(p) },
  { label: 'Special character', test: p => /[^A-Za-z0-9]/.test(p) },
];

function calcStrength(password) {
  if (!password) return { score: 0, label: '', color: 'transparent' };
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length;
  if (passed <= 2) return { score: passed / 5, label: 'Weak',   color: '#ef4444' };
  if (passed === 3) return { score: 3 / 5,     label: 'Fair',   color: '#f59e0b' };
  if (passed === 4) return { score: 4 / 5,     label: 'Good',   color: '#3b82f6' };
  return                  { score: 1,           label: 'Strong', color: '#10b981' };
}

// ─── Password Strength Meter ──────────────────────────────────────────────────

function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const { score, label, color } = calcStrength(password);
  const rules = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password) }));

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>Password strength</span>
        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          width: `${score * 100}%`,
          background: color,
          transition: 'width 0.3s ease, background 0.3s ease',
        }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
        {rules.map(rule => (
          <span key={rule.label} style={{
            fontSize: 11, display: 'flex', alignItems: 'center', gap: 4,
            color: rule.passed ? '#10b981' : 'var(--text-muted, #9ca3af)',
          }}>
            {rule.passed ? <CheckCircle size={10} /> : <AlertCircle size={10} />}
            {rule.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Input Field ─────────────────────────────────────────────────────────────

function Field({ label, name, type = 'text', value, onChange, placeholder, Icon, autoComplete, error, note }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  const inputType  = isPassword && showPw ? 'text' : type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted, #9ca3af)' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        {Icon && (
          <Icon size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted, #6b7280)', pointerEvents: 'none',
          }} />
        )}
        <input
          name={name}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            padding:        `10px ${isPassword ? '40px' : '12px'} 10px ${Icon ? '36px' : '12px'}`,
            borderRadius:   8,
            border:         `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
            background:     'rgba(255,255,255,0.05)',
            color:          'var(--text, #f9fafb)',
            fontSize:       14,
            outline:        'none',
            boxSizing:      'border-box',
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted, #6b7280)', padding: 2,
            }}
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>}
      {note  && <span style={{ fontSize: 11, color: 'var(--text-muted, #9ca3af)' }}>{note}</span>}
    </div>
  );
}

// ─── Auth Container ───────────────────────────────────────────────────────────

function AuthCard({ children, title, subtitle }) {
  return (
    <div style={{
      maxWidth: 420, margin: '40px auto',
      background: 'var(--card-bg, rgba(255,255,255,0.05))',
      border: '1px solid var(--border, rgba(255,255,255,0.1))',
      borderRadius: 16, padding: 32,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Shield size={26} style={{ color: '#fff' }} />
        </div>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #9ca3af)' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────

export function LoginForm({ onSuccess, onRegister, apiBase = '/api' }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [mfaState, setMfaState] = useState(null); // { preAuthToken }

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setErrors({});
    if (!email)    return setErrors({ email: 'Email is required' });
    if (!password) return setErrors({ password: 'Password is required' });

    setLoading(true);
    try {
      const res  = await fetch(`${apiBase}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) return setErrors({ form: data.error || 'Login failed' });

      if (data.requireMFA) {
        setMfaState({ preAuthToken: data.preAuthToken });
        return;
      }

      localStorage.setItem('nexus_token',   data.accessToken);
      localStorage.setItem('nexus_refresh',  data.refreshToken);
      onSuccess?.(data.user);
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [email, password, apiBase, onSuccess]);

  if (mfaState) {
    return <TOTPVerify preAuthToken={mfaState.preAuthToken} onSuccess={onSuccess} apiBase={apiBase} />;
  }

  return (
    <AuthCard title="Sign In" subtitle="Access your Nexus AI Pro dashboard">
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {errors.form && (
          <div style={{ padding: '10px 12px', background: '#ef444422', borderRadius: 7, fontSize: 13, color: '#fca5a5', display: 'flex', gap: 6, alignItems: 'center' }}>
            <AlertCircle size={14} /> {errors.form}
          </div>
        )}
        <Field label="Email" name="email" type="email" value={email} onChange={setEmail}
          placeholder="you@example.com" Icon={Mail} autoComplete="email" error={errors.email} />
        <Field label="Password" name="password" type="password" value={password} onChange={setPassword}
          placeholder="Your password" Icon={Lock} autoComplete="current-password" error={errors.password} />

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '11px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <BiometricButton apiBase={apiBase} onSuccess={onSuccess} />

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #9ca3af)', margin: 0 }}>
          No account?{' '}
          <button type="button" onClick={onRegister} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>
            Create one
          </button>
        </p>
      </form>
    </AuthCard>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

export function RegisterForm({ onSuccess, onLogin, apiBase = '/api' }) {
  const [form,   setForm]   = useState({ username: '', email: '', password: '', confirm: '', role: 'user', inviteCode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.username) errs.username = 'Username required';
    if (!form.email)    errs.email    = 'Email required';
    if (!form.password) errs.password = 'Password required';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';

    const str = calcStrength(form.password);
    if (str.label === 'Weak' || str.label === 'Fair') {
      errs.password = 'Password is too weak — use 13+ characters with mixed case, numbers, and special characters';
    }
    if (Object.keys(errs).length) return setErrors(errs);

    setLoading(true);
    try {
      const res  = await fetch(`${apiBase}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          username:   form.username,
          email:      form.email,
          password:   form.password,
          role:       form.role,
          inviteCode: form.inviteCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setErrors({ form: data.error || 'Registration failed' });
      setSuccess(true);
    } catch {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [form, apiBase]);

  if (success) {
    return (
      <AuthCard title="Account Created!" subtitle="You can now sign in">
        <div style={{ textAlign: 'center' }}>
          <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 16px', display: 'block' }} />
          <p style={{ fontSize: 14, color: 'var(--text-muted, #9ca3af)', marginBottom: 20 }}>
            Welcome to Nexus AI Pro! Your account has been created.
          </p>
          <button
            onClick={onLogin}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign In Now
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Create Account" subtitle="Join Nexus AI Pro today">
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {errors.form && (
          <div style={{ padding: '10px 12px', background: '#ef444422', borderRadius: 7, fontSize: 13, color: '#fca5a5' }}>
            {errors.form}
          </div>
        )}

        <Field label="Username" name="username" value={form.username} onChange={set('username')}
          placeholder="Enter username (emoji OK! 🎮)" Icon={User} autoComplete="username"
          error={errors.username}
          note="2–64 characters · Unicode, emoji, and special characters supported" />

        <Field label="Email" name="email" type="email" value={form.email} onChange={set('email')}
          placeholder="you@example.com" Icon={Mail} autoComplete="email" error={errors.email} />

        <div>
          <Field label="Password" name="password" type="password" value={form.password} onChange={set('password')}
            placeholder={`At least ${MIN_PASSWORD_LEN} characters`} Icon={Lock}
            autoComplete="new-password" error={errors.password} />
          <PasswordStrengthMeter password={form.password} />
        </div>

        <Field label="Confirm Password" name="confirm" type="password" value={form.confirm} onChange={set('confirm')}
          placeholder="Repeat your password" Icon={Lock}
          autoComplete="new-password" error={errors.confirm} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted, #9ca3af)' }}>Account Type</label>
          <select
            value={form.role}
            onChange={e => set('role')(e.target.value)}
            style={{
              padding: '10px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: 'var(--text, #f9fafb)',
              fontSize: 14,
            }}
          >
            <option value="user">User</option>
            <option value="dev">Developer (invite code required)</option>
            <option value="moderator">Moderator (invite code required)</option>
            <option value="admin">Admin (invite code required)</option>
          </select>
        </div>

        {form.role !== 'user' && (
          <Field label="Invite Code" name="inviteCode" value={form.inviteCode} onChange={set('inviteCode')}
            placeholder="Enter invite code" Icon={Key} note="Required for privileged accounts" />
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '11px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted, #9ca3af)', margin: 0 }}>
          Already have an account?{' '}
          <button type="button" onClick={onLogin} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}>
            Sign in
          </button>
        </p>
      </form>
    </AuthCard>
  );
}

// ─── TOTP 2FA Verify ──────────────────────────────────────────────────────────

export function TOTPVerify({ preAuthToken, onSuccess, apiBase = '/api' }) {
  const [code,    setCode]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const verify = useCallback(async (e) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code');
    setLoading(true);
    try {
      const res  = await fetch(`${apiBase}/auth/mfa/verify`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${preAuthToken}`,
        },
        body: JSON.stringify({ totpCode: code }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || 'Invalid code');
      localStorage.setItem('nexus_token',  data.accessToken);
      localStorage.setItem('nexus_refresh', data.refreshToken);
      onSuccess?.(data.user);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [code, preAuthToken, apiBase, onSuccess]);

  return (
    <AuthCard title="Two-Factor Auth" subtitle="Enter the code from your authenticator app">
      <form onSubmit={verify} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div style={{ padding: '10px', background: '#ef444422', borderRadius: 7, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
          style={{
            textAlign: 'center', fontSize: 28, fontWeight: 700, letterSpacing: '0.3em',
            padding: '14px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)', color: 'var(--text, #f9fafb)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          style={{
            padding: 11, borderRadius: 8, border: 'none',
            background: code.length === 6 ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.1)',
            color: '#fff', cursor: 'pointer', fontWeight: 600,
          }}
        >
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
    </AuthCard>
  );
}

// ─── Biometric Button ─────────────────────────────────────────────────────────

export function BiometricButton({ onSuccess, apiBase = '/api' }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const supported = typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined;

  const authenticate = useCallback(async () => {
    if (!supported) return setError('WebAuthn not supported on this device/browser');
    const token = localStorage.getItem('nexus_token') || '';
    if (!token) return setError('Sign in first, then enable biometrics');

    setLoading(true);
    try {
      // Get challenge
      const chRes  = await fetch(`${apiBase}/auth/biometric/challenge`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      if (!chRes.ok) throw new Error('Could not get biometric challenge');
      const challenge = await chRes.json();

      // Call WebAuthn API
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge:        Uint8Array.from(atob(challenge.challenge), c => c.charCodeAt(0)),
          rpId:             challenge.rpId,
          timeout:          challenge.timeout,
          userVerification: challenge.userVerification,
        },
      });

      // Verify
      const verRes = await fetch(`${apiBase}/auth/biometric/verify`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          credentialId:   credential.id,
          signature:      btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        }),
      });
      const data = await verRes.json();
      if (!verRes.ok) throw new Error(data.error || 'Biometric verification failed');
      localStorage.setItem('nexus_token', data.accessToken);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Biometric auth failed');
    } finally {
      setLoading(false);
    }
  }, [supported, apiBase, onSuccess]);

  if (!supported) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted, #9ca3af)', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        or
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      </div>
      <button
        type="button"
        onClick={authenticate}
        disabled={loading}
        style={{
          padding: '10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
          background: 'transparent', color: 'var(--text, #f9fafb)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontSize: 13,
        }}
      >
        <Fingerprint size={16} />
        {loading ? 'Authenticating...' : 'Use Biometrics (Face ID / Fingerprint)'}
      </button>
      {error && <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

// ─── Auth Router ──────────────────────────────────────────────────────────────

export default function AuthPages({ onAuthenticated, apiBase = '/api' }) {
  const [view, setView] = useState('login'); // 'login' | 'register'

  return view === 'login'
    ? <LoginForm    onSuccess={onAuthenticated} onRegister={() => setView('register')} apiBase={apiBase} />
    : <RegisterForm onSuccess={onAuthenticated} onLogin={() => setView('login')} apiBase={apiBase} />;
}
