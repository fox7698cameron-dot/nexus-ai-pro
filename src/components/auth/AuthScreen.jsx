// src/components/auth/AuthScreen.jsx
// Login / Register — biometrics, 2FA, password strength, emoji usernames, i18n
// Created: 2026-06-11 | Nexus AI Pro v3.0.0

import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock, Mail, User, Eye, EyeOff, Shield, Fingerprint,
  Smartphone, Key, Globe, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react';

const STRENGTH_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#3B82F6', '#10B981'];
const STRENGTH_LABELS = ['Too weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

function PasswordStrengthMeter({ password }) {
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    if (!password) { setStrength(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/password/check-strength', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });
        if (res.ok) setStrength(await res.json());
      } catch { /**/ }
    }, 400);
    return () => clearTimeout(timer);
  }, [password]);

  if (!strength || !password) return null;

  const color = STRENGTH_COLORS[strength.score] ?? STRENGTH_COLORS[0];
  const label = STRENGTH_LABELS[strength.score] ?? STRENGTH_LABELS[0];

  return (
    <div style={styles.strengthMeter}>
      <div style={styles.strengthBars}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...styles.strengthBar, background: i < strength.score ? color : '#334155' }} />
        ))}
      </div>
      <span style={{ color, fontSize: 12 }}>{label}</span>
      {strength.failed?.length > 0 && (
        <ul style={styles.strengthHints}>
          {strength.failed.map(f => <li key={f} style={styles.strengthHint}><XCircle size={10} color="#EF4444" /> {f}</li>)}
        </ul>
      )}
    </div>
  );
}

function BiometricButton({ onSuccess }) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
      (window.PublicKeyCredential !== undefined || window.Capacitor !== undefined)
    );
  }, []);

  if (!supported) return null;

  const triggerBiometric = async () => {
    // WebAuthn credential assertion
    try {
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (credential) onSuccess(credential);
    } catch (err) {
      if (err.name !== 'NotAllowedError') console.error('Biometric error:', err.name);
    }
  };

  return (
    <button type="button" style={styles.biometricBtn} onClick={triggerBiometric}>
      <Fingerprint size={20} />
      Sign in with Biometrics
    </button>
  );
}

