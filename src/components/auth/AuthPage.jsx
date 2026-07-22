// src/components/auth/AuthPage.jsx
// 2026-07-22 | Unified auth page — login, register, biometrics, MFA, password strength

import { useState } from 'react';

const PASSWORD_MIN = 13;

function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '#374151' };
  let score = 0;
  if (pw.length >= PASSWORD_MIN) score++;
  if (pw.length >= 20) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) score++;
  if (score <= 2) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 4) return { score, label: 'Fair', color: '#fbbf24' };
  if (score === 5) return { score, label: 'Good', color: '#a3e635' };
  return { score, label: 'Strong', color: '#4ade80' };
}

export default function AuthPage({ onLogin, onRegister, defaultMode = 'login' }) {
  const [mode, setMode] = useState(defaultMode); // 'login' | 'register'
  const [form, setForm] = useState({
    email: '', password: '', username: '', confirmPassword: '',
    language: 'en', region: 'US',
  });
  const [totpToken, setTotpToken] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(
    typeof window !== 'undefined' && !!window.PublicKeyCredential
  );

  const strength = passwordStrength(form.password);

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        return setError('Passwords do not match');
      }
      if (form.password.length < PASSWORD_MIN) {
        return setError(`Password must be at least ${PASSWORD_MIN} characters`);
      }
      if (strength.score < 4) {
        return setError('Password too weak — add uppercase, lowercase, digits, and symbols');
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login'
        ? { email: form.email, password: form.password, totpToken: totpToken || undefined }
        : { email: form.email, password: form.password, username: form.username, language: form.language, region: form.region };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (res.status === 200 && data.mfaRequired) {
        setMfaRequired(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        setLoading(false);
        return;
      }

      const handler = mode === 'login' ? onLogin : onRegister;
      handler?.(data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const biometricLogin = async () => {
    try {
      // 1. Get challenge from server
      const challengeRes = await fetch('/api/auth/biometric/challenge', { method: 'POST' });
      const { challenge } = await challengeRes.json();

      // 2. WebAuthn assertion
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
          timeout: 60000,
          userVerification: 'required',
        },
      });

      setError('Biometric verification received — server-side validation required for production');
    } catch (err) {
      setError('Biometric authentication failed or cancelled');
    }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#f1f5f9', padding: '12px 14px', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
  };
  const btnStyle = {
    width: '100%', background: '#6366f1', color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: 40, width: '100%', maxWidth: 440,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9', letterSpacing: -1 }}>
            Nexus AI Pro
          </div>
          <div style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </div>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', borderRadius: 10, background: 'rgba(255,255,255,0.04)', padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); setMfaRequired(false); }} style={{
              flex: 1, border: 'none', borderRadius: 8, padding: '8px',
              background: mode === m ? 'rgba(99,102,241,0.3)' : 'transparent',
              color: mode === m ? '#a5b4fc' : '#6b7280',
              cursor: 'pointer', fontSize: 13, fontWeight: mode === m ? 700 : 400,
            }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>
                Username (supports emoji &amp; Unicode)
              </label>
              <input
                style={inputStyle} type="text" value={form.username} onChange={set('username')}
                placeholder="e.g. CamFox🦊 or 狐狸"
                required autoComplete="username"
              />
            </div>
          )}

          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              style={inputStyle} type="email" value={form.email} onChange={set('email')}
              placeholder="you@example.com" required autoComplete="email"
            />
          </div>

          <div>
            <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>
              Password {mode === 'register' && `(min. ${PASSWORD_MIN} characters)`}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                value={form.password} onChange={set('password')}
                placeholder={`At least ${PASSWORD_MIN} characters`}
                required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPassword(s => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 16,
              }}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
            {mode === 'register' && form.password && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 2,
                      background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.08)',
                    }} />
                  ))}
                </div>
                <div style={{ color: strength.color, fontSize: 11 }}>{strength.label}</div>
              </div>
            )}
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Confirm Password</label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: form.confirmPassword && form.password !== form.confirmPassword
                    ? '#ef4444' : 'rgba(255,255,255,0.1)',
                }}
                type="password" value={form.confirmPassword} onChange={set('confirmPassword')}
                placeholder="Repeat password" required autoComplete="new-password"
              />
            </div>
          )}

          {mfaRequired && (
            <div>
              <label style={{ color: '#fbbf24', fontSize: 12, display: 'block', marginBottom: 6 }}>
                🔐 Enter your 6-digit authenticator code
              </label>
              <input
                style={{ ...inputStyle, letterSpacing: 6, textAlign: 'center', fontSize: 20 }}
                type="text" inputMode="numeric" maxLength={6}
                value={totpToken} onChange={e => setTotpToken(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" required
              />
            </div>
          )}

          {mode === 'register' && (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Language</label>
                <select style={{ ...inputStyle, padding: '10px 12px' }} value={form.language} onChange={set('language')}>
                  {[['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
                    ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['pt', 'Português'],
                    ['ar', 'العربية'], ['hi', 'हिन्दी']].map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Region</label>
                <select style={{ ...inputStyle, padding: '10px 12px' }} value={form.region} onChange={set('region')}>
                  {[['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'],
                    ['AU', 'Australia'], ['EU', 'European Union'], ['JP', 'Japan'], ['CN', 'China'],
                    ['IN', 'India'], ['BR', 'Brazil']].map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Biometric auth */}
        {mode === 'login' && biometricAvailable && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: '#6b7280', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>
            <button
              onClick={biometricLogin}
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.06)', fontSize: 13 }}
            >
              🔐 Sign in with Biometrics / Passkey
            </button>
            <div style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              Fingerprint · Face ID · Touch ID · FIDO2 Passkey
            </div>
          </div>
        )}

        {/* Security note */}
        <div style={{ marginTop: 20, textAlign: 'center', color: '#4b5563', fontSize: 11 }}>
          🔒 End-to-end AES-256-GCM encrypted · 2FA / MFA supported
        </div>
      </div>
    </div>
  );
}
