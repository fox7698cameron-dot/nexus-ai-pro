/**
 * AuthSystem.jsx
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Full-stack Authentication System:
 *   - User registration with 13+ char password policy & emoji/special char usernames
 *   - Login with MFA / 2FA support
 *   - Biometric auth (Fingerprint, Touch ID, Face ID, Retinal scan)
 *   - Role-based UI: Admin / Developer / Moderator / User dashboards
 *   - Multi-language support
 *   - Password strength indicator
 * Updated: 2026-08-14
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, Fingerprint, ScanFace,
  Shield, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  LogIn, UserPlus, Settings, LogOut, Crown, Code2,
  Gavel, Users, Globe, Key, Smartphone, RefreshCw,
  ChevronDown, Bell, BarChart3, Activity
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const MIN_PW_LEN = 13;
const ROLES = {
  admin:     { label: 'Administrator', icon: Crown,   color: '#ef4444', dashboard: 'AdminDashboard'    },
  developer: { label: 'Developer',     icon: Code2,   color: '#6366f1', dashboard: 'DevDashboard'      },
  moderator: { label: 'Moderator',     icon: Gavel,   color: '#f59e0b', dashboard: 'ModDashboard'      },
  user:      { label: 'User',          icon: User,    color: '#22c55e', dashboard: 'UserDashboard'     },
};

const BIOMETRIC_TYPES = [
  { id: 'fingerprint', label: 'Fingerprint',  icon: Fingerprint, available: typeof window !== 'undefined' && window.PublicKeyCredential },
  { id: 'touchId',     label: 'Touch ID',      icon: Fingerprint, available: /iphone|ipad|mac/i.test(navigator?.userAgent || '') },
  { id: 'faceId',      label: 'Face ID',       icon: ScanFace,    available: /iphone|ipad/i.test(navigator?.userAgent || '') },
  { id: 'retinal',     label: 'Retinal Scan',  icon: Eye,         available: false }, // hardware-dependent
];

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'es', label: 'Español' }, { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' }, { code: 'ja', label: '日本語' }, { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' }, { code: 'ar', label: 'العربية' }, { code: 'pt', label: 'Português' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function evaluatePassword(pw) {
  const checks = [
    { label: `At least ${MIN_PW_LEN} characters`,  ok: pw.length >= MIN_PW_LEN },
    { label: 'Uppercase letter',                    ok: /[A-Z]/.test(pw) },
    { label: 'Lowercase letter',                    ok: /[a-z]/.test(pw) },
    { label: 'Number',                              ok: /[0-9]/.test(pw) },
    { label: 'Special character',                   ok: /[^A-Za-z0-9]/.test(pw) },
  ];
  const passed = checks.filter(c => c.ok).length;
  const strength = passed <= 1 ? 'weak' : passed <= 3 ? 'fair' : passed <= 4 ? 'good' : 'strong';
  return { checks, strength, score: passed };
}

const strengthColors = { weak: '#ef4444', fair: '#f97316', good: '#f59e0b', strong: '#22c55e' };

function StrengthBar({ strength, score }) {
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? (strengthColors[strength] || '#888') : 'var(--border)', transition: 'background 0.3s' }} />
      ))}
      <span style={{ fontSize: 11, color: strengthColors[strength], fontWeight: 600, marginLeft: 6 }}>{strength}</span>
    </div>
  );
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, readOnly, suffix }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 5 }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--input-bg, var(--card-bg))', border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`, borderRadius: 10, padding: '0 12px', transition: 'border-color 0.2s' }}>
        {Icon && <Icon size={15} style={{ opacity: 0.5, flexShrink: 0 }} />}
        <input
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          style={{ flex: 1, border: 'none', background: 'transparent', padding: '10px 0', fontSize: 14, color: 'var(--text)', outline: 'none' }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5, color: 'var(--text)' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {suffix}
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${r.color}20`, color: r.color, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
      <r.icon size={11} />{r.label}
    </span>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', displayName: '', language: 'en', region: 'US' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pwEval, setPwEval] = useState(null);

  const set = (k) => (v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'password') setPwEval(v ? evaluatePassword(v) : null);
  };

  const validate = () => {
    const e = {};
    if (!form.username.trim() || form.username.trim().length < 3) e.username = 'Username must be at least 3 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    const pw = evaluatePassword(form.password);
    if (pw.strength === 'weak' || pw.strength === 'fair') e.password = `Password too weak (${pw.strength}). Use 13+ chars with uppercase, lowercase, numbers, and symbols.`;
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username.trim(), email: form.email, password: form.password, displayName: form.displayName || form.username, language: form.language, region: form.region })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      localStorage.setItem('nexus_token', data.token);
      onSuccess(data);
    } catch (err) {
      setErrors({ global: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {errors.global && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ef4444' }}>{errors.global}</div>}
      <InputField label="Username (emoji & special chars supported 🎮)" value={form.username} onChange={set('username')} placeholder="your_username 🚀" icon={User} error={errors.username} />
      <InputField label="Display Name (optional)" value={form.displayName} onChange={set('displayName')} placeholder="Cameron Fox 🦊" icon={User} />
      <InputField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" icon={Mail} error={errors.email} />
      <div>
        <InputField label="Password (minimum 13 characters)" type="password" value={form.password} onChange={set('password')} placeholder="Strong passphrase + symbols! 🔐" icon={Lock} error={errors.password} />
        {pwEval && (
          <div style={{ marginTop: -10, marginBottom: 12 }}>
            <StrengthBar strength={pwEval.strength} score={pwEval.score} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {pwEval.checks.map(c => (
                <span key={c.label} style={{ fontSize: 10, color: c.ok ? '#22c55e' : '#888', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {c.ok ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <InputField label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" icon={Lock} error={errors.confirm} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 5, display: 'block' }}>Language</label>
          <select value={form.language} onChange={e => set('language')(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 }}>
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginBottom: 5, display: 'block' }}>Region</label>
          <input value={form.region} onChange={e => set('region')(e.target.value)} placeholder="US, GB, JP…" style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }} />
        </div>
      </div>
      <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading ? '#888' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer' }}>
        {loading ? 'Creating Account…' : 'Create Account'}
      </button>
      <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, opacity: 0.6 }}>
        Already have an account? <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Sign In</button>
      </div>
    </form>
  );
}

// ─── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricAvailable] = useState(() => typeof window !== 'undefined' && !!window.PublicKeyCredential);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const body = { email, password };
      if (requiresMfa) body.mfaCode = mfaCode;
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.requiresMfa) { setRequiresMfa(true); setLoading(false); return; }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('nexus_token', data.token);
      onSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    if (!biometricAvailable) return;
    try {
      // WebAuthn flow (simplified - production needs full credential assertion)
      const cred = await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), rpId: window.location.hostname, userVerification: 'preferred', timeout: 60000 } });
      if (cred) setError('Biometric verified (connect server-side WebAuthn to complete)');
    } catch (err) {
      setError('Biometric auth: ' + err.message);
    }
  };

  return (
    <form onSubmit={submit}>
      {error && <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#ef4444' }}>{error}</div>}

      {!requiresMfa ? (
        <>
          <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" icon={Mail} />
          <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Your password" icon={Lock} />
        </>
      ) : (
        <div>
          <div style={{ background: '#6366f115', border: '1px solid #6366f140', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#6366f1' }}>
            Enter your 2FA code or backup code to continue.
          </div>
          <InputField label="MFA / 2FA Code" value={mfaCode} onChange={setMfaCode} placeholder="Enter code" icon={Key} />
        </div>
      )}

      <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: loading ? '#888' : '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
        {loading ? 'Signing In…' : requiresMfa ? 'Verify & Sign In' : 'Sign In'}
      </button>

      {biometricAvailable && !requiresMfa && (
        <button type="button" onClick={biometricLogin} style={{ width: '100%', padding: '11px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
          <Fingerprint size={16} /> Sign In with Biometrics
        </button>
      )}

      <div style={{ textAlign: 'center', fontSize: 13, opacity: 0.6 }}>
        No account? <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Create one</button>
      </div>
    </form>
  );
}

// ─── Role-specific Dashboard Panels ──────────────────────────────────────────
function AdminDashboard({ user, onLogout }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['👥 Users', '∞', '#ef4444'], ['⚙️ Settings', 'Full', '#6366f1'], ['📊 Analytics', 'All', '#22c55e'], ['🛡️ Security', 'Admin', '#f59e0b']].map(([label, val, color]) => (
          <div key={label} style={{ flex: '1 1 120px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, opacity: 0.6, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <strong>Admin Panel:</strong> Manage users, roles, system configuration, security policies, audit logs, and all platform settings.
      </div>
    </div>
  );
}

function DevDashboard({ user }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['🔧 Projects', '∞', '#6366f1'], ['🔗 API Keys', 'Full', '#8b5cf6'], ['🧪 Test Suite', 'Run', '#22c55e'], ['📦 Builds', 'CI/CD', '#3b82f6']].map(([label, val, color]) => (
          <div key={label} style={{ flex: '1 1 120px', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 13, opacity: 0.6, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <strong>Developer Panel:</strong> Access all project tracking, CI/CD pipelines, API management, and game dev tools.
      </div>
    </div>
  );
}

function ModDashboard({ user }) {
  return (
    <div>
      <div style={{ fontSize: 13, opacity: 0.6, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <strong>Moderator Panel:</strong> Review content, manage reports, enforce community guidelines.
      </div>
    </div>
  );
}

function UserDashboard({ user }) {
  return (
    <div>
      <div style={{ fontSize: 13, opacity: 0.6, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
        <strong>Your Dashboard:</strong> Analytics, projects, achievements, and account settings.
      </div>
    </div>
  );
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SecuritySettings({ user, onClose }) {
  const [mfaEnabled, setMfaEnabled] = useState(user.mfaEnabled || false);
  const [backupCode, setBackupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('nexus_token') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const toggleMfa = async () => {
    setLoading(true);
    try {
      const endpoint = mfaEnabled ? '/api/auth/mfa/disable' : '/api/auth/mfa/enable';
      const res = await fetch(endpoint, { method: 'POST', headers });
      const data = await res.json();
      if (data.backupCode) setBackupCode(data.backupCode);
      setMfaEnabled(v => !v);
      setMsg(mfaEnabled ? 'MFA disabled.' : 'MFA enabled! Save your backup code.');
    } catch (err) { setMsg('Error: ' + err.message); }
    finally { setLoading(false); }
  };

  const registerBiometric = async (type) => {
    try {
      const res = await fetch('/api/auth/biometric/register', { method: 'POST', headers, body: JSON.stringify({ biometricType: type }) });
      const data = await res.json();
      setMsg(data.success ? `${type} registered!` : 'Failed');
    } catch { setMsg('Biometric registration failed'); }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ margin: 0 }}>Security Settings</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, color: 'var(--text)', fontSize: 18 }}>✕</button>
      </div>

      {msg && <div style={{ background: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13, color: '#22c55e' }}>{msg}</div>}

      {/* MFA */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Key size={14} />Two-Factor Authentication</div>
        <button onClick={toggleMfa} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: mfaEnabled ? '#ef4444' : '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
          {mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
        </button>
        {backupCode && <div style={{ marginTop: 8, padding: 10, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: 'monospace', fontSize: 13 }}>Backup code: <strong>{backupCode}</strong></div>}
      </div>

      {/* Biometrics */}
      <div>
        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Fingerprint size={14} />Biometric Authentication</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {BIOMETRIC_TYPES.map(bio => (
            <div key={bio.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
              <bio.icon size={16} style={{ opacity: bio.available ? 1 : 0.4 }} />
              <span style={{ flex: 1, fontSize: 13, opacity: bio.available ? 1 : 0.5 }}>{bio.label} {!bio.available && '(not available)'}</span>
              <button onClick={() => registerBiometric(bio.id)} disabled={!bio.available} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: bio.available ? '#6366f1' : '#888', color: '#fff', fontSize: 11, cursor: bio.available ? 'pointer' : 'not-allowed' }}>
                Register
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Auth Component ──────────────────────────────────────────────────────
export default function AuthSystem({ onAuthChange }) {
  const [mode, setMode] = useState('login'); // login | register | dashboard | settings
  const [authData, setAuthData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Restore session
  useEffect(() => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
      fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(user => { if (user) { setAuthData({ user, token }); setMode('dashboard'); onAuthChange?.({ user, token }); } })
        .catch(() => {});
    }
  }, [onAuthChange]);

  const onSuccess = (data) => {
    setAuthData(data);
    setMode('dashboard');
    onAuthChange?.(data);
  };

  const onLogout = async () => {
    const token = localStorage.getItem('nexus_token') || '';
    await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('nexus_token');
    setAuthData(null);
    setMode('login');
    onAuthChange?.(null);
  };

  const user = authData?.user;
  const role = user?.role || 'user';
  const RoleInfo = ROLES[role] || ROLES.user;

  const s = {
    container: { padding: 24, color: 'var(--text)', minHeight: '100vh' },
    box: { maxWidth: 440, margin: '0 auto', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
    logo: { textAlign: 'center', marginBottom: 24 },
    dashHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 },
  };

  if (mode === 'login' || mode === 'register') {
    return (
      <div style={s.container}>
        <div style={s.box}>
          <div style={s.logo}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Nexus AI Pro</div>
            <div style={{ fontSize: 13, opacity: 0.5 }}>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</div>
          </div>
          {mode === 'login'
            ? <LoginForm onSuccess={onSuccess} onSwitch={() => setMode('register')} />
            : <RegisterForm onSuccess={onSuccess} onSwitch={() => setMode('login')} />}
        </div>
      </div>
    );
  }

  if (mode === 'dashboard' && user) {
    return (
      <div style={s.container}>
        <div style={s.dashHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${RoleInfo.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
              {user.avatar || '👤'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user.displayName || user.username}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RoleBadge role={role} />
                {user.mfaEnabled && <span style={{ fontSize: 10, background: '#22c55e20', color: '#22c55e', padding: '1px 6px', borderRadius: 8 }}>MFA On</span>}
                {user.biometricsEnabled && <span style={{ fontSize: 10, background: '#6366f120', color: '#6366f1', padding: '1px 6px', borderRadius: 8 }}>🖐 Bio</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowSettings(v => !v)} style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: 'var(--text)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Settings size={13} /> Security
            </button>
            <button onClick={onLogout} style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </div>

        {showSettings
          ? <SecuritySettings user={user} onClose={() => setShowSettings(false)} />
          : <>
              <div style={{ marginBottom: 16, fontSize: 14, opacity: 0.7, background: `${RoleInfo.color}10`, border: `1px solid ${RoleInfo.color}30`, borderRadius: 10, padding: '10px 14px' }}>
                <RoleInfo.icon size={14} style={{ marginRight: 6, display: 'inline' }} />
                You are signed in as <strong>{RoleInfo.label}</strong>. Access level: {role === 'admin' ? 'Full system access' : role === 'developer' ? 'All dev tools & APIs' : role === 'moderator' ? 'Content management' : 'Standard user access'}.
              </div>
              {role === 'admin' && <AdminDashboard user={user} onLogout={onLogout} />}
              {role === 'developer' && <DevDashboard user={user} />}
              {role === 'moderator' && <ModDashboard user={user} />}
              {role === 'user' && <UserDashboard user={user} />}
            </>}
      </div>
    );
  }

  return null;
}
