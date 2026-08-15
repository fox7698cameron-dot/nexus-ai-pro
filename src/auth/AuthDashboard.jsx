/**
 * src/auth/AuthDashboard.jsx
 * Unified auth UI — registration, login, role-specific dashboards,
 * biometric prompts, 2FA/MFA setup, and password-strength meter.
 * Date: 2026-08-15
 */

import React, { useState, useEffect, useCallback } from 'react';
import { passwordStrength, ROLES } from './authService.js';

// ─── Password strength meter ───────────────────────────────────────────────
const STRENGTH_LABELS = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

function PasswordMeter({ password }) {
  const score = passwordStrength(password);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= score ? STRENGTH_COLORS[score] : '#e5e7eb',
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      {password && (
        <span style={{ fontSize: 11, color: STRENGTH_COLORS[score] }}>
          {STRENGTH_LABELS[score]}
          {score < 3 && ' — add uppercase, number, and special character'}
        </span>
      )}
    </div>
  );
}

// ─── Biometric badge ───────────────────────────────────────────────────────
function BiometricOptions({ onSelect }) {
  const options = [
    { id: 'fingerprint', icon: '🫵', label: 'Fingerprint' },
    { id: 'face_id', icon: '🙂', label: 'Face ID' },
    { id: 'touch_id', icon: '☝️', label: 'Touch ID' },
    { id: 'retinal', icon: '👁️', label: 'Retinal Scan' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          title={o.label}
          style={{
            padding: '8px 14px',
            border: '1px solid #6366f1',
            borderRadius: 8,
            background: 'transparent',
            cursor: 'pointer',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: '#6366f1',
          }}
        >
          <span style={{ fontSize: 18 }}>{o.icon}</span>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── MFA Setup panel ──────────────────────────────────────────────────────
function MFASetup({ email, onDone }) {
  const [step, setStep] = useState('loading');
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.qrDataUrl) {
          setQrUrl(d.qrDataUrl);
          setSecret(d.secret);
          setStep('scan');
        }
      })
      .catch(() => setError('Failed to start MFA setup.'));
  }, [email]);

  const verify = async () => {
    const res = await fetch('/api/auth/mfa/verify-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, secret }),
    });
    const d = await res.json();
    if (d.success) {
      setBackupCodes(d.backupCodes ?? []);
      setStep('backup');
    } else {
      setError('Invalid code. Please try again.');
    }
  };

  if (step === 'loading') return <p style={{ color: '#6b7280' }}>Setting up authenticator…</p>;

  if (step === 'scan')
    return (
      <div>
        <p style={{ marginBottom: 12, color: '#374151' }}>
          Scan this QR code with your authenticator app, then enter the 6-digit code.
        </p>
        {qrUrl && <img src={qrUrl} alt="MFA QR code" style={{ maxWidth: 180, borderRadius: 8 }} />}
        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
          Manual key: <code>{secret}</code>
        </p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value.trim())}
          placeholder="6-digit code"
          maxLength={6}
          style={inputStyle}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}
        <button onClick={verify} style={btnStyle('#6366f1')}>
          Verify
        </button>
      </div>
    );

  if (step === 'backup')
    return (
      <div>
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Save your backup codes</p>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Each code can be used once if you lose access to your authenticator.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            fontFamily: 'monospace',
            fontSize: 13,
          }}
        >
          {backupCodes.map((c) => (
            <span key={c} style={{ padding: '4px 8px', background: '#f3f4f6', borderRadius: 4 }}>
              {c}
            </span>
          ))}
        </div>
        <button onClick={onDone} style={{ ...btnStyle('#22c55e'), marginTop: 16 }}>
          I've saved these — continue
        </button>
      </div>
    );

  return null;
}

// ─── Shared style helpers ──────────────────────────────────────────────────
const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '10px 12px',
  margin: '8px 0',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 14,
  boxSizing: 'border-box',
};

const btnStyle = (bg) => ({
  display: 'block',
  width: '100%',
  padding: '11px 0',
  marginTop: 12,
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
});

// ─── Login form ────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricUsed, setBiometricUsed] = useState(false);

  const handleBiometric = useCallback(async (type) => {
    try {
      // Platform biometric via Web Authentication API (WebAuthn) where available
      if (window.PublicKeyCredential) {
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            timeout: 60000,
            userVerification: 'required',
          },
        });
        if (assertion) {
          setBiometricUsed(true);
          setError('Biometric verified. Enter email to complete sign-in.');
        }
      } else {
        setError(`${type} biometric not available in this environment.`);
      }
    } catch (err) {
      setError('Biometric authentication failed or cancelled.');
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, mfaToken: mfaToken || undefined }),
      });
      const data = await res.json();
      if (data.requiresMfa) {
        setNeedsMfa(true);
        setLoading(false);
        return;
      }
      if (data.token) {
        localStorage.setItem('nexus:authToken', data.token);
        localStorage.setItem('nexus:userRole', data.role);
        localStorage.setItem('nexus:userId', data.userId);
        onSuccess(data);
      } else {
        setError(data.error || 'Login failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        style={inputStyle}
        autoComplete="email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        style={inputStyle}
        autoComplete="current-password"
      />
      {needsMfa && (
        <input
          value={mfaToken}
          onChange={(e) => setMfaToken(e.target.value.trim())}
          placeholder="6-digit authenticator code (or backup code)"
          maxLength={10}
          style={inputStyle}
        />
      )}
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={loading} style={btnStyle('#4f46e5')}>
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
          Or sign in with biometrics:
        </p>
        <BiometricOptions onSelect={handleBiometric} />
      </div>
    </form>
  );
}

