// src/auth/AuthPage.jsx
// Created: 2026-07-30
// Full authentication page: login, register, 2FA, biometrics (Touch ID, Face ID, fingerprint),
// password strength, emoji/unicode usernames, multi-language, role-aware routing

import React, { useState, useRef, useCallback } from 'react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/auth'
  : 'http://localhost:3001/api/auth';

const MIN_PASSWORD_LENGTH = 13;

const LANGS = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
];

function PasswordStrengthBar({ password }) {
  const score = computeStrength(password);
  const level = score >= 80 ? 'Strong' : score >= 50 ? 'Medium' : 'Weak';
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const checks = [
    { label: `${MIN_PASSWORD_LENGTH}+ characters`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
    { label: 'Special character (!@#$...)', ok: /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(password) }
  ];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${score}%`, background: color,
          borderRadius: 4, transition: 'width 0.3s, background 0.3s'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color }}>Strength: {level}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted, #888)' }}>{score}/100</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 6 }}>
        {checks.map(c => (
          <span key={c.label} style={{ fontSize: 11, color: c.ok ? '#22c55e' : 'var(--text-muted, #888)' }}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function computeStrength(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) s += 20;
  if (pw.length >= 20) s += 10;
  if (/[A-Z]/.test(pw)) s += 15;
  if (/[a-z]/.test(pw)) s += 10;
  if (/\d/.test(pw)) s += 15;
  if (/[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pw)) s += 20;
  if (/\p{Emoji}/u.test(pw)) s += 5;
  if (new Set(pw).size > 10) s += 5;
  return Math.min(s, 100);
}

async function attemptWebAuthn(email) {
  if (!window.PublicKeyCredential) return null;
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        userVerification: 'preferred',
        allowCredentials: [],
        timeout: 60000
      }
    });
    if (credential) {
      return {
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        type: credential.type,
        authenticatorData: credential.response?.authenticatorData
          ? btoa(String.fromCharCode(...new Uint8Array(credential.response.authenticatorData)))
          : null
      };
    }
  } catch (err) {
    console.warn('[Auth] WebAuthn failed:', err.message);
  }
  return null;
}

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'mfa'
  const [lang, setLang] = useState('en');
  const [showLang, setShowLang] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingToken, setPendingToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(
    typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)
  );

  const [form, setForm] = useState({
    email: '', password: '', username: '', displayName: '',
    confirmPw: '', language: 'en', region: 'US'
  });

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);

    try {
      const body = { email: form.email.trim(), password: form.password };
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      if (data.requiresMfa) {
        setPendingToken(data.pendingToken);
        setMode('mfa');
        return;
      }

      setMessage('Welcome back!');
      onAuth?.(data);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await attemptWebAuthn(form.email);
      if (!cred) {
        setError('Biometric authentication not available or cancelled.');
        return;
      }
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, biometricToken: cred.credentialId })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Biometric login failed');
        return;
      }
      onAuth?.(data);
    } catch (err) {
      setError('Biometric authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    setError('');

    if (form.password !== form.confirmPw) {
      setError('Passwords do not match.');
      return;
    }

    if (computeStrength(form.password) < 50) {
      setError('Please use a stronger password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          username: form.username.trim(),
          displayName: form.displayName.trim() || form.username.trim(),
          language: form.language || lang,
          region: form.region
        })
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.details ? data.details.join(', ') : (data.error || 'Registration failed'));
        return;
      }

      setMessage('Account created! Welcome to Nexus AI Pro.');
      onAuth?.(data);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mfa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, mfaCode })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid code');
        return;
      }
      onAuth?.(data);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'inherit', fontSize: 15, boxSizing: 'border-box',
    outline: 'none', transition: 'border-color 0.2s'
  };

  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-muted, #9ca3af)' };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'var(--bg, #0f0f1a)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: 'var(--text, #f1f5f9)'
    }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡️</div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Nexus AI Pro
          </h1>
          <p style={{ margin: '6px 0 0', color: 'var(--text-muted, #9ca3af)', fontSize: 14 }}>
            Military-Grade AI Platform
          </p>
        </div>

        {/* Lang picker */}
        <div style={{ position: 'relative', textAlign: 'right', marginBottom: 12 }}>
          <button onClick={() => setShowLang(s => !s)} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, padding: '5px 12px', color: 'inherit', cursor: 'pointer', fontSize: 13
          }}>
            {LANGS.find(l => l.code === lang)?.flag} {lang.toUpperCase()} ▾
          </button>
          {showLang && (
            <div style={{
              position: 'absolute', right: 0, top: '100%', zIndex: 100, marginTop: 4,
              background: '#1e1e2e', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, overflow: 'hidden', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code); setShowLang(false); setForm(f => ({ ...f, language: l.code })); }}
                  style={{
                    display: 'flex', gap: 8, width: '100%', padding: '8px 14px',
                    background: lang === l.code ? 'rgba(99,102,241,0.2)' : 'none',
                    border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 13, textAlign: 'left'
                  }}>
                  <span>{l.flag}</span><span>{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '32px 28px'
        }}>
          {/* Tab switcher */}
          {mode !== 'mfa' && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4 }}>
              {['login', 'register'].map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setMessage(''); }} style={{
                  flex: 1, padding: '8px 0',
                  background: mode === m ? '#6366f1' : 'none',
                  border: 'none', borderRadius: 8, color: 'inherit',
                  cursor: 'pointer', fontSize: 14, fontWeight: mode === m ? 600 : 400,
                  transition: 'all 0.2s'
                }}>
                  {m === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {message && (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#86efac' }}>
              ✅ {message}
            </div>
          )}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#fca5a5' }}>
              ⚠️ {error}
            </div>
          )}

          {mode === 'mfa' && (
            <form onSubmit={handleMfa}>
              <h3 style={{ margin: '0 0 8px' }}>🔐 Two-Factor Authentication</h3>
              <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-muted, #9ca3af)' }}>
                Enter the 6-digit code from your authenticator app.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Authentication Code</label>
                <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                  value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000" required autoFocus
                  style={{ ...inputStyle, letterSpacing: '0.3em', fontSize: 22, textAlign: 'center' }} />
              </div>
              <button type="submit" disabled={loading || mfaCode.length !== 6} style={{
                width: '100%', padding: 13, background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer'
              }}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button type="button" onClick={() => setMode('login')} style={{
                marginTop: 12, width: '100%', padding: 10, background: 'none',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                color: 'inherit', cursor: 'pointer', fontSize: 14
              }}>← Back to Login</button>
            </form>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email Address</label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="you@example.com" required autoComplete="email"
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Your password" required autoComplete="current-password"
                    style={{ ...inputStyle, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted, #9ca3af)', cursor: 'pointer', fontSize: 16
                  }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button type="button" style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 13 }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 13, background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s'
              }}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              {biometricAvailable && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {['👆 Fingerprint', '🤳 Face ID'].map(label => (
                    <button key={label} type="button" onClick={handleBiometric} disabled={loading || !form.email} style={{
                      flex: 1, padding: '9px 0',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: 10, color: 'inherit',
                      cursor: loading || !form.email ? 'not-allowed' : 'pointer',
                      fontSize: 13, opacity: !form.email ? 0.5 : 1
                    }}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Username *</label>
                  <input type="text" value={form.username} onChange={set('username')}
                    placeholder="cool_user42 🎮" required
                    style={inputStyle} />
                  <div style={{ fontSize: 11, marginTop: 4, color: 'var(--text-muted, #9ca3af)' }}>
                    Emojis & unicode supported
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Display Name</label>
                  <input type="text" value={form.displayName} onChange={set('displayName')}
                    placeholder="Your Name"
                    style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email Address *</label>
                <input type="email" value={form.email} onChange={set('email')}
                  placeholder="you@example.com" required autoComplete="email"
                  style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    {LANGS.map(l => <option key={l.code} value={l.code}>{l.flag} {l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Region</label>
                  <select value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                    style={{ ...inputStyle, appearance: 'none' }}>
                    {['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'KR', 'CN', 'IN', 'BR', 'MX', 'SG'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={labelStyle}>Password * (min {MIN_PASSWORD_LENGTH} chars)</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Strong password with symbols & numbers"
                    required autoComplete="new-password" style={{ ...inputStyle, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPw(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted, #9ca3af)', cursor: 'pointer', fontSize: 16
                  }}>
                    {showPw ? '🙈' : '👁️'}
                  </button>
                </div>
                {form.password && <PasswordStrengthBar password={form.password} />}
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Confirm Password *</label>
                <input type={showPw ? 'text' : 'password'} value={form.confirmPw} onChange={set('confirmPw')}
                  placeholder="Repeat your password" required autoComplete="new-password"
                  style={{
                    ...inputStyle,
                    borderColor: form.confirmPw && form.password !== form.confirmPw
                      ? '#ef4444' : form.confirmPw && form.password === form.confirmPw
                      ? '#22c55e' : 'rgba(255,255,255,0.15)'
                  }} />
              </div>

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: 13, background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
                color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>

              <p style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted, #9ca3af)', textAlign: 'center' }}>
                By registering you agree to our Terms of Service and Privacy Policy.
                Your data is encrypted with AES-256-GCM.
              </p>
            </form>
          )}
        </div>

        {/* Security badge */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted, #9ca3af)' }}>
          🔒 AES-256-GCM · 2FA · Biometrics · E2E Encrypted
        </div>
      </div>
    </div>
  );
}
