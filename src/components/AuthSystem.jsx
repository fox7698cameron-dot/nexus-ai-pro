// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// Licensed under the Apache License, Version 2.0
// File created: 2026-08-06

import React, { useState, useEffect, useCallback } from 'react';
import { Lock, Eye, EyeOff, Fingerprint, ScanFace, Shield, User, Users, Key, Smartphone } from 'lucide-react';

// Password validation: >=13 chars, upper, lower, digit, special
const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{13,}$/;
// Username: 3-30 chars, supports unicode, emoji, underscores, hyphens (no spaces at edges)
const USER_REGEX = /^[\p{L}\p{N}\p{Emoji}_.-]{3,30}$/u;

function passwordStrength(pwd) {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 13) score++;
  if (pwd.length >= 18) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  return Math.min(score, 5);
}

const STR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6'];
const STR_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];

const STYLE = `
.auth-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:var(--an-bg,#0f172a);font-family:system-ui,sans-serif;padding:1rem;}
.auth-card{background:#1e293b;border:1px solid #334155;border-radius:1rem;padding:2rem;width:min(440px,100%);box-shadow:0 25px 50px rgba(0,0,0,.5);}
.auth-logo{text-align:center;margin-bottom:1.5rem;}
.auth-title{font-size:1.3rem;font-weight:700;color:#e2e8f0;text-align:center;margin:.5rem 0;}
.auth-sub{font-size:.8rem;color:#94a3b8;text-align:center;margin-bottom:1.5rem;}
.auth-role-tabs{display:flex;gap:.3rem;margin-bottom:1.5rem;background:#0f172a;border-radius:.5rem;padding:.25rem;}
.auth-role-tab{flex:1;padding:.35rem;border-radius:.4rem;border:none;cursor:pointer;font-size:.75rem;font-weight:600;background:transparent;color:#94a3b8;transition:background .2s;}
.auth-role-tab.active{background:#3b82f6;color:#fff;}
.auth-field{margin-bottom:1rem;}
.auth-label{display:block;font-size:.78rem;color:#94a3b8;margin-bottom:.3rem;font-weight:600;}
.auth-input{width:100%;padding:.55rem .75rem;background:#0f172a;border:1px solid #334155;border-radius:.5rem;color:#e2e8f0;font-size:.9rem;box-sizing:border-box;outline:none;transition:border-color .2s;}
.auth-input:focus{border-color:#3b82f6;}
.auth-input.error{border-color:#ef4444;}
.auth-input-wrap{position:relative;}
.auth-input-wrap .auth-input{padding-right:2.5rem;}
.auth-eye{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);cursor:pointer;color:#64748b;}
.auth-error{font-size:.73rem;color:#ef4444;margin-top:.2rem;}
.auth-str-bar{height:.3rem;border-radius:9999px;background:#334155;margin:.3rem 0;overflow:hidden;}
.auth-str-fill{height:100%;border-radius:9999px;transition:width .3s,background .3s;}
.auth-str-label{font-size:.7rem;font-weight:600;}
.auth-btn{width:100%;padding:.65rem;border-radius:.5rem;border:none;cursor:pointer;font-size:.9rem;font-weight:700;margin-top:1rem;transition:opacity .2s;}
.auth-btn:hover{opacity:.9;}
.auth-btn:disabled{opacity:.5;cursor:not-allowed;}
.auth-btn-primary{background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;}
.auth-divider{display:flex;align-items:center;gap:.5rem;margin:1rem 0;color:#64748b;font-size:.78rem;}
.auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:#334155;}
.auth-biometric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;margin:.75rem 0;}
.auth-bio-btn{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.6rem;border-radius:.5rem;border:1px solid #334155;background:#0f172a;cursor:pointer;font-size:.72rem;color:#94a3b8;transition:border-color .2s;}
.auth-bio-btn:hover{border-color:#3b82f6;color:#e2e8f0;}
.auth-bio-btn.success{border-color:#22c55e;color:#22c55e;background:#22c55e11;}
.auth-mfa-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:.3rem;margin:.5rem 0;}
.auth-backup-code{background:#0f172a;border:1px solid #334155;border-radius:.25rem;padding:.25rem .3rem;font-size:.7rem;font-family:monospace;text-align:center;color:#e2e8f0;}
.auth-link{background:none;border:none;cursor:pointer;color:#3b82f6;font-size:.8rem;text-decoration:underline;}
.auth-route-hint{font-size:.72rem;color:#64748b;text-align:center;margin-top:.5rem;}
`;

