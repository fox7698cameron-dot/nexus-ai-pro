// File: src/components/AuthSystem.jsx | Updated: 2026-10-06

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'hi', label: 'Hindi' },
];

const ROLE_COLORS = {
  admin: '#ff4757',
  dev: '#2ed573',
  moderator: '#ffa502',
  user: '#70a1ff',
};

const ROLE_HINTS = {
  admin: 'Redirecting to Admin Control Panel…',
  dev: 'Redirecting to Developer Dashboard…',
  moderator: 'Redirecting to Moderation Queue…',
  user: 'Redirecting to Your Dashboard…',
};

const MAX_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Palette / shared styles
// ---------------------------------------------------------------------------

const palette = {
  bg: '#0d0d0d',
  surface: '#1a1a1f',
  surfaceAlt: '#22222a',
  border: '#2e2e3a',
  borderFocus: '#5b5bd6',
  text: '#e8e8f0',
  textMuted: '#7a7a9a',
  textPlaceholder: '#4a4a6a',
  accent: '#5b5bd6',
  accentHover: '#6f6fdf',
  danger: '#e05c5c',
  warning: '#e0a03a',
  success: '#3acd82',
  overlay: 'rgba(0,0,0,0.72)',
};

const base = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  color: palette.text,
};

function s(obj) { return obj; } // identity — keeps style objects readable

// ---------------------------------------------------------------------------
// Styles (flat objects)
// ---------------------------------------------------------------------------

