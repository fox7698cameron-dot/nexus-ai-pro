// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// src/components/AuthSystem.jsx — 2026-07-16

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const MIN_PASSWORD_LENGTH = 13;

const ROLES = {
  admin: { label: 'Admin', color: '#ef4444', icon: '👑' },
  developer: { label: 'Developer', color: '#8b5cf6', icon: '⚙️' },
  moderator: { label: 'Moderator', color: '#f59e0b', icon: '🛡️' },
  user: { label: 'User', color: '#3b82f6', icon: '👤' },
};

const MFA_METHODS = [
  { id: 'totp', label: 'Authenticator App (TOTP)', icon: '📱' },
  { id: 'sms', label: 'SMS Code', icon: '💬' },
  { id: 'email', label: 'Email Code', icon: '📧' },
  { id: 'biometric', label: 'Biometric', icon: '🔐' },
];

function PasswordStrengthBar({ password }) {
  const checks = [
    password.length >= MIN_PASSWORD_LENGTH,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {checks.map((ok, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? colors[score - 1] : '#374151',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {password.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors[score - 1] || '#6b7280' }}>
          <span>{labels[score - 1] || 'Too Weak'}</span>
          <span>{score}/5 criteria met</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>
        {MIN_PASSWORD_LENGTH}+ chars • uppercase • lowercase • number • special character
      </div>
    </div>
  );
}

function BiometricButton({ onSuccess, onError }) {
  const [status, setStatus] = useState('idle');

  const handleBiometric = useCallback(async () => {
    setStatus('checking');
    try {
      if (window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          setStatus('success');
          onSuccess?.('biometric');
          return;
        }
      }
      if (window.electron?.biometric) {
        const result = await window.electron.biometric.authenticate();
        if (result.success) {
          setStatus('success');
          onSuccess?.('biometric');
          return;
        }
      }
      setStatus('unavailable');
      onError?.('Biometric authentication not available on this device');
    } catch (err) {
      setStatus('error');
      onError?.(err.message);
    }
  }, [onSuccess, onError]);

  const icons = { idle: '🔐', checking: '⏳', success: '✅', error: '❌', unavailable: '⚠️' };
  const labels = {
    idle: 'Use Biometrics',
    checking: 'Verifying...',
    success: 'Verified!',
    error: 'Failed',
    unavailable: 'Not Available',
  };

  return (
    <button
      onClick={handleBiometric}
      disabled={status === 'checking'}
      style={{
        width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #374151',
        background: status === 'success' ? '#065f46' : '#1f2937',
        color: '#fff', cursor: status === 'checking' ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontSize: 14, transition: 'all 0.2s',
      }}
    >
      <span>{icons[status]}</span>
      <span>{labels[status]}</span>
    </button>
  );
}

function MFASetup({ secret, qrCode, onVerify }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Enter 6-digit code'); return; }
    try {
      const res = await fetch('/api/auth/mfa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nexus:token')}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      onVerify?.(data);
    } catch {
      setError('Network error');
    }
  };

  return (
    <div style={{ color: '#fff' }}>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>
        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
      </p>
      {qrCode && (
        <div style={{ background: '#fff', padding: 12, borderRadius: 8, display: 'inline-block', marginBottom: 12 }}>
          <img src={qrCode} alt="TOTP QR Code" style={{ width: 160, height: 160 }} />
        </div>
      )}
      <div style={{ background: '#1f2937', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontFamily: 'monospace', fontSize: 13, color: '#60a5fa', letterSpacing: 2 }}>
        {secret}
      </div>
      <input
        value={code}
        onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        placeholder="Enter 6-digit code"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #374151', background: '#111827', color: '#fff', fontSize: 18, letterSpacing: 4, textAlign: 'center', boxSizing: 'border-box' }}
      />
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{error}</div>}
      <button onClick={handleVerify} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
        Verify & Enable 2FA
      </button>
    </div>
  );
}

