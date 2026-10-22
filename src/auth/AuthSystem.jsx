// Nexus AI Pro - Auth System UI | Date: 2026-10-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── i18n strings (swap this object to localise) ─────────────────────────────
const STRINGS = {
  appName: 'Nexus AI Pro',
  login: 'Sign In',
  register: 'Create Account',
  mfaSetup: 'Set Up Two-Factor Auth',
  mfaVerify: 'Verify Identity',
  biometricSetup: 'Set Up Biometrics',
  passwordChange: 'Change Password',
  email: 'Email address',
  emailPlaceholder: 'you@example.com',
  password: 'Password',
  passwordPlaceholder: '13+ characters',
  username: 'Username',
  usernamePlaceholder: 'nexus_user_✨',
  rememberMe: 'Remember this device',
  forgotPassword: 'Forgot password?',
  signInWithGoogle: 'Continue with Google',
  signInWithGitHub: 'Continue with GitHub',
  signInWithDiscord: 'Continue with Discord',
  signInWithBiometric: 'Use Biometric / Passkey',
  createAccount: 'Create account',
  alreadyHaveAccount: 'Already have an account? Sign in',
  noAccount: "Don't have an account? Sign up",
  roleUser: 'User',
  roleDeveloper: 'Developer',
  roleAdmin: 'Admin (invite only)',
  roleModerator: 'Moderator (invite only)',
  language: 'Language preference',
  terms: 'I agree to the Terms of Service and Privacy Policy',
  strengthWeak: 'Weak',
  strengthFair: 'Fair',
  strengthGood: 'Good',
  strengthStrong: 'Strong',
  strengthExcellent: 'Excellent',
  passwordRequirements: 'Min 13 chars, uppercase, lowercase, digit, special character',
  mfaScanQR: 'Scan this QR code with your authenticator app',
  mfaEnterCode: 'Enter the 6-digit code',
  mfaRecoveryCodes: 'Save your recovery codes',
  mfaRecoveryNote: 'These codes can be used if you lose access to your authenticator. Each code works once.',
  biometricFingerprint: 'Fingerprint / Touch ID',
  biometricFaceId: 'Face ID',
  biometricRetinal: 'Retinal Scan (coming soon)',
  biometricUnavailable: 'Biometrics not available on this device',
  biometricRegister: 'Register Biometric',
  biometricSkip: 'Skip for now',
  continue: 'Continue',
  back: 'Back',
  submit: 'Submit',
  loading: 'Loading…',
  errorGeneric: 'Something went wrong. Please try again.',
  errorInvalidCredentials: 'Invalid email or password.',
  errorUsernameTaken: 'That username is already taken.',
  errorEmailTaken: 'That email is already registered.',
  errorWeakPassword: 'Password does not meet requirements.',
  errorInvalidMFA: 'Invalid verification code.',
  successRegister: 'Account created! Set up two-factor authentication.',
  successLogin: 'Welcome back!',
  successBiometric: 'Biometric registered successfully.',
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmPassword: 'Confirm new password',
  passwordMismatch: 'Passwords do not match.',
  changePassword: 'Update password',
};

// ── Constants ────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'zh', label: '中文' },
  { code: 'pt', label: 'Português' },
  { code: 'ar', label: 'العربية' },
  { code: 'ru', label: 'Русский' },
];

const ROLES = [
  { value: 'user', label: STRINGS.roleUser, disabled: false },
  { value: 'developer', label: STRINGS.roleDeveloper, disabled: false },
  { value: 'admin', label: STRINGS.roleAdmin, disabled: true },
  { value: 'moderator', label: STRINGS.roleModerator, disabled: true },
];

