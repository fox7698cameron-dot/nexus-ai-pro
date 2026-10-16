/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 * AuthSystem.jsx
 * Updated: 2026-10-16
 * Full auth: registration, login, biometrics, 2FA/MFA, roles (admin/dev/mod/user)
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Password strength ─────────────────────────────────────────────────────────
// Min 13 chars, must include upper, lower, digit, special, supports emoji/unicode
const SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/;
function checkPassword(pw) {
  const issues = [];
  if (pw.length < 13)       issues.push('At least 13 characters');
  if (!/[A-Z]/.test(pw))   issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw))   issues.push('One lowercase letter');
  if (!/[0-9]/.test(pw))   issues.push('One number');
  if (!SPECIAL.test(pw))   issues.push('One special character');
  const score = Math.max(0, 5 - issues.length);
  return { issues, score, ok: issues.length === 0 };
}

const STRENGTH_LABELS = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'];

// ── Role configs ──────────────────────────────────────────────────────────────
const ROLES = {
  user:  { label: 'User',      icon: '👤', color: '#6b7280', desc: 'Standard access' },
  mod:   { label: 'Moderator', icon: '🛡️', color: '#f59e0b', desc: 'Moderation tools' },
  dev:   { label: 'Developer', icon: '💻', color: '#3b82f6', desc: 'Dev & API access' },
  admin: { label: 'Admin',     icon: '👑', color: '#8b5cf6', desc: 'Full access' },
};

// ── MFA methods ───────────────────────────────────────────────────────────────
const MFA_METHODS = [
  { id: 'totp',        label: 'Authenticator App (TOTP)', icon: '📱' },
  { id: 'sms',         label: 'SMS Code',                 icon: '💬' },
  { id: 'email',       label: 'Email Code',               icon: '📧' },
  { id: 'fingerprint', label: 'Fingerprint / Touch ID',   icon: '🫵' },
  { id: 'faceid',      label: 'Face ID',                  icon: '👤' },
  { id: 'retinal',     label: 'Retinal Scan',             icon: '👁️' },
];

// ── Biometrics ────────────────────────────────────────────────────────────────
async function attemptBiometric(type) {
  // WebAuthn / FIDO2 for fingerprint/platform auth
  if (!window.PublicKeyCredential) {
    return { ok: false, error: 'WebAuthn not supported in this browser' };
  }
  try {
    if (type === 'fingerprint' || type === 'faceid') {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) return { ok: false, error: 'Platform authenticator not available' };

      // Create assertion (sign-in flow demo)
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const cred = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      });
      return { ok: !!cred, credId: cred?.id };
    }
    return { ok: false, error: 'Unsupported biometric type' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Input component ───────────────────────────────────────────────────────────
function Input({ label, type = 'text', value, onChange, error, placeholder, autoComplete, maxLength }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPass && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          style={{
            width: '100%', padding: isPass ? '10px 40px 10px 14px' : '10px 14px',
            borderRadius: 8, border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
            background: 'var(--input)', color: 'var(--fg)', fontSize: 15,
            boxSizing: 'border-box', outline: 'none',
          }}
        />
        {isPass && (
          <button onClick={() => setShow(!show)} type="button" style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 16,
          }}>{show ? '🙈' : '👁️'}</button>
        )}
      </div>
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  );
}

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordMeter({ password }) {
  const { issues, score, ok } = checkPassword(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? STRENGTH_COLORS[score] : 'var(--border)', transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: STRENGTH_COLORS[score], fontWeight: 600 }}>{STRENGTH_LABELS[score]}</div>
      {issues.length > 0 && (
        <ul style={{ margin: '4px 0', padding: '0 0 0 16px', fontSize: 12, color: '#ef4444' }}>
          {issues.map(i => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

// ── TOTP code input ───────────────────────────────────────────────────────────
function OtpInput({ value, onChange, length = 6 }) {
  const digits = Array.from({ length }, (_, i) => value[i] || '');
  const refs = Array.from({ length }, () => React.createRef());
  const handleKey = (i, e) => {
    const v = e.target.value.replace(/\D/g, '').slice(-1);
    const next = value.split('');
    next[i] = v;
    const joined = next.join('');
    onChange(joined);
    if (v && i < length - 1) refs[i + 1].current?.focus();
    if (!v && e.nativeEvent.inputType === 'deleteContentBackward' && i > 0) refs[i - 1].current?.focus();
  };
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          value={d}
          onChange={e => handleKey(i, e)}
          maxLength={1}
          inputMode="numeric"
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
            borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--fg)',
          }}
        />
      ))}
    </div>
  );
}

