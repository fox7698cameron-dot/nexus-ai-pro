/**
 * @file AuthSystem.jsx
 * @description Complete Authentication System — Roles, Biometrics, MFA, Password Policy
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 *
 * Supports: Admin | Developer | Moderator | User roles
 * Biometrics: WebAuthn (Fingerprint / Face ID / Touch ID)
 * MFA: TOTP / SMS / Hardware Key
 * Password policy: 13+ chars, uppercase, lowercase, digit, special char, emoji safe
 * Username: full Unicode + emoji support
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ROLES = Object.freeze({
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  MODERATOR: 'moderator',
  USER: 'user'
});

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 4,
  [ROLES.DEVELOPER]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1
};

const PASSWORD_POLICY = {
  minLength: 13,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
  requireSpecial: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;\':",.<>?/`~\\'
};

// ─── Auth Context ─────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ─── Password Validation ───────────────────────────────────────────────────────

export function validatePassword(password) {
  const errors = [];
  const strength = { score: 0, label: 'Very Weak', color: '#ef4444' };

  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'], strength };
  }

  // Length — count actual Unicode code points (emoji = 1 code point)
  const codePoints = [...password];
  if (codePoints.length < PASSWORD_POLICY.minLength) {
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters required`);
  }

  if (PASSWORD_POLICY.requireUppercase && !/\p{Lu}/u.test(password)) {
    errors.push('At least one uppercase letter required');
  }
  if (PASSWORD_POLICY.requireLowercase && !/\p{Ll}/u.test(password)) {
    errors.push('At least one lowercase letter required');
  }
  if (PASSWORD_POLICY.requireDigit && !/\p{Nd}/u.test(password)) {
    errors.push('At least one digit required');
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/`~\\]/.test(password)) {
    errors.push('At least one special character required');
  }

  // Strength scoring
  let score = 0;
  if (codePoints.length >= 13) score += 20;
  if (codePoints.length >= 20) score += 10;
  if (/\p{Lu}/u.test(password)) score += 15;
  if (/\p{Ll}/u.test(password)) score += 15;
  if (/\p{Nd}/u.test(password)) score += 15;
  if (/[!@#$%^&*()\-_=+[\]{}|;:'",.<>?/`~\\]/.test(password)) score += 15;
  if (codePoints.length >= 30) score += 10;

  strength.score = Math.min(100, score);
  if (score < 40) { strength.label = 'Weak'; strength.color = '#ef4444'; }
  else if (score < 60) { strength.label = 'Fair'; strength.color = '#f59e0b'; }
  else if (score < 80) { strength.label = 'Good'; strength.color = '#3b82f6'; }
  else { strength.label = 'Strong'; strength.color = '#10b981'; }

  return { valid: errors.length === 0, errors, strength };
}

// ─── Username Validation ───────────────────────────────────────────────────────

export function validateUsername(username) {
  const errors = [];
  if (!username || typeof username !== 'string') {
    return { valid: false, errors: ['Username is required'] };
  }
  const codePoints = [...username];
  if (codePoints.length < 2) errors.push('Username must be at least 2 characters');
  if (codePoints.length > 32) errors.push('Username cannot exceed 32 characters');
  // Allow Unicode letters, digits, emoji, underscore, hyphen — block null bytes and control chars
  // Block null bytes and other control characters (using Unicode category)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(username)) {
    errors.push('Username contains invalid control characters');
  }
  return { valid: errors.length === 0, errors };
}

// ─── WebAuthn / Biometric Helpers ─────────────────────────────────────────────

const WEBAUTHN_SUPPORTED = typeof window !== 'undefined'
  && typeof window.PublicKeyCredential !== 'undefined';

export async function registerBiometric(userId, username) {
  if (!WEBAUTHN_SUPPORTED) throw new Error('WebAuthn not supported on this platform');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const options = {
    publicKey: {
      challenge,
      rp: { name: 'Nexus AI Pro', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(userId),
        name: username,
        displayName: username
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' } // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      },
      timeout: 60000,
      attestation: 'none'
    }
  };

  const credential = await navigator.credentials.create(options);
  return {
    credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
    type: credential.type,
    response: {
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(credential.response.clientDataJSON))),
      attestationObject: btoa(String.fromCharCode(...new Uint8Array(credential.response.attestationObject)))
    }
  };
}

export async function authenticateBiometric(credentialId) {
  if (!WEBAUTHN_SUPPORTED) throw new Error('WebAuthn not supported on this platform');

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

  const options = {
    publicKey: {
      challenge,
      allowCredentials: [{ id: credentialIdBytes, type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000
    }
  };

  const assertion = await navigator.credentials.get(options);
  return {
    credentialId: btoa(String.fromCharCode(...new Uint8Array(assertion.rawId))),
    response: {
      authenticatorData: btoa(String.fromCharCode(...new Uint8Array(assertion.response.authenticatorData))),
      clientDataJSON: btoa(String.fromCharCode(...new Uint8Array(assertion.response.clientDataJSON))),
      signature: btoa(String.fromCharCode(...new Uint8Array(assertion.response.signature)))
    }
  };
}

// ─── Auth API Client ───────────────────────────────────────────────────────────

const API_BASE = typeof window !== 'undefined'
  ? window.API_BASE || '/api'
  : '/api';

async function authFetch(path, options = {}) {
  const token = sessionStorage.getItem('nexus_access_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({ error: 'Invalid server response' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ─── Auth Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState(null);

  // Restore session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('nexus_user');
    const token = sessionStorage.getItem('nexus_access_token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem('nexus_user');
        sessionStorage.removeItem('nexus_access_token');
      }
    }
    setLoading(false);
  }, []);

  const persistSession = useCallback((userData, token) => {
    sessionStorage.setItem('nexus_user', JSON.stringify(userData));
    sessionStorage.setItem('nexus_access_token', token);
    setUser(userData);
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem('nexus_user');
    sessionStorage.removeItem('nexus_access_token');
    setUser(null);
    setMfaRequired(false);
    setMfaToken(null);
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    const data = await authFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.mfaRequired) {
      setMfaRequired(true);
      setMfaToken(data.mfaToken);
      return { mfaRequired: true };
    }

    persistSession(data.user, data.accessToken);
    return { success: true, user: data.user };
  }, [persistSession]);

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async ({ username, email, password, role = ROLES.USER, language = 'en', region = 'US' }) => {
    const pwResult = validatePassword(password);
    if (!pwResult.valid) throw new Error(pwResult.errors[0]);

    const unResult = validateUsername(username);
    if (!unResult.valid) throw new Error(unResult.errors[0]);

    const data = await authFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, role, language, region })
    });

    persistSession(data.user, data.accessToken);
    return { success: true, user: data.user };
  }, [persistSession]);

  // ── MFA Verify ───────────────────────────────────────────────────────────
  const verifyMfa = useCallback(async (code) => {
    if (!mfaToken) throw new Error('No MFA session active');
    const data = await authFetch('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ mfaToken, code })
    });
    setMfaRequired(false);
    setMfaToken(null);
    persistSession(data.user, data.accessToken);
    return { success: true };
  }, [mfaToken, persistSession]);

  // ── Biometric Login ──────────────────────────────────────────────────────
  const loginBiometric = useCallback(async () => {
    const credentialId = localStorage.getItem('nexus_biometric_id');
    if (!credentialId) throw new Error('No biometric credential registered');
    const assertion = await authenticateBiometric(credentialId);
    const data = await authFetch('/auth/biometric/verify', {
      method: 'POST',
      body: JSON.stringify({ assertion })
    });
    persistSession(data.user, data.accessToken);
    return { success: true, user: data.user };
  }, [persistSession]);

  // ── Register Biometric ───────────────────────────────────────────────────
  const enrollBiometric = useCallback(async () => {
    if (!user) throw new Error('Must be logged in to enroll biometrics');
    const credential = await registerBiometric(user.id, user.username);
    const data = await authFetch('/auth/biometric/register', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
    localStorage.setItem('nexus_biometric_id', data.credentialId);
    return { success: true };
  }, [user]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authFetch('/auth/logout', { method: 'POST' });
    } catch { /* best-effort */ }
    clearSession();
  }, [clearSession]);

  // ── Role guards ──────────────────────────────────────────────────────────
  const hasRole = useCallback((required) => {
    if (!user) return false;
    return (ROLE_HIERARCHY[user.role] || 0) >= (ROLE_HIERARCHY[required] || 0);
  }, [user]);

  const requireRole = useCallback((required) => {
    if (!hasRole(required)) throw new Error(`Insufficient privileges — ${required} role required`);
  }, [hasRole]);

  const value = {
    user,
    loading,
    mfaRequired,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    verifyMfa,
    loginBiometric,
    enrollBiometric,
    hasRole,
    requireRole,
    ROLES,
    webAuthnSupported: WEBAUTHN_SUPPORTED
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Login Form Component ──────────────────────────────────────────────────────

export function LoginForm({ onSuccess, onSwitch }) {
  const { login, loginBiometric, verifyMfa, mfaRequired, webAuthnSupported } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mfaRequired
        ? await verifyMfa(mfaCode)
        : await login({ email, password });
      if (result.success) onSuccess?.(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await loginBiometric();
      if (result.success) onSuccess?.(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Sign In</h2>

      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        {!mfaRequired ? (
          <>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={styles.input}
              autoComplete="email"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={styles.input}
              autoComplete="current-password"
            />
          </>
        ) : (
          <>
            <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 8 }}>
              Enter your 2FA / authenticator code
            </p>
            <input
              type="text"
              placeholder="000000"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              style={{ ...styles.input, textAlign: 'center', letterSpacing: 8, fontSize: 22 }}
              autoComplete="one-time-code"
            />
          </>
        )}

        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? '⏳ Please wait…' : mfaRequired ? '✅ Verify Code' : '🔑 Sign In'}
        </button>
      </form>

      {!mfaRequired && webAuthnSupported && (
        <button onClick={handleBiometric} disabled={loading} style={styles.btnSecondary}>
          🔒 Sign in with Biometrics
        </button>
      )}

      <p style={styles.switchText}>
        Don't have an account?{' '}
        <button onClick={onSwitch} style={styles.link}>Create account</button>
      </p>
    </div>
  );
}