// ── Password-strength calculator ─────────────────────────────────────────────
function calcPasswordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#374151' };
  let score = 0;
  if (pw.length >= 13) score++;
  if (pw.length >= 18) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: STRINGS.strengthWeak,      color: '#ef4444' },
    { label: STRINGS.strengthWeak,      color: '#ef4444' },
    { label: STRINGS.strengthFair,      color: '#f97316' },
    { label: STRINGS.strengthGood,      color: '#eab308' },
    { label: STRINGS.strengthStrong,    color: '#22c55e' },
    { label: STRINGS.strengthExcellent, color: '#06b6d4' },
    { label: STRINGS.strengthExcellent, color: '#06b6d4' },
  ];
  return { score, ...map[Math.min(score, map.length - 1)] };
}

function isPasswordValid(pw) {
  return (
    pw.length >= 13 &&
    /[A-Z]/.test(pw) &&
    /[a-z]/.test(pw) &&
    /\d/.test(pw) &&
    /[^A-Za-z0-9]/.test(pw)
  );
}

// Username allows letters (any script), digits, emoji, underscore, hyphen, dot
const USERNAME_RE = /^[\p{L}\p{N}\p{Emoji}_\-. ]{1,40}$/u;

// ── Placeholder QR-code SVG (base64) ─────────────────────────────────────────
const QR_PLACEHOLDER_SVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#1f2937"/>
  <rect x="10" y="10" width="60" height="60" rx="4" fill="none" stroke="#60a5fa" stroke-width="4"/>
  <rect x="20" y="20" width="40" height="40" rx="2" fill="#60a5fa"/>
  <rect x="110" y="10" width="60" height="60" rx="4" fill="none" stroke="#60a5fa" stroke-width="4"/>
  <rect x="120" y="20" width="40" height="40" rx="2" fill="#60a5fa"/>
  <rect x="10" y="110" width="60" height="60" rx="4" fill="none" stroke="#60a5fa" stroke-width="4"/>
  <rect x="20" y="120" width="40" height="40" rx="2" fill="#60a5fa"/>
  <g fill="#60a5fa">
    <rect x="80" y="10" width="10" height="10"/>
    <rect x="100" y="10" width="10" height="10"/>
    <rect x="80" y="30" width="10" height="10"/>
    <rect x="100" y="30" width="10" height="10"/>
    <rect x="80" y="50" width="10" height="10"/>
    <rect x="90" y="50" width="10" height="10"/>
    <rect x="80" y="80" width="10" height="10"/>
    <rect x="100" y="80" width="10" height="10"/>
    <rect x="110" y="80" width="10" height="10"/>
    <rect x="130" y="80" width="10" height="10"/>
    <rect x="150" y="80" width="10" height="10"/>
    <rect x="160" y="80" width="10" height="10"/>
    <rect x="80" y="100" width="10" height="10"/>
    <rect x="90" y="100" width="10" height="10"/>
    <rect x="110" y="100" width="10" height="10"/>
    <rect x="80" y="120" width="10" height="10"/>
    <rect x="100" y="120" width="10" height="10"/>
    <rect x="120" y="120" width="10" height="10"/>
    <rect x="140" y="120" width="10" height="10"/>
    <rect x="160" y="120" width="10" height="10"/>
    <rect x="80" y="140" width="10" height="10"/>
    <rect x="90" y="140" width="10" height="10"/>
    <rect x="110" y="140" width="10" height="10"/>
    <rect x="130" y="140" width="10" height="10"/>
    <rect x="150" y="140" width="10" height="10"/>
    <rect x="80" y="160" width="10" height="10"/>
    <rect x="100" y="160" width="10" height="10"/>
    <rect x="120" y="160" width="10" height="10"/>
    <rect x="140" y="160" width="10" height="10"/>
  </g>
</svg>`)}`;

// ── Recovery code generator (client preview — server must issue real ones) ───
function genRecoveryCodes() {
  return Array.from({ length: 8 }, () =>
    Array.from({ length: 4 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase()
    ).join('-')
  );
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, body, method = 'POST') {
  const token = sessionStorage.getItem('nexus_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    throw Object.assign(new Error(data.message || STRINGS.errorGeneric), {
      status: res.status,
      code: data.code,
    });
  }
  return data;
}