// ── Register form ─────────────────────────────────────────────────────────────
function RegisterForm({ onSuccess, onSwitch }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', displayName: '', lang: 'en', role: 'user' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mfaMethod, setMfaMethod] = useState('totp');

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  // Validate username: supports unicode, emoji, no injection
  const validateUsername = (u) => {
    if (!u || u.length < 3) return 'Min 3 characters';
    if (u.length > 32) return 'Max 32 characters';
    // Allow unicode letters, digits, emoji, _ - . but block script tags etc.
    if (/<|>|&|script|SELECT|INSERT|DROP/i.test(u)) return 'Invalid characters';
    return '';
  };

  const validate = () => {
    const e = {};
    const uErr = validateUsername(form.username);
    if (uErr) e.username = uErr;
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    const { ok, issues } = checkPassword(form.password);
    if (!ok) e.password = issues[0];
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
          displayName: form.displayName || form.username,
          preferredLang: form.lang,
          role: form.role,
          mfaMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error || 'Registration failed' }); return; }
      if (step === 1) { setStep(2); return; }
      onSuccess?.(data);
    } catch (err) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const LANGS = [['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['zh','中文'],['ja','日本語'],['ko','한국어'],['ar','العربية'],['pt','Português'],['ru','Русский']];

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, textAlign: 'center' }}>Create Account</h2>

      {step === 1 && (<>
        <Input label="Username (supports emoji & unicode)" value={form.username} onChange={set('username')} error={errors.username} placeholder="e.g. cool_user 🎮" autoComplete="username" />
        <Input label="Display Name" value={form.displayName} onChange={set('displayName')} placeholder="How others see you" autoComplete="name" />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} autoComplete="email" />
        <div>
          <Input label="Password (13+ characters)" type="password" value={form.password} onChange={set('password')} error={errors.password} autoComplete="new-password" />
          <PasswordMeter password={form.password} />
        </div>
        <Input label="Confirm Password" type="password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} autoComplete="new-password" />

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>Language</label>
            <select value={form.lang} onChange={e => set('lang')(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--fg)', fontSize: 14 }}>
              {LANGS.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-muted)' }}>Account Type</label>
            <select value={form.role} onChange={e => set('role')(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input)', color: 'var(--fg)', fontSize: 14 }}>
              {Object.entries(ROLES).map(([k,v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
        </div>
      </>)}

      {step === 2 && (<>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: 40 }}>🔐</div>
          <h3 style={{ margin: '8px 0 4px' }}>Set Up Authentication</h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Choose your secondary authentication method</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {MFA_METHODS.map(m => (
            <button key={m.id} type="button" onClick={() => setMfaMethod(m.id)} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
              borderRadius: 10, border: `1px solid ${mfaMethod === m.id ? '#3b82f6' : 'var(--border)'}`,
              background: mfaMethod === m.id ? '#3b82f622' : 'var(--input)',
              cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ fontSize: 20 }}>{m.icon}</span>
              <span style={{ color: 'var(--fg)', fontSize: 14 }}>{m.label}</span>
              {mfaMethod === m.id && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontSize: 18 }}>✓</span>}
            </button>
          ))}
        </div>
      </>)}

      {errors.submit && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444422', color: '#ef4444', fontSize: 14 }}>{errors.submit}</div>}

      <button type="submit" disabled={loading} style={{
        padding: '13px', borderRadius: 8, border: 'none',
        background: loading ? 'var(--border)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
      }}>
        {loading ? 'Creating Account...' : step === 1 ? 'Continue →' : 'Create Account'}
      </button>

      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
      </p>
    </form>
  );
}

// ── Login form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch }) {
  const [step, setStep] = useState('credentials'); // credentials | mfa | biometric
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [bioResult, setBioResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const submitCredentials = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setErrors({ submit: 'Email and password required' }); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error || 'Login failed' }); return; }
      setUserInfo(data.user);
      if (data.requiresMfa) { setStep('mfa'); }
      else { onSuccess?.(data); }
    } catch (err) {
      setErrors({ submit: 'Network error.' });
    } finally {
      setLoading(false);
    }
  };

  const submitMfa = async (e) => {
    e.preventDefault();
    if (mfaCode.length < 6) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: mfaCode, userId: userInfo?.id }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error || 'Invalid code' }); return; }
      onSuccess?.(data);
    } catch (err) {
      setErrors({ submit: 'Verification failed.' });
    } finally {
      setLoading(false);
    }
  };

  const tryBiometric = async () => {
    setLoading(true);
    setBioResult(null);
    const result = await attemptBiometric('fingerprint');
    setBioResult(result);
    if (result.ok) {
      // In production: verify credential with server
      setTimeout(() => onSuccess?.({ user: userInfo, biometric: true }), 500);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, textAlign: 'center' }}>Sign In</h2>

      {step === 'credentials' && (
        <form onSubmit={submitCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
          <Input label="Password" type="password" value={form.password} onChange={set('password')} autoComplete="current-password" />
          {errors.submit && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444422', color: '#ef4444', fontSize: 14 }}>{errors.submit}</div>}
          <button type="submit" disabled={loading} style={{ padding: '13px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep('biometric')} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 14 }}>
              🫵 Biometric
            </button>
            <button type="button" onClick={() => {}} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 14 }}>
              🔑 Passkey
            </button>
          </div>
        </form>
      )}

      {step === 'mfa' && (
        <form onSubmit={submitMfa} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40 }}>📱</div>
            <h3 style={{ margin: '8px 0 4px' }}>Two-Factor Authentication</h3>
            <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Enter the 6-digit code from your authenticator app</p>
          </div>
          <OtpInput value={mfaCode} onChange={setMfaCode} />
          {errors.submit && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ef444422', color: '#ef4444', fontSize: 14, textAlign: 'center' }}>{errors.submit}</div>}
          <button type="submit" disabled={loading || mfaCode.length < 6} style={{ padding: '13px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button type="button" onClick={() => setStep('credentials')} style={{ padding: '11px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>
            ← Back
          </button>
        </form>
      )}

      {step === 'biometric' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 64 }}>🫵</div>
          <h3 style={{ margin: 0 }}>Biometric Authentication</h3>
          <p style={{ color: 'var(--fg-muted)', fontSize: 14, textAlign: 'center' }}>Use your fingerprint, Face ID or device PIN to sign in</p>
          {bioResult && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: bioResult.ok ? '#10b98122' : '#ef444422', color: bioResult.ok ? '#10b981' : '#ef4444', fontSize: 14 }}>
              {bioResult.ok ? '✓ Authenticated' : `✗ ${bioResult.error}`}
            </div>
          )}
          <button onClick={tryBiometric} disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>
            {loading ? 'Authenticating...' : 'Authenticate'}
          </button>
          <button onClick={() => setStep('credentials')} style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer' }}>
            ← Use Password
          </button>
        </div>
      )}

      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--fg-muted)', margin: 0 }}>
        No account?{' '}
        <button type="button" onClick={onSwitch} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>Create one</button>
      </p>
    </div>
  );
}