const ROLES = [
  { id: 'user',  label: 'User',      icon: User,   color: '#3b82f6', hint: 'Standard platform access' },
  { id: 'admin', label: 'Admin',     icon: Shield, color: '#ef4444', hint: '/admin dashboard — elevated privileges' },
  { id: 'dev',   label: 'Developer', icon: Key,    color: '#8b5cf6', hint: '/dev dashboard — API & dev tools' },
  { id: 'mod',   label: 'Moderator', icon: Users,  color: '#22c55e', hint: '/mod dashboard — content moderation' },
];

const BACKUP_CODES = Array.from({ length: 10 }, (_, i) =>
  Math.random().toString(36).slice(2, 7).toUpperCase() + '-' + Math.random().toString(36).slice(2, 7).toUpperCase()
);

function Field({ label, type = 'text', value, onChange, error, placeholder = '' }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="auth-field">
      <label className="auth-label">{label}</label>
      <div className={isPassword ? 'auth-input-wrap' : ''}>
        <input
          className={`auth-input${error ? ' error' : ''}`}
          type={isPassword && !show ? 'password' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isPassword ? 'current-password' : undefined}
        />
        {isPassword && (
          <span className="auth-eye" onClick={() => setShow(s => !s)}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </span>
        )}
      </div>
      {error && <div className="auth-error">{error}</div>}
    </div>
  );
}

function PasswordStrengthMeter({ password }) {
  const score = passwordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: '-.5rem', marginBottom: '.75rem' }}>
      <div className="auth-str-bar">
        <div className="auth-str-fill" style={{ width: `${(score / 5) * 100}%`, background: STR_COLORS[score - 1] || '#ef4444' }} />
      </div>
      <span className="auth-str-label" style={{ color: STR_COLORS[score - 1] || '#ef4444' }}>
        {score > 0 ? STR_LABELS[score - 1] : 'Too weak'} — min 13 chars, upper, lower, number, special
      </span>
    </div>
  );
}

function BiometricPanel({ onSuccess }) {
  const [results, setResults] = useState({});
  const tryBiometric = async (method) => {
    if (typeof PublicKeyCredential === 'undefined') {
      setResults(r => ({ ...r, [method]: 'unsupported' }));
      return;
    }
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      await navigator.credentials.get({
        publicKey: { challenge, allowCredentials: [], userVerification: 'required', timeout: 30000 }
      });
      setResults(r => ({ ...r, [method]: 'success' }));
      onSuccess && onSuccess(method);
    } catch (e) {
      setResults(r => ({ ...r, [method]: e.name === 'NotAllowedError' ? 'cancelled' : 'failed' }));
    }
  };

  const bioMethods = [
    { id: 'fingerprint', label: 'Fingerprint', icon: <Fingerprint size={20} /> },
    { id: 'faceid',      label: 'Face ID',     icon: <ScanFace size={20} /> },
    { id: 'touchid',     label: 'Touch ID',    icon: <Fingerprint size={20} style={{ transform: 'rotate(90deg)' }} /> },
  ];

  return (
    <div>
      <div className="auth-biometric-grid">
        {bioMethods.map(m => (
          <button key={m.id} className={`auth-bio-btn${results[m.id] === 'success' ? ' success' : ''}`} onClick={() => tryBiometric(m.id)}>
            {m.icon}
            <span>{results[m.id] === 'success' ? '✓ ' : ''}{m.label}</span>
            {results[m.id] === 'unsupported' && <span style={{ fontSize: '.6rem', color: '#ef4444' }}>Not supported</span>}
          </button>
        ))}
      </div>
      <div className="auth-bio-btn" style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', gap: '.5rem', opacity: .5 }}>
        <Eye size={16} /> Retinal Scan — Enterprise feature, contact admin
      </div>
    </div>
  );
}