// ── Shared UI primitives ─────────────────────────────────────────────────────
const styles = {
  overlay: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    background: 'rgba(15,23,42,0.95)',
    border: '1px solid rgba(96,165,250,0.2)',
    borderRadius: '16px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
    color: '#f1f5f9',
  },
  logo: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '700',
    background: 'linear-gradient(90deg, #60a5fa, #a78bfa)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.5px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '24px',
    textAlign: 'center',
    color: '#e2e8f0',
  },
  fieldset: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '500',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(71,85,105,0.6)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#60a5fa',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(71,85,105,0.6)',
    borderRadius: '8px',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '11px 16px',
    borderRadius: '8px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnPrimary: {
    background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
    color: '#fff',
  },
  btnSecondary: {
    background: 'rgba(30,41,59,0.9)',
    color: '#94a3b8',
    border: '1px solid rgba(71,85,105,0.5)',
  },
  btnSocial: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(71,85,105,0.5)',
    color: '#cbd5e1',
    fontSize: '13px',
    cursor: 'pointer',
    width: '100%',
    marginBottom: '8px',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '20px 0',
    color: '#475569',
    fontSize: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(71,85,105,0.5)',
  },
  error: {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: '13px',
    marginBottom: '16px',
  },
  success: {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.4)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#86efac',
    fontSize: '13px',
    marginBottom: '16px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '16px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  strengthBar: {
    height: '4px',
    borderRadius: '2px',
    marginTop: '6px',
    transition: 'width 0.3s, background 0.3s',
  },
  strengthLabel: {
    fontSize: '11px',
    marginTop: '4px',
    fontWeight: '500',
  },
  codeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
    marginBottom: '20px',
  },
  codeItem: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(71,85,105,0.4)',
    borderRadius: '6px',
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#93c5fd',
    textAlign: 'center',
  },
  qrWrap: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  biometricCard: {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(71,85,105,0.4)',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  biometricIcon: {
    fontSize: '28px',
    lineHeight: 1,
  },
  biometricInfo: {
    flex: 1,
  },
  biometricTitle: {
    fontWeight: '600',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  biometricSub: {
    fontSize: '12px',
    color: '#64748b',
  },
};