// ── Role dashboard router ─────────────────────────────────────────────────────
function RoleBadge({ role }) {
  const cfg = ROLES[role] || ROLES.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: cfg.color + '22', color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function UserDashboard({ user }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          {user?.avatar || '👤'}
        </div>
        <div>
          <h2 style={{ margin: 0 }}>{user?.displayName || user?.username}</h2>
          <RoleBadge role={user?.role} />
        </div>
      </div>
      <p style={{ color: 'var(--fg-muted)' }}>Standard user dashboard. Access chats, files and settings.</p>
    </div>
  );
}

function AdminDashboard({ user }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>👑</span>
        <div>
          <h2 style={{ margin: 0 }}>Admin Panel</h2>
          <RoleBadge role="admin" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {[
          { icon: '👥', label: 'Users', value: '1,248' },
          { icon: '🛡️', label: 'Active Mods', value: '12' },
          { icon: '💻', label: 'Devs', value: '34' },
          { icon: '🚩', label: 'Open Reports', value: '7' },
        ].map(s => (
          <div key={s.label} style={{ padding: 16, borderRadius: 10, background: 'var(--card)', border: '1px solid var(--border)', textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DevDashboard({ user }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>💻</span>
        <div>
          <h2 style={{ margin: 0 }}>Developer Dashboard</h2>
          <RoleBadge role="dev" />
        </div>
      </div>
      <p style={{ color: 'var(--fg-muted)' }}>API keys, webhooks, pipeline access and developer tools.</p>
    </div>
  );
}

function ModDashboard({ user }) {
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <span style={{ fontSize: 32 }}>🛡️</span>
        <div>
          <h2 style={{ margin: 0 }}>Moderator Dashboard</h2>
          <RoleBadge role="mod" />
        </div>
      </div>
      <p style={{ color: 'var(--fg-muted)' }}>Content review, reports queue and community management.</p>
    </div>
  );
}

const ROLE_DASHBOARDS = { admin: AdminDashboard, dev: DevDashboard, mod: ModDashboard, user: UserDashboard };

// ── Main export ───────────────────────────────────────────────────────────────
export default function AuthSystem({ initialUser, onAuthChange }) {
  const [user, setUser] = useState(initialUser || null);
  const [mode, setMode] = useState('login'); // login | register

  const handleSuccess = useCallback((data) => {
    const u = data.user || data;
    setUser(u);
    onAuthChange?.(u);
  }, [onAuthChange]);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    onAuthChange?.(null);
  };

  const cardStyle = {
    maxWidth: 440, margin: '40px auto', padding: '32px 28px',
    borderRadius: 16, border: '1px solid var(--border)', background: 'var(--card)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  };

  if (user) {
    const Dashboard = ROLE_DASHBOARDS[user.role] || UserDashboard;
    return (
      <div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>🔐</span>
            <span style={{ fontWeight: 700 }}>Nexus AI Pro</span>
            <RoleBadge role={user.role} />
          </div>
          <button onClick={handleLogout} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--fg)', cursor: 'pointer', fontSize: 13 }}>
            Sign Out
          </button>
        </div>
        <Dashboard user={user} />
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {mode === 'login'
        ? <LoginForm onSuccess={handleSuccess} onSwitch={() => setMode('register')} />
        : <RegisterForm onSuccess={handleSuccess} onSwitch={() => setMode('login')} />
      }
    </div>
  );
}

export { RoleBadge, checkPassword, ROLES };