export function AuthSystem({ onAuthSuccess }) {
  const [view, setView] = useState('login'); // login | register | mfa | setup
  const [role, setRole] = useState('user');
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '', mfaCode: '', smsCode: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('totp'); // totp | sms
  const styleInjected = React.useRef(false);

  if (!styleInjected.current) {
    const s = document.createElement('style');
    s.textContent = STYLE;
    document.head.appendChild(s);
    styleInjected.current = true;
  }

  const setField = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const validateRegister = () => {
    const errs = {};
    if (!USER_REGEX.test(form.username)) errs.username = 'Username must be 3-30 characters (letters, numbers, emoji, _ - . allowed)';
    if (!form.email.includes('@')) errs.email = 'Enter a valid email address';
    if (!PWD_REGEX.test(form.password)) errs.password = 'Password must be 13+ chars with upper, lower, number & special character';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const validateLogin = () => {
    const errs = {};
    if (!form.email && !form.username) errs.email = 'Email or username required';
    if (!form.password) errs.password = 'Password required';
    return errs;
  };

  const handleRegister = async () => {
    const errs = validateRegister();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, role })
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error || 'Registration failed' }); return; }
      setView('mfa');
    } catch (e) {
      setErrors({ submit: 'Network error — please try again' });
    } finally { setLoading(false); }
  };

  const handleLogin = async () => {
    const errs = validateLogin();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({}); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, username: form.username, password: form.password, role, trustDevice })
      });
      const data = await res.json();
      if (!res.ok) { setErrors({ submit: data.error || 'Login failed' }); return; }
      if (data.requiresMFA) { setView('mfa'); return; }
      onAuthSuccess && onAuthSuccess(data);
    } catch (e) {
      setErrors({ submit: 'Network error — please try again' });
    } finally { setLoading(false); }
  };

  const handleMFA = async () => {
    const code = mfaMethod === 'totp' ? form.mfaCode : form.smsCode;
    if (code.length < 6) { setErrors({ mfa: 'Enter the 6-digit code' }); return; }
    setErrors({}); setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // simulate verify
    setLoading(false);
    onAuthSuccess && onAuthSuccess({ role, mfaVerified: true });
  };

  const currentRole = ROLES.find(r => r.id === role);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🛡️</div>
        <div className="auth-title">Nexus AI Pro</div>
        <div className="auth-sub">
          {view === 'login' ? 'Sign in to your account' : view === 'register' ? 'Create your account' : view === 'mfa' ? 'Two-Factor Authentication' : 'MFA Setup'}
        </div>

        {/* Role selector */}
        {(view === 'login' || view === 'register') && (
          <div className="auth-role-tabs">
            {ROLES.map(r => (
              <button key={r.id} className={`auth-role-tab${role === r.id ? ' active' : ''}`} onClick={() => setRole(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* LOGIN */}
        {view === 'login' && (
          <>
            <Field label="Email or Username" value={form.email} onChange={setField('email')} error={errors.email} placeholder="you@example.com" />
            <Field label="Password" type="password" value={form.password} onChange={setField('password')} error={errors.password} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: '#94a3b8', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={trustDevice} onChange={e => setTrustDevice(e.target.checked)} />
              Trust this device for 30 days
            </label>
            {errors.submit && <div className="auth-error" style={{ textAlign: 'center', marginBottom: '.5rem' }}>{errors.submit}</div>}
            <button className="auth-btn auth-btn-primary" onClick={handleLogin} disabled={loading}>
              {loading ? '⏳ Signing in…' : `Sign in as ${currentRole?.label}`}
            </button>
            <div className="auth-divider">or use biometrics</div>
            <BiometricPanel onSuccess={(method) => onAuthSuccess && onAuthSuccess({ role, biometric: method })} />
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.8rem', color: '#64748b' }}>
              No account? <button className="auth-link" onClick={() => setView('register')}>Register</button>
            </div>
            <div className="auth-route-hint">{currentRole?.hint}</div>
          </>
        )}

        {/* REGISTER */}
        {view === 'register' && (
          <>
            <Field label="Username (emoji & special chars OK)" value={form.username} onChange={setField('username')} error={errors.username} placeholder="nexus_user 🚀" />
            <Field label="Email" value={form.email} onChange={setField('email')} error={errors.email} placeholder="you@example.com" />
            <Field label="Password (min 13 chars)" type="password" value={form.password} onChange={setField('password')} error={errors.password} />
            <PasswordStrengthMeter password={form.password} />
            <Field label="Confirm Password" type="password" value={form.confirm} onChange={setField('confirm')} error={errors.confirm} />
            {errors.submit && <div className="auth-error" style={{ textAlign: 'center', marginBottom: '.5rem' }}>{errors.submit}</div>}
            <button className="auth-btn auth-btn-primary" onClick={handleRegister} disabled={loading || !PWD_REGEX.test(form.password)}>
              {loading ? '⏳ Creating account…' : 'Create Account'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '.8rem', color: '#64748b' }}>
              Have an account? <button className="auth-link" onClick={() => setView('login')}>Sign in</button>
            </div>
          </>
        )}

        {/* MFA */}
        {view === 'mfa' && (
          <>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem' }}>
              {['totp', 'sms'].map(m => (
                <button key={m} className={`auth-role-tab${mfaMethod === m ? ' active' : ''}`} onClick={() => setMfaMethod(m)} style={{ flex: 1, padding: '.4rem', border: '1px solid #334155', borderRadius: '.4rem', cursor: 'pointer', background: mfaMethod === m ? '#3b82f6' : '#0f172a', color: mfaMethod === m ? '#fff' : '#94a3b8', fontSize: '.8rem' }}>
                  {m === 'totp' ? '🔑 Authenticator App' : '📱 SMS Code'}
                </button>
              ))}
            </div>
            {mfaMethod === 'totp'
              ? <Field label="6-digit code from your authenticator app" value={form.mfaCode} onChange={setField('mfaCode')} error={errors.mfa} placeholder="123456" />
              : <Field label="Code sent to your phone" value={form.smsCode} onChange={setField('smsCode')} error={errors.mfa} placeholder="123456" />}
            <label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.8rem', color: '#94a3b8', marginBottom: '1rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={trustDevice} onChange={e => setTrustDevice(e.target.checked)} />
              Trust this device for 30 days
            </label>
            <button className="auth-btn auth-btn-primary" onClick={handleMFA} disabled={loading}>{loading ? '⏳ Verifying…' : 'Verify'}</button>
            <div style={{ textAlign: 'center', marginTop: '.75rem' }}>
              <button className="auth-link" onClick={() => setView('setup')}>Set up MFA / View backup codes</button>
            </div>
          </>
        )}

        {/* MFA SETUP */}
        {view === 'setup' && (
          <>
            <div className="auth-card" style={{ background: '#0f172a', margin: '0 0 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '.75rem', color: '#94a3b8', marginBottom: '.5rem' }}>Scan this QR code with your authenticator app</div>
              <div style={{ width: 120, height: 120, background: '#334155', margin: '0 auto', borderRadius: '.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '.75rem' }}>QR Placeholder</div>
              <div style={{ fontSize: '.7rem', color: '#64748b', marginTop: '.5rem' }}>Key: XXXX-XXXX-XXXX-XXXX (shown securely)</div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '.8rem', color: '#94a3b8', marginBottom: '.4rem' }}>Backup Codes (store these safely)</div>
            <div className="auth-mfa-grid">
              {BACKUP_CODES.slice(0, 10).map(c => <div key={c} className="auth-backup-code">{c}</div>)}
            </div>
            <button className="auth-btn auth-btn-primary" style={{ marginTop: '.75rem' }} onClick={() => setView('mfa')}>← Back to Verify</button>
          </>
        )}
      </div>
    </div>
  );
}

export default AuthSystem;