export function AuthSystem({ onAuthSuccess }) {
  const { t } = useTranslation();
  const [view, setView] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', role: 'user', confirmPassword: '' });
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [selectedMfa, setSelectedMfa] = useState('totp');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }

      if (data.requiresMfa) {
        setStep('mfa');
        setLoading(false);
        localStorage.setItem('nexus:mfa_session', data.mfaSession);
        return;
      }

      localStorage.setItem('nexus:token', data.accessToken);
      localStorage.setItem('nexus:refresh_token', data.refreshToken);
      localStorage.setItem('nexus:user', JSON.stringify(data.user));
      onAuthSuccess?.(data.user, data.accessToken);
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleMfaSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const mfaSession = localStorage.getItem('nexus:mfa_session');
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mfaSession, code: mfaCode, method: selectedMfa }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid MFA code'); setLoading(false); return; }
      localStorage.setItem('nexus:token', data.accessToken);
      localStorage.setItem('nexus:refresh_token', data.refreshToken);
      localStorage.setItem('nexus:user', JSON.stringify(data.user));
      onAuthSuccess?.(data.user, data.accessToken);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < MIN_PASSWORD_LENGTH) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, username: form.username, role: form.role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }
      localStorage.setItem('nexus:token', data.accessToken);
      localStorage.setItem('nexus:refresh_token', data.refreshToken);
      localStorage.setItem('nexus:user', JSON.stringify(data.user));

      if (data.mfaSetup) {
        setMfaSetup(data.mfaSetup);
        setStep('mfa_setup');
        setLoading(false);
        return;
      }
      onAuthSuccess?.(data.user, data.accessToken);
    } catch {
      setError('Network error');
    }
    setLoading(false);
  };

  const handleBiometricSuccess = () => {
    const token = localStorage.getItem('nexus:token');
    const user = JSON.parse(localStorage.getItem('nexus:user') || '{}');
    if (token && user.id) onAuthSuccess?.(user, token);
    else setError('No saved session. Please log in with credentials first.');
  };

  const inp = (key, type = 'text', placeholder = '') => ({
    type,
    value: form[key],
    onChange: e => { setField(key, e.target.value); setError(''); },
    placeholder: placeholder || key,
    style: {
      width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
      border: '1px solid #374151', background: '#111827', color: '#fff', fontSize: 14,
    },
    autoComplete: type === 'password' ? 'current-password' : 'off',
  });

  const s = {
    wrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c', padding: 16 },
    card: { width: '100%', maxWidth: 420, background: '#111827', borderRadius: 16, padding: 32, border: '1px solid #1f2937', boxSizing: 'border-box' },
    title: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, textAlign: 'center' },
    sub: { fontSize: 13, color: '#6b7280', marginBottom: 24, textAlign: 'center' },
    label: { display: 'block', fontSize: 12, color: '#9ca3af', marginBottom: 4, fontWeight: 500 },
    field: { marginBottom: 16 },
    btn: { width: '100%', padding: '11px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
    link: { color: '#60a5fa', cursor: 'pointer', background: 'none', border: 'none', fontSize: 13, textDecoration: 'underline' },
    err: { background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#fca5a5', fontSize: 13, marginBottom: 12 },
    divider: { textAlign: 'center', color: '#4b5563', fontSize: 12, margin: '16px 0', position: 'relative' },
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 12, background: 'linear-gradient(135deg,#667eea,#764ba2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 12 }}>✨</div>
          <div style={s.title}>Nexus AI Pro</div>
          <div style={s.sub}>
            {view === 'login' ? (step === 'mfa' ? 'Enter your MFA code' : t('signIn')) : (step === 'mfa_setup' ? 'Set up Two-Factor Authentication' : t('signUp'))}
          </div>
        </div>

        {error && <div style={s.err}>{error}</div>}

        {view === 'login' && step === 'credentials' && (
          <>
            <div style={s.field}>
              <label style={s.label}>{t('email')}</label>
              <input {...inp('email', 'email', 'you@example.com')} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('password')}</label>
              <input {...inp('password', 'password', '••••••••••••••')} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin} disabled={loading} style={s.btn}>
              {loading ? t('loading') : t('signIn')}
            </button>
            <div style={s.divider}>— or —</div>
            <BiometricButton onSuccess={handleBiometricSuccess} onError={setError} />
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
              No account? <button style={s.link} onClick={() => { setView('register'); setError(''); setStep('credentials'); }}>Create one</button>
            </div>
          </>
        )}

        {view === 'login' && step === 'mfa' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {MFA_METHODS.map(m => (
                <button key={m.id} onClick={() => setSelectedMfa(m.id)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: selectedMfa === m.id ? '1px solid #3b82f6' : '1px solid #374151',
                  background: selectedMfa === m.id ? '#1e3a5f' : '#1f2937', color: '#fff', cursor: 'pointer', fontSize: 11, textAlign: 'center',
                }}>
                  <div>{m.icon}</div>
                  <div style={{ marginTop: 2 }}>{m.id.toUpperCase()}</div>
                </button>
              ))}
            </div>
            <input
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              style={{ ...inp('email').style, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
              onKeyDown={e => e.key === 'Enter' && handleMfaSubmit()}
            />
            <button onClick={handleMfaSubmit} disabled={loading} style={{ ...s.btn, marginTop: 12 }}>
              {loading ? t('loading') : 'Verify'}
            </button>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button style={s.link} onClick={() => setStep('credentials')}>← Back to login</button>
            </div>
          </>
        )}

        {view === 'register' && step === 'credentials' && (
          <>
            <div style={s.field}>
              <label style={s.label}>{t('username')} (supports emojis & special chars)</label>
              <input {...inp('username', 'text', 'Your display name 🚀')} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('email')}</label>
              <input {...inp('email', 'email', 'you@example.com')} />
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('role')}</label>
              <select value={form.role} onChange={e => setField('role', e.target.value)} style={{ ...inp('email').style }}>
                {Object.entries(ROLES).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>{t('password')} (min {MIN_PASSWORD_LENGTH} characters)</label>
              <input {...inp('password', 'password', '•••••••••••••')} />
              <PasswordStrengthBar password={form.password} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <input {...inp('confirmPassword', 'password', '•••••••••••••')} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
            </div>
            <button onClick={handleRegister} disabled={loading} style={s.btn}>
              {loading ? t('loading') : t('signUp')}
            </button>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
              Already have an account? <button style={s.link} onClick={() => { setView('login'); setError(''); setStep('credentials'); }}>Sign in</button>
            </div>
          </>
        )}

        {step === 'mfa_setup' && mfaSetup && (
          <MFASetup secret={mfaSetup.secret} qrCode={mfaSetup.qrCode} onVerify={data => {
            onAuthSuccess?.(data.user || JSON.parse(localStorage.getItem('nexus:user') || '{}'), data.accessToken || localStorage.getItem('nexus:token'));
          }} />
        )}
      </div>
    </div>
  );
}

export default AuthSystem;