// ── FocusInput wrapper (tracks focus for border highlight) ───────────────────
function Input({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      style={{
        ...styles.input,
        ...(focused ? styles.inputFocus : {}),
        ...style,
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...props}
    />
  );
}

// ── Password strength meter ──────────────────────────────────────────────────
function PasswordStrength({ password }) {
  const { score, label, color } = calcPasswordStrength(password);
  const pct = Math.round((score / 6) * 100);
  if (!password) return null;
  return (
    <div>
      <div
        style={{
          ...styles.strengthBar,
          width: `${pct}%`,
          background: color,
        }}
      />
      <div style={{ ...styles.strengthLabel, color }}>{label}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: Login
// ══════════════════════════════════════════════════════════════════════════════
function LoginScreen({ onSuccess, onNavigate, onAuthFailure }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', { email, password, remember });
      if (data.mfaRequired) {
        onNavigate('mfa-verify', { userId: data.userId, tempToken: data.tempToken });
        return;
      }
      sessionStorage.setItem('nexus_token', data.token);
      if (data.user) onSuccess(data.user);
    } catch (err) {
      const msg =
        err.status === 401 ? STRINGS.errorInvalidCredentials : (err.message || STRINGS.errorGeneric);
      setError(msg);
      if (onAuthFailure) onAuthFailure(err);
    } finally {
      setLoading(false);
    }
  }, [email, password, remember, onSuccess, onNavigate, onAuthFailure]);

  const handleBiometric = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setError(STRINGS.biometricUnavailable);
      return;
    }
    setLoading(true);
    try {
      const challengeResp = await apiFetch('/api/auth/biometric/challenge', { email }, 'POST');
      const challenge = Uint8Array.from(atob(challengeResp.challenge), c => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: challengeResp.allowCredentials || [],
          userVerification: 'preferred',
          timeout: 60000,
        },
      });
      const data = await apiFetch('/api/auth/biometric/verify', {
        id: assertion.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
        type: assertion.type,
        response: {
          authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
          signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature))),
          userHandle: assertion.response.userHandle
            ? btoa(String.fromCharCode(...new Uint8Array(assertion.response.userHandle)))
            : null,
        },
      });
      sessionStorage.setItem('nexus_token', data.token);
      onSuccess(data.user);
    } catch (err) {
      setError(err.message || STRINGS.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [email, onSuccess]);

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}`;
  };

  return (
    <form onSubmit={handleLogin}>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.email}</label>
        <Input
          type="email"
          placeholder={STRINGS.emailPlaceholder}
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      <div style={styles.fieldset}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={styles.label}>{STRINGS.password}</span>
          <button
            type="button"
            style={styles.link}
            onClick={() => onNavigate('password-change')}
          >
            {STRINGS.forgotPassword}
          </button>
        </div>
        <Input
          type="password"
          placeholder={STRINGS.passwordPlaceholder}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>

      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={remember}
          onChange={e => setRemember(e.target.checked)}
          style={{ accentColor: '#60a5fa' }}
        />
        {STRINGS.rememberMe}
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.btn,
          ...styles.btnPrimary,
          marginBottom: '12px',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? STRINGS.loading : STRINGS.login}
      </button>

      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSecondary, marginBottom: '20px' }}
        onClick={handleBiometric}
        disabled={loading}
      >
        🔑 {STRINGS.signInWithBiometric}
      </button>

      <div style={styles.divider}>
        <div style={styles.dividerLine} />
        <span>or</span>
        <div style={styles.dividerLine} />
      </div>

      <button type="button" style={styles.btnSocial} onClick={() => handleOAuth('google')}>
        <span>🌐</span> {STRINGS.signInWithGoogle}
      </button>
      <button type="button" style={styles.btnSocial} onClick={() => handleOAuth('github')}>
        <span>🐙</span> {STRINGS.signInWithGitHub}
      </button>
      <button type="button" style={styles.btnSocial} onClick={() => handleOAuth('discord')}>
        <span>💬</span> {STRINGS.signInWithDiscord}
      </button>

      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <button type="button" style={styles.link} onClick={() => onNavigate('register')}>
          {STRINGS.noAccount}
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: Register
// ══════════════════════════════════════════════════════════════════════════════
function RegisterScreen({ onSuccess, onNavigate, onAuthFailure }) {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    language: 'en',
    terms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const set = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }));

  const validate = () => {
    const errs = {};
    if (!USERNAME_RE.test(form.username))
      errs.username = 'Username must be 1–40 characters (letters, numbers, emoji, _ - . allowed)';
    if (!form.email.includes('@')) errs.email = 'Invalid email address';
    if (!isPasswordValid(form.password)) errs.password = STRINGS.errorWeakPassword;
    if (form.password !== form.confirmPassword) errs.confirmPassword = STRINGS.passwordMismatch;
    if (!form.terms) errs.terms = 'You must accept the terms';
    return errs;
  };

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/api/auth/register', {
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
        language: form.language,
      });
      sessionStorage.setItem('nexus_token', data.token);
      onNavigate('mfa-setup', { user: data.user });
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') {
        setFieldErrors((p) => ({ ...p, username: STRINGS.errorUsernameTaken }));
      } else if (err.code === 'EMAIL_TAKEN') {
        setFieldErrors((p) => ({ ...p, email: STRINGS.errorEmailTaken }));
      } else {
        setError(err.message || STRINGS.errorGeneric);
      }
      if (onAuthFailure) onAuthFailure(err);
    } finally {
      setLoading(false);
    }
  }, [form, onNavigate, onAuthFailure]);

  const strength = calcPasswordStrength(form.password);

  return (
    <form onSubmit={handleRegister}>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.username}</label>
        <Input
          type="text"
          placeholder={STRINGS.usernamePlaceholder}
          value={form.username}
          onChange={set('username')}
          required
          autoComplete="username"
        />
        {fieldErrors.username && (
          <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
            {fieldErrors.username}
          </div>
        )}
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.email}</label>
        <Input
          type="email"
          placeholder={STRINGS.emailPlaceholder}
          value={form.email}
          onChange={set('email')}
          required
          autoComplete="email"
        />
        {fieldErrors.email && (
          <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
            {fieldErrors.email}
          </div>
        )}
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.password}</label>
        <Input
          type="password"
          placeholder={STRINGS.passwordPlaceholder}
          value={form.password}
          onChange={set('password')}
          required
          autoComplete="new-password"
        />
        <PasswordStrength password={form.password} />
        <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px' }}>
          {STRINGS.passwordRequirements}
        </div>
        {fieldErrors.password && (
          <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
            {fieldErrors.password}
          </div>
        )}
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.confirmPassword}</label>
        <Input
          type="password"
          placeholder="Repeat password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          required
          autoComplete="new-password"
        />
        {fieldErrors.confirmPassword && (
          <div style={{ color: '#f87171', fontSize: '12px', marginTop: '4px' }}>
            {fieldErrors.confirmPassword}
          </div>
        )}
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>Role</label>
        <select
          style={styles.select}
          value={form.role}
          onChange={set('role')}
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value} disabled={r.disabled}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.language}</label>
        <select style={styles.select} value={form.language} onChange={set('language')}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <label style={styles.checkRow}>
        <input
          type="checkbox"
          checked={form.terms}
          onChange={set('terms')}
          style={{ accentColor: '#60a5fa' }}
        />
        {STRINGS.terms}
      </label>
      {fieldErrors.terms && (
        <div style={{ color: '#f87171', fontSize: '12px', marginBottom: '12px' }}>
          {fieldErrors.terms}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.btn,
          ...styles.btnPrimary,
          marginBottom: '12px',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? STRINGS.loading : STRINGS.createAccount}
      </button>

      <div style={{ textAlign: 'center' }}>
        <button type="button" style={styles.link} onClick={() => onNavigate('login')}>
          {STRINGS.alreadyHaveAccount}
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: MFA Setup
// ══════════════════════════════════════════════════════════════════════════════
function MFASetupScreen({ ctx, onSuccess, onNavigate }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCodes] = useState(genRecoveryCodes);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCodeChange = useCallback(async (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/api/auth/mfa/setup', { code: digits });
        sessionStorage.setItem('nexus_token', data.token);
        onNavigate('biometric-setup', { user: data.user || ctx?.user });
      } catch (err) {
        setError(STRINGS.errorInvalidMFA);
        setCode('');
      } finally {
        setLoading(false);
      }
    }
  }, [onNavigate, ctx]);

  return (
    <div>
      <div style={styles.qrWrap}>
        <img
          src={QR_PLACEHOLDER_SVG}
          alt="QR Code"
          style={{ borderRadius: '8px', border: '2px solid rgba(96,165,250,0.3)' }}
        />
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>
          {STRINGS.mfaScanQR}
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.mfaEnterCode}</label>
        <Input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="000000"
          value={code}
          onChange={e => handleCodeChange(e.target.value)}
          maxLength={6}
          style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '20px' }}
          disabled={loading}
          autoComplete="one-time-code"
        />
      </div>

      <p style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '10px' }}>
        {STRINGS.mfaRecoveryCodes}
      </p>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
        {STRINGS.mfaRecoveryNote}
      </p>
      <div style={styles.codeGrid}>
        {recoveryCodes.map((c, i) => (
          <div key={i} style={styles.codeItem}>{c}</div>
        ))}
      </div>

      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSecondary }}
        onClick={() => onNavigate('login')}
      >
        {STRINGS.back}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: MFA Verify (at login)
// ══════════════════════════════════════════════════════════════════════════════
function MFAVerifyScreen({ ctx, onSuccess, onNavigate }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCodeChange = useCallback(async (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/api/auth/login/mfa', {
          code: digits,
          userId: ctx?.userId,
          tempToken: ctx?.tempToken,
        });
        sessionStorage.setItem('nexus_token', data.token);
        onSuccess(data.user);
      } catch (err) {
        setError(STRINGS.errorInvalidMFA);
        setCode('');
      } finally {
        setLoading(false);
      }
    }
  }, [ctx, onSuccess]);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', textAlign: 'center' }}>
        {STRINGS.mfaEnterCode}
      </p>
      <Input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="000000"
        value={code}
        onChange={e => handleCodeChange(e.target.value)}
        maxLength={6}
        style={{ textAlign: 'center', letterSpacing: '0.4em', fontSize: '20px', marginBottom: '16px' }}
        disabled={loading}
        autoComplete="one-time-code"
      />
      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSecondary }}
        onClick={() => onNavigate('login')}
      >
        {STRINGS.back}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: Biometric Setup
// ══════════════════════════════════════════════════════════════════════════════
function BiometricSetupScreen({ ctx, onSuccess, onNavigate }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const webAuthnAvailable = !!window.PublicKeyCredential;

  const handleRegister = useCallback(async (type) => {
    if (!webAuthnAvailable) {
      setError(STRINGS.biometricUnavailable);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const optsResp = await apiFetch('/api/auth/biometric/register/begin', { type });
      const challenge = Uint8Array.from(atob(optsResp.challenge), c => c.charCodeAt(0));
      const userId = Uint8Array.from(atob(optsResp.userId), c => c.charCodeAt(0));

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: STRINGS.appName, id: window.location.hostname },
          user: { id: userId, name: optsResp.username, displayName: optsResp.username },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' },  // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: type === 'fingerprint' ? 'platform' : undefined,
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      await apiFetch('/api/auth/biometric/register/complete', {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        type: credential.type,
        response: {
          attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject))),
          clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
        },
      });

      setSuccessMsg(STRINGS.successBiometric);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric permission denied or cancelled.');
      } else {
        setError(err.message || STRINGS.errorGeneric);
      }
    } finally {
      setLoading(false);
    }
  }, [webAuthnAvailable]);

  const handleSkip = () => {
    const user = ctx?.user;
    if (user) onSuccess(user);
    else onNavigate('login');
  };

  const options = [
    { type: 'fingerprint', icon: '🫆', title: STRINGS.biometricFingerprint, sub: 'Touch sensor or platform authenticator', disabled: false },
    { type: 'face',        icon: '🪪', title: STRINGS.biometricFaceId,       sub: 'Camera-based facial recognition',         disabled: false },
    { type: 'retinal',     icon: '👁️', title: STRINGS.biometricRetinal,      sub: 'Retinal scanning hardware required',      disabled: true  },
  ];

  return (
    <div>
      {!webAuthnAvailable && (
        <div style={{ ...styles.error, marginBottom: '16px' }}>{STRINGS.biometricUnavailable}</div>
      )}
      {error && <div style={styles.error}>{error}</div>}
      {successMsg && <div style={styles.success}>{successMsg}</div>}

      {options.map((o) => (
        <div
          key={o.type}
          style={{
            ...styles.biometricCard,
            opacity: o.disabled || !webAuthnAvailable ? 0.45 : 1,
            cursor: o.disabled || !webAuthnAvailable ? 'not-allowed' : 'pointer',
            borderColor: loading ? 'rgba(71,85,105,0.4)' : undefined,
          }}
          onClick={() => !o.disabled && !loading && webAuthnAvailable && handleRegister(o.type)}
          role="button"
          tabIndex={o.disabled ? -1 : 0}
          onKeyDown={e => e.key === 'Enter' && !o.disabled && !loading && webAuthnAvailable && handleRegister(o.type)}
          aria-disabled={o.disabled || !webAuthnAvailable}
        >
          <span style={styles.biometricIcon}>{o.icon}</span>
          <div style={styles.biometricInfo}>
            <div style={styles.biometricTitle}>
              {o.title}
              {o.disabled && (
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>
                  coming soon
                </span>
              )}
            </div>
            <div style={styles.biometricSub}>{o.sub}</div>
          </div>
          <span style={{ color: '#475569' }}>›</span>
        </div>
      ))}

      <button
        type="button"
        style={{ ...styles.btn, ...styles.btnSecondary, marginTop: '8px' }}
        onClick={handleSkip}
        disabled={loading}
      >
        {STRINGS.biometricSkip}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Screen: Password Change / Reset
// ══════════════════════════════════════════════════════════════════════════════
function PasswordChangeScreen({ onNavigate }) {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    if (form.next !== form.confirm) { setError(STRINGS.passwordMismatch); return; }
    if (!isPasswordValid(form.next)) { setError(STRINGS.errorWeakPassword); return; }
    setLoading(true);
    try {
      await apiFetch('/api/auth/password/change', {
        currentPassword: form.current,
        newPassword: form.next,
      });
      setSuccess('Password updated successfully.');
      setTimeout(() => onNavigate('login'), 2000);
    } catch (err) {
      setError(err.message || STRINGS.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [form, onNavigate]);

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.currentPassword}</label>
        <Input type="password" value={form.current} onChange={set('current')} required autoComplete="current-password" />
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.newPassword}</label>
        <Input type="password" placeholder={STRINGS.passwordPlaceholder} value={form.next} onChange={set('next')} required autoComplete="new-password" />
        <PasswordStrength password={form.next} />
      </div>

      <div style={styles.fieldset}>
        <label style={styles.label}>{STRINGS.confirmPassword}</label>
        <Input type="password" value={form.confirm} onChange={set('confirm')} required autoComplete="new-password" />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ ...styles.btn, ...styles.btnPrimary, marginBottom: '12px', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? STRINGS.loading : STRINGS.changePassword}
      </button>
      <button type="button" style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => onNavigate('login')}>
        {STRINGS.back}
      </button>
    </form>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Root: AuthSystem
// ══════════════════════════════════════════════════════════════════════════════
const SCREEN_TITLES = {
  login: STRINGS.login,
  register: STRINGS.register,
  'mfa-setup': STRINGS.mfaSetup,
  'mfa-verify': STRINGS.mfaVerify,
  'biometric-setup': STRINGS.biometricSetup,
  'password-change': STRINGS.passwordChange,
};

export default function AuthSystem({
  onAuthSuccess,
  onAuthFailure,
  initialScreen = 'login',
}) {
  const [screen, setScreen] = useState(initialScreen);
  const [ctx, setCtx] = useState(null);

  const navigate = useCallback((next, context = null) => {
    setScreen(next);
    if (context) setCtx(context);
  }, []);

  const screenProps = { ctx, onSuccess: onAuthSuccess, onNavigate: navigate, onAuthFailure };

  const body = (() => {
    switch (screen) {
    case 'register':        return <RegisterScreen      {...screenProps} />;
    case 'mfa-setup':       return <MFASetupScreen      {...screenProps} />;
    case 'mfa-verify':      return <MFAVerifyScreen     {...screenProps} />;
    case 'biometric-setup': return <BiometricSetupScreen {...screenProps} />;
    case 'password-change': return <PasswordChangeScreen {...screenProps} />;
    default:                return <LoginScreen          {...screenProps} />;
    }
  })();

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <div style={styles.logoText}>🛡️ {STRINGS.appName}</div>
        </div>
        <h2 style={styles.title}>{SCREEN_TITLES[screen] || STRINGS.login}</h2>
        {body}
      </div>
    </div>
  );
}
