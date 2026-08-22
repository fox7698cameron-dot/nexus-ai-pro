/**
 * filename: src/auth/AuthSystem.jsx
 * purpose:  Comprehensive authentication system for Nexus AI Pro.
 *           Covers registration, role-based login, biometric auth (WebAuthn/FIDO2),
 *           2FA/MFA (TOTP, SMS placeholder, Email OTP), session management,
 *           password reset, and account recovery.
 * date:     2026-08-22
 * copyright: Copyright (c) 2026 Nexus AI Pro. All rights reserved.
 *
 * SECURITY NOTES
 * - JWT tokens are stored in httpOnly cookies set by the server. This component
 *   never reads or writes tokens to localStorage or sessionStorage.
 * - WebAuthn credentials are hardware-bound and never leave the authenticator.
 * - All server calls use credentials:'include' to send the httpOnly cookie.
 * - No secrets, keys, or credentials are hardcoded in this file.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { validatePassword, validateUsername, generateSecureToken } from './passwordUtils.js';

// ---------------------------------------------------------------------------
// i18n stub — replace with your i18n library (react-i18next, etc.)
// ---------------------------------------------------------------------------
const translations = {
  en: {
    login: 'Log In',
    register: 'Create Account',
    email: 'Email address',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm password',
    language: 'Language / Region',
    role: 'Account type',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    setupMFA: 'Set up two-factor authentication',
    setupBiometric: 'Set up biometric login',
    pin: 'PIN (6 digits)',
    totpCode: 'Authenticator code',
    smsCode: 'SMS code',
    emailOTP: 'Email verification code',
    submit: 'Submit',
    cancel: 'Cancel',
    logout: 'Log out',
    sessionExpired: 'Your session has expired. Please log in again.',
    errors: {
      required: 'This field is required.',
      emailInvalid: 'Enter a valid email address.',
      passwordMismatch: 'Passwords do not match.',
      pinLength: 'PIN must be exactly 6 digits.',
      generic: 'Something went wrong. Please try again.',
      biometricNotSupported: 'Biometric authentication is not supported on this device.',
      webauthnFailed: 'Biometric verification failed. Please try again or use your PIN.',
    },
  },
};

function useTranslation(locale = 'en') {
  const t = useCallback(
    (key) => {
      const parts = key.split('.');
      let node = translations[locale] || translations.en;
      for (const part of parts) {
        node = node?.[part];
      }
      return node ?? key;
    },
    [locale]
  );
  return { t };
}

// ---------------------------------------------------------------------------
// Auth state machine
// ---------------------------------------------------------------------------

const INITIAL_STATE = {
  user: null,
  role: null,         // 'admin' | 'developer' | 'moderator' | 'user'
  status: 'idle',    // 'idle' | 'loading' | 'authenticated' | 'mfa-required' | 'error'
  mfaMethod: null,   // 'totp' | 'sms' | 'email'
  error: null,
  sessionExpiresAt: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'AUTHENTICATED':
      return {
        ...state,
        status: 'authenticated',
        user: action.payload.user,
        role: action.payload.role,
        sessionExpiresAt: action.payload.sessionExpiresAt,
        error: null,
        mfaMethod: null,
      };
    case 'MFA_REQUIRED':
      return { ...state, status: 'mfa-required', mfaMethod: action.payload.method, error: null };
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'LOGOUT':
      return { ...INITIAL_STATE };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Auth context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

/**
 * useAuth — hook that returns the auth context.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Session timeout handler
// ---------------------------------------------------------------------------

const SESSION_WARNING_MS = 2 * 60 * 1000; // warn 2 min before expiry

function useSessionTimeout(sessionExpiresAt, onExpire) {
  const timerRef = useRef(null);
  const warnRef = useRef(null);

  useEffect(() => {
    if (!sessionExpiresAt) return;

    const now = Date.now();
    const expiresAt = new Date(sessionExpiresAt).getTime();
    const remaining = expiresAt - now;

    if (remaining <= 0) {
      onExpire();
      return;
    }

    const warnIn = Math.max(0, remaining - SESSION_WARNING_MS);

    warnRef.current = setTimeout(() => {
      // Dispatch a custom event so UI can show a warning banner
      window.dispatchEvent(new CustomEvent('nexus:session-warning'));
    }, warnIn);

    timerRef.current = setTimeout(onExpire, remaining);

    return () => {
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
    };
  }, [sessionExpiresAt, onExpire]);
}

// ---------------------------------------------------------------------------
// API helpers (all calls use httpOnly cookie via credentials:'include')
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  const res = await fetch(`/api/auth${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

/** Supported IANA language/region tags shown on registration. */
const SUPPORTED_LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'es-MX', label: 'Español (México)' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'zh-TW', label: '中文 (繁體)' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ar-SA', label: 'العربية' },
];