function MFAStep({ onVerify, methods = ['totp'] }) {
  const [token, setToken] = useState('');
  const [method, setMethod] = useState(methods[0] ?? 'totp');
  const [error, setError] = useState('');

  return (
    <div style={styles.mfaContainer}>
      <div style={styles.mfaIcon}><Shield size={32} color="#6366F1" /></div>
      <h2 style={styles.mfaTitle}>Two-Factor Authentication</h2>
      <p style={styles.mfaDesc}>Enter the verification code from your authenticator app</p>

      {methods.length > 1 && (
        <div style={styles.methodTabs}>
          {methods.map(m => (
            <button key={m} style={{ ...styles.methodTab, ...(method === m ? styles.methodTabActive : {}) }} onClick={() => setMethod(m)}>
              {m === 'totp' ? 'App' : m === 'backup_code' ? 'Backup' : m === 'sms' ? 'SMS' : 'Email'}
            </button>
          ))}
        </div>
      )}

      <input
        style={styles.mfaInput}
        type="text"
        inputMode="numeric"
        maxLength={method === 'backup_code' ? 11 : 6}
        placeholder={method === 'backup_code' ? 'XXXX-XXXX-XXXX' : '000000'}
        value={token}
        onChange={e => { setToken(e.target.value); setError(''); }}
        autoComplete="one-time-code"
      />
      {error && <p style={styles.error}>{error}</p>}
      <button
        style={styles.btnPrimary}
        onClick={() => { if (token.trim()) onVerify(token.trim(), method); else setError('Code required'); }}
      >
        Verify
      </button>
    </div>
  );
}

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // login | register | mfa | forgot
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', locale: 'en' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaMethods, setMfaMethods] = useState([]);

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.mfaRequired) { setMfaMethods(data.mfaMethods ?? ['totp']); setMode('mfa'); return; }
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthSuccess(data.user);
      } else {
        setError(data.error ?? 'Login failed');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password, locale: form.locale }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthSuccess(data.user);
      } else {
        setError(data.error ?? (data.issues ? data.issues.map(i => i.message).join(', ') : 'Registration failed'));
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleMfa = async (token, method) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, mfaToken: token, mfaMethod: method }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        onAuthSuccess(data.user);
      } else {
        setError(data.error ?? 'MFA verification failed');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  if (mode === 'mfa') return <MFAStep onVerify={handleMfa} methods={mfaMethods} />;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logo}><Shield size={28} color="#6366F1" /></div>
          <span style={styles.logoText}>Nexus AI Pro</span>
        </div>

        {/* Mode tabs */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }} onClick={() => { setMode('login'); setError(''); }}>Sign In</button>
          <button style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }} onClick={() => { setMode('register'); setError(''); }}>Sign Up</button>
        </div>

        {error && <div style={styles.errorBanner}><AlertTriangle size={14} /> {error}</div>}

        {mode === 'register' && (
          <div style={styles.field}>
            <label style={styles.label}><User size={14} /> Username (supports emoji & special chars)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. ninja_dev 🎮 or Café_42"
              value={form.username}
              onChange={setField('username')}
              autoComplete="username"
            />
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}><Mail size={14} /> Email</label>
          <input style={styles.input} type="email" placeholder="you@example.com" value={form.email} onChange={setField('email')} autoComplete="email" />
        </div>

        <div style={styles.field}>
          <label style={styles.label}><Lock size={14} /> Password {mode === 'register' && <span style={{ color: '#64748B', fontSize: 11 }}>(13+ chars required)</span>}</label>
          <div style={styles.inputGroup}>
            <input style={styles.inputFlex} type={showPassword ? 'text' : 'password'} placeholder={mode === 'register' ? 'Min 13 chars + special chars' : 'Password'} value={form.password} onChange={setField('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(s => !s)}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {mode === 'register' && <PasswordStrengthMeter password={form.password} />}
        </div>

        {mode === 'register' && (
          <>
            <div style={styles.field}>
              <label style={styles.label}><Lock size={14} /> Confirm Password</label>
              <input style={styles.input} type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={setField('confirmPassword')} autoComplete="new-password" />
              {form.confirmPassword && form.password !== form.confirmPassword && (
                <p style={styles.fieldError}><XCircle size={12} /> Passwords do not match</p>
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.label}><Globe size={14} /> Language</label>
              <select style={styles.input} value={form.locale} onChange={setField('locale')}>
                {[['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['ja','日本語'],['zh','中文'],['ko','한국어'],['pt','Português'],['ar','العربية'],['hi','हिंदी']].map(([code,name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <button
          style={styles.btnPrimary}
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        <BiometricButton onSuccess={(cred) => console.info('WebAuthn credential:', cred.id)} />

        {mode === 'login' && (
          <button style={styles.forgotBtn} onClick={() => setMode('forgot')} type="button">
            Forgot password?
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0F0F23 0%, #1a1a3e 100%)', padding: 16 },
  card: { background: '#1E293B', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, border: '1px solid #334155', boxShadow: '0 24px 48px #00000066' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, justifyContent: 'center' },
  logo: { width: 44, height: 44, background: '#6366F120', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 20, fontWeight: 800, color: '#E2E8F0' },
  tabs: { display: 'flex', background: '#0F172A', borderRadius: 10, padding: 4, marginBottom: 20 },
  tab: { flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: 'transparent', color: '#64748B', cursor: 'pointer', fontWeight: 500, fontSize: 14 },
  tabActive: { background: '#1E293B', color: '#E2E8F0', fontWeight: 700, boxShadow: '0 1px 4px #00000044' },
  field: { marginBottom: 14 },
  label: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94A3B8', marginBottom: 6, fontWeight: 500 },
  input: { width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', fontSize: 14, boxSizing: 'border-box' },
  inputGroup: { display: 'flex', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' },
  inputFlex: { flex: 1, padding: '10px 12px', background: 'transparent', border: 'none', color: '#E2E8F0', fontSize: 14, outline: 'none' },
  eyeBtn: { padding: '0 12px', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' },
  btnPrimary: { width: '100%', padding: '12px 0', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8, marginBottom: 12 },
  biometricBtn: { width: '100%', padding: '10px 0', background: 'transparent', border: '1px dashed #334155', borderRadius: 10, color: '#94A3B8', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  forgotBtn: { width: '100%', background: 'none', border: 'none', color: '#6366F1', fontSize: 13, cursor: 'pointer', marginTop: 4, padding: 0 },
  errorBanner: { display: 'flex', alignItems: 'center', gap: 6, background: '#EF444420', border: '1px solid #EF4444', borderRadius: 8, padding: '8px 12px', color: '#EF4444', fontSize: 13, marginBottom: 16 },
  fieldError: { display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444', fontSize: 12, marginTop: 4 },
  strengthMeter: { marginTop: 8 },
  strengthBars: { display: 'flex', gap: 4, marginBottom: 4 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2, transition: 'background 0.3s' },
  strengthHints: { listStyle: 'none', padding: 0, margin: '6px 0 0' },
  strengthHint: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#EF4444', marginBottom: 2 },
  mfaContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, gap: 12 },
  mfaIcon: { width: 64, height: 64, background: '#6366F120', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  mfaTitle: { fontSize: 20, fontWeight: 700, margin: 0 },
  mfaDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', margin: 0 },
  methodTabs: { display: 'flex', gap: 8 },
  methodTab: { padding: '6px 16px', borderRadius: 20, border: '1px solid #334155', background: 'transparent', color: '#64748B', cursor: 'pointer', fontSize: 13 },
  methodTabActive: { background: '#1E293B', color: '#E2E8F0', borderColor: '#6366F1' },
  mfaInput: { width: 200, padding: '12px 0', background: '#0F172A', border: '1px solid #334155', borderRadius: 8, color: '#E2E8F0', fontSize: 24, textAlign: 'center', letterSpacing: 8 },
  error: { color: '#EF4444', fontSize: 13 },
};