// ─── Registration form ─────────────────────────────────────────────────────
function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirm: '',
    displayName: '',
    lang: 'en',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupMfa, setSetupMfa] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          username: form.username,
          password: form.password,
          displayName: form.displayName,
          language: form.lang,
        }),
      });
      const data = await res.json();
      if (data.userId) {
        setSetupMfa(true);
      } else {
        setError(data.error || 'Registration failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  if (setupMfa)
    return (
      <div>
        <h3 style={{ marginBottom: 12 }}>Set up Two-Factor Authentication</h3>
        <MFASetup email={form.email} onDone={() => onSuccess({ email: form.email })} />
      </div>
    );

  return (
    <form onSubmit={submit}>
      <input
        type="email"
        value={form.email}
        onChange={set('email')}
        placeholder="Email address"
        required
        style={inputStyle}
        autoComplete="email"
      />
      {/* Unicode-safe username input */}
      <input
        value={form.username}
        onChange={set('username')}
        placeholder="Username (supports emoji & special chars)"
        required
        style={inputStyle}
        autoComplete="username"
      />
      <input
        value={form.displayName}
        onChange={set('displayName')}
        placeholder="Display name (optional)"
        style={inputStyle}
      />
      <select value={form.lang} onChange={set('lang')} style={{ ...inputStyle, background: '#fff' }}>
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
        <option value="ja">日本語</option>
        <option value="zh">中文</option>
        <option value="ko">한국어</option>
        <option value="pt">Português</option>
        <option value="ar">العربية</option>
        <option value="hi">हिन्दी</option>
      </select>
      <input
        type="password"
        value={form.password}
        onChange={set('password')}
        placeholder="Password (13+ chars with uppercase, number, symbol)"
        required
        style={inputStyle}
        autoComplete="new-password"
      />
      <PasswordMeter password={form.password} />
      <input
        type="password"
        value={form.confirm}
        onChange={set('confirm')}
        placeholder="Confirm password"
        required
        style={{ ...inputStyle, marginTop: 8 }}
        autoComplete="new-password"
      />
      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={loading} style={btnStyle('#059669')}>
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
    </form>
  );
}

// ─── Role-based dashboard header ───────────────────────────────────────────
function RoleBadge({ role }) {
  const config = {
    [ROLES.ADMIN]: { label: 'Admin', bg: '#dc2626', icon: '🛡️' },
    [ROLES.DEV]: { label: 'Developer', bg: '#7c3aed', icon: '⚙️' },
    [ROLES.MODERATOR]: { label: 'Moderator', bg: '#d97706', icon: '🔑' },
    [ROLES.USER]: { label: 'User', bg: '#2563eb', icon: '👤' },
  };
  const c = config[role] ?? config[ROLES.USER];
  return (
    <span
      style={{
        padding: '3px 10px',
        background: c.bg,
        color: '#fff',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {c.icon} {c.label}
    </span>
  );
}

// ─── Main exported component ──────────────────────────────────────────────
export default function AuthDashboard({ onAuthenticated }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('nexus:authToken');
    const role = localStorage.getItem('nexus:userRole');
    const userId = localStorage.getItem('nexus:userId');
    if (token && role) setUser({ token, role, userId });
  }, []);

  const handleSuccess = (data) => {
    setUser(data);
    if (onAuthenticated) onAuthenticated(data);
  };

  const logout = () => {
    localStorage.removeItem('nexus:authToken');
    localStorage.removeItem('nexus:userRole');
    localStorage.removeItem('nexus:userId');
    setUser(null);
  };

  if (user) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <RoleBadge role={user.role} />
          <span style={{ fontSize: 14, color: '#374151' }}>Signed in as {user.email}</span>
          <button
            onClick={logout}
            style={{
              marginLeft: 'auto',
              padding: '6px 14px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Sign out
          </button>
        </div>
        <p style={{ color: '#6b7280', fontSize: 14 }}>
          Dashboard view for role: <strong>{user.role}</strong>
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 440,
        margin: '0 auto',
        padding: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    >
      <h2 style={{ marginBottom: 4, fontSize: 22, fontWeight: 700 }}>
        {mode === 'login' ? '🔐 Sign In' : '✨ Create Account'}
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
        Nexus AI Pro — {mode === 'login' ? 'Welcome back' : 'Join the platform'}
      </p>

      {mode === 'login' ? (
        <LoginForm onSuccess={handleSuccess} />
      ) : (
        <RegisterForm onSuccess={handleSuccess} />
      )}

      <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button
              onClick={() => setMode('register')}
              style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              onClick={() => setMode('login')}
              style={{ color: '#4f46e5', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