const styles = {
  overlay: s({
    position: 'fixed',
    inset: 0,
    background: palette.overlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
    boxSizing: 'border-box',
  }),
  modal: s({
    ...base,
    background: palette.surface,
    border: `1px solid ${palette.border}`,
    borderRadius: 16,
    padding: '32px 28px',
    width: '100%',
    maxWidth: 420,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxSizing: 'border-box',
    position: 'relative',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
  }),
  closeBtn: s({
    position: 'absolute',
    top: 16,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: palette.textMuted,
    fontSize: 20,
    cursor: 'pointer',
    lineHeight: 1,
    padding: '4px 6px',
    borderRadius: 6,
  }),
  title: s({
    margin: '0 0 4px',
    fontSize: 22,
    fontWeight: 700,
    color: palette.text,
  }),
  subtitle: s({
    margin: '0 0 24px',
    fontSize: 13,
    color: palette.textMuted,
  }),
  fieldGroup: s({
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginBottom: 18,
  }),
  label: s({
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: palette.textMuted,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }),
  input: s({
    width: '100%',
    boxSizing: 'border-box',
    background: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: palette.text,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.15s',
    fontFamily: base.fontFamily,
  }),
  inputFocus: s({
    borderColor: palette.borderFocus,
  }),
  select: s({
    width: '100%',
    boxSizing: 'border-box',
    background: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    color: palette.text,
    fontSize: 14,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: base.fontFamily,
    appearance: 'none',
    WebkitAppearance: 'none',
  }),
  btn: s({
    width: '100%',
    padding: '11px 16px',
    borderRadius: 8,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s, opacity 0.15s',
    fontFamily: base.fontFamily,
    boxSizing: 'border-box',
  }),
  btnPrimary: s({
    background: palette.accent,
    color: '#fff',
  }),
  btnSecondary: s({
    background: palette.surfaceAlt,
    color: palette.text,
    border: `1px solid ${palette.border}`,
  }),
  btnDanger: s({
    background: palette.danger,
    color: '#fff',
  }),
  btnDisabled: s({
    opacity: 0.5,
    cursor: 'not-allowed',
  }),
  link: s({
    background: 'none',
    border: 'none',
    color: palette.accent,
    cursor: 'pointer',
    fontSize: 13,
    padding: 0,
    fontFamily: base.fontFamily,
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  }),
  error: s({
    background: 'rgba(224,92,92,0.12)',
    border: `1px solid ${palette.danger}`,
    borderRadius: 8,
    color: palette.danger,
    fontSize: 13,
    padding: '9px 12px',
    marginBottom: 14,
  }),
  success: s({
    background: 'rgba(58,205,130,0.12)',
    border: `1px solid ${palette.success}`,
    borderRadius: 8,
    color: palette.success,
    fontSize: 13,
    padding: '9px 12px',
    marginBottom: 14,
  }),
  row: s({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  }),
  checkRow: s({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
  }),
  checkbox: s({
    width: 16,
    height: 16,
    cursor: 'pointer',
    accentColor: palette.accent,
  }),
  checkLabel: s({
    fontSize: 13,
    color: palette.textMuted,
    cursor: 'pointer',
  }),
  divider: s({
    height: 1,
    background: palette.border,
    margin: '18px 0',
  }),
  strengthBar: s({
    height: 4,
    borderRadius: 2,
    background: palette.border,
    overflow: 'hidden',
    marginTop: 6,
  }),
  strengthFill: s({
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.25s, background 0.25s',
  }),
  strengthLabel: s({
    fontSize: 11,
    marginTop: 4,
    fontWeight: 600,
  }),
  otpContainer: s({
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
  }),
  otpInput: s({
    width: 42,
    height: 52,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 700,
    background: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    color: palette.text,
    outline: 'none',
    fontFamily: base.fontFamily,
    boxSizing: 'border-box',
  }),
  qrWrap: s({
    background: '#fff',
    borderRadius: 12,
    padding: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  }),
  codeBox: s({
    background: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: 'monospace',
    fontSize: 13,
    color: palette.textMuted,
    wordBreak: 'break-all',
    letterSpacing: '0.12em',
    marginBottom: 14,
    userSelect: 'all',
  }),
  backupGrid: s({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 6,
    marginBottom: 14,
  }),
  backupCode: s({
    background: palette.surfaceAlt,
    border: `1px solid ${palette.border}`,
    borderRadius: 6,
    padding: '6px 10px',
    fontFamily: 'monospace',
    fontSize: 12,
    color: palette.textMuted,
    textAlign: 'center',
    letterSpacing: '0.1em',
    userSelect: 'all',
  }),
  roleBadge: s({
    display: 'inline-block',
    borderRadius: 6,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginLeft: 8,
  }),
  hint: s({
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 6,
    textAlign: 'center',
  }),
  biometricIcon: s({
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 12,
  }),
  modeLink: s({
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: palette.textMuted,
  }),
  validationList: s({
    listStyle: 'none',
    margin: '6px 0 0',
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  }),
  validationItem: s({
    fontSize: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  }),
};

// ---------------------------------------------------------------------------
// Password strength helpers
// ---------------------------------------------------------------------------

const STRENGTH_LEVELS = [
  { label: 'Very Weak', color: '#e05c5c', pct: 10 },
  { label: 'Weak',      color: '#e07c3a', pct: 30 },
  { label: 'Fair',      color: '#e0c03a', pct: 54 },
  { label: 'Strong',    color: '#5bb55b', pct: 78 },
  { label: 'Very Strong', color: '#3acd82', pct: 100 },
];

function scorePassword(pw) {
  if (!pw) return -1;
  let score = 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 20) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return 0;
  if (score === 2) return 1;
  if (score === 3) return 2;
  if (score === 4) return 3;
  return 4;
}