// ─── Registration Form ─────────────────────────────────────────────────────────

export function RegisterForm({ onSuccess, onSwitch }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    username: '', email: '', password: '', confirm: '',
    language: 'en', region: 'US'
  });
  const [pwResult, setPwResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (form.password) setPwResult(validatePassword(form.password));
    else setPwResult(null);
  }, [form.password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (pwResult && !pwResult.valid) {
      setError(pwResult.errors[0]);
      return;
    }
    setLoading(true);
    try {
      const result = await register({
        username: form.username,
        email: form.email,
        password: form.password,
        language: form.language,
        region: form.region
      });
      onSuccess?.(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.heading}>Create Account</h2>
      {error && <div style={styles.errorBox}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Username (emoji & Unicode OK 🎮)"
          value={form.username}
          onChange={update('username')}
          required
          style={styles.input}
          autoComplete="username"
        />
        <input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={update('email')}
          required
          style={styles.input}
          autoComplete="email"
        />
        <input
          type="password"
          placeholder="Password (13+ chars)"
          value={form.password}
          onChange={update('password')}
          required
          style={styles.input}
          autoComplete="new-password"
        />
        {pwResult && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 4, borderRadius: 2, background: '#1e293b', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pwResult.strength.score}%`,
                background: pwResult.strength.color,
                transition: 'width 0.3s'
              }} />
            </div>
            <span style={{ fontSize: 11, color: pwResult.strength.color }}>
              {pwResult.strength.label}
            </span>
          </div>
        )}
        <input
          type="password"
          placeholder="Confirm password"
          value={form.confirm}
          onChange={update('confirm')}
          required
          style={styles.input}
          autoComplete="new-password"
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={form.language} onChange={update('language')} style={{ ...styles.input, flex: 1 }}>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="zh">中文</option>
            <option value="ja">日本語</option>
            <option value="ko">한국어</option>
            <option value="ar">العربية</option>
            <option value="pt">Português</option>
            <option value="ru">Русский</option>
          </select>
          <input
            type="text"
            placeholder="Region (US)"
            value={form.region}
            onChange={update('region')}
            maxLength={2}
            style={{ ...styles.input, flex: 1, textTransform: 'uppercase' }}
          />
        </div>
        <button type="submit" disabled={loading} style={styles.btn}>
          {loading ? '⏳ Creating account…' : '🚀 Create Account'}
        </button>
      </form>

      <p style={styles.switchText}>
        Already have an account?{' '}
        <button onClick={onSwitch} style={styles.link}>Sign in</button>
      </p>
    </div>
  );
}

// ─── Auth Gate Component ───────────────────────────────────────────────────────

export function AuthGate({ children, requiredRole }) {
  const { isAuthenticated, hasRole, loading } = useAuth();
  const [view, setView] = useState('login'); // 'login' | 'register'

  if (loading) return <div style={styles.loading}>🔐 Checking session…</div>;

  if (!isAuthenticated || (requiredRole && !hasRole(requiredRole))) {
    return (
      <div style={styles.gateWrap}>
        {view === 'login'
          ? <LoginForm onSuccess={() => {}} onSwitch={() => setView('register')} />
          : <RegisterForm onSuccess={() => {}} onSwitch={() => setView('login')} />
        }
      </div>
    );
  }

  return children;
}

// ─── Role Badge ────────────────────────────────────────────────────────────────

export function RoleBadge({ role }) {
  const colors = {
    [ROLES.ADMIN]: '#ef4444',
    [ROLES.DEVELOPER]: '#8b5cf6',
    [ROLES.MODERATOR]: '#f59e0b',
    [ROLES.USER]: '#3b82f6'
  };
  const labels = {
    [ROLES.ADMIN]: '🛡️ Admin',
    [ROLES.DEVELOPER]: '⚙️ Dev',
    [ROLES.MODERATOR]: '🔧 Mod',
    [ROLES.USER]: '👤 User'
  };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 600,
      background: `${colors[role]}22`,
      color: colors[role],
      border: `1px solid ${colors[role]}44`
    }}>
      {labels[role] || role}
    </span>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 16,
    padding: 32,
    maxWidth: 420,
    width: '100%',
    color: '#f1f5f9'
  },
  heading: {
    margin: '0 0 24px',
    fontSize: 24,
    fontWeight: 700,
    textAlign: 'center'
  },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px',
    borderRadius: 10,
    border: '1px solid #1e293b',
    background: '#0d1829',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none'
  },
  btn: {
    padding: '13px 20px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    fontWeight: 700,
    fontSize: 15,
    border: 'none',
    cursor: 'pointer',
    marginTop: 4
  },
  btnSecondary: {
    display: 'block',
    width: '100%',
    padding: '11px 20px',
    borderRadius: 10,
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #1e293b',
    cursor: 'pointer',
    fontSize: 14,
    marginTop: 10
  },
  errorBox: {
    padding: '10px 14px',
    borderRadius: 8,
    background: 'rgba(239,68,68,0.15)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 12
  },
  switchText: { textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 16 },
  link: { background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', fontSize: 13 },
  gateWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#020817',
    padding: 16
  },
  loading: { textAlign: 'center', padding: 40, color: '#94a3b8' }
};

export default AuthProvider;
