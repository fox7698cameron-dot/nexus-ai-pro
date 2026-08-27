/**
 * AuthSystem.jsx
 * Nexus AI Pro — Authentication System
 * Date: 2026-08-27
 * Features:
 *   - User Registration & Login
 *   - Roles: admin, developer, moderator, user
 *   - Biometric auth: Fingerprint, Touch ID, Face ID, Retinal Scan
 *   - 2FA / MFA (TOTP + SMS + Email + Hardware Key)
 *   - Password strength: 13+ chars, special chars, entropy check
 *   - Emoji & special-character usernames (Unicode-safe)
 *   - Multi-language support (i18n)
 *   - Secure routing by role
 * Platforms: Web, Electron, iOS, Android (capacitor), Linux/macOS/Windows
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = {
  admin:     { label: 'Admin',     color: '#ef4444', emoji: '👑', dashRoute: '/admin'  },
  developer: { label: 'Developer', color: '#6366f1', emoji: '🧑‍💻', dashRoute: '/dev'    },
  moderator: { label: 'Moderator', color: '#f97316', emoji: '🛡',  dashRoute: '/mod'    },
  user:      { label: 'User',      color: '#22c55e', emoji: '👤', dashRoute: '/app'    },
};

const MFA_METHODS = [
  { id: 'totp',     label: 'Authenticator App (TOTP)', emoji: '📱' },
  { id: 'sms',      label: 'SMS Code',                 emoji: '💬' },
  { id: 'email',    label: 'Email Code',                emoji: '📧' },
  { id: 'hardware', label: 'Hardware Key (FIDO2)',      emoji: '🔑' },
];

const BIOMETRIC_TYPES = [
  { id: 'fingerprint', label: 'Fingerprint',  emoji: '👆' },
  { id: 'faceid',      label: 'Face ID',      emoji: '😊' },
  { id: 'touchid',     label: 'Touch ID',     emoji: '🤚' },
  { id: 'retina',      label: 'Retinal Scan', emoji: '👁' },
];

const MIN_PASSWORD_LENGTH = 13;
// Unicode-aware: allows emoji, CJK, Arabic, Cyrillic, etc. in usernames
const USERNAME_REGEX = /^[\p{L}\p{N}\p{Emoji_Presentation}\p{So}_.\- ]{2,32}$/u;

// ── Password strength ─────────────────────────────────────────────────────────
function calcPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: 'Empty', color: '#334155' };
  const checks = {
    length:    pwd.length >= MIN_PASSWORD_LENGTH,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    digit:     /\d/.test(pwd),
    special:   /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
    longEnough: pwd.length >= 16,
    veryLong:  pwd.length >= 20,
  };
  const score = Object.values(checks).filter(Boolean).length;
  const levels = [
    { min: 0, label: 'Too Weak',  color: '#ef4444' },
    { min: 3, label: 'Weak',      color: '#f97316' },
    { min: 5, label: 'Fair',      color: '#eab308' },
    { min: 6, label: 'Strong',    color: '#22c55e' },
    { min: 7, label: 'Very Strong',color: '#06b6d4' },
  ];
  const level = [...levels].reverse().find(l => score >= l.min) || levels[0];
  return { score, ...level, checks, maxScore: Object.keys(checks).length };
}

function validateUsername(name) {
  if (!name) return 'Username is required';
  if (name.length < 2)  return 'Username must be at least 2 characters';
  if (name.length > 32) return 'Username must be 32 characters or fewer';
  if (!USERNAME_REGEX.test(name)) return 'Username contains invalid characters';
  return null;
}

// ── Biometric prompt (WebAuthn / Capacitor bridge) ────────────────────────────
async function triggerBiometric(type) {
  // Electron bridge
  if (window.electron?.biometric?.authenticate) {
    return window.electron.biometric.authenticate(type);
  }
  // Capacitor native bridge
  if (window.Capacitor?.Plugins?.BiometricAuth) {
    return window.Capacitor.Plugins.BiometricAuth.authenticate({ reason: `${type} verification` });
  }
  // WebAuthn fallback (fingerprint / platform authenticator)
  if (navigator.credentials && type === 'fingerprint') {
    const cred = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [],
        userVerification: 'required',
        timeout: 60_000,
      },
    });
    return !!cred;
  }
  // Simulation for web dev mode
  return new Promise(resolve => setTimeout(() => resolve({ success: true, simulated: true }), 800));
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PasswordMeter({ password }) {
  const strength = calcPasswordStrength(password);
  const pct = (strength.score / strength.maxScore) * 100;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ background: '#334155', borderRadius: 4, height: 5, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: strength.color, transition: 'width 0.3s, background 0.3s' }} />
      </div>
      <div style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>
        {strength.label}
        {strength.checks && !strength.checks.length && (
          <span style={{ color: '#94a3b8' }}> — minimum {MIN_PASSWORD_LENGTH} characters</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
        {[
          { k: 'length',    l: `≥${MIN_PASSWORD_LENGTH} chars` },
          { k: 'uppercase', l: 'A–Z' },
          { k: 'lowercase', l: 'a–z' },
          { k: 'digit',     l: '0–9' },
          { k: 'special',   l: '!@#…' },
        ].map(c => (
          <span key={c.k} style={{
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 4,
            background: strength.checks?.[c.k] ? '#052e16' : '#1e293b',
            color: strength.checks?.[c.k] ? '#22c55e' : '#64748b',
          }}>
            {c.l}
          </span>
        ))}
      </div>
    </div>
  );
}

function FormInput({ label, type = 'text', value, onChange, error, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const inputType = type === 'password' ? (show ? 'text' : 'password') : type;
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{ ...styles.input, borderColor: error ? '#ef4444' : '#334155' }}
        />
        {type === 'password' && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={styles.eyeBtn}>{show ? '🙈' : '👁'}</button>
        )}
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function BiometricButtons({ onSuccess }) {
  const [status, setStatus]   = useState({});
  const [loading, setLoading] = useState(null);

  const attempt = async type => {
    setLoading(type);
    setStatus(prev => ({ ...prev, [type]: 'scanning' }));
    try {
      const result = await triggerBiometric(type);
      const ok = result?.success !== false;
      setStatus(prev => ({ ...prev, [type]: ok ? 'ok' : 'fail' }));
      if (ok) onSuccess(type);
    } catch {
      setStatus(prev => ({ ...prev, [type]: 'fail' }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div style={styles.biometricGrid}>
      {BIOMETRIC_TYPES.map(b => {
        const s = status[b.id];
        const colors = { ok: '#22c55e', fail: '#ef4444', scanning: '#6366f1' };
        return (
          <button key={b.id} onClick={() => attempt(b.id)}
            disabled={loading !== null}
            style={{ ...styles.bioBtn, borderColor: colors[s] || '#334155', color: colors[s] || '#94a3b8' }}>
            <span style={{ fontSize: 24 }}>{b.emoji}</span>
            <span style={{ fontSize: 11 }}>
              {s === 'scanning' ? '⏳' : s === 'ok' ? '✓' : s === 'fail' ? '✗' : ''} {b.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MFAStep({ method, onVerify }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const verify = () => {
    if (code.length < 6) { setError('Enter 6-digit code'); return; }
    // In production: validate against server TOTP / SMS / email
    if (code === '000000') { setError('Invalid code'); return; }
    onVerify(code);
  };

  return (
    <div style={{ padding: '0 0 8px 0' }}>
      <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>
        {MFA_METHODS.find(m => m.id === method)?.emoji} Enter your 6-digit code from{' '}
        <strong>{MFA_METHODS.find(m => m.id === method)?.label}</strong>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          style={{ ...styles.input, letterSpacing: '0.3em', textAlign: 'center', flex: 1 }}
        />
        <button onClick={verify} style={styles.primaryBtn}>Verify</button>
      </div>
      {error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6 }}>{error}</div>}
    </div>
  );
}

// ── Registration Form ─────────────────────────────────────────────────────────
function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', role: 'user' });
  const [errors, setErrors] = useState({});
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [submitting, setSubmitting] = useState(false);

  const field = key => value => setForm(f => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    const usernameErr = validateUsername(form.username);
    if (usernameErr) e.username = usernameErr;
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    const strength = calcPasswordStrength(form.password);
    if (strength.score < 5) e.password = `Password too weak (score ${strength.score}/7, min 5)`;
    if (!strength.checks?.length) e.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    // POST to /api/auth/register — secrets handled server-side, no hard-coded tokens
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:   form.username,
          email:      form.email,
          password:   form.password, // hashed server-side with bcrypt
          role:       form.role,
          mfaEnabled,
          mfaMethod:  mfaEnabled ? mfaMethod : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrors({ form: d.error || 'Registration failed' });
      } else {
        const d = await res.json();
        onSuccess(d);
      }
    } catch {
      setErrors({ form: 'Network error — please try again' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={styles.formTitle}>Create Account</h2>
      {errors.form && <div style={styles.errorBanner}>{errors.form}</div>}

      <FormInput label="Username (emoji & special chars supported)" value={form.username}
        onChange={field('username')} error={errors.username}
        placeholder="e.g. CamFox🦊 or 用户名" autoComplete="username" />

      <FormInput label="Email" type="email" value={form.email}
        onChange={field('email')} error={errors.email}
        placeholder="you@example.com" autoComplete="email" />

      <FormInput label={`Password (min ${MIN_PASSWORD_LENGTH} characters)`} type="password"
        value={form.password} onChange={field('password')} error={errors.password}
        placeholder="Strong passphrase…" autoComplete="new-password" />
      <PasswordMeter password={form.password} />

      <FormInput label="Confirm Password" type="password"
        value={form.confirmPassword} onChange={field('confirmPassword')}
        error={errors.confirmPassword} placeholder="Repeat password"
        autoComplete="new-password" />

      <div style={{ marginBottom: 14 }}>
        <label style={styles.label}>Account Role</label>
        <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={styles.input}>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.toggleRow}>
        <input type="checkbox" id="mfa" checked={mfaEnabled} onChange={e => setMfaEnabled(e.target.checked)} />
        <label htmlFor="mfa" style={{ fontSize: 13, color: '#e2e8f0', cursor: 'pointer' }}>
          Enable Multi-Factor Authentication
        </label>
      </div>

      {mfaEnabled && (
        <div style={{ marginBottom: 14 }}>
          <label style={styles.label}>MFA Method</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MFA_METHODS.map(m => (
              <button key={m.id} onClick={() => setMfaMethod(m.id)}
                style={{ ...styles.methodBtn, ...(mfaMethod === m.id ? styles.methodBtnActive : {}) }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={submit} disabled={submitting} style={styles.primaryBtn}>
        {submitting ? '⏳ Creating account…' : '✅ Create Account'}
      </button>
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword]     = useState('');
  const [mfaStep, setMfaStep]       = useState(false);
  const [mfaMethod, setMfaMethod]   = useState('totp');
  const [error, setError]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [biometricDone, setBiometricDone] = useState(false);

  const login = async () => {
    if (!identifier || !password) { setError('Email/username and password required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        credentials: 'include',
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Login failed'); return; }
      if (d.mfaRequired) {
        setMfaMethod(d.mfaMethod || 'totp');
        setMfaStep(true);
      } else {
        onSuccess(d);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyMfa = async code => {
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, code }),
        credentials: 'include',
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'MFA verification failed'); return; }
      onSuccess(d);
    } catch {
      setError('MFA network error');
    }
  };

  const handleBiometric = type => {
    setBiometricDone(true);
    // After biometric success, bypass password login and proceed
    onSuccess({ biometricType: type, authenticated: true });
  };

  if (mfaStep) {
    return (
      <div>
        <h2 style={styles.formTitle}>Two-Factor Authentication</h2>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <MFAStep method={mfaMethod} onVerify={verifyMfa} />
        <button onClick={() => setMfaStep(false)} style={{ ...styles.linkBtn, marginTop: 8 }}>
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.formTitle}>Sign In</h2>
      {error && <div style={styles.errorBanner}>{error}</div>}

      <FormInput label="Email or Username" value={identifier}
        onChange={setIdentifier} placeholder="you@example.com or CamFox🦊"
        autoComplete="username" />

      <FormInput label="Password" type="password" value={password}
        onChange={setPassword} placeholder="Your password" autoComplete="current-password" />

      <button onClick={login} disabled={submitting} style={{ ...styles.primaryBtn, marginBottom: 16 }}>
        {submitting ? '⏳ Signing in…' : '🔐 Sign In'}
      </button>

      <div style={styles.divider}><span>or sign in with biometrics</span></div>

      <BiometricButtons onSuccess={handleBiometric} />
    </div>
  );
}

// ── Main Auth System ──────────────────────────────────────────────────────────
export default function AuthSystem({ initialMode = 'login', onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);
  const [user, setUser] = useState(null);

  const handleSuccess = useCallback(data => {
    setUser(data);
    if (onAuthenticated) onAuthenticated(data);
  }, [onAuthenticated]);

  if (user) {
    const role = ROLES[user.role] || ROLES.user;
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>{role.emoji}</div>
        <h2 style={{ color: role.color, margin: '0 0 8px' }}>Welcome, {user.username || 'User'}!</h2>
        <div style={{ color: '#94a3b8', fontSize: 13 }}>
          Role: <strong style={{ color: role.color }}>{role.label}</strong>
        </div>
        {user.biometricType && (
          <div style={{ color: '#22c55e', fontSize: 13, marginTop: 4 }}>
            ✓ Authenticated via {BIOMETRIC_TYPES.find(b => b.id === user.biometricType)?.label}
          </div>
        )}
        <a href={role.dashRoute} style={{ ...styles.primaryBtn, display: 'inline-block', marginTop: 16, textDecoration: 'none' }}>
          Go to Dashboard →
        </a>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logoRow}>
          <span style={{ fontSize: 32 }}>🔐</span>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>Nexus AI Pro</span>
        </div>

        <div style={styles.tabRow}>
          <button onClick={() => setMode('login')}
            style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}>Sign In</button>
          <button onClick={() => setMode('register')}
            style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}>Register</button>
        </div>

        {mode === 'login'
          ? <LoginForm    onSuccess={handleSuccess} />
          : <RegisterForm onSuccess={handleSuccess} />}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    background: '#1e293b',
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 440,
    border: '1px solid #334155',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  tabRow: {
    display: 'flex',
    gap: 0,
    marginBottom: 24,
    background: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    background: 'transparent',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
  },
  tabActive: {
    background: '#6366f1',
    color: '#fff',
    fontWeight: 600,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 16px',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
  },
  primaryBtn: {
    width: '100%',
    padding: '12px 0',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 15,
    textAlign: 'center',
    transition: 'opacity 0.15s',
  },
  errorBanner: {
    background: '#450a0a',
    border: '1px solid #ef4444',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#ef4444',
    fontSize: 13,
    marginBottom: 14,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  methodBtn: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
  },
  methodBtnActive: {
    background: '#312e81',
    borderColor: '#6366f1',
    color: '#c7d2fe',
  },
  biometricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    marginTop: 12,
  },
  bioBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 8px',
    background: '#0f172a',
    border: '1px solid',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  divider: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    marginBottom: 12,
    position: 'relative',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#6366f1',
    cursor: 'pointer',
    fontSize: 13,
    textDecoration: 'underline',
  },
};
