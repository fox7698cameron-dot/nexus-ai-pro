// src/auth/AuthPage.jsx
// Nexus AI Pro - Authentication Page
// Covers: login, register, 2FA TOTP, biometrics, password strength, i18n
// Responsive: desktop / mobile / tablet
// Date: 2026-08-01

import React, { useState, useCallback } from 'react';

const API = '/api/auth';

const LANGS = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'de', label: '🇩🇪 Deutsch' },
  { code: 'ja', label: '🇯🇵 日本語' },
  { code: 'zh', label: '🇨🇳 中文' },
  { code: 'ar', label: '🇸🇦 العربية' },
  { code: 'pt', label: '🇧🇷 Português' },
  { code: 'ko', label: '🇰🇷 한국어' },
  { code: 'hi', label: '🇮🇳 हिन्दी' }
];

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#334155' };
  let score = 0;
  if (pw.length >= 13) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[!@#$%^&*()\-_=+\[\]{}|;':",.<>?/`~\\]/.test(pw)) score++;
  const labels = ['', 'Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#334155', '#ef4444', '#f97316', '#eab308', '#22c55e', '#4ade80'];
  return { score, label: labels[score], color: colors[score] };
}

function StrengthBar({ password }) {
  const { score, label, color } = passwordStrength(password);
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? color : '#1e293b',
            transition: 'background 0.2s'
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color }}>{label}</span>
    </div>
  );
}

function FieldInput({ label, type = 'text', value, onChange, placeholder, hint, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPass = type === 'password';
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 4 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={isPass ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%', background: '#0f172a', border: '1px solid #1e293b',
            borderRadius: 8, padding: isPass ? '10px 40px 10px 12px' : '10px 12px',
            color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box'
          }}
        />
        {isPass && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16
            }}
          >
            {show ? '🙈' : '👁️'}
          </button>
        )}
      </div>
      {hint && <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 11 }}>{hint}</p>}
    </div>
  );
}

export default function AuthPage({ onLogin, lang = 'en' }) {
  const [mode, setMode] = useState('login'); // login | register | mfa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [selectedLang, setSelectedLang] = useState(lang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleLogin = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept-Language': selectedLang },
        body: JSON.stringify({ email, password, totpToken: totpToken || undefined })
      });
      const data = await res.json();
      if (res.status === 202 && data.error === 'MFA_REQUIRED') {
        setMode('mfa');
        setInfo('Enter your authenticator code');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Login failed');
      onLogin?.(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, totpToken, selectedLang, onLogin]);

  const handleRegister = useCallback(async () => {
    setLoading(true); setError('');
    const { score } = passwordStrength(password);
    if (score < 4) {
      setError('Please choose a stronger password (min 13 chars, upper, lower, digit, special)');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, language: selectedLang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setInfo('Account created! Please log in.');
      setMode('login');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [username, email, password, selectedLang]);

  const handleBiometric = useCallback(async () => {
    setError('');
    // Request challenge — full WebAuthn would continue from here
    // On Electron/iOS/Android, native biometric is triggered via Capacitor bridge
    if (window.electron?.biometric?.authenticate) {
      try {
        const result = await window.electron.biometric.authenticate('Sign in to Nexus AI Pro');
        if (result.success) {
          setInfo('Biometric verified — please enter your email to complete sign-in');
        } else {
          setError('Biometric authentication failed');
        }
      } catch (e) {
        setError('Biometric not available on this device');
      }
    } else {
      setInfo('Biometric auth is available on the desktop / mobile app');
    }
  }, []);

  const containerStyle = {
    minHeight: '100vh', background: '#0a0a0f', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  };
  const cardStyle = {
    background: '#111827', borderRadius: 16, padding: '32px 28px',
    border: '1px solid #1e293b', width: '100%', maxWidth: 420,
    boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40 }}>🛡️</div>
          <h1 style={{ margin: '8px 0 4px', fontSize: 22, fontWeight: 800, color: '#fff' }}>Nexus AI Pro</h1>
          <p style={{ margin: 0, color: '#475569', fontSize: 13 }}>
            {mode === 'register' ? 'Create your account' : mode === 'mfa' ? 'Two-Factor Authentication' : 'Welcome back'}
          </p>
        </div>

        {/* Language selector */}
        <div style={{ marginBottom: 20 }}>
          <select
            value={selectedLang}
            onChange={e => setSelectedLang(e.target.value)}
            style={{
              width: '100%', background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 8, padding: '8px 12px', color: '#94a3b8', fontSize: 13, cursor: 'pointer'
            }}
          >
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>

        {/* Error / Info */}
        {error && (
          <div style={{ background: '#2d0d0d', border: '1px solid #ef4444', borderRadius: 8, padding: 10, marginBottom: 14, color: '#f87171', fontSize: 13 }}>
            {error}
          </div>
        )}
        {info && (
          <div style={{ background: '#0d2e1a', border: '1px solid #22c55e', borderRadius: 8, padding: 10, marginBottom: 14, color: '#4ade80', fontSize: 13 }}>
            {info}
          </div>
        )}

        {/* Form */}
        {mode === 'mfa' ? (
          <>
            <FieldInput label="Authenticator Code" value={totpToken} onChange={setTotpToken}
              placeholder="000000" autoComplete="one-time-code" />
            <button
              onClick={handleLogin} disabled={loading}
              style={btnStyle('#6366f1', loading)}
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>
            <button onClick={() => { setMode('login'); setTotpToken(''); }} style={linkBtnStyle}>
              ← Back to login
            </button>
          </>
        ) : (
          <>
            {mode === 'register' && (
              <FieldInput label="Username (emoji & special chars ok!)" value={username} onChange={setUsername}
                placeholder="e.g. ninja_dev_🔥 or チャンピオン" autoComplete="username" />
            )}
            <FieldInput label="Email Address" type="email" value={email} onChange={setEmail}
              placeholder="you@example.com" autoComplete="email" />
            <FieldInput
              label="Password" type="password" value={password} onChange={setPassword}
              placeholder={mode === 'register' ? 'Min 13 chars…' : '••••••••••••••'}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              hint={mode === 'register' ? 'Minimum 13 characters · Upper · Lower · Digit · Special' : ''}
            />
            {mode === 'register' && <StrengthBar password={password} />}

            <button
              onClick={mode === 'register' ? handleRegister : handleLogin}
              disabled={loading}
              style={{ ...btnStyle('#6366f1', loading), marginTop: 16 }}
            >
              {loading ? 'Please wait…' : mode === 'register' ? 'Create Account' : 'Sign In'}
            </button>

            {/* Biometric button */}
            <button onClick={handleBiometric} style={btnStyle('#0f172a', false, '1px solid #334155')}>
              🪄 Sign in with Biometrics
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, color: '#475569', fontSize: 13 }}>
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => { setMode('register'); setError(''); setInfo(''); }} style={linkBtnStyle}>
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} style={linkBtnStyle}>
                    Sign In
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Security badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
          {['🔒 AES-256-GCM', '🛡️ TLS', '🔑 JWT', '🆔 2FA'].map(b => (
            <span key={b} style={{
              background: '#0f172a', border: '1px solid #1e293b',
              borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#64748b'
            }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg, disabled, border) {
  return {
    width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 14,
    fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    background: disabled ? '#1e293b' : bg,
    color: disabled ? '#475569' : '#fff',
    border: border || 'none', marginTop: 8, transition: 'opacity 0.2s',
    opacity: disabled ? 0.6 : 1
  };
}

const linkBtnStyle = {
  background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer',
  fontSize: 13, textDecoration: 'underline', padding: 0
};
