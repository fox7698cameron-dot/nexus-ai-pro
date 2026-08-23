/**
 * src/auth/AuthSystem.jsx
 * Full-stack authentication: biometrics, 2FA/MFA, RBAC, password strength.
 * Created: 2026-08-23
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { validatePassword, validateUsername } from '../utils/crypto.js';
import { tSync } from '../i18n/i18n.js';

// ── Role definitions ──────────────────────────────────────────────────────────
export const ROLES = Object.freeze({
  ADMIN:     'admin',
  DEV:       'developer',
  MODERATOR: 'moderator',
  USER:      'user',
});

// ── Auth Context ──────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// ── Biometric helper (Web Authentication API / Capacitor bridge) ──────────────
async function biometricAuthenticate(username) {
  // If running in Capacitor (native), use the bridge
  if (window.__CAPACITOR_BIOMETRIC__) {
    return window.__CAPACITOR_BIOMETRIC__.authenticate({ username });
  }
  // Web — use WebAuthn PublicKeyCredential
  if (!window.PublicKeyCredential) throw new Error('Biometrics not supported on this device');

  const challenge = new Uint8Array(32);
  crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId:     window.location.hostname,
      timeout:  60_000,
      userVerification: 'required',   // requires PIN, fingerprint, or face
    },
  });
  return { success: !!assertion, credentialId: assertion?.id };
}

// ── AuthProvider ──────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [mfaPending, setMFAPending] = useState(false);
  const [mfaUserId, setMFAUserId]   = useState(null);

  // Restore session from secure httpOnly cookie via /api/auth/me
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async ({ email, password, totpToken }) => {
    const res  = await fetch('/api/auth/signin', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, totpToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign-in failed');

    if (data.mfaRequired) {
      setMFAPending(true);
      setMFAUserId(data.userId);
      return { mfaRequired: true };
    }

    setUser(data.user);
    return { user: data.user };
  }, []);

  const signInBiometric = useCallback(async () => {
    const { success, credentialId } = await biometricAuthenticate(user?.email || '');
    if (!success) throw new Error('Biometric authentication failed');

    const res  = await fetch('/api/auth/biometric', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credentialId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Biometric sign-in failed');
    setUser(data.user);
    return { user: data.user };
  }, [user]);

  const verifyMFA = useCallback(async (code) => {
    const res  = await fetch('/api/auth/mfa/verify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId: mfaUserId, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'MFA verification failed');
    setMFAPending(false);
    setMFAUserId(null);
    setUser(data.user);
    return { user: data.user };
  }, [mfaUserId]);

  const signUp = useCallback(async ({ email, password, username, role }) => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) throw new Error(pwCheck.issues.join('; '));
    const unCheck = validateUsername(username);
    if (!unCheck.valid) throw new Error(unCheck.issue);

    const res  = await fetch('/api/auth/signup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, username, role: role || ROLES.USER }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign-up failed');
    setUser(data.user);
    return { user: data.user };
  }, []);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  const hasRole = useCallback((...roles) => {
    if (!user) return false;
    return roles.some((r) => user.role === r);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, mfaPending, signIn, signInBiometric, verifyMFA, signUp, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Sign-In Form ──────────────────────────────────────────────────────────────
export function SignInForm({ onSuccess }) {
  const { signIn, signInBiometric, verifyMFA, mfaPending } = useAuth();
  const [form, setForm]     = useState({ email: '', password: '', totpCode: '' });
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mfaPending) {
        const r = await verifyMFA(form.totpCode);
        onSuccess?.(r.user);
      } else {
        const r = await signIn({ email: form.email, password: form.password });
        if (!r.mfaRequired) onSuccess?.(r.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBiometric = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await signInBiometric();
      onSuccess?.(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-form" style={styles.card}>
      <h2 style={styles.title}>Sign In — Nexus AI Pro</h2>
      {error && <div style={styles.error}>{error}</div>}

      {!mfaPending ? (
        <form onSubmit={handle}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email" required autoComplete="email"
              style={styles.input}
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                style={{ ...styles.input, paddingRight: 40 }}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)}
                style={styles.eyeBtn}>{showPass ? '🙈' : '👁️'}</button>
            </div>
          </div>
          <button type="submit" disabled={busy} style={styles.btn}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      ) : (
        <form onSubmit={handle}>
          <p style={{ color: '#64748b', marginBottom: 16 }}>
            Enter your 6-digit authenticator code
          </p>
          <input
            type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
            autoComplete="one-time-code"
            style={{ ...styles.input, letterSpacing: 8, textAlign: 'center', fontSize: 24 }}
            value={form.totpCode}
            onChange={(e) => setForm((p) => ({ ...p, totpCode: e.target.value }))}
            placeholder="000000"
          />
          <button type="submit" disabled={busy} style={styles.btn}>
            {busy ? 'Verifying…' : 'Verify MFA'}
          </button>
        </form>
      )}

      <div style={styles.divider}><span>or</span></div>

      <button onClick={handleBiometric} disabled={busy} style={{ ...styles.btn, background: '#0f766e' }}>
        🔐 Biometric / Touch ID / Face ID
      </button>
    </div>
  );
}

// ── Sign-Up Form ──────────────────────────────────────────────────────────────
export function SignUpForm({ onSuccess }) {
  const { signUp }          = useAuth();
  const [form, setForm]     = useState({ email: '', password: '', username: '', confirmPw: '' });
  const [error, setError]   = useState('');
  const [strength, setStrength] = useState(null);
  const [busy, setBusy]     = useState(false);

  const onPasswordChange = (pw) => {
    setForm((p) => ({ ...p, password: pw }));
    setStrength(validatePassword(pw));
  };

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPw) { setError('Passwords do not match'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await signUp({ email: form.email, password: form.password, username: form.username });
      onSuccess?.(r.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const scoreColor = ['#ef4444','#f97316','#eab308','#22c55e','#10b981','#6366f1'][strength?.score || 0];

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Create Account</h2>
      {error && <div style={styles.error}>{error}</div>}
      <form onSubmit={handle}>
        <div style={styles.field}>
          <label style={styles.label}>Username (emoji & Unicode OK ✅)</label>
          <input
            type="text" required minLength={2} maxLength={64}
            style={styles.input}
            value={form.username}
            onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
            placeholder="CoolUser123 🎮"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email" required style={styles.input}
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Password (min 13 chars)</label>
          <input
            type="password" required minLength={13}
            style={styles.input}
            value={form.password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          {strength && (
            <div style={{ marginTop: 6 }}>
              <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2 }}>
                <div style={{ height: '100%', width: `${(strength.score / 5) * 100}%`, background: scoreColor, borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              {strength.issues.map((i, idx) => (
                <span key={idx} style={{ display: 'block', color: '#ef4444', fontSize: 12, marginTop: 2 }}>• {i}</span>
              ))}
            </div>
          )}
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Confirm Password</label>
          <input
            type="password" required minLength={13}
            style={styles.input}
            value={form.confirmPw}
            onChange={(e) => setForm((p) => ({ ...p, confirmPw: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={busy || !strength?.valid} style={styles.btn}>
          {busy ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
    </div>
  );
}

// ── Role Guard ────────────────────────────────────────────────────────────────
export function RoleGuard({ roles, fallback = null, children }) {
  const { hasRole, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', padding: 32 }}>Loading…</div>;
  if (!hasRole(...(Array.isArray(roles) ? roles : [roles]))) return fallback;
  return children;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const styles = {
  card: {
    background: '#1e293b', borderRadius: 16, padding: 32,
    maxWidth: 420, margin: '0 auto', color: '#f8fafc',
    boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
  },
  title:  { fontSize: 22, fontWeight: 700, marginBottom: 24, textAlign: 'center' },
  error:  { background: '#7f1d1d', color: '#fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 14 },
  field:  { marginBottom: 16 },
  label:  { display: 'block', fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 6 },
  input:  { width: '100%', boxSizing: 'border-box', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#f8fafc', padding: '10px 12px', fontSize: 15 },
  btn:    { width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8 },
  eyeBtn: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
  divider: { textAlign: 'center', color: '#475569', margin: '16px 0', fontSize: 13 },
};