const ROLES = [
  { value: 'user', label: 'Regular User' },
  { value: 'developer', label: 'Developer' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Administrator' },
];

/** Roles that require MFA on every login. */
const MFA_REQUIRED_ROLES = new Set(['admin', 'developer']);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, INITIAL_STATE);
  const [locale, setLocale] = useState('en-US');

  // Restore session on mount
  useEffect(() => {
    apiFetch('/session')
      .then((data) => {
        if (data.user) {
          dispatch({
            type: 'AUTHENTICATED',
            payload: {
              user: data.user,
              role: data.role,
              sessionExpiresAt: data.sessionExpiresAt,
            },
          });
          setLocale(data.user.locale || 'en-US');
        }
      })
      .catch(() => {
        // No active session — remain idle
      });
  }, []);

  const handleExpire = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    window.dispatchEvent(new CustomEvent('nexus:session-expired'));
  }, []);

  useSessionTimeout(state.sessionExpiresAt, handleExpire);

  // ----- Actions -----

  const login = useCallback(async ({ email, password, role }) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, role }),
      });

      if (data.mfaRequired) {
        dispatch({ type: 'MFA_REQUIRED', payload: { method: data.mfaMethod } });
        return { mfaRequired: true };
      }

      dispatch({
        type: 'AUTHENTICATED',
        payload: { user: data.user, role: data.role, sessionExpiresAt: data.sessionExpiresAt },
      });
      return { mfaRequired: false };
    } catch (err) {
      dispatch({ type: 'ERROR', payload: err.message });
      throw err;
    }
  }, []);

  const verifyMFA = useCallback(async ({ code, method }) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await apiFetch('/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code, method }),
      });
      dispatch({
        type: 'AUTHENTICATED',
        payload: { user: data.user, role: data.role, sessionExpiresAt: data.sessionExpiresAt },
      });
    } catch (err) {
      dispatch({ type: 'ERROR', payload: err.message });
      throw err;
    }
  }, []);

  const register = useCallback(async (formData) => {
    dispatch({ type: 'LOADING' });
    try {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      dispatch({
        type: 'AUTHENTICATED',
        payload: { user: data.user, role: data.role, sessionExpiresAt: data.sessionExpiresAt },
      });
      setLocale(formData.locale || 'en-US');
    } catch (err) {
      dispatch({ type: 'ERROR', payload: err.message });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/logout', { method: 'POST' });
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    return apiFetch('/password-reset/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const confirmPasswordReset = useCallback(async ({ token, newPassword }) => {
    return apiFetch('/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }, []);

  const value = {
    ...state,
    locale,
    login,
    logout,
    register,
    verifyMFA,
    requestPasswordReset,
    confirmPasswordReset,
    MFA_REQUIRED_ROLES,
    SUPPORTED_LOCALES,
    ROLES,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    backgroundColor: 'var(--color-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'var(--color-surface, #1a1f2e)',
    borderRadius: '1rem',
    padding: '2rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1.5rem',
    textAlign: 'center',
    color: 'var(--color-accent, #7c3aed)',
  },
  field: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    marginBottom: '0.3rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--color-text-muted, #94a3b8)',
  },
  input: {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'var(--color-input-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '0.65rem 0.875rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'var(--color-input-bg, #0f1117)',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  btn: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: 'none',
    backgroundColor: 'var(--color-accent, #7c3aed)',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
    transition: 'opacity 0.15s',
  },
  btnSecondary: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    border: '1.5px solid var(--color-border, #2d3748)',
    backgroundColor: 'transparent',
    color: 'var(--color-text, #e2e8f0)',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: {
    color: '#f87171',
    fontSize: '0.825rem',
    marginTop: '0.3rem',
  },
  strengthBar: {
    height: '4px',
    borderRadius: '2px',
    marginTop: '0.4rem',
    transition: 'width 0.3s, background-color 0.3s',
  },
  link: {
    background: 'none',
    border: 'none',
    color: 'var(--color-accent, #7c3aed)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    textDecoration: 'underline',
    padding: 0,
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '1rem',
  },
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <p role="alert" aria-live="polite" style={styles.error}>
      {message}
    </p>
  );
}

function PasswordStrengthMeter({ strength, score }) {
  const colorMap = {
    weak: '#ef4444',
    fair: '#f97316',
    strong: '#22c55e',
    'very-strong': '#10b981',
  };
  const widthMap = { weak: '25%', fair: '50%', strong: '75%', 'very-strong': '100%' };

  if (!strength) return null;
  return (
    <div
      role="meter"
      aria-label={`Password strength: ${strength}`}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        style={{
          ...styles.strengthBar,
          width: widthMap[strength] || '0%',
          backgroundColor: colorMap[strength] || '#4b5563',
        }}
      />
      <span style={{ fontSize: '0.75rem', color: colorMap[strength] }}>
        {strength.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LoginForm
// ---------------------------------------------------------------------------

/**
 * LoginForm — handles role-based login routing.
 * Admin/developer flows enforce MFA after credential verification.
 * On success, routes to a role-specific dashboard via onSuccess callback.
 *
 * @param {{ onSuccess: (role: string) => void, onForgotPassword: () => void, onRegister: () => void }} props
 */
export function LoginForm({ onSuccess, onForgotPassword, onRegister }) {
  const { login, verifyMFA, status, error, mfaMethod, MFA_REQUIRED_ROLES } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [mfaCode, setMfaCode] = useState('');
  const [localError, setLocalError] = useState('');
  const [showMFA, setShowMFA] = useState(false);
  const [currentMFAMethod, setCurrentMFAMethod] = useState(null);

  // Listen for session expiry
  useEffect(() => {
    const handler = () => setLocalError(t('sessionExpired'));
    window.addEventListener('nexus:session-expired', handler);
    return () => window.removeEventListener('nexus:session-expired', handler);
  }, [t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError(t('errors.required'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError(t('errors.emailInvalid'));
      return;
    }

    try {
      const result = await login({ email, password, role });
      if (result.mfaRequired) {
        setShowMFA(true);
        setCurrentMFAMethod(mfaMethod);
      } else {
        onSuccess?.(role);
      }
    } catch (err) {
      setLocalError(err.message || t('errors.generic'));
    }
  };

  const handleMFASubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    if (!mfaCode) {
      setLocalError(t('errors.required'));
      return;
    }
    try {
      await verifyMFA({ code: mfaCode, method: currentMFAMethod });
      onSuccess?.(role);
    } catch (err) {
      setLocalError(err.message || t('errors.generic'));
    }
  };

  if (showMFA) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading} id="mfa-heading">
            {t('setupMFA')}
          </h1>
          <form onSubmit={handleMFASubmit} aria-labelledby="mfa-heading" noValidate>
            <div style={styles.field}>
              <label htmlFor="mfa-code" style={styles.label}>
                {currentMFAMethod === 'totp' && t('totpCode')}
                {currentMFAMethod === 'sms' && t('smsCode')}
                {currentMFAMethod === 'email' && t('emailOTP')}
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                style={styles.input}
                aria-required="true"
                aria-describedby="mfa-error"
              />
            </div>
            {(localError || error) && (
              <FieldError message={localError || error} />
            )}
            <button
              type="submit"
              style={styles.btn}
              disabled={status === 'loading'}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Verifying…' : t('submit')}
            </button>
            <button
              type="button"
              style={styles.btnSecondary}
              onClick={() => setShowMFA(false)}
            >
              {t('cancel')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading} id="login-heading">
          {t('login')}
        </h1>
        <form onSubmit={handleSubmit} aria-labelledby="login-heading" noValidate>
          {/* Role selector — drives backend route selection */}
          <div style={styles.field}>
            <label htmlFor="login-role" style={styles.label}>
              {t('role')}
            </label>
            <select
              id="login-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.select}
              aria-describedby="role-hint"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}{MFA_REQUIRED_ROLES.has(r.value) ? ' (MFA required)' : ''}
                </option>
              ))}
            </select>
            <span id="role-hint" style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Admin and Developer accounts require two-factor authentication.
            </span>
          </div>

          <div style={styles.field}>
            <label htmlFor="login-email" style={styles.label}>
              {t('email')}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              aria-required="true"
            />
          </div>

          <div style={styles.field}>
            <label htmlFor="login-password" style={styles.label}>
              {t('password')}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              aria-required="true"
            />
          </div>

          {(localError || error) && <FieldError message={localError || error} />}

          <button
            type="submit"
            style={styles.btn}
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Logging in…' : t('login')}
          </button>

          <div style={styles.row}>
            <button type="button" style={styles.link} onClick={onForgotPassword}>
              {t('forgotPassword')}
            </button>
            <button type="button" style={styles.link} onClick={onRegister}>
              {t('register')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RegisterForm
// ---------------------------------------------------------------------------

/**
 * RegisterForm — new account creation with password strength, Unicode username,
 * email validation, and language/region picker.
 *
 * @param {{ onSuccess: () => void, onLogin: () => void }} props
 */
export function RegisterForm({ onSuccess, onLogin }) {
  const { register, status, error } = useAuth();
  const { t } = useTranslation();

  const [fields, setFields] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    locale: 'en-US',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pwStrength, setPwStrength] = useState(null);
  const [localError, setLocalError] = useState('');

  const set = (key) => (e) => {
    const val = e.target.value;
    setFields((f) => ({ ...f, [key]: val }));

    // Live password strength feedback
    if (key === 'password') {
      const result = validatePassword(val);
      setPwStrength(result);
    }
  };

  const validate = () => {
    const errs = {};

    const usernameResult = validateUsername(fields.username);
    if (!usernameResult.valid) errs.username = usernameResult.issues[0];

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      errs.email = t('errors.emailInvalid');
    }

    const pwResult = validatePassword(fields.password);
    if (!pwResult.valid) errs.password = pwResult.issues[0];

    if (fields.password !== fields.confirmPassword) {
      errs.confirmPassword = t('errors.passwordMismatch');
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    try {
      await register({
        username: fields.username.normalize('NFC').trim(),
        email: fields.email.toLowerCase().trim(),
        password: fields.password, // server will hash via bcrypt
        role: fields.role,
        locale: fields.locale,
      });
      onSuccess?.();
    } catch (err) {
      setLocalError(err.message || t('errors.generic'));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading} id="register-heading">
          {t('register')}
        </h1>
        <form onSubmit={handleSubmit} aria-labelledby="register-heading" noValidate>
          {/* Username */}
          <div style={styles.field}>
            <label htmlFor="reg-username" style={styles.label}>
              {t('username')}
            </label>
            <input
              id="reg-username"
              type="text"
              autoComplete="username"
              value={fields.username}
              onChange={set('username')}
              maxLength={50}
              style={styles.input}
              aria-required="true"
              aria-describedby="reg-username-error reg-username-hint"
            />
            <span id="reg-username-hint" style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Supports letters, numbers, emojis, hyphens, underscores, dots.
            </span>
            <FieldError message={fieldErrors.username} />
          </div>

          {/* Email */}
          <div style={styles.field}>
            <label htmlFor="reg-email" style={styles.label}>
              {t('email')}
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              value={fields.email}
              onChange={set('email')}
              style={styles.input}
              aria-required="true"
              aria-describedby="reg-email-error"
            />
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password */}
          <div style={styles.field}>
            <label htmlFor="reg-password" style={styles.label}>
              {t('password')}
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={fields.password}
              onChange={set('password')}
              style={styles.input}
              aria-required="true"
              aria-describedby="reg-password-error reg-pw-strength"
            />
            <div id="reg-pw-strength">
              {pwStrength && (
                <PasswordStrengthMeter strength={pwStrength.strength} score={pwStrength.score} />
              )}
            </div>
            <FieldError message={fieldErrors.password} />
          </div>

          {/* Confirm Password */}
          <div style={styles.field}>
            <label htmlFor="reg-confirm-password" style={styles.label}>
              {t('confirmPassword')}
            </label>
            <input
              id="reg-confirm-password"
              type="password"
              autoComplete="new-password"
              value={fields.confirmPassword}
              onChange={set('confirmPassword')}
              style={styles.input}
              aria-required="true"
              aria-describedby="reg-confirm-error"
            />
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          {/* Role */}
          <div style={styles.field}>
            <label htmlFor="reg-role" style={styles.label}>
              {t('role')}
            </label>
            <select
              id="reg-role"
              value={fields.role}
              onChange={set('role')}
              style={styles.select}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Language / Region */}
          <div style={styles.field}>
            <label htmlFor="reg-locale" style={styles.label}>
              {t('language')}
            </label>
            <select
              id="reg-locale"
              value={fields.locale}
              onChange={set('locale')}
              style={styles.select}
            >
              {SUPPORTED_LOCALES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {(localError || error) && <FieldError message={localError || error} />}

          <button
            type="submit"
            style={styles.btn}
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Creating account…' : t('register')}
          </button>

          <div style={styles.row}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Already have an account?</span>
            <button type="button" style={styles.link} onClick={onLogin}>
              {t('login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BiometricSetup
// ---------------------------------------------------------------------------

/**
 * Checks whether WebAuthn is available in the current browser.
 * @returns {boolean}
 */
function isWebAuthnAvailable() {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator.credentials?.create === 'function'
  );
}

/**
 * BiometricSetup — registers a WebAuthn credential (fingerprint / Face ID / Touch ID).
 * Falls back to a 6-digit PIN for devices without authenticator support.
 * Includes a retinal scan placeholder that hooks into a future hardware API.
 *
 * @param {{ onSuccess: () => void, onSkip: () => void }} props
 */
export function BiometricSetup({ onSuccess, onSkip }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const webAuthnSupported = isWebAuthnAvailable();

  const [mode, setMode] = useState(
    webAuthnSupported ? 'webauthn' : 'pin'
  ); // 'webauthn' | 'pin' | 'retinal'
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [error, setError] = useState('');

  // ---- WebAuthn registration ----
  const startWebAuthn = async () => {
    setError('');
    setStatus('loading');

    try {
      // 1. Fetch challenge from server
      const { challenge, rpId, rpName, userId, userName } = await apiFetch(
        '/webauthn/register/begin',
        { method: 'POST' }
      );

      // 2. Decode challenge (server sends Base64URL)
      const decodedChallenge = Uint8Array.from(
        atob(challenge.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );
      const decodedUserId = Uint8Array.from(
        atob(userId.replace(/-/g, '+').replace(/_/g, '/')),
        (c) => c.charCodeAt(0)
      );

      // 3. Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: decodedChallenge,
          rp: { id: rpId, name: rpName },
          user: {
            id: decodedUserId,
            name: userName,
            displayName: userName,
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },  // ES256
            { type: 'public-key', alg: -257 }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          attestation: 'none',
          timeout: 60000,
        },
      });

      // 4. Send attestation to server
      const attestationObj = credential.response.attestationObject;
      const clientDataJSON = credential.response.clientDataJSON;

      await apiFetch('/webauthn/register/complete', {
        method: 'POST',
        body: JSON.stringify({
          id: credential.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          type: credential.type,
          response: {
            attestationObject: btoa(
              String.fromCharCode(...new Uint8Array(attestationObj))
            ),
            clientDataJSON: btoa(
              String.fromCharCode(...new Uint8Array(clientDataJSON))
            ),
          },
        }),
      });

      setStatus('success');
      onSuccess?.();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Biometric prompt was dismissed. Please try again.');
      } else {
        setError(err.message || t('errors.webauthnFailed'));
      }
      setStatus('error');
    }
  };

  // ---- PIN setup ----
  const submitPIN = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(pin)) {
      setError(t('errors.pinLength'));
      return;
    }
    if (pin !== pinConfirm) {
      setError('PINs do not match.');
      return;
    }

    setStatus('loading');
    try {
      await apiFetch('/auth/pin/setup', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      });
      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setError(err.message || t('errors.generic'));
      setStatus('error');
    }
  };

  // ---- Retinal scan placeholder ----
  // This wires up to a future hardware/OS API (e.g., iris scanner SDK).
  // Currently returns a not-yet-supported message and records intent on the server.
  const startRetinalScan = async () => {
    setError('');
    setStatus('loading');
    try {
      // Hardware API hook — replace with vendor SDK call when available
      if (typeof window.__nexusRetinalScanAPI?.enroll === 'function') {
        const scanToken = await window.__nexusRetinalScanAPI.enroll({ userId: user?.id });
        await apiFetch('/auth/retinal/register', {
          method: 'POST',
          body: JSON.stringify({ scanToken }),
        });
        setStatus('success');
        onSuccess?.();
      } else {
        setError('Retinal scan hardware not detected on this device.');
        setStatus('idle');
      }
    } catch (err) {
      setError(err.message || t('errors.generic'));
      setStatus('error');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading} id="biometric-heading">
          {t('setupBiometric')}
        </h1>

        {/* Method selector tabs */}
        <div role="tablist" aria-label="Biometric method" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {webAuthnSupported && (
            <button
              role="tab"
              aria-selected={mode === 'webauthn'}
              onClick={() => setMode('webauthn')}
              style={{
                ...styles.btnSecondary,
                width: 'auto',
                flex: 1,
                borderColor: mode === 'webauthn' ? 'var(--color-accent, #7c3aed)' : undefined,
              }}
            >
              Fingerprint / Face ID
            </button>
          )}
          <button
            role="tab"
            aria-selected={mode === 'retinal'}
            onClick={() => setMode('retinal')}
            style={{
              ...styles.btnSecondary,
              width: 'auto',
              flex: 1,
              borderColor: mode === 'retinal' ? 'var(--color-accent, #7c3aed)' : undefined,
            }}
          >
            Retinal Scan
          </button>
          <button
            role="tab"
            aria-selected={mode === 'pin'}
            onClick={() => setMode('pin')}
            style={{
              ...styles.btnSecondary,
              width: 'auto',
              flex: 1,
              borderColor: mode === 'pin' ? 'var(--color-accent, #7c3aed)' : undefined,
            }}
          >
            PIN
          </button>
        </div>

        {/* WebAuthn panel */}
        {mode === 'webauthn' && (
          <div role="tabpanel">
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Use your device's built-in fingerprint reader, Face ID, or Touch ID for
              fast, passwordless login. Your biometric data never leaves this device.
            </p>
            <button
              type="button"
              style={styles.btn}
              onClick={startWebAuthn}
              disabled={status === 'loading'}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Waiting for authenticator…' : 'Register Biometric'}
            </button>
          </div>
        )}

        {/* Retinal scan panel */}
        {mode === 'retinal' && (
          <div role="tabpanel">
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Retinal scan requires compatible hardware. Connect your iris scanner
              device and click the button below to begin enrollment.
            </p>
            <button
              type="button"
              style={styles.btn}
              onClick={startRetinalScan}
              disabled={status === 'loading'}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Initializing scanner…' : 'Start Retinal Scan'}
            </button>
          </div>
        )}

        {/* PIN panel */}
        {mode === 'pin' && (
          <form onSubmit={submitPIN} role="tabpanel" aria-label="PIN setup">
            <div style={styles.field}>
              <label htmlFor="pin-input" style={styles.label}>
                {t('pin')}
              </label>
              <input
                id="pin-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={styles.input}
                aria-required="true"
                autoComplete="new-password"
              />
            </div>
            <div style={styles.field}>
              <label htmlFor="pin-confirm" style={styles.label}>
                Confirm PIN
              </label>
              <input
                id="pin-confirm"
                type="password"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, ''))}
                style={styles.input}
                aria-required="true"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              style={styles.btn}
              disabled={status === 'loading'}
              aria-busy={status === 'loading'}
            >
              {status === 'loading' ? 'Saving…' : 'Save PIN'}
            </button>
          </form>
        )}

        {error && <FieldError message={error} />}

        {status === 'success' && (
          <p style={{ color: '#22c55e', marginTop: '1rem', textAlign: 'center' }}>
            Biometric setup complete!
          </p>
        )}

        {!webAuthnSupported && mode === 'webauthn' && (
          <p role="alert" style={{ color: '#f97316', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {t('errors.biometricNotSupported')} Falling back to PIN.
          </p>
        )}

        <button type="button" style={{ ...styles.link, marginTop: '1rem', display: 'block' }} onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MFASetup
// ---------------------------------------------------------------------------

/**
 * MFASetup — configures TOTP (authenticator app), SMS (placeholder), or Email OTP.
 * Admin and developer accounts have MFA enforced and cannot skip this step.
 *
 * @param {{ onSuccess: () => void, onSkip: () => void, enforced?: boolean }} props
 */
export function MFASetup({ onSuccess, onSkip, enforced = false }) {
  const { role } = useAuth();
  const { t } = useTranslation();

  const isMFAEnforced = enforced || MFA_REQUIRED_ROLES.has(role);

  const [method, setMethod] = useState('totp');
  const [totpData, setTotpData] = useState(null); // { qrCodeUrl, secret }
  const [verifyCode, setVerifyCode] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  // Fetch TOTP QR code when TOTP is selected
  useEffect(() => {
    if (method !== 'totp') return;

    apiFetch('/mfa/totp/setup', { method: 'POST' })
      .then((data) => setTotpData(data))
      .catch((err) => setError(err.message));
  }, [method]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!verifyCode) {
      setError(t('errors.required'));
      return;
    }

    setStatus('loading');
    try {
      await apiFetch('/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: verifyCode, method, phone: method === 'sms' ? phone : undefined }),
      });

      // Persist selected MFA method
      await apiFetch('/mfa/setup/complete', {
        method: 'POST',
        body: JSON.stringify({ method }),
      });

      setStatus('success');
      onSuccess?.();
    } catch (err) {
      setError(err.message || t('errors.generic'));
      setStatus('error');
    }
  };

  const sendEmailOTP = async () => {
    try {
      await apiFetch('/mfa/email/send', { method: 'POST' });
    } catch (err) {
      setError(err.message || t('errors.generic'));
    }
  };

  const sendSMSOTP = async () => {
    if (!phone) {
      setError('Enter a phone number first.');
      return;
    }
    try {
      await apiFetch('/mfa/sms/send', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
    } catch (err) {
      setError(err.message || t('errors.generic'));
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading} id="mfa-setup-heading">
          {t('setupMFA')}
        </h1>
        {isMFAEnforced && (
          <p role="note" style={{ color: '#f97316', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Two-factor authentication is required for your account role.
          </p>
        )}

        {/* Method selector */}
        <div role="tablist" aria-label="MFA method" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {['totp', 'sms', 'email'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={method === m}
              onClick={() => { setMethod(m); setVerifyCode(''); setError(''); }}
              style={{
                ...styles.btnSecondary,
                width: 'auto',
                flex: 1,
                fontSize: '0.875rem',
                borderColor: method === m ? 'var(--color-accent, #7c3aed)' : undefined,
              }}
            >
              {m === 'totp' ? 'Authenticator App' : m === 'sms' ? 'SMS' : 'Email'}
            </button>
          ))}
        </div>

        <form onSubmit={handleVerify} aria-labelledby="mfa-setup-heading">
          {/* TOTP panel */}
          {method === 'totp' && (
            <div role="tabpanel">
              {totpData ? (
                <>
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                    Scan this QR code with your authenticator app (Google Authenticator,
                    Authy, 1Password, etc.), then enter the 6-digit code below.
                  </p>
                  <img
                    src={totpData.qrCodeUrl}
                    alt="TOTP QR code — scan with your authenticator app"
                    style={{ display: 'block', margin: '0 auto 1rem', maxWidth: '200px' }}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#64748b', wordBreak: 'break-all' }}>
                    Manual key: <code>{totpData.secret}</code>
                  </p>
                </>
              ) : (
                <p style={{ color: '#94a3b8' }}>Loading QR code…</p>
              )}
            </div>
          )}

          {/* SMS panel */}
          {method === 'sms' && (
            <div role="tabpanel">
              <div style={styles.field}>
                <label htmlFor="mfa-phone" style={styles.label}>
                  Phone number (E.164 format, e.g. +15551234567)
                </label>
                <input
                  id="mfa-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={styles.input}
                />
              </div>
              <button type="button" style={styles.btnSecondary} onClick={sendSMSOTP}>
                Send SMS code
              </button>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                SMS delivery requires a configured SMS provider (e.g. Twilio) on the server.
              </p>
            </div>
          )}

          {/* Email OTP panel */}
          {method === 'email' && (
            <div role="tabpanel">
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                We'll send a one-time code to your registered email address.
              </p>
              <button type="button" style={styles.btnSecondary} onClick={sendEmailOTP}>
                Send email code
              </button>
            </div>
          )}

          {/* Verification code input (shared across all methods) */}
          <div style={{ ...styles.field, marginTop: '1rem' }}>
            <label htmlFor="mfa-verify-code" style={styles.label}>
              {t('totpCode')}
            </label>
            <input
              id="mfa-verify-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              style={styles.input}
              aria-required="true"
            />
          </div>

          {error && <FieldError message={error} />}

          {status === 'success' && (
            <p style={{ color: '#22c55e', marginTop: '0.5rem' }}>
              MFA enabled successfully!
            </p>
          )}

          <button
            type="submit"
            style={styles.btn}
            disabled={status === 'loading'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Verifying…' : 'Enable MFA'}
          </button>

          {!isMFAEnforced && (
            <button type="button" style={styles.btnSecondary} onClick={onSkip}>
              {t('cancel')}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PasswordResetFlow
// ---------------------------------------------------------------------------

/**
 * PasswordResetFlow — request and confirm a password reset.
 * @param {{ onDone: () => void }} props
 */
export function PasswordResetFlow({ onDone }) {
  const { requestPasswordReset, confirmPasswordReset } = useAuth();
  const { t } = useTranslation();

  const [stage, setStage] = useState('request'); // 'request' | 'confirm'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPW, setConfirmPW] = useState('');
  const [pwStrength, setPwStrength] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('errors.emailInvalid'));
      return;
    }
    setStatus('loading');
    try {
      await requestPasswordReset(email);
      setMessage('If that email is registered, you'll receive a reset link shortly.');
      setStage('confirm');
    } catch (err) {
      setError(err.message || t('errors.generic'));
    } finally {
      setStatus('idle');
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    const pwResult = validatePassword(newPassword);
    if (!pwResult.valid) {
      setError(pwResult.issues[0]);
      return;
    }
    if (newPassword !== confirmPW) {
      setError(t('errors.passwordMismatch'));
      return;
    }
    setStatus('loading');
    try {
      await confirmPasswordReset({ token, newPassword });
      setMessage('Password updated successfully.');
      onDone?.();
    } catch (err) {
      setError(err.message || t('errors.generic'));
    } finally {
      setStatus('idle');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{t('resetPassword')}</h1>

        {stage === 'request' ? (
          <form onSubmit={handleRequest} noValidate>
            <div style={styles.field}>
              <label htmlFor="reset-email" style={styles.label}>{t('email')}</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                aria-required="true"
              />
            </div>
            {error && <FieldError message={error} />}
            {message && <p style={{ color: '#22c55e', fontSize: '0.875rem' }}>{message}</p>}
            <button type="submit" style={styles.btn} disabled={status === 'loading'}>
              {status === 'loading' ? 'Sending…' : 'Send Reset Link'}
            </button>
            <button type="button" style={styles.btnSecondary} onClick={() => setStage('confirm')}>
              I have a reset token
            </button>
          </form>
        ) : (
          <form onSubmit={handleConfirm} noValidate>
            {message && <p style={{ color: '#22c55e', fontSize: '0.875rem', marginBottom: '1rem' }}>{message}</p>}
            <div style={styles.field}>
              <label htmlFor="reset-token" style={styles.label}>Reset token (from email)</label>
              <input
                id="reset-token"
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                style={styles.input}
                aria-required="true"
                autoComplete="off"
              />
            </div>
            <div style={styles.field}>
              <label htmlFor="reset-pw" style={styles.label}>New {t('password')}</label>
              <input
                id="reset-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPwStrength(validatePassword(e.target.value));
                }}
                style={styles.input}
                aria-required="true"
              />
              {pwStrength && (
                <PasswordStrengthMeter strength={pwStrength.strength} score={pwStrength.score} />
              )}
            </div>
            <div style={styles.field}>
              <label htmlFor="reset-confirm-pw" style={styles.label}>{t('confirmPassword')}</label>
              <input
                id="reset-confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPW}
                onChange={(e) => setConfirmPW(e.target.value)}
                style={styles.input}
                aria-required="true"
              />
            </div>
            {error && <FieldError message={error} />}
            <button type="submit" style={styles.btn} disabled={status === 'loading'}>
              {status === 'loading' ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