function validatePassword(pw) {
  return {
    length:   pw.length >= 13,
    upper:    /[A-Z]/.test(pw),
    lower:    /[a-z]/.test(pw),
    number:   /\d/.test(pw),
    special:  /[^a-zA-Z0-9]/.test(pw),
  };
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

async function apiGet(path) {
  const res = await fetch(path, { method: 'GET' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

// ---------------------------------------------------------------------------
// WebAuthn helpers
// ---------------------------------------------------------------------------

function base64urlToBuffer(base64url) {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const str = atob(base64);
  return Uint8Array.from(str, (c) => c.charCodeAt(0)).buffer;
}

function bufferToBase64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach((b) => { str += String.fromCharCode(b); });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function isBiometricAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

async function registerBiometric(userId, userEmail, userName) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const options = {
    challenge,
    rp: { name: 'Nexus AI Pro', id: window.location.hostname },
    user: {
      id: new TextEncoder().encode(userId),
      name: userEmail,
      displayName: userName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
    },
    timeout: 60000,
  };
  const credential = await navigator.credentials.create({ publicKey: options });
  return {
    credentialId: bufferToBase64url(credential.rawId),
    clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
    attestationObject: bufferToBase64url(credential.response.attestationObject),
  };
}

async function verifyBiometric(credentialId) {
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const options = {
    challenge,
    allowCredentials: [{ type: 'public-key', id: base64urlToBuffer(credentialId) }],
    userVerification: 'required',
    timeout: 60000,
  };
  const assertion = await navigator.credentials.get({ publicKey: options });
  return {
    credentialId: bufferToBase64url(assertion.rawId),
    challenge: bufferToBase64url(challenge),
    authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
    clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
    signature: bufferToBase64url(assertion.response.signature),
  };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ErrorBanner({ message }) {
  if (!message) return null;
  return <div style={styles.error}>{message}</div>;
}

function SuccessBanner({ message }) {
  if (!message) return null;
  return <div style={styles.success}>{message}</div>;
}

function FocusInput({ style, inputStyle, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...styles.input,
        ...(inputStyle || {}),
        ...(focused ? styles.inputFocus : {}),
      }}
      onFocus={(e) => { setFocused(true); props.onFocus && props.onFocus(e); }}
      onBlur={(e)  => { setFocused(false); props.onBlur && props.onBlur(e); }}
    />
  );
}

function FocusSelect({ children, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      {...props}
      style={{
        ...styles.select,
        ...(focused ? styles.inputFocus : {}),
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      {children}
    </select>
  );
}

function PasswordStrength({ password }) {
  const score = scorePassword(password);
  const checks = validatePassword(password);
  if (!password) return null;
  const level = STRENGTH_LEVELS[score] || STRENGTH_LEVELS[0];
  const items = [
    { key: 'length',  label: 'At least 13 characters' },
    { key: 'upper',   label: 'Uppercase letter (A–Z)' },
    { key: 'lower',   label: 'Lowercase letter (a–z)' },
    { key: 'number',  label: 'Number (0–9)' },
    { key: 'special', label: 'Special character / emoji' },
  ];
  return (
    <div>
      <div style={styles.strengthBar}>
        <div style={{ ...styles.strengthFill, width: `${level.pct}%`, background: level.color }} />
      </div>
      <div style={{ ...styles.strengthLabel, color: level.color }}>{level.label}</div>
      <ul style={styles.validationList}>
        {items.map(({ key, label }) => (
          <li key={key} style={{ ...styles.validationItem, color: checks[key] ? palette.success : palette.textMuted }}>
            <span>{checks[key] ? '✓' : '○'}</span> {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OtpInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = Array.from({ length: 6 }, () => useRef(null));

  const handleChange = (idx, val) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = digits.map((d, i) => (i === idx ? char : d));
    setDigits(next);
    if (char && idx < 5) refs[idx + 1].current?.focus();
    if (next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) refs[idx - 1].current?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs[idx + 1].current?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = digits.map((_, i) => text[i] || '');
    setDigits(next);
    const lastIdx = Math.min(text.length - 1, 5);
    refs[lastIdx].current?.focus();
    if (text.length === 6) onComplete(text);
  };

  return (
    <div style={styles.otpContainer}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={d}
          autoComplete="one-time-code"
          style={styles.otpInput}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}

function RoleBadge({ role }) {
  if (!role) return null;
  const color = ROLE_COLORS[role] || ROLE_COLORS.user;
  return (
    <span style={{ ...styles.roleBadge, background: `${color}22`, color, border: `1px solid ${color}` }}>
      {role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Screen: Login
// ---------------------------------------------------------------------------

function LoginScreen({ onSuccess, onForgotPassword, onRegister, onMfa, onBiometric, biometricAvailable }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [attempts, setAttempts] = useState(0);

  const rateLimited = attempts >= MAX_ATTEMPTS;

  const handleLogin = useCallback(async (e) => {
    e?.preventDefault();
    if (rateLimited || loading) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/login', { email, password });
      if (data.mfaRequired) {
        onMfa({ userId: data.userId, token: data.tempToken });
        return;
      }
      onSuccess({ ...data.user, token: data.token, remember });
    } catch (err) {
      setPassword('');
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError('Too many attempts. Please wait before trying again.');
      } else {
        setError(err.message || 'Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, remember, attempts, rateLimited, loading, onMfa, onSuccess]);

  return (
    <form onSubmit={handleLogin}>
      <h2 style={styles.title}>Welcome back</h2>
      <p style={styles.subtitle}>Sign in to Nexus AI Pro</p>
      <ErrorBanner message={error} />
      <div style={styles.fieldGroup}>
        <div>
          <label style={styles.label}>Email</label>
          <FocusInput
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={styles.label}>Password</label>
          <FocusInput
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
      </div>
      <div style={styles.row}>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            style={styles.checkbox}
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span style={styles.checkLabel}>Remember me</span>
        </label>
        <button type="button" style={styles.link} onClick={onForgotPassword}>
          Forgot password?
        </button>
      </div>
      <button
        type="submit"
        disabled={loading || rateLimited}
        style={{ ...styles.btn, ...styles.btnPrimary, ...(loading || rateLimited ? styles.btnDisabled : {}) }}
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      {biometricAvailable && (
        <>
          <div style={styles.divider} />
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={onBiometric}
          >
            🔐 Use Fingerprint / Face ID
          </button>
        </>
      )}
      <div style={styles.modeLink}>
        Don't have an account?{' '}
        <button type="button" style={styles.link} onClick={onRegister}>
          Register
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Screen: Register
// ---------------------------------------------------------------------------

function RegisterScreen({ onSuccess, onLogin, onMfa }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const checks    = validatePassword(password);
  const allValid  = Object.values(checks).every(Boolean);
  const passMatch = password === confirm;

  const handleRegister = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    if (!allValid) { setError('Password does not meet all requirements.'); return; }
    if (!passMatch) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const data = await apiPost('/api/auth/register', { name, email, password, language });
      if (data.mfaRequired || data.mfaSetupRequired) {
        onMfa({ userId: data.userId, token: data.tempToken, setup: true });
        return;
      }
      onSuccess({ ...data.user, token: data.token });
    } catch (err) {
      setPassword('');
      setConfirm('');
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, confirm, language, allValid, passMatch, onMfa, onSuccess]);

  return (
    <form onSubmit={handleRegister}>
      <h2 style={styles.title}>Create account</h2>
      <p style={styles.subtitle}>Join Nexus AI Pro — free forever</p>
      <ErrorBanner message={error} />
      <div style={styles.fieldGroup}>
        <div>
          <label style={styles.label}>Display Name</label>
          <FocusInput
            type="text"
            autoComplete="name"
            placeholder="Your name or nickname 😊"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={styles.label}>Email</label>
          <FocusInput
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label style={styles.label}>Password</label>
          <FocusInput
            type="password"
            autoComplete="new-password"
            placeholder="Min. 13 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <PasswordStrength password={password} />
        </div>
        <div>
          <label style={styles.label}>Confirm Password</label>
          <FocusInput
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            inputStyle={confirm && !passMatch ? { borderColor: palette.danger } : {}}
          />
          {confirm && !passMatch && (
            <div style={{ fontSize: 11, color: palette.danger, marginTop: 4 }}>Passwords do not match</div>
          )}
        </div>
        <div>
          <label style={styles.label}>Language</label>
          <FocusSelect value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </FocusSelect>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ ...styles.btn, ...styles.btnPrimary, ...(loading ? styles.btnDisabled : {}) }}
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>
      <div style={styles.modeLink}>
        Already have an account?{' '}
        <button type="button" style={styles.link} onClick={onLogin}>
          Sign in
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Screen: MFA Setup
// ---------------------------------------------------------------------------

function MfaSetupScreen({ userId, token, onVerified, onSkip }) {
  const [setupData, setSetupData] = useState(null);
  const [loadingSetup, setLoadingSetup] = useState(true);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet('/api/auth/2fa/setup')
      .then((data) => { if (!cancelled) setSetupData(data); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Failed to load MFA setup.'); })
      .finally(() => { if (!cancelled) setLoadingSetup(false); });
    return () => { cancelled = true; };
  }, []);

  const handleCode = useCallback(async (code) => {
    if (verifying) return;
    setError('');
    setVerifying(true);
    try {
      const data = await apiPost('/api/auth/2fa/verify', { userId, code });
      onVerified({ token: data.token || token, ...data.user });
    } catch (err) {
      setError(err.message || 'Invalid code. Try again.');
      setVerifying(false);
    }
  }, [userId, token, verifying, onVerified]);

  if (loadingSetup) return <div style={{ color: palette.textMuted, textAlign: 'center', padding: 24 }}>Loading MFA setup…</div>;

  return (
    <div>
      <h2 style={styles.title}>Set up 2-factor auth</h2>
      <p style={styles.subtitle}>Use an authenticator app (Google Authenticator, Authy, etc.)</p>
      <ErrorBanner message={error} />
      {setupData?.qrCode && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={styles.qrWrap}>
            <img src={setupData.qrCode} alt="QR code for TOTP" width={160} height={160} />
          </div>
          <div style={{ fontSize: 12, color: palette.textMuted, marginBottom: 8 }}>
            Can't scan? Enter this code manually:
          </div>
          <div style={styles.codeBox}>{setupData.secret}</div>
        </div>
      )}
      {setupData?.backupCodes?.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: palette.warning, marginBottom: 8, fontWeight: 600 }}>
            ⚠️ Save these backup codes — they won't be shown again:
          </div>
          <div style={styles.backupGrid}>
            {setupData.backupCodes.map((code, i) => (
              <div key={i} style={styles.backupCode}>{code}</div>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 13, color: palette.textMuted, marginBottom: 10, textAlign: 'center' }}>
        Enter the 6-digit code from your authenticator app:
      </div>
      <OtpInput onComplete={handleCode} />
      {verifying && <div style={{ fontSize: 12, color: palette.textMuted, textAlign: 'center' }}>Verifying…</div>}
      <div style={{ fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 8 }}>
        SMS not available — please use an authenticator app.
      </div>
      {onSkip && (
        <button type="button" style={{ ...styles.btn, ...styles.btnSecondary, marginTop: 12 }} onClick={onSkip}>
          Skip for now
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen: MFA Verify
// ---------------------------------------------------------------------------

function MfaVerifyScreen({ userId, token, onVerified }) {
  const [error, setError]       = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const rateLimited = attempts >= MAX_ATTEMPTS;

  const handleCode = useCallback(async (code) => {
    if (verifying || rateLimited) return;
    setError('');
    setVerifying(true);
    try {
      const data = await apiPost('/api/auth/2fa/verify', { userId, code });
      onVerified({ token: data.token || token, ...data.user });
    } catch (err) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Invalid code. Please try again.');
      }
      setVerifying(false);
    }
  }, [userId, token, verifying, rateLimited, attempts, onVerified]);

  return (
    <div>
      <h2 style={styles.title}>Two-factor verification</h2>
      <p style={styles.subtitle}>Enter the 6-digit code from your authenticator app</p>
      <ErrorBanner message={error} />
      <OtpInput onComplete={handleCode} />
      {verifying && <div style={{ fontSize: 12, color: palette.textMuted, textAlign: 'center' }}>Verifying…</div>}
      {rateLimited && (
        <div style={{ fontSize: 12, color: palette.danger, textAlign: 'center', marginTop: 4 }}>
          Too many failed attempts. Please wait before retrying.
        </div>
      )}
      <div style={{ fontSize: 12, color: palette.textMuted, textAlign: 'center', marginTop: 12 }}>
        SMS 2FA is not available — please use your authenticator app.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen: Biometric prompt
// ---------------------------------------------------------------------------

function BiometricScreen({ onResult, onFallback }) {
  const [status, setStatus]     = useState('idle'); // idle | requesting | success | error
  const [error, setError]       = useState('');
  const storedCredId = useRef(null);

  // In a real app the credential ID would come from a challenge or stored session hint.
  // Here we attempt to get any stored credential ID from memory or prompt the server.
  const handleBiometric = useCallback(async () => {
    setError('');
    setStatus('requesting');
    try {
      // Attempt a platform authenticator assertion; credential ID sourced from memory/server.
      const credentialId = storedCredId.current || '';
      if (!credentialId) throw new Error('No biometric credential registered. Please log in with password.');
      const credential = await verifyBiometric(credentialId);
      const data = await apiPost('/api/auth/login/biometric', credential);
      setStatus('success');
      onResult({ ...data.user, token: data.token });
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Biometric authentication failed.');
    }
  }, [onResult]);

  useEffect(() => { handleBiometric(); }, []); // auto-trigger on mount

  return (
    <div style={{ textAlign: 'center' }}>
      <h2 style={styles.title}>Biometric Sign-In</h2>
      <div style={styles.biometricIcon}>{status === 'error' ? '🔒' : '🔐'}</div>
      {status === 'idle' || status === 'requesting' ? (
        <p style={{ color: palette.textMuted, fontSize: 14 }}>
          Waiting for biometric confirmation…
        </p>
      ) : null}
      <ErrorBanner message={error} />
      {status !== 'requesting' && (
        <button
          type="button"
          style={{ ...styles.btn, ...styles.btnPrimary, marginBottom: 10 }}
          onClick={handleBiometric}
        >
          Retry Biometric
        </button>
      )}
      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSecondary }}
        onClick={onFallback}
      >
        Use Password Instead
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen: Password Reset
// ---------------------------------------------------------------------------

function PasswordResetScreen({ onBack }) {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [sent, setSent]         = useState(false);

  const handleReset = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiPost('/api/auth/password-reset/request', { email });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  if (sent) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h2 style={styles.title}>Check your inbox</h2>
        <SuccessBanner message={`A reset link was sent to ${email}. Check your spam folder if you don't see it.`} />
        <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onBack}>
          Back to Sign In
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleReset}>
      <h2 style={styles.title}>Reset password</h2>
      <p style={styles.subtitle}>We'll email you a secure reset link.</p>
      <ErrorBanner message={error} />
      <div style={{ marginBottom: 18 }}>
        <label style={styles.label}>Email</label>
        <FocusInput
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        style={{ ...styles.btn, ...styles.btnPrimary, ...(loading ? styles.btnDisabled : {}), marginBottom: 10 }}
      >
        {loading ? 'Sending…' : 'Send Reset Link'}
      </button>
      <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onBack}>
        Back to Sign In
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Screen: Success / Role dashboard hint
// ---------------------------------------------------------------------------

function SuccessScreen({ user, onDone }) {
  const role = user?.role || 'user';
  const hint = ROLE_HINTS[role] || ROLE_HINTS.user;
  const color = ROLE_COLORS[role] || ROLE_COLORS.user;

  useEffect(() => {
    const timer = setTimeout(onDone, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
      <h2 style={{ ...styles.title, textAlign: 'center' }}>
        Welcome{user?.name ? `, ${user.name}` : ''}!
        <RoleBadge role={role} />
      </h2>
      <p style={{ color: palette.textMuted, fontSize: 14, margin: '8px 0 20px' }}>{hint}</p>
      <div
        style={{
          height: 4,
          borderRadius: 2,
          background: palette.border,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            background: color,
            animation: 'authProgressBar 1.8s linear forwards',
          }}
        />
      </div>
      <style>{`
        @keyframes authProgressBar {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class AuthErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error, info) {
    // Intentionally no console.log of sensitive info
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <div style={styles.error}>{this.state.errorMessage}</div>
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={() => this.setState({ hasError: false, errorMessage: '' })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Main AuthSystem component
// ---------------------------------------------------------------------------

function AuthSystem({ onSuccess, onClose, initialMode = 'login' }) {
  const [mode, setMode]                   = useState(initialMode);
  const [biometricAvailable, setBiometric] = useState(false);
  const [mfaContext, setMfaContext]        = useState(null); // { userId, token, setup? }
  const [successUser, setSuccessUser]     = useState(null);
  // JWT is held only in module-scope memory ref — never written to localStorage/sessionStorage
  const tokenRef = useRef(null);

  useEffect(() => {
    isBiometricAvailable().then(setBiometric);
  }, []);

  const handleSuccess = useCallback((user) => {
    const { token, ...rest } = user;
    tokenRef.current = token || null;
    setSuccessUser(rest);
    setMode('success');
  }, []);

  const handleDone = useCallback(() => {
    onSuccess({ ...successUser, getToken: () => tokenRef.current });
  }, [successUser, onSuccess]);

  const handleMfaRequired = useCallback((ctx) => {
    setMfaContext(ctx);
    setMode(ctx.setup ? 'mfa-setup' : 'mfa-verify');
  }, []);

  const handleMfaVerified = useCallback((user) => {
    handleSuccess(user);
  }, [handleSuccess]);

  const renderScreen = () => {
    switch (mode) {
      case 'login':
        return (
          <LoginScreen
            onSuccess={handleSuccess}
            onForgotPassword={() => setMode('reset')}
            onRegister={() => setMode('register')}
            onMfa={handleMfaRequired}
            onBiometric={() => setMode('biometric')}
            biometricAvailable={biometricAvailable}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            onSuccess={handleSuccess}
            onLogin={() => setMode('login')}
            onMfa={handleMfaRequired}
          />
        );
      case 'mfa':
        return (
          <MfaSetupScreen
            userId={mfaContext?.userId}
            token={mfaContext?.token}
            onVerified={handleMfaVerified}
            onSkip={null}
          />
        );
      case 'mfa-setup':
        return (
          <MfaSetupScreen
            userId={mfaContext?.userId}
            token={mfaContext?.token}
            onVerified={handleMfaVerified}
            onSkip={() => setMode('login')}
          />
        );
      case 'mfa-verify':
        return (
          <MfaVerifyScreen
            userId={mfaContext?.userId}
            token={mfaContext?.token}
            onVerified={handleMfaVerified}
          />
        );
      case 'biometric':
        return (
          <BiometricScreen
            onResult={handleSuccess}
            onFallback={() => setMode('login')}
          />
        );
      case 'reset':
        return <PasswordResetScreen onBack={() => setMode('login')} />;
      case 'success':
        return <SuccessScreen user={successUser} onDone={handleDone} />;
      default:
        return null;
    }
  };

  // Close on overlay click (not on modal click)
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div style={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {mode !== 'success' && (
          <button
            type="button"
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        )}
        <AuthErrorBoundary>
          {renderScreen()}
        </AuthErrorBoundary>
      </div>
    </div>
  );
}

export default AuthSystem;
