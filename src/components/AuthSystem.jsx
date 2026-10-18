// src/components/AuthSystem.jsx
// Created: 2026-10-18
// Unified auth UI: login, register, MFA, biometrics, password strength

import React, { useState, useCallback } from 'react';

const PASSWORD_MIN = 13;

function strengthScore(pwd) {
  let score = 0;
  if (pwd.length >= PASSWORD_MIN) score++;
  if (pwd.length >= 20) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd)) score++;
  if (/\p{Emoji}/u.test(pwd)) score++;
  return Math.min(5, score - 1);
}

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#6366f1'];

function PasswordStrengthBar({ password }) {
  if (!password) return null;
  const score = strengthScore(password);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= score ? STRENGTH_COLORS[score] : '#334155', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color: STRENGTH_COLORS[score] }}>{STRENGTH_LABELS[score]}</div>
    </div>
  );
}

function FormField({ label, name, type = 'text', value, onChange, error, placeholder, autoComplete }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={styles.label}>{label}</label>
      <input
        style={{ ...styles.input, ...(error ? { borderColor: '#ef4444' } : {}) }}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      {error && <div style={styles.fieldError}>{error}</div>}
    </div>
  );
}

function BiometricButton({ onAuth }) {
  const [status, setStatus] = useState('idle');

  const trigger = async () => {
    if (!window.PublicKeyCredential) {
      alert('WebAuthn not supported in this browser');
      return;
    }
    setStatus('pending');
    try {
      // Request a credential — in production send challenge from server
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
        },
      });
      onAuth({ type: 'webauthn', credentialId: credential?.id });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      console.error('[Biometric]', err.message);
    }
  };

  return (
    <button type="button" style={{ ...styles.biometricBtn, ...(status === 'error' ? { borderColor: '#ef4444' } : {}) }} onClick={trigger}>
      {status === 'pending' ? '⏳ Verifying…' : status === 'success' ? '✅ Verified' : '👆 Use Biometrics (Face ID / Touch ID / Fingerprint)'}
    </button>
  );
}

function MFAStep({ pendingToken, onComplete, onCancel }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, mfaCode: code }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      onComplete(data);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>🔐 Two-Factor Authentication</h2>
      <p style={styles.subText}>Enter the 6-digit code from your authenticator app.</p>
      <form onSubmit={submit}>
        <input
          style={{ ...styles.input, textAlign: 'center', fontSize: 28, letterSpacing: 12 }}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoFocus
        />
        {error && <div style={styles.errorBox}>{error}</div>}
        <button style={styles.primaryBtn} type="submit" disabled={loading || code.length !== 6}>
          {loading ? 'Verifying…' : 'Verify'}
        </button>
        <button type="button" style={styles.linkBtn} onClick={onCancel}>Back to login</button>
      </form>
    </div>
  );
}

export default function AuthSystem({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'mfa'
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', username: '' });
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingToken, setPendingToken] = useState(null);

  const updateField = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setErrors(p => ({ ...p, [name]: '' }));
  };

  const validateRegister = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Required';
    if (!form.email.trim()) errs.email = 'Required';
    if (!form.password) errs.password = 'Required';
    if (form.password.length < PASSWORD_MIN) errs.password = `Min ${PASSWORD_MIN} characters`;
    if (!/[A-Z]/.test(form.password)) errs.password = 'Needs uppercase';
    if (!/[a-z]/.test(form.password)) errs.password = 'Needs lowercase';
    if (!/\d/.test(form.password)) errs.password = 'Needs a digit';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(form.password)) errs.password = 'Needs special character';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    return errs;
  };

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setGlobalError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (res.status === 202 && data.mfaRequired) {
        setPendingToken(data.pendingToken);
        setMode('mfa');
        return;
      }
      if (!res.ok) { setGlobalError(data.error || 'Login failed'); return; }
      onAuthenticated(data);
    } catch {
      setGlobalError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form.email, form.password, onAuthenticated]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    const errs = validateRegister();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setGlobalError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, username: form.username }),
      });
      const data = await res.json();
      if (!res.ok) { setGlobalError(data.error || 'Registration failed'); return; }
      onAuthenticated(data);
    } catch {
      setGlobalError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [form, onAuthenticated]);

  const handleBiometricAuth = (credential) => {
    // In production: send credential to server for verification
    console.log('[AuthSystem] Biometric credential:', credential);
  };

  if (mode === 'mfa') {
    return (
      <div style={styles.page}>
        <MFAStep pendingToken={pendingToken} onComplete={onAuthenticated} onCancel={() => setMode('login')} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>⚡ Nexus AI Pro</div>
        <h2 style={styles.heading}>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>

        {globalError && <div style={styles.errorBox}>{globalError}</div>}

        <form onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          {mode === 'register' && (
            <FormField
              label="Username"
              name="username"
              value={form.username}
              onChange={updateField}
              error={errors.username}
              placeholder="YourUsername123 or 🎮GamerTag"
              autoComplete="username"
            />
          )}
          <FormField
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            error={errors.email}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <div style={{ marginBottom: 16 }}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...styles.input, ...(errors.password ? { borderColor: '#ef4444' } : {}), paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={updateField}
                placeholder={mode === 'register' ? 'Min 13 chars, uppercase, digit, special' : 'Your password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" style={styles.eyeBtn} onClick={() => setShowPassword(p => !p)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && <div style={styles.fieldError}>{errors.password}</div>}
            {mode === 'register' && <PasswordStrengthBar password={form.password} />}
          </div>
          {mode === 'register' && (
            <FormField
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={updateField}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          )}

          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? '⏳ Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={styles.divider}><span>or</span></div>

        <BiometricButton onAuth={handleBiometricAuth} />

        <div style={styles.switchRow}>
          {mode === 'login' ? (
            <>Don't have an account? <button style={styles.linkBtn} onClick={() => setMode('register')}>Sign Up</button></>
          ) : (
            <>Already have an account? <button style={styles.linkBtn} onClick={() => setMode('login')}>Sign In</button></>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'system-ui, sans-serif' },
  card: { background: '#1e293b', borderRadius: 16, padding: 40, width: '100%', maxWidth: 440, border: '1px solid #334155', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' },
  logo: { textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#f8fafc', marginBottom: 8 },
  heading: { textAlign: 'center', fontSize: 24, fontWeight: 700, color: '#f8fafc', margin: '0 0 24px' },
  subText: { color: '#94a3b8', fontSize: 14, marginBottom: 20 },
  label: { display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 6, fontWeight: 500 },
  input: { width: '100%', background: '#0f172a', color: '#f1f5f9', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px', fontSize: 15, boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' },
  eyeBtn: { position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 },
  fieldError: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  errorBox: { background: '#ef444420', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 14, marginBottom: 16 },
  primaryBtn: { width: '100%', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', cursor: 'pointer', fontWeight: 700, fontSize: 16, marginTop: 4 },
  biometricBtn: { width: '100%', background: 'transparent', color: '#94a3b8', border: '1px dashed #334155', borderRadius: 8, padding: '12px', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  divider: { textAlign: 'center', color: '#475569', fontSize: 13, margin: '16px 0', position: 'relative' },
  switchRow: { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#94a3b8' },
  linkBtn: { background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 'inherit', fontWeight: 600, padding: 0 },
};
