/**
 * AuthPortal — Multi-role authentication UI
 * Supports: admin / dev / moderator / user sign-in & registration
 * Biometric hints, MFA, password strength enforcement (13+ chars)
 * @date 2026-08-03
 */
import { useState, useCallback } from 'react';

const ROLES = {
  user:      { label: 'User',      color: '#6366f1', icon: '👤' },
  moderator: { label: 'Moderator', color: '#f59e0b', icon: '🛡️' },
  dev:       { label: 'Developer', color: '#10b981', icon: '💻' },
  admin:     { label: 'Admin',     color: '#ef4444', icon: '⚙️' }
};

function PasswordStrengthBar({ password }) {
  const checks = [
    { label: '13+ chars',   pass: password.length >= 13 },
    { label: 'Uppercase',   pass: /[A-Z]/.test(password) },
    { label: 'Lowercase',   pass: /[a-z]/.test(password) },
    { label: 'Number',      pass: /[0-9]/.test(password) },
    { label: 'Special (!@#)', pass: /[^a-zA-Z0-9]/.test(password) }
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 1 ? '#ef4444' : score <= 3 ? '#f59e0b' : score === 4 ? '#3b82f6' : '#10b981';

  if (!password) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {checks.map((c, i) => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i < score ? color : '#334155'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {checks.map((c, i) => (
          <span key={i} style={{ fontSize: 10, color: c.pass ? '#10b981' : '#64748b' }}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BiometricButton({ onSuccess }) {
  const [state, setState] = useState('idle');

  const tryBiometric = useCallback(async () => {
    if (!window.PublicKeyCredential) {
      setState('unsupported');
      return;
    }
    setState('pending');
    try {
      // WebAuthn credential assertion — requires server-side challenge in production
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      // In a real implementation, call /api/auth/webauthn/challenge first
      setState('unsupported'); // Stub until server WebAuthn is wired
    } catch {
      setState('error');
    }
  }, []);

  const labels = {
    idle: '🔐 Sign in with Biometrics',
    pending: '⏳ Scanning...',
    unsupported: '⚠️ Biometrics not available',
    error: '✗ Biometric failed'
  };

  return (
    <button
      onClick={tryBiometric}
      disabled={state === 'pending'}
      style={{
        width: '100%', padding: '10px 16px', borderRadius: 8,
        border: '1px solid #334155', background: 'transparent',
        color: '#94a3b8', cursor: 'pointer', fontSize: 13,
        marginTop: 8
      }}
    >
      {labels[state] || labels.idle}
    </button>
  );
}

function MFAStep({ onVerified, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      if (res.ok) { onVerified(await res.json()); }
      else { setError('Invalid code'); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>Two-Factor Authentication</h2>
      <p style={styles.sub}>Enter the 6-digit code from your authenticator app.</p>
      <input
        style={styles.input} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000" inputMode="numeric" maxLength={6}
      />
      {error && <p style={styles.error}>{error}</p>}
      <button style={styles.btn} onClick={verify} disabled={loading}>
        {loading ? 'Verifying...' : 'Verify Code'}
      </button>
      <button style={styles.link} onClick={onBack}>← Back</button>
    </div>
  );
}

export default function AuthPortal({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // login | register | mfa
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [lang, setLang] = useState('en');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaData, setMfaData] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email, password }
        : { email, password, displayName, username, lang };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      if (data.mfaRequired) {
        setMfaData(data);
        setMode('mfa');
        return;
      }

      // Store tokens securely (httpOnly cookie preferred in production)
      sessionStorage.setItem('nexus_access_token', data.accessToken);
      sessionStorage.setItem('nexus_refresh_token', data.refreshToken);
      onAuthSuccess?.(data);
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'mfa') {
    return (
      <div style={styles.overlay}>
        <MFAStep
          onVerified={data => {
            sessionStorage.setItem('nexus_access_token', data.accessToken);
            onAuthSuccess?.(data);
          }}
          onBack={() => setMode('login')}
        />
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Role selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(ROLES).map(([role, { label, color, icon }]) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              style={{
                flex: 1, minWidth: 70, padding: '6px 8px', borderRadius: 6, fontSize: 11,
                border: `1.5px solid ${selectedRole === role ? color : '#334155'}`,
                background: selectedRole === role ? `${color}22` : 'transparent',
                color: selectedRole === role ? color : '#64748b',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 4
              }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        <h2 style={styles.title}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>
        <p style={styles.sub}>
          {selectedRole === 'admin' && '⚙️ Admin portal — restricted access'}
          {selectedRole === 'dev' && '💻 Developer dashboard access'}
          {selectedRole === 'moderator' && '🛡️ Moderator dashboard access'}
          {selectedRole === 'user' && '👤 Welcome back'}
        </p>

        <form onSubmit={handleSubmit} autoComplete="on">
          {mode === 'register' && (
            <>
              <label style={styles.label}>Display Name</label>
              <input style={styles.input} value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Cameron Fox" required autoComplete="name" />

              <label style={styles.label}>Username <span style={{ color: '#64748b' }}>(emoji & special chars OK)</span></label>
              <input style={styles.input} value={username} onChange={e => setUsername(e.target.value)}
                placeholder="cam_fox🦊" autoComplete="username" />
            </>
          )}

          <label style={styles.label}>Email</label>
          <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoComplete="email" />

          <label style={styles.label}>Password</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...styles.input, paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Min 13 characters' : '••••••••••••••'}
              required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {mode === 'register' && <PasswordStrengthBar password={password} />}

          {mode === 'register' && (
            <>
              <label style={styles.label}>Preferred Language</label>
              <select style={styles.input} value={lang} onChange={e => setLang(e.target.value)}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="zh">中文(简体)</option>
                <option value="ko">한국어</option>
                <option value="ar">العربية</option>
                <option value="hi">हिन्दी</option>
                <option value="ru">Русский</option>
                <option value="it">Italiano</option>
              </select>
            </>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <button style={{ ...styles.btn, marginTop: 16 }} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <BiometricButton onSuccess={data => onAuthSuccess?.(data)} />

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748b', fontSize: 13 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={styles.link}
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0f172a', padding: 20
  },
  card: {
    width: '100%', maxWidth: 420, background: '#1e293b', borderRadius: 16,
    padding: 32, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
    border: '1px solid #334155'
  },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: '0 0 6px' },
  sub:   { color: '#94a3b8', fontSize: 13, marginBottom: 20 },
  label: { display: 'block', color: '#cbd5e1', fontSize: 12, fontWeight: 600,
           textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input: {
    display: 'block', width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid #334155', background: '#0f172a', color: '#f1f5f9',
    fontSize: 14, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit'
  },
  btn: {
    display: 'block', width: '100%', padding: '12px 16px', borderRadius: 8,
    background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 15,
    border: 'none', cursor: 'pointer'
  },
  link: {
    background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer',
    textDecoration: 'underline', fontSize: 13
  },
  error: { color: '#ef4444', fontSize: 13, marginTop: 8 }
};
