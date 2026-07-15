/**
 * src/components/AuthDashboard.jsx
 * Nexus AI Pro — Authentication UI (Register, Login, 2FA, Biometrics, MFA)
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * Date: 2026-07-15
 *
 * Handles: email/password login & registration, TOTP 2FA, WebAuthn biometrics,
 * password strength meter (13+ chars), emoji/special-char usernames,
 * role-based routing, MFA backup codes.
 */

import React, { useState, useCallback } from 'react';
import AuthService from '../auth/AuthService.js';
import { validatePasswordStrength, validateUsername, validateEmail } from '../utils/validation.js';
import { t } from '../i18n/index.js';

// ─── Password Strength Meter ──────────────────────────────────────────────────

function PasswordMeter({ password }) {
  const { score, level, failed } = validatePasswordStrength(password);
  const max = 9;
  const pct = Math.round((score / max) * 100);
  const colors = { weak: '#ef4444', fair: '#f59e0b', strong: '#3b82f6', 'very-strong': '#10b981' };
  const color = colors[level] ?? '#ef4444';

  const requirements = [
    { key: 'length',  label: `13+ characters (${password.length})` },
    { key: 'upper',   label: 'Uppercase letter' },
    { key: 'lower',   label: 'Lowercase letter' },
    { key: 'digit',   label: 'Number' },
    { key: 'special', label: 'Special character (!@#$%…)' },
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#888' }}>Password Strength</span>
        <span style={{ color, fontWeight: 700, textTransform: 'capitalize' }}>{level.replace('-', ' ')}</span>
      </div>
      <div style={{ height: 4, background: '#2d2d44', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'all 0.3s' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {requirements.map(r => (
          <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <span style={{ color: failed.includes(r.key) ? '#ef4444' : '#10b981' }}>
              {failed.includes(r.key) ? '✗' : '✓'}
            </span>
            <span style={{ color: failed.includes(r.key) ? '#666' : '#888' }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

function Input({ label, type = 'text', value, onChange, error, autoComplete, placeholder, action }) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;

  return (
    <div style={{ marginBottom: 16 }}>
      {label && <label style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6, fontWeight: 600 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input
          type={inputType} value={value} onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete} placeholder={placeholder}
          style={{
            width: '100%', padding: type === 'password' ? '10px 44px 10px 14px' : '10px 14px',
            background: '#1a1a2e', border: `1px solid ${error ? '#ef4444' : '#2d2d44'}`,
            borderRadius: 8, color: '#e2e8f0', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(s => !s)} style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 16,
          }}>
            {show ? '🙈' : '👁'}
          </button>
        )}
        {action}
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ─── 2FA Step ─────────────────────────────────────────────────────────────────

function TwoFAStep({ tempToken, onSuccess, onBack }) {
  const [code, setCode]   = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      const res = await AuthService.verify2FA(tempToken, code);
      if (res.token) onSuccess(res);
      else setError(res.error ?? 'Verification failed');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', fontSize: 32, marginBottom: 12 }}>🔐</div>
      <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, color: '#e2e8f0', textAlign: 'center' }}>
        Two-Factor Authentication
      </h2>
      <p style={{ color: '#666', fontSize: 13, textAlign: 'center', margin: '0 0 24px' }}>
        Enter the 6-digit code from your authenticator app
      </p>
      <input
        type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
        value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        style={{
          width: '100%', padding: '14px', textAlign: 'center', letterSpacing: '0.4em',
          fontSize: 24, fontWeight: 700, background: '#1a1a2e', border: '1px solid #2d2d44',
          borderRadius: 10, color: '#e2e8f0', outline: 'none', boxSizing: 'border-box', marginBottom: 8,
        }}
      />
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{error}</div>}
      <button onClick={submit} disabled={loading || code.length < 6} style={{
        width: '100%', padding: '12px', background: loading ? '#2d2d44' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        color: '#fff', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
        fontSize: 15, fontWeight: 700, marginBottom: 12,
      }}>
        {loading ? 'Verifying…' : 'Verify'}
      </button>
      <button onClick={onBack} style={{
        width: '100%', padding: '10px', background: 'none', color: '#666',
        border: '1px solid #2d2d44', borderRadius: 8, cursor: 'pointer', fontSize: 13,
      }}>
        ← Back to Login
      </button>
    </div>
  );
}

// ─── Login Form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [tempToken, setTempToken] = useState(null);
  const [biometricError, setBiometricError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    const ev = validateEmail(email);
    if (!ev.valid) { setError(ev.error); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await AuthService.login(email, password);
      if (res.requires2FA) { setTempToken(res.tempToken); }
      else if (res.token)  { onSuccess(res); }
      else                 { setError(res.error ?? 'Login failed'); }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometric() {
    if (!AuthService.isBiometricAvailable()) {
      setBiometricError('Biometrics not available on this device/browser');
      return;
    }
    setBiometricError('');
    try {
      const res = await AuthService.loginBiometric();
      if (res.token) onSuccess(res);
    } catch (err) {
      setBiometricError(err.message);
    }
  }

  if (tempToken) {
    return <TwoFAStep tempToken={tempToken} onSuccess={onSuccess} onBack={() => setTempToken(null)} />;
  }

  return (
    <form onSubmit={handleLogin}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Welcome back</h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 24px' }}>Sign in to your Nexus AI Pro account</p>

      <Input label="Email" type="email" value={email} onChange={setEmail}
        autoComplete="email" placeholder="you@example.com" />
      <Input label="Password" type="password" value={password} onChange={setPassword}
        autoComplete="current-password" placeholder="••••••••••••••" />

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px', marginBottom: 12,
        background: loading ? '#2d2d44' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        color: '#fff', border: 'none', borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700,
      }}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      {/* Biometric login */}
      {AuthService.isBiometricAvailable() && (
        <button type="button" onClick={handleBiometric} style={{
          width: '100%', padding: '12px', marginBottom: 12,
          background: '#1a1a2e', color: '#a855f7', border: '1px solid #7c3aed40',
          borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span>🔏</span> Sign in with Biometrics / Passkey
        </button>
      )}
      {biometricError && (
        <div style={{ color: '#f59e0b', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>{biometricError}</div>
      )}

      <div style={{ textAlign: 'center', fontSize: 13, color: '#555' }}>
        Don't have an account?{' '}
        <button type="button" onClick={() => onSwitch('register')} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}>
          Create one
        </button>
      </div>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess, onSwitch }) {
  const [fields, setFields] = useState({ email: '', username: '', displayName: '', password: '', confirm: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = key => val => setFields(f => ({ ...f, [key]: val }));

  function validate() {
    const e = {};
    const ev = validateEmail(fields.email);
    if (!ev.valid) e.email = ev.error;
    const uv = validateUsername(fields.username);
    if (!uv.valid) e.username = uv.errors.join('. ');
    const pv = validatePasswordStrength(fields.password);
    if (!pv.valid) e.password = 'Password does not meet requirements';
    if (fields.password !== fields.confirm) e.confirm = 'Passwords do not match';
    return e;
  }

  async function handleRegister(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const res = await AuthService.register({
        email: fields.email.trim().toLowerCase(),
        username: fields.username.trim(),
        displayName: fields.displayName.trim() || fields.username.trim(),
        password: fields.password,
        role: fields.role,
      });
      if (res.token) onSuccess(res);
      else setErrors({ form: res.error ?? 'Registration failed' });
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRegister}>
      <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>Create Account</h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 20px' }}>
        Usernames support emoji &amp; special characters 🎉
      </p>

      <Input label="Email *" type="email" value={fields.email} onChange={set('email')}
        error={errors.email} autoComplete="email" placeholder="you@example.com" />
      <Input label="Username * (supports emoji &amp; special chars)" value={fields.username} onChange={set('username')}
        error={errors.username} autoComplete="username" placeholder="e.g. dev_user42 or 🚀builder" />
      <Input label="Display Name" value={fields.displayName} onChange={set('displayName')}
        autoComplete="name" placeholder="Your public name" />
      <Input label="Password *" type="password" value={fields.password} onChange={set('password')}
        error={errors.password} autoComplete="new-password" placeholder="13+ character password" />
      {fields.password && <PasswordMeter password={fields.password} />}
      <div style={{ marginTop: 16 }} />
      <Input label="Confirm Password *" type="password" value={fields.confirm} onChange={set('confirm')}
        error={errors.confirm} autoComplete="new-password" placeholder="Re-enter password" />

      {errors.form && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>
          {errors.form}
        </div>
      )}

      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '12px', marginBottom: 12,
        background: loading ? '#2d2d44' : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
        color: '#fff', border: 'none', borderRadius: 8,
        cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700,
      }}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <div style={{ textAlign: 'center', fontSize: 13, color: '#555' }}>
        Already have an account?{' '}
        <button type="button" onClick={() => onSwitch('login')} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}>
          Sign in
        </button>
      </div>
    </form>
  );
}

// ─── Main Auth Dashboard ──────────────────────────────────────────────────────

export default function AuthDashboard({ onAuthenticated }) {
  const [view, setView] = useState('login');

  const handleSuccess = useCallback(res => {
    if (typeof onAuthenticated === 'function') onAuthenticated(res.user);
  }, [onAuthenticated]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #1a0a2e 100%)',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⬡</div>
          <div style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            NEXUS AI PRO
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4, letterSpacing: '0.1em' }}>
            🔒 AES-256-GCM · Zero Trust Security
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#12121f', border: '1px solid #2d2d44',
          borderRadius: 18, padding: '32px',
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
        }}>
          {view === 'login'    && <LoginForm    onSuccess={handleSuccess} onSwitch={setView} />}
          {view === 'register' && <RegisterForm onSuccess={handleSuccess} onSwitch={setView} />}
        </div>

        {/* Feature badges */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20, flexWrap: 'wrap' }}>
          {['🔐 2FA / MFA', '👆 Biometrics', '🌍 15 Languages', '🔒 End-to-End Encrypted'].map(b => (
            <span key={b} style={{ fontSize: 11, color: '#555' }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
